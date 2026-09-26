#!/bin/sh
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
# RIGOROUS: re-prove the narrow speed bracket with the base program prove_pulse.py (unchanged), custom mode:
# the orbit at C_LO enters the cone K- and the orbit at C_HI enters K+ inside the block, both staying in the block
# from xi = T_B on.  prove_pulse writes ../data/proof_custom_*.json relative to the working directory, so it is
# run from work/ and its certificates land in this folder's data/.
cd "$(dirname "$0")/work"
CODE=../../../code
N_LO=11027477097341592491478677357466217332550533837818208789272
N_HI=11027477097341592491478677357466217332550533837818208789273
EXP=58
T_B=${T_B:-110}
export NF_PREC=384 NF_TOL=1e-95 NF_ORDER=36
PYTHONPATH=$CODE python3 $CODE/prove_pulse.py custom:$N_LO:$EXP:-1 $T_B > ../data/thin_c_lo.log 2>&1 &
PYTHONPATH=$CODE python3 $CODE/prove_pulse.py custom:$N_HI:$EXP:1 $T_B > ../data/thin_c_hi.log 2>&1 &
wait
grep -h "VERDICT" ../data/thin_c_lo.log ../data/thin_c_hi.log
