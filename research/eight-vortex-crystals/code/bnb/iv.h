/* Copyright 2026 Chase Hendrick. SPDX-License-Identifier: Apache-2.0
 * Minimal rigorous interval arithmetic in IEEE double: every operation is computed in round-to-nearest
 * and then widened outward by one ulp with nextafter, which covers the at most half-ulp error of
 * +, -, *, / and sqrt. No transcendental function is used anywhere in the search. */
#ifndef IV_H
#define IV_H
#include <math.h>
typedef struct { double lo, hi; } iv;
static inline double dn(double x) { return nextafter(x, -INFINITY); }
static inline double up(double x) { return nextafter(x, INFINITY); }
static inline iv I(double a, double b) { iv r = {a, b}; return r; }
static inline iv pt(double a) { iv r = {a, a}; return r; }
static inline iv add(iv a, iv b) { return I(dn(a.lo + b.lo), up(a.hi + b.hi)); }
static inline iv sub(iv a, iv b) { return I(dn(a.lo - b.hi), up(a.hi - b.lo)); }
static inline iv neg(iv a) { return I(-a.hi, -a.lo); }
static inline iv mul(iv a, iv b) {
  double p1 = a.lo * b.lo, p2 = a.lo * b.hi, p3 = a.hi * b.lo, p4 = a.hi * b.hi;
  double lo = fmin(fmin(p1, p2), fmin(p3, p4)), hi = fmax(fmax(p1, p2), fmax(p3, p4));
  return I(dn(lo), up(hi));
}
static inline iv sqr(iv a) {
  if (a.lo >= 0) return I(dn(a.lo * a.lo), up(a.hi * a.hi));
  if (a.hi <= 0) return I(dn(a.hi * a.hi), up(a.lo * a.lo));
  double m = fmax(-a.lo, a.hi); return I(0, up(m * m));
}
static inline iv divv(iv a, iv b) {
  if (b.lo <= 0 && b.hi >= 0) return I(-INFINITY, INFINITY);
  double p1 = a.lo / b.lo, p2 = a.lo / b.hi, p3 = a.hi / b.lo, p4 = a.hi / b.hi;
  double lo = fmin(fmin(p1, p2), fmin(p3, p4)), hi = fmax(fmax(p1, p2), fmax(p3, p4));
  return I(dn(lo), up(hi));
}
static inline iv scal(double c, iv a) { return mul(pt(c), a); }
static inline int has0(iv a) { return a.lo <= 0 && a.hi >= 0; }
static inline iv hull(iv a, iv b) { return I(fmin(a.lo, b.lo), fmax(a.hi, b.hi)); }
static inline iv meet(iv a, iv b) { return I(fmax(a.lo, b.lo), fmin(a.hi, b.hi)); }
static inline double wid(iv a) { return a.hi - a.lo; }
static inline double mid(iv a) { return 0.5 * (a.lo + a.hi); }
#endif
