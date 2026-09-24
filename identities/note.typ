#set document(
  title: "Closed forms and sharp minima of ω t_c on three classical point-vortex collapse families",
  author: "Chaos",
  keywords: ("point vortices", "self-similar collapse", "Three-vortex collapse bound", "parallelogram lock", "quincunx lock"),
  date: datetime(year: 2026, month: 9, day: 21),
)
#set page(paper: "us-letter", margin: 1.05in, numbering: "1")
#set text(font: "New Computer Modern", size: 11pt)
#set heading(numbering: "1.")
#set par(justify: true, leading: 0.65em)
#set math.equation(numbering: "(1)")
#show link: set text(fill: rgb("#0b3d6e"))

#let affil = [Independent researcher. Code: #link("https://github.com/SharpMeow/GENChase")[github.com/SharpMeow/GENChase]]

#align(center)[
  #text(size: 14.5pt, weight: "bold")[Closed forms and sharp minima of $omega thin t_c$ on three classical point-vortex collapse families]
  #v(0.7em)
  #text(size: 12pt)[Chaos]
  #v(0.25em)
  #text(size: 10pt)[#affil]
  #v(0.55em)
  #text(size: 10pt)[Corrected attribution and scope · 21 September 2026]
]

#v(0.6em)
#align(center)[_Classical formulas and elementary sharp bounds. Zero confirmed novel findings._]

#v(0.4em)
*Abstract.* \
Self-similar collapse of $N$ point vortices is classical. Gröbli (1877) and Novikov–Sedov (1979) found the families; Aref (2010) and Gotoda (2020) wrote the collapse rate $A$ and the spin $B$ as separate functions of a shape angle. Their dimensionless product $omega_0 t_c = -B/(2A)$ is the pitch of the logarithmic spiral the configuration traces as it shrinks. This note records three closed forms of that product, with elementary sharp minima. The first expression explicitly specializes Gröbli’s 1877 spiral coefficient; historical priority of the optimized minima remains unconfirmed:

- Three-vortex collapse bound, on Gröbli's $Gamma = (1,1,-1/2)$ family: $omega_0 t_c = (2-cos^2 theta)/sin(2 theta) >= sqrt(2)$, equality at $tan theta = 1/sqrt(2)$.
- The parallelogram lock, on the Novikov–Sedov four-vortex parallelogram: $omega_0 t_c = (sqrt(3)/4)(4-cos 2 theta)/sin(2 theta) >= 3 sqrt(5)/4$, equality at $cos 2 theta = 1/4$.
- The quincunx lock, on the Novikov–Sedov five-vortex quincunx: $omega_0 t_c = (3/16)(7-4 cos 2 theta)/sin(2 theta) >= 3 sqrt(33)/16$, equality at $cos 2 theta = 4/7$.

These are descriptive project labels. Cite the classical sources; no ownership or first-discovery claim follows from this note.

= What is claimed, and what is not

Let $z_m(t) in CC$ be the positions of $N$ point vortices of circulations $Gamma_m$, evolved by the 2$pi$-periodic Biot–Savart law. A configuration is self-similar when there exist real $A,B$, independent of $m$, with
$ A + i B = (i)/(2 pi z_m) sum_(n != m) Gamma_n / (overline(z)_m - overline(z)_n). $
If $A < 0$, the vortices collide at the origin at the finite time $t_c = -1/(2A)$, rotating with instantaneous angular velocity $omega$ so that $omega_0 t_c = -B/(2A)$ is scale-invariant @Kimura1987 @Aref2010 @Gotoda2020.

*Mathematical scope.* The displayed formulas and elementary minima are checked on their stated classical families. This is a derivation and implementation record, not a claim that these results were first discovered here.

*Not claimed.* The motion (Gröbli; Novikov–Sedov). The product as the pitch of a log spiral (Aref). The functions $A(theta)$, $B(theta)$ (Gotoda). The fastest-collapse time $t_c = 4pi/3$ on the three-vortex family at unit separation (Leoncini, Kuznetsov and Zaslavsky). Any published isolated lock listed in the search ledger of GENChase.

= Three-vortex collapse bound

*Family.* $Gamma = (1, 1, -1/2)$, positions $z_1 = 0$, $z_2 = 1$, $z_3 = 1/2 + (sqrt(3)/2) e^(i theta)$ with $0 < theta < pi/2$. These lie on the angular-impulse circle $L = 0$ and collapse self-similarly @Grobli1877. The parameter $theta$ is the third vortex's place on that circle, not an interior angle of the triangle.

#set math.equation(numbering: none)
#align(center)[
  $ omega_0 t_c = (2 - cos^2 theta) / sin(2 theta) >= sqrt(2). $
]
Equality uniquely on this arc at $tan theta = 1/sqrt(2)$, a triangle of interior angles $22.5 degree$, $45 degree$, $112.5 degree$.

*Proof of the minimum.* Set $u = tan theta > 0$. Then $omega_0 t_c = u + 1/(2u)$ and
$ omega_0 t_c - sqrt(2) = ((sqrt(2) u - 1)^2) / (2 u) >= 0. $
At $theta = 45 degree$ the product is $3/2$. The same product splits, at this length, as
$ t_c = (pi/3)(4u + 1/u), #h(1em) 2 pi omega_0 = (3(2u^2+1))/(4u^2+1), $
which are Aref's $tau$ and $Omega$ in this family's angle @Aref2010. Their product does not depend on the length unit. The collapse time itself has a unique minimum $4 pi/3$ at $u = 1/2$; that number is already in Leoncini, Kuznetsov and Zaslavsky @Leoncini2000 and is not a second identity.

