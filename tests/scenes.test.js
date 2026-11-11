/* The scroll-driven sections of the redesigned home page: the project scene,
   the process scene, and the reveal animations. The failure that matters most
   here is content that never becomes visible — a scroll-driven design that
   leaves opacity at 0 hides the page from anyone the observer misses. */
const { chromium } = require('playwright-core');
const CHROME = '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const U = 'http://localhost:8765/index.html';
const bad = []; const ok = (c, m) => { console.log((c?'  ok    ':'  BUG   ')+m); if(!c)bad.push(m); };

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });

  const visit = async (opts = {}) => {
    const p = await b.newPage({ viewport: opts.viewport || { width:1280, height:1000 },
                                reducedMotion: opts.reducedMotion });
    const errs = [];
    p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
    p.on('console', m => { const t = m.text();
      if (m.type()==='error' && !/fonts|favicon|ERR_/.test(t)) errs.push('CONSOLE: '+t); });
    await p.goto(U, { waitUntil:'networkidle' }); await p.waitForTimeout(900);
    return { p, errs };
  };

  console.log('\n— the project scene —');
  let { p, errs } = await visit();
  const tabs = await p.locator('[data-project-tabs] .project-tab').count();
  const panels = await p.locator('.project-panel').count();
  ok(tabs === 5 && panels === 5, `five tabs and five panels (${tabs}/${panels})`);
  ok(await p.locator('.project-panel.is-active').count() === 1, 'exactly one panel active at a time');
  ok((await p.locator('[data-project-total]').innerText()).trim() === '05', 'the counter knows the total');

  await p.locator('[data-project-tabs] .project-tab').nth(2).click();
  await p.waitForTimeout(700);
  ok(await p.locator('#project-panel-2').evaluate(e=>e.classList.contains('is-active')),
     'clicking a tab activates its panel');
  ok(await p.locator('.project-panel.is-active').count() === 1, 'and deactivates the others');
  ok((await p.locator('[data-project-current]').innerText()).trim() === '03', 'the counter follows');
  const sel = await p.locator('[data-project-tabs] .project-tab[aria-selected="true"]').count();
  ok(sel === 1, `exactly one tab marked selected (${sel})`);

  await p.locator('.project-next').click(); await p.waitForTimeout(700);
  ok((await p.locator('[data-project-current]').innerText()).trim() === '04', 'next advances it');
  await p.locator('.project-prev').click(); await p.waitForTimeout(700);
  ok((await p.locator('[data-project-current]').innerText()).trim() === '03', 'prev goes back');

  console.log('\n— every project panel has its content —');
  const panelInfo = await p.evaluate(() => [...document.querySelectorAll('.project-panel')].map(el => ({
    id: el.id, chars: el.innerText.trim().length,
    links: [...el.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')),
  })));
  for (const pi of panelInfo) ok(pi.chars > 120, `${pi.id} has real copy (${pi.chars} chars)`);
  const hrefs = [...new Set(panelInfo.flatMap(x=>x.links))];
  console.log('    panel links:', hrefs.join(', '));

  console.log('\n— the process scene —');
  const steps = await p.locator('[data-step-index]').count();
  ok(steps >= 4, `four process steps (${steps} step-indexed elements)`);
  ok(/0\d/.test(await p.locator('[data-process-current]').innerText()), 'the step counter renders');

  console.log('\n— nothing is left invisible —');
  const hidden = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll('[data-reveal]').forEach(el => {
      const cs = getComputedStyle(el);
      if (parseFloat(cs.opacity) < 0.05 && el.getBoundingClientRect().height > 0)
        out.push((el.className||el.tagName) + ' @opacity ' + cs.opacity);
    });
    return out;
  });
  /* Visit each block deliberately rather than jumping the page in fixed
     increments: the sticky scenes make the scrollable height far longer than
     body.scrollHeight, so an increment loop ends before the last sections and
     reports blocks as hidden that a reader would have seen. */
  const revealCount = await p.locator('[data-reveal]').count();
  for (let i = 0; i < revealCount; i++) {
    await p.evaluate(n => document.querySelectorAll('[data-reveal]')[n]
      .scrollIntoView({ block: 'center' }), i);
    await p.waitForTimeout(500);
  }
  await p.waitForTimeout(700);
  const stillHidden = await p.evaluate(() => [...document.querySelectorAll('[data-reveal]')]
    .filter(el => parseFloat(getComputedStyle(el).opacity) < 0.05)
    .map(el => el.className || el.tagName));
  ok(stillHidden.length === 0,
     `every revealed block is visible after a read-through${stillHidden.length?': '+stillHidden.join(', '):''}`);
  ok(errs.length === 0, `no script errors${errs.length?': '+errs.join('; '):''}`);
  await p.close();

  console.log('\n— reduced motion still shows everything —');
  ({ p, errs } = await visit({ reducedMotion: 'reduce' }));
  const rmHidden = await p.evaluate(() => [...document.querySelectorAll('[data-reveal]')]
    .filter(el => parseFloat(getComputedStyle(el).opacity) < 0.05).length);
  ok(rmHidden === 0, `nothing hidden under prefers-reduced-motion (${rmHidden} hidden)`);
  ok(await p.locator('.project-panel.is-active').count() === 1, 'the project scene still works');
  ok(errs.length === 0, `no script errors${errs.length?': '+errs.join('; '):''}`);
  await p.close();

  console.log('\n— mobile —');
  ({ p, errs } = await visit({ viewport:{ width:390, height:844 } }));
  const over = await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  ok(over <= 0, `no horizontal scroll at 390px (${over}px)`);
  await p.locator('[data-project-tabs] .project-tab').nth(1).click(); await p.waitForTimeout(700);
  ok(await p.locator('#project-panel-1').evaluate(e=>e.classList.contains('is-active')),
     'the project scene is usable on a phone');
  const over2 = await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  ok(over2 <= 0, `still no overflow after switching panels (${over2}px)`);
  ok(errs.length === 0, `no script errors${errs.length?': '+errs.join('; '):''}`);
  await p.close();

  console.log(bad.length?`\n${bad.length} PROBLEM(S)`:'\nall checks passed');
  await b.close(); process.exit(bad.length?1:0);
})();
