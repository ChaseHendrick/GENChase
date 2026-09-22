#!/bin/sh
# GENChase on Linux. Run ./run/genchase.sh, or mark it executable and double-click it in your file manager.
DIR=$(dirname "$0")
if command -v python3 >/dev/null 2>&1; then
  exec python3 "$DIR/genchase.py"
fi
echo "python3 was not found. Opening the portable dist/studio.html instead."
echo "Browser restrictions on local files may affect saved settings and clipboard access."
exec xdg-open "$DIR/../dist/studio.html"
