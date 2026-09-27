// Planar double pendulum, point masses, m1 = m2 = 1, l1 = l2 = 1, gravity g
// (g = 1 is the classical case; g is a parameter only for the controls).
// Coordinates x = (t1, t2, p1, p2): angles from the downward vertical and the
// canonical momenta. Hamiltonian
//   H = (p1^2 + 2 p2^2 - 2 c p1 p2) / (2 D) - 2 g cos t1 - g cos t2,
//   c = cos(t1 - t2), s = sin(t1 - t2), D = 2 - c^2 = 1 + s^2.
// Poincare section t1 = 0 crossed with dt1/dt > 0; section coordinates (t2, p2);
// p1 is recovered from the energy (lift below).
#pragma once
#include "capd/capdlib.h"
#include <string>

// coupled: the classical double pendulum
static const char* DP_FIELD =
  "par:g;var:t1,t2,p1,p2;fun:"
  "(p1-cos(t1-t2)*p2)/(1+sin(t1-t2)^2),"
  "(2*p2-cos(t1-t2)*p1)/(1+sin(t1-t2)^2),"
  "-sin(t1-t2)*(p1*p2-cos(t1-t2)*(p1^2+2*p2^2-2*cos(t1-t2)*p1*p2)/(1+sin(t1-t2)^2))/(1+sin(t1-t2)^2)-2*g*sin(t1),"
  "sin(t1-t2)*(p1*p2-cos(t1-t2)*(p1^2+2*p2^2-2*cos(t1-t2)*p1*p2)/(1+sin(t1-t2)^2))/(1+sin(t1-t2)^2)-g*sin(t2);";

// negative control: the same kinetic diagonal without the coupling term
//   H = p1^2/4 + p2^2/2 - 2 g cos t1 - g cos t2   (two independent pendulums, integrable)
static const char* UNCOUPLED_FIELD =
  "par:g;var:t1,t2,p1,p2;fun:p1/2,p2,-2*g*sin(t1),-g*sin(t2);";

// Lift (t2, p2) on the section t1 = 0 to the phase space, on energy E, with dt1/dt > 0.
// coupled:   p1 = c p2 + sqrt(D (2(E + 2g + g cos t2) - p2^2)),  c = cos t2, D = 1 + sin^2 t2
//            (then dt1/dt = sqrt((2(E+2g+g cos t2) - p2^2)/D) > 0)
// uncoupled: p1 = 2 sqrt(E + 2g + g cos t2 - p2^2/2)
template <class S>
S lift_p1(bool coupled, S E, S g, S t2, S p2) {
  using std::sqrt; using std::cos; using std::sin;
  if (coupled) {
    S c = cos(t2), s = sin(t2), D = 1 + s * s;
    S q = D * (2 * (E + 2 * g + g * c) - p2 * p2);
    return c * p2 + sqrt(q);
  } else {
    S q = E + 2 * g + g * cos(t2) - p2 * p2 / 2;
    return 2 * sqrt(q);
  }
}
// dp1/dt2 and dp1/dp2 of the lift
template <class S>
void lift_dp1(bool coupled, S E, S g, S t2, S p2, S& d_t2, S& d_p2) {
  using std::sqrt; using std::cos; using std::sin;
  if (coupled) {
    S c = cos(t2), s = sin(t2), D = 1 + s * s;
    S w = 2 * (E + 2 * g + g * c) - p2 * p2;
    S q = D * w, r = sqrt(q);
    // dD/dt2 = 2 s c, dw/dt2 = -2 g s, dw/dp2 = -2 p2
    d_t2 = -s * p2 + (2 * s * c * w + D * (-2 * g * s)) / (2 * r);
    d_p2 = c + D * (-2 * p2) / (2 * r);
  } else {
    S q = E + 2 * g + g * cos(t2) - p2 * p2 / 2, r = sqrt(q);
    d_t2 = -g * sin(t2) / r;
    d_p2 = -p2 / r;
  }
}
