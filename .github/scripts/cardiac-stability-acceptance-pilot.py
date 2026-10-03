"""Isolated native G0P0 proof and the seven existing piece acceptance controls.

Keeps the scientific Theorem B exact-reproduction gate intact. The Mac pilot
failed that gate before SC; this Linux run records its actual outcome without
inserting an extra unit into the production fallback log or promoting status.
"""
import argparse
import hashlib
import importlib
import importlib.util
import json
import os
from pathlib import Path
import resource
import shutil
import signal
import sys
import time
import traceback

ROOT = Path(__file__).resolve().parents[2]
FOURIER = ROOT / "research/cardiac-cycle-certificates/fourier"
CANONICAL = FOURIER / "data/branch"
THEOREM_B = FOURIER.parent / "results/fourier-branch-gks.json"
THREADS = ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS",
           "BLIS_NUM_THREADS", "VECLIB_MAXIMUM_THREADS", "NUMEXPR_NUM_THREADS")
for name in THREADS:
    os.environ[name] = "1"


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def tree(directory):
    result = {}
    for path in sorted(Path(directory).rglob("*")):
        if path.is_symlink():
            raise ValueError("input symlinks are forbidden")
        if path.is_file():
            result[path.relative_to(directory).as_posix()] = sha(path)
    return result


def output_path(value):
    path = Path(value).resolve()
    for protected in (CANONICAL.resolve(), (FOURIER.parent / "results").resolve()):
        if path == protected or protected in path.parents or path in protected.parents:
            raise ValueError("output must be outside canonical data and results")
    if path.exists():
        raise ValueError("output must be a new directory")
    return path


def write_new(path, value):
    with Path(path).open("x") as stream:
        stream.write(json.dumps(value, sort_keys=True, indent=2, allow_nan=False) + "\n")
        stream.flush()
        os.fsync(stream.fileno())


def deadline(signum, frame):
    raise TimeoutError("isolated numerical pilot exhausted its wall-clock budget")


