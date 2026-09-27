# Referee report, 2026-09-27: claims and literature

The report below is reproduced verbatim as the reader returned it. Its line numbers, and its numbers of lemmas,
theorems and remarks, refer to the manuscript it read (`paper/hh-dynamics.tex` at d152286, 24 pages). The response
after it uses the numbers of the revised manuscript; where they changed, both are given.

---

REFEREE REPORT: "Hopf Bifurcations and Bistability in the Hodgkin-Huxley Equations at the 1952 Parameters: Computer-Assisted Proofs" (papers/hh-dynamics/paper/hh-dynamics.tex and .pdf, branch hh-manuscript, commit d152286)

This is an in-project reading by an independent agent on 2026-09-27. It is not an outside review. No files were edited. All runs were done in a scratch copy.

VERDICT: minor revision.

SUMMARY
The mathematics holds up. I found no error in any proof.
- I checked the algebra of Lemmas 2.1 to 2.4, 4.1 to 4.4 and 4.6. I also read the logic of Lemmas 5.1 to 5.13.
- I recomputed the headline numbers with my own mpmath code (not the project's): E_l*, u_H1, u_H2, J_H1 and J_H2 at 10.613 and at E_l*, the eigenvalues there, and both first Lyapunov coefficients. My l1 values, 0.0147936481310081 and -0.00472850269507399, agree to 15 digits and lie inside the certified enclosures.
- Reproduction works:
  - certify_equilibria_hopf.py reran and passed 38 of 38 checks, with output identical apart from the run time.
  - make_numbers.py leaves the generated block unchanged.
  - Three pdflatex runs give 24 pages, with no overfull boxes and no undefined references, and the text is identical to the committed PDF.
  - All 12 SHA-256 prefixes match.
  - The bistability programs have not changed since the data commit of 2026-09-26.
  - The committed and no-ball outputs differ only in run times and in the stage-4b lines.
- Every result carries a label. The chaos work appears only as numerical observation (Section 8) and future work (Section 11). No text claims an outside review.

The problems are in the literature and novelty discussion and in a few statements:
1. A novelty claim ("a stable periodic orbit", "no other imaginary-axis crossings") contradicts the manuscript's own caveat about Du and Hassard (2001). A rigorous l1 < 0 at J_H2 together with the Hopf theorem already gives a stable periodic orbit.
2. Guckenheimer and Worfolk, Section 5 (which the project read and quotes), states flatly that the equilibrium is unique for every I. The introduction presents only Hastings's hedged remark, and that remark concerns J = 0 only.
3. Labouriau (1985, 1989) is in the ledger but not cited.
4. Rump's Theorem 13.3 is quoted in a stronger form than Rump states it.
5. The beta_h formula has a typo.
6. The abstract says "asymptotically stable except for J between two Hopf points", which is wrong at J_H1 if "between" is read as open.

MUST-FIX
(1) Section 1, the novelty statement at the end of "This paper". It claims no earlier proof that the equilibrium has no imaginary-axis crossings other than the two Hopf points, and none that the system has a stable periodic orbit. Yet Section 10 says Du and Hassard "may contain" the criticality of the Hopf points, and the zbMATH review says their "nondegeneracy conditions and genericity of the unfolding are checked" in interval arithmetic for the HH model. A rigorous l1 < 0 at J_H2 gives a stable periodic orbit through the Hopf theorem, which is exactly Corollary 3(b).
Fix: restrict the claim to the large-amplitude spike train away from the Hopf points (Theorem 4), and qualify or drop the "no other crossings" item because of Du and Hassard.

SHOULD-FIX
(2) Guckenheimer and Worfolk, Section 5 (p. 23 of arXiv chao-dyn/9304010) says: "When V̄K has the HH value of 12 mV, f is monotonic and (HH) has a unique equilibrium for each value of I". The manuscript cites that section but does not mention this sentence.
- Hastings's p. 230 remark is about his travelling-wave system (3)-(4), which has no applied current, so it covers J = 0 only.
- Guckenheimer and Worfolk also list V̄L = 10.599 among "the HH values".
- Fix: cite this sentence and characterize it as an assertion from symbolic and numerical work; state that Hastings's remark is for zero applied current.
(3) Cite Labouriau, SIAM J. Math. Anal. 16 (1985) 1121-1133 and 20 (1989) 1-12 (Hopf branches of the clamped HH equations shown to join; invariants computed), and Hassard and Shiau. RESEARCH.md lists them but the "What is known" paragraph omits them.
(4) Theorem 5.9. Rump's Theorem 13.3, as printed (TUHH copy, pp. 88-89), concludes "a unique root x̂ of f in x̃ + S(X, x̃)". Uniqueness in x̃ + X comes from the last line of its proof (injectivity). Rump also assumes f: D -> R^n with x̃ + X inside D, whereas P - id is defined only near Z.
Fix: state the theorem as Rump prints it, and add the injectivity step and the domain hypothesis.
(5) Section 5 introduction: "1 + e^{(30-u)/10} e^{-(u-u0)/10}" should read "1 + e^{(30-u0)/10} e^{-(u-u0)/10}". The code (hh_arb.py lines 28 and 121-124) is correct.
(6) The abstract and the introduction say "asymptotically stable except for J between two Hopf points". Theorem 2(a) excludes both endpoints. At J_H1, l1 > 0 means the equilibrium is not asymptotically stable. Write "for J < J_H1 and J > J_H2".
(7) Background citations blq2021, cq2024, cz2016 and lohner1987 have no RESEARCH.md record, and the bibliography gives no read extent for them (nor for hh1952), unlike the other entries. This is what QUALITY item 4 requires.
(8) The ledger (2026-09-26) makes any priority claim for bistability conditional on reading Guckenheimer and Labouriau (1993), but only pp. 937-938 of 937-952 have been read. Section 10 discloses this; the Section 1 statement should carry the caveat inline, or wait until the paper is read.
(9) Quotations without pages:
- Troy 1978: no page given.
- Guckenheimer and Worfolk: Section 5 only. The quote is p. 24 of the arXiv version, and the original begins with a capital "These".
- Guckenheimer and Labouriau: a two-page range is given for one sentence.
- The Table 3 footnote of Hodgkin and Huxley: no page.
(10) Section 9 says the present program adds "two controls". The earlier version had 27 checks and the present one 38. The 11 new checks are:
- 5 self-tests of the l1 routine;
- 3 negative controls: 2 mutated l1 formulas, and the factorization test at u_H1 + 1e-3;
- the check that the two E_l* enclosures overlap;
- the check J_H1 > 8;
- the ledger of printed bounds.
So there are three new controls, not two.
(11) Section 10: "No one outside the project has reviewed this work", and the README's "not by anyone outside it". AGENTS.md (owner's decision of 2026-09-26) says drafts carry no such label for now. This is a policy conformance point, not a false claim; the owner decides.

