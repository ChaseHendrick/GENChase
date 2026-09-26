// NUMERICAL (non-rigorous): symmetric periodic orbits of the return map f on t1 = 0.
// The map G(t2, p2) = (-t2, p2) reverses f (f^{-1} = G f G), so a point z on Fix(G) = {t2 in pi Z}
// with f^m(z) in Fix(G) lies on a symmetric periodic orbit of period 2m (or m).
// usage: scan E m line(0 or 1 for t2 = 0 or pi) npts [coupled=1] [g=1]
#include "dp.h"
#include <cstdio>
#include <cstdlib>
#include <cmath>
#include <vector>
using namespace capd;
double E, g; bool coupled;
DMap* vf; DOdeSolver* solver; DCoordinateSection* sec; DPoincareMap* pm;
DVector lift(double t2, double p2) {
  DVector x(4); x[0] = 0; x[1] = t2; x[3] = p2; x[2] = lift_p1<double>(coupled, E, g, t2, p2); return x;
}
// one return with section derivative; returns (t2,p2), fills 2x2 Df and time
bool ret(double& t2, double& p2, double Df[2][2], double& T) {
  DVector x = lift(t2, p2); DMatrix M(4, 4); double t = 0;
  DVector y = (*pm)(x, M, t);
  DMatrix DP = pm->computeDP(y, M, t);
  double a, b; lift_dp1<double>(coupled, E, g, t2, p2, a, b);
  int r[2] = {1, 3};
  for (int i = 0; i < 2; ++i) {
    Df[i][0] = DP[r[i]][1] + DP[r[i]][2] * a;
    Df[i][1] = DP[r[i]][3] + DP[r[i]][2] * b;
  }
  t2 = y[1]; p2 = y[3]; T = t; return true;
}
double resid(double p2, int m, int line) {
  double t2 = line ? M_PI : 0, D[2][2], T;
  try { for (int i = 0; i < m; ++i) ret(t2, p2, D, T); } catch (...) { return NAN; }
  return remainder(t2, M_PI);
}
int main(int argc, char** argv) {
  E = atof(argv[1]); int m = atoi(argv[2]), line = atoi(argv[3]), n = atoi(argv[4]);
  coupled = argc > 5 ? atoi(argv[5]) : 1; g = argc > 6 ? atof(argv[6]) : 1.0;
  vf = new DMap(coupled ? DP_FIELD : UNCOUPLED_FIELD); vf->setParameter("g", g);
  solver = new DOdeSolver(*vf, 20); sec = new DCoordinateSection(4, 0);
  pm = new DPoincareMap(*solver, *sec, poincare::MinusPlus);
  double t20 = line ? M_PI : 0;
  double pmax = coupled ? sqrt(2 * (E + 2 * g + g * cos(t20))) : sqrt(2 * (E + 2 * g + g * cos(t20)));
  std::vector<double> P(n + 1), R(n + 1);
  for (int i = 0; i <= n; ++i) { P[i] = -pmax + 2 * pmax * (i + 0.5) / (n + 1); R[i] = resid(P[i], m, line); }
  for (int i = 0; i < n; ++i) {
    if (!(R[i] * R[i + 1] < 0) || fabs(R[i] - R[i + 1]) > 1.0) continue;
    double a = P[i], b = P[i + 1], ra = R[i];
    for (int k = 0; k < 60; ++k) { double c = 0.5 * (a + b), rc = resid(c, m, line); if (rc * ra > 0) { a = c; ra = rc; } else b = c; }
    double p2 = 0.5 * (a + b);
    // period: 2m unless f^m(z) = z
    double t2 = t20, q2 = p2, D[2][2], M[2][2] = {{1, 0}, {0, 1}}, T, Tt = 0;
    int per = 2 * m;
    for (int k = 0; k < per; ++k) {
      ret(t2, q2, D, T); Tt += T;
      double N[2][2];
      for (int u = 0; u < 2; ++u) for (int v = 0; v < 2; ++v) N[u][v] = D[u][0] * M[0][v] + D[u][1] * M[1][v];
      for (int u = 0; u < 2; ++u) for (int v = 0; v < 2; ++v) M[u][v] = N[u][v];
    }
    double tr = M[0][0] + M[1][1], det = M[0][0] * M[1][1] - M[0][1] * M[1][0];
    double disc = tr * tr / 4 - det;
    double lam = disc > 0 ? tr / 2 + (tr > 0 ? 1 : -1) * sqrt(disc) : NAN;
    printf("m=%d line=%d p2=%.15f period=%d T=%.6f tr=%.6g det=%.12f lam=%.6g  end=(%.3e,%.3e)\n",
           m, line, p2, per, Tt, tr, det, lam, remainder(t2 - t20, 2 * M_PI), q2 - p2);
  }
}
