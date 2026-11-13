/**
 * html-validate — runs on the BUILT pages in _site/ (templates are hard to
 * lint; their output isn't). Recommended + a11y presets.
 */
export default {
  extends: ["html-validate:recommended", "html-validate:a11y"],
  rules: {
    // Formatting is not a standard we enforce.
    "no-trailing-whitespace": "off",
    "void-style": "off",
    "attribute-boolean-style": "off",
    // Inline styles are banned by the project standard.
    "no-inline-style": "error",
    // `role="list"` on <ul> is deliberate: Safari/VoiceOver drops list
    // semantics from lists styled with `list-style: none`. The rule can't
    // tell that apart from a genuinely redundant role, so it is off; the
    // review skill covers redundant landmark roles instead.
    "no-redundant-role": "off",
  },
};
