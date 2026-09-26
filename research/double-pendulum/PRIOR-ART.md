# Prior-art search: is chaos or non-integrability of the classical planar double pendulum PROVED at m1 = m2, l1 = l2?

Date of all searches: 2026-09-26. Searcher: research subagent. No repository file was modified.

Question: a rigorous (possibly computer-assisted) proof of chaos (horseshoe, symbolic dynamics, positive
topological entropy, transversal homoclinic orbit) or of non-integrability (Morales-Ramis, Ziglin, Kozlov;
no additional analytic or meromorphic first integral) for the planar mathematical double pendulum with two
point masses, m1 = m2, l1 = l2, uniform gravity, no friction or forcing, at some energy.

## Verdict

**UNCLEAR, leaning NO for a proof at exactly the classical equal-mass, equal-length point mass parameters.**

Every rigorous result found is either perturbative in a small parameter that is NOT small at
m1 = m2, l1 = l2 (Dullin 1994; Burov 1986; Ivanov 1999-2001; Moauro-Negrini 1998; Tabanov 1999), is numerical
without a rigorous enclosure (Salnikov 2013; Ivanov I 1999; Kaheman et al. 2022; Stachowiak-Okada 2006), or
covers a modified system (restricted double pendula 2015; variable-length double pendulum 2025).
The Szuminski group states in 2015 and again in 2025/2026 that a non-integrability proof for the classical
double pendulum is missing.

The one item that could not be resolved: **Bolotin and Negrini, "A variational criterion for nonintegrability",
Russ. J. Math. Phys. 5 (1997) 415-436 (Zbl 0951.37029)**, which proves non-integrability "of a double
pendulum in a certain domain of parameters", and which Moauro-Negrini (1998) describe as covering "energy
values close to the maximum of the potential energy". Its full text was NOT reached, so whether its parameter
domain contains m1 = m2, l1 = l2 (point masses) is unknown. This paper must be read before any claim of
novelty. Note that neither Stachowiak-Szuminski 2015 nor Szuminski-Kapitaniak 2025 cites it (their
"missing proof" statements are made in the Morales-Ramis / meromorphic framework).

Partial results that DO sit at classical parameters but are not a full answer:
- Salnikov (arXiv:1303.4904, 2013, v2 2016): numerical monodromy matrices at m = l = 1, claims meromorphic
  non-integrability "with a controlled precision", not interval arithmetic, not a refereed journal paper (as
  far as found), and the note itself calls it a demonstration that a computer-assisted proof "is possible".
