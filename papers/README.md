# Papers

One folder per paper, each laid out as a research compendium: the manuscript and its PDF in
`paper/`, the programs in `code/`, their output in `data/`, a README with the abstract, how to
reproduce and how to cite, and two working folders that stay in this repository, `notes/` and
`submission/`.

| Paper | Status | Public repository |
|---|---|---|
| [Minimal Winding in the Self-Similar Collapse of Point Vortices](minimal-winding/) | preprint with its code and data (release 2.2.2, doi:10.5281/zenodo.23047024; release 2.2.0 remains doi:10.5281/zenodo.22994932); journal submission next, arXiv deferred until an endorsement; not peer reviewed | [ChaseHendrick/minimal-winding](https://github.com/ChaseHendrick/minimal-winding) |
| [Point-Vortex Collapse Without Rotation: A Cluster Mechanism, a Phase Diagram and a Continuum Limit](collapse-without-rotation/) | preprint with its code and data (release 1.0.2, doi:10.5281/zenodo.23047025; release 1.0.0 remains doi:10.5281/zenodo.22969841); not peer reviewed | [ChaseHendrick/collapse-without-rotation](https://github.com/ChaseHendrick/collapse-without-rotation) |
| [Stable Self-Similar Expansion of Four and Five Point Vortices and Confinement of Vortex Patches](stable-expansion/) | preprint with its code and data (release 1.0.2, doi:10.5281/zenodo.23047037; release 1.0.0 remains doi:10.5281/zenodo.22971173); computer-assisted; not peer reviewed | [ChaseHendrick/stable-expansion](https://github.com/ChaseHendrick/stable-expansion) |
| [A Finite Rank Window Cannot Show That a Neural Population Code Satisfies the Eigenspectrum Smoothness Bound](rank-window/) | methods note with its programs and outputs (release 1.0.2, doi:10.5281/zenodo.23047040; release 1.0.0 remains doi:10.5281/zenodo.22994835; outputs CC BY-NC 4.0); not peer reviewed | [ChaseHendrick/rank-window](https://github.com/ChaseHendrick/rank-window) |
| [Hopf Bifurcations and Bistability in the Hodgkin-Huxley Equations at the 1952 Parameters: Computer-Assisted Proofs](hh-dynamics/) | preprint with its programs and outputs (release 1.0.3, doi:10.5281/zenodo.23047046; release 1.0.1 remains doi:10.5281/zenodo.23002943); computer-assisted; not peer reviewed | [ChaseHendrick/hh-dynamics](https://github.com/ChaseHendrick/hh-dynamics) |
| [The Propagated Action Potential of Hodgkin and Huxley at Their 1952 Constants: A Computer-Assisted Existence Proof](hh-pulse/) | preprint with its programs and data (release 1.0.2, doi:10.5281/zenodo.23047089; release 1.0.0 remains doi:10.5281/zenodo.23013935); computer-assisted; not peer reviewed | [ChaseHendrick/hh-pulse](https://github.com/ChaseHendrick/hh-pulse) |
| [Chaos and Analytic Non-Integrability of the Classical Double Pendulum: A Computer-Assisted Proof](double-pendulum/) | preprint with its programs and data (release 1.0.2, doi:10.5281/zenodo.23047057; release 1.0.0 remains doi:10.5281/zenodo.22997540); computer-assisted; not peer reviewed | [ChaseHendrick/double-pendulum](https://github.com/ChaseHendrick/double-pendulum) |
| [Traveling Pulses in a Neural Field with a Smooth Firing Rate: Computer-Assisted Existence and Spectral Stability](nf-pulse/) | preprint with its programs and data (release 1.0.3, doi:10.5281/zenodo.23047061; release 1.0.1 remains doi:10.5281/zenodo.23002938); computer-assisted; not peer reviewed | [ChaseHendrick/nf-pulse](https://github.com/ChaseHendrick/nf-pulse) |
| [Stable Rotating Waves in Rings of a Modified Ventricular Myocyte Model Near a Hopf Point: Computer-Assisted Proofs in Fourier Space](cardiac-rings/) | draft with its programs and data; computer-assisted | none yet |

The alpha-model draft that used to be a second paper here was merged into the minimal-winding paper on
2026-09-25 (owner's decision), with its programs, data and notes.

[`papers.json`](papers.json) is the record of each paper's status, and the software paper is listed there too
(it lives in `paper/`). The identities note, which used to be listed as well, is retired (2026-09-27): its results
are proved in the minimal-winding paper, release 2.2.0, and `identities/` stays as the provenance record.

This repository may be private, so a paper never sends readers here. When `papers.json` marks a paper
`ready`, the **publish papers** workflow copies its folder, without `notes/` and `submission/`, to its
own public repository, adds a LICENSE, a CITATION.cff and a .zenodo.json, and locks that repository so
only its owner can change it. You can edit the public repository directly as well: the workflow merges
its updates and never overwrites your edits there, and `sh tools/paper-pull.sh <id>` brings those edits
back here. A release there gives the paper's programs and data a Zenodo DOI.
[docs/PUBLISHING-PAPERS.md](../docs/PUBLISHING-PAPERS.md) is the runbook.

| Command | What it does |
|---|---|
| `sh tools/paper-build.sh <id>` | Builds `paper/<id>.pdf` from the LaTeX source, as arXiv does |
| `node tools/paper-check.js` | Checks every paper: titles, page counts, references, stray email addresses, and whether it can go public |
| `node tools/paper-sync.js --check <id>` | Stages the public repository in a scratch folder and lists anything that points back here |
| `sh tools/arxiv-bundle.sh <id>` | Writes the arXiv upload, the LaTeX source and its figures, outside the repository |
| `sh tools/paper-pull.sh <id>` | Brings edits made directly in the public repository back into `papers/<id>/` |

Seven LaTeX manuscripts retain the author's contact address in their author block; the pulse Markdown manuscript has no email in its original author line. No contact address was removed in the publication audit. The
READMEs, CITATION.cff, the submission files and the other pages of the repositories leave it out (owner's
decision, 2026-09-25). `paper-check` and `paper-sync` refuse an address anywhere else, and any other
address anywhere. Manuscript text is Copyright (c) 2026 Chase Hendrick, all rights
reserved; programs and data are Apache-2.0.
