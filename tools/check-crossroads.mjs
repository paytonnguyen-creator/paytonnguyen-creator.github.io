// Tests for crossroads/planner.js — parsing, targets and the meal planner.
//   node tools/check-crossroads.mjs
// The fixture is synthetic (see its header comment): it copies the shape of
// Cal Dining's export so the parser is tested on real-looking text.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const P = require('../crossroads/planner.js');
const xml = readFileSync(path.join(here, 'fixtures', 'crossroads-sample.xml'), 'utf8');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; } catch (err) { console.error(`✗ ${name}\n  ${err.message}`); process.exitCode = 1; }
}

const day = P.parseEatecXml(xml);
const lunch = P.findMeal(day, ['Lunch']);
const dinner = P.findMeal(day, ['Dinner']);
const byName = (meal, name) => meal.items.find(i => i.name === name);

const him = { sex: 'male', age: 20, heightIn: 70, weightLb: 175, activity: 'moderate', rateLb: 1, otherKcal: 400, otherProtein: 30, lunchShare: 0.5 };
const her = { sex: 'female', age: 20, heightIn: 64, weightLb: 140, activity: 'light', rateLb: 0.75, otherKcal: 300, otherProtein: 20, lunchShare: 0.5 };

// ── parsing ──
test('reads location, date and meal periods in serving order', () => {
  assert.equal(day.location, 'Crossroads');
  assert.equal(day.date, '2026-11-02');
  assert.deepEqual(day.meals.map(m => m.name), ['Breakfast', 'Lunch', 'Dinner']);
  assert.equal(lunch.label, 'Fall - Lunch');
  assert.equal(lunch.start, '11:00 AM');
});

test('maps nutrients by the header names, not position guesses', () => {
  const c = byName(lunch, 'Grilled Lemon Herb Chicken Breast');
  assert.deepEqual([c.n.kcal, c.n.protein, c.n.fat, c.n.carbs, c.n.sodium], [170, 31, 4, 1, 380]);
  assert.deepEqual(c.serving, { qty: 4, unit: 'oz' });
});

test('decodes entities, drops duplicate rows, fixes date-shaped stations, clamps negatives', () => {
  assert.ok(byName(lunch, 'Beef & Broccoli'));
  assert.equal(lunch.items.filter(i => i.name === 'Grilled Lemon Herb Chicken Breast').length, 1);
  assert.equal(byName(lunch, 'Garden Side Salad').station, 'General');
  assert.equal(byName(lunch, 'Grilled Veggie Burger').n.fat, 0);
});

test('reads allergens and dietary tags that say Yes, and only those', () => {
  const s = byName(lunch, 'Teriyaki Salmon');
  assert.deepEqual(s.allergens, ['Fish', 'Wheat', 'Soybeans', 'Gluten']);
  assert.deepEqual(byName(lunch, 'Baked Tofu with Ginger Glaze').diet, ['vegan']);
});

test('falls back to the popup order when a menu ships without a header', () => {
  const bare = '<EatecExchange><menu mealperiodname="Spring - Dinner" servedate="20260210"><recipes>' +
    '<recipe description="Tofu" nutrients="200|9|1|0|0|300|8|1|2|20|"/></recipes></menu></EatecExchange>';
  const d = P.parseEatecXml(bare);
  assert.equal(d.meals[0].name, 'Dinner');
  assert.equal(d.meals[0].items[0].n.protein, 20);
  assert.equal(d.meals[0].items[0].n.kcal, 200);
});

test('"Brunch" stays brunch and stands in for lunch on weekends', () => {
  const d = P.parseEatecXml(xml.replace(/Fall - Lunch/g, 'Fall - Brunch'));
  assert.equal(P.findMeal(d, ['Lunch', 'Brunch']).name, 'Brunch');
});

// ── roles ──
test('sorts items into sensible roles', () => {
  const role = n => P.classify(byName(lunch, n) || byName(dinner, n));
  assert.equal(role('Grilled Lemon Herb Chicken Breast'), 'protein');
  assert.equal(role('Baked Tofu with Ginger Glaze'), 'protein'); // not a condiment for ending in "glaze"
  assert.equal(role('Hard Boiled Egg'), 'protein');
  assert.equal(role('Steamed Brown Rice'), 'carb');
  assert.equal(role('Garlic Roasted Broccoli'), 'veg');
  assert.equal(role('Marinara Sauce'), 'condiment');
  assert.equal(role('Ranch Dressing'), 'condiment');
  assert.equal(role('Chocolate Chip Cookie'), 'treat');
  assert.equal(role('Fudge Brownie'), 'treat');
  assert.equal(role('Lemonade'), 'drink');
});

