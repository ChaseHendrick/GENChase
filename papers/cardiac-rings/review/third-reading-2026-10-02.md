# Third in-project reading of the manuscript (2026-10-02)

An adversarial reading of the whole manuscript `paper/cardiac-rings.tex`, as it stood on 2026-10-02 after Theorem C
(Sections 2.3 and 4.8), Appendix A and Remark 7.1 were added, by separate AI agent sessions within the project, each
told to find errors and briefed with the paper, its programs and its records. It is not an outside review.

It was read in five parts, one session each: Existence proofs (Sections 2.3 and 4, Theorem C); stability proofs (section 5) and appendix a; printed numbers against the records; claims, labels and sources; the capd argument (section 6) and reproducibility (section 8). Every finding was then checked against the files by two further sessions; 47 were confirmed and 11 were not. The findings were fixed by the drafting session in the same day's fix pass; those fixes have not been read by a further reader.

## Outcome

No gap was found in the proofs. The existence part found the every-N argument complete, including the cable endpoint eps = 0 and the gluing; the stability part found no gap in Section 5 or Appendix A; the numbers part found the printed numbers of Theorem C and Table 3 in agreement with `data/fourier-existence-alln.json`; the CAPD part found the argument of Section 6 complete and matching `code/proofs/verify.cpp`, and its rerun of `code/fourier/link_cell.py` reproduced `data/link_cell.txt` byte for byte. The must findings concerned the record of checks (a reading cited by a file name that did not exist), a statement that the two cell proofs share no library (both link GMP and MPFR), a count of re-proved pieces, a bound printed below its record value, and statements about reruns that the rerun record had overtaken.

## Summaries of the five parts

### Existence proofs (Sections 2.3 and 4, Theorem C)

This was an in-project reading, not an outside review. I found no gap in the mathematics of the existence proofs. The every-N argument holds together. Every place where eps enters F, DF and the operator A is covered: the mean value theorem handles the finite rows, the tail rows take suprema over the piece, and the Z2 term contains no d_m. Lemma 4.9 needs no upper bound on the damping, so the cable endpoint eps = 0 is covered, and the N = 8 endpoint eps = 1/64 is the right end of the last piece. Continuity follows from the uniform contraction and dominated convergence. The gluing inequality and the identification inequality (incl) are correct, and so is the code that checks them. I checked every number Theorem C and Section 4.8 print against data/fourier-existence-alln.json; the exact constants I recomputed from the stored hex radii and dyadic weights all hold. Uniqueness is stated in the right space: zeros of F(.; eps) in balls of X. Nothing about stability is claimed beyond N = 8, 16, 32, 64. One finding is a must, and it concerns the record of checks, not a proof: the manuscript, the README, review/README.md and QUALITY.md cite review/alln-integration-reading-2026-10-02.md as a completed reading, but that file does not exist, and QUALITY item 6 stays checked although Theorem C and Remark 7.1 have no completed manuscript reading. Two should findings: the unweighted uniqueness radius 1.05e-6 is checked by no program, with a 0.03 per cent margin, and the paper says the record stores the exact centres when only the run log does. The rest are nits.

### Stability proofs (Section 5) and Appendix A

This is an in-project reading, not an outside review. I found no gap in the proofs of Section 5 or Appendix A. Each step follows from the stated elementary facts, and the conclusion holds as stated: algebraically simple multiplier 1, the other 18N - 1 multipliers below e^(-delta T), and local exponential orbital stability with asymptotic phase at every rate delta' < delta. I checked the following:
- The Hill-sector identity in both directions, including injectivity of iota* through the polynomial-in-n argument, the logarithm B on W, and p_w in D.
- The multiplier count per half-open strip and the merging of the trivial multiplier.
- The Riesz-projection homotopy: Theorem A.7, with the hypotheses of Lemma 5.9 met by Lemmas 5.11 and 5.12.
- The Schur-complement small gain: the tail Neumann bound, the block factorization on the domain, and the column bounds r_j and bhat.
- The tail bounds: the reduction z = mu + i omega m, conjugation for m < 0, the lower bounds behind gamma_r, and the far bound for b_m with its sign and index argument.
- Algebraic multiplicities, read as Riesz ranks, through the Scal and S similarities.
- The Andronov-Witt argument of Theorem 5.17(iii).

