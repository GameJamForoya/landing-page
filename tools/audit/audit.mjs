#!/usr/bin/env node
/**
 * Site quality audit: accessibility, page weight, SEO, links, no-JS and
 * Lighthouse scores for every built page.
 *
 *   npm run audit                    # full audit (incl. Lighthouse)
 *   npm run audit -- --no-lighthouse # fast: everything except Lighthouse
 *   npm run audit -- --page /um-okkum/  # only pages whose URL starts with this
 *
 * Builds the site with PATH_PREFIX=/ into _site/, serves it on localhost,
 * drives the locally installed Chrome (no browser download), and writes
 * _audit/report.md + _audit/report.json. Exits 1 if any FAIL.
 * Thresholds: tools/audit/config.mjs. How to read the report:
 * .claude/skills/site-audit/SKILL.md.
 */
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as chromeLauncher from "chrome-launcher";
import puppeteer from "puppeteer-core";
import config from "./config.mjs";

const require = createRequire(import.meta.url);
const ROOT = resolve(fileURLToPath(import.meta.url), "../../..");
const SITE = join(ROOT, "_site");
const OUT = join(ROOT, "_audit");
const args = process.argv.slice(2);
const WITH_LIGHTHOUSE = !args.includes("--no-lighthouse");
const PAGE_FILTER = args.includes("--page") ? args[args.indexOf("--page") + 1] : null;

const results = []; // { page, area, level: FAIL|WARN|INFO, message }
const scores = {}; // page -> { category: score }
const weights = {}; // page -> { total, byType }
const add = (page, area, level, message) => results.push({ page, area, level, message });
const kb = (n) => `${Math.round(n / 1024)} KB`;

// ---- 1. Build ---------------------------------------------------------------
console.log("› Building (PATH_PREFIX=/)…");
const build = spawnSync("npx", ["--no-install", "eleventy"], {
  cwd: ROOT,
  env: { ...process.env, PATH_PREFIX: "/" },
  encoding: "utf8",
});
if (build.status !== 0) {
  console.error(build.stdout, build.stderr);
  process.exit(1);
}
const site = require(join(ROOT, "src/_data/site.js"));
const PRELAUNCH = !!site.prelaunch;

