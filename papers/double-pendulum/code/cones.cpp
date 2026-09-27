// RIGOROUS (interval arithmetic, CAPD): condition (C4) of the paper and the last inequality of (C3), the bounds behind
// the written proofs of Lemma 5 (the local unstable manifold by a graph transform) and Lemma 8 (the local
// lambda-lemma used for Corollary 2).
//
// Stage 1 of prove.cpp is repeated (Krawczyk operator K for f - id on B = p0 + [-rho, rho]^2, and G(K) in B), with K
// compared with inward-rounded bounds of B, which gives the enclosure pl of zeta_p = A^{-1}(p - p0).
// N0 = p0 + A([-a, a] x [-b, b]) is covered by nh sub-boxes (full height, overlapping by a relative 1e-6); on each,
// CAPD encloses D f^ = A^{-1} Df A over one return (derivC1 of rig.h). With [M] the interval hull of these
// enclosures, m11 = min|[M]_11|, m12 = max|[M]_12|, delta = max|det [M]| (interval evaluation) and
// mu_h = m11 - alpha m12, (C4) is
//     mu_h > 1,   kappa = delta / mu_h < 1,   theta = delta / mu_h^2 < 1,   |x_p| < a (mu_h - 1)/(mu_h + 1),
// and zeta_p in int N0 is checked again. kappa bounds the vertical contraction of the graph transform, theta the
// contraction of slopes, mu_h the expansion of secants in the cone (see the paper, Sect. 4.2).
//
// usage: cones <config> <threads> [nh = 100] [control]
//   control = swap:  NEGATIVE CONTROL. The columns of A are exchanged and N0 is the square of half-side b, so that
//                    graphs are taken over the stable direction on a box small enough for [M]_11 to exclude 0;
//                    (C4) must fail because mu_h < 1 and kappa > 1 (vertical expansion by about 1/|lambda_s|).
//   control = shift: NEGATIVE CONTROL. N0 is centred at p0 + 0.6 a v_u instead of p0, so that x_p is about -0.6 a,
//                    beyond a (mu_h - 1)/(mu_h + 1), about 0.56 a; the last inequality must fail and nothing else.
#include "rig.h"

