#!/bin/sh
# Reproduce the Fourier-route records of this paper (Theorem A(ii) and Theorem B).
#
#   sh code/run_all.sh                 provenance check only (seconds; needs only Python)
#   sh code/run_all.sh 1,8             also rerun Stage E and Stage S for N = 1 and 8 (about 5 minutes)
#   sh code/run_all.sh 1,8,16,32,64    all five (about 25 minutes; Stage S at N = 64 needs about 3.6 GB)
#
# Run from the paper's folder (papers/cardiac-rings). The programs write their records to <root>/results, so this
# script stages code/ in a scratch folder: the committed records in data/ are never overwritten. It then compares the
# new records with data/ (period enclosures and stability bounds must agree; see notes/rerun-2026-10-01.md for the
# expected last-digit differences in Y0, Z1, Z2 and r_existence). Exit status 0 only if every step passes.
# Canonical location of these programs and records: research/cardiac-cycle-certificates/ in GENChase; the hashes in
# the records refer to paths relative to that folder, which code/ reproduces.
set -eu
HERE=$(cd "$(dirname "$0")/.." && pwd)
NS=${1:-}
WORK=$(mktemp -d "${TMPDIR:-/tmp}/cardiac-rings.XXXXXX")
trap 'rm -rf "$WORK"' EXIT

echo "== provenance: the copies in code/ and data/ against the hashes stored in the records"
mkdir -p "$WORK/check/results"
cp -R "$HERE/code/." "$WORK/check/"
cp "$HERE"/data/fourier-*.json "$WORK/check/results/"
(cd "$WORK/check" && timeout 120 python3 fourier/check_records.py)

echo "== link of the two cell certificates (Lemma 6.1): the Fourier orbit's section point lies in the CAPD ball"
cp "$HERE/data/cell-gks0.0275.json" "$WORK/check/results/"
(cd "$WORK/check" && timeout 300 python3 fourier/link_cell.py > link.txt) || { cat "$WORK/check/link.txt"; echo "FAIL: link"; exit 1; }
tail -3 "$WORK/check/link.txt"

[ -n "$NS" ] || { echo "OK (provenance and link only; pass a list of N to rerun the proofs)"; exit 0; }

echo "== rerun Stage E and Stage S for N = $NS"
mkdir -p "$WORK/run/results"
cp -R "$HERE/code/." "$WORK/run/"
cp "$HERE/data/cell-gks0.0275.json" "$WORK/run/results/"
export OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1
cd "$WORK/run"
timeout 3600 python3 fourier/existence.py --N "$NS" | tee existence.log
if grep -q FAILED existence.log; then echo "FAIL: Stage E"; exit 1; fi
timeout 3600 python3 fourier/stability.py --N "$NS" | tee stability.log
if grep -q FAILED stability.log; then echo "FAIL: Stage S"; exit 1; fi

echo "== compare with data/"
timeout 120 python3 - "$HERE/data" "$NS" <<'PY'
import json, sys
data, ns = sys.argv[1], [int(v) for v in sys.argv[2].split(",")]
same_e = ["T_ms", "omega", "r_uniqueness"]
same_s = ["delta", "T_lo", "multiplier_bound_full_period", "multiplier_bound_reduced_map", "count_in_Omega"]
bad = 0
for N in ns:
    for stage, keys in (("existence", same_e), ("stability", same_s)):
        new = json.load(open(f"results/fourier-{stage}-N{N}.json"))
        old = json.load(open(f"{data}/fourier-{stage}-N{N}.json"))
        for k in keys:
            ok = new[k] == old[k]
            bad += not ok
            print(("same " if ok else "DIFF ") + f"N = {N} {stage} {k}")
sys.exit(1 if bad else 0)
PY
echo "OK"
