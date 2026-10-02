// ap_proof: the program for a computer-assisted proof of action-potential reentry in a ring of N baseline TP06
// cells (ap-reentry/SCOPING.md section 6; runbook ap-reentry/RUNBOOK.md). Subcommands:
//
//   ap_proof leafbox  FRAME OUTDIR             start sets on the conserved-charge leaf: OUTDIR/leaf_affine.txt (C1 box,
//                                               affine in the frame, with a rigorous remainder for the nonlinear K_0
//                                               graph), OUTDIR/leaf_point.txt (centre), OUTDIR/leaf_ref.txt (shifted
//                                               centre, subtracted from the centre image in multiprecision)
//   ap_proof segment  PLAN I KIND OUTDIR       one segment of the shift interval (KIND c1 | c0 | mp0); resumes from
//                                               OUTDIR/seg<I>_<KIND>.ckpt when present
//   ap_proof chain    PLAN KIND OUTDIR [REF]   composes the segments (containment of every start set, product of the
//                                               derivatives, sum of the times); with REF, the final image minus REF
//   ap_proof verify   FRAME OUTDIR OUT.json    contraction test on the leaf in the frame (verify.cpp's design) with
//                                               the C1 chain and the centre chain (mp0, else c0)
//   ap_proof ghk-unit OUT                      window coefficients and tail bounds (for proof/check_ghk.py)
//   ap_proof field    STATES OUT MODES         double-interval field at given scaled states (for proof/check_field.py)
//
// Status: pilot / dry run. No theorem has been established with this program.
#include "engine.hpp"

using namespace capd;
using namespace apx;

// ---------- text I/O (exact: %a hexadecimal for doubles, base-16 MPFR strings for MP) ----------
static void putI(std::ostream& o, const interval& v) { o << hexd(v.leftBound()) << " " << hexd(v.rightBound()); }
static void putI(std::ostream& o, const MpInterval& v) { o << mpio::str(v.leftBound()) << " " << mpio::str(v.rightBound()); }
static void getI(std::istream& in, interval& v) { std::string a, b; in >> a >> b; if (!in) throw std::runtime_error("short file"); v = interval(unhex(a), unhex(b)); }
static void getI(std::istream& in, MpInterval& v) {
  std::string a, b; in >> a >> b;
  if (!in) throw std::runtime_error("short file");
  if (a.find('#') == std::string::npos) { v = MpInterval(unhex(a), unhex(b)); return; }  // double-format file read into MP
  v = MpInterval(mpio::parse(a), mpio::parse(b));
}
template <class V> static void putV(std::ostream& o, const V& v) { o << v.dimension() << "\n"; for (size_t i = 0; i < v.dimension(); ++i) { putI(o, v[i]); o << "\n"; } }
template <class V> static void getV(std::istream& in, V& v) { size_t n; in >> n; if (n != v.dimension()) throw std::runtime_error("vector dimension"); for (size_t i = 0; i < n; ++i) getI(in, v[i]); }
template <class M> static void putM(std::ostream& o, const M& m) {
  o << m.numberOfRows() << " " << m.numberOfColumns() << "\n";
  for (size_t i = 0; i < m.numberOfRows(); ++i) for (size_t k = 0; k < m.numberOfColumns(); ++k) { putI(o, m[i][k]); o << "\n"; }
}
template <class M> static void getM(std::istream& in, M& m) {
  size_t r, c; in >> r >> c;
  if (r != m.numberOfRows() || c != m.numberOfColumns()) throw std::runtime_error("matrix dimension");
  for (size_t i = 0; i < r; ++i) for (size_t k = 0; k < c; ++k) getI(in, m[i][k]);
}
static void atomicWrite(const std::string& path, const std::string& content) {
  std::string tmp = path + ".tmp";
  { std::ofstream o(tmp); o << content; o.flush(); if (!o) throw std::runtime_error("write failed: " + path); }
  std::rename(tmp.c_str(), path.c_str());
}
static std::string jsonEsc(const std::string& s) {
  std::string o;
  for (char c : s) { if (c == '"' || c == '\\') { o += '\\'; o += c; } else if (c == '\n') o += "\\n"; else if (c >= 32) o += c; }
  return o;
}
static std::string ivs(const interval& v) { std::ostringstream o; o << std::setprecision(17) << "[" << v.leftBound() << ", " << v.rightBound() << "]"; return o.str(); }

