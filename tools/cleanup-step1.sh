#!/usr/bin/env bash
# Step 1: nojekyll / gitignore ke galat-naam waali files theek karta hai. Project root se chalao:  bash tools/cleanup-step1.sh
set -euo pipefail
cd "$(dirname "$0")/.."

# asli docs/.nojekyll zaroor ho
mkdir -p docs
touch docs/.nojekyll

# galat naam wali nojekyll files
for f in nojekyll docs/nojekyll; do
  if [ -e "$f" ]; then rm -f "$f"; echo "deleted: $f"; fi
done

# gitignore (dot ke baghair) -> .gitignore
if [ -s gitignore ]; then
  cp gitignore .gitignore
  rm -f gitignore
  echo "gitignore ka content .gitignore mein daal diya, purani file delete"
elif [ -e gitignore ]; then
  rm -f gitignore
  echo "khali gitignore delete ki"
fi

if [ ! -s .gitignore ]; then echo "WARNING: .gitignore abhi bhi khali hai - kuch rules khud likho"; fi
echo "Done."
