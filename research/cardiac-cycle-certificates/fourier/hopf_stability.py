"""Draft amplitude-family Hill stability producer, away from epsilon=0.

Fresh radii-polynomial localization identifies a subpiece with the published
Hopf branch. The actual Jacobian family is enclosed by an affine coefficient
path plus derivative variation and a Hessian-controlled orbit tube. The frozen
uniform Hill certificate then checks every parameter in this subpiece.

This program is experimental. A successful subpiece is not a full bridge proof,
does not certify epsilon=0, and does not certify any ring or cable stability.
See LEMMAS-hopf-stability.md for the mathematical interface and trusted premises.
"""
import argparse
import hashlib
import json
import os
import time
from fractions import Fraction
from pathlib import Path

for _name in ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS", "BLIS_NUM_THREADS"):
    os.environ[_name] = "1"

from flint import acb, arb  # noqa: E402
import arbmodel as am  # noqa: E402
import branch_stability as bs  # noqa: E402
import existence as ex  # noqa: E402
import fourier_eval as fe  # noqa: E402
import hopf as hp  # noqa: E402

DIM = 18
HERE = Path(__file__).resolve().parent


def exact(value, name):
    if isinstance(value, (float, bool)):
        raise ValueError(f"{name} must be exact rational text or an integer")
    try:
        return Fraction(value)
    except (TypeError, ValueError, ZeroDivisionError) as err:
        raise ValueError(f"invalid exact {name}") from err


def symmetric_interval(parent, halfwidth):
    a, b = exact(parent["e_lo"], "e_lo"), exact(parent["e_hi"], "e_hi")
    h = exact(halfwidth, "halfwidth")
    c = (a + b) / 2
    if not (0 < h <= (b - a) / 2 and c - h > 0):
        raise ValueError("need a positive subpiece strictly away from epsilon=0")
    return c - h, c + h


def _matrix(rows, n, Kp):
    return [[rows[DIM * k + j][n + Kp] for j in range(DIM)] for k in range(DIM)]


def _majorant(values):
    return [[values[DIM * k + j] for j in range(DIM)] for k in range(DIM)]


def assert_hill_sources():
    current = {p: hashlib.sha256((HERE.parent / p).read_bytes()).hexdigest()
               for p in bs.SOURCES_SHA256}
    if current != bs.SOURCES_SHA256:
        raise RuntimeError("Hill proof sources changed after import")


def _parent_identification(parent, localized, cov, a, b):
    """An endpoint-convex centre distance plus the new tube fits parent uniqueness."""
    obj = localized["_obj"]
    E = [hp._arb_q(e) for e in parent["eta"]]
    oldrho = hp._hexval(parent["result"]["r_uniqueness"])
    ratio = ex.up(hp.amax_list([x / y for x, y in zip(obj["E"], E)]))
    Cparent = hp.Centre.from_record(parent["centre"])
    ec_parent = (Fraction(parent["e_lo"]) + Fraction(parent["e_hi"])) / 2
    ec_new = (a + b) / 2
    # Each difference is affine in epsilon. The weighted l1/max norm is
    # convex, so the maximum of its endpoint bounds encloses the full segment.
    distance = ex.up(hp.amax_list([hp.centre_distance(obj["C"], ec_new,
                       Cparent, ec_parent, xi, E, obj["nu"]) for xi in (a, b)]))
    lhs = ex.up(distance + obj["r_lo"] * ratio)
    if not lhs < oldrho:
        raise hp.ProofFailure("fresh subpiece not inside the parent uniqueness ball")
    if not cov.contains(obj["C"], a, b):
        raise hp.ProofFailure("subpiece centre curve escapes the analytic cover")
    return dict(lhs=ex.bound_rec(lhs), parent_radius=ex.bound_rec(oldrho),
                centre_distance=ex.bound_rec(distance), strict=True,
                reason="convex endpoint bound for the exact affine centres plus tube")


