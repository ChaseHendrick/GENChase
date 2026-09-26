# rest_eigen.py -- Task 1: the rest state and the eigenvalues of the wave ODE at rest, rigorously
# (python-flint arb ball arithmetic), for ALL c in [c1, c2] (kappa = 1/c taken as one ball).
# Run:  python3 rest_eigen.py      (under 1 second)
# Independent of papers/nf-pulse/code/.
from flint import arb, fmpq, ctx, arb_mat
from common import BETA, THETA, EPS, C1, C2, consts

ctx.prec = 256
A, S0, s = consts()
kap = (1 / arb(C1)).union(1 / arb(C2))          # contains 1/c for every c in [c1, c2]
eps = arb(EPS)
print("kappa ball:", kap.str(30, radius=True))

# ---- rest state -------------------------------------------------------------------------
# Equilibria: V' = eps kappa U = 0 forces U = 0 (eps kappa != 0, gamma = 0); then P = 0,
# Q = S(0) from P' = 0, and V = Q - U = S(0) from U' = 0.  So the rest state is unique:
print("rest: U0 = 0 exactly, V0 = Q0 = S(0) =", S0.str(40, radius=True), ", P0 = 0")
print("S'(0) = beta S0 (1-S0) =", s.str(40, radius=True), "  < 1:", bool(s < 1))

# ---- characteristic polynomial ---------------------------------------------------------
# From lam U = kappa(Q-U-V), lam V = eps kappa U, lam Q = P, lam P = Q - s U:
# p(lam) = lam^4 + kappa lam^3 + (eps kappa^2 - 1) lam^2 + kappa (s - 1) lam - eps kappa^2.
co = [-eps * kap**2, kap * (s - 1), eps * kap**2 - 1, kap, arb(1)]   # ascending
def p(l):
    r = arb(0)
    for cc in reversed(co):
        r = r * l + cc
    return r
def dp(l):
    return 4 * l**3 + 3 * kap * l**2 + 2 * (eps * kap**2 - 1) * l + kap * (s - 1)

# Cross-check the hand derivation against the characteristic polynomial computed by arb
def J(k):
    return arb_mat([[-k, -k, k, 0], [eps * k, 0, 0, 0], [0, 0, 0, 1], [-s, 0, 1, 0]])
cp = J(kap).charpoly().coeffs()           # det(lam I - J), ascending coefficients
print("charpoly of J (arb) overlaps the hand-derived p coefficientwise:",
      all(cp[i].overlaps(co[i]) for i in range(5)))

# Sign changes: isolate four real roots in disjoint intervals (valid for every kappa in the ball)
brk = [fmpq(-2), fmpq(-1), fmpq(-3, 4), fmpq(-1, 4), fmpq(-1, 20), fmpq(1, 2), fmpq(3, 2)]
signs = []
for b in brk:
    v = p(arb(b))
    assert v > 0 or v < 0, ("sign undetermined at", b)
    signs.append(1 if v > 0 else -1)
print("signs of p at", [str(b) for b in brk], ":", signs)
iv = [(brk[i], brk[i + 1]) for i in range(len(brk) - 1) if signs[i] != signs[i + 1]]
assert len(iv) == 4
print("four sign changes -> four distinct real roots, one in each of", [(str(a), str(b)) for a, b in iv])

# Refine each root by bisection on the sign (rigorous: IVT per endpoint sign, all kappa at once)
def refine(a, b, n=240):
    sa = p(arb(a)) > 0
    for _ in range(n):
        m = (a + b) / 2
        v = p(arb(m))
        if v > 0 or v < 0:
            if (v > 0) == sa: a = m
            else: b = m
        else:
            break  # kappa-ball width reached
    return arb(a).union(arb(b))
roots = [refine(a, b) for a, b in iv]
for r in roots:
    print("  root:", r.str(35, radius=True))
npos = sum(1 for r in roots if r > 0); nneg = sum(1 for r in roots if r < 0)
print("positive:", npos, " negative:", nneg, "(degree 4, so these are all eigenvalues)")
assert npos == 1 and nneg == 3
lam = [r for r in roots if r > 0][0]
# Unique positive root also follows from Descartes: coefficient signs + + - - - (one change),
# since eps kappa^2 - 1 < 0 and s - 1 < 0:
print("Descartes signs:", [bool(co[4] > 0), bool(co[3] > 0), bool(co[2] < 0), bool(co[1] < 0), bool(co[0] < 0)])

# Unstable eigenvector (normalised U-component 1)
v = [arb(1), eps * kap / lam, -s / (lam**2 - 1), -s * lam / (lam**2 - 1)]
print("unstable eigenvector (U,V,Q,P):")
for x in v: print("  ", x.str(30, radius=True))
res = J(kap) * arb_mat([[x] for x in v]) - arb_mat([[lam * x] for x in v])
print("residual J v - lam v contains 0 in every entry:", all(res[i, 0].contains(0) for i in range(4)))
print("U component of v is positive: leaving along +v makes U increase.")
# Point values used by the integrator
for name, c in (("c1", C1), ("c2", C2)):
    kap = 1 / arb(c)
    co = [-eps * kap**2, kap * (s - 1), eps * kap**2 - 1, kap, arb(1)]
    rr = [refine(a, b) for a, b in iv]
    print(name, "eigenvalues:", [r.str(30, radius=True) for r in rr])
