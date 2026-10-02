"""Choose the 1 ms pilot window on the converged N = 16, c = 0.035 rotating wave and write its start state.

The window [t0, t0 + 1 ms] (t measured from the section V_0 = -40 mV, upward) must satisfy, for every cell and
every time in it:
  (a) V never crosses -40 mV, so each cell's h/j branch is fixed for the whole window and can be chosen at build
      time from the start state (the CAPD field then has no switch inside the window);
  (b) |V - 15| > 0.5 mV, so the GHK quotient (V-15)/(exp(z)-1) can be evaluated as a quotient without coming close
      to its removable singularity (a rigorous proof needs the series window of SCOPING.md section 6.3 instead).
Floating-point only: the orbit is the Newton-converged section state results/orbit_N16_c0.035_section_state.json
integrated with the mode-fixed hybrid integrator (Radau, rtol 1e-12). The sampled margins are corrected by a
bound on the motion between samples (max |dV/dt| on the window times half the sample spacing), still in floating
point, so the window conditions are numerical checks, not certificates.

Usage: python3 window.py OUTDIR [T0]   (writes OUTDIR/shift_dense.npz, OUTDIR/window_start.txt and
OUTDIR/window_states.txt, and the summary results/window.json; with T0, a given valid start instead of the earliest
one, written to OUTDIR/window_start_t<T0>.txt and results/window_t<T0>.json)
"""
import json, os, sys, time
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))
import tp06_19d as M  # noqa: E402
from hybrid import Ring, run  # noqa: E402

N, C = 16, 0.035
out_dir = sys.argv[1]
os.makedirs(out_dir, exist_ok=True)
sec = json.load(open(os.path.join(HERE, "..", "results", "orbit_N16_c0.035_section_state.json")))
x0 = np.array(sec["x"], float)
assert sec["N"] == N and sec["c"] == C and x0[0] == -40.0
p = M.params("author")
ring = Ring(N, C, p)
lo0 = x0[:N] < -40
lo0[0] = False  # cell 0 sits on the section at V = -40 and rises: V >= -40 branch, as in rotwave.ShiftMap

t_start = time.time()
dense = os.path.join(out_dir, "shift_dense.npz")
if os.path.exists(dense):
    d = np.load(dense)
    rt, ry = d["t"], d["y"]
else:
    o = run(ring, x0, 0.0, sec["tau_ms"], rtol=1e-12, method="Radau", lo0=lo0, record=True, max_step=0.005)
    rt, ry = o["rec_t"], o["rec_y"]
    np.savez(dense, t=rt, y=ry)
V = ry[:N]  # (N, samples)
dVdt = np.abs(np.diff(V, axis=1)) / np.diff(rt)[None, :]


def window_ok(t0, width=1.0):
    k = (rt >= t0) & (rt <= t0 + width)
    kk = np.where(k)[0]
    if len(kk) < 3:
        return None
    Vw = V[:, kk]
    sgn = np.sign(Vw + 40.0)
    no_cross = bool(np.all(sgn == sgn[:, :1]))
    seg = kk[:-1]
    slack = float((dVdt[:, seg].max(axis=1) * np.diff(rt[kk]).max() / 2).max())
    m40 = float(np.abs(Vw + 40).min()) - slack
    m15 = float(np.abs(Vw - 15).min()) - slack
    return dict(t0=float(t0), no_cross_m40=no_cross, min_abs_V_plus_40=m40, min_abs_V_minus_15=m15, slack=slack)


# scan candidate starts on a 0.05 ms grid; a valid window has no -40 crossing (with margin) and stays 0.5 mV off 15
cands = []
for t0 in np.arange(0.0, sec["tau_ms"] - 1.0, 0.05):
    w = window_ok(t0)
    if w and w["no_cross_m40"] and w["min_abs_V_plus_40"] > 0.5 and w["min_abs_V_minus_15"] > 0.5:
        cands.append(w)
