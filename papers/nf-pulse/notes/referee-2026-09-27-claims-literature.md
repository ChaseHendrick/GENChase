# Referee report: "Traveling Pulses in a Neural Field with a Smooth Firing Rate: Computer-Assisted Existence and Spectral Stability" (papers/nf-pulse/paper/nf-pulse.tex, 33 pp.)

**Status of this report.** This is an in-project reading by an independent agent on 2026-09-27. It is not an outside review. By instruction I did not read `papers/nf-pulse/review/` or `papers/nf-pulse/notes/`. I edited no repository files; all reruns were done in scratch copies.

**Object refereed.** The working-tree state of the worktree `/home/user/GENChase/.claude/worktrees/nf-manuscript` (branch nf-manuscript, HEAD 0267f31 plus uncommitted edits). The stored `nf-pulse.pdf` is current: a fresh 3-pass pdflatex build in scratch gives the same text, 33 pages, and no warnings. It is no longer the 27 pages mentioned in the task.

## Verdict: minor revision

The mathematics holds up. I checked every written proof in Sections 2 to 5 line by line and re-derived the algebra symbolically: the characteristic polynomial, the eigenvectors, the resolvent formulas, the Faye-model polynomial and the Evans eigenvectors. I found no error that invalidates a theorem.

The rigorous base chain of Theorem 1 reproduces bit for bit, apart from timing fields. The quick stability checks reproduce. Every number I traced from the text to the data files matches, including the rounding direction. All 32 DOIs resolve to matching metadata. All quotations I could reach are verbatim with the right pages. No text claims an outside review.

The priority paragraph follows the prior-article findings: it keeps "given"/"explicit", puts PJW 2005 and BOP 2025 beside the claim, names Enculescu and Sandstede as unread, and does not claim nonlinear stability.

There are three must-fix items, all small:
1. A misstatement of Hastings's result, in the abstract, the introduction and the priority paragraph.
2. A wrong citation of Faye's p. 2 grouping of Heaviside studies.
3. One false sentence inside the proof of Lemma 3.3 (Lemma `lem:branch`).

## Summary of the claims and what supports them

- **Theorems 1–5 (existence).** These are Wazewski-type shooting arguments. They start from a parametrized unstable manifold with a validated tail, use a Lohner integrator in Arb, and close at a cone block (Lemma 3.4, Proposition 3.5) or through a chain of covering relations (Theorem 2).
  - Lemma 3.4's convexity reductions and parts (a)–(d) are correct. So are the openness, disjointness and exit argument of Proposition 3.5.
  - The covering-relation nesting in Section 3.6 is correct.
  - The Faye-model reduction and its polynomial are correct; a SymPy check gives a difference of 0.
- **Theorem 6 (spectral stability).** Four pieces, all correct as written:
  - Essential spectrum by a Fourier multiplier plus a Hilbert–Schmidt perturbation, with the analytic Fredholm theorem (Reed–Simon Theorem VI.14).
  - Birman–Schwinger exclusion of large eigenvalues. I checked M1 = 0.19725, the product 5·M1 = 0.98624, and the (c) bound 0.9104.
  - The Evans function construction: Lemma 5.3 and the Volterra/Gronwall tails. The adjoint sign and the index pattern K_{1i}·|w̃_4| check out.
  - The winding number (its sums check out: [0.833108, 1.166838]), and Lemma 5.7 via the adjoint pairing.

## Must-fix

1. **Hastings is misstated.** See lines 53 (abstract), 76 and 92. The paper says Hastings "reduces existence to properties of one orbit" and "rests on properties of one orbit". Hastings's Remark 2 (arXiv:1503.04057v2, p. 6) reads: "the hypotheses of Theorem 2 can be verified by checking one solution of (2.2) at c = c1 and one solution of (2.1), with the given ε and c = c1". That is two solutions: one of the fast system and one of the full system. Fix all three places.