- Sumbatov (PMM 46 (1982) 13-19), cited by Burov 1986 as ref. [2]: no additional integral quadratic (hence
  none linear) in the momenta for the mathematical double pendulum with arbitrary links. Only low-degree
  polynomial integrals are excluded; this is not analytic non-integrability. (Read only through Burov's
  sentence; Sumbatov's paper not opened.)

## Queries

### arXiv (arxiv.org/search HTML, searchtype=all, i.e. metadata incl. abstracts; export.arxiv.org API returned HTTP 406 through the proxy)

| query | hits | relevant |
|---|---|---|
| `"double pendulum" integrability` | 34 | 2602.21123, 1303.4904, 2209.03724 (Ziegler, different system), 2104.13211 (gravity-free) |
| `"double pendulum" non-integrability` | 13 | 2602.21123, 1303.4904 |
| `"double pendulum" nonintegrability` | 0 | - |
| `"double pendulum" Morales-Ramis` | 1 | 2602.21123 |
| `"double pendulum" "differential Galois"` | 1 | 2602.21123 |
| `"double pendulum" Ziglin` | 0 | - |
| `"double pendulum" chaos proof` | 0 | - |
| `"double pendulum" horseshoe` | 0 | - |
| `"double pendulum" "topological entropy"` | 0 | - |
| `"double pendulum" homoclinic` | 1 | 2404.08478 (swing-up control, not relevant) |
| `"double pendulum" "computer-assisted"` | 0 | - |
| `"double pendulum" "computer assisted"` | 0 | - |
| `"double pendulum" "rigorous numerics"` | 0 | - |
| `"double pendulum" "interval arithmetic"` | 0 | - |
| `"double pendulum" CAPD` | 0 | - |
| `"double pendulum" "covering relations"` | 0 | - |
| `"double pendulum" chaos` | 11 | 2209.10132, 2403.07000, 2106.13518 (all numerical, see below) |
| `"double pendulum" chaotic` | 37 | 2609.05337, 2608.20276, 2312.13436, 2209.10132, 2403.07000 (numerical) |
| `"double pendulum" Melnikov` | 0 | - |
| `"double pendulum" proof` | 4 | none |
| `"triple pendulum" integrability` | 3 | 1211.6045 (flail triple pendulum, no gravity) |
| `"triple pendulum" non-integrability` | 3 | 1211.6045 |
| `"coupled pendula" integrability` | 2 | none |
| `"coupled pendula" non-integrability` | 2 | none |
| `"spherical double pendulum"` | 1 | none |
| `"double pendula"` | 2 | 1511.01850 (restricted double pendula) |
| `pendulum non-integrability` | 68 | 2602.21123, 1303.4904, 2406.02200 (double spring pendulum), 2608.09310, 2512.10682; none at classical DP |
| `pendulum nonintegrability` | 3 | none for DP |
| `pendulum "computer assisted proof"` | 1 | 0905.3924 (Wilczak-Zgliczynski, forced-damped pendulum) |
| `pendulum "computer-assisted proof"` | 1 | 0905.3924 |
| `pendulum horseshoe` | 3 | none |
| `pendulum "transversal homoclinic"` | 3 | none |
| `"double pendulum"` (all, scanned every title) | 149 | only those listed above; no rigorous chaos or non-integrability proof |
| `multibody chains circular orbit non-integrability` | 0 | - |
| `Burov pendulum integral` | 0 | - |

2015-2026 arXiv items relevant to the question (abstracts read): 2602.21123, 2209.10132, 2403.07000,
2312.13436, 2106.13518, 2608.20276, 2609.05337, 2111.14889, 1511.01850. None proves chaos or
non-integrability at the classical parameters.

### zbMATH Open (api.zbmath.org; the zbmath.org HTML search returned 403)

| query | hits | relevant |
|---|---|---|
| `ti:"double pendulum" & (chaos \| chaotic)` | 13 | Stachowiak-Okada 2006; Richter-Scholz 1984; Kaheman et al. (arXiv); all numerical |
| `ti:"double pendulum" & integrab*` | 1 | Salnikov arXiv:1303.4904 |
| `ti:"double pendulum" & (nonintegrab* \| non-integrab*)` | 0 | - |
| `ti:"double pendulum" & homoclinic` | 1 | Tabanov 1999, Zbl 0983.70534 (small mass of second pendulum) |
| `ti:"double pendulum" & (horseshoe \| "topological entropy" \| "computer assisted" \| "computer-assisted")` | 0 | - |
| `ti:"double mathematical pendulum"` | 10 | Ivanov I-IV (1999-2001); Gulyaev et al. 1996 (forced); Martynyuk-Nikitina 2000 |
| `ti:"two-link pendulum"` | 6 | none (control/stability) |
| `ti:"double pendula"` | 5 | Stachowiak-Szuminski 2015 |
| `ti:"double pendulum" & (separatri* \| Melnikov)` | 0 | (Dullin 1994 not indexed under this title search) |
| `ti:"triple pendulum" & integrab*` | 1 | Przybylska-Szuminski 2013 |
| `ti:"spherical double pendulum" \| ti:"double spherical pendulum"` | 4 | none on non-integrability |
| `ti:pendulum & ti:"computer assisted proof"` | 4 | Banhelyi-Csendes-Garay-Hatvani 2007/2008 and Wilczak-Zgliczynski 2009, all FORCED-DAMPED single pendulum |
| `au:Burov & ti:pendulum` | 6 | Burov 1986, Zbl 0626.70006 |
| `ti:"double pendulum" & ti:integral` | 0 | - |
| `ti:"heavy double pendulum"` | 0 | - |
| `ti:"double pendulum" & py:2015-2026` | 43 | all scanned; none rigorous chaos/non-integrability at classical parameters |
| `ti:pendulum & (ti:"non-integrability" \| ti:nonintegrability) & py:2015-2026` | 2 | none for DP |
| `au:Negrini & au:Bolotin` | 8 | Bolotin-Negrini 1997, Zbl 0951.37029 |
| `ti:"variational criterion" & nonintegrab*` | 1 | Bolotin-Negrini 1997 |
| `au:Moauro & au:Negrini` | 5 | Moauro-Negrini 1998 NOT indexed under this pair |
| `ti:"chaotic trajectories" & ti:pendulum` | 0 | - |

zbMATH reviews read (exact text):
- Zbl 0626.70006 (Burov 1986): "The non-existence of an analytic supplementary first integral in the phase
  variable that is independent of the energy integral is proved by the method of splitting the separatrices.
  The existence of certain classes of periodic solutions is proved by using Poincaré's theorem."
- Zbl 0951.37029 (Bolotin-Negrini 1997, reviewer Samir Musayev): "The authors use existence results obtained
  by variational methods to prove the nonintegrability of an analytic Lagrangian system with two degrees of
  freedom whose configuration space is a torus or a cylinder. As an application, the nonintegrability of a
  double pendulum in a certain domain of parameters is proved and possible applications to systems with
  singularities is discussed."
- Zbl 0983.70534 (Tabanov 1999): "We consider a Hamiltonian system for two connected pendulums in the case of
  small mass of the second oscillator. We are interested in a homoclinic orbit for such system, and present an
  equation for it."
- Zbl 0993.34036 (Ivanov III, 2000): "The author proves the nonintegrability of this system when the ratio of
  the pendulum masses is close to zero and the value of one of the other system parameters is close to zero or
  infinity."
- Zbl 1064.70019 (Ivanov IV, 2001, reviewer I. A. Taimanov): "...reduced double pendulum system which is
  obtained from the double pendulum in the limit when the ratio of pendulum masses tends to zero. For this
  system he finds some conditions on the ratio of the lengths of pendula and on the value of the energy under
  which the system has a hyperbolic periodic trajectory with transversally intersecting invariant manifolds.
  These conditions correspond to cases when the values of these two parameters are close to zero or infinity."
- Zbl 1098.70530 (Ivanov II, 2001): "...in the limit when the ratio of pendulum masses is close to zero and the
  ratio of pendulum lengths is close to infinity ... invariant manifolds intersect transversally and the
  intersections are exponentially small."
- Zbl 1001.70508 (Gulyaev et al. 1996): forced double pendulum, numerical period doubling. Not relevant.

### Citation searches

- OpenAlex `works?filter=cites:W4409546399` (Szuminski-Kapitaniak JSV 2025): 9 citing works; titles scanned
  (LCE pendulums, planetary dynamics, Lyapunov exponents via autodiff, coupled pendula arrays, gyroscopic
  Hamiltonian integrability, elliptic billiard, "Innovative nonlinear vibration analysis of a double pendulum
  two-degree-of-freedom system" 2026). None proves anything about the classical DP.
- Semantic Scholar citations of DOI 10.1016/j.jsv.2025.119099: 12 citing works (superset of the OpenAlex list
  plus arXiv 2608.09310 SAM with massive string, Nose-Hoover, Rossler C1 non-integrability, ABC flow). None
  relevant.
- Semantic Scholar citations of arXiv:1303.4904 (Salnikov): 2 citing works: "Some robust integrators for large
  time dynamics" (arXiv:1811.09114, 2018) and "Picard-Vessiot theory and integrability" (J. Geom. Phys. 2015).
  Neither re-proves the result. Note: Szuminski-Kapitaniak 2025 does NOT cite Salnikov (grep of the arXiv text).
- OpenAlex `filter=cites:W2000907661` (Dullin 1994): 22 citing works, titles scanned; none proves chaos or
  non-integrability at the classical parameters (restricted pendula, triple flail pendulum, Ziegler pendulum,
  robot manipulators, "Double pendulum and theta-divisor" (gravity-free, 2003)).
- mathnet.ru list of works citing Ivanov I (rcd898): Szuminski-Kapitaniak 2025; Konishi-Yanagita PRE 2023;
  Yurchenko et al. 2021; Stachowiak-Szuminski 2015; Przybylska-Szuminski 2013; Ivanov II 2001;
  Gelfreich-Lazutkin RMS 2001; Ivanov 2000 conference. None at classical parameters.
- OpenAlex text/title searches (`search=`, `title.search:`, `fulltext.search:` for "double pendulum" with
  integrability, non-integrability, chaos proof, homoclinic, horseshoe, computer-assisted, Melnikov,
  "topological entropy", "interval arithmetic", "covering relations"): ALL FAILED with HTTP 429 (rate limit)
  on 2026-09-26. Not reached. Semantic Scholar keyword search also 429. Google Scholar not used.

### Web searches (WebSearch tool)
- Dullin "Melnikov's method applied to the double pendulum" Z. Phys. B: found Springer page, author preprint.
- Ivanov "Study of the double mathematical pendulum": found mathnet pages for I, III, IV.
- Stachowiak Okada abstract: found (EconPapers).
- Burov Nechaev heavy double pendulum 2002 (English and Russian): istina.msu.ru entry, no abstract.
- Burov 1986 PMM: found; PMM archive gives the scanned Russian original.
- Kozlov theorem statements: found Kozlov 1983 RMS on mathnet (full text), Cresson math/0509547, Yagasaki 2106.04930, Oliva 1991 (Numdam).
- "variational criterion" nonintegrability double pendulum: led to Bolotin-Negrini 1997.
- "Chaotic trajectories of a double mathematical pendulum": Moauro-Negrini 1998 (PMM archive scan read).
- "A Homoclinic Orbit for the Double Pendulum": Tabanov 1999.

## Papers opened and what they say

### Szuminski and Kapitaniak, J. Sound Vib. 611 (2025) 119099, arXiv:2602.21123 (full arXiv text read)
- Abstract: "Additionally, this work represents a significant step toward proving the long-sought
  non-integrability of the classical double pendulum."
- Introduction, p. 3: "This requirement is precisely why a non-integrability proof for the classical double
  pendulum is still missing [em dash in the original] an explicit particular solution has yet to be found. However, in the proposed
  model, we can obtain a particular solution, and with the help of the four-dimensional Kovacic algorithm, we
  can establish the non-integrability of the variable-length double pendulum. This result brings us closer than
  ever to proving the non-integrability of the classical double pendulum." 
- Their reference [54] gives Dullin as "Z. Phys. B, 98:521-528, 1994"; Dullin's own publication list gives
  volume 93. They cite Dullin [54], Ivanov I [55], Stachowiak-Okada [11], Stachowiak-Szuminski [13]; they do
  not cite Salnikov, Burov, Bolotin-Negrini or Moauro-Negrini.

### Salnikov, arXiv:1303.4904 (v2, 31 Mar 2016), "Integrability of the double pendulum - the Ramis' question" (full text, 3 pages)
- Setting, p. 2: Lagrangian (1) with "all the masses as well as all the lengths of the constraints to be equal to
  1" (so exactly m1 = m2, l1 = l2; g kept symbolic, numerical value not stated).
- Method: numerically integrated particular solution from (alpha1, alpha2, alpha1', alpha2') = (0.1, -0.3, 0.2, 0.4)
  in complex time, loops around t1 = 0.5 + 0.9i and t2 = 0.5 - 0.9i "three times each", monodromy matrices M1, M2
  printed to 2 decimals. "One easily checks that these matrices do not commute, that shows meromorphic
  non-integrability."
- p. 3: "It is worth noting that all the computations are done with a controlled precision, so the result is
  certainly more than just a numerical evidence." Conclusion: "the (computer assisted) proof of non-integrability
  of the system describing the motion of a double pendulum is possible."
- Assessment: no interval arithmetic, no error bounds printed, the branch points are located numerically, and a
  non-commuting pair alone is not Ziglin's criterion as stated (which needs a non-resonant element); journal
  version not found. Not accepted by later authors as a proof (Stachowiak-Szuminski 2015 do not cite it and
  say no proof exists).

### Dullin, "Melnikov's method applied to the double pendulum", Z. Phys. B 93 (1994) 521-528 (author preprint dopePRELIM.pdf, maths.usyd.edu.au, read in full)
- Abstract: "Melnikov's method is applied to the planar double pendulum proving it to be a chaotic system."
- Section 2, p. 4: "The mathematical double pendulum studied in [4], with m1 = m2, a = s1 = s2, and
  Theta^c_1 = Theta^c_2 = 0, gives the parameter values (alpha, epsilon, gamma) = (2, 1, 2) not in P~. Using P
  this is mapped to (1/2, 1/2, 1/2) in P~."
- p. 6: "Melnikov's method is applicable in near-integrable cases, therefore we assume epsilon << 1." and "To
  keep the perturbation small we need to require epsilon << alpha."
- Section 5, p. 11: "Firstly, the perturbation parameter epsilon, i. e. the coupling of the two pendulums, must be
  small ... The second restriction is that the total energy h has to be close to h0 = 2".
- Conclusion, p. 13: "Being an analytic perturbation method, it can naturally give results close to an
  integrable case only."
- So at the classical parameters epsilon = 1/2 (after the exchange map), not small: the proof does not cover them.

### Stachowiak and Okada, Chaos Solitons Fractals 29 (2006) 417-422 (abstract via EconPapers; HAL copy hal-01389907 listed by zbMATH, not opened)
- Abstract: "We analyse the double pendulum system numerically, using a modified mid-point integrator. Poincaré
  sections and bifurcation diagrams are constructed for certain, characteristic values of energy. The largest
  Lyapunov characteristic exponents are also calculated. All three methods confirm the passing of the system from
  the regular low-energy limit into chaos as energy is increased." Numerical only.

### Stachowiak and Szuminski, "Non-integrability of restricted double pendula", Phys. Lett. A 379 (2015) 3017-3024, arXiv:1511.01850 (full text)
- Introduction, p. 1: "Until now, there is no closed mathematical proof confirming its non-integrability."
  and "Unfortunately, for the ordinary planar double pendulum we cannot find it [a non-equilibrium particular
  solution]".
- Conclusions, p. 12: "The classical double pendulum, both three- and two-dimensional, has no obvious solutions
  which could be used to explicitly linearize the equations of motion and allow for determination of the
  differential Galois group. Thus, despite the numerical evidence [11, 5] and theoretical [2, 3] work, a proof of
  Liouvillian non-integrability still eludes us." ([2] Burov-Nechaev 2002, [3] Dullin, [5] Ivanov I, [11]
  Stachowiak-Okada.)

