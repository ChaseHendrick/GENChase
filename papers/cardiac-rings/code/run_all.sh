#!/bin/sh
# Reproduce the Fourier-route records of this paper (Theorem A(ii), Theorem B and Theorem C).
#
#   sh code/run_all.sh                 provenance check and the link of the two cell certificates (seconds; needs
#                                      only Python)
#   sh code/run_all.sh 1,8             also rerun Stage E and Stage S for N = 1 and 8 (about 5 minutes)
#   sh code/run_all.sh 1,8,16,32,64    all five (about 25 minutes; Stage S at N = 64 needs about 3.6 GB)
#   sh code/run_all.sh continuation    re-derive the current single-cell conductance, uniform-stability and Hopf
#                                      collectors from complete fresh stored proofs, then compare exact records
#                                      (no full piece reproof; 1200-second collector cap). May be combined with alln.
#   sh code/run_all.sh alln            also re-derive, in Arb, every gluing inequality, the piece order and the Stage E
#                                      identifications of Theorem C from the stored exact data (alln.py --collect,
#                                      under a minute) and compare them with data/; "alln" may be added to a list of N
#                                      ("1,8,alln"). Re-proving pieces from their stored centres is done by
#                                      fourier/test_alln.py (about 10 to 15 minutes), not by this script.
#
# Run from the paper's folder (the folder that holds code/ and data/). The programs write their records to
# <root>/results, so this script stages code/ in a scratch folder, with the records of data/ as its results/: the
# committed records in data/ are never overwritten. It then compares the new records with data/ (period enclosures and
# stability bounds must agree; Section 8 of the manuscript states which late digits of Y0, Z1, Z2 and r_existence may
# differ). Exit status 0 only if every step passes.
# These programs and records were computed in the project's study folder; the hashes in the records refer to paths
# relative to that folder, whose layout code/ reproduces.
set -eu
HERE=$(cd "$(dirname "$0")/.." && pwd)
NS=${1:-}
WORK=$(mktemp -d "${TMPDIR:-/tmp}/cardiac-rings.XXXXXX")
trap 'rm -rf "$WORK"' EXIT

echo "== provenance: the copies in code/ and data/ against the hashes stored in the records"
mkdir -p "$WORK/check/results"
cp -R "$HERE/code/." "$WORK/check/"
cp "$HERE"/data/fourier-*.json "$WORK/check/results/"
# The original all-N certificate names fourier/branch.py. Restore its immutable
# 1.0 bytes in this historical execution layout, without changing the record.
(cd "$WORK/check" && python3 - <<'HISTORICAL_BRANCH_PY'
import hashlib, json, shutil
from pathlib import Path
r = json.loads(Path("results/fourier-existence-alln.json").read_bytes())
p = Path("fourier/branch-1.0.0.py")
expected = r["sources_sha256"]["fourier/branch.py"]
if hashlib.sha256(p.read_bytes()).hexdigest() != expected:
    raise RuntimeError("archived 1.0 branch bytes do not match unchanged all-N record")
shutil.copyfile(p, "fourier/branch.py")
print("historical all-N source mapping verified: branch-1.0.0.py -> branch.py")
HISTORICAL_BRANCH_PY
)
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

[ -n "$NS" ] || { echo "OK (provenance and link only; pass a list of N, alln, or continuation for additional checks)"; exit 0; }

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

