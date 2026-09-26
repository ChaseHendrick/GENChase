#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""RIGOROUS (ball arithmetic plus the short argument below): the essential spectrum lies in Re lam <= -delta0.

Linearisation at the pulse in the co-moving frame xi = x + c t, on X = L^2(R) x L^2(R), domain H^1 x H^1:
    L (p, q) = ( -c p' - p - q + w*(S'(U) p),  -c q' + eps p ).
At rest S'(U) = s = S'(0).  The rest operator L_inf is a Fourier multiplier; with mu = lam + i c k its symbol gives
    det(L_inf(k) - lam) = mu^2 + a(k) mu + eps,     a(k) = 1 - s/(1 + k^2)  in [1 - s, 1).
Claim E: for every real k both roots mu are real and <= r(a(k)), r(a) = (-a + sqrt(a^2 - 4 eps))/2, and r(a) is
increasing in a, so every root is < r(1) = -delta0 with delta0 = (1 - sqrt(1 - 4 eps))/2 = (1 - sqrt(3/5))/2.
Hence for Re lam > -delta0 the symbol is invertible with |mu - root| >= Re lam + delta0 for both roots and all k;
since moreover |det| >= (|mu| - 1)^2 for large |k| (both roots lie in [-1, 0]) while the adjugate grows like |mu|,
the inverse symbol is O(1/(1 + |k|)) uniformly in k, and L_inf - lam is invertible from X onto H^1 x H^1.  L - L_inf = (p, q) -> (w*((S'(U) - s) p), 0) is Hilbert-Schmidt (S'(U) - s decays
exponentially and w^ = 1/(1+k^2) is square integrable), hence compact; so L - lam is Fredholm of index 0 for
Re lam > -delta0 and the spectrum there is discrete eigenvalues of finite multiplicity (analytic Fredholm theorem;
L - lam is invertible for large real lam).  The curves lam = root(k) - i c k fill the essential spectrum; their real
parts range over [root_-(0), -delta0), sup -delta0 approached as |k| -> infinity.
This program checks the numerical facts the argument uses, in ball arithmetic.
"""
import json
import _paths
from flint import arb, ctx, fmpq
ctx.prec = 256
import nfcore as nf


def main():
    beta, th, eps, gam = nf.params()
    s = nf.dS(arb(0))
    out = {'s': s.str(30)}
    # (i) discriminant positive for all k: a in [1 - s, 1), a > 0, a^2 - 4 eps >= (1 - s)^2 - 4 eps > 0
    disc_min = (1 - s) ** 2 - 4 * eps
    out['(1-s)^2 - 4 eps'] = disc_min.str(20)
    ok1 = bool(disc_min > 0) and bool(1 - s > 0)
    # (ii) r(a) increasing on a^2 > 4 eps: r'(a) = (-1 + a / sqrt(a^2 - 4 eps))/2 > 0 since a > sqrt(a^2 - 4 eps) > 0
    # (iii) delta0
    delta0 = (1 - (1 - 4 * eps).sqrt()) / 2
    out['delta0 = (1 - sqrt(1 - 4 eps))/2'] = delta0.str(30)
    r0 = (-(1 - s) + disc_min.sqrt()) / 2
    r0m = (-(1 - s) - disc_min.sqrt()) / 2
    out['k = 0 roots (real parts of the curves at k = 0)'] = [r0.str(20), r0m.str(20)]
    out['sup Re over the essential spectrum'] = (-delta0).str(20)
    rinf_m = (-1 - (1 - 4 * eps).sqrt()) / 2
    out['other branch as |k| -> infinity'] = rinf_m.str(20)
    ok2 = bool(r0 < -delta0)
    out['certified'] = ok1 and ok2
    print('ESSENTIAL SPECTRUM: Re lam <= -delta0 = %s ; %s' % ((-delta0).str(20), 'CERTIFIED' if out['certified'] else 'FAILED'))
    print(json.dumps(out, indent=1))
    json.dump(out, open(_paths.DATA + '/ess_spectrum.json', 'w'), indent=1)
    # negative control: with eps = 3/10 the roots become complex (a^2 < 4 eps for a near 1 - s): the check must fail
    eps_bad = arb(fmpq(3, 10))
    print('NEGATIVE CONTROL eps = 3/10: discriminant positive =', bool((1 - s) ** 2 - 4 * eps_bad > 0))


if __name__ == '__main__':
    main()
