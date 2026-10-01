/* C version of the ring right-hand side of hybrid.Ring.rhs / tp06_19d.field (same expressions as ring_rl.c), for
 * speed only; check_rhs.py compares it with tp06_19d.py.  Build: gcc -O2 -shared -fPIC -o libtp06.so tp06_rhs.c -lm
 * Conductances are the baseline values (g_Kr 0.153, g_Ks 0.392, g_Na 14.838, g_K1 5.405, g_CaL 3.98e-5, g_to 0.073). */
#include <math.h>
#include <stdlib.h>

static const double R = 8314.472, T = 310.0, FF = 96485.3415, V_c = 0.016404, P_kna = 0.03, g_bna = 0.00029,
    g_bca = 0.000592, g_pCa = 0.1238, g_pK = 0.0146, K_o = 5.4, Na_o = 140.0, K_pCa = 0.0005, P_NaK = 2.724,
    K_mk = 1.0, K_mNa = 40.0, K_NaCa = 1000.0, K_sat = 0.1, alpha_0 = 2.5, gamma_0 = 0.35, Km_Ca = 1.38,
    Km_Nai = 87.5, Ca_o = 2.0, k1_prime = 0.15, k2_prime = 0.045, k3 = 0.06, k4 = 0.005, EC = 1.5, max_sr = 2.5,
    min_sr = 1.0, V_rel = 0.102, V_xfer = 0.0038, K_up = 0.00025, V_leak = 0.00036, Vmax_up = 0.006375,
    Buf_c = 0.2, K_buf_c = 0.001, Buf_sr = 10.0, K_buf_sr = 0.3, Buf_ss = 0.4, K_buf_ss = 0.00025,
    V_sr = 0.001094, V_ss = 0.00005468;
static const double g_Kr = 0.153, g_Ks = 0.392, g_Na = 14.838, g_K1 = 5.405, g_CaL = 3.98e-5, g_to = 0.073;

static double ghk(double z) { return fabs(z) < 1e-4 ? 1.0 - z / 2 + z * z / 12 : z / expm1(z); }

/* derivative of one cell; y[k] = state k, cpl = coupling dV/dt, lo = h/j branch (1: V<-40 formulas), istim and
   stimK as in tp06_19d.field (Cm = 1) */