### Kaheman, Bramburger, Kutz, Brunton, "Saddle transport and chaos in the double pendulum", arXiv:2209.10132 (Nonlinear Dyn. 2023) (full text)
- Theorem 5.1 is conditional on Hypotheses 1-3 (hyperbolic UPOs, finitely many transverse homoclinic or
  heteroclinic orbits). Section 5.2, p. 27: "Unlike the work [15, 52] on the PCR3BP that proves the existence of
  homoclinic orbits to the Lyapunov orbits about the index-1 saddles, the double pendulum lacks such proofs and so
  we rely on our numerical work in Section 4. ... Beyond this numerical existence, we also lack a proof of
  transversality of the orbits".

### Burov, "On the non-existence of a supplementary integral in the problem of a heavy two-link plane pendulum", PMM 50:1 (1986) 168-171 (J. Appl. Math. Mech. 50, 123-125) (Russian scan from pmm.ipmnet.ru, pages 1, 3, 4 read as images)
- Model: physical two-link pendulum with moments of inertia I1, I2, Hamiltonian (1.3).
- Section 2: small parameter eps1 >= 0 with l2 = L2 eps1 (distance from the second hinge to the second link's
  centre of mass); at eps1 = 0 the system is integrable (the second link rotates uniformly).
- p. 170, end of proof of Theorem 1 (my translation): for sufficiently small eps1 != 0 the separatrix branches
  split and intersect transversally, "and the system of equations of motion has no additional first integral
  analytic in the phase variables." Theorem 2 (case alpha = pi, m2 l = m1 l1): same for sufficiently small eps2
  (l = L0 eps2, l1 = L1 eps2).
