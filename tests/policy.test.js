/* The 2026–27 college policy encoded from the official L&S and CDSS pages:
   overlap ceilings, CDSS Essential Skills and what certification does not cover. */
const { chromium } = require('playwright-core');
const CHROME = '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const U = 'http://localhost:8765/degree-ledger/';
const bad = []; const ok = (c, m) => { console.log((c?'  ok    ':'  BUG   ')+m); if(!c)bad.push(m); };
(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const p = await b.newPage({ viewport: { width: 1280, height: 1200 } });
  await p.route('https://fonts.googleapis.com/**', r => r.fulfill({status:200,contentType:'text/css',body:''}));
  const errs=[]; p.on('pageerror',e=>errs.push('PAGEERROR: '+e.message));
  p.on('console',m=>{const t=m.text(); if(m.type()==='error'&&!/fonts|ERR_/.test(t))errs.push('CONSOLE: '+t);
    if(/Warning|duplicate key/i.test(t))errs.push('REACT: '+t);});
  const C = (code) => ({ id:'c'+code, code, title:code, units:4, grade:'A', term:'F26', source:'berkeley' });
  const boot = async (prof, courses=[]) => {
    await p.goto(U,{waitUntil:'domcontentloaded'}); await p.waitForSelector('.bdl-tabs');
    await p.evaluate(([pr,cs])=>(localStorage.clear(),localStorage.setItem('berkeley-degree-ledger:v1',
      JSON.stringify({profile:pr,courses:cs}))),[prof,courses]);
    await p.goto(U,{waitUntil:'domcontentloaded'}); await p.waitForSelector('.bdl-tabs'); await p.waitForTimeout(700);
  };
  const tab = (id) => p.locator(`.bdl-tab[data-tab="${id}"]`).click().then(()=>p.waitForTimeout(450));
  const text = () => p.locator('.bdl-cols > div').first().innerText();

  console.log('\n— L&S double major: two upper-division courses, in total —');
  /* No two encoded L&S majors share an upper-division course yet, so the
     double-major branch is reached through a loaded program — which is how a
     real student with an unencoded second major would reach it anyway. */
  const CUSTOM = { id:'cu1', type:'major', custom:true, stub:false, name:'Second L&S Major',
    degree:'B.A.', college:'Letters & Science', dept:['ECON'],
    sections:[{ id:'upper', name:'Upper division', groups:[
      { kind:'courses', id:'cu1_up', name:'Core', need:3,
        options:[{codes:['ECON140']},{codes:['ECON141']},{codes:['ECON119']}] }]}] };
  const seedCustom = async (prof, courses) => {
    await p.goto(U,{waitUntil:'domcontentloaded'}); await p.waitForSelector('.bdl-tabs');
    await p.evaluate(([pr,cs,cp])=>(localStorage.clear(),localStorage.setItem('berkeley-degree-ledger:v1',
      JSON.stringify({profile:pr,courses:cs,customPrograms:[cp]}))),[prof,courses,CUSTOM]);
    await p.goto(U,{waitUntil:'domcontentloaded'}); await p.waitForSelector('.bdl-tabs'); await p.waitForTimeout(700);
  };
  await seedCustom({majors:['econ'],minors:[]},[C('ECON140'),C('ECON141'),C('ECON119')]);
  await tab('econ');
  let t = await text();
  ok(/double major on a single degree/i.test(t), 'two L&S majors read as a double major');
  ok(/two courses in total|two upper-division courses in total/i.test(t), 'and the ceiling is stated as two in total');
  ok(!/does not have that figure|check it with both major advisers/i.test(t),
     'the old "we do not have that figure" hedge is gone');
  ok(/not two per pair|in total across every major/i.test(t) || /two courses in total/i.test(t),
     'and says the allowance is a total, not per pair');

  console.log('\n— the same ceiling, named differently across colleges —');
  await boot({majors:['econ','dsmajor'],minors:[]},[C('ECON140'),C('ECON141')]);
  await tab('econ');
  t = await text();
  ok(/simultaneous degree/i.test(t), 'cross-college majors read as a simultaneous degree');
  ok(/two courses in total|two upper-division courses in total/i.test(t), 'with the same two-course ceiling');

  console.log('\n— CDSS Essential Skills cleared by the major —');
  await boot({majors:['dsmajor'],minors:[]});
  await tab('cdss');
  t = await text();
  for (const s of ['Computational Reasoning','Statistical Reasoning','Human & Social Dynamics'])
    ok(t.includes(s), `the tab carries ${s}`);
  const certTags = await p.locator('.bdl-block.done .bdl-bname').allTextContents();
  ok(certTags.some(x=>/Computational Reasoning/.test(x)), 'a Data Science major closes Computational Reasoning itself');
  ok(certTags.some(x=>/Statistical Reasoning/.test(x)), 'and Statistical Reasoning');

  console.log('\n— a Statistics major clears only its own skill —');
  await boot({majors:['statmajor'],minors:[]});
  await tab('cdss');
  const done = await p.locator('.bdl-block.done .bdl-bname').allTextContents();
  ok(done.some(x=>/Statistical Reasoning/.test(x)), 'Statistics closes Statistical Reasoning');
  ok(!done.some(x=>/Computational Reasoning/.test(x)), 'and leaves Computational Reasoning open');

  console.log('\n— the HSDDT course list is real, not a checkbox —');
  await boot({majors:['csmajor'],minors:[]});
  await tab('cdss');
  const hsd = p.locator('.bdl-block').filter({hasText:'Human & Social Dynamics of Data'}).first();
  ok(await hsd.count() === 1, 'the HSDDT block is present');
  await hsd.locator('.bdl-bhead').click(); await p.waitForTimeout(350);
  const hsdText = await hsd.innerText();
  ok(/PHILOS 121|INFO 188|CYPLAN 101/.test(hsdText), 'and lists published courses');
  ok(/not yet offered|PUB POL/i.test(hsdText), 'noting the entries the sheet marks as not yet offered');

  console.log('\n— certification does not mean the same thing at CDSS —');
  await boot({majors:['dsmajor'],minors:[],entry:'transfer',igetc:'full'});
  await tab('setup');
  t = await text();
  ok(/CDSS counts certification differently/i.test(t), 'the setup page says so');
  ok(/Computational Reasoning/.test(t) && /stay open|does not cover/i.test(t),
     'and names the skills it leaves open');

  console.log('\n— no universal extra-unit claim for a second degree —');
  await boot({majors:['econ','dsmajor'],minors:[]});
  await tab('grad');
  t = await text();
  ok(/no universal extra unit minimum/i.test(t), 'the graduation check says there is no universal extra minimum');
  ok(/136/.test(t) && /ceiling/i.test(t), 'and explains 136 as a ceiling, not a target');
  ok(!/Expect a higher unit total/i.test(t), 'the old "expect a higher unit total" claim is gone');

  console.log('\nJS ERRORS: ' + (errs.length?'\n  '+errs.join('\n  '):'none'));
  console.log(bad.length?`\n${bad.length} PROBLEM(S)`:'\nall checks passed');
  await b.close(); process.exit(bad.length?1:0);
})();
