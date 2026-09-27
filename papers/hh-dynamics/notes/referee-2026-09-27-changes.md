# Referee report, 2026-09-27: the program and manuscript changes of the afternoon (fifth reading)

An in-project reading by a separate AI agent (a headless Claude session started for it), briefed only with a copy of
the revised `paper/hh-dynamics.tex` and `code/`, the previous versions of both and their committed outputs, and trial
outputs of the revised programs (a `--quick --no-ball --reuse-numerics` run of `certify_bistability.py` and partial
trial runs of `code/mutation_study.py`), and told to find errors in every change of the day: the new checks and
controls, the covering check, the checkpoint and `--resume`, the stopping rules, the mutation study, and the revised
parts of the manuscript. It was not allowed to run `certify_bistability.py`, `identify_stable_orbit.py` or
`mutation_study.py`, which were being run separately, and it did not read the paragraphs "Runs" and "What has been
checked", which were not yet revised. It is not an outside review. The report is reproduced verbatim; its line numbers
refer to the files it read.

---

# Report on today's changes to hh-dynamics (manuscript and programs)

This is an in-project reading by a separate AI agent. It is not an outside review.

## VERDICT

I found **no MUST-FIX item**. No change I read makes a stated theorem false or unsupported.

- **The covering check.** `initial_set_covers` does establish "the set integrated contains Z × E_l-ball" at every present call site, because the arithmetic it relies on is exact there. Its claim to be "decided exactly" is not true in general (SF-1).
- **The new negative controls** test what they name.
- **Checkpoint/resume** reuses a piece only when the arguments and the SHA-256 of the five piece files match. However, the manuscript never shows how many pieces were reused, and nothing refuses a committed run that reused them (SF-3).
- **Manuscript.** Several statements are now wrong or overstated:
  - the claim that all three programs "stop at an exception with a line that says so" (SF-2);
  - "Of these five papers …" in the introduction, which the new Labouriau-thesis sentence has made inaccurate (SF-4);
  - the data-availability statement (SF-5);
  - "below the true bound" for the κ = 0.5 control (SF-6).

## MUST-FIX

None.

## SHOULD-FIX

### SF-1. `initial_set_covers` is one-sided under rounding; "decided exactly" is false in general, and the boxes are larger than the printed float half-widths
**Where:** `code/certlib.py:33-60` (docstring: "decided exactly").

**What is wrong:** `comp[i] = S.xbar[i,0] + S.r0[k,0]` is computed in Arb at `ctx.prec`, so it *encloses* the integrated set and may be larger than it. `comp.contains(w)` then does not imply that the integrated set contains `w`.

**Evidence** (`scratch/run/code/t_covers.py`):
- A set with exact centre 1 + 2^-100 and ρ-radius 1e-40, built at 200 bits and checked at 53 bits, is reported as containing the thin point 1. That is false: the set is [1 + 2^-100 ± 1e-40], which does not contain 1.
- At the present call sites the addition is exact, so no false positive can occur:
  - the centres are floats or Arb midpoints;
  - `r0` has midpoint 0 (`arb(0, r)`, or `ball - ball.mid()`);
  - `ctx.prec` is 96 throughout.
- `normal` → True, a slightly larger requested box → False, and a 10.613 ball → True, all as expected.

**Related (pre-existing) point.** `arb(0, r)` and `arb(zb, zr)` round the radius up to a 30-bit `mag`. For example, `zr = 4.612286954863709e-07` becomes the radius 4.6122869568066e-07. So the boxes actually integrated and tested are slightly larger than the float half-widths that `identify_stable_orbit.py` prints "exactly" (proof of Corollary 7, and the Theorem 5(c) proof: "prints the centres and half-widths … exactly"). Uniqueness in the larger box implies uniqueness in the printed one. But "K ⊂ int Z" and "P(Z) ⊂ int Z" are established for the Arb box, not the printed one. The logic of the code is consistent because the same Arb box is used everywhere; only the statement that the box is printed exactly is inaccurate.

**Fix:**
- Decide the containment without rounding: require that `comp[i].rad() == xbar.rad() + r0.rad()` and `comp[i].mid() == xbar.mid() + r0.mid()` hold exactly, or compare endpoints as `fmpq`/`Fraction`. Otherwise return False.
- In the docstring, say that the box is `arb(z) + arb(0, r)` (radius r rounded up).
- Either print `arb(zb, zr).rad()` as the half-width, or say that the box half-width is zr rounded up to Arb's radius format.

