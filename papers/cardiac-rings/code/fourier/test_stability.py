"""Acceptance tests, negative controls and a floating-point cross-check for stability.py (Stage S). Each can fail.

Run (machine shared; about 12 minutes):
  PYTHONPATH=<python-flint 0.9.0> nice timeout 3000 python3 test_stability.py      (or pytest)

Acceptance
  * N = 8, delta = 5e-6 is certified (Theorem 3 by route A and (SC)); the sharp pair: delta = 6.32095e-6 is
    certified and delta = 6.321e-6 fails at (C5) (the floating-point leading exponent is -6.3209583e-6, not itself
    certified).
  * Dominance (N = 8): every certified bound (fm_j, r_j, b_m, beta, sigma_off, rho_T) is at least an independently
    computed floating-point value; its docstring lists the one-term deletions that stay undetectable because the
    term is negligible.
Negative controls (checklist item 11; each must FAIL, with ProofFailure, or be detected, with InputMismatch, at the
stated place)
  * a Stage E record whose source hashes do not match the current files: InputMismatch (provenance);
  * delta = 7e-6 and delta = 6.321e-6 at N = 8: (C5), count 3;
  * delta = 1e-5 at N = 64 (about -9.34e-6): (C5), count 3;
  * floating data that lie (leading near-axis pair of Lambda moved to Re = -7.5e-6, V unchanged), delta = 7e-6:
    the floating count is 1, and (SC) fails;
  * anti-diffusion (the damping symbol d_m replaced by -d_m everywhere) at N = 8: (C5), count 9;
  * K_e too small (K_e = N/2 + 1 at N = 8): the tail check (C2) or theta_T < 1 fails;
  * S = I (no cell coordinates) at N = 8: route A cannot close (pitfall 8);
  * a dropped coefficient A_{+-1} at N = 8: (a) dropped everywhere: (C5) fails (count 9); with the count failure
    deferred (test hook skip_count) the trivial-eigenvector sanity check detects it; (b) dropped only in the proof
    data, sanity check skipped: (SC) fails;
  * omega_lo replaced by b / N at N = 8 (so that b >= omega_lo N): (C1) fails.
Cross-check (not part of the proof)
  * N = 8: an ordinary floating-point 144-dimensional monodromy Y(T) (scipy DOP853 integration of the ring and its
    variational equation from the centre's x* = (phibar(2 pi j / N))_j): exactly one multiplier near 1, every other
    multiplier inside the certified disc |rho| < e^(-delta T_lo), and the leading moduli equal to e^(Re mu T) of the
    window eigenvalues; the reduced map M_tau = Q^(-1) Y(tau) against e^(mu tau) of the near-axis eigenvalues.
"""
import json
import math
import os
import shutil
import sys
import tempfile
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import stability as sb  # noqa: E402  (first: pins the BLAS threads before numpy is imported)
import numpy as np  # noqa: E402
import centre as ct  # noqa: E402

QUIET = lambda *a, **k: None  # noqa: E731
_INP = {}
_RES = {}


def _inp(N):
    if N not in _INP:
        _INP[N] = sb.stage_e_inputs(N, log=QUIET)
    return _INP[N]


def _certify(N, settings=None, controls=None):
    return sb.certify(N, inp=_inp(N), settings=settings, controls=controls, log=QUIET)


def _expect_failure(N, what, settings=None, controls=None, allow=(sb.ProofFailure,), expect_text=None):
    t0 = time.time()
    try:
        res = _certify(N, settings, controls)
    except allow as e:
        msg = f"{type(e).__name__}: {e}"
        if expect_text is not None:
            assert any(t in str(e) for t in expect_text), f"{what}: failed, but not where expected: {msg}"
        print(f"  negative control '{what}' failed as required ({time.time() - t0:.0f} s): {msg[:200]}")
        return msg
    raise AssertionError(f"negative control '{what}' was CERTIFIED (theta_T = {res['theta_T']['approx']:.3f}); "
                         "the certificate cannot see this change")


# ------------------------------------------------------------------------------------------------ acceptance
def test_accept_N8():
    t0 = time.time()
    res = _certify(8, {"delta": "5e-6"})
    _RES[8] = res
    assert res["count_in_Omega"] == 1
    assert res["theta_T"]["approx"] < 1 and res["SC_worst_ratio"] < 1
    lead = res["float_leading_nontrivial_window_eigenvalue"]
    assert lead[0] < -res["delta"]["approx"], "certified delta exceeds the floating-point leading exponent"
    assert abs(lead[0] + 6.32e-6) < 0.01e-6, f"leading exponent {lead[0]} is not the Hill value -6.32e-6"
    print(f"  N = 8, delta = 5e-6: certified ({time.time() - t0:.0f} s); theta_T = {res['theta_T']['approx']:.4f}, "
          f"SC worst {res['SC_worst_ratio']:.3e}, near-axis worst {res['SC_worst_ratio_near_axis']:.3e}, "
          f"bound {res['multiplier_bound_full_period']['dec'][:12]}")


