// Ordinary (non-rigorous) Newton solve for the candidate orbit, in double precision. Its output only proposes a
// centre and a coordinate frame; nothing here is part of a proof (verify.cpp checks everything rigorously).
//
// N = 1: fixed point of the first-return map P to {V = c}, crossing upward.
// N > 1: rotating wave. Start on {V_0 = c}; P maps to {V_{N-1} = c} (upward); the reduced map is
//        g(x)_j = P(x)_{j-1} (indices mod N), and a fixed point of g is a solution with x(tau) = sigma x(0),
//        (sigma x)_j = x_{j+1}, i.e. x_j(t) = phi(t + j tau) with period N tau.
//
// All states are read in physical units and written in the scaled variables z (model/tp06_capd.hpp).
// Usage: orbit_newton N gKs coupling_num coupling_den in.txt out.txt
//   in.txt: for N = 1, 18 numbers (a point near the orbit with V = c); for N > 1, "T" then 18 numbers of a single-cell
//   section point (the ring guess is x_j = phi(j T/N) from the single cell).
#include <fstream>
#include <iomanip>
#include <iostream>
#include "../model/setup.hpp"
using namespace capd;

// Section level V = s, s = the double nearest 0.2; in the scaled variable z_V = V / sigma_V this is exactly s/sigma_V.
const double LEVEL = 0.2 / tp06::scaleOf(0);

template <int N>
int run(int argc, char** argv) {
  const int dim = 18 * N, END = 18 * (N - 1);
  DMap f(tp06::ringField<N>, dim, dim, tp06::P_MAX);
  tp06::Physical p;
  p.gKs = argv[2];
  double c = std::stod(argv[3]) / std::stod(argv[4]);
  tp06::setParameters(f, p, c);
  DOdeSolver solver(f, 20);
  solver.setAbsoluteTolerance(1e-18);
  solver.setRelativeTolerance(1e-16);
  DCoordinateSection section(dim, END, LEVEL);
  DPoincareMap pm(solver, section, poincare::MinusPlus);

  std::ifstream in(argv[5]);
  DVector x(dim);
  if (N == 1) {
    for (int i = 0; i < 18; ++i) { in >> x[i]; x[i] /= tp06::scaleOf(i); }
  } else {
    double T; in >> T;
    DVector y(18);
    for (int i = 0; i < 18; ++i) { in >> y[i]; y[i] /= tp06::scaleOf(i); }
    DMap f1(tp06::ringField<1>, 18, 18, tp06::P_MAX);
    tp06::setParameters(f1, p, 0.0);
    DOdeSolver s1(f1, 20);
    s1.setAbsoluteTolerance(1e-18); s1.setRelativeTolerance(1e-16);
    DTimeMap tm(s1);
    for (int j = 0; j < N; ++j) {
      DVector z = y;
      double t = j * T / N;
      if (t > 0) z = tm(t, z);
      for (int i = 0; i < 18; ++i) x[18 * j + i] = z[i];
    }
  }
  x[0] = LEVEL;

  auto shiftBack = [&](const DVector& v) { DVector w(dim); for (int j = 0; j < N; ++j) for (int i = 0; i < 18; ++i) w[18 * j + i] = v[18 * ((j + N - 1) % N) + i]; return w; };
  auto shiftBackRows = [&](const DMatrix& M) { DMatrix W(dim, dim); for (int j = 0; j < N; ++j) for (int i = 0; i < 18; ++i) for (int k = 0; k < dim; ++k) W[18 * j + i][k] = M[18 * ((j + N - 1) % N) + i][k]; return W; };

  double T = 0;
  DMatrix DG(dim, dim);
  double res = 1;
  for (int it = 0; it < 30; ++it) {
    DMatrix DPhi(dim, dim);
    T = 0;
    DVector Px = pm(x, DPhi, T);
    DMatrix DP = pm.computeDP(Px, DPhi, T);
    DVector g = N == 1 ? Px : shiftBack(Px);
    DG = N == 1 ? DP : shiftBackRows(DP);
    // free coordinates: all but index 0 (V_0 fixed on the start section)
    DMatrix A(dim - 1, dim - 1);
    DVector b(dim - 1);
    for (int r = 1; r < dim; ++r) {
      b[r - 1] = g[r] - x[r];
      for (int k = 1; k < dim; ++k) A[r - 1][k - 1] = DG[r][k] - (r == k ? 1.0 : 0.0);
    }
    DVector dx = capd::matrixAlgorithms::gauss(A, b);
    res = 0;
    for (int r = 0; r < dim - 1; ++r) { res = std::max(res, std::abs(b[r]) / std::max(1e-12, std::abs(x[r + 1]))); x[r + 1] -= dx[r]; }
    std::cerr << "iteration " << it << " relative residual " << res << " return time " << T << "\n";
    if (res < 1e-14) break;
  }
  // final derivative at the solution
  DMatrix DPhi(dim, dim);
  T = 0;
  DVector Px = pm(x, DPhi, T);
  DMatrix DP = pm.computeDP(Px, DPhi, T);
  DG = N == 1 ? DP : shiftBackRows(DP);
  std::ofstream out(argv[6]);
  out << std::setprecision(17);
  out << N << " " << T << " " << res << "\n";
  for (int i = 0; i < dim; ++i) out << x[i] << (i + 1 < dim ? " " : "\n");
  for (int i = 0; i < dim; ++i) for (int k = 0; k < dim; ++k) out << DG[i][k] << (k + 1 < dim ? " " : "\n");
  DVector fx = f(x);
  for (int i = 0; i < dim; ++i) out << fx[i] << (i + 1 < dim ? " " : "\n");
  return 0;
}

int main(int argc, char** argv) {
  if (argc != 7) { std::cerr << "usage: orbit_newton N gKs coupling_num coupling_den in out\n"; return 2; }
  int N = std::stoi(argv[1]);
  try {
    switch (N) {
      case 1: return run<1>(argc, argv);
      case 8: return run<8>(argc, argv);
      case 16: return run<16>(argc, argv);
      case 32: return run<32>(argc, argv);
      case 64: return run<64>(argc, argv);
    }
  } catch (std::exception& e) { std::cerr << "error: " << e.what() << "\n"; return 1; }
  std::cerr << "unsupported N\n";
  return 2;
}