### SF-2. The manuscript says all three programs stop "at an exception, with a line that says so"; only the Hopf program does
**Where:** `paper/hh-dynamics.tex:891` (Ball arithmetic): "The three programs print every check and stop at the first failed check, or at an exception, with a line that says so and a nonzero exit status."

**Evidence:**
- Only `certify_equilibria_hopf.py` installs `sys.excepthook` to write a "STOPPED: exception …" line into its report.
- `certify_bistability.py` and `identify_stable_orbit.py` have no such hook. Grepping them for `excepthook|STOPPED` finds only the failed-check path, at lines 104 and 87.
- For example, `certify_orbit` raises `CertificateFailure('Krawczyk test failed')` in stage 4, and it is not caught there. The report `data/certify_bistability.txt` then just ends; the traceback goes only to stderr.

**Fix:** add the same excepthook (log "STOPPED: exception …" to the report, nonzero exit) to both programs, or restrict the sentence to the Hopf program.

### SF-3. `--resume`: reused pieces can enter the proof of Theorem 4 without the manuscript saying so; the stage-4b time is then misleading; the library version is not in the digest
**Where:**
- `code/ball_stable.py:103-170`
- `code/certify_bistability.py:286-291, 311`
- `code/hh_make_numbers.py:234`
- `paper/hh-dynamics.tex` Section 9 (options paragraph and the table of commands)

**Evidence:**
- The report prints only the aggregate count "pieces read back … : n". The per-piece lines do not mark which pieces were reused, and they print each reused piece's old `time`.
- `hh_make_numbers.py` builds `\BiCkpt`, but the .tex never uses it. Nothing refuses a committed report with a nonzero count, or one run with `--reuse-numerics`. The earlier sentence "(the committed run did not use it)" was deleted.
- "stage 4b took \BiTimeFourB s with \BiWorkers worker processes" then understates the real cost.
- `code_digest()` hashes the five .py files but not the python-flint/FLINT version, although Arb is part of "the code that computes a piece". A checkpoint written under another python-flint version would be reused, while the report's trust-base line names the current version.

**What I verified is correct** (mock test `scratch/run/code/t_ckpt.py`, with a fake `prove_piece`):
- The first run appends 6 pieces; a resumed run loads 6. With `prec = 128` it loads 0.
- Apart from tuples, which become lists in `PZ_minus_Z`, the loaded dicts equal the computed ones, and `Fraction` values round-trip.
- Failed pieces that are loaded are still split and recomputed.

**Fix:**
- Have `hh_make_numbers.py` refuse the committed report unless `BiCkpt == 0` and no "debug: numerics loaded" line is present, or print `\BiCkpt` in Section 9.
- Mark reused pieces in their report lines.
- Add `flint.__version__` and `flint.__FLINT_VERSION__` to the digest.

### SF-4. Introduction: "Of these five papers we have read the abstracts of four and only the title of [hs1996]" is no longer accurate
**Where:** `paper/hh-dynamics.tex:371`.

**What is wrong:** the new sentences put the Labouriau thesis [lab1983] between [lab1985, lab1989] and [hs1989, sh1991, hs1996], and say that its Chapter IV was read. The preceding text now cites six works, one of which was read well beyond an abstract. Section 10 ("Other sources") states the reading levels correctly.

**Fix:** "Of [lab1985, lab1989, hs1989, sh1991, hs1996] we have read the abstracts of the first four and only the title of the last", or move the sentence before the thesis sentence.

I checked the thesis content against the scanned copy at WRAP:
- Chapter IV is titled "NERVE IMPULSE EQUATIONS".
- V_L = 10.599 appears.
- Both quotations are verbatim: "Since within physiologically meaningful range f is monotonically increasing (Fig. IV-0-1), it is invertible" and "All the information we have about HH, after reduction, is a numerical estimate of its derivatives".
- The eigenvalues are computed "numerically … using NAG subroutines".

The description in the manuscript is supported.

### SF-5. The data-availability statement asserts a public repository
**Where:** `paper/hh-dynamics.tex:994`.

