#!/bin/sh
# Rerun everything: build (fetches CAPD at a pinned commit), the exact field check, the three proofs,
# and the controls (which must FAIL). Logs go to data/. About 5 minutes on 4 cores.
set -e
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$HERE/..
sh "$HERE/build.sh"
BIN=${BIN:-$ROOT/_bin}; NT=${NT:-$(nproc)}
python3 "$HERE/check_field.py" > "$ROOT/data/check_field.log" 2>&1; tail -1 "$ROOT/data/check_field.log"
status=0
for c in E0 Ehalf Eminushalf; do
  if "$BIN/prove" "$ROOT/configs/$c.cfg" "$NT" > "$ROOT/data/$c.log" 2>&1; then echo "$c: PROVED"; else echo "$c: FAILED (see data/$c.log)"; status=1; fi
done
for c in control_uncoupled_E0 control_mut_segment control_mut_alpha; do
  if "$BIN/prove" "$ROOT/configs/$c.cfg" "$NT" > "$ROOT/data/$c.log" 2>&1; then echo "$c: PASSED, but it is a control that must fail"; status=1; else echo "$c: fails, as it must"; fi
done
exit $status
