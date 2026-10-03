#!/usr/bin/env python3
"""Verify registered Zenodo versions and compare their source ZIP manuscript PDFs.

Usage: python3 tools/paper-zenodo-check.py [--paper ID] [--out report.json]
Read-only. No record, release, tag or DOI is created or changed.
archiveVersion identifies the verified release at codeDoi; a proposed newer
release does not change this expectation until its archive has been verified.
archiveFilename, when registered for a new branded deposit, must equal
HendrickResearch_<paper-id>_<archiveVersion>.zip. Absent fields retain legacy checks.
archiveManuscript binds the reviewed published PDF to its version, DOI, relative
path and immutable tag commit. A newer working PDF does not replace that reference.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import re
import sys
import stat
import tempfile
from unittest.mock import patch
from urllib.request import urlopen
import zipfile

ROOT = Path(__file__).resolve().parent.parent


def awaiting_first_archive(paper):
    # A companion registered before its first release has no archive to verify yet. Only an entry
    # with neither field counts; one field without the other is an error that audit() reports.
    return not paper.get("codeDoi") and paper.get("archiveVersion") is None


def valid_archive_version(version):
    # New companion release versions use a plain semver core, without a leading v.
    return isinstance(version, str) and re.fullmatch(r"(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)", version) is not None


def expected_archive_filename(paper):
    if "archiveFilename" not in paper:
        return None
    if (not isinstance(paper.get("id"), str) or
            re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", paper["id"]) is None or
            not valid_archive_version(paper.get("archiveVersion"))):
        raise ValueError("branded archiveFilename requires a valid paper id and verified archiveVersion")
    expected = f"HendrickResearch_{paper['id']}_{paper['archiveVersion']}.zip"
    if paper["archiveFilename"] != expected or not isinstance(paper["archiveFilename"], str):
        raise ValueError("archiveFilename must be " + expected)
    return expected


def branded_root_matches(archive, expected_filename):
    root = expected_filename[:-4]
    seen = set()
    for info in archive.infolist():
        name = info.filename
        path = name[:-1] if info.is_dir() else name
        mode = info.external_attr >> 16
        if (name in seen or stat.S_ISLNK(mode) or info.flag_bits & 1 or
                stat.S_IFMT(mode) not in (0, stat.S_IFREG, stat.S_IFDIR) or
                not path or path.startswith('/') or '\\' in path or
                any(ord(c) < 32 or ord(c) == 127 for c in path) or
                any(part in ('', '.', '..') for part in path.split('/')) or
                str(PurePosixPath(path)) != path or
                not (path == root or path.startswith(root + '/'))):
            return False
        seen.add(name)
        if info.is_dir():
            if stat.S_IFMT(mode) not in (0, stat.S_IFDIR) or archive.read(info):
                return False
        elif path == root or stat.S_IFMT(mode) == stat.S_IFDIR:
            return False
    return bool(seen)


def manuscript_reference(paper):
    """Validate the declared release reference before network or file access."""
    prefix = f"papers/{paper['id']}/"
    pdf = paper.get("pdf")
    if not isinstance(pdf, str) or not pdf.startswith(prefix):
        raise ValueError("no registered manuscript PDF")
    relative = pdf[len(prefix):]
    if (not relative or relative.startswith('/') or '\\' in relative or
            any(ord(c) < 32 or ord(c) == 127 for c in relative) or
            any(part in ('', '.', '..') for part in relative.split('/')) or
            str(PurePosixPath(relative)) != relative or not relative.endswith('.pdf')):
        raise ValueError("unsafe registered manuscript PDF path")
    if "archiveManuscript" not in paper:
        return relative, None
    bound = paper["archiveManuscript"]
    if (type(bound) is not dict or
            set(bound) != {'version', 'doi', 'path', 'tagCommit', 'sha256'} or
            any(type(bound[k]) is not str for k in bound)):
        raise ValueError("archiveManuscript requires exactly five string fields")
    if (not valid_archive_version(bound['version']) or bound['version'] != paper.get('archiveVersion') or
            re.fullmatch(r"10\.5281/zenodo\.[1-9][0-9]*", bound['doi']) is None or
            bound['doi'] != paper.get('codeDoi') or bound['path'] != relative or
            re.fullmatch(r'[0-9a-f]{40}', bound['tagCommit']) is None or
            re.fullmatch(r'[0-9a-f]{64}', bound['sha256']) is None):
        raise ValueError("archiveManuscript is malformed or stale for the registered release")
    return relative, dict(bound)


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
    binding_controls = 0
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
        branded = {**fixture_paper, "archiveFilename": "HendrickResearch_test_1.2.3.zip"}
        legacy_archive_data = archive_data
        def wrapped(root_name):
            stream = io.BytesIO()
            with zipfile.ZipFile(stream, 'w') as z:
                z.writestr(root_name + '/' + relative, pdf)
            return stream.getvalue()
        archive_data = wrapped(branded['archiveFilename'][:-4])
        record['files'][0]['checksum'] = 'md5:' + hashlib.md5(archive_data).hexdigest()
        for wrong_root in ('companion-abcdef1', 'ChaseHendrick/test-1.2.3', 'HendrickResearch_test_1.2.4', branded['archiveFilename'][:-4] + '/nested'):
            wrong = wrapped(wrong_root)
            altered = {**record, 'files': [{**record['files'][0], 'key': branded['archiveFilename'], 'checksum': 'md5:' + hashlib.md5(wrong).hexdigest()}]}
            with patch(__name__ + '.ROOT', root), patch(__name__ + '.urlopen', side_effect=[io.BytesIO(json.dumps(altered).encode()), io.BytesIO(wrong)]):
                result = audit(branded)
            assert not result['ok']
            version_controls += 1
        with patch(__name__ + '.ROOT', root), patch(__name__ + '.urlopen', side_effect=[io.BytesIO(json.dumps({**record, 'files': [{**record['files'][0], 'key':'companion.zip', 'checksum':'md5:' + hashlib.md5(legacy_archive_data).hexdigest()}]}).encode()), io.BytesIO(legacy_archive_data)]):
            assert audit(fixture_paper)['ok']
        version_controls += 1
        for filename, ok in [(branded["archiveFilename"], True), ("companion.zip", False),
                             ("ChaseHendrick/test-1.2.3.zip", False), ("HendrickResearch_test_1.2.4.zip", False)]:
            record["files"][0]["key"] = filename
            with patch(__name__ + ".ROOT", root), patch(__name__ + ".urlopen", side_effect=[io.BytesIO(json.dumps(record).encode()), io.BytesIO(archive_data)]):
                result = audit(branded)
            assert result["ok"] == ok and result["archiveFilenameMatches"] == ok
            version_controls += 1
        for filename in [None, True, [], "../test.zip", "HendrickResearch_test_1.2.3.zip\n", "HendrickResearch_other_1.2.3.zip"]:
            with patch(__name__ + ".urlopen") as request:
                failed = audit({**branded, "archiveFilename": filename})
                assert not failed["ok"] and "archiveFilename" in failed["error"]
                request.assert_not_called()
            version_controls += 1
        record["files"][0]["key"] = branded["archiveFilename"]
        duplicated = {**record, "files": record["files"] * 2}
        with patch(__name__ + ".ROOT", root), patch(__name__ + ".urlopen", side_effect=[io.BytesIO(json.dumps(duplicated).encode()), io.BytesIO(archive_data), io.BytesIO(archive_data)]):
            result = audit(branded)
        assert not result["ok"] and not result["archiveFilenameMatches"]
        version_controls += 1
        # Published bytes remain the reference when a working manuscript advances.
        binding = {'version': '1.2.3', 'doi': '10.5281/zenodo.1', 'path': relative,
                   'tagCommit': 'a' * 40, 'sha256': hashlib.sha256(pdf).hexdigest()}
        released = {**branded, 'archiveManuscript': binding}
        stream = io.BytesIO(archive_data)
        with zipfile.ZipFile(stream, 'a') as archive:
            archive.comment = binding['tagCommit'].encode('ascii')
        archive_data = stream.getvalue()
        record['files'][0]['checksum'] = 'md5:' + hashlib.md5(archive_data).hexdigest()
        target.write_bytes(b'%PDF-1.7\nnew working manuscript\n%%EOF\n')
        with patch(__name__ + '.ROOT', root), patch(__name__ + '.urlopen', side_effect=[io.BytesIO(json.dumps(record).encode()), io.BytesIO(archive_data)]):
            result = audit(released)
        assert result['ok'] and result['archives'][0]['matchesExpectedPdf']
        assert not result['archives'][0]['matchesRepository']
        assert result['pdfReference']['tagCommit'] == binding['tagCommit']
        assert result['workingPdfSha256'] != result['expectedPdfSha256']
        assert result['archives'][0]['tagCommitMatches']
        binding_controls += 1
        with patch(__name__ + '.ROOT', root), patch(__name__ + '.urlopen', side_effect=[io.BytesIO(json.dumps(record).encode()), io.BytesIO(archive_data)]):
            assert not audit(branded)['ok']  # Legacy comparison remains exact.
        binding_controls += 1
        invalid_bindings = [None, True, [], {}, {**binding, 'extra': 'x'},
                            {k: v for k, v in binding.items() if k != 'tagCommit'}]
        for field, values in {
            'version': ['1.2.4', 'v1.2.3', True],
            'doi': ['10.5281/zenodo.2', '10.5281/zenodo.01', True],
            'path': ['paper/other.pdf', '../paper/test.pdf', 'paper//test.pdf', '/paper/test.pdf', True],
            'tagCommit': ['a' * 39, 'A' * 40, 'g' * 40, True],
            'sha256': ['a' * 63, 'A' * 64, 'g' * 64, True],
        }.items():
            invalid_bindings.extend({**binding, field: value} for value in values)
        for invalid in invalid_bindings:
            with patch(__name__ + '.ROOT', root), patch(__name__ + '.urlopen') as request:
                failed = audit({**released, 'archiveManuscript': invalid})
                assert not failed['ok'] and 'archiveManuscript' in failed['error']
                request.assert_not_called()
            binding_controls += 1
        for changed in ({'archiveVersion': '1.2.4'}, {'codeDoi': '10.5281/zenodo.2'},
                        {'pdf': 'papers/test/paper/new.pdf'}):
            with patch(__name__ + '.ROOT', root), patch(__name__ + '.urlopen') as request:
                assert not audit({**released, **changed})['ok']
                request.assert_not_called()
            binding_controls += 1
        # A well-formed incorrect pin, or replacing the release PDF by the newer
        # working PDF, must still fail its exact digest gate.
        for proposed in ({**binding, 'sha256': '0' * 64}, binding):
            data = archive_data
            if proposed is binding:
                stream = io.BytesIO()
                with zipfile.ZipFile(stream, 'w') as archive:
                    archive.writestr(branded['archiveFilename'][:-4] + '/' + relative, target.read_bytes())
                    archive.comment = binding['tagCommit'].encode('ascii')
                data = stream.getvalue()
            altered = {**record, 'files': [{**record['files'][0], 'checksum': 'md5:' + hashlib.md5(data).hexdigest()}]}
            with patch(__name__ + '.ROOT', root), patch(__name__ + '.urlopen', side_effect=[io.BytesIO(json.dumps(altered).encode()), io.BytesIO(data)]):
                result = audit({**released, 'archiveManuscript': proposed})
            assert not result['ok'] and not result['archives'][0]['matchesExpectedPdf']
            binding_controls += 1
        for comment in (b'', b'a' * 39, b'A' * 40, b'b' * 40, b'a' * 40 + b'\n'):
            stream = io.BytesIO(archive_data)
            with zipfile.ZipFile(stream, 'a') as archive:
                archive.comment = comment
            data = stream.getvalue()
            altered = {**record, 'files': [{**record['files'][0], 'checksum': 'md5:' + hashlib.md5(data).hexdigest()}]}
            with patch(__name__ + '.ROOT', root), patch(__name__ + '.urlopen', side_effect=[io.BytesIO(json.dumps(altered).encode()), io.BytesIO(data)]):
                result = audit(released)
            assert not result['ok'] and result['archives'][0]['matchesExpectedPdf']
            assert not result['archives'][0]['tagCommitMatches']
            binding_controls += 1
        with patch(__name__ + '.ROOT', root), patch(__name__ + '.urlopen', side_effect=[io.BytesIO(json.dumps(record).encode()), io.BytesIO(archive_data)]):
            result = audit({**released, 'archiveManuscript': {**binding, 'tagCommit': 'b' * 40}})
        assert not result['ok'] and result['archives'][0]['matchesExpectedPdf']
        assert not result['archives'][0]['tagCommitMatches']
        binding_controls += 1
        for unsafe in ('papers/test/../test/paper/test.pdf', 'papers/test/paper//test.pdf',
                       'papers/test/paper/./test.pdf', 'papers/test/paper\\test.pdf'):
            with patch(__name__ + '.ROOT', root), patch(__name__ + '.urlopen') as request:
                assert not audit({**released, 'pdf': unsafe})['ok']
                request.assert_not_called()
            binding_controls += 1
    pending_controls = 0
    for entry, pending in (({"id": "new"}, True), ({"id": "new", "codeDoi": None, "archiveVersion": None}, True),
                           ({"id": "x", "codeDoi": "10.5281/zenodo.1"}, False), ({"id": "x", "archiveVersion": "1.0.0"}, False),
                           ({"id": "x", "archiveVersion": ""}, False), (paper, False)):
        assert awaiting_first_archive(entry) == pending
        pending_controls += 1
    print(f"Publication metadata self-test passed: 13 existing checks, {version_controls} version controls, {binding_controls} published-PDF binding controls, and {pending_controls} first-release controls")
    return 0


def audit(paper):
    expected_version = paper.get("archiveVersion")
    result = {"paper": paper["id"], "doi": paper.get("codeDoi"), "expectedVersion": expected_version,
              "validExpectedVersion": valid_archive_version(expected_version), "versionMatches": False, "ok": False}
    try:
        expected_filename = expected_archive_filename(paper)
        result["expectedArchiveFilename"] = expected_filename
        match = re.fullmatch(r"10\.5281/zenodo\.(\d+)", paper.get("codeDoi") or "")
        if not match:
            raise ValueError("no registered Zenodo version DOI")
        if not result["validExpectedVersion"]:
            raise ValueError("archiveVersion must identify the verified archive with a plain semver version")
        relative, binding = manuscript_reference(paper)
        working_path = ROOT / paper['pdf']
        working_digest = hashlib.sha256(working_path.read_bytes()).hexdigest() if working_path.is_file() else None
        if binding is None and working_digest is None:
            raise ValueError("legacy manuscript PDF reference is missing")
        expected = binding['sha256'] if binding is not None else working_digest
        result['pdfReference'] = ({'kind': 'published-release-binding', **binding} if binding is not None else
                                  {'kind': 'working-tree-legacy', 'path': relative, 'sha256': expected})
        result['expectedPdfSha256'] = expected
        result['workingPdfSha256'] = working_digest
        result['repositoryPdfSha256'] = working_digest
        url = "https://zenodo.org/api/records/" + match[1]
        with urlopen(url, timeout=30) as response:
            record = json.load(response)
        result["record"] = "https://zenodo.org/records/" + match[1]
        result.update(publication_metadata(paper, record))
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
                root_matches = expected_filename is None or branded_root_matches(archive, expected_filename)
                matches = ([n for n in names if n == expected_filename[:-4] + '/' + relative] if expected_filename is not None else
                           [n for n in names if n == relative or n.endswith('/' + relative)])
                digest = hashlib.sha256(archive.read(matches[0])).hexdigest() if len(matches) == 1 else None
                tag_matches = archive.comment == binding['tagCommit'].encode('ascii') if binding is not None else None
            archives.append({"file": item["key"], "url": item["links"]["self"],
                             "zipSha256": hashlib.sha256(data).hexdigest(), "manuscript": matches,
                             "manuscriptSha256": digest, "matchesRepository": digest is not None and digest == working_digest,
                             "matchesExpectedPdf": digest is not None and digest == expected, "archiveRootMatches": root_matches,
                             "tagCommitMatches": tag_matches})
        result["archives"] = archives
        result["archiveFilenameMatches"] = expected_filename is None or (len(archives) == 1 and archives[0]["file"] == expected_filename)
        result["ok"] = result["versionMatches"] and result["preprint"] and result["titleMatches"] and result["licenseMatches"] and result["componentRightsDisclosed"] and result["archiveFilenameMatches"] and bool(archives) and all(a["matchesExpectedPdf"] and a["archiveRootMatches"] and (binding is None or a['tagCommitMatches']) for a in archives)
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
    pending = [p for p in papers if awaiting_first_archive(p)]
    papers = [p for p in papers if not awaiting_first_archive(p)]
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(audit, papers))
    report = {"checkedAt": datetime.now(timezone.utc).isoformat(), "papers": results,
              "awaitingFirstArchive": [p["id"] for p in pending]}
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(json.dumps(report, indent=2) + "\n")
    for result in results:
        print(("PASS" if result["ok"] else "FAIL") + " " + result["paper"] + " " + str(result["doi"]) +
              (": " + result["error"] if "error" in result else
               ": archive version " + str(result.get("version")) + " differs from " + str(result["expectedVersion"]) if not result["versionMatches"] else ""))
    for paper in pending:
        print("SKIP " + paper["id"] + ": companion registered, no archive yet (first release pending)")
    return 0 if all(r["ok"] for r in results) else 1


if __name__ == "__main__":
    sys.exit(main())
