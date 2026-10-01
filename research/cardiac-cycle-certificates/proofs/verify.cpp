// Rigorous verification (CAPD interval arithmetic, outward rounding) of a stable periodic orbit of one cell (N = 1)
// or of a rotating wave in a ring of N cells, by a contraction argument for the section map.
//
// Setting. Start section S0 = {V_0 = s}, s = the double nearest 0.2 (any transversal section serves). P is the first
// upward crossing of {V_{N-1} = s} (N = 1: the first return to S0). The section map is g = P (N = 1) or
// g(x)_j = P(x)_{j-1} (N > 1, indices mod N), which maps S0 to S0. Free coordinates on S0 are all but V_0.
//
// Coordinates and norm. x = xhat + A (0, y) with A = [[1, 0], [0, At]] read from the frame file (At is any invertible
// matrix proposed by frame.py). y is split into blocks of size 1 or 2 with radii rho_b, and
// ||y|| = max_b ||y_b||_2 / rho_b. The ball B = {||y|| <= 1} lies in the box Y = prod [-rho_b, rho_b].
//
// Claim checked. With G(y) = At^{-1}(g(xhat + A(0,y)) - xhat)_free, the program encloses G(0) (tight C0 run at the
// centre) and DG over Y (C1 run over the whole box), and bounds
//   q  >= sup_{y in Y} ||DG(y)||   (induced block norm; exact 2x2 spectral norm on diagonal 2x2 blocks,
//                                   Frobenius norm of magnitudes elsewhere),
//   r0 >= ||G(0)||.
// If q < 1 and, for every block b, ||G(0)_b||/rho_b + (row sum of block b) < 1, then G maps B into B and is a q-contraction on the convex set B (mean value inequality), so
// g has a unique fixed point in B, every eigenvalue of Dg there has modulus <= q < 1, and the corresponding periodic
// orbit (period T for N = 1, N T for N > 1, T = time of the section map) is locally orbitally asymptotically stable.
//
// All states are in the scaled variables z = x / sigma (model/tp06_capd.hpp); sigma is a power of two per variable.
// Usage: verify frame.txt out.json
#include <fstream>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <vector>
#include "../model/setup.hpp"
#include "capd/mpcapdlib.h"
using namespace capd;

namespace tp06 {
// Decimals in multiprecision: computed directly in MpInterval so that the 128-bit centre run sees the model's
// decimals to 128 bits, not their double enclosures.
template <> capd::MpInterval decimalAs<capd::MpInterval>(const std::string& s) { return decimalEnclosureT<capd::MpInterval>(s); }
}

static interval toInterval(const MpInterval& x) {
  using capd::multiPrec::MpReal;
  return interval(toDouble(x.leftBound(), MpReal::RoundDown), toDouble(x.rightBound(), MpReal::RoundUp));
}
static MpInterval toMp(const interval& x) { return MpInterval(x.leftBound(), x.rightBound()); }

// Centre image in the affine coordinates, computed in MPFR interval arithmetic with `bits` bits (C0, tripleton set).
// Returns Aaff (P(xc) - cshift) and the section time, converted outward to double intervals.
template <int N>
IVector centreMP(const IVector& xc, const IMatrix& Aaff, const IVector& cshift, const interval& gks, const interval& coupling,
                 const std::string& gLo, const std::string& gHi, double level, int bits, int order, interval& Tout) {
  const int dim = 18 * N, END = 18 * (N - 1);
  MpFloat::setDefaultPrecision(bits);
  MpIMap f(tp06::ringField<N>, dim, dim, tp06::P_MAX);
  tp06::Physical p;
  MpInterval g = gLo == gHi ? tp06::decimalEnclosureT<MpInterval>(gLo)
                            : intervalHull(tp06::decimalEnclosureT<MpInterval>(gLo), tp06::decimalEnclosureT<MpInterval>(gHi));
  (void)gks;
  MpInterval c = toMp(coupling);  // double enclosure of cNum/cDen (cNum, cDen < 2^53 are exact), widened to MP
  tp06::setParameters(f, p, c, &g);
  MpIOdeSolver solver(f, order);
  // Step-control tolerance for the multiprecision run (any value is rigorous; it only sets the step size).
  const char* tolEnv = std::getenv("VERIFY_MP_TOL");
  if (tolEnv) { double tol = std::atof(tolEnv); solver.setAbsoluteTolerance(tol); solver.setRelativeTolerance(tol); }
  MpICoordinateSection section(dim, END, MpInterval(level));
  MpIPoincareMap pm(solver, section, poincare::MinusPlus);
  MpIVector x(dim), cs(dim);
  MpIMatrix A(dim, dim);
  for (int i = 0; i < dim; ++i) { x[i] = toMp(xc[i]); cs[i] = toMp(cshift[i]); for (int k = 0; k < dim; ++k) A[i][k] = toMp(Aaff[i][k]); }
  MpInterval T(0.0);
  MpC0TripletonSet s(x);
  MpIVector G = pm(s, cs, A, T);
  IVector out(dim);
  for (int i = 0; i < dim; ++i) out[i] = toInterval(G[i]);
  Tout = toInterval(T);
  return out;
}

