# Releases

Each release of this repository is archived on Zenodo with its own DOI. The manuscript is a preprint and
has not been peer reviewed.

## 2.2.0 (unreleased)

The paper takes in the results of a separate note by the same author on the same collapsing families, which is
retired and will not get a record of its own: explicit forms and worked examples for its three-vortex and ring
families, and a proved expansion of the ring minimum. It also adds credits to Gotoda's Fig. 3(b), to Chen, Walsh and
Wheeler, to Yudovich and to Crippa and Stefani, and credits Gröbli's closed form of P for every triple of
circulations. No earlier result changes; 41 pages. A minor version because content was added. Changes since 2.1.0:

- **Equal circulations, in elementary form** (Remark 2). With v = tan χ, P = v + 1/(2v), and
  P − √2 = (√2 v − 1)²/(2v) is a second proof of the bound √2. P is unchanged under v ↦ 1/(2v), so χ = π/4 and
  Kimura's fastest collapse (cos 2χ = 3/5) both have P = 3/2. The minimizing triangle has the interior angles
  π/8, 5π/8 and π/4, the last at the vortex of circulation −1/2. The rates are Kimura's (1987, Eq. (4.4)).
- **Gröbli's closed form, credited and written out** (Section 2, after Lemma 3, and Remark 2). Gröbli's §10
  (1877), Eqs. (8), (9) and (12), is the first closed form of P, for every triple of circulations with
  1/Γ₁ + 1/Γ₂ + 1/Γ₃ = 0: his rotation is dϑ = ϰ dt/(2t), with t measured from the collision, so P = |ϰ|/2, and
  by our calculation Lemma 6 at β = 1 gives the same value. For the circulations (1, 1, −1/2) it reads
  P = (2a_G² − 3)/(2√(3a_G² − 9)) in his shape constant, written a_G in the paper, and a_G = √3/cos χ turns this
  into the formula of Remark 2; P² − 2 = (2a_G² − 9)²/(12(a_G² − 3)). The formulas are Gröbli's; the substitution
  and the check through Lemma 6 are our calculation. His §10 describes the possible shapes of the triangle but does
  not discuss the extremum of ϰ, and the paper's statements that it has not found P minimized now name Gröbli. His
  coefficient is written ϰ, a glyph distinct from the paper's κ. Goodman's English translation prints the
  denominator of his Eq. (9) as μ₁μ₃μ₃ in its (10.9); the original has μ₁μ₂μ₃.
- **The critical cosines for μ = 1/2 in closed form** (Proposition 1): the minima are attained at
  cos θ = c₁ = −0.9243893679… and c₀ = 0.6739838839…, the trigonometric roots of an explicit cubic.
- **Two worked examples after Proposition 3.** The five-vortex configuration of Gotoda's Fig. 3(b)
  (circulations −1, −1, 1/2, 1/2, −3/4) has P = (3/16)(7 − 4 cos 2θ)/sin 2θ ≥ 3√33/16 = 1.0771054962…, with
  equality at cos 2θ = 4/7. For the central circulation 1/2 the constant κ of the five vortices equals that of
  the three vortices of Remark 2 at the normalizations used, as an identity between the two formulas.
- **The growth of the ring minimum** (Section 5): F_n = (1/4) e^√(n/2) (1 + 29/(12√(2n)) + 265/(576n) + O(n^(−3/2))),
  proved in the text; in particular F_n → ∞.
- **Credits and a corrected scope statement** (Discussion). Vortex patches exist for all time by Yudovich's theorem
  (1963), cited with Crippa and Stefani (2024) for the whole plane. Chen, Walsh and Wheeler (Math. Ann. 396 (2026) 5)
  prove that collapsing point-vortex configurations that are non-degenerate in their sense can be desingularized
  into hollow vortices that implode self-similarly. The two configurations they verify lie in the paper's families:
  their triple is the μ = 1/2 configuration of Proposition 1 at θ = π/2, and their quartet is the n = 2
  configuration of Proposition 2 at θ = π/12. So one member of each family is non-degenerate, and by analyticity all
  but isolated members of the arcs containing them; the minimizers are not checked. The argument states the two
  properties of their map V (their Eq. (4.4)) that it uses: V is real-analytic, and rotations, dilations with
  Ω ↦ λ⁻²Ω, a positive factor in the circulations with Ω ↦ cΩ, and relabeling change V by an invertible linear map.
  The numbering cited is that of arXiv:2506.04093v1 and is the same in the journal version; both print the quartet's
  third position as −√3/2 − 1 − i/2, which has to be read with +i/2. The paper no longer calls every finite-core
  analysis future work.

