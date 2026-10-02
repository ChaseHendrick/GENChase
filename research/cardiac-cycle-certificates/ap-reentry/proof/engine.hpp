// Segment engine of the reentry proof program (ap-reentry/proof): rigorous CAPD integration of the ring of
// ring19.hpp over one segment of the shift interval, with
//   * per-step mode choice (h/j branch fixed per segment; GHK window per cell from the set's hull), and per-step
//     certification on the step enclosure W of CAPD (all trajectories of the set over the step) that each mode is
//     valid: branch side strictly (or the designated crossing/exempt rules), quotient cells keep V != 15 mV, window
//     cells keep |zeta| <= pi (radius ratio 1/2 of the series);
//   * a Gronwall perturbation bound for steps with window cells (C0 and C1): the window field F~ differs from the
//     model field F by (A_V, A_C) R(zeta) in two rows per window cell, |R^{(j)}| <= T_j; per step of length h, with
//     l = mu_inf(DF~)(W') + eps1, L+ = max(l, 0):
//         |x(h) - x~(h)| <= delta = eps0 h e^{L+ h}                         (C0)
//         |V(h) - V~(h)| <= h e^{L+ h} (M2 delta + eps1) |V0| e^{l~+ h}     (C1)
//     where eps0 = sup|F - F~|, eps1 = sup||DF - DF~||, M2 = sup max_i sum_{m,n} |d2 F_i| (true F), all over
//     W' = W + [-dstar, dstar] (dstar a priori, checked: delta <= dstar). The set is inflated by delta (C0) and the
//     derivative by the entrywise bound (C1);
//   * a section end through CAPD's PoincareMap (patched, proofs/capd-6.1.0-genchase.patch), with every cell on the
//     quotient representation and a validation re-run over [t_pre, t_pre + T_right] that certifies the branch sides,
//     the quotient validity and the monotone crossing of the designated cell;
//   * checkpoints of the full set state (exact binary) every K steps, and resume.
// Pilot / proof-program code: no theorem has been established with it.
#pragma once
#include <algorithm>
#include <chrono>
#include <cstdio>
#include <cstring>
#include <fstream>
#include <functional>
#include <iomanip>
#include <iostream>
#include <map>
#include <sstream>
#include <string>
#include <vector>
#include "ring19.hpp"
#include "capd/mpcapdlib.h"

namespace tp06 {
template <> inline capd::MpInterval decimalAs<capd::MpInterval>(const std::string& s) { return decimalEnclosureT<capd::MpInterval>(s); }
}

