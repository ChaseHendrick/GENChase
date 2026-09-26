"""Validated interval Taylor integrator with a HIGH-ORDER a priori ENCLOSURE (Nedialkov-Jackson style) and a
mean-value (centred) form for the step, with no QR / Lohner coordinate change and no Picard low-order enclosure.
Written for this review.

One step from a box Z (balls), step h, order N; T(y) = sum_{i<N} h^i z^[i](y) is the Taylor polynomial map.
  1. B0 = sum_{i<N} [0, h]^i z^[i](Z);  trial box Bt = B0 inflated.
  2. R = z^[N](Bt), the N-th Taylor coefficient through any point of Bt.
  3. B = B0 + [0, h]^N R.  If B lies in the interior of Bt then every solution from Z exists on [0, h] and
     stays in B (Taylor-Lagrange: while it stays in Bt it lies in B, inside int Bt, so it cannot reach the
     boundary of Bt first).
  4. phi_h(y) = T(y) + h^N z^[N](y(tau)), tau in (0, h) componentwise, so phi_h(y) in T(y) + h^N z^[N](B).
  5. Mean value form: T(y) in T(m) + DT(Z) (Z - m), m = mid Z, DT(Z) = sum_{i<N} h^i Phi^[i](Z), where
     Phi^[i] are the Taylor coefficients of the variational equation (derivatives of z^[i] in y).
  Result: T(m) + DT(Z)(Z - m) + h^N z^[N](B).
"""
from flint import arb, arb_mat, ctx

def unit_interval():
    return arb(0).union(arb(1))

def horner(coefs, h):
    r = arb(0)
    for a in reversed(coefs):
        r = r*h + a
    return r

def enclosure(sys, Z, N, h):
    """HOE: return (B, None) validated a priori box on [0,h], or (None, reason)."""
    coef = sys.taylor(Z, N)
    I = unit_interval()
    B0 = [horner(coef[i][:N], h*I) for i in range(4)]
    for infl in (2, 8, 64):
        Bt = []
        for b in B0:
            r = b.rad()*infl + abs(b.mid())*arb('1e-6') + arb(2)**(-ctx.prec)
            Bt.append(arb(b.mid(), arb(r).upper()))
        R = sys.taylor(Bt, N)
        B = [B0[i] + (h*I)**N*R[i][N] for i in range(4)]
        if all(Bt[i].contains_interior(B[i]) for i in range(4)):
            return B
    return None

def target(Z, prec_margin=12):
    scale = max(abs(z.mid()) for z in Z)
    rad = max(z.rad() for z in Z)
    return max(scale*arb(2)**(-ctx.prec+prec_margin), rad*arb('1e-3'))

def step(sys, Z, N, h, tries=30):
    """Validated step; shrinks h until the HOE is validated and the remainder is below target(Z).
    Returns (Znew, B, rem, h)."""
    tgt = target(Z)
    for _ in range(tries):
        B = enclosure(sys, Z, N, h)
        if B is not None:
            RB = sys.taylor(B, N)
            rem = [h**N*RB[i][N] for i in range(4)]
            rmax = max(abs(r).upper() for r in rem)
            if rmax <= tgt:
                break
        h = arb((h*arb('0.7')).mid())
    else:
        raise RuntimeError('step failed')
    m = [arb(z.mid()) for z in Z]
    cm = sys.taylor(m, N)
    Tm = [horner(cm[i][:N], h) for i in range(4)]
    Phi = sys.taylor_var(Z, N)
    DT = [[horner([Phi[n][i][j] for n in range(N)], h) for j in range(4)] for i in range(4)]
    d = [Z[j] - m[j] for j in range(4)]
    Znew = [Tm[i] + sum((DT[i][j]*d[j] for j in range(4)), arb(0)) + rem[i] for i in range(4)]
    return Znew, B, rmax, h

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
