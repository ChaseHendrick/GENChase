// Cost of one CAPD C1Rect2Set step (dense Lohner linear algebra) with a nearly free linear vector field of dimension n.
#include <chrono>
#include <cstdio>
#include "capd/capdlib.h"
using namespace capd;
using clk = std::chrono::steady_clock;
static int gN;
void lin(autodiff::Node, autodiff::Node in[], int, autodiff::Node out[], int, autodiff::Node[], int) {
  autodiff::Node s = in[0];
  for (int i = 1; i < gN; ++i) s = s + in[i];
  for (int i = 0; i < gN; ++i) out[i] = -in[i] + 0.1 * in[(i + 1) % gN] + 1e-3 * s;
}
int main(int argc, char** argv) {
  gN = std::atoi(argv[1]); int p = std::atoi(argv[2]);
  IMap f(lin, gN, gN, 0);
  IOdeSolver solver(f, p);
  solver.setMaxStep(0.125);
  IVector x(gN); for (int i = 0; i < gN; ++i) x[i] = interval(1.0 + 1e-3 * i) + interval(-1e-9, 1e-9);
  // time the vector field coefficients alone
  auto t0 = clk::now();
  { std::vector<IVector> c(p + 2, IVector(gN)); IMatrix* M = IMatrix::makeArray(p + 2, gN, gN); c[0] = x; M[0].setToIdentity(); f.computeODECoefficients(c.data(), M, p + 1); delete[] M; }
  double tc = std::chrono::duration<double>(clk::now() - t0).count();
  C1Rect2Set s(x);
  t0 = clk::now();
  s.move(solver);
  double t1 = std::chrono::duration<double>(clk::now() - t0).count();
  t0 = clk::now();
  s.move(solver);
  double t2 = std::chrono::duration<double>(clk::now() - t0).count(); std::printf("step used %g\n", solver.getStep().rightBound());
  double n3 = double(gN) * gN * gN;
  std::printf("n=%d p=%d: one coefficient call (order p+1) %.2fs; C1Rect2Set move #1 %.2fs, #2 %.2fs; move#2 minus 3 coefficient calls = %.1f n^3-units at %.1f ns\n",
              gN, p, tc, t1, t2, (t2 - 3 * tc) / (n3 * 10.5e-9), 10.5);
}
