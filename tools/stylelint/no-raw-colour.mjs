/**
 * gjfo/no-raw-colour — colours come from design tokens.
 *
 * Flags a raw colour literal (hex, or an rgb()/hsl()/hwb()/lab()/lch()/
 * oklab()/oklch() call) in any real property value. Declaring a token
 * (`--x: #abc`) is fine, and so is any value that *composes* tokens:
 * `linear-gradient(var(--a), var(--b))` and
 * `color-mix(in srgb, var(--a) 40%, transparent)` pass, while
 * `color-mix(in srgb, var(--a) 8%, #fff)` fails on the `#fff`.
 *
 * Why not stylelint-declaration-strict-value: it requires the *whole* value to
 * be a single var(), so it also rejects gradients and color-mix() built from
 * tokens, which are exactly how this stylesheet derives its shades.
 */
import stylelint from "stylelint";

const ruleName = "gjfo/no-raw-colour";
const messages = stylelint.utils.ruleMessages(ruleName, {
  rejected: (prop, literal) =>
    `Use a design token (var(--…)) for "${prop}", not the raw colour "${literal}"`,
});

const RAW = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/gi;

const rule = (enabled) => (root, result) => {
  if (!enabled) return;
  root.walkDecls((decl) => {
    if (decl.prop.startsWith("--")) return; // token declarations
    // Ignore url(...) and quoted strings, which may legitimately contain "#".
    const value = decl.value.replace(/url\([^)]*\)/gi, "").replace(/(["']).*?\1/g, "");
    for (const m of value.matchAll(RAW)) {
      const literal = m[0].endsWith("(")
        ? value.slice(m.index, value.indexOf(")", m.index) + 1)
        : m[0];
      stylelint.utils.report({
        ruleName, result, node: decl, word: m[0],
        message: messages.rejected(decl.prop, literal),
      });
    }
  });
};
rule.ruleName = ruleName;
rule.messages = messages;

export default stylelint.createPlugin(ruleName, rule);
