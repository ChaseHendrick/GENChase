// NUMERICAL (non-rigorous): unstable manifold of a symmetric periodic point z0 of f = P^per,
// and its crossings with Fix(G) = {t2 in pi Z} (symmetric homoclinic points).
// usage: manifold E t2 p2 per K nseg s0 [branch=+1] [dump=0]
#include "dp.h"
#include <cstdio>
#include <cstdlib>
#include <cmath>
#include <vector>
using namespace capd;
double E, g = 1; bool coupled = !getenv("UNCOUPLED");
DMap* vf; DOdeSolver* solver; DCoordinateSection* sec; DPoincareMap* pm;
void ret(double& t2, double& p2, double Df[2][2]) {
  DVector x(4); x[0] = 0; x[1] = t2; x[3] = p2; x[2] = lift_p1<double>(coupled, E, g, t2, p2);
  DMatrix M(4, 4); double t = 0;
  DVector y = (*pm)(x, M, t);
  DMatrix DP = pm->computeDP(y, M, t);
  double a, b; lift_dp1<double>(coupled, E, g, t2, p2, a, b);
  int r[2] = {1, 3};
  for (int i = 0; i < 2; ++i) { Df[i][0] = DP[r[i]][1] + DP[r[i]][2] * a; Df[i][1] = DP[r[i]][3] + DP[r[i]][2] * b; }
  t2 = y[1]; p2 = y[3];
}
void fmap(int per, double& t2, double& p2, double M[2][2]) {
  M[0][0] = M[1][1] = 1; M[0][1] = M[1][0] = 0;
  for (int k = 0; k < per; ++k) {
    double D[2][2], N[2][2]; ret(t2, p2, D);
    for (int u = 0; u < 2; ++u) for (int v = 0; v < 2; ++v) N[u][v] = D[u][0] * M[0][v] + D[u][1] * M[1][v];
    for (int u = 0; u < 2; ++u) for (int v = 0; v < 2; ++v) M[u][v] = N[u][v];
  }
}
int main(int argc, char** argv) {
  E = atof(argv[1]); double z1 = atof(argv[2]), z2 = atof(argv[3]); int per = atoi(argv[4]), K = atoi(argv[5]), ns = atoi(argv[6]);
  double s0 = atof(argv[7]); int br = argc > 8 ? atoi(argv[8]) : 1; int dump = argc > 9 ? atoi(argv[9]) : 0;
  vf = new DMap(coupled ? DP_FIELD : UNCOUPLED_FIELD); vf->setParameter("g", g);
  solver = new DOdeSolver(*vf, 20); sec = new DCoordinateSection(4, 0);
  pm = new DPoincareMap(*solver, *sec, poincare::MinusPlus);
  double M[2][2], a = z1, b = z2; fmap(per, a, b, M);
  double tr = M[0][0] + M[1][1], det = M[0][0] * M[1][1] - M[0][1] * M[1][0];
  double lam = tr / 2 + (tr > 0 ? 1 : -1) * sqrt(tr * tr / 4 - det);
  double vu[2] = {M[0][1], lam - M[0][0]}; double nn = hypot(vu[0], vu[1]); vu[0] /= nn; vu[1] /= nn;
  if (vu[0] < 0) { vu[0] = -vu[0]; vu[1] = -vu[1]; }
  { double ls = det / lam; double w[2] = {M[0][1], ls - M[0][0]}; double m2 = hypot(w[0], w[1]); w[0] /= m2; w[1] /= m2; if (w[1] < 0) { w[0] = -w[0]; w[1] = -w[1]; }
    fprintf(stderr, "M = [[%.17g, %.17g], [%.17g, %.17g]]\nvu = %.17g %.17g\nvs = %.17g %.17g\n", M[0][0], M[0][1], M[1][0], M[1][1], vu[0], vu[1], w[0], w[1]); }
  fprintf(stderr, "fixed-point residual (%.2e,%.2e) lam=%.8g vu=(%.6f,%.6f)\n", a - z1, b - z2, lam, vu[0], vu[1]);
  // points s in [s0, |lam| s0] (log spaced) along br*vu
  std::vector<double> T(ns + 1), P(ns + 1), S(ns + 1);
  for (int i = 0; i <= ns; ++i) { double s = s0 * pow(fabs(lam), (double)i / ns); S[i] = s; T[i] = z1 + br * s * vu[0]; P[i] = z2 + br * s * vu[1]; }
  for (int k = 1; k <= K; ++k) {
    std::vector<double> T2(ns + 1), P2(ns + 1); std::vector<int> ok(ns + 1, 1);
    for (int i = 0; i <= ns; ++i) {
      double t = T[i], p = P[i], MM[2][2];
      try { fmap(per, t, p, MM); } catch (...) { ok[i] = 0; }
      T2[i] = t; P2[i] = p;
      if (dump) printf("%d %.12f %.12f %.12f\n", k, S[i], t, p);
    }
    for (int i = 0; i < ns; ++i) {
      if (!ok[i] || !ok[i + 1]) continue;
      double r0 = remainder(T2[i], M_PI), r1 = remainder(T2[i + 1], M_PI);
      if (r0 * r1 < 0 && fabs(r0 - r1) < 0.5) {
        double slope = (P2[i + 1] - P2[i]) / (T2[i + 1] - T2[i]);
        double gap = hypot(T2[i + 1] - T2[i], P2[i + 1] - P2[i]);
        fprintf(stderr, "k=%d s=%.10f crossing t2=%.6f p2=%.6f slope dp2/dt2=%.4g seglen=%.2e\n", k, S[i], T2[i], P2[i], slope, gap);
      }
    }
    T = T2; P = P2;  // iterate the images (kept as a sampled curve)
  }
}