// ---- 2. Serve _site/ --------------------------------------------------------
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".avif": "image/avif", ".woff2": "font/woff2", ".txt": "text/plain",
  ".xml": "application/xml", ".json": "application/json", ".ico": "image/x-icon",
};
function resolveFile(urlPath) {
  let p = decodeURIComponent(urlPath.split(/[?#]/)[0]);
  let file = join(SITE, p);
  if (!file.startsWith(SITE)) return null;
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  return existsSync(file) ? file : null;
}
const server = createServer((req, res) => {
  const file = resolveFile(req.url);
  if (!file) { res.writeHead(404); res.end("Not found"); return; }
  res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream" });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const BASE = `http://127.0.0.1:${server.address().port}`;

// ---- 3. Pages -----------------------------------------------------------------
const walk = (d) => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const pages = walk(SITE)
  .filter((f) => f.endsWith(".html"))
  .map((f) => "/" + relative(SITE, f).replace(/index\.html$/, "").replace(/\\/g, "/"))
  .filter((u) => !PAGE_FILTER || u.startsWith(PAGE_FILTER))
  .sort();
console.log(`› ${pages.length} page(s): ${pages.join(", ")}`);

// ---- 4. Static checks: SEO + links (no browser needed) -------------------------
const attr = (tag, name) => (tag.match(new RegExp(`\\s${name}\\s*=\\s*"([^"]*)"`, "i")) || [])[1];
for (const url of pages) {
  const html = readFileSync(resolveFile(url), "utf8");
  const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]);
  const meta = (key) => {
    const tag = metas.find((t) => attr(t, "name") === key || attr(t, "property") === key);
    return tag ? attr(tag, "content") : undefined;
  };
  const title = ((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || "").trim();
  const desc = meta("description") || "";
  const { title: tl, description: dl } = config.seo;
  if (!title) add(url, "seo", "FAIL", "missing <title>");
  else if (title.length < tl.min || title.length > tl.max)
    add(url, "seo", "WARN", `title is ${title.length} chars (aim ${tl.min}–${tl.max}): "${title}"`);
  if (!desc) add(url, "seo", "FAIL", "missing meta description");
  else if (desc.length < dl.min || desc.length > dl.max)
    add(url, "seo", "WARN", `description is ${desc.length} chars (aim ${dl.min}–${dl.max})`);
  const canonical = (html.match(/<link\b[^>]*rel="canonical"[^>]*>/i) || [])[0];
  if (!canonical) add(url, "seo", "FAIL", "missing canonical link");
  else if (!/^https:\/\//.test(attr(canonical, "href") || ""))
    add(url, "seo", "FAIL", `canonical is not an absolute https URL: ${attr(canonical, "href")}`);
  if (!/<html\b[^>]*\slang="[^"]+"/i.test(html)) add(url, "seo", "FAIL", "missing <html lang>");
  for (const k of ["og:title", "og:description", "og:url"])
    if (!meta(k)) add(url, "seo", "FAIL", `missing ${k}`);
  if (!meta("og:image")) add(url, "seo", "WARN", "no og:image — shared links get no preview picture");
  const noindex = /noindex/.test(meta("robots") || "");
  if (!PRELAUNCH && noindex && !url.startsWith("/demos/"))
    add(url, "seo", "FAIL", "page is noindex after launch");
  if (url === "/" && !/application\/ld\+json/.test(html))
    add(url, "seo", "WARN", `no JSON-LD structured data (${config.seo.jsonLdType}) on the homepage`);

  // Internal links and assets must resolve.
  const refs = [...html.matchAll(/\s(?:href|src)="([^"]+)"/g)].map((m) => m[1])
    .concat([...html.matchAll(/\ssrcset="([^"]+)"/g)]
      .flatMap((m) => m[1].split(",").map((s) => s.trim().split(/\s+/)[0])));
  for (const ref of new Set(refs)) {
    if (/^(https?:|mailto:|tel:|#|data:|javascript:)/.test(ref) || ref.startsWith("//")) continue;
    const target = ref.startsWith("/") ? ref : new URL(ref, BASE + url).pathname;
    if (!resolveFile(target)) add(url, "links", "FAIL", `broken internal link: ${ref}`);
  }
}
if (!existsSync(join(SITE, "robots.txt"))) add("(site)", "seo", "FAIL", "no robots.txt");
if (!existsSync(join(SITE, "sitemap.xml")))
  add("(site)", "seo", PRELAUNCH ? "WARN" : "FAIL", "no sitemap.xml");
if (PRELAUNCH) add("(site)", "seo", "INFO", "site.prelaunch is true — every page is noindex by design");

// ---- 5. Browser checks: axe, weight, no-JS ---------------------------------------
console.log("› Launching Chrome…");
const chrome = await chromeLauncher.launch({
  chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
});
const browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${chrome.port}` });
const AXE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

async function scrollToBottom(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight / 2) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
}

for (const url of pages) {
  console.log(`› ${url}`);

  // axe on both viewports
  for (const [vpName, vp] of Object.entries(config.viewports)) {
    const page = await browser.newPage();
    await page.setViewport(vp);
    await page.goto(BASE + url, { waitUntil: "networkidle0" });
    await page.addScriptTag({ content: AXE });
    const { failTags, warnTags, knownIssues = [] } = config.axe;
    const res = await page.evaluate(async (tags, known) => {
      const r = await window.axe.run(document, { runOnly: { type: "tag", values: tags }, resultTypes: ["violations"] });
      // Tag each failing node with the known issue (config.axe.knownIssues)
      // it falls under, if any: same rule id and inside the `within` element.
      for (const v of r.violations)
        for (const n of v.nodes) {
          const el = document.querySelector(n.target[0]);
          const k = known.findIndex((ki) => ki.rule === v.id && el && el.closest(ki.within));
          n.known = k;
        }
      return r;
    }, [...failTags, ...warnTags], knownIssues);
    for (const v of res.violations) {
      const isFail = v.tags.some((t) => failTags.includes(t));
      const fresh = v.nodes.filter((n) => n.known < 0);
      const knownNodes = v.nodes.filter((n) => n.known >= 0);
      if (fresh.length) {
        const targets = fresh.slice(0, 3).map((n) => n.target.join(" ")).join(" | ");
        add(url, `a11y (${vpName})`, isFail ? "FAIL" : "WARN",
          `${v.id} [${v.impact}] ${v.help} — ${fresh.length} element(s): ${targets} (${v.helpUrl})`);
      }
      // Known issues still show, as WARNs naming the decision they wait on —
      // so they stay visible without turning every PR red.
      for (const k of [...new Set(knownNodes.map((n) => n.known))]) {
        const ki = knownIssues[k];
        const count = knownNodes.filter((n) => n.known === k).length;
        add(url, `a11y (${vpName})`, "WARN",
          `KNOWN ${v.id} [${v.impact}] in ${ki.within} — ${count} element(s). ${ki.reason}`);
      }
    }
    await page.close();
  }

  // Page weight on mobile, first visit, lazy images included
  {
    const page = await browser.newPage();
    await page.setViewport(config.viewports.mobile);
    await page.setCacheEnabled(false);
    const cdp = await page.createCDPSession();
    await cdp.send("Network.enable");
    const reqs = new Map();
    cdp.on("Network.responseReceived", (e) => reqs.set(e.requestId, { type: e.type, url: e.response.url, bytes: 0 }));
    cdp.on("Network.loadingFinished", (e) => { const r = reqs.get(e.requestId); if (r) r.bytes = e.encodedDataLength; });
    await page.goto(BASE + url, { waitUntil: "networkidle0" });
    await scrollToBottom(page);
    await new Promise((r) => setTimeout(r, 500));
    const byType = { Document: 0, Stylesheet: 0, Script: 0, Image: 0, Font: 0, Other: 0 };
    let total = 0;
    for (const r of reqs.values()) {
      total += r.bytes;
      byType[byType[r.type] !== undefined ? r.type : "Other"] += r.bytes;
      if (r.type === "Image") {
        const b = config.budgets.singleImage;
        const name = r.url.replace(BASE, "");
        if (r.bytes > b.fail) add(url, "weight", "FAIL", `image ${name} is ${kb(r.bytes)} (fail > ${kb(b.fail)})`);
        else if (r.bytes > b.warn) add(url, "weight", "WARN", `image ${name} is ${kb(r.bytes)} (aim ≤ ${kb(b.warn)})`);
      }
    }
    weights[url] = { total, byType };
    const check = (label, n, b) => {
      if (n > b.fail) add(url, "weight", "FAIL", `${label} ${kb(n)} (fail > ${kb(b.fail)})`);
      else if (n > b.warn) add(url, "weight", "WARN", `${label} ${kb(n)} (aim ≤ ${kb(b.warn)})`);
    };
    const B = config.budgets;
    check("page total", total, B.pageTotal);
    check("CSS", byType.Stylesheet, B.css);
    check("JS", byType.Script, B.js);
    check("fonts", byType.Font, B.fonts);
    await page.close();
  }

  // No-JS: every nav link must be visible, on-screen and actually on top
  // (not covered by the header) on mobile. Uses the DevTools protocol, which
  // works with page JS disabled. A bounding box alone is not enough: a menu
  // with `visibility: hidden` tucked behind the header still has one.
  {
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setViewport(config.viewports.mobile);
    await page.goto(BASE + url, { waitUntil: "load" });
    const cdp = await page.createCDPSession();
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable");
    const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
    const parent = new Map();
    (function index(node) {
      for (const c of node.children || []) { parent.set(c.nodeId, node.nodeId); index(c); }
    })(root);
    const { nodeIds } = await cdp.send("DOM.querySelectorAll", { nodeId: root.nodeId, selector: "nav a" });
    const vw = config.viewports.mobile.width, vh = config.viewports.mobile.height;
    const problems = [];
    for (const id of nodeIds) {
      const { computedStyle } = await cdp.send("CSS.getComputedStyleForNode", { nodeId: id });
      const style = Object.fromEntries(computedStyle.map((p) => [p.name, p.value]));
      const label = (await cdp.send("DOM.getOuterHTML", { nodeId: id })).outerHTML
        .replace(/<[^>]+>/g, "").trim().slice(0, 30);
      if (style.visibility !== "visible" || style.display === "none" || style.opacity === "0") {
        problems.push(`"${label}" is ${style.display === "none" ? "display:none" : style.visibility !== "visible" ? `visibility:${style.visibility}` : "opacity:0"}`);
        continue;
      }
      let box;
      try { ({ model: box } = await cdp.send("DOM.getBoxModel", { nodeId: id })); } catch { box = null; }
      if (!box) { problems.push(`"${label}" has no layout box`); continue; }
      const xs = box.border.filter((_, i) => i % 2 === 0), ys = box.border.filter((_, i) => i % 2 === 1);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      if (cx < 0 || cy < 0 || cx > vw || cy > vh) { problems.push(`"${label}" is off-screen`); continue; }
      const hit = await cdp.send("DOM.getNodeForLocation", { x: Math.round(cx), y: Math.round(cy) });
      let n = hit.nodeId, covered = true;
      while (n) { if (n === id) { covered = false; break; } n = parent.get(n); }
      if (covered) problems.push(`"${label}" is covered by another element`);
    }
    if (problems.length)
      add(url, "no-js", "FAIL", `nav unusable on mobile with JS off: ${problems.join("; ")}`);
    await page.close();
  }
}
await browser.disconnect();

// ---- 6. Lighthouse ---------------------------------------------------------------
if (WITH_LIGHTHOUSE) {
  const { default: lighthouse } = await import("lighthouse");
  for (const url of pages) {
    console.log(`› Lighthouse ${url}`);
    const run = await lighthouse(BASE + url, {
      port: chrome.port,
      output: "json",
      logLevel: "error",
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
      // While prelaunch, noindex is intentional — don't let it sink the score.
      skipAudits: PRELAUNCH || url.startsWith("/demos/") ? ["is-crawlable"] : [],
    });
    const cats = run.lhr.categories;
    scores[url] = Object.fromEntries(Object.entries(cats).map(([k, c]) => [k, Math.round(c.score * 100)]));
    for (const [k, s] of Object.entries(scores[url])) {
      const f = config.lighthouse.fail[k], w = config.lighthouse.warn[k];
      if (f !== undefined && s < f) add(url, `lighthouse`, "FAIL", `${k} ${s} (fail < ${f})`);
      else if (w !== undefined && s < w) {
        const failing = cats[k].auditRefs
          .map((r) => run.lhr.audits[r.id])
          .filter((a) => a.score !== null && a.score < 1 && a.scoreDisplayMode !== "informative" && a.scoreDisplayMode !== "notApplicable")
          .slice(0, 4).map((a) => a.title).join("; ");
        add(url, "lighthouse", "WARN", `${k} ${s} (aim ≥ ${w})${failing ? ` — ${failing}` : ""}`);
      }
    }
  }
}
await chrome.kill();
server.close();

// ---- 7. Report -------------------------------------------------------------------
const order = { FAIL: 0, WARN: 1, INFO: 2 };
results.sort((a, b) => order[a.level] - order[b.level] || a.page.localeCompare(b.page));
const n = (lvl) => results.filter((r) => r.level === lvl).length;
const fails = n("FAIL"), warns = n("WARN");
const icon = { FAIL: "❌", WARN: "⚠️", INFO: "ℹ️" };

let md = `## Site audit ${fails ? "❌" : "✅"}\n\n`;
md += `**${fails} fail · ${warns} warn** · ${pages.length} page(s)` +
  `${PRELAUNCH ? " · prelaunch (noindex by design)" : ""}` +
  `${WITH_LIGHTHOUSE ? "" : " · Lighthouse skipped"}\n\n`;
md += `| Page | Weight (mobile) | ${WITH_LIGHTHOUSE ? "Perf | A11y | Best pr. | SEO |" : ""}\n`;
md += `|---|---|${WITH_LIGHTHOUSE ? "---|---|---|---|" : ""}\n`;
for (const url of pages) {
  const s = scores[url] || {};
  md += `| \`${url}\` | ${weights[url] ? kb(weights[url].total) : "—"} |` +
    (WITH_LIGHTHOUSE ? ` ${s.performance ?? "—"} | ${s.accessibility ?? "—"} | ${s["best-practices"] ?? "—"} | ${s.seo ?? "—"} |` : "") + "\n";
}
md += "\n";
if (results.length) {
  md += "| | Page | Area | Finding |\n|---|---|---|---|\n";
  for (const r of results)
    md += `| ${icon[r.level]} | \`${r.page}\` | ${r.area} | ${r.message.replace(/\|/g, "\\|")} |\n`;
} else {
  md += "No findings.\n";
}
md += "\n<sub>Automated checks catch roughly a third to half of real accessibility problems — " +
  "keyboard, screen-reader and content checks still need a person. " +
  "Thresholds: `tools/audit/config.mjs` · guide: `.claude/skills/site-audit/SKILL.md`</sub>\n";

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "report.md"), md);
writeFileSync(join(OUT, "report.json"), JSON.stringify({ pages, results, scores, weights, prelaunch: PRELAUNCH }, null, 2));

console.log("");
for (const r of results) console.log(`${r.level.padEnd(4)} ${r.page} [${r.area}] ${r.message}`);
console.log(`\n${fails} FAIL, ${warns} WARN — report: _audit/report.md`);
process.exit(fails ? 1 : 0);
