# Identities

Catalog of results derived in this studio that were not in the papers they sit on. Handwritten, not generated. Last updated 2026-09-20.

An entry here is something found and proved on a plate: a closed form, a unique extremum, or another checkable claim, uniqueness-checked against the papers, locked so the status line marks **miss** if the claim is wrong. **Miss is a grade on the numbers, not a crash.** The picture still draws. The site is working. Do not put a name from this file on work that already exists.

The search ledger is [`RESEARCH.md`](RESEARCH.md). The plates are `#hendricks-identity` (`#hendrick` still opens it), `#parallelogram-lock`, and `#quincunx-lock`.

**Search names for the result below:** Hendrick's Identity, Hendrick's law, Hendrick's Math, Hendrick identity, Hendricks Identity. The name of the result is **Hendrick's Identity**. Please cite it by that name.

## What a miss is (not a broken site)

Every plate in GENChase is a picture. Under many of them, a status line prints a few numbers measured from that picture, next to what the equation said those numbers should be.

| You see | What it means | What it is not |
|---|---|---|
| The picture draws, numbers sit on the prediction | The identity holds on this plate | A pass/fail of the website |
| The picture draws, status says **miss** | Those numbers did not match the prediction | A crash, a 404, or the repo being down |
| The Broken preset | A control: the vortices are placed where the identity does not apply, on purpose | A bug |

A check that cannot miss is not a check. The Broken preset exists so you can watch the numbers leave 1, 0, and 0 while the picture keeps drawing. That is how you know the test is real and not a painted-on 1.000.

## What belongs here

| Kind | Here? |
|---|---|
| A result derived here, uniqueness-checked, with a plate whose check can miss | Yes |
| A published equation under a new name | No |
| A published equation plus a feedback term | No (`track`, `causticsea`) |

To add a row: search the literature first. Web-search the closed form and the extremum, and open the papers the family sits on, before you spend time deriving. If a paper already states either, stop and log the search in `RESEARCH.md`. Only then derive, uniqueness-check, put a check on the plate that marks miss when the identity is false, write the identity here, and write the search the same day.

A row that meets the bar is named for the person who found it. Hendrick's Identity is named Hendrick because that is the finder's name. The parallelogram lock and the quincunx lock are named for their geometries. A later contributor who finds a fourth row names it for themselves, or for the geometry, in the same pull request. Do not put Hendrick's name on that row.


## Catalog

| Name | Tab | Statement | Check misses when |
|---|---|---|---|
| Hendrick's Identity | `hendricks-identity` | ω₀ t_c = (2 − cos²θ) / sin(2θ) ≥ √2 on Γ = (1, 1, −1/2), L = 0. Equality at tan θ = 1/√2 | The vortices leave the L = 0 circle, or the Biot-Savart kernel is wrong |
| Parallelogram lock | `parallelogram-lock` | ω₀ t_c = (√3/4)(4 − cos 2θ)/sin(2θ) ≥ 3√5/4 on the Novikov–Sedov parallelogram. Equality at cos 2θ = 1/4 | The vortices leave the parallelogram, or the Biot-Savart kernel is wrong |
| Quincunx lock | `quincunx-lock` | ω₀ t_c = (3/16)(7 − 4 cos 2θ)/sin(2θ) ≥ 3√33/16 on the Novikov–Sedov five-vortex quincunx. Equality at cos 2θ = 4/7 | The vortices leave the quincunx, or the Biot-Savart kernel is wrong |

## First public appearance

These three statements were first published here, by Chaos, in this repository. GitHub's commit timestamps are the public record. The motion on each family is classical. The closed form of ω₀ t_c and the unique algebraic floor are this project's.