Every appendix citation in Section 5 points to what is proved there. stability.py computes exactly the quantities the lemmas define, and its SHA-256 matches the records. The numbers in the proof of Theorem B(c), in Table 2 and in Section 5.6 match the records. One statement in the abstract is literally false: it omits the translates i omega N k. The remaining items are precision and notation nits.

### Printed numbers against the records

I checked the numbers myself in one session, because no tool for starting subagents was available here. Almost every printed number matches its record, and enclosure ends are rounded outward. That includes every number of Theorem C and Table 3, which were newly integrated, checked exactly against data/fourier-existence-alln.json and the hex values in pieces.jsonl. All 73 period enclosures were also recomputed from the stored center, eta_omega and r_ex, and all of them contain the true interval. The PDF has 40 pages, as stated everywhere, and matches the current tex.

Four findings are must-fix:
- The manuscript, README and RELEASES say test_alln.py re-proves "five" pieces. It re-proves four distinct pieces.
- At N = 8 the manuscript prints ||eps||_{1->1} <= 1.2e-12, but the record holds 1.2023e-12.
- The manuscript cites a reading that does not exist: review/alln-integration-reading-2026-10-02.md.
- Section 8 says the CAPD certificate, the rings N = 16, 32, 64 and the Theorem C pieces were not rerun from the copies. notes/rerun-2026-10-02.md records that they were, so the statement is now false (it understates the checks).

Five findings are should-fix:
- In Table 2, theta_T and the SC ratio are rounded down below their record values for N = 1, 32 and 64.
- The trivial-eigenvector residual "about 1e-20" is 6.6e-17 at N = 1.
- In Remark 7.1 the same relative error appears as 3.1e-2 and as 3.2 per cent, because the two figures use different denominators.
- Section 4.5 states "m_max = 391" for all Stage E runs, but the record holds 392 at N = 32 and 395 at N = 64.
- The \date line still reads October 1, 2026.

There are four nits.

### Claims, labels and sources

Read-only third reading of paper/cardiac-rings.tex, checked against notes/QUALITY.md, review/, README.md, RELEASES.md, RESEARCH.md (cardiac entries of 2026-09-30 and 2026-10-01), the project's study folder notes/ (prior-article and readings notes), data/fourier-existence-alln.json and data/numerics-phase-reduction.json. I recomputed every Theorem C number and every Remark 7.1 number I could find in the records. The labels are right. Theorems A, B and C are labelled computer-assisted. Section 7 and Remark 7.1 are labelled numerical and unused, and the README uses the same labels. No proof step depends on Kato: Appendix A proves the three facts from the listed elementary facts, and Kato is cited only as "see also". No proof step depends on an unread source. The only sources a proof needs are Erhardt's model file (hash recorded) and the trust base of Arb and CAPD. Every printed Theorem C number agrees with the record. There are no apologies for unobtainable sources and no claim of outside review. The Use of AI statement is at body size. One must-fix finding: the paper (Section 9, Checks), QUALITY.md item 1(c) and review/README.md all say that the integration of Theorem C and Remark 7.1 had an in-project reading, review/alln-integration-reading-2026-10-02.md. That file does not exist anywhere in the repository, so a reading that did not take place is claimed. The should findings are about sourcing records and scope. Section 9 gives no reading basis for Kato, Arb (Johansson 2017) or CAPD (Kapela et al. 2021), and QUALITY item 4 wrongly says every cited work is listed there. RESEARCH.md has no entry for Kato or for van den Berg-Lessard-Mischaikow. The Searches item points to the wrong place for the 2026-09-30 searches. Three related-work statements go beyond what was read: "are due to Gameiro and Lessard", the negative claims about Johnson-Zumbrun from a first-page reading, and the credit for the phase reduction. Remark 7.1 measures the same discrepancy in two normalizations (3.2 per cent and 3.1e-2). The README and RELEASES state novelty more broadly than the paper does. The README and RELEASES announce release 1.0.0 while quality items 1, 4 and 7 are open. The Checks item over-generalizes the second readings of fixes. Section 8 and QUALITY item 7 are stale against notes/rerun-2026-10-02.md. QUALITY item 6 is checked although the Section 4.8 proofs have had no manuscript reading.