**What is wrong:** the previous version said that a public release was *planned*. The new one says that the programs "are in the repository https://github.com/ChaseHendrick/hh-dynamics" and that it holds `work/`. I could not verify this: `curl` to both github.com and api.github.com returned 403 through this machine's proxy.

**Fix:** confirm that the repository is public and that its contents match `code/` and `data/` before stating it; otherwise restore "planned".

### SF-6. The κ = 0.5 control: "(below the true bound)" is not established by the check
**Where:**
- `paper/hh-dynamics.tex:895` (Checks): "with the bound 1 replaced by 0.5 (below the true bound)"
- `code/certify_bistability.py:395-400`

**What is wrong:** the control refuses because the *upper* bound `nrmb` = 0.5439 ≥ 0.5. That shows the comparison with `kappa_max` is part of `ok`. It does not show that the true sup‖DP‖ exceeds 0.5.

**Fix:** also require and print `rk['norm_lo'] > 1/2` (the rigorous lower bound is already computed), or drop the parenthesis.

## MINOR

- **M-1.** The Theorem 4 proof (`tex:872`) says stage 4b "also checks that both runs integrated sets that contain Z × E". In the report, though, the check that carries this is named "every piece: P_E(Z) in int Z and sup ||DP_E||_inf < 1", and the per-piece lines do not print `covers`. It is folded into `r['ok']` at `ball_stable.py:77`. Name `covers` in that check and print it per piece, so that the report shows the step the proof cites. (`identify_stable_orbit.py` does name it.)
- **M-2.** `mutation_study.py:127` can select a "STOPPED: exception …" line as the detail of an `exception` result. This happens when the program is the Hopf one and the traceback's last line contains neither "Error" nor "Exception" (for example `certlib.CertificateFailure: …`). `hh_make_numbers.py:461` then aborts with "the mutation study did not complete", even though it did complete. This fails safe. Use a dedicated sentinel for the baseline stop instead of the substring `STOPPED`.
- **M-3.** "which Section 10 lists with their dates" (`tex:382`): only the arXiv and PubMed searches carry a date. The others are covered only by the range 2026-09-25 to 2026-09-27. Say "with the range of their dates", or add the dates.
- **M-4.** `mutation_study.py` runs baselines only for programs that some selected mutation uses (`progs` from `muts`). This is correct for the committed run. However, a `--only` subset records "Every mutation not marked weak was stopped: True" for that subset, and `hh_make_numbers.py` does not check that the count equals `len(MUTATIONS)`. Check `MutTotal` against the full list.
- **M-5.** The finite-difference cross-check (`certify_equilibria_hopf.py:486-517`) uses the leak term `0.3*u`, without E_l. That is legitimate, because neither ∂λ/∂u nor dJss/du depends on E_l. Note it in the docstring, so that a reader does not take the omission for a slip.

## Parts I checked and found correct

- **Hopf program stopping rule.** `stop()` writes the report and exits 1. The exception hook writes "STOPPED: exception …". The dead `if FAILED` at the end is harmless. Output is unchanged: my rerun matches `data/certify_equilibria_hopf.txt` apart from the run time.
- **Transversality cross-check.** The SymPy model matches the HH rates, with α_m, β_m, α_n, β_n, α_h, β_h and the current in the u-convention. The step h = 1e-12 at 50 digits gives a truncation error of about 1e-24 or less. The observed relative differences are 6e-27 and 3e-27 (H1) and 3e-27 and 6e-28 (H2), well below the 1e-10 threshold. `mp.dps = 50` was already set by `mpmath_l1`, so it changes no later output.
- **`certify_equilibrium` last piece.** Ending the last piece at `wh` exactly closes a possible float gap between the 64 monotonicity pieces and the exclusion interval `(wh, 115)`. Consecutive pieces share endpoints through the same expression. This is a real fix, not a change of result.
- **The `S0` return in `hh_lohner.poincare`.** The object is the checked initial set, and I found no in-place mutation of `LSet` fields anywhere in `code/`.
- **`covers` in `certify_orbit`.**
  - The C⁰ run is checked against `{zbar} × params` and the C¹ run against the final `zrad`, which is the same `zrad` passed to `krawczyk`, because the loop breaks before `zrad *= 4`.
  - At the call sites, `ok` requires `covers`. Mutations B6 and B7 are caught by it (trial run: B6 caught at the covering check).
