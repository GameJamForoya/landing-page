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
const PATH_PREFIX =
  IS_DEV || HAS_CUSTOM_DOMAIN ? "/" : "/landing-page/";

module.exports = function (eleventyConfig) {
  // Rewrites root-relative URLs in output HTML to include PATH_PREFIX.
  eleventyConfig.addPlugin(HtmlBasePlugin);
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

  /* ---- Responsive images (build-time optimisation) ----------------------
     Usage in a template:
       {% image "src/assets/images/foo.png", "alt text", "40vw", "css-class" %}
     Generates optimised WebP + PNG at several widths into /img/ and returns a
     <picture> element. Baked at build time — no client JS, great for SEO. */
  eleventyConfig.addAsyncShortcode(
    "image",
    async function (src, alt, sizes = "100vw", className) {
      if (alt === undefined) {
        throw new Error(`Missing \`alt\` on image shortcode for: ${src}`);
      }
      const metadata = await Image(src, {
        widths: [320, 480, 640, 960],
        // webp + the source's own format (null) → PNG keeps logo transparency,
        // JPEG stays JPEG for photos. Best of both.
        formats: ["webp", null],
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