namespace apx {
using namespace capd;
using ring19::NS;

inline double now() { return std::chrono::duration<double>(std::chrono::steady_clock::now().time_since_epoch()).count(); }

// ---- scalar helpers ------------------------------------------------------------------------------------------
inline interval toI(const interval& x) { return x; }
inline interval toI(const MpInterval& x) {
  using capd::multiPrec::MpReal;
  return interval(toDouble(x.leftBound(), MpReal::RoundDown), toDouble(x.rightBound(), MpReal::RoundUp));
}
template <class V> IVector toIV(const V& v) { IVector o(v.dimension()); for (size_t i = 0; i < v.dimension(); ++i) o[i] = toI(v[i]); return o; }
template <class M> IMatrix toIM(const M& m) {
  IMatrix o(m.numberOfRows(), m.numberOfColumns());
  for (size_t i = 0; i < m.numberOfRows(); ++i) for (size_t k = 0; k < m.numberOfColumns(); ++k) o[i][k] = toI(m[i][k]);
  return o;
}
inline double up(const interval& v) { return v.rightBound(); }
inline double mag(const interval& v) { return std::max(std::abs(v.leftBound()), std::abs(v.rightBound())); }
inline bool finiteI(const interval& v) { return std::isfinite(v.leftBound()) && std::isfinite(v.rightBound()); }
inline std::string hexd(double v) { char b[64]; std::snprintf(b, sizeof b, "%a", v); return b; }
inline double unhex(const std::string& s) { return std::strtod(s.c_str(), nullptr); }

// ---- set wrapper: inflation and exact state access -------------------------------------------------------------
template <class Base>
struct Infl : public Base {
  using Base::Base;
  Infl(const Base& b) : Base(b) {}
  template <class V> void inflateC0(const V& e) { this->m_x += e; this->m_currentSet += e; }
  template <class M> void inflateC1(const M& E) { this->m_D += E; this->m_currentMatrix += E; }
  // exact state: all representation members
  template <class F> void visitC0(F&& fn) {
    fn(this->m_x); fn(this->m_r0); fn(this->m_r); fn(this->m_currentSet); fn(this->m_lastEnclosure);
  }
  template <class F> void visitC0M(F&& fn) { fn(this->m_C); fn(this->m_B); fn(this->m_invB); }
  template <class F> void visitC1M(F&& fn) {
    fn(this->m_D); fn(this->m_Cjac); fn(this->m_R0); fn(this->m_Bjac); fn(this->m_invBjac); fn(this->m_R);
    fn(this->m_currentMatrix); fn(this->m_lastMatrixEnclosure);
  }
};

// ---- traits -----------------------------------------------------------------------------------------------------
struct TrC1 {
  typedef interval S; typedef IVector Vec; typedef IMatrix Mat; typedef IMap Map; typedef IOdeSolver Solver;
  typedef Infl<C1Rect2Set> Set; typedef ICoordinateSection Sect; typedef IPoincareMap PM;
  static constexpr bool C1 = true; static constexpr bool MP = false; static const char* name() { return "c1"; }
};
struct TrC0 {
  typedef interval S; typedef IVector Vec; typedef IMatrix Mat; typedef IMap Map; typedef IOdeSolver Solver;
  typedef Infl<C0Rect2Set> Set; typedef ICoordinateSection Sect; typedef IPoincareMap PM;
  static constexpr bool C1 = false; static constexpr bool MP = false; static const char* name() { return "c0"; }
};
struct TrMP0 {
  typedef MpInterval S; typedef MpIVector Vec; typedef MpIMatrix Mat; typedef MpIMap Map; typedef MpIOdeSolver Solver;
  typedef Infl<MpC0Rect2Set> Set; typedef MpICoordinateSection Sect; typedef MpIPoincareMap PM;
  static constexpr bool C1 = false; static constexpr bool MP = true; static const char* name() { return "mp0"; }
};

// ---- exact serialization ---------------------------------------------------------------------------------------
// Double intervals: raw IEEE-754 bytes. MP intervals: base-16 MPFR strings with all digits (exact).
struct Writer {
  std::ofstream o;
  explicit Writer(const std::string& p) : o(p, std::ios::binary) { if (!o) throw std::runtime_error("cannot write " + p); }
  void d(double v) { o.write(reinterpret_cast<const char*>(&v), 8); }
  void i(long v) { o.write(reinterpret_cast<const char*>(&v), 8); }
  void s(const interval& v) { d(v.leftBound()); d(v.rightBound()); }
  void s(const MpInterval& v);
  template <class V> void vec(const V& v) { i(long(v.dimension())); for (size_t k = 0; k < v.dimension(); ++k) s(v[k]); }
  template <class M> void mat(const M& m) {
    i(long(m.numberOfRows())); i(long(m.numberOfColumns()));
    for (size_t a = 0; a < m.numberOfRows(); ++a) for (size_t b = 0; b < m.numberOfColumns(); ++b) s(m[a][b]);
  }
};
struct Reader {
  std::ifstream in;
  explicit Reader(const std::string& p) : in(p, std::ios::binary) { if (!in) throw std::runtime_error("cannot read " + p); }
  double d() { double v; in.read(reinterpret_cast<char*>(&v), 8); if (!in) throw std::runtime_error("short checkpoint"); return v; }
  long i() { long v; in.read(reinterpret_cast<char*>(&v), 8); if (!in) throw std::runtime_error("short checkpoint"); return v; }
  void s(interval& v) { double a = d(), b = d(); v = interval(a, b); }
  void s(MpInterval& v);
  template <class V> void vec(V& v) { long n = i(); if (n != long(v.dimension())) throw std::runtime_error("checkpoint dimension"); for (long k = 0; k < n; ++k) s(v[k]); }
  template <class M> void mat(M& m) {
    long r = i(), c = i();
    if (r != long(m.numberOfRows()) || c != long(m.numberOfColumns())) throw std::runtime_error("checkpoint dimension");
    for (long a = 0; a < r; ++a) for (long b = 0; b < c; ++b) s(m[a][b]);
  }
};
namespace mpio {
struct Acc : capd::multiPrec::MpReal {  // read access to the MPFR value (protected member)
  static mpfr_srcptr get(const capd::multiPrec::MpReal& r) { return static_cast<const Acc&>(r).mpfr_rep; }
  static mpfr_ptr getm(capd::multiPrec::MpReal& r) { return static_cast<Acc&>(r).mpfr_rep; }
};
inline std::string str(const capd::multiPrec::MpReal& r) {
  mpfr_srcptr p = Acc::get(r);
  char* buf = mpfr_get_str(nullptr, nullptr, 16, 0, p, MPFR_RNDN);
  mpfr_exp_t e; char* b2 = mpfr_get_str(nullptr, &e, 16, 0, p, MPFR_RNDN);
  std::string s = std::string(b2) + "@" + std::to_string(long(e)) + "#" + std::to_string(long(mpfr_get_prec(p)));
  mpfr_free_str(buf); mpfr_free_str(b2);
  return s;
}
inline capd::multiPrec::MpReal parse(const std::string& s) {
  size_t a = s.find('@'), b = s.find('#');
  std::string mant = s.substr(0, a);
  long e = std::stol(s.substr(a + 1, b - a - 1)), prec = std::stol(s.substr(b + 1));
  bool neg = !mant.empty() && mant[0] == '-';
  std::string digits = neg ? mant.substr(1) : mant;
  // value = 0.digits (base 16) * 16^e
  std::string lit = std::string(neg ? "-" : "") + "0." + digits + "@" + std::to_string(e);
  capd::multiPrec::MpReal r(0.0);
  mpfr_ptr rep = Acc::getm(r);
  mpfr_set_prec(rep, prec);
  if (mpfr_set_str(rep, lit.c_str(), 16, MPFR_RNDN) != 0) throw std::runtime_error("bad MP string " + s);
  return r;
}
}  // namespace mpio
inline void Writer::s(const MpInterval& v) {
  std::string a = mpio::str(v.leftBound()), b = mpio::str(v.rightBound());
  i(long(a.size())); o.write(a.data(), a.size()); i(long(b.size())); o.write(b.data(), b.size());
}
inline void Reader::s(MpInterval& v) {
  long n = i(); std::string a(n, ' '); in.read(&a[0], n);
  long m = i(); std::string b(m, ' '); in.read(&b[0], m);
  if (!in) throw std::runtime_error("short checkpoint");
  v = MpInterval(mpio::parse(a), mpio::parse(b));
}

// ---- window coefficients: the recurrence of ring19::ghkCoefficients in 600-bit interval arithmetic, rounded outward
// (in double the recurrence loses about one digit per degree: c_24 would have relative width ~1).
inline const std::vector<MpInterval>& ghkCoefsMP() {
  static std::vector<MpInterval> c;
  if (c.empty()) {
    auto prec = MpFloat::getDefaultPrecision();
    MpFloat::setDefaultPrecision(600);
    c = ring19::ghkCoefficients<MpInterval>(ring19::KMAX);
    MpFloat::setDefaultPrecision(prec);
  }
  return c;
}
template <class S> std::vector<S> ghkCoefs();
template <> inline std::vector<interval> ghkCoefs<interval>() { std::vector<interval> o; for (auto& v : ghkCoefsMP()) o.push_back(toI(v)); return o; }
template <> inline std::vector<MpInterval> ghkCoefs<MpInterval>() { return ghkCoefsMP(); }

// ---- plan -----------------------------------------------------------------------------------------------------
struct SegSpec {
  int index = 0;
  std::string startKind = "previous", startFile, pointFile;  // affine | box | previous (C1); point file for C0/MP seg 0
  std::string endKind = "section";                             // section | duration
  double duration = 0;                                         // ms (duration end)
  int secCell = -1; std::string secLevel = "-40"; int secDir = 0;  // section end
  std::vector<int> low;                                        // branch mask (1 = V < -40 formulas)
  std::vector<std::pair<int, int>> exempt;                     // (cell, sign): cell starts at -40 moving in direction sign
  bool flipAfter = true;                                       // flip the crossing cell's branch for the next segment
};
struct Plan {
  int N = 0; std::string coupling;
  int order = 20, mpOrder = 30, mpBits = 128, ghkDegree = 24;
  double tol = 0, mpTol = 0, theta = 1.0, dstar = 1e-12, approachSteps = 3.0;
  long ckptEvery = 200;
  bool noInflation = false, forceQuot = false, noSwitch = false;  // negative controls ONLY (outputs say INVALID)
  std::vector<SegSpec> segs;
  std::string path;
};
inline std::vector<std::string> splitWs(const std::string& s) { std::istringstream is(s); std::vector<std::string> o; std::string w; while (is >> w) o.push_back(w); return o; }
inline Plan readPlan(const std::string& path) {
  Plan p; p.path = path;
  std::ifstream in(path);
  if (!in) throw std::runtime_error("cannot read plan " + path);
  std::string line;
  while (std::getline(in, line)) {
    size_t h = line.find('#'); if (h != std::string::npos) line = line.substr(0, h);
    auto w = splitWs(line);
    if (w.empty()) continue;
    const std::string& k = w[0];
    if (k == "N") p.N = std::stoi(w[1]);
    else if (k == "coupling") p.coupling = w[1];
    else if (k == "order") p.order = std::stoi(w[1]);
    else if (k == "mp_order") p.mpOrder = std::stoi(w[1]);
    else if (k == "mp_bits") p.mpBits = std::stoi(w[1]);
    else if (k == "ghk_degree") p.ghkDegree = std::stoi(w[1]);
    else if (k == "tol") p.tol = std::stod(w[1]);
    else if (k == "mp_tol") p.mpTol = std::stod(w[1]);
    else if (k == "ghk_theta_mV") p.theta = std::stod(w[1]);
    else if (k == "apriori") p.dstar = std::stod(w[1]);
    else if (k == "approach_steps") p.approachSteps = std::stod(w[1]);
    else if (k == "checkpoint_every") p.ckptEvery = std::stol(w[1]);
    else if (k == "negative_control_no_inflation") p.noInflation = std::stoi(w[1]) != 0;
    else if (k == "negative_control_force_quotient") p.forceQuot = std::stoi(w[1]) != 0;
    else if (k == "negative_control_no_switch") p.noSwitch = std::stoi(w[1]) != 0;
    else if (k == "segment") {
      SegSpec s; s.index = std::stoi(w[1]);
      for (size_t i = 2; i < w.size(); ++i) {
        if (w[i] == "start") { s.startKind = w[++i]; if (s.startKind != "previous") s.startFile = w[++i]; }
        else if (w[i] == "point") s.pointFile = w[++i];
        else if (w[i] == "end") {
          s.endKind = w[++i];
          if (s.endKind == "duration") s.duration = std::stod(w[++i]);
          else { s.secCell = std::stoi(w[++i]); s.secLevel = w[++i]; s.secDir = std::stoi(w[++i]); }
        } else if (w[i] == "low") { for (int k = 0; k < p.N; ++k) s.low.push_back(std::stoi(w[++i])); }
        else if (w[i] == "exempt") { int c = std::stoi(w[++i]); int sg = std::stoi(w[++i]); s.exempt.push_back({c, sg}); }
        else if (w[i] == "noflip") s.flipAfter = false;
        else throw std::runtime_error("unknown segment token " + w[i]);
      }
      if (int(s.low.size()) != p.N) throw std::runtime_error("segment low mask size");
      if (s.index != int(p.segs.size())) throw std::runtime_error("segments must be numbered 0, 1, ...");
      p.segs.push_back(s);
    } else throw std::runtime_error("unknown plan key " + k);
  }
  if (p.N < 1 || p.coupling.empty() || p.segs.empty()) throw std::runtime_error("incomplete plan");
  if (p.ghkDegree < 2 || p.ghkDegree > ring19::KMAX || p.ghkDegree % 2) throw std::runtime_error("ghk_degree must be even in [2, KMAX]");
  return p;
}

// ---- tail bounds of R = g - p_K ---------------------------------------------------------------------------------
// |c_n| <= (pi^2/3) (2 pi)^{-n} for even n >= 2 (|B_2k|/(2k)! = 2 zeta(2k)/(2 pi)^{2k}, zeta(2k) <= pi^2/6), odd n >= 3
// vanish. For |zeta| <= zm, rho = zm/(2 pi) < 1, n0 = K + 2 (first omitted even degree), u = rho^2:
//   T0 = C rho^n0 / (1-u)
//   T1 = C q rho^(n0-1) [n0/(1-u) + 2u/(1-u)^2]
//   T2 = C q^2 rho^(n0-2) [n0(n0-1)/(1-u) + 2(2 n0 - 1) u/(1-u)^2 + 4u(1+u)/(1-u)^3],  C = pi^2/3, q = 1/(2 pi).
struct Tails { interval T0, T1, T2, rho; };
inline Tails tails(double zm, int K) {
  interval pi = interval::pi();
  interval q = interval(1.0) / (2.0 * pi);
  interval C = sqr(pi) / 3.0;
  interval rho = interval(zm) * q;
  if (!(rho.rightBound() < 0.5)) throw std::runtime_error("window: |zeta| too large for the series bound");
  interval u = sqr(rho), om = 1.0 - u;
  int n0 = K + 2;
  interval a = interval(double(n0));
  Tails t;
  t.rho = rho;
  t.T0 = C * power(rho, n0) / om;
  t.T1 = C * q * power(rho, n0 - 1) * (a / om + 2.0 * u / sqr(om));
  t.T2 = C * sqr(q) * power(rho, n0 - 2) * (a * (a - 1.0) / om + 2.0 * (2.0 * a - 1.0) * u / sqr(om) + 4.0 * u * (1.0 + u) / power(om, 3));
  return t;
}

// ---- Gronwall perturbation bound (double intervals) -------------------------------------------------------------
struct Gronwall {
  int N; double cAbs; int K;
  IMap cellmap, amap;
  interval RTF, alpha;  // zeta = alpha z_V - 30/RTF, alpha = 2 sigma_V / RTF
  Gronwall(int N_, const std::string& coupling, int K_)
      : N(N_), K(K_), cellmap(ring19::ringField, NS, NS, ring19::numParams(1), 2),
        amap(ring19::prefactorField, NS, 2, ring19::numParams(1), 2) {
    ring19::setParameters<IMap, interval>(cellmap, "0", 1, ghkCoefs<interval>());
    ring19::setParameters<IMap, interval>(amap, "0", 1, ghkCoefs<interval>());
    cAbs = mag(tp06::decimalEnclosure(coupling));
    RTF = tp06::decimalEnclosure("8314.472") * 310.0 / tp06::decimalEnclosure("96485.3415");
    alpha = 2.0 * ring19::scaleOf(0) / RTF;
  }
  struct Out { double delta = 0, e1 = 0, l = 0, lt = 0, eps0 = 0, eps1 = 0, M2 = 0, zmax = 0, T0 = 0; };
  static double hessRowSum(const IMap::HessianType& H, int i, int n) {
    interval s = 0;
    for (int j = 0; j < n; ++j) { s += 2.0 * interval(mag(H(i, j, j))); for (int k = j + 1; k < n; ++k) s += 2.0 * interval(mag(H(i, j, k))); }
    return up(s);
  }
  Out bound(const IVector& Wp, const std::vector<int>& low, const std::vector<char>& poly, double h, double normD0, bool c1) {
    Out o;
    double lt = -1e300, eps0 = 0, eps1 = 0, M2 = 0;
    for (int k = 0; k < N; ++k) {
      IVector w(NS);
      for (int a = 0; a < NS; ++a) w[a] = Wp[NS * k + a];
      ring19::setMode<IMap, interval>(cellmap, 0, low[k] != 0, poly[k] != 0);
      IMatrix J(NS, NS);
      IMap::HessianType H(NS, NS);
      cellmap(w, J, H);
      double m2Delta = 0, e1k = 0;
      if (poly[k]) {
        interval zeta = alpha * w[0] - 30.0 / RTF;
        double zm = mag(zeta);
        o.zmax = std::max(o.zmax, zm);
        Tails t = tails(zm, K);
        o.T0 = std::max(o.T0, up(t.T0));
        IMatrix DA(2, NS);
        IMap::HessianType HA(2, NS);
        IVector A = amap(w, DA, HA);
        for (int r = 0; r < 2; ++r) {
          interval sD = 0;
          for (int m = 0; m < NS; ++m) sD += interval(mag(DA[r][m]));
          interval aA(mag(A[r]));
          eps0 = std::max(eps0, up(aA * t.T0));
          e1k = std::max(e1k, up(sD * t.T0 + aA * alpha * t.T1));
          m2Delta = std::max(m2Delta, up(interval(hessRowSum(HA, r, NS)) * t.T0 + 2.0 * alpha * sD * t.T1 + aA * sqr(alpha) * t.T2));
        }
        eps1 = std::max(eps1, e1k);
      }
      for (int a = 0; a < NS; ++a) {
        interval row = interval(J[a][a].rightBound());
        for (int b = 0; b < NS; ++b) if (b != a) row += interval(mag(J[a][b]));
        if (a == 0 && N > 1) row += interval(2.0 * cAbs);  // coupling: -2c on the diagonal (dropped, <= 0), off-diagonal 2|c|
        lt = std::max(lt, up(row));
        double m2 = hessRowSum(H, a, NS);
        if (poly[k] && (a == 0 || a == 16)) m2 = up(interval(m2) + interval(m2Delta));
        M2 = std::max(M2, m2);
      }
    }
    o.lt = lt; o.eps0 = eps0; o.eps1 = eps1; o.M2 = M2;
    interval l = interval(lt) + interval(eps1);
    o.l = up(l);
    interval Lp(std::max(0.0, up(l))), hI(h), ltp(std::max(0.0, lt));
    interval g = hI * exp(Lp * hI);
    interval delta = interval(eps0) * g;
    o.delta = up(delta);
    if (c1) o.e1 = up(g * (interval(M2) * delta + interval(eps1)) * interval(normD0) * exp(ltp * hI));
    return o;
  }
};

// ---- the engine -------------------------------------------------------------------------------------------------
struct SegResult {
  bool ok = false; std::string error;
  long steps = 0, polySteps = 0, retries = 0, validationSteps = 0;
  double hmin = 1e300, hmax = 0, deltaMax = 0, e1Max = 0, deltaSum = 0, e1Sum = 0, lMax = -1e300, zmaxMax = 0, T0Max = 0;
  double wall = 0, wallValidation = 0;
  interval T = 0;  // time of the segment (duration or section time), relative to the segment start
  bool resumed = false; long resumedAtStep = 0;
  std::vector<long> polyStepsPerCell;
  std::string checks;  // human summary of the certified conditions
};

template <class Tr>
class Engine {
 public:
  typedef typename Tr::S S; typedef typename Tr::Vec Vec; typedef typename Tr::Mat Mat; typedef typename Tr::Set Set;
  const Plan& plan; const SegSpec& seg; int N, dim;
  typename Tr::Map& f; typename Tr::Solver& solver;
  IMap& fD;  // double field for checks (same modes)
  Gronwall& gw;
  std::vector<int> low; std::vector<char> poly; std::vector<int> exSign;  // exSign[k]: 0 none, +-1 active exemption
  std::string ckptPath; std::ostream& log;
  double levelScaled;  // section level / sigma_V (exact)

