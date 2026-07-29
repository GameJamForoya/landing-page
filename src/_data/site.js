/**
 * Global site data, available in every template as `site`.
 *
 * Single source of truth for org details, nav structure and SEO defaults so
 * partials never hardcode strings. Facts here mirror the GameJam Føroya
 * "Organization Profile" / "Standing Sponsor Application Answers" fragments in
 * the GameJam Foroyar Usable workspace (56ce96f5-f0af-4787-8bf3-ffe878522a40)
 * — keep them in sync.
 */
module.exports = {
  name: "GameJam Føroya",
  // Legal identity (see Usable "Organization Profile" fragment).
  legalName: "GameJam Føroya",
  orgType: "Áhugafelagsskapur",
  vtal: "659436",
  founded: "2022",
  address: "Lyngnesvegur 11, 660 Søldarfjørður, Føroyar",
  // The address published on the current gj.fo. NB(Hanna): the Usable sponsor
  // answer sheet still lists gamejamfo@gmail.com — confirm which is primary.
  email: "info@gj.fo",
  phone: "+298 555251",

  // Banner headline — the brand's rallying cry.
  // Split so the hero can style the final word ("Spæl") as its own statement —
  // the deliberate two-line break, and the hook for the hero easter egg.
  tagline: {
    lead: "Menn eitt",
    accent: "Spæl",
  },

  // Canonical URL — update if the Pages custom domain changes.
  url: "https://gj.fo",
  lang: "fo",

  // Default SEO copy — pages can override via front matter (title/description).
  description:
    "GameJam Føroya fremur telduspælmentan og spælmenning í Føroyum — vit skipa fyri game jams, verkstovum og fyrilestrum fyri øll, ið hava áhuga í spølum og spælgerð.",

  // Primary navigation — rendered by partials/nav.njk.
  nav: [
    { text: "Heim", url: "/" },
    { text: "Um okkum", url: "/um-okkum/" },
    { text: "Tiltøk", url: "/tiltok/" },
    { text: "Samband", url: "/samband/" },
  ],

  // Recap video (facade embed — only loads YouTube on click). Poster is
  // self-hosted at src/assets/images/event-recap-poster.jpg.
  video: {
    id: "J-FX534h40c",
    title: "Samandráttur av GameJam Føroya 2025",
  },

  // "Royn teg innan" — the nine ways to take part (from the banner).
  disciplines: [
    "Forritan",
    "Tónleikur",
    "Grafikkur",
    "Ljóð",
    "Projektleiðsla",
    "List",
    "Reglasmíð",
    "Handverk",
    "Søgulist",
  ],

  // Next event. TODO(Hanna): confirm — Usable source-of-truth says 4 Sep 2026 at
  // Skúlin á Fløtum, but the current live gj.fo shows a different (May) event.
  event: {
    name: "GameJam Føroya 2026",
    date: "Vikuskiftið, ið byrjar 11. september 2026",
    venue: "Skúlin á Fløtum, 100 Tórshavn",
    note: "48 tímar · telduspøl og borðspøl · 100% ókeypis",
  },

  // Past events, newest first — mirrors the archive on the old gj.fo site.
  // `games` links to where that jam's entries live (itch.io / globalgamejam).
  // NB: Global GameJam editions are named for the season that FOLLOWS the
  // September they were held in — that's the existing convention, kept as-is.
  pastEvents: [
    { name: "Tonik GameJam 2026", date: "", venue: "Hugskotið, Tórshavn",
      games: "https://itch.io/jam/tonik-gamejam-2026/entries" },
    { name: "Global GameJam Føroyar 2026", date: "5. september 2025", venue: "Hugskotið, Tórshavn",
      games: "https://globalgamejam.org/group/11600/games" },
    { name: "GameJam Føroya 2025", date: "2. mai 2025", venue: "Skúlin á Fløtum, Tórshavn",
      games: "https://itch.io/jam/gamejam-froya-2025/entries" },
    { name: "Tonik GameJam 2025", date: "24. januar 2025", venue: "Skúlin á Fløtum, Tórshavn",
      games: "https://itch.io/jam/tonik-gamejam-2025/entries" },
    { name: "Global GameJam Føroyar 2025", date: "6. september 2024", venue: "Fróðskaparsetrið, Tórshavn",
      games: "https://globalgamejam.org/group/11600/games" },
    { name: "GameJam Føroya 2024", date: "26. januar 2024", venue: "Skúlin á Fløtum, Tórshavn",
      games: "https://itch.io/jam/gamejam-froya-2024/entries" },
    { name: "Global GameJam Føroyar 2024", date: "8. september 2023", venue: "Fróðskaparsetrið, Tórshavn",
      games: "https://globalgamejam.org/group/81/games" },
    { name: "GameJam Føroya 2023", date: "3. februar 2023", venue: "Skúlin á Fløtum, Tórshavn",
      games: "https://itch.io/jam/gamejam-froya-2023" },
    { name: "Global GameJam Føroyar 2023", date: "9. september 2022", venue: "Fróðskaparsetrið, Tórshavn",
      games: "https://globalgamejam.org/2023/jam-sites/global-gamejam-f%C3%B8royar-2023" },
    { name: "GameJam Føroya 2022", date: "28. januar 2022", venue: "Klintra, Tórshavn",
      games: "https://itch.io/jam/gamejam-froya-2022/entries" },
    { name: "Global GameJam Føroya 2022", date: "10. september 2021", venue: "Á netinum (Discord)",
      games: "https://globalgamejam.org/2022/jam-sites/global-gamejam-f%C3%B8roya/games" },
    { name: "GameJam Føroya 2021", date: "", venue: "Klintra, Tórshavn",
      games: "https://itch.io/jam/gamejam-foroya-2021/entries" },
  ],

  // 2025 supporters (from the live gj.fo). Swap to logo images when available.
  sponsors: [
    "Klintra",
    "Formula",
    "Nema",
    "Elektron",
    "Lunnar",
    "KT Húsið",
    "Tabletop Føroyar",
  ],

  // Social / external links (from the current gj.fo footer).
  social: [
    { name: "Discord", url: "https://discord.gg/76Xs6TQWpU" },
    { name: "Facebook", url: "https://www.facebook.com/GameJamForoyar/" },
    { name: "Instagram", url: "https://www.instagram.com/gamejamforoya/" },
    { name: "Itch.io", url: "https://itch.io/jams/hosted-by-gamejamforoyar" },
  ],

  // Short mission line for the footer.
  mission:
    "GameJam Føroya fremur spælmenning og telduspælmentan í Føroyum — við árligum game jams, verkstovum og fyrilestrum, opnum fyri øllum.",

  // English legal-identity sentence. This exists for the gj.fo domain ↔ org
  // verification (Google Workspace for Nonprofits) — an English reviewer needs
  // to be able to read that this domain belongs to the registered association.
  // Do not remove without checking the Usable "Google Workspace" fragment.
  identityEn:
    "Official website of GameJam Føroya, a registered nonprofit association (áhugafelag) in the Faroe Islands.",
};
