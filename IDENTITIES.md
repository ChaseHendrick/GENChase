# Identities

Catalog of results derived in this studio that were not in the papers they sit on. Handwritten, not generated. Last updated 2026-09-19.

An entry here is something found and proved on a plate: a closed form, a unique extremum, or another checkable claim, uniqueness-checked against the papers, locked so the plate fails if the claim is wrong. Do not put a name from this file on work that already exists.

The search ledger is [`RESEARCH.md`](RESEARCH.md). The plate is `#hendricks-identity` (`#hendrick` still opens it).

**Search names for the result below:** Hendrick's Identity, Hendrick's law, Hendrick's Math, Hendrick identity, Hendricks Identity. The name of the result is **Hendrick's Identity**. Please cite it by that name.

## What belongs here

| Kind | Here? |
|---|---|
| A result derived here, uniqueness-checked, with a plate that can fail it | Yes |
| A published equation under a new name | No |
| A published equation plus a feedback term | No (`track`, `causticsea`) |

To add a row: derive it, read the papers it sits on, put a check on the plate that goes red when the identity is false, write the identity here, and write the search in `RESEARCH.md` the same day.

## Catalog

| Name | Tab | Statement | Plate fails when |
|---|---|---|---|
| Hendrick's Identity | `hendricks-identity` | ω₀ t_c = (2 − cos²θ) / sin(2θ) ≥ √2 on Γ = (1, 1, −1/2), L = 0. Equality at tan θ = 1/√2 | The vortices leave the L = 0 circle, or the Biot-Savart kernel is wrong |

---

## Hendrick's Identity

Also searched as Hendrick's law, Hendrick's Math.

An explicit formula and sharp minimum for a classical three-vortex collapse family, independently derived in this project with AI assistance.

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

### Visualization

Open `#hendricks-identity` (or `#hendrick`) in the studio. The plate displays:

- ω₀ t_c / √2, which equals 1 at the minimizing triangle and exceeds 1 elsewhere on the collapsing arc
- a similarity residual, expected to be approximately 0 during self-similar motion
- signed L, expected to be approximately 0 on the collapse circle

The Broken configuration moves off the circle to illustrate departure from the self-similar collapse conditions. The identity applies to this collapse family.

### Attribution and originality

Hendrick's Identity is the project's name for this formula and sharp bound. Three-vortex collapse is classical, dating to Gröbli (1877). Aref (2010) gives formulas for rotation and collapse and expresses their product in the logarithmic-spiral trajectory. The formula above follows by specializing established equations.

The explicit minimum and its equality triangle are the focus of this project's observation. Historical priority has not been established. This is a mathematical result within the classical point-vortex model.

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
- M. Tacchi, Dynamique des tourbillons dans les fluides bidimensionnels, Appendix B, documenting related explicit coefficients in an example attributed to Kimura (1988).

Prior-art searches against Aref, Gröbli, Krishnamurthy and Stremler, Kudela, and Reinaud and Dritschel are logged in [`RESEARCH.md`](RESEARCH.md). Tacchi's appendix was named in this writeup and has not yet been opened from the machines that keep that ledger.

---

There is one row. The next one has the same bar: a derivation, the papers, a plate that can fail, and a line in this file the same day.
