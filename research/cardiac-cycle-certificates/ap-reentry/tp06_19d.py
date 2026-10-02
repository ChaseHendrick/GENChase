"""Reference translation of the baseline 19-state ten Tusscher-Panfilov 2006 endocardial cell.

Source: A. H. Erhardt, MIT-licensed repository
andreerhardt/cardiac-dynamics-of-a-human-ventricular-tissue-model-with-focus-on-early-afterdepolarizations,
commit dc78f86fd218418e029ec43d945bcd0fc54b9f1e,
file "bifurcation analysis/TP06_endo.m" (SHA-256 67fdcf72019b7ea60947ef7a00df707dd19d316bf669f44b63084fcee2ed0c31),
function fun_eval, lines 13-147:
  lines 14-56   constants,
  lines 57-60   reversal potentials,
  lines 61-125  currents, gates, Ca handling (h/j rates with the V = -40 mV switch: lines 84-91),
  lines 126-128 stimulus (52 pA/pF while t <= 2 ms),
  lines 129-147 right-hand side (state order kmrgd(1..19) below).
Baseline conductances (fun_eval takes them as parameters) are those of the CellML-derived gotran file in the
same repository, "monodomain simulations using FEniCS-beat/tentusscher_panfilov_2006/tentusscher_panfilov_2006_endo_cell.ode"
(SHA-256 9388ed03...): g_K1 5.405 (line 40), g_Kr 0.153 (line 43), g_Ks 0.392 (line 52), g_Na 14.838 (line 58),
g_CaL 0.0398 l/F/s = 3.98e-5 in fun_eval units (line 73), g_to 0.073 (line 91, also TP06_endo.m line 21).
The initial state is y01 of "comparison plots/simulation_modified_TP06_epi_M_endo.m" line 44 (K_i = 138.3, line 35).

Two capacitance conventions (see SCOPING.md, section 1):
  * convention="erhardt": TP06_endo.m exactly as Erhardt runs it (par_Cm = 1, e.g. TP06_16D_bifurcation_endo.m line 26):
    dV/dt = -(I_ion - I_stim)/Cm and every concentration flux is multiplied by the same Cm = 1.
  * convention="author": the original-author/CellML scaling of the gotran file: dV/dt = -(I_ion + i_Stim) with no
    divisor, and concentration fluxes scaled by Cm/(V_c F) = 185 pF/(16404 um^3 * 96.485 C/mmol), which is the
    fun_eval expression with the flux capacitance Cm_flux = 0.185 (to 4 significant digits; F differs in the 7th digit);
    the stimulus is carried by K_i (gotran line 322).  Everything else is identical text.
The h/j rates keep the source's Heaviside switch: the "V < -40" branch for V < -40 and the other branch for V >= -40.
The L-type GHK quotient (V-15)/(exp(z)-1), z = 2(V-15)F/(RT), is evaluated through its analytic extension
z/(e^z-1) = 1/exprel(z), which is entire on the real line (poles only at z = 2 pi i k, k != 0).

Arrays: a state is an array of shape (19, ...) (cells and batch dimensions trail).
"""
import numpy as np
from scipy.special import exprel

NAMES = ["V", "Xr1", "Xr2", "Xs", "m", "h", "j", "d", "f", "f2", "fCass", "s", "r", "Rp",
         "Ca_i", "Ca_sr", "Ca_ss", "Na_i", "K_i"]
IDX = {n: k for k, n in enumerate(NAMES)}
NS = 19

# comparison plots/simulation_modified_TP06_epi_M_endo.m, line 44 (y01) with K_i = 138.3 (line 35)
Y0 = np.array([-86.709, 0.00448, 0.476, 0.0087, 0.00155, 0.7573, 0.7, 3.164e-5, 0.8009, 0.9778, 0.9953,
               0.3212, 2.235e-8, 0.9068, 0.00013, 3.715, 0.00036, 10.355, 138.3])

BASE = dict(g_Kr=0.153, g_Ks=0.392, g_Na=14.838, g_K1=5.405, g_CaL=3.98e-5, g_to=0.073)

# fun_eval constants, TP06_endo.m lines 14-56
R = 8314.472; T = 310.0; FF = 96485.3415; V_c = 0.016404; P_kna = 0.03; g_bna = 0.00029; g_bca = 0.000592
g_pCa = 0.1238; g_pK = 0.0146; K_o = 5.4; Na_o = 140.0; K_pCa = 0.0005; P_NaK = 2.724
K_mk = 1.0; K_mNa = 40.0; K_NaCa = 1000.0; K_sat = 0.1; alpha_0 = 2.5; gamma_0 = 0.35; Km_Ca = 1.38
Km_Nai = 87.5; Ca_o = 2.0; k1_prime = 0.15; k2_prime = 0.045; k3 = 0.06; k4 = 0.005; EC = 1.5
max_sr = 2.5; min_sr = 1.0; V_rel = 0.102; V_xfer = 0.0038; K_up = 0.00025; V_leak = 0.00036
Vmax_up = 0.006375; Buf_c = 0.2; K_buf_c = 0.001; Buf_sr = 10.0; K_buf_sr = 0.3; Buf_ss = 0.4
K_buf_ss = 0.00025; V_sr = 0.001094; V_ss = 0.00005468
RTF = R * T / FF


