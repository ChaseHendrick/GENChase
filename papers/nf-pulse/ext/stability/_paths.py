# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Make the base programs in papers/nf-pulse/code importable (they are used, never modified)."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
CODE = os.path.normpath(os.path.join(HERE, '..', '..', 'code'))
DATA = os.path.join(HERE, 'data')
if CODE not in sys.path:
    sys.path.insert(0, CODE)