- **New controls in stage 5.**
  - *Widened DP.* The control requires the Newton point to be in int Z and K to be out of Z, so it passes only if the term (I − C(DP − I))X matters. Mutation B4 (K reduced to the Newton step) makes it fail.
  - *Covering control.* It refuses the 1e-3 box and the midpoint of E_l, and accepts Z × piece (trial: False, False, True).
  - *κ = 0.5 control.* It requires `inside` and `covers`, so it cannot pass because of an unrelated failure. Mutation B13 is caught by it.
  - *Box factor 0.3 control.* It now also requires `not ok`.
- **Shrunk-box control** (`identify_stable_orbit.py`). In the previous output the centre of K lies 0.12 to 0.18 radii from the box centre, so K ⊄ 0.1·Z. Mutation I1 (5× radii) tests K against 0.5·Z, which contains K, so I1 will be caught. "Not loose by a factor of ten" is correct.
- **Mutation study.** All 17 source texts occur exactly once in their files (checked by script). The replacements do what their descriptions say (H2 is dp/dλ; H3 is the Bernoulli truncation plus the tail term; H5 is D3; H6 is the normalization of w; B3/B3b are the projection; B6 is `r0` of the parameter; B7 is the C¹ run box; B13 is `ok`; S1 is `check_on_section`; I1 is `k_in_box`). The classification is: returncode 0 → passed; a FAIL line → caught; otherwise → exception; `TimeoutExpired` → timeout. This is correct for the stopping rules of all three programs.
- **Half-widths in Theorem 5(c) and its proof,** against `previous/certify_bistability.txt`:

  | Orbit | E_l | Half-widths |
  |---|---|---|
  | Stable | 10.613 | [1.00, 1.00, 1.21]e-15 → "at most about" max, correct |
  | Unstable | 10.613 | 2.03e-15 … 2.13e-14 |
  | Unstable | E_l* | 1.00e-15 … 1.08e-14 |
  | Unstable | 10.599 | 1.94e-15 … 2.13e-14 |

  The old "10^-14 to 2·10^-14" was wrong, and the new min/max macros (`UboxRadMin`) fix it.
- **Theorem 4.** "At most about \PieceBoxRad" matches the per-piece `max(zr)` of 4.6e-07.
- **Common end of two pieces.** 10.613 = 10.59 + 46·0.0005 and 10.599 = 10.59 + 18·0.0005 are piece ends. Corollary 7 checks K in both adjacent boxes, so "the two fixed points are the same point" there is supported, and taking the left piece elsewhere is a valid definition.
- **Novelty paragraph** (`tex:382`). It no longer claims novelty for the uniqueness of the equilibrium, and it limits the first sentence by the unread remainder of Du and Hassard. The Du and Hassard quotations are presented as first-page text. I did not check them against the paper, which is not accessible here.

## What I checked, and how

| Command (all prefixed `nice -n 19 timeout …`) | Result |
|---|---|
| `diff -u previous/code/X code/X` for every file, and the diff of the .tex | read in full (`scratch/diff_*.txt`) |
| `python3 certify_equilibria_hopf.py` on a copy (`scratch/run/code`) | exit 0, 40 checks, 0 failed; report identical to `data/certify_equilibria_hopf.txt` except "run time 11.2 s" (committed 7.4 s) |
| `python3 t_covers.py` (my test of `section_set` and `initial_set_covers`) | normal True; enlarged request False; `arb(0, r)` radius > r (e.g. 1e-7 → 1.0000000005839e-7); inexact-precision case returns **True for a set not containing the point** (SF-1) |
| `python3 t_ckpt.py` (`prove_ball` with a fake `prove_piece`, 6 pieces, 2 workers) | loaded 0 / 6 / 0 (different prec); round trip equal apart from tuple→list |
| script counting each mutation's old text in the current code | all 17 occur exactly once |
| `curl` github.com/ChaseHendrick/hh-dynamics | 403 from the proxy, not verified |
| downloaded the Labouriau thesis PDF from WRAP and ran `pdftotext` | chapter title, V_L = 10.599 and both quotations verified |
| read `trial-runs/*` | new controls pass with the values quoted above; the mutation trials match their expectations |

