/* Validates the requirement data itself: blocks that can never be closed,
   duplicate options inside one block, empty blocks, id collisions. Runs the
   real module rather than a regex over the source. */
import { build } from "esbuild";
import { writeFile, unlink } from "node:fs/promises";

/* Bundle the app to plain ESM so the real data structures can be imported,
   rather than pattern-matched out of the source. */
const out = await build({
  entryPoints: ["src/berkeley-degree-ledger.jsx"], bundle: true, format: "esm",
  external: ["react", "react-dom"], write: false, logLevel: "error",
});
const tmp = "tools/_data.mjs";
await writeFile(tmp, out.outputFiles[0].text);
const { CATALOG, UNIVERSITY, LS_COLLEGE, programGroups, PROGRAM_INDEX, PAIRINGS } = await import("./_data.mjs?" + Date.now());
await unlink(tmp);

const problems = [];
const note = (m) => problems.push(m);

const programs = [UNIVERSITY, LS_COLLEGE, ...CATALOG.majors, ...CATALOG.minors];
for (const prog of programs) {
  // every branch of a branching program, not just the default
  const paths = prog.pathways ? prog.pathways.options.map((o) => o.id) : [undefined];
  for (const path of paths) {
    const groups = programGroups(prog, path);
    const seen = new Set();
    for (const g of groups) {
      const where = `${prog.name}${path ? ` [${path}]` : ""} · ${g.name}`;
      if (seen.has(g.id)) note(`duplicate group id "${g.id}" — ${where}`);
      seen.add(g.id);
      if (g.kind !== "courses" || g.open) continue;
      const n = (g.options || []).length;
      if (!n && !g.match) { note(`no options at all — ${where}`); continue; }
      if (!g.needUnits && !g.match && g.need > n) note(`needs ${g.need} but only lists ${n} — ${where}`);
      const codes = new Map();
      for (const o of g.options)
        for (const c of o.codes) {
          if (codes.has(c) && codes.get(c) !== o) note(`"${c}" listed in two separate options — ${where}`);
          codes.set(c, o);
        }
    }
  }
}

/* The pairings tab addresses programs by id — an encoded program's own id, or
   an index id derived from the program's name. A mistyped or drifted id used to
   fail silently as a card that simply did not render, which is exactly the kind
   of thing nobody notices. */
const known = new Set([...programs.map((p) => p.id), ...PROGRAM_INDEX.map((p) => p.id)]);
for (const pair of PAIRINGS) {
  if (!known.has(pair.ls)) note(`pairings row points at an unknown program "${pair.ls}"`);
  for (const c of pair.cdss) if (!known.has(c)) note(`pairings row "${pair.ls}" points at an unknown CDSS program "${c}"`);
  if (pair.also && !known.has(pair.also)) note(`pairings row "${pair.ls}" points at an unknown second program "${pair.also}"`);
}

console.log(`checked ${programs.length} programs and ${PAIRINGS.length} pairings`);
if (problems.length) { console.log(`\n${problems.length} PROBLEM(S):`); problems.forEach((p) => console.log("  " + p)); process.exit(1); }
console.log("requirement data is internally consistent");