// ---------- frame on the leaf ----------
struct Frame {
  int N = 0, dim = 0, n = 0; std::string coupling;
  double Q0 = 0;
  std::vector<double> u;               // leaf centre (n), scaled, state order without indices 0 (V_0) and 18 (K_0)
  DMatrix At;                          // n x n
  std::vector<int> bs; std::vector<double> rho;
  std::vector<int> idx;                // leaf coordinate j -> state index
};
static Frame readFrame(const std::string& path) {
  std::ifstream in(path);
  if (!in) throw std::runtime_error("cannot read frame " + path);
  Frame F;
  std::string q;
  in >> F.N >> F.coupling >> q;
  F.Q0 = unhex(q);
  F.dim = NS * F.N; F.n = F.dim - 2;
  for (int i = 0; i < F.dim; ++i) if (i != 0 && i != 18) F.idx.push_back(i);
  F.u.resize(F.n);
  for (int j = 0; j < F.n; ++j) { std::string s; in >> s; F.u[j] = unhex(s); }
  F.At = DMatrix(F.n, F.n);
  for (int i = 0; i < F.n; ++i) for (int k = 0; k < F.n; ++k) { std::string s; in >> s; F.At[i][k] = unhex(s); }
  int nb; in >> nb;
  int tot = 0;
  for (int b = 0; b < nb; ++b) { int s; std::string r; in >> s >> r; F.bs.push_back(s); F.rho.push_back(unhex(r)); tot += s; if (s < 1 || s > 2 || !(F.rho.back() > 0)) throw std::runtime_error("bad block"); }
  if (!in || tot != F.n) throw std::runtime_error("frame blocks do not cover the leaf");
  return F;
}

// Rigorous inverse of At (verify.cpp): R approximate inverse, E = I - R At, e = ||E||_inf < 1/2,
// At^{-1} = R + sum_{k>=1} E^k R, entrywise |.| <= e/(1-e) max_k |R_kj|.
static IMatrix rigorousInverse(const DMatrix& Ad, double& eOut) {
  int n = Ad.numberOfRows();
  IMatrix At(n, n);
  for (int i = 0; i < n; ++i) for (int k = 0; k < n; ++k) At[i][k] = Ad[i][k];
  DMatrix Rd = capd::matrixAlgorithms::gaussInverseMatrix(Ad);
  IMatrix R(n, n);
  for (int i = 0; i < n; ++i) for (int k = 0; k < n; ++k) R[i][k] = Rd[i][k];
  IMatrix E = IMatrix::Identity(n) - R * At;
  double e = 0;
  for (int i = 0; i < n; ++i) { interval rs = 0; for (int k = 0; k < n; ++k) rs += interval(mag(E[i][k])); e = std::max(e, up(rs)); }
  if (!(e < 0.5)) throw std::runtime_error("approximate inverse of the frame too poor");
  interval fac = interval(e) / (1.0 - interval(e));
  IMatrix inv = R;
  for (int k = 0; k < n; ++k) {
    double cmax = 0;
    for (int i = 0; i < n; ++i) cmax = std::max(cmax, std::abs(Rd[i][k]));
    double d = up(fac * interval(cmax));
    for (int i = 0; i < n; ++i) inv[i][k] += interval(-d, d);
  }
  eOut = e;
  return inv;
}

// iota: leaf u (interval, n) -> state (dim) with V_0 = level and K_0 = (Q0 - R(u)) / sigma_K (R = Q with K_0 := 0).
static IVector iota(IMap& qmap, const Frame& F, const IVector& u, double levelScaled) {
  IVector x(F.dim);
  x[0] = levelScaled;
  for (int j = 0; j < F.n; ++j) x[F.idx[j]] = u[j];
  x[18] = 0.0;
  interval R = qmap(x)[0];
  x[18] = (interval(F.Q0) - R) / ring19::scaleOf(18);
  return x;
}
static IVector frameBox(const Frame& F) {  // Y = prod [-rho_b, rho_b]
  IVector r(F.n);
  int p = 0;
  for (size_t b = 0; b < F.bs.size(); ++b) for (int k = 0; k < F.bs[b]; ++k) r[p++] = interval(-F.rho[b], F.rho[b]);
  return r;
}