def test_accept_N8_sharp():
    """delta = 6.32095e-6 sits 1.3e-6 (relative) below the floating-point |Re lambda_lead| = 6.3209583e-6 (that
    float value is not certified; the margin is stated so that the test reads as a sharpness check)."""
    t0 = time.time()
    res = _certify(8, {"delta": "6.32095e-6", "S_exps": _S(8)})
    lead = res["float_leading_nontrivial_window_eigenvalue"][0]
    assert res["count_in_Omega"] == 1 and res["SC_worst_ratio"] < 1
    print(f"  N = 8, delta = 6.32095e-6 (float |Re lambda_lead| = {-lead:.8e}, relative margin "
          f"{(-lead - 6.32095e-6) / -lead:.2e}): certified ({time.time() - t0:.0f} s); near-axis worst "
          f"{res['SC_worst_ratio_near_axis']:.3e}, dist_min {res['dist_min']:.3e}")


def _S(N):
    """The S found by the acceptance run (a floating-point choice; reused only to save the search time)."""
    if N in _RES:
        return _RES[N]["S_exponents"]
    p = os.path.join(sb.RESULTS, f"fourier-stability-N{N}.json")
    if os.path.exists(p):
        import json
        with open(p) as fh:
            return json.load(fh)["S_exponents"]
    return None


# ------------------------------------------------------------------------------------------------ negative controls
def test_neg_delta_N8():
    _expect_failure(8, "delta = 7e-6 at N = 8", {"delta": "7e-6", "S_exps": _S(8)}, expect_text=["(C5)"])


def test_neg_delta_N8_sharp():
    _expect_failure(8, "delta = 6.321e-6 at N = 8 (just above the float exponent)", {"delta": "6.321e-6",
                    "S_exps": _S(8)}, expect_text=["(C5) count of window eigenvalues in Omega is 3"])


def test_neg_lying_float_data():
    """The floating-point Lambda lies (leading near-axis pair moved from Re -6.32e-6 to -7.5e-6, V unchanged); with
    delta = 7e-6 the floating count is then 1. The Arb residual fm_j must catch it at (SC)."""
    _expect_failure(8, "lying Lambda (lead pair at Re -7.5e-6), delta = 7e-6", {"delta": "7e-6", "S_exps": _S(8)},
                    {"lie_lead_re": -7.5e-6}, expect_text=["(SC)"])


def test_neg_delta_N64():
    _expect_failure(64, "delta = 1e-5 at N = 64", {"delta": "1e-5", "S_exps": _S(64)}, expect_text=["(C5)"])


def test_neg_antidiffusion():
    _expect_failure(8, "anti-diffusion c -> -c at N = 8", {"delta": "5e-6", "S_exps": _S(8)}, {"damping_sign": -1},
                    expect_text=["(C5) count of window eigenvalues in Omega is 9"])


def test_neg_Ke_small():
    _expect_failure(8, "K_e = N/2 + 1 at N = 8", {"delta": "5e-6", "S_exps": _S(8)}, {"Ke": 5},
                    expect_text=["route A", "theta_T", "g_0"])


def test_neg_S_identity():
    _expect_failure(8, "S = I at N = 8", {"delta": "5e-6", "S_exps": [0] * 18}, expect_text=["theta_T", "route A"])


def test_neg_drop_A1_detected():
    # dropped in the proof data and in the data choosing V, U_r: the operator changes consistently; the count (C5)
    # (checked first) or, failing that, the trivial-eigenvector sanity check must stop the run
    _expect_failure(8, "A_{+-1} dropped everywhere", {"delta": "5e-6", "S_exps": _S(8)},
                    {"drop": [1]}, allow=(sb.ProofFailure, sb.InputMismatch), expect_text=["(C5)"])
    # the sanity check on its own: the count failure is deferred (test hook skip_count), so the run reaches the
    # trivial-eigenvector check, which must stop it
    _expect_failure(8, "A_{+-1} dropped everywhere, count forced (sanity check must detect)",
                    {"delta": "5e-6", "S_exps": _S(8)}, {"drop": [1], "skip_count": True},
                    allow=(sb.InputMismatch,), expect_text=["trivial-eigenvector"])


