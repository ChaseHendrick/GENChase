"""Grid test: does a unidirectionally initiated AP survive `rot` rotations in a ring of N cells with coupling c?
Usage: python3 ring_scan.py rot "N1,N2,..." "c1,c2,..."   (author convention, rtol 1e-7)"""
import sys, json, time
import numpy as np
import tp06_19d as M
from ring_reentry import initiate, circulate, activation_table

rot = int(sys.argv[1]); Ns = [int(x) for x in sys.argv[2].split(",")]; cs = [float(x) for x in sys.argv[3].split(",")]
p = M.params("author")
rows = []
for N in Ns:
    for c in cs:
        t0 = time.time()
        try:
            ring, y, t, ev0 = initiate(N, c, p)
            res = circulate(ring, y, t, rot, verbose=False)
            acts = activation_table(ev0 + res["events"], N)
            r = dict(N=N, c=c, died=res["died"], n_acts=[len(a) for a in acts],
                     periods0=[round(x, 3) for x in np.diff(acts[0]).tolist()],
                     t_end=round(res["t"], 1), secs=round(time.time() - t0, 1))
        except RuntimeError as e:
            r = dict(N=N, c=c, error=str(e), secs=round(time.time() - t0, 1))
        print(json.dumps(r), flush=True)
        rows.append(r)
json.dump(rows, open("results/ring_scan_%s_%s.json" % (sys.argv[2].replace(",", "-"), sys.argv[3].replace(",", "-")), "w"), indent=1)
