/* Outer Banks S5 simulator — worker thread.

   A full recompute is five policy runs plus a counterfactual, and the
   sensitivity pass is a hundred more. On the main thread that freezes the
   page mid-drag, so all of it happens here and the UI only ever handles
   finished numbers. obx-app.js falls back to running the same model
   synchronously if a worker cannot be constructed (opening the page over
   file:// being the usual reason). */

importScripts('obx-model.js');

var M = self.OBXModel;

/* Charts need a fraction of what evaluate() returns. Everything else —
   the daily series, the raw churn accumulators, the entire counterfactual
   result object — would be cloned across the thread boundary for nothing. */
function slim(r) {
  return {
    strategy: r.strategy, schedule: r.schedule,
    netContribution: r.netContribution,
    retentionValue: r.retentionValue,
    acquisitionValue: r.acquisitionValue,
    spend: r.spend,
    savedMonths: r.savedMonths, acqMonthsNet: r.acqMonthsNet,
    signups: r.signups, d30Retention: r.d30Retention,
    reach: r.reach, completion: r.completion, epCurve: r.epCurve,
    weeklyViews: r.weeklyViews, saveByDay: r.saveByDay, peakSave: r.peakSave,
    peakWeekViews: r.peakWeekViews, chartWeeks: r.chartWeeks,
    conversationWeeks: r.conversationWeeks, totalViews: r.totalViews
  };
}

var SEEDS = [20260817, 7, 31337, 99, 424242, 5150, 12345, 777];

/* Every panel that produces dollar figures the reader will compare must be
   the same size. A 7,000-household panel and a 9,000-household one draw
   different audiences and land several million apart at identical settings
   — which is real sampling variation, not a bug, but putting two of them
   on the same screen invites a comparison that means nothing. */
var PANEL = { n: 9000, np: 4000 };

self.onmessage = function (e) {
  var msg = e.data, P = msg.P, out = { id: msg.id, kind: msg.kind };

  if (msg.kind === 'main') {
    out.results = M.evaluateAll(P, PANEL).map(slim);
    /* One extra run at three-quarters of the marketing budget, so the memo
       can quote what the LAST dollar of spend returns rather than the
       average across the whole line. Changing mktSpend does not change the
       counterfactual, so this costs a single simulation. */
    var lowP = Object.assign({}, P, { mktSpend: P.mktSpend * 0.75 });
    out.marginal = {
      spendLow: lowP.mktSpend,
      netLow: M.evaluate(lowP, msg.strategy, PANEL).netContribution
    };

  } else if (msg.kind === 'sweep') {
    /* The gap only exists for the split patterns; sweeping it for a weekly
       release would be sweeping a parameter that is not in the schedule. */
    var split = msg.strategy === 'split3' ? 'split3' : 'split2';
    out.sweepFor = split;
    out.sweep = M.sweepGap(P, split, PANEL);

  } else if (msg.kind === 'tornado') {
    out.tornado = M.tornado(P, msg.strategy);

  } else if (msg.kind === 'stability') {
    /* Same cohort size, eight different draws of the population. Reports
       the paired difference between each pattern and the best one, which
       is the only honest way to read a gap this narrow. */
    var ids = M.STRATEGIES.map(function (s) { return s.id; });
    var rows = SEEDS.map(function (seed) {
      var o = { n: PANEL.n, np: PANEL.np, seed: seed };
      var vals = {};
      ids.forEach(function (id) { vals[id] = M.evaluate(P, id, o).netContribution; });
      return vals;
    });
    out.stability = { seeds: SEEDS, ids: ids, rows: rows };
  }

  self.postMessage(out);
};
