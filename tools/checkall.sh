#!/bin/sh
# sh tools/checkall.sh <studio.html> <log> <ids...>
S=$1; L=$2; shift 2
: > "$L"
for id in "$@"; do
  echo "=== $id ($(date -u +%H:%M:%S))" >> "$L"
  STUDIO="$S" NODE_PATH=/opt/node22/lib/node_modules timeout 900 node tools/check.js "$id" 9000 >> "$L" 2>&1
  echo "exit=$? $id" >> "$L"
done
echo "ALL DONE $(date -u +%H:%M:%S)" >> "$L"
