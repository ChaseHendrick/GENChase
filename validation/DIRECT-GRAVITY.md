# Direct planar gravity

`direct-gravity` implements established softened Newtonian dynamics, not a new formula.
All points move in a plane while interacting through the three-dimensional inverse-distance
potential. Units set G=1; browser seeds have total mass 1 and equal particle masses 1/N.
There is no periodic boundary, wall, collision rule, force cutoff, tree approximation or
particle subsampling. The picture can crop escaped particles without removing their forces.

For each unordered pair, displacement d=r_j-r_i and q=|d|²+epsilon² give
`a_i += m_j d / q^(3/2)` and `a_j -= m_i d / q^(3/2)`.
The potential energy is `-sum(i<j) m_i m_j / sqrt(q)`.
Velocity Verlet applies half a velocity kick, a position drift, a complete new force
evaluation, then the second half kick. All arrays and arithmetic use JavaScript Float 64.
The pair accumulator is a generator that yields every 2048 pairs, including inside rows.
Yield boundaries do not change pair order or arithmetic. Browser tasks target 8ms of
numerical work and can pause while a force sum is incomplete. Regeneration discards that
sum. Rendering and export use a copy of the last fully completed positions.

## Time step and initial states

Each softened pair potential has Hessian norm at most 1/epsilon³. The browser uses
`dt = min(requested, 0.15 sqrt(epsilon³ / (2 M)))`, with total mass M=1. This conservative
curvature scale is a time-resolution margin, not a proof of global nonlinear accuracy.
Convergence still needs testing for the chosen initial state, duration and softening.
Softening changes Newtonian close encounters and does not represent hard-body collisions.

The disk, ring and cluster seeds are prepared configurations. Their rotation is not an
exact equilibrium distribution. They are demonstrations of the specified equations, not
calibrated galaxy models. The default 256-body run ends after 160 steps. The explicitly
selected extreme preset has 16,384 bodies and 134,209,536 unique pairs per force evaluation;
it starts paused and stops after 20 steps. Controls can request up to 20,000 steps. A run
needs one initial force evaluation plus one per completed step. No hidden cap changes N.
The displayed array estimate counts seven state arrays and two completed-position arrays,
9*N*8 bytes; canvas, SVG strings, browser and runtime overhead are additional.

## Bounded numerical evidence

Run `node tools/direct-gravity-science.js`; add `--write` to refresh its result artifact.
The test extracts the actual production generators and compares them with an independent
analytic circular orbit of two equal softened masses at separation 1, epsilon 0.12.
At fixed time 6, timesteps 0.02,0.01,0.005 give position errors approximately
3.84e-4,9.60e-5,2.40e-5. The fourfold refinement improves error by 15.998, supporting
second-order convergence in this fixture. The initial energy is negative; the finest
run's maximum absolute energy change is about 1.76e-11.

An unequal-mass five-body fixture separately checks total force, momentum and finite-time
energy drift. Pair-batch sizes 1 and 4096 produce identical orbit arrays. A 1% wrong force
coefficient produces a position error above 0.05, and a 1% action-reaction mismatch produces
a momentum-production residual above 0.002. Both deliberately wrong implementations fail
the corresponding acceptance criteria. Conservation is a regression and discretization
check; it alone does not validate trajectories.

The circular-orbit audit deliberately includes timesteps larger than the UI's conservative
limit to demonstrate convergence of the kernel. It does not change the browser limit.

Run `node tools/direct-gravity-largen-science.js`; add `--write` to refresh its result artifact.
An independent Float64 directed all-pairs Plummer reference (reverse partner order) matches the
production unordered-pair `forces` kernel at N = 256, 1024 and 4096 on a seeded equal-mass disk:
maximum absolute acceleration differences stay below about 1.1e-14 with relative L2 norms below
about 2.4e-15. A multi-dt energy-drift band at N = 64, epsilon 0.12, time 0.4 reports relative
drifts near 4.5e-6, 1.1e-6 and 2.8e-7 for dt = 0.004, 0.002 and 0.001 (coarse-to-fine drift ratio
near 16). Softening values 0.06, 0.12 and 0.24 under the production time-step cap keep relative
energy drift below 8e-6. Position self-convergence against a fine step gives an RMS ratio near 5,
consistent with second-order Verlet when comparing coarse and mid steps to the same fine reference.
Wrong G = 1.01, wrong softening (eps×1.05) and 1% broken pair reciprocity each separate from the
acceptance claim.

Galaxy equilibrium, unsoftened collisions, chaotic long-term orbits, all controls, all hardware
and broader scientific print accuracy remain unvalidated.

## Sources

- [Nyland, Harris and Prins, GPU Gems 3, chapter 31 (2007)](https://developer.nvidia.com/gpugems/gpugems3/part-v-physics-simulation/chapter-31-fast-n-body-simulation-cuda), direct softened gravity and Verlet context. This CPU implementation does not copy the chapter's CUDA program.
- [Dehnen (2001)](https://arxiv.org/abs/astro-ph/0011568), softening introduces a bias/noise tradeoff; a visually smooth result does not establish force accuracy.
- Verlet, Physical Review 159 (1967),98, the time integrator's historical source.
