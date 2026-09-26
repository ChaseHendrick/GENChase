/* Interval branch-and-bound for the relative equilibria of N identical point
 * vortices in the plane (N = 3..6).
 *
 * Equations.  With circulations 1 and angular velocity normalized so that
 * lambda = 1, a relative equilibrium z_1..z_N (complex, distinct) satisfies
 *
 *     G_j(z) = sum_{k != j} 1/(z_j - z_k) - conj(z_j) = 0,   j = 1..N.     (1)
 *
 * Summing (1) gives sum z_j = 0; multiplying by z_j and summing gives
 * sum |z_j|^2 = N(N-1)/2.  Conversely every relative equilibrium is, after a
 * translation and a scaling, a solution of (1), unique up to rotation.
 *
 * Chart.  Relabel so that vortex 1 has the largest modulus and rotate so that
 * z_1 = x_1 > 0.  Then 2 <= x_1^2 <= ... namely  I/N <= x_1^2 <= I (N-1)/N,
 * |z_j| <= x_1, and z_N = -(z_1 + ... + z_{N-1}).  Unknowns
 *     v = (x_1, Re z_2, Im z_2, ..., Re z_{N-1}, Im z_{N-1}),  dim 2N-3.
 * Every relative equilibrium has at least one labelled copy in this chart.
 *
 * Square system (Krawczyk).  E = (Re G_2, Im G_2, ..., Re G_{N-1},
 * Im G_{N-1}, Re G_1).  If E = 0 then, from the identities
 *     sum_j G_j = 0   and   Im sum_j z_j G_j = 0   (valid when sum z_j = 0),
 * G_1 + G_N = 0 and Im((x_1 - z_N) G_1) = 0, so with Re G_1 = 0 we get
 * G_1 = 0 whenever Re z_N < x_1.  The program checks Re z_N < x_1 on every
 * certified box, so a zero of E there is a zero of (1).
 *
 * Exclusion tests (each a consequence of (1), so a box failing one holds no
 * solution):
 *   T0  some |z_j| > x_1 on the whole box (outside the chart);
 *   T1  sum |z_j|^2 != N(N-1)/2;
 *   T2  G_j != 0 (for j whose distances to all others are bounded below);
 *   T3  cluster identities, for every S with 2 <= |S| <= N-1 whose
 *       distances to the complement are bounded below:
 *         P_S = sum_{j in S} sum_{k notin S} 1/(z_j - z_k) - sum_{j in S} conj(z_j) = 0
 *         Q_S = |S|^2(|S|-1)/2 + sum_{j in S} w_j sum_{k notin S} 1/(z_j - z_k)
 *               - sum_{j<k in S} |z_j - z_k|^2 = 0,
 *       where w_j = |S| (z_j - c_S) = sum_{k in S} (z_j - z_k).  Q_S is |S|
 *       times the identity  sum_{j in S} (z_j - c_S) G_j = 0; the singular
 *       terms inside S sum exactly to the constant, so Q_S stays bounded
 *       near a collision inside S and fails there.  These tests remove every
 *       neighbourhood of the collision set.
 *   T4  Krawczyk exclusion K(X) cap X = empty.
 * Existence and uniqueness: Krawczyk K(X') in int(X') on an inflated box X'.
 *
 * Output (stdout): lines "CERT v_lo v_hi ..." for each certified box, and a
 * final "STAT" line; "UNRES" lines for boxes that reached the minimum width
 * (the proof requires there to be none).
 *
 * Usage: bnb N nsplit worker nworkers [minwidth]
 *   The initial chart box is split into nsplit pieces along each of the
 *   first coordinates (breadth first, to at least nsplit boxes); worker w
 *   processes pieces with index = w mod nworkers.
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "ival.h"

#define MAXN 6
#define MAXD (2 * MAXN - 3)

static int N, D;
static double MINW = 1e-11;
static int use_cluster = 1, use_krawczyk = 1; /* for mutation tests */
static double KTHRESH = 0.25;                 /* max width to try Krawczyk */
static int mutate = 0;                        /* negative-control mutations */
static int use_sym = 0;  /* restrict to Re z_2 <= ... <= Re z_N and Im z_2 >= 0 */
static double vol_total, vol_done; static long next_report = 1L << 20;

typedef struct { iv x[MAXD]; } box;

static long st_boxes, st_t0, st_t1, st_t2, st_t3, st_t4, st_cert, st_unres;

