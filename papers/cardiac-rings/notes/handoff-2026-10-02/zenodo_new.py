"""List the newest Zenodo version of each paper's concept record and say whether the expected new version is in."""
import json, sys, urllib.request
CONCEPT = {"minimal-winding": 22953034, "collapse-without-rotation": 22969840, "stable-expansion": 22971172,
           "rank-window": 22994834, "hh-dynamics": 22996259, "double-pendulum": 22997539, "nf-pulse": 22998375,
           "hh-pulse": 23013934}
WANT = {"minimal-winding": "2.2.5", "collapse-without-rotation": "1.0.5", "stable-expansion": "1.0.5",
        "rank-window": "1.0.5", "hh-dynamics": "1.0.6", "double-pendulum": "1.0.5", "nf-pulse": "1.0.6", "hh-pulse": "1.0.5"}
out, done = {}, 0
for pid, cid in CONCEPT.items():
    url = f"https://zenodo.org/api/records?q=conceptrecid:{cid}&all_versions=true&sort=mostrecent&size=3"
    with urllib.request.urlopen(url, timeout=30) as r:
        hits = json.load(r)["hits"]["hits"]
    found = [h for h in hits if h["metadata"].get("version") == WANT[pid]]
    if found:
        done += 1
        out[pid] = {"version": WANT[pid], "doi": found[0]["doi"], "date": found[0]["metadata"].get("publication_date")}
    print(pid, WANT[pid], found[0]["doi"] if found else "not yet (newest " + str(hits[0]["metadata"].get("version")) + ")")
json.dump(out, open(sys.argv[1], "w"), indent=2) if len(sys.argv) > 1 else None
print(f"{done}/8 archived")
sys.exit(0 if done == 8 else 3)
