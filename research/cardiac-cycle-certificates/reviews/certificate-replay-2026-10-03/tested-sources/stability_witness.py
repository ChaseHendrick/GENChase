"""Opt-in witness capture without editing or rewriting frozen proof producers.

The trace observes locals, keeps references before deletion, and captures each
tail residue separately. It never changes a frame, argument, or producer return.
"""
import argparse
from fractions import Fraction
import gzip
import hashlib
import inspect
import json
from pathlib import Path
import sys
import time
import os
import platform

INTERFACE = "cardiac-spectral-witness/2"


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def real(x):
    from flint import acb, arb
    if isinstance(x, acb):
        if not x.imag.is_zero():
            raise ValueError("real value required")
        x = x.real
    if not isinstance(x, arb):
        x = arb(x)
    def endpoint(v):
        if not v.is_finite() or not v.is_exact():
            raise ValueError("finite exact endpoint required")
        m, e = v.man_exp()
        q = Fraction(int(m)) * Fraction(2) ** int(e)
        return f"{q.numerator}/{q.denominator}"
    return [endpoint(x.lower()), endpoint(x.upper())]


def complex_rectangle(x):
    return [real(x.real), real(x.imag)]


def matrix(x):
    if isinstance(x, list):
        return [[complex_rectangle(v) for v in row] for row in x]
    return [[complex_rectangle(x[i, j]) for j in range(x.ncols())] for i in range(x.nrows())]


def real_matrix(rows):
    return [[[real(v), ["0/1", "0/1"]] for v in row] for row in rows]