static void zfrom(const box *b, civ z[]) {
  z[0].re = b->x[0]; z[0].im = ivp(0.0);
  civ s = z[0];
  for (int j = 1; j < N - 1; j++) {
    z[j].re = b->x[2 * j - 1]; z[j].im = b->x[2 * j];
    s = cadd(s, z[j]);
  }
  z[N - 1] = cneg(s);
}

/* Tight enclosure of 1/w over a complex rectangle w not containing 0.
 * Re(1/w) = a/(a^2+b^2), Im(1/w) = -b/(a^2+b^2).  f(a,b) = a/(a^2+b^2) has
 * no interior critical point; on an edge with a fixed its extremum is at
 * b = 0, on an edge with b fixed at a = +-|b|.  So the range of f over the
 * rectangle is the hull of f at the corners and those edge points, each
 * evaluated in interval arithmetic.  g(a,b) = b/(a^2+b^2) likewise with the
 * roles of a and b exchanged. */
static iv ratio_pt(double p, double q) { /* p/(p^2+q^2) at a point, enclosed */
  iv P = ivp(p), Q = ivp(q);
  return iv_mul(P, iv_recip(iv_add(iv_sqr(P), iv_sqr(Q))));
}
static iv ratio_range(iv a, iv b) { /* range of a/(a^2+b^2) */
  double cand[16][2]; int n = 0;
  cand[n][0] = a.lo; cand[n++][1] = b.lo; cand[n][0] = a.lo; cand[n++][1] = b.hi;
  cand[n][0] = a.hi; cand[n++][1] = b.lo; cand[n][0] = a.hi; cand[n++][1] = b.hi;
  if (b.lo <= 0 && b.hi >= 0) { cand[n][0] = a.lo; cand[n++][1] = 0; cand[n][0] = a.hi; cand[n++][1] = 0; }
  double bb[2] = {b.lo, b.hi};
  for (int e = 0; e < 2; e++) {
    double t = fabs(bb[e]);
    if (t >= a.lo && t <= a.hi) { cand[n][0] = t; cand[n++][1] = bb[e]; }
    if (-t >= a.lo && -t <= a.hi) { cand[n][0] = -t; cand[n++][1] = bb[e]; }
  }
  iv r = ratio_pt(cand[0][0], cand[0][1]);
  for (int i = 1; i < n; i++) { iv t = ratio_pt(cand[i][0], cand[i][1]); r.lo = fmin(r.lo, t.lo); r.hi = fmax(r.hi, t.hi); }
  return r;
}
static civ cinv_tight(civ w) {
  civ r; r.re = ratio_range(w.re, w.im); r.im = iv_neg(ratio_range(w.im, w.re)); return r;
}

/* G_j for all j (only valid where flagged ok[j]); also inverse table */
static void pair_tables(civ z[], civ w[MAXN][MAXN], iv d[MAXN][MAXN], int pos[MAXN][MAXN]) {
  for (int j = 0; j < N; j++)
    for (int k = j + 1; k < N; k++) {
      w[j][k] = csub(z[j], z[k]); w[k][j] = cneg(w[j][k]);
      d[j][k] = d[k][j] = cabs2(w[j][k]);
      pos[j][k] = pos[k][j] = iv_pos(d[j][k]);
    }
}

/* E(v) and optionally its Jacobian on a box; returns 0 if some distance is
 * not bounded below (then nothing is computed). */
