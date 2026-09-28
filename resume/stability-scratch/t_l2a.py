import os, sys, time
os.chdir('/home/user/GENChase/.claude/worktrees/hh-stability/papers/hh-pulse/code'); sys.path.insert(0, '.')
import stab_large as SL, stab_region as SR
from flint import arb, acb, ctx
T = 18.5
R = SR.Region(T)
fm = SL.float_model(T)
for cell in [(-0.1, 2.0, 100.0, 125.0), (-0.1, 0.4, 100.0, 105.0)]:
    t = time.time()
    ok, info, w = SL.cell_check(T, R, cell, fm)
    print(cell, ok, info, '%.0fs' % (time.time() - t), flush=True)
