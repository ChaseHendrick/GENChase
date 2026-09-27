# The propagated action potential of Hodgkin and Huxley at their 1952 constants: a computer-assisted existence proof

**Chase Hendrick**, Independent Researcher · [ORCID 0009-0002-9754-6087](https://orcid.org/0009-0002-9754-6087)

**Preprint** in preparation for release 1.0.0, with the programs that check its results and their output.

**[Read the manuscript](paper/paper.md)**

## Abstract

In 1952 Hodgkin and Huxley computed their propagated action potential by hand, shooting in the conduction speed on
their travelling-wave equation (J. Physiol. 117, eq. (31)), and noted that the solution goes off towards plus or minus
infinity on the two sides of the speed. The existence proofs that followed, by Hastings (1976) and Carpenter (1977),
treat modified systems in which the gating variables are slowed or sped up by small parameters. We give a
computer-assisted proof, in ball arithmetic, that the unmodified equation, with Hodgkin and Huxley's rate functions and
constants as printed (including the leak potential 10.613 mV), has a pulse, an orbit homoclinic to rest, at 18.5 C and
at 6.3 C. The speed parameter K is pinned in an interval of width 3e-45 at 18.5 C and 2.8e-61 at 6.3 C. For the fibre
constants of their p. 528 the conduction speed begins 18.73188824788048354046831343329624387695575077 m/s at 18.5 C,
against the 18.8 m/s they computed, and 12.313756720162298508179797283771499327244899734708115548799408 m/s at 6.3 C.
The proof leaves rest along its one-dimensional unstable manifold, carries a whole speed interval through the spike
with a validated Taylor integrator, and closes with an isolating block with a cone condition around rest and a
Wazewski-type shooting argument.

## Status of the results

- **Proved, computer-assisted** (ball arithmetic, FLINT/Arb through python-flint, 256 bits): Theorem 1 (18.5 C) and
  Theorem 2 (6.3 C), with the printed leak potential; Remark 1, the same at 18.5 C with the leak potential that makes
  the resting current zero; the enclosure of the rest state. Lemmas 0, 1 and 2 and the lemmas of Appendices A and B
  are proved in the text; the only outside results used are standard facts about ordinary differential equations,
  cited from Teschl's textbook with theorem and page.
- **Numerical, not proved:** the speed parameter to about 58 digits by high-precision shooting (Remark 2); the profile.
- **Not claimed:** uniqueness of the pulse, stability, other temperatures, the slow pulse.
- **Priority, conditional:** the searches of Appendix C found no earlier existence proof for the unmodified equations.
  Hastings (1976) was read on pp. 229-230 only and Foote and Chen (1981) not at all, and zbMATH Open has no review of
  either; Carpenter (1977) was read in full and treats modified systems with small parameters. No step of the proof
  depends on these papers.
- **Checked by the programs:** negative controls (a shifted speed interval, a perturbed rate function, a bracket
  above the unstable eigenvalue, thinner exit faces, an enlarged block) fail as they must; the closing block is
  re-checked by an independent program in mpmath interval arithmetic; the integrator is tested against an independent
  reference, with a control that must miss.

## Contents

| Folder | What is in it |
|---|---|
| [`paper/`](paper/) | The manuscript, [`paper.md`](paper/paper.md) |
| [`code/`](code/) | The programs, [`run.sh`](code/run.sh) to rerun everything, and [`requirements.txt`](code/requirements.txt) |
| [`data/`](data/) | The certificates of the three proofs (`pulse_proof_*.json`) and their summaries, the numerical centres (`hp_pulse_*.json`), the closing blocks, the reports of the independent block check and of the tests, and the starting profiles |

| Program | What it does | Time |
|---|---|---|
| [`prove_pulse.py`](code/prove_pulse.py) | The proof, stage by stage: configuration, setup (Lemmas A and B, the block), the interval run, the endpoint runs, the two negative controls, the summary | 1 h (18.5 C), 2 h (6.3 C) |
| [`hp_pulse.py`](code/hp_pulse.py) | Numerical: the speed parameter by multiple shooting at 256 bits, to centre the interval | 10 min (18.5 C), 20 min (6.3 C) |
| [`block0.py`](code/block0.py) | The closing block and its cone and entrance conditions | seconds |
| [`block_check_iv.py`](code/block_check_iv.py) | Independent re-check of the block in mpmath interval arithmetic | seconds |
| [`test_lohner6.py`](code/test_lohner6.py) | Tests of the jets and of the integrator, with a negative control | 3 min |
| [`certify_rest_wave.py`](code/certify_rest_wave.py), [`lohner6.py`](code/lohner6.py), [`hhjet6.py`](code/hhjet6.py), [`hhseries.py`](code/hhseries.py), [`hhjet.py`](code/hhjet.py) | The rest state and Lemmas A and B; the integrator; the Taylor jets of the field | |
| [`hhwave.py`](code/hhwave.py), [`pulse_bvp.py`](code/pulse_bvp.py) | Double-precision model and the boundary-value solver that made the starting profiles | |

## Reproduce

From this folder:

```
python3 -m pip install -r code/requirements.txt
sh code/run.sh all          # or: tests, 18.5, 6.3, zero
```

`run.sh` reruns every computation from scratch, one process at a time under `nice` and a time limit, and exits with
status 0 only if every check passed and every negative control failed.

## Cite

```bibtex
@misc{hendrick2026hhpulse,
  author = {Hendrick, Chase},
  title  = {The propagated action potential of {Hodgkin} and {Huxley} at their 1952 constants: a computer-assisted existence proof},
  year   = {2026},
  note   = {Preprint},
  url    = {https://github.com/ChaseHendrick/hh-pulse}
}
```

## License

The manuscript in `paper/` is Copyright (c) 2026 Chase Hendrick, all rights reserved. The programs in `code/` and the
data in `data/` are under the Apache License 2.0. The `LICENSE` file has both.
