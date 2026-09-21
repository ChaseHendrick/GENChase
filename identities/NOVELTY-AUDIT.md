# Novelty audit of the five candidate bounds

Audit date: 2026-09-20. This is a literature assessment, not a certificate of originality. It supersedes the repository's earlier unqualified claims of being the first public source of these formulas.

**Post-merge follow-up:** [a direct comparison with Gröbli's 1877 original](ORIGINALITY-FOLLOWUP.md) reproduces candidate 1 by substitution and a change of variables, and checks a denominator against the original scan. Priority of the optimized minimum remains unconfirmed.

**The evidence does not establish five novel discoveries.** All five concern classical point-vortex collapse. The exact minima below were not located in the sources inspected, but the first three are elementary specializations and optimizations of published rate formulas. The fifth generalizes the second and fourth. Mathematical correctness, independent derivation, historical priority, and a substantial research contribution are separate questions.

## Result by result

Write $P=\omega_0t_c$ for the positive spin–collapse product on the stated collapsing branch. The domains, circulations and proofs are in [IDENTITIES.md](../IDENTITIES.md) and the linked derivations.

| Candidate | Precise bound being assessed | Earlier foundation | Audit conclusion |
|---|---|---|---|
| 1. Hendrick's Identity | $P=(2-\cos^2\theta)/\sin2\theta\ge\sqrt2$, equality at $\tan\theta=1/\sqrt2$ | Classical three-vortex collapse; Aref 2010, eqs. (25a), (25d), (29c) | Formula follows by substitution in published dynamics. No earlier explicit statement of this exact sharp minimum was located. Priority unconfirmed. The name is a project label. |
| 2. Parallelogram lock | $P=(\sqrt3/4)(4-\cos2\theta)/\sin2\theta\ge3\sqrt5/4$, equality at $\cos2\theta=1/4$ | Novikov–Sedov 1979, §4; Gotoda 2020 preprint, eq. (3.13) | Elementary corollary of published rates for an already published family. No earlier explicit minimum located; priority unconfirmed. Also the $n=2$ case of candidate 5. |
| 3. Quincunx lock | $P=(3/16)(7-4\cos2\theta)/\sin2\theta\ge3\sqrt{33}/16$, equality at $\cos2\theta=4/7$ | The same 1979 family with a central vortex; Gotoda eq. (3.13) and Fig. 3 | Elementary corollary on the exact parameter slice already illustrated by Gotoda. No earlier explicit minimum located; priority unconfirmed. |
| 4. [Double-triangle bound](double-triangle.md) | $P=(11-\sqrt5\cos3\theta)/(6\sin3\theta)\ge\sqrt{29}/3$, equality at $\cos3\theta=\sqrt5/11$ | Classical two-ring collapse; Koiller et al. 1985, §11 | A proved specialization of the classical family; priority unconfirmed, with an important full-text gap. It is exactly $n=3$ in candidate 5. |
| 5. [General polygon bound](polygon-collapse.md) | $P\ge F_n=\sqrt{K_n^2-(2n-1)}/(2n)$, where $K_n=(n-1)\sinh[(n+2)\log((n+\sqrt{2n-1})/(n-1))/2]$ | Koiller et al.'s arbitrary two-ring family | General formula derived here; no earlier optimized version located. Priority unconfirmed. It includes 2 and 4, and gives the square case $F_4=\sqrt{322}/9$, equality at $\cos4\theta=9/55$. |

The five numbered requests therefore do not give five independent results. In particular, counting the parallelogram, triangles, squares and each later polygon separately would exaggerate the contribution.

## Why a new-looking constant is insufficient

All five optimizations have the same elementary form. For $a>|b|$, $c>0$, and $0<\phi<\pi$,

$$
P(\phi)=c\frac{a-b\cos\phi}{\sin\phi}
\quad\Longrightarrow\quad
P(\phi)\ge c\sqrt{a^2-b^2},
\qquad \cos\phi_* = b/a.
$$

Indeed,

$$
(a-b\cos\phi)^2-(a^2-b^2)\sin^2\phi
=(a\cos\phi-b)^2.
$$

For the first result, $P=(3-\cos2\theta)/(2\sin2\theta)$. The other four already have this quotient form. Thus the radical floors and equality angles require only an elementary inequality once the rates have been established. A specialized corollary could be absent from print and still be too routine to support a strong claim of research novelty. This assessment of significance is an inference from the algebra, not an attribution to the papers.

Equivalent prior results could use $B/(-2A)$, logarithmic-spiral pitch, a pitch angle, its reciprocal, or a normalized path length. Searching only for the project names or the printed radicals would miss those.

## Primary sources inspected

1. **Novikov and Sedov, “Vortex collapse,” 1979, pp. 297–301.** The [journal PDF](https://www.jetp.ras.ru/cgi-bin/dn/e_050_02_0297.pdf) was downloaded and read, including rendered pages 298 and 301. The discussion on p. 298 already places $2\omega_0t_*$ in the logarithmic-spiral relation between radius and angle. Section 4 gives collapse time and angular velocity for four and five vortices, including eqs. (4.3)–(4.4). The product as a geometric spiral parameter therefore predates this project and Aref 2010. These exact sharp minima were not found in the paper.

2. **Aref, “Self-similar motion of three point vortices,” 2010.** The [author manuscript at DTU](https://backend.orbit.dtu.dk/ws/files/4876822/Hassan.pdf) was opened, and a [Virginia Tech copy](https://vtechworks.lib.vt.edu/server/api/core/bitstreams/2b7fd3cf-09d3-4fe7-8558-a9948a899f1d/content) downloaded. Equations (25a) and (25d) provide the rates; (29c) explicitly contains their product in the spiral trajectory. The relevant equations support deriving candidate 1; they do not, in the passages inspected, state its claimed optimized floor.

3. **Gotoda, “Self-similar motions and related relative equilibria in the N-point vortex system,” 2020 preprint.** The [full preprint](https://arxiv.org/pdf/2002.09624) was downloaded and the relevant sections read. Equations (2.4)–(2.6) give the complex similarity rate and collapse time. Equation (3.13) gives $A$ and $B$ for the four- and five-vortex families; Fig. 3 includes the parameter choices used for candidates 2 and 3. The work examines Hamiltonian–collapse-rate relations. No explicit optimization of $-B/(2A)$ giving either claimed floor was located. “2020” here denotes the preprint, not a claim about the journal's publication year.

4. **Krishnamurthy and Stremler, “Finite-time collapse of three point vortices in the plane,” 2018.** The [author-hosted full postprint](https://people.iith.ac.in/vikas.sk/files/2018_Finite-time-Collapse-of-Three-Point-Vortices-in-the-Plane-Postprint.pdf) was downloaded. Section 3.5, eqs. (3.26)–(3.29), treats the angular phase and normalized circumcenter path length. In that normalization $\widetilde s(1)=\sqrt{1+4P^2}$, obtained by integrating the logarithmic spiral with initial radius one. Candidate 1's floor would therefore be the equivalent statement $\widetilde s(1)\ge3$ on the equal-strength slice. The inspected passage gives a numerical observation $\widetilde s(1)>2$ for its broader family; that is not the same sharp statement. An equivalent geometric formulation remains relevant to any further search.

5. **Koiller, Pinto de Carvalho, Rodrigues da Silva and Gonçalves de Oliveira, “On Aref's vortex motions with a symmetry center,” 1985, pp. 27–61.** The [publisher record](https://www.sciencedirect.com/science/article/abs/pii/0167278985900843) and search-indexed excerpts, particularly §11 on p. 59, identify the arbitrary two-ring collapse and its circulation constraint. **The full paper was not obtained.** CiteSeer retrieval timed out; links on the author's Academia profile failed. An equivalent general optimized pitch formula in this paper would directly defeat the novelty claim for candidates 4–5. The unread body is a material limitation.

6. **Later literature checked.** Gotoda's [2025 enstrophy paper](https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/enstrophy-variations-in-the-collapsing-process-of-point-vortices/DC9D14E97D3E630ADC2073CAFAC656FE) was opened, including its explicit four-/five-vortex formulas and quincunx example. Chen, Walsh and Wheeler's [2026 hollow-vortex implosion paper](https://link.springer.com/article/10.1007/s00208-026-03541-2) was opened, including its collapsing point-vortex examples. No matching sharp product minimum was located in those sections. O'Neil's [2007 triple-ring paper](https://www.sciencedirect.com/science/article/abs/pii/S0167278907002588) was available as abstract/introduction only; it credits established two-ring collapse and does not resolve priority of the bound.

## Search coverage and limits

Searches covered paper titles, the exact radicals and angle conditions, angular velocity times collapse time, optimized rotation/collapse ratio, winding, logarithmic-spiral pitch, and regular polygon/two-ring collapse. Representative exact queries and the access log are recorded in [RESEARCH.md](../RESEARCH.md#2026-09-20-audit-of-all-five-candidates).

Search engines do not index every formula, thesis, book or older article. The inaccessible primary texts were not treated as read. No author has been contacted, and no external expert has endorsed priority. Git timestamps establish when GENChase recorded a statement; hashes establish file identity. Neither establishes that nobody previously derived or published the mathematics.

**Defensible description:** explicit formulas and sharp bounds derived and checked in GENChase on classical collapse families, with historical priority unconfirmed. The next useful priority check is full access to Koiller et al. and related older sources, followed by comparison by a specialist. Until then, do not advertise these as five verified novel identities.
