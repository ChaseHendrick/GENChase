/* Copyright 2026 Chase Hendrick. SPDX-License-Identifier: Apache-2.0
 * Tests for the branch-and-bound over critical points of
 *   f(z) = -sum_{i<j} log|z_i - z_j| + (1/2) sum |z_k|^2,  N = 8,
 * in the fundamental domain
 *   vortex 0 has maximal modulus and lies on the positive real axis (y_0 = 0),
 *   y_1 <= y_2 <= ... <= y_7 (relabelling), y_1 + y_7 <= 0 (reflection).
 * Unknowns v[0..7] = x_0..x_7, v[8..14] = y_1..y_7.
 * Every critical point satisfies sum z = 0 and sum |z|^2 = 28, and has f = 14 - (1/2) log prod |z_i - z_j|^2,
 * so "f <= fmin" reads prod |z_i-z_j|^2 >= PSTAR = exp(28 - 2 fmin); no logarithm is evaluated. */
#ifndef CORE_H
#define CORE_H
#include "iv.h"
#define NV 8
#define NU 15

enum { KEEP = 0, D_DOMAIN, D_SUM, D_VALUE, D_GRAD, D_KRAW, V_MIN, FLAG_UNIQUE, NRES };

static inline void unpack(const iv *v, iv *x, iv *y) {
  for (int k = 0; k < NV; k++) x[k] = v[k];
  y[0] = pt(0);
  for (int k = 1; k < NV; k++) y[k] = v[7 + k];
}

/* exact rigorous value of h(px,py) = px/(px^2+py^2) at one point */
static inline iv hpt(double px, double py) { return divv(pt(px), add(sqr(pt(px)), sqr(pt(py)))); }

/* Tight enclosures of hx = dx/(dx^2+dy^2) and hy = dy/(dx^2+dy^2) over the rectangle dx x dy.
 * Neither function has an interior critical point, so the extremes lie on the boundary: at corners,
 * at the interior critical points of an edge (x = +-|y| on edges y = const for hx; the point y = 0
 * on edges x = const, where hx is monotone in |y|), and symmetrically for hy. */
static inline int pair_tight(iv dx, iv dy, iv *hx, iv *hy) {
  if (has0(dx) && has0(dy)) { *hx = I(-INFINITY, INFINITY); *hy = *hx; return 0; }
  double xs[2] = {dx.lo, dx.hi}, ys[2] = {dy.lo, dy.hi};
  iv a = hpt(xs[0], ys[0]), b = hpt(ys[0], xs[0]);
  for (int i = 0; i < 2; i++) for (int j = 0; j < 2; j++) { a = hull(a, hpt(xs[i], ys[j])); b = hull(b, hpt(ys[j], xs[i])); }
  for (int j = 0; j < 2; j++) {           /* hx on edges y = ys[j]: critical x = +-|y| */
    double c = fabs(ys[j]);
    if (c > dx.lo && c < dx.hi) a = hull(a, hpt(c, ys[j]));
    if (-c > dx.lo && -c < dx.hi) a = hull(a, hpt(-c, ys[j]));
  }
  if (dy.lo < 0 && dy.hi > 0) for (int i = 0; i < 2; i++) a = hull(a, hpt(xs[i], 0.0));   /* hx on x = const at y = 0 */
  for (int i = 0; i < 2; i++) {           /* hy on edges x = xs[i]: critical y = +-|x| */
    double c = fabs(xs[i]);
    if (c > dy.lo && c < dy.hi) b = hull(b, hpt(c, xs[i]));
    if (-c > dy.lo && -c < dy.hi) b = hull(b, hpt(-c, xs[i]));
  }
  if (dx.lo < 0 && dx.hi > 0) for (int j = 0; j < 2; j++) b = hull(b, hpt(ys[j], 0.0));
  *hx = a; *hy = b; return 1;
}

/* gradient enclosure: g[k] = df/dx_k, g[NV+k] = df/dy_k (16 components) */
static inline void grad_iv(const iv *x, const iv *y, iv *g) {
  for (int k = 0; k < NV; k++) { g[k] = x[k]; g[NV + k] = y[k]; }
  for (int i = 0; i < NV; i++) for (int j = i + 1; j < NV; j++) {
    iv hx, hy; pair_tight(sub(x[i], x[j]), sub(y[i], y[j]), &hx, &hy);
    g[i] = sub(g[i], hx); g[NV + i] = sub(g[NV + i], hy);
    g[j] = add(g[j], hx); g[NV + j] = add(g[NV + j], hy);
  }
}