static int evalE(const box *b, iv E[], iv J[][MAXD]) {
  civ z[MAXN], w[MAXN][MAXN], inv[MAXN][MAXN];
  iv d[MAXN][MAXN]; int pos[MAXN][MAXN];
  zfrom(b, z); pair_tables(z, w, d, pos);
  for (int j = 0; j < N; j++) for (int k = j + 1; k < N; k++) if (!pos[j][k]) return 0;
  civ G[MAXN];
  for (int j = 0; j < N; j++) {
    for (int k = j + 1; k < N; k++) { inv[j][k] = cinv_tight(w[j][k]); inv[k][j] = cneg(inv[j][k]); }
  }
  for (int j = 0; j < N; j++) {
    civ h = czero();
    for (int k = 0; k < N; k++) if (k != j) h = cadd(h, inv[j][k]);
    G[j] = csub(h, cconj(z[j]));
  }
  int r = 0;
  for (int j = 1; j < N - 1; j++) { E[r++] = G[j].re; E[r++] = G[j].im; }
  E[r++] = G[0].re;
  if (!J) return 1;
  /* A[j][m] = d h_j / d z_m (holomorphic): (z_j-z_m)^-2 for m != j,
   * -sum_k (z_j-z_k)^-2 for m = j. */
  civ A[MAXN][MAXN];
  for (int j = 0; j < N; j++) {
    civ s = czero();
    for (int m = 0; m < N; m++) if (m != j) { A[j][m] = csqr(inv[j][m]); s = cadd(s, A[j][m]); }
    A[j][j] = cneg(s);
  }
  int rows[MAXD], isim[MAXD]; r = 0;
  for (int j = 1; j < N - 1; j++) { rows[r] = j; isim[r++] = 0; rows[r] = j; isim[r++] = 1; }
  rows[r] = 0; isim[r++] = 0;
  for (int q = 0; q < D; q++) {
    int j = rows[q];
    for (int c = 0; c < D; c++) {
      /* variable c: c = 0 -> x_1 (m = 0, real direction); c = 2m-1 -> Re z_m,
       * c = 2m -> Im z_m.  dz_N/d(var) = -dz_m/d(var). */
      int m = (c == 0) ? 0 : (c + 1) / 2;
      int imag = (c != 0) && (c % 2 == 0);
      civ diffA = csub(A[j][m], A[j][N - 1]);
      double dl = (j == m ? 1.0 : 0.0) - (j == N - 1 ? 1.0 : 0.0);
      civ dG;
      if (!imag) { /* dG = diffA - dl */
        dG = diffA; dG.re = iv_sub(dG.re, ivp(dl));
      } else {     /* dG = i diffA + i dl */
        dG.re = iv_neg(diffA.im); dG.im = diffA.re; dG.im = iv_add(dG.im, ivp(dl));
      }
      J[q][c] = isim[q] ? dG.im : dG.re;
    }
  }
  return 1;
}

/* exclusion tests T0-T3.  returns test number that excluded (1..4) or 0 */
static int exclude_basic(const box *b, int *allpos) {
  civ z[MAXN], w[MAXN][MAXN];
  iv d[MAXN][MAXN]; int pos[MAXN][MAXN];
  zfrom(b, z);
  if (use_sym) {
    for (int j = 1; j < N - 1; j++) if (z[j].re.lo > z[j + 1].re.hi) return 1;
    if (z[1].im.hi < 0) return 1;
  }
  /* T0 */
  iv x2 = iv_sqr(b->x[0]);
  iv I = x2;
  for (int j = 1; j < N; j++) {
    iv m2 = cabs2(z[j]);
    if (m2.lo > x2.hi) return 1;
    I = iv_add(I, m2);
  }
  /* T1 */
  double Itarget = N * (N - 1) / 2.0;
  if (mutate == 1) Itarget += 0.5;
  if (I.lo > Itarget || I.hi < Itarget) return 2;
  pair_tables(z, w, d, pos);
  civ inv[MAXN][MAXN]; int haveinv[MAXN][MAXN];
  *allpos = 1;
  for (int j = 0; j < N; j++) for (int k = 0; k < N; k++) haveinv[j][k] = 0;
  for (int j = 0; j < N; j++)
    for (int k = j + 1; k < N; k++) {
      if (pos[j][k]) {
        inv[j][k] = cinv_tight(w[j][k]); inv[k][j] = cneg(inv[j][k]);
        haveinv[j][k] = haveinv[k][j] = 1;
      } else *allpos = 0;
    }
  /* T2 */
  for (int j = 0; j < N; j++) {
    int ok = 1;
    for (int k = 0; k < N; k++) if (k != j && !haveinv[j][k]) { ok = 0; break; }
    if (!ok) continue;
    civ h = czero();
    for (int k = 0; k < N; k++) if (k != j) h = cadd(h, inv[j][k]);
    civ G = csub(h, cconj(z[j]));
    if (mutate == 2) G.re = iv_add(G.re, ivp(0.25));
    if (!iv_has0(G.re) || !iv_has0(G.im)) return 3;
  }
  if (!use_cluster) return 0;
  /* T3 */
  for (int S = 1; S < (1 << N) - 1; S++) {
    int n = __builtin_popcount(S);
    if (n < 2) continue;
    int ok = 1;
    for (int j = 0; j < N && ok; j++) if (S >> j & 1)
      for (int k = 0; k < N; k++) if (!(S >> k & 1) && !haveinv[j][k]) { ok = 0; break; }
    if (!ok) continue;
    civ P = czero(), Q = czero();
    iv Isum = ivp(0.0);
    for (int j = 0; j < N; j++) if (S >> j & 1) {
      civ cross = czero();
      for (int k = 0; k < N; k++) if (!(S >> k & 1)) cross = cadd(cross, inv[j][k]);
      P = cadd(P, csub(cross, cconj(z[j])));
      civ wj = czero();
      for (int k = 0; k < N; k++) if ((S >> k & 1) && k != j) wj = cadd(wj, w[j][k]);
      Q = cadd(Q, cmul(wj, cross));
      for (int k = j + 1; k < N; k++) if (S >> k & 1) Isum = iv_add(Isum, d[j][k]);
    }
    double cst = n * n * (n - 1) / 2.0;
    if (mutate == 3) cst = 0.0;
    Q.re = iv_sub(iv_add(Q.re, ivp(cst)), Isum);
    if (!iv_has0(P.re) || !iv_has0(P.im)) return 4;
    if (!iv_has0(Q.re) || !iv_has0(Q.im)) return 4;
  }
  return 0;
}

