# Papers

One folder per paper, each laid out as a research compendium: the manuscript and its PDF in
`paper/`, the programs in `code/`, their output in `data/`, a README with the abstract, how to
reproduce and how to cite, and two working folders that stay in this repository, `notes/` and
`submission/`.

| Paper | Status | Public repository |
|---|---|---|
| [Minimal Winding in the Self-Similar Collapse of Point Vortices](minimal-winding/) | preprint with its code and data (release 2.1.0, doi:10.5281/zenodo.22966989); journal submission next, arXiv deferred until an endorsement; not peer reviewed | [ChaseHendrick/minimal-winding](https://github.com/ChaseHendrick/minimal-winding) |
| [Point-Vortex Collapse Without Rotation: A Cluster Mechanism, a Phase Diagram and a Continuum Limit](collapse-without-rotation/) | preprint with its code and data (release 1.0.0, doi:10.5281/zenodo.22969841); not peer reviewed | [ChaseHendrick/collapse-without-rotation](https://github.com/ChaseHendrick/collapse-without-rotation) |
| [Stable Self-Similar Expansion of Four and Five Point Vortices and Confinement of Vortex Patches](stable-expansion/) | preprint with its code and data (release 1.0.0, doi:10.5281/zenodo.22971173); computer-assisted; not peer reviewed | [ChaseHendrick/stable-expansion](https://github.com/ChaseHendrick/stable-expansion) |
| [A finite rank window cannot show that a neural population code satisfies the eigenspectrum smoothness bound](rank-window/) | draft methods note with its programs and outputs (outputs CC BY-NC 4.0); two in-project referee readings | none yet |
| [Rigorous Dynamics of the Hodgkin-Huxley Equations at the 1952 Parameters](hh-dynamics/) | work in progress, no manuscript: computer-assisted proofs of the equilibria, Hopf points and bistability at J = 8 | none yet |
| [A Travelling Pulse in a Neural Field with a Smooth Firing Rate](nf-pulse/) | work in progress, no manuscript: a computer-assisted proof with an in-project review, and five extensions | none yet |

The alpha-model draft that used to be a second paper here was merged into the minimal-winding paper on
2026-09-25 (owner's decision), with its programs, data and notes.

[`papers.json`](papers.json) is the record of each paper's status, and the identities note and the
software paper are listed there too (they live in `identities/` and `paper/`).

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

The manuscripts carry the author's contact address in their author block, and nothing else does: the
READMEs, CITATION.cff, the submission files and the other pages of the repositories leave it out (owner's
decision, 2026-09-25). `paper-check` and `paper-sync` refuse an address anywhere else, and any other
address anywhere. Manuscript text is Copyright (c) 2026 Chase Hendrick, all rights
reserved; programs and data are Apache-2.0.
