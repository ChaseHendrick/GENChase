"""Isolated uniform-stability shards and strict producer-receipt collection.

Exact tube/contraction and identification fields are checked independently here.
The public scientific records expose only a floating SC worst ratio, not every
exact SC column. SC is therefore a fresh source-bound producer proof gate, not
an independent exact reconstruction. No proof sources or canonical data change.
"""
import argparse
import copy
from fractions import Fraction
import hashlib
import importlib
import importlib.util
import json
import math
import os
from pathlib import Path
import re
import shutil
import sys

ROOT = Path(__file__).resolve().parents[2]
FOURIER = ROOT / "research/cardiac-cycle-certificates/fourier"
CANONICAL = FOURIER / "data/branch"
RESULTS = FOURIER.parent / "results"
for variable in ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS",
                 "BLIS_NUM_THREADS", "VECLIB_MAXIMUM_THREADS", "NUMEXPR_NUM_THREADS"):
    os.environ[variable] = "1"
_spec = importlib.util.spec_from_file_location("cardiac_branch_shards",
                                              Path(__file__).with_name("cardiac-branch-shards.py"))
common = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(common)
digest = common.digest
unique_object = common.unique_object
BOUND = re.compile(r"-?0x[0-9a-fA-F]+p[+-]?[0-9]+\Z")
KINDS = {"group_unit", "unit", "group_failure", "failure"}
ALLOWED_INF = {("strips", strip, "S_over_L_max")
               for strip in ("G_pt", "G_box", "J_pt", "J_box", "G1", "G2", "J1")}


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def numbers(value, path=()):
    if isinstance(value, dict):
        for key, child in value.items():
            if key in {"MUTATED", "_ctx", "_internals", "internals"}:
                raise ValueError("private or mutated proof record")
            numbers(child, path + (key,))
    elif isinstance(value, list):
        for child in value:
            numbers(child, path + ("[]",))
    elif isinstance(value, float) and not math.isfinite(value):
        if value != math.inf or path not in ALLOWED_INF:
            raise ValueError(f"nonfinite outside explicit strip diagnostic: {path}")


def read_json(path):
    result = json.loads(Path(path).read_bytes(), object_pairs_hook=unique_object)
    numbers(result)
    return result


def read_jsonl(path):
    raw = Path(path).read_bytes()
    if raw and not raw.endswith(b"\n"):
        raise ValueError("incomplete JSONL tail")
    rows = [json.loads(line, object_pairs_hook=unique_object) for line in raw.splitlines() if line.strip()]
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError("JSONL records must be objects")
        numbers(row)
    return rows


def write_new(path, rows):
    path = Path(path)
    with path.open("x") as stream:
        for row in rows:
            numbers(row)
            stream.write(json.dumps(row, sort_keys=True) + "\n")
        stream.flush()
        os.fsync(stream.fileno())


def exact(record):
    if not isinstance(record, dict) or not isinstance(record.get("hex"), str) or not BOUND.fullmatch(record["hex"]):
        raise ValueError("missing exact dyadic bound")
    return common.rational_bound(record)


def same(left, right, name):
    if digest(left) != digest(right):
        raise ValueError(f"typed {name} mismatch")


def load_science(data):
    os.environ["BRANCH_DATA"] = str(data)
    sys.path.insert(0, str(FOURIER))
    st = importlib.import_module("branch_stability")
    importlib.import_module("arbmodel").check_flint()
    return st


def tree_hashes(directory):
    result = {}
    for path in sorted(Path(directory).rglob("*")):
        if path.is_symlink():
            raise ValueError("input symlinks are not permitted")
        if path.is_file():
            result[path.relative_to(directory).as_posix()] = sha(path)
    return result


def profiles(st):
    group = [dict(st.DEFAULTS, **st.GROUP_DEFAULTS, **{})]
    group = [dict(group[0], **attempt) for attempt in st.GROUP_ATTEMPTS]
    piece = [dict(st.DEFAULTS, **attempt) for attempt in st.ATTEMPTS]
    return dict(group=group, piece=piece, group_attempts=list(st.GROUP_ATTEMPTS),
                piece_attempts=list(st.ATTEMPTS))


