/* Interval arithmetic in IEEE double precision with directed rounding.
 *
 * The rounding mode is set to upward (FE_UPWARD) once, by iv_init(), and is
 * never changed.  An upper bound is then the machine result; a lower bound is
 * obtained by negation, which is exact: lo(a + b) = -((-a) - b) rounded up.
 * Compile with -frounding-math -fno-fast-math so that the compiler neither
 * constant-folds nor reorders these operations.
 *
 * Only + - * / are used (no library functions), so the enclosures depend on
 * IEEE 754 correctly rounded arithmetic alone.  tests/test_ival.py checks the
 * operations against exact rational arithmetic.
 */
#ifndef IVAL_H
#define IVAL_H
#include <fenv.h>
#include <math.h>

#pragma STDC FENV_ACCESS ON

typedef struct { double lo, hi; } iv;
typedef struct { iv re, im; } civ;   /* rectangular complex interval */

static inline void iv_init(void) { fesetround(FE_UPWARD); }

static inline iv ivp(double x) { iv r = {x, x}; return r; }
static inline iv ivr(double lo, double hi) { iv r = {lo, hi}; return r; }

static inline iv iv_add(iv a, iv b) {
  iv r; r.lo = -((-a.lo) - b.lo); r.hi = a.hi + b.hi; return r;
}
static inline iv iv_sub(iv a, iv b) {
  iv r; r.lo = -(b.hi - a.lo); r.hi = a.hi - b.lo; return r;
}
static inline iv iv_neg(iv a) { iv r = {-a.hi, -a.lo}; return r; }

static inline double mul_up(double x, double y) { return x * y; }
static inline double mul_dn(double x, double y) { return -((-x) * y); }

static inline iv iv_mul(iv a, iv b) {
  double u1 = mul_up(a.lo, b.lo), u2 = mul_up(a.lo, b.hi);
  double u3 = mul_up(a.hi, b.lo), u4 = mul_up(a.hi, b.hi);
  double d1 = mul_dn(a.lo, b.lo), d2 = mul_dn(a.lo, b.hi);
  double d3 = mul_dn(a.hi, b.lo), d4 = mul_dn(a.hi, b.hi);
  iv r;
  r.hi = fmax(fmax(u1, u2), fmax(u3, u4));
  r.lo = fmin(fmin(d1, d2), fmin(d3, d4));
  return r;
}
/* multiply by an exact double constant */
static inline iv iv_scale(iv a, double c) { return iv_mul(a, ivp(c)); }

static inline iv iv_sqr(iv a) {
  iv r;
  if (a.lo >= 0) { r.lo = mul_dn(a.lo, a.lo); r.hi = mul_up(a.hi, a.hi); }
  else if (a.hi <= 0) { r.lo = mul_dn(a.hi, a.hi); r.hi = mul_up(a.lo, a.lo); }
  else { r.lo = 0.0; r.hi = fmax(mul_up(a.lo, a.lo), mul_up(a.hi, a.hi)); }
  return r;
}
/* 1/a for an interval that does not contain 0 (caller checks) */
static inline iv iv_recip(iv a) {
  iv r; r.lo = -((-1.0) / a.hi); r.hi = 1.0 / a.lo; return r;
}
static inline int iv_pos(iv a) { return a.lo > 0; }
static inline int iv_has0(iv a) { return a.lo <= 0 && a.hi >= 0; }
static inline double iv_mid(iv a) { return 0.5 * a.lo + 0.5 * a.hi; }
static inline double iv_wid(iv a) { return a.hi - a.lo; }

/* complex */
static inline civ cadd(civ a, civ b) { civ r = {iv_add(a.re, b.re), iv_add(a.im, b.im)}; return r; }
static inline civ csub(civ a, civ b) { civ r = {iv_sub(a.re, b.re), iv_sub(a.im, b.im)}; return r; }
static inline civ cneg(civ a) { civ r = {iv_neg(a.re), iv_neg(a.im)}; return r; }
static inline civ cmul(civ a, civ b) {
  civ r = {iv_sub(iv_mul(a.re, b.re), iv_mul(a.im, b.im)),
           iv_add(iv_mul(a.re, b.im), iv_mul(a.im, b.re))};
  return r;
}
static inline civ csqr(civ a) {
  civ r = {iv_sub(iv_sqr(a.re), iv_sqr(a.im)), iv_scale(iv_mul(a.re, a.im), 2.0)};
  return r;
}
static inline iv cabs2(civ a) { return iv_add(iv_sqr(a.re), iv_sqr(a.im)); }
static inline civ cconj(civ a) { civ r = {a.re, iv_neg(a.im)}; return r; }
static inline civ cscale(civ a, double c) { civ r = {iv_scale(a.re, c), iv_scale(a.im, c)}; return r; }
/* 1/w = conj(w)/|w|^2 given d = |w|^2 > 0 */
static inline civ cinv_d(civ w, iv d) {
  iv rd = iv_recip(d);
  civ r = {iv_mul(w.re, rd), iv_neg(iv_mul(w.im, rd))};
  return r;
}
static inline civ czero(void) { civ r = {{0, 0}, {0, 0}}; return r; }
#endif
