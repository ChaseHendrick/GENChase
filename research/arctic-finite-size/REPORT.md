# Finite-size correction to the frozen regions of Aztec diamond and lozenge tilings

Session work of 2026-09-26 on branch `claude/arctic-finite-size`. The folder holds the code, the data (`data/`) and
this report. Beyond it, only `validation/AZTEC.md`, `validation/LOZENGE.md`, `RESEARCH.md` and `IDENTITIES.md`
changed. No module in `src/` changed.

## Summary

1. **Prior art.** No published source was found that states the n^(-2/3) constant of the expected frozen area, or
   that computes the expected frozen area exactly at finite n. The pointwise ingredients are published:
   - the Airy scale of the boundary along the whole curve;
   - the remark that the negative Tracy-Widom mean moves the boundary.

   The searches and quotes are in section 1. The constant is logged as a candidate in `IDENTITIES.md`, with priority
   unconfirmed.
2. **Exact identities.** Two identities hold tile by tile, and both are proved:
   - For the Aztec diamond, the frozen (polar) area is a sum over Johansson's particle lines of the position of an
     extreme particle.
   - For a hexagon, it is a sum over his lines of the position of the top hole.

   Each line carries a Krawtchouk (Aztec) or Hahn (hexagon) orthogonal polynomial ensemble. So the expected frozen
   area at every n is a finite sum of Fredholm determinants det(I - K). Both identities and both one-line laws were
   checked exhaustively on small sizes. The floating-point pipeline equals an exact rational computation to 3e-16.
3. **The constants.** Expected frozen fraction = limit + C n^(-2/3) + O(n^(-1)), where C is the Tracy-Widom GUE mean
   times the edge scale integrated along the lines.

   | tiling | quantity | limit | C |
   |---|---|---|---|
   | Aztec diamond, order n | polar fraction | 1 - pi/4 | -E[TW2] 2^(-2/3) Gamma(5/6)^2/Gamma(5/3) = **+1.574751290306256** |
   | regular hexagon, side n | free fraction | pi/(2 sqrt 3) | 2 E[TW2] (3^(4/3)/8) B(5/3, 5/6) 2F1(1/2, 5/3; 5/2; -3) = **-0.874179272286317** |
   | hexagon 3k x 5k x 6k | free fraction, n = k | 0.885043465935088 | **-0.3403242418010158** (quadrature, 16 digits) |

   The expansion is heuristic (section 2 says which parts are proved). Fits to the exact values give C to 2e-5
   (Aztec) and 3e-5 (hexagons) of these numbers.
4. **The tabs.** Both tabs agree with the exact finite-n expectations:
   - Aztec: chi-square 7.97 on 7 over the seven measured orders, largest deviation 2.06 sigma.
   - Lozenge: chi-square 5.17 on 11 over the eleven measured boxes, largest deviation 1.26 sigma.

   The finite-size gap the status lines report is exactly the finite-size shift. The extrapolation form the tools
   used, q_inf + A n^(-2/3) + B n^(-1), is itself biased at those sizes, by about half the Monte Carlo error bar.
5. **Independent check.** A subagent redid the work adversarially; its verdict is in section 6.

## 0. Definitions (the tabs' own)

- **Aztec.** `validation/AZTEC.md` defines the polar fraction as (cells in the four polar regions) / (2n(n+1)). A
  domino is polar when a chain of edge-adjacent dominoes of its own type joins it to a domino with an edge on the
  boundary. The module flags this, and `tools/lib/aztec-reference.js` (`polarBoundary`) recomputes it.
- **Lozenge.** `validation/LOZENGE.md` defines the free fraction as the unit triangles outside the rim-connected
  frozen regions, divided by 2(ab + bc + ca). The frozen rhombi are the extreme level sets:
  `extremeLevelCounts` counts #{h in {0, c}} + #{m in {0, a}} + #{q in {0, b}}, with
  m(j, k) = #{i : h(i, j) > k} and q(i, k) = #{j : h(i, j) > k}. So free = 1 - (that count)/(ab + bc + ca).
- **Axis shortfall and radius.** The Aztec axis radius and the lozenge sector radius are not linear in the frozen
  counts. They were not computed exactly here (section 5).

