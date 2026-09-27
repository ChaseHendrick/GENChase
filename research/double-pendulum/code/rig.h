// Shared rigorous helpers (interval arithmetic, CAPD): configuration parsing, the one-return C^0 and C^1
// enclosures of the section map in (t2, p2) coordinates, and the line-field propagation. Used by prove.cpp and
// horseshoe_check.cpp.
#pragma once
#include "dp.h"
#include <cstdio>
#include <cstdlib>
#include <cmath>
#include <map>
#include <string>
#include <fstream>
#include <sstream>
#include <vector>
#include <omp.h>
using namespace capd;
typedef interval I;

static std::map<std::string, std::vector<std::string>> cfg;
static double D(const char* k, int i = 0) { return atof(cfg.at(k).at(i).c_str()); }
static I Q(const char* k, int i = 0) {           // rational "num/den" -> interval
  std::string s = cfg.at(k).at(i); size_t sl = s.find('/');
  if (sl == std::string::npos) return I(atof(s.c_str()));
  return I(atof(s.substr(0, sl).c_str())) / I(atof(s.substr(sl + 1).c_str()));
}
static int fails = 0;
#define REQUIRE(cond, ...) do { if (!(cond)) { printf("FAIL: " __VA_ARGS__); printf("\n"); fflush(stdout); ++fails; } } while (0)

struct Ctx {
  IMap* vf; IOdeSolver* solver; ICoordinateSection* sec; IPoincareMap* pm;
  bool coupled; I E, g;
  Ctx(bool c, I E_, I g_, int order) : coupled(c), E(E_), g(g_) {
    vf = new IMap(c ? DP_FIELD : UNCOUPLED_FIELD); vf->setParameter("g", g);
    solver = new IOdeSolver(*vf, order); sec = new ICoordinateSection(4, 0);
    pm = new IPoincareMap(*solver, *sec, poincare::MinusPlus);
  }
};
static IVector twoPi(const I& m) { IVector v(2); v[0] = m * 2 * I::pi(); v[1] = 0; return v; }

// Lift condition: w = 2(E + 2g + g cos t2) - p2^2 > 0 (coupled) must hold on the box.
static bool liftable(Ctx& c, const IVector& Z) {
  I w = c.coupled ? 2 * (c.E + 2 * c.g + c.g * cos(Z[0])) - sqr(Z[1]) : c.E + 2 * c.g + c.g * cos(Z[0]) - sqr(Z[1]) / 2;
  return w.leftBound() > 0;
}
// f~^n applied to the point box zc (C^0 enclosure).
static IVector imageC0(Ctx& c, const IVector& zc, int nret, int shift) {
  IVector x(4); x[0] = 0; x[1] = zc[0]; x[3] = zc[1]; x[2] = lift_p1<I>(c.coupled, c.E, c.g, zc[0], zc[1]);
  C0HOTripletonSet s(x); I t;
  IVector y = (*c.pm)(s, t, nret);
  IVector r(2); r[0] = y[1]; r[1] = y[3];
  return r + twoPi(I(shift));
}
// Enclosure of D f~^n (derivative w.r.t. z) over the set Z = zc + A r, r in box rr (rr centred at 0).
static IMatrix derivC1(Ctx& c, const IVector& zc, const IMatrix& A, const IVector& rr, int nret, I* rt = 0) {
  // The mean-value form f(z) = f(zc) + Df(xi)(z - zc) needs Df over the segment from zc to z, so the set must
  // contain zc itself: widen the offsets to contain 0 (zc is a rounded point, the piece may not contain it).
  IVector rr0(rr); for (int q = 0; q < rr0.dimension(); ++q) rr0[q] = intervalHull(rr0[q], I(0));
  IVector Z = zc + A * rr0;
  I a, b; lift_dp1<I>(c.coupled, c.E, c.g, Z[0], Z[1], a, b);
  I am = I(a.mid().leftBound()), bm = I(b.mid().leftBound());
  IVector x(4); x[0] = 0; x[1] = zc[0]; x[3] = zc[1]; x[2] = lift_p1<I>(c.coupled, c.E, c.g, zc[0], zc[1]);
  IVector ar = A * rr0;
  I rem = (a - am) * ar[0] + (b - bm) * ar[1];          // mean-value remainder of the lift
  IMatrix C(4, 4); C[0][0] = 1; C[2][2] = 1;
  // column 1: lift direction of local x, column 3: of local y
  for (int j = 0; j < 2; ++j) {
    int col = j == 0 ? 1 : 3;
    C[1][col] = A[0][j]; C[3][col] = A[1][j]; C[2][col] = am * A[0][j] + bm * A[1][j];
  }
  IVector r0(4); r0[0] = 0; r0[1] = rr0[0]; r0[2] = rem; r0[3] = rr0[1];
  C1Rect2Set s(x, C, r0);
  IMatrix mon(4, 4); I t;
  IVector y = (*c.pm)(s, mon, t, nret);
  IMatrix DP = c.pm->computeDP(y, mon, t);
  if (rt) *rt = t;
  IMatrix L(4, 2); L[1][0] = 1; L[2][0] = a; L[2][1] = b; L[3][1] = 1;
  IMatrix Df(2, 2); int rows[2] = {1, 3};
  for (int i = 0; i < 2; ++i) for (int j = 0; j < 2; ++j) {
    I s_ = 0; for (int k = 0; k < 4; ++k) s_ += DP[rows[i]][k] * L[k][j]; Df[i][j] = s_;
  }
  return Df;
}
static IMatrix inv2(const IMatrix& A) {
  I d = A[0][0] * A[1][1] - A[0][1] * A[1][0];
  IMatrix R(2, 2); R[0][0] = A[1][1] / d; R[0][1] = -A[0][1] / d; R[1][0] = -A[1][0] / d; R[1][1] = A[0][0] / d; return R;
}

