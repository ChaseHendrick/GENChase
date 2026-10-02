"""Reference translation of fun_eval in Erhardt's TP06_18d_endo_bif.m.

Source: github.com/andreerhardt/cardiac-dynamics-of-a-human-ventricular-tissue-model-with-focus-on-early-afterdepolarizations
commit dc78f86fd218418e029ec43d945bcd0fc54b9f1e, file "bifurcation analysis/TP06_18d_endo_bif.m",
SHA-256 a50f6c08b4360dd257cce389a39ae72fda51e3642641bf5b8e5fced6c2225670 (MIT License, A. H. Erhardt).
The model is the ten Tusscher-Panfilov 2006 endocardial cell with K_i held fixed (a parameter) and the
Heaviside switch at V = -40 mV in the h and j rates replaced by u = 1/(1+exp(-5(V+40))).

The functions are written against a small namespace `M` (exp, log, sqrt) so the same text evaluates in
floats (math), numpy or mpmath. MATLAB precedence is kept: a/(b)^2 means a/(b^2).

State order (MATLAB kmrgd(1..18)): V, Xr1, Xr2, Xs, m, h, j, d, f, f2, fCass, s, r, R', Ca_i, Ca_sr, Ca_ss, Na_i.
"""
import math

NAMES = ["V", "Xr1", "Xr2", "Xs", "m", "h", "j", "d", "f", "f2", "fCass", "s", "r", "Rp",
         "Ca_i", "Ca_sr", "Ca_ss", "Na_i"]

# Parameters of the certified point (handoff 2026-09-30): Erhardt's reduced-repolarization setting.
PARAMS = dict(g_Kr=0.0153, g_Ks=0.0275, g_Na=14.838, g_K1=5.405, g_CaL=0.000199, Cm=1.0, K_i=138.3)


