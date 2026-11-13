#!/bin/sh
# Downloads the S-Pankki challenge data into "Challenge data/" (see Challenge data/README.md).
set -e
cd "$(dirname "$0")"
DATA="Challenge data"
mkdir -p "$DATA"
BASE="https://github.com/hackjunction/Junction-2026-S-pankki/raw/main"

for f in tx_junction_transactions.csv tx_customers_junction.csv \
         mtg_negotiation_history.csv mtg_tx_customer_link_and_final_mtg_infio.csv; do
  if [ -f "$DATA/$f" ] && ! head -c 100 "$DATA/$f" | grep -q "git-lfs.github.com"; then
    echo "OK   $f"
  else
    echo "GET  $f"
    curl -fL --progress-bar -o "$DATA/$f" "$BASE/$f"
  fi
done
echo "Done."
