# Talbot carpet: depth in units of d²/λ

The tab paints a finite Fourier sum of a periodic grating. The longitudinal phase in
`src/modules/cgl-hofstadter-scars-caustics-smectic-hl-phyllotaxis.js` is

    const ph = TAU*n*u - PI*n*n*z

with `u = (x/(w-1) - 0.5)*P` already in grating periods and `z = (y/(h-1))*zMax`.
That expression is unchanged. The slider number is not z/z_T.

The paraxial factor for order n is exp(−i π λ z_phys n² / d²). The Talbot length is
z_T = 2 d²/λ, so one Talbot length is two units of d²/λ. In the plate's unit, z = 2
is a full revival (every factor is 1) and z = 1 is the half-period image (every factor
is (−1)^n). A half-period shift of the grating is Δu = 0.5, because exp(i 2π n · 1/2) = (−1)^n.

The displayed equation is the sum the code evaluates:

    I(x,z) = |Σₙ aₙ exp(i 2π n x/d − i π n² z)|²,   z in d²/λ, revival at 2,   z_T = 2 d²/λ

Coefficients are a_0 = fill and a_n = sin(n π fill)/(n π) for n ≠ 0, truncated at |n| <= M.
Preset zMax numbers are unchanged. Slider value 2 is one Talbot length. The preset labeled
"Two revivals" still uses zMax 2.5, which is 1.25 Talbot lengths: the half-period image at 1
and one full revival at 2, not two Talbot lengths.

This is the finite sum at that phase. It is not a laboratory grating and not the continuous
Fresnel integral beyond the truncation.

## Numerical evidence

`node tools/talbot-science.js --write` writes [results](results/talbot-science.json).
Each case samples u on 4096 points of one period. The acceptance bar is an absolute
intensity error under 1e-9. The source file must still contain `TAU*n*u - PI*n*n*z` exactly once.

| Case | fill | orders | max \|I(u,2) − I(u,0)\| | max \|I(u,1) − I(u+0.5,0)\| |
|---|---|---|---|---|
| default | 0.22 | 18 | 2.89e-14 | 1.38e-14 |
| binary | 0.5 | 16 | 2.58e-14 | 1.04e-14 |
| dense | 0.12 | 28 | 6.00e-14 | 4.31e-14 |
| narrow | 0.08 | 6 | 3.55e-15 | 2.89e-15 |
| wide | 0.7 | 40 | 9.84e-14 | 4.80e-14 |
| deep preset | 0.18 | 22 | 5.60e-14 | 2.07e-14 |
| mid | 0.35 | 12 | 1.44e-14 | 7.55e-15 |

The largest revival error in the set is 9.84e-14 (fill 0.7, 40 orders). The binary grating
at z = 1 differs from the unshifted grating by 1.180, so the half-period identity is a real
shift, not a flat field.

### Failure control

The same sum with phase `TAU*n*u - 0.5*PI*n*n*z` is what the old exponent computed if the
slider number were z/z_T (the missing factor of 2). For fill 0.5 and 16 orders,
max_u |I(u, 2) − I(u, 0)| is 1.180, so it fails the 1e-9 revival predicate by a wide margin.
The plate phase on that same predicate passes at 2.58e-14. That wrong-phase error equals the
binary unshifted gap above, because half the coefficient at z = 2 is the half-period plane.

## Print evidence

`node tools/talbot-print-state.js --write` writes [results](results/talbot-print-state.json).
Playwright loads `dist/studio.html` at the default seed and presses the studio export at 8 in
and 300 ppi. Aspect 1.15 makes the long edge 8 in, so the sheet is 2087 by 2400 px. The file
was 9,370,382 bytes, and the export note reported 2× supersampling. The recipe and the depth
slider were unchanged. A second regenerate of the screen plate changed 0 bytes (283 by 326).
A 240 by 276 reprint of the default state after export also changed 0 bytes.

Opening the export sheet reflows the preview (the screen buffer went from 283 by 326 to 199 by
229). That is the shell layout, not a change of grating parameters. The fixed-size reprint is
the pixel check that export leaves the state alone.

Failure control: re-registering the maintained source left all 66,240 pixels of the 240 by 276
plate unchanged. Replacing `PI` with `0.5*PI` in that phase moved 64,738 pixels (fraction 0.977),
with a maximum channel change of 255 and a mean channel change of 60.7.

Environment: Node v22.23.3, Chromium 153.0.8010.12, linux, SwiftShader.

## Domain

Finite Fourier sum at the phase the module uses. z is measured in d²/λ. Checked planes are
z = 0, z = 1 and z = 2 for the fill and order pairs in the results file. The print domain is
the default recipe at 8 in and 300 ppi. Not a laboratory grating. Not the continuous Fresnel
integral beyond this truncation. Not every preset, not every depth, and not a color proof.
