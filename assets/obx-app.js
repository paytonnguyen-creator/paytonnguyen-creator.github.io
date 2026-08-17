/* ─────────────────────────────────────────────────────────────────────
   Outer Banks S5 release simulator — interface layer.

   Charts are hand-drawn SVG rather than a charting library, for the same
   reason the rest of this site has no build step: one file, no CDN, no
   version drift, and every mark is inspectable.

   Colour rule, applied throughout: five release patterns are never five
   hues. The selected pattern is drawn in slot 1 and everything else is
   muted context — the palette clears the all-pairs colourblind gate at
   three hues, not five, and emphasis reads better than a rainbow anyway.
   ───────────────────────────────────────────────────────────────────── */
(function () {
'use strict';

var root = document.getElementById('obx-tool');
if (!root) return;

var M = window.OBXModel;
var NS = 'http://www.w3.org/2000/svg';

/* ── Palette (mirrors assets/obx.css — keep the two in step) ───────
   Ocean and low sun, validated against this page's warm surface before
   anything was drawn: all-pairs CVD ΔE 16.4, normal-vision 30.1. Gold is
   an accent for release markers, never a series. */
var C = {
  s1: '#0a7096', s2: '#e2673a', gold: '#a8761c',
  lo: '#0a7096', hi: '#c4472e',
  ink: '#17212a', ink2: '#4c5560', muted: '#7d7669',
  grid: '#eae2d3', axis: '#cfc5b3', surface: '#fffcf6',
  ctx: '#bdb5a6'            /* muted context lines — never a series colour */
};

/* ── Small SVG helpers ────────────────────────────────────────────── */

function e(tag, attrs, text) {
  var n = document.createElementNS(NS, tag), k;
  for (k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
  if (text != null) n.textContent = text;
  return n;
}
function lin(d0, d1, r0, r1) {
  var m = (r1 - r0) / ((d1 - d0) || 1);
  return function (v) { return r0 + (v - d0) * m; };
}
function path(pts) {
  return pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(2) + ' ' + p[1].toFixed(2); }).join('');
}
/* A bar with only its far end rounded, so the baseline stays flat. */
function bar(x, y, w, h, r, dir) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  if (dir === 'up') {
    return 'M' + x + ' ' + (y + h) + 'V' + (y + r) + 'a' + r + ' ' + r + ' 0 0 1 ' + r + ' ' + (-r) +
           'h' + (w - 2 * r) + 'a' + r + ' ' + r + ' 0 0 1 ' + r + ' ' + r + 'V' + (y + h) + 'Z';
  }
  return 'M' + x + ' ' + y + 'H' + (x + w - r) + 'a' + r + ' ' + r + ' 0 0 1 ' + r + ' ' + r +
         'v' + (h - 2 * r) + 'a' + r + ' ' + r + ' 0 0 1 ' + (-r) + ' ' + r + 'H' + x + 'Z';
}

/* ── Formatting ───────────────────────────────────────────────────── */
var f1 = function (x) { return (Math.round(x * 10) / 10).toFixed(1); };
var money = function (x) { return (x < 0 ? '−$' : '$') + f1(Math.abs(x)) + 'M'; };
var views = function (x) { return f1(x / 1e6) + 'M'; };
var pct = function (x, d) { return (x * 100).toFixed(d == null ? 0 : d) + '%'; };

var LABEL = {};
M.STRATEGIES.forEach(function (s) { LABEL[s.id] = s.label; });
var SHAPE = {};
M.STRATEGIES.forEach(function (s) { SHAPE[s.id] = s.shape; });

/* ── State ────────────────────────────────────────────────────────── */

var P = Object.assign({}, M.ASSUMPTIONS);
var state = { strategy: 'split2', last: null, sweep: null, sweepFor: null, busy: false };

/* ── Worker, with a synchronous fallback ──────────────────────────── */

var worker = null, pending = {}, msgId = 0;
try {
  worker = new Worker('assets/obx-worker.js');
  worker.onmessage = function (ev) {
    var cb = pending[ev.data.id];
    delete pending[ev.data.id];
    if (cb) cb(ev.data);
  };
  worker.onerror = function () { worker = null; };
} catch (err) { worker = null; }

function slimLocal(r) {
  return {
    strategy: r.strategy, schedule: r.schedule, netContribution: r.netContribution,
    retentionValue: r.retentionValue, acquisitionValue: r.acquisitionValue, spend: r.spend,
    savedMonths: r.savedMonths, acqMonthsNet: r.acqMonthsNet, signups: r.signups,
    d30Retention: r.d30Retention, reach: r.reach, completion: r.completion,
    epCurve: r.epCurve, weeklyViews: r.weeklyViews, saveByDay: r.saveByDay,
    peakSave: r.peakSave, peakWeekViews: r.peakWeekViews, chartWeeks: r.chartWeeks,
    conversationWeeks: r.conversationWeeks, totalViews: r.totalViews
  };
}

function run(kind, extra, done) {
  var id = ++msgId;
  var msg = Object.assign({ id: id, kind: kind, P: P }, extra || {});
  if (worker) { pending[id] = done; worker.postMessage(msg); return; }
  /* No worker: do the same work inline. The page janks, but it works. */
  setTimeout(function () {
    var PANEL = { n: 9000, np: 4000 };
    var out = { id: id, kind: kind };
    if (kind === 'main') {
      out.results = M.evaluateAll(P, PANEL).map(slimLocal);
      var lowP = Object.assign({}, P, { mktSpend: P.mktSpend * 0.75 });
      out.marginal = {
        spendLow: lowP.mktSpend,
        netLow: M.evaluate(lowP, msg.strategy, PANEL).netContribution
      };
    } else if (kind === 'sweep') {
      out.sweepFor = msg.strategy === 'split3' ? 'split3' : 'split2';
      out.sweep = M.sweepGap(P, out.sweepFor, PANEL);
    } else if (kind === 'tornado') {
      out.tornado = M.tornado(P, msg.strategy);
    } else if (kind === 'stability') {
      var seeds = [20260817, 7, 31337, 99, 424242, 5150, 12345, 777];
      var ids = M.STRATEGIES.map(function (s) { return s.id; });
      out.stability = { seeds: seeds, ids: ids, rows: seeds.map(function (seed) {
        var o = { n: PANEL.n, np: PANEL.np, seed: seed }, v = {};
        ids.forEach(function (id) { v[id] = M.evaluate(P, id, o).netContribution; });
        return v;
      }) };
    }
    done(out);
  }, 10);
}

/* ── Chart scaffolding ────────────────────────────────────────────── */