How it was checked. Every mathematical addition is proved in the text. The readings of Gröbli, Goodman, Kimura and
Chen, Walsh and Wheeler are statements about sources: the programs check them for internal consistency and against
the Biot–Savart velocities, not against the sources themselves. `code/verify_general_mu.py` now makes 145 checks
(24 new: the forms and angles of Remark 2 exactly and at 50 digits; Gröbli's equations symbolically, for (1, 1, −1/2)
and for every triple of circulations, against the Biot–Savart velocities and on his own example of Fig. 6, with the
translation's misprint run through the same substitution as a negative control; the closed forms of Proposition 1 at
60 digits; and the triple of Chen, Walsh and Wheeler exactly and at 50 digits, with their map V and its behaviour
under the symmetries), and `code/verify_central_vortex.py` makes 103 (23 new: the two examples and the quartet of
Chen, Walsh and Wheeler exactly and against the Biot–Savart velocities at 50 digits, with their map V and with the
quartet's misprinted position as a negative control, and the expansion of F_n as a series and at 50 digits up to
n = 10¹², with a negative control). Their output is `data/verify-general-mu-2026-09-27.txt` and
`data/verify-central-vortex-2026-09-27.txt`. Table 1 has six new rows. Three in-project readings of the added
passages, each told to find errors, were made before the release, the third briefed only with the paper and its
programs; their confirmed findings are fixed in this version. None is an outside review.

Files: `paper/minimal-winding.tex` and `paper/minimal-winding.pdf`, the two programs and their output in `data/`,
and this README. To reproduce, run the two programs from the folder of this README, as the README says, and build
the PDF with pdflatex three times. The manuscript stays all rights reserved; the programs and data stay under the
Apache License 2.0.

## 2.1.0 (2026-09-25)

