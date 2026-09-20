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

## Catalog

| Name | Tab | Statement | Check misses when |
|---|---|---|---|
| Hendrick's Identity | `hendricks-identity` | ω₀ t_c = (2 − cos²θ) / sin(2θ) ≥ √2 on Γ = (1, 1, −1/2), L = 0. Equality at tan θ = 1/√2 | The vortices leave the L = 0 circle, or the Biot-Savart kernel is wrong |
| Parallelogram lock | `parallelogram-lock` | ω₀ t_c = (√3/4)(4 − cos 2θ)/sin(2θ) ≥ 3√5/4 on the Novikov–Sedov parallelogram. Equality at cos 2θ = 1/4 | The vortices leave the parallelogram, or the Biot-Savart kernel is wrong |
| Quincunx lock | `quincunx-lock` | ω₀ t_c = (3/16)(7 − 4 cos 2θ)/sin(2θ) ≥ 3√33/16 on the Novikov–Sedov five-vortex quincunx. Equality at cos 2θ = 4/7 | The vortices leave the quincunx, or the Biot-Savart kernel is wrong |

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

The explicit minimum of the product and its equality triangle are the focus of this project's observation. Historical priority has not been established. This is a mathematical result within the classical point-vortex model.

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
  note         = {Also referred to as Hendrick's law, Hendrick's Math}
}
```

GitHub's "Cite this repository" button uses the same record via [`CITATION.cff`](CITATION.cff).

### References

- H. Aref, Self-similar motion of three point vortices, Physics of Fluids 22, 057104 (2010).
- W. Gröbli, Spezielle Probleme über die Bewegung geradliniger paralleler Wirbelfäden (1877).
- X. Leoncini, L. Kuznetsov and G. M. Zaslavsky, Motion of three vortices near collapse, Physics of Fluids 12, 1911 (2000).
- M. Tacchi, Dynamique des tourbillons dans les fluides bidimensionnels, Appendix B, documenting related explicit coefficients in an example attributed to Kimura (1988).

Prior-art searches against Aref, Gröbli, Krishnamurthy and Stremler, Kudela, Reinaud and Dritschel, and Leoncini, Kuznetsov and Zaslavsky are logged in [`RESEARCH.md`](RESEARCH.md). Tacchi's appendix was named in this writeup and has not yet been opened from the machines that keep that ledger.

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

"Parallelogram lock" is the project's name for this formula and sharp bound. Four-vortex parallelogram collapse is Novikov and Sedov (1979). Gotoda (2020) writes $A(\theta)$ and $B(\theta)$ separately and plots the Hamiltonian against the collapse rate. The formula above follows by specializing those equations. The explicit minimum and its equality angle are the focus of this project's observation. Historical priority has not been established. This is a mathematical result within the classical point-vortex model. It is not Novikov and Sedov's motion under a new name, and it is not their $t_*$ or $\omega$ separately under a new name.

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

"Quincunx lock" is the project's name for this formula and sharp bound. Five-vortex parallelogram-plus-center collapse is Novikov and Sedov (1979). Gotoda (2020) writes $A(\theta)$ and $B(\theta)$ separately, including the $\gamma_3$ terms, and plots this family ($\gamma_1=-1$, $\gamma_2=1/2$, $\gamma_3=-3/4$) as Hamiltonian against collapse rate. Gotoda (2024) studies filtered-vortex enstrophy on the same family numerically. Neither paper forms the product $\omega t_c$ or states its minimum. The formula above follows by specializing those equations. The explicit minimum and its equality angle are the focus of this project's observation. Historical priority has not been established. This is a mathematical result within the classical point-vortex model. It is not Novikov and Sedov's motion under a new name, and it is not their $t_*$ or $\omega$ separately under a new name. It is not the four-vortex parallelogram lock.

A different five-vortex slice of the same Novikov–Sedov family, with diagonal ratio $\mu=3$, recovers Hendrick's product $\omega_0 t_c=(3-\cos 2\theta)/(2\sin 2\theta)\ge\sqrt{2}$ identically. That is Hendrick's Identity on five vortices, not a third identity, and it is not claimed here.

References:

* E. A. Novikov and Yu. B. Sedov, Vortex collapse, Sov. Phys. JETP 50, 297 (1979).
* T. Gotoda, Self-similar motions and related relative equilibria in the $N$-point vortex system, J. Dyn. Diff. Equat. (2020), arXiv:2002.09624, eq. (3.13).
* T. Gotoda, Enstrophy variations in the collapsing process of point vortices, J. Fluid Mech. (2025), arXiv:2410.14973.

---

There are three rows. Leapfrogging, Kirchhoff, the photon-sphere Lyapunov, Crapper energy, Gerstner $T=V$, spherical three-vortex collapse, and the three-vortex $t_c$ minimum remain published and are not claimed. The next row has the same bar: a literature search first, a derivation, the papers, a plate whose check can miss, and a line in this file the same day. Do not put Hendrick's name on a second result.

