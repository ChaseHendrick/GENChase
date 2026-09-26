# test_advance8.py -- cross-check of the new whole-interval integrator (advance8, blk_common.py)
# against the earlier, separately tested integrator vi_integrate.advance (REIMPL.md section 3e).
# The earlier integrator is run at the POINT speeds c1 and c2 from its own start set to T = 170; its
# enclosures must overlap the kappa-set enclosure y + (1/c - kap0) d +- z of kappa_run.py at T.
# (The two start points are on the same orbit but on slightly different hyperplanes a = delta, a time
# shift of order 1e-90, far below the enclosure radii; this is a test, not part of the proof.)
# Also a negative control: the same comparison with c shifted by 5e-27 must NOT overlap.
# Run:   python3 test_advance8.py        (about 2 minutes)
import time
from flint import arb, fmpq
import blk_common as B
import kappa_run
VI = B.VI
T = fmpq(170)

def vi_point(c):
    kap = 1 / arb(c)
    y, z, lams, Tm, Ti = VI.start_set(kap, lambda m: None)
    t = fmpq(0)
    while t < T:
        y, z, h, _ = VI.advance(y, z, kap, hcap=T - t)
        t += h
    return [arb(y[i], z[i]) for i in range(4)]

t0 = time.time()
ok, (y, d, z, kap0, w) = kappa_run.run(B.C1, B.C2, T, log=lambda m: None)
allok = True
for name, c in (("c1", B.C1), ("c2", B.C2), ("c1 + 5e-27 (control)", B.C1 + fmpq(5, 10**27))):
    P = vi_point(c)
    dk = arb(1 / c - kap0)
    S = [y[i] + dk * d[i] + arb(0, z[i]) for i in range(4)]
    ov = all(P[i].overlaps(S[i]) for i in range(4))
    print(f"  {name}: vi_integrate enclosure at T, U = {P[0].str(15, radius=True)}; kappa-set enclosure at this kappa, "
          f"U = {S[0].str(15, radius=True)}; overlap in all components: {ov}")
    if name.startswith("c1 +"):
        # the control speed is inside [c1, c2]; the comparison is made at the WRONG kappa (that of c1)
        dk1 = arb(1 / B.C1 - kap0)
        S1 = [y[i] + dk1 * d[i] + arb(0, z[i]) for i in range(4)]
        ovc = all(P[i].overlaps(S1[i]) for i in range(4))
        print(f"  control: the c1+5e-27 point compared with the set enclosure evaluated at kappa(c1): overlap {ovc} (must be False)")
        allok &= ov and not ovc
    else:
        allok &= ov
print("RESULT:", "PASS" if allok else "FAIL", f"({time.time()-t0:.0f} s)")
