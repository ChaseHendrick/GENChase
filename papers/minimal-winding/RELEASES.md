# Releases

Each release of this repository is archived on Zenodo with its own DOI. The manuscript is a preprint and
has not been peer reviewed.

## Unreleased

Changes since v1.0.0, to appear in the next release:

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
