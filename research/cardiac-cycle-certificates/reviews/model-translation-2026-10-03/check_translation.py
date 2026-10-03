"""Read-only scoped translation controls. No ODE or proof admission."""
from pathlib import Path
import importlib.util
import hashlib
import json
import math
import sys
import time
import numpy as np

BASE = Path(__file__).resolve().parents[2]
WT = BASE / "work/cardiac-rings-1.1.0-2026-10-02"
RESEARCH = WT / "research/cardiac-cycle-certificates"
AUDIT = BASE / "work/cardiac-study/ap-model-audit"


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


def main():
    started = time.monotonic()
    litmod = module("literal_audit", BASE / "work/cardiac-study/certification-audit/literal_model_audit.py")
    literal = litmod.Literal()
    reference_path = RESEARCH / "model/tp06_18d.py"
    model = module("current_reference", reference_path)
    source_checks = []
    for row in json.loads((AUDIT / "SOURCE-MANIFEST.json").read_text())["sources"]:
        if "/primary-sources/" in row["file"]:
            actual = hashlib.sha256((BASE / row["file"]).read_bytes()).hexdigest()
            assert actual == row["sha256"]
            source_checks.append(dict(file=row["file"], sha256=actual, url=row["url"]))
    sys.path.insert(0, str(RESEARCH / "fourier"))
    import centre as ct
    import arbmodel as am
    import test_arbmodel as trust
    points = [np.array([V] + [0.3]*13 + [0.0002, 2.0, 0.00036, 10.0])
              for V in (-80, -40.001, -40, -39.999, -20, 0, 14.99, 15.01, 30)]
    rng = np.random.default_rng(20261003)
    for _ in range(40):
        points.append(np.concatenate(([rng.uniform(-85, 30)], rng.uniform(.01, .99, 13),
                                     [rng.uniform(1e-4, 8e-4), rng.uniform(1, 3),
                                      rng.uniform(1e-4, 1e-3), rng.uniform(8, 12)])))
    rows = []
    for y in points:
        f, jac, _ = literal.evaluate(y)
        other = np.asarray(model.field(y, model.PARAMS, math))
        scaled_jac = ct.jac_cs((y/ct.SIG)[:, None])[0]
        other_jac = ct.SIG[:, None]*scaled_jac/ct.SIG[None, :]
        rows.append(dict(V=float(y[0]),
                         normalized_rhs_error=float(np.max(np.abs(f-other)/(1+np.abs(f)))),
                         normalized_jac_error=float(np.max(np.abs(jac-other_jac)/(1+np.abs(jac))))))
    worst_f = max(r["normalized_rhs_error"] for r in rows)
    worst_j = max(r["normalized_jac_error"] for r in rows)
    assert worst_f < 1e-11 and worst_j < 1e-10
    trust_results = [dict(name=fn.__name__, result=fn()) for fn in
                     (trust.test_generated_file, trust.test_decimal_and_scale_balls,
                      trust.test_scales_and_params_match_capd)]
    y = points[4]
    f1 = np.asarray(model.field(y, dict(model.PARAMS, Cm=1)))
    f185 = np.asarray(model.field(y, dict(model.PARAMS, Cm=.185)))
    assert f1[15] == f185[15] and f1[15] != 0
    assert abs(f1[17]/f185[17]-1/.185) < 1e-11
    m19 = module("charge19", RESEARCH / "ap-reentry/tp06_19d.py")
    y19 = np.append(y, 138.3)
    p19 = m19.params("erhardt", g_Kr=.0153, g_Ks=.0275, g_CaL=.000199)
    f19 = m19.field(y19, p19)
    gradient = m19.charge_grad(y19, p19)
    full_charge, clamp_charge = float(gradient@f19), float(gradient[:18]@f1)
    assert abs(full_charge) < 1e-12
    assert abs(clamp_charge+f19[18]) < 1e-12 and abs(clamp_charge) > 1e-8
    try:
        model.field([15.0] + [float(v) for v in y[1:]], model.PARAMS, math)
    except ZeroDivisionError:
        pure_float_singularity_refused = True
    else:
        raise AssertionError("pure scalar literal V=15 singularity not raised")
    try:
        am.f([float(v/s) for v, s in zip([15.0]+list(y[1:]), ct.SIG)])
    except am.DomainError:
        arb_singularity_refused = True
    else:
        raise AssertionError("Arb V=15 guard failed")
    namespace = {}
    source = reference_path.read_text()
    assert source.count("/ 170)") == 1
    exec(compile(source.replace("/ 170)", "/ 240)"), "<f2-negative-control>", "exec"), namespace)
    mutant = namespace["field"]
    mutant_error = max(float(np.max(np.abs(np.asarray(mutant(y, model.PARAMS, math)) -
                                          literal.evaluate(y)[0]) /
                                   (1+np.abs(literal.evaluate(y)[0])))) for y in points)
    assert mutant_error > 1e-5
    record = dict(status="scoped_translation_controls_pass", date_UTC="2026-10-03",
                  scope="49 float/complex-step literal controls and exact generated/decimal/scales checks; not full symbolic model equivalence or a new certificate",
                  primary_sources_sha256_checked=source_checks,
                  matlab_sha256=litmod.PIN,
                  reference_sha256=hashlib.sha256(reference_path.read_bytes()).hexdigest(),
                  control_source_sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                  worst_normalized_rhs_error=worst_f, worst_normalized_jac_error=worst_j,
                  rows=rows, trust_controls=trust_results,
                  membrane_vs_internal_flux=dict(Ca_sr_Cm1=float(f1[15]), Ca_sr_Cm0185=float(f185[15]),
                                                  Na_i_ratio=float(f1[17]/f185[17]),
                                                  false_all_flux_scale_difference=float(abs(f1[15]-f185[15]/.185))),
                  charge_clamp=dict(full19_charge_derivative_float=full_charge,
                                    clamped18_charge_derivative_float=clamp_charge,
                                    omitted_Ki_derivative_float=float(f19[18]),
                                    conclusion="Ki clamping is not reduction to the conserved full19 charge leaf"),
                  V15_refused_by_pure_scalar_reference_and_arb=pure_float_singularity_refused and arb_singularity_refused,
                  negative_controls=dict(f2_170_to_240_refused_error=mutant_error),
                  wall_seconds=time.monotonic()-started)
    with (Path(__file__).parent / "translation-controls.json").open("x") as fp:
        json.dump(record, fp, indent=2, allow_nan=False)
        fp.write("\n")
    print(json.dumps({k: record[k] for k in ("status", "worst_normalized_rhs_error",
                     "worst_normalized_jac_error", "membrane_vs_internal_flux", "charge_clamp", "wall_seconds")}, indent=2))


if __name__ == "__main__":
    main()