def capture(call, target, bindings):
    """Execute call once and capture a known frozen _certify function's locals.

    bindings are the caller's independent identity/source/input/settings/domain
    manifest. The scientific source hash is checked before and after capture.
    """
    source_path = inspect.getsourcefile(target)
    source_hash = sha(source_path)
    observer_hash = sha(__file__)
    interface_hash = sha(Path(__file__).with_name("certificate_replay.py"))
    lines, first = inspect.getsourcelines(target)
    tail_lines = {first + i for i, line in enumerate(lines) if "tail.append(dict(" in line}
    if len(tail_lines) != 1:
        raise ValueError("unknown tail capture point")
    values, tails, returned = {}, [], False
    names = {"N", "Ke", "nA", "n_c", "a", "b", "R0", "delta", "eta_t", "om_lo", "om_hi", "c4", "hU", "rho", "eps", "e", "A0c", "Vb", "Vib", "V0", "V1", "Vi0", "Vi1", "lamb", "lam0", "lam1", "st", "controls", "Tlo", "mult_T"}
    old_trace = sys.gettrace()
    if old_trace is not None:
        raise ValueError("an existing trace must not be overwritten")
    def trace(frame, event, arg):
        nonlocal returned
        if frame.f_code is not target.__code__:
            return None
        loc = frame.f_locals
        if event == "call":
            values["operator_input"] = loc["inp"] if "inp" in loc else loc["U"]
        for k in names:
            if k in loc:
                values[k] = loc[k]
        if event == "line" and frame.f_lineno in tail_lines:
            U = loc.get("Um", loc.get("U"))
            row = dict(residue=loc["rr"], U=matrix(U), Ui=matrix(loc["Ui"]), X=matrix(loc["X"]),
                       damping=real(loc["dm"][loc["rr"]]), lambda_=[complex_rectangle(z) for z in loc["Lr"]])
            if tails and tails[-1]["residue"] == row["residue"]:
                if tails[-1] != row:
                    raise ValueError("tail snapshot changed at duplicate line event")
            else:
                tails.append(row)
        if event == "return":
            returned = True
        return trace
    start = time.monotonic()
    sys.settrace(trace)
    try:
        result = call()
    finally:
        sys.settrace(None)
    if (not returned or sha(source_path) != source_hash or sha(__file__) != observer_hash
            or sha(Path(__file__).with_name("certificate_replay.py")) != interface_hash):
        raise ValueError("producer changed or did not return")
    if values["controls"]:
        raise ValueError("controls cannot produce a production witness")
    if source_hash not in bindings["sources"].values():
        raise ValueError("manifest must bind the actual producer source")
    if observer_hash not in bindings["sources"].values() or interface_hash not in bindings["sources"].values():
        raise ValueError("manifest must bind the observer and interface")
    from flint import ctx
    old = ctx.prec
    ctx.prec = 512
    try:
        witness = _build(values, tails, bindings)
    finally:
        ctx.prec = old
    return witness, result, dict(wall_s=time.monotonic() - start, producer_source_sha256=source_hash,
        observer_sha256=observer_hash, interface_sha256=interface_hash, interface=INTERFACE,
        python=sys.version, platform=platform.platform(), sources_unchanged=True,
        python_flint=__import__("flint").__version__, numpy=__import__("numpy").__version__,
        scipy=__import__("scipy").__version__,
        thread_environment={k: os.environ.get(k) for k in ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS", "BLIS_NUM_THREADS", "VECLIB_MAXIMUM_THREADS", "NUMEXPR_NUM_THREADS")})


def _build(values, tails, bindings):
    uniform = "V0" in values
    get = lambda k: real(values[k])
    geom = dict(N=values["N"], DIM=18, IV=0, Ke=values["Ke"], nA=values["nA"], nc=values["n_c"],
                a=get("a"), b=get("b"), R0=get("R0"), delta=get("delta"), eta=get("eta_t"),
                omega_lo=get("om_lo"), omega_hi=get("om_hi"), c4=get("c4"),
                h=get("hU") if uniform else ["0/1", "0/1"],
                delta_requested=str(Fraction(values["st"]["delta"].strip())))
    if "/" not in geom["delta_requested"]:
        geom["delta_requested"] += "/1"
    coeff = dict(A0c=matrix(values["A0c"]))
    inp = values["operator_input"]
    blocks = lambda data, real_only=False: {str(k): (real_matrix(v) if real_only else matrix(v)) for k, v in data.items()}
    if uniform:
        quadratic = "C2c" in inp
        operator = dict(kind="quadratic" if quadratic else "affine", J=[blocks(inp["J0"]), blocks(inp["J1c"])],
                        strip=[real_matrix(inp["SJ0"]), real_matrix(inp["SJ1"])],
                        radii=[blocks(inp["rad1"], True)], error=real_matrix(inp["epsW"]),
                        omega=[real(inp["om_bar"]), real(inp["om1"])], omega_error=real(inp["rho_om"]))
        if quadratic:
            operator["J"].append(blocks(inp["C2c"]))
            operator["strip"].append(real_matrix(inp["SC2"]))
            operator["radii"].append(blocks(inp["rad2"], True))
            operator["omega"].append(real(inp["om2half"]))
    else:
        om = inp["om_bar"]
        err = max((om - inp["om_lo"]).upper(), (inp["om_hi"] - om).upper())
        operator = dict(kind="point", J=[blocks(inp["J"])], strip=[real_matrix(inp["SJ"])], radii=[],
                        error=real_matrix(values["eps"]), omega=[real(om)], omega_error=real(err))
    operator.update(S_exponents=values["e"], rho=get("rho"), rho0=real(inp["rho0"]), rho2=real(inp["rho2"]),
                    h=geom["h"], D=["1/64000", "1/64000"])
    if uniform:
        window = dict(V=[matrix(values[k]) for k in ("V0", "V1")], Vi=[matrix(values[k]) for k in ("Vi0", "Vi1")],
                      lambda_=[[complex_rectangle(z) for z in values[k]] for k in ("lam0", "lam1")])
    else:
        window = dict(V=[matrix(values["Vb"])], Vi=[matrix(values["Vib"])], lambda_=[[complex_rectangle(z) for z in values["lamb"]]])
    for row in tails:
        row["lambda"] = row.pop("lambda_")
    window["lambda"] = window.pop("lambda_")
    witness = dict(schema="cardiac-spectral-witness/2", bindings=bindings,
                   premises=["operator-enclosures", "orbit-existence", "nonconstant-phase-kernel", "Hill-sector-lemmas"],
                   geometry=geom, coefficients=coeff, tail=tails, window=window,
                   operator=operator, claimed=dict(Tlo=get("Tlo"), multiplier=get("mult_T")))
    return witness


def write(witness, path):
    opener = gzip.open if str(path).endswith(".gz") else open
    with opener(path, "xt", encoding="utf-8") as f:
        json.dump(witness, f, separators=(",", ":"), allow_nan=False)
        f.write("\n")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--piece", default="G0P0")
    p.add_argument("--group", type=int)
    p.add_argument("--out", required=True)
    p.add_argument("--bindings", required=True)
    args = p.parse_args()
    import branch_stability as bs
    import branch as br
    rec = bs.done_labels().get(args.piece) if args.group is None else bs.done_groups().get(bs.unit_label(args.group))
    settings = rec["settings"] if rec else bs.DEFAULTS
    if rec is None:
        raise ValueError("an independently admitted current unit is required for this pilot CLI")
    root = Path(__file__).resolve().parent.parent
    inputs = {str(p.relative_to(root)): sha(p) for p in sorted(Path(br.DATA).glob("*")) if p.is_file()}
    sources = dict(bs.SOURCES_SHA256)
    for name in ("stability_witness.py", "certificate_replay.py"):
        sources["fourier/" + name] = sha(Path(__file__).with_name(name))
    identity = args.piece if args.group is None else bs.unit_label(args.group)
    bindings = dict(identity=identity, settings=settings, sources=sources, inputs=inputs,
                    domain=[str(Fraction(v)) for v in rec["g"]],
                    parameter_center=str(Fraction(rec["g_centre"])),
                    geometry=dict(N=rec["certificate"]["N"], DIM=18, IV=0,
                                  Ke=rec["certificate"]["K_e"], nA=rec["certificate"]["n_A"], nc=settings["n_c"],
                                  D="1/64000"),
                    trust="operator/existence/phase enclosure premises")
    call = (lambda: bs.prove_piece_uniform(args.piece, settings=settings)) if args.group is None else (lambda: bs.prove_group_uniform(args.group, settings=settings))
    witness, result, receipt = capture(call, bs._certify_uniform, bindings)
    for group in ("sources", "inputs"):
        for path, digest in bindings[group].items():
            if sha(root / path) != digest:
                raise ValueError("input or source changed while capturing: " + path)
    write(witness, args.out)
    with open(args.bindings, "x", encoding="utf-8") as f:
        json.dump(bindings, f, indent=2)
        f.write("\n")
    print(json.dumps(receipt), flush=True)


if __name__ == "__main__":
    main()
