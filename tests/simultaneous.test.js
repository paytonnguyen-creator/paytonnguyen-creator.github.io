const { chromium } = require('playwright-core');
const CHROME='/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const U='http://localhost:8765/degree-ledger/';
const bad=[]; const ok=(c,m)=>{console.log((c?'  ok    ':'  BUG   ')+m); if(!c)bad.push(m);};
(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const p = await b.newPage({ viewport:{width:1280,height:1200} });
  await p.route('https://fonts.googleapis.com/**', r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  const errs=[]; p.on('pageerror',e=>errs.push('PAGEERROR: '+e.message));
  p.on('console',m=>{const t=m.text(); if(m.type()==='error'&&!/fonts|ERR_/.test(t))errs.push('CONSOLE: '+t);
    if(/Warning|duplicate key/i.test(t))errs.push('REACT: '+t);});
  const boot=async(prof,courses=[])=>{
    await p.goto(U,{waitUntil:'domcontentloaded'}); await p.waitForSelector('.bdl-tabs');
    await p.evaluate(([pr,cs])=>(localStorage.clear(),localStorage.setItem('berkeley-degree-ledger:v1',
      JSON.stringify({profile:pr, courses:cs}))),[prof,courses]);
    await p.goto(U,{waitUntil:'domcontentloaded'}); await p.waitForSelector('.bdl-tabs'); await p.waitForTimeout(700);
  };
  const C=(code,units)=>({id:'c'+code,code,title:code,units:units||4,grade:'A',term:'F25',source:'berkeley'});
  const tab=(id)=>p.locator(`.bdl-tab[data-tab="${id}"]`).click().then(()=>p.waitForTimeout(450));

  console.log('\n— cross-college majors are recognised without ticking anything —');
  await boot({majors:['econ','dsmajor'],minors:[],simultaneous:false});
  await tab('setup');
  let setup = await p.locator('.bdl-cols > div').first().innerText();
  ok(/This is a simultaneous degree/i.test(setup), 'setup says so outright');
  ok(/cannot be a double major/i.test(setup), 'and explains why it cannot be a double major');
  await tab('grad');
  let grad = await p.locator('.bdl-cols > div').first().innerText();
  ok(/Simultaneous degree/i.test(grad), 'the graduation check carries the simultaneous-degree rules');
  ok(/Computing, Data Science/i.test(grad), 'naming the second college it worked out itself');

  console.log('\n— the simultaneous-degree overlap allowance —');
  await boot({majors:['econ','dsmajor'],minors:[],simultaneous:false},
             [C('ECON140'),C('ECON141'),C('ECON100A'),C('ECON100B')]);
  await tab('econ');
  let w = await p.locator('.bdl-flag, .bdl-cols > div').first().innerText();
  ok(/allowed upper-division overlaps/i.test(w), 'two shared courses read as the allowance, not a breach');
  ok(/simultaneous degree/i.test(w), 'named as the simultaneous-degree case');
  ok(!/double major on a single degree/i.test(w), 'and not as a double major');

  console.log('\n— two majors in ONE college do not borrow that number —');
  await boot({majors:['econ','appmath'],minors:[],simultaneous:false});
  await tab('setup');
  setup = await p.locator('.bdl-cols > div').first().innerText();
  ok(!/This is a simultaneous degree/i.test(setup), 'two L&S majors are not auto-declared simultaneous');
  ok(/tick it by hand/i.test(setup), 'the checkbox is still offered for the case we cannot see');

  console.log('\n— an L&S major with a CDSS minor stays one degree —');
  await boot({majors:['psych'],minors:['dsminor']});
  await tab('setup');
  setup = await p.locator('.bdl-cols > div').first().innerText();
  ok(!/This is a simultaneous degree/i.test(setup), 'a minor does not make it a simultaneous degree');
  const cols = (await p.locator('.bdl-tab').allTextContents()).map(s=>s.trim())
    .filter(x=>/^(Letters & Science|Computing, Data Science)/.test(x));
  ok(cols.length===1 && /Letters/.test(cols[0]), `and leaves them under one college (${cols.join(', ')||'none'})`);

  console.log('\nJS ERRORS: ' + (errs.length?'\n  '+errs.join('\n  '):'none'));
  console.log(bad.length?`\n${bad.length} PROBLEM(S)`:'\nall checks passed');
  await b.close(); process.exit(bad.length?1:0);
})();
