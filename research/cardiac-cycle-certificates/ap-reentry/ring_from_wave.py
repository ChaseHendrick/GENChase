"""Start a ring of N cells (coupling c) from a rotating-wave initial state sampled from a recorded waveform and
integrate `rot` rotations; report rotation periods of cell 0 and whether the wave survives.
Usage: python3 ring_from_wave.py waveform.npz N c rot [tag]   (author convention, BDF rtol 1e-7)"""
import sys, json, time
import numpy as np
import tp06_19d as M
from hybrid import Ring
from ring_reentry import circulate, activation_table
from waveform import initial_state

wf = np.load(sys.argv[1]); N = int(sys.argv[2]); c = float(sys.argv[3]); rot = int(sys.argv[4])
tag = sys.argv[5] if len(sys.argv) > 5 else ""
p = M.params("author")
ring = Ring(N, c, p)
y = initial_state(wf["wt"], wf["wy"], float(wf["T"]), N)
t0 = time.time()
res = circulate(ring, y, 0.0, rot, verbose=False)
acts = activation_table(res["events"], N)
per = np.diff(acts[0])
lags = [acts[(i + 1) % N][-1] - acts[i][-1] for i in range(N - 1)] if all(len(a) for a in acts) else []
out = dict(N=N, c=c, died=res["died"], periods0=[round(x, 4) for x in per.tolist()],
           last_lags=[round(x, 3) for x in lags], secs=round(time.time() - t0, 1))
print(json.dumps(out), flush=True)
json.dump(dict(out, y_final=res["y"].tolist(), acts=acts), open("results/ringwave_N%d_c%g%s.json" % (N, c, tag), "w"))
