// CAPD vector field of the comoving-frame (travelling-wave) TP06 cable, for the continuum reentry route
// (ap-reentry/continuum/PLAN.md). Pilot code: no theorem has been established with it.
//
// Cable: V_t = D V_xx + f_V(y), w_t = f_w(y) (author convention, Cm = 1, axial current carried by no ion).
// Wave u(x, t) = phi(t - x/c), s = t - x/c, W = phi_V', kappa = c^2 / D:
//     V' = W,   W' = kappa (W - f_V(y)),   w' = f_w(y)        (dimension 20; 21 with kappa as a state, kappa' = 0)
// The cell field f is ring19::cell (N = 1, no coupling), i.e. the text of ring19.hpp with its two exact 0/1 mode
// switches (h/j branch, GHK quotient or window polynomial). Scaled variables z = x / sigma with ring19's sigma for
// the 19 cell states and sigma_W = 2^6 for W.
//
// The window representation of the GHK factor changes two rows: W (through f_V, with the factor kappa) and Ca_ss.
// windowRows returns, without the factor R(zeta): A_W = kappa Pref / sigma_W, A_C = -(b / (2 V_ss F)) bufss Pref /
// sigma_Ca_ss. True field minus window field = (A_W, A_C) R(zeta) in those rows, 0 elsewhere.
//
// First integral: H = q(y) + (k / kappa) W, k = b / (F V_c), q the per-cell charge of ring19::chargeField.
#pragma once
#include <cmath>
#include <vector>
#include "../proof/ring19.hpp"

namespace comoving19 {
using capd::autodiff::Node;

constexpr int NC = 19;   // cell states
constexpr int IW = 19;   // W
constexpr int IKAPPA = 20;
constexpr int SCALE_EXP_W = 6;
inline double scaleOf(int i) { return i < NC ? ring19::scaleOf(i) : (i == IW ? std::ldexp(1.0, SCALE_EXP_W) : 1.0); }
inline int numParams() { return ring19::numParams(1); }  // P_COUPLING holds kappa when dim = 20

inline void field(Node /*t*/, Node in[], int dimIn, Node out[], int, Node params[], int) {
  auto K = [&](const char* s) -> Node& { return params[ring19::decimalIndex(s)]; };
  ring19::Consts C = ring19::makeConsts(K);
  std::vector<Node> x(NC), y(NC);
  for (int i = 0; i < NC; ++i) x[i] = in[i] * scaleOf(i);
  Node W = in[IW] * scaleOf(IW);
  Node kappa = dimIn > IKAPPA ? in[IKAPPA] : params[ring19::P_COUPLING];
  ring19::cell(C, K, x.data(), y.data(), nullptr, params, 0);
  out[0] = W * (1.0 / scaleOf(0));
  for (int i = 1; i < NC; ++i) out[i] = y[i] * (1.0 / scaleOf(i));
  out[IW] = kappa * (W - y[0]) * (1.0 / scaleOf(IW));
  if (dimIn > IKAPPA) out[IKAPPA] = 0.0 * in[IKAPPA];
}

inline void windowRows(Node /*t*/, Node in[], int dimIn, Node out[], int, Node params[], int) {
  auto K = [&](const char* s) -> Node& { return params[ring19::decimalIndex(s)]; };
  ring19::Consts C = ring19::makeConsts(K);
  Node V = in[0] * scaleOf(0), d = in[7] * scaleOf(7), f = in[8] * scaleOf(8), f2 = in[9] * scaleOf(9);
  Node fCass = in[10] * scaleOf(10), Ca_ss = in[16] * scaleOf(16);
  Node kappa = dimIn > IKAPPA ? in[IKAPPA] : params[ring19::P_COUPLING];
  Node zeta;
  Node pref = ring19::calPrefactor(C, K, V, d, f, f2, fCass, Ca_ss, zeta);
  Node bufss = 1.0 / (1.0 + K("0.4") * K("0.00025") / ((Ca_ss + K("0.00025")) ^ 2));
  out[0] = kappa * pref * (1.0 / scaleOf(IW));
  out[1] = -C.b * bufss * pref / (2.0 * C.V_ss * C.FF) * (1.0 / scaleOf(16));
}

// H = q + (b / (F V_c)) W / kappa (output: H in mM)
inline void firstIntegral(Node /*t*/, Node in[], int dimIn, Node out[], int, Node params[], int) {
  auto K = [&](const char* s) -> Node& { return params[ring19::decimalIndex(s)]; };
  ring19::Consts C = ring19::makeConsts(K);
  Node V = in[0] * scaleOf(0), Ca_i = in[14] * scaleOf(14), Ca_sr = in[15] * scaleOf(15), Ca_ss = in[16] * scaleOf(16);
  Node Na_i = in[17] * scaleOf(17), K_i = in[18] * scaleOf(18), W = in[IW] * scaleOf(IW);
  Node kappa = dimIn > IKAPPA ? in[IKAPPA] : params[ring19::P_COUPLING];
  Node ca = Ca_i + K("0.2") * Ca_i / (Ca_i + K("0.001")) + C.V_sr / C.V_c * (Ca_sr + 10.0 * Ca_sr / (Ca_sr + K("0.3"))) +
            C.V_ss / C.V_c * (Ca_ss + K("0.4") * Ca_ss / (Ca_ss + K("0.00025")));
  out[0] = Na_i + K_i + 2.0 * ca - C.b * V / (C.FF * C.V_c) + C.b / (C.FF * C.V_c) * W / kappa;
}

}  // namespace comoving19
