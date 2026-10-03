"""Opt-in isolated execution of the original GROUP/HALF scientific controls.

Three bounded jobs partition all 13 unchanged GROUP_TESTS. The half job uses
TEST_GROUP=12 and adds a fresh exact comparison against admitted G12[0:8].
Every job requires the admitted G6 whole-unit/default-settings fixture first.
No piece acceptance or CAPD executable is invoked; canonical inputs are read only.
"""
import argparse
import copy
import importlib
import importlib.util
import json
import os
from pathlib import Path
import resource
import signal
import sys
import time
import traceback

def sibling(name, module):
    spec = importlib.util.spec_from_file_location(module, Path(__file__).with_name(name))
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value

io = sibling("cardiac-stability-acceptance-pilot.py", "group_acceptance_io")
gate = sibling("cardiac-stability-shards.py", "group_acceptance_gate")
ALL = [
    "test_group_parts", "test_group_acceptance", "test_group_float_orbit_inside_ball",
    "test_group_negative_drop_third_order_detected", "test_group_window_dominated",
    "test_group_negative_drop_d2_terms_detected", "test_group_Z1_path_term",
    "test_group_drop_moving_centre_hook_detected", "test_group_negative_delta_above_exponent",
    "test_group_negative_identification", "test_jets_against_hess_and_differences",
    "test_group_negative_widened", "test_half_unit_reproduced"]
PLANS = dict(group_base=ALL[:7], group_heavy=ALL[7:12], half=ALL[12:])


class BudgetExceeded(BaseException):
    pass


def deadline(*_):
    # Scientific negative-control exception handlers must not absorb a deadline.
    raise BudgetExceeded("group acceptance wall-clock budget exhausted")


def event(path, record):
    with Path(path).open("a") as stream:
        stream.write(json.dumps(record, sort_keys=True, allow_nan=False) + "\n")
        stream.flush()
        os.fsync(stream.fileno())


def require_unit(rows, label, settings, st):
    selected = [r for r in rows if r.get("type") == "group_unit" and r.get("label") == label]
    if len(selected) != 1:
        raise ValueError(f"requires exactly one admitted {label} unit")
    row = selected[0]
    if not st._current_unit(row):
        raise ValueError("fixture is not a current actual successful unit")
    gate.same(row["settings"], settings, "required default fixture settings")
    gate.receipt_bounds(row)
    return row


def compare_unit(logged, actual, dump=False):
    if actual.get("ok") is not True or actual.get("uniform") is not True or actual.get("MUTATED"):
        raise ValueError("fresh comparison requires an actual unmutated successful proof")
    expected_controls = {"dump": True} if dump else None
    gate.same(actual["certificate"].get("controls"), expected_controls, "fresh dump-only controls")
    for key in ("type", "label", "part", "group", "g", "g_centre", "centre_piece",
                "centre_sha256", "pieces", "piece_centre_sha256", "branch_piece_sha256",
                "piece_g", "eta", "rho0", "settings", "program_sha256", "sources_sha256"):
        gate.same(actual[key], logged[key], f"fresh {key}")
    for key in ("rho", "Z1_point", "Z1_path", "Z2", "Yprime", "kappa"):
        gate.same(actual["existence"][key]["hex"], logged["existence"][key]["hex"], key)
    for key in ("q_C", "theta_T", "delta", "T_lo", "omega_lo", "omega_hi",
                "multiplier_bound_full_period"):
        gate.same(actual["certificate"][key]["hex"], logged["certificate"][key]["hex"], key)
    gate.same(actual["certificate"]["count_in_Omega"], 1, "fresh spectral count")


def passed(controls, expected):
    return (len(expected) > 0 and [r["name"] for r in controls] == expected
            and all(r.get("ok") is True for r in controls))


