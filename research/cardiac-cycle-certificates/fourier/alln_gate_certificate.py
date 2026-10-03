"""Isolated prescribed-voltage6-state Hill certificate prototype.

Fresh interval coefficient and profile-uncertainty bounds, followed by native
SC arithmetic adapted in alln_gate_core.py. Full operator and admitted parent
existence remain explicit premises. No all-N/cable stability admission.
Outputs are new immutable scratch witnesses and bindings, pending review.
"""
import argparse
from fractions import Fraction
import hashlib
import json
import os
from pathlib import Path
import time
for _name in ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS", "VECLIB_MAXIMUM_THREADS"):
    os.environ[_name] = "1"
import alln
import arbmodel as am
import centre as ct
import existence as ex
import fourier_eval as fe
import alln_gate_core as core
import stability_witness as sw
from flint import acb, arb, ctx, fmpq

HERE = Path(__file__).resolve().parent
SUBSET = (10, 13, 14, 15, 16, 17)
GATES = (1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12)


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def inputs(settings, log):
    parent = HERE / "data/alln/pieces.jsonl"
    rows = [json.loads(x) for x in parent.read_text().splitlines()]
    row = min((r for r in rows if Fraction(r["rec"]["eps_lo"]) == 0),
              key=lambda r: Fraction(r["rec"]["eps_hi"]))
    rec = row["rec"]
    om, A = alln.centre_from_text(row["centre"])
    # The complete accepted all-N existence proof is an explicit input premise.
    # This prototype checks its exact center binding and point inclusion,
    # without claiming to independently reprove the original radii inequalities.
    if sha(HERE / "stability.py") != core.NATIVE_SOURCE_SHA256:
        raise ValueError("frozen native source changed")
    if alln.br.centre_digest(om, A) != rec["centre_sha256"]:
        raise ValueError("parent centre digest mismatch")
    K = rec["K"]
    r = ct.text_to_dyadic(rec["r_existence"]["hex"])
    ETA = [ex._exact_dyadic_param(v, "eta") for v in rec["eta"]]
    olo = ct.text_to_dyadic(rec["omega"]["lower"]["hex"])
    ohi = ct.text_to_dyadic(rec["omega"]["upper"]["hex"])
    if not 0 < olo <= om <= ohi or not Fraction(rec["eps_lo"]) <= 0 <= Fraction(rec["eps_hi"]):
        raise ValueError("parent does not enclose target")
    parent_frequency = [sw.real(olo), sw.real(ohi)]
    om_radius = ex.up(max(om-olo, ohi-om))
    olo, ohi = ex.lo(om-om_radius), ex.up(om+om_radius)
    rho = ex._exact_dyadic_param(settings["rho"], "rho")
    rho2 = ex._exact_dyadic_param(settings["rho2"], "rho2")
    rho0 = ex._exact_dyadic_param(rec["settings"]["rho0"], "rho0")
    R = ex._exact_dyadic_param(settings["R"], "R")
    if not 0 < rho2 <= rho0 < rho:
        raise ValueError("required analytic strips")
    phi = fe.TrigPoly(A)
    kw = dict(nx=32, rtol=10.0, atol=1.0, max_evals=4000)
    J53 = lambda z: ex._flat(am.f_and_df(z, am.params(53), prec=53)[1])
    Jprec = lambda z: ex._flat(am.f_and_df(z, am.params(settings["prec"]), prec=settings["prec"])[1])
    log("fresh full18 Jacobian strip")
    sj = fe.strip_sup(J53, phi, rho, **kw)
    infl = [v[:] for v in A]
    for i in range(18):
        infl[i][K] = acb(A[i][K].real+R*arb(0, 1), R*arb(0, 1))
    log("fresh full18 physical polydisc")
    sp = fe.strip_sup(lambda z: am.f(z, am.params(53), prec=53),
                      fe.TrigPoly(infl), rho2, **kw)
    if not sj.full_strip or not sp.full_strip:
        raise ValueError("strip cover incomplete")
    log("fresh DFT coefficients with interval alias bounds")
    enc = fe.fourier_coefficients(Jprec, phi, rho, settings["nodes"], settings["nA"],
                                 S=sj, prec=settings["prec"])
    if enc.S_source != "strip":
        raise ValueError("missing rigorous coefficient strip")
    # All18 input perturbations enter Cauchy product before taking the6 block.
    t = [ex.up(ETA[i+1]*r) for i in range(18)]
    if any(not x < R for x in t):
        raise ValueError("profile radius exceeds Cauchy polydisc")
    P = arb(1)
    for x in t:
        P /= 1-x/R
    error18 = [[ex.up(sp.S[i]/R*(P/(1-t[j]/R)-1))
                for j in range(18)] for i in range(18)]
    projected = lambda matrix: [[matrix[i][j] for j in SUBSET] for i in SUBSET]
    J = {n: projected([[enc.c[18*i+j][n+settings["nA"]] for j in range(18)]
                       for i in range(18)]) for n in range(-settings["nA"], settings["nA"]+1)}
    SJ = projected([[sj.S[18*i+j] for j in range(18)] for i in range(18)])
    source_provenance = dict(parent_sha256=sha(parent), parent_label=rec["label"],
                             target_epsilon="0", parent_interval=[rec["eps_lo"], rec["eps_hi"]],
                             parent_center_sha256=rec["centre_sha256"],
                             parent_frequency=parent_frequency,
                             conservative_symmetric_frequency=[sw.real(olo), sw.real(ohi)],
                             parent_r_existence=rec["r_existence"], parent_eta=rec["eta"],
                             subsets=dict(interacting=list(SUBSET), scalar_gates=list(GATES)),
                             actual_profile_error="full18 Cauchy product before6-state projection",
                             strips=dict(J=ex._strip_rec(sj), full18_polydisc=ex._strip_rec(sp)),
                             missing="full17 inverse/semigroup constants and11 scalar rate certificates")
    return dict(rec=rec, K=K, Kp=settings["nA"], A=[A[i] for i in SUBSET],
                om_bar=om, om_lo=olo, om_hi=ohi, rho=rho, rho0=rho0, rho2=rho2,
                R=R, r=r, ETA=ETA, J=J, SJ=SJ, eps_direct=projected(error18)), source_provenance


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", required=True)
    parser.add_argument("--Ke", type=int, default=24)
    parser.add_argument("--R", default="1/8")
    args = parser.parse_args()
    if not 8 <= args.Ke <= 40:
        parser.error("Ke must lie in8..40")
    out = Path(args.out)
    if out.exists():
        parser.error("output directory must be new")
    out.mkdir(parents=True)
    settings = dict(core.native.DEFAULTS, delta="1e-5", Ke_offset=args.Ke,
                    rho="1", rho2="1/8", R=args.R, nA=40, nodes=256, prec=128)
    sources = {str(p.relative_to(HERE.parent)): sha(p) for p in
               [HERE / name for name in ("alln_gate_certificate.py", "alln_gate_core.py", "alln.py",
                                        "stability.py", "stability_witness.py", "certificate_replay.py", "arbmodel.py",
                                        "tp06_18d_arb.py", "existence.py", "fourier_eval.py", "centre.py")] +
               [HERE.parent / "model/tp06_18d.py", HERE.parent / "model/scales.txt"]}
    bindings = dict(identity="prescribed-voltage6-cable-eps0", sources=sources,
                    inputs={"fourier/data/alln/pieces.jsonl": sha(HERE / "data/alln/pieces.jsonl")},
                    settings=settings, domain=["0/1", "0/1"], parameter_center="0/1",
                    geometry=dict(N=1, DIM=6, IV=-1, Ke=args.Ke, nA=settings["nA"],
                                  nc=settings["n_c"], D="0/1", expected_count=0),
                    trust="operator enclosures and admitted alln parent are premises; no physical phase premise")
    start = time.monotonic()
    receipt = dict(status="started", certified_alln_or_cable=False, bindings=bindings)
    try:
        ctx.prec = settings["prec"]
        inp, provenance = inputs(settings, lambda x: print(x, flush=True))
        log = lambda x: print(x, flush=True)
        witness, result, capture = sw.capture(
            lambda: core.certify_gate(1, inp, settings, {}, log, lambda _: None, settings["prec"]),
            core.certify_gate, bindings)
        sw.write(witness, out/"captured-legacy-witness.json.gz")
        raw_matrix_hash = hashlib.sha256(json.dumps(
            {k: witness[k] for k in ("coefficients", "tail", "window")},
            sort_keys=True, separators=(",", ":")).encode()).hexdigest()
        witness["geometry"].update(DIM=6, IV=-1, expected_count=0)
        witness["operator"]["D"] = ["0/1", "0/1"]
        witness["premises"] = ["operator-enclosures", "Hill-sector-lemmas"]
        receipt["private_schema_transformation"] = dict(
            reason="legacy observer hardcodes physical18-state geometry; producer has exact6-state undiffused count0 geometry",
            geometry=dict(DIM=6, IV=-1, expected_count=0), D=["0/1", "0/1"],
            observer_sha256=bindings["sources"]["fourier/stability_witness.py"],
            original_witness_sha256=sha(out/"captured-legacy-witness.json.gz"),
            unchanged_coefficient_tail_window_sha256=raw_matrix_hash)
        if raw_matrix_hash != hashlib.sha256(json.dumps(
                {k: witness[k] for k in ("coefficients", "tail", "window")},
                sort_keys=True, separators=(",", ":")).encode()).hexdigest():
            raise ValueError("matrix values changed in metadata transformation")
        for collection in ("sources", "inputs"):
            for name, digest in bindings[collection].items():
                if sha(HERE.parent/name) != digest:
                    raise ValueError("source/input changed during run")
        sw.write(witness, out/"witness.json.gz")
        (out/"bindings.json").write_text(json.dumps(bindings, indent=2)+"\n")
        (out/"profile-provenance.json").write_text(json.dumps(provenance, indent=2)+"\n")
        receipt.update(status="native_count0_pending_independent_replay",
                       count=result["count_in_Omega"], SC_ratio=result["SC_worst_ratio"],
                       source_bound_capture=capture)
    except BaseException as error:
        receipt.update(status="failed", exception=type(error).__name__, reason=str(error))
        raise
    finally:
        receipt["wall_seconds"] = time.monotonic()-start
        (out/"receipt.json").write_text(json.dumps(receipt, indent=2)+"\n")
    print(json.dumps(receipt, indent=2), flush=True)


if __name__ == "__main__":
    main()