test('handles Cal Dining\'s noun-first names (as seen in the live export)', () => {
  const it = (name, kcal, protein, qty, station = 'Centerplate', extra = {}) =>
    ({ name, station, serving: { qty, unit: 'oz' }, n: { kcal, protein, fat: 5, carbs: 10, fiber: 2, sugar: 2, ...extra }, allergens: [], diet: [] });
  const role = i => P.classify(i);
  assert.equal(role(it('Dressing Ranch RTU', 98, 1, 1, 'Salad Bar')), 'condiment');
  assert.equal(role(it('Oil Olive Salad Bar', 128, 0, 0.5, 'Salad Bar')), 'condiment');
  assert.equal(role(it('Sauce Arrabiata', 61, 2, 4.5, 'Pasta')), 'condiment');
  assert.equal(role(it('Pumpkin Seeds', 158, 8.6, 1, 'Salad Bar')), 'condiment');
  assert.equal(role(it('Cranberries Dried', 140, 0, 1.25, 'Salad Bar')), 'condiment');
  assert.equal(role(it('Topping Tofu Paprika Rosemary', 138, 12.6, 3, 'Salad Bar')), 'protein');
  assert.equal(role(it('Beef Tri Tip Roasted AF HALAL', 269, 28, 4)), 'protein');
  assert.equal(role(it('Lentils Savory AF', 167, 11.5, 5.4)), 'carb');
  assert.equal(role(it('Beans Green Garlic Sauteed', 53, 1.3, 3.5)), 'veg');
  assert.equal(role(it('Rice Brown', 150, 3.1, 4)), 'carb');
  assert.equal(role(it('Soup Chicken Tortilla', 111, 8.3, 8, 'Soup')), 'mixed');
  assert.equal(role(it('Moroccan Honey-Glazed Carrots EVENT', 147, 0.8, 4)), 'mixed'); // 37 kcal/oz: not "a vegetable" for planning
  assert.equal(role(it('Beets Steamed AF', 683, 25.6, 56, 'Salad Bar')), 'skip');    // a whole pan listed as one serving
});

test('items whose macros contradict their calories stay out of plans', () => {
  const bad = { name: 'Sausage Apple Maple VEGAN', station: 'Center Plate', serving: { qty: 1.6, unit: 'oz' },
    n: { kcal: 111.7, protein: 10, fat: 1.2, carbs: 321, fiber: 2, sugar: 3 }, allergens: [], diet: ['vegan'] };
  assert.equal(P.suspect(bad), true);
  assert.equal(P.eligible(bad, {}), false);
  assert.equal(P.suspect(byName(lunch, 'Grilled Lemon Herb Chicken Breast')), false);
  for (const m of day.meals) for (const i of m.items) assert.equal(P.suspect(i), false, i.name);
});

test('display names drop kitchen codes but keep diet labels', () => {
  assert.equal(P.displayName('Beef Tri Tip Roasted AF HALAL'), 'Beef Tri Tip Roasted HALAL');
  assert.equal(P.displayName('Dressing Ranch RTU'), 'Dressing Ranch');
  assert.equal(P.displayName('Beet Red Sliced Salad Bar'), 'Beet Red Sliced');
  assert.equal(P.displayName('Roll Dinner Assorted Square 1.2oz'), 'Roll Dinner Assorted Square');
  assert.equal(P.displayName('Noodle Pho VEGAN SG'), 'Noodle Pho VEGAN');
  assert.equal(P.displayName('AF'), 'AF');
});

// ── targets ──
test('Mifflin–St Jeor with a 1 lb/week deficit', () => {
  const t = P.computeTargets(him);
  assert.equal(t.bmr, 1810);
  assert.equal(t.tdee, 2806);
  assert.equal(t.kcal, 2310);
  assert.equal(t.protein, 175);
  assert.equal(t.kcal, Math.round((t.protein * 4 + t.fat * 9 + t.carbs * 4) / 10) * 10);
});

test('caps the pace at 1% of bodyweight a week and never drops below the floor', () => {
  const fast = P.computeTargets({ ...her, weightLb: 110, heightIn: 60, rateLb: 2, activity: 'sedentary' });
  assert.equal(fast.rateCapped, true);
  assert.equal(fast.rateLb, 1.1);
  assert.equal(fast.kcal, 1200);
  assert.equal(fast.floored, true);
});

test('protein is set off a BMI-25 weight for heavier builds', () => {
  const t = P.computeTargets({ ...him, weightLb: 260 });
  assert.ok(t.protein < 200 && t.protein > 160, `protein ${t.protein}`);
});

