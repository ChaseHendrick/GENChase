#!/bin/sh
# GENChase on macOS. Double-click this file in Finder; a Terminal window opens and the studio comes up.
# If Finder refuses to run it, open Terminal and run: chmod +x "run/GENChase (macOS).command"
DIR=$(dirname "$0")
if command -v python3 >/dev/null 2>&1; then
  exec python3 "$DIR/genchase.py"
fi
echo "python3 was not found. Opening studio.html directly instead."
echo "That works, but the studio cannot keep your settings or gallery between sessions."
exec open "$DIR/../studio.html"
