# Bolotin and Negrini (1997): what it proves about the planar double pendulum

Date: 2026-09-26. Sources: legal and open only (zbMATH Open API, Google Books snippet search, Springer
page-one previews, Project Euclid, Crossref). Nothing was taken from Sci-Hub or a similar site.

## Verdict

**The equal case (m1 = m2, l1 = l2, point masses) is NOT covered.**

Theorem 10.1 of Bolotin and Negrini, Russ. J. Math. Phys. 5:4 (1997), p. 435, proves that the double
pendulum is non-integrable in a neighbourhood of the critical energy level S_h, where h = V(O) = max V
(both links pointing up). It needs an explicit inequality on the parameters. At m1 = m2 and l1 = l2 that
inequality fails by a factor of about 8.3. It holds only when the upper mass is light (m1/m2 < 0.166 at
l1 = l2) and the two lengths are comparable. The authors say themselves that "our method certainly does
not work if one of the links is much shorter than the other."

## The theorem, with its location

Source: Russian Journal of Mathematical Physics, vol. 5 (1997), Google Books id `as3yAAAAMAAJ`, snippet
view. I fetched it through the search-within-volume endpoint
`https://books.google.com/books?id=as3yAAAAMAAJ&jscmd=SearchWithinVolume2&q=<term>`.
The quotes below are the raw OCR, with l printed as "1", subscripts inline and superscripts dropped.

- p. 434, section 10 opening: "§10. NONINTEGRABILITY OF THE DOUBLE PENDULUM Consider the double mathematical
  pendulum with links of length l1, l2, and mass points m1, m2. Let q1, q2 be the angles between the links
  and the vertical axis y. Then M = T2 and L = T - V with ..."
  "V(q1,q2) = m1gl1 cos q1 + m2g(l1 cos q1 + l2 cos q2). The point O = (0,0) ∈ M is the maximum point of the
  potential energy V and V(O) = m1gl1 + m2g(l1 + l2) = h. The Jacobian metric is given by
  ds2 = 2g((m1+m2)l1(1 - cos q1) + m2l2(1 - cos q2))((m1+m2)l1dq1^2 + m2l2dq2^2 + 2m2l1l2 cos(q1 - q2)dq1dq2)."
  "We intend to apply Theorem 3.1. Let Γ be the homotopy class of the curve γ0 = {(q1,q2) | q1 = φ,
  q2 = φ + π, 0 ≤ φ ≤ 2π}. The Maupertuis action is an elliptic integral ... (10.1) ...
  (m1l2 + m2(l1-l2)2)((m1+m2)l1 + m2l2), A = ((m1+m2)l1 - m2l2)/((m1+m2)l1 + m2l2) (10.2). Since the root
  is a concave function, we have inf_Γ J ≤ J(γ0) ≤ 2πμ."
  "To reduce the calculations, we use the continuity of inf_Ω J with respect to the parameter m1 and estimate
  the infimum for the functional J0(γ) = lim_{m1→0} J(γ)."
- p. 435: "any curve γ ∈ Ω crosses σ. Hence, inf J0(γ) ≥ 2d = (4/3) m2√2g (R + r)^{3/2} =
  (16/3) m2√g (max{l1,l2})^{3/2}. Since J ≥ J0, we obtain inf_Ω J ≥ inf_Ω J0 ≥ 2d. By (10.2),
  inf_Ω J > J(γ0) provided that 2πμ < 2d. We obtain the following assertion."
- **p. 435, Theorem 10.1 (raw OCR):** "The double pendulum is a nonintegrable system in a neighborhood of Sh
  provided that 9m2(m1l2 + m2(l1 - l2)2)((m1 + m2)l1 + m2l2) < 32m2(max{l1,l2})3. Of course, this
  condition is quite restrictive. We can perform the estimates more carefully and obtain a better condition.
  However, our method certainly does not work if one of the links is much shorter than the other."
- p. 435 continues: "The nonintegrability of the physical double pendulum was first proved by Burov [12] by
  using the Poincaré-Mel'nikov-Arnold (PMA) method. However, the PMA method works only for a very special
  physical pendulum ..."

### Reading the OCR'd inequality

As OCR'd, the inequality does not balance in its units. It can be reconstructed exactly from the
derivation in the snippets:

