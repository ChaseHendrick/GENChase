#!/usr/bin/env python3
"""Check the manuscript in a companion's actual Git source ZIP before a new release.

Usage: python3 tools/paper-archive-check.py <paper-id> <companion-checkout> [ref]
This checks packaging, not the scientific content or freshness of the manuscript.
"""
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import subprocess
import sys
import zipfile


def check(paper_id, repo, ref="HEAD"):
    root = Path(__file__).resolve().parent.parent
    registry = json.loads((root / "papers/papers.json").read_text())
    paper = next(p for p in registry["papers"] if p["id"] == paper_id)
    prefix = f"papers/{paper_id}/"
    pdf = paper.get("pdf")
    if not isinstance(pdf, str) or not pdf.startswith(prefix):
        raise ValueError(f"{paper_id}: register a manuscript PDF in papers/papers.json before releasing")
    relative = pdf[len(prefix):]
    if ".." in PurePosixPath(relative).parts or not relative.endswith(".pdf"):
        raise ValueError("invalid manuscript PDF path")

    def git(*args):
        return subprocess.run(["git", "-C", repo, *args], check=True,
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60).stdout

    # The complete archive honours export-ignore and export-subst, just like GitHub's source ZIP.
    with zipfile.ZipFile(io.BytesIO(git("archive", "--format=zip", ref))) as archive:
        if relative not in archive.namelist():
            raise ValueError(f"{relative} is missing from the source ZIP (untracked or export-ignore)")
        data = archive.read(relative)
    if not data.startswith(b"%PDF-") or b"%%EOF" not in data[-1024:]:
        raise ValueError(f"{relative} has no complete PDF header and trailer")
    if data != git("show", f"{ref}:{relative}"):
        raise ValueError(f"{relative} differs from the committed PDF in the source ZIP")
    return {"paper": paper_id, "pdf": relative, "bytes": len(data),
            "sha256": hashlib.sha256(data).hexdigest()}


if __name__ == "__main__":
    try:
        if len(sys.argv) not in (3, 4):
            raise ValueError(__doc__.strip())
        print(json.dumps(check(*sys.argv[1:]), sort_keys=True))
    except (ValueError, KeyError, StopIteration, OSError, subprocess.SubprocessError, zipfile.BadZipFile) as exc:
        print(f"paper-archive-check: {exc}", file=sys.stderr)
        sys.exit(1)
