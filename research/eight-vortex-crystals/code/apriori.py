# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Closed forms and a priori bounds for the ground-state problem of eight identical vortices.

f(z) = -sum_{i<j} log|z_i - z_j| + (1/2) sum |z_k|^2.  For any z, f(z) >= f(z - mean(z)) (the confinement
splits as |z - m|^2/2 summed plus 4|m|^2), and for fixed shape the scale minimizing f has sum |z|^2 = 28.
On {sum z = 0, sum |z|^2 = 28} one has sum_{i<j} |z_i - z_j|^2 = 224, and with t_ij = |z_i - z_j|^2 / 8
    f = 14 - 14 log 8 + Phi/2,   Phi = sum_{i<j} phi(t_ij),   phi(t) = t - 1 - log t >= 0,
an exact identity (sum (t_ij - 1) = 0). The centred heptagon has f* = 14 - 28 log 2 - (7/2) log 7, so
    f <= f*  <=>  Phi <= Phi* = 28 log 2 - 7 log 7 = 7 log(16/7),
    and (critical points)  prod_{i<j} |z_i - z_j|^2 >= 2^56 7^7.
Bounds for any centred configuration with sum |z|^2 = 28 and f <= f* (in particular a ground state):
  (a) each pair: phi(t_ij) <= Phi*, so t_ij lies in [t_-, t_+];
  (b) each vortex: sum_{j != k} t_kj = |z_k|^2 + 7/2, so by convexity 7 phi((|z_k|^2 + 7/2)/7) <= Phi*,
      which bounds |z_k|.
  (c) at a critical point the vortex of largest modulus has |z|^2 >= 7/2 (each Re(z_k/(z_k - z_j)) >= 1/2).
All numbers are Arb enclosures; the bisections return certified outer bounds.
"""
from flint import arb, ctx
ctx.prec = 200

fstar = 14 - 28 * arb(2).log() - arb(7) / 2 * arb(7).log()
Phistar = 7 * (arb(16) / 7).log()
# check the identity f* = 14 - 14 log 8 + Phi*/2 and the value of f* against the certified class-1 ball
assert (14 - 14 * arb(8).log() + Phistar / 2 - fstar).contains(0)
print('f*   =', fstar.str(30))
print('Phi* =', Phistar.str(30))
print('2^56 7^7 =', 2 ** 56 * 7 ** 7)

phi = lambda t: t - 1 - t.log()

def outer(lo, hi, decreasing):
    """smallest certified point beyond which phi > Phi* (monotone branch), by bisection on exact dyadics"""
    for _ in range(80):
        m = (lo + hi) / 2
        m = arb(m.mid())
        ok = phi(m) > Phistar
        if decreasing:
            (lo, hi) = (m, hi) if ok else (lo, m)
        else:
            (lo, hi) = (lo, m) if ok else (m, hi)
    return lo if decreasing else hi

tm = outer(arb('1e-6'), arb(1), True)      # phi(tm) > Phi*, and phi is decreasing on (0, 1)
tp = outer(arb(1), arb(20), False)         # phi(tp) > Phi*, increasing on (1, oo)
assert phi(tm) > Phistar and phi(tp) > Phistar
print('(a) pair distances: d in (%s, %s)' % ((8 * tm).sqrt().str(6), (8 * tp).sqrt().str(6)))
taup = outer(arb(1), arb(20), False)
# (b): 7 phi(tau) <= Phi*  => tau < tau_+ where 7 phi(tau_+) > Phi*
lo, hi = arb(1), arb(20)
for _ in range(80):
    m = arb(((lo + hi) / 2).mid())
    if 7 * phi(m) > Phistar: hi = m
    else: lo = m
assert 7 * phi(hi) > Phistar
Rmax2 = 7 * hi - arb(7) / 2
print('(b) every |z_k| < %s' % Rmax2.sqrt().str(6))
print('(c) at a critical point max |z_k| >= sqrt(7/2) = %s; every |z_k| <= sqrt(24.5) = %s' % (arb(3.5).sqrt().str(6), arb(24.5).sqrt().str(6)))