static int cmdLeafbox(const std::string& framePath, const std::string& outdir) {
  Frame F = readFrame(framePath);
  const double level = -40.0 / ring19::scaleOf(0);  // exact
  IMap qmap(ring19::chargeField, F.dim, 1, ring19::numParams(F.N));
  ring19::setParameters<IMap, interval>(qmap, F.coupling, F.N, ghkCoefs<interval>());
  IVector uc(F.n);
  for (int j = 0; j < F.n; ++j) uc[j] = F.u[j];
  IVector xc = iota(qmap, F, uc, level);
  // box of leaf coordinates Bu = u + At Y and the gradient of R over the lifted box
  IMatrix AtI(F.n, F.n);
  for (int i = 0; i < F.n; ++i) for (int k = 0; k < F.n; ++k) AtI[i][k] = F.At[i][k];
  IVector Y = frameBox(F);
  IVector Bu = uc + AtI * Y;
  IVector Xb = iota(qmap, F, Bu, level);
  IMatrix dQ = qmap.derivative(Xb);     // 1 x dim, over the lifted box
  IMatrix dQc = qmap.derivative(xc);    // at the centre
  // K_0 row of the affine frame: L = -(1/sigma_K) mid(dQc)|_leaf At ; remainder radius:
  // |K0(u) - K0(u_c) - L y| <= (1/sigma_K) sum_j |((dQ - mid dQc)|_leaf At)_j| rho_j  (+ radius of K0(u_c))
  const double sK = ring19::scaleOf(18);
  std::vector<double> gmid(F.n);
  for (int j = 0; j < F.n; ++j) gmid[j] = dQc[0][F.idx[j]].mid().leftBound();
  IMatrix A(F.dim, F.dim);
  IVector r(F.dim);
  for (int j = 0; j < F.n; ++j) {
    for (int i = 0; i < F.n; ++i) A[F.idx[i]][j + 1] = F.At[i][j];
    interval L = 0;
    for (int i = 0; i < F.n; ++i) L += interval(gmid[i]) * interval(F.At[i][j]);
    A[18][j + 1] = (-L / sK).mid().leftBound();  // point entry; its rounding is absorbed below
    r[j + 1] = Y[j];
  }
  // remainder for the K_0 component: exact K0 difference minus the point row, over Y
  interval rem = 0;
  for (int j = 0; j < F.n; ++j) {
    interval col = 0;  // (dQ|_leaf At)_j over the box
    for (int i = 0; i < F.n; ++i) col += dQ[0][F.idx[i]] * interval(F.At[i][j]);
    interval diff = -col / sK - interval(A[18][j + 1].leftBound());
    rem += interval(mag(diff)) * interval(mag(Y[j]));
  }
  interval K0c = xc[18];
  double K0mid = K0c.mid().leftBound();
  rem += interval(mag(K0c - K0mid));
  A[18][0] = 1.0;
  r[0] = interval(-up(rem), up(rem));
  r[F.dim - 1] = 0.0;
  IVector x0 = xc;
  x0[18] = K0mid;
  std::ostringstream a;
  a << "# leaf C1 start set: x + A r (x point, A point matrix, r box); column 0 is the K_0 remainder\n";
  putV(a, x0); putM(a, A); putV(a, r);
  atomicWrite(outdir + "/leaf_affine.txt", a.str());
  std::ostringstream p;
  p << "# leaf centre iota(u_c) (K_0 an interval)\n";
  putV(p, xc);
  atomicWrite(outdir + "/leaf_point.txt", p.str());
  // reference for the centre image: ref = sigma iota(u_c) (cell k of iota goes to cell k+1), K_0 at its midpoint
  IVector ref(F.dim);
  for (int k = 0; k < F.N; ++k) for (int s = 0; s < NS; ++s) ref[NS * ((k + 1) % F.N) + s] = interval(x0[NS * k + s].mid().leftBound());
  std::ostringstream rf;
  putV(rf, ref);
  atomicWrite(outdir + "/leaf_ref.txt", rf.str());
  std::cout << "leafbox: K_0 remainder radius " << up(rem) << ", K_0 centre width " << diam(K0c).rightBound() << "\n";
  return 0;
}

// ---------- segment ----------
static std::string segName(const std::string& outdir, int i, const std::string& kind, const std::string& ext) {
  return outdir + "/seg" + std::to_string(i) + "_" + kind + "." + ext;
}
template <class Tr>
static void readSegOut(const std::string& path, int dim, bool& ok, interval& T, typename Tr::Vec& X, typename Tr::Mat* D) {
  std::ifstream in(path);
  if (!in) throw std::runtime_error("missing segment output " + path);
  std::string tag; int okI;
  in >> tag >> okI; ok = okI != 0;
  getI(in, T);
  getV(in, X);
  if (D) getM(in, *D);
}

