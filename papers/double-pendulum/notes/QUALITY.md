# Quality record: Chaos and Analytic Non-Integrability of the Classical Double Pendulum: A Computer-Assisted Proof

The bar every paper in this repository meets before it is published or preprinted: a companion release, a Zenodo
DOI, arXiv or a journal. `node tools/paper-check.js` refuses the status "ready" or later in `papers/papers.json` until
every item in the record below is checked, and a checked item must say what the evidence is. This file stays in
GENChase: the companion repository does not carry `notes/`.

1. Complete proofs: every theorem, proposition, lemma and corollary is proved in full in the paper or an appendix. A
   proof may use a published result only as stated there, with its hypotheses checked in the text; an argument
   adapted from another paper is written out, not summarized.
2. Rigorous computation: every computer step in a proof is exact or interval arithmetic, in a committed program that
   stops on a failed check and has negative controls.
3. Every claim labelled: each result is labelled proved, computer-assisted, formal or numerical, in the paper and in
   the README, and numerical results are never stated as theorems.
4. Sources read: every source that a proof step depends on is read in full; background citations are recorded in
   RESEARCH.md with how far each was read.
5. Prior article review: the prior-article searches are logged in RESEARCH.md, and every novelty statement stays
   within what they reached.
6. Adversarial second reading: every proof has been read by an independent reviewer told to find errors, briefed
   only with the paper and its programs, and every must-fix finding is fixed and recorded.
7. Reproducible: the programs run from the companion with its `requirements.txt`, `paper-check` and
   `paper-sync --check` pass, and the page and check counts stated are current.

## Record (2026-09-27, first draft)

