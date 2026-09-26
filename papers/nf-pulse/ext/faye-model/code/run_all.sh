#!/bin/sh
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
#
# Re-run the certificate chain for the fast pulse of Faye's model at one eps, with its negative controls.
# usage: sh run_all.sh [eps]        (eps as a fraction, default 1/20; the settings are in config.py)
# Full output goes to data/logs/ (not tracked); one line per check; exit status 1 if any check fails.
cd "$(dirname "$0")"
EPS=${1:-1/20}
export FAYE_EPS=$EPS
TAG=$(echo "$EPS" | tr '/' '_')
mkdir -p ../data/logs
L=../data/logs
fails=0
check() {            # check <label> <file> <pattern expected to be present>
  if grep -q -- "$3" "$2"; then echo "OK    $1"; else echo "FAIL  $1"; fails=$((fails + 1)); fi
}
echo "eps = $EPS"

python3 certify_rest.py > $L/run_all_rest_$TAG.log 2>&1
check "R: unique rest state, q0 S'(u0) < 1, one unstable and three stable eigenvalues for every c > 0" $L/run_all_rest_$TAG.log '^CERTIFIED'
check "R: negative control lam = 80, kap = 1/10 (three equilibria) is refused" $L/run_all_rest_$TAG.log 'three equilibria): certified? False'
check "R: negative control, a perturbed eigenvalue encloses no root" $L/run_all_rest_$TAG.log 'encloses a root?): False'

python3 block.py > $L/run_all_block_$TAG.log 2>&1
check "B: isolating block with cones around rest certified" $L/run_all_block_$TAG.log 'block CERTIFIED'
check "B: negative control, the block scaled by 1.5 is refused" $L/run_all_block_$TAG.log 'fails as expected'
python3 block_check_iv.py > $L/run_all_block_iv_$TAG.log 2>&1
check "B: independent re-check of the block conditions in mpmath.iv" $L/run_all_block_iv_$TAG.log 'INDEPENDENT BLOCK CHECK CERTIFIED'

python3 test_jacobian.py > $L/run_all_jacobian_$TAG.log 2>&1
check "J: Taylor jet and vector field against the recursion and finite differences (a test, not part of the proof)" $L/run_all_jacobian_$TAG.log 'TEST PASS'
python3 test_lohner.py 1 > $L/run_all_lohner_$TAG.log 2>&1 &

for w in interval c1 c2; do python3 prove_pulse.py $w > $L/final_${TAG}_$w.log 2>&1 & done; wait
check "M: unstable manifold validated (all runs assert it)" $L/final_${TAG}_interval.log 'manifold validated'
check "P: every orbit with c in [c1, c2] is in the interior of the block at T_enter" $L/final_${TAG}_interval.log 'VERDICT PASS'
check "P: the orbit at c1 enters its cone inside the block" $L/final_${TAG}_c1.log 'VERDICT PASS'
check "P: the orbit at c2 enters the opposite cone inside the block" $L/final_${TAG}_c2.log 'VERDICT PASS'

C1=$(python3 -c "import config as c; print(c.get()['c1'].replace('.', ''))")
S1=$(python3 -c "import config as c; print(c.get()['side_c1'])")
D1=$(python3 -c "import config as c; print(len(c.get()['c1'].split('.')[1]))")
S2=$((-S1))
python3 prove_pulse.py custom:$C1:$D1:$S2 > $L/negctrl_${TAG}_samebracket.log 2>&1 &
python3 prove_pulse.py custom:$(python3 -c "import config as c; print(c.get()['c_far'].replace('.', ''))"):$(python3 -c "import config as c; print(len(c.get()['c_far'].split('.')[1]))"):$S1 > $L/negctrl_${TAG}_far.log 2>&1 &
wait
check "N: negative control, the orbit at c1 asked to reach the other cone, is refused" $L/negctrl_${TAG}_samebracket.log 'VERDICT FAIL'
check "N: negative control, a speed far from the pulse speed, is refused" $L/negctrl_${TAG}_far.log 'VERDICT FAIL'
wait
check "I: integrator encloses an independent mpmath solution to xi = 1 and excludes one with b + 1e-20 (a test)" $L/run_all_lohner_$TAG.log 'TEST PASS'

if [ $fails -gt 0 ]; then echo "$fails checks failed"; exit 1; fi
echo "all checks passed"