- Introduction: cites Iliev (PMM 1970) for non-existence of a linear integral for two identical links, and
  Sumbatov (PMM 1982) for non-existence of a quadratic (hence linear) integral "when the planar mathematical
  pendulum is made of two arbitrary links".
- Conclusion: perturbative; does not cover the point-mass equal-mass, equal-length case.

### Moauro and Negrini, "Chaotic trajectories of a double mathematical pendulum", PMM 62:5 (1998) 892-895 (J. Appl. Math. Mech. 62 (1998) 827-830) (Russian scan, pages 1 and 4 read as images)
- Abstract (translated): "Non-integrability and existence of chaotic trajectories in the region of large energy
  are proved for the double mathematical pendulum under a certain restriction on the ratio of masses."
- p. 892 (translated): "Non-integrability of the double mathematical pendulum was proved [3] for energy values
  close to the maximum of the potential energy ... It is proved that for sufficiently small mass ratios and
  sufficiently large values of energy chaotic trajectories of the double pendulum exist. This result is obtained
  by an estimate of the Melnikov integral." [3] = Bolotin-Negrini 1997. "[6]" = Burov 1986: "under some
  assumptions the non-existence of an additional analytic first integral was proved for the physical double
  pendulum."
- p. 895 Theorem (translated): "For any l > 0 there exist mu(l) > 0 and an analytic function
  delta: (0, mu(l)) -> R, lim delta(mu) = 0, such that delta(mu) is a simple zero of the Melnikov integral."
  Then for sufficiently small eps (very large energy): transversal homoclinic point, Bernoulli shift on two
  symbols, no analytic first integral independent of energy. Requires mu small: does not cover mu = 1.

