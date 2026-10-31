MASLA-E-KARACHI TOOLS  (project root ke andar 'tools' folder mein rakho)

  masla-e-karachi-landing/
    docs/
    tools/   <- yeh folder yahan

Chalane se pehle: Python 3 install ho. (favicon script ke liye: pip install pillow)
Sab commands project root (masla-e-karachi-landing/) se chalao.

  split_css.py        Masla 0   python3 tools/split_css.py docs
  make_favicons.py    Masla 19  python3 tools/make_favicons.py docs   (pehle docs/assets/images/favicon.png rakho)
  find_unused.py      Masla 20  python3 tools/find_unused.py docs     (kuch delete nahi karta, sirf list deta hai)
  apply_author_meta.py Masla 21 python3 tools/apply_author_meta.py docs  (developer.json bharne ke baad)
  build_css.py        Masla 18  python3 tools/build_css.py docs       (sab se aakhir mein)

developer.json: apna naam, portfolio, social links yahan bharo (khali url wale social site par nahi dikhte).
