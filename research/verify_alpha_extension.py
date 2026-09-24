"""Remark 1 of research/alpha-winding-2026-09-24.typ: rigorous (interval-arithmetic) proof of the m < 2 case of step (iii) for beta in [BLO, 1/2].
With rho < 1: if b(m) = 1 + 6 beta - beta m^2 - m > 0 the right side of the identity is positive; otherwise it
exceeds E(m) = A(m)^2 + b(m)/3 with A(m) = (1+beta) m - 2/m - 1, provided A(m) >= 0.  Every box of
[BLO, 1/2] x [MLO, 2] must satisfy b > 0, or (A >= 0 and m^2 E > 0).  For m <= MLO we show b > 0 directly."""
from mpmath import iv, mpf
import sys
iv.dps = 30
BLO = mpf(sys.argv[1]) if len(sys.argv) > 1 else mpf('0.2622')   # covers beta >= 21/80, i.e. alpha >= -59/40
MLO = mpf('1.5')
def b_of(B, M): return 1 + 6*B - B*M**2 - M
def A_times_m(B, M): return (1 + B)*M**2 - 2 - M                    # m A(m)
def P_of(B, M): return A_times_m(B, M)**2 + M**2*b_of(B, M)/3        # m^2 E(m)
stack = [(iv.mpf([BLO, mpf('0.5')]), iv.mpf([MLO, 2]))]; boxes = 0; depth_fail = 0
while stack:
    B, M = stack.pop(); boxes += 1
    if b_of(B, M).a > 0: continue                                     # bracket provably positive on the box
    if A_times_m(B, M).a >= 0 and P_of(B, M).a > 0: continue          # E provably positive, A >= 0
    if boxes > 2_000_000: depth_fail = 1; break
    bm, mm_ = B.mid, M.mid
    for b1 in (iv.mpf([B.a, bm]), iv.mpf([bm, B.b])):
        for m1 in (iv.mpf([M.a, mm_]), iv.mpf([mm_, M.b])):
            if min(b1.delta, m1.delta) < mpf('1e-9'): depth_fail = 1; stack = []; break
            stack.append((b1, m1))
# m <= 1.5: b(m) >= b(1.5) = 1 + 6 beta - 2.25 beta - 1.5 = 3.75 beta - 0.5 > 0 for beta > 2/15
msg = (f"beta in [{BLO}, 1/2], m in [1.5, 2]: {boxes} boxes, {'FAILED' if depth_fail else 'all resolved'}; "
      f"m < 1.5: b(m) > 3.75 beta - 0.5 = {3.75*float(BLO) - 0.5:.4f} > 0")
print(msg)
import os
open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "artifacts", "verify_alpha_extension.txt"), "w").write(msg + "\n")
