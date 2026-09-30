#!/usr/bin/env python3
"""Verify registered Zenodo versions and compare their source ZIP manuscript PDFs.

Usage: python3 tools/paper-zenodo-check.py [--paper ID] [--out report.json]
Read-only. No record, release, tag or DOI is created or changed.
archiveVersion identifies the verified release at codeDoi; a proposed newer
release does not change this expectation until its archive has been verified.
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
import tempfile
from unittest.mock import patch
from urllib.request import urlopen
import zipfile

ROOT = Path(__file__).resolve().parent.parent


def valid_archive_version(version):
    # New companion release versions use a plain semver core, without a leading v.
    return isinstance(version, str) and re.fullmatch(r"(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)", version) is not None


def publication_metadata(paper, record):
    metadata = record.get("metadata", {})
    resource = metadata.get("resource_type", {})
    license_id = metadata.get("license", {})
    license_id = license_id.get("id") if isinstance(license_id, dict) else license_id
    expected_license = "other-open" if paper.get("textLicense") == "CC-BY-4.0" and paper.get("id") != "rank-window" else "other-closed"
    description = re.sub(r"<[^>]*>", " ", metadata.get("description", ""))
    manuscript_policy = "Creative Commons Attribution 4.0" if paper.get("textLicense") == "CC-BY-4.0" else "all rights reserved"
    disclosed = manuscript_policy in description and "Apache License 2.0" in description
    if paper.get("id") == "rank-window":
        disclosed = disclosed and "Attribution-NonCommercial" in description
    expected_version = paper.get("archiveVersion")
    valid_expected_version = valid_archive_version(expected_version)
    return {"license": license_id, "expectedLicense": expected_license,
            "licenseMatches": license_id == expected_license, "componentRightsDisclosed": disclosed,
            "title": metadata.get("title"), "titleMatches": metadata.get("title") == paper["title"],
            "version": metadata.get("version"), "expectedVersion": expected_version,
            "validExpectedVersion": valid_expected_version,
            "versionMatches": valid_expected_version and metadata.get("version") == expected_version,
            "resourceType": resource,
            "preprint": resource.get("type") == "publication" and resource.get("subtype") == "preprint"}


def self_test():
    if not __debug__:
        print("Self-test refused: Python optimization disables assertions; run without -O.", file=sys.stderr)
        return 1
    paper = {"id": "test", "title": "A Preprint", "textLicense": "all-rights-reserved", "archiveVersion": "1.2.3"}
    good = {"title": "A Preprint", "resource_type": {"type": "publication", "subtype": "preprint"},
            "license": {"id": "other-closed"}, "description": "Manuscript all rights reserved. Code Apache License 2.0.", "version": "1.2.3"}
    cases = [(good, True), ({**good, "title": "a preprint"}, False),
             ({**good, "resource_type": {"type": "software"}}, False),
             ({**good, "resource_type": {"type": "publication", "subtype": "article"}}, False)]
    for metadata, expected in cases:
        result = publication_metadata(paper, {"metadata": metadata})
        assert (result["titleMatches"] and result["preprint"]) == expected
    for license_id, valid in [("other-closed", True), ("apache-2.0", False), ("cc-by-4.0", False), (None, False)]:
        result = publication_metadata(paper, {"metadata": {**good, "license": {"id": license_id}}})
        assert result["licenseMatches"] == valid
    opened = {**paper, "textLicense": "CC-BY-4.0"}
    metadata = {**good, "license": {"id": "other-open"}, "description": "Creative Commons Attribution 4.0. Code Apache License 2.0."}
    assert publication_metadata(opened, {"metadata": metadata})["licenseMatches"]
    assert publication_metadata(opened, {"metadata": metadata})["componentRightsDisclosed"]
    rank = {**opened, "id": "rank-window"}
    assert not publication_metadata(rank, {"metadata": metadata})["licenseMatches"]
    assert not publication_metadata(rank, {"metadata": metadata})["componentRightsDisclosed"]
    assert not publication_metadata(paper, {"metadata": {**good, "description": ""}})["componentRightsDisclosed"]
    version_controls = 1
    assert publication_metadata(paper, {"metadata": good})["versionMatches"]
    for version in (None, "1.2.2", "1.2.4", "v1.2.3", "1.2", "1.2.3 ", " 1.2.3", 1.2, [], True):
        result = publication_metadata(paper, {"metadata": {**good, "version": version}})
        assert result["validExpectedVersion"] and not result["versionMatches"]
        version_controls += 1
    for version in (None, "", "v1.2.3", "1.2", "1.2.3-beta", "1.2.3\n", "01.2.3", "1.02.3", "1.2.03", "1\u0662.2.3", 1.2, [], {}):
        invalid = {**paper, "archiveVersion": version, "codeDoi": "10.5281/zenodo.1"}
        result = publication_metadata(invalid, {"metadata": {**good, "version": version}})
        assert not result["validExpectedVersion"] and not result["versionMatches"]
        with patch(__name__ + ".urlopen") as request:
            failed = audit(invalid)
            assert not failed["ok"] and "archiveVersion" in failed["error"]
            request.assert_not_called()
        version_controls += 1
    missing = {**paper, "codeDoi": "10.5281/zenodo.1"}
    missing.pop("archiveVersion")
    with patch(__name__ + ".urlopen") as request:
        assert not audit(missing)["ok"]
        request.assert_not_called()
    version_controls += 1
    # A byte-matching ZIP at the wrong version must fail, even if all other
    # publication and packaging checks pass. A proposed release is irrelevant.
    with tempfile.TemporaryDirectory(prefix="genchase-version-controls-") as directory:
        root = Path(directory)
        pdf = b"%PDF-1.7\nfixture\n%%EOF\n"
        relative = "paper/test.pdf"
        target = root / "papers/test" / relative
        target.parent.mkdir(parents=True)
        target.write_bytes(pdf)
        stream = io.BytesIO()
        with zipfile.ZipFile(stream, "w") as archive:
            archive.writestr("companion-abcdef1/" + relative, pdf)
        archive_data = stream.getvalue()
        fixture_paper = {**paper, "codeDoi": "10.5281/zenodo.1", "pdf": "papers/test/" + relative}
        for published_version, ok in (("1.2.2", False), ("1.2.4", False), (None, False), ("1.2.3", True)):
            record = {"metadata": {**good, "version": published_version},
                      "files": [{"key": "companion.zip", "links": {"self": "https://example.org/companion.zip"},
                                 "checksum": "md5:" + hashlib.md5(archive_data).hexdigest()}]}
            with patch(__name__ + ".ROOT", root), patch(__name__ + ".urlopen", side_effect=[io.BytesIO(json.dumps(record).encode()), io.BytesIO(archive_data)]):
                result = audit(fixture_paper)
            assert result["ok"] == ok and result["versionMatches"] == ok
            assert result["archives"][0]["matchesRepository"]
            version_controls += 1
        (root / "papers/test/RELEASES.md").write_text("## 1.2.4\n\nProposed; not imported yet.\n")
        record["metadata"]["version"] = "1.2.3"
        with patch(__name__ + ".ROOT", root), patch(__name__ + ".urlopen", side_effect=[io.BytesIO(json.dumps(record).encode()), io.BytesIO(archive_data)]):
            assert audit(fixture_paper)["ok"]
        version_controls += 1
    print(f"Publication metadata self-test passed: 13 existing checks and {version_controls} version controls, including matching ZIPs at wrong versions")
    return 0


def audit(paper):
    expected_version = paper.get("archiveVersion")
    result = {"paper": paper["id"], "doi": paper.get("codeDoi"), "expectedVersion": expected_version,
              "validExpectedVersion": valid_archive_version(expected_version), "versionMatches": False, "ok": False}
    try:
        match = re.fullmatch(r"10\.5281/zenodo\.(\d+)", paper.get("codeDoi") or "")
        if not match:
            raise ValueError("no registered Zenodo version DOI")
        if not result["validExpectedVersion"]:
            raise ValueError("archiveVersion must identify the verified archive with a plain semver version")
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
        result["ok"] = result["versionMatches"] and result["preprint"] and result["titleMatches"] and result["licenseMatches"] and result["componentRightsDisclosed"] and bool(archives) and all(a["matchesRepository"] for a in archives)
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
              (": " + result["error"] if "error" in result else
               ": archive version " + str(result.get("version")) + " differs from " + str(result["expectedVersion"]) if not result["versionMatches"] else ""))
    return 0 if all(r["ok"] for r in results) else 1


if __name__ == "__main__":
    sys.exit(main())
