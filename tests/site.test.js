const { chromium } = require('playwright-core');
const CHROME='/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const U='http://localhost:8765/index.html';
const bad=[]; const ok=(c,m)=>{console.log((c?'  ok    ':'  BUG   ')+m); if(!c)bad.push(m);};
(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const p = await b.newPage({ viewport:{width:1280,height:1000} });
  const errs=[]; p.on('pageerror',e=>errs.push('PAGEERROR: '+e.message));
  p.on('console',m=>{const t=m.text(); if(m.type()==='error'&&!/favicon|fonts|ERR_/.test(t))errs.push('CONSOLE: '+t);});
  await p.goto(U,{waitUntil:'networkidle'}); await p.waitForTimeout(500);

  console.log('\n— the résumé content is on the page —');
  const body = await p.locator('body').innerText();
  for (const s of ['RSM US LLP','AI Solutions @ Berkeley','Life360','Eightfold AI','Squarelink',
                   'Cal Club Tennis','DirectPath Financial','Irvine Valley College','Occidental College',
                   'M.E.M.O.','Great Park Tennis Academy','JavaScript'])
    ok(body.includes(s), `mentions ${s}`);
  ok(/Aug 2026 — May 2028/.test(body), 'Berkeley dates match the résumé');

  console.log('\n— nothing the résumé no longer claims —');
  ok(!/ACEing Autism/i.test(body), 'ACEing Autism (dropped from the résumé) is gone');

  console.log('\n— the timeline filters —');
  const vis = async () => (await p.locator('.tl-item:not([hidden])').count());
  ok(await vis() === 11, `all eleven rows show by default (${await vis()})`);
  const chipN = async (f) => (await p.locator(`.tl-chip[data-filter="${f}"] b`).innerText());
  console.log('    tallies: work', await chipN('work'), '| edu', await chipN('edu'), '| lead', await chipN('lead'));
  for (const [f,n] of [['work',3],['edu',3],['lead',5]]) {
    await p.locator(`.tl-chip[data-filter="${f}"]`).click(); await p.waitForTimeout(250);
    ok(await vis() === n, `"${f}" narrows to ${n} (${await vis()})`);
    ok(await p.locator(`.tl-chip[data-filter="${f}"]`).evaluate(e=>e.classList.contains('is-on')),
       `  and the ${f} chip reads as selected`);
  }
  await p.locator('.tl-chip[data-filter="all"]').click(); await p.waitForTimeout(250);
  ok(await vis() === 11, 'back to everything');

  console.log('\n— rows open and close —');
  const first = p.locator('.tl-item').first();
  ok((await first.locator('.tl-head').getAttribute('aria-expanded')) === 'false', 'starts closed');
  ok((await first.locator('.tl-body').evaluate(e=>e.getBoundingClientRect().height)) < 2, 'and is collapsed');
  await first.locator('.tl-head').click(); await p.waitForTimeout(450);
  ok((await first.locator('.tl-head').getAttribute('aria-expanded')) === 'true', 'opens on click');
  const h = await first.locator('.tl-body').evaluate(e=>e.getBoundingClientRect().height);
  ok(h > 30, `and has real height (${Math.round(h)}px)`);
  ok((await first.innerText()).includes('managed services'), 'revealing the detail');
  await first.locator('.tl-head').click(); await p.waitForTimeout(450);
  ok((await first.locator('.tl-body').evaluate(e=>e.getBoundingClientRect().height)) < 2, 'closes again');

  console.log('\n— filtering closes what it hides —');
  await first.locator('.tl-head').click(); await p.waitForTimeout(400);
  await p.locator('.tl-chip[data-filter="edu"]').click(); await p.waitForTimeout(400);
  await p.locator('.tl-chip[data-filter="all"]').click(); await p.waitForTimeout(400);
  ok((await first.locator('.tl-head').getAttribute('aria-expanded')) === 'false',
     'a row hidden while open comes back closed, not stuck');

  console.log('\n— keyboard —');
  /* :focus-visible only matches on a real keyboard move, so programmatic
     .focus() would read as "no ring" even when the ring is fine. */
  await p.evaluate(()=>document.querySelector('#background').scrollIntoView());
  await p.locator('.tl-chip[data-filter="all"]').evaluate(e=>e.focus());
  await p.keyboard.press('Tab');
  const kb = await p.evaluate(() => { const el=document.activeElement, cs=getComputedStyle(el);
    return { cls: el.className, vis: el.matches(':focus-visible'), ring: cs.outlineStyle+' '+cs.outlineWidth }; });
  ok(/tl-chip/.test(kb.cls), `Tab reaches the next chip (${kb.cls})`);
  ok(kb.vis && kb.ring !== 'none 0px', `and it shows a focus ring (${kb.ring})`);
  await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  ok(await vis() < 11, 'Enter activates the chip it landed on');
  await p.locator('.tl-chip[data-filter="all"]').click(); await p.waitForTimeout(250);

  console.log('\n— résumé link points at the new file —');
  const r = await p.locator('a[href="assets/resume.pdf"]').first().getAttribute('href');
  ok(!!r, 'résumé link present');
  const st = await p.evaluate(async () => (await fetch('assets/resume.pdf')).status);
  ok(st === 200, `résumé downloads (${st})`);

  console.log('\n— mobile —');
  const m = await b.newPage({ viewport:{width:390,height:844} });
  await m.goto(U,{waitUntil:'networkidle'}); await m.waitForTimeout(400);
  const over = await m.evaluate(()=>document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(over <= 0, `no horizontal scroll at 390px (overflow ${over}px)`);
  await m.locator('.tl-item').first().locator('.tl-head').click(); await m.waitForTimeout(400);
  const mo = await m.evaluate(()=>document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(mo <= 0, `still none with a row open (${mo}px)`);
  await m.close();

  console.log('\nJS ERRORS: ' + (errs.length?'\n  '+errs.join('\n  '):'none'));
  console.log(bad.length?`\n${bad.length} PROBLEM(S)`:'\nall checks passed');
  await b.close(); process.exit(bad.length?1:0);
})();
