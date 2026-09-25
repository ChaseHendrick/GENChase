# When a paper is ready: the publishing runbook

What to do, in order, when a manuscript is ready to go public, for one paper or several. Every paper
is a folder under [papers/](../papers/) and has a line in [papers/papers.json](../papers/papers.json)
with its status; `node tools/paper-check.js` checks each one against its files.
[COMMITMENTS.md](COMMITMENTS.md) covers protecting a result before it is public.

This repository may be private, so a paper never sends readers here. Each paper goes public as a
repository of its own, its **companion** (for example `ChaseHendrick/minimal-winding`): the paper folder
without its `notes/` and `submission/`, plus a LICENSE, a CITATION.cff and a .zenodo.json. The
**publish papers** workflow keeps the companion in step and locked; nobody writes to it by hand.

Only you can do the steps that need your accounts (GitHub settings, Zenodo, arXiv, a journal's
submission system) or your judgment. A Claude session can do everything else: edit the sources,
rebuild the PDFs, run the checks, update `papers.json`, and draft the messages.

## The order, and why

1. **The paper's programs and data get their DOI first, on Zenodo**, from a release of its
   companion. The paper then cites a DOI for the exact programs it used.
2. **The paper goes to arXiv next.** arXiv is where this field reads preprints, its announcement
   date is the community's record of when a result appeared, and it gives the paper a DOI of its own
   (`10.48550/arXiv.<id>`).
3. **Then reveal** any hash commitments that covered drafts of the paper.
4. **Then one journal.** Journals in this area generally accept papers already posted on arXiv, but
   check each journal's own policy before you submit.
5. **After acceptance,** link the published version from arXiv and from the companion's README.

The identities note is the exception: it goes to Zenodo as a record of its own and not to a journal
(below).

## Statuses

`papers.json` moves each paper through `draft`, `preparing`, `ready`, `on-arxiv`, `submitted`,
`accepted` and `published`. Change a status in the pull request that makes it true.
`tools/paper-check.js` refuses a status whose bookkeeping is missing: an arXiv identifier from
`on-arxiv` on, a submission date from `submitted` on, and the journal DOI at `published`.

## 0. Is it ready?

- A second reader in the field has read it. [REVIEWING.md](REVIEWING.md) and
  [REVIEW-REQUEST.md](REVIEW-REQUEST.md) make that one step.
- `node tools/paper-check.js --paper <id>` passes. It checks that the title is the same in every
  source; that no email address is in a public file; that the arXiv abstract fits arXiv's 1,920
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
4. Write the release notes in `papers/<id>/RELEASES.md` under `## v1.0.0` (a date may follow the
   tag): what the paper shows, how it was checked, the files, how to reproduce, the licenses. Merge.
   Then Actions, **publish papers**, Run workflow, with the paper id and the release tag. The run
   refuses a tag without notes before it publishes anything. Run again with an existing tag to bring
   that release's notes up to date; the tag and its files never change, and Zenodo keeps the
   description it archived. Zenodo archives the release within minutes and shows two DOIs. Cite the **version DOI**, because
   it names exactly the programs you used; the concept DOI always points to the newest release.
5. Put the version DOI in the paper's data availability paragraph, in both the LaTeX and the Typst
   source, rebuild with `sh tools/paper-build.sh <id>`, set `codeDoi` in `papers.json`, and merge;
   the workflow updates the companion. Make a `v1.0.1` release if you want the archived copy to carry
   the DOI in its own PDF too.

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
- **A new version of record:** a change to a paper already on arXiv is a replacement there (v2, v1
  stays visible), and a new release of the companion (for example `v1.1.0`) gives Zenodo a new
  version DOI. The concept DOI always resolves to the newest.

`node tools/paper-publish-check.js` (part of `npm test`) runs both scripts end to end against local
repositories: the first publish, a direct edit that survives an update, a conflict that pushes
nothing, and the pull back.

## 2. arXiv

1. **Endorsement.** arXiv asks some first-time submitters to a category for an endorsement from an
   established author there. The owner's account needs none for physics.flu-dyn (2026-09-24).
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
node tools/commit-hash.js --reveal <private record> --published "arXiv:<id>"
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
   software paper has. A Zenodo-only record, such as the identities note, needs none.
2. **Submit to one journal at a time.** arXiv plus one journal is normal; the same paper at two
   journals at once is not allowed.
3. Fill the cover letter's placeholders only in the copy you send, never in the repository.
4. Set `status: "submitted"` and `journal.submitted` (the date) in `papers.json`.
5. **Revisions:** change both sources, rebuild, run `tools/paper-check.js`, and send the revision.
   Posting the revised version to arXiv as v2 is optional; many authors wait for acceptance.

## 5. Accepted and published

1. Set `accepted`, and then `published` with `journal.doi`, in `papers.json`.
2. On arXiv, add the journal reference and DOI to the record. That needs no new version. Replace the
   PDF with the accepted manuscript only if the publisher's self-archiving policy allows it; many
   publishers allow the accepted manuscript but not their typeset version.
3. In the repository: cite the published paper in `CITATION.cff` under `references`, link it from
   the README, add a CHANGELOG line, and move the item in
   [RESEARCH-GRADE.md](RESEARCH-GRADE.md) to Done.

## Several papers at once

- Each paper goes through the steps on its own, with its own line in `papers.json`.
  `node tools/paper-check.js` checks them all.
- Post them to arXiv in dependency order, so that a later paper can cite an earlier one's arXiv
  identifier.
- Each paper has its own companion and its own DOI, so each cites exactly the programs it used.
- Different papers may be under review at different journals at the same time. The same result must
  not appear in two papers as if it were new in each; journals treat that as redundant publication.

## The identities note (Zenodo only)

The note has zero confirmed novel findings and is published as a record of its own, not submitted
to a journal. Follow [identities/README.md](../identities/README.md), "Uploading the note as its own
Zenodo record", keep the attribution cautions of [identities/ARXIV.md](../identities/ARXIV.md), and
set `published` with `zenodo.doi` in `papers.json`.

## The software paper (JOSS)

The Journal of Open Source Software reviews in the open, on GitHub. It needs a public repository, an
open-source license (Apache-2.0 qualifies) and an archived release with a DOI by acceptance. The
draft and the steps are in [PUBLISHING.md](PUBLISHING.md), section 4. A JOSS paper does not need arXiv.
