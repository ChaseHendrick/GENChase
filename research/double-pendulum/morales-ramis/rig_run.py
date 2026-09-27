"""Task 3: validated enclosure of the fundamental matrix of the variational equation along
Salnikov's loops (g = 1, x0 = (0.1, -0.3, 0.2, 0.4) as angles and angular velocities), each
diamond traversed three times from t = 0 with Xi(0) = I.  Usage: python3 rig_run.py gamma1|gamma2 [N] [q]"""
import sys, time, json
import numpy as np
from flint import acb, arb, ctx
from rigorous import RigDisk, err, up
from taylor import identity, energy
from salnikov_printed import M1 as S1, M2 as S2

name = sys.argv[1]
N = int(sys.argv[2]) if len(sys.argv) > 2 else 40
q = float(sys.argv[3]) if len(sys.argv) > 3 else 0.2
turns = int(sys.argv[4]) if len(sys.argv) > 4 else 3
R = RigDisk(g='1', N=N, prec=int(sys.argv[5]) if len(sys.argv) > 5 else 256, q=q)
x0 = [acb('0.1'), acb('-0.3'), acb('0.2'), acb('0.4')]
T = lambda a, b: acb(a, b)
s = -1 if name == 'gamma2' else 1
im = lambda v: ('-' if s < 0 and v != '0' else '') + v
D = [T('0', '0'), T('0.5', '0'), T('0.5', im('0.4')), T('1' if s > 0 else '0', im('0.9')), T('0.5', im('1.4')),
     T('0' if s > 0 else '1', im('0.9')), T('0.5', im('0.4')), T('0.5', '0'), T('0', '0')]
print(name, 'vertices', [str(v) for v in D], flush=True)
xh = [v.mid() for v in x0]
sr = [up(v - m) for v, m in zip(x0, xh)]            # exact decimal data lie in xh + disk(sr)
Xh = identity(); E = [[arb(0)] * 4 for _ in range(4)]
t0 = time.time()
for k in range(turns):
    xh, sr, Xh, E = R.path_disk(D, xh, sr, Xh, E, verbose=True)
    print('turn %d done: steps %d, %.0f s' % (k + 1, R.nsteps, time.time() - t0), flush=True)
x = [xh[i] + err(sr[i]) for i in range(4)]
X = [[Xh[i][j] + err(E[i][j]) for j in range(4)] for i in range(4)]
print('max Cauchy tail per step (x):', R.maxtail)
print('x_end - x0 enclosures:')
for a, b in zip(x, x0):
    print('  ', a - b)
print('Xi_end enclosure:')
for row in X:
    print('  ', '  '.join(str(v) for v in row))
Sal = S1 if name == 'gamma1' else S2
# certified: every entry of Xi_end - I lies in a ball of radius r; compare with Salnikov entrywise
rmax = arb(0)
for i in range(4):
    for j in range(4):
        rmax = rmax.max(abs(X[i][j] - (1 if i == j else 0)).upper())
rmax = rmax.upper()
print('certified: max_ij |Xi_end - I|_ij <=', rmax)
d = abs(acb(complex(Sal[0, 0])) - X[0][0])
print('certified: |Salnikov entry (1,1) - Xi_end(1,1)| >=', d.lower(), ' (Salnikov value %s)' % Sal[0, 0])
json.dump({'name': name, 'N': N, 'q': q, 'turns': turns, 'steps': R.nsteps,
           'max_abs_Xi_minus_I_upper': str(rmax), 'x_end_minus_x0': [str(a - b) for a, b in zip(x, x0)],
           'Xi_end': [[str(v) for v in row] for row in X]}, open('rig_%s.json' % name, 'w'), indent=1)