def test_neg_drop_A1_proof_only():
    _expect_failure(8, "A_{+-1} dropped in the proof data only, no sanity check", {"delta": "5e-6", "S_exps": _S(8)},
                    {"drop": [1], "drop_proof_only": True, "skip_sanity": True}, expect_text=["(SC)"])


def test_neg_omega_lo():
    N = 8
    om = float(_inp(N)["om_bar"])
    b = om * (N / 2 + 0.25)
    _expect_failure(N, "omega_lo = b / N at N = 8", {"delta": "5e-6", "S_exps": _S(8)}, {"omega_lo": b / N},
                    expect_text=["(C1)"])


# ------------------------------------------------------------------------------------------------ cross-check
def float_monodromy(N, rtol=1e-11, atol=1e-13):
    """Y(tau) and Y(T) of the ring's variational equation along the floating-point integration from x*."""
    from scipy.integrate import solve_ivp
    _, K, om, A, _ = ct.load(ct.centre_path(N, 32))
    om = float(om.mid())
    a = np.array([[complex(float(z.real.mid()), float(z.imag.mid())) for z in row] for row in A])
    z0 = ct.phi_samples(a, N)                       # (18, N): cell j at theta = 2 pi j / N
    c = N * N / 64000 if N > 1 else 0.0
    n = 18 * N

    def rhs(t, y):
        Z = y[:n].reshape(N, 18).T
        Yv = y[n:].reshape(N, 18, n)
        F = ct.fs(Z)
        V = Z[0]
        F[0] += c * (np.roll(V, 1) - 2 * V + np.roll(V, -1))      # cell j gets c (V_{j-1} - 2 V_j + V_{j+1})
        J = ct.jac_cs(Z)
        LY = np.einsum("jab,jbk->jak", J, Yv)
        Vr = Yv[:, 0, :]
        LY[:, 0, :] += c * (np.roll(Vr, 1, axis=0) - 2 * Vr + np.roll(Vr, -1, axis=0))
        return np.concatenate([F.T.reshape(-1), LY.reshape(-1)])

    T = 2 * math.pi / om
    y0 = np.concatenate([z0.T.reshape(-1), np.eye(n).reshape(-1)])
    sol = solve_ivp(rhs, (0, T), y0, method="DOP853", rtol=rtol, atol=atol, t_eval=[T / N, T])
    assert sol.status == 0
    Yt = sol.y[n:, 0].reshape(n, n)
    YT = sol.y[n:, 1].reshape(n, n)
    Mt = np.roll(Yt.reshape(N, 18, n), 1, axis=0).reshape(n, n)       # (Q^{-1} y)_j = y_{j-1}
    return T, YT, Mt, float(np.abs(sol.y[:n, 1] - y0[:n]).max())


def test_crosscheck_monodromy_N8():
    N = 8
    res = _RES.get(8) or _certify(8, {"delta": "5e-6"})
    t0 = time.time()
    T, YT, Mt, ret = float_monodromy(N)
    rho = np.linalg.eigvals(YT)
    rho = rho[np.argsort(-np.abs(rho))]
    bound = float(res["multiplier_bound_full_period"]["approx"])
    one = [r for r in rho if abs(r - 1) < 1e-6]
    assert len(one) == 1, f"{len(one)} floating-point multipliers within 1e-6 of 1"
    others = [r for r in rho if abs(r - 1) >= 1e-6]
    assert max(abs(r) for r in others) < bound, "a floating-point multiplier lies outside the certified disc"
    lead = res["float_leading_nontrivial_window_eigenvalue"]
    pred = math.exp(lead[0] * T)
    assert abs(abs(others[0]) - pred) < 1e-7, f"leading |rho| {abs(others[0])} against e^(Re mu T) = {pred}"
    # reduced map: e^{mu tau} of the near-axis window eigenvalues against eig(M_tau)
    lt = np.linalg.eigvals(Mt)
    tau = T / N
    worst = 0.0
    for col in res["near_axis_columns"][:8]:
        z = np.exp(complex(col["lam_re"], col["lam_im"]) * tau)
        worst = max(worst, float(np.min(np.abs(lt - z))))
    assert worst < 1e-7, f"near-axis e^(mu tau) against eig(M_tau): {worst:.2e}"
    print(f"  monodromy cross-check N = 8 ({time.time() - t0:.0f} s, return error {ret:.1e}): one multiplier at "
          f"{one[0]:.10f}, max other |rho| = {abs(others[0]):.9f} < certified {bound:.9f}; e^(Re mu T) = {pred:.9f}; "
          f"near-axis e^(mu tau) vs eig(M_tau) max distance {worst:.1e}")


