# test_enclosure.py -- test of the validated integrator in vi_integrate.py against an independent
# non-rigorous solution (the mpmath Taylor integrator of shoot_mp.py at 80 digits, local tolerance 1e-72).
# Both start from the same exact point y0 = 2^-20 * (dyadic unstable eigenvector) at c = c1 and are
# compared at xi = 10, 20, 30, 40 (through the pulse and the return).  PASS: every mpmath value lies inside the
# arb enclosure.  NEGATIVE CONTROL: the mpmath solution at kappa perturbed by 1e-30 must fall
# OUTSIDE some enclosure (shows the enclosures are sharp enough to see a 1e-30 change).
# Run:   python3 test_enclosure.py        (about 1 minute)
import sys
from flint import arb, fmpq, ctx
import vi_integrate as VI
sys.argv = [sys.argv[0], "80", "40", "24", "-8"]
import shoot_mp as SM
from mpmath import mp, mpf

kap = 1 / arb(VI.C1)
lams, T, = VI.eigen_setup(kap)
y0 = [arb((T[i, 0] * arb(fmpq(1, 2**20))).mid()) for i in range(4)]
z0 = [arb(0)] * 4
times = [fmpq(k * 10) for k in range(1, 5)]      # the orbit from this start escapes near xi = 47
# validated
encl = {}; y, z, t = y0, z0, fmpq(0)
for Tk in times:
    while t < Tk:
        y, z, h, _ = VI.advance(y, z, kap, hcap=Tk - t)
        t += h
    encl[Tk] = [arb(y[i], z[i]) for i in range(4)]
# mpmath reference from the same exact start
def mp_solve(kapm):
    ym = [mpf(int(v.mid().man_exp()[0])) * mpf(2) ** int(v.mid().man_exp()[1]) for v in y0]
    out = {}; tm = mpf(0)
    for Tk in times:
        Tm = mpf(int(Tk.p)) / int(Tk.q)
        while tm < Tm:
            cs = SM.taylor(ym, kapm, SM.NT)
            scale = max(abs(v) for v in ym)
            cn = max(max(abs(cs[i][SM.NT]), abs(cs[i][SM.NT - 1])) for i in range(4))
            h = min((SM.TOL * scale / cn) ** (mpf(1) / SM.NT) * mpf('0.8'), mpf(1), Tm - tm)
            ym = [SM.horner(cs[i], h) for i in range(4)]
            tm += h
        out[Tk] = ym
    return out
kapm = 1 / (mpf(int(VI.C1.p)) / int(VI.C1.q))
ref = mp_solve(kapm)
bad = mp_solve(kapm + mpf(10) ** -30)
allin = True; ctrl_out = False; worst = [0.0]
ctx.prec = 320
for Tk in times:
    for i, name in enumerate("UVQP"):
        r = arb(mp.nstr(ref[Tk][i], 75)); b = arb(mp.nstr(bad[Tk][i], 75))
        e = encl[Tk][i]
        dist = abs(r - arb(e.mid()))
        # the mpmath value itself carries a numerical error of order 1e-65 or less
        inside = bool(dist < arb(e.rad()) + arb(fmpq(1, 10**64)))
        allin &= inside
        ratio = float(dist.mid()) / float(e.rad())
        worst[0] = max(worst[0], ratio)
        if not e.overlaps(b):
            ctrl_out = True
    print(f"xi={int(Tk)}: U in {encl[Tk][0].str(20, radius=True)}  mpmath U={mp.nstr(ref[Tk][0], 22)}  width(max) = "
          f"{max(float(e.rad()) for e in encl[Tk]):.1e}")
print("max |mpmath - centre| / radius over all components:", f"{worst[0]:.2e}")
print("PASS: all mpmath values inside the enclosures" if allin else "FAIL: an mpmath value is outside")
print("negative control (kappa + 1e-30 detected as outside):", "PASS" if ctrl_out else "FAIL")
