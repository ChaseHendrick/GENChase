/* bnbP: bnbA with the exponent A as an extra coordinate of every box
 * (joint branch-and-bound over (z, A), A in [a, b]).  On each box the
 * exponent is the box's A-interval; a certified box satisfies the
 * parametric Krawczyk condition K(X, A-range) in int X, so for every A in
 * the range the box holds exactly one solution, and the Jacobian of the
 * square system is nonsingular there.  Usage: bnbP N a b nsplit worker
 * nworkers [minwidth] [--sym].  Output boxes list the z-coordinates and then
 * the A-interval.
 *
 * Derived from bnbA.c: */
/* Interval branch-and-bound for the planar central configurations of N equal
 * masses with the homogeneous potential of exponent A (Hampton's convention:
 * U = sum r^{2-A}, force ~ r^{1-A}; A = 2 is the point-vortex case, with the
 * logarithmic potential, A = 3 is Newtonian gravity).  A must be a multiple
 * of 1/2, so that r^{-A} = (d^{1/4})^{-2A} with d = r^2 needs only
 * correctly rounded square roots.
 *
 * This program is independent of bnb.c except for ival.h: a different
 * normalization, different unknowns, different equations and different
 * collision tests.
 *
 * Normalization.  Relabel so that vortex 1 has the largest modulus about
 * the centre (of mass / vorticity) and rotate and scale so that z_1 = 1.
 * Unknowns: z_2, ..., z_{N-1} in the closed unit disc (dimension 2N-4);
 * z_N = -(1 + z_2 + ... + z_{N-1}), |z_N| <= 1.
 *
 * Equations.  With phi(w) = w |w|^{-A}, U' = sum_{j<k} d_jk^{1-A/2},
 * I = sum |z_j|^2, the central configuration equation
 *     sum_{k != j} phi(z_j - z_k) = lambda z_j,  lambda = U'/I,
 * is written without the singular multiplier as
 *     H_j = I sum_{k != j} phi(z_j - z_k) - U' z_j = 0.
 * Square system: H_2, ..., H_{N-1} (complex, 2N-4 real equations).  From
 * sum_j H_j = 0 and sum_j conj(z_j) H_j = 0 (identities when sum z_j = 0)
 * one gets (1 - conj z_N) H_1 = 0, so the square system implies all H_j = 0
 * wherever z_N != 1, which is checked on each certified box.
 *
 * Collision test (partition identity).  For disjoint blocks C (|C| >= 2),
 * each separated from everything outside it on the box,
 *     sum_C sum_{j in C} conj(z_j - c_C) H_j
 *       = sum_C U'_C (I - sum_C' I_C') + I sum_C X_C - U'_R sum_C I_C = 0,
 * with U'_C the internal sum of d^{1-A/2}, I_C the inertia of C about its
 * centre c_C, X_C = sum_{j in C} conj(z_j - c_C) sum_{k notin C} phi(z_j - z_k)
 * and U'_R the sum of d^{1-A/2} over pairs internal to no block.  Near a
 * collision whose clusters are the blocks, U'_C -> +infinity (A > 2) or is
 * the constant |C|(|C|-1)/2 (A = 2) while the I_C -> 0, so the identity
 * fails there.  Only lower bounds of U'_C are needed, so a block may
 * contain an exact collision.
 *
 * Usage: bnbA N A nsplit worker nworkers [minwidth] [--sym]
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "ival.h"
#include "ivelem.h"

#define MAXN 6
#define MAXD (2 * MAXN - 4)

static int N, D;
static double A;  /* exponent (midpoint in parametric mode) */
static int A2;    /* 2A, an integer (point mode) */
static iv AI;     /* the exponent as an interval */
static int param = 0;  /* 1: A ranges over the interval AI (exp/log arithmetic) */
static double MINW = 1e-11, KTHRESH = 0.1;
static int use_sym = 0, mutate = 0;
static long st_boxes, st_t0, st_t2, st_t3, st_t4, st_cert, st_unres;
static double vol_total, vol_done; static long next_report = 1L << 20;

typedef struct { iv x[MAXD]; iv a; } box;

/* sqrt enclosure: upper bound from the upward rounded sqrt, lower bound by
 * stepping down until the square (rounded up) does not exceed x. */