**DOI:** [10.5281/zenodo.22966989](https://doi.org/10.5281/zenodo.22966989)

The corrected paper after two further independent readings of the parts merged in from the α-model draft
(Sections 4 to 8). No result changes; 38 pages. Changes since 2.0.0:

- **Two misstatements fixed.** Lemma 6 is stated for collapses, since its formula P = |S|/(8A) uses the sign of
  Re κ, and Corollary 2 now shows that no vortex starts at the collision point, which its path-length bound needs.
- **The certificates cite what they rest on.** Section 8 states the Krawczyk–Moore theorem in the form of Rump
  (Acta Numerica 2010, Theorem 13.3): the inclusion proves a unique zero and the invertibility of every Jacobian in
  the box, which Theorem 5 uses for its families. It names the trust base (Arb, python-flint and the listed
  functions), says that non-dyadic parameters enter as balls, writes out the second-order argument for strict
  minima, and says that the angular impulse vanishes by Section 2 while the program only checks its enclosure.
- **Proofs written out and notation cleaned up.** The converse of Lemma 5 and the proof of Lemma 4 are written in full,
  the standing hypothesis α > −2 opens Section 4, clashing symbols are renamed, and the extremal angle is stated as
  a directed angle with its asymptotics.
- **Programs.** `certify_collapses.py` checks the sign of the objective rigorously in its α-model part (94 checks);
  `verify_alpha_winding.py` solves the Badin–Barry side ratio at Γ = 0.49 exactly (0.7514840918…);
  `sqg60-certificate.json` no longer records a run time, so a rerun reproduces it exactly; stale section and
  equation labels in `verify_general_mu.py` are corrected.

## 2.0.0 (2026-09-25)

**DOI:** [10.5281/zenodo.22963796](https://doi.org/10.5281/zenodo.22963796)

The paper becomes *Minimal Winding in the Self-Similar Collapse of Point Vortices*: the alpha-model draft is merged in, and it grows from 14 to 36 pages. A major version because the title, scope and files changed. Changes since 1.0.0:

- **A new title and one paper instead of two.** The paper is now *Minimal Winding in the Self-Similar
  Collapse of Point Vortices*. The separate draft on the α-models (*A sharp winding bound for the
  self-similar collapse of three point vortices in the α-models*) is merged into it, with its programs,
  data and figure, and the LaTeX source is now the only source: the Typst copy was dropped.
- **The α-models** (Section 4). In the generalized Euler models, where a vortex of circulation Γ induces
  the velocity Γ r^(−α−1)/(2π), every self-similar collapse of three vortices has
  P > √(3+α)/(2+α) for every α > −2, and the constant is sharp. At α = 0 it is the bound √3/2 for Euler
  vortices. For α > −1, where the velocity decays with distance, the proof is a chain of elementary
  inequalities; for −2 < α ≤ −1 a second elementary argument completes one step of it (Remark 4). No
  step uses a computer: an earlier draft needed an interval-arithmetic step there and reached only
  α ≥ −59/40.
- **More than three vortices, with computer-assisted proofs** (Section 7). In ball arithmetic (FLINT/Arb
  through python-flint, 320 bits, the Krawczyk operator): four, five and six Euler vortices can collapse
  self-similarly with P < √3/2, and P has strict local minima 0.7978967838…, 0.7448144569… and
  0.7136801485… on those collapses; four vortices go below the three-vortex bounds at α = 1 and α = 2;
  eleven vortices at α = 2 can collapse without rotating at all, each moving straight into the
  collision point; and so can sixty vortices in the SQG model. Whether these local minima are global is
  not proved.
- **Numerical results for many vortices**, labelled as such: minima for N = 7 to 12, and a two-arm family
  down to P = 0.4793959201… at N = 603 whose values tend, by cubic Richardson extrapolation, to
  0.4773635.
- New programs: `code/certify_collapses.py` (92 checks, with its `certify_*.py` modules),
  `code/certify_sqg60.py` (11 checks, reusing those modules), `code/verify_strong_vortex.py`
  (143 checks), `code/verify_pairs_bound.py` (69 checks), `code/verify_alpha_winding.py`,
  `code/verify_alpha_below.py`, `code/verify_alpha_equal_circulations.py`,
  `code/verify_many_vortices.py` and `code/plot_alpha_winding.py`, and the stored many-vortex
  configurations in `data/`.
- **Why the same constant appears twice** (Theorem 3). A strong vortex carrying any number of weak, tight
  pairs of opposite sign has P ≥ √3/2 − o(1) as the pairs weaken, and P comes close to √3/2 only when every
  pair is tilted at 60° to the direction away from the strong vortex and all pairs are at the same
  distance. It explains why √3/2 is the limit both for three vortices and for the rings with a central
  vortex; it credits Krishnamurthy and Stremler (2018), who describe the one-pair picture without the
  rotation.
- **The bound at a fixed strength for weak pairs** (Proposition 4). Once the pairs are weaker than a
  threshold, which depends only on the number of pairs and the constant of the class but is not explicit,
  P ≥ √3/2 + (√3/8)c²γ² > √3/2. Near equality the bound sharpens to P ≥ √3/2 + (C* − Kγ)γ², with an
  explicit coefficient C* ≥ (√3/4) min a_j² built from the directions of the pairs, and a sum-of-squares
  identity shows that the weighted mean of its terms is positive. The coefficient is attained, up to
  O(γ³), by the rings with a central vortex and by three vortices, and numerically by the other exact
  collapses computed (Remark 6). A new
  program, `code/verify_pairs_bound.py` (69 checks), checks every identity of the proof exactly and the
  remainder bounds on random configurations and on exact collapses at 50 digits.
- **A comparison with gravity**, in the Discussion: a Newtonian collapse that keeps its shape needs zero
  angular momentum and then falls straight in (Wintner 1941), whereas three vortices, and the ring
  configurations, cannot collapse without turning.
- **Two concentric vortex polygons with a vortex at their common center** (Proposition 3). For every
  n ≥ 2 and every circulation of the central vortex, P > √3/2, and no larger constant holds for all of
  them: the minimum over the relative rotation decreases to √3/2 as the central circulation grows, with
  an explicit leading correction.
- **Figure 2**: the minimizing configurations for circulation ratios 1/2 and 0.05, with the spiral path of
  each vortex into the collision point.
- **Meaning and limits**, a new paragraph in the Discussion: how much a collapsing configuration must
  turn, what the results do and do not cover (point vortices, not vortices with finite cores).
- Cites Donati and Godard-Cadillac, *Hölder regularity for collapses of point-vortices*
  (arXiv:2111.14230).
- The title is in title case.
- A new verification program, `code/verify_central_vortex.py` (80 checks, exact and at 30 and 50 digits).
- Every program carries the full Apache License 2.0 notice and an SPDX tag, and a `NOTICE` file names the
  work and its copyright holder.

## 1.0.0 (2026-09-25)

The first public release of the preprint *Minimal winding in the self-similar collapse of three point
vortices and of two concentric vortex polygons* (14 pages), with the programs that check every result and
their output.

**DOI:** [10.5281/zenodo.22953035](https://doi.org/10.5281/zenodo.22953035)

### What the paper shows

When point vortices collapse onto a single point in a self-similar way, each vortex spirals in on a
logarithmic spiral. The number P = |ω₀|t_c, the initial angular velocity times the collapse time, measures
how tightly the spiral winds: while the configuration shrinks from size r₀ to size r, it turns through the
angle P ln(r₀²/r²).

- **Three vortices.** For every ratio of the circulations the collapsing configurations form two arcs, one
  for each orientation of the vortex triangle, and on each arc P has exactly one minimum. The squares of
  the two minima are roots of an explicit cubic.
- **A sharp bound.** Every self-similar collapse of three point vortices has P > √3/2, and no larger
  constant works. Equivalently, every vortex travels more than twice its initial distance from the
  collision point, and its path makes an angle of more than 60° with the direction to the collision point.
  The paper gives two proofs, one from the cubic and one direct.
- **An explicit case.** For circulation ratio 1/2 the two minima are 1.0647059762… and 2.2038550160…, the
  positive roots of 8748ξ⁶ − 49005ξ⁴ + 27794ξ² + 18723; they cannot be written with real radicals.
- **Two concentric regular polygons** with opposite circulations: P has a closed form in the relative
  rotation of the polygons, and its minimum is explicit; for pentagons it is √31682/80.

### Checked by computer

- `code/verify_general_mu.py`: the general theory, 121 checks, exact (SymPy) and in high-precision
  arithmetic (mpmath), about 30 seconds.
- `code/verify_floors_independent.py`: the ratio 1/2 and the polygons, recomputed independently, with
  interval arithmetic where the proofs need it, about a minute.
- `code/verify_direct_proof.py`: every identity in the direct proof, exactly, in a few seconds.

Each program stops with an error if any check fails. Their output is in `data/`.

### Files

- `paper/minimal-winding.pdf`: the paper. `paper/minimal-winding.tex` is its LaTeX source,
  `paper/minimal-winding.typ` a Typst copy of the same text, and `paper/figures/` holds the figure.
- `code/`: the verification programs and the plotting script, with `requirements.txt`.
- `data/`: the output of the verification programs.

### Reproduce

```
python3 -m pip install -r code/requirements.txt
python3 code/verify_general_mu.py
python3 code/verify_floors_independent.py
python3 code/verify_direct_proof.py
```

### License

The manuscript in `paper/`, its figures included, is Copyright (c) 2026 Chase Hendrick, all rights
reserved. The programs in `code/` and the data in `data/` are licensed under the Apache License 2.0.