### Bolotin and Negrini, Russ. J. Math. Phys. 5:4 (1997) 415-436: NOT REACHED (only the zbMATH review above and Moauro-Negrini's description). Critical open item.

### Ivanov, Study of the double mathematical pendulum I-IV (RCD 1999, J. Phys. A 2001, RCD 2000, RCD 2001) (mathnet abstracts; full texts not reached, mathnet returned HTML instead of PDF)
- I (Zbl 0999.70022, mathnet abstract): "The numerical method to find periodic hyperbolic trajectories, homoclinic
  transversal intersections of its separatrices is discussed. This method is realized for some values of the
  system parameters and it is found out that homoclinic invariants corresponding to these parameters are not
  equal to zero." Numerical; parameters used not reached.
- III, IV: small mass ratio and one other parameter near 0 or infinity (quotes in zbMATH section above).

### Tabanov 1999 (Zbl 0983.70534): small mass of second pendulum (summary quoted above). Full text not reached.

### Burov and Nechaev 2002 (Problems in the investigation of stability and stabilization of motion, VTs RAN, 128-135): catalog entry only (istina.msu.ru), no abstract. Not reached.

### Kaheman et al., Jimenez-Lopez and Garcia-Garrido (2403.07000), Cabrera-Leonel-Marti (2312.13436), Parker-Goluskin-Vasil (2106.13518, Chaos 31 (2021) 103102, sum-of-squares barrier certificates for "no flip" sets, rigorous but not about chaos), Haham-Kol (2608.20276, flip rates, equal mass equal arm "egalitarian", numerical/statistical), Yao-Liu-Tegmark (2609.05337, periodic orbit continuation, numerical): abstracts read; none proves chaos or non-integrability.