// ── planning ──
for (const [who, prof] of [['him', him], ['her', her]]) {
  const mt = P.mealTargets(P.computeTargets(prof), prof);
  const plan = P.planDay(day, mt, { diet: 'any', avoid: [] });

  test(`${who}: each meal lands within 6% of its calories and meets protein`, () => {
    for (const k of ['lunch', 'dinner']) {
      const best = plan[k].plans[0], tgt = plan[k].target;
      assert.ok(Math.abs(best.totals.kcal - tgt.kcal) / tgt.kcal <= 0.06, `${k} ${best.totals.kcal} vs ${tgt.kcal}`);
      assert.ok(best.totals.protein >= tgt.protein * 0.95, `${k} protein ${best.totals.protein} vs ${tgt.protein}`);
    }
  });

  test(`${who}: plans never include treats, drinks or condiments, and offer alternatives`, () => {
    for (const k of ['lunch', 'dinner']) {
      assert.ok(plan[k].plans.length >= 2);
      for (const p of plan[k].plans) {
        for (const x of p.picks) assert.ok(['protein', 'carb', 'veg', 'mixed'].includes(P.classify(x.item)), x.item.name);
      }
      const anchors = plan[k].plans.map(p => p.picks.slice().sort((a, b) => b.protein - a.protein)[0].item.name);
      assert.equal(new Set(anchors).size, anchors.length, 'alternatives are built on different mains');
      const sets = plan[k].plans.map(p => p.picks.filter(x => x.role === 'protein').map(x => x.item.name).sort().join('+'));
      assert.equal(new Set(sets).size, sets.length, 'alternatives use different proteins, not just different amounts');
    }
  });

  test(`${who}: dinner does not repeat lunch's main when it has a choice`, () => {
    const lunchNames = new Set(plan.lunch.plans[0].picks.map(p => p.item.name));
    const dinnerMain = plan.dinner.plans[0].picks.slice().sort((a, b) => b.protein - a.protein)[0].item.name;
    assert.ok(!lunchNames.has(dinnerMain), dinnerMain);
  });
}

test('vegan and allergen filters are respected', () => {
  const mt = P.mealTargets(P.computeTargets(him), him);
  const vegan = P.planDay(day, mt, { diet: 'vegan', avoid: [] });
  for (const p of vegan.lunch.plans.concat(vegan.dinner.plans)) {
    for (const x of p.picks) assert.ok(x.item.diet.includes('vegan'), x.item.name);
  }
  const noSoy = P.planDay(day, mt, { diet: 'any', avoid: ['Soybeans', 'Fish'] });
  for (const p of noSoy.lunch.plans.concat(noSoy.dinner.plans)) {
    for (const x of p.picks) assert.ok(!x.item.allergens.some(a => a === 'Soybeans' || a === 'Fish'), x.item.name);
  }
});

test('dislikes remove matching dishes', () => {
  const mt = P.mealTargets(P.computeTargets(him), him);
  const plan = P.planDay(day, mt, { diet: 'any', avoid: [], dislikes: ['chicken'] });
  for (const p of plan.lunch.plans) for (const x of p.picks) assert.ok(!/chicken/i.test(x.item.name), x.item.name);
});

test('counted items come in whole servings', () => {
  const mt = P.mealTargets(P.computeTargets(him), him);
  const plan = P.planDay(day, mt, { diet: 'vegetarian', avoid: [] });
  for (const p of plan.lunch.plans) for (const x of p.picks) {
    if (x.item.serving && /each/i.test(x.item.serving.unit)) assert.equal(x.mult % 1, 0, x.item.name);
  }
});

test('a second main is never a half-serving filler', () => {
  for (const prof of [him, her]) {
    const plan = P.planDay(day, P.mealTargets(P.computeTargets(prof), prof), { diet: 'any', avoid: [] });
    for (const k of ['lunch', 'dinner']) for (const p of plan[k].plans) {
      const mains = p.picks.filter(x => x.role === 'protein');
      if (mains.length > 1) for (const x of mains) assert.ok(x.mult >= 1, `${x.mult}x ${x.item.name}`);
    }
  }
});

test('an empty or missing meal yields no plans rather than throwing', () => {
  assert.deepEqual(P.planMeal(null, { kcal: 600, protein: 50, fat: 15 }, {}).plans, []);
  const none = P.planDay({ meals: [] }, P.mealTargets(P.computeTargets(him), him), {});
  assert.equal(none.lunch, null);
  assert.equal(none.dinner, null);
});

