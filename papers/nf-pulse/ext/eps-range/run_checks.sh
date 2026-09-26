#!/bin/sh
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
#
# Quick re-run of the eps-range extension (about 10 minutes on four cores): the integrator tests, one
# subinterval proof from scratch, the negative controls on it, and the coverage/speed table from the stored
# certificates.  One line per check; exit status 1 if a proof step fails or a negative control passes.
# The full sweep that produced data/certs/ is  python3 run_range.py <from> <to>  (see REPORT.md).
cd "$(dirname "$0")"
mkdir -p data/logs
L=data/logs
fails=0
check() {            # check <label> <file> <pattern expected to be present>
  if grep -q -- "$3" "$2"; then echo "OK    $1"; else echo "FAIL  $1"; fails=$((fails + 1)); fi
}
python3 test_lohner7.py > $L/test_lohner7.log 2>&1
check "T: lohner7 agrees with the original integrator, the time rescaling and the jet (tests)" $L/test_lohner7.log 'ALL TESTS PASS'
E1=0.0998; E2=0.1002; CG=1.1027477
python3 chain.py $E1 $E2 $CG --dk 2e-5 --out $L/proof_rerun.json > $L/proof_rerun.log 2>&1 &
python3 chain.py $E1 $E2 $CG --dk 2e-5 --shift 3 > $L/neg_shift_up.log 2>&1 &
python3 chain.py $E1 $E2 $CG --dk 2e-5 --shift -3 > $L/neg_shift_dn.log 2>&1 &
python3 chain.py $E1 $E2 $CG --dk 2e-5 --samecone 1 > $L/neg_samecone.log 2>&1 &
wait
check "P: eps in [$E1, $E2]: rest, manifold, block and the covering chain certified" $L/proof_rerun.log 'VERDICT PASS'
check "N: kappa window moved up by 3 dk (off the pulse) is refused" $L/neg_shift_up.log 'VERDICT FAIL'
check "N: kappa window moved down by 3 dk is refused" $L/neg_shift_dn.log 'VERDICT FAIL'
check "N: both ends required in the cone K+ is refused" $L/neg_samecone.log 'VERDICT FAIL'
python3 table.py --md $L/speed_table_rerun.md > $L/table.log 2>&1
check "C: stored certificates summarised (coverage and speed table)" $L/table.log 'certified subintervals'
if [ $fails -gt 0 ]; then echo "$fails checks failed"; exit 1; fi
echo "all checks passed"
