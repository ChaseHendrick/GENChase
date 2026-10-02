"""Paced single baseline TP06 endocardial cell: stimulus 52 pA/pF for 2 ms (TP06_endo.m lines 126-128), repeated
every 1000 ms (1 Hz), hybrid integration with events at V = -40 mV.  Reports APD90 per beat and threshold crossings.
Usage: python3 single_cell.py [convention] [beats] [stimulus duration ms, default 2 as in the source]"""
import sys, json, time
import numpy as np
import tp06_19d as M
from hybrid import Ring, run


def apd90(rt, V, t_on, t_end):
    k = (rt >= t_on) & (rt < t_end)
    tt, vv = rt[k], V[k]
    v_rest = vv[0]
    ip = int(np.argmax(vv))
    vmax = vv[ip]
    dv = np.gradient(vv, tt)
    ia = int(np.argmax(dv[:ip + 1]))
    level = vmax - 0.9 * (vmax - v_rest)
    after = np.nonzero(vv[ip:] < level)[0]
    if len(after) == 0:
        return dict(vmax=vmax, v_rest=v_rest, apd90=None)
    i2 = ip + after[0]
    tr = tt[i2 - 1] + (level - vv[i2 - 1]) * (tt[i2] - tt[i2 - 1]) / (vv[i2] - vv[i2 - 1])
    return dict(v_rest=float(v_rest), vmax=float(vmax), dvdt_max=float(dv[ia]), t_act=float(tt[ia] - t_on),
                apd90=float(tr - tt[ia]), level=float(level))


def main(conv="author", beats=30, rtol=1e-9, dur=2.0):
    p = M.params(conv)
    ring = Ring(1, 0.0, p)
    y = M.Y0.copy()
    rows = []
    t0 = time.time()
    for b in range(beats):
        ta = 1000.0 * b
        out = run(ring, y, ta, ta + 1000.0, pulses=[(ta, ta + dur, np.array([52.0]))], rtol=rtol, record=True)
        V = out["rec_y"][0]
        r = apd90(out["rec_t"], V, ta, ta + 1000.0)
        up15 = int(np.sum((V[:-1] < 15) & (V[1:] >= 15))); dn15 = int(np.sum((V[:-1] >= 15) & (V[1:] < 15)))
        r.update(beat=b + 1, n_cross_m40=len(out["events"]), cross15=(up15, dn15),
                 Na_i=float(out["y"][17]), K_i=float(out["y"][18]), Ca_sr=float(out["y"][15]),
                 q=float(M.charge(out["y"], p)))
        rows.append(r)
        y = out["y"]
        if b < 3 or (b + 1) % 10 == 0 or b == beats - 1:
            print(json.dumps(r), flush=True)
    print("elapsed %.1f s" % (time.time() - t0))
    return rows


if __name__ == "__main__":
    conv = sys.argv[1] if len(sys.argv) > 1 else "author"
    beats = int(sys.argv[2]) if len(sys.argv) > 2 else 30
    dur = float(sys.argv[3]) if len(sys.argv) > 3 else 2.0
    rows = main(conv, beats, dur=dur)
    json.dump(rows, open("results/single_cell_%s_stim%gms.json" % (conv, dur), "w"), indent=1)
