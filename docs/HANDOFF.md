# Handoff: where things stand (2026-09-24, evening)

Read this first when you come back. Newest state at the top of each list.

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
| Vegetation step bound and float16 policy for chemotaxis, pfc and amb (items 3 and 4) | agent `a1326c9d84e5f0d6b`, still running its final PDE-order rerun | Its unfinished work is saved as [wip/vegetation-float16.patch](wip/vegetation-float16.patch) (16 source, tool and doc files, against main at 7140ab1; generated files and results left out, so rebuild and rerun). Apply with `git apply`, finish, and rerun `node tools/pde-order.js --full --write`, `tools/half-float-check.js` and `node tools/recipe.js`. It also edits `src/shared/engine.js`, which now carries recipe v4 from the lozenge change, so merge that by hand. |
| Research: license, rename, reading | stopped after all eight research tracks finished; verification only just started | Saved, unverified, in [wip/research-2026-09-24-unverified.md](wip/research-2026-09-24-unverified.md). Next: verify the load-bearing claims, then write the answer. |
| Fresh-ideas sweep (publication, protection, legal, engineering, visibility) | stopped to save usage | Rerun on request |

## Your to-dos (only you can do these)

1. **Delete 12 stale branches.** The session cannot push deletions. On your Mac, in the GENChase folder:

   ```
   git push origin --delete claude/affectionate-fermi-89ndh4 claude/eloquent-brahmagupta-wz6g26 docs/readme-check-and-print-tagline docs/readme-check-and-print-tagline-v2 grok/hendrick-name grok/here-plates grok/print-and-gpu grok/soliton-web lit/aref1982-read printbound/eight-print-state-r109 promote-lozenge wip-sle
   ```

2. **Decide on `research/generalizations-wip`** (draft PR #136). It is public and holds:
   - full-text copies of 14 papers, some paywalled;
   - your unpublished generalization results.

   Making GENChase private hides it immediately. Deleting the branch alone does not, because PR #136 keeps the commits reachable.
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

- **Is the arXiv license the best?** The current setup recommends the arXiv perpetual non-exclusive license, with CC BY 4.0 as the alternative. Companion repos mark the manuscript "all rights reserved" and the code and data Apache-2.0. One wrinkle is being checked: paper v1 sat in the public GENChase repo under its Apache-2.0 license, and the v0.6.x releases attached the PDF. Whether that license covers the paper text, and what it means for a journal, is part of the research. Do not rely on the restrictive license to protect the text until that answer is in.
- **Renaming GitHub from ChaseHendrick.** Repo URLs redirect, but the Pages site (`chasehendrick.github.io`) and the profile URL do not. If you rename, do it before creating the companion repos and before arXiv or Zenodo, because those records are permanent and the papers print `github.com/ChaseHendrick/...` URLs. 62 files mention ChaseHendrick. The research is verifying the details.
- **Reading still owed for paper 1.** Per the ledger, `RESEARCH.md` as updated in #149:
  - Stremler 2021, *Regul. Chaotic Dyn.* 26, 482 to 504 (paywalled; a review of the path-length observation Corollary 1 proves);
  - the zero-impulse section of Tavantzis and Ting 1988.

  These two are still unread. Conte and de Seze, Hernandez-Garduno and Lacomba, and Grotto, Romito and Viviani have been read and cited. The alpha draft also still needs JPSJ 90, 124401 (2021).

## Code work left from your list

- **2: done**, on this branch. Lozenge is frozen when connected to the rim; the Aztec and lozenge error bars are calibrated; both are validated within stated limits. Recipe v4.
- **3 and 4 (running).** Compute the vegetation tab's combined step bound. Decide and document a float16 policy for chemotaxis, pfc and amb.
- **7.** Add Done-list entries in `docs/RESEARCH-GRADE.md` for sections 1 and 4 (section 2 is done), and refresh the Atlas map artifact (https://claude.ai/artifact/GXYHX9XMdak9vhwgiLC1Gq).
- **Recorded defects, not fixed:**
  - tilings: the P3 matching arcs (tilings.js:31) and the grout inset (tilings.js:626);
  - grains: the top load never loads the packing, and the starting lattice overlaps (grains.js:119 to 137, 591, 623).
- **Housekeeping:** the sandpile and percolation print checks still build recipes with `v: 2` while the engine is at 3. This makes no difference to those tabs.

## How to resume

Open this session again, or start a new one on this repository and say "read docs/HANDOFF.md and continue".

- Git author for every commit is `Chase Hendrick <326338179+ChaseHendrick@users.noreply.github.com>` (AGENTS.md).
- The session's own git hook asks for a Claude identity instead. The repository rule wins.
