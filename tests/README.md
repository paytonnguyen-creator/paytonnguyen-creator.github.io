# Browser tests

Playwright checks that drive the built page the way a student would. They run
against the real bundle, not the source, so they catch build problems too.

```
node tools/build-ledger.mjs
python3 -m http.server 8765 &          # serve the repo root
node tests/ledger.test.js              # the main regression sweep
node tests/simultaneous.test.js        # L&S x CDSS degree-shape rules
```

Both exit non-zero on failure, and both fail on any console error or React
warning as well as on their own assertions.

`CHROME` at the top of each file points at the sandbox's Chromium. Change it if
your Playwright install lives elsewhere.

These live in the repo deliberately: they were kept in a scratch directory once
and were lost with the container, along with every regression they encoded.
