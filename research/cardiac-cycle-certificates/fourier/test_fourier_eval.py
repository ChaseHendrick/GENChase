"""Acceptance tests and negative controls for fourier_eval.py (component 2 of the Fourier / Hill route).

Run:  PYTHONPATH=<dir holding python-flint 0.9.0> python3 test_fourier_eval.py      (or pytest, if installed)

Acceptance: closed-form Fourier coefficients must lie in the returned balls, the Cauchy tail bound must hold, and
the strip bound S must be at least the exact strip sup where that is known in closed form:
  * g = exp(a cos theta):          c_m = I_m(a) (Arb bessel_i), sup over |Im| <= rho is exp(a cosh rho);
  * g = 1/(b - cos theta), b > 1:  c_m = r^|m| / sqrt(b^2 - 1), r = b - sqrt(b^2 - 1); poles at Im = +-arccosh b;
                                   sup over |Im| <= rho < arccosh b is 1/(b - cosh rho) (derived in test_vector_stub);
  * g = log(1 + q cos theta):      c_0 = log((1 + sqrt(1 - q^2)) / 2), c_{+-m} = (-1)^(m+1) r^m / m,
                                   r = (1 - sqrt(1 - q^2)) / q; branch points at Im = +-arccosh(1/q);
  * a polynomial f of a random complex trigonometric polynomial: exact coefficients by convolution;
  * g = 2 cos(M theta) with M nodes: the case where Lemma 3 is tight (c_0 = 0 but c_hat_0 = 2).
Negative controls (each must be DETECTED: a true value falls outside, or a check fails, or the code refuses):
understated S, rho beyond the analyticity strip, a cover of the edges only, an unguarded log, the aliasing term
removed, the alias bound computed for M + 1 nodes when M were used, and a cover of part of the period only.
"""
import math
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flint import acb, arb, fmpq  # noqa: E402

import fourier_eval as fe  # noqa: E402
from fourier_eval import (TrigPoly, StripCoverError, DomainError, guarded_exp, guarded_log, guarded_sqrt,  # noqa: E402
                          strip_sup, sup_over_rectangles, fourier_coefficients, node_values, aliased_dft,
                          enclose_coefficients, alias_bound, tail_bound, tail_l1, precision)

REF_PREC = 256


# ------------------------------------------------------------------------------------------------ helpers
def exp_cos(a):
    """phi = a cos theta (one component), f = exp."""
    return (lambda z: [guarded_exp(z[0])]), TrigPoly([[a / 2, 0, a / 2]])


def bessel(m, a):
    with precision(REF_PREC):
        return acb(arb(a).bessel_i(abs(m)))


def pole_coeff(m, b):
    with precision(REF_PREC):
        b = arb(b)
        s = (b * b - 1).sqrt()
        return acb((b - s) ** abs(m) / s)


def log_coeff(m, q):
    with precision(REF_PREC):
        q = arb(q)
        s = (1 - q * q).sqrt()
        if m == 0:
            return acb(((1 + s) / 2).log())
        r = (1 - s) / q
        return acb((-1) ** (abs(m) + 1) * r ** abs(m) / abs(m))


def misses(enc, i, ref):
    """Indices k whose returned ball does not contain the reference value ref(k)."""
    return [k for k in range(-enc.Kp, enc.Kp + 1) if not enc.coeff(i, k).contains(ref(k))]


def tail_violations(S, rho, ref, m_from, m_to):
    """m with |c_m| > S e^{-rho |m|} proved (reference balls at 256 bits); checks both signs of m."""
    bad = []
    with precision(REF_PREC):
        for m in range(m_from, m_to):
            for mm in (m, -m):
                if ref(mm).abs_lower() > tail_bound(S, rho, mm):
                    bad.append(mm)
    return bad


def tail_holds(S, rho, ref, m_from, m_to):
    """True only if |c_m| <= S e^{-rho |m|} is proved for every m_from <= |m| < m_to."""
    with precision(REF_PREC):
        return all(tail_bound(S, rho, mm) > ref(mm).abs_upper() for m in range(m_from, m_to) for mm in (m, -m))


