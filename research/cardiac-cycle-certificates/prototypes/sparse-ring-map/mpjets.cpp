#include <chrono>
#include <cstdio>
#include <fstream>
#include "setup.hpp"
#include "capd/mpcapdlib.h"
using namespace capd;
namespace tp06 { template <> capd::MpInterval decimalAs<capd::MpInterval>(const std::string& s) { return decimalEnclosureT<capd::MpInterval>(s); } }
using clk = std::chrono::steady_clock;
template <int N> int run(const char* file, int p, int bits) {
  const int n = 18 * N;
  MpFloat::setDefaultPrecision(bits);
  std::ifstream in(file); int NN; double T, r; in >> NN >> T >> r;
  MpIVector x(n); for (int i = 0; i < n; ++i) { double v; in >> v; x[i] = MpInterval(v); }
  auto t0 = clk::now();
  MpIMap f(tp06::ringField<N>, n, n, tp06::P_MAX, 0);
  tp06::Physical ph; tp06::setParameters(f, ph, MpInterval(double(N * N)) / MpInterval(64000.0));
  f.setOrder(p + 1);
  double tb = std::chrono::duration<double>(clk::now() - t0).count();
  std::vector<MpIVector> c(p + 2, MpIVector(n)); c[0] = x;
  t0 = clk::now();
  f.computeODECoefficients(c.data(), p + 1);
  double tc = std::chrono::duration<double>(clk::now() - t0).count();
  double w = 0; for (int i = 0; i < n; ++i) w = std::max(w, toDouble(c[p + 1][i].rightBound() - c[p + 1][i].leftBound(), capd::multiPrec::MpReal::RoundUp));
  std::printf("N=%d p=%d bits=%d: sizeof(MpInterval)=%zu, build %.2fs, MP C0 jets to order %d: %.2fs, max width of top coefficient %.2e\n", N, p, bits, sizeof(MpInterval), tb, p + 1, tc, w);
  return 0;
}
int main(int argc, char** argv) {
  int N = std::atoi(argv[1]); int p = std::atoi(argv[3]); int bits = std::atoi(argv[4]);
  if (N == 8) return run<8>(argv[2], p, bits);
  if (N == 64) return run<64>(argv[2], p, bits);
  return 2;
}