  Engine(const Plan& p, const SegSpec& s, typename Tr::Map& f_, typename Tr::Solver& sol, IMap& fD_, Gronwall& g,
         const std::string& ckpt, std::ostream& lg)
      : plan(p), seg(s), N(p.N), dim(NS * p.N), f(f_), solver(sol), fD(fD_), gw(g), ckptPath(ckpt), log(lg) {
    low = seg.low; poly.assign(N, 0); exSign.assign(N, 0);
    for (auto& e : seg.exempt) exSign[e.first] = e.second;
    levelScaled = seg.endKind == "section" ? mid(tp06::decimalEnclosure(seg.secLevel)).leftBound() / ring19::scaleOf(0) : 0.0;
    if (seg.endKind == "section" && !(interval(levelScaled * ring19::scaleOf(0)) == tp06::decimalEnclosure(seg.secLevel)))
      throw std::runtime_error("section level must be exactly representable");
  }

  void applyModes() {
    for (int k = 0; k < N; ++k) {
      ring19::setMode<typename Tr::Map, S>(f, k, low[k] != 0, poly[k] != 0);
      ring19::setMode<IMap, interval>(fD, k, low[k] != 0, poly[k] != 0);
    }
  }
  // hull of V of cell k in mV (double interval)
  interval Vhull(const Set& s, int k) const { return toI(Vec(s)[NS * k]) * ring19::scaleOf(0); }

