"""Acceptance tests, negative controls and a floating-point cross-check for stability.py (Stage S). Each can fail.

Run (machine shared; about 10 minutes):
  PYTHONPATH=<python-flint 0.9.0> nice timeout 3000 python3 test_stability.py      (or pytest)

Acceptance
  * N = 8, delta = 5e-6 is certified (Theorem 3 by route A and (SC)), and delta = 6.3e-6 is certified too (the
    floating-point leading exponent is -6.32e-6: the certificate is sharp to about 0.3 per cent of it).
Negative controls (checklist item 11; each must FAIL, with ProofFailure, or be detected, with InputMismatch)
  * delta = 7e-6 at N = 8 (true leading exponent about -6.32e-6): the count (C5) becomes 3;
  * delta = 1e-5 at N = 64 (about -9.34e-6): the count (C5) becomes 3;
  * anti-diffusion (the damping symbol d_m replaced by -d_m everywhere) at N = 8;
  * K_e too small (K_e = N/2 + 1 at N = 8): the tail check (C2) or theta_T < 1 fails;
  * S = I (no cell coordinates) at N = 8: route A cannot close (pitfall 8);
  * a dropped coefficient A_{+-1} at N = 8: (a) dropped everywhere: detected by the trivial-eigenvector sanity check;
    (b) dropped only in the proof data, sanity check skipped: the certificate itself fails;
  * omega_lo replaced by b / N at N = 8 (so that b >= omega_lo N): (C1) fails.
Cross-check (not part of the proof)
  * N = 8: an ordinary floating-point 144-dimensional monodromy Y(T) (scipy DOP853 integration of the ring and its
    variational equation from the centre's x* = (phibar(2 pi j / N))_j): exactly one multiplier near 1, every other
    multiplier inside the certified disc |rho| < e^(-delta T_lo), and the leading moduli equal to e^(Re mu T) of the
    window eigenvalues; the reduced map M_tau = Q^(-1) Y(tau) against e^(mu tau) of the near-axis eigenvalues.
"""
import math
import os
import sys
import time

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import centre as ct  # noqa: E402
import stability as sb  # noqa: E402

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
    t0 = time.time()
    res = _certify(8, {"delta": "6.3e-6", "S_exps": _S(8)})
    assert res["count_in_Omega"] == 1 and res["SC_worst_ratio"] < 1
    print(f"  N = 8, delta = 6.3e-6: certified ({time.time() - t0:.0f} s); near-axis worst "
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


def test_neg_delta_N64():
    _expect_failure(64, "delta = 1e-5 at N = 64", {"delta": "1e-5", "S_exps": _S(64)}, expect_text=["(C5)"])


def test_neg_antidiffusion():
    _expect_failure(8, "anti-diffusion c -> -c at N = 8", {"delta": "5e-6"}, {"damping_sign": -1})


def test_neg_Ke_small():
    _expect_failure(8, "K_e = N/2 + 1 at N = 8", {"delta": "5e-6", "S_exps": _S(8)}, {"Ke": 5},
                    expect_text=["route A", "theta_T", "g_0"])


def test_neg_S_identity():
    _expect_failure(8, "S = I at N = 8", {"delta": "5e-6", "S_exps": [0] * 18}, expect_text=["theta_T", "route A"])


def test_neg_drop_A1_detected():
    # dropped in the proof data and in the data choosing V, U_r: the operator changes consistently; the count (C5)
    # (checked first) or, failing that, the trivial-eigenvector sanity check must stop the run
    _expect_failure(8, "A_{+-1} dropped everywhere", {"delta": "5e-6", "S_exps": _S(8)},
                    {"drop": [1]}, allow=(sb.ProofFailure, sb.InputMismatch))
    # the sanity check on its own: the count failure is deferred (test hook skip_count), so the run reaches the
    # trivial-eigenvector check, which must stop it
    _expect_failure(8, "A_{+-1} dropped everywhere, count forced (sanity check must detect)",
                    {"delta": "5e-6", "S_exps": _S(8)}, {"drop": [1], "skip_count": True},
                    allow=(sb.InputMismatch,), expect_text=["trivial-eigenvector"])


def test_neg_drop_A1_proof_only():
    _expect_failure(8, "A_{+-1} dropped in the proof data only, no sanity check", {"delta": "5e-6", "S_exps": _S(8)},
                    {"drop": [1], "drop_proof_only": True, "skip_sanity": True})


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


ALL = [test_accept_N8, test_accept_N8_sharp, test_neg_delta_N8, test_neg_antidiffusion, test_neg_Ke_small,
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