## CAPD group

- Wilczak papers page (ww2.ii.uj.edu.pl/~wilczak/papers.php, entries through 2026), Zgliczynski publ.htm
  (through 2025), Kapela papers.html (through 2024): the only pendulum entry is Wilczak-Zgliczynski,
  "Computer assisted proof of the existence of homoclinic tangency for the Henon map and for the forced-damped
  pendulum", SIAM J. Appl. Dyn. Syst. 8 (2009) 1632-1663 (forced damped single pendulum). No double pendulum.
- capd.ii.uj.edu.pl (reachable over http only): applications pages list Lorenz, Rossler, Henon, Michelson,
  hyperchaotic Rossler, PCR3BP, Kuramoto-Sivashinsky, choreographies. No double pendulum.
- Galias page (ww2.ii.uj.edu.pl/~galias/) fetched (200) but not scanned in detail; zbMATH query
  `ti:pendulum & ti:"computer assisted proof"` returns only forced-damped pendulum papers (Banhelyi, Csendes,
  Garay, Hatvani 2007/2008; Wilczak-Zgliczynski 2009).
- Tucker, Kapela-Simo: no double pendulum item surfaced in any query.
- Precedent for a CAP of symbolic dynamics in an autonomous 2-DOF Hamiltonian: Arioli and Zgliczynski,
  "Symbolic dynamics for the Henon-Heiles hamiltonian on the critical energy level", J. Diff. Eq. 171 (2001)
  173-202 (cited in Zgliczynski-Gidea and in the 2009 paper; not opened).

