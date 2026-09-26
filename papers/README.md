# Papers

One folder per paper, each laid out as a research compendium: the manuscript and its PDF in
`paper/`, the programs in `code/`, their output in `data/`, a README with the abstract, how to
reproduce and how to cite, and two working folders that stay in this repository, `notes/` and
`submission/`.

| Paper | Status | Public repository |
|---|---|---|
| [Minimal Winding in the Self-Similar Collapse of Point Vortices](minimal-winding/) | published with its code and data (release 2.0.0, doi:10.5281/zenodo.22963796); journal submission next, arXiv deferred until an endorsement; not yet peer reviewed | [ChaseHendrick/minimal-winding](https://github.com/ChaseHendrick/minimal-winding) |
| [Point-Vortex Collapse Without Rotation: A Cluster Mechanism, a Phase Diagram and a Continuum Limit](collapse-without-rotation/) | draft, with its programs and data; cites the minimal-winding paper as its companion | ChaseHendrick/collapse-without-rotation (not yet created) |
| [Stable Self-Similar Expansion of Four and Five Point Vortices and Confinement of Vortex Patches](stable-expansion/) | draft, with its programs and data; computer-assisted | ChaseHendrick/stable-expansion (not yet created) |

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
