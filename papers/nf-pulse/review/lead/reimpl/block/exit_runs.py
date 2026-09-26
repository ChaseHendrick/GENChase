# exit_runs.py -- steps 2(b), 2(c): validated point runs at c1 and c2 continued past the common time
# T, checking that every step enclosure that meets [T, T'] lies in N and that at T' the state is in
# the cone K- = {a < -|b|_2} (c1) resp. K+ = {a > |b|_2} (c2) inside N.  By the block lemma the orbit
# then leaves N through a = -r (c1) resp. a = +r (c2), and not before T'.
# Also a consistency check of the whole-interval run: the c1 point enclosure at T must be contained in
# the kappa-set enclosure y + (kappa_c1 - kap0) d +- z.
#
# Run:   python3 exit_runs.py                 (c1 and c2, T = 170; about 2 minutes)
#        python3 exit_runs.py neg             (NEGATIVE CONTROL: c = c1 + 30e-27 < c* in the role of c2,
#                                              and c = c1 + 40e-27 > c* in the role of c1; both must fail;
#                                              about 90 s)
import sys, time
from flint import arb, fmpq
import blk_common as B

R = fmpq(1, 80)
T = fmpq(170)

def exit_run(name, c, want, log=print, tmax=200):
    """want = -1 (expect K-) or +1 (expect K+).  Returns (ok, sign seen)."""
    t0 = time.time()
    y, d, z, kap0, w = B.start_kappa_set(c, c, log=lambda m: None)
    Tb, Tib_q, _ = B.block_matrix(1 / arb(B.C1))
    Tib = B.VI.arb_mat(Tib_q)
    Rb = arb(R)
    t = fmpq(0); n = 0; ninside = 0
    state_T = None
    while t < tmax:
        hmax = fmpq(1, 8) if t >= T - 5 else fmpq(1, 2)
        hcap = T - t if t < T else None
        y1, d1, z1, h, tube = B.advance8(y, d, z, kap0, w, hmax=hmax, hcap=hcap)
        t1 = t + h; n += 1
        if t1 > T or (t1 == T and False):
            pass
        if t1 == T:
            state_T = (y1, d1, z1)
        if t1 > T:
            # the step [t, t1] meets (T, t1]: its tube must lie in N
            tb = B.tube_block(Tib, tube)
            tin = bool(abs(tb[0]) < Rb) and bool(B.bnorm_upper(tb) < Rb)
            if not tin:
                log(f"  {name}: step [{float(t):.4f}, {float(t1):.4f}] tube NOT shown inside N: a in {tb[0].str(6, radius=True)}, |b|<={float(B.bnorm_upper(tb).upper()):.5f}")
                return False, 0, None
            ninside += 1
            zb = B.to_block(Tib, y1, d1, z1, w)
            bn = B.bnorm_upper(zb)
            inN = bool(abs(zb[0]) < Rb) and bool(bn < Rb)
            if inN and bool(zb[0] > bn):
                sgn = +1
            elif inN and bool(zb[0] < -bn):
                sgn = -1
            else:
                sgn = 0
            if n % 4 == 0 or sgn:
                log(f"  {name}: t={float(t1):8.4f} a in {zb[0].str(10, radius=True)}  |b|_2 <= {float(bn.upper()):.6f}")
            if sgn:
                ok = (sgn == want)
                log(f"  {name}: at T' = {float(t1):.4f} ({t1}) the state is in K{'+' if sgn > 0 else '-'} inside N; "
                    f"all {ninside} step tubes on (T, T'] inside N.  Expected K{'+' if want > 0 else '-'}: {'YES' if ok else 'NO'}"
                    f"   ({n} steps, {time.time()-t0:.0f} s)")
                return ok, sgn, state_T
        y, d, z, t = y1, d1, z1, t1
    log(f"  {name}: no cone entry before t = {tmax}")
    return False, 0, state_T

def contains(big, small):
    return all(b.contains(s) for b, s in zip(big, small))

if __name__ == "__main__":
    t00 = time.time()
    if sys.argv[1:] == ["neg"]:
        print("== NEGATIVE CONTROLS: the end conditions must FAIL for speeds on the wrong side of c*")
        ok_a, s_a, _ = exit_run("c1+30e-27 as 'c2'", B.C1 + fmpq(30, 10**27), +1)
        ok_b, s_b, _ = exit_run("c1+40e-27 as 'c1'", B.C1 + fmpq(40, 10**27), -1)
        print("RESULT:", "controls FAIL as they should" if not (ok_a or ok_b) else "a control PASSED (bad)")
        sys.exit()
    print(f"== exit runs, block r = {R}, common time T = {T}")
    ok1, s1, st1 = exit_run("c1", B.C1, -1)
    ok2, s2, st2 = exit_run("c2", B.C2, +1)
    # consistency with the whole-interval run
    import kappa_run
    print("  re-running the whole-interval run to T for the consistency check ...")
    inside, (y, d, z, kap0, w) = kappa_run.run(B.C1, B.C2, T, log=lambda m: None)
    for name, c, st in (("c1", B.C1, st1), ("c2", B.C2, st2)):
        dk = arb(1 / c - kap0)
        big = [y[i] + dk * d[i] + arb(0, z[i]) for i in range(4)]
        small = [arb(st[0][i], st[2][i]) for i in range(4)]
        print(f"  {name}: point enclosure at T contained in the kappa-set enclosure: {contains(big, small)}"
              f"  (point radius {max(float(v.rad()) for v in small):.1e}, set radius {max(float(v.rad()) for v in big):.1e})")
    print(f"RESULT: c1 -> K- : {ok1};  c2 -> K+ : {ok2};  whole interval inside N at T: {inside}   ({time.time()-t00:.0f} s)")
