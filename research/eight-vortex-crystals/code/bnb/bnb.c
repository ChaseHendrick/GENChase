/* Copyright 2026 Chase Hendrick. SPDX-License-Identifier: Apache-2.0
 * Prototype branch-and-bound for the ground state of eight identical point vortices.
 * Claim to be certified: every critical point z of f in the fundamental domain with
 * prod_{i<j}|z_i - z_j|^2 >= PSTAR = 2^56 7^7 (i.e. f(z) <= f(1+7) = 14 - 28 log 2 - (7/2) log 7)
 * is the centred heptagon.
 * Modes:  bnb knuth PROBES SEED       Knuth's unbiased estimate of the tree size
 *         bnb run DEPTH LO HI         exhaustive search of root subboxes LO..HI-1 after DEPTH bisections */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "kraw.h"

static const double PSTAR = 72057594037927936.0 * 823543.0;   /* 2^56 * 7^7, exact in double */
static double KW = 0.25;
static const double PHISTAR = 5.7867501;   /* >= 7 log(16/7) = 5.78675001229... */
static double REF[NU];             /* the centred heptagon in the domain labelling (double approx.) */

static void make_ref(void) {
  double ys[7]; int ks[7] = {5, 6, 4, -1, 3, 1, 2};
  REF[0] = 2.0;
  for (int t = 0; t < 7; t++) {
    int k = ks[t];
    double xx = k < 0 ? 0 : 2 * cos(2 * M_PI * k / 7), yy = k < 0 ? 0 : 2 * sin(2 * M_PI * k / 7);
    REF[1 + t] = xx; ys[t] = yy;
  }
  for (int t = 0; t < 7; t++) REF[8 + t] = ys[t];
}
static int contains_ref(const iv *v) {
  for (int k = 0; k < NU; k++) if (!(v[k].lo < REF[k] - 1e-12 && v[k].hi > REF[k] + 1e-12)) return 0;
  return 1;
}

static long long stat[NRES];

static int NOCONTRACT = 0;
static double BALL = 0;            /* discard boxes inside the Euclidean ball |v - REF| < BALL (local certificate) */
static int inside_ball(const iv *v) {
  if (BALL <= 0) return 0;
  double s = 0;
  for (int k = 0; k < NU; k++) { double a = fmax(fabs(v[k].lo - REF[k]), fabs(v[k].hi - REF[k])); s += a * a; }
  return sqrt(s) * (1 + 1e-12) < BALL;
}
static int evaluate(iv *v) {
  if (!NOCONTRACT && !contract(v)) return D_DOMAIN;
  if (inside_ball(v)) return V_MIN;
  iv x[NV], y[NV]; unpack(v, x, y);
  if (prod_upper(x, y) < PSTAR) return D_VALUE;
  if (phi_lower(x, y) > PHISTAR) return D_VALUE;
  iv g[16]; grad_iv(x, y, g);
  for (int k = 0; k < 16; k++) if (!has0(g[k])) return D_GRAD;
  double w = 0; for (int k = 0; k < NU; k++) w = fmax(w, wid(v[k]));
  if (w < KW) {
    iv K[NU];
    int r = krawczyk(v, K);
    if (r == -1) return D_KRAW;
    if (r == 1) return contains_ref(v) ? V_MIN : FLAG_UNIQUE;
    memcpy(v, K, sizeof K);           /* all zeros of X lie in K ∩ X */
  }
  return KEEP;
}

static void split(const iv *v, iv *a, iv *b) {
  int s = 0; double w = -1;
  for (int k = 0; k < NU; k++) if (wid(v[k]) > w) { w = wid(v[k]); s = k; }
  memcpy(a, v, sizeof(iv) * NU); memcpy(b, v, sizeof(iv) * NU);
  double m = mid(v[s]); a[s].hi = m; b[s].lo = m;
}

static void root(iv *v) {
  double R = sqrt(24.5) * 1.0000001;
  v[0] = I(1.8708, R);             /* max modulus: R^2 >= (N-1)/2 = 3.5, R^2 <= 28 (N-1)/N = 24.5 */
  for (int k = 1; k < NU; k++) v[k] = I(-R, R);
}

static double rnd(unsigned long long *s) { *s ^= *s << 13; *s ^= *s >> 7; *s ^= *s << 17; return (*s >> 11) * (1.0 / 9007199254740992.0); }

