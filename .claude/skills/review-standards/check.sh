#!/usr/bin/env bash
# Mechanical standards checks for the GameJam Føroya landing page (gj.fo).
# Used by the review-standards skill (SKILL.md, same folder). Run from anywhere:
#   bash .claude/skills/review-standards/check.sh
# Wipes _site/, does a production build (no dev base path), then inspects the
# sources and the output. Prints PASS / WARN / FAIL lines; exits 1 on any FAIL.
set -uo pipefail

ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
cd "$ROOT"

echo "== Production build (from a wiped _site/) =="
rm -rf _site
BUILD_LOG="$(mktemp)"
if ! npx --no-install eleventy >"$BUILD_LOG" 2>&1; then
  echo "FAIL build — see $BUILD_LOG"
  tail -20 "$BUILD_LOG"
  exit 1
fi
echo "PASS build"

LINT_FAIL=0
echo ""
echo "== Stylelint (BEM, colour tokens, no !important/@import/IDs) =="
if npx --no-install stylelint "src/styles/**/*.css"; then echo "PASS stylelint"; else echo "FAIL stylelint (see above)"; LINT_FAIL=1; fi
echo ""
echo "== html-validate (built pages) =="
if npx --no-install html-validate "_site/**/*.html"; then echo "PASS html-validate"; else echo "FAIL html-validate (see above)"; LINT_FAIL=1; fi

python3 -I - "$ROOT" <<'PY'
import os, re, sys, subprocess
from html.parser import HTMLParser

root = sys.argv[1]
os.chdir(root)
fails = warns = 0

def fail(msg):
    global fails; fails += 1; print("FAIL", msg)
def warn(msg):
    global warns; warns += 1; print("WARN", msg)
def ok(msg):
    print("PASS", msg)

tracked = subprocess.run(["git", "ls-files", "--cached", "--others", "--exclude-standard"],
                         capture_output=True, text=True).stdout.split()
def files(prefix, exts):
    return [f for f in tracked if f.startswith(prefix) and f.endswith(exts) and os.path.exists(f)]

# ---- Repo hygiene --------------------------------------------------------
print("\n== Repo hygiene ==")
committed = subprocess.run(["git", "ls-files"], capture_output=True, text=True).stdout.split()
bad = [f for f in committed if f.startswith(("_site/", "node_modules/"))]
fail(f"build output / deps committed: {bad[:5]}") if bad else ok("_site/ and node_modules/ not committed")

claude = open("CLAUDE.md", encoding="utf-8").read()
if "@AGENTS.md" not in claude or len(claude.splitlines()) > 15:
    fail("CLAUDE.md must only import AGENTS.md (@AGENTS.md), not carry its own instructions")
else:
    ok("CLAUDE.md imports AGENTS.md")

nvmrc = open(".nvmrc").read().strip()
wf = open(".github/workflows/deploy.yml").read()
if "node-version-file: .nvmrc" not in wf:
    fail("deploy.yml should read the Node version from .nvmrc (node-version-file)")
else:
    ok(f"CI Node version follows .nvmrc ({nvmrc})")

site = subprocess.run(["node", "-e", "const s=require('./src/_data/site.js');console.log(JSON.stringify({prelaunch:!!s.prelaunch,url:s.url}))"],
                      capture_output=True, text=True)
import json
site = json.loads(site.stdout or '{"prelaunch": false, "url": ""}')

# ---- Templates -----------------------------------------------------------
print("\n== Templates ==")
templates = files("src/", (".njk", ".html", ".md"))
for f in templates:
    src = open(f, encoding="utf-8").read()
    for m in re.finditer(r'\sstyle\s*=\s*["\']', src):
        fail(f"inline style attribute: {f}:{src[:m.start()].count(chr(10)) + 1}")
    # JSON-LD is data, not script, so it's allowed inline.
    for m in re.finditer(r'<script(?![^>]*\b(?:src=|type="application/ld\+json"))[^>]*>', src):
        fail(f"inline <script> block: {f}:{src[:m.start()].count(chr(10)) + 1}")
    for m in re.finditer(r'(?:href|src)\s*=\s*["\'](?:\.\./|\./)', src):
        warn(f"relative link (use root-absolute): {f}:{src[:m.start()].count(chr(10)) + 1}")
    for m in re.finditer(r'(?:href|src)\s*=\s*["\'][^"\']*/assets/', src):
        fail(f"links a raw source asset (not shipped; use the image shortcode): {f}:{src[:m.start()].count(chr(10)) + 1}")
    for m in re.finditer(r'[a-z0-9-]+\.github\.io/landing-page', src, re.I):
        fail(f"hardcoded github.io URL (use site.url / root-absolute links): {f}:{src[:m.start()].count(chr(10)) + 1}")
    for m in re.finditer(r'<(?:div|span)[^>]*\sonclick=', src):
        fail(f"clickable div/span (use <a> or <button>): {f}:{src[:m.start()].count(chr(10)) + 1}")
image_calls = [(f, l) for f in templates for l in open(f, encoding="utf-8").read().splitlines() if "{% image" in l]
for f, line in image_calls:
    args = [a for a in re.split(r',(?![^\[]*\])', line.split("{% image", 1)[1].split("%}")[0])]
    if len(args) < 5:
        warn(f"image shortcode without explicit widths (fine only if full-bleed): {f}: {line.strip()[:90]}")
print(f"INFO scanned {len(templates)} templates")

