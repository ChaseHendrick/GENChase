# Publishing: the owner's checklist

This is the part of [RESEARCH-GRADE.md](RESEARCH-GRADE.md), section 1, that needs a person with the
project's accounts. For a manuscript (arXiv, a journal), follow [PUBLISHING-PAPERS.md](PUBLISHING-PAPERS.md). Everything that could be done inside the repository is done; each step below is
one action, and says how to check it worked.

**The name on publications is Chase Hendrick, Independent Researcher** (decided 2026-09-24). The software
metadata (`CITATION.cff`, `.zenodo.json`, `identities/zenodo.json`, `paper/paper.md`) and the manuscripts
all use it, and a DOI record carries whatever the metadata says on the day of the release. The git identity
rule in AGENTS.md is about commits and is unaffected. The manuscripts carry the contact address
recorded as `author.email` in `papers/papers.json` under the affiliation (owner's decision, 2026-09-24),
and only the manuscripts do: READMEs, CITATION.cff and submission files leave it out (owner's decision,
2026-09-25). `node tools/paper-check.js` and `tools/paper-sync.js` refuse it anywhere else, and any
other address anywhere.

## 1. A DOI for the software (RESEARCH-GRADE 1c)

While this repository is private, skip this section: Zenodo archives public repositories only. Each
paper's programs and data get their DOI from the paper's own public repository instead
([PUBLISHING-PAPERS.md](PUBLISHING-PAPERS.md), section 1).

Already done in the repository: `.zenodo.json` describes the software (upload type software,
Apache-2.0), the identities note has its own metadata in `identities/zenodo.json`, and
`CITATION.cff` is valid CFF 1.2 with the version and date of the latest release (0.7.1,
2026-09-25) and a comment where the DOI goes. `node tools/index.js` keeps the technique count in
`.zenodo.json` current, and `node tools/lint.js` fails it if it drifts.

1. **Sign in to Zenodo** at zenodo.org with the GitHub account that owns `ChaseHendrick/GENChase`.
2. **Switch on the repository** in Zenodo's GitHub settings page (under your account menu). Zenodo
   archives only releases published after the switch is on; 0.6.2 and earlier are not archived.
   The integration works with public repositories only, so a release made while the repository is
   private is not archived ([COMMITMENTS.md](COMMITMENTS.md) lists the other costs of going private).
3. **Prepare the release in a pull request.** Versions are written without a leading v, as
   `X.Y.Z` (owner's decision, 2026-09-26); the releases made before then keep their tags, which do
   (`v0.7.1`), and no tag is ever renamed. In `CITATION.cff`, set `version` to the version you are
   about to release and `date-released` to the release day. Move the `## Unreleased` entries of
   `CHANGELOG.md` under `## X.Y.Z`: that section becomes the public release notes, and the release
   stops if it is missing or empty. Reread the description in
   `.zenodo.json`. Run `node tools/build.js --check`, `node tools/science.js` and
   `node tools/lint.js`; the release workflow runs all three and stops if any fails. Merge.
4. **Make the release.** Run the "Publish offline studio" workflow (Actions, run on `main`, version
   `X.Y.Z`). It needs a green `check` run on that commit, makes the tag `X.Y.Z` and publishes the
   release; it refuses a version with a leading v, and one already tagged under either spelling.
   To rewrite the notes of releases that already exist from the current CHANGELOG, run the same
   workflow with **notes only** ticked and a version, or `all`; a version such as `0.7.1` finds its
   old tag `v0.7.1`, and nothing is built and no tag or file changes.
5. **Copy the DOIs.** Zenodo's GitHub page lists the new record. It shows a DOI for this version and
   a concept DOI that always resolves to the latest version. Check that the record's title, type
   (Software), license and description are the ones in `.zenodo.json`.
6. **Record the DOI in a pull request:**
   - `CITATION.cff`: replace the DOI comment with `doi: <concept DOI>`. Validate with
     `pip install cffconvert && cffconvert --validate`.
   - `README.md`: add the DOI, for example a line under the links at the top. The README is
     maintained by hand.
   - `identities/zenodo.json` and the note's Zenodo record, if it exists: add a related identifier
     pointing to the software DOI.
   - `docs/RESEARCH-GRADE.md`: move item 1c to **Done** with the pull request link, as that file asks.
7. **Check:** `https://doi.org/<concept DOI>` opens the Zenodo record, and GitHub's "Cite this
   repository" box shows the software with its DOI.

If the metadata on a published record is wrong, edit the record on Zenodo and fix `.zenodo.json` in
the same week, so the next release is right.

## 2. An ORCID (optional)

1. Register at orcid.org. An ORCID identifies a person; it is shown next to whatever name the
   metadata gives, so settle the name question above first.
2. In one pull request, add it everywhere the author appears:
   - `CITATION.cff`, under the author: `orcid: "https://orcid.org/XXXX-XXXX-XXXX-XXXX"` (CFF wants
     the full URL), then run `cffconvert --validate`;
   - `.zenodo.json` and `identities/zenodo.json`, in the creator object:
     `"orcid": "XXXX-XXXX-XXXX-XXXX"` (the bare identifier);
   - `paper/paper.md`, under the author: `orcid: XXXX-XXXX-XXXX-XXXX`.
3. Records already published on Zenodo are edited on Zenodo; the metadata files only affect future
   releases.

## 3. The identities note as its own record

Follow [identities/README.md](../identities/README.md), "Uploading the note as its own Zenodo
record". It is a manual upload with its own DOI, separate from the software.

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
