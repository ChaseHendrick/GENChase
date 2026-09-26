# Prior art: existence of the Hodgkin-Huxley travelling pulse at the 1952 parameters

Date of search: 2026-09-26. Written by a research subagent; the texts it read were kept in a scratch folder and are not in this repository (file names mentioned below, such as ss.txt, refer to that scratch folder).

Labels used below. PRIMARY: I read the passage in the paper itself (page image or text layer). SELF-REPORT: the author describes their own earlier paper in a later one. SECONDHAND: another author's description; not checked against the primary text. NOT READ: could not reach.

---

## (A) Hastings 1976

**Citation, verified** (Crossref, Springer landing page metadata, zbMATH 0374.35004, MathSciNet MRef gives MR402302):
S. P. Hastings, "On travelling wave solutions of the Hodgkin-Huxley equations", Arch. Rational Mech. Anal. 60 (1976), no. 3, 229-257. DOI 10.1007/BF01789258 (not BF00250435). Affiliation: SUNY Buffalo. Communicated by J. Serrin.

**What I read (PRIMARY):** pages 229 and 230 only, from Springer's free two-page preview (https://page-one.springer.com/pdf/preview/10.1007/BF01789258). I checked the page 230 text against the rendered page image. Pages 231 to 257 (the hypotheses, the main theorem and its proof) are behind the paywall. I did not read them.

Short quotations, p. 230:

