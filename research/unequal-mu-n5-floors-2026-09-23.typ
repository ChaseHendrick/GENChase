// Presentable research note for external checkers / journal editors.
// Campaign-authored text only. No copyrighted extracts.
#set page(paper: "us-letter", margin: (x: 1in, y: 1in))
#set text(font: "New Computer Modern", size: 11pt)
#set par(justify: true, leading: 0.65em)
#set heading(numbering: "1.")
#show link: underline

#align(center)[
  #text(size: 14pt, weight: "bold")[
    Unequal-μ product floor and n=5 polygon floor
  ]
  #v(0.6em)
  #text(size: 11pt)[Chase Hendrick]
  #v(0.3em)
  #text(size: 9.5pt)[
    Found / derived in the SharpMeow/GENChase validation campaign (2026). \
    Cite the author by name. Do not attribute to the GitHub handle SharpMeow. \
    Do not treat this note as a personal theorem stamp (no “Hendrick’s Identity / Law”).
  ]
  #v(0.4em)
  #text(size: 9pt)[Date: 2026-09-23 (America/New_York). Companion markdown in-repo under `research/`.]
]

#v(0.8em)

#align(center)[*Abstract*]
#v(0.3em)

We record exact closed forms for two classical point-vortex collapse floors: (i) the unique interior product minimum $P_star$ on Gotoda’s $L=0$ arc for $Gamma = (1, 1\/2, -1\/3)$ with the corrected $2 pi$ Biot–Savart product; (ii) the $n=5$ specialization $F_5 = sqrt(31682)\/80$ of the already-proved two-ring / polygon floor $F_n$. Both are *proved candidates*. *Priority is unconfirmed*: the expressions may already appear as classical specializations. Floor-kill body reads of Koiller et al. (1985), Aref (1982), and O’Neil (2007) return *DOES NOT KILL* for the optimized floors named here; those verdicts are limited to the texts read and do not certify novelty.

= Statements

== μ = 1/2 Gotoda $L=0$ product floor

On Gotoda’s classical $L=0$ collapsing arc for $Gamma = (1, 1\/2, -1\/3)$, with the corrected product from the $2 pi$ Biot–Savart kernel / Gotoda Prop. 2.1,

$ P(theta) = (14 sin^2 theta + 6 sqrt(7) cos theta + 21) / (2 (14 cos theta + sqrt(7)) sin theta) , $

the unique interior minimum $P_star = P(theta_star)$ admits the real trigonometric Cardano form

$ P_star = sqrt( 605\/324 + (7 sqrt(5201))\/162 cos(1\/3 arccos( (245351 sqrt(5201)) \/ 5201^2 )) ) . $

Equivalently, $P_star$ is the unique positive real root greater than $2$ of the irreducible sextic

$ 8748 x^6 - 49005 x^4 + 27794 x^2 + 18723 = 0 , $

and $q = P_star^2$ is the unique real root in $(4,5)$ of the irreducible cubic

$ 8748 q^3 - 49005 q^2 + 27794 q + 18723 = 0 . $

Float64: $P_star approx 2.203855016036133$ (`tools/verify-unequal-mu-half.js`). Uses the corrected $P$, not the buggy Gotoda (3.3)–$B$ specialization ($approx 1.741$).

*Disclaimer.* Classical Gotoda unequal-circulation family; closed form for the floor, not a new interaction law.

=== Proof sketch

+ Critical cosine $cos theta_star$ solves $c^3 + (8 sqrt(7)\/7) c^2 + (1\/14) c - 32 sqrt(7)\/49 = 0$ on the collapsing arc.
+ Write $P = N(c) \/ (D_0(c) sqrt(1-c^2))$ and clear radicals to a bihomogeneous relation in $(P, c, sqrt(7))$.
+ Resultant elimination of $c$ and $sqrt(7)$ yields the sextic (minimal over $QQ$); $q = P_star^2$ satisfies the cubic.
+ Casus irreducibilis on the cubic gives the real trig Cardano form; Float64 agrees with direct minimization.

== n = 5 polygon-collapse floor

Specialize the classical two-ring / general polygon collapse family (Koiller et al. 1985 §11) at order $n=5$. With the standard planar $2 pi$ Biot–Savart kernel,

$ omega_0 t_c = (127 sqrt(2) - 24 cos(5 theta)) / (80 sin(5 theta)) >= sqrt(31682)\/80 , quad 0 < theta < pi\/5 , $

with equality uniquely at $cos(5 theta_*) = 12 sqrt(2) \/ 127$. The floor is

$ F_5 = sqrt(31682)\/80 = 2.224929774172659 dots $