/* floating inverse of a D x D matrix (Gauss-Jordan, partial pivoting).
 * Only an approximate inverse is needed; rigour does not depend on it. */
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

/* Krawczyk operator on box X.  Returns 1 and fills K if computable. */
static int krawczyk(const box *X, box *K) {
  iv J[MAXD][MAXD], Ev[MAXD];
  if (!evalE(X, Ev, J)) return 0;
  box m; double mv[MAXD];
  for (int i = 0; i < D; i++) { mv[i] = iv_mid(X->x[i]); m.x[i] = ivp(mv[i]); }
  iv Em[MAXD];
  if (!evalE(&m, Em, NULL)) return 0;
  double Jm[MAXD][MAXD], C[MAXD][MAXD];
  for (int i = 0; i < D; i++) for (int j = 0; j < D; j++) Jm[i][j] = iv_mid(J[i][j]);
  if (!finv(Jm, C)) return 0;
  for (int i = 0; i < D; i++) {
    iv s = ivp(mv[i]);
    for (int k = 0; k < D; k++) s = iv_sub(s, iv_mul(ivp(C[i][k]), Em[k]));
    for (int j = 0; j < D; j++) {
      iv mij = ivp(i == j ? 1.0 : 0.0);
      for (int k = 0; k < D; k++) mij = iv_sub(mij, iv_mul(ivp(C[i][k]), J[k][j]));
      if (mutate != 5) s = iv_add(s, iv_mul(mij, iv_sub(X->x[j], ivp(mv[j]))));
    }
    K->x[i] = s;
  }
  return 1;
}

static void print_box(const char *tag, const box *b) {
  printf("%s", tag);
  for (int i = 0; i < D; i++) printf(" %a %a", b->x[i].lo, b->x[i].hi);
  printf("\n");
}

static double maxwid(const box *b, int *arg) {
  double w = -1; int a = 0;
  for (int i = 0; i < D; i++) if (iv_wid(b->x[i]) > w) { w = iv_wid(b->x[i]); a = i; }
  if (arg) *arg = a;
  return w;
}

/* returns 1 if the box is resolved (excluded or certified), 0 if it must be split;
 * may shrink *b. */
static int split_hint = -1;
/* returns 1 if the box is resolved (excluded or certified), 0 if it must be
 * split (split_hint then names the coordinate); may shrink *b. */
