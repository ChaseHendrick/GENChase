"""Initiate a unidirectional action potential in a ring of N baseline TP06 cells (author convention) and test
whether it circulates.  Protocol: all cells start at the initial state Y0; cell 0 gets 52 pA/pF for 2 ms while the
edge between cell N-1 and cell 0 is cut (transient unidirectional block); the edge is restored 1 ms after cell N-1
activates, after which the ring is autonomous.  Activation = upward crossing of V = -40 mV.
Usage: python3 ring_reentry.py N c rotations [rtol]
Writes results/ring_N{N}_c{c}.json with activation times and the state at the last activation of cell 0."""
import sys, json, time
import numpy as np
import tp06_19d as M
from hybrid import Ring, run


def initiate(N, c, p, rtol=1e-7, y0=None, method="BDF"):
    w = np.ones(N); w[-1] = 0.0
    ring = Ring(N, c, p, weights=w)
    Y = np.repeat((M.Y0 if y0 is None else y0)[:, None], N, axis=1)
    I = np.zeros(N); I[0] = 52.0
    out = run(ring, Y, 0.0, 2.0, pulses=[(0.0, 2.0, I)], rtol=rtol, method=method)
    y, t = out["y"], out["t"]
    evs = list(out["events"])
    lo = None
    # advance with the edge cut until cell N-1 activates (chunks of 20 ms)
    while not any(i == N - 1 and d == 1 for _, i, d in evs):
        o = run(ring, y, t, t + 20.0, rtol=rtol, method=method)
        y, t = o["y"], o["t"]; evs += o["events"]
        if t > 50.0 * N + 400:
            raise RuntimeError("wave did not reach cell N-1 (propagation failure)")
    o = run(ring, y, t, t + 1.0, rtol=rtol, method=method)
    y, t = o["y"], o["t"]; evs += o["events"]
    ring.w = np.ones(N)
    return ring, y, t, evs


def circulate(ring, y, t, rotations, rtol=1e-7, method="BDF", chunk=None, verbose=True):
    """Integrate until cell 0 has activated `rotations` more times (or the wave dies)."""
    N = ring.N
    chunk = chunk or 50.0
    evs, sections = [], []
    n0 = 0
    t_last_act = t
    while n0 < rotations:
        o = run(ring, y, t, t + chunk, rtol=rtol, method=method)
        for (te, i, d) in o["events"]:
            if d == 1:
                t_last_act = te
        evs += o["events"]
        y, t = o["y"], o["t"]
        new0 = [e for e in o["events"] if e[1] == 0 and e[2] == 1]
        if new0:
            # re-integrate exactly to the section crossing of cell 0 to store the section state
            n0 += len(new0)
            if verbose:
                print("rotation %d  t=%.3f  y-V range [%.1f, %.1f]" % (n0, new0[-1][0], y[:N].min(), y[:N].max()), flush=True)
        if t - t_last_act > 1500.0:
            return dict(y=y, t=t, events=evs, died=True)
    return dict(y=y, t=t, events=evs, died=False)


def activation_table(events, N):
    acts = [[] for _ in range(N)]
    for te, i, d in events:
        if d == 1:
            acts[i].append(te)
    return acts


if __name__ == "__main__":
    N, c, rot = int(sys.argv[1]), float(sys.argv[2]), int(sys.argv[3])
    rtol = float(sys.argv[4]) if len(sys.argv) > 4 else 1e-7
    p = M.params("author")
    t0 = time.time()
    ring, y, t, ev0 = initiate(N, c, p, rtol=rtol)
    res = circulate(ring, y, t, rot, rtol=rtol)
    acts = activation_table(ev0 + res["events"], N)
    per0 = np.diff(acts[0])
    out = dict(N=N, c=c, rtol=rtol, died=res["died"], acts=acts, periods_cell0=per0.tolist(),
               t_final=res["t"], y_final=res["y"].tolist(), secs=time.time() - t0)
    print(json.dumps(dict(N=N, c=c, died=res["died"], periods_cell0=[round(x, 4) for x in per0.tolist()],
                          secs=round(out["secs"], 1))))
    json.dump(out, open("results/ring_N%d_c%g.json" % (N, c), "w"))