  void chooseModes(const Set& s, bool forceQuot) {
    IVector x = toIV(Vec(s));
    for (int k = 0; k < N; ++k) {
      interval V = x[NS * k] * ring19::scaleOf(0);
      bool near = !(V.leftBound() > 15.0 + plan.theta || V.rightBound() < 15.0 - plan.theta);
      poly[k] = (!forceQuot && !plan.forceQuot && near) ? 1 : 0;
    }
  }
  static double normInf(const IMatrix& M) {
    double m = 0;
    for (size_t i = 0; i < M.numberOfRows(); ++i) { interval s = 0; for (size_t k = 0; k < M.numberOfColumns(); ++k) s += interval(mag(M[i][k])); m = std::max(m, up(s)); }
    return m;
  }

  // Certify the modes on the step enclosure Wp (all trajectories over the step, widened by dstar).
  // Returns "" if valid, else a reason; quotFail lists quotient cells whose enclosure meets V = 15.
  // crossCell/crossDir: the designated crossing cell during a section approach (validation run), else -1.
  std::string certify(const IVector& Wp, std::vector<int>& quotFail, int crossCell, int crossDir, bool& usedExempt) {
    usedExempt = false;
    for (int i = 0; i < dim; ++i) if (!finiteI(Wp[i])) return "non-finite enclosure";
    IVector FW;
    bool haveF = false;
    auto field = [&]() -> const IVector& { if (!haveF) { FW = fD(Wp); haveF = true; } return FW; };
    const double L = -40.0;
    for (int k = 0; k < N; ++k) {
      interval V = Wp[NS * k] * ring19::scaleOf(0);
      // GHK representation
      if (poly[k]) {
        interval zeta = gw.alpha * Wp[NS * k] - 30.0 / gw.RTF;
        if (!(up(interval(mag(zeta)) / (2.0 * interval::pi())) < 0.5)) return "window cell " + std::to_string(k) + " left |zeta| < pi";
      } else if (!(V.leftBound() > 15.0 || V.rightBound() < 15.0)) quotFail.push_back(k);
      // branch side
      bool strict = low[k] ? V.rightBound() < L : V.leftBound() > L;
      if (strict) { if (exSign[k] != 0) exSign[k] = 0; continue; }  // exemption ends once strictly on its side
      int sgn = 0;
      if (k == crossCell) sgn = crossDir;
      else if (exSign[k] != 0) sgn = exSign[k];
      if (sgn == 0) {
        std::ostringstream o; o << "cell " << k << " branch " << (low[k] ? "low" : "high") << " not certified: V in [" << V.leftBound() << ", " << V.rightBound() << "]";
        return o.str();
      }
      interval dV = field()[NS * k];
      bool mono = sgn > 0 ? dV.leftBound() > 0 : dV.rightBound() < 0;
      if (!mono) {
        std::ostringstream o; o << "cell " << k << " at the -40 level without a certified monotone " << (sgn > 0 ? "rise" : "fall");
        return o.str();
      }
      usedExempt = true;
    }
    return "";
  }

