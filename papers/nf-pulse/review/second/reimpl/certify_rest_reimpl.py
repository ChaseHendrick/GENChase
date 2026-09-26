"""Task 1 (rigorous, ball arithmetic): rest state and its four eigenvalues for every c in [c1, c2].

Argument.
 * Equilibria: V' = eps kappa U = 0 forces U = 0; P = Q' = 0; P' = 0 forces Q = S(0); U' = 0 forces
   V = Q - U = S(0). So the rest state (0, S(0), S(0), 0) is the unique equilibrium (hence isolated),
   for every c > 0.
 * Characteristic polynomial (by hand): p(l) = l^4 + k l^3 + (eps k^2 - 1) l^2 + k (s - 1) l - eps k^2,
   s = S'(0), k = 1/c.  Checked here against arb_mat.charpoly (the balls must overlap).
 * Root isolation: every root satisfies |l| < 1 + max|a_i| (Cauchy bound). p is evaluated in ball
   arithmetic with kappa enclosing 1/c for ALL c in [c1, c2] at once; a strict sign at a point x holds
   for every such c. Four strict sign changes give four distinct real roots for every c in [c1, c2],
   which is all of them. The brackets are then bisected while the signs stay certified.
"""
from flint import arb, arb_mat, fmpq, ctx
import nfr

ctx.prec = nfr.PREC


def cball():
    lo, hi = arb(nfr.C1_Q), arb(nfr.C2_Q)
    return lo.union(hi)


def sign_at(co, x):
    v = nfr.peval(co, arb(x))
    if v > 0:
        return 1
    if v < 0:
        return -1
    return 0


def isolate(co, lo=fmpq(-3), hi=fmpq(3), n=600):
    pts = [lo + (hi - lo) * fmpq(i, n) for i in range(n + 1)]
    sg = [sign_at(co, p) for p in pts]
    br = []
    for i in range(n):
        if sg[i] != 0 and sg[i + 1] != 0 and sg[i] != sg[i + 1]:
            br.append([pts[i], pts[i + 1], sg[i]])
    return br, sg


def refine(co, a, b, sa, iters=400):
    for _ in range(iters):
        m = (a + b) / 2
        sm = sign_at(co, m)
        if sm == 0:
            break
        if sm == sa:
            a = m
        else:
            b = m
    return a, b


def run(label, cq_or_ball):
    kap = 1 / cq_or_ball if isinstance(cq_or_ball, arb) else 1 / arb(cq_or_ball)
    co = nfr.charpoly_coeffs(kap)
    # cross-check against the matrix characteristic polynomial
    cp = nfr.jac_rest(kap).charpoly()
    cpl = [cp[i] for i in range(5)] if hasattr(cp, '__getitem__') else None
    ok = all(co[i].overlaps(cpl[i]) for i in range(5))
    cauchy = 1 + max(abs(c).upper() for c in co[:4])
    br, sg = isolate(co)
    print(f"[{label}] charpoly by hand overlaps arb_mat.charpoly: {ok}; Cauchy root bound < {cauchy.str(5)}")
    print(f"[{label}] certified sign changes on [-3,3]: {len(br)}; zero-containing grid values: {sg.count(0)}")
    assert ok and len(br) == 4 and cauchy < 3
    roots = []
    for a, b, sa in br:
        a2, b2 = refine(co, a, b, sa)
        r = arb(a2).union(arb(b2))
        roots.append(r)
        print(f"   root in [{arb(a2).str(30, radius=False)}, {arb(b2).str(30, radius=False)}]  width {float(b2 - a2):.3e}")
    pos = [r for r in roots if r > 0]
    neg = [r for r in roots if r < 0]
    print(f"[{label}] positive real: {len(pos)}, negative real: {len(neg)} (all four real, simple)")
    return roots


if __name__ == "__main__":
    y0 = nfr.S0()
    s = nfr.s1()
    print("S(0)  =", y0.str(40))
    print("S'(0) =", s.str(40), " < 1:", bool(s < 1))
    print("rest = (0, S(0), S(0), 0); unique equilibrium for every c > 0 (see docstring)")
    # residual of the field at rest, as a check of the algebra
    kap = 1 / arb(nfr.C1_Q)
    r = [kap * (y0 - 0 - y0), nfr.EPS * kap * 0, arb(0), y0 - nfr.S(arb(0))]
    print("field at rest (c1):", [x.str(5) for x in r])
    run("c in [c1,c2]", cball())
    run("c = c1", nfr.C1_Q)
    run("c = c2", nfr.C2_Q)