static int process(box *b) {
  st_boxes++;
  split_hint = -1;
  int allpos;
  int t = exclude_basic(b, &allpos);
  if (t == 1) { st_t0++; return 1; }
  if (t == 2) { st_t1++; return 1; }
  if (t == 3) { st_t2++; return 1; }
  if (t == 4) { st_t3++; return 1; }
  if (!allpos || !use_krawczyk) return 0;
  iv J[MAXD][MAXD], Ev[MAXD];
  if (!evalE(b, Ev, J)) return 0;
  /* smear heuristic for the split coordinate */
  double best = -1;
  for (int c = 0; c < D; c++) {
    double m = 0;
    for (int q = 0; q < D; q++) m = fmax(m, fmax(fabs(J[q][c].lo), fabs(J[q][c].hi)));
    double sm = m * iv_wid(b->x[c]);
    if (sm > best) { best = sm; split_hint = c; }
  }
  box m; double mv[MAXD];
  for (int i = 0; i < D; i++) { mv[i] = iv_mid(b->x[i]); m.x[i] = ivp(mv[i]); }
  iv Em[MAXD];
  if (!evalE(&m, Em, NULL)) return 0;
  /* T4a mean-value form: E(X) in E(m) + J(X)(X - m) */
  for (int q = 0; q < D; q++) {
    iv s = Em[q];
    if (mutate == 4) s = iv_add(s, ivp(0.25));
    for (int c = 0; c < D; c++) s = iv_add(s, iv_mul(J[q][c], iv_sub(b->x[c], ivp(mv[c]))));
    if (!iv_has0(s)) { st_t4++; return 1; }
  }
  box K;
  if (!krawczyk(b, &K)) return 0;
  box nb;
  for (int i = 0; i < D; i++) {
    double lo = fmax(b->x[i].lo, K.x[i].lo), hi = fmin(b->x[i].hi, K.x[i].hi);
    if (lo > hi) { st_t4++; return 1; }
    nb.x[i] = ivr(lo, hi);
  }
  double w = maxwid(&nb, NULL);
  if (w <= KTHRESH) {
    /* existence and uniqueness on an inflated box around the contracted box */
    box X2;
    for (int i = 0; i < D; i++) {
      double c = iv_mid(nb.x[i]), r = 0.5 * iv_wid(nb.x[i]);
      double rr = 2.0 * r + 1e-13 * (1.0 + fabs(c));
      X2.x[i] = ivr(-(-c + rr), c + rr); /* outward */
    }
    box K2;
    if (krawczyk(&X2, &K2)) {
      int inside = 1;
      for (int i = 0; i < D; i++) if (!(K2.x[i].lo > X2.x[i].lo && K2.x[i].hi < X2.x[i].hi)) { inside = 0; break; }
      if (inside) {
        /* the reduction condition Re z_N < x_1 on X2 */
        civ z[MAXN]; zfrom(&X2, z);
        iv g = iv_sub(X2.x[0], z[N - 1].re);
        if (g.lo > 0) {
          st_cert++;
          print_box("CERT", &X2);
          return 1;
        }
      }
    }
  }
  /* keep the contracted box only if it shrank substantially */
  double w0 = maxwid(b, NULL), w1 = maxwid(&nb, NULL);
  if (w1 < 0.7 * w0) { *b = nb; return process(b); }
  return 0;
}

static box *stack; static long sp, cap;
static void push(const box *b) {
  if (sp == cap) { cap = cap ? 2 * cap : 1 << 16; stack = realloc(stack, cap * sizeof(box)); }
  stack[sp++] = *b;
}

static double bvol(const box *b) {
  double v = 1; for (int i = 0; i < D; i++) v *= iv_wid(b->x[i]); return v;
}
static void run(box root) {
  push(&root);
  while (sp > 0) {
    box b = stack[--sp];
    if (st_boxes >= next_report) {
      next_report += getenv("BNB_DEBUG") ? 1L << 18 : 1L << 20;
      fprintf(stderr, "progress boxes=%ld volume_done=%.6f cert=%ld unres=%ld\n", st_boxes, vol_done / vol_total, st_cert, st_unres);
      if (getenv("BNB_DEBUG")) { fprintf(stderr, "  depth %ld ", sp); civ z[MAXN]; zfrom(&b, z);
        for (int j = 0; j < N; j++) fprintf(stderr, "z%d=[%.4g,%.4g]x[%.4g,%.4g] ", j + 1, z[j].re.lo, z[j].re.hi, z[j].im.lo, z[j].im.hi);
        fprintf(stderr, "\n"); }
    }
    double v0 = bvol(&b);
    if (process(&b)) { vol_done += v0; continue; }
    int a; double w = maxwid(&b, &a);
    if (split_hint >= 0 && iv_wid(b.x[split_hint]) > 0.05 * w) a = split_hint;
    if (w < MINW) { st_unres++; vol_done += v0; print_box("UNRES", &b); continue; }
    double c = iv_mid(b.x[a]);
    box l = b, r = b;
    l.x[a].hi = c; r.x[a].lo = c;
    push(&r); push(&l);
  }
}