static double sqrt_up(double x) { return __builtin_sqrt(x); }
static double sqrt_dn(double x) {
  double u = __builtin_sqrt(x);
  double l = u;
  while (l > 0 && mul_up(l, l) > x) l = nextafter(l, 0.0);
  return l;
}
/* d^{-A/2} and d^{1-A/2} for a positive interval d */
static iv qroot(iv d) { /* d^{1/4} */
  iv s = {sqrt_dn(d.lo), sqrt_up(d.hi)};
  iv q = {sqrt_dn(s.lo), sqrt_up(s.hi)};
  return q;
}
static iv powpos(iv q, int n) { iv r = ivp(1.0); for (int i = 0; i < n; i++) r = iv_mul(r, q); return r; }
static iv dmA2(iv d) { /* d^{-A/2}, 2A = A2 */
  if (param) return iv_powr(d, iv_scale(AI, -0.5));
  if (A2 % 4 == 0) return iv_recip(powpos(d, A2 / 4));
  if (A2 % 4 == 2) { iv s = {sqrt_dn(d.lo), sqrt_up(d.hi)}; return iv_recip(iv_mul(powpos(d, (A2 - 2) / 4), s)); }
  return iv_recip(powpos(qroot(d), A2));
}
static iv d1mA2(iv d) {
  if (param) return iv_powr(d, iv_sub(ivp(1.0), iv_scale(AI, 0.5)));
  return iv_mul(d, dmA2(d));
}
/* lower bound of d^{1-A/2} when d may contain 0 (d.hi > 0); A >= 2 */
static double d1mA2_lo(iv d) {
  if (!param && A2 == 4) return 1.0;
  iv t = d1mA2(ivp(d.hi)); return t.lo;
}

static void zfrom(const box *b, civ z[]) {
  z[0].re = ivp(1.0); z[0].im = ivp(0.0);
  civ s = z[0];
  for (int j = 1; j < N - 1; j++) { z[j].re = b->x[2 * j - 2]; z[j].im = b->x[2 * j - 1]; s = cadd(s, z[j]); }
  z[N - 1] = cneg(s);
}

typedef struct {
  civ z[MAXN], w[MAXN][MAXN], phi[MAXN][MAXN];
  iv d[MAXN][MAXN], p[MAXN][MAXN] /* d^{-A/2} */, u[MAXN][MAXN] /* d^{1-A/2} */;
  int pos[MAXN][MAXN];
  iv I;
} tables;

static void build(const box *b, tables *t) {
  zfrom(b, t->z);
  t->I = ivp(0.0);
  for (int j = 0; j < N; j++) t->I = iv_add(t->I, cabs2(t->z[j]));
  for (int j = 0; j < N; j++)
    for (int k = j + 1; k < N; k++) {
      t->w[j][k] = csub(t->z[j], t->z[k]); t->w[k][j] = cneg(t->w[j][k]);
      t->d[j][k] = t->d[k][j] = cabs2(t->w[j][k]);
      t->pos[j][k] = t->pos[k][j] = iv_pos(t->d[j][k]);
      if (t->pos[j][k]) {
        t->p[j][k] = t->p[k][j] = dmA2(t->d[j][k]);
        t->u[j][k] = t->u[k][j] = (!param && A2 == 4) ? ivp(1.0) : d1mA2(t->d[j][k]);
        civ f = {iv_mul(t->w[j][k].re, t->p[j][k]), iv_mul(t->w[j][k].im, t->p[j][k])};
        t->phi[j][k] = f; t->phi[k][j] = cneg(f);
      }
    }
}

static int allpos(const tables *t) {
  for (int j = 0; j < N; j++) for (int k = j + 1; k < N; k++) if (!t->pos[j][k]) return 0;
  return 1;
}
static iv Uprime(const tables *t) {
  iv U = ivp(0.0);
  for (int j = 0; j < N; j++) for (int k = j + 1; k < N; k++) U = iv_add(U, t->u[j][k]);
  return U;
}
static civ Hj(const tables *t, int j, iv U) {
  civ s = czero();
  for (int k = 0; k < N; k++) if (k != j) s = cadd(s, t->phi[j][k]);
  civ r = {iv_sub(iv_mul(t->I, s.re), iv_mul(U, t->z[j].re)), iv_sub(iv_mul(t->I, s.im), iv_mul(U, t->z[j].im))};
  return r;
}