#define MAXD 4000
static long long flagged = 0;
static void dfs(iv *v0, long long *nodes, int maxdepth) {
  static iv stack[MAXD * 2][NU]; int sp = 0;
  memcpy(stack[sp++], v0, sizeof(iv) * NU);
  while (sp) {
    iv v[NU]; memcpy(v, stack[--sp], sizeof v);
    (*nodes)++;
    int r = evaluate(v);
    stat[r]++;
    if (r == FLAG_UNIQUE) { flagged++; continue; }
    if (r != KEEP) continue;
    if (sp + 2 >= MAXD * 2) { fprintf(stderr, "stack\n"); exit(1); }
    split(v, stack[sp], stack[sp + 1]); sp += 2;
  }
}

int main(int argc, char **argv) {
  make_ref();
  if (getenv("KW")) KW = atof(getenv("KW"));
  if (getenv("BALL")) BALL = atof(getenv("BALL"));
  iv v[NU]; root(v);
  if (argc > 1 && !strcmp(argv[1], "knuth")) {
    long probes = atol(argv[2]); unsigned long long seed = strtoull(argv[3], 0, 10) * 2654435761ULL + 1;
    double tot = 0, tot2 = 0; long maxdepth = 0; double depthsum = 0;
    for (long p = 0; p < probes; p++) {
      iv b[NU]; memcpy(b, v, sizeof b); double wgt = 1, est = 0; int d = 0;
      for (;;) {
        est += wgt;
        int r = evaluate(b);
        if (r != KEEP) break;
        iv c1[NU], c2[NU]; split(b, c1, c2);
        /* the branching factor counts only children that are not immediately discarded? no: 2 */
        wgt *= 2; d++;
        if (rnd(&seed) < 0.5) memcpy(b, c1, sizeof b); else memcpy(b, c2, sizeof b);
      }
      if (getenv("DEEP") && d >= atoi(getenv("DEEP"))) {
        iv q[NU]; memcpy(q, b, sizeof q); int r = evaluate(q);
        double w = 0; for (int k = 0; k < NU; k++) w = fmax(w, wid(b[k]));
        iv xx[NV], yy[NV]; unpack(b, xx, yy);
        printf("DEEP d=%d r=%d w=%.2e logP=%.4f z=", d, r, w, log(prod_upper(xx, yy)) - log(PSTAR));
        for (int k = 0; k < NV; k++) printf("(%.3f,%.3f) ", mid(xx[k]), mid(yy[k]));
        printf("\n");
      }
      tot += est; tot2 += est * est; depthsum += d; if (d > maxdepth) maxdepth = d;
    }
    double m = tot / probes, sd = sqrt(fmax(tot2 / probes - m * m, 0) / probes);
    printf("probes %ld  estimated nodes %.3e +- %.2e  mean depth %.1f  max depth %ld\n", probes, m, sd, depthsum / probes, maxdepth);
    return 0;
  }
  if (argc > 1 && !strcmp(argv[1], "near")) {     /* exhaustive search of the box REF +- h */
    double h = atof(argv[2]); long long nodes = 0; NOCONTRACT = 1;
    iv b[NU]; for (int k = 0; k < NU; k++) b[k] = I(REF[k] - h, REF[k] + h);
    dfs(b, &nodes, 0);
    printf("h=%g nodes %lld  domain %lld value %lld grad %lld kraw %lld min %lld flagged %lld\n", h, nodes,
           stat[D_DOMAIN], stat[D_VALUE], stat[D_GRAD], stat[D_KRAW], stat[V_MIN], flagged);
    return 0;
  }
  if (argc > 1 && !strcmp(argv[1], "run")) {
    int depth = atoi(argv[2]); long lo = atol(argv[3]), hi = atol(argv[4]);
    long long nodes = 0;
    for (long idx = lo; idx < hi; idx++) {
      iv b[NU]; memcpy(b, v, sizeof b);
      int dead = 0;
      for (int d = depth - 1; d >= 0; d--) {
        int r = evaluate(b);
        if (r != KEEP) { stat[r]++; dead = 1; break; }
        iv c1[NU], c2[NU]; split(b, c1, c2);
        memcpy(b, ((idx >> d) & 1) ? c2 : c1, sizeof b);
      }
      if (!dead) dfs(b, &nodes, 0);
    }
    printf("nodes %lld  domain %lld sum %lld value %lld grad %lld kraw %lld min %lld flagged %lld\n", nodes,
           stat[D_DOMAIN], stat[D_SUM], stat[D_VALUE], stat[D_GRAD], stat[D_KRAW], stat[V_MIN], flagged);
    return 0;
  }
  return 1;
}
