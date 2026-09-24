#!/bin/sh
# Build a paper's PDF from its LaTeX source, the same way arXiv does.
#
#   sh tools/paper-build.sh minimal-winding        papers/minimal-winding/paper/minimal-winding.pdf
#   sh tools/paper-build.sh alpha-winding
#
# pdflatex runs three times (for the references) in a scratch folder, so no .aux or .log files land in
# the repository, and only the finished PDF is copied next to the source. SOURCE_DATE_EPOCH is the date
# of the last commit that changed the source, so the same source gives the same PDF on any machine
# with the same TeX distribution. Needs pdflatex (MacTeX or BasicTeX on macOS, texlive on Linux).
set -eu
ROOT=$(cd "$(dirname "$0")/.." && pwd)
ID=${1:?usage: sh tools/paper-build.sh <paper-id>}
DIR="$ROOT/papers/$ID/paper"
[ -f "$DIR/$ID.tex" ] || { echo "No $DIR/$ID.tex"; exit 2; }
command -v pdflatex >/dev/null 2>&1 || { echo "pdflatex is not installed (macOS: brew install --cask basictex)."; exit 2; }
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
cp "$DIR/$ID.tex" "$TMP/"
[ -d "$DIR/figures" ] && cp -R "$DIR/figures" "$TMP/"
SOURCE_DATE_EPOCH=$(git -C "$ROOT" log -1 --format=%ct -- "papers/$ID/paper/$ID.tex" 2>/dev/null || true)
[ -n "$SOURCE_DATE_EPOCH" ] || SOURCE_DATE_EPOCH=$(date +%s)
export SOURCE_DATE_EPOCH FORCE_SOURCE_DATE=1
for i in 1 2 3; do
  (cd "$TMP" && pdflatex -interaction=nonstopmode -halt-on-error "$ID.tex" >/dev/null) || { tail -30 "$TMP/$ID.log"; exit 1; }
done
if grep -q -E 'undefined references|Citation .* undefined|Reference .* undefined' "$TMP/$ID.log"; then
  grep -E 'undefined' "$TMP/$ID.log" | head; exit 1
fi
cp "$TMP/$ID.pdf" "$DIR/$ID.pdf"
echo "Built papers/$ID/paper/$ID.pdf"
