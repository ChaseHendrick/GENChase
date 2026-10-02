# ap-reentry: scoping a computer-assisted proof of action-potential reentry in a ring of TP06 cells

Read `SCOPING.md` first. Nothing here is a proof; every number below is a floating-point observation.

Environment for reproduction (all single-threaded, run under `nice -n 19`):

    gcc -O2 -shared -fPIC -o $SCRATCH/libtp06.so tp06_rhs.c -lm   # optional C right-hand side, export TP06_LIB=$SCRATCH/libtp06.so
    gcc -O2 -o $SCRATCH/ring_rl ring_rl.c -lm                      # fast scanning simulator, export RING_RL=$SCRATCH/ring_rl
    export AP_REENTRY_WORK=$SCRATCH/ap-reentry-work                 # large .npy/.npz intermediates (kept out of the repository)

| file | purpose |
|---|---|
| `tp06_19d.py` | reference translation of the baseline 19-state TP06 endocardial cell (Erhardt, `TP06_endo.m` lines 13-147), Heaviside h/j switch at -40 mV, analytic GHK extension, charge invariant and its gradient |
| `check_model.py` | agreement with the independent 18-state translation `../model/tp06_18d.py`, charge invariant, GHK continuity at 15 mV |
| `check_charge_symbolic.py` | sympy identity: dq/dt = -(Cm Cm_flux/(F V_c)) x coupling for each cell, so the ring total is conserved |
| `hybrid.py` | mode-fixed hybrid integration (h/j branch frozen per segment, event at every V = -40 mV crossing), ring right-hand side, optional C kernel |
| `tp06_rhs.c`, `check_rhs.py` | C copy of the right-hand side (speed only) and its comparison with `tp06_19d.py` (max relative difference 8e-14) |
| `single_cell.py` | 1 Hz pacing with the source stimulus (52 pA/pF, 2 ms), APD90 and threshold crossings per beat |
| `chain_scan.py` | conduction delay per cell versus coupling c in an open chain (propagation-failure threshold) |
| `ring_reentry.py`, `ring_scan.py` | unidirectional initiation by a transient cut edge, circulation test, (N, c) grid |
| `waveform.py` | records one rotation of cell 0 and builds rotating-wave initial states for other N |
| `ring_from_wave.py`, `continue_ring.py` | ring runs from a resampled waveform, continuation of a saved ring state |
| `ring_rl.c`, `scan_rl.py`, `long_rl.py`, `continuum_test.py` | first-order Rush-Larsen simulator for scans only (N, c scans, long drift runs, finely resolved D = 0.154 rings) |
| `rotwave.py` | Z_N-reduced shift map P on the section V_0 = -40 mV (up), coordinates, matrix-free Newton-Krylov and Arnoldi (the Krylov routines were not used for the reported numbers) |
| `solve_rw.py` | driver for the Newton-Krylov routine (not used for the reported numbers) |
| `prep_section.py` | relaxes a ring state and stores it on the section |
| `jac_fd.py` | dense central-difference Jacobian of P (Radau, rtol 1e-11, h 1e-5 in scaled coordinates), resumable |
| `newton_dense.py` | Broyden-Newton with the bordered charge constraint |
| `analyze_multipliers.py` | eigenvalues of DP, Floquet multipliers mu^N, charge eigenvalue check |
| `validate_orbit.py` | full-rotation closure, crossing counts, stiffness, independent check of the leading multiplier |
| `results/*.json` | small summaries of every run quoted in `SCOPING.md` |
| `proof/`, `RUNBOOK.md` | the discrete N = 16 proof program (trusted `ring19.hpp`, `engine.hpp`, `ap_proof.cpp`; untrusted driver), its pilot records and the dry run (`proof/results/dryrun_dry3.json`); a secondary result for a dedicated machine |
| `continuum/` | the continuum route (owner's plan of 2026-10-02): travelling waves of the cable on a ring in the comoving frame, numerical branch, CAPD wrapping pilot, cost; read `continuum/PLAN.md` |
