# When a paper is ready: the publishing runbook

What to do, in order, when a manuscript is ready to go public, for one paper or several. Every paper
is a folder under [papers/](../papers/) and has a line in [papers/papers.json](../papers/papers.json)
with its status; `node tools/paper-check.js` checks each one against its files.
[COMMITMENTS.md](COMMITMENTS.md) covers protecting a result before it is public.

This repository may be private, so a paper never sends readers here. Each paper goes public as a
repository of its own, its **companion** (for example `ChaseHendrick/minimal-winding`): the paper folder
without its `notes/` and `submission/`, plus a LICENSE, a CITATION.cff and a .zenodo.json. The
**publish papers** workflow keeps the companion in step and locked; nobody writes to it by hand.
Zenodo archives each release as a preprint (resource type Publication, Preprint): the manuscript with
the programs that check it. Its description, which OpenAIRE and other indexes copy, is the `## Abstract`
section of the paper's README with its TeX turned into plain text, so a README needs that section before
it can be published. A record already on Zenodo keeps the type and description it was archived with until
you edit it there (Edit, change the field, Publish; the DOI stays the same).

The manuscripts and their figures currently retain all rights reserved. The verification programs and
original data use Apache 2.0, with component notices governing exceptions, including the rank-window
derived outputs under CC BY-NC 4.0. Each PDF states its manuscript policy separately from the abstract.
These notices do not revoke licenses previously granted for earlier material.

