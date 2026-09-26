# zbmath.py: fetch zbMATH Open records (review text) by DOI through the public API.
# Used for the nf-pulse prior-art check, 2026-09-26. Usage: python3 zbmath.py DOI [DOI ...]
import json, sys, urllib.parse, urllib.request
for doi in sys.argv[1:]:
    url = "https://api.zbmath.org/v1/document/_search?search_string=" + urllib.parse.quote("doi:" + doi) + "&page=0&results_per_page=3"
    try:
        j = json.load(urllib.request.urlopen(url, timeout=60))
    except Exception as e:
        print("==", doi, "ERR", e); continue
    print("==", doi, "hits", len(j.get("result", [])))
    for r in j.get("result", []):
        print("zbl", r.get("identifier"), "|", (r.get("title") or {}).get("title"))
        for e in r.get("editorial_contributions", []) or []:
            print("  [", e.get("contribution_type"), "by", (e.get("reviewer") or {}).get("name"), "]")
            print("  ", (e.get("text") or "")[:4000])
