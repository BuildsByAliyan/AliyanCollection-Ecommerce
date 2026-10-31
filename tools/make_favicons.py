#!/usr/bin/env python3
"""Masla-e-Karachi: apni favicon.png se saare favicon/app-icon sizes banata hai
aur 6 HTML pages + site.webmanifest + browserconfig.xml update karta hai.

Pehle:  pip install pillow
Rakho:  docs/assets/images/favicon.png   (square, kam az kam 512x512; 1024x1024 best)
Chalao: python3 tools/make_favicons.py docs
Dobara chalane se koi nuqsan nahi (idempotent).
"""
import os, re, sys, json, glob
from PIL import Image

BG = (26, 26, 26, 255)  # #1A1A1A (site ka background)

def square(img):
    w, h = img.size
    s = max(w, h)
    out = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    out.paste(img, ((s - w) // 2, (s - h) // 2))
    return out

def resized(img, size):
    return img.resize((size, size), Image.LANCZOS)

def on_bg(img, size, scale=1.0):
    """Opaque background par icon (apple-touch / maskable / mstile ke liye)."""
    canvas = Image.new("RGBA", (size, size), BG)
    inner = int(size * scale)
    icon = resized(img, inner)
    canvas.paste(icon, ((size - inner) // 2, (size - inner) // 2), icon)
    return canvas

HEAD_BLOCK = """<!-- Favicons + app icons (tools/make_favicons.py ne banaya) -->
<link rel="icon" href="assets/images/favicon.ico" sizes="48x48">
<link rel="icon" type="image/png" sizes="32x32" href="assets/images/favicons/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="assets/images/favicons/favicon-16x16.png">
<link rel="apple-touch-icon" href="assets/images/favicons/apple-touch-icon.png" sizes="180x180">
<link rel="manifest" href="assets/images/favicons/site.webmanifest">
<meta name="msapplication-config" content="assets/images/favicons/browserconfig.xml">"""

def main():
    docs = sys.argv[1] if len(sys.argv) > 1 else "docs"
    img_dir = os.path.join(docs, "assets", "images")
    fav_dir = os.path.join(img_dir, "favicons")
    src = os.path.join(img_dir, "favicon.png")
    if not os.path.exists(src):
        sys.exit("ERROR: %s nahi mili. Apni favicon.png yahan rakho." % src)
    base = square(Image.open(src).convert("RGBA"))
    if base.size[0] < 512:
        print("WARNING: favicon.png %dpx hai. 512x512 ya zyada behtar hai." % base.size[0])
    os.makedirs(fav_dir, exist_ok=True)

    for s in (16, 32):
        resized(base, s).save(os.path.join(fav_dir, "favicon-%dx%d.png" % (s, s)))
    resized(base, 64).save(os.path.join(img_dir, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])
    on_bg(base, 180, 0.86).save(os.path.join(fav_dir, "apple-touch-icon.png"))
    resized(base, 192).save(os.path.join(fav_dir, "android-chrome-192x192.png"))
    resized(base, 512).save(os.path.join(fav_dir, "android-chrome-512x512.png"))
    on_bg(base, 512, 0.68).save(os.path.join(fav_dir, "maskable-icon-512x512.png"))  # safe zone
    on_bg(base, 150, 0.7).save(os.path.join(fav_dir, "mstile-150x150.png"))
    print("OK: PNG/ICO sizes ban gaye")

    # HTML heads
    pat = re.compile(r'<!-- Favicons[^\n]*\n(?:<(?:link|meta)[^\n]*\n)+', re.M)
    n = 0
    for f in glob.glob(os.path.join(docs, "*.html")):
        t = open(f, encoding="utf-8").read()
        new, k = pat.subn(HEAD_BLOCK + "\n", t, count=1)
        if k:
            open(f, "w", encoding="utf-8").write(new); n += 1
    print("OK: %d HTML pages ka <head> favicon block badla" % n)

    # webmanifest: svg icon hatao
    wm = os.path.join(fav_dir, "site.webmanifest")
    if os.path.exists(wm):
        d = json.load(open(wm, encoding="utf-8"))
        d["icons"] = [i for i in d.get("icons", []) if not i["src"].endswith(".svg")]
        json.dump(d, open(wm, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
        print("OK: site.webmanifest se svg icon hata diya")

    # purani svg favicons ab bekaar
    for old in ("favicon.svg", "safari-pinned-tab.svg", "favicon-48x48.png"):
        p = os.path.join(fav_dir, old)
        if os.path.exists(p):
            print("DELETE KARO (ab use nahi hoti):", p)

if __name__ == "__main__":
    main()