template <class Tr>
static int runSegment(const Plan& plan, int idx, const std::string& outdir) {
  typedef typename Tr::S S; typedef typename Tr::Vec Vec; typedef typename Tr::Mat Mat; typedef typename Tr::Set Set;
  const SegSpec& seg = plan.segs.at(idx);
  const int N = plan.N, dim = NS * N;
  const std::string kind = Tr::name();
  ring19::ghkDegree() = plan.ghkDegree;
  if (Tr::MP) MpFloat::setDefaultPrecision(plan.mpBits);
  typename Tr::Map f(ring19::ringField, dim, dim, ring19::numParams(N));
  ring19::setParameters<typename Tr::Map, S>(f, plan.coupling, N, ghkCoefs<S>());
  // Window degree is fixed in the DAG; coefficients beyond K are unused.
  IMap fD(ring19::ringField, dim, dim, ring19::numParams(N));
  ring19::setParameters<IMap, interval>(fD, plan.coupling, N, ghkCoefs<interval>());
  Gronwall gw(N, plan.coupling, plan.ghkDegree);
  const int order = Tr::MP ? plan.mpOrder : plan.order;
  typename Tr::Solver solver(f, order);
  double tol = Tr::MP ? plan.mpTol : plan.tol;
  if (tol > 0) { solver.setAbsoluteTolerance(tol); solver.setRelativeTolerance(tol); }

  // start set
  SegSpec segEff = seg;
  Vec x0(dim);
  std::unique_ptr<Set> sp;
  if (idx == 0 || seg.startKind != "previous") {
    if (Tr::C1) {
      std::ifstream in(seg.startFile);
      if (!in) throw std::runtime_error("cannot read start " + seg.startFile);
      std::string line; std::getline(in, line);
      if (seg.startKind == "affine") {
        Vec x(dim), r(dim); Mat A(dim, dim);
        getV(in, x); getM(in, A); getV(in, r);
        sp.reset(new Set(x, A, r));
      } else if (seg.startKind == "box") {
        Vec x(dim); getV(in, x);
        Vec m(dim), r(dim);
        for (int i = 0; i < dim; ++i) { m[i] = S(toI(x[i]).mid().leftBound()); r[i] = x[i] - m[i]; }
        sp.reset(new Set(m, r));
      } else throw std::runtime_error("unknown start kind " + seg.startKind);
    } else {
      std::string file = seg.pointFile.empty() ? seg.startFile : seg.pointFile;
      std::ifstream in(file);
      if (!in) throw std::runtime_error("cannot read start " + file);
      std::string line; std::getline(in, line);
      Vec x(dim); getV(in, x);
      Vec m(dim), r(dim);
      for (int i = 0; i < dim; ++i) {
        if constexpr (Tr::MP) { m[i] = S(x[i].mid()); } else { m[i] = S(toI(x[i]).mid().leftBound()); }
        r[i] = x[i] - m[i];
      }
      sp.reset(new Set(m, r));
    }
  } else {
    // previous segment's end set (hull); after a section end, the crossing cell sits exactly on the level
    const SegSpec& prev = plan.segs.at(idx - 1);
    bool ok; interval T; Vec X(dim);
    readSegOut<Tr>(segName(outdir, idx - 1, kind, "out"), dim, ok, T, X, nullptr);
    if (!ok) throw std::runtime_error("previous segment did not succeed");
    if (prev.endKind == "section") X[NS * prev.secCell] = S(tp06::decimalAs<S>(prev.secLevel) / S(ring19::scaleOf(0)));
    if (plan.noSwitch) segEff.low = prev.low;  // NEGATIVE CONTROL: keep the old branch after the crossing
    Vec m(dim), r(dim);
    for (int i = 0; i < dim; ++i) {
      if constexpr (Tr::MP) { m[i] = S(X[i].mid()); } else { m[i] = S(toI(X[i]).mid().leftBound()); }
      r[i] = X[i] - m[i];
    }
    sp.reset(new Set(m, r));
  }
  Set& s = *sp;
  std::ofstream logf(segName(outdir, idx, kind, "log"), std::ios::app);
  logf << "segment " << idx << " kind " << kind << " start " << (idx == 0 || seg.startKind != "previous" ? seg.startKind : "previous") << "\n";
  Engine<Tr> eng(plan, segEff, f, solver, fD, gw, segName(outdir, idx, kind, "ckpt"), logf);
  Vec endX(dim); Mat endD(Tr::C1 ? dim : 1, Tr::C1 ? dim : 1);
  SegResult r = eng.run(s, endX, endD);
  std::ostringstream o;
  o << kind << " " << (r.ok ? 1 : 0) << "\n";
  putI(o, r.T); o << "\n";
  putV(o, endX);
  if (Tr::C1) putM(o, endD);
  atomicWrite(segName(outdir, idx, kind, "out"), o.str());
  // summary
  IVector Xd = toIV(endX);
  double relMax = 0, absMax = 0;
  for (int i = 0; i < dim; ++i) { absMax = std::max(absMax, diam(Xd[i]).rightBound()); relMax = std::max(relMax, diam(Xd[i]).rightBound() / std::max(1e-300, std::abs(Xd[i].mid().leftBound()))); }
  double dW = 0, dRel = 0, dAbs = 0;
  if constexpr (Tr::C1) {
    IMatrix Dd = toIM(endD);
    for (int i = 0; i < dim; ++i) for (int k = 0; k < dim; ++k) { dW = std::max(dW, diam(Dd[i][k]).rightBound()); dAbs = std::max(dAbs, mag(Dd[i][k])); }
    for (int i = 0; i < dim; ++i) for (int k = 0; k < dim; ++k) { double m = std::abs(Dd[i][k].mid().leftBound()); if (m >= 1e-3 * dAbs) dRel = std::max(dRel, diam(Dd[i][k]).rightBound() / m); }
  }
  std::ostringstream js;
  js << std::setprecision(10) << "{\n  \"status\": \"pilot / dry run; no theorem\",\n  \"segment\": " << idx << ", \"kind\": \"" << kind
     << "\", \"N\": " << N << ", \"coupling\": \"" << plan.coupling << "\", \"order\": " << order
     << (Tr::MP ? ", \"mp_bits\": " + std::to_string(plan.mpBits) : std::string(""))
     << ",\n  \"end\": \"" << seg.endKind << (seg.endKind == "section" ? " cell " + std::to_string(seg.secCell) + " level " + seg.secLevel + " dir " + std::to_string(seg.secDir) : " " + std::to_string(seg.duration)) << "\""
     << ",\n  \"ok\": " << (r.ok ? "true" : "false") << ", \"error\": \"" << jsonEsc(r.error) << "\""
     << ",\n  \"negative_controls\": {\"no_inflation\": " << (plan.noInflation ? "true" : "false") << ", \"force_quotient\": " << (plan.forceQuot ? "true" : "false")
     << ", \"no_switch\": " << (plan.noSwitch ? "true" : "false") << "}"
     << (plan.noInflation || plan.noSwitch || plan.forceQuot ? ",\n  \"INVALID\": \"negative control: this run is deliberately not a rigorous enclosure of the model\"" : "")
     << ",\n  \"T\": \"" << ivs(r.T) << "\", \"T_hex\": [\"" << hexd(r.T.leftBound()) << "\", \"" << hexd(r.T.rightBound()) << "\"]"
     << ",\n  \"steps\": " << r.steps << ", \"validation_steps\": " << r.validationSteps << ", \"window_steps\": " << r.polySteps << ", \"retries\": " << r.retries
     << ",\n  \"h_min\": " << r.hmin << ", \"h_max\": " << r.hmax
     << ",\n  \"gronwall\": {\"delta_max\": " << r.deltaMax << ", \"delta_sum\": " << r.deltaSum << ", \"e1_max\": " << r.e1Max << ", \"e1_sum\": " << r.e1Sum
     << ", \"lognorm_max\": " << r.lMax << ", \"zeta_max\": " << r.zmaxMax << ", \"tail_T0_max\": " << r.T0Max << ", \"window_degree\": " << plan.ghkDegree << ", \"theta_mV\": " << plan.theta << "}"
     << ",\n  \"window_steps_per_cell\": [";
  for (int k = 0; k < N; ++k) js << (k ? ", " : "") << r.polyStepsPerCell[k];
  js << "],\n  \"end_c0_max_diameter_scaled\": " << absMax << ", \"end_c0_max_relative_diameter\": " << relMax;
  if (Tr::C1) js << ",\n  \"end_derivative_max_width\": " << dW << ", \"end_derivative_max_abs\": " << dAbs << ", \"end_derivative_max_rel_width_big_entries\": " << dRel;
  js << ",\n  \"wall_s\": " << r.wall << ", \"wall_validation_s\": " << r.wallValidation << ", \"resumed\": " << (r.resumed ? "true" : "false")
     << ", \"resumed_at_step\": " << r.resumedAtStep << "\n}\n";
  atomicWrite(segName(outdir, idx, kind, "json"), js.str());
  std::cout << "segment " << idx << " " << kind << (r.ok ? " ok" : " FAILED: " + r.error) << "  steps " << r.steps << "  T " << ivs(r.T)
            << "  wall " << r.wall << " s\n";
  if (r.ok) std::remove(segName(outdir, idx, kind, "ckpt").c_str());
  return r.ok ? 0 : 1;
}

