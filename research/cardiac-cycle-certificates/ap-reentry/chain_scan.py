"""Discrete propagation in an open chain of n baseline TP06 cells (author convention) versus coupling c (1/ms):
stimulate cell 0 (52 pA/pF, 2 ms), record activation times (upward V = -40 mV crossings), report the per-cell
conduction delay in the chain interior.  Usage: python3 chain_scan.py n c1 c2 ..."""
import sys, json, time
import numpy as np
import tp06_19d as M
from hybrid import Ring, run


def chain(n, c, t_end=None, rtol=1e-7, conv="author", y0=None):
    p = M.params(conv)
    w = np.ones(n); w[-1] = 0.0  # cut the edge between cell n-1 and cell 0: open chain
    ring = Ring(n, c, p, weights=w)
    Y = np.repeat((M.Y0 if y0 is None else y0)[:, None], n, axis=1)
    I = np.zeros(n); I[0] = 52.0
    t_end = t_end or 400.0
    out = run(ring, Y, 0.0, t_end, pulses=[(0.0, 2.0, I)], rtol=rtol, method="BDF")
    act = {}
    for t, i, d in out["events"]:
        if d == +1 and i not in act:
            act[i] = t
    return act, out


if __name__ == "__main__":
    n = int(sys.argv[1])
    res = []
    for c in map(float, sys.argv[2:]):
        t0 = time.time()
        act, out = chain(n, c)
        ts = [act.get(i) for i in range(n)]
        d = [ts[i + 1] - ts[i] for i in range(n - 1) if ts[i] is not None and ts[i + 1] is not None]
        r = dict(c=c, n=n, activated=sum(t is not None for t in ts), act=ts,
                 interior_delay=(float(np.mean(d[n // 3: 2 * n // 3])) if len(d) >= 2 * n // 3 else None),
                 secs=round(time.time() - t0, 1))
        print(json.dumps(r), flush=True)
        res.append(r)
    json.dump(res, open("results/chain_scan_n%d_%s.json" % (n, "_".join(sys.argv[2:])), "w"), indent=1)
