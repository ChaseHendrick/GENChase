# When a paper is ready: the publishing runbook

What to do, in order, when a manuscript is ready to go public, for one paper or several. Every paper
this project prepares is listed with its status in
[research/submission/papers.json](../research/submission/papers.json), and
`node tools/paper-check.js` checks each one against its files. The software DOI and signed releases
are in [PUBLISHING.md](PUBLISHING.md) and [SIGNING.md](SIGNING.md); protecting a result before it is
public is in [COMMITMENTS.md](COMMITMENTS.md).

Only you can do the steps that need your accounts (Zenodo, arXiv, a journal's submission system),
your email or your judgment. A Claude session can do everything else: edit the sources, rebuild the
PDFs, run the checks, update `papers.json`, and draft the messages.

## The order, and why

1. **The code gets its DOI first, on Zenodo**, through a signed release. The paper then cites a DOI
   for the exact code and verification programs it used. One release can serve several papers.
2. **The paper goes to arXiv next.** arXiv is where this field reads preprints, its announcement
   date is the community's record of when a result appeared, and it gives the paper a DOI of its own
   (`10.48550/arXiv.<id>`). A separate Zenodo record for the paper is optional.
3. **Then reveal** any hash commitments that covered drafts of the paper.
4. **Then one journal.** Journals in this area generally accept papers already posted on arXiv, but
   check each journal's own policy before you submit.
5. **After acceptance,** link the published version from arXiv and from this repository.

So: Zenodo first for the code, arXiv first for the paper. The identities note is the exception: it
goes to Zenodo as a record of its own and not to a journal (below).

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
  [research/submission/CHECKLIST.md](../research/submission/CHECKLIST.md).
- Set the status to `ready`.

## 1. The code DOI (once per release, shared by the papers)

1. Make a signed release ([SIGNING.md](SIGNING.md)) with Zenodo switched on for the repository
   ([PUBLISHING.md](PUBLISHING.md), section 1). The repository must be public at that moment.
2. Zenodo shows two DOIs. Cite the **version DOI** in the paper, because it names exactly the code
   you used. The concept DOI always points to the newest release.
3. Put the version DOI in the paper's data availability paragraph, in both the Typst and the LaTeX
   source. Rebuild the PDF, rebuild the private copies
   ([PRIVATE-COPIES.md](../research/submission/PRIVATE-COPIES.md)), and set `codeDoi` in
   `papers.json`.

## 2. arXiv

1. **Endorsement, the first time only.** A first submission to a category such as physics.flu-dyn
   needs an endorsement from an established author there. Start the submission; arXiv shows a code.
   Send it with [endorsement-request.md](../research/submission/endorsement-request.md) to one
   person at a time. After you are endorsed, later papers in the same subject area need no new
   endorsement; arXiv's endorsement page says which categories share one.
2. **Upload** the private copy, which is the only version with your email: the LaTeX source with its
   `figures/` folder (arXiv prefers source), or the PDF. The paper's metadata file, for example
   [arxiv-metadata.md](../research/submission/arxiv-metadata.md), has every field of the form.
3. **License.** The metadata recommends CC BY 4.0: anyone may reuse the text, but only with
   attribution. arXiv also offers more restrictive licenses; decide before you submit, because the license
   granted with an announced version cannot be taken back.
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
- One code release and DOI can serve every paper that used that version of the code.
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
