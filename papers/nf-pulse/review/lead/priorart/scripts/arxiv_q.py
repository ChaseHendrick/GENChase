# arxiv_q.py: run arXiv abstract searches through the arxiv.org/search HTML interface (the export API
# returned HTTP 406 through this proxy) and print hit counts and titles. nf-pulse prior-art check, 2026-09-26.
# Usage: python3 arxiv_q.py 'TERMS' ['TERMS' ...]   (arXiv search syntax; quoted phrases allowed; AND implied)
import html, re, sys, time, urllib.parse, urllib.request
for q in sys.argv[1:]:
    url = "https://arxiv.org/search/?" + urllib.parse.urlencode({"query": q, "searchtype": "abstract", "size": 50, "order": ""})
    s = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=90).read().decode()
    m = re.search(r"Showing \S+ of ([\d,]+) results", s)
    print(f"== abstract: {q}: {m.group(1) if m else 0} hits")
    for ids, t in re.findall(r'arxiv.org/abs/([\d.]+v?\d*)">.*?<p class="title is-5 mathjax">\s*(.*?)\s*</p>', s, re.S):
        print("  ", ids, html.unescape(re.sub(r"<[^>]+>|\s+", " ", t)).strip())
    time.sleep(3)