def run(out, budget):
    started = time.monotonic()
    receipt = dict(schema=1, label="G0P0", status="failed", budget_seconds=budget,
                   canonical_data_modified=False, production_log_modified=False,
                   scope="isolated piece acceptance only; no full uniform acceptance claim",
                   helper_sha256=sha(__file__), controls=[], python=sys.version,
                   platform=sys.platform, thread_environment={k: os.environ[k] for k in THREADS})
    source_paths = None
    original = tree(CANONICAL)
    b_hash = sha(THEOREM_B)
    out.mkdir(parents=True)
    old_handler = signal.signal(signal.SIGALRM, deadline)
    signal.setitimer(signal.ITIMER_REAL, budget)
    try:
        shutil.copytree(CANONICAL, out / "data")
        if tree(out / "data") != original or tree(CANONICAL) != original:
            raise ValueError("branch input changed during the isolated copy")
        (out / "results").mkdir()
        shutil.copyfile(THEOREM_B, out / "results/fourier-branch-gks.json")
        if sha(out / "results/fourier-branch-gks.json") != b_hash or sha(THEOREM_B) != b_hash:
            raise ValueError("accepted Theorem B changed during copy")
        final = out / "data/stability_uniform_K12_final.jsonl"
        if final.exists():
            final.rename(out / "copied-final-preserved.jsonl")
        os.environ["BRANCH_DATA"] = str(out / "data")
        sys.path.insert(0, str(FOURIER))
        st = importlib.import_module("branch_stability")
        st.RESULTS = str(out / "results")
        importlib.import_module("arbmodel").check_flint()
        spec = importlib.util.spec_from_file_location("pilot_stability_shards",
                        Path(__file__).with_name("cardiac-stability-shards.py"))
        helper = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(helper)
        manifest, pieces, groups = helper.context(st, out / "data",
                                       out / "results/fourier-branch-gks.json")
        source_paths = {name: FOURIER.parent / name for name in st.SOURCES_SHA256}
        receipt.update(program_sha256=st.PROGRAM_SHA256, sources_sha256=st.SOURCES_SHA256,
                       test_sha256=sha(FOURIER / "test_branch_stability.py"),
                       shard_helper_sha256=sha(Path(__file__).with_name("cardiac-stability-shards.py")),
                       manifest=manifest, canonical_inputs=original, theorem_B_sha256=b_hash)
        write_new(out / "input-manifest.json", receipt)
        rec = next(p["rec"] for p in pieces if p["rec"]["label"] == "G0P0")
        # Actual computation retains the unchanged exact Y0/Z1 equality gate.
        row = st.prove_piece_uniform("G0P0", settings=dict(st.ATTEMPTS[0]), log=print)
        helper.numbers(row)
        helper.receipt_bounds(row, rec)
        if not st._piece_unit_matches(row, rec):
            raise ValueError("actual G0P0 unit failed current source/input identity")
        if helper.digest(row["settings"]) != helper.digest(helper.profiles(st)["piece"][0]):
            raise ValueError("actual producer settings do not match the first declared attempt")
        helper.write_new(final, [row])
        if set(st.done_labels()) != {"G0P0"}:
            raise ValueError("isolated fixture has unexpected current piece coverage")
        receipt["fresh_piece_unit_sha256"] = sha(final)
        tests = importlib.import_module("test_branch_stability")
        expected = ["test_acceptance_piece", "test_float_orbit_inside_certified_ball",
                    "test_float_window_dominated", "test_negative_delta_above_exponent",
                    "test_negative_drop_g_terms_detected", "test_negative_drop_second_order_detected",
                    "test_negative_lemma_10_1_identification"]
        if [t.__name__ for t in tests.PIECE_TESTS] != expected:
            raise ValueError("existing seven-piece test selection changed")
        # _piece recomputes with dump=True and caches only that real computation.
        for test in tests.PIECE_TESTS:
            t0 = time.monotonic()
            if t0 - started >= budget:
                raise TimeoutError("pilot deadline reached before next acceptance control")
            outcome = dict(name=test.__name__, ok=False)
            try:
                test()
                outcome["ok"] = True
                print("PASS", test.__name__, flush=True)
            except TimeoutError:
                raise
            except Exception as exc:
                outcome.update(error_type=type(exc).__name__, error=str(exc), traceback=traceback.format_exc())
                print("FAIL", test.__name__, type(exc).__name__, str(exc), flush=True)
            finally:
                outcome["wall_seconds"] = time.monotonic() - t0
                receipt["controls"].append(outcome)
        if not all(r["ok"] for r in receipt["controls"]):
            raise AssertionError("one or more existing piece acceptance controls failed")
        receipt["status"] = "passed isolated fresh piece and all seven existing piece controls"
    except BaseException as exc:
        receipt.update(error_type=type(exc).__name__, error=str(exc), traceback=traceback.format_exc())
        print(receipt["traceback"], file=sys.stderr, flush=True)
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
        signal.signal(signal.SIGALRM, old_handler)
        receipt["wall_seconds"] = time.monotonic() - started
        rss = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
        receipt["peak_self_rss_mib"] = rss / (1024**2 if sys.platform == "darwin" else 1024)
        receipt["controls_passed"] = sum(r["ok"] for r in receipt["controls"])
        receipt["controls_attempted"] = len(receipt["controls"])
        final_inputs = tree(CANONICAL)
        checks = dict(canonical_inputs_unchanged=final_inputs == original,
                      theorem_B_unchanged=sha(THEOREM_B) == b_hash,
                      helper_unchanged=sha(__file__) == receipt["helper_sha256"])
        if source_paths is not None:
            checks["scientific_sources_unchanged"] = all(sha(p) == receipt["sources_sha256"][n]
                                                        for n, p in source_paths.items())
            checks["test_unchanged"] = sha(FOURIER / "test_branch_stability.py") == receipt["test_sha256"]
            checks["shard_helper_unchanged"] = sha(Path(__file__).with_name("cardiac-stability-shards.py")) == receipt["shard_helper_sha256"]
        receipt["final_checks"] = checks
        receipt["canonical_data_modified"] = not checks["canonical_inputs_unchanged"]
        receipt["production_log_modified"] = (original.get("stability_uniform_K12_final.jsonl")
                                              != final_inputs.get("stability_uniform_K12_final.jsonl"))
        if not all(checks.values()):
            receipt["status"] = "failed: input or source changed during pilot"
        write_new(out / "receipt.json", receipt)
        print(json.dumps({k: receipt[k] for k in ("status", "wall_seconds", "peak_self_rss_mib",
                                                "controls_passed", "controls_attempted", "final_checks")}), flush=True)
    return 0 if receipt["status"].startswith("passed ") else 1


def self_test():
    import tempfile
    with tempfile.TemporaryDirectory() as directory:
        p = Path(directory) / "new"
        assert output_path(p) == p.resolve()
        for bad in (CANONICAL, THEOREM_B.parent, ROOT):
            try:
                output_path(bad)
            except ValueError:
                pass
            else:
                raise AssertionError("canonical output admitted")
        p.mkdir()
        try:
            output_path(p)
        except ValueError:
            pass
        else:
            raise AssertionError("existing output admitted")
        write_new(p / "receipt.json", {"status": "failed", "controls_passed": 0})
        try:
            write_new(p / "receipt.json", {"status": "passed"})
        except FileExistsError:
            pass
        else:
            raise AssertionError("receipt overwritten")
        try:
            deadline(0, None)
        except TimeoutError:
            pass
        else:
            raise AssertionError("deadline ignored")
    print("8 orchestration controls passed; no numerical proof run")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out")
    parser.add_argument("--budget", type=int, default=600)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return 0
    if args.out is None or not 1 <= args.budget <= 600:
        parser.error("requires --out NEW_DIRECTORY and a budget of 1..600 seconds")
    return run(output_path(args.out), args.budget)


if __name__ == "__main__":
    sys.exit(main())
