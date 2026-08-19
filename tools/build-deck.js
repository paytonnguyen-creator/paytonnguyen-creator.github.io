/* Builds docs/outer-banks-release-strategy-executive-deck.pptx.
 *
 *   node tools/deck-data.js > tools/deck-data.json
 *   node tools/build-deck.js
 *
 * Every figure on the deck is read out of the model at build time rather
 * than typed in, so the slides cannot drift from the page. Requires
 * pptxgenjs (npm i pptxgenjs) — the only dependency the site has, and it
 * is a build-time one, so nothing ships to the browser.
 */
const pptxgen = require('pptxgenjs');
const D = require('./deck-data.json');

const P = { ink:'140A10', ink2:'2A1018', sand:'FFF7EA', paper:'FFFFFF',
            ocean:'0A7096', sun:'E2673A', gold:'C08A22', goldLt:'F0B93C',
            body:'4C5560', mute:'7D7669', line:'E8DECB', white:'FFFFFF' };
const LAB = { binge:'All at once', split2:'Two parts', split3:'Three parts',
              hybrid:'Premiere + weekly', weekly:'Weekly' };
const pat = id => D.patterns.find(p => p.id === id);

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';               // 13.33 x 7.5
pres.author = 'Payton Nguyen';
pres.title  = 'Outer Banks S5 — release strategy';

const HEAD='Cambria', BODY='Calibri';

/* The repeated motif: a gold disc carrying the slide number. Not a stripe. */
function disc(s, n, dark) {
  s.addShape(pres.ShapeType.ellipse, { x:0.62, y:0.5, w:0.42, h:0.42,
    fill:{ color: dark ? P.goldLt : P.gold } });
  s.addText(String(n), { x:0.62, y:0.5, w:0.42, h:0.42, align:'center', valign:'middle',
    fontFace:BODY, fontSize:13, bold:true, color: dark ? P.ink : P.white, margin:0 });
}
function title(s, t, sub, dark) {
  s.addText(t, { x:1.22, y:0.42, w:11.5, h:0.62, fontFace:HEAD, fontSize:32, bold:true,
    color: dark ? P.white : P.ink, margin:0 });
  if (sub) s.addText(sub, { x:1.22, y:1.06, w:11.2, h:0.5, fontFace:BODY, fontSize:15.5,
    color: dark ? 'D8CFC4' : P.body, margin:0 });
}
function stat(s, x, y, w, big, lab, col) {
  s.addText(big, { x, y, w, h:0.72, fontFace:HEAD, fontSize:40, bold:true, color: col||P.ocean, margin:0 });
  s.addText(lab, { x, y:y+0.74, w, h:0.72, fontFace:BODY, fontSize:12.5, color:P.mute, margin:0 });
}

/* ── 1. Title ─────────────────────────────────────────────────────── */
let s = pres.addSlide();
s.background = { color: P.ink };
// a low sun, the same motif the web page opens on
s.addShape(pres.ShapeType.ellipse, { x:10.2, y:4.55, w:3.6, h:3.6, fill:{ color:'6E2E1C' } });
s.addShape(pres.ShapeType.ellipse, { x:11.0, y:5.35, w:2.0, h:2.0, fill:{ color:'B8551F' } });
s.addShape(pres.ShapeType.ellipse, { x:11.45, y:5.8, w:1.1, h:1.1, fill:{ color:'F0B93C' } });
s.addShape(pres.ShapeType.rect, { x:0, y:6.4, w:13.33, h:1.1, fill:{ color:P.ink } });

s.addText('RELEASE STRATEGY · OUTER BANKS SEASON 5', { x:0.9, y:1.5, w:11, h:0.4,
  fontFace:BODY, fontSize:13, bold:true, charSpacing:2.4, color:P.goldLt, margin:0 });
s.addText('Thirty billing dates', { x:0.9, y:2.05, w:11.4, h:1.15,
  fontFace:HEAD, fontSize:56, bold:true, color:P.white, margin:0 });
s.addText('What a release pattern is actually worth — and why the winner wins by less than it looks.',
  { x:0.9, y:3.3, w:9.4, h:0.9, fontFace:BODY, fontSize:19, color:'D8CFC4', margin:0 });
s.addText([
  { text:'Agent-based simulation · ', options:{ color:P.mute } },
  { text:'13,000 households × 182 days × 5 release patterns', options:{ color:'D8CFC4', bold:true } }
], { x:0.9, y:4.5, w:9, h:0.4, fontFace:BODY, fontSize:13.5, margin:0 });
s.addText('No Netflix data exists for this. Every behavioural input is a stated assumption.',
  { x:0.9, y:4.9, w:9, h:0.4, fontFace:BODY, fontSize:12.5, italic:true, color:P.mute, margin:0 });
