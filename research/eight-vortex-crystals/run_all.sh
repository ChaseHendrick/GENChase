#!/bin/sh
# Reproduce every rigorous result of REPORT.md (about 5 seconds) and the negative controls.
# Requires Python 3.11 with python-flint 0.9.0 and numpy (pip install python-flint numpy scipy).
set -e
cd "$(dirname "$0")/code"
python3 certify_classes.py      # Krawczyk, index, f enclosures, chirality for the 19 classes
python3 controls_classes.py     # negative controls and mutation tests (must print ALL PASS)
python3 certify_stability.py    # certified unstable eigenvalue for the 18 non-minima
python3 certify_basin.py        # the heptagon's certified basin radius, with its negative control
python3 apriori.py              # closed forms and a priori bounds
