#!/usr/bin/env python3
"""Masla-e-Karachi: 6 HTML pages mein developer ka naam (meta author + JSON-LD Person) lagata hai.
tools/developer.json se data leta hai. Dobara chalane se double nahi hota.
Chalao (project root se):  python3 tools/apply_author_meta.py docs"""
import os, re, sys, json, glob

def main():
    docs = sys.argv[1] if len(sys.argv) > 1 else "docs"
    dev = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "developer.json"), encoding="utf-8"))
    same_as = [s["url"] for s in dev.get("socials", []) if s.get("url")]
    if dev.get("portfolio"):
        same_as.insert(0, dev["portfolio"])
    person = {"@type": "Person", "@id": "#developer", "name": dev["name"], "jobTitle": dev.get("role", "Developer")}
    if dev.get("portfolio"): person["url"] = dev["portfolio"]
    if same_as: person["sameAs"] = same_as
    meta = '<meta name="author" content="%s">\n<meta name="creator" content="%s">\n<link rel="author" href="humans.txt">\n' % (dev["name"], dev["name"])
    ld_pat = re.compile(r'(<script type="application/ld\+json">\s*)(\{.*?\})(\s*</script>)', re.S)
    n = 0
    for f in glob.glob(os.path.join(docs, "*.html")):
        t = open(f, encoding="utf-8").read()
        t = re.sub(r'<meta name="(author|creator)"[^>]*>\n?', "", t)
        t = re.sub(r'<link rel="author"[^>]*>\n?', "", t)
        t = re.sub(r'(<meta name="robots"[^>]*>\n)', lambda m: m.group(1) + meta, t, count=1)
        def fix(m):
            try:
                d = json.loads(m.group(2))
            except ValueError:
                return m.group(0)
            g = d.get("@graph")
            if g is None:
                return m.group(0)
            g[:] = [x for x in g if x.get("@id") != "#developer"] + [person]
            for x in g:
                if x.get("@type") == "WebSite":
                    x["author"] = {"@id": "#developer"}
            return m.group(1) + json.dumps(d, ensure_ascii=False, indent=2) + m.group(3)
        t = ld_pat.sub(fix, t, count=1)
        open(f, "w", encoding="utf-8").write(t); n += 1
    print("OK: %d pages mein author meta + JSON-LD Person" % n)

if __name__ == "__main__":
    main()
