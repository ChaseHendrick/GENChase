// Wrapping pilot for the continuum reentry route (PLAN.md): rigorous CAPD integration of ONE shooting segment of the
// comoving-frame TP06 cable (comoving19.hpp) from a small box, logging per step how the enclosure grows and what it
// costs. Pilot: it measures; it proves nothing about reentry.
//
// Per step (as in proof/engine.hpp): the h/j branch is fixed for the run and certified on CAPD's step enclosure W'
// (W widened by dstar): V > -40 on every step (high) or V < -40 (low). The GHK factor is the quotient where the
// enclosure keeps V != 15 mV and the window polynomial (degree K) otherwise; window steps certify |zeta| < pi on W'
// and inflate the set by the Gronwall bound of engine.hpp (C0: delta = eps0 h e^{L+ h}; C1: e1), with eps0, eps1,
// M2 computed here for the comoving rows W and Ca_ss (comoving19::windowRows).
//
// Usage: wrap_pilot START KAPPA DURATION KIND BRANCH OUTPREFIX [order] [theta_mV] [K] [log_every]
//   START: box file ("# comment", dim, then "lo hi" in C hex per line; dim 20, or 21 with kappa as a state)
//   KAPPA: decimal string (kappa = c^2/D, 1/ms); used as the map parameter when dim = 20
//   KIND: c0 | c1 | mp0;  BRANCH: high | low
// Output: OUTPREFIX.tsv (one row per logged step), OUTPREFIX.json (summary), OUTPREFIX.end (end hull and, for c1,
// the derivative, C hex).
#include <cstdlib>
#include <memory>
#include "../proof/engine.hpp"
#include "comoving19.hpp"

using namespace capd;
using apx::toI; using apx::toIV; using apx::toIM; using apx::up; using apx::mag; using apx::finiteI; using apx::now;

struct CGronwall {
  int dim, K; IMap cmap, amap; interval RTF, alpha;
  CGronwall(int dim_, const std::string& kappa, int K_)
      : dim(dim_), K(K_), cmap(comoving19::field, dim_, dim_, comoving19::numParams(), 2),
        amap(comoving19::windowRows, dim_, 2, comoving19::numParams(), 2) {
    ring19::setParameters<IMap, interval>(cmap, kappa, 1, apx::ghkCoefs<interval>());
    ring19::setParameters<IMap, interval>(amap, kappa, 1, apx::ghkCoefs<interval>());
    RTF = tp06::decimalEnclosure("8314.472") * 310.0 / tp06::decimalEnclosure("96485.3415");
    alpha = 2.0 * comoving19::scaleOf(0) / RTF;
  }
  struct Out { double delta = 0, e1 = 0, l = 0, eps0 = 0, eps1 = 0, M2 = 0, zmax = 0, T0 = 0; };
  Out bound(const IVector& Wp, bool low, double h, double normD0, bool c1) {
    Out o;
    ring19::setMode<IMap, interval>(cmap, 0, low, true);
    IMatrix J(dim, dim);
    IMap::HessianType H(dim, dim);
    cmap(Wp, J, H);
    interval zeta = alpha * Wp[0] - 30.0 / RTF;
    double zm = mag(zeta);
    o.zmax = zm;
    apx::Tails t = apx::tails(zm, K);
    o.T0 = up(t.T0);
    IMatrix DA(2, dim);
    IMap::HessianType HA(2, dim);
    IVector A = amap(Wp, DA, HA);
    double eps0 = 0, eps1 = 0, m2Delta[2] = {0, 0};
    for (int r = 0; r < 2; ++r) {
      interval sD = 0;
      for (int m = 0; m < dim; ++m) sD += interval(mag(DA[r][m]));
      interval aA(mag(A[r]));
      eps0 = std::max(eps0, up(aA * t.T0));
      eps1 = std::max(eps1, up(sD * t.T0 + aA * alpha * t.T1));
      m2Delta[r] = up(interval(apx::Gronwall::hessRowSum(HA, r, dim)) * t.T0 + 2.0 * alpha * sD * t.T1 + aA * sqr(alpha) * t.T2);
    }
    double lt = -1e300, M2 = 0;
    for (int a = 0; a < dim; ++a) {
      interval row = interval(J[a][a].rightBound());
      for (int b = 0; b < dim; ++b) if (b != a) row += interval(mag(J[a][b]));
      lt = std::max(lt, up(row));
      double m2 = apx::Gronwall::hessRowSum(H, a, dim);
      if (a == comoving19::IW) m2 = up(interval(m2) + interval(m2Delta[0]));
      if (a == 16) m2 = up(interval(m2) + interval(m2Delta[1]));
      M2 = std::max(M2, m2);
    }
    interval l = interval(lt) + interval(eps1);
    o.l = up(l); o.eps0 = eps0; o.eps1 = eps1; o.M2 = M2;
    interval Lp(std::max(0.0, up(l))), hI(h), ltp(std::max(0.0, lt));
    interval g = hI * exp(Lp * hI);
    o.delta = up(interval(eps0) * g);
    if (c1) o.e1 = up(g * (interval(M2) * interval(o.delta) + interval(eps1)) * interval(normD0) * exp(ltp * hI));
    return o;
  }
};