## 1. Prior art

Searches ran on 2026-09-26, before any derivation. A subagent read the named papers in full from arXiv PDFs. The
quotes below were re-read in the PDFs by me or by the adversarial check.

Web queries, verbatim:

- 'Aztec diamond expected area polar regions finite-size correction n^{-2/3} Tracy-Widom mean'
- '"arctic circle" domino tilings "expected" frozen area finite n correction'
- '"Aztec diamond" "finite-size" arctic curve Tracy-Widom mean shift simulation'
- 'Prähofer Spohn "Domain wall fluctuations of the six-vertex model at the ice point" journal'
- 'lozenge tilings hexagon expected area frozen regions finite size correction Tracy-Widom mean'
- '"Aztec diamond" "temperate region" OR "disordered region" expected area exact finite n Krawtchouk Fredholm determinant'
- '"Tracy-Widom" "mean" correction arctic boundary tilings "n^{1/3}" expected position frozen boundary shift inward'
- 'Gorin "Lectures on random lozenge tilings" edge Airy "curvature" frozen boundary fluctuation scale'
- '"arctic circle" Aztec diamond simulation "area" polar regions n^{4/3} OR "n^{-2/3}" subleading'
- 'Ferrari Frings "Finite time corrections in KPZ growth models" arXiv'
- 'boxed plane partitions hexagon "Tracy-Widom" frozen boundary fluctuations Baik Kriecherbauer McLaughlin Miller hexagon scaling constant'
- '"random tiling" OR "domino tiling" "expected" "frozen region" area asymptotic expansion "Tracy-Widom" "-1.77"'
- '"polar regions" OR "frozen regions" "expected area" Aztec diamond OR "plane partitions" asymptotics correction'

What each source says:

