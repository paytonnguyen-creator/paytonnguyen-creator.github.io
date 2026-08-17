/* ─────────────────────────────────────────────────────────────────────
   Outer Banks S5 — release-strategy simulator, model layer

   An agent-based model of what a release pattern actually changes. The
   claim it encodes: a drop schedule does not change how many people want
   to watch a season. It changes WHEN their viewing hours land, and
   therefore how much "recently watched" each subscriber is carrying on
   the one day a month that decides anything — their billing date.

   Nothing here is Netflix data. Netflix publishes weekly view counts and
   a twice-yearly engagement report; it publishes no churn, no billing
   distribution and no per-title cohort behaviour, and it stopped
   reporting quarterly subscriber counts in 2025. Every behavioural
   parameter below is therefore an assumption, collected in ASSUMPTIONS
   so a reader can attack the inputs directly instead of
   reverse-engineering them out of the conclusions. What the model
   contributes is mechanism, not measurement.

   Pure computation — no DOM. Loads in a browser as window.OBXModel and
   in node via require(), so the calibration harness and the live page
   run identical code.
   ───────────────────────────────────────────────────────────────────── */
(function (global) {
'use strict';

/* ── Random numbers ───────────────────────────────────────────────────
   Every agent carries its own stream, re-seeded identically at the start
   of every policy run. Agent 4,102 is the same person — same appetite for
   the show, same billing date, same patience, same tape of coin flips —
   under all five release patterns, so differences between strategies are
   the policy rather than sampling noise. (The tape is consumed at
   different rates under different policies, so this is partial variance
   reduction, not the full common-random-numbers guarantee.)

   Churn is not sampled at all — see propagateSurvival below. */

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Inlined per-agent step. rs is a Uint32Array of stream states. */
function u(rs, i) {
  var a = (rs[i] + 0x6D2B79F5) | 0;
  rs[i] = a;
  var t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function gauss(rnd) {
  var a = 1 - rnd(), b = rnd();
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b);
}

/* ── Assumptions ──────────────────────────────────────────────────────
   Anything a reader could reasonably dispute lives here. */

var ASSUMPTIONS = {
  /* — Market ————————————————————————————————————— */
  marketSubs:      120e6,  // subscriber households in markets where OBX charts
  marketProspects:  40e6,  // reachable lapsed + never-subscribed households
  arpu:             17.5,  // $/month, blended across the footprint
  margin:           0.55,  // contribution margin on a retained month
                           // (the season costs the same to make under every
                           // pattern, so production cost cancels and is excluded)

  /* — Title ——————————————————————————————————————— */
  episodes:           10,  // S1–S4 were all 10
  epHours:          0.85,  // ~51 minutes an episode

  /* — Churn ——————————————————————————————————————— */
  baseChurn:       0.021,  // monthly churn with no OBX release at all
  churnK:           0.17,  // how hard trailing engagement suppresses churn
  stockHalfLife:       8,  // days; how fast "I've been watching" fades
  newJoinPenalty:   3.20,  // churn multiplier on a subscriber's first two
                           // renewals: someone who joined for one title has no
                           // habit yet, and a title-driven cohort leaves at a
                           // multiple of the house rate

  /* — Viewing ————————————————————————————————————— */
  viewIntensity:    0.52,  // daily hazard scaler for opening a session
  bingeAppetite:     6.0,  // episodes per sitting, scaled by fandom
  attentionTau:      4.5,  // days; freshness decay after a drop

  /* — Cadence friction ———————————————————————————— */
  returnBase:       0.90,  // caught-up viewer returns for the next drop…
  returnFan:        0.09,  // …plus this much, scaled by fandom
  haloRecency:         5,  // days after a viewing session that the habit holds
  habitBonus:       0.09,  // hours a day of OTHER viewing, while a subscriber
                           // is mid-season on something they are following.
                           // This is the entire case for weekly release — that
                           // it buys a recurring appointment with the product
                           // rather than with the show — and it is the one
                           // number in this model that nobody outside Netflix
                           // can observe. See the sensitivity panel.
  deferRate:        0.13,  // per extra drop: tendency to wait and stack
  deferAbandon:     0.30,  // of those who wait, the share who never start
  deferDecay:       0.80,  // intent left in those who do come back
  spoilRate:       0.013,  // per drop after the second, weighted to casuals

  /* — Demand creation ————————————————————————————— */
  mktSpend:           28,  // $M
  mktElasticity:    0.55,  // diminishing returns on spend
  mktScale:        0.020,  // awareness per unit of pulse
  buzzWeight:       1.65,  // awareness contributed by other people watching
  buzzConvexity:    1.30,  // >1 makes a concentrated audience worth more than
                           // the same audience spread thin: the Top 10 list,
                           // the press cycle and every social ranking reward
                           // simultaneity, not cumulative hours. This exponent
                           // is the single most consequential assumption in the
                           // model and it is a judgement, not a measurement.
  convScale:       0.048,  // prospect conversion hazard scaler

  /* — Environment ————————————————————————————————— */
  competition:      0.35,  // 0–1 share-of-voice pressure in the window
  handoff:         false,  // programme an adjacent YA title behind the finale
  handoffCost:       4.5,  // $M of the marketing budget it consumes
  handoffHours:      2.1,  // engagement hours it lends a finale viewer

  /* — Simulation ————————————————————————————————— */
  horizonDays:       182,
  gapWeeks:            5   // between parts, for split patterns
};

/* ── Release patterns ─────────────────────────────────────────────── */

var STRATEGIES = [
  { id: 'binge',  label: 'All at once',       shape: '10 episodes, one Thursday' },
  { id: 'split2', label: 'Two parts',         shape: '5 + 5' },
  { id: 'split3', label: 'Three parts',       shape: '4 + 3 + 3' },
  { id: 'hybrid', label: 'Premiere + weekly', shape: '3 up front, then 1 a week' },
  { id: 'weekly', label: 'Weekly',            shape: '1 a week for 10 weeks' }
];

/* Split n episodes into k front-loaded parts: 10 into 3 is 4 + 3 + 3. */
function parts(n, k) {
  var base = Math.floor(n / k), rem = n - base * k, out = [], i;
  for (i = 0; i < k; i++) out.push(base + (i < rem ? 1 : 0));
  return out;
}

function schedule(id, eps, gapDays) {
  var s = [], p, i;
  if (id === 'binge') {
    s.push({ d: 0, n: eps });
  } else if (id === 'split2' || id === 'split3') {
    p = parts(eps, id === 'split2' ? 2 : 3);
    for (i = 0; i < p.length; i++) s.push({ d: i * gapDays, n: p[i] });
  } else if (id === 'hybrid') {
    s.push({ d: 0, n: 3 });
    for (i = 1; i <= eps - 3; i++) s.push({ d: 7 * i, n: 1 });
  } else {
    for (i = 0; i < eps; i++) s.push({ d: 7 * i, n: 1 });
  }
  return s;
}

/* How the marketing budget splits across drops. A second part is a real
   second launch moment and earns real spend; a ninth weekly episode is
   not, and could not absorb one. The asymmetry is an assumption, and it
   is doing enough work that it is called out in the write-up. */
function spendWeights(id, drops) {
  var w = new Array(drops).fill(0), i, rest;
  if (drops === 1) { w[0] = 1; return w; }
  if (id === 'split2') { w[0] = 0.62; w[1] = 0.38; return w; }
  if (id === 'split3') { w[0] = 0.50; w[1] = 0.28; w[2] = 0.22; return w; }
  w[0] = 0.72;
  rest = 0.28 / (drops - 1);
  for (i = 1; i < drops; i++) w[i] = rest;
  return w;
}

/* ── Cohort ───────────────────────────────────────────────────────────
   Built once per (size, seed) and cached. Immutable across policy runs —
   this is what makes the comparison a comparison. */

var cohortCache = {};

function buildCohort(n, np, seed) {
  var key = n + ':' + np + ':' + seed;
  if (cohortCache[key]) return cohortCache[key];

  var N = n + np, rnd = mulberry32(seed), i;
  var f = new Float32Array(N);      // appetite for this particular show
  var anniv = new Uint8Array(N);    // billing day, 0–29, relative to premiere
  var pat = new Float32Array(N);    // tolerance for waiting a week
  var base = new Float32Array(N);   // background Netflix hours a day
  var thresh = new Float32Array(N); // Exp(1) conversion threshold (prospects)
  var seeds = new Uint32Array(N);
  var interested = [];

  for (i = 0; i < N; i++) {
    /* Appetite. A little over half the base has no interest in a teen
       treasure-hunt drama at all; the rest is right-skewed, with a thin
       tail of people who will watch it the night it lands. */
    var v = rnd();
    f[i] = v < 0.56 ? 0.02 * rnd() : Math.pow(rnd(), 1.7) * 0.98 + 0.02;

    anniv[i] = Math.floor(rnd() * 30);
    pat[i] = rnd();

    /* Background engagement, lognormal. Subscribers sit around 22 hours a
       month. Prospects are people who are NOT subscribed, so their latent
       affinity is thinner — which is exactly why acquisition cohorts churn
       hard, and the model should not have to be told that separately. */
    var med = i < n ? 22 : 5, sig = i < n ? 0.92 : 0.80;
    base[i] = Math.exp(Math.log(med) + sig * gauss(rnd)) / 30;

    thresh[i] = -Math.log(1 - rnd());
    seeds[i] = (rnd() * 4294967295) >>> 0;

    if (f[i] >= 0.03) interested.push(i);
  }

  var c = {
    n: n, np: np, N: N, f: f, anniv: anniv, pat: pat, base: base,
    thresh: thresh, seeds: seeds, interested: Int32Array.from(interested)
  };
  cohortCache[key] = c;
  return c;
}

/* Scratch state, reallocated only when the panel size changes. */
var scratch = { N: -1 };
function getScratch(N) {
  if (scratch.N !== N) {
    scratch = {
      N: N,
      ep: new Uint8Array(N), mode: new Uint8Array(N), started: new Uint8Array(N),
      stock: new Float32Array(N), fe: new Float32Array(N), surv: new Float32Array(N),
      rs: new Uint32Array(N), joinDay: new Int16Array(N), cumH: new Float32Array(N),
      lastWatch: new Int16Array(N),
      anniv: new Uint8Array(N), surv30: new Float32Array(N)
    };
  }
  return scratch;
}

/* ── The simulation ───────────────────────────────────────────────────

   Churn is propagated, not sampled. Each agent carries a survival mass
   that is multiplied by (1 − hazard) at each billing date, and every
   quantity they contribute is weighted by it. The alternative — flipping
   a coin per billing date — buries a 2% effect under Monte Carlo noise of
   the same size, which is what the first version of this model did and
   why its gap sweep was static. Viewing stays stochastic; only the
   accounting is exact.

   modes: 0 available to watch · 1 deferring until the season completes
          2 gone from the show (bounced, spoiled, or never came back) */

function simulate(P, opts) {
  opts = opts || {};
  var n = opts.n || 12000, np = opts.np || 5000;
  var C = buildCohort(n, np, opts.seed || 20260817);
  var N = C.N, S = getScratch(N), i, t, k, j;

  var DAYS = P.horizonDays;
  var eps = P.episodes;
  var live = opts.strategy && opts.strategy !== 'none';
  var sched = live ? schedule(opts.strategy, eps, Math.round(P.gapWeeks * 7)) : [];
  var drops = sched.length;
  var comp = P.competition;
  var IDX = C.interested, NI = IDX.length;

  /* Per-day lookups: how many episodes are out, and how stale they are. */
  var avail = new Int16Array(DAYS), sinceDrop = new Int16Array(DAYS);
  var dropAt = new Int16Array(DAYS).fill(-1), untilDrop = new Int16Array(DAYS).fill(999);
  var cum = 0, last = -999, di = 0;
  for (t = 0; t < DAYS; t++) {
    while (di < drops && sched[di].d === t) { cum += sched[di].n; last = t; dropAt[t] = di; di++; }
    avail[t] = cum; sinceDrop[t] = t - last;
  }
  for (k = 0; k < drops; k++) {
    for (t = Math.max(0, sched[k].d - 7); t <= sched[k].d && t < DAYS; t++) {
      if (sched[k].d - t < untilDrop[t]) untilDrop[t] = sched[k].d - t;
    }
  }
  var finalDrop = drops ? sched[drops - 1].d : 0;

  /* Marketing: a triangular awareness pulse around each drop, amplitude
     set by spend with diminishing returns, damped by competitive noise. */
  var mkt = new Float64Array(DAYS);
  if (live) {
    var budget = Math.max(P.mktSpend - (P.handoff ? P.handoffCost : 0), 0.1);
    var amp = P.mktScale * Math.pow(budget / 25, P.mktElasticity);
    var w = spendWeights(opts.strategy, drops);
    for (k = 0; k < drops; k++) {
      var d = sched[k].d;
      for (t = Math.max(0, d - 10); t < Math.min(DAYS, d + 14); t++) {
        var rise = t <= d ? 1 - (d - t) / 11 : Math.exp(-(t - d) / 5);
        if (rise > 0) mkt[t] += amp * w[k] * rise;
      }
    }
    for (t = 0; t < DAYS; t++) mkt[t] *= (1 - 0.45 * comp);
  }

  var decay = Math.pow(0.5, 1 / P.stockHalfLife);
  var eqm = 1 / (1 - decay);
  var hazardScale = P.hazardScale || 1;
  var handoffDay = P.handoff && live ? finalDrop + 7 : -1;
  /* Competition acts on the show's own audience, not on the churn rate.
     A rival tentpole does raise everyone's hazard — but it raises it in the
     counterfactual too, and every number here is measured against that
     counterfactual, so the churn channel cancels exactly. An earlier version
     put competition into the hazard and then calibrated it straight back
     out, leaving a slider that moved nothing. What does not cancel is that a
     competitor takes viewing hours away from us: fewer hours means less
     buzz, fewer signups and a thinner engagement stock at the billing date. */
  var compView = 1 - 0.35 * comp;

  var subMonthDays = 0, acqMonthDays = 0, signups = 0, d30num = 0, d30den = 0;
  var dailyHours = new Float64Array(DAYS);
  var churnByOffset = new Float64Array(30), atRiskByOffset = new Float64Array(30);
  /* The same thing again, but by calendar day rather than folded into a
     single 30-day cycle. Folding averages the month the release lands in
     together with the five months after it, which flattens exactly the
     structure the model exists to show. Two cycles is enough to see both
     a Part 1 and a Part 2 land. */
  var churnByDay = new Float64Array(60), atRiskByDay = new Float64Array(60);

  /* ── The uninterested majority, solved rather than simulated ────────
     An agent who will never watch this show has a constant engagement
     stock — their background equilibrium — and therefore a constant
     hazard. Their survival is a geometric sequence, identical under every
     release pattern, so it cancels out of every difference the model
     reports. Computing it closed-form instead of stepping it 182 times
     removes 56% of the work at zero cost to the answer. */
  for (i = 0; i < N; i++) {
    if (C.f[i] >= 0.03) continue;
    if (i >= n) continue;                       // uninterested prospects never convert
    var hz0 = hazardScale * Math.exp(-P.churnK * C.base[i] * eqm);
    if (hz0 > 0.95) hz0 = 0.95;
    var sv = 1, off = C.anniv[i];
    for (t = 0; t < DAYS; t++) {
      if (t > 0 && (t - off) % 30 === 0) {
        atRiskByOffset[off] += sv;
        churnByOffset[off] += sv * hz0;
        if (t < 60) { atRiskByDay[t] += sv; churnByDay[t] += sv * hz0; }
        sv *= (1 - hz0);
      }
      subMonthDays += sv;
    }
  }

  /* ── Reset the agents who actually matter ─────────────────────────── */
  for (j = 0; j < NI; j++) {
    i = IDX[j];
    S.ep[i] = 0; S.mode[i] = 0; S.started[i] = 0;
    S.fe[i] = C.f[i];
    S.rs[i] = C.seeds[i];
    S.anniv[i] = C.anniv[i];
    S.cumH[i] = 0;
    S.joinDay[i] = i < n ? 0 : -1;
    S.surv[i] = i < n ? 1 : 0;
    S.surv30[i] = -1;
    S.lastWatch[i] = -999;
    /* Start at background equilibrium rather than zero, so month one is
       not an artefact of the initial condition. */
    S.stock[i] = C.base[i] * eqm;
  }

  /* Deferral. Under a long schedule some people decide up front to wait
     for the whole thing — the most expensive audience behaviour a weekly
     release can provoke, because it moves their hours outside the window
     the marketing paid for. */
  if (live && drops > 1) {
    var dProb = 1 - Math.exp(-P.deferRate * (drops - 1));
    for (j = 0; j < NI; j++) {
      i = IDX[j];
      if (u(S.rs, i) < dProb * (1 - C.pat[i])) S.mode[i] = 1;
    }
  }

  var buzzPrev = 0;

  for (t = 0; t < DAYS; t++) {
    var a = avail[t];
    var att = live ? Math.exp(-sinceDrop[t] / P.attentionTau) * (1 - 0.25 * comp) : 0;
    var dropIdx = dropAt[t];
    var availBefore = dropIdx >= 0 ? a - sched[dropIdx].n : a;
    var hoursToday = 0;
    var aware = live ? mkt[t] + P.buzzWeight * Math.pow(buzzPrev, P.buzzConvexity) : 0;

    for (j = 0; j < NI; j++) {
      i = IDX[j];

      /* — Acquisition ————————————————————————————————
         Inverse-transform rather than a coin flip: the agent joins on the
         first day their cumulative conversion hazard passes a threshold
         drawn once, at cohort build. Same threshold under every policy. */
      if (S.surv[i] === 0) {
        if (S.joinDay[i] < 0 && aware > 0) {
          S.cumH[i] += P.convScale * aware * S.fe[i];
          if (S.cumH[i] > C.thresh[i]) {
            S.surv[i] = 1; S.joinDay[i] = t;
            S.anniv[i] = t % 30;             // acquirers bill on their signup date
            S.stock[i] = C.base[i] * eqm;
            signups++;
          }
        }
        if (S.surv[i] === 0) continue;
      }

      /* — Cadence gates, only on a drop day ————————————— */
      if (live && dropIdx > 0 && S.mode[i] === 0 && S.started[i] === 1) {
        if (S.ep[i] >= availBefore) {
          /* Caught up, and asked to come back next week. Most do. Over ten
             drops, "most" compounds into something much worse. */
          if (u(S.rs, i) > P.returnBase + P.returnFan * S.fe[i]) S.mode[i] = 2;
        }
        if (S.mode[i] === 0 && dropIdx >= 2 &&
            u(S.rs, i) < P.spoilRate * (1 - S.fe[i])) S.mode[i] = 2;
      }

      /* — Deferrers wake once the season is complete ——————— */
      if (S.mode[i] === 1 && live && t >= finalDrop) {
        if (u(S.rs, i) < P.deferAbandon) S.mode[i] = 2;
        else { S.mode[i] = 0; S.fe[i] *= P.deferDecay; }
      }

      /* — Watching ——————————————————————————————— */
      var showHours = 0;
      if (live && S.mode[i] === 0 && S.ep[i] < a) {
        var p = S.fe[i] * (0.22 + 0.78 * att) * P.viewIntensity * compView;
        if (u(S.rs, i) < p) {
          var want = 1 + Math.floor(u(S.rs, i) * (1 + P.bingeAppetite * S.fe[i]));
          var got = Math.min(want, a - S.ep[i]);
          S.ep[i] += got;
          showHours = got * P.epHours;
          hoursToday += showHours * S.surv[i];
          S.started[i] = 1;
          S.lastWatch[i] = t;
        }
      }
      if (t === handoffDay && S.ep[i] >= eps) showHours += P.handoffHours;

      /* The halo. A subscriber part-way through a season they are following
         opens the app for reasons other than the season — and those hours
         count at the billing date exactly like any other. They are NOT show
         hours, so they stay out of viewing totals and out of buzz; they only
         reach the churn calculation. A binge viewer is mid-season for four
         days. A weekly viewer is mid-season for nine weeks.

         The halo is earned by being in the loop — having watched recently,
         or having a drop close enough to anticipate. Not by having unwatched
         episodes sitting there: a viewer who stalled on episode 3 of a binge
         release two weeks ago has a backlog, not a habit, and an earlier
         version of this condition paid them the halo for the whole season. */
      var halo = 0;
      if (live && S.started[i] === 1 && S.mode[i] === 0 &&
          (t - S.lastWatch[i] <= P.haloRecency || untilDrop[t] <= 7)) halo = P.habitBonus;

      S.stock[i] = S.stock[i] * decay + C.base[i] + showHours + halo;

      /* — Billing date: the only moment churn can happen —————
         A subscriber acquired on day 45 first renews on day 75, not on
         the day they signed up. Getting this wrong charged every acquirer
         a churn event on arrival. */
      if (t > S.joinDay[i] && (t - S.anniv[i]) % 30 === 0) {
        var off2 = S.anniv[i];
        var hz = hazardScale * Math.exp(-P.churnK * S.stock[i]);
        if (S.joinDay[i] > 0 && t - S.joinDay[i] <= 65) hz *= P.newJoinPenalty;
        if (hz > 0.95) hz = 0.95;
        atRiskByOffset[off2] += S.surv[i];
        churnByOffset[off2] += S.surv[i] * hz;
        /* Existing subscribers only. Newly acquired ones carry the joiner
           penalty and all renew 30 days after they arrived, which stacks a
           wave of high-hazard first renewals onto days 30-40 and drowns the
           coverage signal this series is measuring. Their churn is a
           different question, answered by d30Retention. */
        if (t < 60 && i < n) { atRiskByDay[t] += S.surv[i]; churnByDay[t] += S.surv[i] * hz; }
        S.surv[i] *= (1 - hz);
      }

      if (S.joinDay[i] >= 0 && t === S.joinDay[i] + 30 && i >= n) {
        S.surv30[i] = S.surv[i];
      }

      if (i < n) subMonthDays += S.surv[i]; else acqMonthDays += S.surv[i];
    }

    dailyHours[t] = hoursToday;
    buzzPrev = hoursToday / (n * P.epHours);
  }

  /* 30-day survival of the acquisition cohort, censoring late joiners. */
  for (j = 0; j < NI; j++) {
    i = IDX[j];
    if (i >= n && S.surv30[i] >= 0) { d30den++; d30num += S.surv30[i]; }
  }

  /* Episode-level retention among people who started. */
  var epCurve = new Float64Array(eps + 1), starters = 0, completers = 0, reach = 0;
  for (j = 0; j < NI; j++) {
    i = IDX[j];
    if (S.started[i] === 1) {
      starters++;
      for (k = 0; k <= S.ep[i] && k <= eps; k++) epCurve[k]++;
      if (S.ep[i] >= eps) completers++;
    }
    if (S.ep[i] > 0) reach++;
  }
  for (k = 0; k <= eps; k++) epCurve[k] = starters ? epCurve[k] / starters : 0;

  /* Scale the panel up to the market. */
  var subScale = P.marketSubs / n, prosScale = P.marketProspects / np;
  var runtime = eps * P.epHours;
  var weeklyViews = [], wk, h;
  for (wk = 0; wk * 7 < DAYS; wk++) {
    h = 0;
    for (t = wk * 7; t < Math.min((wk + 1) * 7, DAYS); t++) h += dailyHours[t];
    weeklyViews.push(h * subScale / runtime);   // "views" = hours ÷ season runtime
  }

  return {
    strategy: opts.strategy,
    schedule: sched,
    subMonths: subMonthDays * subScale / 30,
    acqMonths: acqMonthDays * prosScale / 30,
    signups: signups * prosScale,
    d30Retention: d30den ? d30num / d30den : 0,
    reach: reach / n,
    starters: starters / n,
    completion: starters ? completers / starters : 0,
    epCurve: Array.from(epCurve),
    dailyHours: Array.from(dailyHours, function (x) { return x * subScale; }),
    weeklyViews: weeklyViews,
    churnByOffset: Array.from(churnByOffset),
    atRiskByOffset: Array.from(atRiskByOffset),
    churnByDay: Array.from(churnByDay),
    atRiskByDay: Array.from(atRiskByDay)
  };
}

/* ── Calibration ──────────────────────────────────────────────────────
   baseChurn is an input, not an output. Run the no-release counterfactual
   with a unit hazard, read back the realised monthly churn, and scale the
   hazard so the counterfactual lands on the stated rate. Every policy run
   then inherits that scale, which is what makes "subscriber-months saved"
   a number relative to a defined baseline rather than to nothing. */

var runCache = {};
function baselineKey(P, o) {
  return [P.churnK, P.stockHalfLife, P.baseChurn, P.competition, P.horizonDays,
          P.marketSubs, P.marketProspects, P.episodes, P.epHours,
          o.n, o.np, o.seed].join('|');
}

function baseline(P, o) {
  var key = baselineKey(P, o);
  if (runCache[key]) return runCache[key];

  var probe = Object.assign({}, P, { hazardScale: 1 });
  var r0 = simulate(probe, Object.assign({}, o, { strategy: 'none' }));
  var events = 0, churns = 0, i;
  for (i = 0; i < 30; i++) { events += r0.atRiskByOffset[i]; churns += r0.churnByOffset[i]; }
  var realised = events ? churns / events : 1;
  var scale = realised > 0 ? P.baseChurn / realised : 1;

  var cf = simulate(Object.assign({}, P, { hazardScale: scale }),
                    Object.assign({}, o, { strategy: 'none' }));
  var out = { scale: scale, cf: cf };
  runCache[key] = out;
  return out;
}

/* ── Evaluation ───────────────────────────────────────────────────── */

function evaluate(P, strategy, opts) {
  opts = opts || {};
  var o = { n: opts.n || 12000, np: opts.np || 5000, seed: opts.seed || 20260817 };
  var B = baseline(P, o);
  var cf = B.cf;
  var r = simulate(Object.assign({}, P, { hazardScale: B.scale }),
                   Object.assign({}, o, { strategy: strategy }));

  var v = P.arpu * P.margin;
  r.counterfactual = cf;
  r.savedMonths = r.subMonths - cf.subMonths;
  r.acqMonthsNet = r.acqMonths - cf.acqMonths;
  r.retentionValue = r.savedMonths * v / 1e6;      // $M
  r.acquisitionValue = r.acqMonthsNet * v / 1e6;   // $M
  r.spend = P.mktSpend;
  r.netContribution = r.retentionValue + r.acquisitionValue - P.mktSpend;

  /* Yardsticks a PM is actually held to in a review. */
  r.peakWeekViews = Math.max.apply(null, r.weeklyViews);
  r.chartWeeks = r.weeklyViews.filter(function (x) { return x >= 2.0e6; }).length;
  r.conversationWeeks = r.weeklyViews.filter(function (x) {
    return x >= 0.2 * r.peakWeekViews && x >= 0.4e6;
  }).length;
  r.totalViews = r.weeklyViews.reduce(function (x, y) { return x + y; }, 0);

  /* Where the churn saves actually landed, by the calendar day a
     subscriber's renewal falls on. This is the chart the whole model
     exists to draw: coverage, and the holes in it. */
  var save = [], i, pol, bas;
  for (i = 1; i < 60; i++) {
    pol = r.atRiskByDay[i] ? r.churnByDay[i] / r.atRiskByDay[i] : 0;
    bas = cf.atRiskByDay[i] ? cf.churnByDay[i] / cf.atRiskByDay[i] : 0;
    save.push({ day: i, save: bas > 0 ? (bas - pol) / bas : 0 });
  }
  r.saveByDay = save;
  r.peakSave = save.reduce(function (m, x) { return Math.max(m, x.save); }, 0);
  return r;
}

function evaluateAll(P, opts) {
  return STRATEGIES.map(function (s) { return evaluate(P, s.id, opts); });
}

function bestOf(P, opts) {
  var best = null;
  evaluateAll(P, opts).forEach(function (r) {
    if (!best || r.netContribution > best.netContribution) best = r;
  });
  return best;
}

/* Net contribution against gap length, for the split patterns. Coarser
   panel — this is a shape, not a headline number. */
function sweepGap(P, strategy, opts) {
  var out = [], g, o = { n: 7000, np: 3500, seed: (opts && opts.seed) || 20260817 };
  for (g = 1; g <= 9; g++) {
    var r = evaluate(Object.assign({}, P, { gapWeeks: g }), strategy, o);
    out.push({ gap: g, net: r.netContribution, ret: r.retentionValue,
               acq: r.acquisitionValue, chartWeeks: r.chartWeeks,
               peak: r.peakWeekViews, completion: r.completion });
  }
  return out;
}

/* Which assumptions could flip the recommendation, rather than merely
   move the number. A PM cares about the second question. */
var TORNADO = [
  { key: 'habitBonus',    label: 'The halo (mid-season app opens)',  delta: 0.60 },
  { key: 'buzzConvexity', label: 'Does concentration beat duration?', delta: 0.18 },
  { key: 'newJoinPenalty', label: 'First-month churn of new joiners', delta: 0.35 },
  { key: 'churnK',        label: 'Churn sensitivity to engagement',  delta: 0.35 },
  { key: 'stockHalfLife', label: 'How fast “recently watched” fades', delta: 0.35 },
  { key: 'returnBase',    label: 'Weekly return rate',               delta: 0.06, abs: true },
  { key: 'deferRate',     label: 'Tendency to wait and stack',       delta: 0.50 },
  { key: 'convScale',     label: 'Prospect conversion',              delta: 0.30 },
  { key: 'buzzWeight',    label: 'Word of mouth vs paid awareness',  delta: 0.35 },
  { key: 'baseChurn',     label: 'Baseline monthly churn',           delta: 0.30 },
  { key: 'viewIntensity', label: 'Appetite for the season',          delta: 0.25 },
  { key: 'spoilRate',     label: 'Spoiler attrition',                delta: 0.70 },
  { key: 'arpu',          label: 'ARPU',                             delta: 0.20 }
];

function tornado(P, strategy, opts) {
  var o = { n: 5000, np: 2500, seed: (opts && opts.seed) || 20260817 };
  var baseNet = evaluate(P, strategy, o).netContribution;
  var baseWinner = bestOf(P, o).strategy;

  return TORNADO.map(function (spec) {
    var lo = Object.assign({}, P), hi = Object.assign({}, P);
    if (spec.abs) { lo[spec.key] = P[spec.key] - spec.delta; hi[spec.key] = P[spec.key] + spec.delta; }
    else { lo[spec.key] = P[spec.key] * (1 - spec.delta); hi[spec.key] = P[spec.key] * (1 + spec.delta); }
    if (spec.key === 'returnBase') {
      lo.returnBase = Math.max(0.5, lo.returnBase);
      hi.returnBase = Math.min(0.995, hi.returnBase);
    }
    var rl = evaluate(lo, strategy, o).netContribution;
    var rh = evaluate(hi, strategy, o).netContribution;
    var wl = bestOf(lo, o).strategy, wh = bestOf(hi, o).strategy;
    return {
      key: spec.key, label: spec.label,
      low: rl - baseNet, high: rh - baseNet,
      swing: Math.abs(rh - rl),
      flips: wl !== baseWinner || wh !== baseWinner,
      flipTo: wl !== baseWinner ? wl : (wh !== baseWinner ? wh : null)
    };
  }).sort(function (x, y) { return y.swing - x.swing; });
}

var API = {
  ASSUMPTIONS: ASSUMPTIONS,
  STRATEGIES: STRATEGIES,
  TORNADO: TORNADO,
  schedule: schedule,
  evaluate: evaluate,
  evaluateAll: evaluateAll,
  bestOf: bestOf,
  sweepGap: sweepGap,
  tornado: tornado,
  _clearCaches: function () { cohortCache = {}; runCache = {}; scratch = { N: -1 }; }
};

if (typeof module !== 'undefined' && module.exports) module.exports = API;
global.OBXModel = API;

})(typeof window !== 'undefined' ? window : globalThis);
