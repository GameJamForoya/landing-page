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
module.exports = function (eleventyConfig) {
  // Copy static assets straight through to the output, unprocessed.
  eleventyConfig.addPassthroughCopy({ "src/styles": "styles" });
  eleventyConfig.addPassthroughCopy({ "src/scripts": "scripts" });
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

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
    // Let plain .html files flow through the Nunjucks engine so partials work in them too.
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
    templateFormats: ["njk", "html", "md"],
  };
};