under the already-proved general formula

$ F_n = sqrt(K_n^2 - (2n-1)) \/ (2n) , quad K_n = (n-1) sinh( (n+2)\/2 op("arcosh")(n\/(n-1)) ) , $

parallel to $F_2 = 3 sqrt(5)\/4$, $F_3 = sqrt(29)\/3$, $F_4 = sqrt(322)\/9$. Not a new dynamical family; not a new identity row by itself.

=== Proof sketch

+ For $n=5$, $K_5 = 127 sqrt(2)\/8$.
+ Product form $omega_0 t_c = (K_5 - 3 cos(5 theta)) \/ (10 sin(5 theta))$ clears to the boxed quotient.
+ Elementary bound $(a - b cos alpha)\/sin alpha >= sqrt(a^2 - b^2)$ with $a = 127 sqrt(2)$, $b = 24$ yields $sqrt(31682)\/80$.
+ Consistency: $F_5 = sqrt(K_5^2 - 9)\/10$ recovers the same radical.

= Verification pointers

#table(
  columns: (1.6fr, 2.4fr),
  stroke: 0.4pt,
  inset: 6pt,
  [*Item*], [*Status*],
  [$P_star$ closed form / minpoly], [Algebraic derivation + Float64 (`tools/verify-unequal-mu-half.js`)],
  [$F_5 = sqrt(31682)\/80$], [Specialization of $F_n$; Float64 (`tools/verify-new-formula-candidate.js`)],
  [Priority / ledger stamp], [*Unconfirmed* — no `IDENTITIES.md` promotion from this note],
)

= Literature (floor-kill)

#table(
  columns: (1.4fr, 1fr, 1.6fr),
  stroke: 0.4pt,
  inset: 5pt,
  [*Paper*], [*Access*], [*Verdict*],
  [Koiller et al. (1985)], [Full text read], [*DOES NOT KILL* optimized product floors],
  [Aref, Phys. Fluids 25 (1982)], [AIP PPV + OCR], [*DOES NOT KILL* — center-of-symmetry / Havelock; no floor literals],
  [O’Neil, Physica D 236 (2007)], [ScienceDirect PPV], [*DOES NOT KILL* — triple-ring RE/collapse; no optimized floors],
)

*Limits.* Floor-kill only (absence of $P_star$, $F_5$, equality cosines, and related rate numerals in the bodies read). Not a paper-equivalence audit and not a novelty certificate. Negative search $eq.not$ priority. Deeper OA greps likewise found no hard-needle hits; status remains open / priority unconfirmed.

Copyrighted PDFs are not redistributed with this note.

= What would still kill priority

Any prior publication of the Cardano / minpoly form of $P_star$ (or the decimal $2.203855 dots$ as that product floor), of $F_5 = sqrt(31682)\/80$ (or equivalent), of the same Gotoda-$mu=1\/2$ minimization, or of the same $K_5$ clearance into $sqrt(a^2-b^2)$, would kill or demote priority while leaving the algebraic checks intact.

= Suggested citation

Closed forms for the $mu = 1\/2$ Gotoda $L=0$ product floor $P_star$ and the $n=5$ polygon floor $F_5 = sqrt(31682)\/80$ were derived by Chase Hendrick (2026) in the SharpMeow/GENChase validation campaign. Status: proved candidates, priority unconfirmed. Classical families only.

= Anti-claims

- No novelty claim beyond “closed form / explicit radical written down and checked in this campaign.”
- No personal named theorem.
- No `IDENTITIES.md` edit from this file.
- Lit verdicts are floor-kill only.

= References

+ H. Aref, Point vortex motions with a center of symmetry, _Phys. Fluids_ *25*, 2183–2187 (1982). DOI 10.1063/1.863710.
+ J. Koiller, S. Pinto-Schuhmacher, et al., On Aref’s vortex motions with a symmetry center (1985); GENChase body read 2026-09-23.
+ K. A. O’Neil, Relative equilibrium and collapse configurations of heterogeneous vortex triple rings, _Physica D_ *236*, 123–130 (2007). DOI 10.1016/j.physd.2007.07.015.
+ Y. Gotoda, $L=0$ unequal-circulation collapse product (Prop. 2.1 / arc used in campaign drafts).
+ SharpMeow/GENChase (2026-09-23): `identities/sources/unequal-mu-half-Pstar-closed-2026-09-23.md`, `new-formula-candidate-2026-09-23.md`, Koiller / Aref / O’Neil floor-kill notes, `deeper-kill-Pstar-F5-2026-09-23.md`.
