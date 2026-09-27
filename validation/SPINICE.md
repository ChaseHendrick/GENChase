# Square ice enumeration, and the plate's sampler

The plate is square ice, the two-dimensional six-vertex model, not pyrochlore spin ice.
An ice-rule configuration is an orientation of the edges of the torus grid in which every
vertex has two arrows in and two arrows out. Lieb, Phys. Rev. Lett. 18, 692 (1967),
proved that the number of such configurations on an n by n torus grows as

    W = (4/3)^(3/2) = 1.539600717839002...

per vertex in the limit of large n. Pauling's counting, the same style of estimate he
used for three-dimensional ice in J. Am. Chem. Soc. 57, 2680 (1935), gives 3/2 on this
lattice: 2^(2N) times (6/16)^N. A small torus is neither number.

Status is partially validated. The counts below are exact. The plate's own Monte Carlo
was executed and does not pass the uniform-ice test. No print-state audit was run.

```sh
node tools/spinice-science.js --write
```

Results: [spinice-science.json](results/spinice-science.json). The run date is 2026-09-27.

## Counts

The count is the trace of the n-th power of the row transfer matrix, in integers.
For n = 1, 2 and 3 the same count is the brute-force total, and it is also the number
of configurations the plate's own `charges()` calls ice. All six sizes match OEIS A054759.
W_L is (count)^(1/n^2), in binary64. None of them is Lieb's limit. From n = 2 to n = 6,
W_L moves toward that limit and is still 0.047 above it at n = 6.

| n | vertices | count | W_L | W_L minus Lieb |
|---|---|---|---|---|
| 1 | 1 | 4 | 4 | +2.460 |
| 2 | 4 | 18 | 2.059767 | +0.520 |
| 3 | 9 | 148 | 1.742369 | +0.203 |
| 4 | 16 | 2970 | 1.648342 | +0.109 |
| 5 | 25 | 143224 | 1.607832 | +0.068 |
| 6 | 36 | 16448400 | 1.586529 | +0.047 |

n = 1 is the degenerate one-vertex torus in A054759, not a step toward the limit.
It has one horizontal edge and one vertical edge. Each edge is tested both as an
incoming arrow and as an outgoing arrow, and those two tests are mutually exclusive,
so every one of the 4 orientations has two arrows in. W_1 = 4.

Two wrong counters fail the same comparison with A054759. Skipping the ice test at
x = 0 produces 40, 832, 40928, 4783104 and 1327404160 for n = 2 through 6. Dropping
the horizontal wrap produces 4, 8, 16, 32 and 64. Neither series is the torus count.

## Uniform ice, on a graph the plate does not sample

The acceptance predicate is declared before the runs. A sample passes only if every
draw is one of the enumerated ice configurations, no configuration is missing,
the Pearson chi-squared statistic is within 4 standard deviations of its
independent-draw mean (degrees of freedom k - 1, exact variance 2(k - 1)), and no
bin is more than 5 exact multinomial standard deviations from n/k. The multinomial
variance of one bin is n (1/k) (1 - 1/k). That variance is exact for independent
draws. These runs are thinned output of the studio's deterministic generator, so
the probability reading assumes an independence the generator does not prove.
Recording the fair 2 by 2 chain every step, instead of every 20 steps, fails the
same predicate (chi-squared 52.970, z = 6.17, 20,000 draws, none off the ice rule).

The chain that passes is not the plate. It reverses a directed plaquette, or a row
or column whose arrows already agree. Each move is an involution chosen without
looking at the arrows, so the proposal is symmetric on the uniform measure. On the
2 by 2 and 3 by 3 tori the moves reach every ice configuration and the plate's
`charges()` stays at Q = 0. Burn-in, gap and sample size:

