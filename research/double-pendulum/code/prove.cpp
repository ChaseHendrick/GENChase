// RIGOROUS part (interval arithmetic, CAPD C^1 Lohner Poincare maps).
//
// Return map f of the flow on the section Sigma = {t1 = 0, dt1/dt > 0} of the energy level H = E,
// in coordinates z = (t2, p2), t2 on the circle (computed in a lift). f~ = P^per shifted by
// shift*2pi in t2, so that the symmetric periodic point p is a fixed point of f~ in the lift.
// G(t2, p2) = (-t2, p2) reverses the map: G f G = f^{-1} (time reversal (q, p) -> (-q, p)).
//
// Stages (every inequality below is checked in interval arithmetic; any failure aborts with FAIL):
//  1. Krawczyk: a unique fixed point p of f~ in the box B (B symmetric under G, so G p = p).
//  2. Cone and covering conditions on N0 = p0 + A([-a,a] x [-b,b]) (A = [v_u v_s] numerical):
//     for all z in N0 and |t| <= alpha, M = A^{-1} Df(z) A satisfies
//       (M (1,t))_x >= mu > 1  and  |(M (1,t))_y| < alpha (M (1,t))_x         (cone C_u invariant, expanding)
//     and for every sub-box whose image meets {|x| <= a}, the image has |y| < b     (no escape through top/bottom)
//     Also |det Df(B)| < mu, so the second eigenvalue of Df(p) has modulus < 1: p is hyperbolic.
//  3. Homoclinic crossing: R = [x1,x2] x [yR] contains the graph of W^u_loc(p) over [x1,x2];
//     the images f~^k of the edges x = x1 and x = x2 have t2 on opposite sides of m*pi, and at every
//     sub-box of R whose image may meet t2 = m*pi, every vector Df^k(z) A (1,t), |t| <= alpha,
//     has both components nonzero (neither tangent to Fix(G) nor to the reflected direction).
//
// usage: prove <config> [threads]
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
  IVector Z = zc + A * rr;
  I a, b; lift_dp1<I>(c.coupled, c.E, c.g, Z[0], Z[1], a, b);
  I am = I(a.mid().leftBound()), bm = I(b.mid().leftBound());
  IVector x(4); x[0] = 0; x[1] = zc[0]; x[3] = zc[1]; x[2] = lift_p1<I>(c.coupled, c.E, c.g, zc[0], zc[1]);
  IVector ar = A * rr;
  I rem = (a - am) * ar[0] + (b - bm) * ar[1];          // mean-value remainder of the lift
  IMatrix C(4, 4); C[0][0] = 1; C[2][2] = 1;
  // column 1: lift direction of local x, column 3: of local y
  for (int j = 0; j < 2; ++j) {
    int col = j == 0 ? 1 : 3;
    C[1][col] = A[0][j]; C[3][col] = A[1][j]; C[2][col] = am * A[0][j] + bm * A[1][j];
  }
  IVector r0(4); r0[0] = 0; r0[1] = rr[0]; r0[2] = rem; r0[3] = rr[1];
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

