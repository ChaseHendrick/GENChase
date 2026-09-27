import sys, numpy as np
sys.path.insert(0, '/home/user/GENChase/.claude/worktrees/hh-stability/papers/hh-pulse/code')
import hhwave as H, pulse_bvp as P
T = float(sys.argv[1]); EL = float(sys.argv[2]) if len(sys.argv) > 2 else None
W = H.Wave(T, EL=EL)
lo, hi, _, _ = H.bisect_K(W, 3, 30, tol=1e-12)
g = P.shoot_guess(W, lo)
sol, geom = P.pulse(W, lo, guess=g, tol=1e-9, Tp=45.0)
print(sol.status, sol.p[0], sol.x.size)
t, Y = P.profile(sol, geom, n=20001)
np.savez('pulse_%s_%s.npz' % (T, EL), t=t, Y=Y, K=sol.p[0], rest=W.rest, phi=W.phi, EL=W.EL)
