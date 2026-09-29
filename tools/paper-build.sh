#!/bin/sh
# Build a paper's registered PDF from its LaTeX or Markdown source.
#
#   sh tools/paper-build.sh minimal-winding        papers/minimal-winding/paper/minimal-winding.pdf
#
# pdflatex runs three times (for the references) in a scratch folder, so no .aux or .log files land in
# the repository, and only the finished PDF is copied next to the source. SOURCE_DATE_EPOCH is the date
# of the last commit that changed the source, so the same source gives the same PDF on any machine
# with the same TeX distribution. Needs pdflatex (MacTeX or BasicTeX on macOS, texlive on Linux).
set -eu
ROOT=$(cd "$(dirname "$0")/.." && pwd)
ID=${1:?usage: sh tools/paper-build.sh <paper-id>}
field() { node -e 'const p=require(process.argv[1]).papers.find(p=>p.id===process.argv[2]); if(!p)process.exit(2); console.log(p[process.argv[3]]||"")' "$ROOT/papers/papers.json" "$ID" "$1"; }
SOURCE=$(field latex)
KIND=latex
if [ -z "$SOURCE" ]; then SOURCE=$(field markdown); KIND=markdown; fi
PDF=$(field pdf)
[ -n "$SOURCE" ] && [ -f "$ROOT/$SOURCE" ] && [ -n "$PDF" ] || { echo "Register an existing manuscript source and a PDF path for $ID in papers/papers.json."; exit 2; }
DIR=$(dirname "$ROOT/$SOURCE")
NAME=$(basename "$SOURCE" .tex)
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
SOURCE_DATE_EPOCH=$(git -C "$ROOT" log -1 --format=%ct -- "$SOURCE" 2>/dev/null || true)
[ -n "$SOURCE_DATE_EPOCH" ] || SOURCE_DATE_EPOCH=$(date +%s)
export SOURCE_DATE_EPOCH FORCE_SOURCE_DATE=1
if [ "$KIND" = markdown ]; then
  # The Markdown is canonical. Wrap long literal equations without changing their characters.
  command -v pandoc >/dev/null 2>&1 || { echo "Markdown manuscripts need pandoc and a TeX PDF engine."; exit 2; }
  cat > "$TMP/header.tex" <<'TEX'
\usepackage{fvextra}
\usepackage{seqsplit}
\RecustomVerbatimEnvironment{verbatim}{Verbatim}{breaklines,breakanywhere,fontsize=\small}
\fvset{breaksymbolleft={},breaksymbolright={}}
\setlength{\emergencystretch}{3em}
TEX
  # In prose, mathematical y*, u*, K* and v^* are literal symbols, not paired emphasis.
  # Protect single-letter starred symbols in the temporary rendering input only. Code stays literal.
  python3 - "$ROOT/$SOURCE" "$TMP/paper.md" <<'PY'
import re, sys
from pathlib import Path
lines = []
fenced = False
for line in Path(sys.argv[1]).read_text().splitlines(keepends=True):
    if re.match(r'^\s*(```|~~~)', line): fenced = not fenced
    if not fenced and not line.startswith(('    ', '\t')):
        parts = re.split(r'(`[^`]*`)', line)
        for i in range(0, len(parts), 2):
            parts[i] = re.sub(r'\b([A-Za-z]\^?)\*(?!\*)', r'\1\\*', parts[i])
        line = ''.join(parts)
    lines.append(line)
Path(sys.argv[2]).write_text(''.join(lines))
PY
  cat > "$TMP/numbers.lua" <<'LUA'
-- Permit line breaks inside long certified decimal strings without changing any digit.
function Str(el)
  local result, pos, search = {}, 1, 1
  while true do
    local first, last = el.text:find('%d%d+', search)
    if not first then break end
    if last - first + 1 >= 24 then
      table.insert(result, pandoc.Str(el.text:sub(pos, first - 1)))
      table.insert(result, pandoc.RawInline('latex', '\\seqsplit{' .. el.text:sub(first, last) .. '}'))
      pos = last + 1
    end
    search = last + 1
  end
  if pos == 1 then return el end
  table.insert(result, pandoc.Str(el.text:sub(pos)))
  return result
end
LUA
  pandoc "$TMP/paper.md" --from=markdown-smart --no-highlight --pdf-engine="${PAPER_PDF_ENGINE:-pdflatex}" \
    --resource-path="$DIR" -V geometry:margin=1in -V fontsize=11pt --include-in-header="$TMP/header.tex" \
    --lua-filter="$TMP/numbers.lua" -o "$TMP/paper.pdf"
  cp "$TMP/paper.pdf" "$ROOT/$PDF"
  echo "Built $PDF from $SOURCE"
  exit 0
fi
# Copy included .tex fragments as well as figures (rank-window uses numbers.tex and tables).
cp -R "$DIR/." "$TMP/"
rm -f "$TMP/$NAME.pdf"
if [ "${PAPER_PDF_ENGINE:-pdflatex}" = tectonic ]; then
  tectonic --keep-logs --outdir "$TMP" "$TMP/$NAME.tex"
else
  command -v pdflatex >/dev/null 2>&1 || { echo "pdflatex is not installed (macOS: brew install --cask basictex)."; exit 2; }
  for i in 1 2 3; do
    (cd "$TMP" && pdflatex -interaction=nonstopmode -halt-on-error "$NAME.tex" >/dev/null) || { tail -30 "$TMP/$NAME.log"; exit 1; }
  done
fi
if grep -q -E 'undefined references|Citation .* undefined|Reference .* undefined' "$TMP/$NAME.log"; then
  grep -E 'undefined' "$TMP/$NAME.log" | head; exit 1
fi
cp "$TMP/$NAME.pdf" "$ROOT/$PDF"
echo "Built $PDF"
