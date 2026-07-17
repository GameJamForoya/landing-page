/**
 * Global site data, available in every template as `site`.
 *
 * Single source of truth for org details, nav structure and SEO defaults so
 * partials never hardcode strings. Facts here mirror the GameJam Føroya
 * "Organization Profile" fragment in the GameJam Foroyar Usable workspace
 * (workspace 56ce96f5-f0af-4787-8bf3-ffe878522a40) — keep them in sync.
 */
module.exports = {
  name: "GameJam Føroya",
  // Legal identity (see Usable "Organization Profile" fragment).
  legalName: "GameJam Føroya",
  orgType: "Felagsskapur (nonprofit association)",
  vtal: "659436",
  founded: "2022",
  address: "Lyngnesvegur 11, 660 Søldarfjørður, Føroyar",
  email: "gamejamfo@gmail.com",

  // Canonical URL — update if the Pages custom domain changes.
  url: "https://gj.fo",
  lang: "fo",

  // Default SEO copy — pages can override via front matter (title/description).
  description:
    "GameJam Føroya fremur telduspælmentan og spælmenning í Føroyum — vit skipa fyri game jams og tiltøkum fyri øll, ið hava áhuga í spølum og spælgerð.",

  // Primary navigation — rendered by partials/nav.njk.
  nav: [
    { text: "Heim", url: "/" },
    { text: "Um okkum", url: "/#about" },
    { text: "Tiltøk", url: "/#events" },
    { text: "Stuðlar", url: "/#sponsors" },
    { text: "Samband", url: "/#contact" },
  ],

  // Social / external links — empty by default; fill in as they come online.
  social: {
    // facebook: "https://facebook.com/...",
    // instagram: "https://instagram.com/...",
    // discord: "https://discord.gg/...",
  },
};