/* E and Jacobian; requires all distances positive */
static void evalE(const box *b, iv E[], iv J[][MAXD]) {
  tables t; build(b, &t);
  iv U = Uprime(&t);
  civ S[MAXN];
  for (int j = 0; j < N; j++) { S[j] = czero(); for (int k = 0; k < N; k++) if (k != j) S[j] = cadd(S[j], t.phi[j][k]); }
  int r = 0;
  for (int j = 1; j < N - 1; j++) {
    civ h = {iv_sub(iv_mul(t.I, S[j].re), iv_mul(U, t.z[j].re)), iv_sub(iv_mul(t.I, S[j].im), iv_mul(U, t.z[j].im))};
    if (mutate == 2) h.re = iv_add(h.re, ivp(0.25));
    E[r++] = h.re; E[r++] = h.im;
  }
  if (!J) return;
  /* partial derivatives of phi(w) w.r.t. Re w and Im w:
   *   dphi/da = p (1 - A a w / d),  dphi/db = p (i - A b w / d) */
  civ pa[MAXN][MAXN], pb[MAXN][MAXN];
  for (int j = 0; j < N; j++) for (int k = 0; k < N; k++) if (j != k) {
    iv a = t.w[j][k].re, bb = t.w[j][k].im, dd = t.d[j][k], p = t.p[j][k];
    iv rd = iv_recip(dd);
    iv Aa = iv_mul(iv_mul(a, AI), rd), Ab = iv_mul(iv_mul(bb, AI), rd);
    /* 1 - Aa*w */
    civ x1 = {iv_sub(ivp(1.0), iv_mul(Aa, a)), iv_neg(iv_mul(Aa, bb))};
    civ x2 = {iv_neg(iv_mul(Ab, a)), iv_sub(ivp(1.0), iv_mul(Ab, bb))};
    pa[j][k].re = iv_mul(p, x1.re); pa[j][k].im = iv_mul(p, x1.im);
    pb[j][k].re = iv_mul(p, x2.re); pb[j][k].im = iv_mul(p, x2.im);
  }
  for (int c = 0; c < D; c++) {
    int m = c / 2 + 1, imag = c % 2;
    double dz[MAXN];  /* d(Re z_j)/dv or d(Im z_j)/dv */
    for (int j = 0; j < N; j++) dz[j] = (j == m) - (j == N - 1);
    /* dI = sum 2 x_j dx_j */
    iv dI = ivp(0.0), dU = ivp(0.0);
    for (int j = 0; j < N; j++) if (dz[j] != 0) dI = iv_add(dI, iv_scale(imag ? t.z[j].im : t.z[j].re, 2.0 * dz[j]));
    for (int j = 0; j < N; j++) for (int k = j + 1; k < N; k++) {
      double e = dz[j] - dz[k]; if (e == 0) continue;
      /* d d^{1-A/2} = (2-A) p (a da + b db) */
      iv comp = imag ? t.w[j][k].im : t.w[j][k].re;
      dU = iv_add(dU, iv_scale(iv_mul(iv_mul(t.p[j][k], comp), iv_sub(ivp(2.0), AI)), e));
    }
    int q = 0;
    for (int j = 1; j < N - 1; j++) {
      civ dS = czero();
      for (int k = 0; k < N; k++) if (k != j) {
        double e = dz[j] - dz[k]; if (e == 0) continue;
        civ g = imag ? pb[j][k] : pa[j][k];
        dS = cadd(dS, cscale(g, e));
      }
      /* dH = dI S + I dS - dU z - U dz */
      civ dH;
      dH.re = iv_add(iv_mul(dI, S[j].re), iv_mul(t.I, dS.re));
      dH.im = iv_add(iv_mul(dI, S[j].im), iv_mul(t.I, dS.im));
      dH.re = iv_sub(dH.re, iv_mul(dU, t.z[j].re));
      dH.im = iv_sub(dH.im, iv_mul(dU, t.z[j].im));
      if (dz[j] != 0) {
        if (imag) dH.im = iv_sub(dH.im, iv_scale(U, dz[j]));
        else dH.re = iv_sub(dH.re, iv_scale(U, dz[j]));
      }
      J[q++][c] = dH.re; J[q++][c] = dH.im;
    }
  }
}

/* dE/dA at the z-point of box m over the A-interval AI:
 * d/dA d^{-A/2} = -(1/2) ln d d^{-A/2},  d/dA d^{1-A/2} = -(1/2) ln d d^{1-A/2},
 * dH_j/dA = I sum_k w_jk dp_jk/dA - (dU'/dA) z_j. */
