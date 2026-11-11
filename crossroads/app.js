/* Payton's cut plan — the page. All the maths lives in planner.js.
 *
 * Built for one person, so there's no setup: ME holds Payton's numbers and the
 * page opens straight to today's lunch and dinner. "My numbers" can override
 * them (saved on this phone), and logging a weigh-in keeps the weight current.
 */
(function () {
  'use strict';
  var P = window.CrossroadsPlanner;
  var $ = function (id) { return document.getElementById(id); };

  var ME = {
    sex: 'male', age: 20, heightIn: 69, weightLb: 155,
    activity: 'moderate',          // lifts 3–5×/week
    rateLb: 1,                     // 1 lb/week ≈ 0.65% of bodyweight
    otherKcal: 240, otherProtein: 12, // daily matcha latte (grande, 2% milk)
    lunchShare: 0.5, diet: 'any', avoid: [], dislikes: [], kcalAdjust: 0,
    home: 'Crossroads'             // where a meal plans by default
  };
  var ALLERGENS = ['Milk', 'Egg', 'Fish', 'Shellfish', 'Tree Nuts', 'Peanuts', 'Wheat', 'Gluten', 'Soybeans', 'Sesame', 'Pork', 'Alcohol'];
  var ROLE_ORDER = ['protein', 'mixed', 'carb', 'veg'];

  /* ── storage: per-phone conveniences; the page works without it ── */
  function load(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode */ }
  }

  var state = {
    me: Object.assign({}, ME, load('xr:me', {})),
    weights: load('xr:weights', []),
    index: null, date: null, day: null,
    choice: {}, got: {}
  };

  /* ── helpers ── */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function n0(x) { return Math.round(x).toLocaleString('en-US'); }
  var PT = 'America/Los_Angeles';
  function pacificToday() { return new Intl.DateTimeFormat('en-CA', { timeZone: PT }).format(new Date()); }
  function pacificHour() {
    var parts = new Intl.DateTimeFormat('en-US', { timeZone: PT, hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
    var h = 0, m = 0;
    parts.forEach(function (p) { if (p.type === 'hour') h = +p.value; if (p.type === 'minute') m = +p.value; });
    return h + m / 60;
  }
  function asDate(iso) { return new Date(iso + 'T12:00:00Z'); }
  function addDays(iso, n) { var d = asDate(iso); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function fmtDay(iso, opts) { return asDate(iso).toLocaleDateString('en-US', Object.assign({ timeZone: 'UTC' }, opts)); }
  function dayLabel(iso) {
    var diff = Math.round((asDate(iso) - asDate(pacificToday())) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    return fmtDay(iso, { weekday: 'short' });
  }
  // The export gives 24-hour times ("16:30").
  function fmtTime(t) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '').trim());
    if (!m) return t || '';
    var h = +m[1], ap = h >= 12 ? 'pm' : 'am';
    return (h % 12 || 12) + (m[2] === '00' ? '' : ':' + m[2]) + ap;
  }
  function hourOf(t) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '').trim());
    return m ? +m[1] + m[2] / 60 : null;
  }

  /* ── data ── */
  function getJson(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }

  function loadIndex() {
    return getJson('data/index.json').then(function (idx) {
      var today = pacificToday();
      var dates = (idx.dates || []).filter(function (d) { return d >= today; });
      if (!dates.length) dates = (idx.dates || []).slice(-1);
      state.index = { dates: dates, updatedAt: idx.updatedAt, locations: idx.locations };
      fillSettings();
      if (!dates.length) {
        $('day-title').textContent = 'No menu yet';
        showNotice('Crossroads menus haven’t been fetched yet. They update every morning.');
        return;
      }
      var hash = location.hash.replace('#', '');
      var pick = dates.indexOf(hash) >= 0 ? hash : dates.indexOf(today) >= 0 ? today : dates[0];
      // After dinner closes there's nothing left to plan today, so show tomorrow.
      var lateNight = pick === today && pacificHour() >= 21 && dates.indexOf(addDays(today, 1)) >= 0 && !hash;
      if (lateNight) pick = addDays(today, 1);
      return selectDate(pick).then(function () {
        if (lateNight) showNotice('Dining halls are closed for tonight. Here’s tomorrow’s plan.');
      });
    }).catch(function () {
      $('day-title').textContent = 'Couldn’t load the menu';
      showNotice('Check your connection and refresh.');
    });
  }

  function selectDate(iso) {
    state.date = iso;
    state.choice = load('xr:choice:' + iso, {});
    state.got = load('xr:got:' + iso, {});
    renderDays();
    $('day-title').textContent = dayLabel(iso) === 'Today' ? 'Today · ' + fmtDay(iso, { weekday: 'long', month: 'short', day: 'numeric' })
      : fmtDay(iso, { weekday: 'long', month: 'short', day: 'numeric' });
    return getJson('data/' + iso + '.json').then(function (day) {
      state.day = P.normalizeDay(day);
      hideNotice();
      render();
    }).catch(function () {
      state.day = null;
      showNotice('That day’s menu didn’t load. Try another day or refresh.');
      render();
    });
  }

  /* ── rendering ── */
  function showNotice(text) { var n = $('notice'); n.textContent = text; n.hidden = false; }
  function hideNotice() { $('notice').hidden = true; }

  function renderDays() {
    var dates = (state.index && state.index.dates) || [];
    $('days').innerHTML = dates.map(function (d) {
      var on = d === state.date;
      return '<button type="button" role="tab" class="chip' + (on ? ' on' : '') + '" aria-selected="' + on + '" data-date="' + d + '">' +
        esc(dayLabel(d)) + '<small>' + esc(fmtDay(d, { month: 'numeric', day: 'numeric' })) + '</small></button>';
    }).join('');
  }

  function prefs() { return { diet: state.me.diet, avoid: state.me.avoid, dislikes: state.me.dislikes }; }

  function render() {
    var me = state.me;
    var t = P.computeTargets(me);
    var mt = P.mealTargets(t, me);
    $('goal').innerHTML = '<strong>' + n0(t.kcal) + ' kcal</strong> · <strong>' + t.protein + ' g protein</strong> a day' +
      (me.otherKcal ? ' <span>(' + n0(me.otherKcal) + ' kcal of that is your matcha)</span>' : '');
    $('me-hint').textContent = me.weightLb + ' lb · ' + Math.floor(me.heightIn / 12) + '′' + (me.heightIn % 12) + '″';
    $('me-math').innerHTML = 'Maintenance ≈ ' + n0(t.tdee) + ' kcal. Cutting ' + t.rateLb.toFixed(2).replace(/0$/, '') +
      ' lb/week → ' + n0(t.kcal) + ' kcal, ' + t.protein + ' g protein, ' + t.fat + ' g fat, ' + t.carbs + ' g carbs.' +
      (t.rateCapped ? ' Pace capped at 1% of bodyweight a week.' : '') +
      (me.kcalAdjust ? ' Includes ' + (me.kcalAdjust > 0 ? '+' : '−') + Math.abs(me.kcalAdjust) + ' kcal from weigh-ins. <button type="button" class="link" data-act="reset-adjust">Undo</button>' : '');
    renderWeights(t);
    renderSource();
    if (!state.day) { $('meals').innerHTML = ''; $('day-total').hidden = true; $('menu').innerHTML = ''; return; }

    var lunchLoc = pickLoc('lunch'), dinnerLoc = pickLoc('dinner');
    var plan = P.planPair(lunchLoc && P.slotMeal(lunchLoc, 'lunch'), dinnerLoc && P.slotMeal(dinnerLoc, 'dinner'), mt, prefs(), state.choice);
    if (plan.lunch) plan.lunch.loc = lunchLoc;
    if (plan.dinner) plan.dinner.loc = dinnerLoc;
    var order = ['lunch', 'dinner'];
    var next = nextMeal(plan);
    if (next === 'dinner') order = ['dinner', 'lunch'];
    $('meals').innerHTML = order.map(function (slot) {
      var target = plan[slot] ? plan[slot].target : mt[slot];
      return mealCard(slot, plan[slot], next === slot, locChips(slot, target, plan[slot] && plan[slot].loc));
    }).join('');
    renderDayTotal(plan, t);
    renderMenu(plan);
  }

  /* ── locations ── */
  function locsServing(slot) {
    return state.day.locations.filter(function (l) { return P.slotMeal(l, slot); });
  }

  // The location a meal plans from: today's pick for it, else your usual hall,
  // else the first dining hall that serves it.
  function pickLoc(slot) {
    var serving = locsServing(slot);
    var want = [state.choice[slot + 'Loc'], state.me.home];
    for (var i = 0; i < want.length; i++) {
      for (var j = 0; j < serving.length; j++) if (serving[j].key === want[i]) return serving[j];
    }
    var halls = serving.filter(function (l) { return l.kind === 'hall'; });
    return halls[0] || serving[0] || null;
  }

  function fitOf(plan, target) {
    if (!plan) return null;
    var t = plan.totals, off = Math.abs(t.kcal - target.kcal) / target.kcal;
    return { protein: t.protein, kcal: t.kcal, good: off <= 0.08 && t.protein >= target.protein * 0.9 };
  }

  // One chip per place serving this meal, each showing how well its best
  // plate fits — so choosing where to eat is a glance, not a guess.
  function locChips(slot, target, current) {
    var serving = locsServing(slot);
    if (serving.length < 2) return '';
    var rank = function (l) { return (l.key === state.me.home ? 0 : l.kind === 'hall' ? 1 : 2); };
    serving = serving.slice().sort(function (a, b) { return rank(a) - rank(b); });
    return '<div class="locs" role="tablist" aria-label="Where to eat ' + slot + '">' + serving.map(function (l) {
      var best = P.planMeal(P.slotMeal(l, slot), target, prefs(), { alternatives: 1 }).plans[0];
      var fit = fitOf(best, target), on = current && current.key === l.key;
      return '<button type="button" role="tab" class="loc' + (on ? ' on' : '') + (fit ? '' : ' na') + '" aria-selected="' + !!on +
        '" data-loc="' + esc(l.key) + '" data-slot="' + slot + '"' + (fit ? '' : ' disabled') + '>' +
        '<span>' + esc(l.name) + (l.key === state.me.home ? ' ★' : '') + '</span>' +
        '<small>' + (fit ? (fit.good ? '✓ ' : '') + fit.protein + 'g protein' : 'no nutrition info') + '</small></button>';
    }).join('') + '</div>';
  }

  /* Which meal is coming up, if the shown day is today. */
  function nextMeal(plan) {
    if (state.date !== pacificToday()) return null;
    var h = pacificHour();
    var lunchEnd = plan.lunch ? hourOf(plan.lunch.meal.end) || 16 : 16;
    var dinnerEnd = plan.dinner ? hourOf(plan.dinner.meal.end) || 21 : 21;
    if (plan.lunch && h < lunchEnd) return 'lunch';
    if (plan.dinner && h < dinnerEnd) return 'dinner';
    return null;
  }

  function sortedPicks(p) {
    return p.picks.slice().sort(function (a, b) { return ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role); });
  }

  function mealCard(slot, s, isNext, chips) {
    var title = slot === 'lunch' ? 'Lunch' : 'Dinner';
    if (!s) return '<article class="card meal off"><h2>' + title + '</h2><p class="muted">No dining location has posted ' + title.toLowerCase() + ' for this day.</p></article>';
    var m = s.meal;
    var head = '<header class="m-head"><h2>' + esc(slot === 'lunch' && m.name !== 'Brunch' ? 'Lunch' : slot === 'dinner' ? 'Dinner' : m.name) +
      (isNext ? ' <span class="next">Up next</span>' : '') + '</h2>' +
      '<span class="hours">' + esc(s.loc ? s.loc.name : '') + (m.start && m.end ? ' · ' + esc(fmtTime(m.start)) + '–' + esc(fmtTime(m.end)) : '') + '</span></header>' + chips;
    if (!s.plans.length) return '<article class="card meal">' + head + '<p class="muted">Nothing here fits your settings. Pick another spot above, or check “Full menu” below.</p></article>';

    var plan = s.plans[s.chosen];
    var rows = sortedPicks(plan).map(function (pk) {
      var por = P.portion(pk);
      var key = slot + '|' + (s.loc ? s.loc.key : '') + '|' + s.chosen + '|' + pk.item.name;
      var got = !!state.got[key];
      var amount = por.amount ? '<b>' + esc(por.amount) + '</b>' + (por.cue ? ' <span class="cue">' + esc(por.cue.replace(/^≈ /, '≈')) + '</span>' : '')
        : '<b>' + esc(por.cue || por.servings) + '</b>';
      return '<li><label class="item' + (got ? ' got' : '') + '">' +
        '<input type="checkbox" data-got="' + esc(key) + '"' + (got ? ' checked' : '') + '>' +
        '<span class="what"><span class="name">' + esc(P.displayName(pk.item.name)) + '</span>' +
        '<span class="amt">' + amount + '</span>' +
        '<span class="where">' + esc(pk.item.station) + ' · ' + esc(por.servings) + '</span></span>' +
        '<span class="kc">' + n0(pk.kcal) + '<small>' + n0(pk.protein) + 'g P</small></span>' +
        '</label></li>';
    }).join('');

    var tot = plan.totals, tg = s.target;
    var hit = Math.abs(tot.kcal - tg.kcal) / tg.kcal <= 0.06 && tot.protein >= tg.protein * 0.9;
    var swap = s.plans.length > 1 ?
      '<button type="button" class="btn ghost swap" data-swap="' + slot + '">↻ Swap <span>' + (s.chosen + 1) + '/' + s.plans.length + '</span></button>' : '';
    return '<article class="card meal' + (isNext ? ' is-next' : '') + '" aria-label="' + esc(m.name) + '">' + head +
      '<ul class="items">' + rows + '</ul>' +
      '<footer class="m-foot"><span class="tot' + (hit ? ' hit' : '') + '"><b>' + n0(tot.kcal) + '</b> kcal · <b>' + tot.protein + '</b> g protein' +
      '<small>aim ' + n0(tg.kcal) + ' · ' + tg.protein + ' g</small></span>' + swap + '</footer>' +
      '</article>';
  }

  function renderDayTotal(plan, t) {
    var kcal = state.me.otherKcal || 0, protein = state.me.otherProtein || 0, n = 0;
    ['lunch', 'dinner'].forEach(function (k) {
      var s = plan[k];
      if (s && s.plans.length) { kcal += s.plans[s.chosen].totals.kcal; protein += s.plans[s.chosen].totals.protein; n++; }
    });
    if (!n) { $('day-total').hidden = true; return; }
    var short = t.protein - protein;
    $('day-total').innerHTML = 'Whole day with matcha: <b>' + n0(kcal) + '</b> / ' + n0(t.kcal) + ' kcal · <b>' + n0(protein) + '</b> / ' + t.protein + ' g protein' +
      (short > t.protein * 0.1 ? '<br><span class="warn">About ' + Math.round(short) + ' g short on protein. A protein shake closes it.</span>' : '');
    $('day-total').hidden = false;
  }

  function renderMenu(plan) {
    var inPlan = {};
    ['lunch', 'dinner'].forEach(function (k) {
      var s = plan[k];
      if (s && s.plans.length) s.plans[s.chosen].picks.forEach(function (pk) { inPlan[s.loc.key + '|' + s.meal.name + '|' + pk.item.name] = true; });
    });
    var locs = state.day.locations;
    var fallback = (plan.lunch && plan.lunch.loc) || (plan.dinner && plan.dinner.loc) || locs[0];
    var loc = locs.filter(function (l) { return l.key === state.menuLoc; })[0] || fallback;
    if (!loc) { $('menu').innerHTML = ''; return; }
    $('menu-loc').innerHTML = locs.map(function (l) {
      return '<option value="' + esc(l.key) + '"' + (l === loc ? ' selected' : '') + '>' + esc(l.name) + (l.kind === 'cafe' ? ' (café)' : '') + '</option>';
    }).join('');
    var pr = prefs();
    $('menu').innerHTML = loc.meals.map(function (m) {
      var items = m.items.filter(function (i) { return i.n.kcal != null && i.n.kcal >= 15; }).sort(function (a, b) {
        return (b.n.protein || 0) / b.n.kcal - (a.n.protein || 0) / a.n.kcal;
      });
      var rows = items.map(function (i) {
        var ok = P.eligible(i, pr), mine = inPlan[loc.key + '|' + m.name + '|' + i.name];
        return '<tr class="' + (ok ? '' : 'dim') + (mine ? ' mine' : '') + '"><th scope="row">' + esc(P.displayName(i.name)) +
          (mine ? ' <span class="tag plan">In plan</span>' : '') + (P.suspect(i) ? ' <span class="tag warn">Numbers off</span>' : '') +
          '<small>' + esc(i.station) + (i.serving ? ' · ' + esc(i.serving.qty + ' ' + i.serving.unit) : '') + '</small></th>' +
          '<td>' + n0(i.n.kcal) + '</td><td>' + n0(i.n.protein || 0) + '</td></tr>';
      }).join('');
      if (!rows) return '<h3>' + esc(m.name) + '</h3><p class="muted small">No nutrition posted for this menu.</p>';
      return '<h3>' + esc(m.name) + '</h3><div class="tablewrap"><table class="menu-table"><thead><tr><th scope="col">Item</th><th scope="col">kcal</th><th scope="col">Protein</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    }).join('');
  }

  function renderSource() {
    var when = state.day && state.day.fetchedAt ? ' Updated ' + new Date(state.day.fetchedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + '.' : '';
    $('source').innerHTML = 'Menu from <a href="https://dining.berkeley.edu/menus/" target="_blank" rel="noopener">Cal Dining</a>, refreshed every morning.' + when;
  }

  /* ── weigh-ins ── */
  function renderWeights(t) {
    var list = state.weights.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var today = pacificToday();
    var loggedToday = list.length && list[0].date === today;
    $('weigh-hint').textContent = loggedToday ? '✓ ' + list[0].lb.toFixed(1) + ' lb today' : list.length ? 'last: ' + list[0].lb.toFixed(1) + ' lb' : '';
    $('log').innerHTML = list.slice(0, 7).map(function (e) {
      return '<li><span>' + esc(fmtDay(e.date, { weekday: 'short', month: 'short', day: 'numeric' })) + '</span><b>' + e.lb.toFixed(1) + ' lb</b>' +
        '<button type="button" class="link x" data-act="del-weight" data-date="' + esc(e.date) + '" aria-label="Delete ' + esc(e.date) + '">×</button></li>';
    }).join('');
    var trend = P.weeklyTrend(state.weights), html;
    if (!trend || !trend.ready) {
      html = '<p class="muted small">Weigh in each morning (after the bathroom, before eating). After two weeks it checks whether you’re losing at the right pace and adjusts your calories.</p>';
    } else {
      var adj = P.adjustment(trend, t.rateLb, state.me.weightLb), lost = trend.lostPerWeek;
      html = '<p class="trendline">7-day average <b>' + trend.current.toFixed(1) + ' lb</b>, ' +
        (lost >= 0 ? 'down ' : 'up ') + Math.abs(lost).toFixed(1) + ' lb from the week before (aim: down ' + t.rateLb.toFixed(1) + ').</p>';
      if (adj && adj.kcal) {
        html += '<p class="note">That’s ' + esc(adj.why) + '. <button type="button" class="btn small primary" data-act="apply-adjust" data-kcal="' + adj.kcal + '">' +
          (adj.kcal > 0 ? 'Eat 150 kcal more' : 'Eat 150 kcal less') + '</button></p>';
      } else if (adj) {
        html += '<p class="note ok">Right on pace. Keep going.</p>';
      }
    }
    $('trend').innerHTML = html;
  }

  /* ── settings ── */
  function fillSettings() {
    var f = $('settings-form'), me = state.me;
    f.weightLb.value = me.weightLb;
    f.heightFt.value = Math.floor(me.heightIn / 12);
    f.heightInRem.value = Math.round((me.heightIn % 12) * 2) / 2;
    f.age.value = me.age;
    f.sex.value = me.sex;
    f.activity.value = me.activity;
    f.rateLb.value = String(me.rateLb);
    f.otherKcal.value = me.otherKcal;
    f.otherProtein.value = me.otherProtein;
    f.diet.value = me.diet;
    var locs = (state.index && state.index.locations) || [{ key: 'Crossroads', name: 'Crossroads', kind: 'hall' }];
    f.home.innerHTML = locs.map(function (l) {
      return '<option value="' + esc(l.key) + '">' + esc(l.name) + (l.kind === 'cafe' ? ' (café)' : '') + '</option>';
    }).join('');
    f.home.value = me.home;
    f.dislikes.value = (me.dislikes || []).join(', ');
    $('avoid').innerHTML = ALLERGENS.map(function (a) {
      return '<label><input type="checkbox" name="avoid" value="' + esc(a) + '"' + ((me.avoid || []).indexOf(a) >= 0 ? ' checked' : '') + '> ' + esc(a) + '</label>';
    }).join('');
  }

  function readSettings() {
    var f = $('settings-form');
    var num = function (el, lo, hi, fallback) { var v = parseFloat(el.value); return isFinite(v) && v >= lo && v <= hi ? v : fallback; };
    var me = state.me;
    var heightIn = num(f.heightFt, 4, 7, Math.floor(me.heightIn / 12)) * 12 + num(f.heightInRem, 0, 11.5, me.heightIn % 12);
    return Object.assign({}, me, {
      weightLb: num(f.weightLb, 80, 450, me.weightLb), heightIn: heightIn, age: num(f.age, 16, 80, me.age),
      sex: f.sex.value, activity: f.activity.value, rateLb: parseFloat(f.rateLb.value),
      otherKcal: num(f.otherKcal, 0, 2000, 0), otherProtein: num(f.otherProtein, 0, 200, 0),
      diet: f.diet.value, home: f.home.value || me.home,
      avoid: Array.prototype.map.call(f.querySelectorAll('input[name=avoid]:checked'), function (c) { return c.value; }),
      dislikes: f.dislikes.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean)
    });
  }

  function saveMe() {
    // Store only what differs from the defaults, so improving ME later still reaches this phone.
    var diff = {};
    Object.keys(state.me).forEach(function (k) {
      if (JSON.stringify(state.me[k]) !== JSON.stringify(ME[k])) diff[k] = state.me[k];
    });
    save('xr:me', diff);
  }

  /* ── events ── */
  function wire() {
    $('activity').innerHTML = Object.keys(P.ACTIVITY).map(function (k) {
      return '<option value="' + k + '">' + esc(P.ACTIVITY[k].label) + '</option>';
    }).join('');
    fillSettings();

    $('days').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-date]');
      if (!b || b.dataset.date === state.date) return;
      history.replaceState(null, '', '#' + b.dataset.date);
      selectDate(b.dataset.date);
    });

    $('meals').addEventListener('click', function (e) {
      var l = e.target.closest('button[data-loc]');
      if (l) {
        var sl = l.dataset.slot;
        state.choice[sl + 'Loc'] = l.dataset.loc;
        state.choice[sl] = 0;
        if (sl === 'lunch') state.choice.dinner = 0;
        save('xr:choice:' + state.date, state.choice);
        render();
        return;
      }
      var b = e.target.closest('button[data-swap]');
      if (!b) return;
      var slot = b.dataset.swap;
      var count = +b.querySelector('span').textContent.split('/')[1];
      state.choice[slot] = ((state.choice[slot] || 0) + 1) % count;
      // A different lunch re-plans dinner around it.
      if (slot === 'lunch') state.choice.dinner = 0;
      save('xr:choice:' + state.date, state.choice);
      render();
    });

    $('meals').addEventListener('change', function (e) {
      var c = e.target.closest('input[data-got]');
      if (!c) return;
      if (c.checked) state.got[c.dataset.got] = true; else delete state.got[c.dataset.got];
      c.closest('.item').classList.toggle('got', c.checked);
      save('xr:got:' + state.date, state.got);
    });

    $('menu-loc').addEventListener('change', function (e) {
      state.menuLoc = e.target.value;
      render();
    });

    $('settings-form').addEventListener('submit', function (e) {
      e.preventDefault();
      state.me = readSettings();
      saveMe();
      $('settings').open = false;
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    $('reset-me').addEventListener('click', function () {
      var latest = state.weights.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; })[0];
      state.me = Object.assign({}, ME, latest ? { weightLb: latest.lb } : {});
      saveMe();
      fillSettings();
      render();
    });

    $('weigh-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var lb = parseFloat(e.target.lb.value), date = pacificToday();
      if (!(lb >= 80 && lb <= 450)) return;
      state.weights = state.weights.filter(function (w) { return w.date !== date; }).concat([{ date: date, lb: lb }]);
      save('xr:weights', state.weights);
      state.me.weightLb = lb; // targets follow your current weight
      saveMe();
      fillSettings();
      e.target.lb.value = '';
      render();
    });

    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (!b) return;
      var a = b.dataset.act;
      if (a === 'reset-adjust') state.me.kcalAdjust = 0;
      if (a === 'apply-adjust') state.me.kcalAdjust = Math.max(-500, Math.min(500, (state.me.kcalAdjust || 0) + parseInt(b.dataset.kcal, 10)));
      if (a === 'del-weight') {
        state.weights = state.weights.filter(function (w) { return w.date !== b.dataset.date; });
        save('xr:weights', state.weights);
      }
      if (a === 'reset-adjust' || a === 'apply-adjust') saveMe();
      render();
    });
  }

  wire();
  loadIndex();
})();
