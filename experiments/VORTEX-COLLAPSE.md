# Least-winding vortex collapse: a volunteer search

**Open questions. Contributions of computer time are welcome. Every value here is a numerical candidate with
priority unconfirmed; none has been peer reviewed.**

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
   found so far fall with N: 0.7979 at N = 4, 0.7448 at N = 5 and 0.7137 at N = 6. Growing the
   deepest family gives 0.5216 at N = 30, with the fall per added vortex shrinking (about 0.0016 at
   N = 30). In special two-arm families computed for the research notes, the value falls below 1/2 at
   61 vortices.
2. **Is the four-vortex Euler value 0.7978967838 the global minimum?** A seed sweep that always
   finds the same basin is evidence, not proof.
3. **Does the three-vortex bound hold for −2 < α < −59/40?** The proof in preparation covers
   α ≥ −59/40. A single
   certified three-vortex collapse below `√(3+α)/(2+α)` would disprove it for that α. The job flags
   such a result automatically.
4. **What are the least windings for N ≥ 4 when α ≠ 0?** The SQG and α = 2 values fall faster with N
   than the Euler ones. **The search reached zero for α = 2 at N = 11 and for SQG at N = 60** (next
   section). The questions left are whether the Euler case also reaches zero, and at which α zero first
   becomes possible.

## A collapse that does not turn

At α = 2, growing the deepest family gives P = 0.0676 at N = 9 and 0.0237 at N = 10. At N = 11, eleven of
twelve seeds reach **P = 0 exactly**: a self-similar collapse in which every vortex moves straight toward
the centre and the cluster shrinks without rotating. Such points were found by
`--grow --alpha 2 --n 11 --start 0 --count 12`, and the file is in
[results/vortex-collapse/](results/vortex-collapse/).

- **In binary64,** the point passes every test of the certificate except the strict second-order test.
  That test cannot apply, because zero-winding collapses form a family (Im κ = 0 cuts out a submanifold),
  so the Hessian is singular along it. Since P ≥ 0, such a point is a global minimum. The job records it
  with the status `zero-winding`.
- **At 60 digits,** `python3 tools/vortex-precision-check.py` is a separate mpmath implementation of
  the model. With κ held exactly real, it Newton-polishes the point from its binary64 positions and
  circulations and converges quadratically:
  - similarity residual 2 × 10⁻⁶⁰;
  - angular impulse and energy vanish to about 10⁻⁶¹;
  - the configuration is not degenerate: the closest pair is 7% of the cluster's size, and the
    circulations stay within a factor of 40 of one another.

This is strong numerical evidence that zero-winding collapse exists for 11 vortices at α = 2. It is not
an interval-arithmetic proof.

### SQG: sixty vortices

Growing the deepest SQG family one vortex at a time from N = 24 (`--grow --alpha 1 --n 70 --count 8`)
lowers P steadily: 0.0297 at N = 50, 0.0140 at N = 55, 0.00505 at N = 58 and 0.00216 at N = 59. At
N = 60, five of eight seeds reach **P = 0**, the first SQG collapse found here that does not rotate. The
next section predicted, from thresholds up to N = 30, that this family would reach zero near N ≈ 58.

- **In binary64,** each of the five points passes every test of the certificate except the strict
  second-order test, which cannot apply at P = 0. The best has P = 4 × 10⁻¹⁵.
- **At 60 digits,** `tools/vortex-precision-check.py` converges quadratically from the binary64 point
  (residuals 4 × 10⁻¹³, 1 × 10⁻²², 1 × 10⁻⁴², 3 × 10⁻⁵⁸):
  - similarity residual 8 × 10⁻⁵⁹, with κ held exactly real;
  - angular impulse 1 × 10⁻⁶² and energy 2 × 10⁻⁶¹.