| Statement | First public | Record |
|---|---|---|
| Hendrick's Identity, ω₀ t_c ≥ √2 | 2026-09-19 | [SharpMeow/GENChase#24](https://github.com/SharpMeow/GENChase/pull/24), [IDENTITIES.md](https://github.com/SharpMeow/GENChase/commit/6632e64) |
| Parallelogram lock, ω₀ t_c ≥ 3√5/4 | 2026-09-20 | [SharpMeow/GENChase#44](https://github.com/SharpMeow/GENChase/pull/44) |
| Quincunx lock, ω₀ t_c ≥ 3√33/16 | 2026-09-20 | [SharpMeow/GENChase#44](https://github.com/SharpMeow/GENChase/pull/44) |

Anyone may use the mathematics. Claiming first discovery of these closed forms or these floors, after those dates, without citing this file, is claiming this project's work. Do not rename them. Do not put Hendrick's name on the other two. The family (Gröbli, Novikov–Sedov, Aref, Gotoda) stays credited to those papers.

A later paper that restates one of these formulae is a restatement. Cite this file as the first public appearance unless an earlier dated source is produced. The named Tacchi thesis is not in the public record (2026-09-20). Kimura 1988 Fluid Dyn. Res. 3, 98 is a two-page complex-time note, not a coefficient table, and does not state these closed forms or these floors. Until an earlier dated source is produced, this table is the priority record.

The frozen note is [`identities/note.pdf`](identities/note.pdf) (Typst source [`identities/note.typ`](identities/note.typ)). Canonical byte-exact lines are [`identities/STATEMENTS.txt`](identities/STATEMENTS.txt). SHA-256 fingerprints (UTF-8, LF, no BOM):

| Artifact | SHA-256 |
|---|---|
| `identities/STATEMENTS.txt` | `fa51c2a28dfd93c2217c80746fe8b9a50c8e35a1edfa7172cfe6d19a8cd741ad` |
| Hendrick's Identity block | `feec9106d080aa2575665ac2ec4439f3caee99e756b293878dcb7cd5ce2ccb10` |
| Parallelogram lock block | `c5feb77708a1163c2275e0e2467a9007d97fae88e21ac3771444d8617f4d7c6e` |
| Quincunx lock block | `ab967c2c842b0532c679f767d53d780102b508a53107b00d07972df840ad850d` |
| `identities/note.pdf` | `42f47dbe13dda800d660a3f642e5131e830ca525dfafa0609c8ce33c002d955b` |

A GitHub release tag `identities-2026-09-20` attaches the PDF and the statements. How to mint a Zenodo DOI and how to upload the note to arXiv: [`identities/ARXIV.md`](identities/ARXIV.md).

---

## Hendrick's Identity

Also searched as Hendrick's law, Hendrick's Math.

An explicit formula and sharp minimum for a classical three-vortex collapse family, independently derived in this project with AI assistance.

### In plain language

Imagine three whirlpools on a flat pond. Two of them spin the same way, equally strong. The third is half as strong and spins the opposite way.

In 1877 Gröbli found that if you place those three just right, they do not wander forever. They keep the same triangle shape while that triangle shrinks, and in a finite time they crash into one point. The picture in the studio is that dance.

Aref, in 2010, wrote two separate formulas: how fast the triangle is spinning (call that ω, omega) and how long until the crash (call that t_c). Multiply those two numbers and you get a single score. That score is also the tightness of the spiral they trace as they shrink: a small score is a tight spiral that finishes soon; a large score is a looser, slower collapse.

**Hendrick's Identity is the score for this family, written as one formula, plus the fact that the score can never drop below √2 (about 1.414).** It hits that floor at one special triangle: corners of 22.5°, 45°, and 112.5°. That triangle is the Octant preset. Slide the third whirlpool around the allowed circle and the score only goes up. Step off the circle (the Broken preset) and the identity no longer applies, so the status line marks miss on purpose.

What is not being claimed: the motion itself (Gröbli), or the idea of multiplying spin by collapse time (Aref already wrote that product as the pitch of the spiral). What is being claimed: the closed formula on this family, and the unique floor of √2 at that triangle.

### Statement

Consider three point vortices with circulations

$$
(\Gamma_1,\Gamma_2,\Gamma_3)=(1,1,-\tfrac12)
$$

and normalized initial positions

$$
z_1=0,\qquad z_2=1,\qquad
z_3=\tfrac12+\tfrac{\sqrt{3}}{2}\,e^{i\theta},
\qquad 0<\theta<\tfrac{\pi}{2}.
$$

These configurations lie on the L = 0 circle and collapse self-similarly. Here θ parameterizes the third vortex's position on that circle; it is not an interior angle of the triangle.

Let ω₀ denote the initial angular velocity about the center of vorticity and t_c the collapse time. Their dimensionless product is

$$
\boxed{\displaystyle \omega_0 t_c=\frac{2-\cos^2\theta}{\sin(2\theta)}\ge\sqrt{2}.}
$$

Equality occurs uniquely on this arc at

$$
\tan\theta=\frac{1}{\sqrt{2}},
$$

giving a triangle with interior angles 22.5°, 45°, and 112.5°.

### Exact proof of the minimum

Setting u = tan θ > 0 gives

$$
\omega_0 t_c = u + \frac{1}{2u},
\qquad
\omega_0 t_c - \sqrt{2}
= \frac{(\sqrt{2}\,u-1)^2}{2u}\ge 0.
$$

The equality condition follows immediately. At θ = 45° the product is 3/2.

### The factors (same family, same 2π kernel, |z₁−z₂| = 1)

The product splits as

$$
t_c=\frac{\pi}{3}\Bigl(4u+\frac{1}{u}\Bigr),\qquad
2\pi\omega_0=\frac{3(2u^2+1)}{4u^2+1}.
$$

These are Aref's separate formulas for τ and Ω, written in this family's angle. Their product is Hendrick's identity and does not depend on the length unit. The collapse time at this length has a unique minimum 4π/3 at u = 1/2. That fastest-collapse time, in this normalization, already appears in Leoncini, Kuznetsov and Zaslavsky, Physics of Fluids 12, 1911 (2000). It is not a second identity and it is not claimed here.

### Visualization

Open `#hendricks-identity` (or `#hendrick`) in the studio. The plate displays:

- ω₀ t_c / √2, which equals 1 at the minimizing triangle and exceeds 1 elsewhere on the collapsing arc
- a similarity residual, expected to be approximately 0 during self-similar motion
- signed L, expected to be approximately 0 on the collapse circle

Octant should read 1, 0, and 0. The Broken configuration moves off the circle, so those three numbers miss on purpose and the status line marks **miss**. The picture still draws. The identity applies to this collapse family.

### Attribution and originality

Hendrick's Identity is the project's name for this formula and sharp bound. Three-vortex collapse is classical, dating to Gröbli (1877). Aref (2010) gives formulas for rotation and collapse and expresses their product in the logarithmic-spiral trajectory. The formula above follows by specializing established equations.

The explicit minimum of the product and its equality triangle are this project's observation. First public statement: this repository, 2026-09-19. This is a mathematical result within the classical point-vortex model.

Please cite it as Hendrick's Identity. Please do not republish this statement without attribution, and do not rename it. Anyone may use the mathematics; the name and this writeup are how this project asks to be credited.

### Cite

Chaos. (2026). *Hendrick's Identity*. GENChase. https://github.com/SharpMeow/GENChase/blob/main/IDENTITIES.md

```bibtex
@misc{hendricks-identity-2026,
  author       = {Chaos},
  title        = {Hendrick's Identity: an explicit formula and sharp minimum
                  for a classical three-vortex collapse family},
  year         = {2026},
  howpublished = {GENChase},
  url          = {https://github.com/SharpMeow/GENChase/blob/main/IDENTITIES.md},
  note         = {First public 2026-09-19. Also Hendrick's law, Hendrick's Math}
}
```

GitHub's "Cite this repository" button uses the same record via [`CITATION.cff`](CITATION.cff).

### References

- H. Aref, Self-similar motion of three point vortices, Physics of Fluids 22, 057104 (2010).
- W. Gröbli, Spezielle Probleme über die Bewegung geradliniger paralleler Wirbelfäden (1877).
- X. Leoncini, L. Kuznetsov and G. M. Zaslavsky, Motion of three vortices near collapse, Physics of Fluids 12, 1911 (2000).
- Y. Kimura, Chaos and collapse of a system of point vortices, Fluid Dyn. Res. 3, 98 (1988). Two-page conference note on complex-time singularities. Not a coefficient table and not these closed forms.

Prior-art searches against Aref, Gröbli, Krishnamurthy and Stremler, Kudela, Reinaud and Dritschel, Leoncini, Kuznetsov and Zaslavsky, and Kimura 1987–1990 are logged in [`RESEARCH.md`](RESEARCH.md). The named Tacchi thesis is not in theses.fr, HAL, or arXiv.

---

## Parallelogram lock

An explicit formula and sharp minimum for the classical four-vortex parallelogram collapse family, independently derived in this project with AI assistance.

### In plain language

Imagine four whirlpools at the corners of a parallelogram. Two of them, on one diagonal, spin the same way, equally strong. The other two, on the other diagonal, spin the opposite way, stronger, with the ratio 2 + √3 so the whole figure can shrink without stretching.

They can collapse to a point while staying the same shape, spinning as they go. How fast they spin, times how long until they meet, is a single score that does not care how large you drew the figure.

**The parallelogram lock is that score as one formula, plus the fact that it can never drop below 3√5/4 (about 1.677).** It hits that floor at one angle between the diagonals: cos 2θ = 1/4, about 37.761°. That is the Lock preset. Slide the angle and the score only goes up. Step off the parallelogram (the Broken preset) and the identity no longer applies, so the status line marks miss on purpose.

### Statement

Four point vortices with circulations

$$
(\Gamma_1,\Gamma_2,\Gamma_3,\Gamma_4)=(1,1,-2-\sqrt{3},-2-\sqrt{3})
$$

and positions at the vertices of a parallelogram whose diagonals meet at the origin,

$$
z_1=\tfrac12 d_1 e^{i\theta},\quad
z_2=-\tfrac12 d_1 e^{i\theta},\quad
z_3=-\tfrac12 d_2,\quad
z_4=\tfrac12 d_2,
$$

with $d_1/d_2=\sqrt{2+\sqrt{3}}$ and $0<\theta<\pi/2$. These configurations have $L=0$ and collapse self-similarly (Novikov and Sedov 1979). $\theta$ is the angle between the diagonals.

Let $\omega_0$ denote the initial angular velocity about the center of vorticity and $t_c$ the collapse time. Their dimensionless product is

$$
\boxed{\omega_0 t_c=\frac{\sqrt{3}}{4}\frac{4-\cos 2\theta}{\sin 2\theta}\ge\frac{3\sqrt{5}}{4}.}
$$

Equality occurs uniquely on this arc at $\cos 2\theta=1/4$.

The reciprocal pair $\Gamma=(1,1,-2+\sqrt{3},-2+\sqrt{3})$ with $d_1/d_2=\sqrt{2-\sqrt{3}}$ is the same family with the diagonals swapped, and carries the same product.

### Exact proof of the minimum

Setting $\varphi=2\theta\in(0,\pi)$ gives

$$
\omega_0 t_c=\frac{\sqrt{3}}{4}\frac{4-\cos\varphi}{\sin\varphi}.
$$

Differentiating the quotient, the unique critical point on $(0,\pi)$ is $\cos\varphi=1/4$, where $\sin\varphi=\sqrt{15}/4$ and the quotient equals $\sqrt{15}$. Multiplying by $\sqrt{3}/4$ yields $3\sqrt{5}/4$. The second-derivative (or the sign of the first derivative on either side) shows it is a minimum. At $\theta=45^\circ$ the product is $\sqrt{3}$.

The product follows by specializing Gotoda's $A(\theta)$ and $B(\theta)$ (2020, eq. 3.13, after Novikov and Sedov): $\omega_0 t_c=-B/(2A)$. Direct Biot-Savart on this family's parallelograms (2π kernel) matches that closed form to machine precision.

### Visualization

Open `#parallelogram-lock` in the studio. The plate displays:

* $|\omega_0 t_c|/(3\sqrt{5}/4)$, which equals 1 at the minimizing parallelogram and exceeds 1 elsewhere on the family.
* A similarity residual, expected to be approximately 0 during self-similar motion.
* Signed $L$, expected to be approximately 0 on the collapse parallelograms.

The Broken configuration moves a vertex off the parallelogram to illustrate departure from the self-similar collapse conditions. The identity applies to the specified family.

### Attribution and originality

"Parallelogram lock" is the project's name for this formula and sharp bound. Four-vortex parallelogram collapse is Novikov and Sedov (1979). Gotoda (2020) writes $A(\theta)$ and $B(\theta)$ separately and plots the Hamiltonian against the collapse rate. The formula above follows by specializing those equations. The explicit minimum and its equality angle are this project's observation. First public statement: this repository, 2026-09-20. This is a mathematical result within the classical point-vortex model. It is not Novikov and Sedov's motion under a new name, and it is not their $t_*$ or $\omega$ separately under a new name.

### Cite

Chaos. (2026). *Parallelogram lock*. GENChase. https://github.com/SharpMeow/GENChase/blob/main/IDENTITIES.md

```bibtex
@misc{parallelogram-lock-2026,
  author       = {Chaos},
  title        = {Parallelogram lock: an explicit formula and sharp minimum
                  for the Novikov--Sedov four-vortex parallelogram collapse},
  year         = {2026},
  howpublished = {GENChase},
  url          = {https://github.com/SharpMeow/GENChase/blob/main/IDENTITIES.md},
  note         = {First public statement 2026-09-20. $\omega_0 t_c \ge 3\sqrt{5}/4$}
}
```

References:

* E. A. Novikov and Yu. B. Sedov, Vortex collapse, Sov. Phys. JETP 50, 297 (1979).
* T. Gotoda, Self-similar motions and related relative equilibria in the $N$-point vortex system, J. Dyn. Diff. Equat. (2020), arXiv:2002.09624, eq. (3.13).

---

## Quincunx lock

An explicit formula and sharp minimum for the classical five-vortex quincunx collapse family, independently derived in this project with AI assistance.

### In plain language

Imagine five whirlpools. Four sit at the corners of a parallelogram. The fifth sits where the diagonals cross.

Two on one diagonal spin the same way. Two on the other spin the opposite way, half as strong. The one in the middle is three-quarters as strong as the first pair, and spins with them. That mix, with the diagonals in the ratio $1/\sqrt{2}$, is the one Novikov and Sedov found in 1979: the whole figure can shrink without stretching.

They can collapse to a point while staying the same shape, spinning as they go. How fast they spin, times how long until they meet, is a single score that does not care how large you drew the figure.

**The quincunx lock is that score as one formula, plus the fact that it can never drop below $3\sqrt{33}/16$ (about 1.073).** It hits that floor at one angle between the diagonals: $\cos 2\theta = 4/7$, about 27.575°. That is the Lock preset. Slide the angle and the score only goes up. Step off the quincunx (the Broken preset) and the identity no longer applies, so the status line marks miss on purpose.

### Statement

Five point vortices with circulations

$$
(\Gamma_1,\Gamma_2,\Gamma_3,\Gamma_4,\Gamma_5)=(-1,-1,\tfrac12,\tfrac12,-\tfrac34)
$$

and positions a parallelogram plus its center,

$$
z_1=\tfrac12 d_1 e^{i\theta},\quad
z_2=-\tfrac12 d_1 e^{i\theta},\quad
z_3=-\tfrac12 d_2,\quad
z_4=\tfrac12 d_2,\quad
z_5=0,
$$

with $d_1/d_2=1/\sqrt{2}$ and $0<\theta<\pi/2$. These configurations have $L=0$ and collapse self-similarly (Novikov and Sedov 1979; Gotoda's five-vortex example). $\theta$ is the angle between the diagonals.

Let $\omega_0$ denote the initial angular velocity about the center of vorticity and $t_c$ the collapse time. Their dimensionless product is

$$
\boxed{\omega_0 t_c=\frac{3}{16}\frac{7-4\cos 2\theta}{\sin 2\theta}\ge\frac{3\sqrt{33}}{16}.}
$$

Equality occurs uniquely on this arc at $\cos 2\theta=4/7$.

The reciprocal pair with the diagonals swapped is the same family and carries the same product.

### Exact proof of the minimum

Setting $\varphi=2\theta\in(0,\pi)$ gives

$$
\omega_0 t_c=\frac{3}{16}\frac{7-4\cos\varphi}{\sin\varphi}.
$$

Differentiating the quotient, the unique critical point on $(0,\pi)$ is $\cos\varphi=4/7$, where $\sin\varphi=\sqrt{33}/7$ and the quotient equals $\sqrt{33}$. Multiplying by $3/16$ yields $3\sqrt{33}/16$. The sign of the first derivative on either side shows it is a minimum. Endpoints $\varphi\to 0,\pi$ send the product to infinity. At $\theta=45^\circ$ the product is $21/16$.

The product follows by specializing Gotoda's $A(\theta)$ and $B(\theta)$ (2020, eq. 3.13, the five-vortex case $\gamma_3\neq 0$): $\omega_0 t_c=-B/(2A)$. Direct Biot-Savart on this family's quincunxes (2π kernel) matches that closed form to machine precision.

### Visualization

Open `#quincunx-lock` in the studio. The plate displays:

* $|\omega_0 t_c|/(3\sqrt{33}/16)$, which equals 1 at the minimizing quincunx and exceeds 1 elsewhere on the family.
* A similarity residual, expected to be approximately 0 during self-similar motion.
* Signed $L$, expected to be approximately 0 on the collapse quincunxes.

The Broken configuration moves a vertex off the parallelogram to illustrate departure from the self-similar collapse conditions. The identity applies to the specified family.

### Attribution and originality

"Quincunx lock" is the project's name for this formula and sharp bound. Five-vortex parallelogram-plus-center collapse is Novikov and Sedov (1979). Gotoda (2020) writes $A(\theta)$ and $B(\theta)$ separately, including the $\gamma_3$ terms, and plots this family ($\gamma_1=-1$, $\gamma_2=1/2$, $\gamma_3=-3/4$) as Hamiltonian against collapse rate. Gotoda (2024) studies filtered-vortex enstrophy on the same family numerically. Neither paper forms the product $\omega t_c$ or states its minimum. The formula above follows by specializing those equations. The explicit minimum and its equality angle are this project's observation. First public statement: this repository, 2026-09-20. This is a mathematical result within the classical point-vortex model. It is not Novikov and Sedov's motion under a new name, and it is not their $t_*$ or $\omega$ separately under a new name. It is not the four-vortex parallelogram lock.

### Cite

Chaos. (2026). *Quincunx lock*. GENChase. https://github.com/SharpMeow/GENChase/blob/main/IDENTITIES.md

```bibtex
@misc{quincunx-lock-2026,
  author       = {Chaos},
  title        = {Quincunx lock: an explicit formula and sharp minimum
                  for the Novikov--Sedov five-vortex quincunx collapse},
  year         = {2026},
  howpublished = {GENChase},
  url          = {https://github.com/SharpMeow/GENChase/blob/main/IDENTITIES.md},
  note         = {First public statement 2026-09-20. $\omega_0 t_c \ge 3\sqrt{33}/16$}
}
```

A different five-vortex slice of the same Novikov–Sedov family, with diagonal ratio $\mu=3$, recovers Hendrick's product $\omega_0 t_c=(3-\cos 2\theta)/(2\sin 2\theta)\ge\sqrt{2}$ identically. That is Hendrick's Identity on five vortices, not a third identity, and it is not claimed here.

References:

* E. A. Novikov and Yu. B. Sedov, Vortex collapse, Sov. Phys. JETP 50, 297 (1979).
* T. Gotoda, Self-similar motions and related relative equilibria in the $N$-point vortex system, J. Dyn. Diff. Equat. (2020), arXiv:2002.09624, eq. (3.13).
* T. Gotoda, Enstrophy variations in the collapsing process of point vortices, J. Fluid Mech. (2025), arXiv:2410.14973.

---

There are three rows. Leapfrogging, Kirchhoff, the photon-sphere Lyapunov, Crapper energy, Gerstner $T=V$, spherical three-vortex collapse, the three-vortex $t_c$ minimum, Peregrine's amplitude 3, and Moore–Saffman's strain bound remain published and are not claimed.

Checked 2026-09-20 and not a fourth row: the remaining exact Novikov-Sedov five-vortex slices (the quincunx with the diagonals swapped, Hendrick on five vortices at diagonal ratio 3, and slices whose minimum is a nested radical), three-vortex $L=0$ with $\Gamma_1\neq\Gamma_2$ (Gotoda's $\theta$ gives a closed product; the critical point is a cubic in $\cos\theta$, not a floor like $\sqrt{2}$), and kite, non-parallelogram trapezoid, and equilateral-plus-interior four-vortex scans, which had no self-similar $L=0$ family. Seven-vortex Gotoda (4.4) is numerical $H$-$A$ curves. The search is in [`RESEARCH.md`](RESEARCH.md). Do not re-derive these. Do not put Hendrick's name on a second result.

Checked again 2026-09-20, still not a fourth row. Distinguished five-vortex diagonal ratios other than $1/2$, $2$, $3$, and $2\pm\sqrt{3}$: $\varphi$, $\sqrt{2}$, $3/2$, and the rest give a product of the form $C(a-b\cos 2\theta)/\sin 2\theta$ whose minimum is a messy radical, not a floor like $\sqrt{2}$. The slice $\mu=2+\sqrt{3}$ kills the center vortex and recovers the parallelogram lock identically. Gotoda 4.1 with $\Gamma=(1,1,1,-1)$ is numerical $H$-$A$ curves; an isosceles-plus-axis Biot-Savart scan found no self-similar $L=0$ family. O'Neil's explicit quadruple and the hollow-vortex 2025 triples/quadruples are single published configurations, not a one-parameter family. Kallyadan–Shukla 2022 families are numerical. Mixed-sign wall/image and periodic-strip collapse have no closed $A(\theta)$, $B(\theta)$. Gotoda 2025 $\theta_Z$ remains a grid bracket. Do not claim any of these. Do not put Hendrick's name on them.

Checked 2026-09-20 outside planar point-vortex collapse. Love's leapfrog period is complete elliptic integrals, not an algebraic floor; existence $\alpha=3-2\sqrt{2}$ and stability $\alpha=\varphi^{-2}$ are already published. Three-vortex collapse on a sphere has a distinct angular velocity at each vortex (Kidambi–Newton). SQG / generalized-Euler collapse times are numerical. Moore–Saffman and Kida give published strain bounds, not a product min. Stuart / Mallier–Maslowe, Peregrine $|u|_{\max}=3$, Thomson's centered $N$-gon, hetons, and Calogero's goldfish are published families. The search is in [`RESEARCH.md`](RESEARCH.md). Do not claim these. Do not put Hendrick's name on them.

Checked again 2026-09-20: Crowdy H-states give an explicit relative-equilibrium $\Omega(a,N)$, not a collapse product. Baker–Saffman–Sheffield and Stremler–Aref are integrable or energy families, not self-similar collapse. Sakajo proved four-vortex self-similar collapse on a sphere is impossible. Kaden's spiral and Borisov–Kilin–Mamaev three-ring leapfrogging are published. The named Tacchi thesis is not in the public record; Kimura 1988 FDR 3, 98 is the two-page complex-time note already logged. Do not claim these.

Checked again 2026-09-20: Kimura 1987 is the general similarity solution (the collinear three-vortex condition is a cubic, already the $\mu\neq 1$ skip). Norbury–Fraenkel, Pocklington, Lamb–Chaplygin, Komineas magnetic Gröbli, hyperbolic-plane relative equilibria, Crowdy wedge layers, and Kudela's numerical $n$-vortex collapses are published or not an algebraic product min. Do not claim these. Do not put Hendrick's name on them.

Checked again 2026-09-20: Moffatt–Kimura 2019 give $s\kappa=2\sin\alpha$ (equals $\sqrt{2}$ at $\alpha=\pi/4$) for a filament pair; that $\sqrt{2}$ is theirs, not Hendrick. Burgers dissipation, Föppl's cylinder locus, Benjamin–Ono $\|c\|\Delta=1$, Degasperis–Procesi / Novikov peakons, and Platonic vortex crystals are published. Do not claim these.

Checked 2026-09-20 outside vortex dynamics. Euler elastica, Delaunay unduloids, the catenoid–helicoid Bonnet family, Maclaurin–Jacobi ellipsoids, Calogero–Moser frequencies, KdV two-soliton phase shifts, Kerr ISCO, ABC flows, Stokes's 120° wave, Wilton ripples, the Toda lattice, the Lagrange top, and Ginzburg–Landau $\kappa=1/\sqrt{2}$ are published or elliptic/numerical. Do not claim these. Do not put Hendrick's name on Ginzburg–Landau's $1/\sqrt{2}$.

Checked 2026-09-20 n-body, Laplacian growth, and classical mechanics. Four-body kite/rhombus central configurations (degree-12 $\varphi(\mu)$; Roberts infimum $(25+3\sqrt{69})/2$ is Routh's restricted three-body mass). Homographic motion is Keplerian in the scale. Hele-Shaw/Laplacian-growth cusps have closed $t_c$ for polynomial maps, Saffman–Taylor selects $\lambda=1/2$. Kapitza inverted pendulum $(a/l)(\omega/\omega_0)>\sqrt{2}$ is a published threshold. Jeffery orbits $T\dot\gamma=2\pi(r+1/r)$ min $4\pi$ by AM-GM (1922). Rayleigh–Plateau slender $\lambda=2\pi\sqrt{2}\,R$. Cotes inverse-cube spirals. Gold–Hoyle twist. Kirchhoff–Routh in a bounded domain. Do not claim these. Do not put Hendrick's name on Kapitza's $\sqrt{2}$, Jeffery's $4\pi$, Routh's $(25+3\sqrt{69})/2$, or Saffman–Taylor's $1/2$.

Checked 2026-09-20 streets, V-states, shocks, n-body blow-up. Von Kármán $b/l=\mathrm{arcosh}(\sqrt{2})/\pi$ is an isolated published lock, not a 1-parameter product of two rates. Saffman–Szeto / Pierrehumbert pairs end at a touching Sadovskii state (existence 2025, variational speed). Deem–Zabusky V-states bifurcate at Kelvin $\Omega_m=(m-1)/(2m)$; limiting shapes numerical. Ptolemaic / Abrashkin–Yakubovich contain Gerstner and Kirchhoff (already logged) with two free frequencies. Guderley converging-shock exponent is an ODE eigenvalue. Crow $\lambda/b$ is a numerical max. Havelock n-gon $\Omega=(n-1)\kappa/(4\pi a^2)$, stable $N<7$. McGehee triple collision is a blow-up with ten fixed points. Chaplygin 1899/1903 dipoles are isolated exact Euler. Do not claim these. Do not put Hendrick's name on von Kármán's ratio.

Checked 2026-09-20 continua, remaining n-body, remaining vortex objects. Lane–Emden $n=1$ first zero $\pi$; Sedov–Taylor $Dt/R=2/5$; BKT $k_BT_c=\pi J/2$ and the universal jump $2/\pi$; Ritter dam-break $u_{\mathrm{front}}=2\sqrt{gh_0}$; Lundquist reversal at $j_{0,1}$. Isolated published locks, not a 1-parameter product min. Figure-eight three-body is variational with Kepler scaling. Miche / Penney–Price standing crest is $90^\circ$, steepness numerical. Aref tripole and Novikov vortons are the 2D skip in another coat. Widnall is one unstable mode set by core size. Euler collinear is a fifth-degree homographic Kepler. Sitnikov is elliptic or chaotic. Do not claim these. Do not put Hendrick's name on BKT's $\pi/2$.

Checked 2026-09-20 stellar structure, remaining gas dynamics, remaining waves, remaining exact NS. Roche lobe vs $q$ is numerical (Eggleton fit). Chandrasekhar mass is Lane–Emden $n=3$. Jeans length and Toomre $Q=c_s\kappa/(\pi G\Sigma)\ge 1$ are published stability thresholds. Noh jump and Barenblatt dipole are self-similar published. Carrier–Greenspan runup and Nekrasov integral equation: standing/progressive extrema already logged or numerical. Davey–Stewartson lumps sit next to the KP lump already in the studio. Tkachenko $\omega\propto k$ or $k^2$. Schubart is a numerical collinear period. Batchelor $q$-vortex and Sullivan two-cell are exact NS (Burgers already logged). Prandtl–Batchelor is a theorem that closed-streamline vorticity is constant. Do not claim these. Do not put Hendrick's name on Toomre's $Q=1$.

Checked 2026-09-20 hydrodynamic instabilities, plasma, geophysical waves, remaining n-body. Rayleigh free-free $\mathrm{Ra}_c=27\pi^4/4$ at $kd=\pi/\sqrt{2}$ is an isolated published lock. Rigid-rigid $\mathrm{Ra}_c\approx 1708$ and Taylor $\mathrm{Ta}_c\approx 1708$ are the same numerical threshold. Landau damping and two-stream growth are published kinetic theory. Rossby $L_d=NH/f$; Eady max growth $\approx 0.31$ is numerical. Onsager negative temperature of point vortices is statistical. Hill's lunar variational orbit is a power series in $m$. Feynman–Onsager $\kappa=h/m$ and Alfvén $v_A=B/\sqrt{\mu_0\rho}$ are isolated published. Do not claim these. Do not put Hendrick's name on Rayleigh's $27\pi^4/4$.

Checked 2026-09-20 whether any unused Novikov–Sedov / Gotoda family still has closed $A(\theta)$, $B(\theta)$. Gotoda arXiv:2002.09624 gives closed coefficients only for three-vortex, parallelogram four, and five-vortex. $N\ge 6$ is numerical $H$-$A$. Novikov–Sedov 1979 stop at five. Extra-$\mu$ five-vortex slices share the quincunx functional form and are already skipped. Rott 1994 integrable four has a winding number (ratio of two periods); path patterns are numerical. Eckhardt 1989 reduces to one degree of freedom with elliptic periods (Love-class). Jeffery–Hamel $\alpha_c$ is a complete elliptic integral. Do not claim these. There is no unused closed $A$, $B$ family left in that catalogue.

Checked 2026-09-20 rigid-body, MHD sheets, β-plane dipoles, minimal surfaces. Routh rolling disk: two rates (precession and spin) vs lean; critical lean is an isolated published arctan of a nested radical. Double pendulum $\omega_\pm=\sqrt{2\pm\sqrt{2}}\,\sqrt{g/l}$, product $\sqrt{2}\,g/l$ is the textbook pair, not a 1-param unpublished floor. Fadeev sheet is Stuart's MHD cousin. Larichev–Reznik modon is Lamb–Chaplygin on the β-plane. Critical catenoid is $w=\mathrm{coth}\,w$. Clebsch / Kovalevskaya / Chaplygin sleigh are elliptic or nonholonomic. Do not claim these. Do not put Hendrick's name on the double-pendulum $\sqrt{2}$.

Checked 2026-09-20 underresearched catalogues. gSQG / α-Euler three-vortex collapse is numerical in α (2D Euler slice is Hendrick). Massive point vortices forbid collapse. Hollow-vortex implosion desingularizes existing rows. Vortices on ellipsoid/bean have no closed collapse product; conical NS is a 2-param exact family with numerical existence. Zipoy–Voorhees photon and ISCO are isolated published radii vs γ. Prandtl punch $2+\pi$ is 1920. Kasner is two constraints on three exponents. Camassa–Holm two-peakon phase shift is published 1993. Do not claim these. Do not put Hendrick's name on Prandtl's $2+\pi$.

Checked 2026-09-20 cutting-edge 2025. Chen–Walsh–Wheeler (arXiv:2506.04093) construct the first self-similar hollow-vortex implosion and desingularize any non-degenerate point-vortex collapse — including the three rows above — to a real-analytic family of 2D Euler hollow imploders. Circular $U_c(\gamma,\Omega,\kappa)$ is explicit; $\Omega$ and $\kappa$ are independent, not a shape-parameter floor. Grotto–Pappalettera (arXiv:2505.19782) prove gSQG burst/collapse existence; $a,b$ are not closed in shape; $\alpha=2$ is 2D Euler. White–McDonald (Proc. R. Soc. A 2025) and PRFluids 10, 084708 (2025) are equilibria, not collapse products. Cite Chen–Walsh–Wheeler as the Euler realization of the three locks. Do not claim a fourth row from these papers.

Checked 2026-09-20 missed geometries. Nested two-triangle six-vortex with $I=0$ is not self-similar: $A+iB$ on the $+$ triangle disagrees with $A+iB$ on the $-$ triangle (Biot–Savart scan at $\mu=1,1/2,2$). Collapsing configs lack that reflection symmetry. Two vortices in a BEC trap have a published min of one frequency vs separation. Hicks doughnut is thin-core series (Norbury already). Fukumoto–Miyazaki is the elastica analog of a filament with axial flow (Hasimoto already in the studio). Coaxial leapfrog rings now have a 2026 Euler existence proof (arXiv:2603.21644); that is KAM, not an algebraic floor. Do not claim these.

Checked 2026-09-20 difficulty skips. Three-vortex $\mu\neq 1$: Gotoda $A,B$ are closed; $\mu=1$ is Hendrick $\sqrt{2}$; reciprocal pairs share the product; other $\mu$ have a cubic critical point, not a floor like $\sqrt{2}$. Same family, not a new row. Gallay–Sverak (arXiv:2609.10847, 9 Sep 2026) give a new $\zeta$-reduction and energy inequalities for near-collisions, not a two-rate product min. Rott 1994 winding number remains AIP-blocked; the abstract already says path patterns are numerical. Do not claim these.

Checked 2026-09-20 non-orientable vortices, pursuit, C-metric. Balabanova–Montaldi (Physica D 2026) Möbius/Klein: N-ring $\mathrm{coth}$ angular velocities and nested-radical two-vortex equilibria; no collapse product. Four bugs: parallelograms converge to a square (Chapman–Trefethen 2011); square $T=L/v$ is isolated. C-metric photon vs $\alpha$ is an isolated published radius. Three-heton has no unused closed $A,B$. Do not claim these. Do not put Hendrick's name on Möbius $\mathrm{coth}$ or the four-bug square.

The next row has the same bar: a literature search first, a derivation, the papers, a plate whose check can miss, and a line in this file the same day.


