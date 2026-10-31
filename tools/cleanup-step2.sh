#!/usr/bin/env bash
# Step 2: unused files delete (har file ko delete se pehle grep se check karta hai). Project root se:  bash tools/cleanup-step2.sh
set -uo pipefail
cd "$(dirname "$0")/.."

check_and_rm() {
  local f="$1"
  local base
  base="$(basename "$f")"
  if [ ! -e "$f" ]; then echo "skip (pehle se nahi hai): $f"; return; fi
  if grep -rIlF --exclude-dir=.git --exclude-dir=tools "$base" . 2>/dev/null | grep -vF "./$f" | grep -q .; then
    echo "KEEP (kahin reference hai): $f"
  else
    rm -f "$f"
    echo "deleted: $f"
  fi
}

check_and_rm docs/assets/icons/social/icon-pinterest.png
check_and_rm docs/assets/icons/social/icon-pinterest.svg
check_and_rm docs/assets/images/brand/logo-horizontal-lockup.jpg
check_and_rm docs/assets/images/brand/logo-footer-lockup.png
check_and_rm docs/assets/icons/ui/icon-close.png
check_and_rm docs/assets/icons/ui/icon-close.svg

# duplicate footer: pehle dekho ke 2 sahi links partial mein aa chuke hain
dup="docs/pages/account/footer.html"
if [ -e "$dup" ]; then
  if grep -q "order.html#order-history" docs/partials/footer.html && ! grep -q "new-arrivals-bottom" docs/partials/footer.html; then
    if grep -rIlF --exclude-dir=.git --exclude-dir=tools "account/footer.html" . 2>/dev/null | grep -q .; then
      echo "KEEP (account/footer.html ka reference hai): $dup"
    else
      rm -f "$dup"; echo "deleted: $dup"
    fi
  else
    echo "KEEP: partials/footer.html mein links abhi theek nahi (Task 4 aur 5 pehle karo): $dup"
  fi
fi
echo "Done."
