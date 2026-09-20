# Identities

Catalog of results derived in this studio that were not in the papers they sit on. Handwritten, not generated. Last updated 2026-09-20.

An entry here is something found and proved on a plate: a closed form, a unique extremum, or another checkable claim, uniqueness-checked against the papers, locked so the status line marks **miss** if the claim is wrong. **Miss is a grade on the numbers, not a crash.** The picture still draws. The site is working. Do not put a name from this file on work that already exists.

The search ledger is [`RESEARCH.md`](RESEARCH.md). The plate is `#hendricks-identity` (`#hendrick` still opens it).

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

There is one row. A 2026-09-20 search for a second identity of this bar did not find one that was both algebraic and unpublished. A later pass the same day searched leapfrogging, Kirchhoff, the photon-sphere Lyapunov, Crapper energy, Gerstner T = V, and spherical three-vortex collapse: all of those locks are already in named papers. The rejected candidates, and why, are in [`RESEARCH.md`](RESEARCH.md). The next row has the same bar: a literature search first, a derivation, the papers, a plate whose check can miss, and a line in this file the same day.