MINOR
(12) Corollary 3 carries a compound label, while Section 1 says every result carries one label.
(13) The stability statements for sigma = ±1 in Theorem 4.5 come from Scholarpedia's "Two-dimensional Case" section, which the citation does not name.
(14) The gl1993 title is "Bifurcation of the Hodgkin and Huxley equations: A new twist". The author initial "I. S." is correct; Crossref's "J. S." is Crossref's error.
(15) Cooley, Dodge and Cohen are named in the introduction but have no bibliography entry.
(16) Section 8 says its numbers come from stages 2 and 6 of data/certify_bistability.txt, but the range 7.85 to 7.92 comes from work/chaos/REPORT.md.
(17) The rerun sentence says "lines other than run times". make_numbers.py also skips the Newton and iteration lines and the count line, and compares by set membership. My diff shows the outputs agree in substance.
(18) Section 10 says "The model of both programs was compared..." and mentions a prior inventory, review and outline. No record of any of these is in the folder.
(19) The E_l* enclosure behind Proposition 2.3 is printed under a [selftest] line, not a [proof] check.
(20) Step 1 of the proof of Lemma 5.12 takes the continuity of tau from Lemma 5.6. For a general periodic orbit, cite the implicit function theorem instead.
(21) cz2016 proves periodic travelling waves (wave trains) of the FitzHugh-Nagumo PDE; the text should say so.
(22) The README says the period interval of Theorem 5 is narrower than 1e-12 ms. That is true of the Arb ball, but the printed interval is 1e-11 wide.

