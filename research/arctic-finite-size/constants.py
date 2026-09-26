"""The n^(-2/3) constants from the edge of the one-line ensembles, integrated along the lines.

For an M-point orthogonal polynomial ensemble whose Jacobi coefficients vary on the scale of n,
    a_k ~ n A(k/n),   b_k^2 ~ n^2 B(k/n),
the particle density is the average over s in (0, M/n) of arcsine laws on [A - 2 sqrt B, A + 2 sqrt B],
so when the top edge E(s) = A(s) + 2 sqrt B(s) increases on (0, gamma), gamma = M/n, the top particle
sits near n E(gamma) and the density vanishes there as (1/pi) sqrt(E - x) / (E'(gamma) B(gamma)^(1/4)).
Matching to the Airy kernel's density sqrt(-s)/pi gives the Tracy-Widom scale
    x_max ~ n E(gamma) + sigma n^(1/3) chi,  sigma = E'(gamma)^(2/3) B(gamma)^(1/6),  chi ~ TW2.
For the Krawtchouk ensemble this is Johansson's (PTRF 123 (2002)) eq. (2.72) exactly; at the Aztec axis
line it is his 2^(-5/6) (Ann. Probab. 33 (2005), Theorem 1.1). For the hexagons it is applied to
Johansson's Hahn ensembles line by line. Integration by mpmath.
"""
import mpmath as mp

mp.mp.dps = 30
TW2_MEAN = mp.mpf('-1.7710868074116012')   # Bornemann (2010); tw2.py reproduces 13 digits


# ---------------------------------------------------------------- Aztec diamond
def aztec_sigma(g):
    return (1 - 2 * g) ** (mp.mpf(2) / 3) / (2 * (g * (1 - g)) ** (mp.mpf(1) / 6))


def aztec_constant():
    """q(n) = 1 - pi/4 + C n^(-2/3) + ...; C = 4 (-E TW2) int_0^(1/2) sigma = -E TW2 2^(-2/3) Gamma(5/6)^2/Gamma(5/3)."""
    I_num = mp.quad(aztec_sigma, [0, mp.mpf(1) / 4, mp.mpf(1) / 2])
    I_closed = mp.cbrt(2) * mp.beta(mp.mpf(5) / 6, mp.mpf(5) / 6) / 8
    C = -TW2_MEAN * mp.mpf(2) ** (-mp.mpf(2) / 3) * mp.gamma(mp.mpf(5) / 6) ** 2 / mp.gamma(mp.mpf(5) / 3)
    return {'integral_numeric': I_num, 'integral_closed': I_closed, 'C': C, 'C_from_integral': 4 * -TW2_MEAN * I_num}


# ---------------------------------------------------------------- hexagons
def hahn_AC(s, alpha, beta, Np):
    """Scaled recurrence coefficients of Johansson's Hahn weight (kernels.hahn_jacobi), per n."""
    aK, bK = beta, alpha
    S = aK + bK
    A = (s + S) * (s + aK) * (Np - s) / (2 * s + S) ** 2
    C = s * (s + S + Np) * (s + bK) / (2 * s + S) ** 2
    return A, C


def hahn_edge(s, alpha, beta, Np):
    A, C = hahn_AC(s, alpha, beta, Np)
    return (mp.sqrt(A) + mp.sqrt(C)) ** 2


def line_params(a, b, c, mu):
    """Johansson's line mu = m/n of the (a, b, c) hexagon, scaled: gamma' = N/n, L' = holes/n,
    alpha' = |a - mu|, beta' = |b - mu|."""
    al = -mu if mu <= b else mu - 2 * b
    be = mu + 2 * c if mu <= a else 2 * a - mu + 2 * c
    g = (be - al) / 2
    return g, g - c, abs(a - mu), abs(b - mu)


def hex_line(a, b, c, mu):
    """(frozen density, scale sigma, top edge, wall) for the top hole on line mu of F(a, b, c).
    The support of the hole density is the union over s in (0, L') of the arcsine intervals, so its
    top is max_s E(s). Where E increases up to s = L' the top is E(L') and the edge is soft with the
    scale sigma above; where the maximum is interior or reaches the wall gamma', the zone of packed
    particles above the top hole is empty on that line to leading order (sigma = 0 is returned)."""
    g, L, al, be = line_params(a, b, c, mu)
    Ef = lambda s: hahn_edge(s, al, be, g)
    EL = Ef(L)
    grid = [L * k / 64 for k in range(1, 65)]
    Etop = max([Ef(x) for x in grid])
    dE = mp.diff(Ef, L)
    if dE <= 0 or Etop > EL * (1 + mp.mpf(10) ** -20) or EL >= g:
        return mp.mpf(0), mp.mpf(0), min(Etop, g), g
    A, C = hahn_AC(L, al, be, g)
    sig = dE ** (mp.mpf(2) / 3) * (A * C) ** (mp.mpf(1) / 6)
    return g - EL, sig, EL, g


def zone_end(a, b, c):
    """The line where the zone of F(a, b, c) closes (the tangency point): the largest mu in (0, a)
    with E(L') < gamma' and E increasing at L', by bisection on the sign change."""
    f = lambda mu: hex_line(a, b, c, mu)[0] > 0
    lo, hi = mp.mpf(a) / 10 ** 6, mp.mpf(a) * (1 - mp.mpf(10) ** -6)
    assert f(lo)
    if f(hi):
        return hi
    for _ in range(80):
        mid = (lo + hi) / 2
        if f(mid):
            lo = mid
        else:
            hi = mid
    return lo


def F_integrals(a, b, c):
    """F(a, b, c) = sum_{m=1}^{a} E[gamma_m - Z_m] ~ n^2 I0 + n^(4/3) (-E TW2) I1 + ..., with a, b, c
    the side ratios; the integrals run over the lines on which the zone is open."""
    end = zone_end(a, b, c)
    pts = [end * k / 8 for k in range(9)]
    I0 = mp.quad(lambda mu: hex_line(a, b, c, mu)[0], pts)
    I1 = mp.quad(lambda mu: hex_line(a, b, c, mu)[1], pts)
    return I0, I1, end


def hexagon_constant(a, b, c):
    """free(n) = limit + C n^(-2/3) + ...: free = 1 - 2 (F(a,c,b) + F(b,a,c) + F(a,b,c)) / (ab + bc + ca)."""
    tot0 = 0; tot1 = 0; parts = []
    for (x, y, z) in [(a, c, b), (b, a, c), (a, b, c)]:
        I0, I1, end = F_integrals(x, y, z)
        parts.append((I0, I1, end)); tot0 += I0; tot1 += I1
    S = a * b + b * c + c * a
    limit = 1 - 2 * tot0 / S
    C = -2 * (-TW2_MEAN) * tot1 / S
    return {'limit': limit, 'C': C, 'parts': parts}


if __name__ == '__main__':
    r = aztec_constant()
    for k, v in r.items():
        print('aztec', k, mp.nstr(v, 25))
    for box in [(1, 1, 1), (3, 5, 6)]:
        h = hexagon_constant(*[mp.mpf(x) for x in box])
        print('hexagon', box, 'limit', mp.nstr(h['limit'], 15), 'C', mp.nstr(h['C'], 15))