- Along γ0 (q2 = q1 + π, the links folded back), h - V = gB(1 - A cos φ) with B = (m1+m2)l1 + m2l2.
  The kinetic form with dq1 = dq2 = dφ is (1/2)C with C = m1 l1^2 + m2(l1 - l2)^2.
- So J(γ0) = μ ∫_0^{2π} sqrt(1 - A cos φ) dφ with μ = sqrt(2gBC). Those are exactly the two factors and
  the A printed in (10.2).
- Jensen's inequality gives J(γ0) ≤ 2πμ ("the root is a concave function").
- The requirement 2πμ < 2d = (16/3) m2 √g L^{3/2}, with L = max{l1,l2}, squares to

  **9π² (m1 l1² + m2(l1 - l2)²)((m1+m2) l1 + m2 l2) < 32 m2² (max{l1,l2})³.**

So the OCR "9m2" is 9π², "m1l2" is m1 l1², and "32m2" is 32 m2². With this reading the units balance
(mass² length³ on both sides).

### The equal case

With m1 = m2 = m and l1 = l2 = l, the left side is 9π² · m l² · 3ml = 27π² m² l³ ≈ 266.5 m² l³, and the
right side is 32 m² l³. The ratio LHS/RHS is 27π²/32 ≈ 8.33, so the condition fails.

- Replacing the Jensen bound by the exact elliptic integral (A = 1/3, mean of sqrt(1 - A cos φ) = 0.99287)
  only brings the ratio down to 8.21. It still fails.
- At l1 = l2 the condition reads 9π² x(x + 2) < 32 with x = m1/m2, so it needs m1/m2 < 0.1663.

Caveat: the literal OCR reading (9 m2 ... < 32 m2 ...) would give 27 < 32 in the equal case, but that
reading does not balance in its units and contradicts the printed derivation (2πμ < 2d). The π² reading is
the only one consistent with the text.

### What remains open

The abstract criterion is Theorem 3.1 with condition (3.1): inf_Ω J > inf_Γ J, i.e. the minimum over loops
through O in the class exceeds the minimum over the free class. The same condition is written c*_k < c_k in
Rabinowitz TMNA 1997 (1.13) and in Rabinowitz 1999 (1.6). Theorem 3.1 might still hold at the equal
parameters. The paper does not prove that, because its lower bound 2d (the m1 → 0 limit, a free particle)
is crude. The authors say "We can perform the estimates more carefully and obtain a better condition", but
the paper does not do so.

### Energy range

"in a neighborhood of S_h", with h = V(O) = max V. This means energies near the critical energy of the
upright equilibrium, and the result is non-existence of an analytic first integral there. Moauro-Negrini
(PMM 62:5, 1998, p. 892) describe it as "for energy values close to the maximum of the potential energy".
International Aerospace Abstracts (Google Books 8rNCAQAAIAAJ) has the same wording: "the nonintegrability
of a mathematical double pendulum was proved for energies close to the maximum potential energy by using
variational methods".

## The other Bolotin items

- **Citation correction.** "Variational criteria for nonintegrability and chaos in Hamiltonian systems",
  pp. 173-179, is in J. Seimenis (ed.), *Hamiltonian Mechanics: Integrability and Chaotic Behavior*, NATO
  ASI Series B 331, Plenum 1994, DOI 10.1007/978-1-4899-0964-0_14 (Crossref: pages 173-179). It is not in
  Simo's 1999 NATO C 533 volume.
  - In the Simo volume, DOI 10.1007/978-94-011-4673-9_14 is Jorba, de la Llave and Zou, "Lindstedt series
    for lower dimensional tori" (p. 151 ff., confirmed from the page-one preview).
  - Bolotin's chapter in that volume is "Heteroclinic chains of skew product Hamiltonian systems",
    pp. 13-25, DOI 10.1007/978-94-011-4673-9_3.
- **Seimenis 1994 chapter.** Pages 173-174 were read (page-one preview). They contain Theorem 1
  (Taimanov: dim H1(M) > m implies non-integrability), Theorem 2 (χ(M) < 0, h > sup V: infinitely many
  transversal homoclinics) and the start of Example 1, the n-center problem. There is no double-pendulum
  statement in the visible pages. Its reference list (Crossref) does not include Bolotin-Negrini. It cites
  Turaev-Shilnikov 1989 on homoclinic loops of a saddle, which fits a treatment near h = max V on pp.
  175-179, but those pages were not seen.
