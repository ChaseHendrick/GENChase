# Hopfield associative memory

This new tab starts **unvalidated**. The bounded evidence below checks a particular finite binary model, not human memory, general AI, a storage-capacity claim or every recipe.

Reference: J. J. Hopfield, *Neural networks and physical systems with emergent collective computational abilities*, PNAS 79, 2554-2558 (1982), [doi:10.1073/pnas.79.8.2554](https://doi.org/10.1073/pnas.79.8.2554). Primary paper: [Caltech-hosted scan](https://www.dna.caltech.edu/courses/cs191/paperscs191/Hopfield82.pdf). The model here is the bipolar, zero-threshold Hebbian specialization. It is an associative-memory demonstration, not a reproduction of the paper's numerical experiments.

## Model and finite domain

There are N = side² binary neurons, s_i in {-1,+1}, and P stored patterns xi^mu. Every neuron couples to every other neuron; the square is only a display layout. Weights are w_ij = sum_mu xi_i^mu xi_j^mu/N when i differs from j and w_ii = 0. The local field decides one neuron at a time. A zero field keeps its sign. Each sweep uses a fresh seeded Fisher-Yates permutation, and stops after a sweep with no changes or at the user's finite budget. No claim of a fixed point is printed merely because a budget ran out.

The overlap implementation uses integer M_mu = sum_i xi_i^mu s_i. Its local field numerator is sum_mu xi_i^mu M_mu - P s_i, exactly removing self-coupling. Energy is -(sum_mu M_mu² - PN)/(2N). These integers fit exactly in JavaScript numbers throughout side 8..24, P 1..64 and 0..25 sweeps. Flipped cue sites are sampled without replacement, with count round(N*corruption/100). Random memories use independent binary draws. Geometric memories are deliberately correlated and can repeat; their count is not a count of distinct independent patterns.

A single asynchronous update changes E = -s^T W s/2 by -(s'_i-s_i)h_i, which is nonpositive under the sign rule. This is an algorithmic invariant, not evidence that a particular memory has been retrieved. With P=1 and initial overlap M>1, every update either preserves the target sign or corrects a mismatch and increases M. Thus one complete sweep recovers the target. A sufficiently negative overlap recovers its inverse. Multiple memories permit interference and spurious attractors. No universal capacity threshold is asserted.

## Numerical evidence

Run `node tools/hopfield-science.js --write`. The harness fingerprints the actual module, shared RNG extraction and itself. It assembles a separate dense symmetric matrix and replays the actual visited neuron order. It checks the local field, every state update, full quadratic energy and monotonicity rather than using the module's overlap identity as its oracle.

Twenty-one 8×8 fixtures cover three explicit seeds (`hopfield-audit/0`, `/1`, `/2`) and seven conditions: one memory, four memories, 64 memories, negative-overlap cue, correlated memories, clean cue, and zero update budget. All five positive-overlap N=4 cues satisfying M>1 are exhaustively recovered. Reversed-sign updates and missing diagonal subtraction are rejected; deliberately reversing one bit of an exact stored pattern increases the independent energy by 1.5. Overload failures are retained: 21, 27 and 35 target mismatches out of 64, despite the descent invariant. The 80% damaged single-memory cases return the inverse target, all 64 cells wrong. See [machine-readable evidence](results/hopfield-science.json).

## Print and data contract

The first memory, damaged cue and final recall are shown in that order, left to right or top to bottom for portrait sheets. Cells stay square. Each cell is drawn from the same stored binary state at the requested PNG or SVG dimensions, without rerunning recall. The array export contains all memories, cue, final state, normalized overlaps and the initial plus per-sweep energy trace. Metadata states update order, weight normalization, tie rule, completed sweeps and whether a fixed point was actually checked.

The browser check also round-trips the studio native NPZ package, including signed Int8 arrays and the unvalidated source fingerprint. Browser evidence is recorded separately by `node tools/hopfield-print-state.js --write`. General studio `check.js hopfield` and `export.js hopfield 8 300` exercise recipes, all presets, tab switching and the real export button. Pixel sharpness is a display property and does not promote the scientific label.

## Remaining work

A wider independently reviewed parameter sweep, attractor/basin statistics with uncertainty, full scrutiny of the primary model conventions and cross-browser print validation remain open. The tests are local and reproducible. They do not imply an outside scientific review.
