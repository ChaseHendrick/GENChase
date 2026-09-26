# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Speed bracket for the fast pulse at beta = 12, theta = 1/4, eps = 3/20, gamma = 0.

From the NON-rigorous high-precision FIRST-RETURN shooting (shoot_first_return.py 256 bisect 88):
the first return after the excitation switches from the cone K- (below) to K+ (above) between
1.04753749779917111554998631150479049770... and ...49835...; c1 and c2 sit about 5e-26 on either
side.  (The escape classifier of shoot_hp.py switches elsewhere, at 1.04753749781039441558361656747...,
about 1.1e-11 higher: that switch belongs to a multi-pulse, see REPORT.md.)  The proof does not use
these facts: it certifies the cone reached by each end directly.
"""
C_DEN = 10 ** 26
C1_NUM = 104753749779917111554998626      # c1 = 1.04753749779917111554998626
C2_NUM = 104753749779917111554998636      # c2 = c1 + 1e-25
C_REF = 1.0475374977991711
SIDE_C1, SIDE_C2 = -1, +1                 # expected cone K- (c1) and K+ (c2) at the block