def params(convention="author", **over):
    """Parameter dict. Cm divides dV/dt; Cm_flux multiplies the concentration fluxes."""
    p = dict(BASE)
    if convention == "erhardt":
        p.update(Cm=1.0, Cm_flux=1.0, stim_K=False)
    elif convention == "author":
        p.update(Cm=1.0, Cm_flux=0.185, stim_K=True)
    else:
        raise ValueError(convention)
    p["convention"] = convention
    p.update(over)
    return p


def currents(Y, p, lo=None):
    """All intermediate quantities of fun_eval as a dict (vectorized). lo: optional boolean mask fixing the h/j
    branch (True = the V < -40 formulas) for mode-fixed hybrid integration; default V < -40 as in the source."""
    V, Xr1, Xr2, Xs, m, h, j, d, f, f2, fCass, s, r, Rp, Ca_i, Ca_sr, Ca_ss, Na_i, K_i = Y
    exp, log, sqrt = np.exp, np.log, np.sqrt
    q = {}
    E_Na = RTF * log(Na_o / Na_i)
    E_K = RTF * log(K_o / K_i)
    E_Ks = RTF * log((K_o + P_kna * Na_o) / (K_i + P_kna * Na_i))
    E_Ca = 0.5 * RTF * log(Ca_o / Ca_i)
    alpha_K1 = 0.1 / (1 + exp(0.06 * (V - E_K - 200)))
    beta_K1 = (3 * exp(0.0002 * (V - E_K + 100)) + exp(0.1 * (V - E_K - 10))) / (1 + exp(-0.5 * (V - E_K)))
    xK1_inf = alpha_K1 / (alpha_K1 + beta_K1)
    q["i_K1"] = p["g_K1"] * xK1_inf * sqrt(K_o / 5.4) * (V - E_K)
    q["i_Kr"] = p["g_Kr"] * sqrt(K_o / 5.4) * Xr1 * Xr2 * (V - E_K)
    q["xr1_inf"] = 1 / (1 + exp((-26 - V) / 7))
    q["tau_xr1"] = (450 / (1 + exp((-45 - V) / 10))) * (6 / (1 + exp((V + 30) / 11.5)))
    q["xr2_inf"] = 1 / (1 + exp((V + 88) / 24))
    q["tau_xr2"] = (3 / (1 + exp((-60 - V) / 20))) * (1.12 / (1 + exp((V - 60) / 20)))
    q["i_Ks"] = p["g_Ks"] * Xs ** 2 * (V - E_Ks)
    q["xs_inf"] = 1 / (1 + exp((-5 - V) / 14))
    q["tau_xs"] = (1400 / sqrt(1 + exp((5 - V) / 6))) * (1 / (1 + exp((V - 35) / 15))) + 80
    q["i_Na"] = p["g_Na"] * m ** 3 * h * j * (V - E_Na)
    q["m_inf"] = 1 / (1 + exp((-56.86 - V) / 9.03)) ** 2
    q["tau_m"] = (1 / (1 + exp((-60 - V) / 5))) * (0.1 / (1 + exp((V + 35) / 5)) + 0.1 / (1 + exp((V - 50) / 200)))
    q["h_inf"] = (1 + exp((V + 71.55) / 7.43)) ** -2.0
    if lo is None:
        lo = V < -40  # TP06_endo.m lines 85-90: (V<-40) selects the first branch, (-40<=V) the second
    ah = np.where(lo, 0.057 * exp(-(V + 80) / 6.8), 0.0)
    bh = np.where(lo, 2.7 * exp(0.079 * V) + 3.1e5 * exp(0.3485 * V),
                  0.77 / (0.13 * (1 + exp(-(V + 10.66) / 11.1))))
    q["tau_h"] = 1.0 / (ah + bh)
    q["j_inf"] = q["h_inf"]
    aj = np.where(lo, (-2.5428e4 * exp(0.2444 * V) - 6.948e-6 * exp(-0.04391 * V)) * (V + 37.78)
                  / (1 + exp(0.311 * (V + 79.23))), 0.0)
    bj = np.where(lo, 0.02424 * exp(-0.01052 * V) / (1 + exp(-0.1378 * (V + 40.14))),
                  0.6 * exp(0.057 * V) / (1 + exp(-0.1 * (V + 32))))
    q["tau_j"] = 1.0 / (aj + bj)
    q["i_b_Na"] = g_bna * (V - E_Na)
    # i_CaL = g d f f2 fCass * 4 (V-15) F^2/(RT) * (0.25 Ca_ss e^z - Ca_o)/(e^z - 1), z = 2 (V-15) F/(RT)
    #       = g d f f2 fCass * 2F * (0.25 Ca_ss e^z - Ca_o) * z/(e^z - 1)     (analytic at V = 15)
    z = 2 * (V - 15) / RTF
    q["i_CaL"] = p["g_CaL"] * d * f * f2 * fCass * 2 * FF * (0.25 * Ca_ss * exp(z) - Ca_o) / exprel(z)
    q["d_inf"] = 1 / (1 + exp((-8 - V) / 7.5))
    q["tau_d"] = (1.4 / (1 + exp((-35 - V) / 13)) + 0.25) * (1.4 / (1 + exp((V + 5) / 5))) + 1 / (1 + exp((50 - V) / 20))
    q["f_inf"] = 1 / (1 + exp((V + 20) / 7))
    q["tau_f"] = 1102.5 * exp(-(V + 27) ** 2 / 225) + 200 / (1 + exp((13 - V) / 10)) + 180 / (1 + exp((V + 30) / 10)) + 20
    q["f2_inf"] = 0.67 / (1 + exp((V + 35) / 7)) + 0.33
    q["tau_f2"] = 600 * exp(-(V + 25) ** 2 / 170) + 31 / (1 + exp((25 - V) / 10)) + 16 / (1 + exp((V + 30) / 10))
    q["fCass_inf"] = 0.6 / (1 + (Ca_ss / 0.05) ** 2) + 0.4
    q["tau_fCass"] = 80 / (1 + (Ca_ss / 0.05) ** 2) + 2
    q["i_b_Ca"] = g_bca * (V - E_Ca)
    q["i_to"] = p["g_to"] * r * s * (V - E_K)
    q["s_inf"] = 1 / (1 + exp((V + 28) / 5))
    q["tau_s"] = 1000 * exp(-(V + 67) ** 2 / 1000) + 8
    q["r_inf"] = 1 / (1 + exp((20 - V) / 6))
    q["tau_r"] = 9.5 * exp(-(V + 40) ** 2 / 1800) + 0.8
    q["i_NaK"] = P_NaK * K_o / (K_o + K_mk) * Na_i / (Na_i + K_mNa) / (1 + 0.1245 * exp(-0.1 * V / RTF) + 0.0353 * exp(-V / RTF))
    q["i_NaCa"] = K_NaCa * (exp(gamma_0 * V / RTF) * Na_i ** 3 * Ca_o - exp((gamma_0 - 1) * V / RTF) * Na_o ** 3 * Ca_i * alpha_0) / (
        (Km_Nai ** 3 + Na_o ** 3) * (Km_Ca + Ca_o) * (1 + K_sat * exp((gamma_0 - 1) * V / RTF)))
    q["i_p_Ca"] = g_pCa * Ca_i / (Ca_i + K_pCa)
    q["i_p_K"] = g_pK * (V - E_K) / (1 + exp((25 - V) / 5.98))
    kcasr = max_sr - (max_sr - min_sr) / (1 + (EC / Ca_sr) ** 2)
    k1 = k1_prime / kcasr
    q["k2"] = k2_prime * kcasr
    O = k1 * Ca_ss ** 2 * Rp / (k3 + k1 * Ca_ss ** 2)
    q["i_rel"] = V_rel * O * (Ca_sr - Ca_ss)
    q["i_up"] = Vmax_up / (1 + K_up ** 2 / Ca_i ** 2)
    q["i_leak"] = V_leak * (Ca_sr - Ca_i)
    q["i_xfer"] = V_xfer * (Ca_ss - Ca_i)
    q["bufc"] = 1 / (1 + Buf_c * K_buf_c / (Ca_i + K_buf_c) ** 2)
    q["bufsr"] = 1 / (1 + Buf_sr * K_buf_sr / (Ca_sr + K_buf_sr) ** 2)
    q["bufss"] = 1 / (1 + Buf_ss * K_buf_ss / (Ca_ss + K_buf_ss) ** 2)
    q["I_ion"] = (q["i_K1"] + q["i_to"] + q["i_Kr"] + q["i_Ks"] + q["i_CaL"] + q["i_NaK"] + q["i_Na"] + q["i_b_Na"]
                  + q["i_NaCa"] + q["i_b_Ca"] + q["i_p_K"] + q["i_p_Ca"])
    return q