def context(st, input_data, theorem_b):
    br = st.br
    pieces, groups, centres = br.validate_final(12)
    if len(pieces) != 712 or len(groups) != 57:
        raise ValueError("requires the complete current 712-piece, 57-group branch")
    b = read_json(theorem_b)
    st._check_theorem_b(b, pieces, sha(br.RUN_LOG.format(K=12)), sha(br.CENTRES.format(K=12)))
    if [g["group"] for g in groups] != list(range(57)):
        raise ValueError("group IDs are not consecutive")
    manifest = dict(schema=1, helper_sha256=sha(__file__), program_sha256=st.PROGRAM_SHA256,
                    sources_sha256=st.SOURCES_SHA256,
                    branch_helper_sha256=sha(Path(__file__).with_name("cardiac-branch-shards.py")),
                    inputs=tree_hashes(input_data),
                    theorem_B_sha256=sha(theorem_b), settings_profiles=profiles(st),
                    branch_run_log_sha256=sha(br.RUN_LOG.format(K=12)),
                    branch_centres_sha256=sha(br.CENTRES.format(K=12)), n_pieces=712, n_groups=57)
    return manifest, pieces, groups


def assignment(pieces, groups, index, count):
    if type(index) is not int or type(count) is not int or count != 6 or not 0 <= index < count:
        raise ValueError("requires shard index 0..5 and exactly six shards")
    ids = [g["group"] for g in groups if g["group"] % count == index]
    labels = sorted(p["rec"]["label"] for p in pieces if p["group"] in ids)
    return dict(index=index, count=count, groups=ids, labels=labels)


def ordered_groups(pieces):
    result = {}
    labels = set()
    for p in pieces:
        gid, rec = p["group"], p["rec"]
        if type(gid) is not int or rec["label"] in labels:
            raise ValueError("duplicate or mistyped branch piece")
        labels.add(rec["label"])
        result.setdefault(gid, []).append(rec)
    for rows in result.values():
        rows.sort(key=lambda r: Fraction(r["g_lo"]))
        for a, b in zip(rows, rows[1:]):
            if not (Fraction(a["g_lo"]) < Fraction(b["g_lo"]) <= Fraction(a["g_hi"])
                    and Fraction(a["g_hi"]) < Fraction(b["g_hi"])):
                raise ValueError("piece ordering or overlap invalid")
    return result


