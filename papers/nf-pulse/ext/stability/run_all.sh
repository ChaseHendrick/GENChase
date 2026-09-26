#!/bin/sh
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
#
# Re-run the stability programs.  One line per check; exit status 1 if any rigorous check fails.
#   sh run_all.sh          everything (the six winding runs take most of the time, 10 to 40 minutes each on 4 cores)
#   sh run_all.sh quick    everything except the winding runs (reuses data/winding_*.json if present)
cd "$(dirname "$0")"
mkdir -p data work
fails=0
check() {            # check <label> <file> <pattern expected to be present>
  if grep -q -- "$3" "$2"; then echo "OK    $1"; else echo "FAIL  $1"; fails=$((fails + 1)); fi
}
C_LO=1.1027477097341592491478677357466217332550533837818208789272
C_HI=1.1027477097341592491478677357466217332550533837818208789273

python3 ess_spectrum.py > data/ess_spectrum.log 2>&1
check "E: essential spectrum in Re lam <= -0.11270..." data/ess_spectrum.log 'CERTIFIED'
check "E: negative control eps = 3/10 is refused" data/ess_spectrum.log 'discriminant positive = False'

python3 large_lambda.py > data/large_lambda.log 2>&1
check "L: no eigenvalue with Re lam >= -1/20 outside the box [-1/20, 9/2] x [-38/5, 38/5]" data/large_lambda.log 'EXCLUSION: CERTIFIED'
check "L: negative control (box too small for the bound) is refused" data/large_lambda.log 'certified = False'

sh thin_runs.sh > data/thin_runs.log 2>&1
check "P: narrow bracket, orbit at c_lo enters K- (base prove_pulse.py, T_B = 110)" data/thin_c_lo.log 'VERDICT PASS'
check "P: narrow bracket, orbit at c_hi enters K+ (base prove_pulse.py, T_B = 110)" data/thin_c_hi.log 'VERDICT PASS'

python3 pulse_enclosure.py $C_LO $C_HI 110 120 > data/pulse_enclosure.log 2>&1
check "P: every orbit with c in [c_lo, c_hi] is in the interior of the block at xi = 110" data/pulse_enclosure.log '"in_int_B_at_T_B": true'

if [ "$1" != "quick" ]; then
  for p in right_up top left_up left_down bottom right_down; do
    python3 winding.py $p 4 > data/winding_$p.log 2>&1
  done
fi
python3 winding.py combine > data/winding_combine.log 2>&1
check "W: winding number of the Evans function on the box boundary is 1" data/winding_combine.log 'WINDING NUMBER 1$'

# numerical (not rigorous)
python3 pulse_hp.py 120 > data/pulse_hp.log 2>&1
python3 spectrum_num.py 4 > data/spectrum_num.log 2>&1
echo "(numerical) $(grep -c winding data/spectrum_num.json) numerical winding records in data/spectrum_num.json"

if [ $fails -gt 0 ]; then echo "$fails checks failed"; exit 1; fi
echo "all checks passed"
