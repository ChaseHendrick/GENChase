#!/bin/sh
# Cost of the box search near the minimizer (prototype; see REPORT.md Sect. 5).
cd "$(dirname "$0")"
echo "# exhaustive search of the cube REF +- h (half-width h in each of 15 coordinates); boxes inside the Euclidean ball BALL about REF removed; 900 s limit per run"
for b in 0.1 0.1637; do for h in 0.03 0.045 0.06 0.075; do
  printf 'BALL=%s ' $b; BALL=$b timeout 900 ./bnb near $h || echo "h=$h: not finished in 900 s"
done; done
