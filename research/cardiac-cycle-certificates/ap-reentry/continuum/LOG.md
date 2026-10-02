# Progress log: reentry, continuum route (resumable)

Newest entries last. Times UTC. Nothing in this log is a proof.

## 2026-10-02

- 05:39 to 05:46. CAPD rebuilt after the container reset: `git clone https://github.com/CAPDGroup/CAPD.git`, checkout
  03dc5628203334b214bb7d9fd63788a175521005 (CAPDVersion.txt: 6.1.0; the repository has no 6.1.0 tag, the runbook names
  the commit), `git apply proofs/capd-6.1.0-genchase.patch`, cmake with `-DCAPD_ENABLE_MULTIPRECISION=true`, install to
  `$HOME/capd-install`, built with `-j1` (6 min 42 s). The grep check prints line 262 of
  `PoincareMap_templateMembers.h` ("GENChase patch").
- 05:47. `ap_proof` rebuilt (RUNBOOK 3.2, 13 s): `/root/bin/ap_proof`, sha256
  d3d41f9b49aa5de5705d4a43f7038f870dd489021f2466b03b8c111cf4158d5d.
- 05:48 to 05:52. Quick pilot checks with the rebuilt binary, compared with the stored records:
  - `check_field.py`: `results/check_field.json` reproduced identically;
  - `check_ghk.py`: `results/check_ghk.json` reproduced identically (89 s);
  - `stage3_switch.py ... cell` (kinds c1, c0, mp0, c0_NO_SWITCH): all 111 non-timing fields of the stored `cell`
    record identical (enclosure widths, crossing-time intervals, containment flags, the negative control's
    `end_contains_reference: false`). The stored file was restored afterwards; only timings differ.
- 05:53. The ring4 multiprecision run (stage 3) had finished before the reset (segment 0: 1,716.6 s, 43 steps;
  segment 1: 1,845.5 s, 61 steps). Recorded into `proof/results/stage3_switch.json` with the new
  `stage3_switch.py --collect --kinds=mp0` (reads the outputs, recomputes the box and plan and requires them equal to
  the stored files). Section image, end set and crossing time contain the floating-point reference. 32.4 s per step,
  peak RSS 1.19 GiB.
- 05:56. Dry run of the discrete pipeline started (driver.py, instance dry3: N = 3, c = 0.15, not a rotating wave;
  float shift interval 2.333 ms with internal events at 0.020 ms (cell 2 down) and 1.479 ms (cell 2 up)). Kinds c1 and
  c0 (the multiprecision centre would take hours at N = 3). Run dir in the session scratchpad; log `dryrun.log`.
