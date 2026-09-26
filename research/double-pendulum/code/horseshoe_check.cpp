// RIGOROUS (interval arithmetic, CAPD): covering relations X =P=> Y between h-sets X = c + B [-1,1]^2 in the
// section coordinates (t2, p2), with one nominally expanding direction (the first column of B), in the sense of
// Zgliczynski and Gidea, J. Differential Equations 202 (2004) 32-58, Theorem 16 (u = 1). For each relation:
//   (76) the image of the midline {(x, 0): |x| <= 1} lies in |y| < 1 (Y's coordinates),
//   (77) P(X) does not meet Y+ = {|x| <= 1, |y| = 1},
//   (78)/(79) P(left edge) lies in {x < -1} and P(right edge) in {x > 1}, or the reverse.
// Also: all h-sets pairwise disjoint on the cylinder, and a bound on the return time over all sets.
// Then the transition graph gives a subshift of finite type Sigma_A and a continuous surjection from a compact
// P-invariant set onto Sigma_A (ZG Corollary 12 plus disjointness), so h_top(P) >= log(spectral radius of A).
//
// usage: horseshoe_check <config> [threads] [pieces]
#include "rig.h"
#include <set>

struct HSet { std::string name; IVector c; IMatrix B, Bi; };
static std::vector<HSet> sets;
static int idx(const std::string& n) { for (size_t i = 0; i < sets.size(); ++i) if (sets[i].name == n) return (int)i; fprintf(stderr, "no set %s\n", n.c_str()); exit(2); }

// enclosure of P over the piece rc + rr (X's normalized coordinates), in Y's normalized coordinates
static IVector image(Ctx& c, const HSet& X, const HSet& Y, int shift, const IVector& rc, const IVector& rr, I* rt) {
  IVector zc = X.c + X.B * rc; for (int q = 0; q < 2; ++q) zc[q] = I(zc[q].mid().leftBound());
  IVector rcl = X.Bi * (zc - X.c);
  IVector rrl = rc + rr - rcl;                      // offsets of the piece from zc, in X's coordinates
  if (!liftable(c, zc + X.B * rrl)) throw std::runtime_error("piece outside the section domain");
  IMatrix Df = derivC1(c, zc, X.B, rrl, 1, rt);
  IMatrix J = Y.Bi * Df * X.B;
  return Y.Bi * (imageC0(c, zc, 1, shift) - Y.c) + J * rrl;
}
static bool meets(const I& a, double lo, double hi) { return !(a.rightBound() < lo || a.leftBound() > hi); }

