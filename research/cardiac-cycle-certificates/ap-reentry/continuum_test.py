"""Reentry in a finely discretized ring with the published TP06 diffusion coefficient (D = 0.154 mm^2/ms, cell
spacing h = 0.25 mm, c = D/h^2 = 2.464 /ms), circumference L = N h, using the fast RL simulator.  Initial state:
the N=16 orbit waveform sampled so that one waveform period spans the ring (a rough unidirectional pulse).
Usage: python3 continuum_test.py waveform.npz t_end dt L1,L2,...   (L in mm)"""
import sys, json, time
import numpy as np
from scan_rl import simulate
from waveform import initial_state

wf = np.load(sys.argv[1]); t_end = float(sys.argv[2]); dt = float(sys.argv[3])
D, h = 0.154, 0.25
for L in [float(x) for x in sys.argv[4].split(",")]:
    N = int(round(L / h)); c = D / h ** 2
    t0 = time.time()
    y0 = initial_state(wf["wt"], wf["wy"], float(wf["T"]), N)
    acts, y, died = simulate(y0, N, c, t_end, dt)
    a0 = acts[acts[:, 1] == 0, 0]
    am = acts[acts[:, 1] == N // 2, 0]
    per = np.diff(a0)
    cv = None
    if len(a0) and len(am):
        k = np.searchsorted(am, a0[-2] if len(a0) > 1 else a0[-1])
        if k < len(am):
            cv = (N // 2) * h / (am[k] - (a0[-2] if len(a0) > 1 else a0[-1]))
    print(json.dumps(dict(L_mm=L, N=N, c=c, dt=dt, died=bool(died), rotations=len(per),
                          periods_tail=[round(x, 2) for x in per[-6:].tolist()],
                          cv_mm_per_ms=None if cv is None else round(cv, 4), secs=round(time.time() - t0, 1))), flush=True)