static void cell_rhs(const double *y, double *dy, double cpl, int lo, double istim, int stimK, double b) {
  double V = y[0], Xr1 = y[1], Xr2 = y[2], Xs = y[3], m = y[4], h = y[5], j = y[6], d = y[7], f = y[8], f2 = y[9],
         fCass = y[10], s = y[11], r = y[12], Rp = y[13], Ca_i = y[14], Ca_sr = y[15], Ca_ss = y[16],
         Na_i = y[17], K_i = y[18];
  double RTF = R * T / FF;
  double E_Na = RTF * log(Na_o / Na_i), E_K = RTF * log(K_o / K_i),
         E_Ks = RTF * log((K_o + P_kna * Na_o) / (K_i + P_kna * Na_i)), E_Ca = 0.5 * RTF * log(Ca_o / Ca_i);
  double aK1 = 0.1 / (1 + exp(0.06 * (V - E_K - 200)));
  double bK1 = (3 * exp(0.0002 * (V - E_K + 100)) + exp(0.1 * (V - E_K - 10))) / (1 + exp(-0.5 * (V - E_K)));
  double i_K1 = g_K1 * aK1 / (aK1 + bK1) * sqrt(K_o / 5.4) * (V - E_K);
  double i_Kr = g_Kr * sqrt(K_o / 5.4) * Xr1 * Xr2 * (V - E_K);
  double i_Ks = g_Ks * Xs * Xs * (V - E_Ks);
  double i_Na = g_Na * m * m * m * h * j * (V - E_Na);
  double i_b_Na = g_bna * (V - E_Na);
  double z = 2 * (V - 15) / RTF;
  double i_CaL = g_CaL * d * f * f2 * fCass * 2 * FF * (0.25 * Ca_ss * exp(z) - Ca_o) * ghk(z);
  double i_b_Ca = g_bca * (V - E_Ca);
  double i_to = g_to * r * s * (V - E_K);
  double i_NaK = P_NaK * K_o / (K_o + K_mk) * Na_i / (Na_i + K_mNa) /
                 (1 + 0.1245 * exp(-0.1 * V / RTF) + 0.0353 * exp(-V / RTF));
  double i_NaCa = K_NaCa *
                  (exp(gamma_0 * V / RTF) * Na_i * Na_i * Na_i * Ca_o -
                   exp((gamma_0 - 1) * V / RTF) * Na_o * Na_o * Na_o * Ca_i * alpha_0) /
                  ((Km_Nai * Km_Nai * Km_Nai + Na_o * Na_o * Na_o) * (Km_Ca + Ca_o) *
                   (1 + K_sat * exp((gamma_0 - 1) * V / RTF)));
  double i_p_Ca = g_pCa * Ca_i / (Ca_i + K_pCa);
  double i_p_K = g_pK * (V - E_K) / (1 + exp((25 - V) / 5.98));
  double kcasr = max_sr - (max_sr - min_sr) / (1 + (EC / Ca_sr) * (EC / Ca_sr));
  double k1 = k1_prime / kcasr, k2 = k2_prime * kcasr;
  double O = k1 * Ca_ss * Ca_ss * Rp / (k3 + k1 * Ca_ss * Ca_ss);
  double i_rel = V_rel * O * (Ca_sr - Ca_ss), i_up = Vmax_up / (1 + K_up * K_up / (Ca_i * Ca_i));
  double i_leak = V_leak * (Ca_sr - Ca_i), i_xfer = V_xfer * (Ca_ss - Ca_i);
  double bufc = 1 / (1 + Buf_c * K_buf_c / ((Ca_i + K_buf_c) * (Ca_i + K_buf_c)));
  double bufsr = 1 / (1 + Buf_sr * K_buf_sr / ((Ca_sr + K_buf_sr) * (Ca_sr + K_buf_sr)));
  double bufss = 1 / (1 + Buf_ss * K_buf_ss / ((Ca_ss + K_buf_ss) * (Ca_ss + K_buf_ss)));
  double I_ion = i_K1 + i_to + i_Kr + i_Ks + i_CaL + i_NaK + i_Na + i_b_Na + i_NaCa + i_b_Ca + i_p_K + i_p_Ca;
  /* gates */
  double xr1_inf = 1 / (1 + exp((-26 - V) / 7)), tau_xr1 = (450 / (1 + exp((-45 - V) / 10))) * (6 / (1 + exp((V + 30) / 11.5)));
  double xr2_inf = 1 / (1 + exp((V + 88) / 24)), tau_xr2 = (3 / (1 + exp((-60 - V) / 20))) * (1.12 / (1 + exp((V - 60) / 20)));
  double xs_inf = 1 / (1 + exp((-5 - V) / 14)), tau_xs = (1400 / sqrt(1 + exp((5 - V) / 6))) * (1 / (1 + exp((V - 35) / 15))) + 80;
  double mi = 1 / (1 + exp((-56.86 - V) / 9.03)), m_inf = mi * mi;
  double tau_m = (1 / (1 + exp((-60 - V) / 5))) * (0.1 / (1 + exp((V + 35) / 5)) + 0.1 / (1 + exp((V - 50) / 200)));
  double hi = 1 / (1 + exp((V + 71.55) / 7.43)), h_inf = hi * hi;
  double ah, bh, aj, bj;
  if (lo) {
    ah = 0.057 * exp(-(V + 80) / 6.8);
    bh = 2.7 * exp(0.079 * V) + 3.1e5 * exp(0.3485 * V);
    aj = (-2.5428e4 * exp(0.2444 * V) - 6.948e-6 * exp(-0.04391 * V)) * (V + 37.78) / (1 + exp(0.311 * (V + 79.23)));
    bj = 0.02424 * exp(-0.01052 * V) / (1 + exp(-0.1378 * (V + 40.14)));
  } else {
    ah = 0.0;
    bh = 0.77 / (0.13 * (1 + exp(-(V + 10.66) / 11.1)));
    aj = 0.0;
    bj = 0.6 * exp(0.057 * V) / (1 + exp(-0.1 * (V + 32)));
  }
  double d_inf = 1 / (1 + exp((-8 - V) / 7.5));
  double tau_d = (1.4 / (1 + exp((-35 - V) / 13)) + 0.25) * (1.4 / (1 + exp((V + 5) / 5))) + 1 / (1 + exp((50 - V) / 20));
  double f_inf = 1 / (1 + exp((V + 20) / 7));
  double tau_f = 1102.5 * exp(-(V + 27) * (V + 27) / 225) + 200 / (1 + exp((13 - V) / 10)) + 180 / (1 + exp((V + 30) / 10)) + 20;
  double f2_inf = 0.67 / (1 + exp((V + 35) / 7)) + 0.33;
  double tau_f2 = 600 * exp(-(V + 25) * (V + 25) / 170) + 31 / (1 + exp((25 - V) / 10)) + 16 / (1 + exp((V + 30) / 10));
  double cq = (Ca_ss / 0.05) * (Ca_ss / 0.05);
  double fCass_inf = 0.6 / (1 + cq) + 0.4, tau_fCass = 80 / (1 + cq) + 2;
  double s_inf = 1 / (1 + exp((V + 28) / 5)), tau_s = 1000 * exp(-(V + 67) * (V + 67) / 1000) + 8;
  double r_inf = 1 / (1 + exp((20 - V) / 6)), tau_r = 9.5 * exp(-(V + 40) * (V + 40) / 1800) + 0.8;
  /* concentrations (forward Euler) */
  double dCa_i = bufc * ((i_leak - i_up) * V_sr / V_c + i_xfer - b * (i_b_Ca + i_p_Ca - 2 * i_NaCa) / (2 * V_c * FF));
  double dCa_sr = bufsr * (i_up - (i_rel + i_leak));
  double dCa_ss = bufss * (-b * i_CaL / (2 * V_ss * FF) + i_rel * V_sr / V_ss - i_xfer * V_c / V_ss);
  double dNa = -b * (i_Na + i_b_Na + 3 * i_NaK + 3 * i_NaCa) / (V_c * FF);
  double dK = -b * (i_K1 + i_to + i_Kr + i_Ks - 2 * i_NaK + i_p_K) / (V_c * FF);
  dy[0] = -(I_ion - istim) + cpl;
  dy[1] = (xr1_inf - Xr1) / tau_xr1;
  dy[2] = (xr2_inf - Xr2) / tau_xr2;
  dy[3] = (xs_inf - Xs) / tau_xs;
  dy[4] = (m_inf - m) / tau_m;
  dy[5] = (h_inf - h) * (ah + bh);
  dy[6] = (h_inf - j) * (aj + bj);
  dy[7] = (d_inf - d) / tau_d;
  dy[8] = (f_inf - f) / tau_f;
  dy[9] = (f2_inf - f2) / tau_f2;
  dy[10] = (fCass_inf - fCass) / tau_fCass;
  dy[11] = (s_inf - s) / tau_s;
  dy[12] = (r_inf - r) / tau_r;
  dy[13] = -k2 * Ca_ss * Rp + k4 * (1 - Rp);
  dy[14] = dCa_i;
  dy[15] = dCa_sr;
  dy[16] = dCa_ss;
  dy[17] = dNa;
  dy[18] = dK + (stimK ? b * istim / (V_c * FF) : 0.0);
}


/* y, dy: ncols columns, each a full ring state of length 19*N with layout k*N+i (column-major blocks: column q
 * starts at q*19*N).  w: N edge weights (edge i joins i and i+1).  lo: N branch flags. istim: N stimuli. */
void ring_rhs(int N, double c, double b, const double *w, const double *y, const unsigned char *lo,
              const double *istim, int stimK, double *dy, int ncols) {
  int n = 19 * N;
  double yc[19], dc[19];
  for (int q = 0; q < ncols; q++) {
    const double *Y = y + (long)q * n;
    double *D = dy + (long)q * n;
    for (int i = 0; i < N; i++) {
      int ip = (i + 1) % N, im = (i + N - 1) % N;
      double cpl = 0.0;
      if (N > 1) cpl = c * (w[i] * (Y[ip] - Y[i]) + w[im] * (Y[im] - Y[i]));
      for (int k = 0; k < 19; k++) yc[k] = Y[k * N + i];
      cell_rhs(yc, dc, cpl, lo[i], istim[i], stimK, b);
      for (int k = 0; k < 19; k++) D[k * N + i] = dc[k];
    }
  }
}
