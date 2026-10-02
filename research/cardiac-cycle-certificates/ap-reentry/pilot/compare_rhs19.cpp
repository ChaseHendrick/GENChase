// Prints the double and interval right-hand sides of the CAPD 19-state field (tp06_19d_capd.hpp) at states read from
// stdin, in physical units, for comparison with ap-reentry/tp06_19d.py (pilot/compare_rhs19.py drives this).
// Input records: N (1 or 16), then N branch flags (1 = V < -40 formulas), then 19 N states in physical units,
// cell-major (cell k at [19k, 19k+19)). Output: one line "double lower upper" per component.
#include <iomanip>
#include <iostream>
#include "tp06_19d_capd.hpp"
using namespace capd;

template <int N>
void one(std::istream& in) {
  auto& mask = tp06r::branchLow();
  mask.assign(N, 0);
  for (int k = 0; k < N; ++k) in >> mask[k];
  const int dim = tp06r::NS * N;
  DMap fd(tp06r::ringField<N>, dim, dim, tp06r::P_MAX);  // the mask is read here
  IMap fi(tp06r::ringField<N>, dim, dim, tp06r::P_MAX);
  tp06r::setParameters<DMap, double>(fd, "0.035");
  tp06r::setParameters<IMap, interval>(fi, "0.035");
  DVector x(dim);
  for (int i = 0; i < dim; ++i) { in >> x[i]; x[i] /= tp06r::scaleOf(i); }  // exact
  DVector y = fd(x);
  IVector yi = fi(IVector(x));
  for (int i = 0; i < dim; ++i) {
    double sc = tp06r::scaleOf(i);
    std::cout << y[i] * sc << " " << yi[i].leftBound() * sc << " " << yi[i].rightBound() * sc << "\n";
  }
}

int main() {
  std::cout << std::setprecision(17);
  int N;
  while (std::cin >> N) {
    if (N == 1) one<1>(std::cin);
    else if (N == 16) one<16>(std::cin);
    else { std::cerr << "N must be 1 or 16\n"; return 2; }
  }
  return 0;
}
