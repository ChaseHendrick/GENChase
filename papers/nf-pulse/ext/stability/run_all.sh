#!/bin/sh
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
#
# Re-run the stability programs.  One line per check; exit status 1 if any rigorous check fails.
#   sh run_all.sh          everything (the six winding runs take most of the time, 16 to 31 minutes each on 4 cores;
#                          the four pieces of the winding controls a few minutes each)
#   sh run_all.sh quick    everything except the winding runs and the pieces of the winding controls (reuses the
#                          stored data/winding_*.json, whose sha256 records are checked against the present files)
cd "$(dirname "$0")"
# As in code/run_all.sh of this paper's folder: refuse python -O, which would remove the assertions that some gates
# of these programs still use, and clear every NF_* variable, which would change parameters, blocks, precision,
# order or tolerances of the programs.
if [ -n "${PYTHONOPTIMIZE:-}" ]; then echo "FAIL  PYTHONOPTIMIZE is set; unset it and rerun"; exit 1; fi
for v in $(env | sed -n 's/^\(NF_[A-Za-z0-9_]*\)=.*/\1/p'); do unset "$v"; done
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

if [ -f data/pulse_records.pkl ]; then
  # the stored records are the ones the winding pieces were computed with (their sha256 is checked by combine):
  # recompute into work/rerun and compare everything except the timing
  NF_STAB_OUT=work/rerun python3 pulse_enclosure.py $C_LO $C_HI 110 120 > data/pulse_enclosure.log 2>&1
  python3 -c "
import pickle
a = pickle.load(open('data/pulse_records.pkl', 'rb')); b = pickle.load(open('work/rerun/pulse_records.pkl', 'rb'))
for d in (a, b): d['info'].pop('time_s')
print('RECORDS REPRODUCED' if a == b else 'RECORDS DIFFER')" >> data/pulse_enclosure.log 2>&1
  check "P: the stored pulse records are reproduced exactly" data/pulse_enclosure.log 'RECORDS REPRODUCED'
else
  python3 pulse_enclosure.py $C_LO $C_HI 110 120 > data/pulse_enclosure.log 2>&1
fi
check "P: every orbit with c in [c_lo, c_hi] is in the interior of the block at xi = 110" data/pulse_enclosure.log '"in_int_B_at_T_B": true'

python3 simple_zero.py 128 4 > data/simple_zero.log 2>&1
check "Z: at lam = 0, one rest eigenvalue with Re > 0 and three with Re < 0 (disjoint balls)" data/simple_zero.log 'disjoint balls: True'
check "Z: lam = 0 is a simple zero of the Evans function (Cauchy integral on |lam| = 1/25, 128 arcs)" data/simple_zero.log 'SIMPLE ZERO: CERTIFIED'
check "Z: negative control, Dt(0) != 0 from the same arcs (mean-value integral), is refused: its enclosure contains 0" data/simple_zero.log 'contains 0: True'
python3 part3_symbolic.py > data/part3_symbolic.log 2>&1
check "Part 3: the algebra of the multiplicity argument (SymPy, two negative controls)" data/part3_symbolic.log 'PART 3 ALGEBRA: CHECKED'

if [ "$1" != "quick" ]; then
  for p in right_up top left_up left_down bottom right_down; do
    python3 winding.py $p 4 > data/winding_$p.log 2>&1
  done
fi
python3 winding.py combine > data/winding_combine.log 2>&1
check "W: winding number of the Evans function on the box boundary is 1" data/winding_combine.log 'WINDING NUMBER 1$'
if [ "$1" != "quick" ]; then
  python3 winding_controls.py run 4 > data/winding_controls_run.log 2>&1
fi
python3 winding_controls.py check > data/winding_controls.log 2>&1
check "W: control, winding number 1 on the square [-1/25, 1/25]^2 around the zero lam = 0" data/winding_controls.log '^CTRL0 WINDING NUMBER 1 AS EXPECTED'
check "W: negative control, a zero in the square [1/10, 3/10] x [-1/10, 1/10] is refused (winding number 0)" data/winding_controls.log '^CTRLN WINDING NUMBER 0 AS EXPECTED'

# numerical (not rigorous)
python3 pulse_hp.py 120 > data/pulse_hp.log 2>&1
python3 spectrum_num.py 4 > data/spectrum_num.log 2>&1
echo "(numerical) $(grep -c winding data/spectrum_num.json) numerical winding records in data/spectrum_num.json"

if [ $fails -gt 0 ]; then echo "$fails checks failed"; exit 1; fi
echo "all checks passed"