### The CAPD argument (Section 6) and reproducibility (Section 8)

The CAPD argument is complete and matches proofs/verify.cpp: the section level is exact (4s), A_t^{-1} is enclosed by a correct Neumann bound, M = A_t^{-1} DP_ff A_t is right because CAPD's C1DoubletonSet starts from the identity derivative, the block-norm row sums and the invariance test match the text, the period enclosure comes from the box run so it contains the return time of x_c, and every decimal in the theorem contains the hex value stored in the record. The CAPD source hashes in the record match code/ and commit f48a01b, and the patched header hash matches. Lemma 6.1 states what link_cell.py checks. My rerun of link_cell.py produced output byte-identical to data/link_cell.txt (14 blocks, worst ratio 0.1396, control fails in 2 blocks). `sh code/run_all.sh` passes in 0.4 s (90 + 15 hashes, LINKED), and the times and memory in Section 8 match the records. The problems are in the reproducibility and trust text. Three are must-level. (1) Section 8, the README, RELEASES.md and QUALITY item 7 say that N = 16, 32, 64, the CAPD certificate and the Theorem C pieces were not rerun from the copies. notes/rerun-2026-10-02.md records that all of them were rerun (five pieces for Theorem C), and Section 8 does not cite that note. (2) Section 9 cites review/alln-integration-reading-2026-10-02.md as a reading that took place, but the file does not exist anywhere in the repository. (3) The abstract and introduction say the two cell proofs share no library, but both rest on GMP and MPFR. Should-level: the BLAS-thread explanation contradicts the pinned reruns; the trust list leaves out the functions of centre.py that enter the proof and the link; the instructions for rerunning the CAPD certificate and for the 104-point CAPD-vs-Arb test are incomplete; and run_all.sh never rechecks the CAPD record's source hashes.

## Confirmed findings and what was done

Severity: must, should or nit, as the finder rated it. Locations are those of the version read.

