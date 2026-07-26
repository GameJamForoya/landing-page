# GameJam Føroya — landing page (gj.fo)

The public website for **GameJam Føroya**, the Faroese nonprofit promoting game
culture and game development. Built as a static [Eleventy](https://www.11ty.dev/)
site and deployed to GitHub Pages.

> Working with an AI agent (Claude Code)? Read **[CLAUDE.md](./CLAUDE.md)** — it
> covers the architecture, conventions, and the paired Usable knowledge base.

## Quick start

Requires **Node.js ≥ 18** (see [`.nvmrc`](./.nvmrc)).

```bash
npm install     # install Eleventy
npm run dev     # dev server at http://localhost:8080 with live reload
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server with live reload |
| `npm run build` | Production build → `_site/` |
| `npm run clean` | Remove `_site/` |

## How it works

- **Source** lives in `src/`. Pages are Nunjucks (`.njk`) templates; shared
  header/footer/nav are build-time partials in `src/_includes/`.
- **Styles** are vanilla CSS with BEM component files and CSS custom-property
  design tokens (`src/styles/`).
- **JavaScript** is progressive enhancement only (`src/scripts/main.js`).
- **Build** compiles everything to static HTML in `_site/` (git-ignored).

## Deployment

Pushes to `main` trigger `.github/workflows/deploy.yml`, which builds the site
and publishes it to GitHub Pages. Enable it once under **Settings → Pages →
Source → "GitHub Actions"**. For the custom domain, set it in Settings → Pages
and add a `CNAME` file to `src/public/`.

## Project structure

See [CLAUDE.md §5](./CLAUDE.md#5-project-structure) for the annotated tree.

## License

MIT.