function frame(W, H, pad) {
  var g = e('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img' });
  return { svg: g, W: W, H: H, L: pad[3], R: W - pad[1], T: pad[0], B: H - pad[2] };
}
function yAxis(F, y, ticks, fmt) {
  ticks.forEach(function (t) {
    var yy = y(t);
    F.svg.appendChild(e('line', { x1: F.L, x2: F.R, y1: yy, y2: yy, stroke: C.grid, 'stroke-width': 1 }));
    F.svg.appendChild(e('text', {
      x: F.L - 8, y: yy + 4, 'text-anchor': 'end', fill: C.muted,
      'font-size': 11, 'font-family': 'inherit', 'font-variant-numeric': 'tabular-nums'
    }, fmt(t)));
  });
}
function baseline(F, yy) {
  F.svg.appendChild(e('line', { x1: F.L, x2: F.R, y1: yy, y2: yy, stroke: C.axis, 'stroke-width': 1 }));
}
function xLabel(F, x, yy, s, anchor) {
  F.svg.appendChild(e('text', {
    x: x, y: yy, 'text-anchor': anchor || 'middle', fill: C.muted,
    'font-size': 11, 'font-family': 'inherit'
  }, s));
}
/* Ticks from zero — for scales where zero is meaningful (views, rates). */
function niceTicks(max, n) {
  var step = Math.pow(10, Math.floor(Math.log10(max / n || 1)));
  var err = max / n / step;
  if (err >= 5) step *= 10; else if (err >= 2) step *= 5; else if (err >= 1) step *= 2;
  var out = [];
  for (var v = 0; v <= max * 1.0001; v += step) out.push(Math.round(v / step) * step);
  return out;
}

/* Ticks across an arbitrary range. The from-zero version leaves a chart
   spanning $13M–$21M with a single labelled gridline, because it only ever
   proposes multiples of five starting at nothing. */
function rangeTicks(lo, hi, n) {
  var span = hi - lo;
  if (!(span > 0)) return [lo];
  var step = Math.pow(10, Math.floor(Math.log10(span / n)));
  var err = span / n / step;
  if (err >= 7) step *= 10; else if (err >= 3) step *= 5; else if (err >= 1.5) step *= 2;
  var out = [], v = Math.ceil(lo / step) * step;
  for (; v <= hi + step * 1e-6; v += step) out.push(Math.round(v / step) * step);
  return out;
}

/* ── Tooltip + keyboard readout ───────────────────────────────────── */

function attachHover(card, F, items) {
  /* items: [{ x, y, html }] in viewBox coordinates. The hit layer is a
     nearest-x lookup, so the target is the whole column rather than the
     mark — an 8px dot you have to hit dead-centre is not a hit target. */
  var plot = card.querySelector('.viz-plot');
  var tip = plot.querySelector('.tip');
  if (!tip) { tip = document.createElement('div'); tip.className = 'tip'; plot.appendChild(tip); }
  var cur = -1;

  function show(i) {
    if (i < 0 || i >= items.length) { tip.classList.remove('is-on'); cur = -1; return; }
    cur = i;
    var it = items[i];
    tip.innerHTML = it.html;
    tip.style.left = (it.x / F.W * 100) + '%';
    tip.style.top = (it.y / F.H * 100) + '%';
    tip.classList.add('is-on');
  }
  function hide() { tip.classList.remove('is-on'); cur = -1; }

  var hit = e('rect', {
    x: F.L, y: F.T, width: Math.max(1, F.R - F.L), height: Math.max(1, F.B - F.T),
    fill: 'transparent', style: 'pointer-events:all'
  });
  F.svg.appendChild(hit);

  hit.addEventListener('pointermove', function (ev) {
    var r = F.svg.getBoundingClientRect();
    var vx = (ev.clientX - r.left) / r.width * F.W;
    var best = 0, bd = Infinity;
    items.forEach(function (it, i) {
      var d = Math.abs(it.x - vx);
      if (d < bd) { bd = d; best = i; }
    });
    show(best);
  });
  hit.addEventListener('pointerleave', hide);

  F.svg.setAttribute('tabindex', '0');
  F.svg.addEventListener('keydown', function (ev) {
    if (ev.key === 'ArrowRight') { show(Math.min(items.length - 1, cur + 1)); ev.preventDefault(); }
    else if (ev.key === 'ArrowLeft') { show(Math.max(0, (cur < 0 ? 1 : cur) - 1)); ev.preventDefault(); }
    else if (ev.key === 'Escape') hide();
  });
  F.svg.addEventListener('blur', hide);
}

function mount(id, F, alt) {
  var card = document.getElementById(id);
  var plot = card.querySelector('.viz-plot');
  var tip = plot.querySelector('.tip');
  plot.innerHTML = '';
  F.svg.setAttribute('aria-label', alt || '');
  plot.appendChild(F.svg);
  if (tip) plot.appendChild(tip);
  return card;
}
function table(id, head, rows) {
  var box = document.getElementById(id).querySelector('.viz-table');
  var h = '<table><thead><tr>' + head.map(function (x) { return '<th>' + x + '</th>'; }).join('') + '</tr></thead><tbody>';
  h += rows.map(function (r) {
    return '<tr>' + r.map(function (x) { return '<td>' + x + '</td>'; }).join('') + '</tr>';
  }).join('');
  box.innerHTML = h + '</tbody></table>';
}
function legend(id, items) {
  var el = document.getElementById(id).querySelector('.legend');
  el.innerHTML = items.map(function (it) {
    if (it.bare) return '<li>' + it.label + '</li>';
    var st = 'background:' + it.color + (it.alpha != null ? ';opacity:' + it.alpha : '') +
             (it.small ? ';width:7px;height:7px;border-radius:50%' : '');
    return '<li><span class="swatch' + (it.line ? ' line' : '') + '" style="' + st + '"></span>' + it.label + '</li>';
  }).join('');
}

/* ═══ Chart A — weekly views ═══════════════════════════════════════ */

