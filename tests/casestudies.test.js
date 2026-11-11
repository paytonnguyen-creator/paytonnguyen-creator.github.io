/* The four case study pages: that they load clean, that every figure is
   actually there, and that the figure viewer works by mouse and keyboard. */
const { chromium } = require('playwright-core');
const CHROME = '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const BASE = 'http://localhost:8765/';
const PAGES = [
  ['outer-banks-release-strategy.html', 0],
  ['case-study.html', 6],
  ['ai-support-automation.html', 8],
  ['pickleball-court-demand.html', 7],
];
const bad = []; const ok = (c, m) => { console.log((c?'  ok    ':'  BUG   ')+m); if(!c)bad.push(m); };
(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  for (const [page, charts] of PAGES) {
    console.log(`\n— ${page} —`);
    const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
    const errs = [], net = [];
    p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
    p.on('console', m => { const t = m.text();
      if (m.type()==='error' && !/fonts\.googleapis|favicon/.test(t)) errs.push('CONSOLE: '+t); });
    p.on('response', r => { if (r.status()>=400 && !/favicon|fonts\.g/.test(r.url())) net.push(r.status()+' '+r.url()); });
    await p.route('https://fonts.googleapis.com/**', r => r.fulfill({status:200,contentType:'text/css',body:''}));
    await p.goto(BASE+page, { waitUntil:'networkidle' });
    await p.waitForTimeout(1200);

    ok(errs.length === 0, `no script errors${errs.length?': '+errs.join('; '):''}`);
    ok(net.length === 0, `every asset loads${net.length?': '+net.join('; '):''}`);
    /* The viewer's own <img> is chrome, not page content: it is empty until a
       figure is opened, and decorative once it is, because the caption beside
       it carries the description. */
    const imgs = await p.evaluate(() => {
      const content = [...document.images].filter(i => !i.classList.contains('fv-img'));
      return {
        n: content.length,
        broken: content.filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.getAttribute('src')),
        noAlt: content.filter(i=>!i.alt).map(i=>i.getAttribute('src')),
      };
    });
    ok(imgs.broken.length === 0, `no broken images (${imgs.n} total)${imgs.broken.length?': '+imgs.broken.join(', '):''}`);
    ok(imgs.noAlt.length === 0, `every image describes itself${imgs.noAlt.length?': '+imgs.noAlt.join(', '):''}`);
    const over = await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    ok(over <= 0, `no horizontal scroll (${over}px)`);

    const n = await p.locator('.chart img').count();
    ok(n === charts, `${charts} expandable figures (${n})`);

    if (charts) {
      await p.locator('.chart img').first().click();
      await p.waitForTimeout(350);
      ok(await p.locator('.fv.is-open').count() === 1, 'clicking a figure opens the viewer');
      const shown = await p.locator('.fv-img').getAttribute('src');
      ok(!!shown && /\.svg$/.test(shown), `showing the figure itself (${(shown||'').split('/').pop()})`);
      ok((await p.locator('.fv-cap').innerText()).length > 20, 'with its description as a caption');
      const locked = await p.evaluate(()=>getComputedStyle(document.body).overflow);
      ok(locked === 'hidden', 'and the page behind it stops scrolling');
      await p.keyboard.press('Escape'); await p.waitForTimeout(300);
      ok(await p.locator('.fv.is-open').count() === 0, 'Escape closes it');
      ok(await p.evaluate(()=>getComputedStyle(document.body).overflow) !== 'hidden', 'and scrolling comes back');

      await p.locator('.chart img').first().focus();
      await p.keyboard.press('Enter'); await p.waitForTimeout(300);
      ok(await p.locator('.fv.is-open').count() === 1, 'a figure opens from the keyboard too');
      await p.locator('.fv-close').click(); await p.waitForTimeout(250);
      ok(await p.locator('.fv.is-open').count() === 0, 'and the close button works');
    }
    await p.close();
  }
  console.log(bad.length?`\n${bad.length} PROBLEM(S)`:'\nall checks passed');
  await b.close(); process.exit(bad.length?1:0);
})();
