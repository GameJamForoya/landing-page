/**
 * Thresholds for `npm run audit` (tools/audit/audit.mjs).
 *
 * "fail" thresholds break the build / PR check; "warn" thresholds are
 * reported but don't. Tighten these as the design settles — never loosen one
 * to get a PR through without saying why in the PR.
 */
export default {
  viewports: {
    mobile: { width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    desktop: { width: 1280, height: 800, deviceScaleFactor: 1 },
  },

  // axe-core rule tags. WCAG 2.1 A + AA violations FAIL; best-practice WARNs.
  axe: {
    failTags: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
    warnTags: ["best-practice"],

    // Violations already known and waiting on a decision. Matching nodes
    // (same axe rule id, inside `within`) are reported as WARN with the reason
    // instead of FAIL, so they stay visible without blocking unrelated PRs.
    // Every entry needs an owner and a reason; delete it once fixed. Adding
    // one is a loosening: say why in the PR (.claude/skills/site-audit).
    knownIssues: [
      {
        rule: "color-contrast",
        within: ".footer",
        reason:
          "Light text on brand teal #039685 tops out at 3.68:1 (needs 4.5:1). " +
          "Fix is a frame-colour decision for Hanna — see AGENTS.md §8. The " +
          "header bar uses the same teal but axe can't measure it (::before layer).",
      },
    ],
  },

  // Bytes transferred for a first visit on mobile, after scrolling the whole
  // page (so lazy images count). Deterministic, so a good hard gate.
  budgets: {
    pageTotal: { warn: 400 * 1024, fail: 800 * 1024 },
    singleImage: { warn: 150 * 1024, fail: 400 * 1024 },
    css: { warn: 60 * 1024, fail: 120 * 1024 },
    js: { warn: 30 * 1024, fail: 80 * 1024 }, // review.js is lazy, so not counted
    fonts: { warn: 150 * 1024, fail: 300 * 1024 },
  },

  // On-page SEO limits (characters).
  seo: {
    title: { min: 10, max: 60 },
    description: { min: 50, max: 160 },
    // What the homepage JSON-LD should describe (for the warning text).
    jsonLdType: "Organization/NGO",
  },

  // Lighthouse category scores (0–100), mobile preset. Performance is noisy
  // on shared CI runners, so it only warns; the byte budgets above are the
  // hard performance gate.
  lighthouse: {
    fail: { accessibility: 90, "best-practices": 90, seo: 90 },
    warn: { performance: 90, accessibility: 100, "best-practices": 100, seo: 100 },
  },
};
