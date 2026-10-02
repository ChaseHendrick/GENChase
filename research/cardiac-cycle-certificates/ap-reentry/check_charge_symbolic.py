"""Symbolic proof check (sympy) that the ring charge sum is conserved: for one cell, grad(q) . f = -(Cm*Cm_flux/(F V_c)) * coupling
identically, with the currents left as free symbols (the identity only uses how the currents enter the right-hand side).
Hence d/dt sum_k q_k = -(Cm Cm_flux/(F V_c)) * c * sum_k (V_{k+1} - 2 V_k + V_{k-1}) = 0 on the ring."""
import sympy as sp

(I_K1, I_to, I_Kr, I_Ks, I_CaL, I_NaK, I_Na, I_bNa, I_NaCa, I_bCa, I_pK, I_pCa, i_leak, i_up, i_xfer, i_rel,
 cpl, Cm, b, F, Vc, Vsr, Vss, Bc, Kc, Bsr, Ksr, Bss, Kss, Ca_i, Ca_sr, Ca_ss, istim) = sp.symbols(
    "I_K1 I_to I_Kr I_Ks I_CaL I_NaK I_Na I_bNa I_NaCa I_bCa I_pK I_pCa i_leak i_up i_xfer i_rel cpl Cm b F V_c "
    "V_sr V_ss Buf_c K_buf_c Buf_sr K_buf_sr Buf_ss K_buf_ss Ca_i Ca_sr Ca_ss i_stim")
I_ion = I_K1 + I_to + I_Kr + I_Ks + I_CaL + I_NaK + I_Na + I_bNa + I_NaCa + I_bCa + I_pK + I_pCa
bufc = 1 / (1 + Bc * Kc / (Ca_i + Kc) ** 2)
bufsr = 1 / (1 + Bsr * Ksr / (Ca_sr + Ksr) ** 2)
bufss = 1 / (1 + Bss * Kss / (Ca_ss + Kss) ** 2)
for stimK in (0, 1):
    dV = -(I_ion - istim) / Cm + cpl                                  # TP06_endo.m line 129 (+ coupling)
    dCai = bufc * ((i_leak - i_up) * Vsr / Vc + i_xfer - b * (I_bCa + I_pCa - 2 * I_NaCa) / (2 * Vc * F))   # line 143
    dCasr = bufsr * (i_up - (i_rel + i_leak))                           # line 144
    dCass = bufss * (-b * I_CaL / (2 * Vss * F) + i_rel * Vsr / Vss - i_xfer * Vc / Vss)                  # line 145
    dNa = -b * (I_Na + I_bNa + 3 * I_NaK + 3 * I_NaCa) / (Vc * F)       # line 146
    dK = -b * (I_K1 + I_to + I_Kr + I_Ks - 2 * I_NaK + I_pK - stimK * istim) / (Vc * F)                  # line 147
    # q = Na + K + 2*(Ca_i_tot + Vsr/Vc Ca_sr_tot + Vss/Vc Ca_ss_tot) - Cm b V/(F Vc); d(Ca_x_tot)/d(Ca_x) = 1/buf_x
    dq = dNa + dK + 2 * (dCai / bufc + Vsr / Vc * dCasr / bufsr + Vss / Vc * dCass / bufss) - Cm * b * dV / (F * Vc)
    r = sp.simplify(dq + Cm * b * cpl / (F * Vc))
    print("stimulus carried by K_i" if stimK else "stimulus not carried by K_i", ": dq/dt + Cm b cpl/(F V_c) =", r)
