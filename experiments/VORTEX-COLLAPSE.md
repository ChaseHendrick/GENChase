# Least-winding vortex collapse: a volunteer search

**Open questions. Contributions of computer time are welcome. No confirmed novel finding.**

Point vortices in the α-model family move by

    dz_j/dt = (i/2π) Σ_k Γ_k (z_j − z_k) |z_j − z_k|^(−α−2),

with α = 0 the Euler case and α = 1 the surface quasi-geostrophic (SQG) case. In a self-similar
collapse every vortex obeys dz_j/dt = κ(z_j − z_c) with one complex rate κ, so the cluster shrinks
along a logarithmic spiral. Its winding is `P = |Im κ| / (2 |Re κ|)`. For three Euler vortices,
`P > √3/2` is proved in the preprint under [research/](../research/). A companion preprint in
preparation extends this to `P > √(3+α)/(2+α)` for α ≥ −59/40. Both bounds are sharp. For four or more
vortices the answer is not known here, and that is what this search is for.

## The questions

1. **Is there a positive lower bound on P for any number of vortices (Euler)?** The smallest values
   found so far fall with N: 0.7979 at N = 4, 0.7448 at N = 5 and 0.7137 at N = 6. In special
   two-arm families computed for the research notes, the value falls below 1/2 at 61 vortices.
2. **Is the four-vortex Euler value 0.7978967838 the global minimum?** A seed sweep that always
   finds the same basin is evidence, not proof.
3. **Does the three-vortex bound hold for −2 < α < −59/40?** The proof in preparation covers
   α ≥ −59/40. A single
   certified three-vortex collapse below `√(3+α)/(2+α)` would disprove it for that α. The job flags
   such a result automatically.
4. **What are the least windings for N ≥ 4 when α ≠ 0?** The SQG and α = 2 values fall faster with N
   than the Euler ones.

## What one job does

`node tools/vortex-collapse-search.js --alpha A --n N --start S --count C` works through seeds
S to S+C−1. Each seed names its own random stream (SHA-256 of `alpha`, `N`, the seed and the
protocol version), so two volunteers who pick different blocks never repeat each other's work.

For each seed the job:

1. **Lands on the collapse manifold.** Random positions and circulations are projected onto the
   2(N−1) similarity equations by damped minimum-norm Gauss–Newton. The gauge is `z₁ = 0`,
   `z₂ = 1`, `Γ₁ = 1`. The manifold has dimension N − 1.
2. **Minimizes P on the manifold.** It uses Riemannian Newton steps: the analytic Jacobian, the
   Hessian of the Lagrangian, and a saddle-free eigenvalue modification, followed by retraction onto
   the manifold.
3. **Certifies the result.** A point is recorded as a **certified local minimum** only if every
   test below passes. Each test is independent of the optimizer, and each has a control that must
   fail.

| Test | Requirement | Its control |
|---|---|---|
| Similarity equations | relative residual < 1e−11 | a kernel exponent shifted by 0.05 leaves a residual > 1e−4 |
| First order | reduced gradient < 1e−8 relative | none; checked on the tangent space |
| Second order | Hessian of the Lagrangian on the tangent space positive definite (smallest/largest eigenvalue > 1e−7); constraint Jacobian full rank | none |
| Conservation laws | angular impulse about the collapse centre and the energy (Σ Γᵢ Γⱼ at α = 0, Σ Γᵢ Γⱼ \|zᵢⱼ\|^−α otherwise) vanish to 1e−8; the centre equals the centre of vorticity | none; nothing in the parametrization imposes them |
| Direct integration | a separately written Biot–Savart right-hand side, Dormand–Prince 5(4) at relative tolerance 1e−13, reproduces the predicted shape and the winding to 1e−6 | a wrong exponent β and a doubled winding formula both fail |
| Symmetry modes | the linearization in similarity variables has the six exact eigenvalues that symmetries require | a non-Hamiltonian defect of 1% breaks them |
| Hamiltonian pairing | the remaining 2N − 6 exponents pair as k + k′ = 2 | the same defect |

Seeds that end elsewhere are kept and labelled. A seed is `stalled` when progress stopped away from a
minimum, `degenerate` when the search ran into a collision, a runaway circulation or a nearly
stationary state, and `no-landing` when no starting point reached the manifold. Stalled and degenerate
runs usually head for a sub-cluster that collapses on its own, and their P then approaches a value
for fewer vortices. The summary reports the lowest such value as `boundaryApproach`, which is not a
minimum.

## Stability exponents

In similarity variables, `z = ρ(t) ζ` with `dτ = |ρ|^(−2β) dt` and β = 1 + α/2, a collapse is a fixed
point of `dζ/dτ = V(ζ) − κζ`. A perturbation with eigenvalue μ grows like `r^(−k)` as the cluster
shrinks to size r, where `k = −Re μ / Re κ`. Six exponents are fixed by symmetry:

- k = 0 (rotation);
- k = 2β (a shift of the collapse time);
- k = 1, twice (translation);
- k = 2 (breaking the zero angular impulse);
- k = −α (breaking the energy condition).

The rescaled flow is Hamiltonian apart from a uniform dilation, so every other exponent has a partner
with k + k′ = 2.

