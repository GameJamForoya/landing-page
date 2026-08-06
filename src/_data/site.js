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
  // Keep the trailing "Føroyar". It reads as redundant in Faroese — a
  // proof-reader flagged it twice (issue #4, notes 5 + 10) — but the country
  // has to be visible in the address for the Google for Nonprofits
  // verification, which has complained about its absence before. It stays.
  address: "Lygnesvegur 11, 660 Søldarfjørður, Føroyar",
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
    "GameJam Føroya fremur telduspælmentan og spælmenning í Føroyum — vit skipa fyri game jams, verkstovum og fyrilestrum fyri øll, ið eru áhugað í spølum og spælmenning.",

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
    date: "Vikuskiftið 11.–13. september 2026",
    venue: "Skúlin á Fløtum, 100 Tórshavn",
    note: "48 tímar · telduspøl og borðspøl · 100% ókeypis",
    // Google Form for this event. Clear it when sign-ups close — the CTA then
    // falls back to the contact page.
    signupUrl:
      "https://docs.google.com/forms/d/e/1FAIpQLSeEnwnvlHlyZ4iM-pn5g5F91TSqQUN3P-gFUYn3TRAUXEpdtg/viewform",
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

  // Confirmed supporters for the current event.
  //
  // ONLY list sponsors who have actually said yes. Asked-but-unanswered
  // companies must not appear here — publishing a logo before the sponsorship
  // is agreed misrepresents them. Add each one as its confirmation lands, and
  // clear the list back out when the next event's round of asks begins.
  // Awaiting a reply for 2026: Klintra, Formula, Nema, Elektron, Lunnar,
  // Tabletop Føroyar, Posta, Vinnuframi, BankNordik, PM — see the "GameJam
  // Føroyar Sponsors" sheet in Drive for live status.
  //
  // `logo` is a source path handed to the `image` shortcode, which bakes an
  // optimised WebP/SVG into /img/ at build time; a sponsor without one falls
  // back to a plain name chip. Set `boxed` when the artwork carries its own
  // background tile — those scale down slightly so they don't optically
  // outweigh the flat wordmarks. Sources live in Drive under "Sponsor Logos/".
  sponsors: [
    // Confirmed 20 July 2026 by Hans Blaasvær (hans@kthusid.fo) — kr. 5.000.
    { name: "KT Húsið", logo: "src/assets/images/sponsors/kt-husid.png" },
    // Confirmed 16 July 2026 by SMS (studul@sms.fo) — kr. 5.000 gift card.
    // They sponsor under the Miklagarður brand, which is why that, not "SMS",
    // is the name shown.
    {
      name: "Miklagarður",
      logo: "src/assets/images/sponsors/miklagardur.svg",
      boxed: true,
    },
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
    "GameJam Føroya fremur spælmenning og telduspælmentan í Føroyum — við árligum game jams, verkstovum og fyrilestrum. Øll eru vælkomin.",

  // English legal-identity sentence. This exists for the gj.fo domain ↔ org
  // verification (Google Workspace for Nonprofits) — an English reviewer needs
  // to be able to read that this domain belongs to the registered association.
  // Do not remove without checking the Usable "Google Workspace" fragment.
  identityEn:
    "Official website of GameJam Føroya, a registered nonprofit association (áhugafelag) in the Faroe Islands.",
};
