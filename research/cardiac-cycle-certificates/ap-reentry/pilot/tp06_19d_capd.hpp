// CAPD vector field of the baseline 19-state ten Tusscher-Panfilov 2006 endocardial cell (author convention) and of
// a ring of N such cells with nearest-neighbour voltage coupling c (V_{k-1} - 2 V_k + V_{k+1}), for the stage-1 cost
// pilot of ap-reentry/SCOPING.md (section 8). Pilot code: it is not used by any certificate.
//
// Source of the equations: fun_eval in "bifurcation analysis/TP06_endo.m" (lines 13-147),
// github.com/andreerhardt/cardiac-dynamics-of-a-human-ventricular-tissue-model-with-focus-on-early-afterdepolarizations,
// commit dc78f86fd218418e029ec43d945bcd0fc54b9f1e, SHA-256 67fdcf72019b7ea60947ef7a00df707dd19d316bf669f44b63084fcee2ed0c31
// (MIT License, A. H. Erhardt), as translated line by line in ap-reentry/tp06_19d.py, whose conventions this file
// copies exactly:
//   * convention "author": dV/dt = -I_ion (Cm = 1, no divisor) and every concentration flux is multiplied by
//     Cm_flux = 0.185; no stimulus (the ring is autonomous, so the K-carried stimulus term is absent);
//   * baseline conductances g_Kr 0.153, g_Ks 0.392, g_Na 14.838, g_K1 5.405, g_CaL 3.98e-5, g_to 0.073
//     (tp06_19d.BASE);
//   * K_i is the 19th state, so E_K and E_Ks are computed per cell.
// Checked against tp06_19d.py by pilot/compare_rhs19.py.
//
// House style of model/tp06_capd.hpp: every non-integer decimal enters through K("..."), a map parameter set to an
// interval enclosing that exact decimal (model/setup.hpp); log(a) is computed as 2 log(sqrt(a)) (clog) so a
// nonpositive argument stops the run; integration variables are scaled by powers of two (exact).
//
// Two deliberate choices for the pilot, both exact rewrites or restrictions, not approximations:
//   1. h/j rates. The source switches at V = -40 mV (V < -40: first branch; V >= -40: second). Both branches are
//      written as separate functions (hjLow, hjHigh) and each cell's branch is fixed when the map is built, from
//      the mask branchLow() (1 = the V < -40 formulas). The field is then analytic, and it equals the source's field
//      only while every cell stays on the side of -40 mV its mask names; the pilot window is chosen so that no cell
//      crosses -40 mV (pilot/window.py). The rates enter as (h_inf - h)(alpha_h + beta_h), the same function as
//      (h_inf - h)/tau_h with tau_h = 1/(alpha_h + beta_h); in the V >= -40 branch alpha_h = alpha_j = 0 exactly.
//   2. GHK factor. i_CaL is written with z/(exp(z) - 1), z = 2 (V - 15)/RTF, as a quotient. It has a removable
//      singularity at V = 15 mV, so this field is only usable on sets whose V stays away from 15 mV; the pilot
//      window keeps every cell at least 0.5 mV away (pilot/window.py). A proof needs the series window of
//      SCOPING.md section 6.3 instead.
#pragma once
#include <cmath>
#include <stdexcept>
#include <string>
#include <vector>
#include "../../model/setup.hpp"  // exact decimal enclosures (tp06::decimalEnclosureT, tp06::decimalAs)

