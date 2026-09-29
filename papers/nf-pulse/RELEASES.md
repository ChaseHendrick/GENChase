# Releases

Each release of this repository is archived on Zenodo with its own DOI. The manuscript is a preprint and has not been
peer reviewed.

## 1.0.4 (2026-09-29)

Publication figures, contact and rights update. Improves pulse-profile typography, units and line styles at the actual printed width. The manuscript uses the updated public research contact. Manuscript rights are stated outside the scientific abstract, preserving the existing policy and earlier license grants. Archive metadata identifies mixed component rights rather than applying the code license to the whole preprint ZIP. Reference-list reading-status annotations have been removed where present. No theorem, proof program or certificate changes. The release includes its rebuilt manuscript PDF; previous archives remain unchanged.

## 1.0.3 (2026-09-29)

**DOI:** [10.5281/zenodo.23047061](https://doi.org/10.5281/zenodo.23047061). Publication / Preprint; the downloaded archive ZIP contains the registered manuscript PDF.

Publication metadata and packaging update. The manuscript now identifies the public companion and its immutable checking-release archive. The source ZIP includes the rebuilt manuscript PDF. Citation metadata includes a usable publication locator and explains the component license terms. No theorem, proof program, certificate or scientific claim changes. Earlier archives remain available unchanged.

## 1.0.2 (2026-09-28)

**DOI:** [10.5281/zenodo.23028520](https://doi.org/10.5281/zenodo.23028520) (2026-09-29). The previous archive is unchanged.

A checking release. The manuscript is unchanged. The README no longer says the fast speed is about a longer prefix: the speed is the open bracket (c_1, c_1 + 10^-25), and the slow speed is the same kind of bracket. This archive adds `code/check_quote.py`, `code/check_abstract.py`, `code/check_fast.py`, `code/check_class.py`, `code/check_gain.py`, `code/check_faye.py` and `code/check_hypotheses.py`. The ledger names the fast endpoint, the slow endpoints, the gain-12 endpoint, Faye's three rows, and the bottom piece of the stability winding. Those files are not the whole proofs. The epsilon-range theorem is not in the ledger. Nonlinear stability is not proved. Enculescu 2004 and Sandstede 2007 stay unread.

## 1.0.1 (2026-09-27)

**DOI:** [10.5281/zenodo.23002938](https://doi.org/10.5281/zenodo.23002938)

A spelling release of *Traveling Pulses in a Neural Field with a Smooth Firing Rate: Computer-Assisted Existence and
Spectral Stability*. The preprint and the texts of this repository now write "traveling", the American spelling, in
the title and every sentence of the project's own. Titles of cited works and quotations keep their authors' spelling.
No theorem, program, number or certificate changed; the PDF was rebuilt from the edited source.

## 1.0.0 (2026-09-27)

**DOI:** [10.5281/zenodo.22998376](https://doi.org/10.5281/zenodo.22998376)

The first public release of the preprint *Traveling Pulses in a Neural Field with a Smooth Firing Rate:
Computer-Assisted Existence and Spectral Stability* (39 pages), with the programs that prove its results and their
output.

### What the paper shows

Pinto and Ermentrout's neural field u_t = -u - v + w * S(u), v_t = eps (u - gamma v), with the kernel e^(-|x|)/2 and
the logistic firing rate S(u) = 1/(1 + e^(-beta (u - theta))), has traveling pulses. For a Heaviside rate, Pinto, Jackson
and Wayne treat them without assuming slow recovery; for smooth rates, the existence results we found need eps
sufficiently small or rest on conditions not verified for any example. The paper proves pulses at explicit parameters, with eps not small, by
computer-assisted proofs in ball arithmetic.

- **Fast pulse** (Theorem 1, computer-assisted). For beta = 20, theta = 1/4, gamma = 0 and eps = 1/10 there is a
  traveling pulse with speed in (c1, c1 + 10^-25), c1 = 1.1027477097341592491478677.
- **A range of eps** (Theorem 2, computer-assisted). A fast pulse exists for every eps in [0.08, 0.13693] and in five
  further short intervals, one of which contains 3/20, with a speed window at each eps: 386 certificates of covering
  relations with one unstable direction.
- **Slow pulses and two pulses** (Theorem 3 and its corollary, computer-assisted). A slow pulse exists at eps = 1/10
  and at eps = 3/20, so at each of these values there are at least two pulses.
- **Pinto and Ermentrout's sigmoid** (Theorem 4, computer-assisted). A fast pulse exists for (1 + tanh(6(u - 1/4)))/2
  at eps = 3/20, where the rest state is a saddle-focus.
- **Synaptic depression** (Theorem 5, computer-assisted). A fast pulse exists in Faye's neural field with synaptic
  depression at his other parameters for eps = 1/100, 1/50 and 1/20.
- **Spectral stability** (Theorem 6, computer-assisted). For every pulse of a nonempty class defined by a speed
  bracket of width 10^-58 at the parameters of Theorem 1, the spectrum of the linearization in Re lambda >= -1/20 is
  {0}, and 0 is algebraically simple: an Evans function is enclosed on the boundary of a box and its winding number is
  1. Nonlinear stability is not proved.
- **Numerical, not proved:** the speed of the fast pulse to about 58 digits, the profile, where the method stops in
  eps, and a double-precision Evans function.

The proofs combine a validated parametrization of the one-dimensional unstable manifold, a validated Taylor integrator
of Lohner type and a shooting argument of Wazewski type at a block around the rest state. Enculescu (Physica D 196,
2004) could not be reached and was not read, and Sandstede (2007) is known from its abstract only; the paper says what
the works it read contain and makes no claim to be first.

### Checked by computer

- `code/run_all.sh`: Theorem 1, 20 checks (9 proof steps, 4 tests of the integrator, 7 negative controls), about six
  minutes with its parallel steps run one after another.
- `ext/slow-pulse/code/run_all.sh` (26 checks), `ext/gain-12/code/run_all.sh` (23), `ext/eps-range/run_checks.sh`
  (8; the coverage of [0.08, 0.13693] by the stored certificates, and one interval proved from scratch with its
  negative controls), `ext/faye-model/code/run_all.sh 1/20` (and `1/50`, `1/100`; 14 checks each) and
  `ext/stability/run_all.sh quick` (15 checks): Theorems 2 to 6.
- Each script exits with status 1 if a proof step fails or a negative control passes, refuses `python -O`, and clears
  every `NF_*` environment variable; every program of the folder also refuses `python -O` by itself.
- The checks made within the project by separate AI agent sessions instructed to find errors, and the reruns, are in
  `review/` and in the `REPORT.md` of each folder under `ext/`; none is an outside review.

### Files

- `paper/nf-pulse.pdf`: the paper. `paper/nf-pulse.tex` is its LaTeX source.
- `code/` and `data/`: the programs and certificates of Theorem 1, and `code/requirements.txt`.
- `ext/`: the programs, certificates and reports of Theorems 2 to 6 (`eps-range`, `slow-pulse`, `gain-12`,
  `faye-model`, `stability`).
- `review/`: the checks of the proof of Theorem 1 made within the project, the prior-article searches and the record
  of the reruns (`review/RERUNS.md`).

### Reproduce

```
python3 -m pip install -r code/requirements.txt
sh code/run_all.sh
sh ext/slow-pulse/code/run_all.sh
sh ext/gain-12/code/run_all.sh
sh ext/eps-range/run_checks.sh
sh ext/faye-model/code/run_all.sh 1/20
sh ext/stability/run_all.sh quick
```

Section 8 of the paper lists the times and the longer runs.

### License

The manuscript in `paper/` is Copyright (c) 2026 Chase Hendrick, all rights reserved. The programs and data are
licensed under the Apache License 2.0.