def run(out, budget, mode):
    started = time.monotonic()
    original, b_hash = io.tree(io.CANONICAL), io.sha(io.THEOREM_B)
    dependencies = {name: io.sha(Path(__file__).with_name(name)) for name in
                    ("cardiac-stability-acceptance-pilot.py", "cardiac-stability-shards.py",
                     "cardiac-branch-shards.py")}
    receipt = dict(schema=1, mode=mode, status="failed", budget_seconds=budget, controls=[],
                   helper_sha256=io.sha(__file__), dependency_sha256=dependencies,
                   canonical_inputs=original, theorem_B_sha256=b_hash,
                   scope="original group controls and explicit half comparison only; no publication claim",
                   python=sys.version, platform=sys.platform,
                   thread_environment={k: os.environ[k] for k in io.THREADS})
    source_paths = {}
    test_hash = None
    out.mkdir(parents=True)
    io.write_new(out / "initial-manifest.json", receipt)
    old = signal.signal(signal.SIGALRM, deadline)
    signal.setitimer(signal.ITIMER_REAL, budget)
    try:
        shutil = importlib.import_module("shutil")
        shutil.copytree(io.CANONICAL, out / "data")
        if io.tree(out / "data") != original or io.tree(io.CANONICAL) != original:
            raise ValueError("canonical inputs changed during copy")
        (out / "results").mkdir()
        shutil.copyfile(io.THEOREM_B, out / "results/fourier-branch-gks.json")
        if io.sha(out / "results/fourier-branch-gks.json") != b_hash:
            raise ValueError("Theorem B copy mismatch")
        os.environ["BRANCH_DATA"] = str(out / "data")
        os.environ["TEST_GROUP"] = "12" if mode == "half" else "6"
        st = gate.load_science(out / "data")
        st.RESULTS = str(out / "results")
        manifest, pieces, groups = gate.context(st, out / "data",
                                                out / "results/fourier-branch-gks.json")
        source_paths = {name: io.FOURIER.parent / name for name in st.SOURCES_SHA256}
        test_hash = io.sha(io.FOURIER / "test_branch_stability.py")
        rows = gate.read_jsonl(out / "data/stability_uniform_K12_final.jsonl")
        full = dict(index=0, count=6, groups=list(range(57)),
                    labels=sorted(p["rec"]["label"] for p in pieces))
        gate.verify_rows(rows, pieces, manifest, full)
        defaults = dict(st.DEFAULTS, **st.GROUP_DEFAULTS)
        whole = require_unit(rows, "G6", defaults, st)
        half = require_unit(rows, "G12[0:8]", defaults, st) if mode == "half" else None
        # These preconditions run before every original test, so its optional
        # missing-log comparison branch can never yield a passing job.
        receipt.update(manifest=manifest, test_sha256=test_hash,
                       required_fixture="G12[0:8]" if mode == "half" else "G6",
                       G6_fixture_sha256=gate.digest(whole),
                       selected_original_controls=PLANS[mode],
                       fixture_sha256=gate.digest(half or whole))
        io.write_new(out / "input-manifest.json", receipt)
        tests = importlib.import_module("test_branch_stability")
        if [t.__name__ for t in tests.GROUP_TESTS] != ALL:
            raise ValueError("original GROUP_TESTS selection changed")
        if tests.GID != (12 if mode == "half" else 6):
            raise ValueError("scientific test group differs from assigned fixture")
        if mode != "half":
            fresh = tests._group()  # unchanged default proof with its actual dump
            compare_unit(whole, fresh, dump=True)
            public = {k: v for k, v in fresh.items() if not k.startswith("_")}
            gate.write_new(out / "fresh-G6-dump-summary.jsonl", [public])
        expected = list(PLANS[mode])
        if mode == "half":
            expected.append("explicit_current_G12_half_comparison")

        def execute(name, fn):
            if time.monotonic()-started >= budget:
                deadline()
            outcome = dict(name=name, ok=False)
            event(out / "events.jsonl", dict(name=name, status="started"))
            t0 = time.monotonic()
            try:
                fn()
                outcome["ok"] = True
                print("PASS", name, flush=True)
            except BudgetExceeded:
                outcome["error_type"] = "BudgetExceeded"
                raise
            except Exception as exc:
                outcome.update(error_type=type(exc).__name__, error=str(exc),
                               traceback=traceback.format_exc())
                print("FAIL", name, type(exc).__name__, str(exc), flush=True)
            finally:
                outcome["wall_seconds"] = time.monotonic()-t0
                receipt["controls"].append(outcome)
                event(out / "events.jsonl", outcome)

        for name in PLANS[mode]:
            execute(name, getattr(tests, name))
        if mode == "half":
            def explicit_half():
                fresh = st.prove_group_uniform(12, part=(0, 8),
                                              settings=half["settings"], log=print)
                compare_unit(half, fresh)
                gate.receipt_bounds(fresh)
                gate.write_new(out / "fresh-G12-half.jsonl", [fresh])
            execute(expected[-1], explicit_half)
        if not passed(receipt["controls"], expected):
            raise AssertionError("missing or failed original acceptance control")
        receipt["status"] = "passed assigned original group controls and required fresh comparison"
    except BaseException as exc:
        receipt.update(error_type=type(exc).__name__, error=str(exc), traceback=traceback.format_exc())
        print(receipt["traceback"], file=sys.stderr, flush=True)
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
        signal.signal(signal.SIGALRM, old)
        checks = dict(canonical_inputs_unchanged=io.tree(io.CANONICAL)==original,
                      theorem_B_unchanged=io.sha(io.THEOREM_B)==b_hash,
                      helper_unchanged=io.sha(__file__)==receipt["helper_sha256"],
                      dependencies_unchanged=all(io.sha(Path(__file__).with_name(n))==h
                                                for n,h in dependencies.items()),
                      copied_inputs_unchanged=(out / "data").exists()
                          and io.tree(out / "data")==original)
        if source_paths:
            checks["scientific_sources_unchanged"] = all(io.sha(p)==st.SOURCES_SHA256[n]
                                                        for n,p in source_paths.items())
        if test_hash:
            checks["test_unchanged"] = io.sha(io.FOURIER / "test_branch_stability.py")==test_hash
        if not all(checks.values()):
            receipt["status"] = "failed: source or input changed"
        receipt.update(final_checks=checks, wall_seconds=time.monotonic()-started,
                       controls_attempted=len(receipt["controls"]),
                       controls_passed=sum(r["ok"] for r in receipt["controls"]),
                       peak_self_rss_mib=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss/
                                        (1024**2 if sys.platform=="darwin" else 1024))
        io.write_new(out / "receipt.json", receipt)
        print(json.dumps({k:receipt[k] for k in
              ("status","controls_passed","controls_attempted","wall_seconds","peak_self_rss_mib")}),
              flush=True)
    return 0 if receipt["status"].startswith("passed ") else 1