Zenodo's legacy `license` field describes the entire archive. A mixed archive containing an all-rights-reserved
manuscript uses `other-closed` (Other, not open), with the exact component licenses in the record description
and companion LICENSE. It remains publicly downloadable as a preprint. If the manuscript policy is changed
to CC BY 4.0, an otherwise open mixed archive uses `other-open`; rank-window still uses `other-closed` because
its derived outputs have a noncommercial restriction. The top-level CITATION.cff Apache identifier describes
the programs, and its preferred citation describes the paper. Never label the whole preprint ZIP Apache 2.0.
See [Zenodo licenses](https://help.zenodo.org/docs/deposit/describe-records/licenses/) and the
[legacy API metadata schema](https://developers.zenodo.org/).

Account access and publication decisions depend on your accounts and preferences. The sources,
builds, audits and metadata can be prepared and checked locally before publication.

## The order, and why

1. **The paper's programs and data get their DOI first, on Zenodo**, from a release of its
   companion. The paper then cites a DOI for the exact programs it used.
2. **arXiv is deferred for now.** By the owner's decision (2026-09-25), no paper goes to arXiv until the
   owner has an endorsement: arXiv asked for one at the first attempt to submit to physics.flu-dyn. Until
   then the companion's Zenodo release is the preprint of record: public, timestamped, with a DOI, and
   holding the paper's PDF with its programs and data. Section 2 stays below for when an endorsement
   arrives; arXiv's announcement date and DOI (`10.48550/arXiv.<id>`) are still worth having later.
3. **Then reveal** any hash commitments that covered drafts of the paper.
4. **Then one journal.** Journals in this area generally accept papers already posted as preprints,
   but check each journal's own policy before you submit.
5. **After acceptance,** link the published version from the companion's README (and from arXiv, if the
   paper is there by then).

## Statuses

`papers.json` moves each paper through `draft`, `preparing`, `ready`, `on-arxiv`, `submitted`,
`accepted` and `published`. Change a status in the pull request that makes it true.
`tools/paper-check.js` refuses a status whose bookkeeping is missing: an arXiv identifier from
`on-arxiv` on, a submission date from `submitted` on, and the journal DOI at `published`.

## 0. Is it ready? The quality bar

Nothing is published or preprinted (a companion release, a Zenodo DOI, arXiv, a journal) until the paper meets the
quality bar, and its record says so. The record is `papers/<id>/notes/QUALITY.md`: the bar's seven items at the top
(complete proofs, rigorous computation, every claim labelled, sources read, prior article review, adversarial second reading,
reproducible), then one line per item, checked only with its evidence. `notes/` stays in GENChase; the companion does
not carry it. `node tools/paper-check.js` refuses the status `ready` or later while any item is open, renamed,
missing or checked without evidence, and its self-test plants each of those mistakes. A proof that adapts another
paper's argument without writing it out does not meet item 1, and a second reading that is only planned does not
meet item 6.

Then:

- Figure legends, numerical notes and point labels sit outside the data panels, in reserved margins,
  a shared legend or the caption. Check axis labels, ticks, panel titles and captions for collisions
  after regeneration, then inspect each figure in the rebuilt manuscript at its final size. Preserve
  the plotted values and scientific meaning when changing layout. The
  [September 29 figure audit](FIGURE-LAYOUT-AUDIT-2026-09-29.md) records the current eight-paper check.
- A second reader in the field has read it. [REVIEWING.md](REVIEWING.md) and
  [REVIEW-REQUEST.md](REVIEW-REQUEST.md) make that one step.
- `node tools/paper-check.js --paper <id>` passes. It checks that the title is the same in every
  source; that every public contact email matches `author.email` in `papers/papers.json`; that the arXiv abstract fits arXiv's 1,920
  characters and its stated length is right; that the page counts in the metadata match the PDFs;
  and that the Typst and LaTeX reference lists agree entry by entry and cite the same works. It also
  lists the placeholders you still fill by hand.
- The paper's own checklist is clear. For the minimal-winding paper that is
  [papers/minimal-winding/submission/CHECKLIST.md](../papers/minimal-winding/submission/CHECKLIST.md).
- Set the status to `ready`.

## 1. The companion repository and its DOI

**Once, for all papers** (about ten minutes):

1. Make a fine-grained personal access token: GitHub, Settings, Developer settings, Personal access
   tokens, Fine-grained tokens, Generate new token. Resource owner: your account. Repository access:
   **All repositories**, so papers added later are covered too (or "Only select repositories", then
   add each companion when you create it). Permissions: **Contents: Read and write** and
   **Administration: Read and write**; the second lets the workflow lock each companion. Pick an
   expiry you will remember to renew.
2. In GENChase: Settings, Secrets and variables, Actions, New repository secret, named
   `PAPERS_TOKEN`, with the token as its value. Until that secret exists the workflow does nothing.
3. On zenodo.org, sign in with GitHub, open the GitHub page of your account, and allow Zenodo access.

**For each paper:**

1. On GitHub, create the companion as an **empty public** repository named as `companion` in
   `papers.json` (for example `minimal-winding`), with no README, license or .gitignore.
2. `node tools/paper-sync.js --check <id>` must say the paper is ready to publish. Then set its
   status to `ready` in `papers.json` and merge. The **publish papers** workflow pushes the folder to
   the companion and locks it against everyone but you: issues, wiki, projects and discussions off;
   interactions limited to collaborators; rulesets that forbid deleting or force-pushing the main
   branch and deleting or moving tags. A monthly run renews the lock. You can still edit the
   companion yourself (below).
3. On Zenodo's GitHub page, switch the companion **on**.
4. Write the release notes in `papers/<id>/RELEASES.md` under `## 1.0.0` (a date may follow the
   version): what the paper shows, how it was checked, the files, how to reproduce, the licenses. Merge.
   Then Actions, **publish papers**, Run workflow, with the paper id and the release tag, the version
   written without a leading v (`1.0.0`; owner's decision, 2026-09-26). The run refuses a tag without
   notes before it publishes anything, and a new tag with a leading v. Run again with an existing tag
   to bring that release's notes up to date; the tag and its files never change, and Zenodo keeps the
   description it archived. A release made before 2026-09-26 keeps its tag with the v (for example
   `v2.1.0` of minimal-winding): run with that tag, and its notes come from `## 2.1.0`; the same
   version under a plain tag is refused, so it is never released twice. Zenodo archives the release within minutes and shows two DOIs. Cite the **version DOI**, because
   it names exactly the programs you used; the concept DOI always points to the newest release.
5. Put the version DOI in the paper's data availability paragraph, in both the LaTeX and the Typst
   source, rebuild with `sh tools/paper-build.sh <id>`, set `codeDoi` in `papers.json`, and merge;
   the workflow updates the companion. Make a `1.0.1` release if you want the archived copy to carry
   the DOI in its own PDF too.

### Check the manuscript in the archive

Every new companion release must pass `node tools/paper-check.js --paper <id> --release`, with all
seven quality items closed even when an older Zenodo archive exists. Keeping a previous archive
available does not establish that a new version is ready.

Every new companion release must include the registered manuscript PDF in its source ZIP.
`tools/paper-publish.sh` runs `python3 tools/paper-archive-check.py <id> <companion-checkout> <ref>`
on the merged companion tree before pushing it. It rejects an absent PDF registration, a missing or
truncated PDF, or a PDF removed or changed by archive attributes. This is a packaging check, not a
review of the mathematics or a freshness check of the PDF against its source. Existing releases are
never withdrawn or replaced. The optional `companionExclude` list in a paper's registry entry names
individual tracked exploratory files to keep in the development repository only. It cannot exclude the
registered manuscript source/PDF, README or release notes; a missing filename is an error.

For the Markdown manuscript `hh-pulse`, `sh tools/paper-build.sh hh-pulse` uses Pandoc and pdflatex.
To use Tectonic instead, set `PAPER_PDF_ENGINE=tectonic`; both engines require Pandoc on PATH.
The Markdown remains the canonical text. Long literal equations wrap in the PDF.
The same build command reads the registered LaTeX filename and its included fragments for other papers,
including `rank-window`'s `note.tex`. LaTeX builds also accept `PAPER_PDF_ENGINE=tectonic`.

After Zenodo archives a new version, download the ZIP named by that record's API and inspect its
members. Verify the manuscript bytes against the released PDF, then record the version DOI.
Set `archiveVersion` in the same registry entry to the exact verified release version at `codeDoi`.
Keep both fields on the verified archive when preparing a newer release; advance them together only
after that new archive has passed the download check. A new `RELEASES.md` heading is not evidence
that Zenodo imported it.
The companion synchronizer uses this verified pair for the README's current archive locator and
the citation file's archive version. Update recommended BibTeX entries in the canonical README at
the same time; earlier archive links remain as history.
`python3 tools/paper-zenodo-check.py --paper <id> --out /tmp/archive-check.json` performs this
read-only download and comparison against the registered repository PDF, and requires the record's
version, title, Preprint classification and component rights to match the registry.
The archive audit runs weekly, on request, and after changes to the registry, verifier or audit workflow
on `main`. It retains its report even when a check fails. Companion publishing has a 20-minute job
limit; a timeout requires inspection of the run and existing releases before another dispatch.
A PDF attached separately to a GitHub release does not establish that it is in the source ZIP.

### Editing a paper after it is public

Edit it in either place.

- **Here** (best for anything that changes the PDF): edit `papers/<id>/`, rebuild with
  `sh tools/paper-build.sh <id>`, run `node tools/paper-check.js --paper <id>`, and merge. The workflow
  publishes the change.
- **In the companion**, on GitHub or with git (quick fixes, such as a README correction): commit to its
  main branch as usual. The workflow never overwrites your edits. It keeps what this repository
  published on a separate branch, `genchase-sync`, and merges that into main, so an edit there and an
  update from here combine like any git merge. If both change the same lines, the run stops, pushes
  nothing and names the files.
- **Keep the two in step:** after editing the companion, run `sh tools/paper-pull.sh <id>` here. It
  copies the companion's files into `papers/<id>/` (never `notes/` or `submission/`, and not the
  generated LICENSE, CITATION.cff and .zenodo.json), lists any file you deleted there, and leaves the
  result for you to review and merge. Do the same when the workflow reports a conflict: keep the
  version you want in `papers/<id>/`, merge, and the next run publishes it.
- **The AI statement** (owner's decision, 2026-10-01): every manuscript ends its end matter with a labelled
  statement at the body's own size, beside Funding, never in small type:

      \noindent\textbf{Use of AI.} This work was prepared with AI assistance. The author takes full responsibility for its content.

  Six released manuscripts still print it as `{\footnotesize ...}` under Funding: `minimal-winding`,
  `collapse-without-rotation`, `stable-expansion`, `rank-window`, `hh-dynamics` and `nf-pulse`. Change each one in
  the same pull request as that paper's next release, not on its own. Then strike it from this list.
  `cardiac-rings` was written with the new form. `double-pendulum` and `hh-pulse` print no statement yet; add one
  at their next release.
- **Sources that could not be obtained** (owner's instruction, 2026-10-01, for every manuscript): do not apologize
  for them. Cite such a source for what is known of it, stated positively ("Their abstract describes ...",
  "According to the zbMATH review ..."), state its reading basis once, as a plain fact, in the paper's sources or
  limitations section ("Known from its abstract: X."), and keep any priority limitation that depends on it as a scope
  statement ("as far as the abstract describes it"); never drop the citation, and never claim a reading that did not
  take place.
- **A new version of record:** a change to a paper already on arXiv is a replacement there (v2, v1
  stays visible), and a new release of the companion (for example `1.1.0`) gives Zenodo a new
  version DOI. The concept DOI always resolves to the newest.

`node tools/paper-publish-check.js` (part of `npm test`) runs both scripts end to end against local
repositories: the first publish, a direct edit that survives an update, a conflict that pushes
nothing, the pull back, a release refused without notes, and the version rule (a new tag with a
leading v refused, an old v tag taken for its notes, a plain twin of an old v tag refused).

## 2. arXiv (deferred until an endorsement)

1. **Endorsement.** arXiv asks some first-time submitters to a category for an endorsement from an
   established author there, and the owner's account needs one for physics.flu-dyn (found at the first
   attempt, 2026-09-25; an earlier note here said none was needed, which was wrong). arXiv gives an
   endorsement code with the request; ask one established author who knows the work, and send the
   paper with it. Endorsement is not review, but nobody is obliged to give one.
2. **Upload** the zip that `sh tools/arxiv-bundle.sh <id>` writes: the LaTeX source, which carries
   the contact email, and its `figures/` folder (arXiv prefers source). The paper's metadata file, for example
   [arxiv-metadata.md](../papers/minimal-winding/submission/arxiv-metadata.md), has every field of the form.
3. **License.** Choose the arXiv.org perpetual, non-exclusive license: you keep every right, readers
   may read and download but not republish or adapt the paper without your permission, and every journal
   accepts it. CC BY 4.0 lets anyone reuse the text with attribution; choose it only when a funder or
   journal requires open reuse. The license granted with an announced version cannot be taken back.
4. **Check the preview** arXiv builds before you confirm. Once announced, a version is permanent: a
   correction becomes v2, and v1 stays visible.
5. **When it is announced,** in one pull request: set `status: "on-arxiv"` and `arxiv.id` in
   `papers.json`, fill the arXiv identifier in the cover letter, and add a CHANGELOG line.

## 3. Reveal the commitments

If you committed drafts of this paper with `tools/commit-hash.js`, reveal them now:

```
node tools/commit-hash.js --reveal <private record> --published "doi:<the preprint's Zenodo DOI>"
```

For priority, the commitment that matters most is the **earliest** one whose file already contains
the result; reveal it, and any others you want on record. List their ids in the paper's
`commitments` in `papers.json`.

## 4. The journal

1. Read the journal's current author instructions: its preprint policy, its policy on AI assistance,
   whether it asks for suggested reviewers, the source format it wants, and whether it charges a
   publication fee. Keep the manuscripts' one-line AI statement: arXiv requires significant use of
   generative AI to be reported in the work, Springer Nature asks for it in the manuscript (copy
   editing alone is exempt), and JOSS requires a fuller "AI usage disclosure" section, which the
   software paper has. A Zenodo-only record needs none.
2. **Submit to one journal at a time.** A preprint plus one journal is normal; the same paper at two
   journals at once is not allowed.
3. Fill the cover letter's placeholders only in the copy you send, never in the repository.
4. Set `status: "submitted"` and `journal.submitted` (the date) in `papers.json`.
5. **Revisions:** change both sources, rebuild, run `tools/paper-check.js`, and send the revision.
   Archiving the revised version as a new release of the companion (a new Zenodo version) is optional;
   many authors wait for acceptance.

## 5. Accepted and published

1. Set `accepted`, and then `published` with `journal.doi`, in `papers.json`.
2. If the paper is on arXiv by then, add the journal reference and DOI to the record there; that needs
   no new version. Replace a preprint's PDF (on arXiv or in a new companion release) with the accepted
   manuscript only if the publisher's self-archiving policy allows it; many publishers allow the
   accepted manuscript but not their typeset version.
3. In the repository: cite the published paper in `CITATION.cff` under `references`, link it from
   the README, add a CHANGELOG line, and move the item in
   [RESEARCH-GRADE.md](RESEARCH-GRADE.md) to Done.

## Several papers at once

- Each paper goes through the steps on its own, with its own line in `papers.json`.
  `node tools/paper-check.js` checks them all.
- Release them in dependency order, so that a later paper can cite an earlier one's preprint DOI.
- Each paper has its own companion and its own DOI, so each cites exactly the programs it used.
- Different papers may be under review at different journals at the same time. The same result must
  not appear in two papers as if it were new in each; journals treat that as redundant publication.

## The identities note (retired)

By the owner's decision (2026-09-27) the note is retired. Its results are proved in the minimal-winding paper,
release 2.2.0 (prepared), and the note gets no record of its own ([identities/README.md](../identities/README.md),
"The note is retired").

## The software paper (JOSS)

The Journal of Open Source Software reviews in the open, on GitHub. It needs a public repository, an
open-source license (Apache-2.0 qualifies) and an archived release with a DOI by acceptance. The
draft and the steps are in [PUBLISHING.md](PUBLISHING.md), section 4. A JOSS paper does not need arXiv.