static void evalEA(const box *b, iv dE[]) {
  tables t; build(b, &t);
  iv lnd[MAXN][MAXN];
  for (int j = 0; j < N; j++) for (int k = j + 1; k < N; k++) lnd[j][k] = lnd[k][j] = iv_scale(iv_log(t.d[j][k]), -0.5);
  iv dU = ivp(0.0);
  for (int j = 0; j < N; j++) for (int k = j + 1; k < N; k++) dU = iv_add(dU, iv_mul(t.u[j][k], lnd[j][k]));
  int r = 0;
  for (int j = 1; j < N - 1; j++) {
    civ s = czero();
    for (int k = 0; k < N; k++) if (k != j) {
      iv f = iv_mul(t.p[j][k], lnd[j][k]);
      civ g = {iv_mul(t.w[j][k].re, f), iv_mul(t.w[j][k].im, f)};
      s = cadd(s, g);
    }
    dE[r++] = iv_sub(iv_mul(t.I, s.re), iv_mul(dU, t.z[j].re));
    dE[r++] = iv_sub(iv_mul(t.I, s.im), iv_mul(dU, t.z[j].im));
  }
}
/* E at the z-point of m over the A-interval AI, in mean-value form in A */
static void evalE_mid(const box *m, iv Em[]) {
  iv save = AI; double am = iv_mid(AI);
  if (iv_wid(AI) == 0) { evalE(m, Em, NULL); return; }
  AI = ivp(am); iv E0[MAXD]; evalE(m, E0, NULL);
  AI = save; iv dA[MAXD]; evalEA(m, dA);
  iv direct[MAXD]; evalE(m, direct, NULL);
  for (int q = 0; q < D; q++) {
    iv mv = iv_add(E0[q], iv_mul(dA[q], iv_sub(AI, ivp(am))));
    /* both enclose the range; keep the intersection */
    Em[q] = ivr(fmax(mv.lo, direct[q].lo), fmin(mv.hi, direct[q].hi));
  }
}

/* all set partitions into blocks of size >= 2 (encoded as block masks) */
static int nparts; static int parts[256][MAXN]; static int partn[256];
static void gen_parts(int used, int *cur, int nc) {
  /* choose the lowest unused index: either a singleton (skip) or the lowest
   * member of a new block of size >= 2 */
  int i = 0; while (i < N && (used >> i & 1)) i++;
  if (i == N) {
    if (nc > 0) { for (int c = 0; c < nc; c++) parts[nparts][c] = cur[c]; partn[nparts++] = nc; }
    return;
  }
  gen_parts(used | 1 << i, cur, nc);  /* i is a singleton */
  int rest = ((1 << N) - 1) & ~used & ~(1 << i);
  for (int sub = rest; sub; sub = (sub - 1) & rest) {
    cur[nc] = sub | 1 << i;
    gen_parts(used | cur[nc], cur, nc + 1);
  }
}

