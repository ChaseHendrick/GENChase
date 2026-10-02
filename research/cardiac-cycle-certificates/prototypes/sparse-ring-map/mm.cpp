#include <chrono>
#include <cstdio>
#include <cfenv>
#include "capd/capdlib.h"
using namespace capd;
using clk = std::chrono::steady_clock;
int main(int argc, char** argv) {
  int n = std::atoi(argv[1]);
  IMatrix A(n, n), B(n, n);
  for (int i = 1; i <= n; ++i) for (int j = 1; j <= n; ++j) {
    double a = std::sin(1.0 * i * j + 0.3), b = std::cos(0.7 * i - 1.3 * j);
    A(i, j) = interval(a, a + 1e-12); B(i, j) = interval(b - 1e-13, b);
  }
  auto t0 = clk::now();
  IMatrix C = A * B;
  double ts = std::chrono::duration<double>(clk::now() - t0).count();
  std::printf("n=%d CAPD IMatrix product %.3fs  (%.2f ns per interval mul-add)\n", n, ts, 1e9 * ts / (double(n) * n * n));
  // OpenMP row-parallel product with plain interval ops; compare bitwise to the serial CAPD product
  IMatrix D(n, n);
  t0 = clk::now();
  #pragma omp parallel for schedule(static)
  for (int i = 1; i <= n; ++i) {
    std::fesetround(FE_TONEAREST);  // deliberately perturb the thread's mode; native_directed must set its own
    for (int j = 1; j <= n; ++j) { interval s = 0.0; for (int k = 1; k <= n; ++k) s += A(i, k) * B(k, j); D(i, j) = s; }
  }
  double tp = std::chrono::duration<double>(clk::now() - t0).count();
  long diff = 0, notcontain = 0;
  for (int i = 1; i <= n; ++i) for (int j = 1; j <= n; ++j) {
    if (C(i, j).leftBound() != D(i, j).leftBound() || C(i, j).rightBound() != D(i, j).rightBound()) ++diff;
  }
  std::printf("OpenMP product %.3fs; entries differing bitwise from serial CAPD product: %ld of %ld\n", tp, diff, long(n) * n);
}
