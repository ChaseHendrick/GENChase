// Scratch measurement (not part of any proof): wrapping growth of a plain-box interval Taylor method (no Lohner
// matrices, degree-0 map) for one TP06 cell along the orbit. Width growth G(t) = max_i width(X_i(t)) / width(X_i(0)).
// If G over the ring section time (0.84 ms at N = 64, 1.67 ms at N = 32) is moderate, a C0-only MPFR centre run is
// feasible without dense matrices.
#include <cstdio>
#include <fstream>
#include <vector>
#include "/home/user/GENChase/research/cardiac-cycle-certificates/model/setup.hpp"
#include "capd/dynsys/FirstOrderEnclosure.h"
using namespace capd;

int main(int argc, char** argv) {
  const double h = std::atof(argv[1]), Tend = std::atof(argv[2]), w = std::atof(argv[3]);
  const int p = std::atoi(argv[4]);
  std::ifstream in("/tmp/claude-0/-home-user-GENChase/8e652c2a-6f64-5009-9ee8-187ba6394e5c/scratchpad/cell_orbit.txt");
  int N; double T, res; in >> N >> T >> res;
  IVector x(18);
  for (int i = 0; i < 18; ++i) { double v; in >> v; x[i] = interval(v) + interval(-w, w); }
  IMap f(tp06::ringField<1>, 18, 18, tp06::P_MAX, 0);  // degree 0: C0 jets only
  tp06::Physical ph;
  tp06::setParameters(f, ph, interval(0.0));
  IOdeSolver solver(f, p);  // used only for its C0 enclosure (HighOrderEnclosure on vectors)
  solver.setStep(interval(h));
  std::vector<IVector> c(p + 2, IVector(18)), r(p + 3, IVector(18));
  double t = 0;
  while (t < Tend - 1e-12) {
    f.setCurrentTime(interval(t));
    c[0] = x;
    f.computeODECoefficients(c.data(), p);
    IVector enc = capd::dynsys::FirstOrderEnclosure::enclosure(f, interval(t), x, interval(h));
    r[0] = enc;
    f.computeODECoefficients(r.data(), p + 1);
    interval H(h);
    IVector y = c[p];
    for (int k = p - 1; k >= 0; --k) y = y * H + c[k];
    y += r[p + 1] * power(interval(0.0, h), p + 1);  // Lagrange remainder over [0,h]
    x = y;
    t += h;
    double g = 0;
    for (int i = 0; i < 18; ++i) g = std::max(g, (x[i].rightBound() - x[i].leftBound()) / (2 * w));
    std::printf("t=%.4f  max width growth %.3e\n", t, g);
  }
}
