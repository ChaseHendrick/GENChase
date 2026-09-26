#!/bin/sh
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
#
# Re-run the whole certificate chain for the fast pulse at Pinto and Ermentrout's gain (logistic gain 12 =
# (1 + tanh(6 (u - theta)))/2), theta = 1/4, eps = 3/20, gamma = 0, and its negative controls.
# Every step writes its full output to ../data/logs/; this script prints one line per check and exits with
# status 1 at the end if any proof step fails or any negative control passes.
cd "$(dirname "$0")"
mkdir -p ../data/logs
L=../data/logs
fails=0
check() {            # check <label> <file> <pattern expected to be present>
  if grep -q -- "$3" "$2"; then echo "OK    $1"; else echo "FAIL  $1"; fails=$((fails + 1)); fi
}

python3 certify_rest.py > $L/run_all_rest.log 2>&1
check "R: rest state unique, s = S'(0) < 1; eigenvalues lu > 0 > l1 and a complex pair with Re < 0; lu > |Re|" $L/run_all_rest.log '^CERTIFIED'
check "R: negative control theta = 0 (S'(0) = 3) is refused" $L/run_all_rest.log 'certified? False'
check "R: negative control, a perturbed eigenvalue is refused" $L/run_all_rest.log 'contains a root of p?): False'
check "R: negative control, four real roots (the gain-20 certificate's premise) is refused" $L/run_all_rest.log 'required?): False'

python3 manifold.py > $L/run_all_manifold.log 2>&1
for w in c1 c2 interval; do check "M: unstable manifold validated for |t| <= 1 ($w)" $L/run_all_manifold.log "^$w VALIDATED"; done
check "M: negative control sigma x 8 is refused" $L/run_all_manifold.log 'validated = False'

python3 block.py > $L/run_all_block.log 2>&1
check "B: Lyapunov-form block around rest certified (|U| <= 0.02)" $L/run_all_block.log '^dU 0.02 CERTIFIED'
check "B: negative control, the gain-20 block size |U| <= 0.05 is refused" $L/run_all_block.log 'dU = 0.05: fails as expected'
check "B: negative control U up to 0.15 is refused" $L/run_all_block.log 'U in \[-0.05, 0.15\]: fails as expected'
check "B: negative control, the gain-20 block construction (real parts of eigenvectors) is refused" $L/run_all_block.log 'construction: fails as expected'
python3 block_check_iv.py > $L/run_all_block_iv.log 2>&1
check "B: independent re-check of the block conditions in mpmath.iv" $L/run_all_block_iv.log '^dU 0.02 .*CERTIFIED'
check "B: independent re-check refuses |U| <= 0.05" $L/run_all_block_iv.log '^dU 0.05 .*FAILED'

python3 test_lohner2.py neg > $L/run_all_lohner_neg.log 2>&1 &
python3 test_jacobian.py > $L/run_all_jacobian.log 2>&1
check "J: Jacobian with d/dkappa against finite differences (a test, not part of the proof)" $L/run_all_jacobian.log 'max |J_AD - J_FD|'

for w in interval c1 c2; do NF_TAG=_final python3 prove_pulse.py $w 45 > $L/final_$w.log 2>&1 & done; wait
check "P: every orbit with c in [c1, c2] is in the interior of the block at xi = 45" $L/final_interval.log 'VERDICT PASS'
check "P: the orbit at c1 enters the cone K- inside the block" $L/final_c1.log 'VERDICT PASS'
check "P: the orbit at c2 enters the cone K+ inside the block" $L/final_c2.log 'VERDICT PASS'

python3 prove_pulse.py custom:104753749779917111554998626:26:1 45 > $L/negctrl_samebracket.log 2>&1 &
python3 prove_pulse.py custom:1040:3:-1 45 > $L/negctrl_far_c.log 2>&1 &
python3 prove_pulse.py custominterval:104753749781039441558361652:104753749781039441558361662:26 45 > $L/negctrl_escape_bracket.log 2>&1 &
wait
check "N: negative control, the orbit at c1 asked to reach K+, is refused" $L/negctrl_samebracket.log 'VERDICT FAIL'
check "N: negative control c = 1.040, far from the pulse speed, is refused" $L/negctrl_far_c.log 'VERDICT FAIL'
check "N: negative control, the escape-classifier bracket (a multi-pulse, 1.1e-11 away) is refused" $L/negctrl_escape_bracket.log 'VERDICT FAIL'

wait
python3 test_decisions.py > $L/run_all_decisions.log 2>&1
check "D: containment decisions refuse straddling enclosures; step ranges and the U-range are right" $L/run_all_decisions.log 'ALL DECISION CONTROLS PASS'
awk '/remainder included/{s=1} /remainder DROPPED/{s=2} s==1 && /contains mpmath: False/{bad=1} s==2 && /contains mpmath: False/{miss=1} END{if(!bad && miss) print "LOHNER NEG OK"}' $L/run_all_lohner_neg.log > $L/run_all_lohner_neg_verdict.log
check "N: integrator with its remainder dropped fails to contain the mpmath solution (with it, contains)" $L/run_all_lohner_neg_verdict.log 'LOHNER NEG OK'

if [ $fails -gt 0 ]; then echo "$fails checks failed"; exit 1; fi
echo "all checks passed"
