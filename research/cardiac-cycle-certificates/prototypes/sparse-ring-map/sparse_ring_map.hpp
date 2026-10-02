// Prototype (scratchpad): a drop-in replacement for capd::IMap for the TP06 ring, for CAPD's OdeSolver / C1Rect2Set /
// PoincareMap templates. Not derived from IMap on purpose: every member the templates use must be written here, so a
// missing one is a compile error rather than a silent fallback to a C0-only DAG.
//
// C1 ODE coefficients: with x(t) = sum x_k t^k (ring C0 jets, degree-0 CAPD map) and A_k the time coefficients of
// Df(x(t)) (per cell from an 18-dim CAPD map driven through its protected DAG, plus the constant coupling), the matrix
// coefficients satisfy  V_{k+1} = (1/(k+1)) sum_{j=0}^{k} A_j V_{k-j}  (derivative of F_k w.r.t. x_m is A_{k-m}).
#pragma once
#include <algorithm>
#include <vector>
#include "setup.hpp"

class JetMap : public capd::IMap {
 public:
  using capd::IMap::IMap;
  // x[0..p] time coefficients of one cell; A[k](i,j) = k-th time coefficient of d f_i / d x_j along x(t).
  void jacobianJets(const std::vector<capd::IVector>& x, std::vector<capd::IMatrix>& A, int p) {
    using namespace capd::autodiff;
    using capd::interval;
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

template <int N>
class SparseRingMap {
 public:
  typedef capd::IMap Base;
  typedef Base::ScalarType ScalarType;
  typedef Base::VectorType VectorType;
  typedef Base::MatrixType MatrixType;
  typedef Base::size_type size_type;
  typedef Base::HessianType HessianType;
  typedef Base::JetType JetType;
  typedef Base::FunctionType FunctionType;
  static constexpr int n = 18 * N;

  SparseRingMap(const tp06::Physical& ph, ScalarType coupling)
      : ring0_(tp06::ringField<N>, n, n, tp06::P_MAX, 0), cell_(tp06::ringField<1>, 18, 18, tp06::P_MAX, 1), c_(coupling) {
    tp06::setParameters(ring0_, ph, coupling);
    tp06::setParameters(cell_, ph, ScalarType(0.0));
  }
  size_type dimension() const { return n; }
  size_type imageDimension() const { return n; }
  size_type degree() const { return 1; }
  void setOrder(size_type o) { ring0_.setOrder(o); cell_.setOrder(o); }
  size_type getOrder() const { return ring0_.getOrder(); }
  void differentiateTime() const { ring0_.differentiateTime(); cell_.differentiateTime(); }
  void setCurrentTime(const ScalarType& t) const { ring0_.setCurrentTime(t); cell_.setCurrentTime(t); }
  const ScalarType& getCurrentTime() const { return ring0_.getCurrentTime(); }
  const bool* getMask() const { return nullptr; }
  bool getMask(size_type) const { return true; }

  void computeODECoefficients(VectorType iv[], size_type order) const { ring0_.computeODECoefficients(iv, order); }

  void computeODECoefficients(VectorType iv[], MatrixType im[], size_type order) const {
    ring0_.computeODECoefficients(iv, order);
    const int p = int(order);
    if (p == 0) return;
    // per-cell Jacobian jets A_0 .. A_{p-1}
    ensure(p);
    for (int cell = 0; cell < N; ++cell) {
      for (int k = 0; k < p; ++k) for (int i = 0; i < 18; ++i) xc_[k][i] = iv[k][18 * cell + i];
      cell_.jacobianJets(xc_, A_[cell], p - 1);
    }
    // band half-width (in cells) of the seed im[0]: smallest b with all blocks at ring distance > b exactly zero
    int b0 = 0;
    for (int i = 0; i < n; ++i) for (int j = 0; j < n; ++j) {
      const ScalarType& v = im[0](i + 1, j + 1);
      if (v.leftBound() != 0.0 || v.rightBound() != 0.0) b0 = std::max(b0, dist(i / 18, j / 18));
    }
    for (int k = 0; k < p; ++k) {
      MatrixType& out = im[k + 1];
      out.clear();
      for (int j = 0; j <= k; ++j) {
        const MatrixType& W = im[k - j];
        const int reach = b0 + (k - j);  // nonzero column cells of W lie within this ring distance of the row cell
        for (int cell = 0; cell < N; ++cell) {
          const MatrixType& Aj = A_[cell][j];
          for (int r = 0; r < 18; ++r) {
            const int row = 18 * cell + r;
            for (int cc = 0; cc < 18; ++cc) {
              const ScalarType a = Aj(r + 1, cc + 1);
              if (a.leftBound() == 0.0 && a.rightBound() == 0.0) continue;  // exact structural zero
              axpyRow(out, row, a, W, 18 * cell + cc, cell, reach);
            }
            if (j == 0 && r == 0) {  // constant coupling c (V_{cell-1} - 2 V_cell + V_{cell+1})
              axpyRow(out, row, c_, W, 18 * ((cell + N - 1) % N), (cell + N - 1) % N, reach);
              axpyRow(out, row, c_, W, 18 * ((cell + 1) % N), (cell + 1) % N, reach);
              axpyRow(out, row, ScalarType(-2.0) * c_, W, 18 * cell, cell, reach);
            }
          }
        }
      }
      ScalarType inv = ScalarType(1.0) / ScalarType(double(k + 1));
      for (int i = 1; i <= n; ++i) for (int q = 1; q <= n; ++q) out(i, q) *= inv;
    }
  }

  VectorType operator()(const VectorType& x) const { return ring0_(x); }
  VectorType operator()(ScalarType t, const VectorType& x) const { ring0_.setCurrentTime(t); return ring0_(x); }
  MatrixType derivative(const VectorType& x) const { return jacobian(x); }
  MatrixType derivative(ScalarType t, const VectorType& x) const { setCurrentTime(t); return jacobian(x); }
  MatrixType operator[](const VectorType& x) const { return jacobian(x); }
  VectorType operator()(const VectorType& x, MatrixType& M) const { M = jacobian(x); return ring0_(x); }
  VectorType operator()(ScalarType t, const VectorType& x, MatrixType& M) const { setCurrentTime(t); M = jacobian(x); return ring0_(x); }

 private:
  static int dist(int a, int b) { int d = std::abs(a - b); return std::min(d, N - d); }
  void ensure(int p) const {
    if (int(xc_.size()) < p) xc_.assign(p, VectorType(18));
    if (A_.empty() || int(A_[0].size()) < p) A_.assign(N, std::vector<MatrixType>(p, MatrixType(18, 18)));
  }
  // out(row,:) += a * W(srcRow,:) restricted to column cells within `reach` of `srcCell` (all columns if reach covers the ring)
  static void axpyRow(MatrixType& out, int row, const ScalarType& a, const MatrixType& W, int srcRow, int srcCell, int reach) {
    if (2 * reach + 1 >= N) { for (int q = 1; q <= n; ++q) out(row + 1, q) += a * W(srcRow + 1, q); return; }
    for (int dc = -reach; dc <= reach; ++dc) {
      int cl = ((srcCell + dc) % N + N) % N;
      for (int q = 18 * cl + 1; q <= 18 * cl + 18; ++q) out(row + 1, q) += a * W(srcRow + 1, q);
    }
  }
  MatrixType jacobian(const VectorType& x) const {
    MatrixType J(n, n);
    for (int cell = 0; cell < N; ++cell) {
      VectorType xs(18);
      for (int i = 0; i < 18; ++i) xs[i] = x[18 * cell + i];
      MatrixType Jc = cell_.derivative(xs);
      for (int i = 1; i <= 18; ++i) for (int j = 1; j <= 18; ++j) J(18 * cell + i, 18 * cell + j) = Jc(i, j);
      J(18 * cell + 1, 18 * ((cell + N - 1) % N) + 1) += c_;
      J(18 * cell + 1, 18 * ((cell + 1) % N) + 1) += c_;
      J(18 * cell + 1, 18 * cell + 1) += ScalarType(-2.0) * c_;
    }
    return J;
  }
  mutable Base ring0_;
  mutable JetMap cell_;
  ScalarType c_;
  mutable std::vector<VectorType> xc_;
  mutable std::vector<std::vector<MatrixType>> A_;
};