/* domain and linear-constraint contraction; returns 0 if the box is empty */
static inline int contract(iv *v) {
  for (int pass = 0; pass < 2; pass++) {
    /* y ordering y_1 <= ... <= y_7 (v[8..14]) */
    for (int k = 13; k >= 8; k--) { v[k].hi = fmin(v[k].hi, v[k + 1].hi); }
    for (int k = 9; k <= 14; k++) { v[k].lo = fmax(v[k].lo, v[k - 1].lo); }
    for (int k = 8; k <= 14; k++) if (v[k].lo > v[k].hi) return 0;
    /* reflection: y_1 + y_7 <= 0 */
    if (add(v[8], v[14]).lo > 0) return 0;
    v[8].hi = fmin(v[8].hi, up(-v[14].lo)); v[14].hi = fmin(v[14].hi, up(-v[8].lo));
    /* |z_k| <= x_0 */
    double R = v[0].hi;
    for (int k = 1; k < 15; k++) { v[k].lo = fmax(v[k].lo, -R); v[k].hi = fmin(v[k].hi, R); if (v[k].lo > v[k].hi) return 0; }
    iv x[NV], y[NV]; unpack(v, x, y);
    iv R2 = sqr(v[0]);
    for (int k = 1; k < NV; k++) if (add(sqr(x[k]), sqr(y[k])).lo > R2.hi) return 0;
    /* sum x = 0, sum y = 0 */
    iv sx = pt(0), sy = pt(0);
    for (int k = 0; k < NV; k++) { sx = add(sx, x[k]); sy = add(sy, y[k]); }
    if (!has0(sx) || !has0(sy)) return 0;
    for (int k = 0; k < NV; k++) {       /* x_k = -(sum of the others) */
      iv o = sub(sx, x[k]);               /* sum of others (over-approximation) */
      iv c = meet(v[k], neg(o)); if (c.lo > c.hi) return 0; v[k] = c;
    }
    for (int k = 1; k < NV; k++) {
      iv o = sub(sy, y[k]);
      iv c = meet(v[7 + k], neg(o)); if (c.lo > c.hi) return 0; v[7 + k] = c;
    }
    /* sum |z|^2 = 28 */
    unpack(v, x, y);
    iv s2[NV]; iv S = pt(0);
    for (int k = 0; k < NV; k++) { s2[k] = add(sqr(x[k]), sqr(y[k])); S = add(S, s2[k]); }
    if (S.lo > 28 || S.hi < 28) return 0;
  }
  return 1;
}

/* Lower bound of Phi = sum_{i<j} phi(|z_i - z_j|^2 / 8), phi(t) = t - 1 - log t, over the box.
 * On sum z = 0, sum |z|^2 = 28 one has sum_{i<j} |z_i - z_j|^2 = 224, hence the exact identity
 * f = 14 - 14 log 8 + Phi / 2, and f <= f(1+7) reads Phi <= PHISTAR = 7 log(16/7).
 * phi is convex with minimum 0 at t = 1, so its minimum over a t-interval is at the endpoint nearest 1.
 * The logarithm is taken once per box, on a product, with libm log widened by 8 ulps. */
static inline double phi_lower(const iv *x, const iv *y) {
  double S = 0, P = 1;   /* S: lower bound of sum (t_e - 1); P: upper bound of prod t_e */
  for (int i = 0; i < NV; i++) for (int j = i + 1; j < NV; j++) {
    iv d2 = add(sqr(sub(x[i], x[j])), sqr(sub(y[i], y[j])));
    iv t = divv(d2, pt(8.0));
    double te_lo, te_hi;
    if (t.hi < 1) { te_lo = t.hi; te_hi = t.hi; }        /* endpoint t.hi, enclosed by [t.hi, t.hi] up to rounding */
    else if (t.lo > 1) { te_lo = t.lo; te_hi = t.lo; }
    else continue;                                        /* phi = 0 reachable: contributes 0 */
    S = dn(S + dn(te_lo - 1));
    P = up(P * te_hi);
    (void)te_lo;
  }
  double L = log(P); for (int k = 0; k < 8; k++) L = up(L);
  return dn(S - L);
}
/* upper bound of prod_{i<j} |z_i - z_j|^2 over the box */
static inline double prod_upper(const iv *x, const iv *y) {
  double P = 1;
  for (int i = 0; i < NV; i++) for (int j = i + 1; j < NV; j++) {
    iv d2 = add(sqr(sub(x[i], x[j])), sqr(sub(y[i], y[j])));
    P = up(P * d2.hi);
  }
  return P;
}
#endif