static int exclude_basic(const box *b, tables *t, int *ap) {
  build(b, t);
  if (use_sym) {
    for (int j = 1; j < N - 1; j++) if (t->z[j].re.lo > t->z[j + 1].re.hi) return 1;
    if (t->z[1].im.hi < 0) return 1;
  }
  for (int j = 1; j < N; j++) if (cabs2(t->z[j]).lo > 1.0) return 1;
  *ap = allpos(t);
  /* T2: H_j for j with all distances positive; needs U' finite */
  if (*ap) {
    iv U = Uprime(t);
    for (int j = 0; j < N; j++) {
      civ h = Hj(t, j, U);
      if (mutate == 2) h.re = iv_add(h.re, ivp(0.25));
      if (!iv_has0(h.re) || !iv_has0(h.im)) return 2;
    }
    /* mean-value form in A: H_j(X, A) in H_j(X, A_mid) + dH_j/dA(X, [A]) (A - A_mid),
     * dH_j/dA = I sum_k w_jk p_jk (-(1/2) ln d_jk) - (dU'/dA) z_j */
    if (iv_wid(AI) > 0) {
      iv save = AI; double am = iv_mid(AI);
      iv lnd[MAXN][MAXN];
      for (int j = 0; j < N; j++) for (int k = j + 1; k < N; k++) lnd[j][k] = lnd[k][j] = iv_scale(iv_log(t->d[j][k]), -0.5);
      iv dU = ivp(0.0);
      for (int j = 0; j < N; j++) for (int k = j + 1; k < N; k++) dU = iv_add(dU, iv_mul(t->u[j][k], lnd[j][k]));
      civ dH[MAXN];
      for (int j = 0; j < N; j++) {
        civ sum = czero();
        for (int k = 0; k < N; k++) if (k != j) {
          iv f = iv_mul(t->p[j][k], lnd[j][k]);
          civ g = {iv_mul(t->w[j][k].re, f), iv_mul(t->w[j][k].im, f)};
          sum = cadd(sum, g);
        }
        dH[j].re = iv_sub(iv_mul(t->I, sum.re), iv_mul(dU, t->z[j].re));
        dH[j].im = iv_sub(iv_mul(t->I, sum.im), iv_mul(dU, t->z[j].im));
      }
      AI = ivp(am);
      tables tm; build(b, &tm);
      iv Um = Uprime(&tm);
      iv dA = iv_sub(save, ivp(am));
      int excl = 0;
      for (int j = 0; j < N && !excl; j++) {
        civ h0 = Hj(&tm, j, Um);
        iv hr = iv_add(h0.re, iv_mul(dH[j].re, dA)), hi = iv_add(h0.im, iv_mul(dH[j].im, dA));
        if (mutate == 2) hr = iv_add(hr, ivp(0.25));
        if (!iv_has0(hr) || !iv_has0(hi)) excl = 1;
      }
      AI = save;
      if (excl) return 2;
    }
  }
  /* T3: partition identities */
  for (int pi = 0; pi < nparts; pi++) {
    int inblock[MAXN]; for (int j = 0; j < N; j++) inblock[j] = -1;
    for (int c = 0; c < partn[pi]; c++) for (int j = 0; j < N; j++) if (parts[pi][c] >> j & 1) inblock[j] = c;
    int ok = 1;
    for (int j = 0; j < N && ok; j++) for (int k = j + 1; k < N; k++)
      if ((inblock[j] < 0 || inblock[j] != inblock[k]) && !t->pos[j][k]) { ok = 0; break; }
    if (!ok) continue;
    /* sum over blocks */
    iv sumIC = ivp(0.0); double sumUClo = 0; civ sumX = czero(); iv UR = ivp(0.0);
    int unbounded = 0;
    for (int j = 0; j < N; j++) for (int k = j + 1; k < N; k++)
      if (inblock[j] < 0 || inblock[j] != inblock[k]) UR = iv_add(UR, t->u[j][k]);
    for (int c = 0; c < partn[pi]; c++) {
      int S = parts[pi][c], n = __builtin_popcount(S);
      iv IC = ivp(0.0);
      double UClo = 0;  /* lower bound of the internal sum */
      for (int j = 0; j < N; j++) if (S >> j & 1)
        for (int k = j + 1; k < N; k++) if (S >> k & 1) {
          IC = iv_add(IC, t->d[j][k]);
          double l = d1mA2_lo(t->d[j][k]);
          UClo = -((-UClo) - l);
        }
      IC = iv_mul(IC, iv_recip(ivp((double)n)));  /* I_C = (1/n) sum d */
      sumIC = iv_add(sumIC, IC);
      sumUClo = -((-sumUClo) - UClo);
      for (int j = 0; j < N; j++) if (S >> j & 1) {
        civ cross = czero();
        for (int k = 0; k < N; k++) if (!(S >> k & 1)) cross = cadd(cross, t->phi[j][k]);
        civ wj = czero();  /* n (z_j - c_C) */
        for (int k = 0; k < N; k++) if ((S >> k & 1) && k != j) wj = cadd(wj, t->w[j][k]);
        /* conj(wj) * cross / n */
        civ prod = cmul(cconj(wj), cross);
        prod.re = iv_mul(prod.re, iv_recip(ivp((double)n)));
        prod.im = iv_mul(prod.im, iv_recip(ivp((double)n)));
        sumX = cadd(sumX, prod);
      }
    }
    (void)unbounded;
    iv coef = iv_sub(t->I, sumIC);
    if (mutate == 3) coef = iv_neg(coef);
    if (coef.lo <= 0) continue;
    /* real part: sumUC*coef + I*Re(sumX) - UR*sumIC ; lower bound uses UClo */
    iv rest = iv_sub(iv_mul(t->I, sumX.re), iv_mul(UR, sumIC));
    double lo = -((-mul_dn(sumUClo, coef.lo)) - rest.lo);
    if (lo > 0) return 3;
    /* A = 2: the internal sum is exact, so an upper bound is available too */
    if (!param && A2 == 4) {
      double hi = mul_up(sumUClo, coef.hi) + rest.hi;
      if (hi < 0) return 3;
    }
    iv im = iv_mul(t->I, sumX.im);
    if (!iv_has0(im)) return 3;
  }
  return 0;
}

