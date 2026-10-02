// CAPD vector field for the reentry proof program (ap-reentry/SCOPING.md section 6): a ring of N baseline 19-state
// ten Tusscher-Panfilov 2006 endocardial cells (author convention, c (V_{k-1} - 2 V_k + V_{k+1}) voltage coupling),
// with two per-cell switches that are MAP PARAMETERS, so a mode change is a parameter change and never rebuilds the
// map or the solver:
//
//   * h/j branch (TP06_endo.m lines 84-91, switch at V = -40 mV). rate = sLow * rate_low + sHigh * rate_high with
//     (sLow, sHigh) = (1, 0) or (0, 1) exactly. Both branches are finite at every physiological V, so the product
//     with an exact 0 is an exact 0 and the field equals the selected branch's formula exactly.
//   * GHK factor g(zeta) = zeta / (exp(zeta) - 1), zeta = 2 (V - 15) / RTF, in i_CaL. Two representations:
//       quotient:  Q(w) = w / (exp(w) - 1) with w = zeta + 5 sPoly (so w = zeta exactly when sPoly = 0);
//       window:    p_K(zeta) = 1 - zeta/2 + sum_{k=1}^{K/2} c_{2k} zeta^{2k}, the Taylor polynomial of g at 0, whose
//                  coefficients c_n = B_n / n! enter as interval map parameters computed by the exact recurrence
//                  sum_{j=0}^{n} c_j / (n - j + 1)! = delta_{n0} in interval arithmetic (ghkCoefficients below).
//     gfac = sPoly * p_K(zeta) + sQuot * Q(zeta + 5 sPoly), (sPoly, sQuot) = (1, 0) or (0, 1) exactly. In window mode
//     the quotient branch is evaluated at zeta + 5 (never near its removable singularity) and multiplied by an exact
//     0. The window representation differs from the model by R(zeta) = g - p_K, |R| <= T0 (tailBounds below); the
//     proof engine adds that difference to every step as a rigorous perturbation bound (engine.hpp, Gronwall).
//
// Source of the equations: fun_eval in "bifurcation analysis/TP06_endo.m" (lines 13-147),
// github.com/andreerhardt/cardiac-dynamics-of-a-human-ventricular-tissue-model-with-focus-on-early-afterdepolarizations,
// commit dc78f86fd218418e029ec43d945bcd0fc54b9f1e, SHA-256 67fdcf72019b7ea60947ef7a00df707dd19d316bf669f44b63084fcee2ed0c31
// (MIT License, A. H. Erhardt); the cell equations are the text of ap-reentry/pilot/tp06_19d_capd.hpp (checked there
// against tp06_19d.py), unchanged except for the two switches above. Checked against tp06_19d.py by proof/check_field.py.
//
// Pilot / proof-program code. No theorem has been established with it.
#pragma once
#include <cmath>
#include <stdexcept>
#include <string>
#include <vector>
#include "../../model/setup.hpp"  // tp06::decimalEnclosureT, tp06::decimalAs (exact decimal enclosures)

