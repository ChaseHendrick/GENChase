#!/bin/sh
# sh tools/sharpall.sh   -- measure the print sharpness of every technique's export
# Prints one JSON line per tab. Takes roughly an hour: it drives the real export path for each one.
# See the header of tools/sharp.js for what the two numbers mean and where the thresholds come from.
IDS=$(node -e "
const fs=require('fs');const s=fs.readFileSync('studio.html','utf8');
console.log([...s.matchAll(/Studio\.register\(\{\s*\n?\s*id:\s*'([^']+)'/g)].map(m=>m[1]).join(' '));")
for m in $IDS; do
  NODE_PATH=/opt/node22/lib/node_modules timeout 420 node tools/sharp.js "$m" "${1:-8}" "${2:-300}" 2>/dev/null | tail -1
done
