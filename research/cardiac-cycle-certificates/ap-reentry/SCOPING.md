# Scoping: a computer-assisted proof of action-potential reentry in a ring of baseline TP06 cells

Status (2026-10-01): numerical scoping only. No interval or CAPD computation was run. Every number in this file
is a floating-point observation from the scripts in this folder (results in `results/*.json`); none is a
certificate. Statements marked "conjecture" or "estimate" are not established.

## 0. Verdict in brief

* A self-sustained circulating action potential exists numerically in a ring of **N = 16** baseline TP06
  endocardial cells (19 states each, K_i and Na_i dynamic, discontinuous h/j rates) with nearest-neighbour voltage
  coupling **c = 0.035 per ms**. It converges (Newton on the Z_16-reduced shift map) to a discrete rotating wave
  with rotation period **T = 541.11454 ms** (conduction delay 33.8197 ms per cell). Its leading nontrivial Floquet
  multiplier is **0.999804** in modulus, 1.96e-4 inside the unit circle; numerically there is exactly one extra unit
  multiplier (total charge) besides the phase.
* N <= 15 did not sustain reentry in any attempt (section 3.4). N = 16 sustains it only for c in about
  [0.0325, 0.035] per ms, just above the propagation-failure threshold (between 0.031 and 0.0315 per ms from rest).
  This is a discrete, near-failure, slow-conduction regime, not a resolved cable. With the published
  D = 0.154 mm^2/ms resolved at h = 0.25 mm, first-order runs failed at a 100 mm ring (N = 400) and circulated
  at 150 mm (N = 600).
* Proof design: shift map on the section V_0 = -40 mV, restricted to the conserved-charge leaf (302 unknowns),
  one internal h/j switching event per shift interval, GHK quotient replaced by a series window around 15 mV.
* Cost estimate: the resting m gate makes the system stiff (largest cell eigenvalue about 942 per ms everywhere on
  the orbit), so an explicit Taylor C1 enclosure of one shift interval (33.8 ms) needs about 5,000 to 10,000 steps
  in 304 dimensions: roughly 1e2 to 3e2 core-hours at the per-step costs measured for the existing ring
  certificates (estimate, section 6.6).
* Recommendation: **conditional go for N = 16, c = 0.035, as a staged pilot**, not a launch of the full proof
  (section 8). No-go for any continuum-resolved ring.

## 1. Model and parameters

