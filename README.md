# paytonnguyen-creator.github.io

My personal site — live at **[paytonnguyen-creator.github.io](https://paytonnguyen-creator.github.io/)**.

Cognitive Science major, Data Science minor at UC Berkeley. Case studies on customer behavior and product strategy.

## Layout

```
index.html                  home — about, projects, approach, skills, background, contact
case-study.html             CDNOW retention write-up
ai-support-automation.html  support-automation write-up
memory-lane.html            Spotify / reminiscence-bump write-up
assets/                     styling, script, portrait, résumé
outputs/figures/            charts for the CDNOW case study
outputs/figures-ai/         charts for the support-automation case study
outputs/figures-memory/     charts for the Memory Lane case study
docs/                       executive decks
```

Plain HTML and CSS — no build step. Deployed to GitHub Pages by `.github/workflows/pages.yml` on every push to `main`. Preview locally with `python3 -m http.server 8000`.

## Where the analysis lives

The code and data pipelines are in a separate repo:
**[ecommerce-customer-retention-analysis](https://github.com/paytonnguyen-creator/ecommerce-customer-retention-analysis)**

Charts here are generated there and copied in:

| Case study | Regenerate with | Copy from → to |
|---|---|---|
| CDNOW retention | `python analysis/run_analysis.py` | `outputs/figures/*.svg` → `outputs/figures/` |
| Memory Lane | `python memory-lane/run_memory_lane.py` | `memory-lane/outputs/figures/*.svg` → `outputs/figures-memory/` |

Both pipelines are deterministic — same inputs give byte-identical SVGs — so a
re-copy that produces a diff means the numbers actually changed.

**Memory Lane figures are computed from a simulated listener,** not a real
Spotify account, and the page says so prominently. If you ever regenerate them
from a real export, re-read the page copy: several numbers are quoted in prose
and will need updating alongside the charts.

## Notes

- **Portrait:** the hero circle reads `assets/portrait.png`. If the file is missing the image removes itself and the circle falls back to initials. Framing is set by `object-position` on `.portrait img`.
- **Hero banner:** Berkeley Blue with a hand-drawn Campanile skyline — no image file needed. For a photo instead, save a wide shot as `assets/hero.jpg` and uncomment the `BANNER` line in `index.html`. Use one you have the rights to.
