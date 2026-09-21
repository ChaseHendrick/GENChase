#!/bin/sh
# GENChase on macOS. Double-click this file in Finder; a Terminal window opens and the studio comes up.
# If Finder refuses to run it, open Terminal and run: chmod +x "run/GENChase (macOS).command"
DIR=$(dirname "$0")
if command -v python3 >/dev/null 2>&1; then
  exec python3 "$DIR/genchase.py"
fi
echo "python3 was not found. Opening the portable dist/studio.html instead."
echo "Browser restrictions on local files may affect saved settings and clipboard access."
exec open "$DIR/../dist/studio.html"
