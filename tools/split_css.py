#!/usr/bin/env python3
"""Masla-e-Karachi: badi CSS files ko chhoti files mein todta hai (lossless).
Usage:  python3 split_css.py <path-to-docs-folder>
Har badi file (pages/layout/components.css) ek 'manifest' ban jati hai jo @import se
chhoti files ko usi tarteeb mein load karti hai. HTML files ko haath nahi lagta.
Original files ka backup tools/css-backup/ mein (docs ke bahar) khud ban jata hai."""
import os, sys, shutil

PLAN = {
  "pages": {"dir": "pages", "banner_end": 19, "parts": [
    ("bg-fx", 20, 90), ("hero", 91, 436), ("ticker", 437, 521), ("problem", 522, 678),
    ("solution", 679, 763), ("steps", 764, 891), ("features", 892, 989),
    ("departments", 990, 1052), ("promise", 1053, 1153), ("roadmap", 1154, 1236),
    ("cta-band", 1237, 1356), ("subpage-hero", 1357, 1437), ("how-it-works", 1438, 1582),
    ("privacy", 1583, 1726), ("faq", 1727, 1799), ("terms", 1800, 1975), ("error-404", 1976, None)]},
  "layout": {"dir": "layout", "banner_end": 23, "parts": [
    ("container-progress", 24, 70), ("topbar", 71, 124), ("header", 125, 473),
    ("sections", 474, 584), ("footer", 585, 696), ("cleanup", 697, None)]},
  "components": {"dir": "components", "banner_end": 13, "parts": [
    ("icons", 14, 58), ("buttons", 59, 225), ("lang-toggle", 226, 303),
    ("chips-pin", 304, 421), ("callout", 422, 479), ("accordion", 480, 607),
    ("ticket-card", 608, 750), ("misc-reveal", 751, None)]},
}

def main():
    docs = sys.argv[1] if len(sys.argv) > 1 else "docs"
    css = os.path.join(docs, "css")
    bak = os.path.join(docs, "..", "tools", "css-backup")  # docs ke bahar: deploy nahi hota
    os.makedirs(bak, exist_ok=True)
    for name, plan in PLAN.items():
        src = os.path.join(css, name + ".css")
        bsrc = os.path.join(bak, name + ".css")
        if not os.path.exists(bsrc):
            shutil.copy2(src, bsrc)
        lines = open(bsrc, encoding="utf-8").read().split("\n")
        out_dir = os.path.join(css, plan["dir"])
        os.makedirs(out_dir, exist_ok=True)
        imports = []
        for part, a, b in plan["parts"]:
            chunk = lines[a - 1:(b if b else len(lines))]
            text = "\n".join(chunk).rstrip("\n") + "\n"
            if text.count("{") != text.count("}"):
                sys.exit("ERROR: braces balance nahi: %s/%s (line %s-%s)" % (plan["dir"], part, a, b))
            open(os.path.join(out_dir, part + ".css"), "w", encoding="utf-8").write(text)
            imports.append('@import url("%s/%s.css");' % (plan["dir"], part))
        banner = "\n".join(lines[:plan["banner_end"]]).rstrip("\n")
        note = ("\n\n/* MANIFEST: yeh file ab sirf @import ki list hai. Asli CSS css/%s/ ke andar hai.\n"
                "   Tarteeb (order) mat badlo, cascade isi par chalta hai. */\n" % plan["dir"])
        open(src, "w", encoding="utf-8").write(banner + note + "\n".join(imports) + "\n")
        print("OK", name + ".css ->", len(plan["parts"]), "files in css/" + plan["dir"] + "/")

if __name__ == "__main__":
    main()