Source: A. H. Erhardt, MIT-licensed repository
`andreerhardt/cardiac-dynamics-of-a-human-ventricular-tissue-model-with-focus-on-early-afterdepolarizations`,
commit dc78f86fd218418e029ec43d945bcd0fc54b9f1e (2 Dec 2024), file `bifurcation analysis/TP06_endo.m`
(SHA-256 67fdcf72019b7ea60947ef7a00df707dd19d316bf669f44b63084fcee2ed0c31), function `fun_eval`, lines 13-147:
constants 14-56, reversal potentials 57-60, currents and gates 61-125 (h/j rates with the -40 mV switch at
84-91), stimulus 126-128 (52 pA/pF while t <= 2 ms), right-hand side 129-147. `tp06_19d.py` is a line-by-line
translation (state order V, Xr1, Xr2, Xs, m, h, j, d, f, f2, fCass, s, r, R', Ca_i, Ca_sr, Ca_ss, Na_i, K_i).

Baseline conductances (fun_eval takes them as arguments) are those of the CellML-derived gotran file in the same
repository, `monodomain simulations using FEniCS-beat/tentusscher_panfilov_2006/tentusscher_panfilov_2006_endo_cell.ode`
(SHA-256 9388ed03...): g_K1 5.405 (line 40), g_Kr 0.153 (43), g_Ks 0.392 (52), g_Na 14.838 (58),
g_CaL 0.0398 l/F/s = 3.98e-5 in fun_eval units (73), g_to 0.073 (91). Initial state: `y01` of
`comparison plots/simulation_modified_TP06_epi_M_endo.m` line 44 with K_i = 138.3 (line 35).

**Capacitance convention (a real discrepancy, verified in the source).** Erhardt runs `TP06_endo.m` with
par_Cm = 1 (`TP06_16D_bifurcation_endo.m` line 26; `fun_TP06_model.m` line 29), which divides dV/dt by 1 and also
multiplies every concentration flux by 1. The gotran/CellML file uses Cm = 185 pF, V_c = 16404 um^3,
F = 96.485 C/mmol (lines 160-162) in the fluxes, i.e. flux factor Cm/(V_c F) = 1.1689e-4, while Erhardt's is
1/(0.016404 x 96485.3415) = 6.318e-4, a factor 5.405 = 1/0.185 larger. The gotran file also carries the stimulus
in K_i (line 322); Erhardt's K_i equation (TP06_endo.m line 147) does not. `tp06_19d.params()` offers both:
`"erhardt"` (literal) and `"author"` (the fun_eval text with flux capacitance 0.185 and K-carried stimulus, equal
to the gotran scaling to 3.5e-6 relative). **All ring results use "author"**, because it is the original
TP06 scaling and because with it the unforced cell conserves charge exactly; the literal convention was only
paced (section 2) and tried once in the ring (section 3.4).

The h/j branch is selected exactly as in the source (`V < -40`: first branch; `V >= -40`: second). At V = -40 the
one-sided limits differ: tau_h^-1 is 0.3884 (below) versus 0.3933 (above) per ms, tau_j^-1 0.01866 versus 0.01903
per ms (evaluated with `tp06_19d.currents`). The GHK factor (V-15)/(exp(z)-1), z = 2(V-15)F/(RT), is evaluated as
(RT/2F) z/(exp(z)-1) with z/(e^z-1) = 1/exprel(z), which is analytic for |z| < 2 pi.

Checks: `check_model.py` agrees with the separately written 18-state translation `../model/tp06_18d.py` (from
`TP06_18d_endo_bif.m`) to 1.2e-14 relative at random states (400 draws; draws with |V+40| < 8 skipped, so that its smoothed
switch equals the Heaviside switch in double precision); i_CaL is continuous through V = 15 to 1e-10. `check_rhs.py`: the C
kernel equals the Python model to 8e-14.

## 2. Single paced cell (author convention unless stated)

Stimulus as in TP06_endo.m (52 pA/pF, 2 ms) every 1000 ms, hybrid integration (Radau, rtol 1e-9) with an event
at every -40 mV crossing. APD90 is measured from the time of maximal dV/dt.

| setting | beat 1 APD90 | beat 20 APD90 | Vmax (beat 20) | other |
|---|---|---|---|---|
| author, 2 ms stimulus | 265.1 ms | 283.1 ms | 82.2 mV | charge invariant constant to 1e-12; Na_i 10.36 to 10.27 mM |
| erhardt (literal), 2 ms | 264.4 ms | 267.8 ms | 84.0 mV | Na_i falls to 8.74 mM in 20 s; invariant drifts (stimulus not carried by an ion) |
| author, 1 ms stimulus (gotran timing) | 282.1 ms | 297.8 ms | 38.6 mV | |

The 82 mV peak is the 2 ms stimulus driving V past E_Na, not the cell's own upstroke. Each beat crosses
-40 mV twice and 15 mV twice. **No reference APD90 is stated anywhere in the Erhardt repository or this checkout**
(searched for "APD90", "APD"), so these values are not compared with published numbers. None of the paced runs is
at steady state (Na_i still drifting after 20 beats).

## 3. Ring of N cells: coupling, ring length, smallest N

Model: dV_i/dt gains c (V_{i+1} - 2V_i + V_{i-1}), c = D/h^2; the coupling current is not assigned to any ion
species (standard monodomain), no stimulus after initiation.

### 3.1 Resolved cable (physical D)
With D = 0.154 mm^2/ms and h = 0.25 mm (c = 2.464 per ms), first-order RL runs (dt 0.01 ms, 2.5 to 3 s simulated,
`continuum_test.py`, `results/continuum_test.json`): L = 60 and 100 mm died within the first rotation;
L = 150 mm (N = 600) circulated for 10 rotations with periods 288 to 295 ms; L = 200 mm (N = 800) with
periods 340 to 345 ms. These are not converged and the RL scheme is first order; they only show that resolved-cable
reentry needs more than 400 cells here (over 7,600 dimensions), far beyond any rigorous C1 integration.

### 3.2 Discrete propagation threshold
Open chain of 12 cells from rest, stimulus at cell 0 (`chain_scan.py`, BDF rtol 1e-7): interior delay per cell
0.62 ms (c = 1), 1.47 (0.3), 3.88 (0.1), 8.99 (0.05), 10.75 (0.045), 13.67 (0.04), 16.65 (0.037), 19.86 (0.035),
25.64 (0.033), 31.65 (0.032), 38.72 ms (0.0315); failure at 0.031 and below. A ring with N cells needs
N x delay to exceed the recovery time (several hundred ms), so small N forces c into this near-failure window.

### 3.3 Choice for the proof target and its physical reading
N = 16, c = 0.035 per ms (11 to 13% above the rest threshold). Two readings of c = D/h^2: (i) myocyte-sized
compartments h = 0.1 mm with D = 3.5e-4 mm^2/ms, i.e. coupling reduced about 440-fold from 0.154, ring
circumference 1.6 mm; (ii) the published D = 0.154 with h = 2.1 mm compartments (circumference 33.6 mm), a coarse
lumped model that is not a converged discretization of the cable. Either way conduction is saltatory and slow
(one cell per 33.8 ms). This is a legitimate ionic action-potential reentry in a finite ring of cells, but it is
not a statement about continuum tissue.

### 3.4 Persistence versus N (all author convention)
* Block initiation from rest (`ring_scan.py`): N = 10 (c = 0.033, 0.035, 0.05) and N = 14 (0.033, 0.05) died;
  N = 20, c = 0.033 circulated 16 rotations (periods 492 and 573 ms in the first two, then 537 to 544 ms, still drifting).
* RL scans from resampled waveforms, 20 to 25 s (`scan_rl.py`): N = 12 and 13 died for every c in 0.0325 to 0.04;
  N = 14 died (up to 12 irregular rotations at 0.033); N = 15 died (13 rotations with growing period oscillation
  at 0.035); N = 16 survived for c = 0.0325, 0.033, 0.034, 0.035 and died at 0.037, 0.04, 0.045; N = 20 survived
  at every c from 0.0325 to 0.045.
* Accurate integrator (BDF rtol 1e-7) from the converged N = 16 orbit resampled to N = 15: died at c = 0.033,
  0.034, 0.035 (after 3 rotations, per-cell lag growing 31.6 to 43.3 ms), 0.036, 0.038. N = 16 died at
  c = 0.036 (5 irregular rotations) and 0.037; the N = 16, c = 0.035 control held 541.12 +/- 0.002 ms for
  11 rotations.

Smallest N with persistent reentry found: **16**. This is not exhaustive (finite c grid, a few initial states);
whether an unstable rotating wave exists for N = 15 was not tested. With the literal Erhardt convention one RL run
of N = 16, c = 0.035 from the author-convention orbit died in the first rotation; reentry in that convention is
neither established nor excluded.

## 4. The N = 16, c = 0.035 orbit

Method: rotating-wave reduction. The ring field commutes with the cyclic relabelling sigma, so a reentry that is
a discrete rotating wave x_{i+1}(t) = x_i(t - tau) is a fixed point of the shift map
P = sigma^{-1} o phi_{tau(x)} from S_0 = {V_0 = -40, V_0 increasing} to itself (tau(x) = first upward crossing of
V_1 = -40), and the full Floquet multipliers are mu^N for the eigenvalues mu of DP (P^N is the full return map).
A long RL run (175 s simulated, period still drifting from 435 to 501 ms while Na_i rose to 12.6 mM) gave the start;
5 accurate rotations, a dense central-difference Jacobian (Radau rtol 1e-11, step 1e-5 in scaled coordinates,
606 map evaluations) and 25 Broyden iterations of the charge-bordered Newton system converged it
(`results/newton_N16_c0.035_history.json`).

| quantity | value |
|---|---|
| tau (Radau rtol 1e-12) | 33.8196585255 ms |
| T = 16 tau | 541.1145364 ms (scatter 1e-8 ms over the last Newton iterates; BDF rtol 1e-8 gives 541.11504) |
| Newton residual | 7.4e-11 (scaled 2-norm) |
| full-rotation closure from the fixed point | 1.8e-10 (scaled), 16 return times equal to 1e-11 ms |
| state on S_0 | `results/orbit_N16_c0.035_section_state.json`; mean Na_i 12.89 mM, K_i 135.70 mM, total charge q 2406.845 |
| action potential | Vmax 22.4 mV, max dV/dt 157 mV/ms, a notch down to about 1 mV within the first 40 ms, plateau 12.5 to 17 mV (40 to 120 ms), APD90 235.6 ms, diastolic interval 305.5 ms |

Converged: the rotating wave as a fixed point of the floating-point shift map, period to about 8 digits.
Not converged or not checked: Jacobian sensitivity to the difference step (one independent check below only);
the RL runs; N = 15 rotating waves; c-dependence of the multipliers.

**Floquet multipliers** (`results/multipliers_N16_c0.035.json`, `results/validate_N16_c0.035.json`):

| item | value |
|---|---|
| eigenvalue for total charge | 0.99999991 per shift (should be 1; FD error 9e-8); its left eigenvector is parallel to grad Q (cosine 0.99999996) |
| leading nontrivial, per shift | 0.999987763 e^{+-i pi/8} |
| leading nontrivial, full orbit | 0.9998042 (distance 1.96e-4); independent central difference of P^16 on that eigenspace gives 0.9998047 |
| meaning of the leading mode | its per-cell charge changes form a Fourier-1 sinusoid around the ring (amplitude about 0.009, mostly K_i) whose sum is 7e-8: a redistribution of charge between cells |
| count of full multipliers with modulus > 0.999 / 0.99 / 0.5 / 0.1 / 1e-3 | 15 / 31 / 49 / 51 / 111 (of 302) |
| first mode with an intrinsic rotation (interpretation: conduction dynamics) | modulus 0.870, argument about 132 degrees |
| leaf-restricted map (302 dims) | spectral radius 0.999987763; norm of (I - DP_leaf)^-1 about 1.06e6 in scaled coordinates |

Interpretation (from eigenvector content and the spread of each family over all Fourier indices): the other modes
above 0.99 are slow ionic families, so the margin is set by slow ion redistribution through the weak coupling,
not by the conduction dynamics.

**Threshold crossings** (one shift interval x 16 = one rotation):
V = -40 mV: 2 per cell per rotation (32 per rotation): per shift one downward crossing inside the interval
(dV/dt = -1.263 mV/ms) and the upward crossing that ends the interval on the section (dV/dt = 69.6 mV/ms).
V = 15 mV: **4 per cell per rotation** (64 per rotation: upstroke, notch, rise to the dome, fall from the plateau);
cells spend 11.4 cell-ms per shift interval within 0.5 mV of 15 mV, because the plateau sits at 12.5 to 17 mV.

**Stiffness**: the largest |eigenvalue| of the 19 x 19 cell Jacobian along the orbit is 926 to 942 per ms at every
sampled time (the resting m gate, tau_m about 1 microsecond near -85 mV).

## 5. Conserved quantity and dimension count

Per cell, q = Na_i + K_i + 2(Ca_i,tot + (V_sr/V_c) Ca_sr,tot + (V_ss/V_c) Ca_ss,tot) - Cm Cm_flux V/(F V_c), with
buffered totals. `check_charge_symbolic.py` (sympy) shows dq_i/dt = -(Cm Cm_flux/(F V_c)) x (coupling term of cell i)
identically (and, without coupling, = 0 also under a K-carried stimulus; = -Cm_flux i_stim/(F V_c) under the literal
convention). The coupling terms sum to zero around the ring, so Q = sum_i q_i is conserved; the individual q_i are
not. Numerically there is exactly one eigenvalue of DP within 1e-5 of 1 (section 4), so no other invariant is
visible. Unknowns: 19N = 304; the section removes the phase and the leaf Q = Q_0 removes one more:
**19N - 2 = 302**, confirming the earlier estimate. Q is linear in K_i with coefficient 1, so the leaf is an explicit
graph: K_i of cell 0 = Q_0 - (rest of Q), no implicit function needed.

## 6. Proof design

### 6.1 Formulation
Unknown u in R^302 (all states except V_0 = -40 and K_i of cell 0, which is fixed by the leaf). Map
G(u) = pi(P(iota(u))) - u, P the shift map, iota inserting V_0 = -40 and K_0 from Q_0, pi deleting them.
Existence by a Krawczyk or interval Newton test on a box around the numerical fixed point, using a C0 enclosure of
P at the centre and a C1 enclosure of P over the box. The full orbit is then a rotating wave of period N tau.
Stability on the leaf: the full return map is P^16, so orbital asymptotic stability within the leaf (and
neutrality across leaves) follows from a bound rho(DP_leaf) < 1, e.g. ||C^-1 [DP_leaf] C|| < 1 with C from a
real block-diagonalisation (the near-unit eigenvalues are distinct in argument, roots of unity times 0.99999),
or from the 16-fold product.

### 6.2 The -40 mV switching
Integrate with every cell's h/j branch fixed and certify for every step that each V_i enclosure lies strictly on
one side of -40, except for one cell at a time near its crossing. Per shift interval there is one internal
transversal crossing (cell 11 in the labelling at the start, dV/dt about -1.26 mV/ms) and the terminal crossing,
which is the section itself. At the internal crossing: C1 Poincare map to {V_k = -40} with the old branch, switch
branch, continue; the composed derivative is DPhi_new (DPi_old - f_new grad t*), equivalent to the saltation matrix
S = I + (f_new - f_old) e_{V_k}^T / dV_k/dt. Only the h_k and j_k components of f jump (rate jumps of about 1 to
2%), and h_k is near its inactivated value at the downward crossing, so S is close to I, but it must be enclosed.
Section-to-section derivatives compose correctly through the terminal crossing, so no extra saltation is needed
there. Required inequalities: dV_k/dt enclosure excludes 0 at each crossing, and the crossing cell is unique.

### 6.3 The GHK quotient at 15 mV
The plateau sits within a few mV of 15 for about 80 ms of each action potential, so this is a sustained region,
not a brief passage. Use z/(e^z - 1) = 1 - z/2 + sum_k B_2k z^2k/(2k)!, with |B_2k|/(2k)! = 2 zeta(2k)/(2 pi)^2k
<= (pi^2/3)(2 pi)^-2k (Euler's formula), on a window |V - 15| <= 10 mV (|z| <= 0.749, ratio 0.119 to the radius
2 pi); a degree-24 polynomial leaves a remainder below 4e-24 for the value and about 1e-22 for the derivative
(hand evaluation of the geometric tail). Outside |V - 15| >= 8 mV use the quotient. Two implementation routes: (a) a custom CAPD node for
g(z) = z/(e^z - 1) whose Taylor coefficients come from the series near 0 and from the quotient elsewhere;
(b) a per-cell, per-step choice of representation with the remainder added through a Gronwall perturbation bound
(C0 and C1), as in a differential-inclusion step. Route (b) touches 4 window entries or exits per cell per
rotation.

### 6.4 Precision and conditioning
The leaf problem has ||(I - DP_leaf)^-1|| about 1.06e6 (scaled) and spectral margin 1.2e-5 per shift
(1.96e-4 per rotation). The derivative enclosure therefore needs widths well below 1e-6 and the centre residual
well below 1e-11; this is the same order as the certified 16-site phase-wave case (handoff line 101: I - DP about
1.02e6, leading multiplier 0.99997), so the existing high-precision centre route is the model to follow.

### 6.5 Expected sizes
Integrated dimension 304 with 304 tangent directions; 302 Krawczyk unknowns; integration time per C1 enclosure
33.82 ms (one sixteenth of the period); per shift interval 1 internal switching event, 1 terminal section, 4 GHK
window crossings. Step size (estimate): with lambda = 942 per ms, a Taylor remainder factor
(h lambda)^(p+1)/(p+1)! of 1e-9 allows h = 0.0034 ms at order 20 (about 9,850 steps) or 0.0068 ms at order 30
(about 5,000 steps); the real stability boundaries are h lambda = 8.8 and 12.6.

### 6.6 Cost estimate (estimate, not measured on this model)
Per-step C1 costs measured for the existing 18-state ring certificates (`docs/CARDIAC-HANDOFF-2026-09-30.md`):
144 dimensions 13.9 to 19.6 s (line 165), 288 dimensions 85.8 s per tube (2,574.7 s for 30 tubes, line 136),
576 dimensions 178 to 297 s (lines 167, 169), 1,152 dimensions 1,264 s (line 203). Interpolating to 304
dimensions gives about 40 to 100 s per step, so one C1 shift-map enclosure at order 20 is about
9,850 x (40 to 100) s = 4e5 to 1e6 s, **110 to 270 core-hours**, against about 0.7 core-hours for the certified
16-site return (30 tubes). The stiffness, not the dimension, is the dominant factor (about 300 times more steps).
Possible reductions, all unverified for this model: the Hermite-Obreshkov sets present in the installed CAPD 6.1.0
headers (`dynset/C1HOSet.h`, `C0HOSet.h`), whose implicit structure may permit longer steps on the decaying m
directions; splitting tangent directions across cores; exploiting the block-sparse Jacobian as the earlier
pipeline's sparse-J method did.

### 6.7 Scaling with N (estimate and conjecture)
Dimension 19N; near threshold the period stays about 450 to 550 ms (N = 16 and 20 runs), so the shift interval is
T/N and the step count per enclosure falls like 1/N while the per-step cost grows like N^2 to N^3: total roughly
N to N^2. Conjecture (not tested): the leading charge-redistribution multiplier approaches 1 as N grows at fixed c,
tightening the margin. A resolved cable (more than 400 cells in these runs) is out of reach.

## 7. Risks and open items
1. Thin window: N = 16 sustains reentry only for c in about [0.0325, 0.035]; c = 0.036 died. A proof at the single
   value c = 0.035 is unaffected, but any parameter-interval statement must stay inside the window.
2. Stiffness-driven cost (section 6.6) is the main practical obstacle; a one-step pilot is needed to replace the
   estimate by a measurement.
3. Small stability margin (1.96e-4 per rotation, 1.2e-5 per shift) with a 15-member near-unit cluster.
4. The GHK window is active for much of each beat; its remainder handling must be part of the trusted code.
5. The capacitance convention must be fixed before any proof; the literal Erhardt convention was not studied in
   the ring.
6. Physical scope: discrete near-failure ring, not tissue; no clinical meaning.

## 8. Recommendation
**Conditional go, N = 16, c = 0.035 per ms, author convention**, staged:
(1) a one-step and a 1 ms C1 pilot of the 304-dimensional ring at order 20 and 30 (and with C1HOSet) to measure
step size and cost; (2) the GHK window node and its remainder bound, tested on a single cell crossing 15 mV;
(3) a C0 multiple-precision enclosure of one shift interval including the internal -40 mV event; (4) only then
the C1 shift-map enclosure, the Krawczyk test on the 302-dimensional leaf and the stability bound. Stop if the
pilot shows more than about 1e3 core-hours per C1 shift map. No-go for N <= 15 (no persistent reentry found) and
for any continuum-resolved ring.

## 9. Pilot stage 1 results (2026-10-01)

These are measurements from the CAPD pilot in `pilot/`: `timing19.cpp`, run under the `measure.py` wrapper, which
sets nice 10 and an address-space cap. Records are in `pilot/results/`. The cost lines are extrapolations made by
`pilot/extrapolate.py`; they are not measurements. Nothing here is a certificate.

* **One full millisecond, C1Rect2Set, order 20, dimension 304** (`ref1ms_rect20.json`, `ref1ms_rect20_steps.tsv`).
  - The run started at the window t0 = 0.75 ms and took 373 steps, with a mean step of 0.002684 ms. The step is
    pinned by the stiffness: h times 942 per ms is about 2.5.
  - Cost per step was 20.5 s on one core, 7,672 s wall in total, with peak RSS 1.44 GiB.
  - At the end, the C0 set has maximal relative diameter 3.2e-9, from an initial box of relative radius 1e-10.
  - The derivative enclosure ends with entries up to 96 (scaled) and relative width at most 1.8e-7 on entries of
    at least 1e-3.
  - **The floating-point reference end state lies inside the enclosure**, at a relative distance of 5.9e-14 from
    its midpoint. This is the first check of the 19-state CAPD translation against an independent integration
    over a finite time.
* **An earlier artifact, now resolved.** `probe_rect20.json` records `reference_end_state_inside_enclosure: false`.
  That probe ran at 17:43 with a build that compared the reference at t0 + 1 ms against an enclosure that only
  reached t0 + 0.01 ms. The guard was added before the later probes, which record null. The 1 ms run above settles
  the question.
* **Extrapolated cost (`results/extrapolation.json`).**
  - About 12,600 steps per shift interval (33.82 ms).
  - **72 to 83 core-hours per C1 shift map** at order 20. The range comes from the 0 to 15 percent allowance for
    the crossings, the GHK node and the branch switch.
  - That is below the section 6.6 estimate of 110 to 270 core-hours, and well under the 1e3 core-hour stop rule.
  - On one thread, it is about 3 to 3.5 days of wall time per C1 shift map.
* **Not measured: wrapping over a whole shift interval.** Over this window the derivative's width grew from 1e-8
  to 1e-5 in absolute terms while its entries grew to about 96. That is consistent with the entries' own growth,
  not with a loss of relative accuracy. Only a longer run can show whether the relative width stays small over
  34 ms, especially through the upstroke and the -40 mV switch. Pilot steps (2) and (3) remain to be done.
* **Verdict.** The cost criterion of the staged pilot passes on these measurements, with the caveat on wrapping
  above. A full proof needs about 3 to 4 core-days per C1 shift map, plus the multiprecision centre. That is
  feasible only on a dedicated multi-core machine, not in this shared session.

## 10. Pilot stages 2 and 3, the proof program, the dry run (2026-10-01 to 2026-10-02)

Measurements and a pipeline test; nothing here is a certificate. Records in `proof/results/`.

* **Stage 2, the GHK window** (`stage2_ghk.json`, one uncoupled cell): the degree-24 window around 15 mV with the
  Bernoulli coefficients, the proved tail bound and the Gronwall inflation (C0 and C1) runs through the fast passage
  (1 ms from -40 mV, 34 window steps of 109) and a slow plateau stretch (25 ms, all 215 steps in the window); the
  floating-point reference lies inside in every run. Inflations: at most 2.6e-30 (C0) and 4.8e-27 (C1) at degree 24.
  Negative control: at degree 4 without the inflation the reference falls outside (55 radii), with it inside.
* **Stage 3, the h/j switch** (`stage3_switch.json`): the section split at -40 mV with the branch flip and the
  derivative composed through the section (saltation by composition) on one cell, a ring of 2 and a ring of 4; section
  images and end sets contain the reference; the negative control without the switch misses it. The multiprecision
  centre (128 bits, order 30) costs 2.50, 8.62 and 32.4 s per step at N = 1, 2, 4.
* **The program** (`proof/`, runbook `RUNBOOK.md`): trusted `ring19.hpp`, `engine.hpp`, `ap_proof.cpp`; untrusted
  `driver.py`, `frame_leaf.py`, `common.py`, whose outputs `ap_proof` checks.
* **The dry run** (`proof/results/dryrun_dry3.json`, `RUNBOOK.md` section 4): N = 3, c = 0.15 per ms, a state that is
  not a rotating wave. Every segment certified (C1 and C0), the chain composed, and `verify` reported NOT VERIFIED
  (q_upper 1.73e6), as it must. Two faults of the untrusted driver were found and fixed. The full N = 16 proof stays a
  secondary result for a dedicated machine (extrapolated 72 to 83 core-hours per C1 shift map and about 2,500
  core-hours for the multiprecision centre as configured, `RUNBOOK.md` section 5).

## 11. The continuum route (2026-10-02)

The owner's plan of 2026-10-02 replaces the discrete ring near propagation failure by periodic travelling waves of the
continuum cable on a ring of length L, in the comoving frame (a 20-dimensional ODE), with L = c T. Plan, numerical
branch, CAPD wrapping pilot and cost: `continuum/PLAN.md` (log `continuum/LOG.md`). In brief (numerical and pilot
results, no theorem): CONTINUUM_SUMMARY