// ── locations ──
test('a café posting one all-day menu serves both lunch and dinner', () => {
  const cafe = { key: 'Golden_Bear_Cafe', meals: [{ name: 'Breakfast', items: [] }, { name: 'All Day', items: lunch.items }] };
  assert.equal(P.slotMeal(cafe, 'lunch').name, 'All Day');
  assert.equal(P.slotMeal(cafe, 'dinner').name, 'All Day');
  const hall = { key: 'Crossroads', meals: day.meals };
  assert.equal(P.slotMeal(hall, 'lunch').name, 'Lunch');
  assert.equal(P.slotMeal(hall, 'dinner').name, 'Dinner');
  assert.equal(P.slotMeal({ meals: [{ name: 'Breakfast', items: [] }] }, 'lunch'), null);
  // A café that only posts Lunch is closed by dinner, not open for it.
  const lunchOnly = { meals: [{ name: 'Breakfast', items: [] }, { name: 'Lunch', items: lunch.items }] };
  assert.equal(P.slotMeal(lunchOnly, 'lunch').name, 'Lunch');
  assert.equal(P.slotMeal(lunchOnly, 'dinner'), null);
});

test('café items are planned in whole items only', () => {
  const d = P.normalizeDay({ date: 'x', locations: [{ key: 'Gateway_Cafe', kind: 'cafe', meals: [{ name: 'Lunch', items: lunch.items }] }] });
  const meal = P.slotMeal(d.locations[0], 'lunch');
  assert.equal(meal.whole, true);
  const mt = P.mealTargets(P.computeTargets(him), him);
  const plans = P.planMeal(meal, mt.lunch, {}).plans;
  assert.ok(plans.length);
  for (const p of plans) for (const x of p.picks) {
    assert.equal(x.mult % 1, 0, `${x.mult}× ${x.item.name}`);
    assert.equal(P.portion(x).cue, 'Order ' + x.mult);
  }
  assert.equal(P.displayName('Wrap Chicken Souvlaki GW'), 'Wrap Chicken Souvlaki');
  assert.equal(P.displayName('Chicken Tikka Masala MONSOON'), 'Chicken Tikka Masala MONSOON');
});

test('old Crossroads-only day files read as one location', () => {
  const old = { date: '2026-11-02', fetchedAt: 'x', source: 'u', meals: day.meals };
  const d = P.normalizeDay(old);
  assert.equal(d.locations.length, 1);
  assert.equal(d.locations[0].key, 'Crossroads');
  assert.equal(d.locations[0].meals, day.meals);
  const fresh = { date: '2026-11-02', locations: [{ key: 'Cafe_3', meals: [] }] };
  assert.equal(P.normalizeDay(fresh), fresh);
});

test('lunch and dinner can come from different locations', () => {
  const mt = P.mealTargets(P.computeTargets(him), him);
  const pair = P.planPair(lunch, dinner, mt, { diet: 'any', avoid: [] });
  assert.ok(pair.lunch.plans.length && pair.dinner.plans.length);
  const lunchOnly = P.planPair(lunch, null, mt, {});
  assert.equal(lunchOnly.dinner, null);
  const dinnerOnly = P.planPair(null, dinner, mt, {});
  assert.equal(dinnerOnly.lunch, null);
  assert.equal(dinnerOnly.dinner.target.kcal, mt.dinner.kcal);
});

// ── portions & trend ──
test('portions read in servings, amounts and hand-size cues', () => {
  const chicken = byName(lunch, 'Grilled Lemon Herb Chicken Breast');
  assert.deepEqual(P.portion({ item: chicken, mult: 1.5, role: 'protein' }), { servings: '1½ servings', amount: '6 oz', cue: '≈ 1½ palm-sized pieces' });
  const egg = byName(lunch, 'Hard Boiled Egg');
  assert.equal(P.portion({ item: egg, mult: 2, role: 'protein' }).cue, '2 pieces');
  const lettuce = byName(lunch, 'Romaine Lettuce');
  assert.equal(P.portion({ item: lettuce, mult: 2, role: 'veg' }).cue, '≈ 2 fists');
});

test('weekly trend compares 7-day averages and suggests a calorie nudge', () => {
  const log = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(Date.UTC(2026, 9, 1 + i)).toISOString().slice(0, 10);
    log.push({ date: d, lb: (i < 7 ? 180 : 179.8) });
  }
  const t = P.weeklyTrend(log);
  assert.equal(t.ready, true);
  assert.equal(t.lostPerWeek, 0.2);
  assert.equal(P.adjustment(t, 1, 180).kcal, -150);
  assert.equal(P.adjustment({ ready: true, lostPerWeek: 1 }, 1, 180).kcal, 0);
  assert.equal(P.adjustment({ ready: true, lostPerWeek: 2.5 }, 1, 180).kcal, 150);
  assert.equal(P.weeklyTrend(log.slice(0, 4)).ready, false);
});

console.log(`${passed} passed${process.exitCode ? ', some failed' : ''}`);
