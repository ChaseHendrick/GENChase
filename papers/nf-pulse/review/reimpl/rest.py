"""Task 1 (RIGOROUS, ball arithmetic): rest state and its eigenvalues for c in [c1, c2], and an
argument for all c > 0.  Run: python3 rest.py"""
import json
from flint import arb, arb_mat, arb_poly, ctx
import nfmodel as M

ctx.prec = 256
p = M.params()
out = {}

R = M.rest(p); s = M.slope0(p)
out['rest'] = [r.str(30) for r in R]
out['S0'] = R[1].str(30); out['s=S_prime(0)'] = s.str(30)
assert s < 1 and s > 0, 's in (0,1) not certified'
out['s<1'] = True
# residual of the vector field at rest (must contain 0)
k = 1/M.c1()
F = [k*(R[2]-R[0]-R[1]), p['eps']*k*(R[0]-p['gamma']*R[1]), R[3], R[2]-M.S(R[0], p)]
assert all(f.contains(0) for f in F)

# check the hand-derived characteristic polynomial against det(lambda I - J) via arb_mat.charpoly
for cball, name in [(M.c1(), 'c1'), (M.c2(), 'c2'), (M.c_interval(), '[c1,c2]')]:
    k = 1/cball
    J = M.jacobian(k, p)
    cp = J.charpoly()                       # arb_poly, monic det(x I - J)
    mine = M.charpoly_coeffs(k, p)
    for i in range(5):
        assert cp[i].overlaps(mine[i]), (i, cp[i], mine[i])
    # isolate four real roots by sign changes; degree 4 => each interval holds exactly one simple root
    grid = [arb(x) for x in ('-1.3', '-1.0', '-0.7', '-0.4', '-0.2', '-0.05', '0.5', '1.2')]
    brackets = [('-1.3', '-1.0'), ('-0.7', '-0.4'), ('-0.2', '-0.05'), ('0.5', '1.2')]
    roots = []
    for a, b in brackets:
        lo, hi = arb(a), arb(b)
        pa, pb = M.peval(mine, lo), M.peval(mine, hi)
        assert (pa < 0 and pb > 0) or (pa > 0 and pb < 0), (a, b, pa, pb)
        # refine by bisection with certified signs (k may be a ball: sign must hold for all k in it)
        sa = 1 if pa > 0 else -1
        for _ in range(400):
            m = (lo+hi)/2
            m = arb(m.mid())
            pm = M.peval(mine, m)
            if pm > 0: sm = 1
            elif pm < 0: sm = -1
            else: break
            if sm == sa: lo = m
            else: hi = m
        roots.append(lo.union(hi))
    J2 = M.jacobian(k, p)
    # eigenvector check: (J - lam) v contains 0
    for lam in roots:
        v = M.eigvec(lam, k, p)
        Jv = [sum((J2[i, j]*v[j] for j in range(4)), arb(0)) - lam*v[i] for i in range(4)]
        assert all(x.contains(0) for x in Jv)
    out[name] = dict(kappa=k.str(30), eigenvalues=[r.str(40) for r in roots],
                     unstable_positive=bool(roots[3] > 0), stable_negative=[bool(r < 0) for r in roots[:3]],
                     all_real=True, eigenvalue_radius=[float(r.rad()) for r in roots])

out['all_c_argument'] = (
 "p(l) = l^4 + k l^3 + (eps k^2 - 1) l^2 + k (s-1) l - eps k^2, k = 1/c > 0, 0 < s < 1 (certified). "
 "Descartes: coefficient signs +,+,?,-,- have exactly one sign change whatever the sign of eps k^2 - 1, "
 "so exactly one positive real root. Imaginary axis: p(i w) = (eps k^2 - w^2)(-w^2 - 1) + i k w (s - 1 - w^2); "
 "the imaginary part vanishes only at w = 0 (since s < 1), where p(0) = -eps k^2 != 0. So no root on the imaginary "
 "axis for any k > 0. Roots of a monic quartic move continuously with k, so the number of roots with Re > 0 is "
 "constant on (0, inf); it is 1 at c in [c1, c2] (certified above: one positive and three negative real roots). "
 "Hence for every c > 0: exactly one eigenvalue with Re > 0 (real, simple) and three with Re < 0. "
 "Real-ness of the three stable ones is certified only on [c1, c2].")
print(json.dumps(out, indent=1))
json.dump(out, open('rest_result.json', 'w'), indent=1)
