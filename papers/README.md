# Papers

One folder per paper, each laid out as a research compendium: the manuscript and its PDF in
`paper/`, the programs in `code/`, their output in `data/`, a README with the abstract, how to
reproduce and how to cite, and two working folders that stay in this repository, `notes/` and
`submission/`.

| Paper | Status | Public repository |
|---|---|---|
| [Minimal winding in the self-similar collapse of three point vortices and of two concentric vortex polygons](minimal-winding/) | preparing for arXiv | SharpMeow/minimal-winding, once ready |
| [A sharp winding bound for the self-similar collapse of three point vortices in the alpha-models](alpha-winding/) | draft, not cleared for submission | SharpMeow/alpha-winding, once ready |

[`papers.json`](papers.json) is the record of each paper's status, and the identities note and the
software paper are listed there too (they live in `identities/` and `paper/`).

This repository may be private, so a paper never sends readers here. When `papers.json` marks a paper
`ready`, the **publish papers** workflow copies its folder, without `notes/` and `submission/`, to its
own public repository, adds a LICENSE, a CITATION.cff and a .zenodo.json, and locks that repository so
only its owner can change it. A release there gives the paper's programs and data a Zenodo DOI.
[docs/PUBLISHING-PAPERS.md](../docs/PUBLISHING-PAPERS.md) is the runbook.

| Command | What it does |
|---|---|
| `sh tools/paper-build.sh <id>` | Builds `paper/<id>.pdf` from the LaTeX source, as arXiv does |
| `node tools/paper-check.js` | Checks every paper: titles, page counts, references, stray email addresses, and whether it can go public |
| `node tools/paper-sync.js --check <id>` | Stages the public repository in a scratch folder and lists anything that points back here |
| `sh tools/arxiv-bundle.sh <id>` | Writes the arXiv upload, the LaTeX source and its figures, outside the repository |

The manuscripts carry the author's contact address, `chasewhendrick@gmail.com`; `paper-check` refuses
any other address in a paper's files. Manuscript text is Copyright (c) 2026 Chase Hendrick, all rights
reserved; programs and data are Apache-2.0.
