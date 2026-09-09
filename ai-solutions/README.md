# AI Solutions @ Berkeley

Marketing site for the club, live at
**[paytonnguyen-creator.github.io/ai-solutions/](https://paytonnguyen-creator.github.io/ai-solutions/)**.

```
index.html         the whole site — one page, anchored sections
assets/style.css   design tokens at the top; change the five brand colors and everything follows
assets/main.js     nav, scrollspy, scroll-in reveals
assets/logo.svg    the mark, redrawn as vector art (scales cleanly, doubles as the favicon)
```

Plain HTML and CSS, no build step. It is deployed with the rest of this
repository by `.github/workflows/pages.yml` on every push to `main`. Preview
locally from the repo root with `python3 -m http.server 8000`, then open
<http://localhost:8000/ai-solutions/>.

## Before you share the link

Everything below is a placeholder. Each one is marked with a `TODO` comment in
`index.html`, so `grep -n TODO index.html` is the checklist.

- **Club email** — `aisolutionsberkeley@gmail.com` appears twice (the partner
  CTA and the footer). Replace both with the real address.
- **Application URL** — three buttons point at `#`: the header *Apply*, *Start
  an application* in the recruitment section, and *Apply to join* in the closing
  band. Point them at your form.
- **Recruitment dates** — every row in the Fall 2026 timeline reads "Date TBA".
- **Co-founder** — the second team card is a placeholder for your co-founder's
  name, major and links.
- **Headshots** — team cards fall back to initials. To use a photo, replace the
  avatar div's contents with `<img src="assets/team/name.jpg" alt="Full Name">`
  and keep the image square (~600×600).
- **Instagram** — the footer icon is commented out until you have a handle.
- **Link preview image** — export a 1200×630 PNG to `assets/og.png` and
  uncomment the `og:image` tag in `<head>`, or LinkedIn and Slack will show a
  plain text card.

## What is deliberately *not* on the page

No member counts, project counts, client logos or testimonials. The club is
being founded, so there is nothing true to put there yet, and a partner who
catches an invented number will not stay a partner. The facts strip carries only
things that are already true. Add the real figures at the end of the first
semester.

## Moving to a custom domain

The site is self-contained — `ai-solutions/` can be copied into its own
repository and served at the root with no changes except two absolute URLs in
`<head>`: `<link rel="canonical">` and `og:url`.
