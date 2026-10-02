// Prototype (scratchpad only): C1 ODE Taylor coefficients of the ring from
//   (a) ring C0 jets (degree-0 CAPD map),
//   (b) per-cell Jacobian time-jets A_k = [Df_cell(x(t))]_k from a single-cell CAPD map driven through its
//       protected DAG (seed d x_0 = I at order 0, zero at higher orders),
//   (c) the matrix recursion V_{k+1} = (1/(k+1)) sum_{j<=k} A_j V_{k-j}, exploiting cell sparsity and the band.
// Compared with CAPD's own C1 computeODECoefficients at small N.
#include <chrono>
#include <cstdio>
#include <fstream>
#include <vector>
#include "setup.hpp"
using namespace capd;
using clk = std::chrono::steady_clock;
static double wa0(const interval& v) { return v.rightBound() - v.leftBound(); }
static double secs(clk::time_point a) { return std::chrono::duration<double>(clk::now() - a).count(); }

class JetMap : public IMap {
 public:
  using IMap::IMap;
  // x[0..p]: time coefficients of one cell's trajectory. Out: A[k](i,j) = k-th time coefficient of d f_i/d x_j.
  void jacobianJets(const std::vector<IVector>& x, std::vector<IMatrix>& A, int p) {
    using namespace capd::autodiff;
    const int d = this->dimension();
    for (int i = 0; i < d; ++i)
      for (int k = 0; k <= p; ++k) {
        this->m_dag(VarNo(i), CoeffNo(k)) = x[k][i];
        for (int j = 0; j < d; ++j) this->m_dag(VarNo(i), DerNo(j), CoeffNo(k)) = (k == 0 && i == j) ? interval(1.0) : interval(0.0);
      }
    for (int k = 0; k <= p; ++k) {
      this->eval(1, CoeffNo(k));
      for (int i = 0; i < d; ++i)
        for (int j = 0; j < d; ++j) A[k](i + 1, j + 1) = this->m_dag(VarNo(this->m_pos[i]), DerNo(j), CoeffNo(k));
    }
  }
};

struct Sparse18 {  // nonzero pattern of an 18x18 block (union over orders)
  std::vector<int> rowStart, col;
};

// Matrix recursion. V[k] dense n x n (row-major interval arrays). A[cell][k] 18x18. If banded (V[0] = I), only the
// column cells within ring distance <= k of the row cell can be nonzero in V[k].
template <int N>
void recursion(const std::vector<std::vector<IMatrix>>& A, const interval& c, std::vector<std::vector<interval>>& V, int p,
               bool banded, const Sparse18& S) {
  const int n = 18 * N;
  auto dist = [&](int a, int b) { int d = std::abs(a - b); return std::min(d, N - d); };
  std::vector<interval> acc(n);
  for (int k = 0; k < p; ++k) {
    std::vector<interval>& out = V[k + 1];
    std::fill(out.begin(), out.end(), interval(0.0));
    for (int j = 0; j <= k; ++j) {
      const std::vector<interval>& W = V[k - j];
      const int reach = banded ? (k - j) : N;  // columns cells of W within this distance of the source row cell
      for (int cell = 0; cell < N; ++cell) {
        const IMatrix& Aj = A[cell][j];
        for (int r = 0; r < 18; ++r) {
          int row = 18 * cell + r;
          interval* o = &out[size_t(row) * n];
          for (int t = S.rowStart[r]; t < S.rowStart[r + 1]; ++t) {
            int cc = S.col[t];
            const interval a = Aj(r + 1, cc + 1);
            if (a.leftBound() == 0.0 && a.rightBound() == 0.0) continue;
            const interval* w = &W[size_t(18 * cell + cc) * n];
            if (reach >= N / 2) { for (int q = 0; q < n; ++q) o[q] += a * w[q]; }
            else for (int dc = -reach; dc <= reach; ++dc) {
              int cl = ((cell + dc) % N + N) % N;
              for (int q = 18 * cl; q < 18 * cl + 18; ++q) o[q] += a * w[q];
            }
          }
          if (j == 0 && r == 0) {  // coupling c (V_{cell-1} - 2 V_cell + V_{cell+1}), constant in time
            for (int s : {-1, 1}) {
              int nb = (cell + s + N) % N;
              const interval* w = &W[size_t(18 * nb) * n];
              if (reach + 1 >= N / 2) { for (int q = 0; q < n; ++q) o[q] += c * w[q]; }
              else for (int dc = -reach; dc <= reach; ++dc) {
                int cl = ((nb + dc) % N + N) % N;
                for (int q = 18 * cl; q < 18 * cl + 18; ++q) o[q] += c * w[q];
              }
            }
            const interval* w = &W[size_t(18 * cell) * n];
            interval m2 = -2.0 * c;
            if (reach >= N / 2) { for (int q = 0; q < n; ++q) o[q] += m2 * w[q]; }
            else for (int dc = -reach; dc <= reach; ++dc) {
              int cl = ((cell + dc) % N + N) % N;
              for (int q = 18 * cl; q < 18 * cl + 18; ++q) o[q] += m2 * w[q];
            }
          }
        }
      }
    }
    interval inv = interval(1.0) / interval(double(k + 1));
    for (auto& v : out) v *= inv;
  }
}

