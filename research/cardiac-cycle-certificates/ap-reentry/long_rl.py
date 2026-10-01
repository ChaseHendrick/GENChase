"""Long RL run from a saved RL final state (work/rl_final_N{N}_c{c}.npy) to follow the slow drift of the
rotation period.  Usage: python3 long_rl.py N c t_end dt [in.npy] [out.npy]"""
import sys, json, time
import numpy as np
from scan_rl import simulate
import tp06_19d as M
from hybrid import work

N, c, t_end, dt = int(sys.argv[1]), float(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4])
src = sys.argv[5] if len(sys.argv) > 5 else work("rl_final_N%d_c%g.npy" % (N, c))
dst = sys.argv[6] if len(sys.argv) > 6 else work("rl_long_N%d_c%g.npy" % (N, c))
y0 = np.load(src)
t0 = time.time()
acts, y, died = simulate(y0, N, c, t_end, dt)
a0 = acts[acts[:, 1] == 0, 0]
per = np.diff(a0)
np.save(dst, y)
np.save(dst.replace(".npy", "_periods.npy"), per)
Y = y.reshape(19, N)
p = M.params("author")
print(json.dumps(dict(N=N, c=c, died=bool(died), rotations=len(per), secs=round(time.time() - t0, 1),
                      periods_every_25=[round(x, 4) for x in per[::25].tolist()], last5=[round(x, 4) for x in per[-5:].tolist()],
                      Na_i=float(Y[17].mean()), K_i=float(Y[18].mean()), Ca_sr_mean=float(Y[15].mean()),
                      Q_total=float(M.charge(Y, p).sum()))))