| id | part | severity | finding | done |
|---|---|---|---|---|
| E1 | existence-proofs | must | The manuscript says the integration of Theorem C and Remark 7.1 had a completed in-project reading, and cites a file that does not exist. | The nonexistent reading is no longer cited anywhere; this file records the reading of Theorem C and Remark 7.1 that was meant, and the quality record cites it. |
| E2 | existence-proofs | should | The unweighted uniqueness radius 1.05e-6 in Theorem C(a) rests on the inequality r_un(P) min_c eta_c(P) >= 1.05e-6 on all 73 pieces. | Second option of the fix: the proof of Theorem C(a) now says that the four constants are read off the record by an exact rational comparison, not by alln.py, and the Labels paragraph says so; the program and its output are below. alln.py and the record are unchanged (the record hashes alln.py). |
| E3 | existence-proofs | should | The paper says the record data/fourier-existence-alln.json stores the pieces' centres and their other exact inputs. | Fixed as proposed. |
| E4 | existence-proofs | nit | The letter kappa is used for two different things within a few lines: the conjugation isometry of Lemma 4.8 and the contraction constant of Lemma 4.14. | Fixed. |
| E5 | existence-proofs | nit | The lemma says the rectangles B have 'exact rational corners', but R = [0, 2 pi] x [-rho, rho] cannot be tiled by rectangles with rational real corners. | Fixed. |
| E7 | existence-proofs | nit | Part (a) says phi_* is analytic on the open strip, while (d) asserts uniform convergence on the closed strip /Im theta/ <= 1/4. | Fixed. |
| E8 | existence-proofs | nit | The record's theorem string writes the operator with the opposite sign to the manuscript, and contains a garbled clause. | The record is program output and hashes alln.py, so neither was changed; the README notes the sign convention of the record's theorem string beside the Theorem C entry. |
| S1 | stability-proofs | should | The abstract says the certificate excludes spectrum from {Re mu >= -delta} 'apart from a simple eigenvalue 0'. | Fixed as proposed. |
| N3 | stability-proofs | nit | The statement uses n_c, which is introduced only in Section 5.6 (n_c = 24). | As E1. |
| N4 | stability-proofs | nit | Two statements are imprecise. | Fixed. |
| N5 | stability-proofs | nit | The remark says 'a negative real eigenvalue of M_tau persists under perturbation'. | Fixed. |
| N6 | stability-proofs | nit | Several symbols carry two or more meanings within the stability material, and a careful reader has to stop and disentangle them. | Fixed. |
| N7 | stability-proofs | nit | The lemma file is cited by Section 5.6 and the README as the specification of stability.py, but its section 4.1 quotes numbers that no longer match the records or the manuscript. | Fixed in code/fourier/LEMMAS-stability.md (not hashed by any record). |
| N8 | stability-proofs | nit | The list says the program 'fixes' an invertible V and an invertible U_r. | Fixed. |
| N1 | numbers | should | The count of pieces re-proved by code/fourier/test_alln.py is wrong. | Fixed as proposed. |
| N2 | numbers | should | The printed bound on //eps//_{1->1} at N = 8 is not implied by the record; the record's value is larger. | Fixed as proposed. |
| N3 | numbers | must | The manuscript claims an in-project reading of the integration of Theorem C and Remark 7.1 and cites a file that does not exist. | As E1. |
| N4 | numbers | should | The statements about what was not rerun from the copies are contradicted by notes/rerun-2026-10-02.md in the same folder. | Fixed as proposed. |
| N6 | numbers | nit | The trivial-eigenvector residual is stated as 'about 10^{-20}' for the program in general, but it is about 1000 times larger at N = 1. | Fixed. |
| N7 | numbers | nit | One quantity, the relative error of the real part of the leading exponent at N = 8 and full coupling, is printed as 3.2 per cent in one bullet and 3.1e-2 in the next. | Fixed in code/fourier/LEMMAS-stability.md (not hashed by any record). |
| N8 | numbers | nit | m_max is given as 391 in a statement that covers all five Stage E runs. | Fixed. |
| N9 | numbers | nit | The printed date predates content dated 2026-10-02. | The printed date was removed (\date{} is empty), as in the other papers. |
| F1 | claims-sources | must | The paper, the quality record and the review index all cite an in-project reading of the integration of Theorem C and Remark 7.1 that does not exist. | As E1. |
| F2 | claims-sources | should | Three cited works have no stated reading basis: Kato (1976), Johansson (2017, Arb) and Kapela, Mrozek, Wilczak and Zgliczynski (2021, CAPD). | Section 9 now states that Kato was not checked against a copy and that Johansson and Kapela et al. are cited as the software used, with no reading of the papers recorded. |
| F3 | claims-sources | should | Quality item 4 requires every background citation to be recorded in RESEARCH.md with how far it was read. | RESEARCH.md has an entry of 2026-10-02 for the four citations, with the reading status the paper states. |
| F4 | claims-sources | should | The novelty sentence is scoped to "the searches we made (Section 9)", but Section 9 points to the wrong place for them. | Fixed as proposed. |
| F5 | claims-sources | should | This is a priority attribution that the logged searches do not support. | Fixed as proposed. |
| F6 | claims-sources | should | Two negative claims about Johnson and Zumbrun (2012) are stated as fact, but only the first page was read. | The sentence now states the reading basis (the first page) and limits the claim to it; the sections the fix proposes were not read, so the reading basis was not widened. |
| F8 | claims-sources | should | The same discrepancy, the real part of the leading exponent at N = 8, is printed in two different relative normalizations in two adjacent bullets, so the numbers do not match. | Fixed as proposed. |
| F9 | claims-sources | should | The README and the release notes state the novelty more broadly than the paper. | Fixed as proposed. |
| F10 | claims-sources | should | The README and the release notes announce a public preprint release dated today. | README status line returned to draft wording; RELEASES.md kept as the prepared notes. |
| F11 | claims-sources | should | The first sentence says every program had a second reading of its fixes. | Fixed as proposed. |
| F12 | claims-sources | should | The text says that the rings N = 16, 32, 64, the CAPD certificate and the pieces of Theorem C were not rerun from the copies. | Fixed as proposed. |
| F13 | claims-sources | should | Item 6 is checked although the Section 4.8 proofs (Lemmas 4.9 to 4.14 and the proof of Theorem C) and Remark 7.1 have not been read in manuscript form by an independent reader. | Item 6 of the quality record now cites this reading, which covers Theorem C, Sections 2.3 and 4.8 and Remark 7.1; its fixes have not been read by a further reader, as the record says. |
| F14 | claims-sources | nit | Two of the new ranges round their lower end up, so the true minimum lies below the printed range. | Fixed. |
| F15 | claims-sources | nit | The reading basis for Section 8 of Gameiro-Lessard is broader in the paper than in the readings note. | Fixed. |
| R3-CAPD-1 | capd-reproducibility | should | Section 8 and the release texts say that the rings N = 16, 32, 64 and the CAPD certificate were not rerun from the copies, and that no piece of Theorem C was re-proved from them. | Fixed as proposed. |
| R3-CAPD-2 | capd-reproducibility | must | The manuscript says the integration of Theorem C and Remark 7.1 had a further in-project reading and cites a report file for it. | As E1. |
| R3-CAPD-3 | capd-reproducibility | must | The paper says the two cell proofs share no library. | Fixed as proposed. |
| R3-CAPD-4 | capd-reproducibility | nit | The explanation for the non-reproducible Y0, Z1, Z2 and r_ex is not supported. | Section 8 now calls the thread setting a possible cause of the late-digit differences and says it was not investigated; the README says only that the inverse may depend on it. The rerun with the thread variables unset that the finding proposes was not made. |
| R3-CAPD-5 | capd-reproducibility | should | The trust list leaves out code that enters the proof of Theorem A(ii) and the link. | Fixed as proposed. |
| R3-CAPD-6 | capd-reproducibility | should | The instructions for rerunning the CAPD certificate are incomplete. | Fixed as proposed. |
| R3-CAPD-7 | capd-reproducibility | nit | run_all.sh never rechecks the four source hashes stored in the CAPD record (verify.cpp, tp06_capd.hpp, setup.hpp, scales.txt). | run_all.sh was not changed to check the four CAPD source hashes; Section 8 says that it does not, and that they were compared with the copies by hand on 2026-10-02. |
| R3-CAPD-8 | capd-reproducibility | should | Theorem A(iii) rests on the CAPD and Arb fields being the same function, and the evidence offered is the 104-point comparison 'by the tests (Section 8)'. | Fixed as proposed. |
| R3-CAPD-9 | capd-reproducibility | nit | Two small mismatches with the records. | Fixed. |
| R3-CAPD-11 | capd-reproducibility | nit | Three wording details. | Fixed. |
| R3-CAPD-13 | capd-reproducibility | nit | The script header calls the no-argument mode 'provenance check only', but that mode also runs the link program. | Fixed. |

