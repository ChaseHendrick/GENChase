#!/bin/sh
# oa_lookup.sh: for each DOI, query Unpaywall (email param required by its API) and Semantic Scholar
# for open-access copies and abstracts. Used for the nf-pulse prior-art check, 2026-09-26.
for d in "$@"; do
  echo "== $d"
  curl -sS "https://api.unpaywall.org/v2/$d?email=${UNPAYWALL_EMAIL:?set UNPAYWALL_EMAIL to the address Unpaywall requires}" | python3 -c "
import json,sys
try:
  j=json.load(sys.stdin)
  print('unpaywall is_oa',j.get('is_oa'))
  for l in j.get('oa_locations') or []: print('  ',l.get('url_for_pdf') or l.get('url'), l.get('host_type'), l.get('version'))
except Exception as e: print('unpaywall err',e)
"
  curl -sS "https://api.semanticscholar.org/graph/v1/paper/DOI:$d?fields=title,abstract,openAccessPdf,citationCount,externalIds" | python3 -c "
import json,sys
try:
  j=json.load(sys.stdin); print('S2',j.get('paperId'),j.get('citationCount'),j.get('openAccessPdf'),j.get('externalIds')); print('ABS:',j.get('abstract'))
except Exception as e: print('s2 err',e)
"
  sleep 1
done
