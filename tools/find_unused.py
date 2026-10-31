#!/usr/bin/env python3
"""Masla-e-Karachi: faltu (unused) files / CSS classes / i18n keys dhundta hai. Kuch delete NAHI karta.
Chalao (project root se):  python3 tools/find_unused.py docs
Har redesign masle ke baad dobara chalao - nayi faltu files pakad leta hai."""
import os, re, sys, glob, json

KEEP_ALWAYS = {".nojekyll", "CNAME", "robots.txt", "sitemap.xml", "404.html"}
TEXT = (".html", ".css", ".js", ".json", ".webmanifest", ".xml")

def main():
    docs = sys.argv[1] if len(sys.argv) > 1 else "docs"
    corpus = {}
    for root, _, files in os.walk(docs):
        for f in files:
            p = os.path.join(root, f)
            if p.endswith(TEXT) and "/licenses/" not in p:
                corpus[p] = open(p, encoding="utf-8", errors="ignore").read()

    print("=== 1) ASSET FILES jinka naam kisi HTML/CSS/JS/JSON/manifest mein nahi aata ===")
    total = 0
    for root, _, files in os.walk(os.path.join(docs, "assets")):
        for f in sorted(files):
            p = os.path.join(root, f)
            if f in KEEP_ALWAYS or "/licenses/" in p or f.endswith(".woff2"):
                continue
            used = any(f in t for q, t in corpus.items() if q != p)
            if not used:
                sz = os.path.getsize(p); total += sz
                print("  UNUSED  %-70s %7d bytes" % (p, sz))
    print("  (total %.1f KB)\n" % (total / 1024))

    print("=== 2) FONT files jo fonts.css mein nahi ===")
    fc = open(os.path.join(docs, "assets/fonts/fonts.css"), encoding="utf-8").read()
    for p in sorted(glob.glob(os.path.join(docs, "assets/fonts/*/*.woff2"))):
        if os.path.basename(p) not in fc:
            print("  UNUSED ", p)

    print("\n=== 3) Root-level / docs-level files jo website ke kaam ki nahi ===")
    for p in sorted(glob.glob(os.path.join(docs, "**/*"), recursive=True)):
        if p.endswith(("specimen.html", "README.txt")) or os.path.basename(p) == ".gitkeep":
            print("  NOTES/TEST FILE (public deploy hoti hai):", p)
    cname = os.path.join(docs, "CNAME")
    if os.path.exists(cname) and os.path.getsize(cname) == 0:
        print("  KHALI CNAME (GitHub Pages ko tod sakta hai):", cname)

    print("\n=== 4) CSS classes jo kisi HTML/JS mein use nahi hoti ===")
    css = "".join(t for p, t in corpus.items() if p.endswith(".css"))
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    classes = set(re.findall(r"\.([a-zA-Z][\w-]*)", css))
    html = "".join(t for p, t in corpus.items() if p.endswith(".html"))
    js = "".join(t for p, t in corpus.items() if p.endswith(".js"))
    used = set()
    for m in re.finditer(r'class="([^"]*)"', html):
        used.update(m.group(1).split())
    print("  ", sorted(c for c in classes if c not in used and c not in js) or "koi nahi")

    print("\n=== 5) i18n keys: en vs ur barabar? aur kaun si key kahin use nahi ===")
    en = json.load(open(os.path.join(docs, "lang/en.json"), encoding="utf-8"))
    ur = json.load(open(os.path.join(docs, "lang/ur.json"), encoding="utf-8"))
    print("   sirf ek zubaan mein:", sorted(set(en) ^ set(ur)) or "koi nahi")
    keys_used = set(re.findall(r'data-i18n(?:-[a-z-]+)?="([^"]+)"', html))
    print("   unused keys:", sorted(k for k in en if k not in keys_used and ("'%s'" % k) not in js and ('"%s"' % k) not in js) or "koi nahi")
    print("   HTML mein hai par json mein nahi:", sorted(k for k in keys_used if k not in en) or "koi nahi")

if __name__ == "__main__":
    main()
