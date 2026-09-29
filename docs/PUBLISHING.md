# Publishing: the owner's checklist

This is the part of [RESEARCH-GRADE.md](RESEARCH-GRADE.md), section 1, that needs a person with the
project's accounts. For a manuscript (arXiv, a journal), follow [PUBLISHING-PAPERS.md](PUBLISHING-PAPERS.md). Everything that could be done inside the repository is done; each step below is
one action, and says how to check it worked.

**The name on publications is Chase Hendrick, Independent Researcher** (decided 2026-09-24). The software
metadata (`CITATION.cff`, `.zenodo.json`, `paper/paper.md`) and the manuscripts
all use it, and a DOI record carries whatever the metadata says on the day of the release. The git identity
rule in AGENTS.md is about commits and is unaffected. The manuscripts carry the contact address
recorded as `author.email` in `papers/papers.json` under the affiliation (owner's decision, 2026-09-24),
and only the manuscripts do: READMEs, CITATION.cff and submission files leave it out (owner's decision,
2026-09-25). `node tools/paper-check.js` and `tools/paper-sync.js` refuse it anywhere else, and any
other address anywhere.

## 1. A DOI for the software (RESEARCH-GRADE 1c)

**Do not archive this repository on Zenodo.** Owner's decision, 2026-09-29. No agent turns on Zenodo's GitHub integration for `ChaseHendrick/GENChase`, and no agent uploads the software, the studio, or a GitHub release of this repository to Zenodo by hand. `CITATION.cff` stays without a software DOI. The steps that used to sit here are withdrawn. GitHub releases of the studio are a separate matter and are not a Zenodo deposit. The papers keep the archives they already have, in their own repositories. `.zenodo.json` remains in the tree so a count check can read it; it is not an instruction to deposit.

A GitHub release of the studio is not a Zenodo deposit. How one is made is in AGENTS.md and the "Publish offline studio" workflow. It does not get a DOI, and `CITATION.cff` is not given one.

## 2. An ORCID (optional)

1. Register at orcid.org. An ORCID identifies a person; it is shown next to whatever name the
   metadata gives, so settle the name question above first.
2. In one pull request, add it everywhere the author appears:
   - `CITATION.cff`, under the author: `orcid: "https://orcid.org/XXXX-XXXX-XXXX-XXXX"` (CFF wants
     the full URL), then run `cffconvert --validate`;
   - `.zenodo.json`, in the creator object:
     `"orcid": "XXXX-XXXX-XXXX-XXXX"` (the bare identifier);
   - `paper/paper.md`, under the author: `orcid: XXXX-XXXX-XXXX-XXXX`.
3. Records already published on Zenodo are the papers' archives, in their own repositories. This repository is not one of them.

## 3. The identities note (retired)

There is no step here any more: by the owner's decision (2026-09-27) the note is retired. Its results are proved
in the minimal-winding paper, release 2.2.0 (prepared), and the note gets no record of its own
([identities/README.md](../identities/README.md), "The note is retired").

## 4. The software paper (RESEARCH-GRADE 1d)

The draft is `paper/paper.md` with `paper/paper.bib`, in the Journal of Open Source Software
layout. `.github/workflows/paper.yml` builds the PDF on every push or pull request that touches
`paper/`; download it from the run's `paper` artifact.

Before submitting:

1. Read JOSS's current author guide and submission requirements, including required sections,
   length and its policy on AI assistance. The draft is about 1,700 words of text, which may be
   longer than the journal asks for; cut from "State of the field" and "Quality control and
   validation" first if so. Nothing in this repository records the journal's policies.
2. Resolve every `Owner:` comment in `paper/paper.md`: the author name and ORCID, the citations for
   Sokal's automatic windowing and the Hill estimator (the repository does not record their
   bibliographic details), the AI-assistance statement, and funding in the acknowledgements.
3. Update the dated figures (validation counts, the survey) from `VALIDATION.md` and `RESEARCH.md`.
4. Make sure the software has its DOI (section 1).
5. Submit through the journal's own site.

## 5. The vortex paper (RESEARCH-GRADE 1b)

See [papers/minimal-winding/submission/CHECKLIST.md](../papers/minimal-winding/submission/CHECKLIST.md): what is ready, what is
missing and the order of the remaining steps (endorsement, arXiv, journal).

## 6. Outside review (RESEARCH-GRADE 1a)

Send [REVIEW-REQUEST.md](REVIEW-REQUEST.md) to one prospective reviewer per family, with the
family's section of [REVIEWING.md](REVIEWING.md). A reviewer reports on the "Outside review" issue
template; the maintainer then records the review with the `reviewers` field described in
[validation/README.md](../validation/README.md) and runs `node tools/science.js --write`.
