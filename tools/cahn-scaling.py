"""Frozen, standard-library-only held-out analysis of the actual GPU measurements.

python3 tools/cahn-scaling.py [--write | --controls]
The power-law form is established science; a fit here is only a finite-lattice
calibration candidate. Failed acceptance rules remain failed, without retuning.
"""
import hashlib
import itertools
import json
import math
from pathlib import Path
import statistics
import sys

ROOT = Path(__file__).resolve().parent.parent


def fit(rows, fixed_p=None):
    x = [math.log(r["tau"]) for r in rows]
    y = [math.log(r["length"] / r["epsilon"]) for r in rows]
    mx, my = statistics.mean(x), statistics.mean(y)
    denominator = sum((v - mx) ** 2 for v in x)
    assert denominator > 0 and len(rows) > 1
    p = fixed_p if fixed_p is not None else sum((a - mx) * (b - my) for a, b in zip(x, y)) / denominator
    log_a = my - p * mx
    return {"A": math.exp(log_a), "p": p, "rows": len(rows),
            "logRMSE": math.sqrt(statistics.mean((b - log_a - p * a) ** 2 for a, b in zip(x, y)))}


def predict(model, row):
    return row["epsilon"] * model["A"] * row["tau"] ** model["p"]


def errors(model, rows):
    details = [{"seed": r["seed"], "epsilon": r["epsilon"], "tau": r["tau"],
                "observed": r["length"], "predicted": predict(model, r),
                "relativeError": predict(model, r) / r["length"] - 1} for r in rows]
    rmse = math.sqrt(statistics.mean(r["relativeError"] ** 2 for r in details))
    per_seed = [{"seed": seed, "rows": sum(r["seed"] == seed for r in details),
                 "relativeRMSE": math.sqrt(statistics.mean(r["relativeError"] ** 2 for r in details if r["seed"] == seed))}
                for seed in sorted({r["seed"] for r in details})]
    return {"relativeRMSE": rmse, "maximumAbsoluteRelativeError": max(abs(r["relativeError"]) for r in details),
            "worstSeedRMSE": max(r["relativeRMSE"] for r in per_seed), "perSeed": per_seed, "details": details}


def quantile(values, probability):
    values = sorted(values)
    x = (len(values) - 1) * probability
    low = math.floor(x)
    return values[low] + (values[min(low + 1, len(values) - 1)] - values[low]) * (x - low)


def bootstrap(rows):
    seeds = sorted({r["seed"] for r in rows})
    assert len(seeds) == 4, "Frozen experiment bootstraps four whole training seeds"
    blocks = {s: [r for r in rows if r["seed"] == s] for s in seeds}
    fits = [fit([r for seed in resample for r in blocks[seed]])
            for resample in itertools.product(seeds, repeat=len(seeds))]
    intervals = {key: [quantile([f[key] for f in fits], .025), quantile([f[key] for f in fits], .975)] for key in ["A", "p"]}
    return {"unit": "whole seed, including both epsilons and every training time", "resamples": len(fits),
            "percentile95": intervals, "exponentIntervalWidth": intervals["p"][1] - intervals["p"][0]}