  void saveCkpt(Set& s, const SegResult& r) {
    if (ckptPath.empty()) return;
    std::string tmp = ckptPath + ".tmp";
    {
      Writer w(tmp);
      w.i(0x4150524543ll); w.i(Tr::C1 ? 1 : (Tr::MP ? 2 : 0)); w.i(dim);
      w.s(s.getCurrentTime());
      s.visitC0([&](auto& v) { w.vec(v); });
      s.visitC0M([&](auto& m) { w.mat(m); });
      if constexpr (Tr::C1) s.visitC1M([&](auto& m) { w.mat(m); });
      w.i(r.steps); w.i(r.polySteps); w.i(r.retries);
      w.d(r.hmin); w.d(r.hmax); w.d(r.deltaMax); w.d(r.e1Max); w.d(r.deltaSum); w.d(r.e1Sum); w.d(r.lMax); w.d(r.zmaxMax); w.d(r.T0Max);
      w.d(r.wall);
      for (int k = 0; k < N; ++k) w.i(exSign[k]);
      for (int k = 0; k < N; ++k) w.i(r.polyStepsPerCell[k]);
      w.i(0x454e44ll);
      w.o.flush();
      if (!w.o) throw std::runtime_error("checkpoint write failed");
    }
    std::rename(tmp.c_str(), ckptPath.c_str());
  }
  bool loadCkpt(Set& s, SegResult& r) {
    if (ckptPath.empty()) return false;
    std::ifstream probe(ckptPath, std::ios::binary);
    if (!probe) return false;
    probe.close();
    Reader rd(ckptPath);
    if (rd.i() != 0x4150524543ll) throw std::runtime_error("bad checkpoint magic");
    if (rd.i() != (Tr::C1 ? 1 : (Tr::MP ? 2 : 0))) throw std::runtime_error("checkpoint of another kind");
    if (rd.i() != dim) throw std::runtime_error("checkpoint dimension");
    S t; rd.s(t);
    s.visitC0([&](auto& v) { rd.vec(v); });
    s.visitC0M([&](auto& m) { rd.mat(m); });
    if constexpr (Tr::C1) s.visitC1M([&](auto& m) { rd.mat(m); });
    s.setCurrentTime(t);
    r.steps = rd.i(); r.polySteps = rd.i(); r.retries = rd.i();
    r.hmin = rd.d(); r.hmax = rd.d(); r.deltaMax = rd.d(); r.e1Max = rd.d(); r.deltaSum = rd.d(); r.e1Sum = rd.d(); r.lMax = rd.d();
    r.zmaxMax = rd.d(); r.T0Max = rd.d(); r.wall = rd.d();
    for (int k = 0; k < N; ++k) exSign[k] = int(rd.i());
    for (int k = 0; k < N; ++k) r.polyStepsPerCell[k] = rd.i();
    if (rd.i() != 0x454e44ll) throw std::runtime_error("checkpoint trailer");
    r.resumed = true; r.resumedAtStep = r.steps;
    return true;
  }

