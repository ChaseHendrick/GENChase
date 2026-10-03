"""Independent spectral replay, conditional on saved operator enclosure premises.

Imports no scientific producer. Matrix arithmetic uses python-flint; scalar gates
use exact Fraction comparisons. This is not a proof of the enclosure premises.
"""
import argparse
from fractions import Fraction as Q
import gzip
import hashlib
import json
import math
import re
import time


class Refused(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise Refused(message)


def rational(x):
    require(type(x) is str and re.fullmatch(r"-?(?:0|[1-9][0-9]*)/[1-9][0-9]*", x), "rational syntax")
    return Q(x)


def endpoints(x):
    require(type(x) is list and len(x) == 2, "real rectangle shape")
    a, b = map(rational, x)
    require(a <= b, "reversed real rectangle")
    return a, b


def exact(x):
    a, b = endpoints(x)
    require(a == b, "exact scalar required")
    return a


def fraction_arb(x):
    require(x.is_finite() and x.is_exact(), "finite exact endpoint required")
    m, e = x.man_exp()
    return Q(int(m)) * Q(2) ** int(e)


def ceil_sqrt(x, bits=256):
    require(x >= 0, "negative square")
    s = 1 << bits
    n = (x.numerator * s * s + x.denominator - 1) // x.denominator
    k = math.isqrt(n)
    return Q(k if k * k == n else k + 1, s)


def floor_sqrt(x, bits=256):
    require(x >= 0, "negative square")
    s = 1 << bits
    return Q(math.isqrt(x.numerator * s * s // x.denominator), s)


def magnitude(z):
    require(type(z) is list and len(z) == 2, "complex rectangle shape")
    r, i = endpoints(z[0]), endpoints(z[1])
    return ceil_sqrt(max(abs(r[0]), abs(r[1])) ** 2 + max(abs(i[0]), abs(i[1])) ** 2)


def point(z):
    return exact(z[0]), exact(z[1])


def strict_pairs(items):
    out = {}
    for k, v in items:
        require(k not in out, "duplicate JSON key")
        out[k] = v
    return out


def load(path):
    opener = gzip.open if str(path).endswith(".gz") else open
    with opener(path, "rt", encoding="utf-8") as f:
        return json.load(f, object_pairs_hook=strict_pairs,
                         parse_constant=lambda _: (_ for _ in ()).throw(Refused("nonfinite JSON")))


def canonical_hash(obj):
    return hashlib.sha256(json.dumps(obj, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()).hexdigest()


class ArbMatrices:
    def __init__(self, bits=256):
        import flint
        require(flint.__version__ == "0.9.0", "reviewed python-flint 0.9.0 required")
        from flint import acb, acb_mat, arb, ctx, fmpq
        self.acb, self.matrix, self.arb, self.ctx, self.fmpq = acb, acb_mat, arb, ctx, fmpq
        self.old = ctx.prec
        ctx.prec = bits

    def close(self):
        self.ctx.prec = self.old

    def real(self, x):
        a, b = endpoints(x)
        conv = lambda q: self.arb(self.fmpq(q.numerator, q.denominator))
        return conv(a).union(conv(b))

    def scalar(self, q):
        return self.arb(self.fmpq(q.numerator, q.denominator))

    def read(self, rows, n, m=None):
        m = n if m is None else m
        require(type(rows) is list and len(rows) == n and all(type(r) is list and len(r) == m for r in rows), "matrix dimension")
        require(all(type(z) is list and len(z) == 2 for row in rows for z in row), "complex rectangle shape")
        return self.matrix([[self.acb(self.real(z[0]), self.real(z[1])) for z in row] for row in rows])

    def cols(self, matrix):
        return [fraction_arb(sum((matrix[i, j].abs_upper() for i in range(matrix.nrows())), self.arb(0)).upper())
                for j in range(matrix.ncols())]

    def norm(self, matrix):
        return max(self.cols(matrix), default=Q(0))

    def identity_defect(self, left, right):
        out = left * right
        for j in range(out.nrows()):
            out[j, j] -= 1
        return out


def rational_point_product(a, b):
    """Small exact independent oracle; no Arb and no floating-point arithmetic."""
    require(a and b and len(a[0]) == len(b), "oracle dimensions")
    out = []
    for row in a:
        values = []
        for j in range(len(b[0])):
            r, im = Q(0), Q(0)
            for k, z in enumerate(row):
                ar, ai = point(z)
                br, bi = point(b[k][j])
                r += ar * br - ai * bi
                im += ar * bi + ai * br
            values.append((r, im))
        out.append(values)
    return out


def assemble_operator(op, g, be):
    """Rebuild one operator's coefficients, window and remainder from primitives.

    Model/strip/derivative enclosures remain premises. Algebra, power-of-two
    similarity, frequency intervals and ring damping are independently rebuilt.
    No saved H or AS is used in the v2 contract.
    """
    d, N, Ke, nA, nc, iv = (g[k] for k in ("DIM", "N", "Ke", "nA", "nc", "IV"))
    require(set(op) == {"kind", "S_exponents", "J", "strip", "radii", "error", "rho", "rho0", "rho2", "omega", "omega_error", "h", "D"}, "operator primitive fields")
    kind = op["kind"]
    require(kind in ("point", "affine", "quadratic"), "operator kind")
    degree = {"point": 0, "affine": 1, "quadratic": 2}[kind]
    require(kind == "point" or nA >= 2 * Ke, "uniform derivative window coefficient coverage")
    exps = op["S_exponents"]
    require(type(exps) is list and len(exps) == d and all(type(v) is int and abs(v) <= 1024 for v in exps), "similarity exponents")
    scale = [[Q(2) ** (exps[j] - exps[i]) for j in range(d)] for i in range(d)]
    h = exact(op["h"])
    require(h == exact(g["h"]) and h >= 0 and (kind != "point" or h == 0), "parameter halfwidth binding")
    D = exact(op["D"])
    require(D >= 0 and exact(g["c4"]) >= 4 * N * N * D, "coupling bound provenance")
    rho, rho0, rho2 = (exact(op[k]) for k in ("rho", "rho0", "rho2"))
    require(rho > 0 and rho0 > 0 and rho2 > 0, "analytic strips")
    rho_e = min(rho0, rho2)
    er, ere = (-be.scalar(rho)).exp(), (-be.scalar(rho_e)).exp()
    q1, q2 = fraction_arb(er.upper()), fraction_arb(ere.upper())
    require(len(op["J"]) == degree + 1 and len(op["strip"]) == degree + 1 and len(op["omega"]) == degree + 1, "operator polynomial dimensions")
    needed_coeff = {str(k) for k in range(-nA, nA + 1)}
    J = []
    for blocks in op["J"]:
        require(type(blocks) is dict and set(blocks) == needed_coeff, "model coefficient coverage")
        J.append({k: be.read(blocks[str(k)], d) for k in range(-nA, nA + 1)})
    S = [be.read(v, d) for v in op["strip"]]
    error = be.read(op["error"], d)
    require(len(op["radii"]) == degree, "derivative radii dimensions")
    radii = []
    for blocks in op["radii"]:
        require(set(blocks) == needed_coeff, "derivative radius coverage")
        radii.append({k: be.read(blocks[str(k)], d) for k in range(-nA, nA + 1)})
    for mat in S + [error] + [mat for blocks in radii for mat in blocks.values()]:
        require(all(mat[i, j].imag.is_zero() and mat[i, j].real >= 0 for i in range(d) for j in range(d)), "real nonnegative primitive majorant")
    # Derivative centres are exact choices; uncertainties belong in radii.
    for blocks in J[1:]:
        require(all(z.real.is_exact() and z.imag.is_exact() for mat in blocks.values() for row in mat.tolist() for z in row), "exact derivative centre")
    om = [be.real(v) for v in op["omega"]]
    oerr = exact(op["omega_error"])
    require(oerr >= 0 and all(v.is_exact() for v in om), "frequency primitive bounds")
    ovar = sum((h ** k * fraction_arb(abs(om[k]).upper()) for k in range(1, len(om))), Q(0)) + oerr
    obar = fraction_arb(om[0])
    require(exact(g["omega_lo"]) <= obar - ovar and exact(g["omega_hi"]) >= obar + ovar, "frequency interval binding")
    Qsquare = be.acb(be.arb(0, 1), be.arb(0, 1))
    Ssum = be.matrix(d, d)
    for i in range(d):
        for j in range(d):
            Ssum[i, j] = sum((be.scalar(h ** k) * S[k][i, j] for k in range(len(S))), be.acb(0)) * be.scalar(scale[i][j])
            error[i, j] *= be.scalar(scale[i][j])
    s1, s2 = be.norm(Ssum), be.norm(error)
    AS, RAD = {}, {}
    nlist = max(nA, 2 * Ke + nc)
    for k in range(-nlist, nlist + 1):
        mat = be.matrix(d, d)
        rad = be.matrix(d, d)
        for i in range(d):
            for j in range(d):
                if abs(k) <= nA:
                    rr = error[i, j].real * ere ** abs(k)
                    for p in range(degree):
                        rr += be.scalar(h ** (p + 1) * scale[i][j]) * radii[p][k][i, j].real
                    rad[i, j] = be.acb(rr)
                    rr2 = rr
                    for p in range(1, degree + 1):
                        rr2 += be.scalar(h ** p * scale[i][j]) * J[p][k][i, j].abs_upper()
                    mat[i, j] = J[0][k][i, j] * be.scalar(scale[i][j]) + Qsquare * rr2.upper()
                else:
                    rr = Ssum[i, j].real * er ** abs(k) + error[i, j].real * ere ** abs(k)
                    mat[i, j] = Qsquare * rr.upper()
        AS[k], RAD[k] = mat, rad
    damp = {}
    for k in set(range(-Ke - nc - 2, Ke + nc + 3)) | set(range(N // 2 + 1)):
        if k % N == 0 or iv == -1:
            damp[k] = be.arb(0)
        else:
            s = be.arb.sin_pi_fmpq(be.fmpq(k, N))
            damp[k] = 4 * be.scalar(D * N * N) * s * s
    H = []
    n = d * (2 * Ke + 1)
    R = be.matrix(n, n) if degree else None
    for p in range(degree + 1):
        mat = be.matrix(n, n)
        for wi, m in enumerate(range(-Ke, Ke + 1)):
            for wj, mp in enumerate(range(-Ke, Ke + 1)):
                k = m - mp
                for i in range(d):
                    for j in range(d):
                        ri, cj = d * wi + i, d * wj + j
                        mat[ri, cj] = (AS[k][i, j] if degree == 0 else J[p][k][i, j] * be.scalar(scale[i][j]))
                        if m == mp and i == j:
                            omterm = om[p] if degree else om[p] + be.arb(0, 1) * be.scalar(oerr)
                            mat[ri, cj] -= be.acb(0, m) * omterm
                            if p == 0 and i == iv:
                                mat[ri, cj] -= damp[m]
                        if degree and p == 0:
                            R[ri, cj] = RAD[k][i, j]
                            if m == mp and i == j:
                                R[ri, cj] += be.scalar(abs(m) * oerr)
        H.append(mat)
    return dict(AS=AS, H=H, remainder=R, s1=s1, s2=s2, q1=q1, q2=q2, rho=rho, rho_e=rho_e, damping=damp, D=D)


def verify(w, expected_bindings, *, bits=256, progress=lambda *_: None):
    """Replay C0-C5 under explicit operator/existence/phase premises.

    expected_bindings must be supplied independently of the witness. It binds
    identity, source files, exact inputs, settings, and domain, not just a label.
    """
    start = time.monotonic()
    require(type(w) is dict and w.get("schema") in ("cardiac-spectral-witness/1", "cardiac-spectral-witness/2"), "schema")
    version2 = w["schema"].endswith("/2")
    fields = {"schema", "bindings", "premises", "geometry", "coefficients", "tail", "window", "claimed"}
    require(set(w) == fields | ({"operator"} if version2 else set()), "witness fields")
    require(type(expected_bindings) is dict and expected_bindings, "independent bindings required")
    require(canonical_hash(w["bindings"]) == canonical_hash(expected_bindings), "bindings mismatch")
    g, cf, win = w["geometry"], w["coefficients"], w["window"]
    expected_count = g.get("expected_count", 1)
    require(type(expected_count) is int and expected_count in (0, 1), "spectral count type")
    premises = ["operator-enclosures", "Hill-sector-lemmas"] if expected_count == 0 else ["operator-enclosures", "orbit-existence", "nonconstant-phase-kernel", "Hill-sector-lemmas"]
    require(w["premises"] == premises, "explicit premises")
    for k in ("N", "DIM", "Ke", "nA", "nc", "IV"):
        require(type(g[k]) is int, "integer dimension")
    N, d, Ke, nA, nc, iv = (g[k] for k in ("N", "DIM", "Ke", "nA", "nc", "IV"))
    require(N >= 1 and d >= 1 and Ke >= 0 and nA >= 0 and nc >= 1 and -1 <= iv < d, "dimension range")
    n = d * (2 * Ke + 1)
    a, b, R0, delta, eta = (exact(g[k]) for k in ("a", "b", "R0", "delta", "eta"))
    olo, ohi, c4, hpar = (exact(g[k]) for k in ("omega_lo", "omega_hi", "c4", "h"))
    require(0 < olo <= ohi and delta > 0 and eta > 0 and a < 0 < b and hpar >= 0, "C0 geometry signs")
    require(b - a >= ohi * N and max(-a, b) < olo * N, "sector geometry")
    g0 = olo * (Ke + 1) - max(-a, b)
    require(g0 > 0, "tail window gap")
    require(delta >= rational(g["delta_requested"]), "requested damping")
    require(c4 >= 0, "coupling bound")
    if version2:
        binding_geometry = expected_bindings.get("geometry")
        require(type(binding_geometry) is dict and set(binding_geometry) == {"N", "DIM", "IV", "Ke", "nA", "nc", "D"}, "independent geometry binding")
        for key in ("N", "DIM", "IV", "Ke", "nA", "nc"):
            require(type(binding_geometry[key]) is int and binding_geometry[key] == g[key], "geometry binding " + key)
        require(rational(binding_geometry["D"]) == exact(w["operator"]["D"]), "diffusion binding")
        domain = expected_bindings.get("domain")
        require(type(domain) is list and len(domain) == 2, "numeric domain binding")
        da, db = map(rational, domain)
        centre = rational(expected_bindings.get("parameter_center"))
        require(da <= db and hpar >= max(abs(da-centre), abs(db-centre)), "domain halfwidth inclusion")
        settings = expected_bindings.get("settings")
        require(type(settings) is dict and type(settings.get("n_c")) is int and settings["n_c"] == nc, "typed coupling settings")
        require(type(settings.get("Ke_offset")) is int and settings["Ke_offset"] + N // 2 == Ke, "typed window settings")
        require(type(settings.get("delta")) is str and Q(settings["delta"]) == rational(g["delta_requested"]), "damping setting binding")
    be = ArbMatrices(bits)
    try:
        assembled = assemble_operator(w["operator"], g, be) if version2 else None
        AS = {}
        needed = set(range(-max(nA, 2 * Ke + nc), max(nA, 2 * Ke + nc) + 1))
        if assembled:
            require(set(cf) == {"A0c"}, "v2 coefficients rebuilt from primitives")
            AS = assembled["AS"]
        else:
            require(set(cf["AS"]) == {str(k) for k in needed}, "complete Fourier coefficients")
            for k in sorted(needed):
                AS[k] = be.read(cf["AS"][str(k)], d)
        norms = {k: be.norm(v) for k, v in AS.items()}
        s1, s2, q1, q2 = (assembled[k] if assembled else exact(cf[k]) for k in ("s1", "s2", "q1", "q2"))
        require(s1 >= 0 and s2 >= 0 and 0 < q1 < 1 and 0 < q2 < 1, "geometric tail")
        if not assembled:
            require(type(cf["strip_matrices"]) is list and len(cf["strip_matrices"]) == 2, "strip envelope matrices")
            for bound, rows in zip((s1, s2), cf["strip_matrices"]):
                mat = be.read(rows, d)
                require(all(mat[i, j].imag.is_zero() and mat[i, j].real >= 0 for i in range(d) for j in range(d)), "nonnegative strip envelope")
                require(bound >= be.norm(mat), "strip envelope norm direction")
        for q, rho in ((q1, assembled["rho"] if assembled else exact(cf["rho"])), (q2, assembled["rho_e"] if assembled else exact(cf["rho_e"]))):
            require(rho > 0 and be.scalar(q) >= (-be.scalar(rho)).exp(), "Fourier decay direction")
        gt = lambda k: 2 * (s1 * q1 ** k / (1 - q1) + s2 * q2 ** k / (1 - q2))
        # Rectangular complex enclosures can be wider than the disc majorant.
        # Both bounds are premises on the true coefficients, not on each other.
        sigma = sum((norms[k] for k in range(-nA, nA + 1) if k), Q(0)) + gt(nA + 1)
        require(R0 > sigma + norms[0] + c4, "right boundary spectral exclusion")
        A0c = be.read(cf["A0c"], d)
        require(all(z.imag.is_zero() and z.real.is_exact() for row in A0c.tolist() for z in row), "exact real tail comparison block")
        dA0 = be.norm(AS[0] - A0c)
        rhoT = Q(0)
        require(type(w["tail"]) is list and len(w["tail"]) == N // 2 + 1, "all damping residues")
        for rr, t in enumerate(w["tail"]):
            require(type(t["residue"]) is int and t["residue"] == rr, "residue duplicate/order")
            U, Ui, X = (be.read(t[k], d) for k in ("U", "Ui", "X"))
            dm = be.real(t["damping"])
            require(dm >= 0, "damping sign")
            if assembled:
                require(dm.contains(assembled["damping"][rr]), "ring damping formula")
                dm = assembled["damping"][rr]
            expectedX = be.matrix(A0c.tolist())
            if iv >= 0:
                expectedX[iv, iv] -= dm
            # Saved X is redundant. Compare its exact serialization binding via
            # containment, then recompute with the derived value.
            for i in range(d):
                for j in range(d):
                    require(X[i, j].contains(expectedX[i, j]), "tail block inconsistency")
            lam = t["lambda"]
            require(type(lam) is list and len(lam) == d, "tail diagonal dimension")
            q = be.norm(be.identity_defect(Ui, U))
            require(q < 1, "tail inverse defect")
            W = Ui * expectedX * U
            gamma = None
            lmax = Q(0)
            for j, z in enumerate(lam):
                x, y = point(z)
                W[j, j] -= be.acb(be.scalar(x), be.scalar(y))
                v = max(-delta - eta - x, g0 - eta - abs(y))
                gamma = v if gamma is None else min(gamma, v)
                lmax = max(lmax, magnitude(z))
            Fn = (be.norm(W) + q * lmax) / (1 - q)
            kap = be.norm(U) * be.norm(Ui) / (1 - q)
            require(gamma > Fn, "tail diagonal separation")
            rhoT = max(rhoT, kap / (gamma - Fn))
        theta = (sigma + dA0) * rhoT
        require(theta < 1, "tail Neumann inequality")
        progress("tail replay passed")
        V = [be.read(v, n) for v in win["V"]]
        Vi = [be.read(v, n) for v in win["Vi"]]
        if assembled:
            require(set(win) == {"V", "Vi", "lambda"}, "v2 window operator is reconstructed")
            H = assembled["H"]
        else:
            H = [be.read(v, n) for v in win["H"]]
        require(len(V) == len(Vi) and len(V) in (1, 2) and len(H) in (1, 2, 3), "window polynomial degree")
        require((len(V) == 1 and len(H) == 1 and hpar == 0) or len(V) == 2, "window parameter type")
        lam = win["lambda"]
        require(len(lam) == len(V) and all(type(row) is list and len(row) == n for row in lam), "diagonal degree/dimension")
        ls = [[point(z) for z in row] for row in lam]
        C = [be.matrix(n, n) for _ in range(2 * len(V) - 1)]
        W = [be.matrix(n, n) for _ in range(2 * len(V) + len(H) - 2)]
        HV = {(q, r): H[q] * V[r] for q in range(len(H)) for r in range(len(V))}
        for p in range(len(Vi)):
            for r in range(len(V)):
                C[p + r] += Vi[p] * V[r]
                for q in range(len(H)):
                    W[p + q + r] += Vi[p] * HV[q, r]
        for j in range(n):
            C[0][j, j] -= 1
            for k in range(len(lam)):
                x, y = ls[k][j]
                W[k][j, j] -= be.acb(be.scalar(x), be.scalar(y))
        cj, wj = [Q(0)] * n, [Q(0)] * n
        for k, matrix in enumerate(C):
            for j, v in enumerate(be.cols(matrix)):
                cj[j] += hpar ** k * v
        for k, matrix in enumerate(W):
            for j, v in enumerate(be.cols(matrix)):
                wj[j] += hpar ** k * v
        AV = [[sum((hpar ** k * fraction_arb(V[k][i, j].abs_upper()) for k in range(len(V))), Q(0)) for j in range(n)] for i in range(n)]
        AVI = [[sum((hpar ** k * fraction_arb(Vi[k][i, j].abs_upper()) for k in range(len(Vi))), Q(0)) for j in range(n)] for i in range(n)]
        if len(V) == 2:
            R = assembled["remainder"] if assembled else be.read(win["remainder"], n)
            require(all(R[i, j].imag.is_zero() and R[i, j].real >= 0 for i in range(n) for j in range(n)), "nonnegative window remainder")
            av = be.matrix([[be.acb(be.scalar(v)) for v in row] for row in AV])
            avi = be.matrix([[be.acb(be.scalar(v)) for v in row] for row in AVI])
            extra = be.cols(avi * R * av)
            wj = [x + y for x, y in zip(wj, extra)]
        else:
            require(assembled["remainder"] is None if assembled else win["remainder"] is None, "unexpected point remainder")
        qC = max(cj)
        require(qC < 1, "window inverse defect")
        labs = [sum((hpar ** k * magnitude(lam[k][j]) for k in range(len(lam))), Q(0)) for j in range(n)]
        fm = [(wj[j] + labs[j] * cj[j]) / (1 - qC) for j in range(n)]
        beta = [sum((AVI[i][j] for i in range(n)), Q(0)) / (1 - qC) for j in range(n)]
        distances, count = [], 0
        for j, (x, y) in enumerate(ls[0]):
            inside = -delta < x < R0 and a < y < b
            count += int(inside)
            if inside:
                dist = min(x + delta, R0 - x, y - a, b - y)
            else:
                dx, dy = max(-delta - x, Q(0), x - R0), max(a - y, Q(0), y - b)
                dist = floor_sqrt(dx * dx + dy * dy)
            if len(lam) == 2:
                dist -= hpar * magnitude(lam[1][j])
            require(dist > 0, "spectral boundary separation")
            distances.append(dist)
        require(count == expected_count, "exact spectral count")
        progress("window products and count passed")
        ms = list(range(-Ke, Ke + 1))
        tw = [sum((norms[k] for k in range(-nA, nA + 1) if abs(m + k) > Ke), Q(0)) + gt(nA + 1) for m in ms]
        rj = [sum((tw[i // d] * AV[i][j] for i in range(n)), Q(0)) for j in range(n)]
        bhat = max(beta) * gt(nc + 1) / 2
        for m in list(range(Ke + 1, Ke + nc + 1)) + list(range(-Ke - nc, -Ke)):
            for c in range(d):
                total = sum((beta[i * d + r] * fraction_arb(AS[mm - m][r, c].abs_upper()) for i, mm in enumerate(ms) for r in range(d)), Q(0))
                bhat = max(bhat, total)
        fac = bhat * rhoT / (1 - theta)
        columns = []
        for j in range(n):
            lhs = fm[j] + fac * rj[j]
            require(lhs < distances[j], "SC column " + str(j))
            columns.append(dict(column=j, lhs=str(lhs), distance_lower=str(distances[j]), margin=str(distances[j] - lhs)))
        Tlo = exact(w["claimed"]["Tlo"])
        multiplier = exact(w["claimed"]["multiplier"])
        require(Tlo > 0 and be.scalar(Tlo) <= 2 * be.arb.pi() / be.scalar(ohi), "period lower direction")
        require(be.scalar(multiplier) >= (-be.scalar(delta * Tlo)).exp() and multiplier < 1, "multiplier upper direction")
        return dict(schema="cardiac-spectral-replay/1", status="passed", scope="C0-C5 spectral certificate conditional on explicit listed premises", premises=premises, witness_schema=w["schema"], witness_sha256=canonical_hash(w), bindings_sha256=canonical_hash(expected_bindings), columns=n, residues=len(w["tail"]), spectral_count=count, SC_columns=columns, qC_upper=str(qC), rhoT_upper=str(rhoT), thetaT_upper=str(theta), multiplier_upper=str(multiplier), wall_s=time.monotonic() - start, arithmetic=dict(python_flint="0.9.0", precision=bits, independent_producer_imports=True), independent_operator_assembly=version2, independent_model_enclosures=False, independent_orbit_existence=False)
    finally:
        be.close()


def main():
    p = argparse.ArgumentParser()
    p.add_argument("witness")
    p.add_argument("--bindings", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--source-root", help="independently check source and input file bindings before replay")
    args = p.parse_args()
    bindings = load(args.bindings)
    if args.source_root:
        from pathlib import Path
        root = Path(args.source_root).resolve()
        for group in ("sources", "inputs"):
            for relative, digest in bindings[group].items():
                path = (root / relative).resolve()
                require(path.is_relative_to(root), "manifest path escapes root")
                require(hashlib.sha256(path.read_bytes()).hexdigest() == digest, "current " + group + " binding: " + relative)
    result = verify(load(args.witness), bindings, progress=lambda x: print(x, flush=True))
    result["current_files_checked"] = bool(args.source_root)
    with open(args.out, "x", encoding="utf-8") as f:
        json.dump(result, f, indent=2, allow_nan=False)
        f.write("\n")
    print(result["status"], result["columns"], flush=True)


if __name__ == "__main__":
    main()
