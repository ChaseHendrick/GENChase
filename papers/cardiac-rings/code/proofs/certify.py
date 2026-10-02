"""Run the rigorous verifier on a frame file and write a reproducible certificate record.

The record joins the verifier's own JSON with: the intended claim (N, G_Ks interval, coupling) checked against the
frame file's header, SHA-256 hashes of the frame, the verifier binary and every source file it was built from, the
git commit of this repository, the CAPD commit, and the environment settings. A record whose `verified` is false is
kept too: a failed attempt is evidence, not something to delete.

Usage: python3 certify.py <verify binary> <frame file> <record.json> --N 8 --gks 0.0275 [--gks-hi 0.0275]
       [--coupling 64/64000] [--env KEY=VALUE ...] [--timeout SECONDS]
The coupling defaults to N^2/64000 (D = 1/64000 per ms, ring of unit length).
"""
import argparse, hashlib, json, os, subprocess, sys, tempfile, time

HERE = os.path.dirname(os.path.abspath(__file__))
STUDY = os.path.dirname(HERE)
SOURCES = ["proofs/verify.cpp", "model/tp06_capd.hpp", "model/setup.hpp", "model/scales.txt"]
CAPD_COMMIT = "03dc5628203334b214bb7d9fd63788a175521005"
CAPD_PATCHED_HEADER = "/tmp/claude-0/-home-user-GENChase/8e652c2a-6f64-5009-9ee8-187ba6394e5c/scratchpad/ext/capd-install/include/capd/poincare/PoincareMap_templateMembers.h"


def sha(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("binary"); ap.add_argument("frame"); ap.add_argument("record")
    ap.add_argument("--N", type=int, required=True); ap.add_argument("--gks", required=True); ap.add_argument("--gks-hi")
    ap.add_argument("--coupling"); ap.add_argument("--env", action="append", default=[]); ap.add_argument("--timeout", type=int, default=7200)
    a = ap.parse_args()
    gks_hi = a.gks_hi or a.gks
    coupling = a.coupling or (f"{a.N * a.N}/64000" if a.N > 1 else "0/1")
    head = open(a.frame).readline().split()
    want = [str(a.N), a.gks, gks_hi] + coupling.split("/")
    if head != want:
        sys.exit(f"frame header {head} does not match the intended claim {want}")
    env = dict(os.environ)
    settings = {}
    for kv in a.env:
        k, v = kv.split("=", 1)
        env[k] = v; settings[k] = v
    out_json = os.path.join(tempfile.mkdtemp(prefix="certify-"), "verify.json")
    t0 = time.time()
    try:
        r = subprocess.run([a.binary, a.frame, out_json], env=env, capture_output=True, text=True, timeout=a.timeout)
        rc, stdout, stderr = r.returncode, r.stdout, r.stderr
    except subprocess.TimeoutExpired as e:
        rc, stdout, stderr = "timeout", (e.stdout or b"").decode() if isinstance(e.stdout, bytes) else (e.stdout or ""), ""
    wall = time.time() - t0
    try:
        verify = json.load(open(out_json))
    except Exception as e:  # keep the attempt even if the verifier wrote nothing usable
        verify = {"verified": False, "error": f"no verifier record: {e}"}
    try:
        commit = subprocess.run(["git", "-C", STUDY, "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
        dirty = subprocess.run(["git", "-C", STUDY, "status", "--porcelain", "--"] + SOURCES, capture_output=True, text=True).stdout.strip() != ""
    except Exception:
        commit, dirty = "unknown", True
    rec = {
        "schema": "cardiac-cycle-certificate-record-v1",
        "claim": {"N": a.N, "gKs": [a.gks, gks_hi], "coupling_per_ms": coupling},
        "verified": bool(verify.get("verified")) and rc == 0,
        "verifier_exit": rc,
        "wall_seconds": round(wall, 1),
        "settings_env": settings,
        "hashes": {"frame": sha(a.frame), "verify_binary": sha(a.binary),
                   **{s: sha(os.path.join(STUDY, s)) for s in SOURCES}},
        "repository_commit": commit, "sources_dirty": dirty, "capd_commit": CAPD_COMMIT,
        "capd_patch": {"file": "proofs/capd-6.1.0-genchase.patch", "applied_header_sha256": sha(CAPD_PATCHED_HEADER) if os.path.exists(CAPD_PATCHED_HEADER) else None,
                       "applied": os.path.exists(CAPD_PATCHED_HEADER) and b"GENChase patch" in open(CAPD_PATCHED_HEADER, "rb").read()},
        "verifier": verify,
        "stdout_tail": stdout[-2000:], "stderr_tail": stderr[-3000:],
    }
    json.dump(rec, open(a.record, "w"), indent=1)
    os.remove(out_json) if os.path.exists(out_json) else None
    print(f"{'VERIFIED' if rec['verified'] else 'NOT VERIFIED'}  N={a.N}  record {a.record}  ({wall:.0f} s)")
    sys.exit(0 if rec["verified"] else 1)


if __name__ == "__main__":
    main()
