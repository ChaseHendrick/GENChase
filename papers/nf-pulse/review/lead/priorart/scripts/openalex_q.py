# openalex_q.py: OpenAlex title/abstract search with hit counts and top titles. nf-pulse prior-art check, 2026-09-26.
# Usage: python3 openalex_q.py 'SEARCH TERMS' [...]
import json, sys, time, urllib.parse, urllib.request
for q in sys.argv[1:]:
    url = "https://api.openalex.org/works?" + urllib.parse.urlencode({"filter": "title_and_abstract.search:" + q, "per_page": 50, "select": "display_name,publication_year,doi"})
    for k in range(6):
        try:
            j = json.load(urllib.request.urlopen(url, timeout=90)); break
        except Exception as e:
            time.sleep(10 * (k + 1)); j = None
    if j is None:
        print("== FAILED", q); continue
    print(f"== OpenAlex title_and_abstract.search:{q}: {j['meta']['count']} hits")
    for r in j["results"]:
        print("  ", r["publication_year"], r["display_name"], r["doi"])
    time.sleep(8)
