#!/bin/sh
# Rerun every computer-assisted step of the paper: build (fetches CAPD at a pinned commit), the exact check of the
# vector field, Theorem 1 at E = -1/2, 0, 1/2, Theorem 2 (every E in [-1e-10, 1e-10] at once), condition (C4) and the
# exact stage-1 comparison (cones.cpp, under two minutes in all), Theorem 3 (the explicit topological horseshoes at
# E = -1/2, 0, 1/2, checked on the committed configurations in configs/), and the controls, which must FAIL, the
# near-miss ones for their stated reason (checked in their reports). Reports go to data/*.txt. About 85 minutes on two
# threads of a shared machine, CAPD already built. The h-set designs are regenerated and compared with the committed
# configurations by designs.sh, separately. NT sets the number of threads (default: all cores).
set -e
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$HERE/..
sh "$HERE/build.sh"
BIN=${BIN:-$ROOT/_bin}; NT=${NT:-$(nproc)}; OUT=$ROOT/data
mkdir -p "$OUT"
python3 "$HERE/check_field.py" > "$OUT/check_field.txt" 2>&1; tail -1 "$OUT/check_field.txt"
status=0
for c in E0 Ehalf Eminushalf E0_interval; do
  if "$BIN/prove" "$ROOT/configs/$c.cfg" "$NT" > "$OUT/$c.txt" 2>&1; then echo "$c: PROVED"; else echo "$c: FAILED (see data/$c.txt)"; status=1; fi
done
for c in E0 Ehalf Eminushalf E0_interval; do
  if "$BIN/cones" "$ROOT/configs/$c.cfg" "$NT" 100 > "$OUT/cones_$c.txt" 2>&1; then echo "cones_$c: (C4) VERIFIED"; else echo "cones_$c: FAILED"; status=1; fi
done
for c in E0 Ehalf Eminushalf; do
  if "$BIN/horseshoe_check" "$ROOT/configs/horseshoe_$c.cfg" "$NT" 16 4 > "$OUT/horseshoe_$c.txt" 2>&1; then echo "horseshoe_$c: all covering relations VERIFIED"; else echo "horseshoe_$c: FAILED"; status=1; fi
done
# Controls. The first four are coarse: they show that a check is evaluated and can fail.
if "$BIN/horseshoe_check" "$ROOT/configs/control_horseshoe_wrong.cfg" "$NT" 16 3 > "$OUT/control_horseshoe_wrong.txt" 2>&1; then echo "control_horseshoe_wrong: PASSED, but it is a control that must fail"; status=1; else echo "control_horseshoe_wrong: fails, as it must"; fi
for c in control_uncoupled_E0 control_mut_segment control_mut_alpha; do
  if "$BIN/prove" "$ROOT/configs/$c.cfg" "$NT" > "$OUT/$c.txt" 2>&1; then echo "$c: PASSED, but it is a control that must fail"; status=1; else echo "$c: fails, as it must"; fi
done
# Near-miss controls: each must fail, and its report must show the stated reason (pattern 1) and, where given, no
# other failure (pattern 2).
expect() {
  name=$1; p1=$2; p2=$3; shift 3
  if "$@" > "$OUT/$name.txt" 2>&1; then echo "$name: PASSED, but it is a control that must fail"; status=1
  elif grep -qF -- "$p1" "$OUT/$name.txt" && { [ -z "$p2" ] || grep -qF -- "$p2" "$OUT/$name.txt"; }; then echo "$name: fails, as it must ($p1)"
  else echo "$name: fails, but not for its stated reason"; status=1; fi
}
expect control_cones_swap "FAIL: (C4) kappa < 1" "" "$BIN/cones" "$ROOT/configs/E0.cfg" "$NT" 100 swap
expect control_cones_shift "FAIL: (C4) |x_p| < a (mu_h - 1)/(mu_h + 1)" "RESULT: FAIL (1)" "$BIN/cones" "$ROOT/configs/E0.cfg" "$NT" 100 shift
expect control_hs_thin "edges left->left, right->right" ": FAIL" "$BIN/horseshoe_check" "$ROOT/configs/control_hs_thin.cfg" "$NT" 16 1
expect control_hs_wide "edges NOT separated" "unresolved 0: FAIL" "$BIN/horseshoe_check" "$ROOT/configs/control_hs_wide.cfg" "$NT" 16 1
expect control_hs_overlap "NOT DISJOINT: M1 M1o" "unresolved 0: covers" "$BIN/horseshoe_check" "$ROOT/configs/control_hs_overlap.cfg" "$NT" 16 1
# A record, not a proof: stage 1 with the energy interval widened to [-1e-9, 1e-9] fails (Sect. 4.6 of the paper).
if "$BIN/cones" "$ROOT/configs/stage1_interval_1e-9.cfg" "$NT" 100 > "$OUT/stage1_interval_1e-9.txt" 2>&1; then echo "stage1_interval_1e-9: passed (the paper says it fails)"; status=1; else echo "stage1_interval_1e-9: stage 1 fails, as recorded"; fi
exit $status
