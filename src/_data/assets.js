/**
 * Asset availability flags, available in templates as `assets`.
 * Re-evaluated on every build so dropping the logo file in makes the hero
 * and favicon light up automatically (no code change needed).
 */
const fs = require("fs");

module.exports = () => ({
  // True once Hanna drops the logo at src/assets/images/gamejam-logo.png
  hasLogo: fs.existsSync("src/assets/images/gamejam-logo.png"),
});
