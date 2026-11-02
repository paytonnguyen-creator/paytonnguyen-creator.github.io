/* Crossroads cut planner — the page. All the maths lives in planner.js. */
(function () {
  'use strict';
  var P = window.CrossroadsPlanner;
  var $ = function (id) { return document.getElementById(id); };

  var ALLERGENS = ['Milk', 'Egg', 'Fish', 'Shellfish', 'Tree Nuts', 'Peanuts', 'Wheat', 'Gluten', 'Soybeans', 'Sesame', 'Pork', 'Alcohol'];
  var DEFAULTS = {
    sex: '', age: 20, heightIn: 69, weightLb: null, activity: 'moderate', rateLb: 1,
    otherKcal: 400, otherProtein: 30, lunchShare: 0.5,
    diet: 'any', avoid: [], dislikes: [], kcalAdjust: 0
  };

  /* ── storage (per-device; the page works without it) ── */
  function load(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode: fine */ }
  }

  var state = {
    profile: Object.assign({}, DEFAULTS, load('xr:profile', {})),
    weights: load('xr:weights', []),
    index: null, date: null, day: null,
    choice: {}
  };
  function hasProfile() { return !!(state.profile.sex && state.profile.weightLb); }

  /* ── helpers ── */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function n0(x) { return Math.round(x).toLocaleString('en-US'); }
  function pacificToday() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
  }
  function asDate(iso) { return new Date(iso + 'T12:00:00Z'); }
  function fmtDay(iso, opts) {
    return asDate(iso).toLocaleDateString('en-US', Object.assign({ timeZone: 'UTC' }, opts));
  }
  function dayLabel(iso) {
    var today = pacificToday();
    var diff = Math.round((asDate(iso) - asDate(today)) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    return fmtDay(iso, { weekday: 'short', month: 'short', day: 'numeric' });
  }
  // floor: true for protein, where going over the target is fine on a cut.
  function meter(value, target, label, floor) {
    var pct = target ? Math.min(140, (value / target) * 100) : 0;
    var off = Math.abs(value - target) / (target || 1);
    var cls = off <= 0.06 || (floor && value > target) ? 'ok' : value > target ? 'over' : 'under';
    return '<div class="meter ' + cls + '" role="img" aria-label="' + esc(label + ': ' + n0(value) + ' of ' + n0(target)) + '">' +
      '<span style="width:' + Math.min(100, pct).toFixed(1) + '%"></span></div>';
  }

  /* ── data ── */
  function getJson(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    });
  }

  function pickDate(dates) {
    var today = pacificToday();
    if (dates.indexOf(today) >= 0) return today;
    var future = dates.filter(function (d) { return d > today; });
    return future.length ? future[0] : dates[dates.length - 1];
  }

  function loadIndex() {
    return getJson('data/index.json').then(function (idx) {
      state.index = idx;
      var dates = (idx.dates || []).filter(function (d) { return d >= addDays(pacificToday(), -1); });
      if (!dates.length) dates = (idx.dates || []).slice(-1);
      state.index.shown = dates;
      if (!dates.length) {
        showNotice('No Crossroads menus have been fetched yet. The updater runs every morning; once it has run, today’s plan appears here.');
        $('day-title').textContent = 'No menu yet';
        renderSource();
        return;
      }
      var hash = location.hash.replace('#', '');
      return selectDate(dates.indexOf(hash) >= 0 ? hash : pickDate(dates));
    }).catch(function () {
      $('day-title').textContent = 'Couldn’t load the menu';
      showNotice('The menu data didn’t load. Check your connection and refresh.');
    });
  }

  function addDays(iso, n) {
    var d = asDate(iso); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
  }

  function selectDate(iso) {
    state.date = iso;
    state.choice = load('xr:choice:' + iso, {});
    renderDays();
    $('day-title').textContent = fmtDay(iso, { weekday: 'long', month: 'long', day: 'numeric' });
    return getJson('data/' + iso + '.json').then(function (day) {
      state.day = day;
      hideNotice();
      var today = pacificToday();
      if (iso < today) showNotice('Today’s menu isn’t posted yet, so this is ' + fmtDay(iso, { weekday: 'long' }) + '’s.', 'soft');
      else if (iso > today) showNotice('Planning ahead for ' + fmtDay(iso, { weekday: 'long', month: 'short', day: 'numeric' }) + '.', 'soft');
      render();
    }).catch(function () {
      state.day = null;
      showNotice('That day’s menu didn’t load. Try another day or refresh.');
      render();
    });
  }

  /* ── rendering ── */
  function showNotice(text, kind) {
    var n = $('notice'); n.textContent = text; n.className = 'notice' + (kind ? ' ' + kind : ''); n.hidden = false;
  }
  function hideNotice() { $('notice').hidden = true; }

  function renderDays() {
    var dates = (state.index && state.index.shown) || [];
    $('days').innerHTML = dates.map(function (d) {
      var on = d === state.date;
      return '<button type="button" role="tab" class="chip' + (on ? ' on' : '') + '" aria-selected="' + on + '" data-date="' + d + '">' +
        '<span>' + esc(dayLabel(d)) + '</span>' +
        (dayLabel(d).length < 10 ? '<small>' + esc(fmtDay(d, { month: 'short', day: 'numeric' })) + '</small>' : '') +
        '</button>';
    }).join('');
  }

  function prefs() {
    return { diet: state.profile.diet, avoid: state.profile.avoid, dislikes: state.profile.dislikes };
  }

  function render() {
    renderSource();
    var ready = hasProfile();
    $('tips').hidden = !state.day;
    $('weigh').hidden = !ready;
    if (!ready) {
      $('targets').hidden = true;
      $('day-total').hidden = true;
      $('meals').innerHTML = '';
      // Don't re-fill the form if it's already open — that would wipe what's been typed.
      if ($('settings').hidden) openSettings(true);
      renderMenu(null);
      return;
    }
    var t = P.computeTargets(state.profile);
    var mt = P.mealTargets(t, state.profile);
    renderTargets(t, mt);
    renderWeights(t);
    if (!state.day) { $('meals').innerHTML = ''; $('day-total').hidden = true; renderMenu(null); return; }

    var plan = P.planDay(state.day, mt, prefs(), state.choice);
    $('meals').innerHTML = mealCard('lunch', plan.lunch, 'Lunch') + mealCard('dinner', plan.dinner, 'Dinner');
    renderDayTotal(plan, mt, t);
    renderMenu(plan);
  }

  function renderTargets(t, mt) {
    var p = state.profile, notes = [];
    if (t.rateCapped) notes.push('Pace capped at ' + t.rateLb.toFixed(1) + ' lb/week — 1% of your bodyweight. Faster than that tends to cost muscle.');
    if (t.floored) notes.push('Held at the ' + (p.sex === 'female' ? '1,200' : '1,500') + ' kcal floor. Going lower makes a cut harder to sustain, not faster in any way that lasts.');
    if (p.kcalAdjust) notes.push('Includes a ' + (p.kcalAdjust > 0 ? '+' : '−') + Math.abs(p.kcalAdjust) + ' kcal adjustment from your weigh-ins. <button type="button" class="link" data-act="reset-adjust">Reset</button>');
    var other = (p.otherKcal || p.otherProtein) ?
      '<p class="muted small">Minus ' + n0(p.otherKcal || 0) + ' kcal / ' + n0(p.otherProtein || 0) + ' g protein for breakfast &amp; snacks.</p>' : '';
    $('targets').innerHTML =
      '<div class="t-head"><h2 id="targets-title">Daily targets</h2>' +
      '<span class="muted small">Maintenance ≈ ' + n0(t.tdee) + ' kcal · cutting ' + t.rateLb.toFixed(2).replace(/0$/, '') + ' lb/week</span></div>' +
      '<div class="t-grid">' +
      stat(n0(t.kcal), 'kcal', 'Calories') + stat(t.protein, 'g', 'Protein') + stat(t.fat, 'g', 'Fat') + stat(t.carbs, 'g', 'Carbs') +
      '</div>' +
      '<div class="t-split">' +
      '<div><span class="label">Lunch</span><strong>' + n0(mt.lunch.kcal) + ' kcal</strong> · ' + mt.lunch.protein + ' g protein</div>' +
      '<div><span class="label">Dinner</span><strong>' + n0(mt.dinner.kcal) + ' kcal</strong> · ' + mt.dinner.protein + ' g protein</div>' +
      '</div>' + other +
      notes.map(function (x) { return '<p class="note">' + x + '</p>'; }).join('');
    $('targets').hidden = false;
  }

  function stat(v, unit, label) {
    return '<div class="stat"><span class="v">' + v + '<small>' + unit + '</small></span><span class="l">' + label + '</span></div>';
  }

  function anchorName(plan) {
    var top = plan.picks.slice().sort(function (a, b) { return b.protein - a.protein; })[0];
    return top ? P.displayName(top.item.name) : 'Plan';
  }

  function shortName(name) {
    var s = name.replace(/^(grilled|roasted|roast|baked|steamed|seasoned|sautéed|sauteed|braised|fried|crispy|house|classic)\s+/i, '');
    return s.length > 22 ? s.slice(0, 21).replace(/\s+\S*$/, '') + '…' : s;
  }

  var ROLE = { protein: 'Protein', carb: 'Starch', veg: 'Veg', mixed: 'Main' };

  function mealCard(slot, s, fallbackName) {
    if (!s) {
      return '<article class="card meal empty"><h2>' + fallbackName + '</h2><p class="muted">Crossroads isn’t serving ' +
        fallbackName.toLowerCase() + ' on this day.</p></article>';
    }
    var m = s.meal;
    var hours = m.start && m.end ? '<span class="hours">' + esc(fmtTime(m.start)) + ' – ' + esc(fmtTime(m.end)) + '</span>' : '';
    if (!s.plans.length) {
      return '<article class="card meal"><header class="m-head"><h2>' + esc(m.name) + '</h2>' + hours + '</header>' +
        '<p class="muted">Nothing on this menu fits your filters. Loosen the diet or allergen settings, or browse the full menu below.</p></article>';
    }
    var chosen = s.plans[s.chosen];
    var tabs = s.plans.length > 1 ? '<div class="plans" role="tablist" aria-label="' + esc(m.name) + ' options">' +
      s.plans.map(function (p, i) {
        return '<button type="button" role="tab" class="pt' + (i === s.chosen ? ' on' : '') + '" aria-selected="' + (i === s.chosen) +
          '" data-slot="' + slot + '" data-plan="' + i + '"><span>' + String.fromCharCode(65 + i) + '</span>' + esc(shortName(anchorName(p))) + '</button>';
      }).join('') + '</div>' : '';

    var rows = chosen.picks.slice().sort(function (a, b) {
      return ['protein', 'mixed', 'carb', 'veg'].indexOf(a.role) - ['protein', 'mixed', 'carb', 'veg'].indexOf(b.role);
    }).map(function (pk) {
      var por = P.portion(pk);
      var amount = [por.amount, por.cue].filter(Boolean).join(' · ');
      return '<li class="pick">' +
        '<div class="p-main">' +
        '<span class="role ' + pk.role + '">' + (ROLE[pk.role] || 'Side') + '</span>' +
        '<span class="p-name">' + esc(P.displayName(pk.item.name)) + '</span>' +
        '<span class="p-station">' + esc(pk.item.station) + '</span>' +
        '</div>' +
        '<div class="p-portion"><strong>' + esc(por.servings) + '</strong>' + (amount ? '<span>' + esc(amount) + '</span>' : '') + '</div>' +
        '<div class="p-macros"><span>' + n0(pk.kcal) + ' kcal</span><span>' + n0(pk.protein) + ' g P</span></div>' +
        '</li>';
    }).join('');

    var tot = chosen.totals, tg = s.target;
    var shifted = s.nominal && Math.abs(s.target.kcal - s.nominal.kcal) >= 20;
    var adjusted = shifted ?
      '<p class="muted small">Dinner’s target moved from ' + n0(s.nominal.kcal) + ' to ' + n0(s.target.kcal) +
      ' kcal to balance out the lunch you picked.</p>' : '';
    return '<article class="card meal" aria-labelledby="h-' + slot + '">' +
      '<header class="m-head"><h2 id="h-' + slot + '">' + esc(m.name) + '</h2>' + hours + '</header>' +
      tabs +
      '<ol class="picks">' + rows + '</ol>' +
      '<div class="m-tot">' +
      '<div><span class="label">Calories</span><span class="nums"><strong>' + n0(tot.kcal) + '</strong> / ' + n0(tg.kcal) + '</span>' + meter(tot.kcal, tg.kcal, 'Calories') + '</div>' +
      '<div><span class="label">Protein</span><span class="nums"><strong>' + tot.protein + ' g</strong> / ' + tg.protein + ' g</span>' + meter(tot.protein, tg.protein, 'Protein', true) + '</div>' +
      '<div class="minor"><span>Fat ' + tot.fat + ' g</span><span>Carbs ' + tot.carbs + ' g</span><span>Fiber ' + tot.fiber + ' g</span></div>' +
      '</div>' + adjusted +
      '</article>';
  }

  function renderDayTotal(plan, mt, t) {
    var kcal = 0, protein = 0, have = 0;
    ['lunch', 'dinner'].forEach(function (k) {
      var s = plan[k];
      if (s && s.plans.length) { kcal += s.plans[s.chosen].totals.kcal; protein += s.plans[s.chosen].totals.protein; have++; }
    });
    if (!have) { $('day-total').hidden = true; return; }
    var p = state.profile;
    var dayK = kcal + (p.otherKcal || 0), dayP = protein + (p.otherProtein || 0);
    var short = t.protein - dayP;
    var tip = short > t.protein * 0.1 ?
      '<p class="note">About <strong>' + Math.round(short) + ' g</strong> short on protein today. A scoop of protein powder (~25 g) or a cup of Greek yogurt (~20 g) closes it cheaply.</p>' : '';
    $('day-total').innerHTML = '<h2>Whole day</h2>' +
      '<div class="m-tot">' +
      '<div><span class="label">Calories</span><span class="nums"><strong>' + n0(dayK) + '</strong> / ' + n0(t.kcal) + '</span>' + meter(dayK, t.kcal, 'Day calories') + '</div>' +
      '<div><span class="label">Protein</span><span class="nums"><strong>' + n0(dayP) + ' g</strong> / ' + t.protein + ' g</span>' + meter(dayP, t.protein, 'Day protein', true) + '</div>' +
      '</div>' +
      '<p class="muted small">Includes ' + n0(p.otherKcal || 0) + ' kcal / ' + n0(p.otherProtein || 0) + ' g from breakfast &amp; snacks.</p>' + tip;
    $('day-total').hidden = false;
  }

  function renderMenu(plan) {
    var card = $('menu-card');
    if (!state.day) { card.hidden = true; return; }
    var chosenKeys = {};
    if (plan) ['lunch', 'dinner'].forEach(function (k) {
      var s = plan[k];
      if (s && s.plans.length) s.plans[s.chosen].picks.forEach(function (pk) { chosenKeys[k + '|' + pk.item.name] = true; });
    });
    var pr = prefs();
    var names = state.day.meals.map(function (m) { return m.name; });
    var open = load('xr:menu-open', 'Lunch');
    if (names.indexOf(open) < 0) open = names.filter(function (n) { return n !== 'Breakfast'; })[0] || names[0];
    var html = state.day.meals.map(function (m) {
      var slot = m.name === 'Dinner' ? 'dinner' : (m.name === 'Lunch' || m.name === 'Brunch') ? 'lunch' : null;
      var items = m.items.filter(function (i) { return i.n.kcal != null; }).slice().sort(function (a, b) {
        return density(b) - density(a);
      });
      var rows = items.map(function (i) {
        var role = P.classify(i), ok = P.eligible(i, pr);
        var lean = (i.n.protein || 0) >= 10 && density(i) >= 10;
        var inPlan = slot && chosenKeys[slot + '|' + i.name];
        var serving = i.serving ? esc(trimNum(i.serving.qty) + ' ' + i.serving.unit) : '';
        return '<tr class="' + (ok ? '' : 'off') + (inPlan ? ' inplan' : '') + '">' +
          '<th scope="row"><span class="mi-name">' + esc(P.displayName(i.name)) + '</span>' +
          (lean ? ' <span class="tag lean">Lean</span>' : '') +
          (inPlan ? ' <span class="tag plan">In plan</span>' : '') +
          (role === 'treat' ? ' <span class="tag">Treat</span>' : '') +
          (P.suspect(i) ? ' <span class="tag warn">Check label</span>' : '') +
          '<span class="mi-sub">' + esc(i.station) + (serving ? ' · ' + serving : '') +
          (P.suspect(i) ? ' · Cal Dining’s numbers don’t add up, so it’s left out of plans' : ok ? '' : ' · filtered out') + '</span></th>' +
          '<td>' + n0(i.n.kcal) + '</td><td>' + n0(i.n.protein || 0) + '</td><td>' + n0(i.n.fat || 0) + '</td><td>' + n0(i.n.carbs || 0) + '</td></tr>';
      }).join('');
      return '<details' + (m.name === open ? ' open' : '') + ' data-meal="' + esc(m.name) + '"><summary>' + esc(m.name) +
        ' <span class="muted">' + items.length + ' items</span></summary>' +
        '<div class="tablewrap"><table class="menu-table"><thead><tr><th scope="col">Item</th><th scope="col">kcal</th><th scope="col">Protein</th><th scope="col">Fat</th><th scope="col">Carbs</th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table></div></details>';
    }).join('');
    $('menu').innerHTML = html;
    card.hidden = false;
  }

  // The export gives 24-hour times ("16:30"); older files said "4:30 PM".
  function fmtTime(t) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(t).trim());
    if (!m) return t;
    var h = +m[1], ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + (m[2] === '00' ? '' : ':' + m[2]) + ' ' + ap;
  }

  function density(i) { return i.n.kcal ? ((i.n.protein || 0) / i.n.kcal) * 100 : 0; }
  function trimNum(x) { var r = Math.round(x * 100) / 100; return String(r); }

  function renderSource() {
    var bits = ['Menus from <a href="https://dining.berkeley.edu/menus/" target="_blank" rel="noopener">Cal Dining</a>, refreshed every morning.'];
    if (state.day && state.day.fetchedAt) {
      bits.push('This day fetched ' + new Date(state.day.fetchedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + '.');
    }
    $('source').innerHTML = bits.join(' ');
  }

  /* ── weigh-ins ── */
  function renderWeights(t) {
    var form = $('weigh-form');
    if (!form.date.value) form.date.value = pacificToday();
    var list = state.weights.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    $('log').innerHTML = list.slice(0, 10).map(function (e) {
      return '<li><span>' + esc(fmtDay(e.date, { weekday: 'short', month: 'short', day: 'numeric' })) + '</span><strong>' + e.lb.toFixed(1) + ' lb</strong>' +
        '<button type="button" class="link" data-act="del-weight" data-date="' + esc(e.date) + '" aria-label="Delete ' + esc(e.date) + '">×</button></li>';
    }).join('');

    var trend = P.weeklyTrend(state.weights);
    var html = '';
    if (!trend) html = '<p class="muted small">Log a few weigh-ins and the plan will start checking your pace.</p>';
    else if (!trend.ready) html = '<p class="muted small">Need at least 3 weigh-ins in each of the last two weeks to read a trend (' + trend.have + ' so far).</p>';
    else {
      var adj = P.adjustment(trend, t.rateLb, state.profile.weightLb);
      var lost = trend.lostPerWeek;
      html = '<div class="trend"><div><span class="label">7-day average</span><strong>' + trend.current.toFixed(1) + ' lb</strong></div>' +
        '<div><span class="label">Week over week</span><strong>' + (lost >= 0 ? '−' : '+') + Math.abs(lost).toFixed(1) + ' lb</strong></div>' +
        '<div><span class="label">Target</span><strong>−' + t.rateLb.toFixed(1) + ' lb</strong></div></div>';
      if (adj && adj.kcal) {
        html += '<p class="note">You’re losing ' + esc(adj.why) + '. Suggest <strong>' + (adj.kcal > 0 ? '+' : '−') + Math.abs(adj.kcal) +
          ' kcal/day</strong>. <button type="button" class="btn small primary" data-act="apply-adjust" data-kcal="' + adj.kcal + '">Apply</button></p>';
      } else if (adj) {
        html += '<p class="note ok">Right on pace — keep the targets as they are.</p>';
      }
    }
    $('trend').innerHTML = html;
  }

  /* ── settings ── */
  function openSettings(first) {
    var f = $('settings-form'), p = state.profile;
    $('settings').hidden = false;
    $('settings-intro').textContent = first ?
      'Tell it about you once and it plans every day’s lunch and dinner from Crossroads’ menu. Saved on this device only — nothing is sent anywhere.' :
      'Used to work out your cut targets. Saved on this device only and never sent anywhere.';
    $('close-settings').hidden = !!first;
    if (p.sex) f.querySelector('input[name=sex][value=' + p.sex + ']').checked = true;
    f.age.value = p.age;
    f.heightFt.value = Math.floor(p.heightIn / 12);
    f.heightInRem.value = Math.round((p.heightIn % 12) * 2) / 2;
    f.weightLb.value = p.weightLb || '';
    f.activity.value = p.activity;
    f.rateLb.value = String(p.rateLb);
    f.otherKcal.value = p.otherKcal;
    f.otherProtein.value = p.otherProtein;
    f.lunchShare.value = String(p.lunchShare);
    f.diet.value = p.diet;
    f.dislikes.value = (p.dislikes || []).join(', ');
    var known = ALLERGENS.slice();
    if (state.day) state.day.meals.forEach(function (m) { m.items.forEach(function (i) {
      (i.allergens || []).forEach(function (a) { if (known.indexOf(a) < 0) known.push(a); });
    }); });
    $('avoid').innerHTML = known.map(function (a) {
      return '<label><input type="checkbox" name="avoid" value="' + esc(a) + '"' + ((p.avoid || []).indexOf(a) >= 0 ? ' checked' : '') + '> ' + esc(a) + '</label>';
    }).join('');
    if (!first) $('settings').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function closeSettings() { $('settings').hidden = true; $('settings-error').hidden = true; }

  function readSettings() {
    var f = $('settings-form');
    var sex = (f.querySelector('input[name=sex]:checked') || {}).value;
    var num = function (el) { var v = parseFloat(el.value); return isFinite(v) ? v : null; };
    var heightIn = (num(f.heightFt) || 0) * 12 + (num(f.heightInRem) || 0);
    var p = {
      sex: sex, age: num(f.age), heightIn: heightIn, weightLb: num(f.weightLb),
      activity: f.activity.value, rateLb: parseFloat(f.rateLb.value),
      otherKcal: Math.max(0, num(f.otherKcal) || 0), otherProtein: Math.max(0, num(f.otherProtein) || 0),
      lunchShare: parseFloat(f.lunchShare.value), diet: f.diet.value,
      avoid: Array.prototype.map.call(f.querySelectorAll('input[name=avoid]:checked'), function (c) { return c.value; }),
      dislikes: f.dislikes.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean),
      kcalAdjust: state.profile.kcalAdjust || 0
    };
    var errs = [];
    if (!p.sex) errs.push('pick male or female');
    if (!p.age || p.age < 16 || p.age > 80) errs.push('age between 16 and 80');
    if (heightIn < 54 || heightIn > 90) errs.push('a height between 4′6″ and 7′6″');
    if (!p.weightLb || p.weightLb < 80 || p.weightLb > 450) errs.push('your weight in pounds');
    return { profile: p, errors: errs };
  }

  /* ── events ── */
  function wire() {
    var act = $('activity');
    act.innerHTML = Object.keys(P.ACTIVITY).map(function (k) {
      return '<option value="' + k + '">' + esc(P.ACTIVITY[k].label) + '</option>';
    }).join('');

    $('open-settings').addEventListener('click', function () { openSettings(!hasProfile()); });
    $('close-settings').addEventListener('click', closeSettings);
    $('settings-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var r = readSettings();
      if (r.errors.length) {
        var el = $('settings-error'); el.textContent = 'Still need: ' + r.errors.join(', ') + '.'; el.hidden = false;
        return;
      }
      var firstTime = !hasProfile();
      state.profile = r.profile;
      save('xr:profile', state.profile);
      if (firstTime && !state.weights.length) {
        state.weights.push({ date: pacificToday(), lb: r.profile.weightLb });
        save('xr:weights', state.weights);
      }
      closeSettings();
      render();
      $('targets').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    $('days').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-date]');
      if (!b || b.dataset.date === state.date) return;
      history.replaceState(null, '', '#' + b.dataset.date);
      selectDate(b.dataset.date);
    });

    $('meals').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-plan]');
      if (!b) return;
      state.choice[b.dataset.slot] = parseInt(b.dataset.plan, 10);
      // A different lunch re-plans dinner around it, so dinner's pick resets.
      if (b.dataset.slot === 'lunch') state.choice.dinner = 0;
      save('xr:choice:' + state.date, state.choice);
      render();
    });

    $('menu').addEventListener('toggle', function (e) {
      if (e.target.open && e.target.dataset.meal) save('xr:menu-open', e.target.dataset.meal);
    }, true);

    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (!b) return;
      var a = b.dataset.act;
      if (a === 'reset-adjust') { state.profile.kcalAdjust = 0; save('xr:profile', state.profile); render(); }
      if (a === 'apply-adjust') {
        state.profile.kcalAdjust = Math.max(-500, Math.min(500, (state.profile.kcalAdjust || 0) + parseInt(b.dataset.kcal, 10)));
        save('xr:profile', state.profile);
        render();
      }
      if (a === 'del-weight') {
        state.weights = state.weights.filter(function (w) { return w.date !== b.dataset.date; });
        save('xr:weights', state.weights);
        render();
      }
    });

    $('weigh-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, lb = parseFloat(f.lb.value), date = f.date.value;
      if (!date || !(lb >= 80 && lb <= 450)) return;
      state.weights = state.weights.filter(function (w) { return w.date !== date; }).concat([{ date: date, lb: lb }]);
      save('xr:weights', state.weights);
      // Keep the calorie maths on current weight.
      var latest = state.weights.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; })[0];
      state.profile.weightLb = latest.lb;
      save('xr:profile', state.profile);
      f.lb.value = '';
      render();
    });
  }

  wire();
  if (!hasProfile()) openSettings(true);
  loadIndex();
})();