// A line field element: v ~ (1, s) (vert = false) or v ~ (s, 1) (vert = true), s an interval.
struct Dir { bool vert; I s; bool ok = true; };
// Image of a set of lines under an interval matrix M, sub-dividing s to limit the dependency of s in
// numerator and denominator. Each sub-result is an exact-arithmetic enclosure; the union is taken as a hull,
// which is valid because the image of a connected set of lines on which the chosen component never vanishes
// is a connected set of slopes.
static Dir applyDir(const IMatrix& M, const Dir& d, int nsub = 16) {
  std::vector<I> vx, vy;
  for (int q = 0; q < nsub; ++q) {
    double lo = d.s.leftBound(), hi = d.s.rightBound();
    I sq = I(lo + (hi - lo) * q / nsub, q + 1 == nsub ? hi : lo + (hi - lo) * (q + 1) / nsub);
    if (q == 0) sq = I(lo, sq.rightBound());
    I a = d.vert ? M[0][0] * sq + M[0][1] : M[0][0] + M[0][1] * sq;
    I b = d.vert ? M[1][0] * sq + M[1][1] : M[1][0] + M[1][1] * sq;
    vx.push_back(a); vy.push_back(b);
  }
  bool xok = true, yok = true;
  for (auto& a : vx) xok = xok && !a.contains(0.0);
  for (auto& b : vy) yok = yok && !b.contains(0.0);
  Dir r{false, I(0)};
  if (xok) { r.vert = false; for (int q = 0; q < nsub; ++q) r.s = q ? intervalHull(r.s, vy[q] / vx[q]) : vy[q] / vx[q]; }
  else if (yok) { r.vert = true; for (int q = 0; q < nsub; ++q) r.s = q ? intervalHull(r.s, vx[q] / vy[q]) : vx[q] / vy[q]; }
  else r.ok = false;
  if (!d.ok) r.ok = false;
  return r;
}

static std::string S(const I& x) { char b[128]; snprintf(b, 128, "[%.17g, %.17g]", x.leftBound(), x.rightBound()); return b; }