## Theorem sources located

### Kozlov, "Integrability and non-integrability in Hamiltonian mechanics", Russian Math. Surveys 38:1 (1983) 1-76 (English PDF from mathnet.ru getFT, read Chapter V)
- Chapter V §2, Theorem 3 (p. 48): "Let n = 1. If [the Melnikov-type integral of {H0, H1}] ≠ 0, 2) for small e
  the perturbed system has a doubly-asymptotic solution t -> ze(t) close to t -> z0(t), then for small e ≠ 0 the
  Hamiltonian system does not have an additional analytic integral [65]." (one and a half degrees of freedom;
  the perturbative statement).
- Its proof (p. 49) is non-perturbative in structure: for the period map g with hyperbolic fixed points whose
  separatrices "intersect and do not coincide", the union of g^n(Delta) "is a key set for the class of functions
  that are analytic in the section", so an analytic integral constant on W2 is constant. This is the argument
  that turns a transversal (in fact any non-coinciding) homoclinic intersection on an energy level of a 2-DOF
  real-analytic Hamiltonian (via the Poincare map of a hyperbolic periodic orbit) into non-existence of a
  real-analytic integral independent of H near that level. The exact theorem as stated in Kozlov's 1996 book
  ("Symmetries, Topology and Resonances in Hamiltonian Mechanics", Springer) was NOT reached; the Russian
  1995 edition is cited by Moauro-Negrini as ref. [1].
- Related open statements: Cresson, arXiv:math/0509547, Theorem 1.1 (from Cresson JDE 196 (2004) 289-300,
  Thm 2.2): an analytic diffeomorphism of R^n with a hyperbolic fixed point whose W- and W+ "intersect
  transversally at a homoclinic point h", with a multiplicative non-resonance condition on the spectrum and an
  admissible homoclinic point, "does not admit a non trivial analytic first integral"; Cresson notes (p. 3) the
  resonance condition can be dropped for n = 2. Yagasaki arXiv:2106.04930, p. 2: "The occurrence of such
  transverse intersection implies, e.g., by Theorem 3.10 of [18] [Moser, Stable and Random Motions, 1973], the
  real-analytic nonintegrability near the unperturbed homoclinic orbit." Yagasaki Appendix A also states
  Kozlov's Poincare-set Theorem A.1 (Kozlov 1996, Ch. IV §1), which is perturbative.
