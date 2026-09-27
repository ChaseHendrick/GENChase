#!/bin/bash
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
#
# Where does the method stop?  Single subinterval attempts of several widths at eps outside the swept range
# (four at a time).  Results (one line per attempt) go to data/limits.txt; certificates to data/probes/.
cd "$(dirname "$0")"
# As in code/run_all.sh of this paper's folder: refuse python -O, which would remove the assertions that some gates
# of these programs still use, and clear every NF_* variable, which would change parameters, blocks, precision,
# order or tolerances of the programs.
if [ -n "${PYTHONOPTIMIZE:-}" ]; then echo "FAIL  PYTHONOPTIMIZE is set; unset it and rerun"; exit 1; fi
for v in $(env | sed -n 's/^\(NF_[A-Za-z0-9_]*\)=.*/\1/p'); do unset "$v"; done
mkdir -p data/probes data/logs
run() {    # run <e_lo> <e_hi> <c_guess>
  dk=$(python3 -c "print('%.3e' % ((float('$2') - float('$1')) / 20))")
  python3 chain.py $1 $2 $3 --dk $dk --out data/probes/eps_$1_$2.json > data/logs/probe_$1_$2.log 2>&1
  echo "$1 $2 $(grep VERDICT data/logs/probe_$1_$2.log | cut -c1-160)" >> data/limits.txt
}
cg() { python3 -c "import run_range; print('%.12f' % run_range.c_guess($1))"; }
for spec in "0.05 1e-4" "0.05 5e-5" "0.05 2.5e-5" "0.06 1e-4" "0.06 5e-5" "0.07 1e-4" "0.07 5e-5" \
            "0.13 2e-4" "0.14 2e-4" "0.15 2e-4" "0.15 4e-4" "0.17 2e-4" "0.19 2e-4" "0.2 1e-4" "0.21 1e-4" "0.215 5e-5"; do
  set -- $spec
  lo=$(python3 -c "print('%.6f' % ($1 - $2 / 2))"); hi=$(python3 -c "print('%.6f' % ($1 + $2 / 2))")
  run $lo $hi $(cg $1) &
  while [ $(jobs -r | wc -l) -ge 4 ]; do sleep 5; done
done
wait