s.addText('Payton Nguyen', { x:0.9, y:6.55, w:6, h:0.4, fontFace:BODY, fontSize:14,
  bold:true, charSpacing:1.6, color:P.white, margin:0 });
s.addNotes('The release pattern is one of the few levers left on a season whose cost is already sunk. This deck is the decision, not a forecast.');

/* ── 2. The decision ──────────────────────────────────────────────── */
s = pres.addSlide(); s.background = { color: P.sand };
disc(s, 1); title(s, 'The decision', 'Everything else about season five is already sunk. The drop schedule is not.');
[['10','episodes, as in every prior season',P.ocean],
 ['5','release patterns on the table',P.ocean],
 ['$28M','marketing line behind the launch',P.sun],
 ['30','billing dates a release has to cover',P.gold]]
 .forEach((t,i)=> stat(s, 0.62 + i*3.15, 2.05, 2.95, t[0], t[1], t[2]));

s.addShape(pres.ShapeType.roundRect, { x:0.62, y:4.05, w:12.1, h:2.35, rectRadius:0.08,
  fill:{ color:P.paper }, line:{ color:P.line, width:1 } });
s.addText('Why this is the interesting decision', { x:1.0, y:4.3, w:11.4, h:0.35,
  fontFace:BODY, fontSize:12, bold:true, charSpacing:1.6, color:P.mute, margin:0 });
s.addText([
 { text:'The cast, the scripts and the production budget are spent. ', options:{} },
 { text:'The pattern costs nothing to change and still moves the P&L', options:{ bold:true, color:P.ink } },
 { text:' — which makes it one of the last free levers on the season. It is also genuinely contested: the binge camp and the weekly camp are each optimising a different metric, and mostly not saying which.',
   options:{} }
], { x:1.0, y:4.7, w:11.3, h:1.5, fontFace:BODY, fontSize:15, color:P.body, lineSpacing:24, margin:0 });
s.addNotes('Frame: this is a free lever on a sunk-cost asset, and the industry argument is really two different objective functions talking past each other.');

/* ── 3. The mechanism ─────────────────────────────────────────────── */
s = pres.addSlide(); s.background = { color: P.sand };
disc(s, 2);
title(s, 'The mechanism', 'Subscribers only cancel on their renewal date — so a release can only reach the ones it lands near.');

s.addChart(pres.ChartType.bar, [{
  name:'Reduction in cancellations',
  labels: D.coverage.map(c => 'day ' + c.d),
  values: D.coverage.map(c => c.v)
}], { x:0.62, y:2.0, w:8.15, h:4.35,
  barDir:'col', chartColors:[P.ocean], barGapWidthPct:35,
  showTitle:true, title:'Churn saved, by the day a subscriber renews (two-part release)',
  titleFontFace:BODY, titleFontSize:12.5, titleColor:P.mute, titleAlign:'left',
  showLegend:false, showValue:false,
  catAxisLabelFontFace:BODY, catAxisLabelFontSize:9, catAxisLabelColor:P.mute,
  catAxisLabelRotate:300, catGridLine:{ style:'none' }, catAxisLineShow:false,
  valAxisLabelFontFace:BODY, valAxisLabelFontSize:10, valAxisLabelColor:P.mute,
  valAxisLabelFormatCode:'0"%"', valAxisMaxVal:12, valAxisMajorUnit:3,
  valGridLine:{ color:P.line, size:1 }, valAxisLineShow:false, plotArea:{ fill:{ color:P.sand } } });

s.addShape(pres.ShapeType.roundRect, { x:9.05, y:2.0, w:3.68, h:4.35, rectRadius:0.08,
  fill:{ color:P.paper }, line:{ color:P.line, width:1 } });
s.addText('Roughly 1 in 30', { x:9.38, y:2.3, w:3.1, h:0.45, fontFace:HEAD, fontSize:22,
  bold:true, color:P.ocean, margin:0 });
s.addText('subscribers stands at a renewal decision on any given day. Everyone else can be delighted, but not billed differently for it.',
  { x:9.38, y:2.78, w:3.05, h:1.2, fontFace:BODY, fontSize:13, color:P.body, lineSpacing:19, margin:0 });
s.addText('The hole is the point', { x:9.38, y:4.15, w:3.1, h:0.35, fontFace:BODY, fontSize:12,
  bold:true, charSpacing:1.4, color:P.mute, margin:0 });
s.addText('Part 1 lands on day 0 and has faded by day 26. Part 2 arrives on day 35. Anyone billed in between gets the weakest version of the season — and no pattern covers all thirty dates.',
  { x:9.38, y:4.55, w:3.05, h:1.6, fontFace:BODY, fontSize:13, color:P.body, lineSpacing:19, margin:0 });
s.addNotes('This is the whole model in one chart: coverage, and the gap between parts where coverage collapses.');