- **The configuration is not degenerate:**
  - the closest pair is 0.17% of the cluster's size, and the circulations span a factor of 83;
  - it consists of one strong positive vortex near the centre of vorticity, one strong negative vortex
    of 0.91 times its strength at three quarters of the cluster's radius from that centre, and 58 weak
    positive vortices of 1.2 to 4.2% of the strongest;
  - it has 57 unstable shape modes, the minimum N − 3.
- **The chain reproduces.** It was grown twice, the second time from the committed code. The best P
  agrees between the two runs to 11 or more significant figures at every N from 25 to 59, and both
  reach zero at N = 60. Which seeds reach the minimum, and which stall, differs between the two runs
  (see Limitations).

This is strong numerical evidence that sixty SQG point vortices can collapse self-similarly without
rotating, and so that the least SQG winding is 0 for N = 60. It is not a proof. The file is
`results/vortex-collapse/vortex-grow-a1-n60-s0-c8.json`.

Nothing found in a literature search on 2026-09-24 (RESEARCH.md, entry Q) reports a self-similar
collapse without rotation for α = 1 or α = 2. That search could read only abstracts and summaries, and
priority is unconfirmed.

## Where zero winding begins

`--continue` follows a certified minimum as α changes. At each step it re-minimizes P from the previous
point, and it bisects the α at which the branch first reaches P = 0 to a bracket of 10⁻⁴. The bracket
follows P itself, so a point whose certificate fails cannot hide the crossing. Both ends must still be
certified: the low end is a strict minimum with P > 0 and the high end is a zero-winding collapse.
`--verify` re-derives both from their positions and circulations, and re-derives which family the branch
started from by continuing back to its starting α.

Following the recorded SQG family (N = 9 to 59) and Euler family (N = 13 to 30) upward in α gives the
thresholds below. Each is an upper bound for its N, since another branch could reach zero at smaller α.

- **On every branch, P falls to zero linearly.** At the N = 16 SQG threshold, P = 4 × 10⁻⁵ at a
  distance of 10⁻⁴ in α. That is a transversal crossing, not a fold.
- **The SQG family's thresholds follow a 1/N law.** They fall from 2.300 at N = 9 to 1.0024 at N = 59.
  From N = 40 on, N² times the step α*(N) − α*(N+1) is 11.0 ± 0.2 (standard deviation over 19 steps).
  That scatter is what the 10⁻⁴ brackets alone produce, so α*(N) ≈ α∞ + 11/N there.
- **So the family has a positive limit, on this evidence.** Fits over trailing windows of N put α∞
  between 0.69 and 0.90. The forms fitted are a + b/N, a + b/N + c/N², a + bN⁻ᵖ, and
  a + b/(ln N)^q, whose best q is about 2.5. A pure 1/ln N approach, which would put α∞ near 0, fits
  4 to 9 times worse in rms. The spread over forms and windows is the honest uncertainty; a least-squares error from one fit
  would understate it. None of this rules out a change of behaviour beyond N = 59.
- **The prediction held.** From the thresholds up to N = 30, the C/N² steps predicted that the grown
  family would reach zero winding at α = 1 near N ≈ 58. The thresholds now put α*(59) just above 1,
  and growth at α = 1 reached zero at N = 60 (previous section).
- **The Euler family is less settled.** Its steps are about 22/N² and still shrinking slowly at N = 30.
  Fits put α∞ anywhere from 0.27 to 1.09, and a slow logarithmic approach that allows α∞ ≤ 0 is not
  excluded by N ≤ 30. A positive α∞ would mean a positive winding floor for this Euler family at every
  N, which bears on open question 1.