## Findings not confirmed

- E6 (existence-proofs): The paper says the range of d_m over P is found 'by evaluating (deps) on the hull of P'.
- N1 (stability-proofs): Lemma 5.1 defines alpha with the A_n of Section 5.1, which are in the scaled variables.
- N2 (stability-proofs): B_m is defined as -i omega m I + X_{m mod N}, but X_r, U_r and Lambda_r are introduced only for r in {0, ..., floor(N/2)}.
- N5 (numbers): Some theta_T and SC-ratio values are rounded down below the record's bound.
- N10 (numbers): Upper bounds are printed with '=' and rounded down.
- N11 (numbers): Two time ranges do not contain their record extremes.
- N12 (numbers): '15 hashes' counts one Stage E record twice.
- N13 (numbers): The README states an approximate ratio as if it were exact.
- F7 (claims-sources): Remark 7.1 credits the phase-reduction formula to two works known only from metadata.
- R3-CAPD-10 (capd-reproducibility): Lemma 6.1 uses //a_{*,k} - abar_k//_nu <= r_ex, which holds only with unit component weights.
- R3-CAPD-12 (capd-reproducibility): The argument that the first return time t_1 is the minimal period silently uses the fact that the orbit crosses S upward at x_c.


## The four constants of Theorem C(a): exact check

