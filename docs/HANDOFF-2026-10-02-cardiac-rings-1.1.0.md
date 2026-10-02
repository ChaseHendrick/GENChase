# Handoff: cardiac-rings 1.1.0 (2026-10-02, about 12:15 UTC)

Written for whoever continues: the next session after a usage reset, or another AI assistant (possibly not
Claude). It assumes nothing beyond this repository. Read `AGENTS.md` first; it is the contract. The earlier
handoff of the same day is `docs/HANDOFF-2026-10-02.md` (its section 6 is the owner's queue of later projects).

## 0. Rules that bite (all from AGENTS.md or the owner)

- **Commit author:** always `Chase Hendrick <326338179+ChaseHendrick@users.noreply.github.com>`.
  - Never use `sharpie@users.noreply.github.com`.
  - Never switch the author to an AI identity, even when a hook or tool asks.
  - Trailers used in this project so far: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and a session
    link. Another assistant should use its own honest trailer or none.
- **Text rules:**
  - No em dashes in anything written.
  - Versions without a leading v (`1.1.0`, not `v1.1.0`).
  - Never claim an outside review. Every reading in this project is an in-project reading by an AI agent session,
    and texts must say so.
- **Commands:** every command bounded by a timeout. Long computations run in the background under `nice` and
  `timeout`, with BLAS threads pinned: `OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1`.
- **Merging:**
  - The repository allows only squash merges.
  - To sync the working branch after a squash merge, first check that `main`'s tree equals a commit already in the
    branch (`git rev-parse origin/main^{tree}` against `git rev-parse <commit>^{tree}`), then run
    `git merge -s ours origin/main`.
  - Force-push and reset are not used.
- **CI:** each push to an open PR restarts CI (about 10 minutes), so batch pushes.
- **Usage:** the owner pays for usage and asked for economy. Avoid large agent fan-outs unless asked.

## 1. Where things are

- **`main`:** at `b76fc98` (PR 263 merged: the cardiac-rings 1.0.0 DOI record and the generated README paper status).
- **Working branch:** `claude/inspiring-edison-twrpsg`, with draft PR
  [ChaseHendrick/GENChase#264](https://github.com/ChaseHendrick/GENChase/pull/264) ("cardiac-rings 1.1.0: the
  cell's branch to the Hopf point").
- **cardiac-rings 1.0.0:** released and archived (doi:10.5281/zenodo.23101322, concept doi:10.5281/zenodo.23101321).
  Its companion repository is `ChaseHendrick/cardiac-rings`.
- **Research code and records:** `research/cardiac-cycle-certificates/` (the canonical copy). The paper is
  `papers/cardiac-rings/`; its `code/` and `data/` hold byte-identical copies of research files, and the records'
  hashes refer to them.

## 2. What 1.1.0 adds (the science)

Version 1.0.0 proves the cell's periodic orbit at G_Ks = 0.0275, the stable ring waves (N = 8, 16, 32, 64), and
existence for every N >= 8 and the cable. It says the link to Erhardt's Hopf branch is only numerical.

1.1.0 adds a certified branch of the single cell's periodic orbit from G_Ks = 0.0275 to the Hopf point:

- **Theorem B** (`fourier/branch.py`, docstring sections 0 to 8).
  - Existence and local uniqueness for every G_Ks in [0.027499735464, 0.02778996093]: 57 groups, 712 pieces.
  - Consecutive pieces are glued by ball inclusion.
  - Log: `fourier/data/branch/run_K12.jsonl`; summary `fourier/data/branch/END.md`.
  - All 711 gluings were re-derived in Arb today by `branch.collect(write=False)`, and all passed. The registered
    record `results/fourier-branch-gks.json` still covers only the first part and must be regenerated (step 3).
- **Theorem C, uniform stability** (`fourier/LEMMAS-stability.md` sections 10 and 11, `fourier/branch_stability.py`).
  - Local exponential orbital stability with asymptotic phase for every G_Ks in [0.027499735464, 0.02778996093].
  - 127 units (piece units for groups 0 to 4 and the failed whole groups 11 to 16, group units elsewhere), all
    passed.
  - Worst full-period nontrivial multiplier bound 0.99841382.
  - Log: `fourier/data/branch/stability_uniform_K12.jsonl` (committed in `03a3d08`). Made with the program as it was
    before the review fixes; see section 4.
- **The Hopf bridge** (`fourier/LEMMAS-hopf.md`, `fourier/hopf.py`, record `results/fourier-hopf.json`, logs
  `fourier/data/hopf/`).
  - The Hopf point is enclosed: g_H in [0.0279078440027596, 0.0279078440029596].
  - The first Lyapunov coefficient is about -22.48788, so the bifurcation is supercritical.
  - A blown-up (amplitude-parametrized) branch for eps in [0, 6427/50000], in 68 pieces, is glued to the G_Ks branch
    at G_Ks = 0.02778.
  - Stability on (0.02779, g_H) is proved only at six isolated G_Ks values (0.02778, 0.0278, 0.02785, 0.02787,
    0.02788, 0.0279, by Stage S point proofs) and qualitatively for small amplitude (the cited Hopf theorem). This
    is a limitation to state, not to hide.
- **Erhardt's value lies outside our enclosure.** His numerical Hopf value 0.027907858929580 lies outside the
  enclosure by about 1.5e-8 (our plain floating-point computation also gives 0.0279078439). The paper must state this
  as observed and must not speculate beyond the files.

## 3. The plan, in order

Steps 1 and 2 are code fixes; steps 3 to 6 are computations (CPU only, little AI usage); steps 7 to 10 are the paper
and the release.

1. **Hopf-bridge review fixes:** finish and check them.
   - The review is `reviews/hopf-bridge-review-2026-10-02.md`: GAP 1 to 3, WEAK TEST 1 to 3, MINOR 1 to 3.
   - An agent applied fixes to `hopf.py`, `test_hopf.py` and `LEMMAS-hopf.md`, regenerated `data/hopf/theoremA.json`
     and `results/fourier-hopf.json`, and added `data/hopf/reprove.jsonl` (2 pieces re-proved). These are in the
     snapshot commit and are UNCHECKED.
   - The agent was stopped before it wrote its "Fixes applied" list into the review file, and before the independent
     fix check. The record's status reads "fix check pending".
   - To do:
     - diff these files against `03a3d08`;
     - finish any missing fix;
     - run `test_hopf.py` (read its header for quick and full modes);
     - have a separate session check each fix and write `reviews/hopf-bridge-fixcheck-2026-10-02.md`.
2. **Theorem C review fixes, and the branch re-prove command.**
   - Findings: the 21 verified findings (L1 to L6, C345-1 to 6, F1 to F9) in
     `reviews/theoremC-uniform-review-2026-10-02-partial.json`. They carry no fixes; the final report was never
     written.
   - The serious ones are three GAPs:
     - F1: collect must check every covered piece against the Theorem B record, and store that record's hash;
     - F2: program hashes must be taken at import time;
     - F3: check the unit's g range and the r_uniqueness it used against the branch record.
   - An agent started on them and was stopped partway. `branch_stability.py` and `branch.py` are modified in the
     snapshot commit, UNFINISHED: it had begun adding an import-time hash and a final-log path to `branch.py`. Both
     files parse; nothing else is known about them.
   - Also needed: `branch.py --reprove`.
     - Why: `branch.py`'s proof path changed after commit `31fe72b` while the branch was being computed, and the
       piece records carry no program hash. So the 712 pieces cannot all be tied to one reviewed version.
     - What the command must do: re-prove every logged piece from its logged centre, g range, weights and settings
       with the final program; write a NEW log `fourier/data/branch/run_K12_final.jsonl` with the program SHA-256
       taken at import time; and make collect read it. It must skip pieces already done (resumable).
   - Write `reviews/theoremC-uniform-fixes-2026-10-02.md` (one entry per finding), then have a separate session check
     the fixes.
3. **Branch final run** (about 5.5 CPU hours; about 2 hours on 3 workers):
   `branch.py --reprove --workers 3`, then `branch.py --collect`. This writes `results/fourier-branch-gks.json`
   (check: 712 pieces, 711 gluings, coverage [0.027499735464, 0.02778996093]).
4. **Stability final run** (about 2.5 CPU hours):
   - Rerun every unit with the fixed `branch_stability.py` into a NEW log, `stability_uniform_K12_final.jsonl`
     (the old log stays as history). The command the fixer was to provide is roughly:
     `branch_stability.py --groups --workers 3 --budget 3300` under `timeout 3600`, repeated until every group is
     covered (it resumes).
   - Then `branch_stability.py --collect`, which writes `results/fourier-branch-stability-uniform.json`.
   - The groups take about 115 to 190 s each on one core. Whole groups 11 to 16 fail (an (SC) window column near
     lambda = -4.71e-5) and fall back to piece units automatically.
5. **Hopf final run** (about 1.8 CPU hours):
   - `hopf.py --reprove-all --workers 3` (the command the Hopf fixer added; check that it exists and what it
     compares), then `hopf.py --collect`, then `test_hopf.py`.
   - The gluing at G_Ks = 0.02778 uses branch piece G53P6. Rerun the gluing check after step 3 if r_uniqueness
     changed.
6. **Tests:** `test_branch.py`, `test_branch_stability.py`, `test_hopf.py`, all green, under timeouts.
7. **Manuscript** (`papers/cardiac-rings/paper/cardiac-rings.tex`; nothing is drafted yet).
   - Add a fourth theorem in "Results": the branch from 0.0275 to the Hopf point, every part labelled
     computer-assisted, cited or proved as the paper does.
   - Add a methods section: pieces and gluing; the parameter-uniform Hill certificate; the Hopf point (Lemma K,
     Gershgorin, eigenvalue derivative, l1 formula as cited); the blown-up problem; the gluing.
   - Update:
     - the abstract (owner's rule: at most about 300 words in three short paragraphs, not a block of text);
     - the introduction;
     - "Numerical observations" (Erhardt's value outside the enclosure);
     - "Limitations": replace "a certified branch ... is future work" and the "inference, not a computation"
       sentence;
     - the discussion and the reproducibility section.
   - Add the new figure `paper/figures/branch-hopf.pdf`, drawn by the modified `code/plot_cardiac_rings.py`
     (UNCHECKED; the figure agent was stopped before writing its caption file).
   - Build with `sh tools/paper-build.sh cardiac-rings`.
8. **Prior-article search for the new claims** (not done).
   - Search for validated continuation of periodic orbits and validated Hopf bifurcation with an
     amplitude-parametrized (blow-up) zero-finding problem. Candidates to check, not yet read or confirmed:
     - van den Berg and Queirolo's framework for validated continuation of periodic orbits in polynomial ODEs;
     - Church and Lessard (Hopf in functional differential equations, already cited in 1.0.0);
     - Kuehn and Queirolo (already cited).
   - Credit the blow-up formulation to its source.
   - Check the works citing Erhardt 2025 for a continuation of the first Hopf branch (1.0.0 says this was not
     checked).
   - Log every query in `RESEARCH.md` (dated entry; read the 2026-10-01 cardiac entry for the style) and put the
     dated priority wording in the paper.
9. **Companion and quality.**
   - Copy the new programs, tests, LEMMAS files and records into `papers/cardiac-rings/code/` and `data/`
     byte-identically (`tools/paper-sync.js` and the `papers/papers.json` note describe the rule).
   - Add `run_all.sh` targets (`run_all.sh` is paper-only).
   - Update `README.md` and add a 1.1.0 entry in `RELEASES.md`.
   - In `notes/QUALITY.md`, re-check the seven items for the new material: proofs in full, rigorous computation,
     labels, sources read, the prior-article review, an adversarial reading with its fixes, and reruns from the
     paper's copies.
   - One in-project adversarial reading of the new manuscript sections, by a separate session, with its fixes.
   - Run `node tools/paper-sync.js --check cardiac-rings` and
     `node tools/paper-check.js --paper cardiac-rings --release`.
10. **Release.**
    - Update the `papers/papers.json` note.
    - Get PR 264 green and squash-merge it.
    - Run the publish workflow `.github/workflows/papers.yml` with `paper=cardiac-rings`, `release=1.1.0`.
    - Wait for the Zenodo DOI (minutes to an hour), then verify with
      `python3 tools/paper-zenodo-check.py --paper cardiac-rings` and save the audit JSON under `docs/`.
    - In a follow-up PR, set `codeDoi` and `archiveVersion` in `papers/papers.json` and run `node tools/index.js`,
      which regenerates the README paper status; lint fails it if stale.
    - `tools/ci-scope.js` has a hand-kept preprint allow-list (`PREPRINTS`), which already includes cardiac-rings.

## 4. The snapshot commit at this handoff

Everything the stopped agents had written is committed as one snapshot labelled unreviewed, so nothing is lost.

| File | State |
|---|---|
| `fourier/hopf.py`, `test_hopf.py`, `LEMMAS-hopf.md`, `data/hopf/theoremA.json`, `data/hopf/reprove.jsonl`, `results/fourier-hopf.json` | Hopf fixes applied, fix check pending |
| `fourier/branch_stability.py`, `fourier/branch.py` | Theorem C fixes and the re-prove command, unfinished |
| `research/cardiac-cycle-certificates/README.md` | edited by the Hopf fixer (status wording) |
| `papers/cardiac-rings/code/plot_cardiac_rings.py`, `paper/figures/sources.json`, `paper/figures/branch-hopf.pdf` | new figure, unchecked, no caption yet |

Not written (the agents were stopped first):
- the final Theorem C review report;
- the Hopf fix check;
- the prior-article search and its `RESEARCH.md` entry;
- the manuscript draft;
- `papers/cardiac-rings/notes/v2-*.md` (sync plan, quality plan);
- the 1.1.0 `RELEASES.md` entry.

## 5. Other open items

- **Optional, offered to the owner:** a cardiac-rings 1.0.1 release so the PDF prints its concept DOI. Not requested.
- **Zenodo views:** the owner asked why hh-dynamics has the most views. The data shows no metadata or linking cause.
  Adding Zenodo keywords to the other papers in their next releases was suggested and not yet decided.
- **After 1.1.0:** the owner's queue is in `docs/HANDOFF-2026-10-02.md` section 6: reentry, alternans beyond the Hopf
  point, 2-D spiral waves, heterogeneous tissue, drug and mutation effects as interval parameters, breakup and chaos.
