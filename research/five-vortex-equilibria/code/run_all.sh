#!/bin/sh
# Rebuild and rerun the five-vortex proof and its checks.  Run from code/.
# Wall times on 4 cores (2026-09-26): tests 1 min; N = 5 search 20 s;
# classification 5 s; each bnbA run 5 to 15 min; controls about 20 min.
# Usage: sh run_all.sh [quick]   (quick: tests and the N = 5 proof only)
set -e
W=${WORKERS:-4}
CFLAGS="-O2 -frounding-math -fno-fast-math -fno-math-errno -std=gnu11 -Wall -Wno-unknown-pragmas -Wno-maybe-uninitialized -Wno-unused-function"
gcc $CFLAGS -o bnb bnb.c -lm
gcc $CFLAGS -o bnbA bnbA.c -lm
gcc $CFLAGS -o bnbP bnbP.c -lm
python3 tests/test_ival.py
python3 tests/test_ivelem.py
python3 tests/test_jacobians.py

search() { # dir, command...
  d=$1; shift
  rm -rf "../data/$d"; mkdir -p "../data/$d"
  i=0
  while [ $i -lt $W ]; do
    "$@" $i $W 1e-11 --sym > "../data/$d/w$i.txt" 2> "../data/$d/w$i.err" &
    i=$((i + 1))
  done
  wait
}

# N = 3 (classical check) and N = 5 (Theorem 1)
search run3 ./bnb 3 16
python3 classify.py 3 ../data/run3/w*.txt --json=../data/n3_classes.json | tee ../data/n3_classify.log
search run5sym ./bnb 5 4096
python3 classify.py 5 ../data/run5sym/w*.txt --json=../data/n5_classes.json | tee ../data/n5_classify.log
python3 describe.py ../data/n5_classes.json | tee ../data/n5_describe.txt
[ "$1" = quick ] && exit 0

# independent recount (A = 2) and Hampton's family at A = 3, 6.5, 7, 8
for A in 2 3 6.5 7 8; do
  search runA$A ./bnbA 5 $A 1024
  python3 classifyA.py 5 $A ../data/runA$A/w*.txt --json=../data/n5_A${A}_classes.json | tee ../data/n5_A${A}_classify.log
done

# negative controls
python3 controls.py | tee ../data/controls.log