// ---------- chain ----------
template <class Tr>
static int runChain(const Plan& plan, const std::string& outdir, const std::string& refPath) {
  typedef typename Tr::S S; typedef typename Tr::Vec Vec; typedef typename Tr::Mat Mat;
  const int dim = NS * plan.N;
  const std::string kind = Tr::name();
  if (Tr::MP) MpFloat::setDefaultPrecision(plan.mpBits);
  interval Ttot = 0;
  IMatrix D = IMatrix::Identity(dim);
  Vec X(dim);
  bool allOk = true;
  std::ostringstream notes;
  for (size_t i = 0; i < plan.segs.size(); ++i) {
    bool ok; interval T; Vec Xi(dim);
    Mat Di(Tr::C1 ? dim : 1, Tr::C1 ? dim : 1);
    readSegOut<Tr>(segName(outdir, int(i), kind, "out"), dim, ok, T, Xi, Tr::C1 ? &Di : nullptr);
    if (!ok) { allOk = false; notes << "segment " << i << " failed; "; }
    // containment of the previous end set in this segment's start set (box starts); 'previous' starts are equal by construction
    if (i > 0 && plan.segs[i].startKind == "box" && Tr::C1) {
      std::ifstream in(plan.segs[i].startFile); std::string line; std::getline(in, line);
      Vec B(dim); getV(in, B);
      Vec prevX = X;
      const SegSpec& prev = plan.segs[i - 1];
      if (prev.endKind == "section") prevX[NS * prev.secCell] = S(tp06::decimalAs<S>(prev.secLevel) / S(ring19::scaleOf(0)));
      for (int k = 0; k < dim; ++k) if (!subset(toI(prevX[k]), toI(B[k]))) { allOk = false; notes << "segment " << i << " start box does not contain the previous end set (coordinate " << k << "); "; break; }
    }
    Ttot += T;
    if constexpr (Tr::C1) D = toIM(Di) * D;
    X = Xi;
  }
  std::ostringstream o;
  o << kind << " " << (allOk ? 1 : 0) << "\n";
  putI(o, Ttot); o << "\n";
  putV(o, X);
  if (Tr::C1) putM(o, D);
  if (!refPath.empty()) {
    std::ifstream in(refPath); IVector ref(dim); getV(in, ref);
    Vec d(dim);
    for (int k = 0; k < dim; ++k) d[k] = X[k] - S(ref[k].leftBound());  // ref entries are points
    IVector dd = toIV(d);
    o << "diff\n"; putV(o, dd);
  }
  atomicWrite(outdir + "/chain_" + kind + ".out", o.str());
  std::cout << "chain " << kind << (allOk ? " ok" : " NOT OK: " + notes.str()) << "  section-map time " << ivs(Ttot) << "\n";
  return allOk ? 0 : 1;
}

