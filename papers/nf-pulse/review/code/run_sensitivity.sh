#!/bin/sh
# Run lohner_sensitivity.py on the baseline copy and on every lohner.py mutation copy made by mutate.py.
M=${MUT_DIR:-/tmp/claude-0/-home-user-GENChase/6b4e32ba-2c25-5f83-9afb-b1a263f75129/scratchpad/mut}
H=$(cd "$(dirname "$0")" && pwd)
out=$H/sensitivity_results.txt
: > $out
for m in baseline M01_no_lagrange_remainder M02a_picard_accept_unchecked M02b_picard_F_at_X_not_W M02c_picard_no_inflation_tiny_W M03a_Binv_transpose M04_drop_dkappa_jacobian M05_drop_dkappa_V M06_jacobian_at_xbar_not_hull M07_remainder_at_point M08_drop_C_residual M09_hull_interior_always; do
  r=$(timeout 900 python3 $H/lohner_sensitivity.py $M/$m/nf-pulse/code 2>&1 | tail -1)
  echo "$m  $r" >> $out
done