function chartViews(results, sel) {
  var F = frame(1100, 330, [18, 74, 34, 52]);
  var weeks = 20;
  var max = 0;
  results.forEach(function (r) {
    r.weeklyViews.slice(0, weeks).forEach(function (v) { if (v > max) max = v; });
  });
  var x = lin(0, weeks - 1, F.L, F.R), y = lin(0, max * 1.08, F.B, F.T);

  yAxis(F, y, niceTicks(max * 1.08, 4), function (v) { return f1(v / 1e6) + 'M'; });

  /* Assumed Top 10 entry line — an absolute yardstick, drawn solid and
     recessive so it never reads as a data series. */
  var ty = y(2.0e6);
  if (ty > F.T && ty < F.B) {
    F.svg.appendChild(e('line', { x1: F.L, x2: F.R, y1: ty, y2: ty, stroke: C.axis, 'stroke-width': 1 }));
    F.svg.appendChild(e('text', { x: F.R + 6, y: ty + 4, fill: C.muted, 'font-size': 10.5, 'font-family': 'inherit' }, 'Top 10 entry'));
  }

  results.forEach(function (r) {
    if (r.strategy === sel) return;
    var pts = r.weeklyViews.slice(0, weeks).map(function (v, i) { return [x(i), y(v)]; });
    F.svg.appendChild(e('path', { d: path(pts), fill: 'none', stroke: C.ctx, 'stroke-width': 2, 'stroke-linejoin': 'round', opacity: .75 }));
  });

  var r0 = results.find(function (r) { return r.strategy === sel; });
  var series = r0.weeklyViews.slice(0, weeks);
  var pts = series.map(function (v, i) { return [x(i), y(v)]; });
  var area = pts.concat([[x(weeks - 1), F.B], [x(0), F.B]]);
  F.svg.appendChild(e('path', { d: path(area) + 'Z', fill: C.s1, opacity: .10 }));
  F.svg.appendChild(e('path', { d: path(pts), fill: 'none', stroke: C.s1, 'stroke-width': 2, 'stroke-linejoin': 'round' }));

  /* Drop markers: the schedule is the independent variable, so show it. */
  r0.schedule.forEach(function (d) {
    var wk = d.d / 7;
    if (wk > weeks - 1) return;
    F.svg.appendChild(e('line', { x1: x(wk), x2: x(wk), y1: F.T - 4, y2: F.B, stroke: C.gold, 'stroke-width': 1, opacity: .3 }));
    F.svg.appendChild(e('circle', { cx: x(wk), cy: F.T - 8, r: 3.5, fill: C.gold }));
  });

  baseline(F, F.B);
  for (var w = 0; w < weeks; w += 2) xLabel(F, x(w), F.B + 18, 'wk ' + w);

  /* Direct-label the peak rather than every point. */
  var pk = series.indexOf(Math.max.apply(null, series));
  F.svg.appendChild(e('circle', { cx: x(pk), cy: y(series[pk]), r: 4.5, fill: C.s1, stroke: C.surface, 'stroke-width': 2 }));
  F.svg.appendChild(e('text', {
    x: x(pk) + 9, y: y(series[pk]) + 4, fill: C.ink, 'font-size': 12,
    'font-weight': 700, 'font-family': 'inherit'
  }, views(series[pk]) + ' peak'));

  var card = mount('viz-views', F,
    'Weekly views for ' + LABEL[sel] + ', peaking at ' + views(series[pk]) +
    ', against the other four patterns drawn in grey.');

  attachHover(card, F, series.map(function (v, i) {
    return { x: x(i), y: y(v), html: '<b>Week ' + i + '</b><br>' + views(v) + ' views<br><em>' + LABEL[sel] + '</em>' };
  }));

  legend('viz-views', [
    { color: C.s1, label: LABEL[sel] + ' (selected)', line: true },
    { color: C.ctx, label: 'Other four patterns', line: true }
  ]);
  table('viz-views', ['Week'].concat(results.map(function (r) { return LABEL[r.strategy]; })),
    series.map(function (_, i) {
      return ['wk ' + i].concat(results.map(function (r) { return views(r.weeklyViews[i]); }));
    }));
}

/* ═══ Chart B — churn saved by renewal day (the hero) ══════════════ */

function chartCoverage(results, sel) {
  var F = frame(1100, 300, [22, 26, 40, 52]);
  var r0 = results.find(function (r) { return r.strategy === sel; });
  var d = r0.saveByDay;
  var max = 0;
  results.forEach(function (r) { r.saveByDay.forEach(function (p) { if (p.save > max) max = p.save; }); });
  max = Math.max(max, 0.02);

  var x = lin(1, 59, F.L, F.R - 12), y = lin(0, max * 1.12, F.B, F.T);
  yAxis(F, y, niceTicks(max * 1.12, 4), function (v) { return (v * 100).toFixed(0) + '%'; });

  var bw = (F.R - 12 - F.L) / 59 - 2;   /* 2px surface gap between fills */

  d.forEach(function (p) {
    var h = Math.max(0, y(0) - y(Math.max(p.save, 0)));
    if (h < 0.5) return;
    F.svg.appendChild(e('path', {
      d: bar(x(p.day) - bw / 2, y(Math.max(p.save, 0)), bw, h, 3, 'up'), fill: C.s1
    }));
  });

  /* Where a drop lands, and where the month boundary falls. */
  r0.schedule.forEach(function (s) {
    if (s.d < 1 || s.d > 59) return;
    F.svg.appendChild(e('line', { x1: x(s.d), x2: x(s.d), y1: F.T - 6, y2: F.B, stroke: C.gold, 'stroke-width': 1, opacity: .55 }));
    F.svg.appendChild(e('text', { x: x(s.d), y: F.T - 10, 'text-anchor': 'middle', fill: C.gold, 'font-size': 10.5, 'font-weight': 700, 'font-family': 'inherit' }, s.n + ' eps'));
  });

  baseline(F, F.B);
  [1, 10, 20, 30, 40, 50, 59].forEach(function (v) { xLabel(F, x(v), F.B + 18, 'day ' + v); });
  xLabel(F, (F.L + F.R) / 2, F.B + 34, 'day of the release window that a subscriber’s renewal falls on');

  var card = mount('viz-coverage', F,
    'Churn saved by renewal day under ' + LABEL[sel] + ', peaking at ' + pct(r0.peakSave) +
    ' and falling away between drops.');

  attachHover(card, F, d.map(function (p) {
    return {
      x: x(p.day), y: y(Math.max(p.save, 0)),
      html: '<b>Renews on day ' + p.day + '</b><br>' + pct(p.save, 1) + ' less likely to cancel<br><em>vs no release at all</em>'
    };
  }));

  legend('viz-coverage', [{ color: C.s1, label: 'Reduction in cancellations, vs a month with no Outer Banks' }]);
  table('viz-coverage', ['Renewal day'].concat(results.map(function (r) { return LABEL[r.strategy]; })),
    d.map(function (p, i) {
      return ['day ' + p.day].concat(results.map(function (r) { return pct(r.saveByDay[i].save, 1); }));
    }));
}

/* ═══ Chart C — net contribution ranking ═══════════════════════════ */

