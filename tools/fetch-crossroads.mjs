// Pulls every Cal Dining location's menus and writes them as JSON the page can read.
//
//   node tools/fetch-crossroads.mjs            today + the next 9 days (Pacific time)
//   node tools/fetch-crossroads.mjs --days 3
//
// Cal Dining publishes one XML file per location per day:
//   https://dining.berkeley.edu/wp-content/uploads/menus-exportimport/<Location>_YYYYMMDD.xml
// The page can't fetch those itself (they live on another origin), so the
// "Update Crossroads menus" GitHub Action runs this every morning and commits
// the result to crossroads/data/ — one file per day holding every location.
//
// A missing file is normal: menus go up about a week ahead, cafés post less
// often than the dining halls, and everything closes over breaks. The run only
// fails when the site can't be reached or a dining-hall file stops parsing,
// because both mean someone needs to look.
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

// File-name prefixes Cal Dining uses. A prefix that 404s every day is simply
// skipped, so an extra one costs nothing; a renamed location shows up as
// missing in the run log.
const LOCATIONS = [
  { key: 'Crossroads', name: 'Crossroads', kind: 'hall' },
  { key: 'Cafe_3', name: 'Cafe 3', kind: 'hall' },
  { key: 'Foothill', name: 'Foothill', kind: 'hall' },
  { key: 'Clark_Kerr_Campus', name: 'Clark Kerr', kind: 'hall' },
  { key: 'Eateries_at_the_Student_Union', name: 'Student Union', kind: 'cafe' },
  { key: 'Golden_Bear_Cafe', name: 'Golden Bear Cafe', kind: 'cafe' },
  { key: 'Gateway_Cafe', name: 'Gateway Cafe', kind: 'cafe' },
  { key: 'Local_x_Design', name: 'Local x Design', kind: 'cafe' }
];

const args = process.argv.slice(2);
const daysArg = args.indexOf('--days');
const DAYS = daysArg >= 0 ? Math.max(1, parseInt(args[daysArg + 1], 10) || 10) : 10;
const CONCURRENCY = 6;

function pacificToday() {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
}

function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

async function fetchOne(loc, iso) {
  const url = `${BASE}/${loc.key}_${iso.replace(/-/g, '')}.xml`;
  const base = { loc, iso, url };
  let res;
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': 'crossroads-cut-planner (+https://paytonnguyen-creator.github.io/crossroads/)' },
      signal: AbortSignal.timeout(30000)
    });
  } catch (err) {
    return { ...base, status: 'error', detail: err.cause?.code || err.cause?.message || err.message };
  }
  if (res.status === 404) return { ...base, status: 'none' };
  if (!res.ok) return { ...base, status: 'error', detail: `HTTP ${res.status}` };
  const type = res.headers.get('content-type') || '';
  const body = await res.text();
  // WordPress answers a missing upload with its HTML 404 page and a 200.
  if (/text\/html/i.test(type) || /^\s*<!doctype html/i.test(body)) return { ...base, status: 'none' };

  let day;
  try {
    day = Planner.parseEatecXml(body);
  } catch (err) {
    return { ...base, status: 'broken', detail: err.message };
  }
  const items = day.meals.reduce((s, m) => s + m.items.length, 0);
  if (!items) return { ...base, status: 'none', detail: 'posted with no items' };
  const withKcal = day.meals.reduce((s, m) => s + m.items.filter(i => i.n.kcal != null).length, 0);
  // The halls always carry nutrition, so none at all means the columns moved.
  if (!withKcal && loc.kind === 'hall') return { ...base, status: 'broken', detail: 'no item carried calories; nutrient columns may have been renamed' };
  return {
    ...base, status: 'ok', items,
    location: { key: loc.key, name: loc.name, kind: loc.kind, source: url, meals: day.meals }
  };
}

async function pool(tasks, n) {
  const out = new Array(tasks.length);
  let next = 0;
  async function worker() {
    while (next < tasks.length) { const i = next++; out[i] = await tasks[i](); }
  }
  await Promise.all(Array.from({ length: n }, worker));
  return out;
}

async function readJson(file) {
  try { return JSON.parse(await readFile(file, 'utf8')); } catch { return null; }
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const today = pacificToday();
  const dates = Array.from({ length: DAYS }, (_, i) => addDays(today, i));
  const tasks = [];
  for (const iso of dates) for (const loc of LOCATIONS) tasks.push(() => fetchOne(loc, iso));
  const results = await pool(tasks, CONCURRENCY);

  let changed = 0;
  for (const iso of dates) {
    const rows = results.filter(r => r.iso === iso);
    const line = rows.map(r => `${r.loc.name}: ${r.status === 'ok' ? r.items : r.status}`).join(' · ');
    console.log(`${iso}  ${line}`);
    const locations = rows.filter(r => r.status === 'ok').map(r => r.location);
    if (!locations.length) continue;
    const file = path.join(OUT, `${iso}.json`);
    const prev = await readJson(file);
    // Only rewrite when a menu itself changed, so a quiet day makes no commit.
    if (prev && JSON.stringify(prev.locations) === JSON.stringify(locations)) continue;
    await writeFile(file, JSON.stringify({ date: iso, fetchedAt: new Date().toISOString(), locations }) + '\n');
    changed++;
  }

  // Drop days older than the keep window, then rebuild the index from disk.
  const cutoff = addDays(today, -KEEP_DAYS);
  const isDay = f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f);
  for (const f of (await readdir(OUT)).filter(isDay)) {
    if (f.slice(0, 10) < cutoff) { await unlink(path.join(OUT, f)); changed++; }
  }
  const kept = (await readdir(OUT)).filter(isDay).map(f => f.slice(0, 10)).sort();
  const indexFile = path.join(OUT, 'index.json');
  const prevIndex = await readJson(indexFile);
  const locs = LOCATIONS.map(({ key, name, kind }) => ({ key, name, kind }));
  if (changed || !prevIndex || JSON.stringify(prevIndex.dates) !== JSON.stringify(kept) || JSON.stringify(prevIndex.locations) !== JSON.stringify(locs)) {
    await writeFile(indexFile, JSON.stringify({ dates: kept, locations: locs, updatedAt: new Date().toISOString() }, null, 2) + '\n');
  }
  console.log(`${changed} file(s) changed; ${kept.length} day(s) on hand`);

  const failures = results.filter(r => r.status === 'error' || r.status === 'broken');
  if (failures.length) {
    console.error(`\n${failures.length} fetch(es) failed:`);
    failures.forEach(f => console.error(`  ${f.iso} ${f.loc.name}: ${f.detail}  (${f.url})`));
    process.exit(1);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