WHAT WAS CHECKED
- Read in full: the tex source, the PDF text, README, QUALITY.md, all RESEARCH.md HH entries (2026-09-25 survey and scout; 2026-09-26 constants and bistability; 2026-09-27 prior articles and sources), work/traveling-wave/prior-art-log.md (for the Hastings quote), work/chaos/REPORT.md (the cited numbers), and all three data files.
- Code: hh_ball.psi_coeffs and hh_arb.E_taylor/beta_h checked against Lemma 4.4. make_numbers.py's rerun logic checked.
- Mathematics:
  - Hurwitz algebra.
  - Both quartic examples (D3 = 64 and D3 = -12).
  - Lemma 4.6 by centre manifold, and directly (<p, C(q,q,q̄)> = 4 sigma).
  - The test values 0.143137... and -0.101501....
  - The normal-form amplitude constant 16|q_u|^2 Re lambda'/(omega l1) = 34.657, and the extrapolation 34.65.
  - The branch-table ratios.
  - The shift 0.3(E_l - 10.613) and the interval [7.9931, 8.0021].
  - The outward roundings of the frequency interval and J_H1 >= 9.773337.
- Bibliography: Crossref records for all 27 DOIs. All resolve, and authors, volumes and pages match apart from item (14).
- Primary sources reached:
  - Guckenheimer and Worfolk: arXiv PDF.
  - Kuznetsov: Scholarpedia revision 90964. The theorem and the l1 formula match Theorem 4.5 and eq. (l1).
  - Rump (2010), Theorem 13.3: TUHH copy.
  - Best (1979) and Guttman, Lewis and Rinzel (1980): abstracts via Europe PMC.
  - Labouriau (1985, 1989): abstracts via Crossref.
  - Du and Hassard: zbMATH review.
- Novelty searches of my own: the arXiv API still returned HTTP 406 and PubMed returned an API error. Europe PMC queries found nothing relevant.

NOT CHECKED
- certify_bistability.py was not rerun: it takes 40 minutes on 4 processes, above the 2-process limit. I relied on the committed output and the no-ball rerun.
- Not reachable: Hodgkin and Huxley's Table 3 (PMC and Europe PMC refused), Troy 1978 (AMS returned 403), Guckenheimer and Oliva's author copy, Lu, Xin and Rinzel (paywalled), Fukai et al. p. 216, Guckenheimer and Labouriau's text, and Du and Hassard in full. For these I relied on the project's own records.
- hh_lohner.py and certlib.py were not audited line by line against Lemmas 5.1 to 5.13, and I made no mutation study.

COMMANDS (output tails)
- nice -n 19 python3 code/certify_equilibria_hopf.py (in the scratch copy): "38 checks, 0 failed: 17 proof checks, 6 consistency checks, 5 negative controls, 8 self-tests, 2 cross-checks / run time 11.6 s". Diff against data/certify_equilibria_hopf.txt: only the run time and the final "report written" line differ.
- python3 code/make_numbers.py (in the scratch copy): "251 macros and 4 table-row macros written"; diff with the committed tex is empty.
- pdflatex, three runs: 0 overfull boxes, "Pages: 24", "pdf text identical".
- sha256sum of the 12 files: all prefixes equal the table in the manuscript (c90b6b855a1d023f ... ef41ffbd34b4e7d9).
- diff of the committed output against certify_bistability_no_ball_2026-09-27.txt, with timings stripped: only the stage-4b block, "(333 of them)" versus "(144 of them)", the Bistability summary lines, and "84 checks passed" versus "82 checks passed" differ.
- git show a7c6cc7:.../certify_equilibria_hopf.txt: "27 checks, 0 failed".
- My own mpmath scripts: "E_l* = 10.598920969391678522198878529406..."; "u_H 5.3458563970045945356 J_H(10.613) 9.775437995393126 J_H(E*) 9.779661704575623"; "u_H 21.941907987016173702 J_H(10.613) 154.522433665808"; "l1 = 0.0147936481310081 |q_u| = 0.9999042898"; "l1 = -0.00472850269507399 |q_u| = 0.9997206846".
- node tools/paper-check.js: "OK hh-dynamics [draft] ... the quality bar is not met (open: item 1, 2, 4, 5, 6, 7) ... 24 pages".
- Guckenheimer and Worfolk PDF, pdftotext and grep: line 1172 "f is monotonic and (HH) has a unique equilibrium for each value of I"; line 1196 "These diagrams have not been proved to be correct, but they are based upon strong numerical evidence."

Scratch files, not committed, are in /tmp/claude-0/-home-user-GENChase/ac7d9e0e-5b9b-52ee-8f9a-025178f1bd06/scratchpad/: indep.py, indep_l1b.py, gw.txt, kuz.txt, rump.txt, and hh/ (the rerun copy).

---

## Response (the manuscript's writer, 2026-09-27)

