// Stage-1 cost pilot (ap-reentry/SCOPING.md section 8): a rigorous CAPD C1 integration of the 304-dimensional ring
// (N = 16 baseline 19-state TP06 cells, author convention, c = 0.035 per ms) along the numerically converged
// rotating wave, over a window [t0, t0 + T] chosen by pilot/window.py (no cell crosses -40 mV, no cell within
// 0.5 mV of 15 mV, so the field of tp06_19d_capd.hpp with fixed per-cell h/j branches is the model's field there).
//
// Initial set: the orbit state at t0 (Radau rtol 1e-12, floating point) with a box of relative radius 1e-10 in
// every coordinate, as a C1 set (identity derivative). Integration: ITimeMap with CAPD's default step control
// (ILastTermsStepControl, tolerances recorded), one step at a time, timing each step.
// Reports steps, step sizes, wall time per step, the enclosure widths at the end and whether the floating-point
// reference end state lies in the enclosure. Measurements only: nothing here is a certificate.
//
// Usage: timing19 window_start.txt rect|ho ORDER T_MS MAX_WALL_S out.json [steps.tsv]
//   rect = C1Rect2Set, ho = C1HORect2Set (Hermite-Obreshkov). If the wall time exceeds MAX_WALL_S the run stops
//   after the current step and reports the fraction of [t0, t0 + T] covered.
#include <algorithm>
#include <chrono>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <vector>
#include "tp06_19d_capd.hpp"
using namespace capd;

constexpr int N = 16, NS = tp06r::NS, DIM = NS * N;

static double now() {
  return std::chrono::duration<double>(std::chrono::steady_clock::now().time_since_epoch()).count();
}

struct Widths {
  double c0RelMax = 0, c0RelMaxV = 0;  // max diam/|mid| over all coordinates, and over the V coordinates
  double dWidthMax = 0, dAbsMax = 0, dRelBig = 0;  // derivative: max entry width, max |entry|, max width/|mid| over entries with |mid| >= 1e-3 max
  double dRowSumMax = 0;  // max row sum of |mid| (infinity norm of the midpoint matrix)
};

static Widths measure(const IVector& x, const IMatrix& D) {
  Widths w;
  for (int i = 0; i < DIM; ++i) {
    double r = diam(x[i]).rightBound() / std::max(1e-300, std::abs(x[i].mid().leftBound()));
    w.c0RelMax = std::max(w.c0RelMax, r);
    if (i % NS == 0) w.c0RelMaxV = std::max(w.c0RelMaxV, r);
  }
  for (int i = 0; i < DIM; ++i) {
    double rs = 0;
    for (int k = 0; k < DIM; ++k) {
      w.dWidthMax = std::max(w.dWidthMax, diam(D[i][k]).rightBound());
      w.dAbsMax = std::max(w.dAbsMax, abs(D[i][k]).rightBound());
      rs += std::abs(D[i][k].mid().leftBound());
    }
    w.dRowSumMax = std::max(w.dRowSumMax, rs);
  }
  for (int i = 0; i < DIM; ++i)
    for (int k = 0; k < DIM; ++k) {
      double m = std::abs(D[i][k].mid().leftBound());
      if (m >= 1e-3 * w.dAbsMax) w.dRelBig = std::max(w.dRelBig, diam(D[i][k]).rightBound() / m);
    }
  return w;
}

