"""Offline exact conservative collection of immutable stability producer logs.

The pinned original producer rounded Z1, Z2, rho and kappa separately outward.
Their coarse stored sum can exceed the finer stored kappa. Recompute a larger
exact majorant and check the stronger self-map inequality, without tolerances.
No original producer rows, helper bytes, scientific sources or canonical data
are changed. Native SC column inequalities remain source-bound producer gates.
"""
import argparse
import copy
from fractions import Fraction
import importlib.util
import json
import os
from pathlib import Path
import sys

PRODUCER_SHA256 = "ee953a5f4dc789a7576a740f773632f8b563b1ba454bec580f855d1622d00e57"
_spec = importlib.util.spec_from_file_location(
    "cardiac_stability_producer", Path(__file__).with_name("cardiac-stability-shards-original-81744b5.py"))
producer = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(producer)
if producer.sha(_spec.origin) != PRODUCER_SHA256:
    raise ValueError("recovery requires the explicitly admitted immutable producer helper")
original_bounds = producer.receipt_bounds


def dyadic(q):
    q = Fraction(q)
    den = q.denominator
    if den & (den - 1):
        raise ValueError("contraction recomputation is not dyadic")
    sign = "-" if q < 0 else ""
    return dict(hex=f"{sign}0x{abs(q.numerator):x}p-{den.bit_length()-1}")


def recompute(row, rec=None):
    ex = row["existence"]
    rho, y, stored = (producer.exact(ex[k]) for k in ("rho", "Yprime", "kappa"))
    if row["type"] == "group_unit":
        z1, z2 = producer.exact(ex["Z1_path"]), producer.exact(ex["Z2"])
        coarse = z1 + z2*rho
    elif row["type"] == "unit":
        z1, z2, e = (producer.exact(ex[k]) for k in ("Z1", "Z2_this_cover", "e"))
        coarse = z1 + z2*(e+rho)
    else:
        raise ValueError("conservative bounds require an actual success row")
    checked = max(stored, coarse)
    if not (rho > 0 and y >= 0 and 0 <= stored < 1 and z1 >= 0 and z2 >= 0
            and 0 <= checked < 1 and y <= (1-checked)*rho):
        raise ValueError("exact conservative contraction/self-map failed")
    # Only a temporary receipt-validation view receives the derived majorant.
    # All persistent producer rows retain their original exact fields.
    view = copy.deepcopy(row)
    view["existence"]["kappa"] = dyadic(checked)
    original_bounds(view, rec)
    return dict(label=row["label"], type=row["type"],
                stored_kappa=ex["kappa"], coarse_kappa=dyadic(coarse),
                checked_kappa=dyadic(checked), rho=ex["rho"], Yprime=ex["Yprime"],
                exact_self_map_slack=dyadic((1-checked)*rho-y),
                adjusted=coarse > stored)


# Reuse all admitted orchestration gates, replacing only the relational bound
# validator with the exact conservative derivation above. Scientific code is
# never patched, and its collector sees the original rows.
producer.receipt_bounds = recompute


def validate_header(shard, manifest, pieces, groups):
    shard = Path(shard)
    heads = producer.read_jsonl(shard / "assignment.jsonl")
    if len(heads) != 1 or heads[0].get("type") != "stability_shard_header":
        raise ValueError("requires exactly one original producer assignment header")
    head = heads[0]
    producer.same(head.get("manifest"), manifest, "pinned current producer manifest")
    a = head["assignment"]
    producer.same(a, producer.assignment(pieces, groups, a["index"], a["count"]), "assignment")
    if type(head.get("workers")) is not int or head["workers"] != 3:
        raise ValueError("invalid original worker count")
    if type(head.get("budget_s")) not in (int, float) or not 0 < head["budget_s"] <= 2400:
        raise ValueError("invalid original budget")
    producer.same(producer.tree_hashes(shard / "inputs/branch"), manifest["inputs"],
                  "immutable producer inputs")
    producer.same(producer.sha(shard / "inputs/fourier-branch-gks.json"),
                  manifest["theorem_B_sha256"], "producer Theorem B")
    producer.same(producer.sha(shard / "results/fourier-branch-gks.json"),
                  manifest["theorem_B_sha256"], "working Theorem B")
    for name, expected in manifest["inputs"].items():
        if name != "stability_uniform_K12_final.jsonl":
            producer.same(producer.sha(shard / "data" / name), expected, "working input")
    log = shard / "data/stability_uniform_K12_final.jsonl"
    rows = producer.read_jsonl(log)
    covered = producer.verify_rows(rows, pieces, manifest, a)
    by_label = {p["rec"]["label"]: p["rec"] for p in pieces}
    bounds = [recompute(r, by_label.get(r["label"]))
              for r in rows if r["type"] in {"group_unit", "unit"}]
    receipt = dict(assignment=a, header_sha256=producer.sha(shard / "assignment.jsonl"),
                   original_log_sha256=producer.sha(log),
                   covered=len(covered), successes=len(bounds),
                   failures=sum(r["type"] in {"group_failure", "failure"} for r in rows),
                   conservative_bounds=bounds)
    return head, rows, receipt


def inspect(args):
    shard = Path(args.shard).resolve()
    st = producer.load_science(shard / "data")
    manifest, pieces, groups = producer.context(
        st, shard / "inputs/branch", shard / "inputs/fourier-branch-gks.json")
    _, _, receipt = validate_header(shard, manifest, pieces, groups)
    print(json.dumps(dict(status="exact conservative shard checks passed",
                          helper_sha256=producer.sha(__file__), **receipt), sort_keys=True))


