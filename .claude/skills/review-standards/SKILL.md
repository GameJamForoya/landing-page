---
name: review-standards
description: Review changes to the gj.fo landing page (GameJam Føroya) against its standards — static build-time HTML, Eleventy + Nunjucks partials, BEM + design tokens, progressive-enhancement-only JS, WCAG 2.1 AA, SEO meta and structured data, the eleventy-img pipeline, Faroese copy and the gh-pages deploy with PR previews. Use before opening or merging a PR, when asked to "review", "check the standards", "is this up to standard", or after building a new page or section.
allowed-tools: Bash, Read, Grep, Glob
---

# Review against the gj.fo standards

gj.fo follows the architecture decision in the GameJam Foroyar Usable
workspace and takes its philosophy from **Orlando**. The rules are written out
below so the review works without access to those workspaces; sources are
listed at the end.

Your job is to find where a change **deviates** from these rules — not to
restyle it. Visual design and copy are Hanna's call and are out of scope
unless they break a rule below (contrast, alt text, hardcoded strings…).

## 1. Scope the review

```bash
git fetch -q origin
git diff --stat origin/main...HEAD          # what changed
git diff origin/main...HEAD                 # read all of it
```

Review the whole diff, then read any file the diff touches in full — rules like
"one component per file, linked in base.njk" can only be checked in context.
If there is no diff (e.g. reviewing `main`), review every tracked file.

## 2. Run the mechanical checks

```bash
npm run check          # = bash .claude/skills/review-standards/check.sh
npm run audit:fast     # rendered-page checks: axe, weight, SEO, links, no-JS
```

`check` wipes `_site/`, does a production build, runs Stylelint
(`stylelint.config.mjs`, incl. the `gjfo/no-raw-colour` rule in
`tools/stylelint/`) and html-validate (`.htmlvalidate.mjs`), then the
project-specific checks (component linking, meta tags, og:image, `noindex`,
sitemap, JSON-LD, base path…). `audit:fast` is the **site-audit** skill's tool —
see that skill for what its findings mean. Each `FAIL` is a finding; each
`WARN` needs a human look. Paste both summaries into the review. Neither
replaces reading the code — sections 3–4 are where most real findings come
from.

Never "fix" a lint finding by adding a `stylelint-disable` or loosening a
config rule unless the exception is genuinely right and carries a `--`
reason, like the reduced-motion `!important` in `main.css`.

Every PR also gets a **live preview** at `https://gj.fo/pr-preview/pr-<n>/`
(link in the PR comment) — use it for the browser check in section 4.

## 3. The rules

Severity: **blocker** = must fix before merge; **should-fix** = fix in this PR
unless there is a stated reason; **nit** = optional.

### Architecture (blocker)
- **Content is baked at build time.** Text, nav, headings, links and images
  are in the HTML Eleventy emits. Never render core content with client JS,
  `fetch()` content at runtime, or use runtime web components / custom
  elements for header, footer or nav. AI crawlers do not run JS — anything
  JS-rendered does not exist to them.
- **Eleventy + Nunjucks only.** No React/Vue/Svelte/Astro, no CSS frameworks
  (Tailwind, Bootstrap), no client-side bundler. New npm dependencies need a
  stated reason.
- **Reuse through partials and layouts** (`src/_includes/`). Copy-pasted
  header/footer/nav markup is a blocker.

### Data, strings and language (should-fix)
- Org facts, contact details, nav, social links, URLs and SEO defaults come
  from `src/_data/site.js` (`site.*`). Hardcoding them in a template is a
  finding. Structured data is built from `site.js` in
  `src/_data/structuredData.js` — never hand-written.
- `site.js` mirrors the **GameJam Føroya — Organization Profile** fragment
  (`49e35356-5ee2-42d0-ba90-500509049a5b`). A changed fact (address, V-tal,
  board, email) must match it.
- New pages that belong in the menu are added to `site.nav`, not by editing
  `nav.njk`.
- **Faroese is the site language**: UI copy, `alt` text and `aria-label`s are
  Faroese. English copy outside the deliberate "official website of…" line on
  `/samband/` is a finding. Flag Faroese that needs a proof-read rather than
  rewriting it.
