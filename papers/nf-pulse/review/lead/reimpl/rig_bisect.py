# rig_bisect.py -- Task 2 extension: bisection on the RIGOROUS escape sign produced by vi_integrate.py.
# Each evaluation is a full validated run (cone start + validated Taylor/defect/comparison integrator);
# a speed is classified only when the enclosure of U at |U| ~ 1 has a definite sign.
# This brackets the switch speed of the escape sign; it does not by itself prove that a pulse exists
# (see REIMPL.md).
# Run:   python3 rig_bisect.py [n_halvings]      (default 16; about 25 s per halving, ~7 minutes)
import sys
from flint import fmpq
from vi_integrate import run, C1

n = int(sys.argv[1]) if len(sys.argv) > 1 else 16
lo, hi = C1 + fmpq(35, 10**27), C1 + fmpq(36, 10**27)
vlo = run("lo", lo, verbose=False)[0]; vhi = run("hi", hi, verbose=False)[0]
print("start bracket:", vlo, "at", lo, ";", vhi, "at", hi, flush=True)
assert vlo.startswith("-") and vhi.startswith("+")
for i in range(n):
    m = (lo + hi) / 2
    v, lines = run("m", m, verbose=False)
    if v is None or v == "UNDETERMINED":
        print("undetermined at", m, "; stopping", flush=True); break
    if v.startswith("-"): lo = m
    else: hi = m
    print(f"{i+1:2d}: c = {m.p}/{m.q} -> {v}", flush=True)
from mpmath import mp, mpf
mp.dps = 50
print("RIGOROUS escape-sign switch lies in [", mp.nstr(mpf(int(lo.p)) / int(lo.q), 40), ",", mp.nstr(mpf(int(hi.p)) / int(hi.q), 40), "]")