// ---------- verify (contraction on the leaf, verify.cpp's block-norm design) ----------
static double norm2x2(interval a, interval b, interval c, interval d) {
  interval p = sqr(a) + sqr(c), s = sqr(b) + sqr(d), r = a * b + c * d;
  interval half = (p + s) / 2.0, diff = (p - s) / 2.0;
  interval lam = half + sqrt(sqr(diff) + sqr(r));
  return up(sqrt(interval(up(lam))));
}
static int cmdVerify(const std::string& framePath, const std::string& outdir, const std::string& outJson, bool dryRun) {
  Frame F = readFrame(framePath);
  const int dim = F.dim, n = F.n, N = F.N;
  const double level = -40.0 / ring19::scaleOf(0);
  double eNorm;
  IMatrix AtInv = rigorousInverse(F.At, eNorm);
  IMatrix AtI(n, n);
  for (int i = 0; i < n; ++i) for (int k = 0; k < n; ++k) AtI[i][k] = F.At[i][k];
  IMap qmap(ring19::chargeField, dim, 1, ring19::numParams(N));
  ring19::setParameters<IMap, interval>(qmap, F.coupling, N, ghkCoefs<interval>());
  IVector uc(n); for (int j = 0; j < n; ++j) uc[j] = F.u[j];
  IVector Y = frameBox(F);
  IVector Bu = uc + AtI * Y;
  IVector Xb = iota(qmap, F, Bu, level);
  IMatrix dQ = qmap.derivative(Xb);
  IMatrix Diota(dim, n);  // d iota / du over the box
  for (int j = 0; j < n; ++j) { Diota[F.idx[j]][j] = 1.0; Diota[18][j] = -dQ[0][F.idx[j]] / ring19::scaleOf(18); }
  // C1 chain
  std::ifstream c1(outdir + "/chain_c1.out");
  if (!c1) throw std::runtime_error("missing chain_c1.out");
  std::string tag; int ok1; c1 >> tag >> ok1;
  interval T; getI(c1, T);
  IVector PX(dim); getV(c1, PX);
  IMatrix DP(dim, dim); getM(c1, DP);
  // centre chain: mp0 if present, else c0
  std::string centreKind = "mp0";
  std::ifstream c0(outdir + "/chain_mp0.out");
  if (!c0) { centreKind = "c0"; c0.open(outdir + "/chain_c0.out"); }
  if (!c0) throw std::runtime_error("missing centre chain");
  int ok0; c0 >> tag >> ok0;
  interval Tc; getI(c0, Tc);
  {  // skip the image (MP or double); read the diff block
    std::string line; std::getline(c0, line);
    while (std::getline(c0, line)) if (line == "diff") break;
  }
  IVector diff(dim); getV(c0, diff);
  // shift back: (sigma^{-1} v)_cell k = v_cell k+1
  auto shiftBack = [&](int i) { int k = i / NS, a = i % NS; return NS * ((k + 1) % N) + a; };
  IVector g(n);
  for (int j = 0; j < n; ++j) g[j] = diff[shiftBack(F.idx[j])];
  IVector G0 = AtInv * g;
  IMatrix PD(n, dim);
  for (int j = 0; j < n; ++j) for (int k = 0; k < dim; ++k) PD[j][k] = DP[shiftBack(F.idx[j])][k];
  IMatrix M = AtInv * (PD * Diota) * AtI;
  // block norms
  int nb = int(F.bs.size());
  std::vector<int> b0(nb);
  { int t = 0; for (int b = 0; b < nb; ++b) { b0[b] = t; t += F.bs[b]; } }
  double q = 0, total = 0, r0 = 0;
  int worst = -1;
  std::vector<double> rowSum(nb), diagNorm(nb);
  bool finite = true;
  for (int i = 0; i < n; ++i) { if (!finiteI(G0[i])) finite = false; for (int k = 0; k < n; ++k) if (!finiteI(M[i][k])) finite = false; }
  for (int bi = 0; bi < nb; ++bi) {
    interval sum = 0;
    for (int bj = 0; bj < nb; ++bj) {
      interval scale = interval(F.rho[bj]) / interval(F.rho[bi]);
      double nrm;
      if (bi == bj && F.bs[bi] == 2) { int a0 = b0[bi]; nrm = norm2x2(M[a0][a0] * scale, M[a0][a0 + 1] * scale, M[a0 + 1][a0] * scale, M[a0 + 1][a0 + 1] * scale); }
      else { interval fs = 0; for (int u = 0; u < F.bs[bi]; ++u) for (int v = 0; v < F.bs[bj]; ++v) fs += sqr(interval(mag(M[b0[bi] + u][b0[bj] + v] * scale))); nrm = up(sqrt(interval(up(fs)))); }
      if (bi == bj) diagNorm[bi] = nrm;
      sum += interval(nrm);
    }
    rowSum[bi] = up(sum);
    if (rowSum[bi] > q) { q = rowSum[bi]; worst = bi; }
    interval s2 = 0;
    for (int k = 0; k < F.bs[bi]; ++k) s2 += sqr(interval(mag(G0[b0[bi] + k])));
    double gb = up(sqrt(interval(up(s2))) / interval(F.rho[bi]));
    r0 = std::max(r0, gb);
    total = std::max(total, up(interval(gb) + interval(rowSum[bi])));
  }
  if (!std::isfinite(q) || !std::isfinite(total)) finite = false;
  // segments: every C1 and centre segment certified its modes and crossings; centre section times inside box times
  bool segsOk = ok1 && ok0;
  bool sameCrossing = true;
  Plan dummy;
  std::ostringstream segInfo;
  for (int i = 0;; ++i) {
    std::ifstream a(segName(outdir, i, "c1", "out")), b(segName(outdir, i, centreKind, "out"));
    if (!a || !b) break;
    std::string t1, t2; int o1, o2; a >> t1 >> o1; b >> t2 >> o2;
    interval Ta, Tb; getI(a, Ta); getI(b, Tb);
    if (!o1 || !o2) segsOk = false;
    if (!subset(Tb, Ta)) sameCrossing = false;
    segInfo << (i ? ", " : "") << "{\"segment\": " << i << ", \"T_box\": \"" << ivs(Ta) << "\", \"T_centre\": \"" << ivs(Tb) << "\"}";
  }
  bool verified = !dryRun && finite && segsOk && sameCrossing && q < 1.0 && total < 1.0;
  std::ostringstream js;
  js << std::setprecision(17) << "{\n  \"schema\": \"ap-reentry-contraction-v1\",\n  \"status\": \"" << (dryRun ? "DRY RUN: mechanical check of the program; not a proof" : "pilot; no theorem unless verified is true and the record is reviewed")
     << "\",\n  \"N\": " << N << ", \"coupling\": \"" << F.coupling << "\", \"leaf_dimension\": " << n << ", \"Q0_hex\": \"" << hexd(F.Q0) << "\""
     << ",\n  \"frame_inverse_E_norm\": " << eNorm
     << ",\n  \"q_upper\": " << q << ", \"worst_block\": " << worst << ", \"r0_upper\": " << r0 << ", \"max_block_residual_plus_row_sum_upper\": " << total
     << ",\n  \"section_map_time_box\": \"" << ivs(T) << "\", \"section_map_time_centre\": \"" << ivs(Tc) << "\""
     << ",\n  \"rotation_period_box\": \"" << ivs(T * interval(double(N))) << "\""
     << ",\n  \"segments\": [" << segInfo.str() << "]"
     << ",\n  \"all_segments_certified\": " << (segsOk ? "true" : "false") << ", \"centre_times_inside_box_times\": " << (sameCrossing ? "true" : "false")
     << ",\n  \"finite\": " << (finite ? "true" : "false") << ", \"centre_kind\": \"" << centreKind << "\""
     << ",\n  \"floquet_bound_full_rotation_upper\": " << up(power(interval(q), N))
     << ",\n  \"verified\": " << (verified ? "true" : "false") << "\n}\n";
  atomicWrite(outJson, js.str());
  std::cout << (dryRun ? "DRY RUN (not a proof): " : "") << (verified ? "VERIFIED" : "NOT VERIFIED") << "  q <= " << q << "  r0 <= " << r0
            << "  max_b(g0_b/rho_b + rowsum_b) <= " << total << "  segments certified " << segsOk << "  same crossing " << sameCrossing << "\n";
  return verified ? 0 : 1;
}