- **Keep the legal-identity block on `/samband/`** (legal name, org type,
  V-tal, address) and the mission + social links in the footer: Google for
  Nonprofits requires them on the site (AGENTS.md §6). Removing either half is
  a blocker.

### HTML and accessibility — WCAG 2.1 AA (blocker unless noted)
- Semantic landmarks (`header`, `nav`, `main`, `footer`, `section` with a
  heading). Exactly **one `<h1>` per page**; no skipped heading levels
  (should-fix).
- The skip link stays and targets `#main`.
- Every image has meaningful Faroese `alt` (`alt=""` only for decoration).
- Interactive things are real `<a>`/`<button type="button">`, keyboard
  reachable, with a visible focus style. No `div onclick`. Something that is
  only interactive *because of JS* gets its button semantics from JS (see the
  hero mascot: `data-game-label` → `role`/`tabindex`/`aria-label` in
  `main.js`), so it isn't a dead button without JS.
- ARIA only where native semantics fall short; `aria-expanded` /
  `aria-controls` kept in sync by JS on toggles.
- Text contrast ≥ 4.5:1 (≥ 3:1 for large text and UI boundaries). Compute it
  for any new token pair — do not eyeball it. **Known exception:** light text
  on the brand-teal header/footer frame (`#039685`) is under 4.5:1; it is
  listed in `tools/audit/config.mjs` `knownIssues`, pending Hanna's decision.
  Don't add new light-on-`--brand-teal` text — use `--brand-teal-deep`
  surfaces for new white-text areas.
- `prefers-reduced-motion` respected for any new animation or transition
  beyond the global reset.

### CSS (should-fix)
- **BEM**: `block`, `block__element`, `block--modifier`. No ID selectors for
  styling, no deep descendant chains, no `!important` (except the documented
  reduced-motion resets).
- **Design tokens**: colours, spacing, type sizes, radii, shadows and timing
  are CSS custom properties in `src/styles/main.css :root`. A raw colour in a
  component file is a finding (Stylelint enforces it): reuse a brand token,
  `--on-dark` for white on dark/brand surfaces, `--on-teal*` on the teal
  frame, and derive tints with
  `color-mix(in srgb, var(--token) N%, transparent)` — never `rgba()`.
- **No inline styles** (`style="…"`) in templates (blocker).
- One component per file in `src/styles/components/`, each linked from
  `base.njk` with its own `<link>` — no `@import`. Exception: `review.css` is
  injected on demand by `review.js` and must NOT be linked.
- Mobile-first and responsive; no horizontal scroll at 320px wide.

### JavaScript (blocker)
- **Progressive enhancement only.** The page must be fully usable with JS
  disabled. Anything JS opens (menus, disclosures) must be **visible by
  default** and only collapsed under `@media (scripting: enabled)` — see the
  mobile nav in `nav.css`. A menu hidden by CSS that only JS can open is a
  blocker (gj.fo shipped exactly that until Nov 2026).
- Vanilla JS, no libraries, loaded with `defer` from `src/scripts/`. No inline
  `<script>` blocks in templates (the JSON-LD data block is the one allowed
  inline `<script type="application/ld+json">`).
- Optional features load lazily on demand (`loadScriptOnce` in `main.js`) —
  the hero game and review mode do, so ordinary visitors never download them.
- Wrap `localStorage` access in `try/catch` (blocked in private mode).

### Images and assets (should-fix)
- Images go through the `{% image src, alt, sizes, class, widths %}`
  shortcode. Never link raw files under `src/assets/` — they are not copied
  to the output, so the link 404s (blocker).
- **Pass an explicit `widths` array for anything with a bounded render size**
  (logos, avatars, thumbnails). The default goes up to 2048px for full-bleed
  photos; a 200px logo inheriting it ships 1280–2048px variants for nothing.
  This bit gj.fo in production (fragment `5cafedc1`).
- SVGs pass through as vectors — don't convert vector art to PNG.
- Images are committed to the repo; never hotlink Google Drive or other share
  links (fragment `0d80abc5`). Sponsor logos: follow the sponsor-logo recipe
  (`f38ff255`).
- `sizes` should reflect the real rendered width, not `100vw`, for anything
  that isn't full-bleed.