def build_family(parent, crec, *, halfwidth="1/100000", Ke=12, M=128, Kp=64, rho="5/8", centre_K=None, log=print):
    if (type(Ke) is not int or Ke < 1 or type(M) is not int or
            type(Kp) is not int or not 2 * Ke <= Kp < M):
        raise ValueError("need exact positive Ke and 2 Ke <= Kp < M")
    a, b = symmetric_interval(parent, halfwidth)
    ec, h = (a + b) / 2, (b - a) / 2
    C = hp.Centre.from_record(parent["centre"])
    proposal = None
    if centre_K is not None:
        if type(centre_K) is not int or centre_K < C.K:
            raise ValueError("centre_K must be an integer at least the parent's order")
        fp = hp.FloatEps(centre_K, Mc=max(96, 4 * centre_K + 16))
        u, residual = fp.newton(fp.from_centre(C), float(ec))
        C = fp.to_centre(u, fp.tangent(u, float(ec)))
        proposal = dict(kind="untrusted floating Galerkin centre", K=centre_K,
                        residual_diagnostic=residual, exact_centre=C.to_record())
        log(f"new untrusted centre K={centre_K}, residual={residual:.3e}; proof still required")
        cov = hp.EpsCover([(C, a, b)], crec["T"], [crec["R"]] * DIM,
                          crec["G_R"], rho2=crec["rho2"], max_evals=1500, log=log)
    else:
        cov = hp.rebuild_cover(crec)
    st = dict(hp.PIECE_DEFAULTS)
    st.update({k: parent["settings"][k] for k in ("M", "nsub_xi", "nsub_s", "rho0")})
    # Higher truncation needs a larger DFT grid as well. Keeping M=64 at
    # K=20 leaves only16 alias-separation modes and can swamp the residual.
    st["M"] = max(st["M"], M, 2 * C.K + int(st["L"]) + 48)
    for k in ("M", "nsub_xi", "nsub_s"):
        if type(st[k]) is not int or st[k] <= 0:
            raise ValueError(f"invalid exact setting {k}")
    hp._exact_input(st["rho0"])
    log(f"fresh subpiece epsilon=[{a},{b}], parent={parent['idx']}")
    bl = hp.piece_blocks(C, a, b, cov, settings=st, log=log)
    res = hp.assemble(bl, parent["eta"], str(hp.hex_fraction(parent["r_star"])), log=log)
    ident = _parent_identification(parent, res, cov, a, b)
    obj = res["_obj"]
    E, r = obj["E"], obj["r_lo"]
    with am.precision(192):
        rho_a = ex._exact_dyadic_param(rho, "rho")
        rho0 = hp._arb_q(st["rho0"])
        if not (0 < rho_a < cov.rho2 and rho0 < cov.rho2):
            raise hp.ProofFailure("Jacobian and existence strips must fit the analytic cover")
        t = [ex.up((E[hp.CC + k] + hp._arb_q(b) * E[hp.CW + k]) * r) for k in range(DIM)]
        tg = ex.up(E[1] * r)
        if not all(t[k] < cov.R[k] for k in range(DIM)) or not tg < cov.G_R:
            raise hp.ProofFailure("actual orbit tube escapes the Hessian cover")
        epsW = [[ex.up(sum((cov.H(k, j, l) * t[l] for l in range(DIM)), arb(0))
                          + cov.MG[k][j] * tg) for j in range(DIM)] for k in range(DIM)]
        A = [[hp._arb_q(ec) * x for x in row] for row in C.w]
        for k in range(DIM):
            A[k][C.K] += acb(C.c[k])
        phi = fe.TrigPoly(A)
    skw = dict(nx=16, rtol=1000.0, max_evals=1200)

    def jac(z, prec):
        prm = am.params(prec)
        prm["g_Ks"] = acb(C.g)
        return ex._flat(am.f_and_df(z, prm, prec=prec)[1])

    log("enclosing centre Jacobian coefficients")
    Jsup = fe.strip_sup(lambda z: jac(z, 53), phi, rho_a, **skw)
    if not Jsup.full_strip:
        raise hp.ProofFailure("centre Jacobian cover is not a full strip")
    Jenc = fe.fourier_coefficients(lambda z: jac(z, 192), phi, rho_a, M, Kp, S=Jsup, prec=192)
    cfn53, cfn192 = hp._CurveFns(C, a, b, 53), hp._CurveFns(C, a, b, 192)
    Xi = acb(hp._ball_interval(a, b))

    def derivative(z, fns):
        return fns.zc(z, Xi, [acb(1)])[DIM * DIM:2 * DIM * DIM]

    log("enclosing uniform amplitude derivative of Jacobian")
    z36 = C.trig36()
    Dsup = fe.strip_sup(lambda z: derivative(z, cfn53), z36, rho_a, **skw)
    if not Dsup.full_strip:
        raise hp.ProofFailure("Jacobian derivative cover is not a full strip")
    Denc = fe.fourier_coefficients(lambda z: derivative(z, cfn192), z36, rho_a, M, Kp, S=Dsup, prec=192)
    with am.precision(192):
        J0 = {n: _matrix(Jenc.c, n, Kp) for n in range(-Kp, Kp + 1)}
        Dc = {n: _matrix(Denc.c, n, Kp) for n in range(-Kp, Kp + 1)}
        J1c = {n: [[acb(v.real.mid(), v.imag.mid()) for v in row] for row in Dc[n]] for n in Dc}
        rad1 = {n: [[ex.up((Dc[n][k][j] - J1c[n][k][j]).abs_upper())
                     for j in range(DIM)] for k in range(DIM)] for n in Dc}
        U = dict(K=C.K, Kp=Kp, A=A, h=ex.up(hp._arb_q(h)), om_bar=C.om, om1=C.tom,
                 rho_om=ex.up(E[0] * r), rho=rho_a, rho0=rho0, rho2=cov.rho2,
                 J0=J0, J1c=J1c, rad1=rad1, SJ0=_majorant(Jsup.S),
                 SJ1=_majorant(Dsup.S), epsW=epsW)
    meta = dict(parent_idx=parent["idx"], e_lo=str(a), e_hi=str(b), centre_sha256=C.digest(),
                cover_digest=cov.digest, K=C.K, Kp=Kp, M=M, rho=rho,
                identification=ident, proposal=proposal, existence={k: v for k, v in res.items() if k != "_obj"},
                tube=[ex.bound_rec(x) for x in t], parameter_tube=ex.bound_rec(tg),
                coefficient_strip=dict(centre_full=Jsup.full_strip, derivative_full=Dsup.full_strip,
                                       centre_evals=Jsup.n_evals, derivative_evals=Dsup.n_evals))
    return U, meta