The proof of Theorem C(a) uses four constants that summarize all pieces: the largest r_ex (at most 9.07e-7), the
smallest r_un (at least 4.65e-4), the smallest r_un min_c eta_c (at least 1.05e-6) and max_c eta_c (at most 1).
alln.py does not decide them (finding E2). This program reads them off the record's exact binary radii (hex) and
dyadic weights, over the 73 pieces and the cable entry, in exact rationals:

```python
# Exact rational check of the four constants of Theorem C(a), read off data/fourier-existence-alln.json.
import json, sys
from fractions import Fraction as Q
rec = json.load(open(sys.argv[1]))
entries = [(p["label"], p) for p in rec["pieces"]]
if rec.get("cable_piece"):
    entries.append(("cable_piece", rec["cable_piece"]))
def rad(p, k): return Q(float.fromhex(p[k]["hex"]))
rex = max((rad(p, "r_existence"), l) for l, p in entries)
run = min((rad(p, "r_uniqueness"), l) for l, p in entries)
ruw = min((rad(p, "r_uniqueness") * min(Q(e) for e in p["eta"]), l) for l, p in entries)
etm = max((max(Q(e) for e in p["eta"]), l) for l, p in entries)
checks = [("max r_ex <= 907/10^9", rex, rex[0] <= Q(907, 10**9)),
          ("min r_un >= 465/10^6", run, run[0] >= Q(465, 10**6)),
          ("min r_un*min_c eta_c >= 105/10^8", ruw, ruw[0] >= Q(105, 10**8)),
          ("max max_c eta_c <= 1", etm, etm[0] <= 1)]
print("entries:", len(entries))
for name, (v, l), ok in checks:
    print(f"{name}: {float(v):.7e} at {l}: {'PASS' if ok else 'FAIL'}")
sys.exit(0 if all(c[2] for c in checks) else 1)
```

Run on 2026-10-02 as `python3 alln_constants.py data/fourier-existence-alln.json` (Python 3.11.15, standard library
only), exit 0:

```
entries: 74
max r_ex <= 907/10^9: 9.0607445e-07 at cable_piece: PASS
min r_un >= 465/10^6: 4.6568283e-04 at E[0,1/4096]: PASS
min r_un*min_c eta_c >= 105/10^8: 1.0503347e-06 at E[35/32768,43/32768]: PASS
max max_c eta_c <= 1: 1.0000000e+00 at cable_piece: PASS
```

The smallest r_un min_c eta_c, 1.0503347e-6 on the piece [35/32768, 43/32768], exceeds 1.05e-6 by about 0.03 per cent.
