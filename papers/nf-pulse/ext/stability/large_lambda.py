#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""RIGOROUS (ball arithmetic plus the argument below): no eigenvalue with Re lam >= -delta outside the box
    Re lam < R0,  |Im lam| < Om0,        delta = 1/20, R0 = 9/2, Om0 = 38/5.

Argument (Birman-Schwinger form).  Let (p, q) in H^1 x H^1 solve L(p, q) = lam (p, q) with Re lam >= -delta and put
g = S'(U) p in L^2.  In Fourier variables, with mu = lam + i c k and w^(k) = 1/(1 + k^2),
    (mu + 1) p^ + q^ = w^ g^,   mu q^ = eps p^   =>   (mu^2 + mu + eps) p^ = mu w^ g^.
mu^2 + mu + eps = (mu - mu+)(mu - mu-) with mu+- = (-1 +- sqrt(1 - 4 eps))/2 = -delta0, -(1 - delta0) real, and it
does not vanish for Re mu >= -delta > -delta0, so p^ = m(mu) w^ g^ with m(mu) = mu/(mu^2 + mu + eps), and
    g = S'(U) F^-1[ m w^ g^ ],   ||g||_2 <= (beta/4) F(lam) ||g||_2,   F(lam) = sup_k |m(lam + i c k)| w^(k),
since 0 < S' <= beta/4 = 5.  If F(lam) < 1/5 then g = 0, hence p = 0 and q^ = eps p^/mu = 0 (a.e. in k), so lam is
not an eigenvalue.  Bounds on F (sigma = Re mu, tau = Im mu, |m| = 1/|mu + 1 + eps/mu|):
 (a) Re(mu + 1 + eps/mu) = 1 + sigma (1 + eps/|mu|^2).  For sigma >= R0: |m| <= 1/(1 + R0) = 2/11 < 1/5.
 (b) For |tau| >= T (= 5): |Im(mu + eps/mu)| = |tau| (1 - eps/|mu|^2) >= T - eps/T and the real part is
     >= 1 - delta (1 + eps/T^2) > 0, so |m| <= M1 = ((1 - delta(1 + eps/T^2))^2 + (T - eps/T)^2)^(-1/2).
 (c) For every mu with Re mu >= -delta: delta <= delta0/2 puts mu closer to 0 than to mu+, so
     |m| <= 1/|mu - mu-| <= Md = 1/(1 - delta0 - delta).
 For |Im lam| >= Om0: a wavenumber k with |tau| < T has |c k| > Om0 - T, so |m| w^ <= Md/(1 + ((Om0 - T)/c)^2);
 otherwise (b).  So F < 1/5 when Re lam >= R0, or when Re lam >= -delta and |Im lam| >= Om0.
"""
import json
import _paths
from flint import arb, ctx, fmpq
ctx.prec = 256
import nfcore as nf, certify_rest as cr

DELTA = fmpq(1, 20)
R0 = fmpq(9, 2)
OM0 = fmpq(38, 5)
TT = fmpq(5)


def check(delta=DELTA, R0=R0, Om0=OM0, T=TT):
    labels = (str(delta), str(R0), str(Om0))
    beta, th, eps, gam = nf.params()
    delta, R0, Om0, T = arb(delta), arb(R0), arb(Om0), arb(T)
    cmax = arb(cr.C2)                               # c <= c2 on the whole speed bracket (and on any sub-bracket)
    Smax = beta / 4
    delta0 = (1 - (1 - 4 * eps).sqrt()) / 2
    out = {}
    ok = True
    ok &= bool(delta <= delta0 / 2)
    out['delta <= delta0/2'] = bool(delta <= delta0 / 2)
    Fa = 1 / (1 + R0)
    out['(a) bound'] = Fa.str(15)
    ok &= bool(Fa * Smax < 1)
    re_lo = 1 - delta * (1 + eps / T ** 2)
    ok &= bool(re_lo > 0) and bool(T * T > eps)
    M1 = 1 / (re_lo ** 2 + (T - eps / T) ** 2).sqrt()
    Md = 1 / (1 - delta0 - delta)
    Fb = M1.max(Md / (1 + ((Om0 - T) / cmax) ** 2))
    out['M1'] = M1.str(15)
    out['Md'] = Md.str(15)
    out['(b,c) bound'] = Fb.str(15)
    ok &= bool(Fb * Smax < 1)
    out['beta/4 * bound (a)'] = (Fa * Smax).str(15)
    out['beta/4 * bound (b,c)'] = (Fb * Smax).str(15)
    out['box'] = 'Re lam in [-%s, %s], |Im lam| < %s' % labels
    out['certified'] = ok
    return ok, out


if __name__ == '__main__':
    ok, out = check()
    print('LARGE |lam| EXCLUSION:', 'CERTIFIED' if ok else 'FAILED', json.dumps(out, indent=1))
    json.dump(out, open(_paths.DATA + '/large_lambda.json', 'w'), indent=1)
    okn, outn = check(Om0=fmpq(6), R0=fmpq(3))
    print('NEGATIVE CONTROL (Om0 = 6, R0 = 3, too small for this bound): certified =', okn, outn['beta/4 * bound (a)'], outn['beta/4 * bound (b,c)'])