def run_piece(idx, *, halfwidth="1/100000", delta="1e-6", Ke=12, M=128, Kp=64, centre_K=None, log=print):
    hp._assert_sources_current()
    assert_hill_sources()
    t0 = time.time()
    input_paths = [Path(hp.DATA) / name for name in
                   ("pieces.jsonl", "covers.jsonl", hp.REPROVE_LOG)]
    input_pins = {str(path.relative_to(HERE.parent)): hashlib.sha256(path.read_bytes()).hexdigest()
                  for path in input_paths}
    deltaq = exact(delta, "delta")
    if deltaq <= 0 or type(idx) is not int:
        raise ValueError("need exact positive delta and integer piece index")
    parents = {p["idx"]: p for p in hp.final_pieces()}
    parent = parents[idx]
    lines = hp.piece_lines()
    crec = hp.cover_records()[parent["cover"]]
    program_digest = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    out = dict(schema="genchase-hopf-away-stability-draft-v1", certified=False,
               scope="one positive-amplitude subpiece of the admitted single-cell branch",
               program_sha256=program_digest,
               sources_sha256=dict(hp.SOURCE_SHA256),
               hill_sources_sha256=dict(bs.SOURCES_SHA256),
               inputs_sha256=input_pins,
               parent_line_sha256=lines[idx][1], cover_record_sha256=hp._record_digest(crec),
               settings=dict(halfwidth=str(exact(halfwidth, "halfwidth")), delta=str(deltaq), Ke=Ke, M=M, Kp=Kp, centre_K=centre_K))
    try:
        U, meta = build_family(parent, crec, halfwidth=halfwidth, Ke=Ke, M=M, Kp=Kp, centre_K=centre_K, log=log)
        out["family"] = meta
        cert = bs.certify_uniform(U, settings=dict(delta=str(deltaq), Ke_offset=Ke), log=log)
        out.update(spectral_certificate=cert, certified=True)
    except Exception as err:
        out["error"] = f"{type(err).__name__}: {err}"
    hp._assert_sources_current()
    assert_hill_sources()
    if any(hashlib.sha256((HERE.parent / path).read_bytes()).hexdigest() != digest
           for path, digest in input_pins.items()):
        raise RuntimeError("Hopf evidence inputs changed while running")
    if hashlib.sha256(Path(__file__).read_bytes()).hexdigest() != program_digest:
        raise RuntimeError("draft producer changed while running")
    out["seconds"] = round(time.time() - t0, 2)
    return out


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--piece", type=int, default=4)
    parser.add_argument("--halfwidth", default="1/100000")
    parser.add_argument("--delta", default="1e-6")
    parser.add_argument("--Ke", type=int, default=12)
    parser.add_argument("--M", type=int, default=128)
    parser.add_argument("--Kp", type=int, default=64)
    parser.add_argument("--centre-K", type=int)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    out = run_piece(args.piece, halfwidth=args.halfwidth, delta=args.delta, Ke=args.Ke, M=args.M, Kp=args.Kp, centre_K=args.centre_K,
                    log=lambda s: print(s, flush=True))
    path = Path(args.output)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("x", encoding="utf-8") as output:
        output.write(json.dumps(out, sort_keys=True, indent=2) + "\n")
    print(json.dumps({k: out[k] for k in ("certified", "seconds", "error") if k in out}), flush=True)
    return 0 if out["certified"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