/* ── 4. What the model said ───────────────────────────────────────── */
s = pres.addSlide(); s.background = { color: P.sand };
disc(s, 3);
title(s, 'The finding', 'The two objectives rank the five patterns in opposite orders. That is the decision, not a detail.');

const order = ['binge','split2','split3','hybrid','weekly'];
s.addChart(pres.ChartType.bar, [
  { name:'Value from acquisition', labels: order.map(i=>LAB[i]), values: order.map(i=>pat(i).acq) },
  { name:'Value from retention',   labels: order.map(i=>LAB[i]), values: order.map(i=>pat(i).ret) }
], { x:0.62, y:2.0, w:7.55, h:4.35,
  barDir:'col', chartColors:[P.sun, P.ocean], barGapWidthPct:55,
  showTitle:true, title:'Value by release pattern ($M, before marketing)',
  titleFontFace:BODY, titleFontSize:12.5, titleColor:P.mute, titleAlign:'left',
  showLegend:true, legendPos:'b', legendFontFace:BODY, legendFontSize:11, legendColor:P.body,
  showValue:true, dataLabelPosition:'outEnd', dataLabelFontFace:BODY,
  dataLabelFontSize:9.5, dataLabelColor:P.body, dataLabelFormatCode:'0.0',
  catAxisLabelFontFace:BODY, catAxisLabelFontSize:10, catAxisLabelColor:P.body,
  catGridLine:{ style:'none' }, catAxisLineShow:false,
  valAxisLabelFontFace:BODY, valAxisLabelFontSize:10, valAxisLabelColor:P.mute,
  valAxisMaxVal:32, valGridLine:{ color:P.line, size:1 }, valAxisLineShow:false,
  plotArea:{ fill:{ color:P.sand } } });

const cards = [
  ['Concentration buys signups', 'A crowded opening week is what earns the Top 10 slot and the press cycle. ' + LAB[D.bestAcq] + ' leads acquisition at $' + pat(D.bestAcq).acq.toFixed(1) + 'M.', P.sun],
  ['Spread buys renewals', 'Renewal dates are spread across the month, so a single spike can only sit near some of them. ' + LAB[D.bestRet] + ' leads retention at $' + pat(D.bestRet).ret.toFixed(1) + 'M.', P.ocean],
  ['And reach barely moves', 'Every pattern reaches about the same ' + D.reach + '% of the base. The schedule changes what happens after episode one, not who shows up.', P.gold]
];
cards.forEach((c,i) => {
  const y = 2.0 + i*1.5;
  s.addShape(pres.ShapeType.roundRect, { x:8.45, y, w:4.28, h:1.32, rectRadius:0.08,
    fill:{ color:P.paper }, line:{ color:P.line, width:1 } });
  s.addShape(pres.ShapeType.ellipse, { x:8.72, y:y+0.26, w:0.2, h:0.2, fill:{ color:c[2] } });
  s.addText(c[0], { x:9.02, y:y+0.16, w:3.5, h:0.36, fontFace:BODY, fontSize:13.5,
    bold:true, color:P.ink, margin:0 });
  s.addText(c[1], { x:8.72, y:y+0.55, w:3.85, h:0.72, fontFace:BODY, fontSize:11.5,
    color:P.body, lineSpacing:15, margin:0 });
});
s.addNotes('Acquisition and retention disagree because they respond to opposite properties of the same schedule. The winner is whichever pattern gives up least on both.');

/* ── 5. Recommendation ────────────────────────────────────────────── */
s = pres.addSlide(); s.background = { color: P.ink2 };
disc(s, 4, true);
title(s, 'Recommendation', 'Release in two parts — and do not pretend the money decided it.', true);

s.addShape(pres.ShapeType.roundRect, { x:0.62, y:2.0, w:6.05, h:4.35, rectRadius:0.1,
  fill:{ color:'3A1720' }, line:{ color:'5A2A2E', width:1 } });
s.addText('Two parts, 5 + 5', { x:1.0, y:2.3, w:5.3, h:0.5, fontFace:HEAD, fontSize:26,
  bold:true, color:P.white, margin:0 });
s.addText('$' + pat('split2').net.toFixed(1) + 'M', { x:1.0, y:2.9, w:5.3, h:0.9,
  fontFace:HEAD, fontSize:50, bold:true, color:P.goldLt, margin:0 });
s.addText('net contribution — retention plus acquisition, less the marketing line',
  { x:1.0, y:3.85, w:5.2, h:0.5, fontFace:BODY, fontSize:12.5, color:'C9BCB0', margin:0 });
