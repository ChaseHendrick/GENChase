// Prints the double and interval right-hand sides of the CAPD cell at the states given on stdin (18 numbers per line),
// in physical units (the map itself works in the scaled variables), for comparison with model/tp06_18d.py (numerics/compare_rhs.py drives this).
#include <iostream>
#include <iomanip>
#include "../model/setup.hpp"
using namespace capd;

int main() {
  DMap fd(tp06::ringField<1>, 18, 18, tp06::P_MAX);
  IMap fi(tp06::ringField<1>, 18, 18, tp06::P_MAX);
  tp06::Physical p;
  tp06::setParameters(fd, p, 0.0);
  tp06::setParameters(fi, p, interval(0.0));
  std::cout << std::setprecision(17);
  DVector x(18);
  while (true) {
    for (int i = 0; i < 18; ++i) { if (!(std::cin >> x[i])) return 0; x[i] /= tp06::scaleOf(i); }  // exact
    DVector y = fd(x);
    IVector yi = fi(IVector(x));
    for (int i = 0; i < 18; ++i) {  // back to physical units (exact power-of-two scaling)
      double sc = tp06::scaleOf(i);
      std::cout << y[i] * sc << " " << yi[i].leftBound() * sc << " " << yi[i].rightBound() * sc << "\n";
    }
  }
}
