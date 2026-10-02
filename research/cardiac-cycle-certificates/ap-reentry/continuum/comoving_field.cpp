// Evaluate the CAPD comoving field (comoving19.hpp) and the first integral H in double intervals at given points, for
// the cross-check against tw_model.py (check_comoving_field.py). Test program; no theorem.
// Usage: comoving_field POINTS OUT
//   POINTS: lines "kappa_decimal low(0|1) poly(0|1) K z_0 ... z_19" (scaled variables, decimal or C hex doubles)
//   OUT: lines "f_lo_0 f_hi_0 ... f_lo_19 f_hi_19 H_lo H_hi A_W_lo A_W_hi A_C_lo A_C_hi" (C hex); (A_W, A_C) are the
//        window rows of comoving19::windowRows (added 2026-10-02 for the window-row test, review finding 4)
#include <fstream>
#include <sstream>
#include "../proof/engine.hpp"
#include "comoving19.hpp"

using namespace capd;

int main(int argc, char** argv) {
  if (argc != 3) { std::cerr << "usage: comoving_field POINTS OUT\n"; return 2; }
  std::ifstream in(argv[1]);
  std::ofstream out(argv[2]);
  std::string line;
  while (std::getline(in, line)) {
    if (line.empty() || line[0] == '#') continue;
    std::istringstream is(line);
    std::string kappa; int low, poly, K;
    is >> kappa >> low >> poly >> K;
    ring19::ghkDegree() = K;
    IMap f(comoving19::field, 20, 20, comoving19::numParams());
    IMap h(comoving19::firstIntegral, 20, 1, comoving19::numParams());
    IMap wr(comoving19::windowRows, 20, 2, comoving19::numParams());
    ring19::setParameters<IMap, interval>(f, kappa, 1, apx::ghkCoefs<interval>());
    ring19::setParameters<IMap, interval>(h, kappa, 1, apx::ghkCoefs<interval>());
    ring19::setParameters<IMap, interval>(wr, kappa, 1, apx::ghkCoefs<interval>());
    ring19::setMode<IMap, interval>(f, 0, low != 0, poly != 0);
    IVector z(20);
    for (int i = 0; i < 20; ++i) { std::string t; is >> t; z[i] = interval(std::strtod(t.c_str(), nullptr)); }
    IVector F = f(z);
    IVector H = h(z);
    IVector A = wr(z);
    for (int i = 0; i < 20; ++i) out << apx::hexd(F[i].leftBound()) << " " << apx::hexd(F[i].rightBound()) << " ";
    out << apx::hexd(H[0].leftBound()) << " " << apx::hexd(H[0].rightBound()) << " " << apx::hexd(A[0].leftBound()) << " "
        << apx::hexd(A[0].rightBound()) << " " << apx::hexd(A[1].leftBound()) << " " << apx::hexd(A[1].rightBound()) << "\n";
  }
  return 0;
}
