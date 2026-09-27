# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Make the base programs in ../../code importable (they are used, never modified)."""
import os, sys
# Refuse python -O (or PYTHONOPTIMIZE): it removes assert statements, and some programs of this folder still use
# assertions as gates of a proof.  Without -O this test does nothing.
if not __debug__:
    raise SystemExit('refusing to run under python -O (PYTHONOPTIMIZE): assertions are gates of the proofs here')
HERE = os.path.dirname(os.path.abspath(__file__))
CODE = os.path.normpath(os.path.join(HERE, '..', '..', 'code'))
DATA = os.path.join(HERE, 'data')
if CODE not in sys.path:
    sys.path.insert(0, CODE)
