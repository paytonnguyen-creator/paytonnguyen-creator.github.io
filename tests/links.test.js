/* Every internal link target and every image, across every page.
   Link targets are checked over HTTP rather than by navigating: a fragment on
   the page you are already on does not navigate, and a .pptx triggers a
   download, so both read as navigation failures while being perfectly fine. */
const { chromium } = require('playwright-core');
const CHROME = '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const BASE = 'http://localhost:8765/';
const PAGES = ['index.html','outer-banks-release-strategy.html','case-study.html',
               'ai-support-automation.html','pickleball-court-demand.html','degree-ledger/'];
const bad = []; const ok = (c, m) => { console.log((c?'  ok    ':'  BUG   ')+m); if(!c)bad.push(m); };

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const targets = new Map();   // url -> the pages that link to it
  const fragments = new Map(); // "page#id" -> linking pages

  for (const page of PAGES) {
    const p = await b.newPage({ viewport:{ width:1280, height:1000 } });
    const failed = [];
    p.on('response', r => { if (r.status()>=400 && !/fonts\.g|favicon/.test(r.url()))
      failed.push(r.status()+' '+r.url().replace(BASE,'')); });
    await p.goto(BASE+page, { waitUntil:'networkidle' });
    await p.waitForTimeout(1000);

    /* Bring every image into view before judging it: a loading="lazy" image
       below the fold has deliberately not fetched yet, and calling that broken
       would be wrong. Driven from Playwright rather than a loop inside
       evaluate(), because the home page's sticky scenes take over programmatic
       scrolling and snap it back mid-loop. */
    const shots = await p.locator('img').count();
    for (let i = 0; i < shots; i++) {
      await p.locator('img').nth(i).scrollIntoViewIfNeeded({ timeout: 5000 }).catch(()=>{});
      await p.waitForTimeout(120);
    }
    await p.waitForTimeout(1200);

    const data = await p.evaluate(() => ({
      links: [...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')),
      imgs: [...document.images].filter(i=>!i.classList.contains('fv-img'))
              .map(i=>({ src:i.getAttribute('src'), loaded:i.complete&&i.naturalWidth>0 })),
    }));
    const broken = data.imgs.filter(i=>!i.loaded).map(i=>i.src);
    ok(broken.length === 0, `${page}: ${data.imgs.length} images, none broken${broken.length?': '+broken.join(', '):''}`);
    ok(failed.length === 0, `${page}: every request succeeds${failed.length?': '+failed.join(', '):''}`);

    for (const h of data.links) {
      if (!h || /^(mailto:|tel:|https?:)/.test(h)) continue;
      if (h.startsWith('#')) { fragments.set(page+h, page); continue; }
      const [path, frag] = h.split('#');
      const url = new URL(path || page, BASE+page).toString();
      if (!targets.has(url)) targets.set(url, page);
      if (frag) fragments.set(path + '#' + frag, page);
    }
    await p.close();
  }

  console.log('\n— internal link targets —');
  const p = await b.newPage();
  /* fetch() has to run from the site's own origin — from about:blank every
     request is cross-origin and fails regardless of what the server returns. */
  await p.goto(BASE + 'index.html', { waitUntil:'domcontentloaded' });
  for (const [url, from] of targets) {
    const st = await p.evaluate(async u => {
      try { return (await fetch(u, { method:'GET' })).status; } catch (e) { return 'ERR'; }
    }, url);
    ok(st === 200, `${url.replace(BASE,'') || '/'} → ${st} (linked from ${from})`);
  }

  console.log('\n— fragment targets actually exist —');
  const docs = new Map();
  for (const [key, from] of fragments) {
    const [path, id] = key.split('#');
    const file = path || from;
    if (!docs.has(file)) {
      await p.goto(BASE+file, { waitUntil:'domcontentloaded' });
      docs.set(file, await p.evaluate(()=>[...document.querySelectorAll('[id]')].map(e=>e.id)));
    }
    ok(docs.get(file).includes(id), `${file}#${id} exists`);
  }

  console.log(bad.length?`\n${bad.length} PROBLEM(S)`:'\nevery link and image resolves');
  await b.close(); process.exit(bad.length?1:0);
})();