def field(x, p=PARAMS, M=math, i_stim=0.0):
    """Right-hand side dx/dt in mV/ms and mM/ms; x is a sequence of 18 numbers."""
    exp, log, sqrt = M.exp, M.log, M.sqrt
    V, Xr1, Xr2, Xs, m, h, j, d, f, f2, fCass, s, r, Rp, Ca_i, Ca_sr, Ca_ss, Na_i = x
    g_Kr, g_Ks, g_Na, g_K1, g_CaL, Cm, K_i = (p[k] for k in ("g_Kr", "g_Ks", "g_Na", "g_K1", "g_CaL", "Cm", "K_i"))
    R = 8314.472; T = 310; FF = 96485.3415; V_c = 0.016404; P_kna = 0.03; g_bna = 0.00029; g_bca = 0.000592
    g_to = 0.073; g_pCa = 0.1238; g_pK = 0.0146; K_o = 5.4; Na_o = 140; K_pCa = 0.0005; P_NaK = 2.724
    K_mk = 1; K_mNa = 40; K_NaCa = 1000; K_sat = 0.1; alpha_0 = 2.5; gamma_0 = 0.35; Km_Ca = 1.38
    Km_Nai = 87.5; Ca_o = 2; k1_prime = 0.15; k2_prime = 0.045; k3 = 0.06; k4 = 0.005; EC = 1.5
    max_sr = 2.5; min_sr = 1; V_rel = 0.102; V_xfer = 0.0038; K_up = 0.00025; V_leak = 0.00036
    Vmax_up = 0.006375; Buf_c = 0.2; K_buf_c = 0.001; Buf_sr = 10; K_buf_sr = 0.3; Buf_ss = 0.4
    K_buf_ss = 0.00025; V_sr = 0.001094; V_ss = 0.00005468
    RTF = R * T / FF
    E_Na = RTF * log(Na_o / Na_i)
    E_K = RTF * log(K_o / K_i)
    E_Ks = RTF * log((K_o + P_kna * Na_o) / (K_i + P_kna * Na_i))
    E_Ca = 0.5 * RTF * log(Ca_o / Ca_i)
    alpha_K1 = 0.1 / (1 + exp(0.06 * (V - E_K - 200)))
    beta_K1 = (3 * exp(0.0002 * (V - E_K + 100)) + exp(0.1 * (V - E_K - 10))) / (1 + exp(-0.5 * (V - E_K)))
    xK1_inf = alpha_K1 / (alpha_K1 + beta_K1)
    i_K1 = g_K1 * xK1_inf * sqrt(K_o / 5.4) * (V - E_K)
    i_Kr = g_Kr * sqrt(K_o / 5.4) * Xr1 * Xr2 * (V - E_K)
    xr1_inf = 1 / (1 + exp((-26 - V) / 7))
    tau_xr1 = (450 / (1 + exp((-45 - V) / 10))) * (6 / (1 + exp((V + 30) / 11.5)))
    xr2_inf = 1 / (1 + exp((V + 88) / 24))
    tau_xr2 = (3 / (1 + exp((-60 - V) / 20))) * (1.12 / (1 + exp((V - 60) / 20)))
    i_Ks = g_Ks * Xs ** 2 * (V - E_Ks)
    xs_inf = 1 / (1 + exp((-5 - V) / 14))
    tau_xs = (1400 / sqrt(1 + exp((5 - V) / 6))) * (1 / (1 + exp((V - 35) / 15))) + 80
    i_Na = g_Na * m ** 3 * h * j * (V - E_Na)
    m_inf = 1 / (1 + exp((-56.86 - V) / 9.03)) ** 2
    tau_m = (1 / (1 + exp((-60 - V) / 5))) * (0.1 / (1 + exp((V + 35) / 5)) + 0.1 / (1 + exp((V - 50) / 200)))
    v_inf = 1 / (1 + exp((V + 71.55) / 7.43)) ** 2
    u = 1 / (1 + exp(-5 * (V + 40)))
    ah = (1 - u) * 0.057 * exp(-(V + 80) / 6.8)
    bh = 0.77 / (0.13 * (1 + exp(-(V + 10.66) / 11.1))) * u + (1 - u) * (2.7 * exp(0.079 * V) + 3.1e5 * exp(0.3485 * V))
    tau_h = 1 / (ah + bh)
    aj = (1 - u) * ((-2.5428e4 * exp(0.2444 * V) - 6.948e-6 * exp(-0.04391 * V)) * (V + 37.78) / (1 + exp(0.311 * (V + 79.23))))
    bj = 0.6 * exp(0.057 * V) / (1 + exp(-0.1 * (V + 32))) * u + (1 - u) * (0.02424 * exp(-0.01052 * V) / (1 + exp(-0.1378 * (V + 40.14))))
    tau_J = 1 / (aj + bj)
    i_b_Na = g_bna * (V - E_Na)
    z = 2 * (V - 15) / RTF  # GHK exponent; removable singularity at V = 15 mV
    i_CaL = g_CaL * d * f * f2 * fCass * 4 * (V - 15) * FF / RTF * (0.25 * Ca_ss * exp(z) - Ca_o) / (exp(z) - 1)
    d_inf = 1 / (1 + exp((-8 - V) / 7.5))
    tau_d = (1.4 / (1 + exp((-35 - V) / 13)) + 0.25) * (1.4 / (1 + exp((V + 5) / 5))) + 1 / (1 + exp((50 - V) / 20))
    f_inf = 1 / (1 + exp((V + 20) / 7))
    tau_f = 1102.5 * exp(-(V + 27) ** 2 / 225) + 200 / (1 + exp((13 - V) / 10)) + 180 / (1 + exp((V + 30) / 10)) + 20
    f2_inf = 0.67 / (1 + exp((V + 35) / 7)) + 0.33
    tau_f2 = 600 * exp(-(V + 25) ** 2 / 170) + 31 / (1 + exp((25 - V) / 10)) + 16 / (1 + exp((V + 30) / 10))
    fCass_inf = 0.6 / (1 + (Ca_ss / 0.05) ** 2) + 0.4
    tau_fCass = 80 / (1 + (Ca_ss / 0.05) ** 2) + 2
    i_b_Ca = g_bca * (V - E_Ca)
    i_to = g_to * r * s * (V - E_K)
    s_inf = 1 / (1 + exp((V + 28) / 5))
    tau_s = 1000 * exp(-(V + 67) ** 2 / 1000) + 8
    r_inf = 1 / (1 + exp((20 - V) / 6))
    tau_r = 9.5 * exp(-(V + 40) ** 2 / 1800) + 0.8
    i_NaK = P_NaK * K_o / (K_o + K_mk) * Na_i / (Na_i + K_mNa) / (1 + 0.1245 * exp(-0.1 * V / RTF) + 0.0353 * exp(-V / RTF))
    i_NaCa = K_NaCa * (exp(gamma_0 * V / RTF) * Na_i ** 3 * Ca_o - exp((gamma_0 - 1) * V / RTF) * Na_o ** 3 * Ca_i * alpha_0) / (
        (Km_Nai ** 3 + Na_o ** 3) * (Km_Ca + Ca_o) * (1 + K_sat * exp((gamma_0 - 1) * V / RTF)))
    i_p_Ca = g_pCa * Ca_i / (Ca_i + K_pCa)
    i_p_K = g_pK * (V - E_K) / (1 + exp((25 - V) / 5.98))
    kcasr = max_sr - (max_sr - min_sr) / (1 + (EC / Ca_sr) ** 2)
    k1 = k1_prime / kcasr
    k2 = k2_prime * kcasr
    O = k1 * Ca_ss ** 2 * Rp / (k3 + k1 * Ca_ss ** 2)
    i_rel = V_rel * O * (Ca_sr - Ca_ss)
    i_up = Vmax_up / (1 + K_up ** 2 / Ca_i ** 2)
    i_leak = V_leak * (Ca_sr - Ca_i)
    i_xfer = V_xfer * (Ca_ss - Ca_i)
    Ca_i_bufc = 1 / (1 + Buf_c * K_buf_c / (Ca_i + K_buf_c) ** 2)
    Ca_sr_bufsr = 1 / (1 + Buf_sr * K_buf_sr / (Ca_sr + K_buf_sr) ** 2)
    Ca_ss_bufss = 1 / (1 + Buf_ss * K_buf_ss / (Ca_ss + K_buf_ss) ** 2)
    return [
        -(i_K1 + i_to + i_Kr + i_Ks + i_CaL + i_NaK + i_Na + i_b_Na + i_NaCa + i_b_Ca + i_p_K + i_p_Ca - i_stim) / Cm,
        (xr1_inf - Xr1) / tau_xr1,
        (xr2_inf - Xr2) / tau_xr2,
        (xs_inf - Xs) / tau_xs,
        (m_inf - m) / tau_m,
        (v_inf - h) / tau_h,
        (v_inf - j) / tau_J,
        (d_inf - d) / tau_d,
        (f_inf - f) / tau_f,
        (f2_inf - f2) / tau_f2,
        (fCass_inf - fCass) / tau_fCass,
        (s_inf - s) / tau_s,
        (r_inf - r) / tau_r,
        -k2 * Ca_ss * Rp + k4 * (1 - Rp),
        Ca_i_bufc * ((i_leak - i_up) * V_sr / V_c + i_xfer - Cm * (i_b_Ca + i_p_Ca - 2 * i_NaCa) / (2 * V_c * FF)),
        Ca_sr_bufsr * (i_up - (i_rel + i_leak)),
        Ca_ss_bufss * (-Cm * i_CaL / (2 * V_ss * FF) + i_rel * V_sr / V_ss - i_xfer * V_c / V_ss),
        -Cm * (i_Na + i_b_Na + 3 * i_NaK + 3 * i_NaCa) / (V_c * FF),
    ]