function chartRank(results, sel) {
  var F = frame(520, 300, [10, 84, 26, 116]);
  var sorted = results.slice().sort(function (a, b) { return b.netContribution - a.netContribution; });
  var max = Math.max.apply(null, sorted.map(function (r) { return r.netContribution; }));
  var min = Math.min(0, Math.min.apply(null, sorted.map(function (r) { return r.netContribution; })));
  var x = lin(min, max * 1.06, F.L, F.R);
  var rowH = (F.B - F.T) / sorted.length;
  var bh = Math.min(24, rowH - 10);
  var zero = x(0);

  sorted.forEach(function (r, i) {
    var yy = F.T + i * rowH + (rowH - bh) / 2;
    var on = r.strategy === sel;
    var w = Math.max(2, Math.abs(x(r.netContribution) - zero));
    F.svg.appendChild(e('path', {
      d: bar(r.netContribution >= 0 ? zero : zero - w, yy, w, bh, 4, 'right'),
      fill: C.s1, opacity: on ? 1 : .3
    }));
    F.svg.appendChild(e('text', {
      x: F.L - 10, y: yy + bh / 2 + 4, 'text-anchor': 'end',
      fill: on ? C.ink : C.ink2, 'font-size': 12,
      'font-weight': on ? 700 : 500, 'font-family': 'inherit'
    }, LABEL[r.strategy]));
    F.svg.appendChild(e('text', {
      x: zero + w + 8, y: yy + bh / 2 + 4, fill: on ? C.ink : C.muted,
      'font-size': 12, 'font-weight': on ? 700 : 500, 'font-family': 'inherit'
    }, money(r.netContribution)));
  });

  F.svg.appendChild(e('line', { x1: zero, x2: zero, y1: F.T, y2: F.B, stroke: C.axis, 'stroke-width': 1 }));
  mount('viz-rank', F, 'Net contribution by release pattern. ' + LABEL[sorted[0].strategy] +
    ' leads at ' + money(sorted[0].netContribution) + '.');
  legend('viz-rank', [
    { color: C.s1, label: 'Selected pattern' },
    { color: C.s1, alpha: .3, label: 'Alternatives' }
  ]);
  table('viz-rank', ['Pattern', 'Retention', 'Acquisition', 'Marketing', 'Net'],
    sorted.map(function (r) {
      return [LABEL[r.strategy], money(r.retentionValue), money(r.acquisitionValue),
              '−' + money(r.spend).replace('$', '$'), money(r.netContribution)];
    }));
}

/* ═══ Chart D — the two objectives disagree ════════════════════════ */

function chartTradeoff(results, sel) {
  var F = frame(520, 372, [34, 30, 52, 58]);
  var xs = results.map(function (r) { return r.acquisitionValue; });
  var ys = results.map(function (r) { return r.retentionValue; });
  var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
  var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
  var px = (x1 - x0) * 0.28 || 2, py = (y1 - y0) * 0.28 || 2;
  var x = lin(x0 - px, x1 + px, F.L, F.R), y = lin(y0 - py, y1 + py, F.B, F.T);

  yAxis(F, y, rangeTicks(y0 - py, y1 + py, 4), function (v) { return '$' + v.toFixed(0) + 'M'; });

  /* Iso-value diagonals: equal retention + acquisition. Hairline, muted —
     they are chrome, not data. */
  var clip = e('clipPath', { id: 'obx-tradeoff-clip' });
  clip.appendChild(e('rect', { x: F.L, y: F.T, width: F.R - F.L, height: F.B - F.T }));
  F.svg.appendChild(clip);
  var iso = e('g', { 'clip-path': 'url(#obx-tradeoff-clip)' });
  var lo = Math.floor((x0 - px + y0 - py) / 5) * 5, hi = Math.ceil((x1 + px + y1 + py) / 5) * 5;
  for (var t = lo; t <= hi; t += 5) {
    var a = [x(x0 - px), y(t - (x0 - px))], b = [x(x1 + px), y(t - (x1 + px))];
    iso.appendChild(e('path', { d: path([a, b]), stroke: C.grid, 'stroke-width': 1, fill: 'none' }));
  }
  F.svg.appendChild(iso);

  results.forEach(function (r) {
    var on = r.strategy === sel;
    F.svg.appendChild(e('circle', {
      cx: x(r.acquisitionValue), cy: y(r.retentionValue), r: on ? 8 : 6,
      fill: on ? C.s1 : C.surface, stroke: C.s1, 'stroke-width': 2, opacity: on ? 1 : .8
    }));
    F.svg.appendChild(e('text', {
      x: x(r.acquisitionValue), y: y(r.retentionValue) - 13, 'text-anchor': 'middle',
      fill: on ? C.ink : C.ink2, 'font-size': 11.5,
      'font-weight': on ? 700 : 500, 'font-family': 'inherit'
    }, LABEL[r.strategy]));
  });

  baseline(F, F.B);
  rangeTicks(x0 - px, x1 + px, 4)
    .forEach(function (v) { xLabel(F, x(v), F.B + 18, '$' + v.toFixed(0) + 'M'); });
  xLabel(F, (F.L + F.R) / 2, F.B + 38, 'value from acquisition →');
  F.svg.appendChild(e('text', {
    x: 14, y: (F.T + F.B) / 2, fill: C.muted, 'font-size': 11, 'font-family': 'inherit',
    'text-anchor': 'middle', transform: 'rotate(-90 14 ' + ((F.T + F.B) / 2) + ')'
  }, 'value from retention →'));

  mount('viz-tradeoff', F, 'Retention value against acquisition value for all five patterns. ' +
    'The two objectives rank the patterns in opposite orders.');
  legend('viz-tradeoff', [
    { color: C.s1, label: 'Selected pattern' },
    { color: C.grid, label: 'Equal total value', line: true }
  ]);
  table('viz-tradeoff', ['Pattern', 'Acquisition value', 'Retention value', 'Total before marketing'],
    results.slice().sort(function (a, b) { return b.netContribution - a.netContribution; }).map(function (r) {
      return [LABEL[r.strategy], money(r.acquisitionValue), money(r.retentionValue),
              money(r.acquisitionValue + r.retentionValue)];
    }));
}

/* ═══ Chart E — how long to wait between parts ═════════════════════ */

