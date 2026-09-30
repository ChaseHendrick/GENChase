# Chaos and Analytic Non-Integrability of the Classical Double Pendulum: A Computer-Assisted Proof

**Chase Hendrick**, Independent Researcher · [ORCID 0009-0002-9754-6087](https://orcid.org/0009-0002-9754-6087)

**Preprint** of 27 September 2026, not peer reviewed and not submitted anywhere; release 1.0.4 of its programs and data
is in the companion repository [ChaseHendrick/double-pendulum](https://github.com/ChaseHendrick/double-pendulum),
archived on Zenodo ([doi:10.5281/zenodo.23050590](https://doi.org/10.5281/zenodo.23050590)). Release 1.0.0 remains at [doi:10.5281/zenodo.22997540](https://doi.org/10.5281/zenodo.22997540).

**[Read the preprint (PDF, 24 pages)](paper/double-pendulum.pdf)**

## Abstract

The planar double pendulum with two equal point masses on two equal massless rods is the standard example of chaos in
classical mechanics, but, as far as we could find, neither its chaos nor its non-integrability has been proved at these
parameters: the known proofs need a small parameter (a weak coupling, a small mass ratio, a special link geometry), and
the one variational criterion that needs none has been applied only under a parameter condition that, in the text
available to us, the equal case does not satisfy. We give a computer-assisted proof. At each of the energies
$E = -1/2$, $0$ and $1/2$, in units in which the lower rest state has $E = -3$ and $E = 0$ is the energy of releasing
both arms from rest in the horizontal position, the flow on the energy level has a hyperbolic periodic orbit with a
transversal homoclinic orbit, and the same holds simultaneously for every energy in $[-10^{-10}, 10^{-10}]$.
Consequently every real-analytic function on such a level that is invariant under the flow is constant, and the
double pendulum has no real-analytic first integral functionally independent of the energy on any connected open set
that contains the level $E = 0$. At each of these three energies, explicit covering relations between h-sets give a
topological horseshoe (a compact invariant set semiconjugate to a subshift of finite type) with explicit bounds; at $E = 0$: the Poincaré return map has a
compact invariant set on which its topological entropy exceeds $0.1016$, and the topological entropy of the flow on
the level exceeds $0.0138$ per unit time. The proofs combine interval arithmetic (the CAPD library), the time-reversal
symmetry of the pendulum, cone conditions for the local unstable manifold and covering relations; the programs and
their output accompany the paper. Meromorphic non-integrability in the sense of Morales-Ruiz and Ramis remains open.

## Status of the results

- **Computer-assisted:** Theorem 1 (a symmetric hyperbolic periodic orbit with a transversal homoclinic orbit at
  $E = -1/2, 0, 1/2$), Theorem 2 (the same for every $E$ in $[-10^{-10}, 10^{-10}]$ at once) and Theorem 3 (explicit
  topological horseshoes at $E = -1/2, 0, 1/2$ from covering relations: at least $0.0906$, $0.1016$, $0.0906$ per return for the
  return map on a compact invariant set, and $0.0213$, $0.0138$, $0.0129$ per unit time for the flow). Written lemmas
  (Krawczyk, cone conditions, the local unstable manifold by a graph transform, the symmetric transversal crossing, a
  local lambda-lemma, covering relations to entropy, the entropy of the flow from a section), with every hypothesis verified in interval
  arithmetic by the programs below.
- **Proved from these:** Corollary 1 (topological horseshoe and positive topological entropy at the three energies, from
  Theorem 3), Corollary 2 (no non-constant real-analytic invariant function on these levels; Kozlov's argument,
  written out) and Corollary 3 (no real-analytic first integral independent of the energy on any connected open set
  containing the level $E = 0$). On the energy interval no horseshoe is proved. Smale's 1965 proof does not apply to an
  area-preserving map as written; later forms of the Smale-Birkhoff theorem, not read here, would give horseshoes on
  the whole interval, and the paper does not use them (Remark 2).
- **Numerical:** how the orbit, the crossing and the h-sets were found; Poincaré sections; a high-precision check of the
  crossing without error control.
- **Limitations:** the proof trusts CAPD's rigorous integrator and Poincaré map (and our reading of its code for sets
  that start on the section), the compiler and the floating-point rounding. Bolotin and Negrini (Russ. J. Math. Phys.
  5, 1997) were read only in snippet view; the statement that the global non-integrability and the chaos had not been
  proved rests on that reading (Section 8 of the paper). Only the stated energies are covered. Meromorphic
  non-integrability is not proved.

## Contents

| Folder | What is in it |
|---|---|
| [`paper/`](paper/) | The manuscript: [`double-pendulum.tex`](paper/double-pendulum.tex) (LaTeX, the only source) and its build [`double-pendulum.pdf`](paper/double-pendulum.pdf) |
| [`code/`](code/) | The programs below, the build and rerun scripts, and [`requirements.txt`](code/requirements.txt) for the Python parts |
| [`configs/`](configs/) | The inputs of the proofs and of the controls |
| [`data/`](data/) | The reports the programs write |

| Program | What it checks | Arithmetic | Time |
|---|---|---|---|
| [`code/check_field.py`](code/check_field.py) | the vector field given to CAPD is exactly Hamilton's equations of the double pendulum; the section lift solves $H = E$ | exact (SymPy) | seconds |
| [`code/prove.cpp`](code/prove.cpp) | Theorems 1 and 2: Krawczyk fixed point and its symmetry, cone conditions on the local box, the transversal crossing of the symmetry line (`configs/E0.cfg`, `Ehalf.cfg`, `Eminushalf.cfg`, `E0_interval.cfg`) | interval (CAPD) | 3 to 10 min each |
| [`code/cones.cpp`](code/cones.cpp) | condition (C4) of Lemmas 5 and 8: a bound on the derivative over the local box, for the graph transform and the local lambda-lemma, and the position of the fixed point in the box, with stage 1 repeated and compared exactly (same configurations as `prove.cpp`) | interval (CAPD) | about 10 s each |
| [`code/horseshoe_check.cpp`](code/horseshoe_check.cpp) | Theorem 3: the covering relations, disjointness, the return-time bound and the entropy bound (`configs/horseshoe_E0.cfg`, `horseshoe_Ehalf.cfg`, `horseshoe_Eminushalf.cfg`) | interval (CAPD) | 5 to 15 min |
| controls | four coarse ones (the integrable limit, two mutated configurations, three covering relations that must not hold) and five near misses (a thin target, a wide target and an overlapping h-set for one true covering relation; (C4) over the stable direction and with the fixed point off centre), each of which must FAIL, the near misses for their stated reason | interval (CAPD) | minutes |
| [`code/crosscheck/`](code/crosscheck/) | an independent rigorous integrator in Arb: `kraw3.py` (Krawczyk at $E = 0$, box radius $10^{-17}$), `otherE.py` (point enclosures at $E = \pm 1/2$), `edges_nr.py` (the crossing at high precision, numerical) | ball (Arb) and numerical | 5 min, 1 min, 3 min |
| [`code/horseshoe_design.cpp`](code/horseshoe_design.cpp), [`scan.cpp`](code/scan.cpp), [`manifold.cpp`](code/manifold.cpp), [`explore.cpp`](code/explore.cpp) | numerical: the h-set design, symmetric periodic orbits, the unstable manifold and its crossings, Poincaré sections | floating point | |

## Reproduce

From this folder (needs g++ with OpenMP, cmake, git and Python 3):

```
python3 -m pip install -r code/requirements.txt
sh code/run_all.sh            # builds CAPD at the pinned commit and the programs; about 85 minutes on 2 threads
cd code/crosscheck && for c in kraw3 otherE edges_nr; do python3 $c.py > ../../data/crosscheck_$c.txt; done; cd ../..
cd paper && pdflatex double-pendulum.tex && pdflatex double-pendulum.tex && pdflatex double-pendulum.tex
```

`run_all.sh` prints `PROVED` for `E0`, `Ehalf`, `Eminushalf` and `E0_interval`, "(C4) VERIFIED" for the same four
configurations, "all covering relations VERIFIED" for the three horseshoes (on the committed configurations), and "fails,
as it must" for the nine controls (for the near misses, after checking the reason in the report), and writes the reports to `data/`; it exits with an error
if a proof fails or a control passes. `NT` sets the number of threads; `CAPD_CONFIG` can point at an existing CAPD
build. The reports in `data/crosscheck_*.txt` are the output of the three cross-check programs (about 10 minutes).

The three h-set designs (numerical) are regenerated by `sh code/designs.sh`, which writes them to a temporary folder
and compares them with the committed configurations; on the machine used here all three are reproduced byte for
byte. The committed files are the ones `run_all.sh` checks.

## License

The manuscript in `paper/` is Copyright (c) 2026 Chase Hendrick, all rights reserved. The programs in `code/`, the
configurations in `configs/` and the reports in `data/` are under the Apache License 2.0. CAPD (GPL) is not included:
`code/build.sh` fetches it at a pinned commit. See `NOTICE`.

### Rebuild the manuscript figure

The vector figure `paper/figures/section-enclosures.pdf` displays the E = 0 h-set centres from
`configs/horseshoe_E0.cfg` and the two candidate image enclosures from `data/E0.txt`.
It does not integrate an orbit or rerun the proof. Centres are numerical design values;
rectangle endpoints are copied from the stored interval report. The plotted boxes alone
are not a test of transversality. The caption gives the coordinate scales and these limits.

```sh
python3 -m pip install -r code/requirements-figures.txt
python3 code/make_figures.py
```

The generator also writes `paper/figures/section-enclosures-sources.json` with input SHA-256
hashes, parsed enclosure endpoints and plotting-library versions.
