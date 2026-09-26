/* Copyright 2026 Chase Hendrick. SPDX-License-Identifier: Apache-2.0
 * Krawczyk operator for the 15 reduced equations (grad f without df/dy_0) in the 15 unknowns.
 * All zeros of the reduced system in X lie in K(X); if K(X) is inside the interior of X there is
 * exactly one. The preconditioner Y is any point matrix (a floating-point inverse): soundness does not
 * depend on it. */
#ifndef KRAW_H
#define KRAW_H
#include "core.h"

/* full 16x16 Hessian enclosure, ordering (x_0..x_7, y_0..y_7) */
static inline void hess_iv(const iv *x, const iv *y, iv H[16][16]) {
  for (int a = 0; a < 16; a++) for (int b = 0; b < 16; b++) H[a][b] = pt(a == b ? 1.0 : 0.0);
  for (int i = 0; i < NV; i++) for (int j = i + 1; j < NV; j++) {
    iv dx = sub(x[i], x[j]), dy = sub(y[i], y[j]);
    iv r2 = add(sqr(dx), sqr(dy)), r4 = sqr(r2);
    iv bxx = divv(sub(sqr(dx), sqr(dy)), r4), bxy = divv(scal(2, mul(dx, dy)), r4), byy = neg(bxx);
    int idx[2] = {i, j};
    for (int s = 0; s < 2; s++) for (int t = 0; t < 2; t++) {
      int a = idx[s], b = idx[t]; int pos = (s == t);
      iv c1 = pos ? bxx : neg(bxx), c2 = pos ? bxy : neg(bxy), c3 = pos ? byy : neg(byy);
      H[a][b] = add(H[a][b], c1); H[a][NV + b] = add(H[a][NV + b], c2);
      H[NV + a][b] = add(H[NV + a][b], c2); H[NV + a][NV + b] = add(H[NV + a][NV + b], c3);
    }
  }
}
/* reduced index map: unknown u -> full coordinate (drop y_0 = full index 8) */
static const int RED[NU] = {0, 1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15};

static inline int invert(double A[NU][NU], double B[NU][NU]) {
  double M[NU][2 * NU];
  for (int i = 0; i < NU; i++) for (int j = 0; j < NU; j++) { M[i][j] = A[i][j]; M[i][NU + j] = (i == j); }
  for (int c = 0; c < NU; c++) {
    int p = c; for (int r = c + 1; r < NU; r++) if (fabs(M[r][c]) > fabs(M[p][c])) p = r;
    if (fabs(M[p][c]) < 1e-300) return 0;
    if (p != c) for (int j = 0; j < 2 * NU; j++) { double t = M[p][j]; M[p][j] = M[c][j]; M[c][j] = t; }
    double d = M[c][c]; for (int j = 0; j < 2 * NU; j++) M[c][j] /= d;
    for (int r = 0; r < NU; r++) if (r != c) { double f = M[r][c]; if (f != 0) for (int j = 0; j < 2 * NU; j++) M[r][j] -= f * M[c][j]; }
  }
  for (int i = 0; i < NU; i++) for (int j = 0; j < NU; j++) B[i][j] = M[i][NU + j];
  return 1;
}

/* returns: -1 no zero in X (K ∩ X empty), 1 unique zero (K in int X), 0 undecided; Kout = K ∩ X */
static inline int krawczyk(const iv *v, iv *Kout) {
  iv x[NV], y[NV]; unpack(v, x, y);
  iv H[16][16]; hess_iv(x, y, H);
  double Jm[NU][NU], Y[NU][NU];
  for (int a = 0; a < NU; a++) for (int b = 0; b < NU; b++) Jm[a][b] = mid(H[RED[a]][RED[b]]);
  if (!invert(Jm, Y)) return 0;
  double c[NU]; iv cv[NU];
  for (int k = 0; k < NU; k++) { c[k] = mid(v[k]); cv[k] = pt(c[k]); }
  iv xc[NV], yc[NV], g[16]; unpack(cv, xc, yc);
  /* gradient at the centre, rigorous (point intervals, naive pair terms) */
  for (int k = 0; k < NV; k++) { g[k] = xc[k]; g[NV + k] = yc[k]; }
  for (int i = 0; i < NV; i++) for (int j = i + 1; j < NV; j++) {
    iv dx = sub(xc[i], xc[j]), dy = sub(yc[i], yc[j]), r2 = add(sqr(dx), sqr(dy));
    iv hx = divv(dx, r2), hy = divv(dy, r2);
    g[i] = sub(g[i], hx); g[NV + i] = sub(g[NV + i], hy); g[j] = add(g[j], hx); g[NV + j] = add(g[NV + j], hy);
  }
  iv gr[NU]; for (int a = 0; a < NU; a++) gr[a] = g[RED[a]];
  int inside = 1;
  for (int a = 0; a < NU; a++) {
    iv s = pt(c[a]);
    iv yg = pt(0);
    for (int b = 0; b < NU; b++) yg = add(yg, scal(Y[a][b], gr[b]));
    s = sub(s, yg);
    for (int b = 0; b < NU; b++) {
      iv m = pt(a == b ? 1.0 : 0.0);
      for (int t = 0; t < NU; t++) m = sub(m, scal(Y[a][t], H[RED[t]][RED[b]]));
      s = add(s, mul(m, sub(v[b], pt(c[b]))));
    }
    if (s.lo > v[a].hi || s.hi < v[a].lo) return -1;
    if (!(s.lo > v[a].lo && s.hi < v[a].hi)) inside = 0;
    Kout[a] = meet(s, v[a]);
  }
  return inside ? 1 : 0;
}
#endif
