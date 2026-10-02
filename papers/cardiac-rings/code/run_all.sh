#!/bin/sh
# Reproduce the Fourier-route records of this paper (Theorem A(ii), Theorem B and Theorem C).
#
#   sh code/run_all.sh                 provenance check only (seconds; needs only Python)
#   sh code/run_all.sh 1,8             also rerun Stage E and Stage S for N = 1 and 8 (about 5 minutes)
#   sh code/run_all.sh 1,8,16,32,64    all five (about 25 minutes; Stage S at N = 64 needs about 3.6 GB)
#   sh code/run_all.sh alln            also re-derive, in Arb, every gluing inequality, the piece order and the Stage E
#                                      identifications of Theorem C from the stored exact data (alln.py --collect,
#                                      under a minute) and compare them with data/; "alln" may be added to a list of N
#                                      ("1,8,alln"). Re-proving pieces from their stored centres is done by
#                                      fourier/test_alln.py (about 15 minutes), not by this script.
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

echo "== provenance of the every-N record (Theorem C): its sources, its run log and the Stage E records it identifies"
(cd "$WORK/check" && timeout 120 python3 - <<'PY'
import hashlib, json, os, sys
sha = lambda p: hashlib.sha256(open(p, "rb").read()).hexdigest()
rec = json.load(open("results/fourier-existence-alln.json"))
pairs = list(rec["sources_sha256"].items()) + [(rec["pieces_log"], rec["pieces_log_sha256"])]
pairs += [("results/fourier-existence-N%d.json" % s["N"], s["stage_E_record_sha256"]) for s in rec["stage_E_inclusion"]]
bad = [p for p, h in pairs if not os.path.exists(p) or sha(p) != h]
if rec["failures_log_sha256"] is None and os.path.exists(rec["failures_log"]):
    bad.append(rec["failures_log"] + " exists but the record has no hash for it")
if not (rec["complete_cover_of_0_to_1_64"] and rec["eps_covered"] == ["0", "1/64"] and not rec["missing_plan_pieces"]):
    bad.append("the record does not cover [0, 1/64]")
for b in bad:
    print("MISMATCH", b)
print("%d hashes checked; %s" % (len(pairs), "all match" if not bad else "%d problem(s)" % len(bad)))
sys.exit(1 if bad else 0)
PY
)

echo "== link of the two cell certificates (Lemma 6.1): the Fourier orbit's section point lies in the CAPD ball"
cp "$HERE/data/cell-gks0.0275.json" "$WORK/check/results/"
(cd "$WORK/check" && timeout 300 python3 fourier/link_cell.py > link.txt) || { cat "$WORK/check/link.txt"; echo "FAIL: link"; exit 1; }
tail -3 "$WORK/check/link.txt"

[ -n "$NS" ] || { echo "OK (provenance and link only; pass a list of N, or alln, to rerun)"; exit 0; }

case ",$NS," in
  *,alln,*)
    echo "== Theorem C: re-derive the gluing, the piece order and the Stage E identifications (alln.py --collect)"
    (cd "$WORK/check" && OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1 timeout 1200 \
      python3 fourier/alln.py --collect > alln.log 2>&1) || { tail -20 "$WORK/check/alln.log"; echo "FAIL: alln collect"; exit 1; }
    tail -1 "$WORK/check/alln.log"
    (cd "$WORK/check" && timeout 120 python3 - "$HERE/data/fourier-existence-alln.json" <<'PY'
import json, sys
new = json.load(open("results/fourier-existence-alln.json"))
old = json.load(open(sys.argv[1]))
keys = ["theorem", "eps_covered", "complete_cover_of_0_to_1_64", "missing_plan_pieces", "n_pieces", "n_glued_chain",
        "non_consecutive_overlaps", "pieces", "gluing", "stage_E_inclusion", "sources_sha256", "pieces_log_sha256"]
bad = 0
for k in keys:
    ok = new[k] == old[k]
    bad += not ok
    print(("same " if ok else "DIFF ") + k)
sys.exit(1 if bad else 0)
PY
    ) || { echo "FAIL: alln differs from data/"; exit 1; }
    NS=$(echo "$NS" | tr ',' '\n' | grep -v '^alln$' | paste -sd, -)
    [ -n "$NS" ] || { echo "OK"; exit 0; }
    ;;
esac

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