case ",$NS," in
  *,branch,*|*,continuation,*)
    echo "== candidate Theorem D: scratch-only final branch, uniform-stability and Hopf collection"
    mkdir -p "$WORK/continuation/results"
    cp -R "$HERE/code/." "$WORK/continuation/"
    cp "$HERE"/data/fourier-*.json "$WORK/continuation/results/"
    (cd "$WORK/continuation" && OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1 timeout 1200 \
      python3 - "$HERE/data" <<'CONTINUATION_PY'
import copy, hashlib, json, math, os, re, sys
from pathlib import Path
from fractions import Fraction

# Compare JSON types as well as values: True, 1 and 1.0 are different receipts.
def canonical(x):
    return json.dumps(x, sort_keys=True, separators=(",", ":"), allow_nan=True)

def no_duplicate_keys(pairs):
    out = {}
    for key, value in pairs:
        if key in out:
            raise RuntimeError("duplicate JSON key: " + key)
        out[key] = value
    return out

def read_record(path):
    return json.loads(Path(path).read_bytes(), object_pairs_hook=no_duplicate_keys)

RUNTIME = {"python", "python_flint", "FLINT", "numpy", "machine", "date"}
POLYDISC = {"P", "P_kappa", "P_radius_max"}

def exact_dyadic(bound):
    text = bound["hex"]
    if type(text) is not str or not re.fullmatch(r"-?0x[0-9a-fA-F]+p[+-]?[0-9]+", text):
        raise RuntimeError("malformed exact dyadic proof bound")
    mantissa, exponent = text.split("p")
    return Fraction(int(mantissa, 16)) * Fraction(2) ** int(exponent)

def comparable(record, hopf=False, branch=False):
    result = copy.deepcopy(record)
    for key in RUNTIME:
        result.pop(key, None)
    if branch:
        for piece in result["pieces"]:
            shown = piece["Y0_over_cap"]
            if type(shown) is not float or not math.isfinite(shown) or shown < 0:
                raise RuntimeError("invalid branch display ratio")
            y, z1, z2 = (exact_dyadic(piece[k]) for k in ("Y0", "Z1", "Z2"))
            if not 0 <= y or not 0 <= z1 < 1 or not z2 > 0:
                raise RuntimeError("invalid exact branch proof bounds")
            ratio = 2 * y * z2 / (1-z1)**2
            if not 0 <= ratio < 1:
                raise RuntimeError("exact branch discriminant ratio does not pass")
            piece["Y0_over_cap"] = str(ratio)
    if hopf:
        if type(result["pieces_reproved"]["log"]) is not str or Path(result["pieces_reproved"]["log"]).name != "reprove_final.jsonl":
            raise RuntimeError("unexpected amplitude receipt log path")
        result["pieces_reproved"]["log"] = "reprove_final.jsonl"
        logs = result["bridge_checks"]["point_logs_sha256"]
        normalized = {}
        expected = {"points_K12.jsonl", "points_centres_K32.jsonl", "gks_points.jsonl", "gks_points_centres_K32.jsonl"}
        for path, value in logs.items():
            name = Path(path).name
            if name not in expected or name in normalized:
                raise RuntimeError("missing, unexpected or colliding point-log path")
            normalized[name] = value
        if set(normalized) != expected:
            raise RuntimeError("missing bridge point provenance")
        result["bridge_checks"]["point_logs_sha256"] = normalized
        ident = result["identification_at_eps0"]
        if ident.get("ok") is not True or ident.get("c_in_P") is not True or ident.get("theoremA_polydiscs_in_P") is not True:
            raise RuntimeError("zero-amplitude identification did not prove both inclusions")
        kappa = ident.get("P_kappa")
        if type(kappa) not in (float, int) or not math.isfinite(kappa) or not 0 <= kappa < 1:
            raise RuntimeError("zero-amplitude contraction is not strict")
        # These three freshly proved equilibrium-enclosure fields may depend on
        # the untrusted floating-point center. No amplitude radius, input, source,
        # gluing slack, critical-eigenpair field or success flag is exempted.
        for key in POLYDISC:
            ident.pop(key)
    return result

def compare(new, old, hopf=False, branch=False):
    a, b = comparable(new, hopf, branch), comparable(old, hopf, branch)
    if branch:
        diagnostics = []
        before = {v["label"]: v for v in old["pieces"]}
        for piece, normalized in zip(new["pieces"], a["pieces"]):
            previous = before[piece["label"]]["Y0_over_cap"]
            if canonical(piece["Y0_over_cap"]) != canonical(previous):
                diagnostics.append(dict(label=piece["label"], stored_display=previous,
                                        fresh_display=piece["Y0_over_cap"], exact_ratio=normalized["Y0_over_cap"]))
        print("branch display-only Y0_over_cap differences (exact proof ratio rederived): " + json.dumps(diagnostics))
    if canonical(a) != canonical(b):
        keys = sorted(k for k in set(a) | set(b) if canonical(a.get(k)) != canonical(b.get(k)))
        raise RuntimeError("collector differs in exact fields: " + ", ".join(keys))

def validate_stored_P(hp, record):
    ident = record["identification_at_eps0"]
    # Require exact dyadic text, not permissive float or malformed-prefix parsing.
    P = ident["P"]
    if set(P) != {"centre", "radius"} or any(type(P[k]) is not list or len(P[k]) != 18 for k in P):
        raise RuntimeError("zero-endpoint polydisc shape mismatch")
    for value in P["centre"] + P["radius"]:
        if type(value) is not str or not re.fullmatch(r"-?0x[0-9a-fA-F]+p[+-]?[0-9]+", value):
            raise RuntimeError("zero-endpoint polydisc requires exact dyadic strings")
    first = hp.final_pieces()[0]
    with hp.am.precision(192):
        omB, gB, cB, _, _ = hp.ball_of_piece_at(hp._piece_state(first), Fraction(0))
        ga, gb = map(Fraction, ident["g_interval"])
        if ga != Fraction(hp.dec(hp.lo(gB), "down", 25)) or gb != Fraction(hp.dec(hp.up(gB), "up", 25)):
            raise RuntimeError("zero-endpoint parameter enclosure mismatch")
        thA = read_record(Path(hp.DATA) / hp.THEOREM_A_LOG)
        intervals = [dict(a=thA["gH_interval"][0], b=thA["gH_interval"][1], polydisc=thA["polydisc_GH"])]
        intervals += thA["cover_left"] + thA["cover_right"]
        meet = sorted((v for v in intervals if Fraction(v["a"]) <= gb and Fraction(v["b"]) >= ga), key=lambda v: Fraction(v["a"]))
        if (not meet or Fraction(meet[0]["a"]) > ga or Fraction(meet[-1]["b"]) < gb
                or not all(Fraction(a["b"]) == Fraction(b["a"]) for a, b in zip(meet, meet[1:]))):
            raise RuntimeError("zero-endpoint equilibrium cover is incomplete")
        xc, radius = hp.polydisc_from_record(P)
        if not all(r > 0 for r in radius):
            raise RuntimeError("zero-endpoint polydisc radius not positive")
        prm = hp.am.params(192, g_Ks=hp._ball_interval(ga, gb))
        Fc, Jc = hp.am.f_and_df([hp.acb(x) for x in xc], prm, prec=192)
        inverse = hp.mat_from_np(hp.np.linalg.inv(hp.np_from_mat(Jc).real))
        box = [hp.acb(xc[i] + radius[i] * hp.arb(0, 1), radius[i] * hp.arb(0, 1)) for i in range(18)]
        _, Jbox = hp.am.f_and_df(box, prm, prec=192)
        ok, kappa, worst = hp.contraction_test(Fc, Jbox, inverse, radius)
        if not ok or not kappa < 1:
            raise RuntimeError("stored zero-endpoint complex polydisc contraction fails")
        if not all((cB[i] - xc[i]).abs_upper() <= radius[i] for i in range(18)):
            raise RuntimeError("stored polydisc does not contain the fresh amplitude endpoint")
        for iv in meet:
            ac, ar = hp.polydisc_from_record(iv["polydisc"])
            if not all((ac[i] - xc[i]).abs_upper() + ar[i] <= radius[i] for i in range(18)):
                raise RuntimeError("stored polydisc does not contain an equilibrium-cover polydisc")
    print("stored zero-endpoint complex polydisc contraction and both exact inclusions passed")

def strict_jsonl(path):
    raw = Path(path).read_bytes()
    if not raw or not raw.endswith(b"\n"):
        raise RuntimeError("missing or unterminated final JSONL: " + str(path))
    rows = []
    for line in raw.splitlines():
        if not line.strip():
            raise RuntimeError("blank final JSONL record")
        row = json.loads(line, object_pairs_hook=no_duplicate_keys)
        if type(row) is not dict:
            raise RuntimeError("non-object final JSONL record")
        rows.append(row)
    return rows

def validate_tube(row, branch_piece=None):
    existence = row["existence"]
    rho, y, kappa = (exact_dyadic(existence[k]) for k in ("rho", "Yprime", "kappa"))
    if not (rho > 0 and y >= 0 and 0 <= kappa < 1):
        raise RuntimeError("exact tube positivity or contraction invalid")
    if row["type"] == "group_unit":
        z1, z2 = (exact_dyadic(existence[k]) for k in ("Z1_path", "Z2"))
        rs = existence["r_star"]
        if type(rs) is not str or canonical(rs) != canonical(row["settings"]["r_star"]):
            raise RuntimeError("typed group validity radius mismatch")
        if not (0 <= exact_dyadic(existence["Z1_point"]) <= z1 < 1 and z2 >= 0 and rho <= Fraction(rs)):
            raise RuntimeError("invalid exact moving-center tube bounds")
        check = max(kappa, z1+z2*rho)
    else:
        z1, z2, e = (exact_dyadic(existence[k]) for k in ("Z1", "Z2_this_cover", "e"))
        if branch_piece is None or not (0 <= z1 < 1 and z2 >= 0 and e >= 0
                and e+rho <= exact_dyadic(branch_piece["r_star"])
                and e+rho <= exact_dyadic(branch_piece["r_uniqueness"])):
            raise RuntimeError("invalid exact affine tube bounds or branch inclusion")
        if (canonical(existence["Z1"]) != canonical(branch_piece["Z1"])
                or canonical(existence["theorem_B_bounds_reproduced"]) != canonical({"Y0": True, "Z1": True})):
            raise RuntimeError("piece tube branch bound reproduction mismatch")
        check = max(kappa, z1+z2*(e+rho))
    if not (check < 1 and y <= (1-check)*rho):
        raise RuntimeError("exact conservative tube self-map or contraction fails")
    if row.get("ok") is not True or row.get("uniform") is not True:
        raise RuntimeError("tube is not actual successful uniform output")
    return check

def validate_final_receipts(br, st, hp):
    branch_pieces, _, _ = br.validate_final(12)
    by_label = {p["rec"]["label"]: p["rec"] for p in branch_pieces}
    seen = set()
    for row in strict_jsonl(st.LOG.format(K=12)):
        kind = row.get("type")
        if kind not in {"unit", "group_unit", "failure", "group_failure"}:
            raise RuntimeError("unexpected final stability record")
        if kind in {"unit", "group_unit"}:
            key = (kind, row.get("label"))
            if key in seen or not st._current_unit(row):
                raise RuntimeError("duplicated or stale final stability success")
            if canonical(row.get("sources_sha256")) != canonical(st.SOURCES_SHA256):
                raise RuntimeError("typed stability source mismatch")
            validate_tube(row, by_label.get(row.get("label")))
            seen.add(key)
    print("exact conservative self-map/contraction checked for", len(seen), "current uniform units; original source-bound SC producer proof retained (full finite SC vectors are not serialized)")
    lines, covers = hp.piece_lines(), hp.cover_records()
    rows = strict_jsonl(Path(hp.DATA) / hp.REPROVE_LOG)
    ids = [r.get("idx") for r in rows]
    if any(type(i) is not int for i in ids) or len(ids) != len(set(ids)) or set(ids) != set(range(68)):
        raise RuntimeError("missing, duplicated or invalid final amplitude index")
    for row in rows:
        i = row["idx"]; piece, line_sha = lines[i]
        if "MUTATED" in row or "_obj" in row:
            raise RuntimeError("mutated or nonpublic amplitude receipt")
        result = row["result"]
        bounds = [result[k] for k in hp.REPROVE_KEYS]
        bounds += [result[k][side] for k in ("g", "omega", "T_ms") for side in ("lower", "upper")]
        if any(type(b["hex"]) is not str or re.fullmatch(r"-?0x[0-9a-fA-F]+p[+-]?[0-9]+", b["hex"]) is None for b in bounds):
            raise RuntimeError("malformed exact amplitude proof bound")
        if (row.get("type") != "reprove" or row.get("code_sha256") != hp.CODE_SHA256
                or canonical(row.get("sources_sha256")) != canonical(hp.SOURCE_SHA256)
                or row.get("piece_line_sha256") != line_sha or not hp._reproof_matches(row, piece, covers)):
            raise RuntimeError("current amplitude source/input/settings/proof mismatch")
        for key in ("cover", "e_lo", "e_hi"):
            if canonical(row.get(key)) != canonical(piece[key]):
                raise RuntimeError("typed amplitude input mismatch")
        if canonical(row.get("values")) != canonical(hp._exact_values(result)):
            raise RuntimeError("amplitude exact-value receipt mismatch")

sys.path.insert(0, str(Path("fourier").resolve()))
import branch as br
import branch_stability as st
import hopf as hp
if sys.version_info[:2] != (3, 12):
    raise RuntimeError("candidate continuation runtime requires Python 3.12")
if os.environ.get("ARBMODEL_ALLOW_OTHER_FLINT") == "1":
    raise RuntimeError("un-pinned arithmetic override is not admitted")
hp.am.check_flint()
validate_final_receipts(br, st, hp)
if st.np.__version__ != "2.4.6":
    raise RuntimeError("candidate continuation requires the pinned numpy 2.4.6")
accepted = {name: read_record(Path(sys.argv[1]) / name) for name in
            ("fourier-branch-gks.json", "fourier-branch-stability-uniform.json", "fourier-hopf.json")}
# The complete final source/input manifest, unique 712 pieces and group metadata
# are checked before any collector; all branch inclusions are freshly rederived.
pieces, groups, centres = br.validate_final(12)
br.validate_logs(12, reglue=True, repair=False)
if len(pieces) != 712 or len(groups) != 57:
    raise RuntimeError("expected exactly 712 pieces in 57 complete groups")
b = br.collect(12, write=False)
compare(b, accepted["fourier-branch-gks.json"], branch=True)
if b["connected_pieces"] != 712 or b["n_pieces"] != 712:
    raise RuntimeError("incomplete final conductance branch")
u = st.collect(12, write=False)
compare(u, accepted["fourier-branch-stability-uniform.json"])
if u["n_pieces_branch"] != 712 or u["n_pieces_uniform"] != 712 or u["uncovered_pieces"]:
    raise RuntimeError("uniform stability does not cover the entire branch")
h = hp.collect(write=False)
validate_stored_P(hp, h)
validate_stored_P(hp, accepted["fourier-hopf.json"])
compare(h, accepted["fourier-hopf.json"], hopf=True)
if (h["n_pieces"] != 68 or h["gluing_eps_pieces"]["n"] != 67
        or h["hopf_gap_closed"] is not True or h["bridge_checks"]["ok"] is not True
        or h["identification_at_eps0"]["ok"] is not True
        or h["stability_points"] or h["bridge_checks"]["stable_bridge_points"]):
    raise RuntimeError("Hopf candidate gates failed or inherited point stability")
print("OK: 712 branch pieces, 711 inclusions, complete uniform cover, 68 amplitude pieces, 67 inclusions, zero identity and fresh existence-only bridge")
print("Exact source/input/settings/data and mathematical fields match; runtime metadata, exact path relocation, directly validated zero-endpoint polydisc and reported display-only Y0/cap rounding are the comparison exceptions")
CONTINUATION_PY
    ) || { echo "FAIL: candidate continuation collect"; exit 1; }
    NS=$(echo "$NS" | tr ',' '\n' | grep -v -E '^(branch|continuation)$' | paste -sd, -)
    [ -n "$NS" ] || { echo "OK (candidate collection checks; full original numerical suites and manuscript acceptance remain separate gates)"; exit 0; }
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
