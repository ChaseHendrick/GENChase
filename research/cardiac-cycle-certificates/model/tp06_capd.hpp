// CAPD vector field for Erhardt's 18-state TP06 endocardial cell (K_i fixed, smoothed h/j switch) and for a ring
// of N such cells with voltage-only nearest-neighbour coupling c (V_{j-1} - 2 V_j + V_{j+1}).
//
// Source of the equations: fun_eval in "bifurcation analysis/TP06_18d_endo_bif.m",
// github.com/andreerhardt/cardiac-dynamics-of-a-human-ventricular-tissue-model-with-focus-on-early-afterdepolarizations,
// commit dc78f86fd218418e029ec43d945bcd0fc54b9f1e, SHA-256 a50f6c08b4360dd257cce389a39ae72fda51e3642641bf5b8e5fced6c2225670
// (MIT License, A. H. Erhardt). Checked against model/tp06_18d.py by numerics/compare_rhs.
//
// Every non-integer decimal in the source enters through K("..."), a map parameter set to an interval enclosing
// that exact decimal (see decimal.hpp), so a rigorous run is about the model as written, not its double rounding.
// Parameters 0..6 are the physical parameters, 7 is the ring coupling c; decimals start at P_BASE.
#pragma once
#include <cmath>
#include <stdexcept>
#include <string>
#include <vector>
#include "capd/capdlib.h"

