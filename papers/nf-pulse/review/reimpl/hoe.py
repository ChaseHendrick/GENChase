"""Validated interval Taylor integrator with a HIGH-ORDER a priori ENCLOSURE (Nedialkov-Jackson style),
no Lohner/QR, no Picard low-order enclosure.  Written for this review.

One step from a box z_n (balls) with step h and order N:
  1. coefficients a_i = z^[i](z_n), i < N, in ball arithmetic (enclose all points of z_n);
  2. B0 = sum_{i<N} [0, h^i] a_i; trial box Bt = B0 inflated;
  3. remainder coefficient R = z^[N](Bt) (N-th Taylor coefficient through any point of Bt);
  4. B = B0 + [0, h^N] R.  If B is in the interior of Bt, then for every t in [0, h] the solution through
     every point of z_n exists and stays in B (Taylor-Lagrange: while the orbit stays in Bt, x(t) is in B,
     which is inside the interior of Bt, so it cannot reach the boundary of Bt first);
  5. z_{n+1} = sum_{i<N} h^i a_i + h^N z^[N](B)   (Lagrange remainder componentwise, tau in (0,h)).
The a priori set is validated by an order-N remainder, so a loose Bt still gives a tiny remainder.
"""
from flint import arb, ctx

def unit_interval():
    return arb(0).union(arb(1))

def horner(coefs, h):
    r = arb(0)
    for a in reversed(coefs):
        r = r*h + a
    return r

def step(sys, zn, N, h):
    coef = sys.taylor(zn, N)
    I = unit_interval()
    B0 = []
    for i in range(4):
        c = coef[i]
        # sum_{j<N} [0,h^j] c_j : evaluate with t = h*[0,1]
        B0.append(horner(c[:N], h*I))
    for infl in (2, 8, 64):
        Bt = []
        for b in B0:
            r = b.rad()*infl + abs(b.mid())*arb('1e-6') + arb(2)**(-ctx.prec)
            Bt.append(arb(b.mid(), arb(r).upper()))
        R = sys.taylor(Bt, N)
        B = [B0[i] + (h*I)**N*R[i][N] for i in range(4)]
        if all(Bt[i].contains_interior(B[i]) for i in range(4)):
            R2 = sys.taylor(B, N)
            znew = [horner(coef[i][:N], h) + h**N*R2[i][N] for i in range(4)]
            rem = max(abs(h**N*R2[i][N]).upper() for i in range(4))
            return znew, B, rem
    return None, None, None

def choose_h(sys, zn, N, hmax, prec_margin=12):
    """Heuristic step: truncation term ~ max(2^-(prec - margin) * |z|, 1e-4 * current radius).
    Only affects efficiency; validity comes from step()."""
    zm = [arb(z.mid()) for z in zn]
    coef = sys.taylor(zm, N)
    scale = max(abs(z.mid()) for z in zn)
    rad = max(z.rad() for z in zn)
    tol = max(scale*arb(2)**(-ctx.prec+prec_margin), rad*arb('1e-4'))
    aN = max(abs(coef[i][N].mid()) for i in range(4))
    aN1 = max(abs(coef[i][N-1].mid()) for i in range(4))
    h = arb(hmax)
    if aN > 0:
        h = min(h, (tol/aN)**(arb(1)/N))
    if aN1 > 0:
        h = min(h, (tol/aN1)**(arb(1)/(N-1)))
    return arb((h*arb('0.7')).mid())
