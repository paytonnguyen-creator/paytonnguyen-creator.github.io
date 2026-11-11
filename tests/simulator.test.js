/* The Outer Banks simulator: does it run, and does it give the same answer twice? */
const { chromium } = require('playwright-core');
const CHROME='/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const U='http://localhost:8765/outer-banks-release-strategy.html';
const bad=[]; const ok=(c,m)=>{console.log((c?'  ok    ':'  BUG   ')+m); if(!c)bad.push(m);};
(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const p = await b.newPage({ viewport:{width:1280,height:1100} });
  const errs=[]; p.on('pageerror',e=>errs.push('PAGEERROR: '+e.message));
  p.on('console',m=>{const t=m.text(); if(m.type()==='error'&&!/fonts|favicon|ERR_/.test(t))errs.push('CONSOLE: '+t);});
  await p.goto(U,{waitUntil:'networkidle'}); await p.waitForTimeout(3500);

  console.log('\n— the model layer is actually loaded —');
  const api = await p.evaluate(() => typeof window.OBXModel);
  ok(api === 'object' || api === 'function', `window.OBXModel is present (${api})`);
  const shape = await p.evaluate(() => {
    const M = window.OBXModel; if (!M) return null;
    return { keys: Object.keys(M).slice(0,12),
             strategies: (M.STRATEGIES||[]).map(s=>s.id),
             assumptions: Object.keys(M.ASSUMPTIONS||{}).length };
  });
  console.log('    API:', JSON.stringify(shape));
  ok(shape && shape.strategies.length === 5, `five release patterns (${shape?shape.strategies.length:0})`);

  console.log('\n— determinism: same inputs, same answer —');
  const runTwice = await p.evaluate(() => {
    const M = window.OBXModel;
    const f = M.run || M.simulate || M.compare || M.evaluate;
    if (!f) return { err: 'no run function; keys=' + Object.keys(M).join(',') };
    try {
      const a = JSON.stringify(f.call(M, M.ASSUMPTIONS));
      const b = JSON.stringify(f.call(M, M.ASSUMPTIONS));
      return { same: a === b, len: a.length };
    } catch (e) { return { err: String(e) }; }
  });
  console.log('   ', JSON.stringify(runTwice).slice(0,300));
  if (runTwice.err) ok(false, 'could not call the model directly: ' + runTwice.err);
  else ok(runTwice.same, `two identical runs give identical output (${runTwice.len} chars)`);

  console.log('\n— the UI produces numbers —');
  const nums = await p.evaluate(() => (document.body.innerText.match(/\$[\d,.]+[MKB]?/g)||[]).slice(0,8));
  console.log('    money on page:', nums.join(' | '));
  ok(nums.length > 0, 'the page renders currency figures');
  const sliders = await p.locator('input[type=range]').count();
  ok(sliders >= 10, `assumption sliders present (${sliders})`);

  console.log('\n— moving a slider changes the result —');
  const before = await p.evaluate(()=>document.body.innerText);
  const s0 = p.locator('input[type=range]').first();
  const meta = await s0.evaluate(e=>({min:e.min,max:e.max,value:e.value}));
  /* Set the value and fire the events a real drag fires. Clicking at a point
     along the track is unreliable here — the control sits inside a sticky
     scene, so the box can move between measuring it and clicking it. */
  await s0.evaluate(e => {
    const span = Number(e.max) - Number(e.min);
    e.value = String(Number(e.min) + span * 0.9);
    e.dispatchEvent(new Event('input', { bubbles: true }));
    e.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await p.waitForTimeout(3000);
  const after = await p.evaluate(()=>document.body.innerText);
  const moved = await s0.evaluate(e=>e.value);
  ok(moved !== meta.value, `the control moved (${meta.value} -> ${moved})`);
  ok(before !== after, 'and the model re-solved on the new assumption');

  console.log('\n— and settles back —');
  const resetBtn = p.locator('button').filter({hasText:/reset|default/i}).first();
  if (await resetBtn.count()) {
    await resetBtn.click(); await p.waitForTimeout(3000);
    const back = await p.evaluate(()=>document.body.innerText);
    ok(back === before, 'reset returns the original figures');
  } else console.log('    (no reset control — skipped)');

  console.log('\nJS ERRORS: ' + (errs.length?'\n  '+errs.join('\n  '):'none'));
  console.log(bad.length?`\n${bad.length} PROBLEM(S)`:'\nall checks passed');
  await b.close(); process.exit(bad.length?1:0);
})();