<!-- thresholds:start -->
| Family grown at α | N | Last α with P > 0 (certified) | First α with P = 0 (certified) |
|---:|---:|---:|---:|
| 0 | 13 | 2.880273 | 2.880371 |
| 0 | 14 | 2.607227 | 2.607324 |
| 0 | 15 | 2.411621 | 2.411719 |
| 0 | 16 | 2.245215 | 2.245312 |
| 0 | 17 | 2.116602 | 2.116699 |
| 0 | 18 | 2.004785 | 2.004883 |
| 0 | 19 | 1.913867 | 1.913965 |
| 0 | 20 | 1.833398 | 1.833496 |
| 0 | 21 | 1.765723 | 1.765820 |
| 0 | 22 | 1.705078 | 1.705176 |
| 0 | 23 | 1.652637 | 1.652734 |
| 0 | 24 | 1.605176 | 1.605273 |
| 0 | 25 | 1.563281 | 1.563379 |
| 0 | 26 | 1.525098 | 1.525195 |
| 0 | 27 | 1.490918 | 1.491016 |
| 0 | 28 | 1.459473 | 1.459570 |
| 0 | 29 | 1.430957 | 1.431055 |
| 0 | 30 | 1.404590 | 1.404688 |
| 1 | 9 | 2.300000 | 2.300098 |
| 1 | 10 | 2.091309 | 2.091406 |
| 1 | 11 | 1.937207 | 1.937305 |
| 1 | 12 | 1.818555 | 1.818652 |
| 1 | 13 | 1.724121 | 1.724219 |
| 1 | 14 | 1.647168 | 1.647266 |
| 1 | 15 | 1.583105 | 1.583203 |
| 1 | 16 | 1.528809 | 1.528906 |
| 1 | 17 | 1.482324 | 1.482422 |
| 1 | 18 | 1.441895 | 1.441992 |
| 1 | 19 | 1.406348 | 1.406445 |
| 1 | 20 | 1.375000 | 1.375098 |
| 1 | 21 | 1.346973 | 1.347070 |
| 1 | 22 | 1.321777 | 1.321875 |
| 1 | 23 | 1.299023 | 1.299121 |
| 1 | 24 | 1.278320 | 1.278418 |
| 1 | 25 | 1.259375 | 1.259473 |
| 1 | 26 | 1.241992 | 1.242090 |
| 1 | 27 | 1.226074 | 1.226172 |
| 1 | 28 | 1.211328 | 1.211426 |
| 1 | 29 | 1.197559 | 1.197656 |
| 1 | 30 | 1.184766 | 1.184863 |
| 1 | 31 | 1.172949 | 1.173047 |
| 1 | 32 | 1.161719 | 1.161816 |
| 1 | 33 | 1.151270 | 1.151367 |
| 1 | 34 | 1.141504 | 1.141602 |
| 1 | 35 | 1.132227 | 1.132324 |
| 1 | 36 | 1.123438 | 1.123535 |
| 1 | 37 | 1.115137 | 1.115234 |
| 1 | 38 | 1.107324 | 1.107422 |
| 1 | 39 | 1.099805 | 1.099902 |
| 1 | 40 | 1.092773 | 1.092871 |
| 1 | 41 | 1.086035 | 1.086133 |
| 1 | 42 | 1.079590 | 1.079688 |
| 1 | 43 | 1.073438 | 1.073535 |
| 1 | 44 | 1.067578 | 1.067676 |
| 1 | 45 | 1.061914 | 1.062012 |
| 1 | 46 | 1.056543 | 1.056641 |
| 1 | 47 | 1.051367 | 1.051465 |
| 1 | 48 | 1.046387 | 1.046484 |
| 1 | 49 | 1.041699 | 1.041797 |
| 1 | 50 | 1.037109 | 1.037207 |
| 1 | 51 | 1.032617 | 1.032715 |
| 1 | 52 | 1.028418 | 1.028516 |
| 1 | 53 | 1.024316 | 1.024414 |
| 1 | 54 | 1.020312 | 1.020410 |
| 1 | 55 | 1.016504 | 1.016602 |
| 1 | 56 | 1.012793 | 1.012891 |
| 1 | 57 | 1.009277 | 1.009375 |
| 1 | 58 | 1.005762 | 1.005859 |
| 1 | 59 | 1.002441 | 1.002539 |
<!-- thresholds:end -->

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
   test below passes. Each test is independent of the optimizer. The similarity, integration,
   symmetry and pairing tests each have a control that must fail; the optimality and conservation
   tests are checked directly.

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