def self_test():
    import tempfile
    from types import SimpleNamespace
    assert len(ALL)==13 and [x for mode in PLANS.values() for x in mode]==ALL
    assert not passed([], [])
    assert not passed([], ["test"])
    assert not passed([dict(name="test",ok=False)], ["test"])
    assert not passed([dict(name="other",ok=True)], ["test"])
    assert not passed([dict(name="test",ok=True)]*2, ["test"])
    assert passed([dict(name="test",ok=True)], ["test"])
    try:
        deadline()
    except BudgetExceeded:
        pass
    else:
        raise AssertionError("deadline ignored")
    fake=SimpleNamespace(_current_unit=lambda _:True)
    for rows in ([],[dict(type="group_unit",label="G6")]*2):
        try:
            require_unit(rows,"G6",{},fake)
        except ValueError:
            pass
        else:
            raise AssertionError("missing/duplicate fixture admitted")
    validator = gate.receipt_bounds
    gate.receipt_bounds = lambda _: None
    try:
        good = dict(type="group_unit",label="G6",settings={"prec":128})
        assert require_unit([good],"G6",{"prec":128},fake) is good
        for bad_settings in ({"prec":128.0},{"prec":64},None):
            bad = dict(good,settings=bad_settings)
            try:
                require_unit([bad],"G6",{"prec":128},fake)
            except ValueError:
                pass
            else:
                raise AssertionError("missing or typed-mismatched settings admitted")
    finally:
        gate.receipt_bounds = validator
    fixture = {key:"same" for key in
        ("type","label","part","group","g","g_centre","centre_piece","centre_sha256",
         "pieces","piece_centre_sha256","branch_piece_sha256","piece_g","eta","rho0",
         "settings","program_sha256","sources_sha256")}
    fixture.update(ok=True,uniform=True,existence={key:{"hex":"0x1p-4"} for key in
                   ("rho","Z1_point","Z1_path","Z2","Yprime","kappa")},
                   certificate={key:{"hex":"0x1p-4"} for key in
                   ("q_C","theta_T","delta","T_lo","omega_lo","omega_hi",
                    "multiplier_bound_full_period")})
    fixture["certificate"].update(controls=None,count_in_Omega=1)
    compare_unit(fixture,fixture)
    for route,value in ((("ok",),False),(("settings",),{}),
                        (("existence","kappa","hex"),"0x1p-5"),
                        (("certificate","controls"),{"drop_d2_terms":True})):
        bad=copy.deepcopy(fixture); cursor=bad
        for key in route[:-1]: cursor=cursor[key]
        cursor[route[-1]]=value
        try:
            compare_unit(fixture,bad)
        except ValueError:
            pass
        else:
            raise AssertionError("tampered fresh comparison admitted")
    with tempfile.TemporaryDirectory() as temp:
        out=Path(temp)/"new"
        assert io.output_path(out)==out.resolve()
        out.mkdir()
        try:
            io.output_path(out)
        except ValueError:
            pass
        else:
            raise AssertionError("existing output admitted")
    print("13 original controls partitioned; false-pass/deadline/fixture/output safeguards passed")


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--mode",choices=tuple(PLANS))
    ap.add_argument("--budget",type=int,default=600)
    ap.add_argument("--out")
    ap.add_argument("--self-test",action="store_true")
    args=ap.parse_args()
    if args.self_test:
        self_test()
        return 0
    if args.mode is None or args.out is None or not 1<=args.budget<=600:
        ap.error("requires --mode, --out NEW_DIRECTORY, and budget 1..600")
    return run(io.output_path(args.out),args.budget,args.mode)


if __name__=="__main__":
    sys.exit(main())