template <class SetT>
int runSet(SetT& s, IOdeSolver& solver, double T, double maxWall, const char* setName, int order, double t0,
           const std::vector<double>& xref, double tBuild, std::ostream& out, std::ostream* steps) {
  ITimeMap tm(solver);
  tm.stopAfterStep(true);
  std::vector<double> hs, walls;
  double wall0 = now(), prevT = 0.0;
  bool partial = false;
  std::string error;
  try {
    do {
      double a = now();
      tm(interval(T), s);
      double b = now();
      double tc = s.getCurrentTime().rightBound();
      hs.push_back(tc - prevT);
      walls.push_back(b - a);
      prevT = tc;
      if (steps) {
        IVector xx = IVector(s);
        double rel = 0;
        for (int i = 0; i < DIM; ++i) rel = std::max(rel, diam(xx[i]).rightBound() / std::max(1e-300, std::abs(xx[i].mid().leftBound())));
        *steps << hs.size() << "\t" << std::setprecision(10) << tc << "\t" << hs.back() << "\t" << walls.back() << "\t" << rel << std::endl;
      }
      if (b - wall0 > maxWall && !tm.completed()) { partial = true; break; }
    } while (!tm.completed());
  } catch (std::exception& e) {
    error = e.what();
  }
  double total = now() - wall0;
  IVector x = IVector(s);
  IMatrix D = IMatrix(s);
  Widths w = measure(x, D);
  // the floating-point reference end state (only meaningful when the run reached T)
  double refOutside = 0, refMidRel = 0;
  bool refInside = true;
  if (!partial && error.empty()) {
    for (int i = 0; i < DIM; ++i) {
      double r = xref[i];
      double lo = x[i].leftBound(), hi = x[i].rightBound();
      double out_ = r < lo ? lo - r : (r > hi ? r - hi : 0.0);
      double sc = std::max(1e-300, std::abs(r));
      if (out_ > 0) refInside = false;
      refOutside = std::max(refOutside, out_ / sc);
      refMidRel = std::max(refMidRel, std::abs(x[i].mid().leftBound() - r) / sc);
    }
  }
  int n = int(hs.size());
  double hsum = 0, hmin = 1e300, hmax = 0, wsum = 0, wmin = 1e300, wmax = 0, wrest = 0;
  for (int k = 0; k < n; ++k) {
    hsum += hs[k]; hmin = std::min(hmin, hs[k]); hmax = std::max(hmax, hs[k]);
    wsum += walls[k]; wmin = std::min(wmin, walls[k]); wmax = std::max(wmax, walls[k]);
    if (k > 0) wrest += walls[k];
  }
  std::vector<double> ws = walls;
  std::sort(ws.begin(), ws.end());
  double wmed = n ? ws[n / 2] : 0;
  // The last step is shortened to land on T; the mean step over the steps before it is the representative size.
  double hFull = n > 1 ? (hsum - hs.back()) / (n - 1) : hsum;
  out << std::setprecision(10) << "{\n"
      << "  \"set\": \"" << setName << "\", \"order\": " << order << ", \"dimension\": " << DIM << ",\n"
      << "  \"window_t0_ms\": " << t0 << ", \"requested_T_ms\": " << T << ", \"reached_T_ms\": " << prevT
      << ", \"fraction_of_T\": " << prevT / T << ",\n"
      << "  \"partial_by_wall_cap\": " << (partial ? "true" : "false") << ", \"max_wall_s\": " << maxWall
      << ", \"error\": \"" << error << "\",\n"
      << "  \"step_control\": {\"absolute_tolerance\": " << solver.getAbsoluteTolerance()
      << ", \"relative_tolerance\": " << solver.getRelativeTolerance() << "},\n"
      << "  \"initial_box_relative_radius\": 1e-10,\n"
      << "  \"map_build_and_setup_s\": " << tBuild << ",\n"
      << "  \"steps\": " << n << ", \"mean_step_ms\": " << (n ? hsum / n : 0) << ", \"mean_step_excluding_last_ms\": " << hFull
      << ", \"min_step_ms\": " << hmin << ", \"max_step_ms\": " << hmax << ",\n"
      << "  \"wall_total_steps_s\": " << total << ", \"wall_per_step_mean_s\": " << (n ? wsum / n : 0)
      << ", \"wall_per_step_median_s\": " << wmed << ", \"wall_first_step_s\": " << (n ? walls[0] : 0)
      << ", \"wall_per_step_mean_excluding_first_s\": " << (n > 1 ? wrest / (n - 1) : 0)
      << ", \"wall_per_step_min_s\": " << wmin << ", \"wall_per_step_max_s\": " << wmax << ",\n"
      << "  \"end_c0_max_relative_diameter\": " << w.c0RelMax << ", \"end_c0_max_relative_diameter_V\": " << w.c0RelMaxV << ",\n"
      << "  \"end_derivative_max_entry_width_scaled\": " << w.dWidthMax << ", \"end_derivative_max_abs_entry_scaled\": " << w.dAbsMax
      << ", \"end_derivative_max_relative_width_entries_ge_1e-3_max\": " << w.dRelBig
      << ", \"end_derivative_inf_norm_of_midpoint_scaled\": " << w.dRowSumMax << ",\n"
      << "  \"reference_end_state_inside_enclosure\": " << (partial || !error.empty() ? "null" : (refInside ? "true" : "false"))
      << ", \"reference_max_relative_distance_outside\": " << refOutside
      << ", \"reference_max_relative_distance_to_midpoint\": " << refMidRel << "\n}\n";
  return error.empty() ? 0 : 1;
}

int main(int argc, char** argv) {
  if (argc < 7) { std::cerr << "usage: timing19 window_start.txt rect|ho ORDER T_MS MAX_WALL_S out.json [steps.tsv]\n"; return 2; }
  double tb0 = now();
  std::ifstream in(argv[1]);
  int n; std::string c; double t0;
  in >> n >> c >> t0;
  if (n != N || c != "0.035") throw std::runtime_error("window file is not N = 16, c = 0.035");
  auto& mask = tp06r::branchLow();
  mask.assign(N, 0);
  for (int k = 0; k < N; ++k) in >> mask[k];
  std::vector<double> xs(DIM), xe(DIM);
  for (int i = 0; i < DIM; ++i) in >> xs[i];
  for (int i = 0; i < DIM; ++i) in >> xe[i];
  if (!in) throw std::runtime_error("short window file");
  // state-major (state a of cell k at a*N + k) -> cell-major scaled (19k + a); power-of-two scaling is exact
  IVector xc(DIM), r0(DIM);
  std::vector<double> xref(DIM);
  for (int k = 0; k < N; ++k)
    for (int a = 0; a < NS; ++a) {
      double sc = tp06r::scaleOf(a);
      double z = xs[a * N + k] / sc;
      xc[NS * k + a] = z;
      double rad = 1e-10 * std::abs(z);
      r0[NS * k + a] = interval(-rad, rad);
      xref[NS * k + a] = xe[a * N + k] / sc;
    }
  const std::string set = argv[2];
  const int order = std::atoi(argv[3]);
  const double T = std::atof(argv[4]), maxWall = std::atof(argv[5]);
  IMap f(tp06r::ringField<N>, DIM, DIM, tp06r::P_MAX);
  tp06r::setParameters<IMap, interval>(f, "0.035");
  IOdeSolver solver(f, order);
  std::ofstream out(argv[6]);
  std::ofstream stepsFile;
  std::ostream* steps = nullptr;
  if (argc > 7) { stepsFile.open(argv[7]); steps = &stepsFile; }
  double tBuild = now() - tb0;
  if (set == "rect") {
    C1Rect2Set s(xc, r0);
    return runSet(s, solver, T, maxWall, "C1Rect2Set", order, t0, xref, tBuild, out, steps);
  } else if (set == "ho") {
    C1HORect2Set s(xc, r0);
    return runSet(s, solver, T, maxWall, "C1HORect2Set", order, t0, xref, tBuild, out, steps);
  }
  std::cerr << "set must be rect or ho\n";
  return 2;
}