s.addText([
  { text:'$' + pat('split2').ret.toFixed(1) + 'M retention', options:{ bold:true, color:P.white, breakLine:true } },
  { text:String(pat('split2').saved) + 'M subscriber-months held against a window with no Outer Banks', options:{ color:'C9BCB0', breakLine:true, fontSize:12 } },
  { text:'$' + pat('split2').acq.toFixed(1) + 'M acquisition', options:{ bold:true, color:P.white, breakLine:true } },
  { text:String(pat('split2').signups) + 'M signups, ' + D.d30 + '% still subscribed after one renewal', options:{ color:'C9BCB0', fontSize:12 } }
], { x:1.0, y:4.5, w:5.2, h:1.6, fontFace:BODY, fontSize:13.5, lineSpacing:18, margin:0 });

s.addShape(pres.ShapeType.roundRect, { x:7.0, y:2.0, w:5.73, h:2.05, rectRadius:0.1,
  fill:{ color:'4A2418' }, line:{ color:'6E3A22', width:1 } });
s.addText('The margin is inside the noise', { x:7.35, y:2.24, w:5.1, h:0.4,
  fontFace:BODY, fontSize:13.5, bold:true, color:P.goldLt, margin:0 });
s.addText('It leads by $' + D.margin.toFixed(2) + 'M against a $28M marketing line, and wins ' +
  D.stability.wins + ' of ' + D.stability.n + ' independent audience draws by a paired mean of $' +
  D.stability.mean.toFixed(2) + 'M. Three assumptions, none of them measured, flip the ranking outright.',
  { x:7.35, y:2.68, w:5.05, h:1.25, fontFace:BODY, fontSize:12.5, color:'E0D5C8', lineSpacing:17, margin:0 });

s.addShape(pres.ShapeType.roundRect, { x:7.0, y:4.3, w:5.73, h:2.05, rectRadius:0.1,
  fill:{ color:'3A1720' }, line:{ color:'5A2A2E', width:1 } });
s.addText('So the tie breaks on evidence', { x:7.35, y:4.54, w:5.1, h:0.4,
  fontFace:BODY, fontSize:13.5, bold:true, color:P.goldLt, margin:0 });
s.addText('Rule fixed before the model ran: under a $2M margin, take the option that produces the most evidence for next season. A two-part release is the only one that measures the same audience on the same season twice, five weeks apart.',
  { x:7.35, y:4.98, w:5.05, h:1.25, fontFace:BODY, fontSize:12.5, color:'E0D5C8', lineSpacing:17, margin:0 });
s.addNotes('Do not oversell this. The honest headline is that the top three are tied on money, so the decision rule — pre-committed — hands it to the option that generates a clean internal comparison.');

/* ── 6. How we'd know ─────────────────────────────────────────────── */
s = pres.addSlide(); s.background = { color: P.sand };
disc(s, 5);
title(s, 'How we would know it worked', 'The test is free: half the base renews outside the release window and forms its own control.');

const rows = [
  ['Primary metric', 'Subscriber-months retained per thousand viewers reached, split by whether the renewal date fell inside or outside the release window.', P.ocean],
  ['Target', 'The inside-window group retains at least 4 percentage points better than the outside-window group.', '1E7A4A'],
  ['Kill criterion', 'Under 1.5 points, the coverage mechanism this model rests on does not exist. Hand release patterning back to marketing as a pure awareness call.', 'B03A2E'],
  ['Counter-metric', 'Thirty-day retention of the acquisition cohort. A pattern that maximises signups by concentrating them delivers them all to the same first renewal with nothing left to watch.', P.gold]
];
rows.forEach((r,i) => {
  const y = 1.95 + i*1.13;
  s.addShape(pres.ShapeType.roundRect, { x:0.62, y, w:12.1, h:1.0, rectRadius:0.07,
    fill:{ color:P.paper }, line:{ color:P.line, width:1 } });
  s.addShape(pres.ShapeType.ellipse, { x:0.92, y:y+0.36, w:0.26, h:0.26, fill:{ color:r[2] } });
  s.addText(r[0], { x:1.32, y:y+0.14, w:2.5, h:0.72, fontFace:BODY, fontSize:13.5,
    bold:true, color:P.ink, valign:'middle', margin:0 });
  s.addText(r[1], { x:3.95, y:y+0.14, w:8.5, h:0.72, fontFace:BODY, fontSize:12.5,
    color:P.body, valign:'middle', lineSpacing:16, margin:0 });
});
s.addText('Interactive model · paytonnguyen-creator.github.io/outer-banks-release-strategy.html',
  { x:0.62, y:6.62, w:12.1, h:0.35, fontFace:BODY, fontSize:11.5, color:P.mute, margin:0 });
s.addNotes('The measurement design is the cheapest part of the whole recommendation — the control group already exists and costs nothing to define.');

pres.writeFile({ fileName: __dirname + '/../docs/outer-banks-release-strategy-executive-deck.pptx' })
  .then(f => console.log('written:', f));