static std::string hx(double v) { return apx::hexd(v); }

template <class Tr>
int run(const std::vector<std::string>& a) {
  typedef typename Tr::S S; typedef typename Tr::Vec Vec; typedef typename Tr::Mat Mat; typedef typename Tr::Set Set;
  const std::string startFile = a[0], kappa = a[1], kindName = a[3], branch = a[4], outp = a[5];
  const double duration = std::atof(a[2].c_str());
  const int order = a.size() > 6 ? std::atoi(a[6].c_str()) : 20;
  const double theta = a.size() > 7 ? std::atof(a[7].c_str()) : 1.0;
  const int K = a.size() > 8 ? std::atoi(a[8].c_str()) : 24;
  const int logEvery = a.size() > 9 ? std::atoi(a[9].c_str()) : 1;
  const bool low = branch == "low";
  if (!low && branch != "high") throw std::runtime_error("branch must be high or low");
  if (Tr::MP) MpFloat::setDefaultPrecision(128);
  ring19::ghkDegree() = K;
  std::ifstream in(startFile);
  if (!in) throw std::runtime_error("cannot read " + startFile);
  std::string line; std::getline(in, line);
  int dim; in >> dim;
  if (dim != 20 && dim != 21) throw std::runtime_error("dim must be 20 or 21");
  std::vector<double> lo(dim), hi(dim);
  for (int i = 0; i < dim; ++i) { std::string u, v; in >> u >> v; lo[i] = apx::unhex(u); hi[i] = apx::unhex(v); }
  typename Tr::Map f(comoving19::field, dim, dim, comoving19::numParams());
  ring19::setParameters<typename Tr::Map, S>(f, kappa, 1, apx::ghkCoefs<S>());
  IMap fD(comoving19::field, dim, dim, comoving19::numParams());
  ring19::setParameters<IMap, interval>(fD, kappa, 1, apx::ghkCoefs<interval>());
  CGronwall gw(dim, kappa, K);
  typename Tr::Solver solver(f, order);
  Vec m(dim), r(dim);
  double r0 = 0;
  for (int i = 0; i < dim; ++i) {
    double c = 0.5 * (lo[i] + hi[i]);
    m[i] = S(c);
    r[i] = S(lo[i], hi[i]) - S(c);
    r0 = std::max(r0, toI(r[i]).rightBound());
  }
  Set s(m, r);
  const double dstar = 1e-9;
  std::ofstream tsv(outp + ".tsv");
  tsv << "step\tt\th\tpoly\tV_lo\tV_hi\tc0_max_rad_scaled\tc0_max_rel_diam\tD_norm_inf_mid\tD_max_abs\tD_max_width\tD_rel_width_big\twall_s\n";
  long steps = 0, polySteps = 0, retries = 0;
  double hmin = 1e300, hmax = 0, deltaMax = 0, e1Max = 0, w0 = now();
  std::string error;
  bool ok = true;
  auto logRow = [&](double t, double h, bool poly) {
    IVector x = toIV(Vec(s));
    double maxRad = 0, maxRel = 0;
    for (int i = 0; i < dim; ++i) {
      double rad = 0.5 * (x[i].rightBound() - x[i].leftBound());
      maxRad = std::max(maxRad, rad);
      maxRel = std::max(maxRel, 2.0 * rad / std::max(std::abs(x[i].mid().leftBound()), 1e-3));
    }
    double Dn = 0, Dmax = 0, Dw = 0, Drel = 0;
    if constexpr (Tr::C1) {
      IMatrix D = toIM(Mat(s));
      for (int i = 0; i < dim; ++i) {
        double rs = 0;
        for (int k = 0; k < dim; ++k) {
          rs += std::abs(D[i][k].mid().leftBound());
          Dmax = std::max(Dmax, mag(D[i][k]));
          Dw = std::max(Dw, D[i][k].rightBound() - D[i][k].leftBound());
        }
        Dn = std::max(Dn, rs);
      }
      for (int i = 0; i < dim; ++i)
        for (int k = 0; k < dim; ++k)
          if (mag(D[i][k]) >= 1e-3 * Dmax) Drel = std::max(Drel, (D[i][k].rightBound() - D[i][k].leftBound()) / mag(D[i][k]));
    }
    interval V = x[0] * comoving19::scaleOf(0);
    tsv << steps << "\t" << std::setprecision(10) << t << "\t" << h << "\t" << (poly ? 1 : 0) << "\t" << V.leftBound() << "\t"
        << V.rightBound() << "\t" << maxRad << "\t" << maxRel << "\t" << Dn << "\t" << Dmax << "\t" << Dw << "\t" << Drel << "\t"
        << now() - w0 << "\n";
  };
  logRow(0.0, 0.0, false);
  try {
    while (true) {
      double tl = toI(s.getCurrentTime()).leftBound();
      double maxStep = duration - tl;
      if (!(maxStep > 1e-13)) break;
      IVector xh = toIV(Vec(s));
      interval Vh = xh[0] * comoving19::scaleOf(0);
      bool poly = !(Vh.leftBound() > 15.0 + theta || Vh.rightBound() < 15.0 - theta);
      bool done = false;
      for (int attempt = 0; attempt < 40 && !done; ++attempt) {
        ring19::setMode<typename Tr::Map, S>(f, 0, low, poly);
        ring19::setMode<IMap, interval>(fD, 0, low, poly);
        Set backup = s;
        double normD0 = 0;
        if constexpr (Tr::C1) normD0 = apx::Engine<apx::TrC1>::normInf(toIM(Mat(s)));
        try {
          solver.setMaxStep(S(std::min(maxStep, 1.0)));
          solver(s);
        } catch (std::exception& e) {
          s = backup; solver.clearCoefficients(); maxStep /= 1.5; ++retries;
          if (maxStep < 1e-9) throw std::runtime_error(std::string("step failed: ") + e.what());
          continue;
        }
        double h = toI(solver.getStep()).rightBound();
        IVector W = toIV(s.getLastEnclosure());
        for (int i = 0; i < dim; ++i) {
          W[i] += interval(-dstar, dstar);
          if (!finiteI(W[i])) throw std::runtime_error("non-finite enclosure");
        }
        interval V = W[0] * comoving19::scaleOf(0);
        if (low ? !(V.rightBound() < -40.0) : !(V.leftBound() > -40.0)) {
          std::ostringstream o; o << "branch " << branch << " not certified: V in [" << V.leftBound() << ", " << V.rightBound() << "]";
          throw std::runtime_error(o.str());
        }
        if (poly) {
          interval zeta = gw.alpha * W[0] - 30.0 / gw.RTF;
          if (!(up(interval(mag(zeta)) / (2.0 * interval::pi())) < 0.5)) throw std::runtime_error("window left |zeta| < pi");
          CGronwall::Out g = gw.bound(W, low, h, normD0, Tr::C1);
          if (!(g.delta <= dstar)) throw std::runtime_error("Gronwall delta exceeds dstar");
          Vec e(dim);
          for (int i = 0; i < dim; ++i) e[i] = S(-g.delta, g.delta);
          s.inflateC0(e);
          if constexpr (Tr::C1) { Mat E(dim, dim); for (int i = 0; i < dim; ++i) for (int k = 0; k < dim; ++k) E[i][k] = S(-g.e1, g.e1); s.inflateC1(E); }
          deltaMax = std::max(deltaMax, g.delta); e1Max = std::max(e1Max, g.e1);
          ++polySteps;
        } else if (!(V.leftBound() > 15.0 || V.rightBound() < 15.0)) {
          s = backup; poly = true; ++retries;  // quotient enclosure meets V = 15: redo the step with the window
          continue;
        }
        ++steps;
        hmin = std::min(hmin, h); hmax = std::max(hmax, h);
        if (steps % logEvery == 0) logRow(toI(s.getCurrentTime()).rightBound(), h, poly);
        done = true;
      }
      if (!done) throw std::runtime_error("too many retries");
    }
  } catch (std::exception& e) {
    ok = false; error = e.what();
  }
  double wall = now() - w0;
  logRow(toI(s.getCurrentTime()).rightBound(), 0.0, false);
  {
    std::ofstream eo(outp + ".end");
    IVector x = toIV(Vec(s));
    eo << Tr::name() << " " << (ok ? 1 : 0) << "\n" << hx(toI(s.getCurrentTime()).leftBound()) << " " << hx(toI(s.getCurrentTime()).rightBound())
       << "\n" << dim << "\n";
    for (int i = 0; i < dim; ++i) eo << hx(x[i].leftBound()) << " " << hx(x[i].rightBound()) << "\n";
    if constexpr (Tr::C1) {
      IMatrix D = toIM(Mat(s));
      eo << dim << " " << dim << "\n";
      for (int i = 0; i < dim; ++i) for (int k = 0; k < dim; ++k) eo << hx(D[i][k].leftBound()) << " " << hx(D[i][k].rightBound()) << "\n";
    }
  }
  std::ofstream js(outp + ".json");
  js << std::setprecision(10) << "{\n  \"status\": \"wrapping pilot; measurement only, no theorem\",\n  \"kind\": \"" << Tr::name()
     << "\", \"dim\": " << dim << ", \"kappa\": \"" << kappa << "\", \"branch\": \"" << branch << "\", \"order\": " << order
     << ", \"theta_mV\": " << theta << ", \"window_degree\": " << K << ",\n  \"ok\": " << (ok ? "true" : "false") << ", \"error\": \"" << error
     << "\",\n  \"duration_requested_ms\": " << duration << ", \"t_reached\": " << toI(s.getCurrentTime()).rightBound()
     << ", \"steps\": " << steps << ", \"window_steps\": " << polySteps << ", \"retries\": " << retries << ", \"h_min\": " << hmin
     << ", \"h_max\": " << hmax << ", \"gronwall_delta_max\": " << deltaMax << ", \"gronwall_e1_max\": " << e1Max
     << ", \"start_max_radius_scaled\": " << r0 << ",\n  \"wall_s\": " << wall << ", \"wall_per_step_s\": " << wall / std::max(1L, steps) << "\n}\n";
  std::cout << Tr::name() << (ok ? " ok" : " FAILED: " + error) << " steps " << steps << " t " << toI(s.getCurrentTime()).rightBound()
            << " wall " << wall << "\n";
  return ok ? 0 : 1;
}

int main(int argc, char** argv) {
  if (argc < 7) {
    std::cerr << "usage: wrap_pilot START KAPPA DURATION KIND BRANCH OUTPREFIX [order] [theta_mV] [K] [log_every]\n";
    return 2;
  }
  std::vector<std::string> a(argv + 1, argv + argc);
  try {
    if (a[3] == "c1") return run<apx::TrC1>(a);
    if (a[3] == "c0") return run<apx::TrC0>(a);
    if (a[3] == "mp0") return run<apx::TrMP0>(a);
    std::cerr << "unknown kind\n";
    return 2;
  } catch (std::exception& e) {
    std::cerr << "error: " << e.what() << "\n";
    return 2;
  }
}