- Caution for a CAP route: a covering-relation proof gives TOPOLOGICAL transversality (Wilczak-Zgliczynski 2003
  say so explicitly, below); Kozlov/Moser/Cresson need the manifolds to intersect and not coincide (Kozlov) or
  intersect transversally (Moser, Cresson). A CAP aiming at analytic non-integrability should either verify
  genuine transversality (cone conditions, Zgliczynski 2009) or verify non-coincidence of the separatrices.

### Zgliczynski and Gidea, "Covering relations for multidimensional dynamical systems", J. Differential Equations 202 (2004) 32-58 (author copy ww2.ii.uj.edu.pl/~zgliczyn/papers/wts/cov.pdf, dated April 20, 2004)
- Theorem 4 (p. 6): "Let Ni, i = 0, . . . , k be h-sets and Nk = N0. Assume that for each i = 1, . . . , k we have
  either Ni-1 =fi=> Ni, or Ni ⊂ dom(fi^-1) and Ni-1 <=fi= Ni. Then there exists a point x ∈ int N0, such that
  fi ∘ fi-1 ∘ · · · ∘ f1(x) ∈ int Ni, i = 1, . . . , k, fk ∘ fk-1 ∘ · · · ∘ f1(x) = x."
- Theorem 9 is the version with degrees wi; "Collorary 12" (sic) gives, for a bi-infinite chain, a point whose
  full orbit visits int Ni for all i in Z.

### Zgliczynski, "Covering relations, cone conditions and the stable manifold theorem", J. Differential Equations 246 (2009) 1774-1819 (author copy .../papers/invman/cncv.pdf, dated December 31, 2008)
- Abstract: "We show how to effectively link covering relations with cone conditions. We give a new, 'geometric',
  proof of the stable manifold theorem for hyperbolic fixed point of a map."
- Theorem 14: for a C1 map with hyperbolic fixed point z0 there is an h-set N with cones, z0 ∈ int N, with
  N =f=> N (and N <=f= N if f is a local diffeomorphism), W^u_N(z0) a horizontal disk and W^s_N(z0) a vertical
  disk satisfying the cone condition. Theorem 24: same for real-analytic f with real-analytic local manifolds.

### Wilczak and Zgliczynski, "Heteroclinic connections between periodic orbits in planar restricted circular three body problem - a computer assisted proof", Comm. Math. Phys. 234 (2003) 37-75 (author copy .../papers/pcr3bp/pcr3bp.pdf)
- Theorem 1.1: for PCR3BP with C = 3.03, mu = 0.0009537, two Lyapunov orbits with heteroclinic connections both
  ways and homoclinic orbits. Theorem 1.2: "there exist a symbolic dynamics on four symbols {S, X, L1, L2}".
- p. 4: "we did'nt checked that stable and stable [sic] manifolds of Lyapunov orbits intersect transversally.
  Instead we had proved that there is enough topological transversality present to build a symbolic dynamics on
  it."

## Summary of evidence for the verdict

1. No arXiv, zbMATH or CAPD item reports a computer-assisted or interval-arithmetic proof for the double pendulum
   (every "computer assisted" pendulum hit is the forced damped single pendulum).
2. All analytic proofs found are perturbative in a parameter that is not small at m1 = m2, l1 = l2: Dullin
   (coupling eps small, and the classical case maps to eps = 1/2), Burov (link geometry small), Ivanov and
   Moauro-Negrini and Tabanov (mass ratio small).
3. Salnikov's note is at exactly the classical parameters but is non-interval numerics; later experts state a
   proof is still missing (Stachowiak-Szuminski 2015; Szuminski-Kapitaniak 2025).
4. Unresolved: Bolotin-Negrini 1997, non-perturbative variational method, "certain domain of parameters",
   energies "close to the maximum of the potential energy". Must be obtained (Russ. J. Math. Phys. is not open
   access; try a library copy or the authors) and checked for whether m1 = m2, l1 = l2 is inside the domain.
   Also unread: Bolotin 1995 NATO ASI chapter "Variational criteria for nonintegrability and chaos in Hamiltonian
   systems" (Springer, 10.1007/978-1-4899-0964-0_14), Burov-Nechaev 2002, Sumbatov 1982, Ivanov I-IV full texts.