valid_starts = [c["t0"] for c in cands]
# The earliest valid window: it follows the upstroke of cell 0 (fast Na inactivation, notch), so its step sizes
# are expected to be among the smallest of the shift interval (a conservative choice for a cost measurement).
chosen = cands[0]
tag = ""
if len(sys.argv) > 2:  # a later valid window (used for a step-size comparison in a quiet phase)
    want = float(sys.argv[2])
    chosen = min(cands, key=lambda c: abs(c["t0"] - want))
    assert abs(chosen["t0"] - want) < 1e-9, "requested window start is not a valid start on the 0.05 ms grid"
    tag = "_t%g" % want
t0 = round(chosen["t0"], 2)

# accurate start state at t0 and a fine re-check of the chosen window
o1 = run(ring, x0, 0.0, t0, rtol=1e-12, method="Radau", lo0=lo0)
xs = o1["y"]
lo_s = xs[:N] < -40
assert np.array_equal(lo_s, o1["lo"]), "branch mask at t0 differs from the hybrid integrator's mask"
o2 = run(ring, xs, t0, t0 + 1.0, rtol=1e-12, method="Radau", lo0=lo_s, record=True, max_step=0.0005)
assert not o2["events"], "a cell crossed -40 mV inside the window"
Vf = o2["rec_y"][:N]
tf = o2["rec_t"]
sl = float((np.abs(np.diff(Vf, axis=1)) / np.diff(tf)[None, :]).max() * np.diff(tf).max() / 2)
fine = dict(samples=int(len(tf)), max_spacing_ms=float(np.diff(tf).max()), slack_mV=sl,
            min_abs_V_plus_40_mV=float(np.abs(Vf + 40).min()) - sl, min_abs_V_minus_15_mV=float(np.abs(Vf - 15).min()) - sl,
            per_cell_min_abs_V_minus_15=[float(v) for v in np.abs(Vf - 15).min(axis=1)],
            per_cell_min_abs_V_plus_40=[float(v) for v in np.abs(Vf + 40).min(axis=1)],
            V_start=[float(v) for v in Vf[:, 0]], V_end=[float(v) for v in Vf[:, -1]],
            branch_low_V_lt_m40=[bool(b) for b in lo_s], events=len(o2["events"]))
# window states for the field comparison: 21 equally spaced states (interpolated from the fine record, so they are
# states near the orbit, not on it; the comparison only needs physiological states of this window)
ts = np.linspace(t0, t0 + 1.0, 21)
W = np.array([[np.interp(t, tf, o2["rec_y"][a]) for a in range(19 * N)] for t in ts])
if not tag:
    np.savetxt(os.path.join(out_dir, "window_states.txt"), W, fmt="%.17g")
with open(os.path.join(out_dir, "window_start%s.txt" % tag), "w") as f:
    f.write("%d %s %.17g\n" % (N, "0.035", t0))
    f.write(" ".join("%d" % int(b) for b in lo_s) + "\n")
    f.write(" ".join(repr(float(v)) for v in xs) + "\n")
    f.write(" ".join(repr(float(v)) for v in o2["y"]) + "\n")  # reference end state (Radau rtol 1e-12)
summary = dict(note="Floating-point window choice for the stage-1 pilot; not a certificate.", N=N, c=C, t0_ms=t0,
               t1_ms=t0 + 1.0, convention="author", valid_window_starts_on_0p05_grid=valid_starts,
               n_valid=len(valid_starts), chosen_coarse=chosen, fine_check=fine,
               orbit_max_abs_per_state=[float(np.abs(ry[a * N:(a + 1) * N]).max()) for a in range(19)],
               orbit_min_abs_per_state=[float(np.abs(ry[a * N:(a + 1) * N]).min()) for a in range(19)],
               secs=round(time.time() - t_start, 1))
json.dump(summary, open(os.path.join(HERE, "results", "window%s.json" % tag), "w"), indent=1)
print(json.dumps({k: summary[k] for k in ("t0_ms", "n_valid", "chosen_coarse")}))
print(json.dumps({k: fine[k] for k in ("min_abs_V_plus_40_mV", "min_abs_V_minus_15_mV", "slack_mV", "samples")}))
print("valid starts:", valid_starts)
