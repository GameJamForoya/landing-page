/**
 * Eleventy configuration for the GameJam Føroya landing page (gj.fo).
 *
 * Philosophy (from the Usable "gj.fo Rebuild — Eleventy" architecture decision):
 *   - 100% static HTML output, baked in at build time for maximum SEO.
 *   - Zero client-side JS required; JS is progressive enhancement only.
 *   - Build-time DRY partials (header/footer/nav) via Nunjucks includes.
 *   - Keeps the Orlando Studio vanilla HTML/CSS/JS + BEM conventions intact.
 *
 * We keep this config intentionally lean: everything under `src/` is the site,
 * `styles/`, `scripts/` and `assets/` are copied through untouched, and the
 * compiled site lands in `_site/` (which GitHub Actions publishes to Pages).
 */
const fs = require("fs");
const Image = require("@11ty/eleventy-img");
const { HtmlBasePlugin } = require("@11ty/eleventy");

// The one logo source Hanna drops in; everything else is generated from it.
const LOGO_SRC = "src/assets/images/gamejam-logo.png";

/* ---- Base path (makes the build portable) -----------------------------
   The site uses root-absolute links, so the base path must match wherever
   it is served. We derive it automatically:
     · dev server (localhost)     → "/"            (served at root)
     · custom domain (CNAME set)  → "/"            (gj.fo, served at root)
     · plain GitHub project page  → "/landing-page/" (served in a subfolder)
   So the same repo renders correctly on localhost, on the github.io project
   URL, AND on gj.fo — with no manual switch. Adding src/public/CNAME (the
   gj.fo cutover) flips it to root automatically. */
const IS_DEV =
  process.env.ELEVENTY_RUN_MODE === "serve" ||
  process.env.ELEVENTY_RUN_MODE === "watch";
const HAS_CUSTOM_DOMAIN = fs.existsSync("src/public/CNAME");
/* PATH_PREFIX escape hatch — used by the PR preview build, which is served from
   a nested folder of a *different* repo's Pages site
   (gamejamforoya.github.io/landing-page-preview/pr-preview/pr-N/). Without an
   override the CNAME above forces "/", every root-absolute /styles and /img URL
   resolves to that host's root, and the preview renders unstyled with no images.
   See .github/workflows/pr-preview.yml. */
const PATH_PREFIX =
  process.env.PATH_PREFIX || (IS_DEV || HAS_CUSTOM_DOMAIN ? "/" : "/landing-page/");

// Preview builds are throwaway copies of the real site on a public host, so
// they are marked noindex (see base.njk) to keep them out of gj.fo's search
// results. Set by the preview workflow.
const IS_PREVIEW = process.env.PREVIEW_BUILD === "1";