### SEO and meta (should-fix)
- Each page has a `title` and, where the default doesn't fit, a
  `description` in front matter; `base.njk` renders title, description,
  canonical, Open Graph and the share image (`site.ogImage`) from them. Don't
  hand-write meta tags in pages.
- No public page is `noindex`; only PR previews are (`PREVIEW_BUILD=1`).
- `src/sitemap.njk` lists every page automatically (robots.txt points to it);
  a page that must not be listed sets `noindex: true` in front matter.

### Links and base path (blocker)
- Write **root-absolute** links (`/um-okkum/`, `/styles/…`). `HtmlBasePlugin`
  rewrites them for PR previews (`/pr-preview/pr-<n>/`). Relative links
  (`../x`) and hardcoded `https://gj.fo/…` internal links break previews.
- Exception: CSS `url()` and JS-computed paths are not rewritten by the
  plugin — they must be relative to their own file, or derived from
  `document.currentScript` / a `data-*` attribute rendered by Eleventy, as
  `main.js` does.

### Deploy and repo hygiene
- `_site/` and `node_modules/` are never committed (blocker).
- `.github/workflows/deploy.yml` builds and publishes only — no lint, audit
  or test steps on main (they run on PRs, `quality.yml`). It installs with
  `npm ci --omit=dev`, so a package the build imports must be in
  `dependencies`, not `devDependencies` (blocker: the deploy breaks).
- `deploy.yml` publishes to the `gh-pages` branch with
  `clean-exclude: pr-preview/` and `force: false` — dropping either wipes or
  races the open PR previews; switching back to `deploy-pages` breaks them.
  `src/public/CNAME` keeps the gj.fo domain. Changes need a reason.
- Node version lives only in `.nvmrc` (CI reads it with `node-version-file`);
  `engines` in `package.json` matches it.

### Docs and knowledge (should-fix)
- If the change alters structure, conventions, scripts or deploy, `AGENTS.md`
  is updated in the same PR. `AGENTS.md` is the only instructions file;
  `CLAUDE.md` just imports it (`@AGENTS.md`) and must stay that way.
- Durable learnings go to the **GameJam Foroyar** Usable workspace
  (`56ce96f5-f0af-4787-8bf3-ffe878522a40`, tag `repo:gj-fo`). Note in the
  review if a PR fixes something non-obvious with no write-up.

## 4. Check it in a browser when the change is visual

A green build proves nothing about layout. Open the PR preview (or
`npm run dev`), check at 320px, 768px and 1280px wide; tab through the page
(focus visible, order sane, skip link works); and reload with JS disabled. If
you cannot open a browser, say so in the review rather than implying it was
checked.

## 5. Write the review

Verify every finding against the code before reporting it; drop anything you
cannot substantiate. Report, most severe first:

```
[severity] path/to/file:line — rule broken (section above)
  What goes wrong: <concrete consequence>
  Fix: <specific change>
```

Then: the `check` summary, what you could not check (e.g. browser), and a
one-line verdict — **ready to merge**, **merge after fixes**, or **needs
rework**. No praise section.

After a merge, verify the change reached `origin/main` by content, not by the
PR's MERGED badge — gj.fo once merged a PR between two pushes and silently
dropped the second commit (fragment `8d07752d`):

```bash
git fetch -q origin && git merge-base --is-ancestor <sha> origin/main && echo IN || echo MISSING
```

## Sources

- gj.fo architecture decision — GameJam Foroyar workspace, fragment
  `6b17fd78-a0e9-43e7-847f-4641b023ac12`.
- Orlando project structure — `692a610c-ad3e-4cfd-89e3-dab08e389236`;
  Orlando reference implementation — `079d5fe9-e484-4fb6-9ed4-6114d987659a`.
- gj.fo lessons — image widths `5cafedc1-da01-4f0b-95a8-4e4118f7d828`, SVG
  pass-through `16a8f758-71f0-4c85-aa7a-539330ff69b9`, no hotlinking
  `0d80abc5-cffd-466b-8c65-43897b40d7eb`, merged-PR check
  `8d07752d-b1c1-427e-944c-16983e3a3df3`.
- The same standard is applied to `flowcore-io/runi-brattaberg-landing-page`.

When the standard changes, update this file and `check.sh` in the same PR.