def field(Y, p, i_stim=0.0, coupling=0.0, lo=None):
    """dY/dt. i_stim: stimulus in Erhardt's sign (positive depolarizes). coupling: extra dV/dt (mV/ms),
    e.g. c*(V_{k+1} - 2 V_k + V_{k-1}); it is not carried by any ion species (standard monodomain)."""
    Y = np.asarray(Y, dtype=float)
    q = currents(Y, p, lo)
    V, Xr1, Xr2, Xs, m, h, j, d, f, f2, fCass, s, r, Rp, Ca_i, Ca_sr, Ca_ss, Na_i, K_i = Y
    Cm, b = p["Cm"], p["Cm_flux"]
    stimK = i_stim if p.get("stim_K", False) else 0.0
    out = np.empty_like(Y)
    out[0] = -(q["I_ion"] - i_stim) / Cm + coupling
    out[1] = (q["xr1_inf"] - Xr1) / q["tau_xr1"]
    out[2] = (q["xr2_inf"] - Xr2) / q["tau_xr2"]
    out[3] = (q["xs_inf"] - Xs) / q["tau_xs"]
    out[4] = (q["m_inf"] - m) / q["tau_m"]
    out[5] = (q["h_inf"] - h) / q["tau_h"]
    out[6] = (q["j_inf"] - j) / q["tau_j"]
    out[7] = (q["d_inf"] - d) / q["tau_d"]
    out[8] = (q["f_inf"] - f) / q["tau_f"]
    out[9] = (q["f2_inf"] - f2) / q["tau_f2"]
    out[10] = (q["fCass_inf"] - fCass) / q["tau_fCass"]
    out[11] = (q["s_inf"] - s) / q["tau_s"]
    out[12] = (q["r_inf"] - r) / q["tau_r"]
    out[13] = -q["k2"] * Ca_ss * Rp + k4 * (1 - Rp)
    out[14] = q["bufc"] * ((q["i_leak"] - q["i_up"]) * V_sr / V_c + q["i_xfer"]
                           - b * (q["i_b_Ca"] + q["i_p_Ca"] - 2 * q["i_NaCa"]) / (2 * V_c * FF))
    out[15] = q["bufsr"] * (q["i_up"] - (q["i_rel"] + q["i_leak"]))
    out[16] = q["bufss"] * (-b * q["i_CaL"] / (2 * V_ss * FF) + q["i_rel"] * V_sr / V_ss - q["i_xfer"] * V_c / V_ss)
    out[17] = -b * (q["i_Na"] + q["i_b_Na"] + 3 * q["i_NaK"] + 3 * q["i_NaCa"]) / (V_c * FF)
    out[18] = -b * (q["i_K1"] + q["i_to"] + q["i_Kr"] + q["i_Ks"] - 2 * q["i_NaK"] + q["i_p_K"] - stimK) / (V_c * FF)
    return out