| chain | n | burn | gap | draws | chi-squared | df | z | max bin z | off ice | pass |
|---|---|---|---|---|---|---|---|---|---|---|
| fair | 2 | 5000 | 20 | 20000 | 17.546 | 17 | 0.094 | 1.694 | 0 | yes |
| fair | 3 | 8000 | 40 | 15000 | 115.911 | 147 | -1.813 | 2.457 | 0 | yes |
| fair, no thinning | 2 | 5000 | 1 | 20000 | 52.970 | 17 | 6.169 | 2.967 | 0 | no |
| biased | 2 | 5000 | 20 | 20000 | 22028.198 | 17 | 3774.889 | 67.694 | 0 | no |
| biased | 3 | 8000 | 40 | 15000 | 27277.384 | 147 | 1582.276 | 56.577 | 0 | no |
| arrow flip | 2 | 0 | 1 | 2000 | 1749.828 | 17 | 297.178 | 10.651 | 1870 | no |

The biased chain uses the same moves and still visits every ice configuration.
A move that removes rightward arrows is kept with probability 0.2; a move that
adds them is kept. The weights are not uniform, and the predicate fails.
The arrow flip ignores the ice rule. 1870 of 2000 draws are not ice configurations,
and the predicate fails.

On the fair 2 by 2 run the exact multinomial standard deviation of one bin is
32.394 (variance 1049.383). The largest bin missed its mean 20000/18 by 1.694 of
those standard deviations.

## The plate's flipper

`sweep` is the function in `src/modules/spinice.js`. The harness evaluates that
file in a vm, as `tools/ssh-science.js` does for the SSH spectrum, and calls the
resulting `sweep`. It is single-arrow Metropolis for E = (J/2) sum Q^2 - h sum
sigma. The studio will not build a 2 by 2 torus: `sanitize` rejects a grid under
48, and the height is at least 32. The harness sets the height only so this same
function can run on a torus small enough to enumerate. Nothing in the acceptance
test is rewritten.

From an ice configuration at h = 0 the energy of one arrow flip is J, because the
two endpoints go from Q = 0 to Q = +1 and Q = -1 and each costs J/2. With the
module defaults J = 1.6 and T = 0.55 the accept probability is exp(-J/T) =
0.054525. A scripted draw at half of that keeps the flip and leaves the ice rule,
with charges -1, +1, 0, 0. A draw at twice that undoes the flip and stays ice.
With a field that makes the same flip downhill, the flip is kept and no accept
draw is consumed. A wrong energy scale moves exp(-J/T) by more than that factor
of two and fails the same pair of draws.

The histogram is the frame loop's call, `sweep(state, makeRng(seed + '/mc/' + step), W * 8)`,
for 4000 frames on the 2 by 2 torus at those defaults, starting from the module's
ice seed (which is ice when both sides are even). 1010 of the 4000 frames are not
ice configurations (fraction 0.2525). Chi-squared against the 18 ice states is
311.004 on 17 degrees of freedom, z = 50.42. The uniform-ice predicate fails.

Conditioning those frames on the ice rule gives chi-squared 74.888, z = 9.93.
That is not the predicate, and it is not evidence that the equilibrium weights
differ: the fair chain recorded every step fails the independent-draw null too,
while its stationary measure is uniform. Successive plate frames are 16 attempted
flips apart. The Boltzmann weight of every ice state is 1 at h = 0, so the
equilibrium conditional on the ice rule is uniform. This sample does not establish
that conditional.

## Ice seed

With warmup 0, the staggered ice seed is an ice configuration on the default
96 by 96 sheet and on the 48 by 60 sheet (aspect 4:5). Both periods are even.
On the 80 by 45 sheet the UI can build (grid 80, aspect 16:9), row 0 has 80
vertices off the ice rule and the other 3520 are ice. An odd period does not
match the staggered pattern across the seam. The painted field was not changed.

## What this does not claim

The plate does not draw Lieb's ensemble. The loop flip that passes the chi-squared
test is an independent sampler, used so the predicate can pass and can fail.
The 6 by 6 torus has not reached W = 1.5396. Grids the UI actually draws, the
monopole density on the status line, finite-temperature weights away from the
forced flip, and the print path are outside this record. A full label would need
the plate's update to be the sampler under test and to pass, plus print evidence
that export preserves the arrows, that a wrong width fails, and that a mutation
after export fails.