| source | read | edge scale | mean shift, frozen area, finite n |
|---|---|---|---|
| Johansson, Ann. Probab. 33 (2005) 1-30, arXiv:math/0306216 | full | Theorem 1.1, at the axis only: (X_n(2^(-1/6) n^(2/3) t) - n/sqrt 2) / (2^(-5/6) n^(1/3)) -> A(t) - t^2. "it is possible to show convergence along other parts of the boundary, except right near the point where the arctic circle is tangent" | none |
| Johansson, PTRF 123 (2002), arXiv:math/0011250 | full | eq. (2.72), for the Krawtchouk top particle on every line: "we can prove that if pt < q(1 - t), M = [Kt], 0 < t < 1, then" P[max h_j <= K beta(t) + xi rho(t) K^(1/3)] -> F(xi), with the proof sketched ("proceeding in the same way as in [37]"). Theorem 4.1: the Hahn law of the holes. Sec. 4.2: the hexagon polar zone | none |
| Prähofer and Spohn, J. Phys. A 57 (2024) 025001, arXiv:2305.09502 | full | eq. (7), h_N(floor(Nx)) ~ h_ma(x) N - (Gamma(x) N)^(1/3) xi_TW; eq. (24), Gamma_Aztec(x) = (1 - 4x^2)^2 / (2^(5/2) (1 - 2x^2)^(3/2)); eq. (28), the per-tile probability | "The Tracy-Widom distribution has a negative mean. Therefore Eq. (7) indicates that the actual first level line is slightly above the macroscopic edge profile." No area. On the error: "The error is expected to be of order N^-1/3." |
| Lyberg, Korepin and Viti, arXiv:2303.14669 | full | eq. (2), with the scale of Allegra, Dubail, Stéphan and Viti (arXiv:1512.02872) | fits of skewness and variance; no mean correction, no area |
| Aggarwal and Huang, arXiv:2108.12874 | full | Theorem 2.10, at any non-tangency point of a polygon: s = l^(2/3)(1 - l)^(2/3) / (4^(1/3) q^(1/3)), from the slope l and curvature q | none |
| Petrov, PTRF 160 (2014), arXiv:1202.3901 | full | Theorem 8.1, an implicit closed form through S'''(w_c) | none |
| Chhita, Johansson and Young, arXiv:1212.5414 | full | Theorem 2.7, a thinned Airy process along the whole curve, scale lambda(a, k) | none |
| Ferrari and Spohn, arXiv:cond-mat/0605406 | full | restates Johansson; "the scaling coefficients will change" elsewhere, no formula | none |
| Debin, de Kemmeter and Ruelle, arXiv:2301.00600 | full | Monte Carlo at n = 500; eq. (9) "E(X^1_n(0) - n/sqrt 2) ~ n^(1/3)" | order only, no constant, no area |
| Jockusch, Propp and Shor, arXiv:math/9801068; Cohn, Elkies and Propp, arXiv:math/0008243; Cohn, Larsen and Propp, arXiv:math/9801059 | full | limit shapes only | none |
| Duse and Metcalfe, arXiv:1412.6653, 1507.00467; Borodin and Ferrari, arXiv:0804.3035 | grepped | geometry, or growth-model edges | none |

Not reached: Gorin's lecture notes (2021); Baik, Kriecherbauer, McLaughlin and Miller (2007); Ferrari and Frings
(abstract only); the citation lists of Prähofer and Spohn and of Aggarwal and Huang.

**Verdict: not found.** Prähofer and Spohn come closest. They give the per-point mean shift and its sign, and a
per-tile probability whose sum over tiles would be the expected frozen area, but they do not carry that sum out.
The contribution here is therefore narrow:
- the integration into an explicit constant with a closed form;
- the exact finite-n computation that checks it.

The pointwise mean shift is not new and is not claimed.

## 2. Derivation

### 2.1 Exact identities (proved)

**Aztec.** Johansson's DR paths (2005, sec. 1) are drawn as follows: a line on each W, E and S domino, none on N
dominoes. "The NPR is exactly the part of the domino tiling that lies above X_n(t)", where X_n is the top path. Three
facts give the identity:

- Each domino of the top path has exactly area 1 above its drawn segment. For W, E and S dominoes this is the
  trapezoid or rectangle above the line.
- Hence |NPR| = (area between the top path and the boundary) - (number of dominoes on the path).
- In the coordinates s = x + y and u = y - x, the path moves by (2, 0) (W), (0, -2) (E) and (2, -2) (S). On the white
  anti-diagonal s_k its first point P_k (Johansson's P_1(k)) has u = p_k.

With q_k the last point on the same anti-diagonal, the area term is (1/2) int U ds - (1/2) sum (q_k + p_{k+1}). The
number of dominoes is 2n - #S, with #S = sum (q_k - p_{k+1})/2. The q_k cancel, leaving |NPR| = K_n - sum_k p_k.

P_k shifted by half a cell is the first red particle on that line: a red particle marks the white square of an S or
W domino (Johansson 2005, sec. 1 and eq. 2.5). With the index f_r of the first red particle counted along the line
from its upper-left end,

    |NPR| = 2 sum_{r=1}^{n} f_r        (every tiling).

The constant K_n cancels, as any one tiling shows. The identity was checked on every tiling of orders 1 to 5
(2 + 8 + 64 + 1,024 + 32,768 tilings; `check_small.py`). Along line r the red particles form the Krawtchouk ensemble
with r points on {0..n} and weight C(n, x) (Johansson 2005, eq. 2.6, citing 2002, Theorem 2.2). The same check
confirms this law, point set by point set, on every line of those orders. Since the weight is symmetric, f_r has the
law of n - max. The four regions have one mean, so

    q(n) = (4 / (n (n+1))) sum_{r=1}^{n} (n - E[max_r]).

**Hexagon.** Johansson (2002, sec. 4.1) encodes the level lines of h as c non-intersecting +-1 walks:

- Walk k traces the boundary of {h >= k} from (row a, column 0) to (row 0, column b), shifted up by 2(k - 1).
- On line m the walks sit at x_k in {0..gamma_m}.
- The other L_m = gamma_m + 1 - c sites (holes) carry the Hahn law of his Theorem 4.1, with parameters
  (|a - m|, |b - m|).

For m <= a, the top wall rises by one per step. So walk k is at its maximum at time m exactly when its first m steps
all go up. That means {h >= k} has no cell in rows a - m, ..., a - 1, that is, h(a - m, 0) < k. Therefore the
particles packed above the top hole Z_m are the levels k > h(a - m, 0), and

    sum_{m=1}^{a} (gamma_m - Z_m) = sum_{i} (c - h(i, 0)) = #{(i, k) : q(i, k) = 0}        (every tiling).

The complement symmetry h -> c - h(a-1-i, b-1-j) gives E#{q = 0} = E#{q = b}. Permuting the box handles the other
two views, and the result is

    E[free] = 1 - 2 (F(a, c, b) + F(b, a, c) + F(a, b, c)) / (ab + bc + ca),   F(a, b, c) = sum_{m=1}^{a} E[gamma_m - Z_m].

The walls alpha_m and beta_m are the all-right-first and all-up-first paths, so Johansson's formulas, written for
a >= b, hold for a < b as well. The checks:

- The identity holds on all 54,223 plane partitions of six boxes.
- The hole law holds line by line on nine boxes, including a < b.
- The three expected counts match enumeration on nine boxes to 1e-14 (`check_hahn_small.py`).

### 2.2 Numerics of the one-line ensembles (exact up to rounding)

For an M-point ensemble on {0..N}, P(max < t) = det(I - K) restricted to {t..N}, and E[max] is the sum of
1 - P(max < t) over t = 1..N. The method (`kernels.py`):

- K is built from the eigenvectors of the (N+1) x (N+1) Jacobi matrix, whose eigenvalues are exactly 0..N. Only
  closed-form recurrence coefficients enter: Krawtchouk, and Hahn in the Koekoek-Swarttouw form. No weight is ever
  evaluated, so nothing underflows.
- All the trailing minors come from one Cholesky factorization of I - K in reversed order.
- Only the eigenvectors of a top window are computed. The window doubles until the gap probability falls below 1e-30.
- Sites whose K(x, x) < 1e-32 are skipped. Their factors are 1 to within that bound.

The checks:

- Brute-force sums over all point subsets with rational weights: Krawtchouk N <= 10 and Hahn N <= 8 with
  alpha, beta <= 3, maximum error 9e-15 (`check_small.py`).
- An independent exact-rational route by Andreief's identity with integer Bareiss determinants of moment matrices,
  for Aztec orders 4 to 40 and hexagons 2·2·2 to 12·12·12, 3·5·6, 6·10·12 and 12·20·24: maximum difference 2.8e-16
  (`verify_rational.py`). For example, q(5) = 2339/3840 both from enumeration and from the kernels.

### 2.3 The constant

**Edge scale.** Suppose an M-point ensemble has Jacobi coefficients that vary on the scale n, with a_k ~ n A(k/n) and
b_k^2 ~ n^2 B(k/n). Its density is then the average over s in (0, M/n) of the arcsine laws on
[A - 2 sqrt B, A + 2 sqrt B]; this is the Kuijlaars-Van Assche description. Suppose also that the top of those
intervals, E(s) = A + 2 sqrt B, increases up to s = gamma = M/n. Then:

- the density vanishes at n E(gamma) as (1/pi) sqrt(E - x) / (E' B^(1/4));
- matching it to the Airy density sqrt(-s)/pi gives x_max ~ n E(gamma) + sigma n^(1/3) TW2, with
  sigma = E'(gamma)^(2/3) B(gamma)^(1/6).

For the Krawtchouk ensemble with p = 1/2, A = 1/2 and B = t(1 - t)/4. That gives

    E = 1/2 + sqrt(t(1 - t)),   sigma(t) = (1 - 2t)^(2/3) / (2 (t(1 - t))^(1/6)),

which is exactly Johansson's (2002) eq. (2.72) at p = q = 1/2. It is valid for t < 1/2; for t > 1/2 the top is
saturated. At the line through the axis point, t(1 - t) = 1/8 and E' = 1, so sigma = 2^(-5/6): his Theorem 1.1
scale.

`check_scale.py` tests the formula on the exact one-line laws (the mean shift is in units of sigma n^(1/3); TW2 mean
is -1.771):

| line | sd / (sigma n^(1/3) sd TW2) | mean shift |
|---|---|---|
| Krawtchouk, t = 0.3 | 1.150, 1.062, 1.025 at n = 100, 400, 1600 | -1.785, -1.731, -1.726 |
| Hahn, regular hexagon, mu = 0.25 | 1.181, 1.075, 1.030 at n = 100, 400, 1600 | -2.26, -2.03, -1.91 |
| Hahn, 5:3:6 box, mu = 0.4 | 1.42, 1.18, 1.07 at n = 60, 240, 960 | -2.72, -2.25, -2.02 |

Every ratio tends to 1, and the mean shifts tend toward -1.771, with O(n^(-1/3)) corrections.

For the hexagon lines the top of the hole support is the maximum of E(s) over s <= L/n. Where that maximum is at
s = L/n, the zone is open and the formula applies. Where the maximum is interior or reaches the wall, the zone is empty
to leading order. The leading terms then reproduce the inscribed ellipse: 0.906899682117109 and 0.885043465935088,
both to 15 digits. The zone closes at the tangency lines 15/11, 10/3 and 18/11 of the three 3:5:6 sums.

**Integration.** Summing E[max] ~ n E + sigma n^(1/3) E[TW2] over the lines (r = t n; m = mu n):

- *Aztec:* E|NPR| = n^2 (1/2 - pi/8) + 2 (-E[TW2]) I_A n^(4/3) + O(n), with
  I_A = int_0^(1/2) sigma = 2^(1/3) B(5/6, 5/6) / 8 = 0.2222860115772240489. Hence C = 4 (-E[TW2]) I_A, the
  Gamma-function form in the summary.
- *Regular hexagon:* on the line mu in (0, 1/2), A = (2 - mu)/4 and C_H = 3mu/4, so
  sigma(mu) = 2^(-4/3) [(3 - 2mu)(1 - 2mu)]^(2/3) (3 mu (2 - mu))^(-1/6). With u = 1 - mu and w = (4u^2 - 1)/3,
  I_R = int_0^(1/2) sigma = (3^(4/3)/8) B(5/3, 5/6) 2F1(1/2, 5/3; 5/2; -3) = 0.2467917632913511617, checked
  against quadrature to 28 digits. Then C = 2 E[TW2] I_R.
- *General box, lines m <= min(a, b):* A = (a + b - mu) b c / (a + b)^2 and C_H = mu (a + b + c) a / (a + b)^2, and
  similar forms on the other stretches. The 3:5:6 constant is computed by mpmath quadrature at 30 and at 40 digits
  (8 and 24 panels), which agree to 16 digits.

E[TW2] = -1.7710868074116, and Var TW2 = 0.8131947928330. These come from Bornemann's quadrature of the Airy
Fredholm determinant (`tw2.py`), in agreement with his published values.

**The tangency points.** The scale vanishes as (1 - 2t)^(2/3) (Aztec) and as (1 - 2mu)^(2/3) (regular hexagon), so
the integrand is integrable and needs no cutoff. The lines within about n^(-1/2) of a tangency point are in a
crossover: the fluctuation there is below one lattice site, and the GUE-corners regime takes over. There are about
sqrt n such lines, each off by O(1), which is O(sqrt n) in area, n^(-3/2) in the fraction, and an n^(-5/6) term in
(q - q_inf) n^(2/3). The fits confirm that term (section 3). At the other end (t -> 0, few particles), sigma grows
like t^(-1/6) and stays integrable, and those lines contribute O(n^(2/3)).

**What is proved and what is heuristic.**

- *Proved:*
  - the two identities (2.1);
  - the one-line laws (Johansson 2005, eq. 2.6; 2002, Theorem 4.1; the a < b case checked exhaustively only);
  - hence the exact finite-n values;
  - the edge limit in distribution at each fixed t < 1/2 for the Krawtchouk lines (Johansson 2002, eq. 2.72, proof
    sketched there), and at the axis (2005, Theorem 1.1).
- *Heuristic:*
  - the Hahn edge scale, the same density matching (the adversarial check compares it with Aggarwal and Huang's
    rigorous polygon scale; section 6);
  - convergence of the mean of the extreme particle, not only of its law (uniform integrability is not shown);
  - uniformity of the O(1) remainder along the lines, and the size of the contributions near the tangency points
    and near t = 0;
  - hence the expansion with remainder O(n^(-1)).

The exact values test the whole chain numerically, and they agree (section 3).

## 3. Exact finite-n values and fits

Every value is an expectation with no sampling error. The floating-point error is about 1e-12 (the rational checks
agree to 3e-16 where they overlap).

TABLES

**Fits.** The fitted form is y(n) = (q(n) - q_inf) n^(2/3) = C + sum_p d_p n^(-p/3), over windows n >= n_min
(`fit.py`), with three families of powers:

- M1: p = 1 to 5 (integer powers only);
- M2: p = 1, 2, 5/2, 3, 4 (adds the tangency term n^(-5/6));
- M3: M2 plus p = 7/2.

The data error is negligible, so the error bar is the model's: the larger of the half-range of M3 over the windows
and the distance between the M3 and M2 medians.

FITS

The integer-only family M1 drifts monotonically toward the predicted constant as n_min grows but falls short.
Adding n^(-5/6) removes the drift. **The next-order term d1** (the n^(-1) coefficient of the fraction, fitted with C
fixed, in M3 against M2):

- Aztec: -1.7856 ± 0.0003. The expected polar cell count then has O(n) coefficient 2(1 - pi/4 + d1) = -3.1420 ± 0.0006.
- Regular hexagon: +1.000 ± 0.003. The expected frozen rhombus count has O(n) coefficient -3.00 ± 0.01.
- 3:5:6: +0.222 ± 0.001, which is -13.99 ± 0.06 per k in rhombi. The sides sum to 3 + 5 + 6 = 14.

The last two suggest an O(n) term of -(a + b + c) n in rhombi, and the first is within 0.7 of its error bar of -pi n.
These are numerical observations, dependent on the heuristic model family; they are neither derived nor claimed.

## 4. The tabs against the exact values

COMPARE

## 5. Proposed module changes (not made in this task)

- `aztec`: compare the printed polar fraction with the exact expectation at the plate's order, not with 1 - pi/4.
  Keep basis `sampled`, the existing sector bar, and the limit and C in the hint. The 313 expectations for orders
  8 to 320 can be tabulated from `aztec_exact.py`. Alternatively the module can compute them: one (n+1)-point
  tridiagonal eigenproblem per line and a small Cholesky factorization, a few seconds at order 320 in numpy.
- `lozenge`: compare the free area with the exact expectation for the box on screen. That is 2a + b small Hahn lines,
  milliseconds in plain JavaScript for sides up to about 64.

Either change turns a known finite-size miss into a check that can fail on every plate. Not covered by this work:

- the Aztec axis radius, a joint event on neighboring lines that needs Johansson's extended Krawtchouk kernel;
- the lozenge sector radius, a nonlinear sector average.

## 6. Independent adversarial check

VERDICT

## 7. Rerun

```sh
pip install numpy scipy mpmath         # the only dependencies; the studio itself needs none
cd research/arctic-finite-size
python3 check_small.py 5               # kernels vs brute force; Aztec identity and line laws, orders 1-5 (10 s)
python3 check_hahn_small.py            # hexagon hole laws and counts on nine boxes (3 s)
python3 verify_rational.py             # exact rationals vs the float pipeline (15 s)
python3 tw2.py                         # E[TW2], Var[TW2] (2 s)
python3 constants.py                   # the constants (1 to 2 min, mpmath)
python3 check_scale.py                 # the edge scale against exact one-line laws (5 s)
python3 aztec_exact.py 8,40,320        # exact polar fractions (add orders as wanted; order 1536 takes minutes)
python3 hexagon_exact.py regular 12,48 # exact free fractions; 'skew' for the 3:5:6 family (size k)
python3 fit.py                         # fits, writes data/fits.json
python3 compare.py                     # the tabs' Monte Carlo against the exact values, writes data/compare.json
python3 tables.py                      # the tables of section 3
```

The data behind this report: `data/aztec_exact.json`, `data/hexagon_exact_regular.json`,
`data/hexagon_exact_skew.json`, `data/fits.json`, `data/compare.json`.
