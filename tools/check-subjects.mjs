/* Guards the course-code parser. Every subject prefix used in a requirement
   list must be in SUBJECTS, or splitCode() cannot separate subject from number
   and isUpperDiv() quietly returns false — which would undercount a student's
   upper-division units. Run by tools/build-ledger.mjs before every build. */
import { readFileSync } from "node:fs";
const src = readFileSync("src/berkeley-degree-ledger.jsx", "utf8");

// the parser's subject list
const m = src.match(/const SUBJECTS = \(([\s\S]*?)\)\n\s*\.split/);
const SUBJECTS = m[1].replace(/["+\n]/g, " ").split(/\s+/).filter(Boolean).sort((a,b)=>b.length-a.length);

// every course code that appears in a requirement list
const codes = new Set();
for (const lit of src.matchAll(/"([A-Z][A-Z0-9/]{2,})"/g)) {
  for (const c of lit[1].split("/")) if (/^[A-Z]+[A-Z]?\d/.test(c)) codes.add(c);
}
// also the space-separated blobs
for (const blob of src.matchAll(/"([A-Z][A-Z0-9 ]{20,})"/g)) {
  for (const c of blob[1].split(/\s+/)) if (/^[A-Z]+[A-Z]?\d/.test(c)) codes.add(c);
}

const bad = new Map();
for (const c of codes) {
  const subj = SUBJECTS.find((s) => c.startsWith(s));
  if (!subj) {
    const guess = (c.match(/^([A-Z]+?)(?=[A-Z]?\d)/) || [])[1] || c;
    if (!bad.has(guess)) bad.set(guess, []);
    bad.get(guess).push(c);
  }
}
console.log(`${codes.size} course codes referenced, ${SUBJECTS.length} subjects known`);
if (!bad.size) { console.log("every code resolves to a known subject"); process.exit(0); }
console.log(`\n${bad.size} UNKNOWN SUBJECT PREFIXES — these codes do not parse:`);
for (const [g, list] of [...bad].sort()) console.log(`  ${g.padEnd(10)} ${list.slice(0,5).join(", ")}${list.length>5?` … (${list.length})`:""}`);
process.exit(1);
