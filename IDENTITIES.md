# Identities

Catalog of results derived in this studio that were not in the papers they sit on. Handwritten, not generated. Last updated 2026-09-19.

An entry here is something found and proved on a plate: a closed form, a unique extremum, or another checkable claim, uniqueness-checked against the papers, locked so the plate fails if the claim is wrong. Do not put a name from this file on work that already exists.

The search ledger is [`RESEARCH.md`](RESEARCH.md). The plate is `#hendricks-identity`.

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
| Hendrick's Identity | `hendricks-identity` | On Γ = (1, 1, −1/2), L = 0: ω t_c = (2 − cos²θ) / sin(2θ), unique min √2 at tan θ = 1/√2 | The vortices leave Gröbli's circle, or the Biot-Savart kernel is wrong |

`#hendrick` still opens the plate.

---

## Hendrick's Identity

**Statement.** Three point vortices of circulations Γ = (1, 1, −1/2), placed so their signed angular impulse vanishes (L = 0), collapse or expand self-similarly. Parameterize that family by the angle θ of the third vortex on the circle of radius √3/2 about the midpoint of the first two. Let ω be the common angular velocity about the center of vorticity, and t_c the collapse (or expansion) time from the geometric radius R² / |dR²/dt|. Then

    ω t_c = (2 − cos² θ) / sin(2θ)

on (0, π/2) ∪ (π/2, π), taking the absolute value on the expanding arc. The product is independent of whether the Biot-Savart kernel is written with 2π or without it.

**Minimum.** On the collapsing arc (0, π/2) the unique critical point is tan θ = 1/√2, where ω t_c = √2. The triangle there has angles π/8, π/4, 5π/8 (22.5°, 45°, 112.5°). At construction θ = 45° the same product is 3/2. At θ = 90° the triangle is equilateral, L = 0 still, ω t_c diverges, and the motion is a relative equilibrium.

Check of the critical value: tan² θ = 1/2 gives cos² θ = 2/3 and sin(2θ) = 2√2 / 3, so (2 − 2/3) / (2√2 / 3) = √2.

**What this is not.** The motion is Gröbli, 1877. Aref, Phys. Fluids 22, 057104 (2010), eqs. 25a and 25d, gives the angular frequency and the collapse time separately. His eq. 29c writes their product as the pitch of the logarithmic spiral, and the stability section treats that product as invariant under a similarity perturbation. Collapse-time minima of τ, not of ω τ, appear in Kudela 2014 and Reinaud and Dritschel 2022. Krishnamurthy and Stremler 2018 give a dimensionless τ as a function of angles, with no min √2. The closed form of the product on this one-parameter family, and the unique minimum √2 at the octant triangle, are not in those papers. That is the identity. It is not a new vortex law.

**How the plate locks it.** The tab `#hendricks-identity` (seed `octant-root-two`) reports ω t_c / √2 against 1 at the octant triangle, the similarity residual of the side-length ratios against 0, and signed L against 0. Family walks the L = 0 circle. Broken steps off the circle, L ≠ 0, and all three fail on purpose. If the vortices sit on a different similar triangle, or the kernel is wrong, the ratio against √2 fails.

**Uniqueness search.** 2026-09-19, logged in [`RESEARCH.md`](RESEARCH.md). Reopen only if a newly named paper states this closed form or this minimum.

---

There is one row. The next one has the same bar: a derivation, the papers, a plate that can fail, and a line in this file the same day.