# ---- CSS -----------------------------------------------------------------
print("\n== CSS ==")
base = open("src/_includes/layouts/base.njk", encoding="utf-8").read()
for f in files("src/styles/components/", ".css"):
    name = os.path.basename(f)
    linked = f"/styles/components/{name}" in base
    if name == "review.css":
        fail("review.css is linked in base.njk (it must load on demand only)") if linked else ok("review.css loads on demand only")
    elif not linked:
        fail(f"component stylesheet not linked in base.njk: {f}")
# Raw colours, ID selectors, !important and @import are Stylelint's job
# (stylelint.config.mjs) — see the section above.

# ---- Built output --------------------------------------------------------
print("\n== Built output (_site/) ==")
prefix = "/" if os.path.exists("src/public/CNAME") else "/landing-page/"

class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.tags = []; self.h1 = 0; self.title = ""; self._t = False
        self.imgs_no_alt = []; self.urls = []; self.headings = []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs); self.tags.append((tag, a))
        if tag == "h1": self.h1 += 1
        if re.fullmatch(r'h[1-6]', tag): self.headings.append(int(tag[1]))
        if tag == "title": self._t = True
        if tag == "img" and "alt" not in a: self.imgs_no_alt.append(a.get("src"))
        for k in ("href", "src", "srcset"):
            if a.get(k): self.urls.append(a[k])
    def handle_endtag(self, tag):
        if tag == "title": self._t = False
    def handle_data(self, d):
        if self._t: self.title += d

pages = [os.path.join(dp, f) for dp, _, fs in os.walk("_site") for f in fs if f.endswith(".html")]
for p in sorted(pages):
    rel = p[len("_site"):]
    pg = Page(); pg.feed(open(p, encoding="utf-8").read())
    metas = {(a.get("name") or a.get("property")): a.get("content") for t, a in pg.tags if t == "meta"}
    html = next((a for t, a in pg.tags if t == "html"), {})
    links = [a for t, a in pg.tags if t == "link"]
    issues = []
    if not html.get("lang"): issues.append("no <html lang>")
    if not pg.title.strip(): issues.append("no <title>")
    if not metas.get("description"): issues.append("no meta description")
    if not any(l.get("rel") == "canonical" for l in links): issues.append("no canonical")
    if not metas.get("og:title"): issues.append("no og:title")
    if pg.h1 != 1: issues.append(f"{pg.h1} <h1> (want exactly 1)")
    if not any(t == "main" for t, _ in pg.tags): issues.append("no <main>")
    if not any(t == "a" and a.get("href") == "#main" for t, a in pg.tags): issues.append("no skip link to #main")
    if pg.imgs_no_alt: issues.append(f"img without alt: {pg.imgs_no_alt[:2]}")
    jumps = [(a, b) for a, b in zip(pg.headings, pg.headings[1:]) if b > a + 1]
    if jumps: warn(f"{rel}: heading level skipped {jumps[:2]}")
    noindex = "noindex" in (metas.get("robots") or "")
    if noindex: issues.append("public page is noindex (only PR previews may be)")
    if not metas.get("og:image"): issues.append("no og:image")
    canon = next((l.get("href") for l in links if l.get("rel") == "canonical"), "")
    if site["url"] and not canon.startswith(site["url"]): issues.append(f"canonical not on site.url: {canon}")
    for u in pg.urls:
        for one in [s.strip().split(" ")[0] for s in u.split(",")]:
            if one.startswith("/") and not one.startswith("//") and not one.startswith(prefix):
                issues.append(f"root link missing base path {prefix}: {one}"); break
            if "/assets/" in one:
                issues.append(f"links raw asset: {one}")
    scripts = [a for t, a in pg.tags if t == "script"]
    for s in scripts:
        if s.get("src") and "defer" not in s and s.get("type") != "module":
            issues.append(f"script without defer: {s.get('src')}")
    for i in issues: fail(f"{rel}: {i}")
    if not issues: ok(f"{rel}")

# robots.txt advertises the sitemap, so it must exist and list every page.
robots = open("_site/robots.txt").read() if os.path.exists("_site/robots.txt") else ""
if "sitemap.xml" in robots:
    if not os.path.exists("_site/sitemap.xml"):
        fail("robots.txt points to sitemap.xml but the build has none")
    else:
        sm = open("_site/sitemap.xml").read()
        missing = [p[len("_site"):-len("index.html")] for p in pages
                   if p.endswith("index.html") and f"{site['url']}{p[len('_site'):-len('index.html')]}</loc>" not in sm]
        fail(f"sitemap.xml is missing pages: {missing}") if missing else ok("sitemap.xml lists every page")
if not any('application/ld+json' in open(p, encoding="utf-8").read() for p in pages if p == "_site/index.html"):
    fail("homepage has no JSON-LD structured data")
else:
    ok("homepage has JSON-LD")

# Image variants: flag anything huge that is probably a bounded-size image.
img_dir = "_site/img"
if os.path.isdir(img_dir):
    imgs = os.listdir(img_dir)
    total = sum(os.path.getsize(os.path.join(img_dir, f)) for f in imgs)
    print(f"INFO {len(imgs)} generated image files, {round(total / 1024)} KB total")


print(f"\n== Summary: {fails} FAIL, {warns} WARN ==")
sys.exit(1 if fails else 0)
PY
PY_STATUS=$?
[ "$LINT_FAIL" = 0 ] && [ "$PY_STATUS" = 0 ] || exit 1