def recover(args):
    out = Path(args.out).resolve()
    for protected in (producer.CANONICAL, producer.RESULTS):
        if out == protected or protected in out.parents:
            raise ValueError("refuse canonical output")
    heads = sorted(Path(args.shards).resolve().rglob("assignment.jsonl"))
    if len(heads) != 6:
        raise ValueError("requires exactly six original shard assignments")
    producer.isolated_copy(out)
    st = producer.load_science(out / "data")
    st.RESULTS = str(out / "results")
    manifest, pieces, groups = producer.context(
        st, out / "inputs/branch", out / "inputs/fourier-branch-gks.json")
    recovery = out / "recovery-shards"
    recovery.mkdir()
    paths, receipts = [], []
    for head_path in heads:
        head, rows, receipt = validate_header(head_path.parent, manifest, pieces, groups)
        path = recovery / f"shard-{head['assignment']['index']}.jsonl"
        # Preserve header and raw numerical lines byte for byte.
        with path.open("xb") as stream:
            stream.write(head_path.read_bytes())
            stream.write((head_path.parent / "data/stability_uniform_K12_final.jsonl").read_bytes())
        paths.append(path)
        receipts.append(receipt)
    rows = producer.merge_rows(paths, pieces, groups, manifest)
    merged = out / "data/stability_uniform_K12_final.jsonl"
    # Preserve raw producer lines in the merged scientific log as well.
    with merged.open("xb") as stream:
        for head_path in heads:
            stream.write((head_path.parent / "data/stability_uniform_K12_final.jsonl").read_bytes())
    producer.same(producer.read_jsonl(merged), rows, "preserved merged rows")
    result = st.collect(12, write=False)
    if (result.get("n_pieces_branch") != 712 or result.get("n_pieces_uniform") != 712
            or result.get("uncovered_pieces") != [] or len(result.get("intervals_uniform", [])) != 1):
        raise ValueError("scientific collector did not establish complete connected coverage")
    for result_key, manifest_key in (
        ("branch_run_log_sha256", "branch_run_log_sha256"),
        ("branch_centres_sha256", "branch_centres_sha256"),
        ("theorem_B_sha256", "theorem_B_sha256"),
        ("sources_sha256", "sources_sha256")):
        producer.same(result[result_key], manifest[manifest_key], "scientific collector binding")
    record = out / "fourier-branch-stability-uniform.json"
    with record.open("x") as stream:
        stream.write(json.dumps(result, indent=2, allow_nan=False) + "\n")
        stream.flush()
        os.fsync(stream.fileno())
    receipt = dict(type="stability_exact_recovery_receipt", schema=1,
                   recovery_helper_sha256=producer.sha(__file__),
                   producer_helper_sha256=PRODUCER_SHA256, producer_manifest=manifest,
                   rule="max(stored kappa, exact stored derivative majorant); exact stronger self-map",
                   original_shards=receipts, pieces=712,
                   merged_original_log_sha256=producer.sha(merged), record_sha256=producer.sha(record),
                   gate="fresh producer SC proofs; exact conservative receipt bounds; scientific collector",
                   status="collected; awaiting independent exact recovery review; no publication promotion")
    producer.write_new(out / "recovery-receipt.jsonl", [receipt])
    print(json.dumps(dict(pieces=712, record=str(record),
                          receipt=str(out / "recovery-receipt.jsonl"))))


def self_test():
    # All prior finite/nonfinite, typed-setting, duplicate and fallback controls
    # continue to run through the exact conservative replacement.
    producer.self_test()
    def b(q):
        return dyadic(Fraction(q))
    def row(stored=Fraction(1,4), z1=Fraction(1,4)+Fraction(1,2**60),
            y=Fraction(1,32)):
        return dict(type="group_unit", label="synthetic",
                    existence=dict(rho=b(Fraction(1,8)), Yprime=b(y),
                                   kappa=b(stored), Z1_path=b(z1), Z2=b(0)))
    # These focused controls isolate the exact derivation from other receipt
    # fields. The complete inherited fixtures above exercise every other gate.
    saved = globals()["original_bounds"]
    globals()["original_bounds"] = lambda *_: None
    try:
        result = recompute(row())
        assert result["adjusted"] is True
        assert producer.exact(result["checked_kappa"]) > producer.exact(result["stored_kappa"])
        controls = [row(z1=Fraction(1)), row(y=Fraction(3,32)),
                    row(stored=Fraction(1)), row(z1=Fraction(-1)),
                    row(y=Fraction(-1))]
        for bad in controls:
            try:
                recompute(bad)
            except ValueError:
                pass
            else:
                raise AssertionError("unsafe conservative majorant accepted")
    finally:
        globals()["original_bounds"] = saved
    print(json.dumps(dict(exact_rounding_recovery=True, additional_negative_controls=5)))


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    sub = ap.add_subparsers(dest="command", required=True)
    one = sub.add_parser("inspect"); one.add_argument("--shard", required=True)
    all_ = sub.add_parser("recover")
    all_.add_argument("--shards", required=True); all_.add_argument("--out", required=True)
    sub.add_parser("self-test")
    args = ap.parse_args()
    try:
        {"inspect": inspect, "recover": recover, "self-test": lambda _: self_test()}[args.command](args)
    except Exception as exc:
        print(json.dumps(dict(status="failed", error=f"{type(exc).__name__}: {exc}")), file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