2. **Wrong citation of Faye's grouping.** Line 769: "Faye groups \cite{zhang2005,zhang2007,pjw2005,sandstede2007} among the Heaviside studies [p. 2]". Faye's author copy, p. 2, cites [9, 25, 33, 35, 42–44]. Its reference [44] is L. Zhang, SIAM J. Appl. Dyn. Syst. 6 (2007) 597–644 ("How do synaptic coupling and spatial temporal delay influence traveling waves…", doi:10.1137/06066789x). It is not Math. Z. 255, which is this paper's `zhang2007` and which Faye does not cite there. [42] is Zhang JDE 2004 (`zhang2004`), [43] is JDDE 2005.
   - Fix: cite zhang2004 and zhang2005 (and the SIADS 2007 paper if wanted) instead of zhang2007.
   - Record SIADS 2007 in the prior-article file. Its Crossref abstract describes a delayed nonlocal scalar model, so it does not affect priority.

3. **One false sentence in the proof of Lemma 3.3.** Line 362: "the points whose backward orbit tends to the hyperbolic equilibrium x* form, near x*, a C^1 curve". This is false exactly when a homoclinic orbit exists: points of the returning pulse near x* also have backward orbits tending to x*. Say "whose backward orbit stays in a small neighbourhood U of x* (and hence tends to x*)", which is the local unstable manifold. Then note that a solution tending to x* as ξ → −∞ lies in U for ξ ≤ ξ0. The conclusion is unaffected.

## Should-fix

4. **"ε not small" in the abstract.** Line 53 reads "We give computer-assisted proofs … at explicit parameters with ε not small", and then lists Faye's model at ε = 1/100, 1/50 and 1/20. Those are small. Limit "not small" to the Pinto–Ermentrout field. For Faye's model say "at explicit ε (1/100, 1/50, 1/20) and his other parameters". "At his parameters" is also ambiguous: of these three values only ε = 1/100 is Faye's (his Fig. 1); his other parameters are λ, κ, b and β.

5. **Label of Lemma 5.7 (`lem:multiplicity`).** It is labelled "proved", which the labels paragraph defines as "with no computation" (line 94). Its proof, however, rests on "item d/e/f of part3_symbolic.py" (lines 648, 652, 656), and the trust base (line 696) lists SymPy. Either write the three one-line identities out in the proof, with SymPy only as a cross-check, or relabel the lemma. The same applies to the paragraph before Lemma 5.2 (line 563).

6. **Sources paragraph.** Line 769 says "We could not reach the full texts of seven works". The same paragraph then says em1993 and ejr2010 are described only from titles, abstracts and secondary accounts, which makes nine not read in full. It also does not say whether Coombes–Owen 2004 was read, although the stability priority rests on it and an open copy exists (Nottingham repository). Separate "could not reach" from "not read", and give the status of co2004.

7. **BOP characterisation (line 74).**
   - "their Fig. 3 … solves the Heaviside conditions numerically at ε = 0.1 and σ = 0, the values of Theorem 1". Fig. 3 (p. 12) uses a Gaussian kernel and threshold h = 0.6. Only ε and σ = γ coincide, so say that.
   - "the conditions (17)–(21) are not verified": (20) is the definition of a map. Their Theorem 3 (p. 14) needs (17), (18), (19) and (21).

8. **Numerical statements outside Section 7.** The labels paragraph says numerical results "are collected in Section 7", but some appear elsewhere: line 469 ("numerically, two of the stable eigenvalues are complex"), line 513, and the caption of Table 1. They are labelled inline, but the sentence overstates.
   - Line 775 calls the rest state of Theorem 3(b) a saddle-focus as a fact; for 3(b) that is only numerical. Theorem 4 certifies it for its own case only.
   - Line 773 cites Section 7 for "the back of the pulse barely expands the unstable direction", which Section 7 does not contain. It is in ext/eps-range/REPORT.md. Open problem 4 gives a different reason (slow approach to rest).

9. **Notation clashes.** The worst are:
   - w: the kernel, and the normalized left eigenvector (Lemma 5.3(b)).
   - Λ: the quadratic form, and the complex square of Section 5.5.
   - c_i: the speeds, and the centres of the covering sets in (Cov).
   - r: the block radius, the tail radii r_i, the time rescalings r_i(ε), the Cauchy radius r = 1/25, and the component r of φ.
   - T: the block matrix, T(λ), T0 and T_FAR.
   - σ: the eigenvector scaling, BOP's decay, the Cov coordinates, Re μ, and the spectrum.
   - μ: the unstable eigenvalue, and λ + ick.
   - Q: the convolution variable, and Faye's depression variable.
   - α: Faye's parameter, and the scalar of Lemma 5.7.

