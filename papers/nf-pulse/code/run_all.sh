#!/bin/sh
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
#
# Re-run the whole certificate chain for the fast pulse, its negative controls and the integrator tests (about two
# minutes on four cores). Every step writes its full output to data/logs/; this script prints one line per check and
# exits with status 1 at the end if any proof step or test fails or any negative control passes.
cd "$(dirname "$0")"
# The certificates must not depend on the environment: python -O would strip assertions (the proof uses explicit
# checks, nfcore.require, but refuse anyway), and the NF_* variables change the block, precision and order.
if [ -n "${PYTHONOPTIMIZE:-}" ]; then echo "FAIL  PYTHONOPTIMIZE is set; unset it and rerun"; exit 1; fi
for v in $(env | sed -n 's/^\(NF_[A-Za-z0-9_]*\)=.*/\1/p'); do unset "$v"; done
mkdir -p ../data/logs
L=../data/logs
fails=0
check() {            # check <label> <file> <pattern expected to be present>
  if grep -q -- "$3" "$2"; then echo "OK    $1"; else echo "FAIL  $1"; fails=$((fails + 1)); fi
}

python3 certify_rest.py > $L/run_all_rest.log 2>&1
check "R: rest state unique, s = S'(0) < 1, one unstable and three stable eigenvalues" $L/run_all_rest.log '^CERTIFIED'
check "R: negative control theta = 0 (S'(0) = 5) is refused" $L/run_all_rest.log 'certified? False'

python3 manifold.py > $L/run_all_manifold.log 2>&1
for w in c1 c2 interval; do check "M: unstable manifold validated for |t| <= 1 ($w)" $L/run_all_manifold.log "^$w VALIDATED"; done
check "M: negative control sigma x 8 is refused" $L/run_all_manifold.log 'validated = False'

python3 block.py > $L/run_all_block.log 2>&1
check "B: block around rest certified (|U| <= 0.05)" $L/run_all_block.log '^dU 0.05 CERTIFIED'
check "B: negative control U up to 0.15 is refused" $L/run_all_block.log 'fails as expected'
python3 block_check_iv.py > $L/run_all_block_iv.log 2>&1
check "B: independent re-check of the block conditions, U-range and parameters in mpmath.iv" $L/run_all_block_iv.log '^dU 0.05 .*-> CERTIFIED$'

# integrator tests (not part of the proof; they check that the rigorous parts are present and correct)
python3 test_lohner.py > $L/run_all_lohner.log 2>&1 &
python3 test_lohner2.py neg > $L/run_all_lohner2.log 2>&1 &
python3 test_stress.py > $L/run_all_stress.log 2>&1 &
python3 test_jacobian.py > $L/run_all_jacobian.log 2>&1
wait
check "J: Jacobian with d/dkappa against finite differences" $L/run_all_jacobian.log '^JACOBIAN PASS'
check "T: integrator enclosures contain an independent mpmath solution to xi = 12" $L/run_all_lohner.log '^INTEGRATOR TEST PASS'
check "T: with the Taylor remainder dropped, the order-8 enclosures miss the mpmath solution" $L/run_all_lohner2.log '^REMAINDER TEST PASS'
check "T: low-order stress test, point speed and a speed interval, against mpmath" $L/run_all_stress.log '^STRESS PASS'

for w in interval c1 c2; do NF_TAG=_final python3 prove_pulse.py $w 53 > $L/final_$w.log 2>&1 & done; wait
check "P: every orbit with c in [c1, c2] is in the interior of the block at xi = 53" $L/final_interval.log 'VERDICT PASS'
check "P: the orbit at c1 enters the cone K- inside the block" $L/final_c1.log 'VERDICT PASS'
check "P: the orbit at c2 enters the cone K+ inside the block" $L/final_c2.log 'VERDICT PASS'

python3 prove_pulse.py custom:11027477097341592491478677:25:1 53 > $L/negctrl_samebracket.log 2>&1
check "N: negative control, the orbit at c1 asked to reach K+, is refused" $L/negctrl_samebracket.log 'VERDICT FAIL'
python3 prove_pulse.py custom:11024:4:-1 53 > $L/negctrl_far_c.log 2>&1
check "N: negative control c = 1.1024, far from the pulse speed, is refused" $L/negctrl_far_c.log 'VERDICT FAIL'

# negative controls of the block inside the proof driver: a block reaching U = 0.15 (S' up to about 2.7) and a
# block with r < rho must stop the driver with a CertificateError before any verdict is printed
NF_DU=0.15 python3 prove_pulse.py c1 53 > $L/negctrl_block_du.log 2>&1
if grep -q 'CertificateError' $L/negctrl_block_du.log && ! grep -q 'VERDICT PASS' $L/negctrl_block_du.log; then
  echo "OK    N: negative control, a block reaching U = 0.15, is refused by the proof driver"
else echo "FAIL  N: negative control, a block reaching U = 0.15, is refused by the proof driver"; fails=$((fails + 1)); fi
NF_R_OVER_RHO=0.5 python3 prove_pulse.py c1 53 > $L/negctrl_block_r.log 2>&1
if grep -q 'CertificateError' $L/negctrl_block_r.log && ! grep -q 'VERDICT PASS' $L/negctrl_block_r.log; then
  echo "OK    N: negative control, a block with r < rho, is refused by the proof driver"
else echo "FAIL  N: negative control, a block with r < rho, is refused by the proof driver"; fails=$((fails + 1)); fi

if [ $fails -gt 0 ]; then echo "$fails checks failed"; exit 1; fi
echo "all checks passed"
