/**
 * Stylelint — enforces the CSS half of the project standard (AGENTS.md §6,
 * .claude/skills/review-standards/SKILL.md "CSS"). Deliberately NOT
 * stylelint-config-standard: we lint for the rules we actually hold, not for
 * formatting taste.
 */
// BEM: block, block__element, block--modifier, block__element--modifier.
// Lowercase words joined by single hyphens.
const word = "[a-z][a-z0-9]*(?:-[a-z0-9]+)*";
const bem = `^${word}(?:__${word})?(?:--${word})?$`;

export default {
  plugins: ["./tools/stylelint/no-raw-colour.mjs"],
  rules: {
    // --- BEM and selector discipline -------------------------------------
    "selector-class-pattern": [
      bem,
      { message: (s) => `Class "${s}" is not BEM (block__element--modifier)` },
    ],
    "selector-max-id": [0, { message: "Style with a BEM class, not an ID" }],
    "selector-max-compound-selectors": [
      3,
      { message: "Selector too deep — give the element its own BEM class" },
    ],
    "declaration-no-important": [
      true,
      { message: "No !important (only the reduced-motion reset may use it)" },
    ],
    "at-rule-disallowed-list": [
      ["import"],
      { message: "No @import — link each stylesheet from base.njk" },
    ],

    // --- Design tokens ---------------------------------------------------
    // Colours come from custom properties so the palette lives in one place
    // (main.css :root). Declaring a token (--x: #abc) is fine; values that
    // compose tokens (gradients, color-mix of var()s) are fine. See
    // tools/stylelint/no-raw-colour.mjs.
    "gjfo/no-raw-colour": true,
    "color-named": ["never", { message: "Use a design token, not a named colour" }],

    // --- Correctness ---------------------------------------------------------
    "block-no-empty": true,
    "declaration-block-no-duplicate-properties": [
      true,
      { ignore: ["consecutive-duplicates-with-different-values"] },
    ],
    "no-duplicate-selectors": true,
    "property-no-unknown": true,
    "unit-no-unknown": true,
    "color-no-invalid-hex": true,
    "function-calc-no-unspaced-operator": true,
    "media-feature-name-no-unknown": true,
  },
};
