// Pulls Crossroads' menus from Cal Dining and writes them as JSON the page can read.
//
//   node tools/fetch-crossroads.mjs            today + the next 6 days (Pacific time)
//   node tools/fetch-crossroads.mjs --days 3
//
// Cal Dining publishes one XML file per location per day:
//   https://dining.berkeley.edu/wp-content/uploads/menus-exportimport/Crossroads_YYYYMMDD.xml
// The page can't fetch that itself (it lives on another origin), so the
// "Update Crossroads menus" GitHub Action runs this every morning and commits
// the result to crossroads/data/.
//
// A missing day is normal — menus are posted a few days out and the hall closes
// over breaks. The run only fails when the site can't be reached or a file
// arrives that no longer parses, because both mean someone needs to look.
//
// CROSSROADS_BASE_URL and CROSSROADS_DATA_DIR override the source and output,
// so the fetcher can be exercised against a local server without touching the
// committed data.

import { createRequire } from 'node:module';
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const Planner = require('../crossroads/planner.js');

const BASE = (process.env.CROSSROADS_BASE_URL ||
  'https://dining.berkeley.edu/wp-content/uploads/menus-exportimport').replace(/\/$/, '');
const OUT = path.resolve(process.env.CROSSROADS_DATA_DIR || path.join(here, '..', 'crossroads', 'data'));
const KEEP_DAYS = 14;

const args = process.argv.slice(2);
const daysArg = args.indexOf('--days');
const DAYS = daysArg >= 0 ? Math.max(1, parseInt(args[daysArg + 1], 10) || 7) : 7;

function pacificToday() {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
}

function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

async function fetchDay(iso) {
  const url = `${BASE}/Crossroads_${iso.replace(/-/g, '')}.xml`;
  let res;
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': 'crossroads-cut-planner (+https://paytonnguyen-creator.github.io/crossroads/)' },
      signal: AbortSignal.timeout(30000)
    });
  } catch (err) {
    return { iso, url, status: 'error', detail: err.cause?.code || err.cause?.message || err.message };
  }
  if (res.status === 404) return { iso, url, status: 'none' };
  if (!res.ok) return { iso, url, status: 'error', detail: `HTTP ${res.status}` };
  const type = res.headers.get('content-type') || '';
  const body = await res.text();
  // WordPress answers a missing upload with its HTML 404 page and a 200.
  if (/text\/html/i.test(type) || /^\s*<!doctype html/i.test(body)) return { iso, url, status: 'none' };

  let day;
  try {
    day = Planner.parseEatecXml(body);
  } catch (err) {
    return { iso, url, status: 'broken', detail: err.message };
  }
  const items = day.meals.reduce((s, m) => s + m.items.length, 0);
  if (!items) return { iso, url, status: 'broken', detail: 'parsed zero menu items' };
  const withKcal = day.meals.reduce((s, m) => s + m.items.filter(i => i.n.kcal != null).length, 0);
  if (!withKcal) return { iso, url, status: 'broken', detail: 'no item carried calories — nutrient columns may have been renamed' };

  return {
    iso, url, status: 'ok', items,
    day: { location: day.location || 'Crossroads', date: iso, source: url, meals: day.meals }
  };
}

async function readJson(file) {
  try { return JSON.parse(await readFile(file, 'utf8')); } catch { return null; }
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const today = pacificToday();
  const dates = Array.from({ length: DAYS }, (_, i) => addDays(today, i));
  const results = await Promise.all(dates.map(fetchDay));

  let changed = 0;
  for (const r of results) {
    const tag = { ok: 'ok    ', none: 'none  ', error: 'ERROR ', broken: 'BROKEN' }[r.status];
    console.log(`${tag} ${r.iso}  ${r.status === 'ok' ? r.items + ' items' : r.detail || 'not posted'}`);
    if (r.status !== 'ok') continue;
    const file = path.join(OUT, `${r.iso}.json`);
    const prev = await readJson(file);
    // Only rewrite when the menu itself changed, so a quiet day makes no commit.
    if (prev && JSON.stringify(prev.meals) === JSON.stringify(r.day.meals)) continue;
    await writeFile(file, JSON.stringify({ ...r.day, fetchedAt: new Date().toISOString() }) + '\n');
    changed++;
  }

  // Drop days older than the keep window, then rebuild the index from disk.
  const cutoff = addDays(today, -KEEP_DAYS);
  const files = (await readdir(OUT)).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f));
  for (const f of files) {
    if (f.slice(0, 10) < cutoff) { await unlink(path.join(OUT, f)); changed++; }
  }
  const kept = (await readdir(OUT)).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).map(f => f.slice(0, 10)).sort();
  const indexFile = path.join(OUT, 'index.json');
  const prevIndex = await readJson(indexFile);
  if (changed || !prevIndex || JSON.stringify(prevIndex.dates) !== JSON.stringify(kept)) {
    await writeFile(indexFile, JSON.stringify({ location: 'Crossroads', dates: kept, updatedAt: new Date().toISOString() }, null, 2) + '\n');
  }
  console.log(`${changed} file(s) changed; ${kept.length} day(s) on hand`);

  const failures = results.filter(r => r.status === 'error' || r.status === 'broken');
  if (failures.length) {
    console.error(`\n${failures.length} day(s) failed:`);
    failures.forEach(f => console.error(`  ${f.iso}: ${f.detail}  (${f.url})`));
    process.exit(1);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