static int finv(double M[][MAXD], double C[][MAXD]) {
  double a[MAXD][2 * MAXD];
  for (int i = 0; i < D; i++) for (int j = 0; j < D; j++) { a[i][j] = M[i][j]; a[i][D + j] = (i == j); }
  for (int c = 0; c < D; c++) {
    int p = c; for (int i = c + 1; i < D; i++) if (fabs(a[i][c]) > fabs(a[p][c])) p = i;
    if (fabs(a[p][c]) < 1e-300) return 0;
    for (int j = 0; j < 2 * D; j++) { double t = a[c][j]; a[c][j] = a[p][j]; a[p][j] = t; }
    double piv = a[c][c];
    for (int j = 0; j < 2 * D; j++) a[c][j] /= piv;
    for (int i = 0; i < D; i++) if (i != c) {
      double f = a[i][c]; if (f == 0) continue;
      for (int j = 0; j < 2 * D; j++) a[i][j] -= f * a[c][j];
    }
  }
  for (int i = 0; i < D; i++) for (int j = 0; j < D; j++) C[i][j] = a[i][D + j];
  return 1;
}

static int boxpos(const box *b) { tables t; build(b, &t); return allpos(&t); }

static int krawczyk(const box *X, box *K) {
  AI = X->a;
  if (!boxpos(X)) return 0;
  iv J[MAXD][MAXD], Ev[MAXD];
  evalE(X, Ev, J);
  box m; double mv[MAXD]; m.a = X->a;
  for (int i = 0; i < D; i++) { mv[i] = iv_mid(X->x[i]); m.x[i] = ivp(mv[i]); }
  if (!boxpos(&m)) return 0;
  iv Em[MAXD]; evalE_mid(&m, Em);
  double Jm[MAXD][MAXD], C[MAXD][MAXD];
  for (int i = 0; i < D; i++) for (int j = 0; j < D; j++) Jm[i][j] = iv_mid(J[i][j]);
  if (!finv(Jm, C)) return 0;
  for (int i = 0; i < D; i++) {
    iv s = ivp(mv[i]);
    for (int k = 0; k < D; k++) s = iv_sub(s, iv_mul(ivp(C[i][k]), Em[k]));
    for (int j = 0; j < D; j++) {
      iv mij = ivp(i == j ? 1.0 : 0.0);
      for (int k = 0; k < D; k++) mij = iv_sub(mij, iv_mul(ivp(C[i][k]), J[k][j]));
      s = iv_add(s, iv_mul(mij, iv_sub(X->x[j], ivp(mv[j]))));
    }
    K->x[i] = s;
  }
  return 1;
}

static void print_box(const char *tag, const box *b) {
  printf("%s", tag);
  for (int i = 0; i < D; i++) printf(" %a %a", b->x[i].lo, b->x[i].hi);
  printf(" %a %a\n", b->a.lo, b->a.hi);
}
static double maxwid(const box *b, int *arg) {
  double w = -1; int a = 0;
  for (int i = 0; i < D; i++) if (iv_wid(b->x[i]) > w) { w = iv_wid(b->x[i]); a = i; }
  if (arg) *arg = a;
  return w;
}
static int split_hint;
/* recently certified boxes: a box inside one of them (z and A) holds no
 * solution outside that certified box, so it needs no further work */
