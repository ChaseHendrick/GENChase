# kappa_run.py -- step 2(a): ONE validated run for ALL c in [c_lo, c_hi] at once (kappa as a set),
# from the start set on the a>0 branch of the unstable manifold to the common time T; then the
# enclosure of the block coordinates (a, b) at T, and the verdict "inside the interior of N for all c".
#
# Run:   python3 kappa_run.py                  (c in [c1, c2], T = 170; about 40 s)
#        python3 kappa_run.py T                (another landing time T, an integer)
#        python3 kappa_run.py T lo hi          (NEGATIVE CONTROL: c in [lo, hi] given as decimals,
#                                               e.g. 170 1.1027477 1.1027478; must fail)
#        python3 kappa_run.py T lo hi Lexp     (same, with cone slope L = 2^-Lexp in the start set, so that a
#                                               wider set passes the start lemma and fails later, at T)
#
# Method (BLOCK.md section 3): for every kappa in [kap0 - w, kap0 + w] the solution from the start
# set satisfies |x_kappa(t) - y(t) - (kappa - kap0) d(t)| <= z(t); y, d are exact centres for the
# solution and its kappa-derivative, z a rigorous bound (comparison principle with the Metzler
# majorant over the kappa set, forcing = defect of the solution polynomial + w * defect of the
# variational polynomial + the exact second-order kappa terms).  At T the block coordinates are
# enclosed as Ti y + [-w, w] (Ti d) + Ti [-z, z].
import sys, time
from flint import arb, fmpq
import blk_common as B

def run(clo, chi, T, R=fmpq(1, 80), log=print, logfrom=140, Lexp=150):
    t0 = time.time()
    y, d, z, kap0, w = B.start_kappa_set(clo, chi, log, Lexp=Lexp, rbexp=Lexp + 165)
    Tb, Tib_q, _ = B.block_matrix(1 / arb(B.C1))
    Tib = B.VI.arb_mat(Tib_q)
    log(f"  kappa set: centre kap0 = {arb(kap0).str(35)}, half width w = {arb(w).str(5)}")
    t = fmpq(0); n = 0; nextlog = 0
    while t < T:
        y, d, z, h, tube = B.advance8(y, d, z, kap0, w, hcap=T - t)
        t += h; n += 1
        if float(t) >= nextlog or t == T:
            zb = B.to_block(Tib, y, d, z, w)
            bn = B.bnorm_upper(zb)
            log(f"  t={float(t):8.3f} n={n:5d} h={float(h):.4f} U={float(y[0].mid()): .5e} |d|max={max(abs(float(v.mid())) for v in d):.3e}"
                f" zmax={max(float(v.mid()) for v in z):.2e}  a in {zb[0].str(6, radius=True)}  |b|<= {float(bn.upper()):.5f}"
                f"  [{time.time()-t0:.0f}s]")
            nextlog += 10 if float(t) < logfrom else 1
    zb = B.to_block(Tib, y, d, z, w)
    bn = B.bnorm_upper(zb)
    Rb = arb(R)
    inside = bool(abs(zb[0]) < Rb) and bool(bn < Rb)
    log(f"  AT T = {T}: a in {zb[0].str(12, radius=True)};  b = {[v.str(8, radius=True) for v in zb[1:]]}")
    log(f"  |a| < r = {R}: {bool(abs(zb[0]) < Rb)};  |b|_2 <= {bn.upper().str(8)} < r: {bool(bn < Rb)}")
    log(f"  VERDICT: {'for ALL c in the set the orbit is in the INTERIOR of N at T' if inside else 'NOT shown inside N at T'}"
        f"   (steps {n}, {time.time()-t0:.0f} s)")
    return inside, (y, d, z, kap0, w)

if __name__ == "__main__":
    args = sys.argv[1:]
    T = fmpq(int(args[0])) if args else fmpq(170)
    if len(args) >= 3:
        from fractions import Fraction
        lo = Fraction(args[1]); hi = Fraction(args[2])
        clo, chi = fmpq(lo.numerator, lo.denominator), fmpq(hi.numerator, hi.denominator)
        print(f"== NEGATIVE CONTROL run: c in [{args[1]}, {args[2]}], T = {T}")
    else:
        clo, chi = B.C1, B.C2
        print(f"== c in [c1, c2] = [{B.C1}, {B.C2}], T = {T}")
    try:
        ok, _ = run(clo, chi, T, Lexp=int(args[3]) if len(args) >= 4 else 150)
    except (RuntimeError, AssertionError) as e:
        print("  FAILED with:", repr(e)); ok = False
    print("RESULT:", "PASS" if ok else "FAIL")
