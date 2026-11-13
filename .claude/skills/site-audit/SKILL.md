---
name: site-audit
description: Audit the built gj.fo site for accessibility (axe, WCAG 2.1 AA), page weight and load speed, SEO, broken links, no-JS usability and Lighthouse scores, then explain each finding and fix it. Use before opening a PR, before showing a change to the board or Hanna, when a PR's "Site audit" comment shows failures, or when asked "is the site fast / accessible / SEO-ready", "run the audit", "check lighthouse".
allowed-tools: Bash, Read, Edit, Grep, Glob
---

# Site audit

`npm run audit` builds the site, serves it locally, drives the installed
Google Chrome headless, and audits **every page**:

| Area | Tool | Fails on | Warns on |
|---|---|---|---|
| Accessibility | axe-core, mobile **and** desktop | any WCAG 2.1 A/AA violation | best-practice issues |
| No-JS | DevTools protocol, JS disabled, mobile | a nav link hidden, off-screen or covered | — |
| Page weight | real network bytes, mobile, page scrolled so lazy images load | page > 800 KB, image > 400 KB, CSS > 120 KB, JS > 80 KB | page > 400 KB, image > 150 KB… |
| SEO | static checks on the built HTML | missing title / description / canonical / lang / OG tags; `noindex` on a public page; no sitemap | title/description length, no `og:image`, no JSON-LD on the homepage |
| Links | every `href`/`src`/`srcset` | broken internal link | — |
| Lighthouse | mobile preset | accessibility, best practices or SEO < 90 | performance < 90; any category < 100 |

Thresholds live in `tools/audit/config.mjs`. The PR check (`.github/workflows/quality.yml`)
runs the same audit and posts the report as a PR comment.

## Run it

```bash
npm run audit:fast                     # everything except Lighthouse (~20 s)
npm run audit                          # full, with Lighthouse (~1 min)
npm run audit -- --page /um-okkum/        # just one page (prefix match)
```

Read `_audit/report.md` (also printed to the terminal). Requires Google
Chrome installed locally; set `CHROME_PATH` if it's somewhere unusual.

## Fix findings — what each one usually means

Work FAILs first, then WARNs. After fixing, rerun and confirm the finding is
gone; don't stop at "should be fixed".

**a11y `color-contrast`** — a text/background token pair is under 4.5:1
(3:1 for large text). Fix the *token* in `main.css`,
not the one element. The brand-teal frame (`#039685`) can't carry light text at
AA — new white-text surfaces use `--brand-teal-deep`.

**a11y `link-name` / `button-name` / `image-alt`** — an element has no
accessible name. Give the link text, `alt`, or (for icon-only buttons) an
`aria-label` from `site.a11y`.

**a11y `landmark-*` / `region` / `heading-order`** — content outside
`header/main/footer`, or a skipped heading level. Fix the template structure.

**no-js** — something only JS can reveal. Make it visible by default and
collapse it only under `@media (scripting: enabled)` (see `nav.css`).

**weight: image** — the browser downloaded a large variant. Pass a smaller
`widths` array to the `image` shortcode for bounded-size images, and a real
`sizes` value instead of `100vw`. Only full-bleed photos should use the
default widths. Rebuild from a wiped `_site/` before re-measuring (eleventy-img
caches).

**weight: fonts** — self-host only the weights and subsets you use (`woff2`,
`unicode-range`), `font-display: swap`.

**seo: description length / title length** — write real Faroese copy (facts
from the GameJam Foroyar workspace). Set `title` / `description` in the
page's front matter.

**seo: no og:image / no JSON-LD / no sitemap** — all three are wired: the share
image is `site.ogImage` (baked by `.eleventy.js`), structured data is
`src/_data/structuredData.js`, the sitemap is `src/sitemap.njk`. A finding
here means one of those broke.

**links: broken internal link** — usually a relative link (`../x`) or a page
that moved. Use root-absolute links (`/um-okkum/`).

**lighthouse < threshold** — the report lists the top failing audits. Lab
performance on CI is noisy: if performance dips with no weight change, rerun
before chasing it. Accessibility/SEO/best-practice dips are real.

## What the audit cannot tell you

Automated checks find roughly a third to half of real accessibility problems.
Before calling a visual change done, also:

- Tab through every page: focus always visible, order matches the layout,
  skip link works, the mobile menu opens/closes with keyboard and Escape.
- Check at 320 px wide: no horizontal scroll, nothing clipped.
- Read the alt texts: do they describe the picture's *purpose*?
- Turn JS off and use the page for real, not just the nav.
- Zoom to 200 %: text reflows, nothing overlaps.

If you can't do these in a browser, say so in your summary rather than
implying they were checked.

## Known issues (`config.axe.knownIssues`)

An accessibility violation that is understood and waiting on a decision can be
listed in `tools/audit/config.mjs` → `axe.knownIssues` (axe rule id + the
element it is `within` + a reason naming who decides). Matching nodes are then
reported as **`WARN … KNOWN …`** instead of FAIL, so they stay visible in every
PR comment without blocking unrelated work. Anything *outside* the listed
element still FAILs.

Current entry: `color-contrast` within `.footer` — light text on the brand
teal, pending Hanna's frame-colour decision (AGENTS.md §8). The header bar has
the same problem but axe can't measure it (the teal is a `::before` layer).
Adding an entry is a loosening — same rule as thresholds below. Remove the
entry in the PR that fixes it.

## Changing a threshold

Thresholds may only get stricter casually. Loosening one needs a reason in
the PR description (e.g. "hero video approved by the board, page budget raised
to 1.2 MB"). Raise only the one budget that needs it, never a whole category.

## Related

- `review-standards` skill — code review against the project standards
  (`npm run check`); run both before a PR.
- Lessons behind the image rules: Usable fragment `5cafedc1` (GameJam
  Foroyar workspace) — shared default widths silently bloat bounded images.
- The same audit runs on `flowcore-io/runi-brattaberg-landing-page`.