namespace ring19 {
using capd::autodiff::Node;

constexpr int NS = 19;
constexpr int KMAX = 40;  // largest admissible window degree
enum {
  P_COUPLING = 0,
  P_BASE = 4,                    // decimal constants (registry)
  P_BERN = P_BASE + 170,         // c_0 .. c_KMAX of g(zeta) = sum c_n zeta^n
  P_MODE = P_BERN + KMAX + 2     // per cell: sLow, sHigh, sPoly, sQuot
};
inline int numParams(int N) { return P_MODE + 4 * N; }
inline int modeIndex(int cell, int which) { return P_MODE + 4 * cell + which; }  // which: 0 sLow 1 sHigh 2 sPoly 3 sQuot

inline std::vector<std::string>& registry() { static std::vector<std::string> r; return r; }
inline int decimalIndex(const std::string& s) {
  auto& r = registry();
  for (size_t i = 0; i < r.size(); ++i) if (r[i] == s) return P_BASE + int(i);
  if (P_BASE + int(r.size()) + 1 > P_BERN) throw std::runtime_error("too many decimal constants");
  r.push_back(s);
  return P_BASE + int(r.size()) - 1;
}
// Degree K of the window polynomial (even, 2..KMAX). Read when a map is built (the DAG is recorded once).
inline int& ghkDegree() { static int K = 24; return K; }

inline Node clog(const Node& a) { return 2.0 * log(sqrt(a)); }

struct Consts { Node RTF, FF, V_c, V_ss, V_sr, K_o, P_kna, sqrtKo, b; };
template <class KF>
Consts makeConsts(KF K) {
  Consts c;
  Node R = K("8314.472");
  c.FF = K("96485.3415");
  c.RTF = R * 310.0 / c.FF;
  c.K_o = K("5.4");
  c.P_kna = K("0.03");
  c.sqrtKo = sqrt(c.K_o / K("5.4"));
  c.V_c = K("0.016404");
  c.V_ss = K("0.00005468");
  c.V_sr = K("0.001094");
  c.b = K("0.185");  // Cm_flux of the author convention
  return c;
}

template <class KF>
void hjLow(KF K, const Node& V, Node& rateH, Node& rateJ) {  // V < -40
  Node ah = K("0.057") * exp(-(V + 80.0) / K("6.8"));
  Node bh = K("2.7") * exp(K("0.079") * V) + 310000.0 * exp(K("0.3485") * V);
  Node aj = (-25428.0 * exp(K("0.2444") * V) - K("6.948e-6") * exp(-K("0.04391") * V)) * (V + K("37.78")) /
            (1.0 + exp(K("0.311") * (V + K("79.23"))));
  Node bj = K("0.02424") * exp(-K("0.01052") * V) / (1.0 + exp(-K("0.1378") * (V + K("40.14"))));
  rateH = ah + bh;
  rateJ = aj + bj;
}
template <class KF>
void hjHigh(KF K, const Node& V, Node& rateH, Node& rateJ) {  // V >= -40: alpha_h = alpha_j = 0
  rateH = K("0.77") / (K("0.13") * (1.0 + exp(-(V + K("10.66")) / K("11.1"))));
  rateJ = K("0.6") * exp(K("0.057") * V) / (1.0 + exp(-K("0.1") * (V + 32.0)));
}

// Window polynomial p_K(zeta) by Horner in u = zeta^2 (odd coefficients beyond c_1 are exactly 0: B_{2k+1} = 0).
inline Node ghkPoly(const Node& zeta, Node params[]) {
  const int K = ghkDegree();
  Node u = zeta * zeta;
  Node acc = params[P_BERN + K];
  for (int n = K - 2; n >= 2; n -= 2) acc = params[P_BERN + n] + u * acc;
  return params[P_BERN + 0] + params[P_BERN + 1] * zeta + u * acc;
}

// The i_CaL prefactor: i_CaL = Pref * g(zeta), Pref = g_CaL d f f2 fCass 2F (0.25 Ca_ss e^zeta - Ca_o).
template <class KF>
Node calPrefactor(const Consts& C, KF K, const Node& V, const Node& d, const Node& f, const Node& f2,
                  const Node& fCass, const Node& Ca_ss, Node& zeta) {
  const double Ca_o = 2.0;
  zeta = 2.0 * (V - 15.0) / C.RTF;
  return K("3.98e-5") * d * f * f2 * fCass * 2.0 * C.FF * (K("0.25") * Ca_ss * exp(zeta) - Ca_o);
}

// One cell: x[0..18] physical -> out[0..18]; coupling is the extra dV/dt (mV/ms), not carried by any ion.
template <class KF>
void cell(const Consts& C, KF K, const Node* x, Node* out, const Node* coupling, Node params[], int k) {
  const double Na_o = 140.0, Ca_o = 2.0;
  Node V = x[0], Xr1 = x[1], Xr2 = x[2], Xs = x[3], m = x[4], h = x[5], j = x[6], d = x[7], f = x[8], f2 = x[9];
  Node fCass = x[10], s = x[11], r = x[12], Rp = x[13], Ca_i = x[14], Ca_sr = x[15], Ca_ss = x[16], Na_i = x[17];
  Node K_i = x[18];
  const Node& RTF = C.RTF;
  Node E_Na = RTF * clog(Na_o / Na_i);
  Node E_K = RTF * clog(C.K_o / K_i);
  Node E_Ks = RTF * clog((C.K_o + C.P_kna * Na_o) / (K_i + C.P_kna * Na_i));
  Node E_Ca = K("0.5") * RTF * clog(Ca_o / Ca_i);
  Node alpha_K1 = K("0.1") / (1.0 + exp(K("0.06") * (V - E_K - 200.0)));
  Node beta_K1 = (3.0 * exp(K("0.0002") * (V - E_K + 100.0)) + exp(K("0.1") * (V - E_K - 10.0))) /
                 (1.0 + exp(-K("0.5") * (V - E_K)));
  Node xK1_inf = alpha_K1 / (alpha_K1 + beta_K1);
  Node i_K1 = K("5.405") * xK1_inf * C.sqrtKo * (V - E_K);
  Node i_Kr = K("0.153") * C.sqrtKo * Xr1 * Xr2 * (V - E_K);
  Node xr1_inf = 1.0 / (1.0 + exp((-26.0 - V) / 7.0));
  Node tau_xr1 = (450.0 / (1.0 + exp((-45.0 - V) / 10.0))) * (6.0 / (1.0 + exp((V + 30.0) / K("11.5"))));
  Node xr2_inf = 1.0 / (1.0 + exp((V + 88.0) / 24.0));
  Node tau_xr2 = (3.0 / (1.0 + exp((-60.0 - V) / 20.0))) * (K("1.12") / (1.0 + exp((V - 60.0) / 20.0)));
  Node i_Ks = K("0.392") * (Xs ^ 2) * (V - E_Ks);
  Node xs_inf = 1.0 / (1.0 + exp((-5.0 - V) / 14.0));
  Node tau_xs = (1400.0 / sqrt(1.0 + exp((5.0 - V) / 6.0))) * (1.0 / (1.0 + exp((V - 35.0) / 15.0))) + 80.0;
  Node i_Na = K("14.838") * (m ^ 3) * h * j * (V - E_Na);
  Node m_inf = 1.0 / ((1.0 + exp((-K("56.86") - V) / K("9.03"))) ^ 2);
  Node tau_m = (1.0 / (1.0 + exp((-60.0 - V) / 5.0))) *
               (K("0.1") / (1.0 + exp((V + 35.0) / 5.0)) + K("0.1") / (1.0 + exp((V - 50.0) / 200.0)));
  Node h_inf = 1.0 / ((1.0 + exp((V + K("71.55")) / K("7.43"))) ^ 2);
  Node rhL, rjL, rhH, rjH;
  hjLow(K, V, rhL, rjL);
  hjHigh(K, V, rhH, rjH);
  Node& sLow = params[modeIndex(k, 0)];
  Node& sHigh = params[modeIndex(k, 1)];
  Node& sPoly = params[modeIndex(k, 2)];
  Node& sQuot = params[modeIndex(k, 3)];
  Node rateH = sLow * rhL + sHigh * rhH;
  Node rateJ = sLow * rjL + sHigh * rjH;
  Node i_b_Na = K("0.00029") * (V - E_Na);
  Node zeta;
  Node pref = calPrefactor(C, K, V, d, f, f2, fCass, Ca_ss, zeta);
  Node w = zeta + 5.0 * sPoly;
  Node gfac = sPoly * ghkPoly(zeta, params) + sQuot * (w / (exp(w) - 1.0));
  Node i_CaL = pref * gfac;
  Node d_inf = 1.0 / (1.0 + exp((-8.0 - V) / K("7.5")));
  Node tau_d = (K("1.4") / (1.0 + exp((-35.0 - V) / 13.0)) + K("0.25")) * (K("1.4") / (1.0 + exp((V + 5.0) / 5.0))) +
               1.0 / (1.0 + exp((50.0 - V) / 20.0));
  Node f_inf = 1.0 / (1.0 + exp((V + 20.0) / 7.0));
  Node tau_f = K("1102.5") * exp(-((V + 27.0) ^ 2) / 225.0) + 200.0 / (1.0 + exp((13.0 - V) / 10.0)) +
               180.0 / (1.0 + exp((V + 30.0) / 10.0)) + 20.0;
  Node f2_inf = K("0.67") / (1.0 + exp((V + 35.0) / 7.0)) + K("0.33");
  Node tau_f2 = 600.0 * exp(-((V + 25.0) ^ 2) / 170.0) + 31.0 / (1.0 + exp((25.0 - V) / 10.0)) +
                16.0 / (1.0 + exp((V + 30.0) / 10.0));
  Node q = (Ca_ss / K("0.05")) ^ 2;
  Node fCass_inf = K("0.6") / (1.0 + q) + K("0.4");
  Node tau_fCass = 80.0 / (1.0 + q) + 2.0;
  Node i_b_Ca = K("0.000592") * (V - E_Ca);
  Node i_to = K("0.073") * r * s * (V - E_K);
  Node s_inf = 1.0 / (1.0 + exp((V + 28.0) / 5.0));
  Node tau_s = 1000.0 * exp(-((V + 67.0) ^ 2) / 1000.0) + 8.0;
  Node r_inf = 1.0 / (1.0 + exp((20.0 - V) / 6.0));
  Node tau_r = K("9.5") * exp(-((V + 40.0) ^ 2) / 1800.0) + K("0.8");
  Node i_NaK = K("2.724") * C.K_o / (C.K_o + 1.0) * Na_i / (Na_i + 40.0) /
               (1.0 + K("0.1245") * exp(-K("0.1") * V / RTF) + K("0.0353") * exp(-V / RTF));
  Node g0 = K("0.35");
  Node i_NaCa = 1000.0 * (exp(g0 * V / RTF) * (Na_i ^ 3) * Ca_o - exp((g0 - 1.0) * V / RTF) * (Na_o * Na_o * Na_o) * Ca_i * K("2.5")) /
                ((K("87.5") * K("87.5") * K("87.5") + Na_o * Na_o * Na_o) * (K("1.38") + Ca_o) *
                 (1.0 + K("0.1") * exp((g0 - 1.0) * V / RTF)));
  Node i_p_Ca = K("0.1238") * Ca_i / (Ca_i + K("0.0005"));
  Node i_p_K = K("0.0146") * (V - E_K) / (1.0 + exp((25.0 - V) / K("5.98")));
  Node kcasr = K("2.5") - (K("2.5") - 1.0) / (1.0 + ((K("1.5") / Ca_sr) ^ 2));
  Node k1 = K("0.15") / kcasr;
  Node k2 = K("0.045") * kcasr;
  Node Ca_ss2 = Ca_ss ^ 2;
  Node O = k1 * Ca_ss2 * Rp / (K("0.06") + k1 * Ca_ss2);
  Node i_rel = K("0.102") * O * (Ca_sr - Ca_ss);
  Node i_up = K("0.006375") / (1.0 + (K("0.00025") ^ 2) / (Ca_i ^ 2));
  Node i_leak = K("0.00036") * (Ca_sr - Ca_i);
  Node i_xfer = K("0.0038") * (Ca_ss - Ca_i);
  Node bufc = 1.0 / (1.0 + K("0.2") * K("0.001") / ((Ca_i + K("0.001")) ^ 2));
  Node bufsr = 1.0 / (1.0 + 10.0 * K("0.3") / ((Ca_sr + K("0.3")) ^ 2));
  Node bufss = 1.0 / (1.0 + K("0.4") * K("0.00025") / ((Ca_ss + K("0.00025")) ^ 2));
  Node I_ion = i_K1 + i_to + i_Kr + i_Ks + i_CaL + i_NaK + i_Na + i_b_Na + i_NaCa + i_b_Ca + i_p_K + i_p_Ca;
  const Node& b = C.b;
  out[0] = coupling ? -I_ion + *coupling : -I_ion;  // Cm = 1
  out[1] = (xr1_inf - Xr1) / tau_xr1;
  out[2] = (xr2_inf - Xr2) / tau_xr2;
  out[3] = (xs_inf - Xs) / tau_xs;
  out[4] = (m_inf - m) / tau_m;
  out[5] = (h_inf - h) * rateH;
  out[6] = (h_inf - j) * rateJ;
  out[7] = (d_inf - d) / tau_d;
  out[8] = (f_inf - f) / tau_f;
  out[9] = (f2_inf - f2) / tau_f2;
  out[10] = (fCass_inf - fCass) / tau_fCass;
  out[11] = (s_inf - s) / tau_s;
  out[12] = (r_inf - r) / tau_r;
  out[13] = -k2 * Ca_ss * Rp + K("0.005") * (1.0 - Rp);
  out[14] = bufc * ((i_leak - i_up) * C.V_sr / C.V_c + i_xfer - b * (i_b_Ca + i_p_Ca - 2.0 * i_NaCa) / (2.0 * C.V_c * C.FF));
  out[15] = bufsr * (i_up - (i_rel + i_leak));
  out[16] = bufss * (-b * i_CaL / (2.0 * C.V_ss * C.FF) + i_rel * C.V_sr / C.V_ss - i_xfer * C.V_c / C.V_ss);
  out[17] = -b * (i_Na + i_b_Na + 3.0 * i_NaK + 3.0 * i_NaCa) / (C.V_c * C.FF);
  out[18] = -b * (i_K1 + i_to + i_Kr + i_Ks - 2.0 * i_NaK + i_p_K) / (C.V_c * C.FF);
}

// Scaled integration variables z = x / sigma, sigma_i = 2^SCALE_EXP[i] (exact), as in the pilot.
constexpr int SCALE_EXP[NS] = {6, 0, -1, -3, 0, 0, -1, 0, 0, 0, 0, -1, -1, 0, -10, 2, 1, 4, 7};
inline double scaleOf(int i) { return std::ldexp(1.0, SCALE_EXP[i % NS]); }

// Ring of N = dimIn / 19 cells (N = 1: one uncoupled cell), scaled variables, cell-major (cell k at [19k, 19k+19)).
inline void ringField(Node /*t*/, Node in[], int dimIn, Node out[], int, Node params[], int) {
  const int N = dimIn / NS;
  auto K = [&](const char* s) -> Node& { return params[decimalIndex(s)]; };
  Consts C = makeConsts(K);
  std::vector<Node> x(NS * N), y(NS * N);
  for (int i = 0; i < NS * N; ++i) x[i] = in[i] * scaleOf(i);
  for (int k = 0; k < N; ++k) {
    if (N == 1) { cell(C, K, x.data(), y.data(), nullptr, params, 0); continue; }
    const Node& Vl = x[NS * ((k + N - 1) % N)];
    const Node& Vr = x[NS * ((k + 1) % N)];
    Node cpl = params[P_COUPLING] * (Vr - 2.0 * x[NS * k] + Vl);
    cell(C, K, x.data() + NS * k, y.data() + NS * k, &cpl, params, k);
  }
  for (int i = 0; i < NS * N; ++i) out[i] = y[i] * (1.0 / scaleOf(i));
}

// The two rows of the field that the window representation changes, as functions of ONE cell's scaled state, without
// the factor R(zeta): out[0] = A_V = -Pref / sigma_V  (row V),  out[1] = A_C = -(b / (2 V_ss F)) bufss Pref / sigma_Ca_ss
// (row Ca_ss). The model's field minus the window field is (A_V, A_C) * R(zeta) in those rows and 0 elsewhere.
inline void prefactorField(Node /*t*/, Node in[], int, Node out[], int, Node params[], int) {
  auto K = [&](const char* s) -> Node& { return params[decimalIndex(s)]; };
  Consts C = makeConsts(K);
  Node V = in[0] * scaleOf(0), d = in[7] * scaleOf(7), f = in[8] * scaleOf(8), f2 = in[9] * scaleOf(9);
  Node fCass = in[10] * scaleOf(10), Ca_ss = in[16] * scaleOf(16);
  Node zeta;
  Node pref = calPrefactor(C, K, V, d, f, f2, fCass, Ca_ss, zeta);
  Node bufss = 1.0 / (1.0 + K("0.4") * K("0.00025") / ((Ca_ss + K("0.00025")) ^ 2));
  out[0] = -pref * (1.0 / scaleOf(0));
  out[1] = -C.b * bufss * pref / (2.0 * C.V_ss * C.FF) * (1.0 / scaleOf(16));
}

// Per-cell charge-like quantity q (tp06_19d.charge, author convention: Cm = 1, Cm_flux = b = 0.185), summed over the
// ring: Q = sum_k [Na_i + K_i + 2 (Ca_i,tot + (V_sr/V_c) Ca_sr,tot + (V_ss/V_c) Ca_ss,tot) - b V / (F V_c)]. Input:
// scaled ring state; output: Q in mM. Q is conserved by the ring flow (check_charge_symbolic.py).
inline void chargeField(Node /*t*/, Node in[], int dimIn, Node out[], int, Node params[], int) {
  const int N = dimIn / NS;
  auto K = [&](const char* s) -> Node& { return params[decimalIndex(s)]; };
  Consts C = makeConsts(K);
  Node Q = 0.0 * in[0];
  for (int k = 0; k < N; ++k) {
    const Node* z = in + NS * k;
    Node V = z[0] * scaleOf(0), Ca_i = z[14] * scaleOf(14), Ca_sr = z[15] * scaleOf(15), Ca_ss = z[16] * scaleOf(16);
    Node Na_i = z[17] * scaleOf(17), K_i = z[18] * scaleOf(18);
    Node ca = Ca_i + K("0.2") * Ca_i / (Ca_i + K("0.001")) +
              C.V_sr / C.V_c * (Ca_sr + 10.0 * Ca_sr / (Ca_sr + K("0.3"))) +
              C.V_ss / C.V_c * (Ca_ss + K("0.4") * Ca_ss / (Ca_ss + K("0.00025")));
    Q = Q + Na_i + K_i + 2.0 * ca - C.b * V / (C.FF * C.V_c);
  }
  out[0] = Q;
}

// Interval enclosures of c_0..c_K (g(zeta) = sum c_n zeta^n) by the recurrence sum_{j=0}^{n} c_j / (n-j+1)! = [n==0],
// i.e. (e^zeta - 1)/zeta * g = 1. Every operation is an interval operation, so each c_n encloses B_n / n!. The odd
// coefficients beyond c_1 are set to exactly 0 (B_{2k+1} = 0 for k >= 1); their computed enclosures must contain 0.
template <class S>
std::vector<S> ghkCoefficients(int K) {
  std::vector<S> fact(K + 2);
  fact[0] = S(1.0);
  for (int i = 1; i <= K + 1; ++i) fact[i] = fact[i - 1] * S(double(i));
  std::vector<S> c(K + 1);
  for (int n = 0; n <= K; ++n) {
    S acc = n == 0 ? S(1.0) : S(0.0);
    for (int j = 0; j < n; ++j) acc = acc - c[j] / fact[n - j + 1];
    c[n] = acc;  // divided by 1/1! = 1
  }
  for (int n = 3; n <= K; n += 2) {
    if (!(c[n].leftBound() <= 0.0 && c[n].rightBound() >= 0.0)) throw std::runtime_error("odd Bernoulli enclosure excludes 0");
    c[n] = S(0.0);
  }
  return c;
}

// Sets the coupling, every registered decimal, the window coefficients (enclosures of c_0..c_KMAX, see engine.hpp
// ghkCoefs) and all modes (default: high branch, quotient).
template <class MapT, class ScalarT>
void setParameters(MapT& f, const std::string& coupling, int N, const std::vector<ScalarT>& c) {
  if (int(c.size()) != KMAX + 1) throw std::runtime_error("window coefficient count");
  f.setParameter(P_COUPLING, tp06::decimalAs<ScalarT>(coupling));
  for (int k = 1; k < P_BASE; ++k) f.setParameter(k, ScalarT(0.0));
  auto& r = registry();
  for (size_t i = 0; i < r.size(); ++i) f.setParameter(P_BASE + int(i), tp06::decimalAs<ScalarT>(r[i]));
  for (int k = P_BASE + int(r.size()); k < P_BERN; ++k) f.setParameter(k, ScalarT(0.0));
  for (int n = 0; n <= KMAX; ++n) f.setParameter(P_BERN + n, c[n]);
  f.setParameter(P_BERN + KMAX + 1, ScalarT(0.0));
  for (int k = 0; k < N; ++k) {
    f.setParameter(modeIndex(k, 0), ScalarT(0.0)); f.setParameter(modeIndex(k, 1), ScalarT(1.0));
    f.setParameter(modeIndex(k, 2), ScalarT(0.0)); f.setParameter(modeIndex(k, 3), ScalarT(1.0));
  }
}
template <class MapT, class ScalarT>
void setMode(MapT& f, int k, bool low, bool poly) {
  f.setParameter(modeIndex(k, 0), ScalarT(low ? 1.0 : 0.0));
  f.setParameter(modeIndex(k, 1), ScalarT(low ? 0.0 : 1.0));
  f.setParameter(modeIndex(k, 2), ScalarT(poly ? 1.0 : 0.0));
  f.setParameter(modeIndex(k, 3), ScalarT(poly ? 0.0 : 1.0));
}

}  // namespace ring19
