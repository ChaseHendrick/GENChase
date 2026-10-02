"""Standing provenance check for the committed Fourier-route records (no Arb needed; a few seconds).

For every results/fourier-existence-N*.json and results/fourier-stability-N*.json it checks that
  * each source SHA-256 stored in the record equals the SHA-256 of the file now in the repository;
  * the centre file hash stored in a Stage E record matches the centre file;
  * each Stage S record's stored hash of the Stage E record it read equals the current Stage E record file;
  * every record's status is the program's own status string (the review outcome lives in
    results/fourier-review-status.json, outside the hashed records, so that recording it does not break the
    Stage S hashes of the Stage E records).
Exit code 0 only if everything matches. Usage: python3 check_records.py
"""
import glob
import hashlib
import json
import os
import sys

STUDY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def sha(path):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def walk_hashes(obj, prefix=""):
    """Yield (key path, relative file, stored hash) for every {relative path: sha256} map in a record."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            if isinstance(v, str) and len(v) == 64 and all(c in "0123456789abcdef" for c in v) and (
                    k.endswith((".py", ".txt", ".hpp", ".md", ".json"))):
                yield prefix + k, k, v
            else:
                yield from walk_hashes(v, prefix + k + "/")


def main():
    bad, checked = [], 0
    for path in sorted(glob.glob(os.path.join(STUDY, "results", "fourier-existence-N*.json")) +
                       glob.glob(os.path.join(STUDY, "results", "fourier-stability-N*.json"))):
        rec = json.load(open(path))
        name = os.path.basename(path)
        for where, rel, stored in walk_hashes(rec):
            full = os.path.join(STUDY, rel)
            if not os.path.exists(full):
                bad.append(f"{name}: {where}: file {rel} missing")
                continue
            checked += 1
            if sha(full) != stored:
                bad.append(f"{name}: {where}: stored {stored[:12]}..., file {sha(full)[:12]}...")
        if "centre_file" in rec and "centre_sha256" in rec:
            checked += 1
            if sha(os.path.join(STUDY, rec["centre_file"])) != rec["centre_sha256"]:
                bad.append(f"{name}: centre file hash differs")
        if name.startswith("fourier-stability-"):
            e_path = os.path.join(STUDY, "results", name.replace("stability", "existence"))
            stored = [v for k, v in _flat(rec) if "stage_e_record_sha256" in k]
            if not stored:
                bad.append(f"{name}: no stored Stage E record hash")
            for v in stored:
                checked += 1
                if v != sha(e_path):
                    bad.append(f"{name}: stored Stage E record hash differs from {os.path.basename(e_path)}")
        if rec.get("status") != "computed; awaiting adversarial review":
            bad.append(f"{name}: unexpected status {rec.get('status')!r}")
    for b in bad:
        print("MISMATCH", b)
    print(f"{checked} hashes checked; {'all match' if not bad else str(len(bad)) + ' problem(s)'}")
    sys.exit(1 if bad else 0)


def _flat(obj, prefix=""):
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield from _flat(v, prefix + k + "/")
    else:
        yield prefix, obj


if __name__ == "__main__":
    main()
