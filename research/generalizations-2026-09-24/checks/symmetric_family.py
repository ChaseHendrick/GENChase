"""Two equal circulations (1, -gamma, 1) in the alpha-models: exact results for alpha = 2 and the SQG collapse interval.
Kernel dz_j/dt = (i/2pi) sum_k G_k (z_j - z_k)|z_j - z_k|^(-alpha-2); P = |Im kappa|/(2|Re kappa|).
Sides: r2 = 1 joins the two equal vortices, r1 and r3 are the other two. By Lemma 2 of the alpha-model draft the
family satisfies r1^(-alpha) + r3^(-alpha) = r1^2 + r3^2."""
import sympy as sp, mpmath as mm
mm.mp.dps = 40
out = []
def say(s): print(s); out.append(s)

# 1. alpha = 2: the family is r1 r3 = 1; with w = r1^2 + r3^2 = 1/gamma, P^2 is rational in w (and in gamma).
u, w, g, y = sp.symbols('u w gamma y', positive=True)
U = [u, sp.Integer(1), 1 / u]
S = sum(U[i] * (U[(i + 2) % 3] ** 2 + U[(i + 1) % 3] ** 2) / (U[(i + 2) % 3] ** 2 - U[(i + 1) % 3] ** 2) for i in range(3))
A2 = (2 * (U[0] * U[1] + U[1] * U[2] + U[2] * U[0]) - (U[0] ** 2 + U[1] ** 2 + U[2] ** 2)) / 16
P2w = (w + 1) * (w ** 2 - 2 * w + 2) ** 2 / (4 * w ** 2 * (w ** 2 - 4) * (3 - w))
P2g = (1 + g) * (2 * g ** 2 - 2 * g + 1) ** 2 / (4 * (1 - 2 * g) * (1 + 2 * g) * (3 * g - 1))
f = [x ** -2 for x in U]; G = [U[i] / (f[(i + 1) % 3] - f[(i + 2) % 3]) for i in range(3)]
say(f"[1] alpha = 2: P^2(u) - P^2(w = u + 1/u) = {sp.simplify(S ** 2 / (64 * A2) - P2w.subs(w, u + 1 / u))}; "
    f"-G2/G1 - 1/(u + 1/u) = {sp.simplify(-G[1] / G[0] - 1 / (u + 1 / u))}; P^2(w) - P^2(gamma = 1/w) = {sp.simplify(P2w - P2g.subs(g, 1 / w))}")
d = sp.factor(sp.numer(sp.together(sp.diff(P2w, w))))
wr = [r for r in sp.Poly(4 * w ** 4 - 7 * w ** 3 - 8 * w ** 2 + 12, w).all_roots() if r.is_real and 2 < r < 3][0]
say(f"[1] dP^2/dw numerator {d}; minimum at w = {sp.N(wr, 20)}, gamma = {sp.N(1 / wr, 20)}, P_min = {sp.N(sp.sqrt(P2w.subs(w, wr)), 30)}; "
    f"minimal polynomial of P_min: {sp.minimal_polynomial(sp.sqrt(P2w.subs(w, wr)), y)}")

# 2. Biot-Savart check of the alpha = 2 formula
def bs_P(G, z, al):
    zc = sum(a * b for a, b in zip(G, z)) / sum(G)
    v = [1j / (2 * mm.pi) * sum(G[k] * (z[j] - z[k]) * abs(z[j] - z[k]) ** (-al - 2) for k in range(3) if k != j) for j in range(3)]
    ks = [v[j] / (z[j] - zc) for j in range(3)]
    return abs(ks[0].imag) / (2 * abs(ks[0].real)), max(abs(k - ks[0]) for k in ks) / abs(ks[0])
worst = 0
for gv in ['0.34', '0.37', '0.40', '0.45', '0.49']:
    gv = mm.mpf(gv); wv = 1 / gv; uu = (wv + mm.sqrt(wv * wv - 4)) / 2; r1, r3 = mm.sqrt(uu), 1 / mm.sqrt(uu)
    x = (r3 ** 2 - r1 ** 2 + 1) / 2; z = [mm.mpc(0), mm.mpc(x, mm.sqrt(r3 ** 2 - x ** 2)), mm.mpc(1)]
    P, spread = bs_P([mm.mpf(1), -gv, mm.mpf(1)], z, 2)
    Pf = mm.sqrt((1 + gv) * (2 * gv ** 2 - 2 * gv + 1) ** 2 / (4 * (1 - 2 * gv) * (1 + 2 * gv) * (3 * gv - 1)))
    worst = max(worst, abs(P - Pf) / Pf, spread)
say(f"[2] alpha = 2, five values of gamma in (1/3, 1/2): Biot-Savart P equals the formula to {mm.nstr(worst, 3)} relative "
    f"(self-similarity spread included); gamma = 1/3 is the collinear shape with sides phi, 1, 1/phi")

# 3. SQG (alpha = 1): the symmetric collapse interval (gamma*, 1/2) of Badin-Barry, with gamma* exact
x, gm = sp.symbols('x gm', positive=True)
q = sp.factor(sp.expand((1 / (1 + x) + 1 / x - ((1 + x) ** 2 + x ** 2)) * x * (1 + x)))
xr = [r for r in sp.Poly(-q, x).all_roots() if r.is_real and r > 0][0]
r = [1 + x, sp.Integer(1), x]; f = [t ** -3 for t in r]
G = [r[i] ** 2 / (f[(i + 1) % 3] - f[(i + 2) % 3]) for i in range(3)]
gstar = (-G[1] / G[0]).subs(x, xr)
say(f"[3] SQG collinear endpoint: r1 = 1 + x, r3 = x with {q} = 0, x = {sp.N(xr, 20)}; gamma* = {sp.N(gstar, 30)}, "
    f"minimal polynomial {sp.minimal_polynomial(gstar, gm)} (Badin-Barry, Chen-Liu: 0.387464)")
open(__file__.replace('.py', '.out'), 'w').write('\n'.join(out) + '\n')
