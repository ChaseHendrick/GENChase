"""Cross-check of the proof program's vector field (proof/ring19.hpp, via `ap_proof field`) against tp06_19d.py.

States: samples of the converged N = 16 orbit over one shift interval (pilot window record, Radau rtol 1e-12) and
random perturbations of them. For every state the C++ double-interval field is evaluated with the h/j branch
selected by V < -40 (as in the source) and the GHK factor (a) as the quotient, for cells with |V - 15| > 0.5 mV,
(b) as the degree-24 window polynomial for cells with |V - 15| < 10 mV, and compared with tp06_19d.field
(which uses 1/exprel). Reports the largest relative difference and whether the Python value lies in the C++
enclosure widened by 1e-12 relative (the Python model is floating point). Writes results/check_field.json.
Usage: python3 check_field.py AP_PROOF_BINARY DENSE_NPZ WORKDIR
"""
import json, os, subprocess, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))
import tp06_19d as M  # noqa: E402

SCALE_EXP = [6, 0, -1, -3, 0, 0, -1, 0, 0, 0, 0, -1, -1, 0, -10, 2, 1, 4, 7]
binary, dense, work = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(work, exist_ok=True)
N, C = 16, 0.035
d = np.load(dense)
y = d["y"]  # (19*N, samples), state-major
rng = np.random.default_rng(20261002)
cols = np.linspace(0, y.shape[1] - 1, 40).astype(int)
states = [y[:, k] for k in cols]
for k in cols[::4]:
    states.append(y[:, k] * (1 + 1e-3 * rng.standard_normal(19 * N)))
X = np.array(states)  # (M, 19N) state-major
p = M.params("author")


def to_scaled_cellmajor(x):
    Y = x.reshape(19, N)
    return np.array([Y[a, k] / 2.0 ** SCALE_EXP[a] for k in range(N) for a in range(19)])


def py_field(x):
    Y = x.reshape(19, N)
    cpl = C * (np.roll(Y[0], -1) - 2 * Y[0] + np.roll(Y[0], 1))
    F = M.field(Y, p, coupling=cpl, lo=Y[0] < -40)
    return np.array([F[a, k] / 2.0 ** SCALE_EXP[a] for k in range(N) for a in range(19)])


out = {}
for mode in ("quot", "poly"):
    sel = []
    for x in X:
        V = x[:N]
        if mode == "quot" and np.all(np.abs(V - 15) > 0.5):
            sel.append(x)
        if mode == "poly" and np.any(np.abs(V - 15) < 10):
            sel.append(x)
    sel = np.array(sel)
    fn = os.path.join(work, "states_%s.txt" % mode)
    with open(fn, "w") as f:
        f.write("%d %s %d\n" % (N, "0.035", len(sel)))
        for x in sel:
            f.write(" ".join(float(v).hex() for v in to_scaled_cellmajor(x)) + "\n")
    # 'auto' = window for cells with |V-15| < 10, quotient otherwise (mode quot: all quotient)
    r = subprocess.run([binary, "field", fn, os.path.join(work, "field_%s.txt" % mode), "quot" if mode == "quot" else "auto"],
                       capture_output=True, text=True, timeout=600)
    assert r.returncode == 0, r.stderr
    vals = np.loadtxt(os.path.join(work, "field_%s.txt" % mode), ndmin=2)
    lo, hi = vals[:, 0::2], vals[:, 1::2]
    rel, inside, wid = 0.0, True, 0.0
    for i, x in enumerate(sel):
        fp = py_field(x)
        mid = 0.5 * (lo[i] + hi[i])
        sc = np.maximum(np.abs(fp), 1e-300)
        rel = max(rel, float(np.max(np.abs(mid - fp) / np.maximum(sc, 1e-12 * np.abs(fp).max()))))
        tolr = 1e-12 * np.maximum(np.abs(fp), 1e-9 * np.abs(fp).max())
        inside = inside and bool(np.all((fp >= lo[i] - tolr) & (fp <= hi[i] + tolr)))
        wid = max(wid, float(np.max((hi[i] - lo[i]) / np.maximum(np.abs(mid), 1e-300))))
    out[mode] = dict(states=len(sel), max_rel_difference_midpoint_vs_python=rel,
                     python_inside_enclosure_widened_1e12th_rel=inside, max_rel_enclosure_width=wid)
    print(mode, out[mode])
out["note"] = "Floating-point cross-check of the proof program's field against tp06_19d.py; not a certificate."
json.dump(out, open(os.path.join(HERE, "results", "check_field.json"), "w"), indent=1)