def controls():
    rows = [{"seed": f"synthetic-{i}", "epsilon": e, "tau": t, "length": e * 2 * t ** .27}
            for i in range(4) for e in [.8, 1.2] for t in [16, 24, 32, 48]]
    exact = fit(rows)
    assert abs(exact["A"] - 2) < 1e-12 and abs(exact["p"] - .27) < 1e-12
    held = [{"seed": "unseen", "epsilon": 1, "tau": 96, "length": 2 * 96 ** .27}]
    good = errors(exact, held)["relativeRMSE"]
    corrupted = [{**held[0], "length": held[0]["length"] * 1.25}]
    bad = errors(exact, corrupted)["relativeRMSE"]
    assert good < 1e-12 and bad > .19
    factors = [.8, .95, 1.05, 1.2]
    scattered = [{**r, "length": r["length"] * factors[int(r["seed"].split("-")[-1])]} for r in rows]
    ci = bootstrap(scattered)
    repeated = bootstrap(scattered * 7)
    width = ci["percentile95"]["A"][1] - ci["percentile95"]["A"][0]
    width_repeated = repeated["percentile95"]["A"][1] - repeated["percentile95"]["A"][0]
    assert width > .3 and abs(width - width_repeated) < 1e-11
    # Exercise the actual partition/analysis path, rather than merely refitting
    # an untouched training array and calling that a leakage test.
    seeds = [f"synthetic-{i}" for i in range(6)]
    protocol = {"seeds": seeds, "trainingSeeds": [0, 1, 2, 3], "trainingEpsilons": [.8, 1.2],
                "trainingTimes": [16, 24, 32, 48], "times": [16, 24, 32, 48, 64, 96], "largerSeeds": [4, 5],
                "limits": {"categoryRMSE": .08, "worstSeedRMSE": .12, "baselineErrorRatio": .75,
                           "exponentIntervalWidth": .1, "splitExponentDifference": .05,
                           "halfStepRelativeDifference": .02, "largerMeanRelativeDifference": .08}}
    cases = [("main", seed, e) for seed in seeds for e in [.8, 1, 1.2]]
    cases += [(kind, seed, 1) for kind in ["halfStep", "larger"] for seed in seeds[4:]]
    fixture = {"protocol": protocol, "controls": {"passed": True}, "gpuControls": {"passed": True},
               "runs": [{"kind": kind, "seed": seed, "epsilon": e, "numericalGuards": True, "boxGuard": True,
                         "samples": [{"tau": t, "length": e * 2 * t ** .27} for t in protocol["times"]]}
                        for kind, seed, e in cases]}
    original_analysis = analyze(fixture)
    mutated = json.loads(json.dumps(fixture))
    for run in mutated["runs"]:
        if run["kind"] != "main":
            continue
        for row in run["samples"]:
            if run["seed"] in seeds[4:] or run["epsilon"] == 1 or row["tau"] in [64, 96]:
                row["length"] *= 1.25
    mutated_analysis = analyze(mutated)
    assert original_analysis["model"] == mutated_analysis["model"]
    assert original_analysis["checks"]["categoryPrediction"] and not mutated_analysis["checks"]["categoryPrediction"]
    return {"knownLaw": {"expectedA": 2, "expectedP": .27, "fit": exact},
            "correctHeldoutRelativeRMSE": good, "corruptedHeldoutRelativeRMSE": bad,
            "seedBootstrapAWidth": width, "sevenfoldDuplicatedFrameAWidth": width_repeated,
            "heldoutExcludedFromFit": True, "actualPartitionCorruptionDetected": True, "passed": True}


