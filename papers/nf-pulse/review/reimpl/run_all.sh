#!/bin/sh
# Reproduce the reimplementation.  Rigorous: rest.py, prove_ends.py.  Tests/numerics: the rest.
# Usage: sh run_all.sh   (about 15 minutes on one core; the 60-digit shooting is separate, see README)
set -e
cd "$(dirname "$0")"
python3 rest.py > logs_rest.txt
python3 manifold_cone.py > logs_cone.txt
for s in c1 c2 c1+2e-26 c1+5e-26 c1-1e-20 c2+1e-20; do
  python3 prove_ends.py "$s" > "logs_$s.txt"
done
python3 prove_ends.py c1 800 30 50 200 prove_c1_variant.json > logs_c1_variant.txt
python3 prove_ends.py c2 800 30 50 200 prove_c2_variant.json > logs_c2_variant.txt
python3 prove_ends.py c1c2 > logs_c1c2.txt
python3 prove_ends.py 1.10274770973415924914786773574662173325504 800 40 55 240 prove_cstar_minus.json > logs_cstar_minus.txt
python3 prove_ends.py 1.10274770973415924914786773574662173325506 800 40 55 240 prove_cstar_plus.json > logs_cstar_plus.txt
python3 test_vs_mpmath.py prove_c1.json > logs_test_c1.txt
python3 test_vs_mpmath.py prove_c2.json > logs_test_c2.txt
if python3 test_vs_mpmath.py prove_c1.json 1e-40 > logs_test_neg.txt; then echo "NEGATIVE CONTROL FAILED"; exit 1; fi
python3 summarize.py
