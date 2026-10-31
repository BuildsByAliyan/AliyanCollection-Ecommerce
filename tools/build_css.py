#!/usr/bin/env python3
"""Final step: @import wali manifest files ko ek-ek bundle mein jodta hai (tez loading).
Usage: python3 build_css.py <path-to-docs-folder>
Manifest tools/css-manifest/ mein rakh leta hai (docs ke bahar) taake dobara edit ho sake."""
import os, re, sys, shutil

def main():
    docs = sys.argv[1] if len(sys.argv) > 1 else "docs"
    css = os.path.join(docs, "css")
    keep = os.path.join(docs, "..", "tools", "css-manifest")  # docs ke bahar
    os.makedirs(keep, exist_ok=True)
    pat = re.compile(r'@import url\("([^"]+)"\);')
    for name in ("pages", "layout", "components"):
        path = os.path.join(css, name + ".css")
        manifest = os.path.join(keep, name + ".css")
        if not os.path.exists(manifest):
            shutil.copy2(path, manifest)
        text = open(manifest, encoding="utf-8").read()
        parts = [m.group(1) for m in pat.finditer(text)]
        head = pat.sub("", text).rstrip() + "\n\n"
        body = "".join("/* >>> %s */\n%s\n" % (p, open(os.path.join(css, p), encoding="utf-8").read()) for p in parts)
        open(path, "w", encoding="utf-8").write(head + body)
        print("BUNDLED", name + ".css", "(%d files)" % len(parts))

if __name__ == "__main__":
    main()