  // One certified step (with retry). Returns false when the duration end is reached (no step taken).
  // tEnd: absolute end time (duration segments) or +inf.
  bool step(Set& s, double tEnd, SegResult& r, bool forceQuot, int crossCell, int crossDir, bool countAsValidation) {
    double tNow = toI(s.getCurrentTime()).rightBound();
    double maxStep = std::isfinite(tEnd) ? tEnd - toI(s.getCurrentTime()).leftBound() : 1.0;
    if (std::isfinite(tEnd) && !(maxStep > 1e-13)) return false;
    (void)tNow;
    chooseModes(s, forceQuot);
    for (int attempt = 0; attempt < 40; ++attempt) {
      applyModes();
      Set backup = s;
      double normD0 = 0;
      if constexpr (Tr::C1) normD0 = normInf(toIM(Mat(s)));
      try {
        solver.setMaxStep(S(maxStep));
        solver(s);
      } catch (std::exception& e) {
        s = backup;
        solver.clearCoefficients();
        maxStep /= 1.5;
        ++r.retries;
        if (maxStep < 1e-9) throw std::runtime_error(std::string("step failed: ") + e.what());
        continue;
      }
      double h = toI(solver.getStep()).rightBound();
      IVector W = toIV(s.getLastEnclosure());
      IVector Wp = W;
      for (int i = 0; i < dim; ++i) Wp[i] += interval(-plan.dstar, plan.dstar);
      std::vector<int> quotFail;
      bool usedEx = false;
      std::string why = certify(Wp, quotFail, crossCell, crossDir, usedEx);
      if (!quotFail.empty()) {
        if (forceQuot || plan.forceQuot) { std::ostringstream o; o << "quotient cell " << quotFail[0] << " meets V = 15 mV"; throw std::runtime_error(o.str()); }
        s = backup;
        for (int k : quotFail) poly[k] = 1;
        ++r.retries;
        continue;
      }
      if (!why.empty()) throw std::runtime_error(why);
      bool anyPoly = false;
      for (int k = 0; k < N; ++k) if (poly[k]) { anyPoly = true; ++r.polyStepsPerCell[k]; }
      if (anyPoly) {
        Gronwall::Out g = gw.bound(Wp, low, poly, h, normD0, Tr::C1);
        if (!(g.delta <= plan.dstar)) throw std::runtime_error("Gronwall delta exceeds the a priori radius");
        if (!plan.noInflation) {
          Vec e(dim);
          for (int i = 0; i < dim; ++i) e[i] = S(-g.delta, g.delta);
          s.inflateC0(e);
          if constexpr (Tr::C1) { Mat E(dim, dim); for (int i = 0; i < dim; ++i) for (int k = 0; k < dim; ++k) E[i][k] = S(-g.e1, g.e1); s.inflateC1(E); }
        }
        ++r.polySteps;
        r.deltaMax = std::max(r.deltaMax, g.delta); r.e1Max = std::max(r.e1Max, g.e1);
        r.deltaSum += g.delta; r.e1Sum += g.e1; r.lMax = std::max(r.lMax, g.l); r.zmaxMax = std::max(r.zmaxMax, g.zmax);
        r.T0Max = std::max(r.T0Max, g.T0);
      }
      if (countAsValidation) ++r.validationSteps; else ++r.steps;
      r.hmin = std::min(r.hmin, h); r.hmax = std::max(r.hmax, h);
      return true;
    }
    throw std::runtime_error("too many step retries");
  }