10. **SHA-256 table depends on an uncommitted edit.** In the table at lines 745–757, `certify_rest.py 000acf9bb8641ef1` matches only the working tree. The committed HEAD version hashes to c8631887b57fa214; the difference is a comment-only change to the NF_PULSE=slow branch. Commit that edit together with the manuscript, or the table is wrong.

11. **Priority nuance (line 92).** Faye–Scheel's theorem is for a nonlocal FitzHugh–Nagumo equation (their (1.4)), with a remark that the techniques carry over to the neural-field form (1.6), p. 3. The introduction says this correctly. The priority sentence lists them as a smooth-rate result for the field; add the qualifier. "Earlier fixed-rate results" reads as a fixed firing rate; write "fixed-ε".

12. **Section 7, "Stability".** The Fourier-spectral computation was made "by the program of a separate check, which is not in the folder" (line 707). Either add the program or drop the claim; the reproducibility bar asks for programs.

## Minor

- **Line 496.** It says "285 certificates (all three accepted probes among them)", but four probes were accepted: 282 + 101 in certs/ and 4 probes, all under chain.py 328042d015af5043. Say "the three probes used in E".
- **Lines 727 and 734, "in one process".** code/run_all.sh runs prove_pulse three times in parallel and three tests in the background, and its own header says "about two minutes on four cores". ext/stability/run_all.sh runs thin_runs.sh with two parallel jobs and spectrum_num.py with 4 workers.
- **Line 475, "manifold.py … unchanged".** ext/gain-12/code/manifold.py is identical to code/manifold.py at commit 3e2000a, not to the present file, which replaced assert with require. Say so.
- **Table 1 (caption line 200, row line 216).** The caption says "bins of length 0.005", but the last bin is labelled [0.135, 0.137); table_summary.txt has [0.135, 0.140).
- **Bibliography.** `sympy` (Meurer) is out of alphabetical order (line 859).
- **Figure 1 (line 714).** The right panel's "nullcline V = S(U) − U of the fast equation" is that of the space-clamped equation u_t = −u − v + S(u), not of the wave ODE, which has Q in place of S(U). The orbit is drawn from ξ = 0, which leaves a visible gap between the rest dot and the curve; say so or draw the manifold piece.
- **The block matrix T.** Definition 2.x of 𝒫 uses the T recorded in data/block_certificate.json, but prove_pulse.py and pulse_enclosure.py recompute T with numpy eig at run time (block.setup). On this machine the two are bit-identical, and P3 would catch a mismatch. State this, or load T from the file, so that 𝒫 is the class the programs prove things about on any LAPACK.
- **Abstract.**
  - "a class defined by a speed bracket" omits the block condition (ξ ≥ 110).
  - "an interval of width 10^-25 at 1.10274…" should be "(c1, c1 + 10^-25), c1 = …".
- **Theorem 2(b), "At ε = 1/10 the speed lies in …".** Existence is not unique, so write "a pulse of (a) with speed in …".
- **Duplication.** The last sentence of Theorem 3(a) repeats Corollary 3.x.
- **Line 72.** PE note that g(a,c) = θ can also be written explicitly (p. 217, "we can again explicitly produce … g(c,a) = θ. Alternately … numerically"); the paper says it was evaluated numerically.
- **Line 76.** Cite Hastings's Remark 3 (p. 6) for "Hypothesis 3.1 … has not been verified rigorously"; it says the hypothesis "can only be checked by numerically solving the system (2.2)".
- **Line 89.** The bullet for Theorem 6 is ungrammatical ("every pulse of a class 𝒫 (…), and 𝒫 is not empty, is spectrally stable").
- **Line 765.** The paragraph "What has been checked … the findings confirmed there are applied here" will need updating after this reading.

## What was checked