Before anything was applied, every must-fix and should-fix finding of the three reports was put to two further
agents told to refute it; a finding that both could not refute is fixed below, and a refuted one is not applied, with
the skeptics' reasons. The minor items were not put to the skeptics; the plainly correct ones are applied. Numbering
in the revised manuscript: Remark 3.1 is new and the former Remark 3.1 is Remark 3.2, the former Lemma 4.6 is Lemma
4.5, the cited theorems are lettered (Theorem H, formerly 4.5; Theorem K, formerly 5.9), and Lemma 5.9 and Corollary
7 are new. Guckenheimer and Labouriau (1993) was read in full for this revision, in the authors' copy of the printed
paper; it has the sentences that this report quotes from Guckenheimer and Worfolk, and the manuscript now cites it for
them (RESEARCH.md, 2026-09-27, the entry written after the readings).

### Must-fix

- **(1) Fixed (confirmed by both skeptics).** The novelty sentence now reads: "We have not found an earlier proof that
  the space-clamped Hodgkin-Huxley equations at the 1952 constants have a unique equilibrium for all currents of a
  range (Guckenheimer and Labouriau state it without proof), that they have a stable periodic orbit of large amplitude
  away from the Hopf points, such as the spike train of Theorem 4, or that rest and repetitive firing are bistable. We
  claim no priority for Theorem 2 or Corollary 3: Du and Hassard's interval computations may already locate the Hopf
  points and fix their criticality, and a proved l1 < 0 at J_H2 gives, with the Hopf theorem, the small stable cycles
  of Corollary 3(b)." The "no other crossings" item is dropped, as the fix allowed; Section 10 now says that "the
  location and the criticality of the two Hopf points" may be in Du and Hassard, and the README says the same. The
  skeptics' corrections were kept: "contradicts" was too strong ("not found" and "may contain" are compatible), and the
  crossing item was the weaker half; both are covered by claiming no priority for Theorem 2.

### Should-fix

- **(2) Fixed (confirmed by both skeptics).** The "What is known" paragraph now quotes Guckenheimer and Labouriau,
  p. 941 ("f is monotonic and HH has a unique equilibrium for each value of I", f being the steady-state current),
  with the same sentence in Guckenheimer and Worfolk, p. 23, and says that they give no proof and that their
  computations of equilibria and local bifurcations are symbolic (Macsyma, Mathematica, Maple) and their global ones
  numerical. Hastings's remark is now quoted with its "(3)-(4)" restored, and the text says that his system (3)-(4)
  is the travelling-wave system, whose equilibria are those of the space-clamped system at zero applied current.
  Section 2.2 adds Guckenheimer and Labouriau (p. 939) and Guckenheimer and Worfolk (p. 23) to the users of 10.599,
  with the caution one skeptic gave: they print V_L = 10.599 mV beside V_Na = -115 mV, although in that sign
  convention Table 3 prints V_l = -10.613.
- **(3) Fixed (confirmed by both skeptics).** Cited in "What is known", with how far each was read: Labouriau (1985,
  1989), SIAM J. Math. Anal. (abstracts: the two Hopf branches join, for the equations perturbed in parameters such
  as the temperature; the invariants of the degenerate Hopf bifurcation computed); Hassard and Shiau (1989) and
  Shiau and Hassard (1991), J. Theor. Biol. (abstracts: isolated branches of periodic solutions near degenerate Hopf
  points, "purely numerical techniques" for the global branches); Hassard and Shiau (1996), Appl. Math. Lett. (title
  only; no abstract was found). Bibliography entries added with DOIs from Crossref; the Sources paragraph of Section
  10 lists them.