## What I did not check

- I did not run `certify_bistability.py`, `identify_stable_orbit.py` or `mutation_study.py` (forbidden by the brief), so stage 4b with the covering check, the resume path on real pieces, and the mutations B1, B3, B4, B7, B13, S1 and I1 are unverified.
- Generated numbers and check counts, which are stale by design.
- The paragraphs "Runs" and "What has been checked", which are not yet revised.
- The page numbers of HH 1952: the PMC PDF could not be fetched (it returned HTML).
- The Du and Hassard first page and the zbMATH review, the Rump and Scholarpedia reading claims, and the search log in Section 10 (the ledger is off-limits).
- Whether the GitHub repository is public.

---

## Response (the manuscript's writer, 2026-09-27)

No must-fix finding. Every should-fix and minor finding is applied. Since several of them change the programs, the full
run of `certify_bistability.py` that was in progress (in stage 4) was stopped, and the committed outputs of
`certify_bistability.py`, `identify_stable_orbit.py` and `mutation_study.py` are runs of the programs after these
fixes.

### Should-fix

- **SF-1. Fixed.** `initial_set_covers` (`code/certlib.py`) now decides the containment in exact rational arithmetic:
  it requires an exact centre (radius 0) and forms the end points of the integrated set and of the requested balls as
  mid - rad and mid + rad from the exact midpoints and radii of the Arb balls, with no rounding. Tested on the
  reader's cases: Z x piece accepted; a request larger by a factor 1 + 1e-7, a set 1000 times smaller than Z and a set
  with E_l at the midpoint refused; the thin sets at 10.613 and 10.599 accepted. `code/identify_stable_orbit.py` now
  also prints the half-widths of the Arb boxes exactly (the floating-point radii rounded up to Arb's radius format,
  as float64 hex, checked to be exact), and the proofs of Theorem 5(c) and Corollary 7 say which half-widths are
  printed.
- **SF-2. Fixed.** `certify_bistability.py` and `identify_stable_orbit.py` install the same exception hook as
  `certify_equilibria_hopf.py`: an exception writes "STOPPED: exception ..." into the report and exits with a nonzero
  status. The sentence of Section 7 is now true of all three programs.
- **SF-3. Fixed.** A piece read from the checkpoint is marked "(read from the checkpoint)" in its report line; the
  digest of a piece's code includes the versions of python-flint and FLINT; and `code/hh_make_numbers.py` refuses a
  report with any piece read from a checkpoint or with candidates reloaded by `--reuse-numerics`, so the committed run
  is one run that computed everything. Section 9 states the number of pieces read from a checkpoint (0).
- **SF-4. Fixed.** "Of [lab1985, lab1989, hs1989, sh1991] we have read the abstracts, and of [hs1996] only the title."
- **SF-5. Fixed in the wording.** The statement now says that the programs are in the companion repository of the paper,
  whose release 1.0.0 holds this version, as the other released papers of the project word it; the repository is
  written by the publishing workflow when the paper's status is "ready", so it could not be seen yet.
- **SF-6. Fixed.** The control now also requires the rigorous lower bound: every member of the enclosure of DP has
  ||DP||_inf at least the printed lower bound, which must exceed 0.5, and it prints both bounds; Section 7 quotes the
  lower bound (generated macro `\CtlKappaLo`).

### Minor

- **M-1. Fixed.** Each stage-4b line prints "runs cover Z x piece True", and the stage-4b check is named "every piece:
  P_E(Z) in int Z, both runs integrated a set containing Z x piece, and sup ||DP_E||_inf < 1"; the proofs of Theorem 4
  and Corollary 7 quote it. `identify_stable_orbit.py` and `hh_make_numbers.py` read the new line format.
- **M-2. Fixed.** The mutation study writes "STUDY STOPPED" when a baseline fails, and `hh_make_numbers.py` looks for
  that, not for "STOPPED".
- **M-3. Fixed.** "with the dates, or the range of dates, on which they were made".
- **M-4. Fixed.** The study writes "Full list of mutations: True" only for a run of the whole list with baselines, and
  `hh_make_numbers.py` requires it.
- **M-5. Fixed.** The docstring of `mpmath_transversality` says why E_l and J do not appear.