namespace tp06r {
using capd::autodiff::Node;

enum { P_COUPLING, P_BASE = 4, P_MAX = 256 };
constexpr int NS = 19;

inline std::vector<std::string>& registry() { static std::vector<std::string> r; return r; }
inline int decimalIndex(const std::string& s) {
  auto& r = registry();
  for (size_t i = 0; i < r.size(); ++i) if (r[i] == s) return P_BASE + int(i);
  if (P_BASE + int(r.size()) + 1 > P_MAX) throw std::runtime_error("too many decimal constants");
  r.push_back(s);
  return P_BASE + int(r.size()) - 1;
}

// Branch mask, read when a map is constructed (CAPD records the expression graph once, in the Map constructor).
// Entry k is 1 if cell k uses the V < -40 formulas. Changing it does not affect maps that already exist.
inline std::vector<int>& branchLow() { static std::vector<int> m; return m; }

inline Node clog(const Node& a) { return 2.0 * log(sqrt(a)); }

struct Consts {
  Node RTF, FF, V_c, V_ss, V_sr, K_o, P_kna, sqrtKo, b;
};

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

// h/j opening and closing rates, TP06_endo.m lines 84-91. Returns alpha + beta (= 1/tau) for h and for j.
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

// One cell: x[0..18] -> out[0..18] in physical units; coupling is the extra dV/dt (mV/ms), not carried by any ion.
template <class KF>
void cell(const Consts& C, KF K, const Node* x, Node* out, const Node* coupling, bool low) {
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
  Node h_inf = 1.0 / ((1.0 + exp((V + K("71.55")) / K("7.43"))) ^ 2);  // (1 + exp(...))^-2; j_inf = h_inf
  Node rateH, rateJ;
  if (low) hjLow(K, V, rateH, rateJ); else hjHigh(K, V, rateH, rateJ);
  Node i_b_Na = K("0.00029") * (V - E_Na);
  // i_CaL = g d f f2 fCass * 4 (V-15) F^2/(RT) (0.25 Ca_ss e^z - Ca_o)/(e^z - 1) = g d f f2 fCass 2F (0.25 Ca_ss e^z - Ca_o) z/(e^z - 1)
  Node z = 2.0 * (V - 15.0) / RTF;
  Node ez = exp(z);
  Node i_CaL = K("3.98e-5") * d * f * f2 * fCass * 2.0 * C.FF * (K("0.25") * Ca_ss * ez - Ca_o) * z / (ez - 1.0);
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

// Integration variables z = x / sigma, sigma_i = 2^SCALE_EXP[i]: the power of two nearest (in log2) to the largest
// |x_i| on the N = 16, c = 0.035 orbit over one shift interval (pilot/results/window.json, orbit_max_abs_per_state).
// Power-of-two scaling is exact in binary floating point.
constexpr int SCALE_EXP[NS] = {6, 0, -1, -3, 0, 0, -1, 0, 0, 0, 0, -1, -1, 0, -10, 2, 1, 4, 7};
inline double scaleOf(int i) { return std::ldexp(1.0, SCALE_EXP[i % NS]); }

// Ring of N cells (N = 1: one uncoupled cell), scaled variables; cell k occupies [19k, 19k + 19) (cell-major; the
// Python files use the state-major layout state a of cell k at a*N + k).
template <int N>
void ringField(Node /*t*/, Node in[], int, Node out[], int, Node params[], int) {
  auto K = [&](const char* s) -> Node& { return params[decimalIndex(s)]; };
  const auto& low = branchLow();
  if (int(low.size()) != N) throw std::runtime_error("branch mask size differs from N");
  Consts C = makeConsts(K);
  std::vector<Node> x(NS * N), y(NS * N);
  for (int i = 0; i < NS * N; ++i) x[i] = in[i] * scaleOf(i);
  for (int k = 0; k < N; ++k) {
    if (N == 1) { cell(C, K, x.data(), y.data(), nullptr, low[0] != 0); continue; }
    const Node& Vl = x[NS * ((k + N - 1) % N)];
    const Node& Vr = x[NS * ((k + 1) % N)];
    Node cpl = params[P_COUPLING] * (Vr - 2.0 * x[NS * k] + Vl);
    cell(C, K, x.data() + NS * k, y.data() + NS * k, &cpl, low[k] != 0);
  }
  for (int i = 0; i < NS * N; ++i) out[i] = y[i] * (1.0 / scaleOf(i));
}

// Sets the coupling (decimal enclosure of `coupling`) and every registered decimal. Call after constructing the map.
template <class MapT, class ScalarT>
void setParameters(MapT& f, const std::string& coupling) {
  f.setParameter(P_COUPLING, tp06::decimalAs<ScalarT>(coupling));
  auto& r = registry();
  for (size_t i = 0; i < r.size(); ++i) f.setParameter(P_BASE + int(i), tp06::decimalAs<ScalarT>(r[i]));
  for (int k = P_BASE + int(r.size()); k < P_MAX; ++k) f.setParameter(k, ScalarT(0.0));
  for (int k = 1; k < P_BASE; ++k) f.setParameter(k, ScalarT(0.0));
}

}  // namespace tp06r