# ------------------------------------------------------------------------------------------------ provenance
def test_neg_provenance():
    """A Stage E record whose source hashes do not match the current files must stop the run (GAP 1 of the review)."""
    tmp = tempfile.mkdtemp()
    old = sb.RESULTS
    try:
        with open(os.path.join(old, "fourier-existence-N8.json")) as fh:
            rec = json.load(fh)
        rec["sources_sha256"]["fourier/existence.py"] = "0" * 64
        with open(os.path.join(tmp, "fourier-existence-N8.json"), "w") as fh:
            json.dump(rec, fh)
        sb.RESULTS = tmp
        try:
            sb.stage_e_inputs(8, log=QUIET)
        except sb.InputMismatch as e:
            assert "Stage E sources differ" in str(e), str(e)
            print(f"  negative control 'stale Stage E source hash' failed as required: {str(e)[:120]}")
            return
        raise AssertionError("a Stage E record with a wrong source hash was accepted")
    finally:
        sb.RESULTS = old
        shutil.rmtree(tmp)


# ------------------------------------------------------------------------------------------------ dominance
def _ld(x):
    """long double (64-bit mantissa) of an exact arb: double-double sum, error below 2^-64 relative."""
    from fractions import Fraction
    fr = sb.frac(x)
    hi = float(fr)
    return np.longdouble(hi) + np.longdouble(float(fr - Fraction(hi)))