Because the exponents pair as k + k′ = 2, at least one member of each pair is positive, so every
self-similar collapse has at least N − 3 unstable shape modes. A pair with both exponents between 0 and
2 adds a second unstable mode. No least minimum recorded so far has an exponent at zero.

The least minimum of every case has exactly N − 3 unstable modes, except the Euler minima from N = 10 to
N = 30, the family that takes over at N = 10. Each of those has exactly one pair in (0, 2), and so N − 2
unstable modes. The largest exponent is large: about 12 for four Euler vortices, 49 for thirty, 639
for 24 SQG vortices and 4274 for 60. Such fast growth is also why direct
integration can only follow a collapse over a limited shrink. The job integrates only as far as the fastest mode can amplify
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
continues it. The local app (`npm run validator`) has the same jobs under **Run experiments**.

**Threads.** `--threads k` (or the Worker threads field in the app) runs seeds on k worker threads.
Seeds are independent, so the results and the block's digest do not depend on k; only the speed and the
heat do. The controls check that one and three threads give the same digest.

**Thresholds.** `--mode vortex-threshold --alpha 1 --n 16 --to 3` follows the recorded minimum at that α
and N and brackets its zero-winding threshold, as described above.

**Growing a family.** Random starts rarely find the deep basins beyond eight vortices: at α = 2 they
found 0.261 at N = 9, and growth found 0.0676. The growth job starts from the lowest recorded minimum
below the target and adds one vortex at a time. It places each new vortex just outside one of the three
outermost ones, with a weaker circulation, then descends and certifies. The best certified child
becomes the next parent:

```sh
npm run validator:headless -- --mode vortex-grow --alpha 0 --n 30 --samples 10 --machine lab-mac-2
```

Every step writes its own result file and checkpoint, and growth stops when a step certifies nothing
or reaches zero winding. `--from file.json` on the command-line tool starts from a chosen minimum
instead of the leaderboard.

