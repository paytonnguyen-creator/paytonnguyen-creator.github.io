/* Builds degree-ledger/index.html from src/.
 *
 *   node tools/build-ledger.mjs
 *
 * React and the app are bundled and inlined into one file, so the published
 * page needs no network at all beyond its font stylesheet. src/page.html is the
 * shell; __BUNDLE__ inside its <script> is where the bundle lands. */
import { build } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const OUT = "degree-ledger/index.html";

// A missing subject prefix breaks upper-division detection silently, so the
// build refuses to produce a page with one.
execFileSync("node", ["tools/check-subjects.mjs"], { stdio: "inherit" });
// ...and refuses to ship requirement data that cannot be satisfied.
execFileSync("node", ["tools/check-data.mjs"], { stdio: "inherit" });

const result = await build({
  entryPoints: ["src/main.jsx"],
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2020",
  define: { "process.env.NODE_ENV": '"production"' },
  legalComments: "eof",
  write: false,
});

const js = result.outputFiles[0].text;
const shell = await readFile("src/page.html", "utf8");
if (!shell.includes("__BUNDLE__")) throw new Error("src/page.html has no __BUNDLE__ placeholder");

// A literal </script> anywhere in the JS would close the tag early.
if (js.includes("</script")) throw new Error("bundle contains a literal </script>");

await writeFile(OUT, shell.replace("__BUNDLE__", () => js));
console.log(`${OUT} — ${(js.length / 1024).toFixed(0)} KB of script`);