- [x] **1. Complete proofs.** Written in full in the paper: Lemma 1 (energy levels and the section), Lemma 2
  (reversibility), Lemma 3 (Krawczyk), Lemma 4 (hyperbolicity), Lemma 5 (the graph transform and the local unstable
  manifold), Lemma 6 (the symmetric transversal crossing), Lemma 7 (the entropy of the flow from that of the return
  map, from Bowen's separated-set definitions), Lemma 8 (a local lambda-lemma), Proposition 1 (covering relations to a
  compact invariant set, a semiconjugacy and an entropy bound), the proofs of Theorems 1 to 3 from them, Corollary 1
  (the horseshoe at E = -1/2, 0, 1/2, from Theorem 3's covering relations and Lemma 7; option (c), 2026-09-27),
  Corollary 2 (Kozlov's argument, with Lemma 8) and Corollary 3. No proof step uses Smale's theorem: Smale (1965) was
  read in full and Remark 2 explains why it does not apply to an area-preserving map as stated (Theorem B is for a
  residual set D_0, and its proof linearizes by Sternberg's theorem, whose non-resonance condition fails when
  lambda1 lambda2 = 1). No horseshoe is claimed on the energy interval. Closed on 2026-09-27 (owner's decision to
  derive both local results from cone conditions): the two published results that were applied outside the form in
  which they are stated are no longer applied. Lemma 5 now proves the local unstable manifold of the return map by a
  graph transform written out in the paper (invariance and expansion from (C1)-(C3), vertical contraction kappa < 1
  and slope contraction theta < 1 from a new certified condition (C4; numbered (C6) before the review of 2026-09-27), C^1 regularity by a contraction on slope fields),
  instead of Dyatlov's stable manifold theorem; Sect. 2 now defines W^u(p), W^s(p) as sets and transversality by C^1
  arcs, so the global immersion that was cited from Dyatlov is not needed. Lemma 8 proves the local lambda-lemma that
  Corollary 2 uses (an arc through a point of the local stable manifold G(W^u_loc), transversal to it, has forward
  images containing graphs over [-a, a] that converge in C^1 to W^u_loc) from the same conditions and
  reversibility, instead of Palis's Lemma 1.1; Corollary 2 applies it with the transversal crossing of Lemma 6. Palis and Dyatlov are cited only as the classical
  statements; Zgliczynski (2009) is cited as related work and none of its statements is used. (C4), which after the review also carries the inequality |x_p| < a(mu_h - 1)/(mu_h + 1)
  that no program had checked (review-1, must-fix 1), is verified by
  `code/cones.cpp` at the four configurations (kappa <= 0.2878, 0.3351, 0.3547, 0.2879 and theta <= 0.0818, 0.1118,
  0.1233, 0.0818 at E = 0, 1/2, -1/2 and on the interval; about 10 s each), with a negative control that fails
  (`data/control_cones_swap.txt`, now failing for the real reason, and `data/control_cones_shift.txt`). The new proofs
  were read adversarially in the project (item 6).
- [x] **2. Rigorous computation.** Every computer step of a proof is interval arithmetic with outward rounding in
  CAPD (`code/prove.cpp`, `code/cones.cpp`, `code/horseshoe_check.cpp`, `code/rig.h`) or exact (`code/check_field.py`, SymPy); each
  program reports FAIL on a failed check and exits non-zero. Negative controls, all failing as they must: the
  integrable uncoupled pendulums (transversality not certified), a moved segment (C4), a cone narrower than the
  measured ratio (C1), and three covering relations that must not hold (`data/control_*.txt`); these four are coarse. Five near-miss
  controls added after review-1 (2026-09-27) fail for their stated reason, which `run_all.sh` checks in each report: a
  thin target (fails only condition (ii)), a wide target (only (iii)) and an overlapping h-set (only disjointness) for
  the true relation M1 => M2 at E = 0; (C4) over the stable direction on a square box (mu_h about |lambda_s|, kappa > 1)
  and with N0 off centre (only |x_p| < a(mu_h - 1)/(mu_h + 1)). `code/cones.cpp` repeats stage 1 and compares K and
  G(K) with inward-rounded bounds of B, as Lemma 3 requires. Every decimal constant is parsed in round-to-nearest
  (`rig.h`, `horseshoe_check.cpp`; a no-op on the shipped build, as review-1 tested). The departure phase of CAPD's
  Poincare map is now covered by a written argument from three facts in its code (paper, Sect. 8). An independent
  rigorous integrator in Arb (`code/crosscheck/kraw3.py`) reproduces the fixed point at E = 0. In-project mutation
  tests of the programs (22 mutations of the model and configuration, mutations of the checking code) are recorded in
  `research/double-pendulum/check/VERDICT.md` and `VERDICT-horseshoe.md`. Fixed on 2026-09-27: `horseshoe_check.cpp`
  printed its entropy and return-time bounds rounded to nearest (so "log r > 0.101608707" was rounded up from
  0.1016087069); it now prints lower bounds rounded down and upper bounds rounded up, and the paper states safe digits
  and proves the entropy bound with an explicit positive eigenvector. The horseshoes at E = -1/2 and 1/2 (2026-09-27): 28 covering relations each, verified by the same
  program, with the first failed designs recorded in the paper (Sect. 6.3) and not used. What is trusted is stated in the paper
  (Sect. 8): CAPD, the compiler and rounding, and a reading of CAPD's code for sets that start on the section.
- [x] **3. Every claim labelled.** The paper labels each result (Theorems 1 to 3 computer-assisted; Lemmas 1 to 8,
  Proposition 1 and the corollaries proved) and marks the numerical parts (Sect. 7: how the orbit and the h-sets were
  found, Poincaré sections, the high-precision check of the crossing); the README's "Status of the results" says the
  same. No numerical result is stated as a theorem.
- [x] **4. Sources read.** No proof step depends on an unread source. The sources that proof steps use, and what was
  read of each: Zgliczynski and Gidea (2004), author copy, Definitions 1, 2, 6, Theorems 9 and 16 (the only results
  used), with Sects. 2-4; Kozlov (1983), Ch. V (the argument of Corollary 2, written out in the paper); Bowen and Walters (1972), Sects. 1, 3 and 4; Kapela et al.
  (2021), the CAPD paper, in the parts used, and the CAPD source files named in the paper. The Krawczyk lemma, the
  reversibility, the local unstable manifold (Lemma 5), Lemma 7, the local lambda-lemma (Lemma 8) and Proposition 1
  are proved in the paper; Bowen's definition of the entropy of a map is
  stated in the paper. Smale (1965) was read in full (owner's photographs of the Collected Papers reprint, pp.
  636-653; quotes on pp. 64 and 78 checked against the images) and is used only in Remark 2, to say why it is not
  used. Not used in any proof: Perez-Stark (no longer cited), Abramov (1959) and Kucherenko and Thompson (a background
  remark), Ito (1971; read, not cited), the variational principle. Remark 2 names later forms of the Smale-Birkhoff theorem (Katok-Hasselblatt, Palis-Takens, Moser), marked not read
  and not used; Wilczak-Zgliczynski (2009) is cited from its title and abstract as a search result. Cited as the
  classical statements of what Lemmas 5 and 8 prove, not used in a proof step: Palis (1969), pp. 385-388
  read (Lemma 1.1 and its proof); Dyatlov, arXiv:1805.11660, Sect. 4.1 read. Zgliczynski (2009) is cited as related
  work (abstract and Theorems 14 and 24 read). Background citations and how far each was
  read: RESEARCH.md, entries of 2026-09-26 and 2026-09-27, and `research/double-pendulum/THEOREM-SOURCES.md`.
- [x] **5. Prior article review.** RESEARCH.md, entries of 2026-09-26 (the classical double pendulum: prior articles)
  and 2026-09-27 (the novelty checks before the manuscript); the ledgers `research/double-pendulum/PRIOR-ART.md` and
  `BOLOTIN-NEGRINI.md`. Szuminski and Kapitaniak (2025) read in full; no newer proof found on arXiv, zbMATH Open,
  Crossref or Semantic Scholar on 2026-09-27. Bolotin and Negrini (1997) could be read only in snippet view: the paper
  says so (Sects. 1 and 8) and keeps the novelty of Corollary 3 and of chaos in the equal case conditional on that
  reading; the owner decided on 2026-09-29 that the printed article will not be obtained (no loan and no preprint
  request). The comparison stays conditional on the snippets, the zbMATH review, Bolotin's 1997 doctoral abstract, and
  Bolotin-Rabinowitz, J. Differential Equations 148 (1998) 364-387, as recorded in `BOLOTIN-NEGRINI.md`. Ivanov I (in full), III and IV (their main theorems), from open
  copies of the journal's archive, 2026-09-27: numerical or asymptotic in a small mass ratio, none at equal parameters;
  I states the conjecture of non-integrability for all non-degenerate parameters, which the paper cites. Ivanov II and
  Palis (1969) are free in a browser but were blocked from the session; the owner can read them.
  After review-1 (2026-09-27): the paper now says in Sects. 1 and 8 that Bolotin and Negrini are known only from search
  snippets and that the printed paper has to be read before the novelty can be relied on; it states Ivanov IV's
  explicit region (the reduced system m2/m1 -> 0, within 4e-7 to 5e-3 of the vertices of its compactified parameter
  square; Main Theorem, p. 54), and it summarizes the search of the computer-assisted-proof literature recorded in
  `research/double-pendulum/PRIOR-ART.md` (section "CAPD group").
- [x] **6. Adversarial second reading.** Done in the project on 2026-09-27 by an independent reader briefed only with
  the paper, `code/`, `configs/` and `data/`: `notes/review-1.md`, verdict minor revision, with one must-fix (the last
  inequality of (C3) was used but checked by no program), seven should-fix and sixteen minor items. Its Response
  section answers each item. The must-fix is fixed and recorded: the inequality is now part of (C4), with mu_h from the
  hull, and `code/cones.cpp` checks it at the four configurations (|x_p| <= 2e-12, 5.4e-10 on the interval, against
  thresholds above 6.4e-6), with a control that fails only that inequality. All seven should-fix items are fixed in the
  paper, the code or the ledgers (the departure argument, near-miss controls, Remark 2, novelty, terminology, the
  E = -1/2 homoclinic point, `run_all.sh` on the committed configurations); of the minor items, those not fixed are
  answered with the reason (a change to the printing of `prove.cpp` waits for its next full run). Nobody outside the
  project has read the manuscript.
- [x] **7. Reproducible.** `code/run_all.sh` was run end to end from this folder on 2026-09-27, before the horseshoes at E = -1/2 and 1/2 were
  added to it; those two checks were run separately the same day (about 12 and 13 minutes on two threads) from the
  configurations their design commands in `run_all.sh` reproduce byte for byte, and their reports are
  `data/horseshoe_Ehalf.txt` and `data/horseshoe_Eminushalf.txt`. The first end-to-end run (54 minutes on two
  threads of a shared machine, exit status 0): the field check OK; E0, Ehalf, Eminushalf and E0_interval PROVED; all 24
  covering relations VERIFIED; the four controls fail, as they must. Its reports are the files in `data/`; E0, Ehalf,
  Eminushalf and E0_interval are identical, up to the order of the lines printed by parallel threads, to the runs made
  earlier the same day, and the horseshoe report differs only in the direction-safe rounding of its last two lines.
  CAPD was the build of the pinned commit already on the machine (`CAPD_CONFIG`), not a fresh clone; the Python
  packages were those pinned in `code/requirements.txt`. The cross-checks in `code/crosscheck/` were rerun from this
  folder the same day with the outputs in `data/crosscheck_*.txt` (kraw3 and edges_nr identical apart from timings,
  otherE identical). `paper-check` passes; there is no companion yet, and a trial staging of the folder under a
  placeholder companion name passes `paper-sync --check`. 23 pages (16 before the Palis, Bowen-Walters, Lemma 7
  and option (b) edits of 2026-09-27, which changed no computation; 18 before Lemmas 5 and 8 were proved from cone
  conditions; 21 before the answers to review-1). After review-1 (2026-09-27), `run_all.sh` checks the committed
  h-set configurations and `code/designs.sh` regenerates the three designs and compares them: all three reproduced
  byte for byte. The steps added to `run_all.sh` after its end-to-end run were run separately the same day from this
  folder: `cones` at the four configurations, its two controls and the stage-1 record on [-1e-9, 1e-9] (74 seconds on
  two threads), and the three near-miss horseshoe controls (19, 31 and 44 seconds cumulative); every report is in
  `data/`, and each near-miss report contains the pattern `run_all.sh` requires. `prove` and `horseshoe_check` were
  not rerun: since their reports, their code changed only by a round-to-nearest guard around the parsing of decimal
  constants, which does not change the doubles parsed on this build. On 2026-09-29 the whole of `run_all.sh` was run
  together from the programs as they stand, against CAPD at the pinned commit 03dc562, on two threads (39 minutes,
  exit status 0). Every proof passed and every control failed for its stated reason. The reports match the committed
  files in `data/`, except `E0.txt` and `E0_interval.txt`, which differ only in the order of lines printed by parallel
  threads. The committed files were left as they are. Later the same day the three Arb cross-checks were run again
  (`otherE.py`, `edges_nr.py`, `kraw3.py`, python-flint 0.9.0). Their reports match `data/crosscheck_*.txt` apart
  from the recorded times.
