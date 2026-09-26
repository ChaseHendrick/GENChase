"""Check ivelem.h (interval log, exp, x^p) against arb: each result must
contain the exact values at the endpoints (all three are monotone in each
argument on the tested ranges, so endpoint values bound the range) and be
reasonably tight.  Also checks the two doubles that bracket ln 2."""
import os, random, subprocess, sys
from flint import arb, ctx
ctx.prec = 300
here = os.path.dirname(os.path.abspath(__file__))
exe = os.path.join(here, 'elem_ops')
subprocess.run(['gcc', '-O2', '-frounding-math', '-fno-fast-math', '-std=gnu11', '-Wno-unknown-pragmas',
                '-o', exe, os.path.join(here, 'elem_ops.c'), '-lm'], check=True)
ln2 = arb(2).log()
lo, hi = float.fromhex('0x1.62e42fefa39efp-1'), float.fromhex('0x1.62e42fefa39f0p-1')
assert arb(lo) < ln2 < arb(hi)
rnd = random.Random(99)
cases = []
for _ in range(20000):
    k = rnd.choice(['log', 'exp', 'pow'])
    if k == 'log':
        a = 10 ** rnd.uniform(-25, 3); b = a * (1 + rnd.choice([0, 1e-12, 1e-6, 1e-2, 1]))
        cases.append((k, a, b, 0.0, 0.0))
    elif k == 'exp':
        a = rnd.uniform(-60, 60); b = a + rnd.choice([0, 1e-12, 1e-6, 1e-2, 1])
        cases.append((k, a, b, 0.0, 0.0))
    else:
        a = 10 ** rnd.uniform(-8, 0.7); b = a * (1 + rnd.choice([0, 1e-9, 1e-3]))
        c = -rnd.uniform(0, 4); d = c + rnd.choice([0, 1e-9, 1e-3, 0.1])
        cases.append((k, a, b, c, d))
inp = '\n'.join(f'{k} {a.hex()} {b.hex()} {c.hex()} {d.hex()}' for k, a, b, c, d in cases)
out = subprocess.run([exe], input=inp, capture_output=True, text=True, check=True).stdout.split('\n')
bad = 0
worst = 0.0
for (k, a, b, c, d), line in zip(cases, out):
    rl, rh = (float.fromhex(t) for t in line.split())
    if k == 'log':
        ex = [arb(a).log(), arb(b).log()]
    elif k == 'exp':
        ex = [arb(a).exp(), arb(b).exp()]
    else:
        ex = [arb(x) ** arb(p) for x in (a, b) for p in (c, d)]
    mn = min(ex, key=lambda e: float(e.mid())); mx = max(ex, key=lambda e: float(e.mid()))
    if not (arb(rl) <= mn and mx <= arb(rh)):
        bad += 1
        if bad < 5: print('FAIL', k, a, b, c, d, rl, rh, mn, mx)
    wid = (rh - rl) - float((mx - mn).mid())
    worst = max(worst, wid / max(abs(rh), 1e-300))
print('cases', len(cases), 'failures', bad, 'worst relative excess width', worst)
sys.exit(1 if bad else 0)