// ---------- ghk-unit: coefficients and tail bounds ----------
static int cmdGhkUnit(const std::string& out) {
  std::ostringstream o;
  std::vector<interval> c = ghkCoefs<interval>();
  o << "coefficients " << ring19::KMAX + 1 << "\n";
  for (int n = 0; n <= ring19::KMAX; ++n) { putI(o, c[n]); o << "\n"; }
  o << "tails\n";
  for (int K : {4, 8, 12, 16, 20, 24, 28}) for (double zm : {0.1, 0.3, 0.5, 0.749, 1.0, 2.0, 3.0}) {
    Tails t = tails(zm, K);
    o << K << " " << hexd(zm) << " " << hexd(up(t.T0)) << " " << hexd(up(t.T1)) << " " << hexd(up(t.T2)) << "\n";
  }
  atomicWrite(out, o.str());
  return 0;
}

// ---------- field: double-interval field at given scaled states (cross-check with tp06_19d.py) ----------
static int cmdField(const std::string& states, const std::string& out, const std::string& modes) {
  std::ifstream in(states);
  int N, M; std::string c; in >> N >> c >> M;
  const int dim = NS * N;
  ring19::ghkDegree() = 24;
  IMap f(ring19::ringField, dim, dim, ring19::numParams(N));
  ring19::setParameters<IMap, interval>(f, c, N, ghkCoefs<interval>());
  std::ostringstream o;
  o << std::setprecision(17);
  for (int m = 0; m < M; ++m) {
    IVector x(dim);
    for (int i = 0; i < dim; ++i) { std::string s; in >> s; x[i] = unhex(s); }
    for (int k = 0; k < N; ++k) {
      double V = x[NS * k].leftBound() * ring19::scaleOf(0);
      bool low = V < -40;
      bool poly = modes == "poly" ? true : (modes == "quot" ? false : std::abs(V - 15) < 10);
      ring19::setMode<IMap, interval>(f, k, low, poly);
    }
    IVector y = f(x);
    for (int i = 0; i < dim; ++i) o << y[i].leftBound() << " " << y[i].rightBound() << (i + 1 < dim ? " " : "\n");
  }
  atomicWrite(out, o.str());
  return 0;
}