int main(int argc, char** argv) {
  if (argc < 3) { fprintf(stderr, "usage: cones <config> <threads> [nh] [swap|shift]\n"); return 2; }
  { std::ifstream in(argv[1]); std::string line;
    while (std::getline(in, line)) { if (line.empty() || line[0] == '#') continue; std::istringstream ss(line); std::string k, v; ss >> k; while (ss >> v) cfg[k].push_back(v); } }
  int nth = atoi(argv[2]); omp_set_num_threads(nth);
  int nh = argc > 3 ? atoi(argv[3]) : 100;
  std::string control = argc > 4 ? argv[4] : "";
  bool swap = control == "swap", shift = control == "shift";
  // every decimal constant is parsed here, before any interval operation
  bool coupled = D("coupled") != 0; int per = (int)D("per"), shiftT = (int)D("shift");
  double a = D("a"), b = D("b"), alpha = D("alpha"), rk = D("krawczyk_r");
  IVector p0(2); p0[0] = D("p", 0); p0[1] = D("p", 1);
  IMatrix A(2, 2); A[0][0] = D("vu", 0); A[1][0] = D("vu", 1); A[0][1] = D("vs", 0); A[1][1] = D("vs", 1);
  I E = Q("E", 0), g = Q("g");
  if (cfg["E"].size() > 1) E = intervalHull(Q("E", 0), Q("E", 1));
  if (swap) { for (int i = 0; i < 2; ++i) { I t = A[i][0]; A[i][0] = A[i][1]; A[i][1] = t; } a = b; }
  IMatrix Ai = inv2(A), Id(2, 2); Id[0][0] = Id[1][1] = 1;
  IVector c0(2); c0[0] = 0; c0[1] = 0;
  if (shift) { IVector s(2); s[0] = 0.6 * a; s[1] = 0; c0 = A * s; }
  IVector pN = p0 + c0;                                   // centre of N0 (p0 except in the shift control)
  printf("cones: %s, E = %s, N0 = centre + A([-%g, %g] x [-%g, %g]), alpha = %g, %d sub-boxes%s\n",
         coupled ? "coupled double pendulum" : "UNCOUPLED control", S(E).c_str(), a, a, b, b, alpha, nh,
         swap ? "\nNEGATIVE CONTROL: columns of A exchanged, square box (graphs over the stable direction)"
              : shift ? "\nNEGATIVE CONTROL: N0 centred at p0 + 0.6 a v_u" : "");
  std::vector<Ctx*> ctx; for (int i = 0; i < nth; ++i) ctx.push_back(new Ctx(coupled, E, g, 20));
  Ctx& cx0 = *ctx[0];

  // stage 1 again: Krawczyk on B = p0 + [-rho, rho]^2, compared with inward-rounded bounds of B
  IVector rB(2); rB[0] = I(-rk, rk); rB[1] = I(-rk, rk);
  IVector Fp = imageC0(cx0, p0, per, shiftT) - p0;
  IMatrix DfB = derivC1(cx0, p0, Id, rB, per);
  IMatrix Jm(2, 2); for (int i = 0; i < 2; ++i) for (int j = 0; j < 2; ++j) Jm[i][j] = I((DfB[i][j] - Id[i][j]).mid().leftBound());
  IMatrix Cm = inv2(Jm); for (int i = 0; i < 2; ++i) for (int j = 0; j < 2; ++j) Cm[i][j] = I(Cm[i][j].mid().leftBound());
  IVector K = p0 - Cm * Fp + (Id - Cm * (DfB - Id)) * rB;
  double lo[2], hi[2];                                    // inward-rounded bounds of B
  for (int i = 0; i < 2; ++i) { lo[i] = (p0[i] - I(rk)).rightBound(); hi[i] = (p0[i] + I(rk)).leftBound(); }
  bool kin = true, gin = true;
  for (int i = 0; i < 2; ++i) kin = kin && K[i].leftBound() > lo[i] && K[i].rightBound() < hi[i];
  I GK0 = -K[0];                                          // G(t2, p2) = (-t2, p2); p0 lies on t2 = 0
  gin = GK0.leftBound() > lo[0] && GK0.rightBound() < hi[0] && K[1].leftBound() > lo[1] && K[1].rightBound() < hi[1];
  printf("stage 1 (Krawczyk, K compared with inward-rounded bounds of B, rho = %g):\n  K = (%s, %s)\n  K in int B: %s; G(K) in int B: %s\n",
         rk, S(K[0]).c_str(), S(K[1]).c_str(), kin ? "yes" : "NO", gin ? "yes" : "NO");
  REQUIRE(kin, "Krawczyk: K not in int B");
  REQUIRE(gin, "G(K) not in int B");
  IVector pl = Ai * (K - pN);                             // zeta_p in local coordinates
  printf("  zeta_p in (%s, %s)\n", S(pl[0]).c_str(), S(pl[1]).c_str());
  REQUIRE(abs(pl[0]).rightBound() < a && abs(pl[1]).rightBound() < b, "zeta_p not in int N0");

  // (C4): the hull of A^{-1} Df A over N0
  IMatrix H(2, 2); bool first = true; int bad = 0;
  #pragma omp parallel for schedule(dynamic)
  for (int idx = 0; idx < nh; ++idx) {
    Ctx& c = *ctx[omp_get_thread_num()];
    const double ov = 1 + 1e-6, hx = 2 * a / nh;
    IVector rc(2); rc[0] = -a + hx * (idx + 0.5); rc[1] = 0;
    IVector rr(2); rr[0] = I(-hx / 2 * ov, hx / 2 * ov); rr[1] = I(-b * ov, b * ov);
    IVector zc = pN + A * rc; for (int q = 0; q < 2; ++q) zc[q] = I(zc[q].mid().leftBound());
    IVector rcl = Ai * (zc - pN); IVector rrl(2); rrl[0] = rc[0] + rr[0] - rcl[0]; rrl[1] = rc[1] + rr[1] - rcl[1];
    try {
      IMatrix M = Ai * derivC1(c, zc, A, rrl, per) * A;
      #pragma omp critical
      { if (first) { H = M; first = false; } else for (int i = 0; i < 2; ++i) for (int j = 0; j < 2; ++j) H[i][j] = intervalHull(H[i][j], M[i][j]); }
    } catch (std::exception& e) {
      #pragma omp atomic
      ++bad;
    }
  }
  REQUIRE(bad == 0 && !first, "a sub-box of N0 could not be enclosed (%d)", bad);
  if (!first) {
    double m11 = abs(H[0][0]).leftBound(), m12 = abs(H[0][1]).rightBound(), m21 = abs(H[1][0]).rightBound();
    double delta = abs(H[0][0] * H[1][1] - H[0][1] * H[1][0]).rightBound();
    I muh = I(m11) - I(alpha) * I(m12);
    printf("hull of A^-1 Df A over N0:\n  M11 in %s\n  M12 in %s\n  M21 in %s\n  M22 in %s\n", S(H[0][0]).c_str(), S(H[0][1]).c_str(),
           S(H[1][0]).c_str(), S(H[1][1]).c_str());
    printf("  m11 >= %.9g, m12 <= %.9g, m21 <= %.9g, |det| <= delta = %.9g\n", m11, m12, m21, delta);
    printf("  mu_h = m11 - alpha m12 >= %.9g (lower bound, rounded down)\n", muh.leftBound());
    REQUIRE(muh.leftBound() > 1, "(C4) mu_h > 1");
    if (muh.leftBound() > 0) {
      I kap = I(delta) / muh, th = I(delta) / sqr(muh);
      printf("  kappa = delta / mu_h <= %.9g\n  theta = delta / mu_h^2 <= %.9g\n", kap.rightBound(), th.rightBound());
      REQUIRE(kap.rightBound() < 1, "(C4) kappa < 1");
      REQUIRE(th.rightBound() < 1, "(C4) theta < 1");
    }
    if (muh.leftBound() > 1) {
      // a (m - 1)/(m + 1) increases with m, so the lower end of mu_h gives a lower bound of the threshold
      I em = I(a) * (I(muh.leftBound()) - 1) / (I(muh.leftBound()) + 1);
      printf("  |x_p| <= %.6g, a (mu_h - 1)/(mu_h + 1) >= %.6g: %s\n", abs(pl[0]).rightBound(), em.leftBound(),
             abs(pl[0]).rightBound() < em.leftBound() ? "yes" : "NO");
      REQUIRE(abs(pl[0]).rightBound() < em.leftBound(), "(C4) |x_p| < a (mu_h - 1)/(mu_h + 1)");
    }
  }
  if (fails) printf("RESULT: FAIL (%d)\n", fails); else printf("RESULT: (C4) VERIFIED\n");
  return fails ? 1 : 0;
}
