# Quality record: Traveling Pulses in a Neural Field with a Smooth Firing Rate: Computer-Assisted Existence and Spectral Stability

The bar every paper in this repository meets before it is published or preprinted; see
`papers/minimal-winding/notes/QUALITY.md` for the full wording of the seven items. `node tools/paper-check.js` refuses
the status "ready" or later in `papers/papers.json` until every item below is checked with its evidence. This file
stays in GENChase.

## Record (2026-09-26; updated 2026-09-27 with the manuscript and after its readings)

- [x] **1. Complete proofs.** Evidence: the manuscript `paper/nf-pulse.tex` (39 pages) writes out the proofs of
  Theorems 1 to 6 and of the corollary: the reduction to the wave ODE and the invariant surface Y = S(U) (Section 2),
  the rest state for every c and every eps (Lemmas 2.4 and 2.5), the validated unstable manifold, the local unstable
  manifold and the branch (Lemmas 4.1 to 4.3), the block lemma and its form for the wave equation, and the
  Wazewski-type shooting argument (Sections 4.1 to 4.4, drafted first in `review/lead/math/MATH.md`), the
  covering-relation argument of Theorem 2 (Section 4.7), the embedding and the unstable manifold of Faye's model with
  its tail bound (Lemma 4.7), and the essential spectrum, the exclusion of large eigenvalues, the Evans function, the
  class P, the winding number, the simple zero and the multiplicity argument (Section 5, whose algebraic identities
  are written out, with SymPy only as a cross-check), with the complex Krawczyk test proved in Section 6. Published
  results are used as stated in sources read, with their hypotheses checked in the text (item 4): Teschl's Theorems
  9.4, 9.5, 6.1 and 2.17 and Dyatlov and Zworski's Theorems C.5 and C.9 (Coddington and Levinson and Reed and Simon,
  which had not been read, are no longer cited). The proofs written or changed on 2026-09-27 after the three readings
  of that day (Lemma 4.7 with Z_F and the induction, the local unstable manifold step of Lemma 4.3, Lemma 5.8, the
  quantifiers) and those written later that day (Proposition 5.1's Fredholm step, the Krawczyk test, the Teschl
  citations) had a fourth reading, by a separate agent session briefed only with the paper, its programs and excerpts
  of the two books (`notes/referee-2026-09-27-new-proofs.md`): no must-fix; its four should-fix findings (the
  parametrized curve is the local unstable manifold in Lemma 4.3; z_1 bounded in Lemma 5.8; the argument for xi >= 120
  in Lemma 5.5(b); a citation phrase) and one minor finding are fixed. The passages so written had a fifth, narrow
  reading (`notes/referee-2026-09-27-new-proofs-narrow.md`): no error, and the three clauses it asked for (one
  neighbourhood for Teschl's two theorems, J inside the domain of h, the range of the parametrization bound) are
  added. Every theorem, proposition, lemma and corollary is proved in full in the manuscript.
- [x] **2. Rigorous computation.** Evidence: every computer step of a proof is ball arithmetic (FLINT/Arb through
  python-flint), interval arithmetic (`mpmath.iv`, the second check of the blocks) or exact rational arithmetic (the
  coverage of Theorem 2 in `ext/eps-range/table.py`, the SHA-256 comparisons): rest state, unstable manifold, block, a
  C^0-Lohner interval Taylor integrator, the covering chain of Theorem 2, the Evans function enclosures, the complex
  Krawczyk test (Lemma 6.1, proved); floating point only chooses what a rigorous check then takes as given (Section 6).
  Every program is committed and stops with a nonzero status when a check fails: the base programs through explicit
  checks, the programs of `ext/` through explicit checks and `assert` statements, which since 2026-09-27 cannot be
  switched off, because every program refuses to run under `python -O` or `PYTHONOPTIMIZE` (a test at the import of
  `code/nfcore.py`, its copy in `ext/gain-12/code/`, `ext/faye-model/code/fcore.py` and `ext/stability/_paths.py`, and
  at the start of the two mpmath re-checks, `ext/eps-range/table.py` and `run_range.py`; each program that contains an
  `assert` was started with `-O` from a copy and stopped at once); every check script also refuses `PYTHONOPTIMIZE` and
  clears every `NF_*` variable (all eight scripts started with `PYTHONOPTIMIZE=1` stopped at once, and the scripts
  reproduced their outputs with twelve `NF_*` variables planted, see Reruns). Every chain has negative controls
  (Tables 1 and 4 of the manuscript; the in-run negative checks of every certificate of Theorem 2; the controls W1,
  W2 and Z3, reviewed in `notes/referee-2026-09-27-stability-controls.md`). What rests on reading the code rather
  than on a test is stated in the manuscript, with the reason (Section 6, Tests and negative controls and Trust base):
  the components of the integrator that no automatic check exercises (the code audit `review/lead/code/CODE.md`, its
  mutation study and finding F4), the programs of the stability proof, which have had no mutation study, the range of
  lambda that the stability controls reach (|lambda| <= 0.32), the coupling of Z3 to the line that reports Z2, and the
  negative controls that an early test refuses (check 2 of Table 1 at s0 < 1, L2 at bound (a)).
- [x] **3. Every claim labelled.** Evidence: in `paper/nf-pulse.tex` every theorem, corollary, proposition and lemma
  carries a label (proved, or computer-assisted with its programs named), including the root count for every eps
  (Lemma 2.5) and the block lemma for the wave equation (Lemma 4.5), which were unlabelled paragraphs until the
  readings of 2026-09-27; the proofs labelled "proved" contain no computation (Lemma 5.8 and the identities before
  Lemma 5.3 are written out; SymPy is named only as a cross-check and is not in the trust base); numerical statements
  are labelled where they appear and collected in Section 7 (the saddle-focus of Theorem 3(b) is labelled numerical
  in the Discussion; the Fourier-spectral computation whose program is not in the folder is no longer cited); printed
  bounds are rounded outward from the certificates (checked against the JSON files on 2026-09-27, including the
  Theorem 2 tables, which `ext/eps-range/table.py` prints rounded outward). The README's "Status of the results" uses
  the same labels.
- [x] **4. Sources read.** Evidence: the published results that a proof step uses are read in the sources the
  manuscript now cites for them (RESEARCH.md, entry of 2026-09-27 "the sources of the manuscript's proof steps"):
  Teschl, Ordinary Differential Equations and Dynamical Systems (2012), the author's posted version: Theorems 9.3 to
  9.5 with their proofs (the local unstable manifold, Lemma 4.3), Theorem 6.1 with its proof (continuity of the flow,
  proof of Theorem 1) and Theorem 2.17 with its proof (global existence, Lemma 2.6 and Section 4.8); Dyatlov and
  Zworski, Mathematical Theory of Scattering Resonances, the authors' posted version: Appendix C.1 to C.3 with the
  proofs of Theorems C.4, C.5, C.8 and C.9 (the Fredholm and meromorphy step of Proposition 5.1); the complex Krawczyk
  test is proved in Section 6, after Rump, Acta Numer. 19 (2010), Theorem 13.3, read. Coddington and Levinson and Reed
  and Simon, which the project had not read, are no longer cited. Faye (2013), whose traveling-wave system Section 4.8
  uses and rederives, and Pinto and Ermentrout (2001), whose model and figures the theorems take, were read in full
  (entries of 2026-09-26). Every background citation is recorded in the same entry with how far it was read, from
  read in full to not read (bibliographic data checked against Crossref); Enculescu (2004) is known from its title and citing
  contexts and Sandstede (2007) from its abstract (closed access), and the manuscript states this as a plain fact, as a
  scope of its "Earlier work" paragraph and in its Sources paragraph (since 2026-10-01, by the owner's rule against
  apologizing for sources that cannot be retrieved). Zhang,
  J. Differential Equations 197 (2004), downloaded by the owner, was read in the parts listed there (Heaviside rate
  throughout; pulses only for sufficiently small eps, with proofs deferred). No proof step depends on a source that
  was not read.
- [x] **5. Prior article review.** Evidence: the searches are logged in RESEARCH.md (entries of 2026-09-26, two, and
  2026-09-27, three, the last with Ermentrout, Jalics and Rubin (2010) read in the parts listed: their pulses are
  formal and assume an unstimulated pulse, "not fully rigorous", p. 3049), with `review/lead/priorart/PRIORART.md` and
  `review/PRIOR-ART.md`. Enculescu (2004) and Sandstede (2007) are closed access, with no legal open copy found on
  2026-09-27, so the manuscript no longer makes a statement of priority: its paragraph "Earlier work"
  (Section 1) says what the works read contain (no proof found of a pulse of this field for a given smooth rate at an
  explicit recovery rate that is not assumed small, and no computer-assisted proof of a pulse in a neural field), claims
  no "first", names the two works known from titles, citing contexts and an abstract and says that nothing more is stated about
  their contents, and names the works
  known only from first pages or abstracts; the Sources paragraph (Section 9) and the README say the same. No
  statement of the manuscript or the README goes beyond what the searches reached.
- [x] **6. Adversarial second reading.** Evidence: all readings below were in-project readings by independent AI agent
  sessions, each instructed to find errors; none is an outside review. For Theorem 1, `review/lead/VERIFY.md`
  (2026-09-26: mathematics, code audit with 32 mutations, an independent reimplementation with its own block and
  shooting argument, prior articles) and a concurrent second review (`review/`); for Theorems 2 to 6, one adversarial
  check each (the `REPORT.md` of each folder under `ext/`); for the first manuscript draft (2026-09-27), three checks
  (completeness, claims, literature), whose confirmed findings were applied. For the revised manuscript (33 pages),
  three readings on 2026-09-27 with one lens each: the analysis (every written proof read line by line), the
  computation (the check scripts of Theorems 1 to 4 and the stability steps rerun from a copy, numbers traced to the
  outputs) and the claims and literature (quotations and references checked in the reachable sources). Every finding
  was examined by two further agent sessions; 19 findings were confirmed, 6 of them must-fix (the misstated unstable
  manifold theorem in Lemma 4.3, found twice; the description of the gain-12 programs; the overstated SHA-256 refusal
  of `winding.py combine`; Hastings's "one orbit"; the wrong Zhang paper in Faye's list). Every must-fix finding is
  fixed and recorded. Every confirmed should-fix finding is fixed; where the fix took another route or is partial, the
  responses say so: the SHA-256 statements were corrected in the text instead of widening the fingerprint of the
  winding pieces; the negative control of the Cauchy integral (Z3) is computed from the same enclosures; some symbols
  keep two meanings (omega, K, T_0); the assertions of the extension programs remain, kept active since 2026-09-27 by
  every program itself (item 2). The
  reports are saved verbatim with a response to each finding, fixed or not fixed and why, in
  `notes/referee-2026-09-27-analysis.md`, `notes/referee-2026-09-27-computation.md` and
  `notes/referee-2026-09-27-claims-literature.md`. The passages written in response, and those written later on
  2026-09-27, had a fourth and a fifth reading of their own, both by separate headless agent sessions briefed only
  with the paper, its programs and the excerpts of the two cited books (item 1:
  `notes/referee-2026-09-27-new-proofs.md`, no must-fix, four should-fix and one minor finding fixed;
  `notes/referee-2026-09-27-new-proofs-narrow.md`, no error, three clauses added), and the controls W1, W2 and Z3 a
  review of their own (`notes/referee-2026-09-27-stability-controls.md`): one must-fix finding (the table said the
  control pieces run on one core, the script passes four workers) and three should-fix findings, all fixed in the text
  of the manuscript, as the response says; the programs were not changed. Every report is saved verbatim with a
  response to each finding.
- [x] **7. Reproducible.** Evidence: `code/run_all.sh` (20 checks), `ext/slow-pulse/code/run_all.sh` (26),
  `ext/gain-12/code/run_all.sh` (23), `ext/eps-range/run_checks.sh` (8), `ext/faye-model/code/run_all.sh` (14 at each
  eps) and `ext/stability/run_all.sh quick` (15) rerun the proofs with their negative controls and exit with status 1
  if a check fails; Section 8 of the manuscript lists them with their times, and `code/requirements.txt` pins the
  versions. On 2026-09-27 every one of these scripts was rerun twice from a copy (at commit 395bba3, and at commit
  3d1649e with the present programs, see Reruns), with twelve `NF_*` variables planted, and reproduced its committed
  output; two of them were also run from the companion as `paper-sync --stage` writes it (without `notes/`), with
  the same result. Of the computations the scripts do not repeat: the winding pieces `left_down` (the side closest to
  the zero lambda = 0) and `top` (where |lambda| is largest) were recomputed and are identical to the stored pieces
  apart from their times; the other four pieces are made by `evans_rig.py` and `winding.py`, whose SHA-256 digests they record and which are unchanged, with base
  modules that have changed only in comments and by the refusal of `python -O`. Nineteen of the 387 accepted
  certificates of Theorem 2 (at least one in each bin of Table 2, the one containing eps = 1/10, three made with the
  earlier `chain.py`, the two further certificates and the four probes) were recomputed with the present programs:
  all passed with the same stages, entry times, refused negative checks and setup (rest state, manifold, block);
  three are identical, and sixteen differ only in the numerically chosen data of the stages, because the sweep computed
  its numerical pulse data from unrounded interval ends that were not recorded. The argument for the remaining certificates, whose programs are byte-identical or differ only in
  changes that alter no computed value, is in `review/RERUNS.md`. `node tools/paper-sync.js --check nf-pulse` and
  `node tools/paper-check.js` pass; the check counts (20, 26, 23, 8, 14, 15) stated in the manuscript, the README and
  `RELEASES.md`, and its page count (39), are current.

## Reruns

- 2026-09-27, from a copy of this folder at commit 0267f31 (`git archive`), with the parallel steps of
  `code/run_all.sh`, `ext/stability/thin_runs.sh` and `ext/stability/run_all.sh` run one after another in one process
  (the machine was shared; the edited copies differ only in `&`/`wait` and the worker counts of `simple_zero.py` and
  `spectrum_num.py`), `nice -n 19`, python-flint 0.9.0, mpmath 1.3.0, numpy 2.4.6, sympy 1.14.0, scipy 1.17.1:
  - `sh code/run_all.sh`: all 20 checks passed in 6 min 16 s; the summary is identical to `data/run_all.txt`, and the
    certificates in `data/` are identical except for their `time_s` fields.
  - `sh ext/stability/run_all.sh quick`: all 12 checks passed (about 20 min for them, most of it `simple_zero.py`,
    then 17 min of numerical scripts; 36 min 51 s in all); the output is committed as
    `ext/stability/data/run_all.txt`, and the certificates it rewrote (`ess_spectrum.json`, `large_lambda.json`,
    `pulse_enclosure.json`, `simple_zero.json`, `winding.json` and the two thin-run certificates) are identical to the
    stored ones except for their `time_s` fields; the pulse records were reproduced exactly (check P3).
  - Since then `code/certify_rest.py` changed only in comments (the `NF_PULSE=slow` branch is labelled as the
    wave-train switch, not the slow pulse); rerun from a copy, it prints checks 1 and 2 as before and writes an
    identical `data/rest_certificate.json`.
- 2026-09-27, `ext/eps-range/table.py` (changed to print bounds rounded outward, to count the certificates inside
  the range, and to read `data/probes/` with `--certs`): `data/table_summary.txt`, `data/speed_table.md`,
  `data/probe_table.md` and `data/probe_summary.txt` regenerated; the two new coverage checks of `run_checks.sh` pass
  when run alone. The full `run_checks.sh` (which runs four chain proofs at once) was not rerun.
- 2026-09-27, after the fixes for the three readings, from a copy of this folder at the checkpoint commit 395bba3
  (`git archive`; no program changed after that commit), one process at a time with the parallel steps run one after
  another (edited copies that differ only in `&`/`wait` and worker counts), `nice -n 19`, on the shared four-core
  machine, with twelve `NF_*` variables set in the environment (`NF_PULSE=slow`, `NF_DU=0.15`, `NF_R_OVER_RHO=0.5`,
  `NF_PREC=64`, `NF_TOL=1e-5`, `NF_ORDER=4`, `NF_TAG=_planted`, `NF_BETA=20`, `NF_EPS=1/10`, `NF_EVANS_PREC=64`,
  `NF_STAB_PREC=64`, `NF_STAB_OUT=planted`), which every script clears:
  - `sh code/run_all.sh`: 20 checks passed in 6 min 6 s; summary identical to `data/run_all.txt`, the 8 certificates
    it writes identical apart from `time_s`.
  - `sh ext/slow-pulse/code/run_all.sh`: 26 checks passed in 74 s; summary identical to `data/run_all.txt` (which
    carries the corrected label of the negative control), 22 certificates identical apart from timing.
  - `sh ext/gain-12/code/run_all.sh`: 23 checks passed in 3 min 9 s; summary and 9 certificates identical (so the
    planted `NF_BETA=20` and `NF_EPS=1/10` did not reach the run).
  - `sh ext/eps-range/run_checks.sh`: 8 checks passed in 2 min 9 s, including the coverage of [0.08, 0.13693] by 381
    stored certificates and the acceptance of the four probes; `table.py` with the committed arguments reproduces
    `data/table_summary.txt` and `data/probe_summary.txt` byte for byte, and the rerun's speed table equals
    `data/speed_table.md`.
  - `sh ext/stability/run_all.sh quick`: all 15 checks passed (26 min for them, then 20 min of numerical scripts);
    the output, with the new checks Z3, W1 and W2, is now `ext/stability/data/run_all.txt`; every certificate it
    rewrote, the recomputed pulse records (P3) and `spectrum_num.json` are identical to the stored ones apart from
    timing fields.
  - `python3 ext/stability/winding_controls.py run 1` (without planted variables, since it is not a script): the four
    pieces of W1 and W2 recomputed in 17 min; each is identical to the stored piece apart from `time_s`, and each
    segment file is identical byte for byte.
  - `sh ext/faye-model/code/run_all.sh` at eps = 1/20, 1/50 and 1/100: 14 checks passed at each, in 4 min 26 s,
    11 min 34 s and 48 min 35 s; each summary is identical to `data/run_all_eps1_*.txt`, and the 7 certificates of
    each eps are identical apart from timing.
  - Each of the eight scripts started with `PYTHONOPTIMIZE=1` printed "FAIL  PYTHONOPTIMIZE is set" and exited with
    status 1 before running anything; the prelude of `ext/eps-range/probe_limits.sh`, run alone, cleared five planted
    `NF_*` variables.
- 2026-09-27, later (full record in `review/RERUNS.md`), on the shared machine under `nice -n 19` with at most two
  processes, python-flint 0.9.0, mpmath 1.3.0, numpy 2.4.6, sympy 1.14.0, scipy 1.17.1:
  - From a copy at commit 3d1649e (the present programs: since 395bba3 they changed only by the refusal of
    `python -O` at import, the prelude of `run_range.py`, and docstrings), with the same twelve `NF_*` variables
    planted and the parallel steps run one after another: `code/run_all.sh` 20 checks passed in 400 s, summary
    identical to `data/run_all.txt` byte for byte, 8 certificates identical apart from `time_s`; `ext/slow-pulse` 26
    in 55 s, summary and 22 certificates identical; `ext/gain-12` 23 in 156 s, summary and 9 certificates identical;
    `ext/eps-range/run_checks.sh` 8 in 129 s, and `table.py` with the committed arguments reproduces
    `data/table_summary.txt` and `data/probe_summary.txt` byte for byte; `ext/faye-model` at 1/20 14 in 263 s and at
    1/50 14 in 698 s, summaries and 7 certificates each identical; and at 1/100 14 in 2106 s, summary and 7 certificates identical; `ext/stability/run_all.sh quick` 15
    passed (in 2364 s with one worker for `simple_zero.py`), the check lines identical to `data/run_all.txt`, the 7 certificates it rewrote identical,
    the pulse records reproduced exactly (P3).
  - The winding piece `left_down` recomputed with `winding.py left_down 2` from a copy at commit bc90c99 (programs
    that differ from the present ones only by the refusal of `-O` and docstrings): 7163 s; `winding_left_down.json`
    identical apart from `time_s`, the segment file identical byte for byte. The piece `top` recomputed with
    `winding.py top 1` from a copy at commit 3d1649e (the present programs): 7781 s; `winding_top.json` identical
    apart from `time_s`, the segment file identical byte for byte.
  - Nineteen accepted certificates of Theorem 2 recomputed with the present programs (commit 3d1649e): all PASS, same
    stage counts, block entry times, refused in-run negative checks and setup; three (the probes at 0.07 and 0.15 and
    `eps_0.092897_0.092954`) identical apart from times and program digests; the other sixteen differ in the
    numerically chosen data of the stages only (Section 3 of `review/RERUNS.md` lists them and says why).
  - From the companion staged by `node tools/paper-sync.js --stage nf-pulse` (no `notes/`), with five `NF_*`
    variables planted: `code/run_all.sh` 20 checks passed in 351 s and `ext/slow-pulse` 26 in 58 s,
    summaries and all 30 certificates identical apart from timing.

