/* Consolidated regression suite for the Degree Ledger.
   Rebuilt after the container restart took the originals. */
const { chromium } = require('playwright-core');
const CHROME = '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const U = 'http://localhost:8765/degree-ledger/';
const bad = [];
const ok = (c, m) => { console.log((c ? '  ok    ' : '  BUG   ') + m); if (!c) bad.push(m); };

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const p = await b.newPage({ viewport: { width: 1280, height: 1100 } });
  await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  p.on('console', m => { const t = m.text();
    if (m.type() === 'error' && !/fonts\.googleapis|ERR_/.test(t)) errs.push('CONSOLE: ' + t);
    if (/Warning|duplicate key|Each child/i.test(t)) errs.push('REACT: ' + t); });

  const seed = (prof) => p.evaluate((pr) => (localStorage.clear(),
    localStorage.setItem('berkeley-degree-ledger:v1', JSON.stringify({ profile: pr }))), prof);
  const boot = async (prof) => {
    await p.goto(U, { waitUntil: 'domcontentloaded' }); await p.waitForSelector('.bdl-tabs');
    await seed(prof || { majors: ['cogsci'], minors: ['dsminor'] });
    await p.goto(U, { waitUntil: 'domcontentloaded' }); await p.waitForSelector('.bdl-tabs'); await p.waitForTimeout(600);
  };
  const tab = (id) => p.locator(`.bdl-tab[data-tab="${id}"]`).click().then(() => p.waitForTimeout(400));
  const blocks = async () => (await p.locator('.bdl-bname').allTextContents()).map(s => s.trim());
  const tabs = async () => (await p.locator('.bdl-tab').allTextContents()).map(s => s.trim());
  const addCourse = async (code, grade) => {
    await tab('courses');
    await p.locator('input.bdl-in').first().fill(code);
    await p.locator('button:has-text("Add")').first().click();
    await p.waitForTimeout(350);
  };

  console.log('\n— every encoded program renders —');
  const ENC = [['cogsci','Cognitive Science'],['dsmajor','Data Science'],['csmajor','Computer Science'],
    ['statmajor','Statistics'],['econ','Economics'],['appmath','Applied Mathematics'],
    ['polsci','Political Science'],['polecon','Political Economy'],['neuro','Neuroscience'],
    ['psych','Psychology'],['physics','Physics'],['dsminor','Data Science minor'],['statminor','Statistics minor']];
  for (const [id, name] of ENC) {
    const isMinor = id.endsWith('minor');
    await boot(isMinor ? { majors: [], minors: [id] } : { majors: [id], minors: [] });
    await tab(id);
    const bs = await blocks();
    ok(bs.length >= 3, `${name}: ${bs.length} requirement blocks`);
  }

  console.log('\n— college routing: the major decides, not the default —');
  await boot({ majors: ['psych'], minors: [] });
  let t = await tabs();
  ok(t.some(x => /^Letters & Science/.test(x)), 'an L&S major gets the L&S college tab');
  ok(!t.some(x => /^Computing, Data Science/.test(x)), 'and not the CDSS one');
  await boot({ majors: ['dsmajor'], minors: [] });
  t = await tabs();
  ok(t.some(x => /^Computing, Data Science/.test(x)), 'a CDSS major gets the CDSS college tab');
  ok(!t.some(x => /^Letters & Science/.test(x)), 'and not the L&S one');

  console.log('\n— L&S major + CDSS major = both colleges —');
  await boot({ majors: ['psych', 'dsmajor'], minors: [], simultaneous: true });
  t = await tabs();
  ok(t.some(x => /^Letters & Science/.test(x)) && t.some(x => /^Computing, Data Science/.test(x)),
     'both college tabs appear for a cross-college pair');

  console.log('\n— L&S major + CDSS minor —');
  await boot({ majors: ['psych'], minors: ['dsminor'] });
  t = await tabs();
  ok(t.some(x => /^Psychology/.test(x)) && t.some(x => /Data Science minor/.test(x)),
     'both programs get their own tab');
  ok(t.filter(x => /requirements/.test(x)).length === 2,
     `an L&S major with a CDSS minor clears one college's rules (${t.filter(x=>/requirements/.test(x)).length} college tabs)`);

  console.log('\n— branching programs —');
  await boot({ majors: ['polsci'], minors: [] }); await tab('polsci');
  let specs = await p.locator('select').evaluateAll(els =>
    els.map(e => [...e.options].map(o => o.textContent.trim())).filter(v => v.includes('Political Theory')));
  ok(specs.length > 0 && specs[0].length === 5, `Political Science offers five subfields (${specs[0] ? specs[0].length : 0})`);
  await boot({ majors: ['appmath'], minors: [] }); await tab('appmath');
  let cl = await p.locator('select').evaluateAll(els =>
    els.map(e => e.options.length).filter(n => n === 19));
  ok(cl.length > 0, 'Applied Mathematics offers nineteen clusters');

  console.log('\n— either/or routes —');
  await boot({ majors: ['physics'], minors: [] }); await tab('physics');
  let bs = await blocks();
  ok(bs.filter(x => /^Physics series/.test(x)).length === 2, 'Physics shows both series routes');
  const tagged = await p.locator('.bdl-tag').allTextContents();
  ok(tagged.length >= 2 && tagged.every(x => /either/i.test(x)), `both are tagged either/or (${tagged.length})`);

  console.log('\n— URL is a real address —');
  await boot(); await tab('courses');
  ok(/#courses/.test(p.url()), `the tab is in the URL (${p.url().split('/').pop()})`);
  await p.goBack(); await p.waitForTimeout(400);
  ok(!/#courses/.test(p.url()), 'the back button leaves it');
  await p.goto(U + '#grad', { waitUntil: 'domcontentloaded' }); await p.waitForSelector('.bdl-tabs'); await p.waitForTimeout(600);
  ok(/Graduation check/i.test(await p.locator('.bdl-h2').first().innerText()), 'a pasted link opens that tab');

  console.log('\n— the newcomer front door —');
  await p.goto(U, { waitUntil: 'domcontentloaded' }); await p.waitForSelector('.bdl-tabs');
  await p.evaluate(() => localStorage.clear());
  await p.goto(U, { waitUntil: 'domcontentloaded' }); await p.waitForSelector('.bdl-tabs'); await p.waitForTimeout(600);
  const front = await p.locator('.bdl-cols > div').first().innerText();
  ok(/What are you graduating with/i.test(front), 'an empty ledger opens on the front door');
  const chosen = await p.locator('.bdl-card:has-text("Your major") select').first().inputValue();
  ok(chosen === '', "no one else's major is preselected");

  console.log('\n— static first paint —');
  const html = await (await fetch(U)).text();
  const shell = html.slice(0, html.indexOf('<script'));
  ok(/<h1>Degree <em>Ledger<\/em><\/h1>/.test(shell), 'the masthead is in the static HTML');
  ok(!/<link rel="stylesheet"(?![^>]*media="print")/.test(shell.split('<noscript>')[0]),
     'nothing render-blocking ahead of it');

  console.log('\n— mobile —');
  const m = await b.newPage({ viewport: { width: 390, height: 844 } });
  await m.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await m.goto(U, { waitUntil: 'domcontentloaded' }); await m.waitForSelector('.bdl-tabs'); await m.waitForTimeout(600);
  const over = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(over <= 0, `no horizontal scroll at 390px (overflow ${over}px)`);
  await m.close();

  console.log('\nJS ERRORS / REACT WARNINGS: ' + (errs.length ? '\n  ' + errs.join('\n  ') : 'none'));
  console.log(bad.length ? `\n${bad.length} PROBLEM(S)` : '\nall checks passed');
  await b.close();
  process.exit(bad.length ? 1 : 0);
})();
