#!/bin/sh
# Make the arXiv upload for a paper: its LaTeX source and the figures it includes, in one zip.
#
#   sh tools/arxiv-bundle.sh minimal-winding              writes ~/genchase-arxiv/minimal-winding-arxiv.zip
#   sh tools/arxiv-bundle.sh minimal-winding <out-dir>
#
# The source is papers/<id>/paper/<id>.tex without the maintenance comment lines above \documentclass,
# since arXiv makes the source downloadable. Every \includegraphics file goes in at the same relative
# path. With pdflatex installed, the zip is built once in a scratch folder the way arXiv builds it, and
# its page count is compared with the committed PDF. The zip is written outside the repository.
set -eu
ROOT=$(cd "$(dirname "$0")/.." && pwd)
ID=${1:?usage: sh tools/arxiv-bundle.sh <paper-id> [out-dir]}
OUT=${2:-$HOME/genchase-arxiv}
DIR="$ROOT/papers/$ID/paper"
TEX="$DIR/$ID.tex"
[ -f "$TEX" ] || { echo "No $TEX"; exit 2; }
mkdir -p "$OUT"; OUT=$(cd "$OUT" && pwd)
case "$OUT/" in "$ROOT"/*) echo "Write the upload outside the repository, not $OUT."; exit 2;; esac

STAGE=$(mktemp -d); trap 'rm -rf "$STAGE"' EXIT
first=$(grep -n '^\\documentclass' "$TEX" | head -1 | cut -d: -f1)
[ -n "$first" ] || { echo "No \\documentclass line in $TEX"; exit 2; }
tail -n +"$first" "$TEX" > "$STAGE/$ID.tex"
files="$ID.tex"
for fig in $(grep -o '\\includegraphics\(\[[^]]*\]\)\{0,1\}{[^}]*}' "$STAGE/$ID.tex" | sed 's/.*{\(.*\)}/\1/'); do
  [ -f "$DIR/$fig" ] || { echo "Missing figure $DIR/$fig"; exit 1; }
  mkdir -p "$STAGE/$(dirname "$fig")"; cp "$DIR/$fig" "$STAGE/$fig"
  files="$files $fig"
done
ZIP="$OUT/$ID-arxiv.zip"
rm -f "$ZIP"; (cd "$STAGE" && zip -q "$ZIP" $files)
echo "Upload this to arXiv: $ZIP ($files)"

if command -v pdflatex >/dev/null 2>&1; then
  (cd "$STAGE" && for i in 1 2 3; do pdflatex -interaction=nonstopmode -halt-on-error "$ID.tex" >/dev/null || exit 1; done) || { echo "pdflatex failed; see the log with: unzip the upload and build it."; exit 1; }
  pages() { node -e "console.log(require('$ROOT/tools/paper-check.js').pdfPages(require('fs').readFileSync(process.argv[1])))" "$1"; }
  built=$(pages "$STAGE/$ID.pdf"); committed=$(pages "$DIR/$ID.pdf")
  echo "The upload builds to $built pages; the committed PDF has $committed."
  [ "$built" = "$committed" ] || { echo "They differ: rebuild the committed PDF with sh tools/paper-build.sh $ID."; exit 1; }
else
  echo "pdflatex is not installed here; compare arXiv's preview with papers/$ID/paper/$ID.pdf before you submit."
fi
