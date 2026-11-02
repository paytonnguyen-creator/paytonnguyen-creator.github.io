/* Crossroads cut planner — the model.
 *
 * No DOM in here, so the same file runs in the browser (window.CrossroadsPlanner)
 * and in Node (require('./crossroads/planner.js')): the daily fetcher parses
 * menus with it and tools/check-crossroads.mjs tests it.
 *
 * Three jobs:
 *   1. parseEatecXml  — Cal Dining's per-day XML export -> a clean day of menus
 *   2. computeTargets — body stats -> calorie / protein / fat / carb targets for a cut
 *   3. planMeal       — one meal's menu + a target -> what to take and how much
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CrossroadsPlanner = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ── 1. Parsing ────────────────────────────────────────────────────────
   * The export looks like:
   *
   *   <EatecExchange>
   *     <menu mealperiodname="Fall - Lunch" servedate="20261102" location="Crossroads"
   *           mealstarttime="11:00 AM" mealendtime="2:00 PM">
   *       <nutrients>Calories (kcal)|Total Lipid/Fat (g)|...|</nutrients>
   *       <recipes>
   *         <recipe category="Grill" description="..." shortName="..."
   *                 servingSize="4" servingSizeUnit="oz" nutrients="260|2|...|">
   *           <allergens><allergen id="Milk">Yes</allergen>...</allergens>
   *           <dietaryChoices><dietaryChoice id="Vegan Option">Yes</dietaryChoice>...
   *
   * Each <menu> names its own nutrient columns, so values are matched by name
   * rather than by position. DEFAULT_ORDER (the order the site's nutrition popup
   * uses) is only the fallback for a menu that ships without the header.
   */
  var DEFAULT_ORDER = [
    'Calories (kcal)', 'Total Lipid/Fat (g)', 'Saturated fatty acid (g)', 'Trans Fat (g)',
    'Cholesterol (mg)', 'Sodium (mg)', 'Carbohydrate (g)', 'Total Dietary Fiber (g)',
    'Sugar (g)', 'Protein (g)', 'Vitamin A (iu)', 'Vitamin C (mg)', 'Calcium (mg)',
    'Iron (mg)', 'Water (g)', 'Ash (g)', 'Vitamin A (rae)', 'Potassium (mg)',
    'Vitamin D(iu)', 'Carbon Footprint (kg CO2)'
  ];

  // First match wins, so the specific fats are tested before plain "fat".
  var NUTRIENT_PATTERNS = [
    ['kcal', /^\s*calories?\b(?!.*\bfrom\b)/i],
    ['satFat', /saturated/i],
    ['transFat', /\btrans\b/i],
    ['fat', /lipid|^\s*(total\s+)?fat\b/i],
    ['carbs', /carbohydrate/i],
    ['fiber', /fib(er|re)/i],
    ['sugar', /sugar/i],
    ['protein', /protein/i],
    ['sodium', /sodium/i]
  ];
  var NUTRIENT_KEYS = NUTRIENT_PATTERNS.map(function (p) { return p[0]; });

  var MEAL_ORDER = ['Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Late Night'];

  function decodeEntities(s) {
    return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, function (m, e) {
      var k = e.toLowerCase();
      if (k === 'amp') return '&';
      if (k === 'lt') return '<';
      if (k === 'gt') return '>';
      if (k === 'quot') return '"';
      if (k === 'apos') return "'";
      if (k === 'nbsp') return ' ';
      var code = k.charAt(1) === 'x' ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10);
      return isFinite(code) ? String.fromCharCode(code) : m;
    });
  }

  /* A small XML reader: enough for this flat, attribute-heavy export, with no
   * dependencies so the GitHub Action needs nothing but Node. */
  function parseXml(src) {
    var root = { name: '#root', attrs: {}, children: [], text: '' };
    var stack = [root];
    var token = /<!\[CDATA\[([\s\S]*?)\]\]>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!DOCTYPE[^>]*>|<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[^\s=\/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)|</g;
    var attr = /([^\s=\/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
    var m;
    while ((m = token.exec(src))) {
      var top = stack[stack.length - 1];
      if (m[1] !== undefined) { top.text += m[1]; continue; }
      if (m[6] !== undefined) { top.text += decodeEntities(m[6]); continue; }
      if (!m[3]) continue; // comment, declaration, doctype, stray '<'
      var name = m[3];
      if (m[2] === '/') {
        for (var i = stack.length - 1; i > 0; i--) {
          if (stack[i].name === name) { stack.length = i; break; }
        }
        continue;
      }
      var node = { name: name, attrs: {}, children: [], text: '' };
      var a;
      attr.lastIndex = 0;
      while ((a = attr.exec(m[4] || ''))) {
        node.attrs[a[1]] = decodeEntities(a[2] !== undefined ? a[2] : a[3]);
      }
      top.children.push(node);
      if (m[5] !== '/') stack.push(node);
    }
    return root;
  }

  function findAll(node, name, out) {
    out = out || [];
    for (var i = 0; i < node.children.length; i++) {
      var c = node.children[i];
      if (c.name === name) out.push(c);
      findAll(c, name, out);
    }
    return out;
  }

  function directChild(node, name) {
    for (var i = 0; i < node.children.length; i++) {
      if (node.children[i].name === name) return node.children[i];
    }
    return null;
  }

  function clean(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

  function mapHeader(names) {
    var idx = {};
    names.forEach(function (raw, i) {
      var n = clean(raw).replace(/:$/, '');
      if (!n) return;
      for (var j = 0; j < NUTRIENT_PATTERNS.length; j++) {
        var key = NUTRIENT_PATTERNS[j][0];
        if (NUTRIENT_PATTERNS[j][1].test(n)) {
          if (!(key in idx)) idx[key] = i;
          return;
        }
      }
    });
    return idx;
  }

  function mealName(label) {
    var l = label.toLowerCase();
    if (/brunch/.test(l)) return 'Brunch';
    if (/breakfast/.test(l)) return 'Breakfast';
    if (/lunch/.test(l)) return 'Lunch';
    if (/dinner/.test(l)) return 'Dinner';
    if (/late/.test(l)) return 'Late Night';
    var parts = label.split(' - ');
    return clean(parts[parts.length - 1]) || 'Menu';
  }

  // The export sometimes puts the date ("Saturday Feb 7, 2026") where the
  // station name belongs.
  var DATE_LIKE = /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;

  function round1(v) { return Math.round(v * 10) / 10; }

  function isoDate(yyyymmdd) {
    var s = String(yyyymmdd || '').replace(/\D/g, '');
    return s.length === 8 ? s.slice(0, 4) + '-' + s.slice(4, 6) + '-' + s.slice(6, 8) : null;
  }

  function yesIds(node, tag) {
    return findAll(node, tag)
      .filter(function (n) { return /^\s*yes\s*$/i.test(n.text); })
      .map(function (n) { return clean(n.attrs.id); })
      .filter(Boolean);
  }

  function parseEatecXml(xml) {
    var tree = parseXml(xml);
    var byMeal = {};
    var location = null, date = null;

    findAll(tree, 'menu').forEach(function (m) {
      var label = clean(m.attrs.mealperiodname);
      var meal = mealName(label);
      location = location || clean(m.attrs.location) || null;
      date = date || isoDate(m.attrs.servedate);

      var header = directChild(m, 'nutrients');
      var names = header && clean(header.text) ? header.text.split('|') : DEFAULT_ORDER;
      var idx = mapHeader(names);

      var bucket = byMeal[meal] || (byMeal[meal] = {
        name: meal, label: label,
        start: clean(m.attrs.mealstarttime) || null,
        end: clean(m.attrs.mealendtime) || null,
        items: [], _seen: {}
      });

      findAll(m, 'recipe').forEach(function (r) {
        var a = r.attrs;
        var name = clean(a.description || a.shortName);
        if (!name) return;
        var qty = parseFloat(a.servingSize);
        var unit = clean(a.servingSizeUnit);
        var key = name.toLowerCase() + '|' + (isFinite(qty) ? qty : '') + unit.toLowerCase();
        if (bucket._seen[key]) return;
        bucket._seen[key] = true;

        var vals = String(a.nutrients || '').split('|');
        var n = {};
        NUTRIENT_KEYS.forEach(function (k) {
          var v = k in idx ? parseFloat(vals[idx[k]]) : NaN;
          n[k] = isFinite(v) ? Math.max(0, round1(v)) : null;
        });

        var station = clean(a.category);
        if (!station || DATE_LIKE.test(station)) station = 'General';

        bucket.items.push({
          name: name,
          station: station,
          serving: isFinite(qty) && qty > 0 ? { qty: qty, unit: unit } : null,
          n: n,
          allergens: yesIds(r, 'allergen'),
          diet: yesIds(r, 'dietaryChoice').map(function (d) {
            return d.toLowerCase().replace(/\s*option$/, '');
          })
        });
      });
    });

    var meals = Object.keys(byMeal).map(function (k) {
      var b = byMeal[k];
      delete b._seen;
      return b;
    }).filter(function (b) { return b.items.length; });
    meals.sort(function (x, y) {
      var a = MEAL_ORDER.indexOf(x.name), b = MEAL_ORDER.indexOf(y.name);
      return (a < 0 ? 99 : a) - (b < 0 ? 99 : b);
    });
    return { location: location, date: date, meals: meals };
  }

  /* ── 2. Targets ────────────────────────────────────────────────────────
   * Mifflin–St Jeor for resting burn, an activity multiplier for the day,
   * then a deficit of 500 kcal per pound per week. The pace is capped at 1% of
   * bodyweight a week and calories never go below 1,500 (men) / 1,200 (women):
   * past either line a cut starts costing muscle, which is the opposite of lean.
   */
  var ACTIVITY = {
    sedentary: { mult: 1.2, label: 'Mostly sitting, little exercise' },
    light: { mult: 1.375, label: 'Walk around campus, train 1–2×/week' },
    moderate: { mult: 1.55, label: 'Train 3–5×/week' },
    high: { mult: 1.725, label: 'Train hard 6–7×/week or a physical job' }
  };

  function computeTargets(p) {
    var kg = p.weightLb * 0.45359237;
    var m = p.heightIn * 0.0254;
    var bmr = 10 * kg + 625 * m - 5 * p.age + (p.sex === 'female' ? -161 : 5);
    var act = ACTIVITY[p.activity] || ACTIVITY.moderate;
    var tdee = bmr * act.mult;

    var maxRate = p.weightLb * 0.01;
    var rate = Math.min(p.rateLb, maxRate);
    var floor = p.sex === 'female' ? 1200 : 1500;
    var raw = tdee - rate * 500 + (p.kcalAdjust || 0);
    var kcal = Math.round(Math.max(raw, floor) / 10) * 10;

    // Protein ~1 g per lb. Above a BMI of 28 that overshoots what muscle needs,
    // so it is taken off the weight at a BMI of 25 instead.
    var bmi = kg / (m * m);
    var refLb = bmi > 28 ? (25 * m * m) / 0.45359237 : p.weightLb;
    var protein = Math.round(refLb);
    var fat = Math.round(Math.max(refLb * 0.3, (kcal * 0.2) / 9));
    var carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));

    return {
      bmr: Math.round(bmr), tdee: Math.round(tdee), kcal: kcal,
      protein: protein, fat: fat, carbs: carbs,
      rateLb: rate, rateCapped: rate < p.rateLb, floored: raw < floor,
      bmi: Math.round(bmi * 10) / 10
    };
  }

  /* Lunch and dinner share what's left after breakfast and snacks. */
  function mealTargets(t, p) {
    var otherKcal = Math.max(0, p.otherKcal || 0);
    var otherProtein = Math.max(0, p.otherProtein || 0);
    var kcal = Math.max(500, t.kcal - otherKcal);
    var protein = Math.max(40, t.protein - otherProtein);
    var fat = Math.max(20, t.fat - (otherKcal * 0.3) / 9);
    var s = p.lunchShare || 0.5;
    function share(f) {
      return {
        kcal: Math.round((kcal * f) / 10) * 10,
        protein: Math.round(protein * f),
        fat: Math.round(fat * f)
      };
    }
    return { total: { kcal: kcal, protein: protein, fat: Math.round(fat) }, lunch: share(s), dinner: share(1 - s) };
  }

  /* ── 3. Planning ───────────────────────────────────────────────────────
   * Each item is sorted into a role, the best few of each role become
   * candidates, and every combination of 1–2 proteins, 0–1 starch and 0–2
   * vegetables at sensible serving multiples is scored against the meal's
   * target. Calories over target cost more than calories under (it's a cut),
   * and missing protein costs nearly as much as missing calories.
   */
  function w(s) { return new RegExp('\\b(' + s + ')\\b', 'i'); }

  var TREAT = w('cookies?|cakes?|cupcakes?|brownies?|blondies?|pastry|pastries|muffins?|donuts?|doughnuts?|ice cream|gelato|sorbet|pudding|cobbler|crisp|croissants?|danish|scones?|churros?|cheesecake|frosting|candy|chocolate|desserts?|cinnamon rolls?|sweet rolls?|waffles?|pancakes?|french toast|whipped cream|macarons?|fudge|parfait|granola bars?');
  var TREAT_STATION = w('dessert|desserts|bakery|pastry|sweets');
  var DRINK = w('juice|soda|lemonade|smoothies?|latte|coffee|tea|horchata|agua fresca|kombucha|cocoa|hot chocolate|milkshake|punch|beverages?');
  var DRINK_STATION = w('beverages?|drinks?');
  var CONDIMENT_END = /\b(dressing|vinaigrette|sauce|gravy|salsa|aioli|mayo|mayonnaise|ketchup|mustard|syrup|jam|jelly|butter|cream cheese|sour cream|guacamole|relish|chutney|pesto|toppings?|croutons?|dip|spread|glaze|honey|sprinkles|seasoning|oil|margarine|creamer)\s*$/i;
  // Cal Dining names things noun-first ("Dressing Ranch RTU", "Oil Olive Salad
  // Bar", "Sauce Arrabiata"), so the first word is checked as well as the last.
  var CONDIMENT_FIRST = /^(dressings?|sauces?|vinaigrettes?|gravy|salsa|aioli|mayo|mayonnaise|ketchup|mustard|syrup|jam|jelly|butter|relish|chutney|pesto|croutons?|dips?|spreads?|glaze|honey|sprinkles|seasonings?|oils?|vinegars?|margarine|creamer|condiments?)\b/i;
  var CONDIMENT_ANY = w('dressings?|vinaigrettes?|condiments?');
  // Salad-bar extras: a spoonful is fine, but they aren't a plate's vegetables.
  var TOPPING = w('seeds?|nuts|almonds?|walnuts?|pecans?|cashews?|pistachios?|raisins?|dried|croutons?|granola|bacon bits|tortilla strips|wonton strips|chips|olives?|parmesan|shredded cheese|cheese shredded|feta|cotija');
  var SMALL_UNIT = /\b(tbsp|tsp|tablespoons?|teaspoons?|packets?)\b/i;
  var SOUP = w('soups?|stew|chowder|chili|broth|bisque|gumbo|pho|ramen');
  var GREEN_BEAN = /\b(green|string|wax)\s+beans?\b|\bbeans?\s+(green|string|wax)\b/i;
  var LEGUME = w('lentils?|chickpeas?|garbanzos?|dal|dahl|daal|black[- ]eyed peas|beans?|hummus|freekeh');
  var VEG = w('salad|vegetables?|veggies?|broccoli|broccolini|greens|spinach|kale|chard|lettuce|romaine|arugula|carrots?|zucchini|cauliflower|asparagus|cabbage|brussels sprouts|squash|bok choy|green beans|peppers?|mushrooms?|eggplant|cucumbers?|tomato(es)?|onions?|beets?|celery|snap peas|edamame|okra|slaw|radish(es)?|sprouts|fruit|melon|berries|apple|orange|banana|pineapple|grapes');
  var VEG_STATION = w('salad|salad bar|vegetables?|greens|produce|fruit');
  var CARB = w('rice|quinoa|pasta|penne|spaghetti|linguine|rigatoni|fusilli|noodles?|potato(es)?|fries|tots|bread|rolls?|tortillas?|couscous|farro|grains?|buns?|polenta|oats|oatmeal|corn|bulgur|pita|naan|bagels?|biscuits?|macaroni|mac|lo mein|chow mein|udon|soba|ramen|orzo|gnocchi|yams?|beans|lentils|risotto|stuffing|toast');

  function per(item, k) { var v = item.n[k]; return v == null ? 0 : v; }

  function classify(item) {
    var name = item.name, station = item.station || '';
    var kcal = per(item, 'kcal'), protein = per(item, 'protein');
    var unit = item.serving ? item.serving.unit : '';
    var oz = item.serving && /^(oz|ounces?)$/i.test(unit) ? item.serving.qty : null;
    if (kcal < 15) return 'skip';
    // A whole hotel pan listed as one serving ("Beets Steamed, 56 oz") can't be planned around.
    if (oz && oz > 24) return 'skip';
    if (TREAT.test(name) || TREAT_STATION.test(station)) return 'treat';
    if (/fl\.?\s*oz/i.test(unit) && !/soup|chowder|chili|stew|broth/i.test(name)) return 'drink';
    if (DRINK.test(name) || DRINK_STATION.test(station)) return 'drink';
    // "Baked Tofu with Ginger Glaze" is tofu; "Ginger Glaze" on its own is a condiment.
    var base = name.split(/\s+(?:with|in|over|on|and|&)\s+/i)[0];
    if (CONDIMENT_END.test(base) || CONDIMENT_FIRST.test(name) || CONDIMENT_ANY.test(name) || SMALL_UNIT.test(unit)) return 'condiment';
    var pd = (protein * 4) / kcal;
    var isProtein = (protein >= 10 && pd >= 0.25) || (protein >= 5 && pd >= 0.3);
    // Soups and stews only count as a main when they really are one.
    if (SOUP.test(name)) return protein >= 15 && pd >= 0.3 ? 'protein' : 'mixed';
    // Beans and lentils carry protein, but on a plate they're the starch. (Green beans are a vegetable.)
    if (LEGUME.test(name) && !GREEN_BEAN.test(name) && !/tofu|tempeh|seitan/i.test(name)) return 'carb';
    if (isProtein) return 'protein';
    // Vegetables are light: past ~35 kcal an ounce it's oil, honey or a topping doing the work.
    var light = oz ? kcal / oz <= 35 : kcal <= 160;
    if (TOPPING.test(name) && !light) return 'condiment';
    if ((VEG.test(name) || GREEN_BEAN.test(name) || VEG_STATION.test(station)) && kcal <= 160 && light && !CARB.test(name)) return 'veg';
    if (kcal <= 100 && light && per(item, 'carbs') <= 15 && per(item, 'fiber') >= 1.5) return 'veg';
    if (CARB.test(name)) return 'carb';
    if (TOPPING.test(name)) return 'condiment';
    return 'mixed';
  }

  /* "Beef Tri Tip Roasted AF HALAL" -> "Beef Tri Tip Roasted HALAL": drop the kitchen's
   * internal codes and the station echoed into the name. Display only — matching
   * and filtering use the full name. */
  var CODES = /\s+(AF|SG|RTU|EVENT|GENERAL|Salad Bar|\d+(\.\d+)?\s?oz)(?=\s|$)/g;
  function displayName(name) {
    var out = String(name).replace(CODES, '').replace(CODES, '').replace(/\s+/g, ' ').trim();
    return out || name;
  }

  /* Protein, carbs and fat should roughly add up to the calories. The live export
   * has had items that don't (a sausage listed at 112 kcal and 321 g of carbs),
   * and a plan built on a typo is worse than one without that item. */
  function suspect(item) {
    var n = item.n;
    if (n.kcal == null || n.kcal < 50) return false;
    var est = (n.protein || 0) * 4 + (n.carbs || 0) * 4 + (n.fat || 0) * 9;
    return est > n.kcal * 1.6 + 40 || est < n.kcal * 0.5 - 40;
  }

  function eligible(item, prefs) {
    if (item.n.kcal == null || item.n.protein == null) return false;
    if (suspect(item)) return false;
    var diet = item.diet || [];
    if (prefs.diet === 'vegan' && diet.indexOf('vegan') < 0) return false;
    if (prefs.diet === 'vegetarian' && diet.indexOf('vegan') < 0 && diet.indexOf('vegetarian') < 0) return false;
    var avoid = (prefs.avoid || []).map(function (a) { return a.toLowerCase(); });
    if (avoid.length && (item.allergens || []).some(function (a) { return avoid.indexOf(a.toLowerCase()) >= 0; })) return false;
    var name = item.name.toLowerCase();
    if ((prefs.dislikes || []).some(function (d) { d = d.trim().toLowerCase(); return d && name.indexOf(d) >= 0; })) return false;
    return true;
  }

  function itemKey(item) { return item.name.toLowerCase() + '|' + (item.station || '').toLowerCase(); }

  function topBy(list, scoreFn, n) {
    return list.slice().sort(function (a, b) { return scoreFn(b) - scoreFn(a); }).slice(0, n);
  }

  function candidates(items, prefs) {
    var pool = items.filter(function (i) { return eligible(i, prefs); });
    var roles = { protein: [], veg: [], carb: [], mixed: [] };
    pool.forEach(function (i) {
      var r = classify(i);
      if (roles[r]) roles[r].push(i);
    });
    function k(i) { return Math.max(1, per(i, 'kcal')); }

    var proteins = topBy(roles.protein.filter(function (i) { return per(i, 'kcal') <= 700; }), function (i) {
      return (per(i, 'protein') * 4) / k(i) - (per(i, 'satFat') * 9) / k(i) * 0.5;
    }, 7);
    if (proteins.length < 3) {
      // Thin day (or a strict filter): lean on whatever carries the most protein.
      var extra = topBy(roles.mixed.concat(roles.carb).filter(function (i) {
        return per(i, 'protein') >= 6 && proteins.indexOf(i) < 0;
      }), function (i) { return (per(i, 'protein') * 4) / k(i); }, 3 - proteins.length);
      proteins = proteins.concat(extra);
    }
    // Starch comes from actual sides; a pizza or burrito only stands in when
    // the day has no rice, potato, pasta or bread at all.
    var starchPool = roles.carb.length ? roles.carb : roles.mixed;
    var carbs = topBy(starchPool.filter(function (i) {
      return per(i, 'kcal') <= 500 && proteins.indexOf(i) < 0;
    }), function (i) {
      return (per(i, 'protein') * 4 + per(i, 'fiber') * 10) / k(i) -
        (per(i, 'fat') * 9) / k(i) * 0.5 - (per(i, 'sugar') * 4) / k(i) * 0.5;
    }, 5);
    var veg = topBy(roles.veg, function (i) {
      return (per(i, 'fiber') * 10 + per(i, 'protein') * 4) / k(i) - (per(i, 'fat') * 9) / k(i) * 0.5 + (VEG.test(i.name) ? 0.2 : 0);
    }, 5);
    return { proteins: proteins, carbs: carbs, veg: veg, roles: roles };
  }

  var MULTS = { protein: [0.5, 1, 1.5, 2], carb: [0.5, 1, 1.5, 2], veg: [1, 2] };

  function pick(item, mult, role) {
    return {
      item: item, mult: mult, role: role,
      kcal: per(item, 'kcal') * mult, protein: per(item, 'protein') * mult,
      fat: per(item, 'fat') * mult, carbs: per(item, 'carbs') * mult,
      fiber: per(item, 'fiber') * mult
    };
  }

  var COUNTED = /^(each|ea|piece|pieces|pc|slice|slices|item)$/i;

  function multsFor(item, role) {
    // Nobody can ask for half a burger: counted items come in whole numbers.
    if (item.serving && COUNTED.test(item.serving.unit)) return role === 'protein' ? [1, 2] : [1];
    return MULTS[role];
  }

  function headWord(item) { return item.name.toLowerCase().split(/\s+/)[0].replace(/(es|s)$/, ''); }

  function options(list, role, maxCount) {
    var singles = [];
    list.forEach(function (it) {
      multsFor(it, role).forEach(function (m) { singles.push([pick(it, m, role)]); });
    });
    var out = singles.slice();
    if (maxCount > 1) {
      for (var i = 0; i < singles.length; i++) {
        for (var j = i + 1; j < singles.length; j++) {
          if (singles[i][0].item === singles[j][0].item) continue;
          // Half a scoop of a second main is clutter, not a plan.
          if (singles[i][0].mult < 1 || singles[j][0].mult < 1) continue;
          // Rainbow carrots and baby carrots are one vegetable, not two.
          if (role === 'veg' && headWord(singles[i][0].item) === headWord(singles[j][0].item)) continue;
          out.push([singles[i][0], singles[j][0]]);
        }
      }
    }
    return out;
  }

  function sumPicks(groups) {
    var t = { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 };
    groups.forEach(function (g) {
      g.forEach(function (p) {
        t.kcal += p.kcal; t.protein += p.protein; t.fat += p.fat; t.carbs += p.carbs; t.fiber += p.fiber;
      });
    });
    return t;
  }

  /* opts.avoidKeys — items already eaten at an earlier meal (penalised, not banned) */
  function planMeal(meal, target, prefs, opts) {
    opts = opts || {};
    var c = candidates(meal ? meal.items : [], prefs || {});
    if (!c.proteins.length && !c.carbs.length) return { plans: [], candidates: c };
    var avoid = opts.avoidKeys || {};

    var pOpts = options(c.proteins, 'protein', 2);
    if (!pOpts.length) pOpts = [[]];
    var cOpts = [[]].concat(options(c.carbs, 'carb', 1));
    var vOpts = [[]].concat(options(c.veg, 'veg', 2));
    var vegAvailable = c.veg.length > 0;

    function sideCost(group) {
      var s = 0;
      for (var i = 0; i < group.length; i++) {
        if (avoid[itemKey(group[i].item)]) s += 0.12;
        if (group[i].mult % 1) s += 0.01; // whole servings are easier to ask for
      }
      return s;
    }
    var pCost = pOpts.map(function (g) {
      // Two mains is fine; a mountain of meat isn't a balanced plate.
      var servings = g.reduce(function (s, p) { return s + p.mult; }, 0);
      // One main and a proper side beats two mains topped up to the calories.
      return sideCost(g) + (g.length > 1 ? 0.12 : 0) + (servings > 2.5 ? 0.1 : 0);
    });
    var cCost = cOpts.map(sideCost), vCost = vOpts.map(sideCost);
    var pSum = pOpts.map(function (g) { return sumPicks([g]); });
    var cSum = cOpts.map(function (g) { return sumPicks([g]); });
    var vSum = vOpts.map(function (g) { return sumPicks([g]); });

    var best = {}; // anchor item key -> best plan built around it
    for (var a = 0; a < pOpts.length; a++) {
      var anchor = null;
      for (var q = 0; q < pOpts[a].length; q++) {
        if (!anchor || pOpts[a][q].protein > anchor.protein) anchor = pOpts[a][q];
      }
      for (var b = 0; b < cOpts.length; b++) {
        if (anchor === null && !cOpts[b].length) continue;
        for (var v = 0; v < vOpts.length; v++) {
          var kcal = pSum[a].kcal + cSum[b].kcal + vSum[v].kcal;
          var protein = pSum[a].protein + cSum[b].protein + vSum[v].protein;
          var fat = pSum[a].fat + cSum[b].fat + vSum[v].fat;
          // Within ±4% of the calorie target counts as on target: no dining hall
          // scoop is that precise, and chasing the last 30 kcal only adds clutter.
          var dk = (kcal - target.kcal) / target.kcal;
          var miss = Math.max(0, Math.abs(dk) - 0.04);
          var s = 3 * (dk > 0 ? miss * 1.4 : miss) +
            2.5 * Math.max(0, target.protein - protein) / target.protein +
            0.8 * Math.max(0, protein - target.protein * 1.35) / target.protein +
            0.6 * Math.max(0, fat - target.fat) / Math.max(1, target.fat) +
            0.05 * (pOpts[a].length + cOpts[b].length + vOpts[v].length) +
            // Past four things to grab, a plate gets hard to follow in line.
            (pOpts[a].length + cOpts[b].length + vOpts[v].length > 4 ? 0.15 : 0) +
            pCost[a] + cCost[b] + vCost[v] +
            (vegAvailable && !vOpts[v].length ? 0.06 : 0);
          var key = anchor ? itemKey(anchor.item) : 'carb:' + itemKey(cOpts[b][0].item);
          if (!best[key] || s < best[key].score) best[key] = { score: s, a: a, b: b, v: v };
        }
      }
    }

    // Alternatives must differ in what the protein is, not just how much of it:
    // "1½ chicken breast + 1 thigh" and "1 breast + 1½ thigh" are the same choice.
    var seenSets = {};
    var plans = Object.keys(best).map(function (k) { return best[k]; })
      .sort(function (x, y) { return x.score - y.score; })
      .filter(function (r) {
        var sig = pOpts[r.a].map(function (p) { return itemKey(p.item); }).sort().join('+') || 'none';
        if (seenSets[sig]) return false;
        seenSets[sig] = true;
        return true;
      })
      .slice(0, opts.alternatives || 3)
      .map(function (r) {
        var picks = pOpts[r.a].concat(cOpts[r.b], vOpts[r.v]);
        var t = sumPicks([picks]);
        return {
          picks: picks,
          totals: { kcal: Math.round(t.kcal), protein: Math.round(t.protein), fat: Math.round(t.fat), carbs: Math.round(t.carbs), fiber: Math.round(t.fiber) },
          score: Math.round(r.score * 1000) / 1000
        };
      });
    return { plans: plans, candidates: c };
  }

  /* Lunch first; dinner then absorbs whatever lunch over- or under-shot (within
   * reason) and is steered away from repeating lunch. The two meals can come
   * from different locations. */
  function planDay(day, targets, prefs, choice) {
    return planPair(slotMeal(day, 'lunch'), slotMeal(day, 'dinner'), targets, prefs, choice);
  }

  function planPair(lunchMeal, dinnerMeal, targets, prefs, choice) {
    choice = choice || {};
    var out = { lunch: null, dinner: null };

    if (lunchMeal) {
      var lp = planMeal(lunchMeal, targets.lunch, prefs);
      var li = Math.min(choice.lunch || 0, Math.max(0, lp.plans.length - 1));
      out.lunch = { meal: lunchMeal, target: targets.lunch, plans: lp.plans, chosen: li };
    }
    if (dinnerMeal) {
      var dt = targets.dinner, avoidKeys = {};
      var lunchPlan = out.lunch && out.lunch.plans[out.lunch.chosen];
      if (lunchPlan) {
        var leftK = targets.total.kcal - lunchPlan.totals.kcal;
        var leftP = targets.total.protein - lunchPlan.totals.protein;
        dt = {
          kcal: Math.round(clamp(leftK, dt.kcal * 0.75, dt.kcal * 1.25) / 10) * 10,
          protein: Math.round(clamp(leftP, dt.protein * 0.8, dt.protein * 1.3)),
          fat: dt.fat
        };
        lunchPlan.picks.forEach(function (p) { avoidKeys[itemKey(p.item)] = true; });
      }
      var dp = planMeal(dinnerMeal, dt, prefs, { avoidKeys: avoidKeys });
      var di = Math.min(choice.dinner || 0, Math.max(0, dp.plans.length - 1));
      out.dinner = { meal: dinnerMeal, target: dt, nominal: targets.dinner, plans: dp.plans, chosen: di };
    }
    return out;
  }

  /* The meal a location serves for a slot. Dining halls say Lunch/Brunch and
   * Dinner; a café that posts one all-day menu serves both. */
  function slotMeal(loc, slot) {
    var m = findMeal(loc, slot === 'lunch' ? ['Lunch', 'Brunch'] : ['Dinner']);
    if (m || !loc || !loc.meals) return m;
    var rest = loc.meals.filter(function (x) { return x.name !== 'Breakfast'; });
    return rest.length === 1 ? rest[0] : null;
  }

  /* Day files hold every location; the first ones (Crossroads only) held meals
   * directly. Both come back as { date, locations: [...] }. */
  function normalizeDay(day) {
    if (!day) return null;
    if (day.locations) return day;
    return {
      date: day.date, fetchedAt: day.fetchedAt,
      locations: [{ key: 'Crossroads', name: 'Crossroads', kind: 'hall', source: day.source, meals: day.meals || [] }]
    };
  }

  function findMeal(day, names) {
    if (!day || !day.meals) return null;
    for (var i = 0; i < names.length; i++) {
      for (var j = 0; j < day.meals.length; j++) {
        if (day.meals[j].name === names[i]) return day.meals[j];
      }
    }
    return null;
  }

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  /* ── Portions in words ─────────────────────────────────────────────── */
  var FRACTIONS = { 0: '', 0.25: '¼', 0.5: '½', 0.75: '¾' };

  function frac(x) {
    var r = Math.round(x * 4) / 4;
    var whole = Math.floor(r), part = Math.round((r - whole) * 100) / 100;
    var f = FRACTIONS[part];
    if (f === undefined) return String(Math.round(x * 10) / 10);
    if (!whole) return f || '0';
    return whole + f;
  }

  function trimNum(x) {
    var r = Math.round(x * 10) / 10;
    return String(r % 1 ? r : Math.round(r));
  }

  function portion(p) {
    var it = p.item, s = it.serving;
    var servings = frac(p.mult) + (p.mult <= 1 ? ' serving' : ' servings');
    if (!s) return { servings: servings, amount: null, cue: null };
    var qty = s.qty * p.mult, unit = s.unit.toLowerCase();
    var amount = trimNum(qty) + ' ' + s.unit;
    var cue = null;
    if (/^(oz|ounces?)$/.test(unit) && p.role === 'protein') {
      // A cooked portion the size and thickness of your palm is ~3–4 oz.
      var palms = Math.max(0.5, Math.round((qty / 3.5) * 2) / 2);
      cue = '≈ ' + frac(palms) + (palms === 1 ? ' palm-sized piece' : ' palm-sized pieces');
    } else if (/^(cups?|c)$/.test(unit)) {
      if (p.role === 'veg') cue = '≈ ' + frac(Math.max(0.5, Math.round(qty * 2) / 2)) + ' fist' + (qty > 1 ? 's' : '');
      else cue = '≈ ' + frac(Math.max(1, Math.round(qty * 2))) + ' cupped hand' + (qty * 2 > 1 ? 's' : '');
    } else if (/^(each|ea|piece|pieces|pc|slice|slices|item|serving)$/.test(unit)) {
      cue = trimNum(qty) + ' ' + (/slice/.test(unit) ? 'slice' : 'piece') + (qty === 1 ? '' : 's');
      amount = null;
    }
    return { servings: servings, amount: amount, cue: cue };
  }

  /* ── Weigh-ins ─────────────────────────────────────────────────────── *
   * Day-to-day scale weight swings by a few pounds of water, so the trend is
   * the average of the latest 7 days against the 7 before it. */
  function dayNum(iso) { return Math.round(Date.parse(iso + 'T12:00:00Z') / 86400000); }

  function weeklyTrend(entries) {
    if (!entries || entries.length < 2) return null;
    var sorted = entries.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var last = dayNum(sorted[sorted.length - 1].date);
    var cur = [], prev = [];
    sorted.forEach(function (e) {
      var age = last - dayNum(e.date);
      if (age < 7) cur.push(e.lb); else if (age < 14) prev.push(e.lb);
    });
    if (cur.length < 3 || prev.length < 3) return { ready: false, have: sorted.length };
    function avg(a) { return a.reduce(function (s, x) { return s + x; }, 0) / a.length; }
    var a = avg(cur), b = avg(prev);
    return { ready: true, current: Math.round(a * 10) / 10, previous: Math.round(b * 10) / 10, lostPerWeek: Math.round((b - a) * 100) / 100 };
  }

  function adjustment(trend, targetRate, weightLb) {
    if (!trend || !trend.ready) return null;
    var tooFast = Math.max(targetRate * 1.5, weightLb * 0.01);
    if (trend.lostPerWeek < targetRate * 0.5) return { kcal: -150, why: 'slower than your target pace' };
    if (trend.lostPerWeek > tooFast) return { kcal: 150, why: 'faster than is safe for keeping muscle' };
    return { kcal: 0, why: 'right on pace' };
  }

  return {
    DEFAULT_ORDER: DEFAULT_ORDER,
    ACTIVITY: ACTIVITY,
    parseXml: parseXml,
    parseEatecXml: parseEatecXml,
    computeTargets: computeTargets,
    mealTargets: mealTargets,
    classify: classify,
    displayName: displayName,
    suspect: suspect,
    eligible: eligible,
    planMeal: planMeal,
    planDay: planDay,
    planPair: planPair,
    slotMeal: slotMeal,
    normalizeDay: normalizeDay,
    findMeal: findMeal,
    portion: portion,
    frac: frac,
    weeklyTrend: weeklyTrend,
    adjustment: adjustment
  };
});
