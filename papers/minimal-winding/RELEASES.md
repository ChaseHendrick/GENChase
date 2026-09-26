# Releases

Each release of this repository is archived on Zenodo with its own DOI. The manuscript is a preprint and
has not been peer reviewed.

## v2.1.0 (2026-09-25)

**DOI:** [10.5281/zenodo.22966989](https://doi.org/10.5281/zenodo.22966989)

The corrected paper after two further independent readings of the parts merged in from the α-model draft
(Sections 4 to 8). No result changes; 38 pages. Changes since v2.0.0:

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

## v2.0.0 (2026-09-25)

**DOI:** [10.5281/zenodo.22963796](https://doi.org/10.5281/zenodo.22963796)

The paper becomes *Minimal Winding in the Self-Similar Collapse of Point Vortices*: the alpha-model draft is merged in, and it grows from 14 to 36 pages. A major version because the title, scope and files changed. Changes since v1.0.0:

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

## v1.0.0 (2026-09-25)

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