def test_dominance_N8():
    """Every certified bound must dominate an independently computed floating-point value (WEAK TEST 1 of the review,
    after its probe1.py): fm_j against the column sums of V^{-1} H_WW V - Lambda (long double, H assembled here from
    the 128-bit midpoints), r_j against ||H_TW V e_j||_1 (tail rows up to K_e + K'), b_m against
    max_k sum_j |(V^{-1} H_{W,m})_{jk}|, beta against the column sums of V^{-1}, sigma_off against the float sum, and
    rho_T against a sampled sup of ||(z - X_r)^{-1}||_{1->1} over a grid of Zset_0 (X_r assembled here).
    Slack: relative 1e-6 plus absolute 1e-15 (the rounding of the long-double reference).

    One-term deletions this test (and the suite) cannot see because the term is negligible here (N = 8, delta = 5e-6;
    measured by the referee in a mutated copy): the factor 1 / (1 - q_C) and the |lambda_j| ||C e_j|| term of fm_j
    (q_C about 3e-14), Gtail(n_A + 1) in t_w and sigma_off (about 1e-20), the far bound for b_m (about 3e-12, below the
    listed b_m), the eps balls of Lemma 4.1 (about 1e-22 before scaling), and the damping -d_r E in the tail matrices X_r
    (d_r <= 4c = 0.004 at N = 8; rho_T is about 5.6 times the sampled sup, so a rho_T computed without it still
    dominates). Each would change a bound by far less than its margin; none can be detected by a comparison with the
    true value, since the bound stays above it."""
    N = 8
    t0 = time.time()
    inp = _inp(N)
    res = _certify(N, {"delta": "5e-6", "S_exps": _S(N)}, {"dump": True})
    D = res.pop("internals")
    e = np.array(D["e"])
    s = 2.0 ** e
    Ke, Kp = D["Ke"], inp["Kp"]
    ms = list(range(-Ke, Ke + 1))
    nW = 18 * len(ms)
    om = _ld(inp["om_bar"])
    Jl = {}
    for n in range(-Kp, Kp + 1):
        M = np.empty((18, 18), dtype=np.clongdouble)
        for r in range(18):
            for c in range(18):
                z = inp["J"][n][r][c]
                M[r, c] = (_ld(z.real.mid()) + 1j * _ld(z.imag.mid())) * np.longdouble(s[c] / s[r])
        Jl[n] = M
    dml = {m: _ld(sb.am.damping(m, N=N, prec=128).real.mid()) for m in range(-Ke - Kp, Ke + Kp + 1)}
    H = np.zeros((nW, nW), dtype=np.clongdouble)
    for i, m in enumerate(ms):
        for k, mp in enumerate(ms):
            if abs(m - mp) <= Kp:
                H[18 * i:18 * i + 18, 18 * k:18 * k + 18] = Jl[m - mp]
        for r in range(18):
            H[18 * i + r, 18 * i + r] += -1j * om * m
        H[18 * i, 18 * i] -= dml[m]
    V = D["Vf"].astype(np.clongdouble)
    lam = D["lam"].astype(np.clongdouble)
    Vinv = np.linalg.inv(D["Vf"]).astype(np.clongdouble)
    # one Newton step on the inverse in long double: Vinv <- Vinv (2 I - V Vinv)
    Vinv = Vinv @ (2 * np.eye(nW, dtype=np.clongdouble) - V @ Vinv)
    fm_ref = np.abs(Vinv @ (H @ V - V * lam[None, :])).sum(0).astype(float)
    fm = np.array(D["fm"])

    def check(name, arb_v, ref):
        arb_v, ref = np.asarray(arb_v, float), np.asarray(ref, float)
        ok = arb_v >= ref * (1 - 1e-6) - 1e-15
        big = ref > 1e-14
        ratio = (arb_v[big] / ref[big]).min() if big.any() else float("nan")
        assert ok.all(), f"{name}: certified bound below the float value at {int((~ok).sum())} entries"
        return ratio
    out = {"fm": check("fm", fm, fm_ref)}
    Jd = {n: Jl[n].astype(complex) for n in Jl}
    Vd = D["Vf"]
    rf = np.zeros(nW)
    for mt in list(range(Ke + 1, Ke + Kp + 1)) + list(range(-Ke - Kp, -Ke)):
        blk = np.zeros((18, nW), complex)
        for i, w in enumerate(ms):
            if abs(mt - w) <= Kp:
                blk[:, 18 * i:18 * i + 18] = Jd[mt - w]
        rf += np.abs(blk @ Vd).sum(0)
    out["r"] = check("r_j", D["r"], rf)
    Vinvd = Vinv.astype(complex)
    bref, barb = [], []
    for mt, bv in D["bms"].items():
        blk = np.zeros((nW, 18), complex)
        for i, w in enumerate(ms):
            if abs(w - mt) <= Kp:
                blk[18 * i:18 * i + 18, :] = Jd[w - mt]
        bref.append(np.abs(Vinvd @ blk).sum(0).max())
        barb.append(bv)
    out["b_m"] = check("b_m", barb, bref)
    out["beta"] = check("beta", D["beta"], np.abs(Vinvd).sum(0))
    so = sum(np.abs(Jd[n]).sum(0).max() for n in Jd if n != 0)
    out["sigma_off"] = check("sigma_off", [D["sigma_off"]], [so])
    # rho_T against a sampled sup over Zset_0 (X_r assembled here: A0c - d_r E in S-coordinates)
    delta = res["delta"]["approx"]
    g0 = D["g0"]
    A0 = np.array([[float(inp["J"][0][r][c].real.mid()) for c in range(18)] for r in range(18)]) * s[None, :] / s[:, None]
    best = 0.0
    for rr in range(N // 2 + 1):
        X = A0.copy()
        X[0, 0] -= ct.damping_float(rr, N)
        for x in np.linspace(-delta, 2.0, 41):
            for y in np.concatenate([np.linspace(g0, g0 + 3, 121), [g0 + 10, g0 + 100]]):
                best = max(best, np.abs(np.linalg.inv((x + 1j * y) * np.eye(18) - X)).sum(0).max())
    out["rho_T"] = check("rho_T", [D["rho_T"]], [best])
    print(f"  dominance N = 8 ({time.time() - t0:.0f} s): min certified/float ratios " +
          ", ".join(f"{k} {v:.6g}" for k, v in out.items()) + f" (rho_T {D['rho_T']:.3f} against sampled {best:.3f})")


ALL = [test_neg_provenance, test_accept_N8, test_accept_N8_sharp, test_dominance_N8, test_neg_delta_N8,
       test_neg_delta_N8_sharp, test_neg_lying_float_data, test_neg_antidiffusion, test_neg_Ke_small,
       test_neg_S_identity, test_neg_drop_A1_detected, test_neg_drop_A1_proof_only, test_neg_omega_lo,
       test_crosscheck_monodromy_N8, test_neg_delta_N64]

if __name__ == "__main__":
    t0 = time.time()
    failed = []
    for t in ALL:
        print(t.__name__)
        try:
            t()
        except Exception as e:  # noqa: BLE001 (an unexpected exception is a failed test)
            failed.append(t.__name__)
            print(f"  FAILED: {e}")
    print(f"{len(ALL) - len(failed)} of {len(ALL)} passed ({time.time() - t0:.0f} s)" +
          (f"; failed: {failed}" if failed else ""))
    sys.exit(1 if failed else 0)
