"""Claim 8: fates along u in [4.5 - 2e-3, 4.5 + 2e-3] at fixed gates g0 (section point c = (z1(c2), c2, 0),
c2 = -2e-3, z1 = my own zero of c1' (the first chart coordinate of P(c)) on that line near the A lap,
i.e. the preimage of the plane c1 = 0; a fixed point of c1 -> c1' gave 5.9957e-6 instead, which is not their z1). NUMERICAL.
Usage: python3 threshold.py N [rtol]"""
import sys, json, time
import numpy as np
import hhk, hsets

J = hsets.J
N = int(sys.argv[1]); rtol = float(sys.argv[2]) if len(sys.argv) > 2 else 1e-13
c2 = -2e-3
# my own z1: c1'(c1) = 0 on the line (c1, c2, 0), secant
def g(c1):
    x = hsets.A + hsets.E @ np.array([c1, c2, 0.0])
    y, _ = hhk.P(x, J)
    return ((y - hsets.A) @ hsets.Einv.T)[0]
a, b = 5.83e-6, 5.84e-6
fa, fb = g(a), g(b)
for _ in range(40):
    c = b - fb * (b - a) / (fb - fa)
    a, fa, b, fb = b, fb, c, g(c)
    if abs(b - a) < 1e-21 or fb == fa:
        break
z1 = b
if len(sys.argv) > 3 and sys.argv[3] == 'claimed':
    z1 = 5.8354068888413905e-06
claimed_z1 = 5.8354068888413905e-06
g0 = hsets.A + hsets.E @ np.array([z1, c2, 0.0])
eq = hhk.equilibrium(J)
s = np.linspace(0, 1, N + 1)
L = 2e-3
Y0 = np.c_[4.5 + L * (2 * s - 1), np.tile(g0, (N + 1, 1))]
t0 = time.time()
f, tt = hhk.fates(Y0, J, hhk.EL, eq, rtol, rtol * 1e-2, 0.25, 1000.0, 50.0)
sw = np.where(np.diff(f) != 0)[0]
res = dict(N=N, rtol=rtol, z1_mine=z1, z1_claimed=claimed_z1, gates=list(g0), eq=list(eq), AP=int((f == 1).sum()),
           REST=int((f == 0).sum()), UNDEC=int((f == -1).sum()), switches=int(len(sw)),
           switch_u=[[float(Y0[k, 0]), float(Y0[k + 1, 0]), int(f[k]), int(f[k + 1])] for k in sw],
           t_decide_max=float(tt.max()), seconds=time.time() - t0)
print(json.dumps(res, indent=1))
json.dump(res, open('threshold_%d_%g%s.json' % (N, rtol, '_claimedz1' if len(sys.argv) > 3 else ''), 'w'), indent=1)