function chartGap(sweep, sweepFor, sel) {
  var F = frame(520, 340, [20, 34, 50, 58]);
  var pts = sweep.filter(function (s) { return s.gap >= 2; });
  var vals = pts.map(function (s) { return s.net; });
  var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
  var padY = (hi - lo) * 0.35 || 2;
  var x = lin(pts[0].gap, pts[pts.length - 1].gap, F.L, F.R);
  var y = lin(lo - padY, hi + padY, F.B, F.T);

  yAxis(F, y, rangeTicks(lo - padY, hi + padY, 4), function (v) { return '$' + v.toFixed(0) + 'M'; });

  F.svg.appendChild(e('path', {
    d: path(pts.map(function (s) { return [x(s.gap), y(s.net)]; })),
    fill: 'none', stroke: C.s1, 'stroke-width': 2, 'stroke-linejoin': 'round'
  }));

  var best = pts.reduce(function (a, b) { return b.net > a.net ? b : a; });
  pts.forEach(function (s) {
    var on = s.gap === best.gap;
    F.svg.appendChild(e('circle', {
      cx: x(s.gap), cy: y(s.net), r: on ? 6.5 : 4.5,
      fill: on ? C.s1 : C.surface, stroke: C.s1, 'stroke-width': 2
    }));
  });
  F.svg.appendChild(e('text', {
    x: x(best.gap), y: y(best.net) - 14, 'text-anchor': 'middle',
    fill: C.ink, 'font-size': 12, 'font-weight': 700, 'font-family': 'inherit'
  }, best.gap + ' weeks'));

  /* Where the currently-set gap sits, so the control and the curve agree. */
  if (P.gapWeeks >= 2 && P.gapWeeks <= 9) {
    F.svg.appendChild(e('line', {
      x1: x(P.gapWeeks), x2: x(P.gapWeeks), y1: F.T, y2: F.B,
      stroke: C.s2, 'stroke-width': 2, opacity: .55
    }));
  }

  baseline(F, F.B);
  pts.forEach(function (s) { xLabel(F, x(s.gap), F.B + 18, String(s.gap)); });
  xLabel(F, (F.L + F.R) / 2, F.B + 38, 'weeks between parts');

  var card = mount('viz-gap', F, 'Net contribution against the gap between parts for the ' +
    LABEL[sweepFor] + ' pattern, best at ' + best.gap + ' weeks.');
  attachHover(card, F, pts.map(function (s) {
    return { x: x(s.gap), y: y(s.net), html: '<b>' + s.gap + '-week gap</b><br>' + money(s.net) + ' net<br><em>retention ' + money(s.ret) + ' · acquisition ' + money(s.acq) + '</em>' };
  }));

  legend('viz-gap', [
    { color: C.s1, label: LABEL[sweepFor] + ' net contribution', line: true },
    { color: C.s2, label: 'Currently set (' + P.gapWeeks + ' weeks)', line: true }
  ]);
  table('viz-gap', ['Gap', 'Retention', 'Acquisition', 'Net', 'Weeks in Top 10'],
    pts.map(function (s) {
      return [s.gap + ' wk', money(s.ret), money(s.acq), money(s.net), String(s.chartWeeks)];
    }));

  var note = document.getElementById('gap-note');
  note.textContent = (sel === 'split2' || sel === 'split3')
    ? 'Sweeping the gap for the pattern you have selected.'
    : LABEL[sel] + ' has no gap to tune, so this shows the ' + LABEL[sweepFor] + ' pattern instead.';
}

/* ═══ Chart F — who is still watching by episode 10 ════════════════ */

function chartDropoff(results, sel) {
  var F = frame(520, 320, [20, 76, 50, 52]);
  var r0 = results.find(function (r) { return r.strategy === sel; });
  var refId = sel === 'binge' ? 'weekly' : 'binge';
  var ref = results.find(function (r) { return r.strategy === refId; });
  var eps = r0.epCurve.length - 1;
  var x = lin(1, eps, F.L, F.R), y = lin(0, 1, F.B, F.T);

  yAxis(F, y, [0, .25, .5, .75, 1], function (v) { return (v * 100).toFixed(0) + '%'; });

  function draw(curve, color, w) {
    var pts = [];
    for (var k = 1; k <= eps; k++) pts.push([x(k), y(curve[k])]);
    F.svg.appendChild(e('path', { d: path(pts), fill: 'none', stroke: color, 'stroke-width': w, 'stroke-linejoin': 'round' }));
    return pts;
  }
  draw(ref.epCurve, C.s2, 2);
  var pts = draw(r0.epCurve, C.s1, 2);

  [[ref, C.s2], [r0, C.s1]].forEach(function (pair) {
    var r = pair[0];
    F.svg.appendChild(e('circle', { cx: x(eps), cy: y(r.epCurve[eps]), r: 4.5, fill: pair[1], stroke: C.surface, 'stroke-width': 2 }));
    F.svg.appendChild(e('text', {
      x: x(eps) + 8, y: y(r.epCurve[eps]) + 4, fill: C.ink, 'font-size': 12,
      'font-weight': 700, 'font-family': 'inherit'
    }, pct(r.epCurve[eps])));
  });

  baseline(F, F.B);
  for (var k = 1; k <= eps; k++) if (k === 1 || k % 3 === 0 || k === eps) xLabel(F, x(k), F.B + 18, String(k));
  xLabel(F, (F.L + F.R) / 2, F.B + 38, 'episode');

  var card = mount('viz-dropoff', F, 'Share of starters still watching by episode. ' +
    LABEL[sel] + ' finishes at ' + pct(r0.epCurve[eps]) + ' against ' + pct(ref.epCurve[eps]) + ' for ' + LABEL[refId] + '.');
  attachHover(card, F, pts.map(function (p, i) {
    var k = i + 1;
    return { x: p[0], y: p[1], html: '<b>Episode ' + k + '</b><br>' + pct(r0.epCurve[k], 1) + ' of starters<br><em>' + LABEL[refId] + ': ' + pct(ref.epCurve[k], 1) + '</em>' };
  }));

  legend('viz-dropoff', [
    { color: C.s1, label: LABEL[sel] + ' (selected)', line: true },
    { color: C.s2, label: LABEL[refId] + ' (reference)', line: true }
  ]);
  table('viz-dropoff', ['Episode'].concat(results.map(function (r) { return LABEL[r.strategy]; })),
    r0.epCurve.slice(1).map(function (_, i) {
      return ['ep ' + (i + 1)].concat(results.map(function (r) { return pct(r.epCurve[i + 1], 1); }));
    }));
}

/* ═══ Sensitivity ═════════════════════════════════════════════════ */

function chartTornado(rows, sel) {
  var F = frame(1100, 44 + rows.length * 30, [16, 96, 34, 250]);
  var span = Math.max.apply(null, rows.map(function (r) { return Math.max(Math.abs(r.low), Math.abs(r.high)); }));
  var x = lin(-span * 1.12, span * 1.12, F.L, F.R);
  var zero = x(0), rowH = (F.B - F.T) / rows.length, bh = Math.min(15, rowH - 8);

  rows.forEach(function (r, i) {
    var yy = F.T + i * rowH + (rowH - bh) / 2;
    [[r.low, C.lo], [r.high, C.hi]].forEach(function (pair) {
      var v = pair[0], w = Math.abs(x(v) - zero);
      if (w < 1) return;
      F.svg.appendChild(e('path', {
        d: bar(v >= 0 ? zero : zero - w, yy, w, bh, 3, 'right'), fill: pair[1], opacity: .9
      }));
    });
    F.svg.appendChild(e('text', {
      x: F.L - 12, y: yy + bh / 2 + 4, 'text-anchor': 'end',
      fill: C.ink2, 'font-size': 11.5, 'font-family': 'inherit'
    }, r.label));
    if (r.flips) {
      /* Status colour never travels alone — icon plus label. */
      F.svg.appendChild(e('text', {
        x: F.R + 8, y: yy + bh / 2 + 4, fill: C.hi, 'font-size': 11,
        'font-weight': 700, 'font-family': 'inherit'
      }, '▲ flips the call'));
    } else if (r.swing < 0.02) {
      F.svg.appendChild(e('text', {
        x: F.R + 8, y: yy + bh / 2 + 4, fill: C.muted, 'font-size': 10.5, 'font-family': 'inherit'
      }, 'cannot apply here'));
    }
  });

  F.svg.appendChild(e('line', { x1: zero, x2: zero, y1: F.T - 6, y2: F.B, stroke: C.axis, 'stroke-width': 1 }));
  [-span, -span / 2, 0, span / 2, span].forEach(function (v) {
    xLabel(F, x(v), F.B + 18, (v >= 0 ? '+' : '−') + '$' + Math.abs(v).toFixed(0) + 'M');
  });

  mount('viz-tornado', F, 'Sensitivity of ' + LABEL[sel] + ' net contribution to each assumption.');
  legend('viz-tornado', [
    { color: C.lo, label: 'Assumption 30% lower' },
    { color: C.hi, label: 'Assumption 30% higher' },
    { bare: true, label: '▲ flips the call = a different pattern would win' }
  ]);
  table('viz-tornado', ['Assumption', 'Lower', 'Higher', 'Swing', 'Changes the call?'],
    rows.map(function (r) {
      return [r.label, money(r.low), money(r.high), money(r.swing),
              r.flips ? 'Yes — ' + LABEL[r.flipTo] + ' wins' : 'No'];
    }));

  var flips = rows.filter(function (r) { return r.flips; });
  document.getElementById('tornado-note').innerHTML = flips.length
    ? '<span class="flag is-crit">' + warnIcon() + flips.length + ' assumption' + (flips.length > 1 ? 's' : '') +
      ' change the recommendation</span> — ' + flips.map(function (r) { return r.label.toLowerCase(); }).join(', ') +
      '. None of them is measured; they are all judgements.'
    : '<span class="flag is-ok">' + warnIcon() + 'No single assumption changes which pattern wins</span> within the ranges tested.';
}