#define NCACHE 256
static box cache[NCACHE]; static int ncache, cpos;
static long st_cached;
static int in_cache(const box *b) {
  for (int c = 0; c < ncache; c++) {
    const box *x = &cache[c];
    if (!(b->a.lo >= x->a.lo && b->a.hi <= x->a.hi)) continue;
    int ok = 1;
    for (int i = 0; i < D && ok; i++) if (!(b->x[i].lo >= x->x[i].lo && b->x[i].hi <= x->x[i].hi)) ok = 0;
    if (ok) return 1;
  }
  return 0;
}
static int process(box *b) {
  st_boxes++; split_hint = -1;
  AI = b->a;
  if (in_cache(b)) { st_cached++; return 1; }
  tables t; int ap = 0;
  int r = exclude_basic(b, &t, &ap);
  if (r == 1) { st_t0++; return 1; }
  if (r == 2) { st_t2++; return 1; }
  if (r == 3) { st_t3++; return 1; }
  if (!ap) return 0;
  iv J[MAXD][MAXD], Ev[MAXD];
  evalE(b, Ev, J);
  double best = -1;
  for (int c = 0; c < D; c++) {
    double m = 0;
    for (int q = 0; q < D; q++) m = fmax(m, fmax(fabs(J[q][c].lo), fabs(J[q][c].hi)));
    if (m * iv_wid(b->x[c]) > best) { best = m * iv_wid(b->x[c]); split_hint = c; }
  }
  box m; double mv[MAXD]; m.a = b->a;
  for (int i = 0; i < D; i++) { mv[i] = iv_mid(b->x[i]); m.x[i] = ivp(mv[i]); }
  if (!boxpos(&m)) return 0;
  iv Em[MAXD]; evalE_mid(&m, Em);
  /* split A when the spread of E at the z-midpoint over the A-range
   * dominates the first-order spread over the z-box */
  { double wA = 0, wZ = 0;
    for (int q = 0; q < D; q++) {
      wA = fmax(wA, iv_wid(Em[q]));
      double t = 0; for (int c = 0; c < D; c++) t += fmax(fabs(J[q][c].lo), fabs(J[q][c].hi)) * iv_wid(b->x[c]);
      wZ = fmax(wZ, t);
    }
    if (wA > 0.5 * wZ && iv_wid(b->a) > 1e-9) split_hint = D; }
  for (int q = 0; q < D; q++) {
    iv s = Em[q];
    for (int c = 0; c < D; c++) s = iv_add(s, iv_mul(J[q][c], iv_sub(b->x[c], ivp(mv[c]))));
    if (!iv_has0(s)) { st_t4++; return 1; }
  }
  box K;
  if (!krawczyk(b, &K)) return 0;
  box nb; nb.a = b->a;
  for (int i = 0; i < D; i++) {
    double lo = fmax(b->x[i].lo, K.x[i].lo), hi = fmin(b->x[i].hi, K.x[i].hi);
    if (lo > hi) { st_t4++; return 1; }
    nb.x[i] = ivr(lo, hi);
  }
  if (maxwid(&nb, NULL) <= KTHRESH) {
    box X2; X2.a = nb.a;
    /* centred on the Krawczyk image K (the Newton point), radius twice its
     * radius: with an A-range, the spread of E(m) over A keeps K about as
     * wide as the box, so centring on the contracted box (which can be
     * pinned at the chart boundary) would never succeed */
    for (int i = 0; i < D; i++) {
      double c = iv_mid(K.x[i]), rr = iv_wid(K.x[i]) + 1e-13 * (1.0 + fabs(c));
      X2.x[i] = ivr(-(-c + rr), c + rr);
    }
    box K2;
    if (krawczyk(&X2, &K2)) {
      int inside = 1;
      for (int i = 0; i < D; i++) if (!(K2.x[i].lo > X2.x[i].lo && K2.x[i].hi < X2.x[i].hi)) { inside = 0; break; }
      if (getenv("BNB_TRACE") && maxwid(b, NULL) < 1e-4) {
        fprintf(stderr, "TRACE A=[%.9g,%.9g] inside=%d", b->a.lo, b->a.hi, inside);
        for (int i = 0; i < D; i++) fprintf(stderr, " X[%.12g,%.12g] K[%.12g,%.12g]", X2.x[i].lo, X2.x[i].hi, K2.x[i].lo, K2.x[i].hi);
        fprintf(stderr, "\n"); }
      if (inside) {
        civ z[MAXN]; zfrom(&X2, z);
        iv g = iv_sub(ivp(1.0), z[N - 1].re);  /* z_N != 1: Re z_N < 1 */
        if (g.lo > 0) {
          st_cert++; X2.a = b->a; print_box("CERT", &X2);
          cache[cpos] = X2; cpos = (cpos + 1) % NCACHE; if (ncache < NCACHE) ncache++;
          return 1;
        }
      }
    }
  }
  if (maxwid(&nb, NULL) < 0.7 * maxwid(b, NULL)) { *b = nb; return process(b); }
  return 0;
}