- **Bertotti and Bolotin, DCDS 9:5 (2003) 1343-1357, Zbl 1032.37046.** The zbMATH review states the general
  torus theorem: chaotic trajectories exist for h slightly below max V unless the system is "variationally
  separable". It generalizes Bolotin-Negrini. It has no double-pendulum parameter statement, and the full
  text is paywalled.
- **Rabinowitz, TMNA 9 (1997) 41-76** (read in full, Project Euclid PDF). A model V on T² with a flat
  metric. It says of [Bolotin-Negrini, preprint 1996]: "The primary concern of [5] is a variational
  criterion for the nonintegrability of (HS) when V is analytic and (1.13) holds", where (1.13) is c*_k < c_k.
- **Rabinowitz 1999** (Amann volume, pp. 571-572 preview). "As was shown in [1] and [6], a sufficient
  condition for (i) to occur is c*_k < c_k (1.6) ... A family of examples where (1.6) is satisfied can be
  found e.g. in [1] or [2]."
- **Bolotin 1990, Vestnik MGU (Zbl 0712.70031), and Bolotin-Rabinowitz JDE 148 (1998).** No review text is
  available: zbMATH says "contents unavailable". The JDE text returned 403.

## Attempts log

| URL / source | Result |
|---|---|
| zbmath.org/?q=an:0951.37029 | 403 |
| api.zbmath.org `_search?search_string=an:0951.37029` | review text (Musayev): "nonintegrability of a double pendulum in a certain domain of parameters" |
| api.zbmath.org `ci:0951.37029` | citing: Rabinowitz 1999 (Zbl 1120.37313), Bertotti-Bolotin 2003 (Zbl 1032.37046) |
| link.springer.com chapter and content/pdf | 303 to idp, then a "Client Challenge" page |
| page-one.springer.com/pdf/preview/10.1007/978-1-4899-0964-0_14 | OK, pp. 173-174 of Bolotin 1994 |
| page-one.springer.com/.../978-94-011-4673-9_14 and _15 | Jorba et al. and Lochak, not Bolotin |
| api.crossref.org, Simo volume chapters _1 to _60 | Bolotin is _3, pp. 13-25 |
| projecteuclid TMNA 1476841904 (WebFetch) | full PDF, read |
| page-one.springer.com/.../978-3-0348-8765-6_24 | Rabinowitz 1999, pp. 571-572 |
| mathnet Bolotin-Kozlov Izv. 2017 (im8600) | PDF, no double pendulum |
| googleapis books v1 | 429 quota |
| google.com/books/feeds/volumes?q=... | works; found RJMP vol. 5 (as3yAAAAMAAJ), IAA, MR snippets |
| books.google.com `?id=as3yAAAAMAAJ&jscmd=SearchWithinVolume2&q=...` | **Theorem 10.1 and its derivation, pp. 434-435** |
| OpenAlex, Semantic Scholar | rate-limited (429 / budget) |
| ScienceDirect (JDE 1998, 3-center), AIMS DCDS 2003, ResearchGate | 403 or paywall |
| Unpaywall | JDE 1998 flagged OA (Elsevier archive) but blocked; DCDS 2003 not OA |

## Update 2026-09-27: no open copy found; more of the printed text; what to obtain

Searched again, through legal and open sources only (no paywall was bypassed):