int main(int argc, char **argv) {
  if (argc < 5) { fprintf(stderr, "usage: bnb N nsplit worker nworkers [minwidth] [flags]\n"); return 2; }
  iv_init();
  N = atoi(argv[1]); D = 2 * N - 3;
  int nsplit = atoi(argv[2]), worker = atoi(argv[3]), nworkers = atoi(argv[4]);
  if (worker < 0 || worker >= nworkers) { fprintf(stderr, "need 0 <= worker < nworkers\n"); return 2; }
  if (argc > 5) MINW = atof(argv[5]);
  for (int i = 6; i < argc; i++) {
    if (!strcmp(argv[i], "--no-cluster")) use_cluster = 0;
    else if (!strcmp(argv[i], "--no-krawczyk")) use_krawczyk = 0;
    else if (!strncmp(argv[i], "--mutate=", 9)) mutate = atoi(argv[i] + 9);
    else if (!strcmp(argv[i], "--sym")) use_sym = 1;
  }
  if (N < 3 || N > MAXN) return 2;
  if (getenv("BNB_PT")) { /* print E and J at a point (tests/test_jacobians.py) */
    box b; char *p = getenv("BNB_PT");
    for (int i = 0; i < D; i++) { double v = strtod(p, &p); b.x[i] = ivp(v); }
    iv E[MAXD], J[MAXD][MAXD];
    if (!evalE(&b, E, J)) return 1;
    for (int i = 0; i < D; i++) printf("E %a %a\n", E[i].lo, E[i].hi);
    for (int i = 0; i < D; i++) { for (int j = 0; j < D; j++) printf("J %d %d %a %a\n", i, j, J[i][j].lo, J[i][j].hi); }
    return 0;
  }
  if (getenv("BNB_BOX")) { /* debug one box: x1lo x1hi a2lo a2hi ... */
    box b; char *p = getenv("BNB_BOX");
    for (int i = 0; i < D; i++) { b.x[i].lo = strtod(p, &p); b.x[i].hi = strtod(p, &p); }
    int ap; printf("basic %d allpos %d\n", exclude_basic(&b, &ap), ap);
    iv E[MAXD], J[MAXD][MAXD]; evalE(&b, E, J);
    for (int i = 0; i < D; i++) printf("E%d [%g,%g]\n", i, E[i].lo, E[i].hi);
    box K; krawczyk(&b, &K);
    for (int i = 0; i < D; i++) printf("X%d [%g,%g] K [%g,%g]\n", i, b.x[i].lo, b.x[i].hi, K.x[i].lo, K.x[i].hi);
    return 0;
  }
  double I = N * (N - 1) / 2.0;
  /* x_1^2 in [I/N, I(N-1)/N]: bounds widened outward to doubles */
  double x1lo = sqrt(I / N) * (1 - 1e-12), x1hi = sqrt(I * (N - 1) / N) * (1 + 1e-12);
  box root;
  root.x[0] = ivr(x1lo, x1hi);
  for (int i = 1; i < D; i++) root.x[i] = ivr(-x1hi, x1hi);
  if (getenv("BNB_ROOT")) { /* search a given box instead of the chart (controls) */
    char *p = getenv("BNB_ROOT");
    for (int i = 0; i < D; i++) { root.x[i].lo = strtod(p, &p); root.x[i].hi = strtod(p, &p); }
  }
  /* breadth-first initial split into >= nsplit boxes */
  box *q = malloc(sizeof(box) * 4 * (nsplit + 4)); long nq = 1; q[0] = root;
  while (nq < nsplit) {
    long m = nq;
    box *q2 = malloc(sizeof(box) * 2 * m + 64);
    long n2 = 0;
    for (long i = 0; i < m; i++) {
      int a; maxwid(&q[i], &a);
      double c = iv_mid(q[i].x[a]);
      box l = q[i], r = q[i]; l.x[a].hi = c; r.x[a].lo = c;
      q2[n2++] = l; q2[n2++] = r;
      if (n2 >= nsplit && i + 1 < m) { for (long k = i + 1; k < m; k++) q2[n2++] = q[k]; break; }
    }
    free(q); q = malloc(sizeof(box) * (n2 + 4) * 2); memcpy(q, q2, sizeof(box) * n2); free(q2); nq = n2;
  }
  setvbuf(stdout, NULL, _IOLBF, 0);
  for (long i = 0; i < nq; i++) if (i % nworkers == worker) vol_total += bvol(&q[i]);
  for (long i = 0; i < nq; i++) if (i % nworkers == worker) run(q[i]);
  printf("STAT root=%s mutate=%d nworkers=%d nsplit=%d sym=%d N=%d worker=%d boxes=%ld t0_chart=%ld t1_inertia=%ld t2_G=%ld t3_cluster=%ld t4_krawczyk_excl=%ld cert=%ld unres=%ld\n", getenv("BNB_ROOT") ? "custom" : "chart", mutate, nworkers, nsplit,
         use_sym, N, worker, st_boxes, st_t0, st_t1, st_t2, st_t3, st_t4, st_cert, st_unres);
  return 0;
}
