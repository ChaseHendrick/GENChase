#!/usr/bin/env python3
"""Download the registered Zenodo source ZIPs and compare their manuscript PDFs.

Usage: python3 tools/paper-zenodo-check.py [--paper ID] [--out report.json]
Read-only. No record, release, tag or DOI is created or changed.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
import io
import json
from pathlib import Path
import re
import sys
from urllib.request import urlopen
import zipfile

ROOT = Path(__file__).resolve().parent.parent


def publication_metadata(paper, record):
    metadata = record.get("metadata", {})
    resource = metadata.get("resource_type", {})
    return {"title": metadata.get("title"), "titleMatches": metadata.get("title") == paper["title"],
            "version": metadata.get("version"), "resourceType": resource,
            "preprint": resource.get("type") == "publication" and resource.get("subtype") == "preprint"}


def self_test():
    paper = {"title": "A Preprint"}
    good = {"title": "A Preprint", "resource_type": {"type": "publication", "subtype": "preprint"}}
    cases = [(good, True), ({**good, "title": "a preprint"}, False),
             ({**good, "resource_type": {"type": "software"}}, False),
             ({**good, "resource_type": {"type": "publication", "subtype": "article"}}, False)]
    for metadata, expected in cases:
        result = publication_metadata(paper, {"metadata": metadata})
        assert (result["titleMatches"] and result["preprint"]) == expected
    print("Publication metadata self-test passed: 4 cases")
    return 0


def audit(paper):
    result = {"paper": paper["id"], "doi": paper.get("codeDoi"), "ok": False}
    try:
        match = re.fullmatch(r"10\.5281/zenodo\.(\d+)", paper.get("codeDoi") or "")
        if not match:
            raise ValueError("no registered Zenodo version DOI")
        url = "https://zenodo.org/api/records/" + match[1]
        with urlopen(url, timeout=30) as response:
            record = json.load(response)
        result["record"] = "https://zenodo.org/records/" + match[1]
        result.update(publication_metadata(paper, record))
        prefix = f"papers/{paper['id']}/"
        pdf = paper.get("pdf")
        if not pdf or not pdf.startswith(prefix):
            raise ValueError("no registered manuscript PDF")
        relative = pdf[len(prefix):]
        expected = hashlib.sha256((ROOT / pdf).read_bytes()).hexdigest()
        archives = []
        for item in record["files"]:
            if not item["key"].endswith(".zip"):
                continue
            with urlopen(item["links"]["self"], timeout=60) as response:
                data = response.read()
            checksum = item.get("checksum", "")
            if checksum.startswith("md5:") and hashlib.md5(data).hexdigest() != checksum[4:]:
                raise ValueError("download checksum differs from Zenodo metadata")
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                names = archive.namelist()
                matches = [n for n in names if n == relative or n.endswith("/" + relative)]
                digest = hashlib.sha256(archive.read(matches[0])).hexdigest() if len(matches) == 1 else None
            archives.append({"file": item["key"], "url": item["links"]["self"],
                             "zipSha256": hashlib.sha256(data).hexdigest(), "manuscript": matches,
                             "manuscriptSha256": digest, "matchesRepository": digest == expected})
        result["repositoryPdfSha256"] = expected
        result["archives"] = archives
        result["ok"] = result["preprint"] and result["titleMatches"] and bool(archives) and all(a["matchesRepository"] for a in archives)
    except Exception as exc:
        result["error"] = str(exc)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--paper")
    parser.add_argument("--self-test", action="store_true", help="test metadata checks without network access")
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    papers = [p for p in json.loads((ROOT / "papers/papers.json").read_text())["papers"]
              if p.get("companion") and (not args.paper or p["id"] == args.paper)]
    if not papers:
        parser.error("no matching companion")
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(audit, papers))
    report = {"checkedAt": datetime.now(timezone.utc).isoformat(), "papers": results}
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(json.dumps(report, indent=2) + "\n")
    for result in results:
        print(("PASS" if result["ok"] else "FAIL") + " " + result["paper"] + " " + str(result["doi"]) +
              (": " + result["error"] if "error" in result else ""))
    return 0 if all(r["ok"] for r in results) else 1


if __name__ == "__main__":
    sys.exit(main())