int main(int argc, char** argv) {
  std::vector<std::vector<std::string>> trans;
  { std::ifstream in(argv[1]); std::string line;
    while (std::getline(in, line)) { if (line.empty() || line[0] == '#') continue; std::istringstream ss(line); std::string k; ss >> k;
      if (k == "set") { HSet h; ss >> h.name; double v[6]; for (double& x : v) ss >> x; h.c = IVector(2); h.c[0] = v[0]; h.c[1] = v[1];
        h.B = IMatrix(2, 2); h.B[0][0] = v[2]; h.B[0][1] = v[3]; h.B[1][0] = v[4]; h.B[1][1] = v[5]; h.Bi = inv2(h.B); sets.push_back(h); }
      else if (k == "trans") { std::string a, b, s; ss >> a >> b >> s; trans.push_back({a, b, s}); }
      else { std::string v; while (ss >> v) cfg[k].push_back(v); } } }
  int nth = argc > 2 ? atoi(argv[2]) : 4, npc = argc > 3 ? atoi(argv[3]) : 64; omp_set_num_threads(nth);
  I E = Q("E"), g = I(1);
  std::vector<Ctx*> ctx; for (int i = 0; i < nth; ++i) ctx.push_back(new Ctx(true, E, g, 20));
  printf("classical double pendulum, E = %s; %zu h-sets, %zu covering relations to check (pieces per edge %d)\n", S(E).c_str(), sets.size(), trans.size(), npc);
  double Tmax = 0; int bad = 0;
  for (auto& t : trans) {
    const HSet& X = sets[idx(t[0])]; const HSet& Y = sets[idx(t[1])]; int sh = atoi(t[2].c_str());
    // work items: edges (kind 0 left, 1 right), midline (2), whole set (3)
    struct W { int kind; double a0, a1, b0, b1; int depth; };
    std::vector<W> work;
    for (int i = 0; i < npc; ++i) {
      double lo = -1 + 2.0 * i / npc, hi = i + 1 == npc ? 1.0 : -1 + 2.0 * (i + 1) / npc;
      work.push_back({0, -1, -1, lo, hi, 0}); work.push_back({1, 1, 1, lo, hi, 0}); work.push_back({2, lo, hi, 0, 0, 0});
      for (int j = 0; j < 4; ++j) work.push_back({3, lo, hi, -1 + 0.5 * j, j == 3 ? 1.0 : -1 + 0.5 * (j + 1), 0});
    }
    bool leNeg = true, lePos = true, reNeg = true, rePos = true; int fails = 0; long npieces = 0; double ymid = 0;
    double tmax = 0;
    while (!work.empty()) {
      std::vector<W> next;
      #pragma omp parallel for schedule(dynamic)
      for (size_t w = 0; w < work.size(); ++w) {
        Ctx& c = *ctx[omp_get_thread_num()]; W p = work[w];
        IVector rc(2), rr(2);
        rc[0] = 0.5 * (p.a0 + p.a1); rc[1] = 0.5 * (p.b0 + p.b1);
        rr[0] = I(p.a0, p.a1) - rc[0]; rr[1] = I(p.b0, p.b1) - rc[1];
        bool ok = true, split = false; IVector im(2); I rt;
        try { im = image(c, X, Y, sh, rc, rr, &rt); } catch (std::exception& e) { ok = false; split = true; }
        #pragma omp critical
        {
          ++npieces;
          if (ok) tmax = std::max(tmax, rt.rightBound());
          if (ok && p.kind == 0) { if (!(im[0].rightBound() < -1)) leNeg = false; if (!(im[0].leftBound() > 1)) lePos = false; }
          if (ok && p.kind == 1) { if (!(im[0].rightBound() < -1)) reNeg = false; if (!(im[0].leftBound() > 1)) rePos = false; }
          if (ok && p.kind == 2) { if (!(im[1].leftBound() > -1 && im[1].rightBound() < 1)) { ok = false; split = true; }
                                   else ymid = std::max(ymid, std::max(fabs(im[1].leftBound()), fabs(im[1].rightBound()))); }
          if (ok && p.kind == 3) { if (meets(im[0], -1, 1) && (im[1].contains(1.0) || im[1].contains(-1.0))) { ok = false; split = true; } }
          if (!ok) {
            if (p.depth >= 14 || !split) ++fails;
            else if (p.kind == 2) { double m = 0.5 * (p.a0 + p.a1); next.push_back({2, p.a0, m, 0, 0, p.depth + 1}); next.push_back({2, m, p.a1, 0, 0, p.depth + 1}); }
            else if (p.kind == 3) { double m = 0.5 * (p.a0 + p.a1), n = 0.5 * (p.b0 + p.b1);
              next.push_back({3, p.a0, m, p.b0, n, p.depth + 1}); next.push_back({3, m, p.a1, p.b0, n, p.depth + 1});
              next.push_back({3, p.a0, m, n, p.b1, p.depth + 1}); next.push_back({3, m, p.a1, n, p.b1, p.depth + 1}); }
            else { double n = 0.5 * (p.b0 + p.b1); next.push_back({p.kind, p.a0, p.a1, p.b0, n, p.depth + 1}); next.push_back({p.kind, p.a0, p.a1, n, p.b1, p.depth + 1}); }
          }
        }
      }
      work.swap(next);
    }
    bool edges = (leNeg && rePos) || (lePos && reNeg);
    bool okT = edges && fails == 0;
    Tmax = std::max(Tmax, tmax);
    printf("  %-4s => %-4s (shift %2d): edges %s, midline max|y| %.3f, pieces %ld, unresolved %d: %s\n", X.name.c_str(), Y.name.c_str(), sh,
           edges ? (leNeg ? "left->left, right->right" : "left->right, right->left") : "NOT separated", ymid, npieces, fails, okT ? "covers" : "FAIL");
    if (!okT) ++bad;
  }
  // pairwise disjointness on the cylinder (shift the centre of X by a multiple of 2 pi towards Y)
  int nd = 0;
  for (size_t i = 0; i < sets.size(); ++i) for (size_t j = i + 1; j < sets.size(); ++j) {
    const HSet& X = sets[i]; const HSet& Y = sets[j];
    double k = std::round((Y.c[0].mid().leftBound() - X.c[0].mid().leftBound()) / (2 * M_PI));
    bool disj = true;
    for (int dk = -1; dk <= 1 && disj; ++dk) {               // also the neighbouring lifts
      IVector cx = X.c + twoPi(I(k + dk));
      IVector box(2); box[0] = I(-1, 1); box[1] = I(-1, 1);
      IVector w = Y.Bi * (cx - Y.c) + (Y.Bi * X.B) * box;      // X in Y's coordinates
      IVector w2 = X.Bi * (Y.c - cx) + (X.Bi * Y.B) * box;     // Y in X's coordinates
      bool sepA = !(meets(w[0], -1, 1) && meets(w[1], -1, 1)), sepB = !(meets(w2[0], -1, 1) && meets(w2[1], -1, 1));
      if (!(sepA || sepB)) disj = false;
    }
    if (!disj) { printf("  NOT DISJOINT: %s %s\n", X.name.c_str(), Y.name.c_str()); ++nd; }
  }
  printf("pairwise disjointness of the %zu h-sets on the cylinder: %s\n", sets.size(), nd ? "FAIL" : "yes");
  // spectral radius of the transition graph: loops through N of lengths 1 and L+2 = number of M sets + 1
  int nM = (int)sets.size() - 1, len = nM + 1;
  // largest root r of r^len = r^(len-1) + 1; certify r > r_lo by F(r_lo) < 0 in interval arithmetic
  double r = 1.5; for (int it = 0; it < 200; ++it) { double f = pow(r, len) - pow(r, len - 1) - 1, df = len * pow(r, len - 1) - (len - 1) * pow(r, len - 2); r -= f / df; }
  double rlo = r * (1 - 1e-12);
  I F = power(I(rlo), len) - power(I(rlo), len - 1) - 1;
  bool rok = F.rightBound() < 0;
  I h = log(I(rlo));
  printf("transition graph: loop N->N (length 1) and N->M0->...->M%d->N (length %d); largest root of r^%d = r^%d + 1 exceeds %.12f: %s\n",
         nM - 1, len, len, len - 1, rlo, rok ? "yes" : "NO");
  printf("  h_top(P) >= log r > %.9f per return; return time <= %.9f, so h_top(flow) >= %.9f per unit time\n",
         h.leftBound(), Tmax, (h / I(Tmax)).leftBound());
  if (bad || nd || !rok) { printf("RESULT: FAIL\n"); return 1; }
  printf("RESULT: ALL COVERING RELATIONS VERIFIED\n");
  return 0;
}