int main(int argc, char** argv) {
  { std::ifstream in(argv[1]); std::string line;
    while (std::getline(in, line)) { if (line.empty() || line[0] == '#') continue; std::istringstream ss(line); std::string k, v; ss >> k; while (ss >> v) cfg[k].push_back(v); } }
  int nth = argc > 2 ? atoi(argv[2]) : 4; omp_set_num_threads(nth);
  bool coupled = D("coupled") != 0; I E = Q("E", 0) , g = Q("g");
  if (cfg["E"].size() > 1) E = intervalHull(Q("E", 0), Q("E", 1));
  int per = (int)D("per"), shift = (int)D("shift"), order = cfg.count("order") ? (int)D("order") : 20;
  printf("system: %s, g = %s, E = %s, f = P^%d shifted by %d*2pi in t2\n", coupled ? "coupled double pendulum" : "UNCOUPLED control", S(g).c_str(), S(E).c_str(), per, shift);
  std::vector<Ctx*> ctx; for (int i = 0; i < nth; ++i) ctx.push_back(new Ctx(coupled, E, g, order));
  Ctx& c0 = *ctx[0];

  // ---------------- stage 1: Krawczyk ----------------
  IVector p0(2); p0[0] = D("p", 0); p0[1] = D("p", 1);
  double rk = D("krawczyk_r");
  IMatrix A(2, 2); A[0][0] = D("vu", 0); A[1][0] = D("vu", 1); A[0][1] = D("vs", 0); A[1][1] = D("vs", 1);
  IMatrix Ai = inv2(A);
  IMatrix Id(2, 2); Id[0][0] = Id[1][1] = 1;
  IVector rB(2); rB[0] = I(-rk, rk); rB[1] = I(-rk, rk);
  IVector B = p0 + rB;
  REQUIRE(liftable(c0, B), "B not in the section domain");
  IVector Fp = imageC0(c0, p0, per, shift) - p0;
  I Tret;
  IMatrix DfB = derivC1(c0, p0, Id, rB, per, &Tret);
  IMatrix Jm(2, 2); for (int i = 0; i < 2; ++i) for (int j = 0; j < 2; ++j) Jm[i][j] = I((DfB[i][j] - Id[i][j]).mid().leftBound());
  IMatrix Cm = inv2(Jm); for (int i = 0; i < 2; ++i) for (int j = 0; j < 2; ++j) Cm[i][j] = I(Cm[i][j].mid().leftBound());
  IVector K = p0 - Cm * Fp + (Id - Cm * (DfB - Id)) * rB;
  bool kin = true; for (int i = 0; i < 2; ++i) kin = kin && K[i].leftBound() > B[i].leftBound() && K[i].rightBound() < B[i].rightBound();
  printf("stage 1 (Krawczyk): B = (%s, %s)\n  K = (%s, %s)  K in int B: %s\n", S(B[0]).c_str(), S(B[1]).c_str(), S(K[0]).c_str(), S(K[1]).c_str(), kin ? "yes" : "NO");
  REQUIRE(kin, "Krawczyk");
  // Symmetry: G(t2, p2) = (-t2, p2) (mod 2 pi). If G(K) is contained in B, then G p (a fixed point of f~ as well, since
  // G f~ G = f~^{-1}) lies in B, and uniqueness gives G p = p. For p near t2 = pi the representative 2 pi - t2 is used.
  int symline = cfg.count("symline") ? (int)D("symline") : 0;
  I GK0 = symline ? 2 * I::pi() - K[0] : -K[0];
  bool symB = GK0.leftBound() > B[0].leftBound() && GK0.rightBound() < B[0].rightBound();
  printf("  G(K) in B (so the fixed point is G-symmetric, t2 = %s): %s\n", symline ? "pi" : "0", symB ? "yes" : "NO");
  REQUIRE(symB, "B not G-symmetric");
  I trB = DfB[0][0] + DfB[1][1], detB = DfB[0][0] * DfB[1][1] - DfB[0][1] * DfB[1][0];
  printf("  over B: trace Df in %s, det Df in %s, return time of f in %s\n", S(trB).c_str(), S(detB).c_str(), S(Tret).c_str());
  IVector pe = K;  // enclosure of p

  // ---------------- stage 2: cone and covering on N0 ----------------
  double a = D("a"), b = D("b"), alpha = D("alpha");
  int nx = (int)D("n0grid", 0), ny = (int)D("n0grid", 1), nt = cfg.count("tgrid") ? (int)D("tgrid") : 1;
  IVector pl = Ai * (pe - p0);  // p in local coordinates
  printf("stage 2: N0 = p0 + A([-%g,%g] x [-%g,%g]), alpha = %g, grid %d x %d, p local = (%s, %s)\n", a, a, b, b, alpha, nx, ny, S(pl[0]).c_str(), S(pl[1]).c_str());
  REQUIRE(pl[0].leftBound() > -a && pl[0].rightBound() < a && pl[1].leftBound() > -b && pl[1].rightBound() < b, "p not in N0");
  { I worst = abs(pl[1]) + I(alpha) * (I(a) + abs(pl[0]));   // worst case over the enclosure of p, outward rounded
    REQUIRE(worst.rightBound() < b, "graph of slope alpha through p leaves N0"); }
  double muMin = 1e300, coneMax = 0; int bad2 = 0, npos = 0, nneg = 0;
  #pragma omp parallel for schedule(dynamic) reduction(min:muMin) reduction(max:coneMax) reduction(+:bad2,npos,nneg)
  for (int idx = 0; idx < nx * ny; ++idx) {
    Ctx& c = *ctx[omp_get_thread_num()];
    int i = idx / ny, j = idx % ny;
    double hx = 2 * a / nx, hy = 2 * b / ny;
    IVector rc(2); rc[0] = -a + hx * (i + 0.5); rc[1] = -b + hy * (j + 0.5);
    const double ov = 1 + 1e-6;   // sub-boxes overlap slightly, so that rounding cannot leave gaps
    IVector rr(2); rr[0] = I(-hx / 2 * ov, hx / 2 * ov); rr[1] = I(-hy / 2 * ov, hy / 2 * ov);
    IVector zc = p0 + A * rc;
    for (int k = 0; k < 2; ++k) zc[k] = I(zc[k].mid().leftBound());   // a point near the box centre
    IVector rcl = Ai * (zc - p0);                                       // its local coordinates (interval)
    IVector rrl = IVector(2); rrl[0] = rc[0] + rr[0] - rcl[0]; rrl[1] = rc[1] + rr[1] - rcl[1]; // box offsets from zc
    try {
      if (!liftable(c, zc + A * rrl)) { ++bad2; continue; }
      IMatrix Df = derivC1(c, zc, A, rrl, per);
      IMatrix M = Ai * Df * A;
      for (int q = 0; q < nt; ++q) {
        I t = I(-alpha + 2 * alpha * q / nt, -alpha + 2 * alpha * (q + 1) / nt);
        I u = M[0][0] + M[0][1] * t, w = M[1][0] + M[1][1] * t;
        if (u.leftBound() > 0) ++npos; else if (u.rightBound() < 0) ++nneg; else { ++bad2; continue; }
        double au = std::min(fabs(u.leftBound()), fabs(u.rightBound()));
        muMin = std::min(muMin, au);
        double cm = std::max(fabs(w.leftBound()), fabs(w.rightBound())) / au;   // reported only
        coneMax = std::max(coneMax, cm);
        // decided in interval arithmetic: alpha |u| - |w| > 0 and |u| > 1
        I margin = I(alpha) * abs(u) - abs(w);
        if (!(abs(u).leftBound() > 1 && margin.leftBound() > 0)) ++bad2;
      }
      IVector img = Ai * (imageC0(c, zc, per, shift) - p0) + M * rrl;
      if (!(img[0].rightBound() < -a || img[0].leftBound() > a))
        if (!(img[1].leftBound() > -b && img[1].rightBound() < b)) ++bad2;
    } catch (std::exception& e) { ++bad2; if (getenv("DEBUG")) { _Pragma("omp critical") fprintf(stderr, "stage2 box %d: %.300s\n", idx, e.what()); } }
  }
  printf("  min over N0 of |(M(1,t))_x| = %.6g (mu), sign %s, max |(M(1,t))_y|/|(M(1,t))_x| = %.6g (< alpha = %g), failures %d\n",
         muMin, npos && nneg ? "MIXED" : (npos ? "+" : "-"), coneMax, alpha, bad2);
  REQUIRE(bad2 == 0 && muMin > 1 && !(npos && nneg), "cone/covering on N0");
  REQUIRE(detB.rightBound() < muMin && detB.leftBound() > -muMin, "|det Df| < mu on B");

  // ---------------- stage 3: transversal symmetric homoclinic crossing ----------------
  if (!cfg.count("seg")) { printf("no stage 3 configured\n"); return fails ? 1 : 0; }
  int k = (int)D("k"), nseg = (int)D("nseg"), maxdepth = cfg.count("maxdepth") ? (int)D("maxdepth") : 12;
  double x1 = D("seg", 0), x2 = D("seg", 1);
  // For x in [x1,x2] the graph satisfies |w(x) - y_p| <= alpha |x - x_p| <= alpha * far, with far an upper bound of
  // |x - x_p| over x in [x1,x2] and x_p in pl[0] (all in outward-rounded interval arithmetic).
  I far = intervalHull(abs(I(x1) - pl[0]), abs(I(x2) - pl[0]));
  I band = I(alpha) * I(far.rightBound());
  I yR = intervalHull(pl[1] - band, pl[1] + band);
  REQUIRE(x1 < x2, "x1 < x2");
  REQUIRE(x2 < pl[0].leftBound() || x1 > pl[0].rightBound(), "segment must exclude p");
  REQUIRE(-a < x1 && x2 < a && yR.leftBound() > -b && yR.rightBound() < b, "R not in N0");
  printf("stage 3: R = [%g, %g] x %s (local), k = %d (f~^k = P^%d)\n", x1, x2, S(yR).c_str(), k, k * per);
  // A piece is Z = p0 + A([xa,xb] x yR). Returns the C^0 enclosures of f~^i(Z), i = 1..k (Lohner sets carried
  // through the returns), and the line field: the set of tangent directions D f~^k(z) A (1,t), z in Z, |t| <= alpha,
  // obtained by applying one-return derivative enclosures D f(Y_i) (Y_0 = Z, Y_i the enclosure of f^i(Z)).
  auto piece = [&](Ctx& c, double xa, double xb, Dir& d) -> IVector {
    IVector rc(2); rc[0] = 0.5 * (xa + xb); rc[1] = yR.mid().leftBound();
    IVector zc = p0 + A * rc; for (int q = 0; q < 2; ++q) zc[q] = I(zc[q].mid().leftBound());
    IVector rcl = Ai * (zc - p0);
    IVector rrl(2); rrl[0] = I(std::min(xa, xb), std::max(xa, xb)) - rcl[0]; rrl[1] = yR - rcl[1];
    // C^0 chain
    IVector Z = zc + A * rrl;
    I aa, bb; lift_dp1<I>(c.coupled, c.E, c.g, Z[0], Z[1], aa, bb);
    I am = I(aa.mid().leftBound()), bm = I(bb.mid().leftBound());
    IVector x(4); x[0] = 0; x[1] = zc[0]; x[3] = zc[1]; x[2] = lift_p1<I>(c.coupled, c.E, c.g, zc[0], zc[1]);
    IVector ar = A * rrl;
    IMatrix C(4, 4); C[0][0] = 1; C[2][2] = 1;
    for (int j = 0; j < 2; ++j) { int col = j == 0 ? 1 : 3; C[1][col] = A[0][j]; C[3][col] = A[1][j]; C[2][col] = am * A[0][j] + bm * A[1][j]; }
    IVector r0(4); r0[1] = rrl[0]; r0[2] = (aa - am) * ar[0] + (bb - bm) * ar[1]; r0[3] = rrl[1];
    C0HOTripletonSet s0(x, C, r0);
    std::vector<IVector> Y;
    for (int i = 0; i < k * per; ++i) { I t; IVector y = (*c.pm)(s0, t); IVector z2(2); z2[0] = y[1]; z2[1] = y[3]; Y.push_back(z2); }
    // derivative chain: D f~^k(z) = D f(f^{k-1} z) ... D f(f z) D f(z), applied right to left; the factors are
    // D f over Z (i = 0) and over the enclosures Y_0 .. Y_{k-2} of f(Z) .. f^{k-1}(Z): k factors in all.
    int nfactors = 0;
    d = Dir{false, I(-alpha, alpha)};
    d = applyDir(A, d);
    d = applyDir(derivC1(c, zc, A, rrl, 1), d); ++nfactors;   // D f at Z (w.r.t. z)
    for (int i = 0; i + 1 < k * per && d.ok; ++i) {
      IVector cc(2); for (int q = 0; q < 2; ++q) cc[q] = I(Y[i][q].mid().leftBound());
      d = applyDir(derivC1(c, cc, Id, Y[i] - cc, 1), d); ++nfactors;
    }
    if (d.ok && nfactors != k * per) throw std::runtime_error("derivative chain has the wrong number of factors");
    return Y.back() + twoPi(I(shift * k));
  };
  Dir dd;
  IVector L = piece(c0, x1, x1, dd), Rr = piece(c0, x2, x2, dd);
  printf("  image of edge x = x1: t2 in %s\n  image of edge x = x2: t2 in %s\n", S(L[0]).c_str(), S(Rr[0]).c_str());
  bool lowFirst = L[0].rightBound() < Rr[0].leftBound();
  double A_ = lowFirst ? L[0].rightBound() : Rr[0].rightBound(), B_ = lowFirst ? Rr[0].leftBound() : L[0].leftBound();
  long mstar = (long)std::ceil(A_ / M_PI);
  if (cfg.count("m")) mstar = (long)D("m");
  I mpi = I((double)mstar) * I::pi();
  bool sep = A_ < mpi.leftBound() && mpi.rightBound() < B_;
  printf("  target line t2 = %ld*pi: edges on opposite sides: %s\n", mstar, sep ? "yes" : "NO");
  REQUIRE(sep, "edges not separated by m*pi");
  struct Piece { double xa, xb; int d; };
  std::vector<Piece> work; for (int i = 0; i < nseg; ++i) work.push_back({x1 + (x2 - x1) * i / nseg, i + 1 == nseg ? x2 : x1 + (x2 - x1) * (i + 1) / nseg, 0});
  long nchecked = 0, nhit = 0; int bad3 = 0; double slopeLo = 1e300, slopeHi = -1e300; bool anyVert = false;
  std::vector<std::string> hitlog;
  while (!work.empty() && bad3 == 0) {
    std::vector<Piece> next;
    #pragma omp parallel for schedule(dynamic)
    for (size_t w = 0; w < work.size(); ++w) {
      Ctx& c = *ctx[omp_get_thread_num()];
      Piece P = work[w]; bool ok = true, hit = false; IVector img(2); Dir d{false, I(0)};
      try {
        img = piece(c, P.xa, P.xb, d);
        hit = !(img[0].rightBound() < mpi.leftBound() || img[0].leftBound() > mpi.rightBound());
        if (hit) ok = d.ok && !d.s.contains(0.0);
      } catch (std::exception& e) { ok = false; hit = true; if (getenv("DEBUG")) fprintf(stderr, "stage3 exception: %.200s\n", e.what()); }
      #pragma omp critical
      {
        ++nchecked;
        if (!ok && P.d >= maxdepth) {
          char buf[600]; snprintf(buf, 600, "    UNRESOLVED piece x in [%.15g, %.15g] (depth %d): image t2 %s, p2 %s, direction %s: %s %s", P.xa, P.xb, P.d,
                                  S(img[0]).c_str(), S(img[1]).c_str(), d.ok ? "defined" : "undetermined", d.vert ? "dt2/dp2 in" : "dp2/dt2 in", S(d.s).c_str()); hitlog.push_back(buf); }
        if (hit && ok) { ++nhit;
          if (d.vert) anyVert = true; else { slopeLo = std::min(slopeLo, d.s.leftBound()); slopeHi = std::max(slopeHi, d.s.rightBound()); }
          char buf[600]; snprintf(buf, 600, "    piece x in [%.15g, %.15g] (depth %d): image t2 %s, p2 %s, %s %s", P.xa, P.xb, P.d,
                                  S(img[0]).c_str(), S(img[1]).c_str(), d.vert ? "dt2/dp2 in" : "dp2/dt2 in", S(d.s).c_str()); hitlog.push_back(buf); }
        if (!ok) {
          if (P.d >= maxdepth) ++bad3;
          else { double xm = 0.5 * (P.xa + P.xb); next.push_back({P.xa, xm, P.d + 1}); next.push_back({xm, P.xb, P.d + 1}); }
        }
      }
    }
    work.swap(next);
  }
  for (auto& s : hitlog) printf("%s\n", s.c_str());
  printf("  pieces checked %ld, pieces whose image may meet t2 = m*pi: %ld, unresolved %d\n", nchecked, nhit, bad3);
  if (nhit && !anyVert) printf("  on those pieces the image tangent slope dp2/dt2 lies in [%.6g, %.6g] (excludes 0 and infinity)\n", slopeLo, slopeHi);
  REQUIRE(bad3 == 0 && nhit > 0, "transversality at the crossing");
  if (fails) printf("RESULT: FAIL (%d)\n", fails); else printf("RESULT: ALL CHECKS PASSED\n");
  return fails ? 1 : 0;
}
