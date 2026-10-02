"""Continue a saved ring state (JSON with y_final) for `rot` more rotations of cell 0 (BDF, rtol 1e-7 unless given).
Prints rotation periods of cell 0 and the spread of the per-cell activation lags in the last rotation.
Usage: python3 continue_ring.py state.json N c rot out.json [rtol]"""
import sys, json, time
import numpy as np
import tp06_19d as M
from hybrid import Ring
from ring_reentry import circulate, activation_table

src, N, c, rot, dst = sys.argv[1], int(sys.argv[2]), float(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
rtol = float(sys.argv[6]) if len(sys.argv) > 6 else 1e-7
d = json.load(open(src))
p = M.params("author")
ring = Ring(N, c, p)
t0 = time.time()
res = circulate(ring, np.array(d["y_final"]), 0.0, rot, rtol=rtol, verbose=False)
acts = activation_table(res["events"], N)
per = np.diff(acts[0])
m = min(len(a) for a in acts)
lags = np.array([acts[(i + 1) % N][m - 1] - acts[i][m - 1] for i in range(N - 1)]) if m else np.array([])
out = dict(N=N, c=c, died=res["died"], periods0=[round(x, 5) for x in per.tolist()],
           lag_min=float(lags[lags > 0].min()) if len(lags) else None, lag_max=float(lags.max()) if len(lags) else None,
           secs=round(time.time() - t0, 1))
print(json.dumps(out), flush=True)
json.dump(dict(out, y_final=res["y"].tolist(), acts=acts), open(dst, "w"))