static std::string hexd(double v) { std::ostringstream o; o << std::hexfloat << v; return o.str(); }
static std::string iv(const interval& v) {
  std::ostringstream o; o << std::setprecision(17) << "[" << v.leftBound() << ", " << v.rightBound() << "]"; return o.str();
}
static double up(const interval& v) { return v.rightBound(); }
// Exact bounds (hexadecimal floating point); decimal renderings above are rounded to nearest and are for reading only.
static std::string ivhex(const interval& v) { return "[\"" + hexd(v.leftBound()) + "\", \"" + hexd(v.rightBound()) + "\"]"; }
static std::string jsonEscape(const std::string& s) {
  std::string o;
  for (char c : s) { if (c == '"' || c == '\\') { o += '\\'; o += c; } else if (c == '\n') o += "\\n"; else if (c >= 32) o += c; }
  return o;
}

// Upper bound of the spectral norm of a 2x2 interval matrix [[a,b],[c,d]].
static double norm2x2(interval a, interval b, interval c, interval d) {
  interval p = sqr(a) + sqr(c), s = sqr(b) + sqr(d), r = a * b + c * d;
  interval half = (p + s) / 2.0, diff = (p - s) / 2.0;
  interval lam = half + sqrt(sqr(diff) + sqr(r));
  return up(sqrt(interval(up(lam))));
}

// Period gate for rings (N > 1). Over [0, Thi] (Thi >= the section time of every point of the box) and for every cell
// j = 0..N-2, show that V_j never crosses the level s upward: on each time piece either V_j - s excludes 0, or
// dV_j/dt < 0 on the enclosure (only downward crossings), or (cell 0 only) the piece belongs to the initial stretch on
// which dV_0/dt > 0 from V_0(0) = s. With x_j(t) = phi(t + j tau), the cells' trajectories on [0, tau] cover phi on
// [0, N tau]; so phi has exactly one upward s-crossing in [0, N tau), and the minimal period is N tau (a period p < N tau
// would give an upward crossing at p). Nonsynchrony follows from the guard V_{N-1}(0) < s = V_0(0).
template <int N>
bool periodGate(IMap& f, int order, const IVector& xc, const IMatrix& A, const IVector& r, double level, double Thi,
                int grid, long& pieces, std::string& why) {
  IOdeSolver solver(f, order);
  ITimeMap tm(solver);
  tm.stopAfterStep(true);
  C0Rect2Set s(xc, A, r);
  interval prev(0.0);
  bool rising0 = true;  // cell 0 still on its initial monotone rise
  pieces = 0;
  do {
    tm(interval(Thi), s);
    interval h = solver.getStep();
    const IOdeSolver::SolutionCurve& curve = solver.getCurve();
    for (int g = 0; g < grid; ++g) {
      interval piece = interval(g, g + 1) * h / grid;
      intersection(interval(0.0, 1.0) * h, piece, piece);
      IVector y = curve(piece);
      IVector dy = f(y);
      ++pieces;
      for (int j = 0; j < N - 1; ++j) {
        interval w = y[18 * j] - interval(level), v = dy[18 * j];
        if (j == 0 && rising0) {
          if (v.leftBound() > 0) continue;  // still rising from s: V_0 > s on this piece's interior part
          rising0 = false;
          if (w.leftBound() <= 0) { why = "cell 0 stops rising before leaving the level"; return false; }
        }
        if (!(w.contains(0.0))) continue;
        if (v.rightBound() < 0) continue;
        std::ostringstream o; o << "cell " << j << " may cross upward near t = " << iv(prev + piece);
        why = o.str();
        return false;
      }
    }
    prev = tm.getCurrentTime();
  } while (!tm.completed());
  return true;
}

