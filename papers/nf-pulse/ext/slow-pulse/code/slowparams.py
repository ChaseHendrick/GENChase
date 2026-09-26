#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Parameter selection for the slow-pulse extension.

The programs of the fast-pulse proof live in ../../../code and are imported unchanged.  Their parameters are
exact rationals stored in nfcore (_BETA, _THETA, _EPS, _GAMMA) and read at every use, so setting them here, once,
before any computation, changes the model for every imported routine.  The environment variables
NF_EPS, NF_THETA, NF_BETA (exact rationals such as 3/20) select the parameter point; the default is the point of
the fast-pulse proof, beta = 20, theta = 1/4, eps = 1/10 (gamma = 0 always).  eps = 3/20 with theta = 1/4 is the
point of Pinto and Ermentrout's Figs. 7 (right) and 8.
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'code'))
from flint import fmpq
import nfcore as nf


def q(s):
    a, _, b = s.partition('/')
    return fmpq(int(a), int(b or 1))


EPS = q(os.environ.get('NF_EPS', '1/10'))
THETA = q(os.environ.get('NF_THETA', '1/4'))
BETA = q(os.environ.get('NF_BETA', '20'))
nf._EPS, nf._THETA, nf._BETA = EPS, THETA, BETA
assert nf._GAMMA == 0
TXT = 'beta=%s, theta=%s, eps=%s, gamma=0, w(x)=exp(-|x|)/2' % (BETA, THETA, EPS)