**Claiming a block** is optional. Random blocks rarely collide, but for a long run you can open a
[Claim a seed block](https://github.com/ChaseHendrick/GENChase/issues/new?template=compute-block.yml)
issue so others pick a different one. Deliberate reruns of a recorded block are welcome too, because
their digests test reproducibility.

| Question | Suggested job |
|---|---|
| 1. Euler lower bound | `--mode vortex-grow --alpha 0 --n 40`, or `--alpha 0 --n 7` up to `--n 16` |
| 2. Four-vortex global minimum | `--alpha 0 --n 4 --samples 5000` |
| 3. Three-vortex bound below −59/40 | `--alpha -1.6 --n 3`, `--alpha -1.8 --n 3`, `--alpha -1.95 --n 3` |
| Where zero winding begins | `--mode vortex-threshold` for any recorded (α, N); `--mode vortex-grow --alpha 0.9 --n 100 --threads 4` and other α between 0.8 and 1, to test where the SQG-type family's thresholds level off |
| 4. Least winding for α ≠ 0 | `--mode vortex-grow --alpha 1.5 --n 30` and other α between 1 and 2; `--mode vortex-grow --alpha 0.5 --n 80` to test whether zero winding exists below the fitted limit |

A job writes `run/vortex-collapse/vortex-collapse-a<α>-n<N>-s<start>-c<count>.json` (growth writes
`vortex-grow-…` for each step), which Git ignores, and places a copy in its evidence folder. `--share` submits that file through your GitHub
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

This happens automatically. The `volunteer results` workflow re-verifies every vortex result file in a
pull request, using the verifier from the base branch so that a pull request cannot pass by editing it,
and fails if any claimed minimum is rejected. After a merge the same workflow runs `--refresh` and
`node tools/compute-ledger.js`, and opens a pull request that updates the table below and
[COMPUTE.md](../COMPUTE.md).

For a second opinion at high precision, `python3 tools/vortex-precision-check.py <files> --dps 60`
Newton-polishes each certified minimum in mpmath from its positions and circulations alone. It reports
the residual, P and the two conservation laws.

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

Certified local minima from every recorded file, rebuilt by `node tools/vortex-collapse-search.js --refresh`.
The first files are the maintainers' sweep in [results/vortex-collapse/](results/vortex-collapse/), and
submissions are added after they merge. "Seeds ending there" counts the seeds whose run ended at the least
minimum, out of every seed recorded for that case. The reference column comes from an independent Python search
(SciPy SLSQP, with an 80-digit KKT polish at N = 4).

<!-- leaderboard:start -->
| α | N | Least certified P | Seeds ending there | Distinct certified minima | Largest shape exponent k | Unstable shape modes | Independent reference |
|---:|---:|---:|---:|---|---:|---:|---:|
| 0 | 4 | 0.7978967839 | 79 of 80 | 1 (0.7978967839) | 11.85 | 1 | 0.7978967838 |
| 0 | 5 | 0.7448144570 | 42 of 80 | 1 (0.7448144570) | 17.82 | 2 | 0.7448144570 |
| 0 | 6 | 0.7136801485 | 20 of 80 | 2 (0.7136801485, 0.8022675725) | 23.24 | 3 | 0.7136801485 |
| 0 | 7 | 0.6936617908 | 6 of 40 | 3 (0.6936617908, 0.7344649418, 0.7563344056) | 28.53 | 4 |  |
| 0 | 8 | 0.6797704208 | 3 of 40 | 3 (0.6797704208, 0.6944114725, 0.7287092159) | 33.83 | 5 |  |
| 0 | 9 | 0.6695811206 | 1 of 40 | 1 (0.6695811206) | 39.14 | 6 |  |
| 0 | 10 | 0.6377055919 | 2 of 40 | 2 (0.6377055919, 0.6617926944) | 15.37 | 8 |  |
| 0 | 11 | 0.6179510627 | 6 of 10 | 1 (0.6179510627) | 15.33 | 9 |  |
| 0 | 12 | 0.6044746933 | 8 of 10 | 1 (0.6044746933) | 18.76 | 10 |  |
| 0 | 13 | 0.5918604652 | 3 of 10 | 2 (0.5918604652, 0.5945336345) | 18.84 | 11 |  |
| 0 | 14 | 0.5826273179 | 8 of 10 | 1 (0.5826273179) | 22.12 | 12 |  |
| 0 | 15 | 0.5738915441 | 9 of 10 | 1 (0.5738915441) | 22.32 | 13 |  |
| 0 | 16 | 0.5671672974 | 7 of 10 | 1 (0.5671672974) | 25.49 | 14 |  |
| 0 | 17 | 0.5607700272 | 8 of 10 | 1 (0.5607700272) | 25.82 | 15 |  |
| 0 | 18 | 0.5556533062 | 4 of 10 | 1 (0.5556533062) | 28.86 | 16 |  |
| 0 | 19 | 0.5507731410 | 6 of 10 | 1 (0.5507731410) | 29.33 | 17 |  |
| 0 | 20 | 0.5467481822 | 6 of 10 | 1 (0.5467481822) | 32.22 | 18 |  |
| 0 | 21 | 0.5429071858 | 10 of 10 | 1 (0.5429071858) | 32.85 | 19 |  |
| 0 | 22 | 0.5396573325 | 7 of 10 | 1 (0.5396573325) | 35.56 | 20 |  |
| 0 | 23 | 0.5365586895 | 9 of 10 | 1 (0.5365586895) | 36.38 | 21 |  |
| 0 | 24 | 0.5338787483 | 8 of 10 | 1 (0.5338787483) | 38.82 | 22 |  |
| 0 | 25 | 0.5313285211 | 8 of 10 | 1 (0.5313285211) | 39.92 | 23 |  |
| 0 | 26 | 0.5290797127 | 8 of 10 | 1 (0.5290797127) | 41.85 | 24 |  |
| 0 | 27 | 0.5269459053 | 8 of 10 | 1 (0.5269459053) | 43.46 | 25 |  |
| 0 | 28 | 0.5250320549 | 6 of 10 | 1 (0.5250320549) | 45.16 | 26 |  |
| 0 | 29 | 0.5232207435 | 8 of 10 | 1 (0.5232207435) | 47.01 | 27 |  |
| 0 | 30 | 0.5215733789 | 6 of 10 | 1 (0.5215733789) | 48.73 | 28 |  |
| 1 | 4 | 0.5499151189 | 77 of 80 | 1 (0.5499151189) | 12.77 | 1 | 0.5499151189 |
| 1 | 5 | 0.4667708118 | 34 of 80 | 1 (0.4667708118) | 23.84 | 2 | 0.4667708118 |
| 1 | 6 | 0.4121913837 | 18 of 80 | 1 (0.4121913837) | 36.34 | 3 |  |
| 1 | 7 | 0.3724816694 | 6 of 40 | 2 (0.3724816694, 0.5002732127) | 51.02 | 4 |  |
| 1 | 8 | 0.3415530821 | 1 of 40 | 2 (0.3415530821, 0.4473240201) | 68.00 | 5 |  |
| 1 | 9 | 0.3163357095 | 8 of 10 | 2 (0.3163357095, 0.4029041577) | 87.25 | 6 |  |
| 1 | 10 | 0.2950963118 | 9 of 50 | 2 (0.2950963118, 0.3708641612) | 108.73 | 7 |  |
| 1 | 11 | 0.2767707240 | 8 of 10 | 1 (0.2767707240) | 132.43 | 8 |  |
| 1 | 12 | 0.2606629481 | 9 of 10 | 1 (0.2606629481) | 158.33 | 9 |  |
| 1 | 13 | 0.2462948937 | 5 of 10 | 2 (0.2462948937, 0.3016024770) | 186.43 | 10 |  |
| 1 | 14 | 0.2333250646 | 10 of 10 | 1 (0.2333250646) | 216.71 | 11 |  |
| 1 | 15 | 0.2215016405 | 7 of 10 | 2 (0.2215016405, 0.2667928269) | 249.17 | 12 |  |
| 1 | 16 | 0.2106339556 | 8 of 10 | 1 (0.2106339556) | 283.81 | 13 |  |
| 1 | 17 | 0.2005743960 | 9 of 10 | 1 (0.2005743960) | 320.63 | 14 |  |
| 1 | 18 | 0.1912064831 | 8 of 10 | 2 (0.1912064831, 0.2291370344) | 359.62 | 15 |  |
| 1 | 19 | 0.1824367839 | 7 of 10 | 2 (0.1824367839, 0.2190355553) | 400.80 | 16 |  |
| 1 | 20 | 0.1741892690 | 7 of 10 | 2 (0.1741892690, 0.2087899745) | 444.15 | 17 |  |
| 1 | 21 | 0.1664012854 | 7 of 10 | 2 (0.1664012854, 0.1995779361) | 489.69 | 18 |  |
| 1 | 22 | 0.1590206224 | 6 of 10 | 2 (0.1590206224, 0.1911972532) | 537.42 | 19 |  |
| 1 | 23 | 0.1520033350 | 5 of 10 | 2 (0.1520033350, 0.1831328750) | 587.34 | 20 |  |
| 1 | 24 | 0.1453121018 | 9 of 10 | 1 (0.1453121018) | 639.47 | 21 |  |
| 1 | 25 | 0.1389149692 | 5 of 8 | 1 (0.1389149692) | 693.79 | 22 |  |
| 1 | 26 | 0.1327843781 | 5 of 8 | 2 (0.1327843781, 0.1618844561) | 750.33 | 23 |  |
| 1 | 27 | 0.1268963993 | 5 of 8 | 2 (0.1268963993, 0.1554333104) | 809.09 | 24 |  |
| 1 | 28 | 0.1212301282 | 4 of 8 | 2 (0.1212301282, 0.1493942388) | 870.07 | 25 |  |
| 1 | 29 | 0.1157671995 | 3 of 8 | 1 (0.1157671995) | 933.29 | 26 |  |
| 1 | 30 | 0.1104913944 | 4 of 8 | 1 (0.1104913944) | 998.74 | 27 |  |
| 1 | 31 | 0.1053883215 | 4 of 8 | 1 (0.1053883215) | 1066.45 | 28 |  |
| 1 | 32 | 0.1004451535 | 5 of 8 | 1 (0.1004451535) | 1136.41 | 29 |  |
| 1 | 33 | 0.0956504101 | 4 of 8 | 1 (0.0956504101) | 1208.63 | 30 |  |
| 1 | 34 | 0.0909937768 | 2 of 8 | 1 (0.0909937768) | 1283.13 | 31 |  |
| 1 | 35 | 0.0864659533 | 7 of 8 | 1 (0.0864659533) | 1359.91 | 32 |  |
| 1 | 36 | 0.0820585249 | 7 of 8 | 1 (0.0820585249) | 1438.98 | 33 |  |
| 1 | 37 | 0.0777638545 | 5 of 8 | 1 (0.0777638545) | 1520.36 | 34 |  |
| 1 | 38 | 0.0735749900 | 6 of 8 | 1 (0.0735749900) | 1604.04 | 35 |  |
| 1 | 39 | 0.0694855849 | 6 of 8 | 1 (0.0694855849) | 1690.04 | 36 |  |
| 1 | 40 | 0.0654898303 | 6 of 8 | 1 (0.0654898303) | 1778.37 | 37 |  |
| 1 | 41 | 0.0615823961 | 7 of 8 | 1 (0.0615823961) | 1869.04 | 38 |  |
| 1 | 42 | 0.0577583797 | 5 of 8 | 2 (0.0577583797, 0.0848699330) | 1962.06 | 39 |  |
| 1 | 43 | 0.0540132618 | 4 of 8 | 1 (0.0540132618) | 2057.44 | 40 |  |
| 1 | 44 | 0.0503428674 | 6 of 8 | 1 (0.0503428674) | 2155.19 | 41 |  |
| 1 | 45 | 0.0467433317 | 3 of 8 | 1 (0.0467433317) | 2255.32 | 42 |  |
| 1 | 46 | 0.0432110703 | 3 of 8 | 1 (0.0432110703) | 2357.84 | 43 |  |
| 1 | 47 | 0.0397427526 | 3 of 8 | 1 (0.0397427526) | 2462.77 | 44 |  |
| 1 | 48 | 0.0363352783 | 4 of 8 | 1 (0.0363352783) | 2570.10 | 45 |  |
| 1 | 49 | 0.0329857566 | 6 of 8 | 1 (0.0329857566) | 2679.87 | 46 |  |
| 1 | 50 | 0.0296914880 | 3 of 8 | 1 (0.0296914880) | 2792.06 | 47 |  |
| 1 | 51 | 0.0264499475 | 6 of 8 | 1 (0.0264499475) | 2906.70 | 48 |  |
| 1 | 52 | 0.0232587697 | 4 of 8 | 1 (0.0232587697) | 3023.80 | 49 |  |
| 1 | 53 | 0.0201157360 | 5 of 8 | 1 (0.0201157360) | 3143.37 | 50 |  |
| 1 | 54 | 0.0170187622 | 6 of 8 | 1 (0.0170187622) | 3265.42 | 51 |  |
| 1 | 55 | 0.0139658879 | 4 of 8 | 1 (0.0139658879) | 3389.97 | 52 |  |
| 1 | 56 | 0.0109552672 | 4 of 8 | 1 (0.0109552672) | 3517.01 | 53 |  |
| 1 | 57 | 0.0079851592 | 6 of 8 | 1 (0.0079851592) | 3646.58 | 54 |  |
| 1 | 58 | 0.0050539209 | 5 of 8 | 1 (0.0050539209) | 3778.67 | 55 |  |
| 1 | 59 | 0.0021599991 | 6 of 8 | 1 (0.0021599991) | 3913.31 | 56 |  |
| 1 | 60 | 0.0000000000 | 5 of 8 | 1 (0.0000000000) | 4273.65 | 57 |  |
| 2 | 4 | 0.4116738600 | 78 of 80 | 1 (0.4116738600) | 15.26 | 1 | 0.4116738600 |
| 2 | 5 | 0.3046288623 | 40 of 80 | 1 (0.3046288623) | 33.31 | 2 | 0.3046288623 |
| 2 | 6 | 0.2280296027 | 21 of 80 | 1 (0.2280296027) | 57.17 | 3 |  |
| 2 | 7 | 0.1669117663 | 5 of 40 | 2 (0.1669117663, 0.3765333370) | 89.24 | 4 |  |
| 2 | 8 | 0.1145989729 | 1 of 40 | 2 (0.1145989729, 0.3130794153) | 130.46 | 5 |  |
| 2 | 9 | 0.0675758057 | 9 of 52 | 3 (0.0675758057, 0.2611735311, 0.2631798720) | 181.99 | 6 |  |
| 2 | 10 | 0.0237078013 | 7 of 52 | 2 (0.0237078013, 0.2190693120) | 245.26 | 7 |  |
| 2 | 11 | 0.0000000000 | 11 of 12 | 1 (0.0000000000) | 258.15 | 8 |  |
<!-- leaderboard:end -->

## Limitations

- **Protocol 2 changed the solver**, not the model or the certificate:
  - a Cholesky solve on a symmetric Gram matrix, with the factorization reused while retracting onto
    the manifold;
  - a reduced Hessian from differences along the N − 1 tangent directions instead of all 3N − 3
    coordinates;
  - a stall rule that stops a run whose P² and reduced gradient have both stopped improving.

  On the same machine it is 2 to 3 times faster per seed and finds the same distinct minima. Seed
  streams are labelled by protocol version, so a protocol 2 seed is a new start, not a rerun of the
  protocol 1 seed with the same number. Files from protocol 1 still verify, because review uses only
  positions and circulations.

- The search and its certificate use binary64 throughout. A certificate says that a nondegenerate strict
  local minimum, or a zero-winding collapse, lies within numerical tolerance of the reported point. The
  optional mpmath check raises the precision, but neither is interval arithmetic or a proof.
- A multistart search cannot show that a minimum is global. Basin counts measure how often random
  starts reach a minimum under this protocol, not the probability that a lower one exists.
- Minima on the boundary of the manifold, where vortices collide or circulations diverge, are not
  certified. They are reported as boundary approaches.
- A growth step is sensitive to its parent at the level of rounding. Growing the SQG chain twice, from
  parents that agree to 13 significant figures, reproduced every best P to 11 or more figures, but not
  which seeds reached it and which stalled. So a growth block's digest is compared only with reruns
  whose parent has the same recorded P (or, for the first step of a chain, the same source).
- Seeds reproduce exactly only on the same JavaScript engine; `Math.pow` can differ in the last bit
  between platforms. The certificate itself does not depend on the platform, which is why review
  re-derives every submitted point.
- Priority is unconfirmed for every value here. Four-vortex collapse configurations were studied by
  O'Neil (Regul. Chaotic Dyn. 12, 117–126, 2007), and self-similar N-vortex motions by Kimura
  (J. Phys. Soc. Jpn. 56, 2024–2030, 1987) and [Gotoda (2021)](https://arxiv.org/abs/2002.09624).
  Three-vortex collapse in the α-models was studied by
  [Badin and Barry (2018)](https://arxiv.org/abs/1805.10127) and others cited in the preprints.
  O'Neil (2007) has not been read here, so whether it already gives the four-vortex minimum is open.