- **Build.** pdflatex ×3 in scratch: no warnings, 33 pages, text identical to the stored PDF. `node tools/paper-check.js`: nf-pulse OK [draft], 33 pages.
- **Algebra, by SymPy (my own script).**
  - Characteristic polynomial (2.4), including p(iω).
  - The A5 eigenvector and Lemma 3.1 (all five resolvent components).
  - Faye's quartic, with 1 + αS0 = 1/q0.
  - The Evans polynomial, and the right and left eigenvectors of Lemma 5.3(b): their residuals are multiples of the polynomial.
- **Proofs, by hand.** All of them, in Sections 2, 3 and 5. This includes Lemma 3.2's induction and the Z(r) expansion, the (Cov) nesting, Proposition 5.1 (all bounds), Proposition 5.2 (a)–(c) with the constants recomputed, Lemma 5.1, Lemma 5.3, the Volterra and Gronwall tails, the assembly factor f(λ) = e^{−136(ν−ν_c)}, the Cauchy integral, and Lemma 5.7.
- **Numbers against the data.** I compared every numerical claim in the text with the certificate that produces it.
  - Base chain (data/*.json): roots and their sum and product, s0, the block margins, ρ, U-range, the manifold constants, 53 / 58.375 / 57.75, |y′| ≤ 0.006090, and sup U. The stored field `maxU_upper_phase1` is misnamed: it is an arb max of step-end hulls, whose lower end is a valid lower bound.
  - Slow pulse (46.875, 47, 43.625, 42.75; 0.35232, 0.38983; 26 checks).
  - Gain 12 (59.125, 59.25, 0.62233, 23 checks; eigenvalue sum and product; the ratio 4.13856).
  - Faye model (u0, q0, T0, cone times, bit sizes, digit counts 28/88/144, 14 checks).
  - ε-range: 387 PASS certificates, 383 in certs/ plus 4 probes; SHA prefixes; the base-module prefixes at 3e2000a; all in-run negative checks refused; Table 1 rows rounded outward correctly; window widths 2.88e-6 to 4.25e-5; brackets at 1/10 and 3/20. The later changes to the base modules since 3e2000a are as described.
  - Stability: C_U, e^{−16μ}/4, η0, K_U, m_E ≥ 0.12458, G_L and G_R; thin-run times 127.31 / 127.70; 1976 segments; argument intervals; |D̃| lower bounds; D̃′(0), w̃ᵀv and D′(0).
  - The GENChase simulation numbers (−2.80e-5, −1.74e-6, −1.08e-7; −8.6e-6, −5.4e-7, −3.4e-8; six stimuli within 1.734e-6).
  - All 16 SHA-256 prefixes in the reproducibility table.
- **Primary sources reached.**
  - The four arXiv versions the paper cites by page number: Faye–Scheel v1 (pp. 3, 6), Hastings v2 (pp. 1–2 and 6, footnote 4, Sect. 4.5), Dyson 1810.05142v1 (pp. 9, 29) and Dyson 2511.17328v2 (pp. 1, 7–8, 26). Habib–Veltz 2412.03613v1 (printed pp. 2, 3, 7: Hypotheses 1 and 3, Theorem 1).
  - BOP 2025 (MDPI PDF): pp. 2, 5, 7, 8, 12, 14.
  - Pinto–Ermentrout 2001 (author's copy, sites.pitt.edu): pp. 207, 209, 215–218, eq. (3), Figs. 5, 7, 8.
  - Faye 2013 (author's copy dated 5 Sept 2013): pp. 2, 3, 10, 11, 17, 27 and the reference list.
  - Abstracts: PJW 2005 (Crossref) and Sandstede 2007 (Crossref/OpenAlex).
  - zbMATH reviews Zbl 1082.45009 and 1054.45005.
  - Crossref for all 32 DOIs.
  - Every quotation was verbatim, with the right page, except the Hastings "one orbit" gloss and the Faye grouping.
- **Priority.** Two web searches for computer-assisted neural-field pulse proofs found nothing earlier; the only hits were this project's own public PRs (#165, #170, #172). Unpaywall reports Sandstede 2007 and Enculescu 2004 as not open access.

## What was not checked

- `review/` and `notes/` (by instruction). So I did not verify the claims that cite them: the mutation study, VERIFY.md, the 2026-09-27 rerun recorded in QUALITY.md, and the three draft-reading sessions.
- Full texts of Sandstede 2007, Enculescu 2004, the four Zhang papers (beyond the two zbMATH reviews), PJW 2005, Coombes–Owen 2004, Ermentrout–McLeod 1993 and EJR 2010.
- Reruns of the slow-pulse, gain-12, Faye-model and ε-range chains. Another session was rerunning `run_checks.sh` in its own scratch copy while I worked.
- The six winding pieces and simple_zero.py (about 14 min), which I did not recompute; `winding.py combine` checked the stored pieces' hashes.
- An audit of lohner.py or of the internals of evans_rig.py's middle integration and Taylor-model code. I read only its tail and small-block parts.
- Arb and python-flint themselves.

Also note that ext/stability/data/ess_spectrum.json and large_lambda.json have mtime 03:25, newer than run_all.txt (03:04). The text agrees with their contents.

## Commands run (output tails)

```
sha256sum (16 files)  -> all prefixes equal the table; git show HEAD:code/certify_rest.py | sha256sum -> c8631887b57fa214
pdflatex x3 (scratch) -> no Warning/Overfull/undefined; Pages: 33; diff old.txt new.txt: 0 lines
python3 symcheck.py   -> main charpoly ok: True; Faye diff: 0; Evans charpoly ok: True; eigvec residual/charpoly: [-1,0,0,0]; zU..zP: True
python3 doicheck.py   -> 32/32 DOIs resolve; authors/titles/volumes/pages match
cd scratch/nfcopy/code; certify_rest, manifold, block, block_check_iv, prove_pulse {interval,c1,c2} 53 (nice -n 19, sequential)
  -> exit 0 for all; real 0m19s; c1 phase2: in_K 58.375 VERDICT PASS; c2 in_K 57.75 VERDICT PASS; interval VERDICT PASS
  -> JSON vs stored: proof_interval/c1/c2, block, manifold, rest certificates IDENTICAL (except time)
cd scratch/nfcopy/ext/stability; ess_spectrum, large_lambda, part3_symbolic, winding.py combine
  -> CERTIFIED; eps=3/10 refused; LARGE |lam| EXCLUSION: CERTIFIED (neg. control refused); PART 3 ALGEBRA: CHECKED; WINDING NUMBER 1
eps-range cert tally -> PASS 387 (certs 383: 282 x 328042d0, 101 x e0aa72d0; probes 4 x 328042d0); accepted with a non-refused negative check: 0
window widths (386 used) -> min 2.88e-06, max 4.25e-05
block T: pkl T == block_certificate T: True; fresh bl.setup() T == recorded: True
node tools/paper-check.js -> OK nf-pulse [draft]; paper/nf-pulse.pdf: 33 pages
```

## Response (2026-09-27, the manuscript's writer)

Each finding was examined by two further agent sessions; "confirmed" means that both upheld it. Numbers are those of
the revised manuscript (37 pages; the multiplicity lemma is Lemma 5.8, the lemma of the branch Lemma 4.3).

**Must-fix**

1. Hastings misstated (confirmed). **Fixed** in the abstract, the introduction and the priority paragraph: his
   Theorem 2 (p. 5) and Remark 2 (p. 6) reduce the existence of two pulses at a given eps to properties of two
   solutions at a speed c1, one of the fast system (2.2) and one of the full system (2.1). Checked by the writer in
   arXiv:1503.04057v2. `README.md` and `review/PRIOR-ART.md` are corrected too.
2. Faye's grouping (confirmed). **Fixed.** The Sources paragraph no longer attributes Math. Z. 255 to Faye's list; it
   names what Faye lists: Zhang (2005), Pinto, Jackson and Wayne, Sandstede, Zhang, SIAM J. Appl. Dyn. Syst. 6 (2007)
   597-644 (new reference `zhang2007siads`, bibliographic data and abstract from Crossref, doi:10.1137/06066789X) and
   an entry that pairs the title of Zhang's JDE 2004 paper with the journal of another (Faye's references 33, 35 and
   42-44, checked by the writer in Faye's author copy). `review/PRIOR-ART.md` records
   the SIADS paper (abstract only) and the correction.
3. Lemma 4.3 (confirmed). **Fixed** (the local unstable manifold, and the step that places a solution tending to x*
   in it; see the analysis report's response).

**Should-fix**

4. "eps not small" (confirmed). **Fixed:** the abstract says "with eps not small for this field" and gives Faye's
   model "at his other parameters for eps = 1/100, 1/50 and 1/20"; the introduction and README likewise.
5. Label of Lemma 5.8 (confirmed). **Fixed:** the proof writes out the three identities (the ODE form of the
   generalized eigenvector equation, and the two product-rule identities, using psi' = -A^T psi); the paragraph before
   Lemma 5.3 writes out the ODE form of the eigenvalue problem, the variational equation and the constancy of psi^T
   phi; SymPy (`part3_symbolic.py`) is named only as a cross-check, removed from the trust base, and check S is marked
   "C" (not a proof step) in Table 4. The label paragraph says a program named beside a "proved" result only
   cross-checks its algebra.
6. Sources paragraph (not confirmed). The reading status of Coombes and Owen (read in the authors' preprint) was
   **added** anyway; the paragraph now says eight works could not be reached, because the SIADS paper is known only
   from its abstract.
7. Burlakov, Oleynik and Ponosov (confirmed). **Fixed:** their Fig. 3 uses a Gaussian kernel and the threshold 0.6
   (and sigma = 0, 1, 2); only eps and sigma = gamma coincide with Theorem 1; the conditions are (17)-(19) and (21).
8. Numerical statements outside Section 7 (confirmed). **Fixed:** the label paragraph says numerical results are
   labelled where they appear and collected in Section 7; Section 7 now holds the eigenvalues at the slow pulse at
   eps = 3/20, the 1.85 digits per unit of xi in Faye's model, and the bottleneck at the back of the pulse (from
   `ext/eps-range/REPORT.md`); the Discussion labels the saddle-focus of Theorem 3(b) as numerical and cites
   Section 7 for the bottleneck as a numerical observation.
9. Notation (confirmed). **Fixed in part** (see the analysis report's response for the list of renamings); Faye's Q
   is his own notation and is kept, alpha in Lemma 5.8 is now a_*, T_FAR does not occur in the paper.
10. SHA-256 table and the uncommitted edit (not confirmed). The comment-only edit of `code/certify_rest.py` is
    **committed with the manuscript** (in the checkpoint commit 395bba3 and this revision), and all 16 prefixes of the
    table were rechecked against the committed files; two of them (`code/block.py` and `code/run_all.sh`, whose
    comments were corrected after the computation reading) were updated.
11. Faye-Scheel in the priority sentence (not confirmed). **Not changed.**
12. Fourier-spectral computation (confirmed). **Fixed:** the sentence is dropped.

**Minor**

- "285 certificates (all three accepted probes among them)": **fixed**.
- "In one process": **changed** (see the computation report's response).
- `manifold.py` of gain-12: **fixed** (identical to the base file at commit 3e2000a).
- Table 1, last bin: **fixed** ([0.135, 0.13693], and the caption says so).
- Bibliography order: **fixed** (Meurer before mpmath).
- Figure 1: **fixed in the caption** (the curve is the nullcline of the space-clamped equation, and the piece between
  the rest state and Phi(1/4) is not drawn); the figure was not redrawn.
- The block matrix T: **stated** (the programs recompute T; P3 compares the records, which contain T).
- Abstract: **fixed** ("a nonempty class defined by a speed bracket of width 10^-58 and a condition on the profile";
  the speed bracket as (c1, c1 + 10^-25) with c1 printed).
- Theorem 2(b): **fixed**.
- Duplication in Theorem 3(a): **fixed** (the sentence is removed; Corollary 3.1 states it).
- Pinto and Ermentrout, p. 217 (g can be produced explicitly): **fixed**; the writer checked the passage ("we can
  again explicitly produce the solution U+ as well as the second relationship g(c, a) = theta. Alternately ...
  numerically", p. 217) and the caption of Fig. 7 (g "described numerically") in the authors' copy.
- Hastings's Remark 3: **fixed** (quoted, p. 6; checked by the writer in arXiv:1503.04057v2).
- The Theorem 6 bullet: **fixed** (rewritten).
- "What has been checked": **fixed** (it now describes these three readings, the checks of their findings, where the
  reports are, and what was written in response and has not been read separately).