function warnIcon() {
  return '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1 15 14H1z"/></svg>';
}

/* ═══ Stability across draws ══════════════════════════════════════ */

function chartStability(st) {
  var ids = st.ids;
  var stats = ids.map(function (id) {
    var v = st.rows.map(function (r) { return r[id]; });
    var m = v.reduce(function (a, b) { return a + b; }, 0) / v.length;
    return { id: id, mean: m, lo: Math.min.apply(null, v), hi: Math.max.apply(null, v), vals: v };
  }).sort(function (a, b) { return b.mean - a.mean; });

  var F = frame(1100, 56 + stats.length * 34, [18, 62, 50, 150]);
  var lo = Math.min.apply(null, stats.map(function (s) { return s.lo; }));
  var hi = Math.max.apply(null, stats.map(function (s) { return s.hi; }));
  var pad = (hi - lo) * 0.1 || 1;
  var x = lin(lo - pad, hi + pad, F.L, F.R);
  var rowH = (F.B - F.T) / stats.length;

  stats.forEach(function (s, i) {
    var yy = F.T + i * rowH + rowH / 2;
    F.svg.appendChild(e('line', { x1: x(s.lo), x2: x(s.hi), y1: yy, y2: yy, stroke: C.s1, 'stroke-width': 2, opacity: .35, 'stroke-linecap': 'round' }));
    s.vals.forEach(function (v) {
      F.svg.appendChild(e('circle', { cx: x(v), cy: yy, r: 3, fill: C.s1, opacity: .45 }));
    });
    F.svg.appendChild(e('circle', { cx: x(s.mean), cy: yy, r: 6, fill: C.s1, stroke: C.surface, 'stroke-width': 2 }));
    F.svg.appendChild(e('text', { x: F.L - 12, y: yy + 4, 'text-anchor': 'end', fill: C.ink2, 'font-size': 11.5, 'font-family': 'inherit' }, LABEL[s.id]));
    F.svg.appendChild(e('text', { x: F.R + 6, y: yy + 4, fill: i === 0 ? C.ink : C.muted, 'font-size': 11.5, 'font-weight': i === 0 ? 700 : 500, 'font-family': 'inherit' }, money(s.mean)));
  });

  baseline(F, F.B);
  rangeTicks(lo - pad, hi + pad, 5)
    .forEach(function (v) { xLabel(F, x(v), F.B + 18, '$' + v.toFixed(0) + 'M'); });
  xLabel(F, (F.L + F.R) / 2, F.B + 34, 'net contribution across eight independent draws of the audience');

  mount('viz-stability', F, 'Net contribution for each pattern across eight population draws.');
  legend('viz-stability', [
    { color: C.s1, label: 'One draw of the audience', small: true, alpha: .45 },
    { color: C.s1, label: 'Mean of all eight' }
  ]);

  /* The paired difference is the number that settles it: same people,
     same coin flips, different policy. Comparing the two means separately
     would hide that the draws are correlated. */
  var champ = stats[0], rival = stats[1];
  var diffs = st.rows.map(function (r) { return r[champ.id] - r[rival.id]; });
  var md = diffs.reduce(function (a, b) { return a + b; }, 0) / diffs.length;
  var sd = Math.sqrt(diffs.reduce(function (a, b) { return a + (b - md) * (b - md); }, 0) / (diffs.length - 1));
  var wins = diffs.filter(function (d) { return d > 0; }).length;

  table('viz-stability', ['Draw'].concat(stats.map(function (s) { return LABEL[s.id]; })),
    st.rows.map(function (r, i) {
      return ['#' + (i + 1)].concat(stats.map(function (s) { return money(r[s.id]); }));
    }));

  var solid = wins >= 7 && md > 2 * (sd / Math.sqrt(diffs.length));
  document.getElementById('stability-note').innerHTML =
    '<span class="flag ' + (solid ? 'is-ok' : '') + '">' + warnIcon() +
    LABEL[champ.id] + ' beats ' + LABEL[rival.id] + ' in ' + wins + ' of ' + diffs.length + ' draws</span> ' +
    'by a paired mean of <strong>' + money(md) + '</strong> (sd ' + money(sd) + '). ' +
    (md < 2
      ? 'That is a real gap but a small one — smaller than the swing from any single assumption in the sensitivity panel. ' +
        'The two leaders are, for practical purposes, tied on money.'
      : 'That margin is large enough to survive the model’s own sampling variation.');
}

/* ═══ The memo ════════════════════════════════════════════════════ */

