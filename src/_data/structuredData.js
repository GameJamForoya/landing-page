/**
 * schema.org structured data for the homepage (rendered as JSON-LD by
 * base.njk). Built entirely from site.js, so the facts live in one place —
 * never hand-edit them here.
 */
const site = require("./site.js");

module.exports = {
  "@context": "https://schema.org",
  "@type": "NGO",
  name: site.name,
  legalName: site.legalName,
  url: site.url,
  logo: `${site.url}/img/favicon-512.png`,
  description: site.description,
  email: site.email,
  telephone: site.phone,
  foundingDate: site.foundingDate,
  address: { "@type": "PostalAddress", ...site.postalAddress },
  sameAs: site.social.map((s) => s.url),
};