def analyze(data):
    p = data["protocol"]
    limits = p["limits"]
    main = [r for r in data["runs"] if r["kind"] == "main"]
    training_seeds = {p["seeds"][i] for i in p["trainingSeeds"]}
    training_eps = set(p["trainingEpsilons"])
    training_times = set(p["trainingTimes"])
    training = []
    categories = {"newSeeds": [], "newEpsilon": [], "laterTimes": []}
    for run in main:
        for sample in run["samples"]:
            assert sample["length"] is not None and sample["length"] > 0
            row = {"seed": run["seed"], "epsilon": run["epsilon"], "tau": sample["tau"], "length": sample["length"]}
            if run["epsilon"] not in training_eps:
                categories["newEpsilon"].append(row)
            elif run["seed"] not in training_seeds:
                categories["newSeeds"].append(row)
            elif sample["tau"] not in training_times:
                categories["laterTimes"].append(row)
            else:
                training.append(row)
    assert len(training) == 32 and [len(categories[k]) for k in categories] == [24, 36, 16]
    model, baseline = fit(training), fit(training, 1 / 3)
    ci = bootstrap(training)
    early = fit([r for r in training if r["tau"] in [16, 24, 32]])
    late = fit([r for r in training if r["tau"] in [24, 32, 48]])
    split_difference = abs(early["p"] - late["p"])
    all_held = list(itertools.chain.from_iterable(categories.values()))
    held = {key: {"candidate": errors(model, rows), "baseline": errors(baseline, rows)} for key, rows in categories.items()}
    pooled = {"candidate": errors(model, all_held), "baseline": errors(baseline, all_held)}
    error_ratio = pooled["candidate"]["relativeRMSE"] / pooled["baseline"]["relativeRMSE"]
    refinement = []
    for run in (r for r in data["runs"] if r["kind"] == "halfStep"):
        coarse = next(r for r in main if r["seed"] == run["seed"] and r["epsilon"] == run["epsilon"])
        for a, b in zip(coarse["samples"], run["samples"]):
            assert a["tau"] == b["tau"]
            change = b["length"] / a["length"] - 1
            refinement.append({"seed": run["seed"], "tau": a["tau"], "coarse": a["length"], "fine": b["length"],
                               "relativeChange": change, "passed": abs(change) <= limits["halfStepRelativeDifference"]})
    size = []
    larger = [r for r in data["runs"] if r["kind"] == "larger"]
    for index, tau in enumerate(p["times"]):
        large_mean = statistics.mean(r["samples"][index]["length"] for r in larger)
        selected = [r for r in main if r["epsilon"] == 1 and r["seed"] in {p["seeds"][i] for i in p["largerSeeds"]}]
        small_mean = statistics.mean(r["samples"][index]["length"] for r in selected)
        change = large_mean / small_mean - 1
        size.append({"tau": tau, "smallMean": small_mean, "largeMean": large_mean, "relativeChange": change,
                     "passed": abs(change) <= limits["largerMeanRelativeDifference"]})
    checks = {
        "independentControls": data["controls"]["passed"] and data["gpuControls"]["passed"],
        "numericalGuards": all(r["numericalGuards"] for r in data["runs"]),
        "boxLengthGuard": all(r["boxGuard"] for r in data["runs"]),
        "categoryPrediction": all(v["candidate"]["relativeRMSE"] <= limits["categoryRMSE"] for v in held.values()),
        "worstSeedPrediction": pooled["candidate"]["worstSeedRMSE"] <= limits["worstSeedRMSE"],
        "baselineImprovement": error_ratio <= limits["baselineErrorRatio"],
        "bootstrapExponentWidth": ci["exponentIntervalWidth"] <= limits["exponentIntervalWidth"],
        "windowExponentStability": split_difference <= limits["splitExponentDifference"],
        "timestepRefinement": all(r["passed"] for r in refinement),
        "largerDomain": all(r["passed"] for r in size),
    }
    return {"model": model, "fixedOneThirdBaseline": baseline, "trainingRows": len(training), "heldoutRows": len(all_held),
            "seedBootstrap": ci, "splitWindows": {"early": early, "late": late, "exponentDifference": split_difference},
            "heldout": held, "pooled": pooled, "heldoutErrorRatioToBaseline": error_ratio,
            "refinement": refinement, "largerDomain": size, "checks": checks,
            "accepted": all(checks.values()), "failedChecks": [k for k, passed in checks.items() if not passed],
            "conclusion": "Local finite-lattice calibration passes the frozen screen; no novel or asymptotic law claim."
            if all(checks.values()) else "Reject this calibration: one or more frozen predictive, numerical or stability guards failed. No new law claimed."}


def main():
    control_results = controls()
    if "--controls" in sys.argv:
        print(json.dumps(control_results, indent=2))
        return
    raw_path = ROOT / "experiments/results/cahn-scaling.json"
    raw_bytes = raw_path.read_bytes()
    data = json.loads(raw_bytes)
    result = {"experiment": "cahn-finite-lattice-calibration-analysis", "controls": control_results,
              "provenance": {"rawDataSHA256": hashlib.sha256(raw_bytes).hexdigest(),
                             "pythonSHA256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                             "protocolSHA256": data["provenance"]["protocolSHA256"],
                             "uncertaintyUnit": "whole training seed, not individual frame"},
              **analyze(data)}
    if "--write" in sys.argv:
        dest = ROOT / "experiments/results/cahn-scaling-analysis.json"
        dest.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({k: result[k] for k in ["model", "fixedOneThirdBaseline", "seedBootstrap", "splitWindows",
                                          "heldoutErrorRatioToBaseline", "checks", "accepted", "failedChecks", "conclusion"]}, indent=2))


if __name__ == "__main__":
    main()