Every certified minimum so far has all 2N − 6 genuine shape modes real and hyperbolic, with N − 3 of
them unstable. The largest exponent grows quickly with N and α: about 12 for four Euler vortices and
about 68 for eight SQG vortices. Such fast growth is also why direct integration can only follow a
collapse over a limited shrink. The job integrates only as far as the fastest mode can amplify
round-off by 10⁴, and never below a shrink of one half.

Iwayama and Yajima (J. Phys. Soc. Jpn. 92, 084401, 2023) proved that collapsing
self-similar motions of three vortices in these models are linearly unstable. The exponents reported
here are numerical measurements for more vortices, with no claim of priority.

## Contribute computer time

Use the headless runner, which pauses on battery and under heat and keeps a checkpoint after every
seed:

```sh
npm run validator:headless -- --mode vortex-collapse --alpha 1 --n 6 --samples 200 --machine lab-mac-2
```

Leave out `--start` to get a random block; the block is recorded in the job so that `--resume`
continues it. The local app (`npm run validator`) has the same job under **Run experiments → Open
problem: least-winding vortex collapse**.

| Question | Suggested job |
|---|---|
| 1. Euler lower bound | `--alpha 0 --n 7` up to `--n 16` |
| 2. Four-vortex global minimum | `--alpha 0 --n 4 --samples 5000` |
| 3. Three-vortex bound below −59/40 | `--alpha -1.6 --n 3`, `--alpha -1.8 --n 3`, `--alpha -1.95 --n 3` |
| 4. Least winding for α ≠ 0 | `--alpha 1 --n 5` up to `--n 12`, and `--alpha 2` or `--alpha 0.5` |

A job writes `run/vortex-collapse/vortex-collapse-a<α>-n<N>-s<start>-c<count>.json`, which Git
ignores, and places a copy in its evidence folder. `--share` submits that file through your GitHub
account, and HEADLESS.md explains the manual route. Share every result, including blocks that found
nothing new; basin counts are evidence too.

## What each result file records

Beside the minima, every file records:

- **CPU time.** Per seed and in total, measured by the process. Also wall time, utilization (low when the power controls paused the job), peak memory, seeds per CPU-hour and certified minima per CPU-hour.
- **Energy.** Measured from the Linux RAPL counter where one is readable, which includes other programs. Otherwise estimated as 1 to 20 W per busy core and labelled as an estimate.
- **Yield.** The share of seeds that ended as certified minima, stalled runs, degenerate runs or failed landings.
- **Certificate margins.** The worst value of every certificate test across the file's certified minima, beside its threshold, so a reviewer can see how much room each pass had.
- **A results digest.** A SHA-256 of every seed's outcome and winding rounded to 1e−9. Running the same block on another machine should give the same digest, so reruns are a direct reproducibility test. The leaderboard counts reruns and lists any that disagree.
- **A runtime card.** CPU model, core count, memory, operating system, and the Node and V8 versions. There is no hostname, user name or serial number.

## Review of submitted results

Nothing in a submitted file is trusted except the positions and circulations of each minimum:

```sh
node tools/vortex-collapse-search.js --verify path/to/*.json --write
```

This re-imposes the gauge, recomputes κ by least squares, re-projects and re-polishes the point, and
runs every certificate again. A claimed value that does not survive, or that moves by more than 1e−8,
is rejected. `--write` records the survivors in
[results/vortex-collapse-leaderboard.json](results/vortex-collapse-leaderboard.json).

`node tools/vortex-collapse-search.js --controls`, which runs in CI in a few seconds, checks the
following:

- the analytic Jacobian against central differences;
- the eigenvalue solver on a matrix with known roots;
- P against the closed three-vortex formula `|S| / (8A)` on random collapses at four values of α,
  with no sample below the proved infimum;
- recovery and full certification of the recorded four-vortex minima at α = 0, 1 and 2;
- that the negative controls fail;
- that a rotated, rescaled copy of a minimum with rescaled circulations re-verifies, while a perturbed
  copy claiming a lower value does not.

## Recorded values

Certified local minima from the maintainers' first sweep. The seed counts are the seeds whose run
ended at that minimum. The reference column comes from an independent Python search (SciPy SLSQP with
an 80-digit KKT polish at N = 4).

RESULTS_TABLE

## Limitations

- Binary64 arithmetic throughout. A certificate says that a nondegenerate strict local minimum lies
  within numerical tolerance of the reported point. It is not interval arithmetic and not a proof.
- A multistart search cannot show that a minimum is global. Basin counts measure how often random
  starts reach a minimum under this protocol, not the probability that a lower one exists.
- Minima on the boundary of the manifold, where vortices collide or circulations diverge, are not
  certified. They are reported as boundary approaches.
- Seeds reproduce exactly only on the same JavaScript engine; `Math.pow` can differ in the last bit
  between platforms. The certificate itself does not depend on the platform, which is why review
  re-derives every submitted point.
- Priority is unconfirmed for every value here. Four-vortex collapse configurations were studied by
  O'Neil (Regul. Chaotic Dyn. 12, 117–126, 2007), and self-similar N-vortex motions by Kimura
  (J. Phys. Soc. Jpn. 56, 2024–2030, 1987) and [Gotoda (2021)](https://arxiv.org/abs/2002.09624).
  Three-vortex collapse in the α-models was studied by
  [Badin and Barry (2018)](https://arxiv.org/abs/1805.10127) and others cited in the preprints.
  O'Neil (2007) has not been read here, so whether it already gives the four-vortex minimum is open.