def charge(Y, p):
    """Per-cell charge-like invariant, in mM: Na_i + K_i + 2*(total Ca, cytosol-volume weighted) - Cm*Cm_flux*V/(F V_c).
    For an isolated unstimulated cell it is constant; in a ring with coupling it changes only through the coupling,
    and its sum over the ring is constant (see SCOPING.md section 4)."""
    V, Ca_i, Ca_sr, Ca_ss, Na_i, K_i = Y[0], Y[14], Y[15], Y[16], Y[17], Y[18]
    ca_tot = (Ca_i + Buf_c * Ca_i / (Ca_i + K_buf_c)
              + V_sr / V_c * (Ca_sr + Buf_sr * Ca_sr / (Ca_sr + K_buf_sr))
              + V_ss / V_c * (Ca_ss + Buf_ss * Ca_ss / (Ca_ss + K_buf_ss)))
    return Na_i + K_i + 2 * ca_tot - p["Cm"] * p["Cm_flux"] * V / (FF * V_c)


def charge_grad(Y, p):
    """Gradient of charge() with respect to the 19 states (shape (19, ...))."""
    V, Ca_i, Ca_sr, Ca_ss = Y[0], Y[14], Y[15], Y[16]
    g = np.zeros_like(np.asarray(Y, dtype=float))
    g[0] = -p["Cm"] * p["Cm_flux"] / (FF * V_c)
    g[14] = 2 * (1 + Buf_c * K_buf_c / (Ca_i + K_buf_c) ** 2)
    g[15] = 2 * V_sr / V_c * (1 + Buf_sr * K_buf_sr / (Ca_sr + K_buf_sr) ** 2)
    g[16] = 2 * V_ss / V_c * (1 + Buf_ss * K_buf_ss / (Ca_ss + K_buf_ss) ** 2)
    g[17] = 1.0
    g[18] = 1.0
    return g