function writeMemo(results, sel) {
  var sorted = results.slice().sort(function (a, b) { return b.netContribution - a.netContribution; });
  var win = sorted[0], second = sorted[1];
  var margin = win.netContribution - second.netContribution;
  var cur = results.find(function (r) { return r.strategy === sel; });

  var bestRet = results.slice().sort(function (a, b) { return b.retentionValue - a.retentionValue; })[0];
  var bestAcq = results.slice().sort(function (a, b) { return b.acquisitionValue - a.acquisitionValue; })[0];

  var tight = margin < 2;
  var h = '';

  h += '<p class="verdict">' + (tight
    ? 'Too close to call on the money: <strong>' + LABEL[win.strategy] + '</strong> leads by ' +
      money(margin) + ', inside this model’s own run-to-run variation.'
    : 'Recommend <strong>' + LABEL[win.strategy] + '</strong> — ' + money(win.netContribution) +
      ' net, ' + money(margin) + ' clear of ' + LABEL[second.strategy] + '.') + '</p>';

  h += '<p>The two objectives disagree, and that is the whole problem. ' +
       '<strong>' + LABEL[bestAcq.strategy] + '</strong> maximises acquisition (' + money(bestAcq.acquisitionValue) +
       '), because signups follow concentration — a crowded opening week buys the Top 10 slot and the press cycle. ' +
       '<strong>' + LABEL[bestRet.strategy] + '</strong> maximises retention (' + money(bestRet.retentionValue) +
       '), because renewals are spread evenly across the month and a single spike can only sit near some of them. ' +
       'The winner is whichever pattern gives up least on both.</p>';

  h += '<p><strong>' + LABEL[sel] + '</strong> (' + SHAPE[sel] + ') delivers ' +
       money(cur.netContribution) + ' net: ' + money(cur.retentionValue) + ' from ' +
       f1(cur.savedMonths / 1e6) + 'M subscriber-months held, ' + money(cur.acquisitionValue) + ' from ' +
       f1(cur.signups / 1e6) + 'M signups, less ' + money(cur.spend) + ' of marketing. ' +
       pct(cur.completion) + ' of starters reach the finale and it holds a Top 10 slot for ' +
       cur.chartWeeks + ' week' + (cur.chartWeeks === 1 ? '' : 's') +
       ', with ' + cur.conversationWeeks + ' weeks of live conversation around it.';
  if (sel !== win.strategy) {
    h += ' That is ' + money(win.netContribution - cur.netContribution) + ' behind ' + LABEL[win.strategy] + '.';
  }
  h += '</p>';

  /* What the last slice of the marketing line actually bought. */
  if (state.marginal) {
    var dSpend = P.mktSpend - state.marginal.spendLow;
    var dValue = (cur.netContribution - state.marginal.netLow) + dSpend;
    var roi = dSpend > 0 ? dValue / dSpend : 0;
    h += '<p>The top ' + money(dSpend) + ' of the marketing line returns ' +
         money(dValue) + ' — <strong>' + roi.toFixed(2) + '× on the marginal dollar</strong>. ' +
         (roi < 0.8
           ? 'Below break-even, and it stays below across the whole slider: for a final season of an ' +
             'established franchise, the audience already knows. Almost all demand here arrives through ' +
             'the buzz channel rather than the paid one, which is a direct consequence of the awareness-per-dollar ' +
             'assumption — turn it up in the drawer below and the conclusion reverses.'
           : 'Above break-even, so the budget is not yet saturated at this level.') + '</p>';
  }

  if (tight) {
    h += '<p><span class="flag">' + warnIcon() + 'Decision rule engaged</span> ' +
         'The rule was fixed before the model ran: take the highest net contribution, unless the margin is ' +
         'under $2M — in which case the money is not deciding anything, and the tie breaks to the pattern that ' +
         'produces the most evidence for the next season. A two-part release is the only option here that ' +
         'generates a clean internal comparison: the same audience, the same season, measured twice, five weeks apart.</p>';
  }

  document.getElementById('memo-body').innerHTML = h;
}

/* ═══ Tiles ═══════════════════════════════════════════════════════ */

function writeKpis(results, sel) {
  var r = results.find(function (x) { return x.strategy === sel; });
  var tiles = [
    { k: 'Net contribution', v: money(r.netContribution), s: 'retention + acquisition − marketing', neg: r.netContribution < 0 },
    { k: 'Subscriber-months held', v: f1(r.savedMonths / 1e6) + 'M', s: 'vs a window with no Outer Banks' },
    { k: 'Signups', v: f1(r.signups / 1e6) + 'M', s: pct(r.d30Retention) + ' still there after one renewal' },
    { k: 'Finish the season', v: pct(r.completion), s: 'of everyone who started it' },
    { k: 'Weeks in the Top 10', v: String(r.chartWeeks), s: 'peak ' + views(r.peakWeekViews) + ' views' }
  ];
  document.getElementById('kpis').innerHTML = tiles.map(function (t) {
    return '<div class="kpi"><div class="kpi-k">' + t.k + '</div>' +
           '<div class="kpi-v' + (t.neg ? ' is-neg' : '') + '">' + t.v + '</div>' +
           '<div class="kpi-s">' + t.s + '</div></div>';
  }).join('');
}

/* ═══ Orchestration ═══════════════════════════════════════════════ */

var timer = null, generation = 0;

/* Two phases. The five patterns come back first and paint everything the
   reader is looking at; the nine-point gap sweep is another nine runs and
   arrives a beat later. Both carry the generation they were requested
   under, so a fast slider drag discards its own stale answers instead of
   painting them out of order. */
function recompute(immediate) {
  clearTimeout(timer);
  timer = setTimeout(function () {
    var gen = ++generation;
    root.classList.add('is-busy');
    run('main', { strategy: state.strategy }, function (out) {
      if (gen !== generation) return;
      state.last = out.results;
      state.marginal = out.marginal;
      root.classList.remove('is-busy');
      render();
      run('sweep', { strategy: state.strategy }, function (s2) {
        if (gen !== generation) return;
        state.sweep = s2.sweep;
        state.sweepFor = s2.sweepFor;
        renderGap();
      });
    });
  }, immediate ? 0 : 170);
}

function render() {
  if (!state.last) return;
  var r = state.last, s = state.strategy;
  writeKpis(r, s);
  writeMemo(r, s);
  chartViews(r, s);
  chartCoverage(r, s);
  chartRank(r, s);
  chartTradeoff(r, s);
  chartDropoff(r, s);
  renderGap();
}

function renderGap() {
  if (state.sweep) chartGap(state.sweep, state.sweepFor, state.strategy);
}

/* ── Controls ─────────────────────────────────────────────────────── */

function buildControls() {
  var seg = document.getElementById('strategy-seg');
  seg.innerHTML = M.STRATEGIES.map(function (st) {
    return '<button type="button" class="seg" data-id="' + st.id + '" aria-pressed="' +
      (st.id === state.strategy) + '">' + st.label + '<small>' + st.shape + '</small></button>';
  }).join('');
  seg.addEventListener('click', function (ev) {
    var b = ev.target.closest('.seg');
    if (!b) return;
    state.strategy = b.dataset.id;
    Array.prototype.forEach.call(seg.children, function (c) {
      c.setAttribute('aria-pressed', String(c.dataset.id === state.strategy));
    });
    syncGapControl();
    recompute(true);
  });

  slider('gap', 'gapWeeks', function (v) { return v + ' weeks'; });
  slider('spend', 'mktSpend', function (v) { return '$' + v + 'M'; });
  slider('comp', 'competition', function (v) { return Math.round(v * 100) + '%'; }, 100);

  var hand = document.getElementById('ctl-handoff');
  hand.checked = P.handoff;
  hand.addEventListener('change', function () { P.handoff = hand.checked; recompute(true); });

  document.getElementById('btn-reset').addEventListener('click', function () {
    P = Object.assign({}, M.ASSUMPTIONS);
    state.strategy = 'split2';
    buildAssumptions();
    document.getElementById('ctl-gap').value = P.gapWeeks;
    document.getElementById('ctl-spend').value = P.mktSpend;
    document.getElementById('ctl-comp').value = P.competition * 100;
    document.getElementById('ctl-handoff').checked = P.handoff;
    Array.prototype.forEach.call(document.getElementById('strategy-seg').children, function (c) {
      c.setAttribute('aria-pressed', String(c.dataset.id === state.strategy));
    });
    ['gap', 'spend', 'comp'].forEach(syncLabel);
    syncGapControl();
    recompute(true);
  });

  syncGapControl();
}