# ------------------------------------------------------------------------------------------------ primitives
def test_primitives():
    """The Arb behaviours the contract relies on, checked on this build."""
    zero_ball = acb(arb(0, 1))
    assert not (acb(1) / zero_ball).is_finite()
    assert not (acb(0) / zero_ball).is_finite()          # even an exact zero numerator
    assert not (1 / acb(arb(0, 1), arb(0, 1))).is_finite()
    assert not (acb(2, 1) / acb(arb(0, 0.5), arb(0, 0.5))).is_finite()
    # Arb's own log does not signal a ball crossing the branch cut: hence the guards.
    across = acb(arb(-1, 0.1), arb(0, 0.1))
    assert across.log().is_finite() and across.sqrt().is_finite()
    for g in (guarded_log, guarded_sqrt):
        for bad in (across, acb(arb(0, 0.1)), acb(-2), acb(arb(-3, 1), arb(0, 1e-30))):
            try:
                g(bad)
                raise AssertionError(f"{g.__name__} accepted {bad}")
            except DomainError:
                pass
        assert g(acb(2, 0)).is_finite()
        assert g(acb(arb(-5, 1), arb(0.5, 0.1))).is_finite()   # off the real axis: no cut
        assert g(2.5).is_finite()                               # float input converted exactly
    # arb union contains the convex hull of its arguments
    u = arb(1).union(arb(2))
    assert u.contains(arb(1)) and u.contains(arb(2)) and u.contains(arb("1.37"))
    # roots of unity from exact rationals
    with precision(128):
        r4, r8 = fe._root_of_unity(1, 4), fe._root_of_unity(-3, 8)
    with precision(512):
        h = arb(2).sqrt() / 2
        assert r4.contains(acb(0, 1)) and r8.contains(acb(-h, -h))   # e^{i pi / 2}, e^{-3 pi i / 4}


def test_cover_tiles():
    """The leaves of the adaptive cover tile [0,1] x [-1,1] (units 2 pi, rho): exact areas sum to 2, no overlaps."""
    f, phi = exp_cos(2.0)
    st = strip_sup(f, phi, 1.0, rtol=0.05, keep_leaves=True, nx=8)
    leaves = st.leaves
    assert st.full_strip and len(leaves) > 50
    area = sum(((xr - xl) * (yr - yl) for xl, xr, yl, yr in leaves), fmpq(0))
    assert area == 2, area
    for b in leaves:
        assert fmpq(0) <= b[0] < b[1] <= 1 and fmpq(-1) <= b[2] < b[3] <= 1
    srt = sorted(leaves)
    for i, (xl, xr, yl, yr) in enumerate(srt):     # interiors pairwise disjoint
        for (xl2, xr2, yl2, yr2) in srt[i + 1:]:
            if xl2 >= xr:
                break
            assert min(xr, xr2) <= max(xl, xl2) or min(yr, yr2) <= max(yl, yl2)
    # area 2, disjoint interiors and containment in the rectangle imply the union is the whole rectangle


# ------------------------------------------------------------------------------------------------ acceptance
BESSEL_CASES = [(0.5, 0.5, 8), (0.5, 2.0, 16), (2.0, 1.0, 16), (2.0, 2.0, 32), (5.0, 1.0, 32), (5.0, 2.5, 24),
                (1.0, 3.0, 16)]