module.exports = function (eleventyConfig) {
  // Rewrites root-relative URLs in output HTML to include PATH_PREFIX.
  eleventyConfig.addPlugin(HtmlBasePlugin);

  // Lets base.njk add <meta name="robots" content="noindex"> on preview builds.
  eleventyConfig.addGlobalData("isPreview", IS_PREVIEW);
  // Copy static assets straight through to the output, unprocessed.
  eleventyConfig.addPassthroughCopy({ "src/styles": "styles" });
  eleventyConfig.addPassthroughCopy({ "src/scripts": "scripts" });
  // NB: src/assets holds image *sources* only — they are optimised into /img/
  // by eleventy-img (the `image` shortcode + favicon step), so we deliberately
  // do NOT passthrough-copy them (avoids shipping the multi-MB source files).
  // Exception: the pixel-art ship ships verbatim — it's 1.6 KB already, and
  // resampling it would blur the pixels.
  eleventyConfig.addPassthroughCopy({
    "src/assets/images/space_ship.png": "img/space_ship.png",
  });

  /* ---- Sponsor tiers ----------------------------------------------------
     Groups site.sponsors into one array per `tier`, ascending, preserving the
     order written in site.js within each tier. The template renders one
     centred row per group, so a sponsor's contribution reads off the page
     without any hardcoded row counts — add a sponsor with a tier and the
     layout follows. Anything without a tier sorts to the bottom. */
  eleventyConfig.addFilter("byTier", (sponsors = []) => {
    const tiers = [...new Set(sponsors.map((s) => s.tier ?? Infinity))].sort(
      (a, b) => a - b
    );
    return tiers.map((t) =>
      sponsors.filter((s) => (s.tier ?? Infinity) === t)
    );
  });

  /* ---- Responsive images (build-time optimisation) ----------------------
     Usage in a template:
       {% image "src/assets/images/foo.png", "alt text", "40vw", "css-class" %}
     Generates optimised WebP + PNG at several widths into /img/ and returns a
     <picture> element. Baked at build time — no client JS, great for SEO. */
  eleventyConfig.addAsyncShortcode(
    "image",
    async function (src, alt, sizes = "100vw", className, widths) {
      if (alt === undefined) {
        throw new Error(`Missing \`alt\` on image shortcode for: ${src}`);
      }
      // Vector sources ship as-is: rasterising an SVG to fixed widths would
      // throw away the one thing it is good at. `svgShortCircuit` makes
      // eleventy-img copy the file through and skip the raster variants.
      const isSvg = src.toLowerCase().endsWith(".svg");
      const metadata = await Image(src, {
        // Up to 2048 — the native width of the event photos — so a full-bleed
        // banner on a wide, high-DPI screen uses every pixel the source has
        // instead of stretching a smaller variant. Callers can override for
        // small fixed-size art (logos), where generating 2048px variants of a
        // 5000px source is pure waste.
        widths: isSvg ? ["auto"] : widths || [320, 480, 640, 960, 1280, 1920, 2048],
        // The source JPEGs are already fairly compressed (~0.12 bytes/px), so
        // re-encoding at a default quality visibly compounds their artefacts.
        // A little more headroom keeps large photos from going crunchy.
        sharpWebpOptions: { quality: 86 },
        sharpJpegOptions: { quality: 84, mozjpeg: true },
        // webp + the source's own format (null) → PNG keeps logo transparency,
        // JPEG stays JPEG for photos. Best of both.
        formats: isSvg ? ["svg"] : ["webp", null],
        svgShortCircuit: isSvg,
        outputDir: "./_site/img/",
        urlPath: "/img/",
      });
      return Image.generateHTML(metadata, {
        alt,
        sizes,
        loading: "lazy",
        decoding: "async",
        ...(className ? { class: className } : {}),
      });
    }
  );

  /* ---- Favicon generation ----------------------------------------------
     If the logo source exists, bake favicon PNGs with stable names into
     /img/. Guarded so the build works fine before the file is supplied. */
  eleventyConfig.on("eleventy.before", async () => {
    if (!fs.existsSync(LOGO_SRC)) return;
    await Image(LOGO_SRC, {
      widths: [32, 180, 512],
      formats: ["png"],
      outputDir: "./_site/img/",
      urlPath: "/img/",
      filenameFormat: (id, source, width, format) => `favicon-${width}.${format}`,
    });
  });

  eleventyConfig.addWatchTarget("src/assets/");

  // Root-level files that need to ship verbatim (favicon, robots, .nojekyll, CNAME…).
  eleventyConfig.addPassthroughCopy({ "src/public": "." });

  // Rebuild the browser when CSS/JS change, even though they're passthrough copies.
  eleventyConfig.addWatchTarget("src/styles/");
  eleventyConfig.addWatchTarget("src/scripts/");

  // Handy year shortcode for footers etc. — avoids hardcoding a stale year.
  eleventyConfig.addShortcode("year", () => `${new Date().getFullYear()}`);

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    pathPrefix: PATH_PREFIX,
    // Let plain .html files flow through the Nunjucks engine so partials work in them too.
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
    templateFormats: ["njk", "html", "md"],
  };
};