function syncLabel(name) {
  var el = document.getElementById('ctl-' + name);
  el.dispatchEvent(new Event('input', { bubbles: false }));
}

function slider(name, key, fmt, div) {
  var el = document.getElementById('ctl-' + name);
  var out = document.getElementById('val-' + name);
  el.value = div ? P[key] * div : P[key];
  var apply = function () {
    var v = parseFloat(el.value) / (div || 1);
    P[key] = v;
    out.textContent = fmt(v);
  };
  apply();
  el.addEventListener('input', function () { apply(); recompute(false); });
}

/* The gap only exists for the split patterns; disabling the control is
   more honest than letting someone drag a slider that does nothing. */
function syncGapControl() {
  var isSplit = state.strategy === 'split2' || state.strategy === 'split3';
  var el = document.getElementById('ctl-gap');
  el.disabled = !isSplit;
  el.closest('.ctl').classList.toggle('is-off', !isSplit);
  document.getElementById('gap-hint').textContent = isSplit
    ? 'Between each part.' : 'Only applies to a split release.';
}

/* ── Assumption drawer ────────────────────────────────────────────── */

var EDITABLE = [
  { key: 'baseChurn', label: 'Baseline monthly churn', min: 0.008, max: 0.045, step: 0.001,
    fmt: function (v) { return (v * 100).toFixed(1) + '%'; },
    note: 'What share of subscribers would cancel in a month with nothing to watch. Netflix has never published this.' },
  { key: 'habitBonus', label: 'The halo', min: 0, max: 0.25, step: 0.005,
    fmt: function (v) { return v.toFixed(3) + ' h/day'; },
    note: 'Extra viewing of everything else, while mid-season on something you follow. Set it to zero and the case for spreading a release out collapses.' },
  { key: 'buzzConvexity', label: 'Concentration premium', min: 1.0, max: 1.7, step: 0.05,
    fmt: function (v) { return '×' + v.toFixed(2); },
    note: 'Above 1, a crowd that shows up at once is worth more than the same crowd spread thin. This is what the Top 10 list rewards.' },
  { key: 'churnK', label: 'Churn sensitivity to engagement', min: 0.05, max: 0.35, step: 0.01,
    fmt: function (v) { return v.toFixed(2); },
    note: 'How hard recent viewing suppresses a cancellation at the billing date.' },
  { key: 'stockHalfLife', label: 'How fast “recently watched” fades', min: 3, max: 20, step: 1,
    fmt: function (v) { return v + ' days'; },
    note: 'Short values favour a steady drip; long values let one big weekend cover a whole month.' },
  { key: 'returnBase', label: 'Weekly return rate', min: 0.7, max: 0.99, step: 0.01,
    fmt: function (v) { return (v * 100).toFixed(0) + '%'; },
    note: 'Chance a caught-up viewer comes back for the next episode. Compounded over ten weeks, small changes here are large.' },
  { key: 'mktScale', label: 'Awareness bought per dollar', min: 0.01, max: 0.6, step: 0.01,
    fmt: function (v) { return v.toFixed(2); },
    note: 'How far paid marketing moves awareness against word of mouth. At the default it barely competes, so demand is buzz-driven and concentration wins. Raise it and spreading the campaign across two launches starts to beat concentrating it — which flips which pattern wins acquisition.' },
  { key: 'arpu', label: 'Monthly ARPU', min: 8, max: 26, step: 0.5,
    fmt: function (v) { return '$' + v.toFixed(2); },
    note: 'Blended across the markets where the show charts.' },
  { key: 'marketSubs', label: 'Addressable subscriber base', min: 40e6, max: 220e6, step: 5e6,
    fmt: function (v) { return (v / 1e6).toFixed(0) + 'M'; },
    note: 'Households in markets where a show like this reaches the Top 10. Scales every dollar figure linearly.' }
];

function buildAssumptions() {
  var box = document.getElementById('assumptions');
  box.innerHTML = EDITABLE.map(function (a) {
    return '<div class="assump"><h4>' + a.label + '</h4><p>' + a.note + '</p>' +
      '<div class="ctl-label"><span>value</span><span class="ctl-val" id="av-' + a.key + '"></span></div>' +
      '<input type="range" id="ai-' + a.key + '" min="' + a.min + '" max="' + a.max + '" step="' + a.step +
      '" value="' + P[a.key] + '" aria-label="' + a.label + '"></div>';
  }).join('');

  EDITABLE.forEach(function (a) {
    var el = document.getElementById('ai-' + a.key), out = document.getElementById('av-' + a.key);
    var apply = function () { P[a.key] = parseFloat(el.value); out.textContent = a.fmt(P[a.key]); };
    apply();
    el.addEventListener('input', function () { apply(); recompute(false); });
  });
}

/* ── On-demand panels ─────────────────────────────────────────────── */

function wireRun(btnId, statusId, kind, onDone) {
  var btn = document.getElementById(btnId), status = document.getElementById(statusId);
  btn.addEventListener('click', function () {
    btn.disabled = true;
    status.textContent = 'Running — a few hundred simulated release windows…';
    run(kind, { strategy: state.strategy }, function (out) {
      btn.disabled = false;
      status.textContent = 'Run against the settings above.';
      onDone(out);
    });
  });
}

/* ── Table toggles ────────────────────────────────────────────────── */

document.addEventListener('click', function (ev) {
  var b = ev.target.closest('.viz-toggle');
  if (!b) return;
  var card = b.closest('.vizcard');
  var on = card.classList.toggle('show-table');
  b.textContent = on ? 'Chart' : 'Table';
  b.setAttribute('aria-pressed', String(on));
});

/* ── Go ───────────────────────────────────────────────────────────── */

buildControls();
buildAssumptions();
wireRun('btn-tornado', 'tornado-status', 'tornado', function (out) {
  chartTornado(out.tornado, state.strategy);
});
wireRun('btn-stability', 'stability-status', 'stability', function (out) {
  chartStability(out.stability);
});
recompute(true);

/* Re-render on resize so text and hit areas stay aligned with the SVG. */
var rt = null;
window.addEventListener('resize', function () {
  clearTimeout(rt);
  rt = setTimeout(render, 200);
});

})();