def scope(gid, part, grouped):
    if type(gid) is not int or gid not in grouped:
        raise ValueError("unknown or mistyped group")
    rows = grouped[gid]
    if part is None:
        return f"G{gid}", rows
    allowed = [[0, len(rows)//2], [len(rows)//2, len(rows)]] if len(rows) >= 2 else []
    if (not isinstance(part, list) or any(type(x) is not int for x in part)
            or part not in allowed):
        raise ValueError("fallback part must be exactly a runner half")
    return f"G{gid}[{part[0]}:{part[1]}]", rows[part[0]:part[1]]


def receipt_bounds(row, rec=None):
    certificate, existence = row["certificate"], row["existence"]
    if certificate.get("controls") is not None or row.get("threads_pinned_before_numpy") is not True:
        raise ValueError("controlled/mutated or unpinned proof output")
    if (type(certificate.get("count_in_Omega")) is not int or certificate["count_in_Omega"] != 1
            or certificate.get("N") != 1 or type(certificate.get("N")) is not int):
        raise ValueError("invalid exact spectral count or N")
    for key in ("q_C", "theta_T"):
        if not 0 <= exact(certificate[key]) < 1:
            raise ValueError(f"invalid exact {key}")
    ratio = certificate["SC_worst_ratio"]
    if type(ratio) not in (int, float) or not math.isfinite(ratio) or not 0 <= ratio < 1:
        raise ValueError("invalid finite SC producer ratio")
    if not (0 < exact(certificate["omega_lo"]) <= exact(certificate["omega_hi"])
            and exact(row["delta"]) > 0 and exact(row["T_lo"]) > 0
            and 0 < exact(row["multiplier_bound_full_period"]) < 1):
        raise ValueError("invalid positive frequency/decay/multiplier bound")
    for key in ("delta", "T_lo", "multiplier_bound_full_period"):
        same(row[key], certificate[key], key)
    delta = exact(certificate["delta"])
    if Fraction(certificate["delta_exact"]) != delta or delta < Fraction(row["settings"]["delta"]):
        raise ValueError("exact delta is inconsistent or below its request")
    sigma, error, rt = (exact(certificate[k]) for k in ("sigma_off", "A0_minus_A0c", "rho_T"))
    if not (sigma >= 0 and error >= 0 and rt > 0
            and (sigma + error)*rt <= exact(certificate["theta_T"])):
        raise ValueError("exact tail small-gain product is underestimated")
    # These inexpensive transcendental gates use the same pinned native Arb
    # arithmetic, independently of the producer's stored flags and floats.
    from flint import arb, ctx, fmpq
    def ball(q):
        return arb(fmpq(q.numerator, q.denominator))
    oldprec = ctx.prec
    ctx.prec = 512
    try:
        tlo = exact(row["T_lo"])
        if not ball(tlo) <= 2*arb.pi()/ball(exact(certificate["omega_hi"])):
            raise ValueError("period lower bound exceeds its frequency implication")
        if not (-ball(delta)*ball(tlo)).exp() <= ball(exact(row["multiplier_bound_full_period"])):
            raise ValueError("multiplier upper bound is underestimated")
    finally:
        ctx.prec = oldprec
    same(row["delta_requested"], row["settings"]["delta"], "requested delta")
    same(certificate["delta_requested"], row["delta_requested"], "certificate delta")
    rho, y, kappa = (exact(existence[k]) for k in ("rho", "Yprime", "kappa"))
    if not (rho > 0 and y >= 0 and 0 <= kappa < 1 and y <= (1-kappa)*rho):
        raise ValueError("exact tube self-map/contraction inequality invalid")
    if row["type"] == "group_unit":
        z1, z2 = exact(existence["Z1_path"]), exact(existence["Z2"])
        rs = Fraction(existence["r_star"])
        if not (0 <= exact(existence["Z1_point"]) <= z1 < 1 and z2 >= 0
                and rho <= rs and z1+z2*rho <= kappa):
            raise ValueError("invalid exact moving-center contraction")
        same(existence["r_star"], row["settings"]["r_star"], "group validity radius")
    else:
        z1, z2, e = exact(existence["Z1"]), exact(existence["Z2_this_cover"]), exact(existence["e"])
        if not (0 <= z1 < 1 and z2 >= 0 and e >= 0
                and z1+z2*(e+rho) <= kappa and e+rho <= exact(rec["r_star"])
                and e+rho <= exact(rec["r_uniqueness"])):
            raise ValueError("invalid exact affine contraction or identification")
        same(existence["theorem_B_bounds_reproduced"], {"Y0": True, "Z1": True}, "B reproduction")
        same(existence["Z1"], rec["Z1"], "piece Z1")
    if row.get("ok") is not True or row.get("uniform") is not True:
        raise ValueError("unit must be actual successful uniform output")


def verify_rows(rows, pieces, manifest, assigned, require_complete=True):
    grouped = ordered_groups(pieces)
    piece_by_label = {r["label"]: (gid, r) for gid, rr in grouped.items() for r in rr}
    successes, failures, covered = set(), set(), set()
    group_profiles = {digest(v) for v in manifest["settings_profiles"]["group"]}
    piece_profiles = {digest(v) for v in manifest["settings_profiles"]["piece"]}
    group_attempts = {digest(v) for v in manifest["settings_profiles"]["group_attempts"]}
    piece_attempts = {digest(v) for v in manifest["settings_profiles"]["piece_attempts"]}
    for row in rows:
        numbers(row)
        kind = row.get("type")
        if kind not in KINDS:
            raise ValueError("unexpected stability log record type")
        for key in ("program_sha256", "sources_sha256"):
            same(row.get(key), manifest[key], key)
        if not isinstance(row.get("settings"), dict):
            raise ValueError("settings object missing")
        if kind in {"group_unit", "group_failure"}:
            label, selected = scope(row.get("group"), row.get("part"), grouped)
            if row["group"] not in assigned["groups"] or row.get("label") != label:
                raise ValueError("group unit outside exact shard/fallback assignment")
            if kind == "group_failure":
                failure_key = (label, digest(row["settings"]))
                if digest(row["settings"]) not in group_attempts or failure_key in failures:
                    raise ValueError("duplicate failure or invalid typed group attempt")
                failures.add(failure_key)
                continue
            if digest(row["settings"]) not in group_profiles:
                raise ValueError("invalid typed group settings")
            labels = [r["label"] for r in selected]
            same(row.get("pieces"), labels, "group piece ordering")
            same(row.get("g"), [selected[0]["g_lo"], selected[-1]["g_hi"]], "group interval")
            mid = (Fraction(selected[0]["g_lo"])+Fraction(selected[-1]["g_hi"]))/2
            centre = min(selected, key=lambda r: (abs(Fraction(r["centre_g"])-mid), Fraction(r["centre_g"])))
            same(row.get("centre_piece"), centre["label"], "center piece")
            same(row.get("centre_sha256"), centre["centre_sha256"], "center digest")
            same(row.get("g_centre"), centre["centre_g"], "center parameter")
            same(row.get("eta"), centre["eta"], "weights")
            same(row.get("rho0"), centre["settings"]["rho0"], "rho0")
            same(row.get("piece_g"), {r["label"]: [r["g_lo"], r["g_hi"]] for r in selected}, "piece intervals")
            same(row.get("piece_centre_sha256"), {r["label"]: r["centre_sha256"] for r in selected}, "piece centers")
            same(row.get("branch_piece_sha256"), {r["label"]: digest(r) for r in selected}, "branch inputs")
            ident = row["existence"]["identification"]
            same([v.get("label") for v in ident], labels, "identification ordering")
            for item, rec in zip(ident, selected):
                for key, value in (("g", [rec["g_lo"], rec["g_hi"]]),
                                   ("centre_sha256", rec["centre_sha256"]),
                                   ("r_uniqueness_logged", rec["r_uniqueness"])):
                    same(item.get(key), value, "identification "+key)
                if item.get("ok") is not True or not 0 <= exact(item["lhs_bound"]) <= exact(rec["r_uniqueness"]):
                    raise ValueError("exact group identification fails")
            receipt_bounds(row)
        else:
            label = row.get("label")
            if label not in assigned["labels"] or label not in piece_by_label:
                raise ValueError("piece outside exact shard assignment")
            gid, rec = piece_by_label[label]
            if kind == "failure":
                failure_key = (label, digest(row["settings"]))
                if digest(row["settings"]) not in piece_attempts or failure_key in failures:
                    raise ValueError("duplicate failure or invalid typed piece attempt")
                failures.add(failure_key)
                continue
            if digest(row["settings"]) not in piece_profiles:
                raise ValueError("invalid typed piece settings")
            for key, value in (("g", [rec["g_lo"], rec["g_hi"]]), ("g_centre", rec["centre_g"]),
                               ("centre_sha256", rec["centre_sha256"]), ("eta", rec["eta"]),
                               ("rho0", rec["settings"]["rho0"]), ("branch_piece_sha256", digest(rec))):
                same(row.get(key), value, "piece "+key)
            same(row["existence"].get("r_uniqueness_logged"), rec["r_uniqueness"], "piece uniqueness")
            receipt_bounds(row, rec)
            selected = [rec]
        if label in successes:
            raise ValueError("duplicate successful unit label")
        successes.add(label)
        covered.update(r["label"] for r in selected)
    # Validate scopes selected by the existing runner's fallback, not arbitrary subintervals.
    for row in rows:
        kind = row["type"]
        if kind in {"group_unit", "group_failure"} and row.get("part") is not None:
            if not all((f"G{row['group']}", digest(v)) in failures
                       for v in manifest["settings_profiles"]["group_attempts"]):
                raise ValueError("half attempted without all whole-group failures")
        if kind in {"unit", "failure"}:
            gid, rec = piece_by_label[row["label"]]
            label, selected = scope(gid, None, grouped)
            if not all((label, digest(v)) in failures for v in manifest["settings_profiles"]["group_attempts"]):
                raise ValueError("piece fallback without whole-group failure")
            if len(selected) >= 2:
                pos = [r["label"] for r in selected].index(rec["label"])
                part = [0, len(selected)//2] if pos < len(selected)//2 else [len(selected)//2, len(selected)]
                label, _ = scope(gid, part, grouped)
                if not all((label, digest(v)) in failures for v in manifest["settings_profiles"]["group_attempts"]):
                    raise ValueError("piece fallback without its exact half failure")
    if require_complete and covered != set(assigned["labels"]):
        raise ValueError(f"incomplete shard coverage: {len(covered)}/{len(assigned['labels'])}")
    return covered


def isolated_copy(out):
    if out.exists() or out == CANONICAL or CANONICAL in out.parents:
        raise ValueError("output must be a new isolated directory")
    out.mkdir(parents=True)
    shutil.copytree(CANONICAL, out / "inputs/branch")
    b = RESULTS / "fourier-branch-gks.json"
    shutil.copyfile(b, out / "inputs/fourier-branch-gks.json")
    shutil.copytree(out / "inputs/branch", out / "data")
    # Preserve an input cache byte for byte, but never inherit previous unit successes/failures.
    old = out / "data/stability_uniform_K12_final.jsonl"
    if old.exists():
        old.unlink()
    (out / "results").mkdir()
    shutil.copyfile(out / "inputs/fourier-branch-gks.json", out / "results/fourier-branch-gks.json")


def shard(args):
    if args.workers != 3 or args.count != 6 or not 0 < args.budget <= 2400:
        raise ValueError("requires six shards, three workers and budget <=2400s")
    out = Path(args.out).resolve()
    isolated_copy(out)
    st = load_science(out / "data")
    st.RESULTS = str(out / "results")
    manifest, pieces, groups = context(st, out / "inputs/branch", out / "inputs/fourier-branch-gks.json")
    assigned = assignment(pieces, groups, args.index, args.count)
    header = dict(type="stability_shard_header", manifest=manifest, assignment=assigned,
                  workers=args.workers, budget_s=args.budget,
                  runtime=dict(python=sys.version, python_flint=st.flint.__version__,
                               FLINT=st.flint.__FLINT_VERSION__, numpy=st.np.__version__),
                  proof_gate="fresh guarded producer; exact tube/identification plus finite SC summary")
    write_new(out / "assignment.jsonl", [header])
    st.run_groups(gids=assigned["groups"], K=12, workers=args.workers, budget_s=args.budget, fallback=True)
    same(tree_hashes(out / "inputs/branch"), manifest["inputs"], "immutable inputs")
    for name, value in manifest["inputs"].items():
        if name != "stability_uniform_K12_final.jsonl" and sha(out / "data" / name) != value:
            raise ValueError("working input changed")
    rows = read_jsonl(st.LOG.format(K=12))
    verify_rows(rows, pieces, manifest, assigned)
    write_new(out / "shard.jsonl", [header] + rows)
    print(json.dumps(dict(shard=args.index, groups=len(assigned["groups"]),
                          pieces=len(assigned["labels"]), output=str(out / "shard.jsonl"))))


def merge_rows(paths, pieces, groups, manifest):
    allrows, seen = [], set()
    for path in paths:
        records = read_jsonl(path)
        if not records or records[0].get("type") != "stability_shard_header":
            raise ValueError("missing shard receipt")
        head, rows = records[0], records[1:]
        same(head.get("manifest"), manifest, "current source/input manifest")
        assigned = head["assignment"]
        expected = assignment(pieces, groups, assigned["index"], assigned["count"])
        same(assigned, expected, "shard assignment")
        if assigned["index"] in seen or head.get("workers") != 3 or type(head.get("workers")) is not int:
            raise ValueError("duplicate shard or mistyped workers")
        if type(head.get("budget_s")) not in (int, float) or not 0 < head["budget_s"] <= 2400:
            raise ValueError("invalid receipt budget")
        seen.add(assigned["index"])
        verify_rows(rows, pieces, manifest, assigned)
        allrows.extend(rows)
    if seen != set(range(6)):
        raise ValueError("exactly six distinct shards required")
    combined = dict(index=0, count=6, groups=[g["group"] for g in groups],
                    labels=sorted(p["rec"]["label"] for p in pieces))
    verify_rows(allrows, pieces, manifest, combined)
    return allrows


def merge(args):
    out = Path(args.out).resolve()
    # Canonical data and results are never a helper output.
    for protected in (CANONICAL, RESULTS):
        if out == protected or protected in out.parents:
            raise ValueError("refuse canonical output")
    paths = sorted(Path(args.shards).rglob("shard.jsonl"))
    if len(paths) != 6:
        raise ValueError("requires exactly six shard artifacts")
    isolated_copy(out)
    st = load_science(out / "data")
    st.RESULTS = str(out / "results")
    manifest, pieces, groups = context(st, out / "inputs/branch", out / "inputs/fourier-branch-gks.json")
    rows = merge_rows(paths, pieces, groups, manifest)
    merged = out / "data/stability_uniform_K12_final.jsonl"
    write_new(merged, rows)
    # The original scientific collector remains the final coverage/branch-binding gate.
    result = st.collect(12, write=False)
    if (result.get("n_pieces_branch") != 712 or result.get("n_pieces_uniform") != 712
            or result.get("uncovered_pieces") != [] or len(result.get("intervals_uniform", [])) != 1):
        raise ValueError("scientific collector did not certify complete connected coverage")
    same(result["branch_run_log_sha256"], manifest["branch_run_log_sha256"], "collected branch")
    same(result["branch_centres_sha256"], manifest["branch_centres_sha256"], "collected centers")
    same(result["theorem_B_sha256"], manifest["theorem_B_sha256"], "collected Theorem B")
    same(result["sources_sha256"], manifest["sources_sha256"], "collected sources")
    record = out / "fourier-branch-stability-uniform.json"
    with record.open("x") as stream:
        stream.write(json.dumps(result, indent=2, allow_nan=False) + "\n")
        stream.flush()
        os.fsync(stream.fileno())
    receipt = dict(type="stability_merge_receipt", manifest=manifest,
                   shard_sha256={str(p): sha(p) for p in paths}, merged_log_sha256=sha(merged),
                   record_sha256=sha(record), pieces=712,
                   gate="fresh producer proofs; strict receipts; existing scientific collector",
                   status="collected; awaiting independent exact record review; no publication promotion")
    write_new(out / "merge-receipt.jsonl", [receipt])
    print(json.dumps(dict(pieces=712, record=str(record), receipt=str(out / "merge-receipt.jsonl"))))


def self_test():
    import tempfile
    b = lambda n: dict(hex=f"0x{n:x}p-8")
    settings = dict(delta="3e-5", r_star="1/2", prec=128)
    ps = dict(group=[settings], piece=[dict(settings, prec=64)],
              group_attempts=[dict(delta="3e-5")], piece_attempts=[dict(delta="3e-5")])
    manifest = dict(program_sha256="a"*64, sources_sha256={"proof.py": "b"*64},
                    settings_profiles=ps)
    pieces, groups, records = [], [], []
    for gid in range(6):
        rows = []
        for i in range(2):
            rec = dict(label=f"G{gid}P{i}", g_lo=str(gid*2+i), g_hi=str(gid*2+i+Fraction(3,2)),
                       centre_g=str(gid*2+i+Fraction(3,4)), centre_sha256=digest([gid,i]),
                       eta=["1"], settings=dict(rho0="1/4"), r_star=b(128),
                       r_uniqueness=b(64), Z1=b(32))
            rows.append(rec)
            pieces.append(dict(group=gid, rec=rec))
        groups.append(dict(group=gid))
        cert = dict(N=1, count_in_Omega=1, q_C=b(8), theta_T=b(8), controls=None,
                    SC_worst_ratio=0.5, omega_lo=b(16), omega_hi=b(32), delta=b(1), T_lo=b(16),
                    multiplier_bound_full_period=dict(hex="0xffffp-16"), delta_requested=settings["delta"],
                    delta_exact="1/256",sigma_off=b(1),A0_minus_A0c=b(1),rho_T=b(8))
        ident = [dict(label=r["label"], g=[r["g_lo"],r["g_hi"]], centre_sha256=r["centre_sha256"],
                      r_uniqueness_logged=r["r_uniqueness"], lhs_bound=b(2), ok=True) for r in rows]
        row = dict(type="group_unit", group=gid, part=None, label=f"G{gid}",
                   pieces=[r["label"] for r in rows], g=[rows[0]["g_lo"],rows[-1]["g_hi"]],
                   centre_piece=rows[0]["label"], centre_sha256=rows[0]["centre_sha256"],
                   g_centre=rows[0]["centre_g"], eta=rows[0]["eta"], rho0="1/4",
                   piece_g={r["label"]:[r["g_lo"],r["g_hi"]] for r in rows},
                   piece_centre_sha256={r["label"]:r["centre_sha256"] for r in rows},
                   branch_piece_sha256={r["label"]:digest(r) for r in rows},
                   settings=settings, program_sha256=manifest["program_sha256"],
                   sources_sha256=manifest["sources_sha256"], threads_pinned_before_numpy=True,
                   ok=True, uniform=True, delta=cert["delta"], T_lo=cert["T_lo"],
                   multiplier_bound_full_period=cert["multiplier_bound_full_period"],
                   delta_requested=settings["delta"], certificate=cert,
                   existence=dict(rho=b(4),Yprime=b(1),kappa=b(64),Z1_point=b(16),
                                  Z1_path=b(32),Z2=b(8),r_star="1/2",identification=ident))
        records.append(row)
    errors = 0
    def reject(fn):
        nonlocal errors
        try:
            fn()
        except (ValueError, KeyError, TypeError, OSError):
            errors += 1
        else:
            raise AssertionError("invalid evidence accepted")
    with tempfile.TemporaryDirectory() as temp:
        paths=[]
        for gid in range(6):
            path=Path(temp)/f"{gid}.jsonl"
            head=dict(type="stability_shard_header",manifest=manifest,
                      assignment=assignment(pieces,groups,gid,6),workers=3,budget_s=2400)
            write_new(path,[head,records[gid]])
            paths.append(path)
        assert len(merge_rows(paths,pieces,groups,manifest))==6
        reject(lambda: merge_rows(paths[:-1],pieces,groups,manifest))
        reject(lambda: merge_rows(paths+[paths[0]],pieces,groups,manifest))
        assigned=assignment(pieces,groups,0,6)
        reject(lambda:verify_rows([],pieces,manifest,assigned))
        reject(lambda:verify_rows([records[0],records[0]],pieces,manifest,assigned))
        mutations=[
            (("program_sha256",),"stale"), (("branch_piece_sha256","G0P0"),"stale"),
            (("settings","prec"),128.0), (("group",),True), (("part",),[0,2]),
            (("g",),["0","99"]), (("pieces",),["G0P1","G0P0"]),
            (("existence","kappa"),b(256)), (("existence","Yprime"),b(8)),
            (("certificate","q_C"),b(256)), (("certificate","theta_T"),b(256)),
            (("certificate","SC_worst_ratio"),1.0), (("certificate","count_in_Omega"),True),
            (("certificate","controls"),{"drop_g_terms":True}),
            (("existence","identification",0,"lhs_bound"),b(128)),
            (("threads_pinned_before_numpy",),False),
        ]
        for route, value in mutations:
            bad=copy.deepcopy(records[0]);cursor=bad
            for key in route[:-1]:cursor=cursor[key]
            cursor[route[-1]]=value
            reject(lambda bad=bad:verify_rows([bad],pieces,manifest,assigned))
        for key, value in (("multiplier_bound_full_period", b(1)), ("T_lo", b(65536)), ("delta", b(2))):
            bad=copy.deepcopy(records[0])
            bad[key]=value
            bad["certificate"][key]=value
            reject(lambda bad=bad:verify_rows([bad],pieces,manifest,assigned))
        bad=copy.deepcopy(records[0])
        bad["certificate"]["theta_T"]=b(1)
        bad["certificate"]["rho_T"]=b(256)
        reject(lambda:verify_rows([bad],pieces,manifest,assigned))
        for payload in (b'{}',b'{"x":1,"x":2}\n',b'{"x":NaN}\n',b'{"x":Infinity}\n',
                        b'{"strips":{"G_pt":{"S_over_L_max":-Infinity}}}\n'):
            path=Path(temp)/"bad.jsonl";path.write_bytes(payload)
            reject(lambda:read_jsonl(path))
        good=Path(temp)/"diagnostic.jsonl"
        write_new(good,[dict(strips=dict(G_pt=dict(S_over_L_max=math.inf)))])
        assert read_jsonl(good)[0]["strips"]["G_pt"]["S_over_L_max"]==math.inf
        reject(lambda:write_new(paths[0],[]))
        # A legitimate whole failure then two exact halves is accepted.
        halves=[]
        failure=dict(type="group_failure",group=0,part=None,label="G0",why="inequality",
                     settings=ps["group_attempts"][0],program_sha256=manifest["program_sha256"],
                     sources_sha256=manifest["sources_sha256"])
        for i in range(2):
            rec=pieces[i]["rec"];r=copy.deepcopy(records[0])
            r.update(part=[i,i+1],label=f"G0[{i}:{i+1}]",pieces=[rec["label"]],
                     g=[rec["g_lo"],rec["g_hi"]],centre_piece=rec["label"],
                     centre_sha256=rec["centre_sha256"],g_centre=rec["centre_g"],
                     piece_g={rec["label"]:[rec["g_lo"],rec["g_hi"]]},
                     piece_centre_sha256={rec["label"]:rec["centre_sha256"]},
                     branch_piece_sha256={rec["label"]:digest(rec)})
            r["existence"]["identification"]=[copy.deepcopy(records[0]["existence"]["identification"][i])]
            halves.append(r)
        assert len(verify_rows([failure]+halves,pieces,manifest,assigned))==2
        reject(lambda:verify_rows(halves,pieces,manifest,assigned))
        half_failure=dict(failure,part=[0,1],label="G0[0:1]")
        rec=pieces[0]["rec"]
        piece=copy.deepcopy(halves[0])
        piece.update(type="unit",label=rec["label"],settings=ps["piece"][0],
                     branch_piece_sha256=digest(rec))
        piece["existence"]=dict(rho=b(4),Yprime=b(1),kappa=b(64),e=b(0),Z1=rec["Z1"],
                               Z2_this_cover=b(8),r_uniqueness_logged=rec["r_uniqueness"],
                               theorem_B_bounds_reproduced=dict(Y0=True,Z1=True))
        assert len(verify_rows([failure,half_failure,piece,halves[1]],pieces,manifest,assigned))==2
        reject(lambda:verify_rows([failure,piece,halves[1]],pieces,manifest,assigned))
        piece_bad=copy.deepcopy(piece)
        piece_bad["existence"]["e"]=b(128)
        reject(lambda:verify_rows([failure,half_failure,piece_bad,halves[1]],pieces,manifest,assigned))
    print(json.dumps(dict(positive_merge=True, exact_half_fallback=True, exact_piece_fallback=True,
                         negative_controls=errors)))


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    sub=parser.add_subparsers(dest="command",required=True)
    sh=sub.add_parser("shard")
    sh.add_argument("--index",type=int,required=True);sh.add_argument("--count",type=int,default=6)
    sh.add_argument("--workers",type=int,default=3);sh.add_argument("--budget",type=float,default=2400)
    sh.add_argument("--out",required=True)
    me=sub.add_parser("merge");me.add_argument("--shards",required=True);me.add_argument("--out",required=True)
    sub.add_parser("self-test")
    args=parser.parse_args()
    try:
        {"shard":shard,"merge":merge,"self-test":lambda _:self_test()}[args.command](args)
    except Exception as exc:
        print(json.dumps(dict(status="failed",error=f"{type(exc).__name__}: {exc}")),file=sys.stderr)
        raise SystemExit(1)


if __name__=="__main__":
    main()
