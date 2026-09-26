#!/bin/sh
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
#
# Re-run the certificate chain for the slow pulse at eps = 1/10 and eps = 3/20 (beta = 20, theta = 1/4, gamma = 0),
# with negative controls.  Uses the unchanged programs of ../../../code through the wrappers in this folder.
# One line per check; exit status 1 if any proof step fails or any negative control passes.  About a minute.
cd "$(dirname "$0")"
mkdir -p ../data/logs
L=../data/logs
fails=0
check() {            # check <label> <file> <pattern expected to be present>
  if grep -q -- "$3" "$2"; then echo "OK    $1"; else echo "FAIL  $1"; fails=$((fails + 1)); fi
}
T=40
for E in 1/10 3/20; do
  e=$(echo $E | tr / _)
  export NF_EPS=$E
  echo "== eps = $E"
  python3 rest_slow.py > $L/rest_$e.log 2>&1
  check "R: rest state, s = S'(0) < 1, one unstable and three stable eigenvalues on [c1, c2]" $L/rest_$e.log '^CERTIFIED'
  python3 manifold_slow.py > $L/manifold_$e.log 2>&1
  for w in c1 c2 interval; do check "M: unstable manifold validated for |t| <= 1 ($w)" $L/manifold_$e.log "^$w VALIDATED"; done
  check "M: negative control sigma = 8/7 is refused" $L/manifold_$e.log 'validated = False'
  python3 block_slow.py > $L/block_$e.log 2>&1
  check "B: block around rest certified (|U| <= 0.05)" $L/block_$e.log '^dU 0.05 CERTIFIED'
  check "B: negative control U up to 0.15 is refused" $L/block_$e.log 'fails as expected'
  for w in interval c1 c2; do NF_TAG=_final python3 prove_slow.py $w $T > $L/final_${w}_$e.log 2>&1 & done; wait
  check "P: every orbit with c in [c1, c2] is in the interior of the block at xi = $T" $L/final_interval_$e.log 'VERDICT PASS'
  check "P: the orbit at c1 enters the cone K+ inside the block" $L/final_c1_$e.log 'VERDICT PASS'
  check "P: the orbit at c2 enters the cone K- inside the block" $L/final_c2_$e.log 'VERDICT PASS'
  C1=$(python3 -c "import slowsetup as s; print(s.C1_TXT.split('/')[0])")
  python3 prove_slow.py custom:$C1:25:-1 $T > $L/negctrl_samebracket_$e.log 2>&1
  check "N: negative control, the orbit at c1 asked to reach K-, is refused" $L/negctrl_samebracket_$e.log 'VERDICT FAIL'
  python3 prove_slow.py custom:$(python3 -c "import slowsetup as s; print(int(s.cr.C_REF * 10**4) + 1)"):4:1 $T > $L/negctrl_far_c_$e.log 2>&1
  check "N: negative control, c = c1 + about 1e-4, is refused" $L/negctrl_far_c_$e.log 'VERDICT FAIL'
done
export NF_EPS=1/10
for sg in 1 -1; do
  python3 prove_slow.py custom:3775288144231931360774251:25:$sg $T > $L/negctrl_wavetrain_$sg.log 2>&1
  check "N: negative control, eps = 1/10 at the wave-train switch c = 0.37752881442..., cone $sg, is refused" $L/negctrl_wavetrain_$sg.log 'VERDICT FAIL'
done
if [ $fails -gt 0 ]; then echo "$fails checks failed"; exit 1; fi
echo "all checks passed"
