#!/usr/bin/env bash
# Downloads the public-domain training texts listed in scripts/corpus.json into ./corpus.
# Only needed to regenerate src/data/models/*.json — the app itself never touches the network.
set -euo pipefail
cd "$(dirname "$0")/.."
MIRROR="${GUTENBERG_MIRROR:-https://gutenberg.pglaf.org}"
for lang in en de; do
  mkdir -p "corpus/$lang"
  for id in $(node -e "console.log(require('./scripts/corpus.json')['$lang'].join(' '))"); do
    out="corpus/$lang/$id.txt"
    [ -s "$out" ] && continue
    prefix=""; n=${id%?}
    for ((i = 0; i < ${#n}; i++)); do prefix="$prefix/${n:i:1}"; done
    [ ${#id} -eq 1 ] && prefix="/0"
    for suffix in -0.txt -8.txt .txt; do
      if curl -fsS -m 60 -o "$out" "$MIRROR$prefix/$id/$id$suffix"; then
        echo "fetched $lang/$id"
        break
      fi
    done
  done
done