template <int N>
int runN(const char* orbitFile, int p, bool compare, double boxRad) {
  const int n = 18 * N;
  std::ifstream in(orbitFile);
  int NN; double T, res; in >> NN >> T >> res;
  IVector x(n);
  for (int i = 0; i < n; ++i) { double v; in >> v; x[i] = interval(v - boxRad * std::abs(v), v + boxRad * std::abs(v)); }
  interval coupling = interval(double(N * N)) / interval(64000.0);

  auto t0 = clk::now();
  IMap ring0(tp06::ringField<N>, n, n, tp06::P_MAX, 0);
  tp06::Physical ph;
  tp06::setParameters(ring0, ph, coupling);
  ring0.setOrder(p + 1);
  std::printf("N=%d build degree-0 ring map %.2fs\n", N, secs(t0));
  JetMap cellMap(tp06::ringField<1>, 18, 18, tp06::P_MAX, 1);
  tp06::setParameters(cellMap, ph, interval(0.0));
  cellMap.setOrder(p + 1);

  // (a) C0 jets of the ring
  t0 = clk::now();
  std::vector<IVector> xs(p + 2, IVector(n));
  xs[0] = x;
  ring0.computeODECoefficients(xs.data(), p);
  double tC0 = secs(t0);
  // (b) per-cell Jacobian jets
  t0 = clk::now();
  std::vector<std::vector<IMatrix>> A(N, std::vector<IMatrix>(p + 1, IMatrix(18, 18)));
  std::vector<IVector> xc(p + 1, IVector(18));
  for (int cell = 0; cell < N; ++cell) {
    for (int k = 0; k <= p; ++k) for (int i = 0; i < 18; ++i) xc[k][i] = xs[k][18 * cell + i];
    cellMap.jacobianJets(xc, A[cell], p);
  }
  double tJ = secs(t0);
  Sparse18 S; S.rowStart.assign(19, 0);
  { int nnz = 0; for (int r = 0; r < 18; ++r) { S.rowStart[r] = nnz;
      for (int cc = 0; cc < 18; ++cc) { bool nz = false;
        for (int cell = 0; cell < N && !nz; ++cell) for (int k = 0; k <= p && !nz; ++k) { interval a = A[cell][k](r + 1, cc + 1); nz = !(a.leftBound() == 0.0 && a.rightBound() == 0.0); }
        if (nz) { S.col.push_back(cc); ++nnz; } } }
    S.rowStart[18] = nnz; std::printf("nonzeros per 18x18 cell Jacobian (union over cells, orders): %d\n", nnz); }
  {
    double rowAbsMax = 0, muAbs = -1e300; int worstRow = -1;
    for (int cell = 0; cell < N; ++cell) for (int r = 0; r < 18; ++r) {
      double sAbs = 0, mu = 0;
      for (int cc = 0; cc < 18; ++cc) { interval a = A[cell][0](r + 1, cc + 1); double m = std::max(std::abs(a.leftBound()), std::abs(a.rightBound()));
        sAbs += m; mu += (cc == r) ? a.rightBound() : m; }
      if (r == 0) { double cpl = 4.0 * coupling.rightBound(); sAbs += cpl; mu += cpl; }
      if (sAbs > rowAbsMax) { rowAbsMax = sAbs; worstRow = r; }
      muAbs = std::max(muAbs, mu);
    }
    std::printf("||A_0||_inf (abs row sums, scaled vars) = %.4g (worst row %d); abs log-norm mu = %.4g per ms\n", rowAbsMax, worstRow, muAbs);
    std::printf("cell-0 row abs sums:"); for (int r = 0; r < 18; ++r) { double sAbs = 0; for (int cc = 0; cc < 18; ++cc) { interval a = A[0][0](r + 1, cc + 1); sAbs += std::max(std::abs(a.leftBound()), std::abs(a.rightBound())); } std::printf(" %.3g", sAbs); } std::printf("\n");
    std::printf("cell-0 diagonal:"); for (int r = 0; r < 18; ++r) std::printf(" %.3g", A[0][0](r + 1, r + 1).mid().leftBound()); std::printf("\n");
    std::printf("||x_k||_inf:"); for (int k = 0; k <= p; ++k) { double m = 0; for (int i = 0; i < n; ++i) m = std::max(m, std::abs(xs[k][i].mid().leftBound())); std::printf(" %d:%.2e", k, m); } std::printf("\n");
  }
  // (c) recursion, banded (identity seed)
  std::vector<std::vector<interval>> V(p + 1, std::vector<interval>(size_t(n) * n, interval(0.0)));
  for (int i = 0; i < n; ++i) V[0][size_t(i) * n + i] = 1.0;
  t0 = clk::now();
  recursion<N>(A, coupling, V, p, true, S);
  double tRb = secs(t0);
  { std::printf("||Psi_k||_inf:"); for (int k = 0; k <= p; ++k) { double m = 0; for (int i = 0; i < n; ++i) { double r = 0; for (int j = 0; j < n; ++j) { interval v = V[k][size_t(i) * n + j]; r += std::max(std::abs(v.leftBound()), std::abs(v.rightBound())); } m = std::max(m, r); } std::printf(" %d:%.2e", k, m); } std::printf("\n"); }
  std::printf("times: C0 ring jets %.3fs, Jacobian jets (all cells) %.3fs, banded recursion %.3fs\n", tC0, tJ, tRb);
  // dense seed (as in the remainder): V0 = I + 1e-3 * ones-ish interval, time it
  {
    std::vector<std::vector<interval>> W(p + 1, std::vector<interval>(size_t(n) * n, interval(0.0)));
    for (int i = 0; i < n; ++i) for (int j = 0; j < n; ++j) W[0][size_t(i) * n + j] = (i == j ? interval(1.0) : interval(0.0)) + interval(-1e-9, 1e-9);
    t0 = clk::now();
    recursion<N>(A, coupling, W, p, false, S);
    std::printf("dense-seed recursion %.3fs\n", secs(t0));
  }
  if (!compare) return 0;
  // CAPD reference C1 coefficients with identity seed
  t0 = clk::now();
  IMap ring1(tp06::ringField<N>, n, n, tp06::P_MAX, 1);
  tp06::setParameters(ring1, ph, coupling);
  ring1.setOrder(p + 1);
  std::vector<IVector> ys(p + 2, IVector(n));
  std::vector<IMatrix> M(p + 2, IMatrix(n, n));
  ys[0] = x; M[0].setToIdentity();
  auto t1 = clk::now();
  ring1.computeODECoefficients(ys.data(), M.data(), p);
  std::printf("CAPD C1 coefficients: build+alloc %.2fs, computeODECoefficients %.3fs\n", std::chrono::duration<double>(t1 - t0).count(), secs(t1));
  int disjoint = 0; double maxRelDiff = 0, sumWc = 0, sumWr = 0, maxWratio = 0;
  for (int k = 0; k <= p; ++k)
    for (int i = 0; i < n; ++i) for (int j = 0; j < n; ++j) {
      interval a = V[k][size_t(i) * n + j], b = M[k](i + 1, j + 1);
      if (a.rightBound() < b.leftBound() || b.rightBound() < a.leftBound()) ++disjoint;
      double ma = a.mid().leftBound(), mb = b.mid().leftBound(), sc = std::max({std::abs(ma), std::abs(mb), 1e-300});
      if (std::abs(mb) > 1e3 * std::max(wa0(a), wa0(b)) && std::abs(mb) > 1e-200) maxRelDiff = std::max(maxRelDiff, std::abs(ma - mb) / sc);
      double wa = a.rightBound() - a.leftBound(), wb = b.rightBound() - b.leftBound();
      sumWc += wa; sumWr += wb; if (wb > 0) maxWratio = std::max(maxWratio, wa / wb);
    }
  std::printf("compare: disjoint entries %d, max relative midpoint difference %.3e, total width custom/CAPD %.4f, max entry width ratio %.3f\n",
              disjoint, maxRelDiff, sumWc / sumWr, maxWratio);
  for (int k = 0; k <= p; ++k) {
    int dis = 0;
    for (int i = 0; i < n; ++i) if (xs[k][i].rightBound() < ys[k][i].leftBound() || ys[k][i].rightBound() < xs[k][i].leftBound()) ++dis;
    if (dis) std::printf("C0 coefficient %d: %d disjoint\n", k, dis);
  }
  return 0;
}

int main(int argc, char** argv) {
  int N = std::atoi(argv[1]); int p = std::atoi(argv[3]); bool cmp = std::atoi(argv[4]); double rad = std::atof(argv[5]);
  switch (N) {
    case 8: return runN<8>(argv[2], p, cmp, rad);
    case 16: return runN<16>(argv[2], p, cmp, rad);
    case 32: return runN<32>(argv[2], p, cmp, rad);
    case 64: return runN<64>(argv[2], p, cmp, rad);
  }
  return 2;
}
