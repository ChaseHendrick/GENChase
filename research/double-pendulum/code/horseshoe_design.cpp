// NUMERICAL (non-rigorous) design of a chain of h-sets along the symmetric homoclinic orbit, for the explicit
// horseshoe of horseshoe_check.cpp. Writes a configuration of h-sets X = c + B [-1,1]^2 (B = [alpha u, beta s])
// and transitions X => Y under the return map P. Nothing here is part of the proof: the checker verifies every
// covering relation in interval arithmetic.
//
// usage: horseshoe_design E p_t2 p_p2 vu_x vu_y vs_x vs_y x_lo x_hi k J a1 b > out.cfg
//   [x_lo, x_hi]: local x-bracket of the point z0 on W^u whose image P^k(z0) lies on Fix(G)
//   J: number of steps of the chain along W^s after the reflected point; a1, b: half sizes of the box N at p.
#include "dp.h"
#include <cstdio>
#include <cstdlib>
#include <cmath>
#include <vector>
using namespace capd;
typedef std::vector<double> V;
double E, g = 1;
DMap* vf; DOdeSolver* solver; DCoordinateSection* sec; DPoincareMap* pm;
// one return, raw lift; optional derivative in (t2, p2)
V ret(const V& z, double Df[2][2] = 0) {
  DVector x(4); x[0] = 0; x[1] = z[0]; x[3] = z[1]; x[2] = lift_p1<double>(true, E, g, z[0], z[1]);
  DMatrix M(4, 4); double t = 0;
  DVector y = (*pm)(x, M, t);
  if (Df) {
    DMatrix DP = pm->computeDP(y, M, t);
    double a, b; lift_dp1<double>(true, E, g, z[0], z[1], a, b); int r[2] = {1, 3};
    for (int i = 0; i < 2; ++i) { Df[i][0] = DP[r[i]][1] + DP[r[i]][2] * a; Df[i][1] = DP[r[i]][3] + DP[r[i]][2] * b; }
  }
  return V{y[1], y[3]};
}
struct Box { V c; double B[2][2]; };   // columns: B[.][0] = alpha u, B[.][1] = beta s
// coordinates of point w in the frame of Y
V coords(const Box& Y, const V& w) {
  double d = Y.B[0][0] * Y.B[1][1] - Y.B[0][1] * Y.B[1][0];
  double dx = w[0] - Y.c[0], dy = w[1] - Y.c[1];
  return V{(Y.B[1][1] * dx - Y.B[0][1] * dy) / d, (-Y.B[1][0] * dx + Y.B[0][0] * dy) / d};
}
V pt(const Box& X, double s, double t) { return V{X.c[0] + X.B[0][0] * s + X.B[0][1] * t, X.c[1] + X.B[1][0] * s + X.B[1][1] * t}; }
// sampled image of X in Y's frame: returns max |y| over the whole set, and the x ranges of the two edges
void sample(const Box& X, const Box& Y, int k, double& ymax, double& le_lo, double& le_hi, double& re_lo, double& re_hi, double& midy) {
  ymax = 0; le_lo = re_lo = 1e300; le_hi = re_hi = -1e300; midy = 0; int n = 12;
  for (int i = 0; i <= n; ++i) for (int j = 0; j <= n; ++j) {
    double s = -1 + 2.0 * i / n, t = -1 + 2.0 * j / n;
    V w = ret(pt(X, s, t)); w[0] += 2 * M_PI * k; V c = coords(Y, w);
    if (fabs(c[0]) <= 1) ymax = std::max(ymax, fabs(c[1]));
    if (j == n / 2) midy = std::max(midy, fabs(c[1]));
    if (i == 0) { le_lo = std::min(le_lo, c[0]); le_hi = std::max(le_hi, c[0]); }
    if (i == n) { re_lo = std::min(re_lo, c[0]); re_hi = std::max(re_hi, c[0]); }
  }
}
int main(int argc, char** argv) {
  E = atof(argv[1]); V p{atof(argv[2]), atof(argv[3])};
  V vu{atof(argv[4]), atof(argv[5])}, vs{atof(argv[6]), atof(argv[7])};
  double xlo = atof(argv[8]), xhi = atof(argv[9]); int k = atoi(argv[10]), J = atoi(argv[11]);
  double a1 = atof(argv[12]), b = atof(argv[13]);
  vf = new DMap(DP_FIELD); vf->setParameter("g", g); solver = new DOdeSolver(*vf, 20);
  sec = new DCoordinateSection(4, 0); pm = new DPoincareMap(*solver, *sec, poincare::MinusPlus);
  auto onW = [&](double x) { return V{p[0] + x * vu[0], p[1] + x * vu[1]}; };
  auto res = [&](double x) { V z = onW(x); for (int i = 0; i < k; ++i) z = ret(z); return remainder(z[0], M_PI); };
  double rl = res(xlo);
  for (int it = 0; it < 60; ++it) { double xm = 0.5 * (xlo + xhi), rm = res(xm); if (rm * rl > 0) { xlo = xm; rl = rm; } else xhi = xm; }
  double x0 = 0.5 * (xlo + xhi);
  // multiplier of p
  double Dp[2][2]; ret(p, Dp);
  double tr = Dp[0][0] + Dp[1][1], det = Dp[0][0] * Dp[1][1] - Dp[0][1] * Dp[1][0];
  double lam = tr / 2 + (tr > 0 ? 1 : -1) * sqrt(tr * tr / 4 - det);
  // pseudo-orbit: forward half, reflected half, then along W^s
  int L = 2 * k + J;
  std::vector<V> z(L + 1);
  z[0] = onW(x0); for (int i = 1; i <= k; ++i) z[i] = ret(z[i - 1]);
  double Tm = M_PI * std::round(z[k][0] / M_PI);          // the line of Fix(G) in the raw lift
  auto Gm = [&](const V& w) { return V{2 * Tm - w[0], w[1]}; };
  for (int j = 1; j <= k; ++j) z[k + j] = Gm(z[k - j]);
  for (int j = 1; j <= J; ++j) z[2 * k + j] = Gm(onW(x0 / pow(lam, j)));
  fprintf(stderr, "x0 = %.17g, residual %.3e, lambda %.10g, Fix(G) line t2 = %.6f\n", x0, res(x0), lam, Tm);
  for (int i = 0; i < L; ++i) { V w = ret(z[i]); fprintf(stderr, "  step %2d: z = (%.9f, %.9f), |P(z_i) - z_{i+1}| mod 2pi = %.2e\n", i, z[i][0], z[i][1],
      hypot(remainder(w[0] - z[i + 1][0], 2 * M_PI), w[1] - z[i + 1][1])); }
  // directions
  std::vector<V> u(L + 1), s(L + 1);
  u[0] = vu;
  for (int i = 0; i < L; ++i) { double D[2][2]; ret(z[i], D); V w{D[0][0] * u[i][0] + D[0][1] * u[i][1], D[1][0] * u[i][0] + D[1][1] * u[i][1]};
    double n = hypot(w[0], w[1]); u[i + 1] = V{w[0] / n, w[1] / n}; }
  for (int i = 0; i <= L; ++i) { V w = (2 * k - i >= 0) ? u[2 * k - i] : vu; s[i] = V{-w[0], w[1]}; double n = hypot(s[i][0], s[i][1]); s[i][0] /= n; s[i][1] /= n; }
  // expansion coefficients e_i: D P(z_i) u_i = e_i u_{i+1} + (...) s_{i+1}
  std::vector<double> e(L + 1);
  Box Nbox; Nbox.c = p; Nbox.B[0][0] = a1 * vu[0]; Nbox.B[1][0] = a1 * vu[1]; Nbox.B[0][1] = b * vs[0]; Nbox.B[1][1] = b * vs[1];
  for (int i = 0; i <= L; ++i) {
    double D[2][2]; ret(z[i], D); V w{D[0][0] * u[i][0] + D[0][1] * u[i][1], D[1][0] * u[i][0] + D[1][1] * u[i][1]};
    V a = (i < L) ? u[i + 1] : vu, c = (i < L) ? s[i + 1] : vs;
    double d = a[0] * c[1] - a[1] * c[0]; e[i] = (w[0] * c[1] - w[1] * c[0]) / d;
  }
  // alpha: M_L => N needs |e_L| alpha_L = 2 a1; backwards alpha_i = 2 alpha_{i+1} / |e_i|
  std::vector<double> al(L + 1); al[L] = 2 * a1 / fabs(e[L]);
  for (int i = L - 1; i >= 0; --i) al[i] = 2 * al[i + 1] / fabs(e[i]);
  // beta forward from beta_0 = b, from sampled images
  std::vector<Box> M(L + 1);
  for (int i = 0; i <= L; ++i) { M[i].c = z[i]; M[i].B[0][0] = al[i] * u[i][0]; M[i].B[1][0] = al[i] * u[i][1]; M[i].B[0][1] = 0; M[i].B[1][1] = 0; }
  double beta = b;
  for (int i = 0; i <= L; ++i) {
    M[i].B[0][1] = beta * s[i][0]; M[i].B[1][1] = beta * s[i][1];
    Box& Y = (i < L) ? M[i + 1] : Nbox;
    if (i < L) { Y.B[0][1] = 1e-300; Y.B[1][1] = 0; }
    // provisional beta of Y: sample image thickness in units of a unit-thickness frame
    Box Yunit = Y; V sy = (i < L) ? s[i + 1] : vs; Yunit.B[0][1] = sy[0]; Yunit.B[1][1] = sy[1];
    int kk = (int)std::round((Y.c[0] - ret(M[i].c)[0]) / (2 * M_PI));
    double ym, l1, l2, r1, r2, my; sample(M[i], Yunit, kk, ym, l1, l2, r1, r2, my);
    beta = 2 * ym + 1e-12;
    if (i == L) fprintf(stderr, "M_L image thickness %.3e against b = %.3e\n", ym, b);
  }
  // write
  printf("# generated by horseshoe_design (numerical); verified by horseshoe_check\n");
  printf("E %s\n", argv[1]);
  auto put = [&](const char* nm, const Box& X) { printf("set %s %.17g %.17g %.17g %.17g %.17g %.17g\n", nm, X.c[0], X.c[1], X.B[0][0], X.B[0][1], X.B[1][0], X.B[1][1]); };
  put("N", Nbox); char nm[32];
  for (int i = 0; i <= L; ++i) { snprintf(nm, 32, "M%d", i); put(nm, M[i]); }
  auto shift = [&](const Box& X, const Box& Y) { return (int)std::round((Y.c[0] - ret(X.c)[0]) / (2 * M_PI)); };
  printf("trans N N %d\n", shift(Nbox, Nbox)); printf("trans N M0 %d\n", shift(Nbox, M[0]));
  for (int i = 0; i < L; ++i) printf("trans M%d M%d %d\n", i, i + 1, shift(M[i], M[i + 1]));
  printf("trans M%d N %d\n", L, shift(M[L], Nbox));
  for (int i = 0; i <= L; ++i) fprintf(stderr, "  M%-2d alpha %.3e beta %.3e e %.4g  y in N-frame %.3e\n", i, al[i], hypot(M[i].B[0][1], M[i].B[1][1]), e[i], coords(Nbox, M[i].c)[1]);
}
