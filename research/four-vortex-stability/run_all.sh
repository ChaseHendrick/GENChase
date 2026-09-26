#!/bin/sh
# Final certification runs (about 1 h in total on 4 cores).  Each writes data/cert_*.json.
set -e
cd "$(dirname "$0")"
python3 certify3.py three-kite -0.13378 -0.0001 700 1e-10 data/cert_kite.json > data/cert_kite.log 2>&1
python3 certify3.py three-collinear -0.95 -0.85642 9358 1e-10 data/cert_collinear.json > data/cert_collinear.log 2>&1
python3 certify3.py three-collinear -0.96 -0.95 5000 1e-10 data/cert_collinear_ext.json > data/cert_collinear_ext.log 2>&1