def test_bessel():
    for a, rho, M in BESSEL_CASES:
        f, phi = exp_cos(a)
        st = strip_sup(f, phi, rho, rtol=0.05)
        with precision(REF_PREC):
            exact_sup = (arb(a) * arb(rho).cosh()).exp()
        assert st.S[0] >= exact_sup, (a, rho, st.S[0], exact_sup)
        for Kp in (M // 2 - 1, M - 1):
            enc = fourier_coefficients(f, phi, rho, M, Kp, S=st.S, prec=128)
            assert misses(enc, 0, lambda k: bessel(k, a)) == [], (a, rho, M, Kp)
            assert tail_holds(st.S[0], rho, lambda m: bessel(m, a), Kp + 1, Kp + 80), (a, rho, M)
            with precision(REF_PREC):
                partial = 2 * sum((arb(a).bessel_i(m) for m in range(Kp + 1, Kp + 120)), arb(0))
            assert enc.tail_l1(0) > partial
    # the same through the one-call path (strip computed inside)
    f, phi = exp_cos(2.0)
    enc = fourier_coefficients(f, phi, 1.5, 32, 15, prec=128, strip_kw=dict(rtol=0.1))
    assert enc.strip is not None and enc.strip.full_strip
    assert misses(enc, 0, lambda k: bessel(k, 2.0)) == []


def test_vector_stub():
    """Two components: g_0 = exp(a cos theta), g_1 = 1/(b - cos theta).

    Exact strip sup of |1/(b - cos(x + i y))| for |y| <= rho < arccosh b: with c = cos x, C = cosh y,
    S = sinh y, |b - cos(x + i y)|^2 = (b - c C)^2 + (1 - c^2) S^2 = b^2 - 2 b c C + c^2 + S^2, whose derivative
    in c is 2 (c - b C) < 0, so the minimum is at c = 1: (b - C)^2. Hence sup = 1 / (b - cosh rho)."""
    a, b = 1.5, 1.5
    f = lambda z: [guarded_exp(z[0]), 1 / (b - z[1])]
    phi = TrigPoly([[a / 2, 0, a / 2], [0.5, 0, 0.5]])
    for rho, M in ((0.5, 16), (0.8, 32), (0.9, 48)):
        st = strip_sup(f, phi, rho, rtol=0.05)
        with precision(REF_PREC):
            assert st.S[0] >= (arb(a) * arb(rho).cosh()).exp()
            assert st.S[1] >= 1 / (arb(b) - arb(rho).cosh())
        Kp = M // 2 - 1
        enc = fourier_coefficients(f, phi, rho, M, Kp, S=st.S, prec=128)
        assert misses(enc, 0, lambda k: bessel(k, a)) == []
        assert misses(enc, 1, lambda k: pole_coeff(k, b)) == []
        assert tail_holds(st.S[1], rho, lambda m: pole_coeff(m, b), Kp + 1, Kp + 100)
        assert tail_holds(st.S[0], rho, lambda m: bessel(m, a), Kp + 1, Kp + 60)


def test_log_stub():
    """phi = 1 + q cos theta, f = guarded log; branch points at Im theta = +-arccosh(1/q) = 1.3170 for q = 1/2."""
    q = 0.5
    f = lambda z: [guarded_log(z[0])]
    phi = TrigPoly([[q / 2, 1, q / 2]])
    for rho, M in ((0.5, 16), (1.0, 32), (1.25, 64)):
        st = strip_sup(f, phi, rho, rtol=0.1)
        Kp = M // 2 - 1
        enc = fourier_coefficients(f, phi, rho, M, Kp, S=st.S, prec=128)
        assert misses(enc, 0, lambda k: log_coeff(k, q)) == [], rho
        assert tail_holds(st.S[0], rho, lambda m: log_coeff(m, q), Kp + 1, Kp + 120)


def _poly_case(radius):
    """n = 2, K = 2, exact dyadic complex coefficients (fixed pseudo-random); f polynomial of degree 3."""
    vals = [[(3, -1), (5, 2), (-7, 4), (1, 1), (2, -3)], [(-2, 5), (1, -1), (6, 0), (-3, -2), (4, 1)]]
    mids = [[acb(fmpq(x, 8), fmpq(y, 16)) for x, y in row] for row in vals]
    coeffs = [[acb(arb(c.real, radius), arb(c.imag, radius)) if radius else c for c in row] for row in mids]
    f = lambda z: [z[0] * z[0] * z[1] + z[1] ** 3, z[0] * z[1] - 2 * z[0]]
    return f, TrigPoly(coeffs), mids


def _conv(a, b):
    out = {}
    for m, x in a.items():
        for n, y in b.items():
            out[m + n] = out.get(m + n, acb(0)) + x * y
    return out


def test_trig_poly_stub():
    """f(z) = (z0^2 z1 + z1^3, z0 z1 - 2 z0) of a complex (non-real) trigonometric polynomial; modes up to 6.

    Exact coefficients by convolution of the midpoint polynomial (exact dyadics, 256-bit products are exact).
    M = 8 aliases (modes up to 6 fold onto |k| <= 3); M = 16 does not. Coefficient balls of radius 1e-12
    test the family semantics: the midpoint's coefficients must still be enclosed."""
    for radius in (0, 1e-12):
        f, phi, mids = _poly_case(radius)
        with precision(REF_PREC):
            p0 = {m - 2: c for m, c in enumerate(mids[0])}
            p1 = {m - 2: c for m, c in enumerate(mids[1])}
            g0 = {}
            for m, c in _conv(_conv(p0, p0), p1).items():
                g0[m] = g0.get(m, acb(0)) + c
            for m, c in _conv(_conv(p1, p1), p1).items():
                g0[m] = g0.get(m, acb(0)) + c
            g1 = _conv(p0, p1)
            for m, c in p0.items():
                g1[m] = g1.get(m, acb(0)) - 2 * c
        for rho, M in ((0.5, 8), (1.0, 16), (2.0, 13)):
            st = strip_sup(f, phi, rho, rtol=0.2)
            Kp = min(M - 1, 7)
            enc = fourier_coefficients(f, phi, rho, M, Kp, S=st.S, prec=128)
            for i, g in enumerate((g0, g1)):
                assert misses(enc, i, lambda k: g.get(k, acb(0))) == [], (radius, rho, M, i)
                assert tail_holds(st.S[i], rho, lambda m: g.get(m, acb(0)), Kp + 1, 12)


_TIGHT = {}


def _tight():
    """g = 2 cos(8 theta) (phi with a_{+-8} = 1, f = identity), rho = 1; exact strip sup 2 cosh 8 at Re = 0.
    The cover's S (rtol 0.05) is computed once and shared by the test and the negative controls."""
    if not _TIGHT:
        phi = TrigPoly([[1] + [0] * 15 + [1]])
        f = lambda z: [z[0]]
        with precision(REF_PREC):
            S_exact = 2 * arb(8).cosh()
        _TIGHT.update(phi=phi, f=f, S_exact=S_exact, st=strip_sup(f, phi, 1.0, rtol=0.05))
    return _TIGHT


def test_tight_case():
    """g = 2 cos(M theta) with M nodes, rho = 1, M = 8: c_0 = 0, c_hat_0 = 2, and Lemma 3 gives
    E_0 = 2 cosh(8) * 2 e^{-8} / (1 - e^{-8}) = 2 (1 + e^{-16}) / (1 - e^{-8}) = 2.00067..., tight to 3.4e-4."""
    T = _tight()
    enc = fourier_coefficients(T["f"], T["phi"], 1.0, 8, 3, S=[T["S_exact"]])
    assert misses(enc, 0, lambda k: acb(0)) == []
    st = T["st"]
    assert st.S[0] >= T["S_exact"] and float(st.S[0].mid()) <= 1.06 * float(T["S_exact"].mid())
    enc = fourier_coefficients(T["f"], T["phi"], 1.0, 8, 3, S=st.S)
    assert misses(enc, 0, lambda k: acb(0)) == []


def test_api_guards():
    for bad in (lambda: alias_bound(1, 1.0, 8, 8), lambda: tail_l1(1, 1.0, 4, nu=3),
                lambda: fourier_coefficients(lambda z: z, TrigPoly([[0, 1, 0]]), 1.0, 8, 8, S=[1]),
                lambda: strip_sup(lambda z: z, TrigPoly([[0, 1, 0]]), "0.1")):
        try:
            bad()
            raise AssertionError("accepted invalid input")
        except ValueError:
            pass


# ------------------------------------------------------------------------------------------------ negative controls
def nc_understated_S_tight():
    """At the tight case, 0.9 S (exact or from the cover) puts c_0 = 0 outside the ball."""
    T = _tight()
    out = []
    for S in (T["S_exact"], T["st"].S[0]):
        enc = fourier_coefficients(T["f"], T["phi"], 1.0, 8, 3, S=[S * arb("0.9")])
        out.append(0 in misses(enc, 0, lambda k: acb(0)))
    return all(out)


def nc_understated_S_bessel():
    """exp(a cos theta): 0.9 S fails the closed-form check S >= exp(a cosh rho) in every case."""
    hits = []
    for a, rho, M in BESSEL_CASES:
        f, phi = exp_cos(a)
        st = strip_sup(f, phi, rho, rtol=0.05)
        with precision(REF_PREC):
            hits.append(not (st.S[0] * arb("0.9") >= (arb(a) * arb(rho).cosh()).exp()))
    return all(hits)


def nc_widened_rho_pole():
    """1/(b - cos theta), b = 1.5, poles at Im = +-0.9624: rho = 1.2 must be refused by the full cover; an edges-only
    cover returns a finite S, and the Cauchy tail bound computed from it is then provably false for some m."""
    b, rho = 1.5, 1.2
    f = lambda z: [1 / (b - z[0])]
    phi = TrigPoly([[0.5, 0, 0.5]])
    refused = False
    try:
        strip_sup(f, phi, rho, rtol=0.1, max_evals=20000)
    except StripCoverError:
        refused = True
    edges = sup_over_rectangles(f, phi, rho, [(0, 1, -1, -1), (0, 1, 1, 1)], rtol=0.05)
    bad = tail_violations(edges.S[0], rho, lambda m: pole_coeff(m, b), 1, 80)
    return refused and not edges.full_strip and len(bad) > 0


def nc_widened_rho_branch():
    """(a) log(1 + q cos theta), q = 1/2, branch points at Im = +-1.3170: rho = 1.5 must be refused.
    (b) A cut crossing with no branch point: f(z) = log(exp(z)), phi = i a cos theta, a = 3.1 < pi, rho = 1.25. On
    the real line g = phi exactly (|Im phi| <= 3.1 < pi), so c_{+-1} = i a / 2 and the analytic g has strip sup
    a cosh rho. Inside the strip exp(phi) crosses (-inf, 0] and Arb's unguarded principal log wraps the
    imaginary part, so a cover with it succeeds with S about 3 percent below the true sup; since the Cauchy bound is
    nearly tight at m = 1 ((a/2)(1 + e^{-2 rho}) = S_true e^{-rho}), S e^{-rho} < a/2 = |c_1| is then proved,
    i.e. the bound is false. The guarded log refuses the same strip."""
    q, rho = 0.5, 1.5
    phi = TrigPoly([[q / 2, 1, q / 2]])
    refused_a = False
    try:
        strip_sup(lambda z: [guarded_log(z[0])], phi, rho, rtol=0.1, max_evals=20000)
    except StripCoverError:
        refused_a = True
    a, rho = 3.1, 1.25
    phi = TrigPoly([[acb(0, a / 2), 0, acb(0, a / 2)]])
    st = strip_sup(lambda z: [z[0].exp().log()], phi, rho, rtol=0.005)
    false_bound = tail_violations(st.S[0], rho, lambda m: acb(0, a / 2) if abs(m) == 1 else acb(0), 1, 2)
    refused_b = False
    try:
        strip_sup(lambda z: [guarded_log(z[0].exp())], phi, rho, rtol=0.1, max_evals=20000)
    except StripCoverError:
        refused_b = True
    return refused_a and refused_b and false_bound == [1, -1]


def nc_no_alias():
    """Drop E_k: Bessel coefficients near K' fall outside, and the tight case's c_0 = 0 falls outside."""
    a, rho, M = 2.0, 1.0, 16
    f, phi = exp_cos(a)
    C_hat = aliased_dft(node_values(f, phi, M), M // 2 - 1)
    m1 = [k for k in range(-(M // 2 - 1), M // 2) if not C_hat[0][k + M // 2 - 1].contains(bessel(k, a))]
    phi2 = TrigPoly([[1] + [0] * 15 + [1]])
    C2 = aliased_dft(node_values(lambda z: [z[0]], phi2, 8), 3)
    return len(m1) > 0 and not C2[0][3].contains(acb(0))


def nc_M_plus_one():
    """Sample at M nodes but compute Lemma 3 for M + 1: detected at the tight case (k = 0) and for Bessel
    (a = 1, rho = 3, M = 16), where the correct bound is about 8 times the true aliasing error."""
    T = _tight()
    C2 = aliased_dft(node_values(T["f"], T["phi"], 8), 3)
    bad2 = enclose_coefficients(C2, T["st"].S, 1.0, 9, 3)
    tight = not bad2[0][3].contains(acb(0))
    a, rho, M, Kp = 1.0, 3.0, 16, 7
    f, phi = exp_cos(a)
    st = strip_sup(f, phi, rho, rtol=0.05)
    C = aliased_dft(node_values(f, phi, M), Kp)
    good = enclose_coefficients(C, st.S, rho, M, Kp)
    bad = enclose_coefficients(C, st.S, rho, M + 1, Kp)
    ref = lambda k: bessel(k, a)
    good_ok = all(good[0][k + Kp].contains(ref(k)) for k in range(-Kp, Kp + 1))
    bad_miss = [k for k in range(-Kp, Kp + 1) if not bad[0][k + Kp].contains(ref(k))]
    return tight and good_ok and len(bad_miss) > 0


def nc_partial_period():
    """Cover only Re theta in [0, pi/2] for g = exp(-a cos theta), whose strip sup exp(a cosh rho) sits at Re = pi:
    the bound falls below the closed-form sup (the full cover passes the same check)."""
    a, rho = 2.0, 1.0
    f = lambda z: [guarded_exp(z[0])]
    phi = TrigPoly([[-a / 2, 0, -a / 2]])
    with precision(REF_PREC):
        exact = (arb(a) * arb(rho).cosh()).exp()
    part = sup_over_rectangles(f, phi, rho, [(0, fmpq(1, 4), -1, 1)], rtol=0.05)
    full = strip_sup(f, phi, rho, rtol=0.05)
    return (not part.S[0] >= exact) and full.S[0] >= exact


NEGATIVE_CONTROLS = [nc_understated_S_tight, nc_understated_S_bessel, nc_widened_rho_pole, nc_widened_rho_branch,
                     nc_no_alias, nc_M_plus_one, nc_partial_period]


def test_negative_controls():
    for nc in NEGATIVE_CONTROLS:
        assert nc() is True, f"negative control {nc.__name__} was NOT detected"


TESTS = [test_primitives, test_cover_tiles, test_bessel, test_vector_stub, test_log_stub, test_trig_poly_stub,
         test_tight_case, test_api_guards]


if __name__ == "__main__":
    import flint
    print(f"python-flint {flint.__version__}")
    failed = 0
    for t in TESTS:
        t0 = time.time()
        try:
            t()
            print(f"PASS {t.__name__} ({time.time() - t0:.1f} s)")
        except Exception as e:  # report and continue
            failed += 1
            print(f"FAIL {t.__name__}: {type(e).__name__}: {e}")
    for nc in NEGATIVE_CONTROLS:
        t0 = time.time()
        try:
            det = nc()
        except Exception as e:
            det = False
            print(f"  ({nc.__name__} raised {type(e).__name__}: {e})")
        if det is True:
            print(f"DETECTED {nc.__name__} ({time.time() - t0:.1f} s)")
        else:
            failed += 1
            print(f"MISSED {nc.__name__}")
    print("all passed" if not failed else f"{failed} failure(s)")
    sys.exit(1 if failed else 0)
