/* Rigorous interval log and exp in double precision, built on ival.h
 * (directed rounding, + - * / only, plus frexp/ldexp, which are exact).
 *
 * log x, x > 0:  x = m 2^e with m in [1/sqrt2, sqrt2);
 *   log m = 2 atanh(t), t = (m-1)/(m+1), |t| <= 0.1716;
 *   2 atanh t = 2 sum_{k=0}^{K} t^{2k+1}/(2k+1) + R, |R| <= 2|t|^{2K+3}/((2K+3)(1-t^2)).
 * exp y:  y = k ln2 + r with k = round(y/ln2), |r| <= 0.35 (enclosed);
 *   exp r = sum_{k=0}^{K} r^k/k! + R, |R| <= |r|^{K+1}/(K+1)! * e^{|r|}  (e^{0.36} < 1.44).
 * ln 2 is enclosed by two adjacent doubles.
 * tests/test_ivelem.py checks these against arb.
 */
#ifndef IVELEM_H
#define IVELEM_H
#include "ival.h"

/* ln 2 = 0.693147180559945309417232121458...; 0x1.62e42fefa39efp-1 is the
 * double just below it and 0x1.62e42fefa39f0p-1 the one just above
 * (checked in tests/test_ivelem.py). */
static const iv LN2 = {0x1.62e42fefa39efp-1, 0x1.62e42fefa39f0p-1};

static iv iv_pown(iv a, int n) { iv r = ivp(1.0); for (int i = 0; i < n; i++) r = iv_mul(r, a); return r; }
static iv iv_div(iv a, iv b) { return iv_mul(a, iv_recip(b)); }  /* b > 0 or b < 0 */
static iv iv_hull(iv a, iv b) { iv r = {fmin(a.lo, b.lo), fmax(a.hi, b.hi)}; return r; }

/* log of a point x > 0, enclosed */
static iv log_pt(double x) {
  int e; double m = frexp(x, &e);           /* x = m 2^e, m in [0.5, 1) exact */
  if (m < 0.70710678118654752) { m *= 2; e -= 1; }  /* m in [0.7071, 1.4142) exact */
  iv M = ivp(m);
  iv t = iv_div(iv_sub(M, ivp(1.0)), iv_add(M, ivp(1.0)));
  iv t2 = iv_sqr(t);
  const int K = 14;
  iv s = ivp(0.0), p = t;                    /* p = t^{2k+1} */
  for (int k = 0; k <= K; k++) {
    s = iv_add(s, iv_div(p, ivp(2.0 * k + 1)));
    p = iv_mul(p, t2);
  }
  /* remainder bound: 2|t|^{2K+3}/((2K+3)(1-t^2)); here p = t^{2K+3} */
  double at = fmax(fabs(p.lo), fabs(p.hi));
  iv den = iv_mul(ivp(2.0 * K + 3), iv_sub(ivp(1.0), t2));
  double R = iv_div(ivr(0, 2 * at), den).hi;
  s = iv_scale(s, 2.0);
  s.lo = -((-s.lo) + R); s.hi = s.hi + R;
  return iv_add(s, iv_mul(ivp((double)e), LN2));
}
/* log is increasing */
static iv iv_log(iv x) { iv a = log_pt(x.lo), b = log_pt(x.hi); iv r = {a.lo, b.hi}; return r; }

static iv exp_pt_iv(iv y) { /* exp of a (narrow) interval y, |y| < 700 */
  double c = iv_mid(y);
  double k = nearbyint(c / 0x1.62e42fefa39efp-1);
  iv r = iv_sub(y, iv_mul(ivp(k), LN2));
  /* |r| <= about 0.35 + width(y) */
  double ar = fmax(fabs(r.lo), fabs(r.hi));
  const int K = 22;
  iv s = ivp(1.0), term = ivp(1.0);
  for (int n = 1; n <= K; n++) {
    term = iv_div(iv_mul(term, r), ivp((double)n));
    s = iv_add(s, term);
  }
  /* remainder: |r|^{K+1}/(K+1)! e^{|r|}; bound e^{|r|} by 3 when |r| <= 1 */
  if (ar > 1.0) return ivr(0, INFINITY); /* not used for such inputs */
  iv rk = iv_pown(ivp(ar), K + 1);
  double R = iv_mul(rk, ivp(1.3e-22)).hi;   /* 3/23! < 3/2.5e22 = 1.2e-22 < 1.3e-22 */
  s.lo = -((-s.lo) + R); s.hi = s.hi + R;
  iv out = {ldexp(s.lo, (int)k), ldexp(s.hi, (int)k)};  /* exact scaling unless subnormal */
  return out;
}
/* exp is increasing */
static iv iv_exp(iv y) {
  iv a = exp_pt_iv(ivp(y.lo)), b = exp_pt_iv(ivp(y.hi));
  iv r = {a.lo, b.hi}; return r;
}
/* x^p for x > 0 (interval), p an interval */
static iv iv_powr(iv x, iv p) { return iv_exp(iv_mul(p, iv_log(x))); }
#endif