namespace tp06 {
using capd::autodiff::Node;

enum { P_GKR, P_GKS, P_GNA, P_GK1, P_GCAL, P_CM, P_KI, P_COUPLING, P_BASE = 16, P_MAX = 256 };
constexpr int DIM = 18;

inline std::vector<std::string>& registry() { static std::vector<std::string> r; return r; }
inline int decimalIndex(const std::string& s) {
  auto& r = registry();
  for (size_t i = 0; i < r.size(); ++i) if (r[i] == s) return P_BASE + int(i);
  if (P_BASE + int(r.size()) + 1 > P_MAX) throw std::runtime_error("too many decimal constants");
  r.push_back(s);
  return P_BASE + int(r.size()) - 1;
}

// Checked logarithm: log(a) = 2 log(sqrt(a)), the same function for a > 0. Interval sqrt refuses an argument with a
// negative part in both arithmetics used here (filib throws; CAPD's MpInterval sqrt throws), whereas CAPD's
// MpInterval log would return NaN bounds for a nonpositive argument and continue. So an evaluation set that left the
// model's domain stops the run instead of passing silently.
inline Node clog(const Node& a) { return 2.0 * log(sqrt(a)); }

// Constants shared by every cell, built once per vector-field evaluation so the ring DAG does not repeat them.
struct Consts {
  Node RTF, E_K, sqrtKo, FF, V_c, V_ss, V_sr, K_o, P_kna, Cm, Ki, gKr, gKs, gNa, gK1, gCaL;
};

template <class KF>
Consts makeConsts(Node params[], KF K) {
  Consts c;
  Node R = K("8314.472");
  c.FF = K("96485.3415");
  c.RTF = R * 310.0 / c.FF;
  c.K_o = K("5.4");
  c.P_kna = K("0.03");
  c.Ki = params[P_KI];
  c.E_K = c.RTF * clog(c.K_o / c.Ki);
  c.sqrtKo = sqrt(c.K_o / K("5.4"));
  c.V_c = K("0.016404");
  c.V_ss = K("0.00005468");
  c.V_sr = K("0.001094");
  c.Cm = params[P_CM];
  c.gKr = params[P_GKR]; c.gKs = params[P_GKS]; c.gNa = params[P_GNA]; c.gK1 = params[P_GK1]; c.gCaL = params[P_GCAL];
  return c;
}

// One cell: x[0..17] -> out[0..17]. iExtra is an extra membrane current density added with the sign of i_Stim,
// i.e. dV/dt = -(sum of ionic currents - iExtra)/Cm. The ring passes iExtra = Cm*c*(V_{j-1} - 2 V_j + V_{j+1}).
template <class KF>
void cell(const Consts& C, KF K, const Node* x, Node* out, const Node* iExtra) {
  const double Na_o = 140.0, Ca_o = 2.0;
  Node V = x[0], Xr1 = x[1], Xr2 = x[2], Xs = x[3], m = x[4], h = x[5], j = x[6], d = x[7], f = x[8], f2 = x[9];
  Node fCass = x[10], s = x[11], r = x[12], Rp = x[13], Ca_i = x[14], Ca_sr = x[15], Ca_ss = x[16], Na_i = x[17];
  const Node& RTF = C.RTF;
  const Node& E_K = C.E_K;
  Node E_Na = RTF * clog(Na_o / Na_i);
  Node E_Ks = RTF * clog((C.K_o + C.P_kna * Na_o) / (C.Ki + C.P_kna * Na_i));
  Node E_Ca = K("0.5") * RTF * clog(Ca_o / Ca_i);
  Node alpha_K1 = K("0.1") / (1.0 + exp(K("0.06") * (V - E_K - 200.0)));
  Node beta_K1 = (3.0 * exp(K("0.0002") * (V - E_K + 100.0)) + exp(K("0.1") * (V - E_K - 10.0))) /
                 (1.0 + exp(-K("0.5") * (V - E_K)));
  Node xK1_inf = alpha_K1 / (alpha_K1 + beta_K1);
  Node i_K1 = C.gK1 * xK1_inf * C.sqrtKo * (V - E_K);
  Node i_Kr = C.gKr * C.sqrtKo * Xr1 * Xr2 * (V - E_K);
  Node xr1_inf = 1.0 / (1.0 + exp((-26.0 - V) / 7.0));
  Node tau_xr1 = (450.0 / (1.0 + exp((-45.0 - V) / 10.0))) * (6.0 / (1.0 + exp((V + 30.0) / K("11.5"))));
  Node xr2_inf = 1.0 / (1.0 + exp((V + 88.0) / 24.0));
  Node tau_xr2 = (3.0 / (1.0 + exp((-60.0 - V) / 20.0))) * (K("1.12") / (1.0 + exp((V - 60.0) / 20.0)));
  Node i_Ks = C.gKs * (Xs ^ 2) * (V - E_Ks);
  Node xs_inf = 1.0 / (1.0 + exp((-5.0 - V) / 14.0));
  Node tau_xs = (1400.0 / sqrt(1.0 + exp((5.0 - V) / 6.0))) * (1.0 / (1.0 + exp((V - 35.0) / 15.0))) + 80.0;
  Node i_Na = C.gNa * (m ^ 3) * h * j * (V - E_Na);
  Node m_inf = 1.0 / ((1.0 + exp((-K("56.86") - V) / K("9.03"))) ^ 2);
  Node tau_m = (1.0 / (1.0 + exp((-60.0 - V) / 5.0))) *
               (K("0.1") / (1.0 + exp((V + 35.0) / 5.0)) + K("0.1") / (1.0 + exp((V - 50.0) / 200.0)));
  Node v_inf = 1.0 / ((1.0 + exp((V + K("71.55")) / K("7.43"))) ^ 2);
  // Smoothed switch u = 1/(1+exp(-5(V+40))). The source writes (1-u); we use the exact identity
  // 1 - u = 1/(1+exp(5(V+40))), the same function, because 1 - u cancels catastrophically when u is within
  // 1e-80 of 1 (as it is near V = 0) and the interval version would then carry a needless width of ~1e-16.
  Node u = 1.0 / (1.0 + exp(-5.0 * (V + 40.0)));
  Node omu = 1.0 / (1.0 + exp(5.0 * (V + 40.0)));
  Node ah = omu * K("0.057") * exp(-(V + 80.0) / K("6.8"));
  Node bh = K("0.77") / (K("0.13") * (1.0 + exp(-(V + K("10.66")) / K("11.1")))) * u +
            omu * (K("2.7") * exp(K("0.079") * V) + 310000.0 * exp(K("0.3485") * V));
  Node tau_h = 1.0 / (ah + bh);
  Node aj = omu * ((-25428.0 * exp(K("0.2444") * V) - K("6.948e-6") * exp(-K("0.04391") * V)) *
                         (V + K("37.78")) / (1.0 + exp(K("0.311") * (V + K("79.23")))));
  Node bj = K("0.6") * exp(K("0.057") * V) / (1.0 + exp(-K("0.1") * (V + 32.0))) * u +
            omu * (K("0.02424") * exp(-K("0.01052") * V) / (1.0 + exp(-K("0.1378") * (V + K("40.14")))));
  Node tau_J = 1.0 / (aj + bj);
  Node i_b_Na = K("0.00029") * (V - E_Na);
  Node z = 2.0 * (V - 15.0) / RTF;  // GHK exponent; removable singularity at V = 15 mV is never approached here
  Node ez = exp(z);
  Node i_CaL = C.gCaL * d * f * f2 * fCass * 4.0 * (V - 15.0) * C.FF / RTF * (K("0.25") * Ca_ss * ez - Ca_o) / (ez - 1.0);
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
  Node Ca_i_bufc = 1.0 / (1.0 + K("0.2") * K("0.001") / ((Ca_i + K("0.001")) ^ 2));
  Node Ca_sr_bufsr = 1.0 / (1.0 + 10.0 * K("0.3") / ((Ca_sr + K("0.3")) ^ 2));
  Node Ca_ss_bufss = 1.0 / (1.0 + K("0.4") * K("0.00025") / ((Ca_ss + K("0.00025")) ^ 2));
  Node sumI = i_K1 + i_to + i_Kr + i_Ks + i_CaL + i_NaK + i_Na + i_b_Na + i_NaCa + i_b_Ca + i_p_K + i_p_Ca;
  out[0] = iExtra ? -(sumI - *iExtra) / C.Cm : -sumI / C.Cm;
  out[1] = (xr1_inf - Xr1) / tau_xr1;
  out[2] = (xr2_inf - Xr2) / tau_xr2;
  out[3] = (xs_inf - Xs) / tau_xs;
  out[4] = (m_inf - m) / tau_m;
  out[5] = (v_inf - h) / tau_h;
  out[6] = (v_inf - j) / tau_J;
  out[7] = (d_inf - d) / tau_d;
  out[8] = (f_inf - f) / tau_f;
  out[9] = (f2_inf - f2) / tau_f2;
  out[10] = (fCass_inf - fCass) / tau_fCass;
  out[11] = (s_inf - s) / tau_s;
  out[12] = (r_inf - r) / tau_r;
  out[13] = -k2 * Ca_ss * Rp + K("0.005") * (1.0 - Rp);
  out[14] = Ca_i_bufc * ((i_leak - i_up) * C.V_sr / C.V_c + i_xfer - C.Cm * (i_b_Ca + i_p_Ca - 2.0 * i_NaCa) / (2.0 * C.V_c * C.FF));
  out[15] = Ca_sr_bufsr * (i_up - (i_rel + i_leak));
  out[16] = Ca_ss_bufss * (-C.Cm * i_CaL / (2.0 * C.V_ss * C.FF) + i_rel * C.V_sr / C.V_ss - i_xfer * C.V_c / C.V_ss);
  out[17] = -C.Cm * (i_Na + i_b_Na + 3.0 * i_NaK + 3.0 * i_NaCa) / (C.V_c * C.FF);
}

// Integration variables are z = x / sigma with sigma_i = 2^SCALE_EXP[i] (model/scales.txt). Multiplying or dividing
// by a power of two is exact in binary floating point, so the scaling changes no rounding; it only puts every state
// variable at order one, which CAPD's absolute step control and its wrapping control need (h and j are ~4e-9).
constexpr int SCALE_EXP[18] = {-2, 0, -5, -1, 0, -28, -28, 0, -4, -2, -1, -8, -5, -1, -10, 2, -3, 3};
inline double scaleOf(int i) { return std::ldexp(1.0, SCALE_EXP[i % 18]); }

// Vector field of a ring of N cells (N = 1 is the single cell) in the scaled variables z.
// State layout: cell k occupies [18k, 18k+18).
template <int N>
void ringField(Node /*t*/, Node in[], int, Node out[], int, Node params[], int) {
  auto K = [&](const char* s) -> Node& { return params[decimalIndex(s)]; };
  Consts C = makeConsts(params, K);
  std::vector<Node> x(18 * N), y(18 * N);
  for (int i = 0; i < 18 * N; ++i) x[i] = in[i] * scaleOf(i);
  for (int k = 0; k < N; ++k) {
    if (N == 1) { cell(C, K, x.data(), y.data(), nullptr); continue; }
    const Node& Vl = x[18 * ((k + N - 1) % N)];
    const Node& Vr = x[18 * ((k + 1) % N)];
    Node iExtra = C.Cm * params[P_COUPLING] * (Vl - 2.0 * x[18 * k] + Vr);
    cell(C, K, x.data() + 18 * k, y.data() + 18 * k, &iExtra);
  }
  for (int i = 0; i < 18 * N; ++i) out[i] = y[i] * (1.0 / scaleOf(i));
}

}  // namespace tp06