*Label.* Three-vortex collapse bound. This is a descriptive project label for a specialization of Gröbli’s published formula.

= Parallelogram lock

*Family.* $Gamma = (1, 1, -2-sqrt(3), -2-sqrt(3))$ at the vertices of a parallelogram whose diagonals meet at the origin, diagonal ratio $d_1/d_2 = sqrt(2+sqrt(3))$, angle $theta in (0, pi/2)$ between the diagonals. These have $L = 0$ and collapse self-similarly @NovikovSedov1979. The reciprocal pair $Gamma = (1, 1, -2+sqrt(3), -2+sqrt(3))$ with the diagonals swapped carries the same product.

#align(center)[
  $ omega_0 t_c = (sqrt(3)/4) (4 - cos 2 theta) / sin(2 theta) >= (3 sqrt(5))/4. $
]
Equality uniquely on this arc at $cos 2 theta = 1/4$.

*Proof of the minimum.* Set $phi = 2 theta in (0, pi)$. The quotient $(4 - cos phi)/sin phi$ has a unique critical point on $(0, pi)$ at $cos phi = 1/4$, where $sin phi = sqrt(15)/4$ and the quotient equals $sqrt(15)$. Multiplying by $sqrt(3)/4$ yields $3 sqrt(5)/4$. The sign of the first derivative on either side shows a minimum. Endpoints send the product to infinity. At $theta = 45 degree$ the product is $sqrt(3)$. The product is $-B/(2A)$ from Gotoda's eq. (3.13) @Gotoda2020 specialized to this parallelogram; direct Biot–Savart on the $2pi$ kernel matches that closed form to machine precision.

*Label.* Parallelogram lock, named for the geometry. Its formula follows established Novikov–Sedov and Gotoda rates.

= Quincunx lock

*Family.* $Gamma = (-1, -1, 1/2, 1/2, -3/4)$, four vortices at the vertices of a parallelogram and one at the crossing of the diagonals, diagonal ratio $d_1/d_2 = 1/sqrt(2)$, angle $theta in (0, pi/2)$ between the diagonals. These have $L = 0$ and collapse self-similarly @NovikovSedov1979 @Gotoda2020.

#align(center)[
  $ omega_0 t_c = (3/16) (7 - 4 cos 2 theta) / sin(2 theta) >= (3 sqrt(33))/16. $
]
Equality uniquely on this arc at $cos 2 theta = 4/7$.

*Proof of the minimum.* Set $phi = 2 theta in (0, pi)$. The quotient $(7 - 4 cos phi)/sin phi$ has a unique critical point on $(0, pi)$ at $cos phi = 4/7$, where $sin phi = sqrt(33)/7$ and the quotient equals $sqrt(33)$. Multiplying by $3/16$ yields $3 sqrt(33)/16$. Endpoints send the product to infinity. At $theta = 45 degree$ the product is $21/16$. The product is $-B/(2A)$ from Gotoda's five-vortex $A(theta)$, $B(theta)$ ($gamma_3 != 0$); direct Biot–Savart matches. Gotoda plots this family as Hamiltonian against collapse rate and does not form the product or state its minimum @Gotoda2020 @Gotoda2025.

*Label.* Quincunx lock, named for the geometry. Its formula follows the published five-vortex family; priority of the elementary minimum is unconfirmed.

= Attribution and historical limits

The first expression is a specialization and reparameterization of Gröbli’s §10 spiral coefficient. Set $a=sqrt(3)/cos theta$ in
$ P=(2a^2-3)/(2sqrt(3a^2-9)) $ to recover the stated product. The original scan uses $mu_1 mu_2 mu_3$ in the relevant denominator; the repository follow-up documents the transcription check @Grobli1877.

The other two expressions follow published Novikov–Sedov/Gotoda rate formulas. Their optimization is elementary: for $a>|b|$, $c>0$ and $0<phi<pi$,
$ c(a-b cos phi)/sin phi >= c sqrt(a^2-b^2), quad cos phi_* = b/a. $
The square identity $(a-b cos phi)^2-(a^2-b^2)sin^2 phi=(a cos phi-b)^2$ verifies the bound.

No earlier exact minima were located in the inspected passages, but that absence does not establish historical originality or substantial novelty. The complete older two-ring literature remains an access gap for related polygon candidates. The project currently has zero confirmed novel findings.

#link("https://github.com/SharpMeow/GENChase/blob/main/identities/ORIGINALITY-FOLLOWUP.md")[Read the original-source comparison] and #link("https://github.com/SharpMeow/GENChase/blob/main/identities/NOVELTY-AUDIT.md")[the novelty audit] before making a priority claim. No specialist endorsement is implied.

= Reuse and file provenance

Anyone may use the mathematics. Cite the classical sources for their formulas and cite GENChase when using its exposition or implementation. Repository dates record this project’s work; they do not establish first discovery. The corrected text, source and PDF have updated SHA-256 fingerprints in `identities/HASHES.txt`.

This version replaces the prior note’s unsupported naming and priority language at the author’s request. The derivations remain available under descriptive labels.

#bibliography("refs.bib", title: "References", style: "ieee")