- **(4) Fixed (confirmed by both skeptics; also the analysis reading's S2).** Theorem K states Rump's Theorem 13.3 as
  printed: f continuously differentiable on D, x~ + X in D, Jf the interval hull of the Jacobians (his eq. (13.3)),
  and a unique root in x~ + S(X, x~). The new Lemma 5.9 (proved) gives what the program uses, including the uniqueness
  in the whole box by the integral-mean argument and the containment of the root in K; the domain is the box Z. One
  skeptic also noted that the old statement let M be any interval matrix enclosing DG, whereas Rump's conclusion is
  for the hull; Lemma 5.9 handles this (the hull lies in any such M).
- **(5) Fixed (confirmed by both skeptics).** The beta_h series reads 1 + e^{(30-u_0)/10} e^{-(u-u_0)/10}, with u_0
  defined.
- **(6) Fixed (confirmed by both skeptics; also the analysis reading's M2).** Abstract, introduction and README abstract
  now say "asymptotically stable for J < J_H1 and for J > J_H2", with the two eigenvalues in Re > 0 only on
  (J_H1, J_H2); one skeptic's caution (the alternative "except for J in [J_H1, J_H2]" would need the clause restricted
  to the open interval) is respected.
- **(7) Fixed (confirmed by both skeptics, with corrections).** RESEARCH.md has a new entry (2026-09-27, after the
  readings) recording how far each background citation was read: Arioli and Koch (abstract and the start of Sect. 1),
  Czechowski and Zgliczynski (abstract), van den Berg, Lessard and Queirolo (abstract), Church and Queirolo
  (abstract), Zgliczynski 2002 (abstract; the skeptics noted it was missing from the list), Lohner (not read). The
  Sources paragraph of Section 10 says the same and adds Krawczyk and Moore (not read; the test is used in Rump's form)
  and Johansson's papers (software, part of the trust base). The bibliography now carries the extent on these entries
  and on hh1952 (the equations and Table 3), rump2010 (Sect. 13), troy1978, go2002 and gl1993 (in full). Both
  skeptics corrected the report: hh1952 was already recorded in RESEARCH.md and in Section 10, and item 4 asks for the
  ledger record, not for notes in the bibliography; the notes were added anyway, for consistency.
- **(8) Refuted by both skeptics; the underlying gap is now closed.** Skeptic 1: the sentence right after the novelty
  statement limits it to the searches and points to Section 10, which names pp. 939-952 of Guckenheimer and Labouriau
  as unread; the "What is known" paragraph cites the paper with its page range and quotes "are conjectured"; the
  2026-09-26 ledger condition was superseded by the 2026-09-27 entry, which read pp. 937-938 and deferred the rest to
  before "ready". Skeptic 2: the same, and QUALITY items 4 and 5 track it. Since then the whole paper has been read
  (authors' copy of the printed paper): it contains no proof of anything, and its only statement on the equilibrium is
  the unproved uniqueness sentence of p. 941, now quoted. The novelty sentence names it inline.
- **(9) Refuted by both skeptics as a whole; the parts that the second skeptic found real are applied.** Skeptic 1:
  "Sect. 5" is a correct locator for Guckenheimer and Worfolk, whose arXiv version is what was read (a page of the
  unread book version would be worse); lowercasing the first word of a run-in quotation is standard; the Table 3
  footnote is located by its table; the Guckenheimer and Labouriau range contains the page. Skeptic 2 agreed on
  those, but found the Troy quotation without a locator and cut short, and the Guckenheimer and Labouriau sentence on
  p. 938. Applied: Troy is quoted in full, "made on the basis of numerical evidence and physical reasoning", with
  p. 76 (checked in the project's copy); the Guckenheimer and Labouriau quotations now carry pp. 938, 941 and 942
  (checked in the authors' copy); Guckenheimer and Worfolk now carries p. 23 of the preprint. The Table 3 citation is
  unchanged.
- **(10) Fixed (confirmed by both skeptics).** Section 9 lists the 11 added checks, with three new controls.
- **(11) Fixed (confirmed by both skeptics).** Both skeptics found that the owner's decision already covers plain
  sentences: commit 5313bbe removed this kind of wording from this README. The sentence "No one outside the project
  has reviewed this work." is removed from Section 10, and the README's "not by anyone outside it" with it. Section 10
  and the README still say, as the decision requires, what was checked and by whom (in-project readings by separate
  agents), and no text claims an outside review; `notes/QUALITY.md` item 6 says the readings were in-project.

### Minor

- **(12) Fixed.** The Labels paragraph now says that "a result whose proof is computer-assisted and also uses a cited
  theorem says so in its label", and that every result carries "a label".
- **(13) Fixed.** Theorem H cites the sections "Two-dimensional Case", "Multi-dimensional Case" and "First Lyapunov
  Coefficient"; so does Section 10.
- **(14) Checked; the manuscript was already right.** The bibliography entry reads "Bifurcation of the Hodgkin and
  Huxley equations: a new twist", with "I. S. Labouriau". The wrong title ("...Hodgkin-Huxley equations...") is in
  RESEARCH.md's entry of 2026-09-26; dated records keep their words, so the new ledger entry records the correction.
- **(15) Fixed.** The introduction now says that Lu, Xin and Rinzel credit Cooley, Dodge and Cohen, whose paper we
  have not read, and cites only Lu, Xin and Rinzel for it.
- **(16) Fixed.** Section 8 opens "Where no other source is named, the numbers are from stage 2 ... and stage 6", and
  the fold bullet names `work/chaos/REPORT.md` as a numerical study in progress, not part of the manuscript and not
  regenerated by `code/make_numbers.py`.
- **(17) Fixed.** The rerun sentence (written by `code/make_numbers.py`) now names what is left out of the comparison
  (run times, the floating-point Newton lines of stage 4, the Newton iterations of stage 6, the count of checks) and
  says "occurs in the committed output", which is what the comparison tests.
- **(18) Fixed.** The "What has been checked" paragraph of Section 10 is rewritten: it keeps only what the folder
  documents (the mutation reading of 2026-09-26, described in Section 7, and the three readings of 2026-09-27, whose
  reports are these three files, the model against the 1952 equations included) and drops the inventory, review and
  outline, of which no record is in the folder.
- **(19) Fixed in the text.** The proof of Proposition 2.3 now says that the step of the proof is the ball that the
  program computes and prints in part 0 ("E_l* = [... +/- 4.80e-39]"), of which the proposition's interval is the
  outward rounding, and that the overlap with the ball of `code/hh_arb.py` is a self-test, not a step of the proof.
  The program is unchanged: the ball is a computed enclosure, not an inequality to be checked.
- **(20) Fixed** (the analysis reading's S1): Lemmas 5.8, 5.12 and 5.13 are stated for the local return map, and Step 1
  of Lemma 5.12 takes the continuity of the return time from the implicit function theorem.
- **(21) Fixed.** "Computer-assisted proofs exist for the travelling pulse of the FitzHugh-Nagumo equations, for their
  periodic travelling waves, and for Hopf bubbles and degenerate Hopf bifurcations".
- **(22) Fixed.** The README says "the stable orbit with its period enclosed in a ball of radius below 1e-13 ms".

### Commands after the revision (tails)

Common to the three responses; every command under `timeout`, the computations at `nice -n 19` with at most two
worker processes, on a machine shared with other jobs (load average 6 to 10).

```
$ OMP_NUM_THREADS=1 timeout 3600 nice -n 19 python3 code/identify_stable_orbit.py --workers 2
  4 pieces with 2 worker processes, 219 s (wall)
  [PASS] [proof] E_l = 10.613 lies in the piece [10.6125, 10.6130], and K lies in the interior of its box (centre of K about 0.18 box radii from the centre of the box)
  ...
  [PASS] [control] NEG E_l = 10.599: K tested against the box of the piece [10.6125, 10.6130], which does not contain E_l (centre of K about 10 box radii away): the inclusion must fail
  [PASS] [proof] every decimal bound printed with outward rounding (12 of them) re-read as an exact rational lies on the correct side of its ball
27 checks passed: 16 proof checks, 3 negative controls, 8 cross-checks
run time 443.0 s

$ OMP_NUM_THREADS=1 timeout 1800 nice -n 19 python3 code/numerics_h2.py
  J_H2 - J = 1.00 ... (peak-to-peak u)^2/(J_H2 - J) = 14.4225
  J_H2 - J = 0.50 ... (peak-to-peak u)^2/(J_H2 - J) = 14.3571
  J_H2 - J = 0.25 ... (peak-to-peak u)^2/(J_H2 - J) = 14.3249
  run time 161.1 s

$ timeout 120 python3 code/make_numbers.py
268 macros and 4 table-row macros written into paper/hh-dynamics.tex

$ timeout 600 sh tools/paper-build.sh hh-dynamics
Built papers/hh-dynamics/paper/hh-dynamics.pdf          (28 pages; no undefined references, no overfull boxes)

$ timeout 600 node tools/paper-check.js                 (exit 0)
OK   hh-dynamics  [draft]
       note: papers/hh-dynamics/notes/QUALITY.md: the quality bar is not met (open: item 2, 4, 5, 7)
       note: papers/hh-dynamics/paper/hh-dynamics.pdf: 28 pages

$ timeout 300 node tools/lint.js                        (exit 0)
114 script blocks parsed

PASS
```

`data/certify_equilibria_hopf.txt` and `data/certify_bistability.txt` are unchanged in this revision (restored from
git before any run; the reruns of the readings were made on copies).
