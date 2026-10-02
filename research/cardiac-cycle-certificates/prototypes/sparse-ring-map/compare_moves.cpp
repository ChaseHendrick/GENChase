// Prototype test: CAPD C1Rect2Set steps with the stock IMap (dense C1 DAG) against the same steps with SparseRingMap.
// Modes: "cmp N file moves" compares; "time N file moves" runs SparseRingMap only; "enc N file" one encloseC1Map only.
#include <chrono>
#include <cstdio>
#include <fstream>
#include "capd/capdlib.h"
#include "capd/dynsys/OdeSolver.hpp"
#include "capd/dynset/C1DoubletonSet.hpp"
#include "sparse_ring_map.hpp"
using namespace capd;
using clk = std::chrono::steady_clock;
static double since(clk::time_point a) { return std::chrono::duration<double>(clk::now() - a).count(); }

template <int N>
int run(const std::string& mode, const char* file, int moves, double rad) {
  const int n = 18 * N, p = 20;
  std::ifstream in(file); int NN; double T, r; in >> NN >> T >> r;
  IVector x(n);
  for (int i = 0; i < n; ++i) { double v; in >> v; x[i] = interval(v) + interval(-rad, rad); }
  interval c = interval(double(N * N)) / interval(64000.0);
  tp06::Physical ph;
  typedef capd::dynsys::OdeSolver<SparseRingMap<N>> SSolver;
  SparseRingMap<N> fs(ph, c);
  SSolver ss(fs, p);
  ss.setMaxStep(0.125);
  if (mode == "enc") {
    IVector xc = midVector(x), phi(n), rem(n), enc(n);
    IMatrix jp(n, n), jr(n, n), je(n, n);
    auto t0 = clk::now();
    ss.encloseC1Map(interval(0.0), xc, x, phi, rem, enc, jp, jr, je);
    double wr = 0, wj = 0;
    for (int i = 0; i < n; ++i) { wr = std::max(wr, rem[i].rightBound() - rem[i].leftBound()); for (int k = 0; k < n; ++k) wj = std::max(wj, jr(i + 1, k + 1).rightBound() - jr(i + 1, k + 1).leftBound()); }
    std::printf("N=%d encloseC1Map %.1fs, step %g, max width C0 remainder %.2e, C1 remainder %.2e\n", N, since(t0), ss.getStep().rightBound(), wr, wj);
    return 0;
  }
  C1Rect2Set setS(x);
  std::vector<double> stepsS;
  auto t0 = clk::now();
  for (int m = 0; m < moves; ++m) { setS.move(ss); stepsS.push_back(ss.getStep().rightBound()); }
  double tS = since(t0);
  std::printf("N=%d SparseRingMap: %d moves %.2fs (%.2fs/move), steps:", N, moves, tS, tS / moves);
  for (double h : stepsS) std::printf(" %g", h);
  std::printf("\n");
  if (mode != "cmp") return 0;
  IMap fa(tp06::ringField<N>, n, n, tp06::P_MAX);
  tp06::setParameters(fa, ph, c);
  IOdeSolver sa(fa, p);
  sa.setMaxStep(0.125);
  C1Rect2Set setA(x);
  std::vector<double> stepsA;
  t0 = clk::now();
  for (int m = 0; m < moves; ++m) { setA.move(sa); stepsA.push_back(sa.getStep().rightBound()); }
  double tA = since(t0);
  std::printf("N=%d stock IMap:     %d moves %.2fs (%.2fs/move), steps:", N, moves, tA, tA / moves);
  for (double h : stepsA) std::printf(" %g", h);
  std::printf("\n");
  IVector ya = IVector(setA), ys = IVector(setS);
  IMatrix Ma = IMatrix(setA), Ms = IMatrix(setS);
  int dis = 0; double wA = 0, wS = 0, maxRatio = 0, maxMidDiffOverWidth = 0;
  for (int i = 0; i < n; ++i) {
    if (ya[i].rightBound() < ys[i].leftBound() || ys[i].rightBound() < ya[i].leftBound()) ++dis;
    for (int k = 0; k < n; ++k) {
      interval a = Ma(i + 1, k + 1), b = Ms(i + 1, k + 1);
      if (a.rightBound() < b.leftBound() || b.rightBound() < a.leftBound()) ++dis;
      double wa = a.rightBound() - a.leftBound(), wb = b.rightBound() - b.leftBound();
      wA += wa; wS += wb; if (wa > 0) maxRatio = std::max(maxRatio, wb / wa);
      if (wa > 0) maxMidDiffOverWidth = std::max(maxMidDiffOverWidth, std::abs(a.mid().leftBound() - b.mid().leftBound()) / wa);
    }
  }
  double wxa = 0, wxs = 0; for (int i = 0; i < n; ++i) { wxa += ya[i].rightBound() - ya[i].leftBound(); wxs += ys[i].rightBound() - ys[i].leftBound(); }
  std::printf("after %d moves: disjoint entries %d; C0 total width sparse/stock %.6f; DPhi total width sparse/stock %.6f, max entry ratio %.4f, max |mid diff|/width %.3e\n",
              moves, dis, wxs / wxa, wS / wA, maxRatio, maxMidDiffOverWidth);
  return 0;
}

int main(int argc, char** argv) {
  std::string mode = argv[1]; int N = std::atoi(argv[2]); int moves = argc > 4 ? std::atoi(argv[4]) : 1;
  double rad = argc > 5 ? std::atof(argv[5]) : 1e-9;
  switch (N) {
    case 8: return run<8>(mode, argv[3], moves, rad);
    case 16: return run<16>(mode, argv[3], moves, rad);
    case 32: return run<32>(mode, argv[3], moves, rad);
    case 64: return run<64>(mode, argv[3], moves, rad);
  }
  return 2;
}