- The travelling-wave system (3)-(4), "with θ = α²R": v'' = θ(v' + g_K(n)(v − v_K) + g_Na(m,h)(v − v_Na) + ḡ_L(v − v_L)), m' = (m_∞(v) − m)/τ_m(v), n' = (n_∞(v) − n)/τ_n(v), h' = (h_∞(v) − h)/τ_h(v).
- "Unfortunately, it is not clear that our results apply to the original HODGKIN-HUXLEY system. Our approach is to give a set of hypotheses on the various parameters which is as broad and unrestrictive as possible, consonant with obtaining the desired solution. The question of whether the HODGKIN-HUXLEY equations satisfy these hypotheses is left unanswered, though a number of remarks are made in this direction."
- Section II: "It is necessary to assume that the variables n and h change slowly with respect to v, v' and m. ... it is particularly this assumption which cannot be checked, since we have no estimate of what "slowly" means. Hence we multiply the expressions for n' and h' in (4) by ε > 0; our results will then be stated and proved for ε "sufficiently small", when τ_n and τ_h are given."
- Also: "The particular parameters and coefficient functions used by HODGKIN and HUXLEY appear, on the basis of numerical calculations, to be such that the system (3)-(4) has a unique equilibrium point".
- Also: "Their existence [homoclinic orbits] has been demonstrated for the FITZHUGH-NAGUMO nerve model by G. CARPENTER [1] and by the author [4]. In addition, CARPENTER [1] has given results for systems like (1)-(2)." Here [1] is Carpenter's 1974 Wisconsin PhD thesis, "Travelling wave solutions of nerve impulse equations", per the Springer reference list.

**Summary of what Hastings proved.** The system is a general class of the Hodgkin-Huxley form, with abstract hypotheses on g_K, g_Na, m_∞, n_∞, h_∞ and the τ's. The n' and h' equations are multiplied by ε, and the pulse exists for ε sufficiently small. By the author's own statement, the result is not known to apply to the original HH system.

**Secondary descriptions of the same paper** (SECONDHAND, taken from Semantic Scholar citation contexts, not from reading the full papers):
- Ikeda, Mimura and Tsujikawa, Japan J. Appl. Math. 6 (1989) 1-66, doi 10.1007/BF03167914: "Hastings [13] and Carpenter [1], [2], [3] introduce artificial small parameters e and 6 [= ε and δ] into (1.1) (Hastings does not assume that 6 is small)". Also: "we reconstruct the fast 1-pulse traveling wave solution which was already proven by Hastings [13] and Carpenter [1]."
- R. E. Turner, "Traveling Waves in Neural Models", J. Math. Fluid Mech. 7 (2005) S289-S298: "Such a result seems out of reach for the full Hodgkin–Huxley model, though Hastings [3], after introducing a multiplicative parameter ε on the right side of the equations for h and m showed the existence of a traveling wave ... for sufficiently small ε." (Turner writes "h and m". The primary text says n and h.)
- W. C. Troy, "Large amplitude periodic solutions of a system of equations derived from the Hodgkin-Huxley equations", Arch. Rational Mech. Anal. 65 (1977) 227-247: "Hence n and h change slowly respect to v and m. Therefore, following HASTINGS [4], we replace ..." and "The next three assumptions are exactly those given in [4]". This is consistent with the primary p. 230.

---

## (B) Carpenter 1977

**Citation, verified** (Crossref, zbMATH 0341.35007, MRef MR442379, and the author's own publication list at techlab.bu.edu):
G. A. Carpenter, "A geometric approach to singular perturbation problems with applications to nerve impulse equations", J. Differential Equations 23 (1977), no. 3, 335-367. DOI 10.1016/0022-0396(77)90116-4 (the guess was correct).

Companion papers: "Periodic solutions of nerve impulse equations", J. Math. Anal. Appl. 58 (1977) 152-173, doi 10.1016/0022-247X(77)90235-9 (zbMATH 0353.35058); "Nerve impulse equations", Lecture Notes in Math. 525 (1976) 58-76, doi 10.1007/BFb0077843 (zbMATH 0364.92015). The Arioli-Koch preprint cites Carpenter's JDE paper with pages 152-173, which are the pages of the JMAA paper. That is a citation slip in their preprint.

**What I read:**
- JDE 1977 itself: NOT READ. ScienceDirect returned 403. The CORE mirror (core.ac.uk/download/82381615.pdf) is listed but returned 404. Unpaywall has no open copy. The zbMATH record carries no review. The MathSciNet review is not reachable.
- SELF-REPORT, PRIMARY text of Carpenter, "Bursting phenomena in excitable membranes", SIAM J. Appl. Math. 36 (1979) 334-372, from the author's own copy (techlab.bu.edu/members/gail/articles/007_1979_Bursts_SIAMJApplMath.pdf). I checked the p. 338 image.
  - p. 336: "The results presented in this paper continue the analysis begin[sic] in [2], [3], [4], where we prove the existence of single pulse and periodic solutions; elongated plateau solutions; and finite wave train solutions for the generalized Hodgkin-Huxley system (HH)." Here [2] is JDE 1977, [3] is JMAA 1977 and [4] is the 1974 thesis.
  - p. 336: "The model defined in § 2 contains three positive parameters, ε, δ, and θ. ε is the order of magnitude of the rate at which Na+ inactivation and K+ activation occur; δ^-1 is the order of magnitude of the rate at which Na+ activation occurs; and θ is the speed of wave propagation. Throughout, the existence of solutions is proved for ε and δ near zero." Also: "An open problem is to analyze the behavior, as ε and δ increase, of the families of solutions described in this paper for small ε and δ."
  - p. 336: "The existence of single pulse solutions of (HH) has also been proved by Hastings [10]".
  - p. 338, system (5): θṁ = δ^-1 γ_m(v)(m_∞(v) − m), θḣ = ε γ_h(v)(h_∞(v) − h), θṅ = ε γ_n(v)(n_∞(v) − n). Then: "We now introduce the fundamental hypothesis, which abstracts the essential properties from the original Hodgkin-Huxley system." Hypothesis 1 (A)-(G) follows. It includes C² smoothness and cubic-like shape conditions on G(v,n,h) = g(v, m_∞(v), h, n), shown in Fig. 3.
- PRIMARY, first two pages of the 1976 LNM chapter (Springer preview). It writes (HH) with "0 < γ_n, γ_h << γ_m". It then treats a general system (P): "whose subprocesses are described by ℓ "slow" and m "fast" equations", with ∂y/∂t = ε h(V,y,z) and ∂z/∂t = δ^-1 q(V,y,z).
- SECONDHAND descriptions of the method: Carter and Sandstede (J. Nonlinear Sci. 2016) and Hupkes and Sandstede (2010, 2012) call it the Conley index approach. Sato (Japan J. Appl. Math. 1990) says Carpenter and Hastings "proved the existence of homoclinic and heteroclinic solutions of (FN)' essentially by shooting methods". Czechowski and Zgliczynski (arXiv:1909.06207) say "the authors employed sequences of isolating blocks to track the solutions". Hupkes and Sandstede (TAMS 2012) appear to swap which method belongs to whom between their two sentences.

**Summary of what Carpenter proved.** The system is a generalized HH class, defined by abstract hypotheses modelled on HH. Na activation is sped up by δ^-1, Na inactivation and K activation are slowed by ε, and existence is proved for ε and δ near zero. Carpenter's own words describe it as a singular-limit result. I found nothing indicating that the result covers ε = δ = 1 at the 1952 rate functions.

---

## (C) Secondary sources and related results

- **Ikeda, Mimura, Tsujikawa**, "Slow traveling wave solutions to the Hodgkin-Huxley equations", in Recent Topics in Nonlinear PDE III, North-Holland Math. Studies / Lect. Notes Numer. Appl. Anal. 9 (1987) 1-73, doi 10.1016/S0304-0208(08)72327-2 (zbMATH 0653.35041). The zbMATH review by R. L. Taylor (SECONDHAND) writes the system with n_t = ε²γ_n(v)(n_∞(v) − n), with h and m unscaled as printed in the review, and "The small parameter ε has been introduced in order to study fast and slow time scales. They then prove existence and instability of a traveling wave moving with slow velocity, under appropriate assumptions on the nonlinearities." So this is again a singular-perturbation result under abstract assumptions, for the slow pulse.
- **Ikeda, Mimura, Tsujikawa**, Japan J. Appl. Math. 6 (1989) 1-66, doi 10.1007/BF03167914 (zbMATH 0678.92007). Abstract (PRIMARY, Springer page): "By singular perturbation methods, we construct a homoclinic orbit of the resulting system for some c*, which tends to the resting state as z→±∞." It uses artificial small parameters, as in the context quoted in (A).
- **C. B. Muratov**, Biophys. J. 79 (2000) 2893, arXiv:nlin/0209053 (PRIMARY, arXiv text). The paper is an approximation scheme, not a proof. It notes that the conventional analyses assume m is the fastest variable, and that "if one assumes that m is the fastest variable (FitzHugh, 1961; Casten et al., 1975; Carpenter, 1977; Carpenter, 1979) and calculates the speed of the traveling wave, one will get the value which is an order of magnitude greater than the actual value." It argues that V, not m, is the fastest variable at HH parameters. This matters for us: the singular limits of Hastings and Carpenter do not describe the actual 1952 regime well.
- **Keener and Sneyd**, Mathematical Physiology, Sect. 9.4.2: not re-read here. The ledger entry of 2026-09-25 (RESEARCH.md) records that they credit existence to Hastings and Carpenter for modified systems. SECONDHAND.
- **Arioli and Koch**, "Existence and stability of traveling pulse solutions of the FitzHugh-Nagumo equation", Nonlinear Anal. 113 (2015) 51-70, doi 10.1016/j.na.2014.09.023 (zbMATH 1304.35181). Verified. I read the preprint at web.ma.utexas.edu/users/koch/papers/fhn.pdf. Its parameters are ε = 1/100, γ = 5, a = 1/10, for FitzHugh-Nagumo only. Theorem 1.2: pulse on R × R with "velocity c = 0.470336270 . . ." that is real analytic and exponentially stable. Theorem 1.1 (circle of length 128): c = 0.470336308... It is computer-assisted: "based in part on estimates that have been carried out by computer". Abstract: "Our method is non-perturbative and should apply to a wide range of other parameter values." The paper makes no mention of Hodgkin-Huxley. Precedent: Ambrosi, Arioli and Koch, SIAM J. Appl. Dyn. Syst. 11 (2012) 1533-1542 (a homoclinic for a modified FHN on a contractile substratum).
- **Other rigorous or computer-assisted work near this question, all FitzHugh-Nagumo:** Czechowski and Zgliczynski, SIAM J. Appl. Dyn. Syst. 15 (2016) 1615-1655 (arXiv:1502.02451; periodic orbits for an explicit ε range); Czechowski, arXiv:1909.06207 (thesis; FHN periodic orbits and homoclinics, explicit ε ranges); Matsue, TMNA 2016 (topological shadowing, fast-slow). I checked the 83 papers citing Arioli-Koch (Semantic Scholar titles). None treats a Hodgkin-Huxley or conductance-based travelling wave.
- **Lead worth checking, not read:** Du and Hassard, "Precise computation of Hopf bifurcation and two applications", Dyn. Contin. Discrete Impuls. Syst. Ser. A 8 (2001) 495-518 (zbMATH 1002.37041). The zbMATH review: "The defining equations are solved using interval arithmetic. ... The algorithm is applied to ... the Hodgkin-Huxley nerve conduction model." This is about Hopf points, not pulses. It may contradict the RESEARCH.md line of 2026-09-25, "Computer-assisted proofs for Hodgkin-Huxley (subcritical Hopf ...): none found". Someone should read it before any Hopf priority claim.
- **Other HH travelling-wave items found and not read:** Foote and Chen, "Traveling wave properties of the Hodgkin-Huxley equations", Chin. J. Math. 9 (1981) 1-23 (zbMATH 0472.35048; no review, abstract not seen). Labouriau and Pinto (LMS Lecture Note 380, 2010), on the geometry of the Hopf and saddle-node sets of the travelling-wave ODE for a class extending HH (not existence of a pulse). Carpenter (q-bio/0506005), on asymptotic pulses in myelinated (discrete) HH. The Foote-Chen paper is the one item whose content I could not classify from its title. It is worth a library request.

---

## (D) Search log

"hits" is the engine's total where it reports one. In the relevant-hits column, "none" means no hit claims existence of an HH pulse at the 1952 rates, or a computer-assisted proof for any HH-type travelling wave.

| engine | exact query | hits | relevant hits |
|---|---|---|---|
| arXiv API (export.arxiv.org) | 24 queries of the form `abs:"Hodgkin-Huxley" AND abs:"traveling wave"` etc. | ERR | API returned HTTP 406 to every GET from this sandbox; switched to arxiv.org/search (abstract field) below |
| arXiv search, abstracts | `"Hodgkin-Huxley" "traveling wave"` | 2 | none (0905.0701, q-bio/0505031) |
| arXiv, abstracts | `"Hodgkin-Huxley" "travelling wave"` | 2 | none (same two) |
| arXiv, abstracts | `"Hodgkin Huxley" "traveling wave"` | 2 | none |
| arXiv, abstracts | `"Hodgkin-Huxley" "propagating action potential"` | 1 | none (1908.05086) |
| arXiv, abstracts | `"Hodgkin-Huxley" "traveling pulse"` | 2 | nlin/0209053 (Muratov, approximation, not proof); 1709.09132 (FHN) |
| arXiv, abstracts | `"Hodgkin-Huxley" "travelling pulse"` | 2 | same |
| arXiv, abstracts | `"Hodgkin-Huxley" "computer-assisted"` | 0 | |
| arXiv, abstracts | `"Hodgkin-Huxley" "computer assisted proof"` | 0 | |
| arXiv, abstracts | `"Hodgkin-Huxley" "rigorous numerics"` | 0 | |
| arXiv, abstracts | `"Hodgkin-Huxley" "validated numerics"` | 0 | |
| arXiv, abstracts | `"Hodgkin-Huxley" "interval arithmetic"` | 0 | |
| arXiv, abstracts | `"Hodgkin-Huxley" "existence proof"` | 0 | |
| arXiv, abstracts | `"Hodgkin-Huxley" homoclinic` | 1 | none (1109.5689, Hindmarsh-Rose) |
| arXiv, abstracts | `"Hodgkin-Huxley" rigorous pulse` | 0 | |
| arXiv, abstracts | `"Hodgkin-Huxley" cable equation traveling` | 0 | |
| arXiv, abstracts | `"Hodgkin-Huxley" "travelling waves"` | 2 | none |
| arXiv, abstracts | `"Hodgkin-Huxley" "traveling waves"` | ERR 429 | not completed |
| arXiv, abstracts | `"Hodgkin-Huxley" "wave speed"` | 0 | |
| arXiv, abstracts | `"Hodgkin-Huxley" "propagation failure"` | 2 | none (1502.04295 stochastic; q-bio/0506005 myelinated asymptotics) |
| arXiv, abstracts | `"Hodgkin-Huxley" "slow pulse"` | 0 | |
| arXiv, abstracts | `"Hodgkin-Huxley" temperature propagation` | 5 | none |
| arXiv, abstracts | `"Hodgkin-Huxley" "conduction velocity"` | 2 | none |
| arXiv, all fields | `"Hodgkin-Huxley" "computer-assisted"` | 0 | |
| arXiv, all fields | `"Hodgkin-Huxley" "traveling wave"` | 3 | nlin/0209053 only |
| arXiv, all fields | `"Hodgkin-Huxley" "rigorous"` | 6 | none (networks, stochastic, mean field) |
| arXiv, all fields | `"Hodgkin-Huxley" "cable equation"` | 5 | none |
| arXiv, abstracts | `"Morris-Lecar" "traveling wave"` | 4 | none |
| arXiv, abstracts | `"Morris-Lecar" "computer-assisted"` | 0 | |
| arXiv, abstracts | `"conductance-based" "computer-assisted"` | 0 | |
| arXiv, abstracts | `"traveling pulse" "computer-assisted"` | 0 | |
| arXiv, abstracts | `"travelling pulse" "computer-assisted"` | 0 | |
| arXiv, abstracts | `"nerve" "computer-assisted proof"` | 0 | |
| arXiv, abstracts | `"action potential" "computer-assisted proof"` | 0 | |
| arXiv, abstracts (positive control) | `"FitzHugh-Nagumo" "computer-assisted"` | 4 | 1502.02451, 1909.06207 (FHN), 2202.13326, 2211.16445 |
| arXiv, abstracts (control) | `"FitzHugh-Nagumo" "rigorous numerics"` | 3 | 1909.06207 |
| PubMed esearch | `"Hodgkin-Huxley"[tiab] AND ("traveling wave"[tiab] OR "travelling wave"[tiab])` | 11 | none (Muratov 2000 PMID 11106597; Lindsay et al. 2004 PMID 15275998 on the speed discrepancy) |
| PubMed | `"Hodgkin-Huxley"[tiab] AND ("traveling pulse"[tiab] OR "travelling pulse"[tiab])` | 1 | Muratov 2000 (not a proof) |
| PubMed | `"Hodgkin-Huxley"[tiab] AND "propagating action potential"[tiab]` | 1 | none |
| PubMed | `"Hodgkin-Huxley"[tiab] AND ("computer-assisted proof"[tiab] OR "computer assisted proof"[tiab])` | 0 | |
| PubMed | `"Hodgkin-Huxley"[tiab] AND "rigorous numerics"[tiab]` | 0 | |
| PubMed | `"Hodgkin-Huxley"[tiab] AND "interval arithmetic"[tiab]` | 0 | |
| PubMed | `"Hodgkin-Huxley"[tiab] AND "validated numerics"[tiab]` | 0 | |
| PubMed | `"Hodgkin-Huxley"[tiab] AND "existence proof"[tiab]` | 0 | |
| PubMed | `"Hodgkin-Huxley"[tiab] AND homoclinic[tiab]` | 2 | none (Feudel 2000; Rush-Rinzel 1995) |
| PubMed | `"Hodgkin-Huxley"[tiab] AND (traveling[tiab] OR travelling[tiab]) AND (existence[tiab] OR proof[tiab])` | 2 | none |
| zbMATH API | `ti:Hodgkin-Huxley & ti:wave` | 10 | Hastings 1976; Ikeda et al. 1987, 1989; Foote-Chen 1981 (unread) |
| zbMATH | `ti:Hodgkin-Huxley & (ti:travelling \| ti:traveling)` | 5 | the same four, plus 0947.35093 (modified HH-type model, exact solutions) |
| zbMATH | `Hodgkin-Huxley & (travelling \| traveling) & (wave \| pulse)` | 45 | none new beyond the above (scanned all 45 titles) |
| zbMATH | `Hodgkin-Huxley & computer-assisted` | 0 (API returned no result set) | |
| zbMATH | `Hodgkin-Huxley & "computer assisted"` | 0 | |
| zbMATH | `Hodgkin-Huxley & "rigorous numerics"` | 0 | |
| zbMATH | `Hodgkin-Huxley & "interval arithmetic"` | 1 | Du-Hassard 2001 (Hopf, interval arithmetic; see (C)) |
| zbMATH | `Hodgkin-Huxley & "validated numerics"` | 0 | |
| zbMATH | `Hodgkin-Huxley & homoclinic` | 14 | none new |
| zbMATH | `Hodgkin-Huxley & "propagating action potential"` | 0 | |
| zbMATH (positive control) | `FitzHugh-Nagumo & computer-assisted` | 10 | Arioli-Koch 2015; Ambrosi-Arioli-Koch 2012; Czechowski-Zgliczynski 2016; 1909.06207 |
| zbMATH | `ti:"slow traveling wave"` | 2 | Ikeda et al. 1987 |
| Semantic Scholar search | `computer-assisted proof traveling pulse nerve` | 133 | Arioli-Koch 2015 only (top 15 read) |
| Semantic Scholar search | `Hodgkin-Huxley validated numerics` | 1038 | none in top 20 (relevance search, loose) |
| Semantic Scholar search | 8 more HH queries (see ss.txt) | ERR 429 | rate limited after three retries; not completed |
| Semantic Scholar citations | citers of Hastings 1976 (67) and Carpenter 1977 (219) with contexts; titles scanned for computer, rigorous, interval, validated, proof | 67 / 219 | no computer-assisted HH result; contexts quoted in (A), (C) |
| Semantic Scholar citations | citers of Arioli-Koch 2015 | 83 | none on HH or conductance-based waves |
| Semantic Scholar citations | citers of Huxley 1959 | 312 | used for (G) |
| Crossref (query.bibliographic, top 10 read) | `Hodgkin-Huxley traveling wave computer-assisted proof`; `Hodgkin-Huxley travelling wave rigorous existence`; `Hodgkin-Huxley propagating action potential existence proof`; `Hodgkin-Huxley interval arithmetic`; `Hodgkin-Huxley homoclinic traveling wave` | totals meaningless (OR-matching, 10^5 to 10^6) | none new |
| WebSearch | `"computer-assisted proof" "Hodgkin-Huxley"` | n/a | none |
| WebSearch | `existence of traveling pulse for the full Hodgkin-Huxley equations remains open rigorous proof` | n/a | none |
| WebSearch | `rigorous numerics traveling pulse conductance-based neuron model homoclinic orbit validated computation Morris-Lecar OR Hodgkin-Huxley` | n/a | none |
| OpenAlex | citers of Arioli-Koch | ERR | free daily budget exhausted |
| MathSciNet | MRef lookups only | n/a | Hastings MR402302, Carpenter MR442379; reviews not reachable |
| Google Scholar, Google Books | not reachable (Books API quota exceeded); Scholar not tried | | |

---

## (E) Hodgkin and Huxley 1952 numbers

Source: Hodgkin and Huxley, J. Physiol. 117 (1952) 500-544. I read these pages from a scanned copy at web.njit.edu/~matveev/Courses/M430_635_F15/HodgkinHuxley_JPhysiol-1952.pdf ("Downloaded from jp.physoc.org ... January 29, 2008"), checking the page images. PMC1392413 and Europe PMC refused the download. All items below are PRIMARY.

- p. 522, eq. (28): I = (a/2R₂) ∂²V/∂x², "where I is the membrane current density, a is the radius of the fibre and R₂ is the specific resistance of the axoplasm". Eq. (30): (a/2R₂θ²) d²V/dt² = C_M dV/dt + ḡ_K n⁴(V − V_K) + ḡ_Na m³h(V − V_Na) + ḡ_l(V − V_l). Shooting: "It is then found that V goes off towards either +∞ or −∞, according as the guessed θ was too small or too large."
- p. 523: "The solutions which go towards ±∞ correspond to action potentials travelling slower than normal under a travelling anode or faster than normal under a travelling cathode."
- p. 523, Temperature differences: "the direct method would be to multiply all α's and β's by a factor φ = 3^((T′−6.3)/10), this being correct for a Q₁₀ of 3." They instead computed "at 6.3° C with a membrane capacity of φC_M µF/cm², the unit of time being 1/φ msec."
- p. 524: "Introducing a quantity K = 2R₂θ²C_M/a, this becomes" eq. (31): d²V/dt² = K{dV/dt + (1/C_M)[ḡ_K n⁴(V − V_K) + ḡ_Na m³h(V − V_Na) + ḡ_l(V − V_l)]}.
- p. 528: "The value of the constant K that was found to be needed in the equation for the propagated action potential (eqn. 31) was 10·47 msec⁻¹." Fig. 15 caption: "solution of eqn. (31) calculated for K of 10·47 msec⁻¹ and temperature of 18·5° C."
- p. 528, eq. (34): θ = √(Ka/2R₂C_M). "The propagated action potential was calculated for the temperature at which the record C of Fig. 15 was obtained, and with the value of C_M (1·0µF/cm²) that was measured on the fibre from which that record was made. ... The values of a and R₂ were 238µ and 35·4 Ω. cm respectively. Hence the calculated conduction velocity is (10470 × 0·0238/2 × 35·4 × 10⁻⁶)^½ cm/sec = 18·8 m/sec. The velocity found experimentally in this fibre was 21·2 m/sec."
- All numbers asked about are confirmed: 18.8 m/s calculated, 21.2 m/s measured, 18.5 °C, a = 238 µm (radius), R₂ = 35.4 Ω cm, K = 10.47 ms⁻¹, C_M = 1.0 µF/cm², φ = 3^((T−6.3)/10).
- My own arithmetic, not from a source: K = 10.47 gives θ = 18.761 m/s, and the printed rounding K in [10.465, 10.475] gives θ in [18.756, 18.765] m/s. Our 18.73 m/s corresponds to K = 10.436. That is 0.3 % below Hodgkin and Huxley's K, which was hand-computed with the 1952 E_l = 10.613. The ledger of 2026-09-26 notes that 10.613 does not make the resting current exactly zero.

---

## (G) Huxley 1959: the slow unstable wave and the temperature limit

**Citation, verified** (Crossref): A. F. Huxley, "Ion movements during nerve activity", Ann. N.Y. Acad. Sci. 81 (1959), no. 2, 221-246, doi 10.1111/j.1749-6632.1959.tb49311.x. **NOT READ**: Wiley served a Cloudflare challenge (403), and no open copy was found. A companion abstract is cited by Huxley himself as "A. F. Huxley, J. Physiol. (London), 148 (1959) 80P" (ref. 13 of the Nobel lecture). Phillipson and Schuster (see below) call it "Huxley 1959b", and it is the likely source for the subthreshold wave. It was not found on Crossref and I did not read it.

**Huxley's own later account (PRIMARY):** A. F. Huxley, Nobel Lecture, 11 December 1963, "The quantitative analysis of excitation and conduction in nerve" (nobelprize.org/uploads/2018/06/huxley-lecture.pdf), printed pp. 66-68.
- Temperature, p. 66: "Later, we calculated the propagated action potentials corresponding to various temperatures. It was assumed that the only effect of altered temperature was to change the rates of the permeability factors with a Q10 of 3". The Fig. 16 caption, p. 67, as legible on the scan (its left margin is cut): "Effect of temperature on the propagated action potential. Above: records by [Ho]dgkin and Katz from a real axon; (A) 32.5°C, (B) 18.5°C, (C) 5°C. Below: com[pute]d. In both the real and the computed case, conduction failed at a temperature slightly above the highest shown in this figure. From refs. 9 and 12." The computed curves are labelled 6.3°, 18.5° and 28.9°, with peaks of about 100+, about 90 and about 65 mV. Read literally, the computed conduction failed slightly above 28.9 °C. The caption gives no failure temperature beyond that. The refs are 9 = Huxley 1959 Ann. N.Y. Acad. Sci. and 12 = Hodgkin and Katz, J. Physiol. 109 (1949) 240.
- Slow wave, pp. 67-68: "the equations lead to solutions representing a wave, or even a series of waves, of just threshold amplitude, travelling along the fibre at much lower velocity than the normal spikes [scan: "spikers"]." The preceding sentence says these situations "are so unstable that it may well be impossible to realise them in practice even if they are possible in principle."

**Later numerical work:**
- Cooley and Dodge, "Digital computer solutions for excitation and propagation of the nerve impulse", Biophys. J. 6 (1966) 583-599, PMC1368016. Abstract (PRIMARY, PMC page): "Other computations show that a highly unstable subthreshold propagating wave is initiated in principle by a just threshold stimulus; that the stability of the subthreshold wave can be enhanced by reducing the excitability of the axon as with an anesthetic agent". The abstract also says the temperature dependence of threshold was computed. It gives no failure temperature in the abstract. Full text NOT READ (the PMC PDF sits behind a proof-of-work gate).
- Miller and Rinzel, "The dependence of impulse propagation speed on firing frequency, dispersion, for the Hodgkin-Huxley model", Biophys. J. 34 (1981) 227-259, PMC1327469. Abstract (PRIMARY): "For each frequency, omega, below some maximum frequency, omega max, we find two such solutions, one fast and one slow. The latter are likely unstable as a computational example illustrates. The solitary pulse is obtained in the limit as omega tends to zero." In-text sentence (SECONDHAND, from the Semantic Scholar citation context of Huxley 1959; I did not see the page): "Presumably as the temperature increases, these amplitude curves become narrower, the amplitudes of the slow low frequency wavetrains approaching those of the corresponding fast wavetrains until such impulse propagation fails entirely at 38°C (23)." The context is attributed to their ref. 23, which Semantic Scholar links to Huxley 1959. 38 °C disagrees with the other values below, so it should be checked on the page before use.
- Muratov, arXiv:nlin/0209053 (PRIMARY text): "up to the temperatures T ∼ 30° C at which the pulses fail to propagate in the HH model (Huxley, 1959)". He uses a = 238 µm, ρ = 35.4 Ω cm, C = 1 µF/cm² and V_l = 10.5989 mV. His Fig. 4 (PRIMARY, read off the plot, so approximate) shows the numerical HH speed rising to about 23 m/s near 30 °C, then turning down and ending at about 32 to 33 °C. That agrees with our fold between 32 and 34 °C. His text's "∼30" is a round figure.
- Phillipson and Schuster, Int. J. Bifurcation Chaos 15 (2005) 3851-3866, doi 10.1142/S0218127405014349. SECONDHAND (Semantic Scholar contexts only): "Huxley showed that at a given temperature (below a critical value of Tcr ≈ 33.7 °C, or Tcr ≈ 33.5 °C in the original pioneering work [Huxley, 1959a]) there is a single pulse solution at a unique value of c". Also: "The pulse train was originally reported by Huxley [1959b] who considered this as an unstable subthreshold wave probably outside of the range of experimental detection." Their companion paper, IJBC 16 (2006) 3605-3616, says "lower speed pulse train solutions [Huxley, 1959b; FitzHugh, 1969]".
- Other secondhand figures for the HH maximum temperature, all attributed to Huxley 1959: "about 35" (a 1982 cockroach-mechanoreceptor paper) and "38 °C" (a 2024 retinal review, which may describe experiment rather than the model). These are unreliable.
- Ikeda, Mimura and Tsujikawa (1987) prove existence and instability of a slow pulse, but for their ε-modified system (see (C)).

**Against our numerics** (fast pulse 18.73 m/s at 18.5 °C and 12.31 m/s at 6.3 °C; the fast-pulse sign switches vanish between 32 and 34 °C):
- 18.5 °C: consistent with HH's 18.8 (the implied 18.76, see (E)).
- 6.3 °C: I found no primary number to compare. Muratov's Fig. 4 near 6 °C reads roughly 10 to 12 m/s. The plot is too coarse to check further.
- Failure temperature: Phillipson and Schuster (secondhand) give Tcr about 33.7, or about 33.5 attributed to Huxley 1959, and Muratov's plot ends at about 32.5. Both fall in our 32 to 34 °C window. Huxley's own Nobel caption, read literally, puts computed failure "slightly above" 28.9 °C. Miller and Rinzel's in-text 38 °C (secondhand) is an outlier. These cannot all be the same quantity at the same parameters. The fibre constants, the leak E_l and whether "failure" means the fold or a simulation failing to propagate may differ. Only Huxley 1959 itself can settle it.
- On our lower switch being a front to a small-amplitude oscillation, not a slow pulse: I found no source that addresses this directly. Huxley (Nobel) and Cooley-Dodge describe the slow solution as a just-threshold, subthreshold-amplitude wave, "or even a series of waves". Miller and Rinzel describe slow wave trains whose amplitude approaches the fast ones as temperature rises. None of what I read establishes that a slow solitary pulse of the full HH cable equation at the 1952 rates exists as a homoclinic orbit. The one existence proof, Ikeda et al. 1987, is for the ε-modified system.

---

## (F) Conclusion

**No proof, with or without computer assistance, of the existence of the travelling pulse (a homoclinic orbit of the 5D travelling-wave ODE) of the unmodified Hodgkin-Huxley cable equation at the 1952 rate functions and constants was found in the literature reached.**

- Hastings 1976 (PRIMARY, p. 230) proves existence for a hypothesis class with the n and h equations multiplied by a small ε. He states that "it is not clear that our results apply to the original HODGKIN-HUXLEY system" and leaves open whether the HH equations satisfy his hypotheses.
- Carpenter 1977 (SELF-REPORT in Carpenter 1979, PRIMARY) proves existence for a "generalized Hodgkin-Huxley system" under abstract hypotheses, with ε slowing n and h and δ⁻¹ speeding m, "for ε and δ near zero". She states that the behaviour as ε and δ increase is an open problem. I did not read the JDE paper itself.
- Ikeda, Mimura and Tsujikawa (1987, 1989) also use artificial small parameters (secondhand and abstract).
- Every computer-assisted pulse proof found is for FitzHugh-Nagumo: Arioli-Koch 2015 at ε = 0.01, plus Czechowski-Zgliczynski for periodic orbits and homoclinics at explicit ε ranges. Searches of arXiv, PubMed, zbMATH, the Semantic Scholar citation graphs of Hastings, Carpenter, Arioli-Koch and Huxley 1959, and the web turned up no computer-assisted or interval-arithmetic travelling-wave result for HH or any conductance-based model.
- Turner (2005, secondhand) calls such a result "out of reach for the full Hodgkin–Huxley model". Muratov (2000) argues that the singular limits used by Hastings and Carpenter misdescribe the actual HH regime, with speeds wrong by an order of magnitude.

**Confidence:** fairly high (about 85 %) that no such proof was published by 2026-09. The main residual risks:
1. The body of Hastings 1976 (pp. 231-257), where his "remarks" on whether HH satisfies the hypotheses may go further than p. 230 suggests. The introduction rules out a claim for the original system.
2. Carpenter 1977 JDE itself, not read.
3. Foote and Chen, Chin. J. Math. 9 (1981) 1-23, whose content I could not see.
4. Non-indexed venues (theses, Japanese proceedings) and the Semantic Scholar searches that were rate limited.
5. Google Scholar was not reachable.

**Not reached:** the Hastings 1976 body; Carpenter JDE 1977; the MathSciNet reviews MR402302 and MR442379; Huxley 1959 (Ann. N.Y. Acad. Sci.) and Huxley 1959 J. Physiol. 148, 80P; the full texts of Miller-Rinzel 1981 and Cooley-Dodge 1966 (PMC proof-of-work gate, not bypassed); Phillipson-Schuster 2005 and 2006; Keener-Sneyd (not re-read); Foote-Chen 1981; Du-Hassard 2001.

**Recommendation for the ledger:** before any priority claim, obtain Hastings 1976 pp. 231-257 (especially whatever section discusses whether HH satisfies the hypotheses), Carpenter 1977 and Foote-Chen 1981 through a library. Also flag Du-Hassard 2001 against the existing RESEARCH.md line on Hopf computer-assisted proofs.
