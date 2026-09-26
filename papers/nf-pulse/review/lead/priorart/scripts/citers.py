# citers.py: list papers citing given DOIs (Semantic Scholar Graph API), and flag titles/abstracts
# matching keywords. Used for the nf-pulse prior-art check, 2026-09-26.
# Usage: python3 citers.py DOI [DOI ...]
import json, re, sys, time, urllib.request
KW = re.compile(r"sigmoid|smooth firing|smooth nonlinear|smooth activation|steep|computer.assisted|rigorous numeric|interval arith|validated|existence of (travel|puls)|traveling pulse|travelling pulse|pulse", re.I)
STRONG = re.compile(r"sigmoid|smooth|steep|computer.assisted|rigorous numeric|interval arith|validated", re.I)
for doi in sys.argv[1:]:
    out, off = [], 0
    while True:
        url = f"https://api.semanticscholar.org/graph/v1/paper/DOI:{doi}/citations?fields=title,abstract,year,externalIds&limit=100&offset={off}"
        for tries in range(5):
            try:
                j = json.load(urllib.request.urlopen(url, timeout=60)); break
            except Exception as e:
                time.sleep(3 + 3 * tries); j = None
        if not j: break
        out += [d["citingPaper"] for d in j.get("data", [])]
        if "next" not in j: break
        off = j["next"]; time.sleep(1.5)
    print(f"== {doi}: {len(out)} citing records")
    for p in out:
        text = (p.get("title") or "") + " " + (p.get("abstract") or "")
        if KW.search(text) and STRONG.search(text):
            print(f"  [{p.get('year')}] {p.get('title')} | {(p.get('externalIds') or {}).get('DOI') or (p.get('externalIds') or {}).get('ArXiv')}")
    time.sleep(2)
