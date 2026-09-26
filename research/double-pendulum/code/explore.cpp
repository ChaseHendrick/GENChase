// NUMERICAL (non-rigorous) exploration: Poincare sections of the double pendulum.
// usage: explore E norbits niter [coupled=1]
#include "dp.h"
#include <cstdio>
#include <cstdlib>
#include <cmath>
using namespace capd;
int main(int argc, char** argv) {
  double E = atof(argv[1]); int no = atoi(argv[2]), ni = atoi(argv[3]);
  bool coupled = argc > 4 ? atoi(argv[4]) : 1;
  DMap vf(coupled ? DP_FIELD : UNCOUPLED_FIELD); vf.setParameter("g", 1.0);
  DOdeSolver solver(vf, 20);
  DCoordinateSection sec(4, 0);
  DPoincareMap pm(solver, sec, poincare::MinusPlus);
  srand(1);
  for (int o = 0; o < no; ++o) {
    DVector x(4);
    double t2, p2;
    for (;;) {
      t2 = M_PI * (2.0 * rand() / RAND_MAX - 1); p2 = 3.0 * (2.0 * rand() / RAND_MAX - 1);
      double w = coupled ? 2 * (E + 2 + cos(t2)) - p2 * p2 : E + 2 + cos(t2) - p2 * p2 / 2;
      if (w > 0) break;
    }
    x[0] = 0; x[1] = t2; x[3] = p2; x[2] = lift_p1<double>(coupled, E, 1.0, t2, p2);
    double H0 = 0;
    for (int i = 0; i < ni; ++i) {
      try { x = pm(x); } catch (std::exception& e) { break; }
      double a = remainder(x[1], 2 * M_PI);
      printf("%d %.10f %.10f\n", o, a, x[3]);
    }
  }
}