  // Run the segment from set s (already positioned at its start, time 0, or restored from a checkpoint).
  // Outputs the end set (C0 hull) and, for C1, the derivative (DPhi for duration ends, DP for section ends).
  SegResult run(Set& s, Vec& endX, Mat& endD) {
    SegResult r;
    r.polyStepsPerCell.assign(N, 0);
    double w0 = now();
    if (loadCkpt(s, r)) log << "resumed from checkpoint at step " << r.steps << ", t = " << toI(s.getCurrentTime()) << "\n";
    double wallBefore = r.wall;
    try {
      if (seg.endKind == "duration") {
        while (step(s, seg.duration, r, false, -1, 0, false)) {
          if (plan.ckptEvery > 0 && r.steps % plan.ckptEvery == 0) { r.wall = wallBefore + now() - w0; saveCkpt(s, r); }
          if (r.steps % 100 == 0) log << "step " << r.steps << " t " << toI(s.getCurrentTime()).rightBound() << " h " << r.hmax << "\n" << std::flush;
        }
        endX = Vec(s);
        if constexpr (Tr::C1) endD = Mat(s);
        r.T = toI(s.getCurrentTime());
      } else {
        const int c = seg.secCell;
        const int dir = seg.secDir;
        // approach: step until the crossing cell is within approachSteps * h * |dV/dt| of the level
        while (true) {
          IVector x = toIV(Vec(s));
          double V = (dir > 0 ? x[NS * c].rightBound() : x[NS * c].leftBound()) * ring19::scaleOf(0);
          double dist = dir > 0 ? -40.0 - V : V + 40.0;  // generic level handled below
          dist = dir > 0 ? (levelScaled * ring19::scaleOf(0)) - V : V - (levelScaled * ring19::scaleOf(0));
          if (r.steps > 0) {
            IVector W = toIV(s.getLastEnclosure());
            interval dV = fD(W)[NS * c] * ring19::scaleOf(0);
            double rate = mag(dV);
            if (dist < plan.approachSteps * r.hmax * rate + 1e-9) break;
          }
          step(s, INFINITY, r, false, -1, 0, false);
          if (plan.ckptEvery > 0 && r.steps % plan.ckptEvery == 0) { r.wall = wallBefore + now() - w0; saveCkpt(s, r); }
          if (r.steps % 100 == 0) log << "step " << r.steps << " t " << toI(s.getCurrentTime()).rightBound() << "\n" << std::flush;
          if (r.steps > 50000000) throw std::runtime_error("no approach");
        }
        // Poincare map with every cell on the quotient representation (no perturbation term), then validation.
        Set pre = s;
        double tPre = toI(s.getCurrentTime()).leftBound();
        chooseModes(s, true);
        applyModes();
        typename Tr::Sect sec(dim, NS * c, S(levelScaled));
        typename Tr::PM pm(solver, sec, dir > 0 ? poincare::MinusPlus : poincare::PlusMinus);
        S T;
        if constexpr (Tr::C1) {
          Mat DPhi(dim, dim);
          endX = pm(s, DPhi, T);
          endD = pm.computeDP(endX, DPhi, T);
        } else {
          endX = pm(s, T);
        }
        r.T = toI(T);
        // validation: all trajectories of `pre` over [tPre, T_right] (+ one more step margin is not needed: the crossing
        // happens before T_right for every point)
        double wv = now();
        Set v = pre;
        double tEnd = r.T.rightBound();
        if (!(tEnd > tPre)) throw std::runtime_error("section time not after the approach start");
        while (step(v, tEnd, r, true, c, dir, true)) {}
        r.wallValidation = now() - wv;
        // the Poincare image lies on the section: V_c = level exactly; record the derivative sign at the image
        IVector FX = fD(toIV(endX));
        double dVend = (FX[NS * c] * ring19::scaleOf(0)).leftBound(), dVendR = (FX[NS * c] * ring19::scaleOf(0)).rightBound();
        if (!(dir > 0 ? dVend > 0 : dVendR < 0)) throw std::runtime_error("no transversal crossing at the section image");
      }
      r.ok = true;
    } catch (std::exception& e) {
      r.ok = false; r.error = e.what();
    }
    r.wall = wallBefore + now() - w0;
    return r;
  }
};

}  // namespace apx
