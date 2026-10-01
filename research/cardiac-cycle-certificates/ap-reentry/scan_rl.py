"""Scan (N, c) with the fast Rush-Larsen simulator ring_rl.c, starting from a rotating-wave initial state sampled
from a recorded waveform (waveform.py).  Classifies each run from the activation times of all cells.
Usage: python3 scan_rl.py waveform.npz t_end dt "N1,N2" "c1,c2" [binary]"""
import sys, os, json, subprocess, tempfile, time
import numpy as np
from waveform import initial_state
from hybrid import work

BIN = os.environ.get("RING_RL", "./ring_rl")


def simulate(y0, N, c, t_end, dt, cmflux=0.185):
    with tempfile.TemporaryDirectory() as d:
        fi, fo, fa = (os.path.join(d, x) for x in ("in.bin", "out.bin", "acts.txt"))
        np.asarray(y0, float).tofile(fi)
        r = subprocess.run([BIN, str(N), repr(c), repr(dt), repr(t_end), repr(cmflux), fi, fo, fa],
                           capture_output=True, text=True, check=True)
        acts = np.loadtxt(fa, ndmin=2)
        y = np.fromfile(fo)
        died = "died 1" in r.stdout
    return acts, y, died


def classify(acts, N, died):
    a0 = acts[acts[:, 1] == 0, 0]
    per = np.diff(a0)
    res = dict(died=bool(died), rotations=len(per))
    if len(per) >= 6:
        last = per[-6:]
        res.update(T_last=float(per[-1]), T_spread_last6=float(last.max() - last.min()),
                   dT_last=float(per[-1] - per[-2]), dT_prev=float(per[-2] - per[-3]))
    return res, per


if __name__ == "__main__":
    wf = np.load(sys.argv[1]); t_end = float(sys.argv[2]); dt = float(sys.argv[3])
    Ns = [int(x) for x in sys.argv[4].split(",")]; cs = [float(x) for x in sys.argv[5].split(",")]
    rows = []
    for N in Ns:
        for c in cs:
            t0 = time.time()
            y0 = initial_state(wf["wt"], wf["wy"], float(wf["T"]), N)
            acts, y, died = simulate(y0, N, c, t_end, dt)
            res, per = classify(acts, N, died)
            res.update(N=N, c=c, dt=dt, t_end=t_end, secs=round(time.time() - t0, 1),
                       periods_tail=[round(x, 3) for x in per[-8:].tolist()])
            print(json.dumps(res), flush=True)
            rows.append(res)
            np.save(work("rl_final_N%d_c%g.npy" % (N, c)), y)
    tag = "%s_%s_dt%g" % (sys.argv[4].replace(",", "-"), sys.argv[5].replace(",", "-"), dt)
    json.dump(rows, open("results/scan_rl_%s.json" % tag, "w"), indent=1)