int main(int argc, char** argv) {
  if (argc < 2) { std::cerr << "usage: ap_proof leafbox|segment|chain|verify|ghk-unit|field ...\n"; return 2; }
  std::string cmd = argv[1];
  try {
    if (cmd == "leafbox" && argc == 4) return cmdLeafbox(argv[2], argv[3]);
    if (cmd == "segment" && argc == 6) {
      Plan p = readPlan(argv[2]);
      int i = std::atoi(argv[3]); std::string k = argv[4];
      if (k == "c1") return runSegment<TrC1>(p, i, argv[5]);
      if (k == "c0") return runSegment<TrC0>(p, i, argv[5]);
      if (k == "mp0") return runSegment<TrMP0>(p, i, argv[5]);
    }
    if (cmd == "chain" && (argc == 5 || argc == 6)) {
      Plan p = readPlan(argv[2]);
      std::string k = argv[3], ref = argc == 6 ? argv[5] : "";
      if (k == "c1") return runChain<TrC1>(p, argv[4], ref);
      if (k == "c0") return runChain<TrC0>(p, argv[4], ref);
      if (k == "mp0") return runChain<TrMP0>(p, argv[4], ref);
    }
    if (cmd == "verify" && (argc == 5 || argc == 6)) return cmdVerify(argv[2], argv[3], argv[4], argc == 6 && std::string(argv[5]) == "--dry-run");
    if (cmd == "ghk-unit" && argc == 3) return cmdGhkUnit(argv[2]);
    if (cmd == "field" && argc == 5) return cmdField(argv[2], argv[3], argv[4]);
  } catch (std::exception& e) {
    std::cerr << "ap_proof " << cmd << ": " << e.what() << "\n";
    return 3;
  }
  std::cerr << "bad arguments\n";
  return 2;
}
