# AGENTS.md — GameJam Føroya landing page (gj.fo)

Guidance for any AI agent (Claude Code, Codex, …) or human working in this
repo. Read this first. This is the only instructions file: `CLAUDE.md` just
imports it (`@AGENTS.md`), so edit here and never fork a second copy.

---

## 1. What this is

The public landing page for **GameJam Føroya** — the Faroese nonprofit that
promotes game culture and game development and runs game jams. It is served at
**https://gj.fo**.

Unlike the pure-static Orlando landing pages (which are hand-authored HTML with
no build step), **this project compiles and then deploys**: source lives under
`src/`, [Eleventy](https://www.11ty.dev/) bakes it into static HTML in `_site/`
at build time, and GitHub Actions publishes `_site/` to GitHub Pages. Nothing in
`_site/` is committed — it is a build artifact.

## 2. Knowledge lives in Usable — check it first

This repo is paired with two [Usable](https://usable.dev) workspaces. **Search
them before making non-trivial decisions**, and write back anything durable you
learn.

| Workspace | ID | Use it for |
|---|---|---|
| **GameJam Foroyar** | `56ce96f5-f0af-4787-8bf3-ffe878522a40` | Org facts (legal name, V-tal, address, board, contact), the gj.fo architecture decision, sponsors, events, domain/DNS. This repo's tag is **`repo:gj-fo`**. |
| **Orlando** (public) | `7b8da6be-b9b5-401e-987a-e93a91cabd4d` | Design/build **inspiration** only — the vanilla HTML/CSS/JS + BEM philosophy, accessibility and performance patterns, component conventions. |

Key fragments to start from:

- **"gj.fo Rebuild — Static Site Generator Recommendation (Eleventy)"**
  (`6b17fd78-a0e9-43e7-847f-4641b023ac12`) — the architecture decision this repo
  implements (Eleventy + Nunjucks, GitHub Pages via Actions, zero required JS).
- **"GameJam Føroya — Organization Profile"** (`49e35356-5ee2-42d0-ba90-500509049a5b`) —
  the source of truth for the org facts mirrored in `src/_data/site.js`.
- **"Orlando Studio Landing Page — Perfect Vanilla Reference Implementation"**
  (`079d5fe9-e484-4fb6-9ed4-6114d987659a`) — the design/quality bar to aim for.

> **Orlando is inspiration, not a template to copy verbatim.** Orlando forbids a
> build step; this project deliberately has one so we get DRY build-time partials
> and top SEO. Take Orlando's *philosophy* (semantic HTML, BEM, CSS custom
> properties, progressive enhancement, WCAG AA+, optimised assets) — not its
> "no package.json" rule.

## 3. How to run the project

Requires **Node.js ≥ 22** (see `.nvmrc`; CI reads the version from it).

```bash
npm install          # once, to install Eleventy
npm run dev          # local dev server at http://localhost:8080 with live reload
```

Other scripts:

```bash
npm run build        # production build → _site/
npm run clean        # remove _site/
```

To preview the exact output CI publishes, run `npm run build` and serve `_site/`
with any static server (e.g. `npx http-server _site`).

## 4. How it deploys (CI → GitHub Pages)

- **Workflow:** `.github/workflows/deploy.yml`.
- **Trigger:** every push to `main` (plus manual `workflow_dispatch`).
- **Steps:** checkout → `setup-node` (Node from `.nvmrc`, npm cache) →
  `npm ci --omit=dev` → `npm run build` → push `_site/` to the **`gh-pages`
  branch** (`JamesIves/github-pages-deploy-action`, keeping `pr-preview/` and
  rebasing rather than force-pushing).
- **Main is build + publish only**, for speed. Anything the *build* needs goes
  in `dependencies`; lint/test tooling goes in `devDependencies`, which the
  deploy skips. Checks and previews run on pull requests only.
- **GitHub settings:** **Settings → Pages → Source = "Deploy from a branch",
  `gh-pages`, `/ (root)`** — *not* "GitHub Actions", which the PR previews
  can't work with. The `github-pages` environment must allow the `gh-pages`
  branch (Settings → Environments → github-pages), or Pages refuses to
  publish it. Never commit to `gh-pages` by hand; it is build output.
- **Custom domain (gj.fo):** set under Settings → Pages, and `src/public/CNAME`
  (copied to the site root at build time) keeps it on every deploy.
- **PR previews:** every PR into `main` gets a live copy at
  `https://gj.fo/pr-preview/pr-<number>/`, linked in a sticky PR comment and
  deleted when the PR is merged or closed (`.github/workflows/pr-preview.yml`,
  [rossjrw/pr-preview-action](https://github.com/rossjrw/pr-preview-action)).
  Previews build with `PREVIEW_BUILD=1` (always `noindex`) and a
  `PATH_PREFIX` of `/pr-preview/pr-<n>/`, so nothing in `src/` may hardcode
  a path that bypasses the prefix. The preview URL is public.

## 5. Project structure

```
landing-page/
├── AGENTS.md                 # you are here — the agent instructions
├── CLAUDE.md                 # imports AGENTS.md for Claude Code
├── README.md                 # human-facing quick start
├── package.json              # scripts; build deps vs dev (lint/test) deps
├── .eleventy.js              # Eleventy config (input src/, output _site/)
├── .nvmrc                    # Node version (22)
├── .github/workflows/
│   ├── deploy.yml            # build + push to gh-pages (push to main)
│   └── pr-preview.yml        # live preview per PR at /pr-preview/pr-<n>/
└── src/                      # ← all site source lives here
    ├── _data/
    │   └── site.js           # global data: org facts, nav, SEO defaults
    ├── _includes/
    │   ├── layouts/
    │   │   └── base.njk       # HTML shell: <head>, header, footer, scripts
    │   └── partials/
    │       ├── header.njk     # sticky banner
    │       ├── nav.njk        # primary nav (driven by site.nav)
    │       └── footer.njk     # footer: mission, contact, social
    ├── index.njk             # homepage (extends base.njk)
    ├── styles/
    │   ├── main.css          # design tokens, reset, utilities, buttons
    │   └── components/       # one BEM component per file (nav, hero, footer)
    ├── scripts/
    │   ├── main.js           # progressive enhancement ONLY
    │   └── review.js         # hidden proof-reading mode (#review), lazy-loaded
    ├── assets/
    │   └── images/           # site imagery (optimise: WebP/SVG)
    └── public/               # copied verbatim to site root
        ├── .nojekyll
        ├── robots.txt
        └── favicon.svg
```

## 6. Conventions (do this)

- **Content is baked at build time.** Never render core content with client JS
  and never use runtime web components for header/footer/nav — AI crawlers
  (GPTBot, ClaudeBot, PerplexityBot) don't run JS, so anything JS-rendered is
  invisible to them. Partials resolve at build, so this is a non-issue if you use
  them.
- **Reuse via Nunjucks partials/layouts**, never copy-paste headers/footers.
- **BEM CSS** (`block__element--modifier`), **design tokens** as CSS custom
  properties in `main.css`, **no inline styles**, one component per file in
  `styles/components/`, linked in `base.njk`.
- **JS is progressive enhancement only.** The page must be fully usable with JS
  disabled.
- **Accessibility:** semantic HTML, skip link, visible focus, ARIA only where
  semantics fall short, WCAG 2.1 AA+.
- **Site facts come from `src/_data/site.js`.** Don't hardcode the org name,
  email, address or nav in templates — reference `site.*`. Keep `site.js` in sync
  with the Usable Organization Profile fragment.
- **Faroese (`fo`) is the site language.** UI copy is Faroese.
- **Keep the legal-identity block on `/samband/`** — the "Felagsskapurin" panel
  (legal name, org type, V-tal, address) plus the English "official website of…"
  sentence. Google for Nonprofits requires the V-tal, a physical address, a
  clear mission and working social links to be openly visible **on the site**;
  the footer is not required specifically. The mission and the social links live
  in the footer, the rest on `/samband/` — between them the checklist is met, so
  do not remove either half. (Moved out of the footer Sep 2026, Hanna's call.)
- **Optimise images** (WebP/SVG, `loading="lazy"`, descriptive `alt`).

## 7. Adding a page

Create `src/<name>.njk` (or `src/<name>/index.njk` for a pretty URL) with front
matter:

```njk
---
layout: layouts/base.njk
title: Page title
description: Optional SEO description (falls back to site default)
---
<section class="section">
  <div class="container">…</div>
</section>
```

Add it to the menu by extending the `nav` array in `src/_data/site.js`.

## 8. Ownership

**Hanna owns the visual design / flair.** The scaffolding, tokens and components
here are a deliberately neutral starting point (`TODO(Hanna)` markers flag the
spots to fill in). When changing look-and-feel, prefer editing design tokens in
`main.css` so changes cascade consistently.
