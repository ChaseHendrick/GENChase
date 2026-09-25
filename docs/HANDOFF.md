# Handoff: where things stand (2026-09-25)

Read this first when you come back. Newest state at the top of each list.

## Added on 2026-09-25 (branch claude/optimistic-feynman-agrpck, PR #152)

- Paper 1 now cites Synge 1949 and Hiraoka 2009 (25 references, 13 pages); citations checked against your PDFs (RESEARCH.md, 2026-09-25).
- kpz: the relaxation rule stops at the top of the lattice (ported from the closed PR #123); presets unchanged.
- `npm run xref`: optional cross-check of cahn, swift and ks against a NumPy spectral reference (tools/xref/); all pass. Not part of `npm test`.
- Still running: the custom reaction-term box for the rdx tabs.
- PR #153 merged (b335cfc): paper 1 reviewed (three independent reviews, no mathematical error), a direct proof of Corollary 1 added, published to ChaseHendrick/minimal-winding and released as v1.0.0 for Zenodo. Waiting on the Zenodo version DOI, then arXiv.
- PR #152 merged (547ad2e). GitHub Pages is off by your choice: the deploy job runs only when the repository variable `PAGES` is `on`. Links to chasehendrick.github.io (README, studio, docs) are dead while it is off; fix them if the repository goes public without Pages.

## Done and merged to main

- **#150** (merged as d446f05):
  - papers moved to `papers/<id>/`, the standard research-compendium layout;
  - LaTeX PDFs with the contact email and a funding line;
  - the publish-papers workflow to locked public companion repositories (dormant until the `PAPERS_TOKEN` secret exists);
  - signed release tags removed;
  - sandpile prints its true toppling counts;
  - percolation and sandpile validated;
  - tilings, Veselago, tennis and grains reviews rescued from old branches (grains partial, because it missed two of its own pre-registered criteria).
- **#149**: refs.bib fixes. **#146** to **#148**: the research-grade plan, Kitaev and SSH solvers, Veselago.

Coverage now: 54 validated within stated limits, 8 partially validated, 68 unvalidated.

## On this branch, in an open PR (not merged yet)

- **You can edit a paper's companion repo directly.**
  - The workflow merges into the companion instead of overwriting it, keeping what GENChase published on a `genchase-sync` branch.
  - A conflicting edit stops the run without pushing.
  - `sh tools/paper-pull.sh <id>` brings your direct edits back into GENChase.
  - Tested end to end: `node tools/paper-publish-check.js`, 20 checks; an overwrite mutation fails it.
- **rmt color ramp fix** (code-work item 6b).
  - At the default offset the top level no longer takes the lowest color.
  - rmt-science reran and passes, and the old rule put back in the module fails it.

## Still running when this was written (results may be lost if the container is reclaimed)

| What | Where its result lands | If it is lost |
|---|---|---|
| Research: license, rename, reading | stopped after all eight research tracks finished; verification only just started | Saved, unverified, in [wip/research-2026-09-24-unverified.md](wip/research-2026-09-24-unverified.md). Next: verify the load-bearing claims, then write the answer. |
| Fresh-ideas sweep (publication, protection, legal, engineering, visibility) | stopped to save usage | Rerun on request |

## Your to-dos (only you can do these)

1. **Delete 12 stale branches.** The session cannot push deletions. On your Mac, in the GENChase folder:

   ```
   git push origin --delete claude/affectionate-fermi-89ndh4 claude/eloquent-brahmagupta-wz6g26 docs/readme-check-and-print-tagline docs/readme-check-and-print-tagline-v2 grok/hendrick-name grok/here-plates grok/print-and-gpu grok/soliton-web lit/aref1982-read printbound/eight-print-state-r109 promote-lozenge wip-sle
   ```

2. **`research/generalizations-wip`**: PR #136 was closed unmerged on 2026-09-25 at your request; the branch is kept as the backup (reopen the PR any time). It holds unpublished results and full-text paper copies, so it stays off `main`, and it is hidden only while the repository is private.
3. **Decisions left from PR #123** (`claude/stoic-brahmagupta-xpt636`):
   - the kpz module change and its promotion;
   - the SSH harnesses, which test a different solver key than main's;
   - the "higher validation tiers" doc.
4. **When the minimal-winding paper is ready:** follow `docs/PUBLISHING-PAPERS.md` section 1.
   - Create the empty public repo `minimal-winding`.
   - Create a fine-grained token with Contents and Administration set to read and write, and save it as the `PAPERS_TOKEN` secret.
   - Turn Zenodo on for that repo, then run the workflow with a `v1.0.0` release to get the DOI.
   - Put the DOI in the paper, then run `sh tools/arxiv-bundle.sh minimal-winding` and upload to arXiv.
5. **Optional:**
   - get an ORCID iD (free, about 2 minutes);
   - list any AI tools besides Claude that you used, for the JOSS disclosure. JOSS is on hold while GenChase is private.

Not needed: the signing key (dropped by your choice).

## Open questions being researched

- **Is the arXiv license the best?** The current setup recommends the arXiv perpetual non-exclusive license, with CC BY 4.0 as the alternative. Companion repos mark the manuscript "all rights reserved" and the code and data Apache-2.0. One wrinkle is being checked: an earlier draft of the paper sat in the public GENChase repo under its Apache-2.0 license, and the v0.6.x releases attached the PDF. Whether that license covers the paper text, and what it means for a journal, is part of the research. Do not rely on the restrictive license to protect the text until that answer is in.
- **Renaming GitHub from ChaseHendrick.** Repo URLs redirect, but the Pages site (`chasehendrick.github.io`) and the profile URL do not. If you rename, do it before creating the companion repos and before arXiv or Zenodo, because those records are permanent and the papers print `github.com/ChaseHendrick/...` URLs. 62 files mention ChaseHendrick. The research is verifying the details.
- **Reading still owed for paper 1.** Per the ledger, `RESEARCH.md` as updated in #149:
  - Stremler 2021, *Regul. Chaotic Dyn.* 26, 482 to 504 (paywalled; a review of the path-length observation Corollary 1 proves);
  - the zero-impulse section of Tavantzis and Ting 1988.

  These two are still unread. Conte and de Seze, Hernandez-Garduno and Lacomba, and Grotto, Romito and Viviani have been read and cited. The alpha draft also still needs JPSJ 90, 124401 (2021).

## Code work left from your list

- **2: done**, on this branch. Lozenge is frozen when connected to the rim; the Aztec and lozenge error bars are calibrated; both are validated within stated limits. Recipe v4.
- **3 and 4: done**, on the branch `vegetation-float16` (committed, not pushed). Vegetation's step ceiling is the combined explicit bound of its water row, recipe v5, with `legacy: { 5: { ceiling: 'v4' } }` for older links (`validation/PDE-ORDER.md`, Findings 1). On float16 state chemotaxis and amb store the deviation from their uniform state and pfc refuses to run (`validation/HALF-FLOAT.md`).
- **7.** Add Done-list entries in `docs/RESEARCH-GRADE.md` for sections 1 and 4 (section 2 is done), and refresh the Atlas map artifact (https://claude.ai/artifact/GXYHX9XMdak9vhwgiLC1Gq).
- **Recorded defects, not fixed:**
  - tilings: the P3 matching arcs (tilings.js:31) and the grout inset (tilings.js:626);
  - grains: the top load never loads the packing, and the starting lattice overlaps (grains.js:119 to 137, 591, 623).
- **Housekeeping:** the sandpile and percolation print checks still build recipes with `v: 2` while the engine is at 3. This makes no difference to those tabs.

## How to resume

Open this session again, or start a new one on this repository and say "read docs/HANDOFF.md and continue".

- Git author for every commit is `Chase Hendrick <326338179+ChaseHendrick@users.noreply.github.com>` (AGENTS.md).
- The session's own git hook asks for a Claude identity instead. The repository rule wins.