template <int N>
int run(std::istream& in, const std::string& gLo, const std::string& gHi, long cNum, long cDen, std::ofstream& out) {
  const int dim = 18 * N, END = 18 * (N - 1), n = dim - 1;
  IMap f(tp06::ringField<N>, dim, dim, tp06::P_MAX);
  tp06::Physical p;
  interval gks = intervalHull(tp06::decimalEnclosure(gLo), tp06::decimalEnclosure(gHi));
  if (cNum < 0 || cDen <= 0 || cNum > (1L << 53) || cDen > (1L << 53)) throw std::runtime_error("coupling numerator/denominator out of exact range");
  interval coupling = interval(double(cNum)) / interval(double(cDen));
  tp06::setParameters(f, p, coupling, &gks);
  // Integration settings (recorded in the output). Defaults can be overridden for experiments; any setting is
  // rigorous, they only change how tight the enclosures are.
  const int order = std::getenv("VERIFY_ORDER") ? std::atoi(std::getenv("VERIFY_ORDER")) : 20;
  const double fixedStep = std::getenv("VERIFY_STEP") ? std::atof(std::getenv("VERIFY_STEP")) : 0.0;
  IOdeSolver solver(f, order);
  if (fixedStep > 0) { solver.setStep(interval(fixedStep)); solver.turnOffStepControl(); }
  const double level = 0.2 / tp06::scaleOf(0);  // section V = s (s = double nearest 0.2), in scaled units; exact
  ICoordinateSection section(dim, END, interval(level));
  IPoincareMap pm(solver, section, poincare::MinusPlus);

  DVector xhat(dim);
  for (int i = 0; i < dim; ++i) in >> xhat[i];
  if (xhat[0] != level) throw std::runtime_error("centre not on the start section");
  DMatrix Ad(n, n);
  for (int i = 0; i < n; ++i) for (int k = 0; k < n; ++k) in >> Ad[i][k];
  int nb; in >> nb;
  std::vector<int> bs(nb), b0(nb);
  std::vector<double> rho(nb);
  int tot = 0;
  for (int b = 0; b < nb; ++b) { in >> bs[b] >> rho[b]; b0[b] = tot; tot += bs[b]; if (bs[b] < 1 || bs[b] > 2 || !(rho[b] > 0)) throw std::runtime_error("bad block"); }
  if (tot != n) throw std::runtime_error("blocks do not cover the free coordinates");
  std::vector<int> blockOf(n);
  for (int b = 0; b < nb; ++b) for (int k = 0; k < bs[b]; ++k) blockOf[b0[b] + k] = b;

  IMatrix At(n, n);
  for (int i = 0; i < n; ++i) for (int k = 0; k < n; ++k) At[i][k] = Ad[i][k];
  // Rigorous inverse of At: R = approximate inverse (double), E = I - R At (interval), e = ||E||_inf < 1, then
  // At^{-1} = (I - E)^{-1} R = R + sum_{k>=1} E^k R, and entrywise |sum_{k>=1} E^k R|_{ij} <= e/(1-e) * max_k |R_kj|.
  // (Unpreconditioned interval elimination on this badly scaled matrix gives far wider enclosures.)
  DMatrix Rd = capd::matrixAlgorithms::gaussInverseMatrix(Ad);
  IMatrix R(n, n);
  for (int i = 0; i < n; ++i) for (int k = 0; k < n; ++k) R[i][k] = Rd[i][k];
  IMatrix E = IMatrix::Identity(n) - R * At;
  interval eNorm = 0;
  for (int i = 0; i < n; ++i) { interval rs = 0; for (int k = 0; k < n; ++k) rs += interval(abs(E[i][k]).rightBound()); eNorm = interval(std::max(eNorm.rightBound(), rs.rightBound())); }
  if (!(eNorm.rightBound() < 0.5)) throw std::runtime_error("approximate inverse of the frame too poor");
  interval fac = interval(eNorm.rightBound()) / (1.0 - interval(eNorm.rightBound()));
  IMatrix AtInv = R;
  for (int k = 0; k < n; ++k) {
    double cmax = 0;
    for (int i = 0; i < n; ++i) cmax = std::max(cmax, std::abs(Rd[i][k]));
    double d = (fac * interval(cmax)).rightBound();
    for (int i = 0; i < n; ++i) AtInv[i][k] += interval(-d, d);
  }

  // full frame A = [[1,0],[0,At]] and the box r = (0, Y)
  IMatrix A(dim, dim);
  A[0][0] = 1.0;
  for (int i = 0; i < n; ++i) for (int k = 0; k < n; ++k) A[i + 1][k + 1] = At[i][k];
  IVector r(dim);
  r[0] = 0.0;
  for (int k = 0; k < n; ++k) r[k + 1] = interval(-rho[blockOf[k]], rho[blockOf[k]]);
  IVector xc(dim);
  for (int i = 0; i < dim; ++i) xc[i] = xhat[i];

  auto shiftBack = [&](const IVector& v) { IVector w(dim); for (int j = 0; j < N; ++j) for (int i = 0; i < 18; ++i) w[18 * j + i] = v[18 * ((j + N - 1) % N) + i]; return w; };
  auto shiftBackRows = [&](const IMatrix& M) { IMatrix W(dim, dim); for (int j = 0; j < N; ++j) for (int i = 0; i < 18; ++i) for (int k = 0; k < dim; ++k) W[18 * j + i][k] = M[18 * ((j + N - 1) % N) + i][k]; return W; };

  // Guards on the initial box: concentrations positive, V away from the GHK point, and for a ring the end cell
  // strictly below the end section (so the first upward crossing is the intended one).
  IVector X = xc + A * r;
  for (int j = 0; j < N; ++j) {
    for (int i = 14; i < 18; ++i) if (!(X[18 * j + i].leftBound() > 0)) throw std::runtime_error("nonpositive concentration in box");
    if (X[18 * j].contains(15.0 / tp06::scaleOf(0))) throw std::runtime_error("box meets V = 15");
  }
  if (N > 1 && !(X[END].rightBound() < level)) throw std::runtime_error("end cell not strictly below the section");

  // 1. Tight centre image (C0, high-order enclosure), computed directly in the affine coordinates
  //    G = At^{-1} (Pshift (P(x) - Pshift^{-1} xhat))_free  with CAPD's affine Poincare operator, which resolves the
  //    crossing time by interval Newton and expands the image to second order in time (this matters here: the
  //    orbit crosses the section slowly, so a plain hull over the crossing step is far too wide).
  //    Aaff = [[1,0],[0,At^{-1}]] * Pshift, where (Pshift v)_j = v_{j-1} (identity for N = 1), and
  //    cshift = Pshift^{-1} xhat, so that Aaff (P(x) - cshift) = [[1,0],[0,At^{-1}]] (g(x) - xhat).
  IMatrix Ablk(dim, dim);
  Ablk[0][0] = 1.0;
  for (int i = 0; i < n; ++i) for (int k = 0; k < n; ++k) Ablk[i + 1][k + 1] = AtInv[i][k];
  IMatrix Pshift(dim, dim);
  for (int j = 0; j < N; ++j) for (int i = 0; i < 18; ++i) Pshift[18 * j + i][18 * ((j + N - 1) % N) + i] = 1.0;
  IMatrix Aaff = Ablk * Pshift;
  IVector cshift(dim);
  for (int j = 0; j < N; ++j) for (int i = 0; i < 18; ++i) cshift[18 * ((j + N - 1) % N) + i] = xc[18 * j + i];
  interval Tc = 0;
  const int mpBits = std::getenv("VERIFY_MP_BITS") ? std::atoi(std::getenv("VERIFY_MP_BITS")) : 128;
  // Below 53 bits the conversions toMp / decimalEnclosureT<MpInterval> would round the double inputs, so refuse.
  if (mpBits != 0 && mpBits < 64) throw std::runtime_error("VERIFY_MP_BITS must be 0 (double centre) or at least 64");
  const int mpOrder = std::getenv("VERIFY_MP_ORDER") ? std::atoi(std::getenv("VERIFY_MP_ORDER")) : 30;
  IVector Gfull(dim);
  if (mpBits > 0) {
    Gfull = centreMP<N>(xc, Aaff, cshift, gks, coupling, gLo, gHi, level, mpBits, mpOrder, Tc);
  } else {
    C0HOTripletonSet c0(xc);
    Gfull = pm(c0, cshift, Aaff, Tc);
  }
  IVector G0(n);
  for (int i = 0; i < n; ++i) G0[i] = Gfull[i + 1];
  IVector Pc = Gfull;  // reported in the diagnostics only

  if (std::getenv("VERIFY_CENTRE_ONLY")) {  // tuning aid: report the centre residual and stop (never verifies)
    double gmax = 0;
    for (int i = 0; i < n; ++i) gmax = std::max(gmax, abs(G0[i]).rightBound());
    std::cout << "CENTRE ONLY  max |G0_i| <= " << gmax << "  section time " << iv(Tc) << "\n";
    return 1;
  }
  // 2. C1 over the whole box.
  interval T = 0;
  const bool ho = std::getenv("VERIFY_HO") != nullptr;
  C1Rect2Set c1r(xc, A, r);
  C1HORect2Set c1h(xc, A, r);
  IMatrix DPhi(dim, dim);
  IVector Px = ho ? pm(c1h, DPhi, T) : pm(c1r, DPhi, T);
  IMatrix DP = pm.computeDP(Px, DPhi, T);
  IMatrix DG = N == 1 ? DP : shiftBackRows(DP);
  IMatrix DGt(n, n);
  for (int i = 0; i < n; ++i) for (int k = 0; k < n; ++k) DGt[i][k] = DG[i + 1][k + 1];
  IMatrix M = AtInv * DGt * At;

  {
    double wInv = 0, wDG = 0, wM = 0;
    for (int i = 0; i < n; ++i) for (int k = 0; k < n; ++k) {
      wInv = std::max(wInv, AtInv[i][k].rightBound() - AtInv[i][k].leftBound());
      wDG = std::max(wDG, (DGt[i][k].rightBound() - DGt[i][k].leftBound()) / std::max(1e-300, std::abs(DGt[i][k].mid().leftBound())));
      wM = std::max(wM, M[i][k].rightBound() - M[i][k].leftBound());
    }
    std::cerr << "frame inverse: ||E|| <= " << eNorm.rightBound() << ", max width " << wInv << "; DG max relative width " << wDG
              << "; M max width " << wM << "; centre time " << iv(Tc) << "; box time " << iv(T) << "\n";
  }
  for (int i = 0; i < n; ++i) {
    if (!std::isfinite(G0[i].leftBound()) || !std::isfinite(G0[i].rightBound())) throw std::runtime_error("nonfinite centre image");
    for (int k = 0; k < n; ++k) if (!std::isfinite(M[i][k].leftBound()) || !std::isfinite(M[i][k].rightBound())) throw std::runtime_error("nonfinite derivative");
  }

  // 3. Norm bounds.
  double r0 = 0;
  for (int b = 0; b < nb; ++b) {
    interval s2 = 0;
    for (int k = 0; k < bs[b]; ++k) s2 += sqr(interval(abs(G0[b0[b] + k]).rightBound()));
    r0 = std::max(r0, up(sqrt(interval(up(s2))) / interval(rho[b])));
  }
  double q = 0;
  int worstRow = -1;
  std::vector<double> rowSum(nb, 0.0), diagNorm(nb, 0.0);
  for (int bi = 0; bi < nb; ++bi) {
    interval sum = 0;
    for (int bj = 0; bj < nb; ++bj) {
      interval scale = interval(rho[bj]) / interval(rho[bi]);
      double nrm;
      if (bi == bj && bs[bi] == 2) {
        int a0 = b0[bi];
        nrm = norm2x2(M[a0][a0] * scale, M[a0][a0 + 1] * scale, M[a0 + 1][a0] * scale, M[a0 + 1][a0 + 1] * scale);
      } else {
        interval fs = 0;
        for (int u = 0; u < bs[bi]; ++u) for (int v = 0; v < bs[bj]; ++v) fs += sqr(interval(abs(M[b0[bi] + u][b0[bj] + v] * scale).rightBound()));
        nrm = up(sqrt(interval(up(fs))));
      }
      if (bi == bj) diagNorm[bi] = nrm;
      sum += interval(nrm);
    }
    rowSum[bi] = up(sum);
    if (rowSum[bi] > q) { q = rowSum[bi]; worstRow = bi; }
  }
  // Invariance of B, block by block: ||G(y)_b|| <= ||G(0)_b|| + sum_c ||M_bc|| ||y_c|| <= g0_b + (row sum)_b * rho_b < rho_b.
  double total = 0;
  for (int b = 0; b < nb; ++b) {
    interval s2 = 0;
    for (int k = 0; k < bs[b]; ++k) s2 += sqr(interval(abs(G0[b0[b] + k]).rightBound()));
    double gb = up(sqrt(interval(up(s2))) / interval(rho[b]));
    total = std::max(total, up(interval(gb) + interval(rowSum[b])));
  }
  // Diagnostics for the (untrusted) radius tuner: per-block centre residual and the block-norm matrix (upper bounds,
  // in absolute coordinates, i.e. before dividing by the radii).
  if (const char* dbg = std::getenv("VERIFY_DIAG")) {
    std::ofstream d(dbg);
    d << std::setprecision(17) << nb << "\n";
    for (int b = 0; b < nb; ++b) {
      interval s2 = 0;
      for (int k = 0; k < bs[b]; ++k) s2 += sqr(interval(abs(G0[b0[b] + k]).rightBound()));
      d << up(sqrt(interval(up(s2)))) << (b + 1 < nb ? " " : "\n");
    }
    for (int bi = 0; bi < nb; ++bi) for (int bj = 0; bj < nb; ++bj) {
      double nrm;
      if (bi == bj && bs[bi] == 2) { int a0 = b0[bi]; nrm = norm2x2(M[a0][a0], M[a0][a0 + 1], M[a0 + 1][a0], M[a0 + 1][a0 + 1]); }
      else { interval fs = 0; for (int u = 0; u < bs[bi]; ++u) for (int v = 0; v < bs[bj]; ++v) fs += sqr(interval(abs(M[b0[bi] + u][b0[bj] + v]).rightBound())); nrm = up(sqrt(interval(up(fs)))); }
      d << nrm << (bj + 1 < nb ? " " : "\n");
    }
    for (int i = 0; i < dim; ++i) d << Pc[i].leftBound() << " " << Pc[i].rightBound() << (i + 1 < dim ? " " : "\n");
  }
  bool periodOk = true;
  long gatePieces = 0;
  std::string gateWhy;
  if (N > 1) {
    const int grid = std::getenv("VERIFY_GATE_GRID") ? std::atoi(std::getenv("VERIFY_GATE_GRID")) : 8;
    periodOk = periodGate<N>(f, order, xc, A, r, level, T.rightBound(), grid, gatePieces, gateWhy);
    std::cerr << "period gate: " << (periodOk ? "passed" : "FAILED: " + gateWhy) << " (" << gatePieces << " pieces)\n";
  }
  // Every quantity entering the decision must be finite (a NaN would be skipped by the comparisons above).
  if (!std::isfinite(q) || !std::isfinite(total) || !std::isfinite(r0)) throw std::runtime_error("non-finite norm bound");
  for (int b = 0; b < nb; ++b) if (!std::isfinite(rowSum[b])) throw std::runtime_error("non-finite row sum");
  // The centre run and the box run must resolve the same crossing: the centre's section time lies in the box's.
  const bool sameCrossing = subset(Tc, T);
  if (!sameCrossing) std::cerr << "centre section time " << iv(Tc) << " not inside box section time " << iv(T) << "\n";
  bool ok = q < 1.0 && total < 1.0 && periodOk && sameCrossing;

  out << std::setprecision(17);
  out << "{\n  \"schema\": \"cardiac-cycle-contraction-v1\",\n  \"N\": " << N << ",\n  \"dimension\": " << dim
      << ",\n  \"gKs\": [\"" << gLo << "\", \"" << gHi << "\"],\n  \"coupling\": \"" << cNum << "/" << cDen
      << "\",\n  \"section_level_hex\": \"" << hexd(level) << "\",\n  \"order\": " << order
      << ",\n  \"radii\": [";
  for (int b = 0; b < nb; ++b) out << (b ? ", " : "") << rho[b];
  out << "],\n  \"block_sizes\": [";
  for (int b = 0; b < nb; ++b) out << (b ? ", " : "") << bs[b];
  out << "],\n  \"diag_block_norm_upper\": [";
  for (int b = 0; b < nb; ++b) out << (b ? ", " : "") << diagNorm[b];
  out << "],\n  \"row_sum_upper\": [";
  for (int b = 0; b < nb; ++b) out << (b ? ", " : "") << rowSum[b];
  out << "],\n  \"q_upper\": " << q << ",\n  \"q_upper_hex\": \"" << hexd(q) << "\",\n  \"worst_block\": " << worstRow
      << ",\n  \"r0_upper\": " << r0 << ",\n  \"max_block_residual_plus_row_sum_upper\": " << total
      << ",\n  \"section_map_time\": \"" << iv(T) << "\",\n  \"section_map_time_centre\": \"" << iv(Tc) << "\""
      << ",\n  \"period\": \"" << iv(T * interval(double(N))) << "\""
      << ",\n  \"period_exact\": " << ivhex(T * interval(double(N)))
      << ",\n  \"section_map_time_exact\": " << ivhex(T)
      << ",\n  \"centre_section_time_exact\": " << ivhex(Tc)
      << ",\n  \"centre_time_inside_box_time\": " << (sameCrossing ? "true" : "false")
      << ",\n  \"floquet_bound_full_period_upper\": " << up(power(interval(q), N))
      << ",\n  \"settings\": {\"order\": " << order << ", \"fixed_step\": " << fixedStep << ", \"c1_set\": \"" << (ho ? "C1HORect2Set" : "C1Rect2Set")
      << "\", \"mp_bits\": " << mpBits << ", \"mp_order\": " << mpOrder << ", \"mp_tol\": \"" << (std::getenv("VERIFY_MP_TOL") ? std::getenv("VERIFY_MP_TOL") : "default")
      << "\", \"gate_grid\": " << (std::getenv("VERIFY_GATE_GRID") ? std::getenv("VERIFY_GATE_GRID") : "8") << "}"
      << ",\n  \"minimal_period_and_nonsynchrony_gate\": " << (N == 1 ? "\"not needed (first return)\"" : (periodOk ? "\"passed\"" : "\"failed\""))
      << ",\n  \"gate_pieces\": " << gatePieces
      << ",\n  \"verified\": " << (ok ? "true" : "false") << "\n}\n";
  std::cout << (ok ? "VERIFIED" : "NOT VERIFIED") << "  q <= " << q << "  r0 <= " << r0 << "  max_b(g0_b/rho_b + rowsum_b) <= " << total
            << "  period in " << iv(T * interval(double(N))) << "\n";
  return ok ? 0 : 1;
}

int main(int argc, char** argv) {
  if (argc != 3) { std::cerr << "usage: verify frame.txt out.json\n"; return 2; }
  std::ifstream in(argv[1]);
  std::ofstream out(argv[2]);
  int N; std::string gLo, gHi; long cNum, cDen;
  in >> N >> gLo >> gHi >> cNum >> cDen;
  try {
    switch (N) {
      case 1: return run<1>(in, gLo, gHi, cNum, cDen, out);
      case 8: return run<8>(in, gLo, gHi, cNum, cDen, out);
      case 16: return run<16>(in, gLo, gHi, cNum, cDen, out);
      case 32: return run<32>(in, gLo, gHi, cNum, cDen, out);
      case 64: return run<64>(in, gLo, gHi, cNum, cDen, out);
    }
  } catch (std::exception& e) {
    std::cout << "NOT VERIFIED: " << e.what() << "\n";
    out << "{\"verified\": false, \"error\": \"" << jsonEscape(e.what()) << "\"}\n";
    return 1;
  }
  return 2;
}