static box *stack; static long sp, cap;
static void push(const box *b) {
  if (sp == cap) { cap = cap ? 2 * cap : 1 << 16; stack = realloc(stack, cap * sizeof(box)); }
  stack[sp++] = *b;
}
static double bvol(const box *b) { double v = iv_wid(b->a); for (int i = 0; i < D; i++) v *= iv_wid(b->x[i]); return v; }
static void run(box root) {
  push(&root);
  while (sp > 0) {
    box b = stack[--sp];
    if (st_boxes >= next_report) {
      next_report += 1L << 20;
      fprintf(stderr, "progress boxes=%ld volume_done=%.6f cert=%ld unres=%ld\n", st_boxes, vol_done / vol_total, st_cert, st_unres);
    }
    double v0 = bvol(&b);
    if (process(&b)) { vol_done += v0; continue; }
    int a; double w = maxwid(&b, &a);
    if (split_hint >= 0 && split_hint < D && iv_wid(b.x[split_hint]) > 0.05 * w) a = split_hint;
    if (w < MINW && iv_wid(b.a) < MINW) { st_unres++; vol_done += v0; print_box("UNRES", &b); continue; }
    box l = b, r = b;
    if (split_hint == D || (w < MINW)) { double c = iv_mid(b.a); l.a.hi = c; r.a.lo = c; }
    else { double c = iv_mid(b.x[a]); l.x[a].hi = c; r.x[a].lo = c; }
    push(&r); push(&l);
  }
}

int main(int argc, char **argv) {
  if (argc < 7) { fprintf(stderr, "usage: bnbP N a b nsplit worker nworkers [minwidth] [--sym]\n"); return 2; }
  iv_init();
  N = atoi(argv[1]); D = 2 * N - 4;
  AI.lo = strtod(argv[2], NULL); AI.hi = strtod(argv[3], NULL);
  if (!(AI.lo >= 2 && AI.hi >= AI.lo)) { fprintf(stderr, "need 2 <= a <= b\n"); return 2; }
  param = 1; A = iv_mid(AI); A2 = -1;
  argv++; argc--;
  int nsplit = atoi(argv[3]), worker = atoi(argv[4]), nworkers = atoi(argv[5]);
  if (worker < 0 || worker >= nworkers) { fprintf(stderr, "need 0 <= worker < nworkers\n"); return 2; }
  if (argc > 6) MINW = atof(argv[6]);
  for (int i = 7; i < argc; i++) {
    if (!strcmp(argv[i], "--sym")) use_sym = 1;
    else if (!strncmp(argv[i], "--mutate=", 9)) mutate = atoi(argv[i] + 9);
  }
  int cur[MAXN]; gen_parts(0, cur, 0);
  if (getenv("BNB_PT")) { box b; char *p = getenv("BNB_PT");
    for (int i = 0; i < D; i++) { double v = strtod(p, &p); b.x[i] = ivp(v); }
    iv E[MAXD], J[MAXD][MAXD]; evalE(&b, E, J);
    for (int i = 0; i < D; i++) printf("E %a %a\n", E[i].lo, E[i].hi);
    for (int i = 0; i < D; i++) { for (int j = 0; j < D; j++) printf("J %d %d %a %a\n", i, j, J[i][j].lo, J[i][j].hi); }
    return 0; }
  box root; for (int i = 0; i < D; i++) root.x[i] = ivr(-1.0, 1.0);
  root.a = AI;
  box *q = malloc(sizeof(box) * 4 * (nsplit + 4)); long nq = 1; q[0] = root;
  while (nq < nsplit) {
    long m = nq; box *q2 = malloc(sizeof(box) * (2 * m + 4)); long n2 = 0;
    for (long i = 0; i < m; i++) {
      int a; maxwid(&q[i], &a); double c = iv_mid(q[i].x[a]);
      box l = q[i], r = q[i]; l.x[a].hi = c; r.x[a].lo = c; q2[n2++] = l; q2[n2++] = r;
    }
    free(q); q = q2; nq = n2;
  }
  setvbuf(stdout, NULL, _IOLBF, 0);
  for (long i = 0; i < nq; i++) if (i % nworkers == worker) vol_total += bvol(&q[i]);
  for (long i = 0; i < nq; i++) if (i % nworkers == worker) run(q[i]);
  printf("STAT root=%s mutate=%d nworkers=%d nsplit=%d joint A in [%a,%a] sym=%d N=%d worker=%d partitions=%d boxes=%ld t0_chart=%ld t2_H=%ld t3_partition=%ld t4_mv_krawczyk=%ld cached=%ld cert=%ld unres=%ld\n", getenv("BNB_ROOT") ? "custom" : "chart", mutate, nworkers, nsplit,
         root.a.lo, root.a.hi, use_sym, N, worker, nparts, st_boxes, st_t0, st_t2, st_t3, st_t4, st_cached, st_cert, st_unres);
  return 0;
}
