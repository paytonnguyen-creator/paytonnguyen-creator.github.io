/* Dumps every number the executive deck quotes, straight out of the model.
 * Run from the repo root:  node tools/deck-data.js > tools/deck-data.json
 */
const M = require(__dirname + '/../assets/obx-model.js');
const P = Object.assign({}, M.ASSUMPTIONS);
const PANEL = { n: 9000, np: 4000 };
const f = (x,d=1)=>Number(x).toFixed(d);
const all = M.evaluateAll(P, PANEL);
const by = id => all.find(r=>r.strategy===id);
const sorted = all.slice().sort((a,b)=>b.netContribution-a.netContribution);

const out = {
  patterns: all.map(r=>({id:r.strategy, net:+f(r.netContribution), ret:+f(r.retentionValue),
    acq:+f(r.acquisitionValue), compl:Math.round(r.completion*100), chartWk:r.chartWeeks,
    convWk:r.conversationWeeks, peak:+f(r.peakWeekViews/1e6), signups:+f(r.signups/1e6,2),
    saved:+f(r.savedMonths/1e6,2)})),
  winner: sorted[0].strategy, margin:+f(sorted[0].netContribution-sorted[1].netContribution,2),
  bestRet: all.slice().sort((a,b)=>b.retentionValue-a.retentionValue)[0].strategy,
  bestAcq: all.slice().sort((a,b)=>b.acquisitionValue-a.acquisitionValue)[0].strategy,
  reach: +f(by('split2').reach*100), peakSave: +f(by('split2').peakSave*100),
  d30: +f(by('split2').d30Retention*100),
  coverage: by('split2').saveByDay.filter(p=>p.day%3===1).map(p=>({d:p.day, v:+f(p.save*100,1)})),
  schedule: by('split2').schedule
};
// gap sweep
out.gap = M.sweepGap(P,'split2',PANEL).map(s=>({g:s.gap, net:+f(s.net)}));
// stability
const seeds=[20260817,7,31337,99,424242,5150,12345,777];
const ids=M.STRATEGIES.map(s=>s.id);
const rows=seeds.map(seed=>{const o={n:9000,np:4000,seed};const v={};ids.forEach(i=>v[i]=M.evaluate(P,i,o).netContribution);return v;});
const diffs=rows.map(r=>r.split2-r.binge);
out.stability={wins:diffs.filter(d=>d>0).length, n:diffs.length, mean:+f(diffs.reduce((a,b)=>a+b,0)/diffs.length,2)};
console.log(JSON.stringify(out,null,1));