| where | result |
|---|---|
| Bolotin's home page, people.math.wisc.edu/~bolotin/ | contact details and research interests only; no publication list, no PDFs |
| Negrini, mat.uniroma1.it/people/negrini and /~negrini/ | 404 |
| mp_arc (web.ma.utexas.edu/mp_arc), indexes for 1995, 1996 and 1997 | no Bolotin or Negrini preprint; the only pendulum item is on separatrix splitting |
| Internet Archive advanced search ("Russian Journal of Mathematical Physics", "variational criterion for nonintegrability", "Bolotin Negrini") | no copy of the journal volume or the paper |
| Crossref (bibliographic query) | no DOI for the article; the nearest hit is Bolotin's 1994 NATO chapter |
| journals.rcsi.science/1061-9208 (the journal's archive site) | HTTP 403 |
| Math-Net.ru | the English journal list fetched has no entry for this journal; its paper search returned an error page |
| Semantic Scholar | rate-limited (429) |
| citing texts | Bolotin and Treschev, "Hill's formula" (arXiv:1006.1532): no pendulum, no Negrini; Rabinowitz 1997 and 1999 were read before |
| Google Books snippet view of the volume (as3yAAAAMAAJ), about 40 further search terms | new snippets from pp. 420, 434 and 435, below |

New OCR text (raw, superscripts dropped; λ rendered as "1" or "d1"):

- p. 420: "Proposition 3.1. Under condition (3.1), there exist infinitely many transversal homoclinics to the
  equilibrium O. If we drop the analyticity assumption, then the assertion remains valid, but the proof must be
  different." Before it: "One can prove that the existence of five or more transversal homoclinics implies the
  inequality htop > 0. If 1 ≠ 12 and if there exist three transversal homoclinics belonging neither to W8 (0) nor to
  War (O) ..." and "... double pendulum treated below in §10, we have d1 ≠ 12, and therefore htop > 0."
  So Bolotin and Negrini also claim positive topological entropy on the critical level for the double pendulum of
  Section 10, under the same hypothesis as Theorem 10.1. The priority question therefore concerns chaos as well as
  non-integrability, and it is settled by the same parameter condition.
- p. 434: "(10.1) ... where μ2 = 2g ( m1l2 + m2 ( 11-12 ) 2 ) ( ( m1 + m2 ) 11 + m2l2 )" (μ² with the superscripts
  dropped), and "It follows from (10.1) that DJ / dm1 ≥ 0. Hence, J > Jo."
- p. 435, (10.3): "For m1 = 0, the Maupertuis distance from the curve σ = { y = -r } to the point O = { y = R } is at
  least d = inf { Jo ( y ) | y ( 0 ) = 0, γ ( 1 ) Ε α } ≥ ( 2/3 ) m2√2g ( R + r ) 3/2."

**The equal case fails the condition the theorem is derived from, whatever the displayed inequality reads.** The text
says: "By (10.2), inf J > J(γ0) provided that 2πμ < 2d. We obtain the following assertion. Theorem 10.1." With
μ² = 2g(m1 l1² + m2(l1 − l2)²)((m1 + m2) l1 + m2 l2) (p. 434) and 2d = (16/3) m2 √g (max{l1, l2})^{3/2} (p. 435),
both quoted above, m1 = m2 = m and l1 = l2 = l give μ² = 6 g m² l³, so 2πμ = 2π√6 m √g l^{3/2} ≈ 15.39 m √g l^{3/2}
against 2d ≈ 5.33 m √g l^{3/2}: the condition fails by a factor of 2.89 (8.33 after squaring, the 27π²/32 of the
earlier reading). One caveat remains. The p. 434 snippet renders "2πμ" with a π, while the inequality of Theorem 10.1
begins "9m2"; if the printed theorem really reads 9 m2 (a misprint for 9π²), its displayed statement would literally
include the equal case (27 < 32), although its proof does not. Only the printed page settles that.

### What the owner should obtain (library or interlibrary loan)

S. V. Bolotin and P. Negrini, "A variational criterion for nonintegrability", *Russian Journal of Mathematical
Physics*, vol. 5, no. 4 (1997), pp. 415-436 (Zbl 0951.37029; no DOI). The pages needed are:

1. pp. 434-435, Section 10: equations (10.1)-(10.3) and the displayed inequality of Theorem 10.1. Question: does it
   read 9π²(m1 l1² + m2(l1 − l2)²)((m1 + m2) l1 + m2 l2) < 32 m2² (max{l1, l2})³, as its derivation requires?
2. p. 420 and the pages before it in Section 3: Theorem 3.1, condition (3.1), Proposition 3.1 and the remark that the
   double pendulum of Section 10 has h_top > 0. Questions: on which energy levels is h_top > 0 claimed, and under
   which hypothesis?
3. Anywhere else in the paper: does any statement cover m1 = m2, l1 = l2?

The paper is not online anywhere we could find (Zbl 0951.37029); it needs a library copy or interlibrary loan. Ivanov I
(RCD 4 (1999), ref. [3]) cites it as a 1996 preprint of the Universita degli Studi di Roma La Sapienza, which the authors
or the department might also supply.

Until then the novelty statements that depend on this paper (global analytic non-integrability, and chaos in the equal
double pendulum at any energy) stay conditional on this reading.
