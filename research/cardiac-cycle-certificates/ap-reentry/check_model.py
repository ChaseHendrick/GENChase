"""Consistency checks of tp06_19d.py: (1) agreement with the independent 18-state translation
model/tp06_18d.py (Erhardt's TP06_18d_endo_bif.m) at points with |V+40| > 8 where its smoothed switch equals the
Heaviside switch to double precision; (2) the charge invariant grad(q).f = 0; (3) GHK extension continuity at V=15."""
import sys, os, math
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "model"))
import tp06_19d as M
import tp06_18d as R18

rng = np.random.default_rng(1)
p = M.params("erhardt", g_Kr=0.0153, g_Ks=0.0275, g_CaL=0.000199)
p18 = dict(g_Kr=0.0153, g_Ks=0.0275, g_Na=14.838, g_K1=5.405, g_CaL=0.000199, Cm=1.0, K_i=138.3)
worst = 0.0
for k in range(400):
    y = M.Y0.copy()
    y[0] = rng.uniform(-90, 50)
    if abs(y[0] + 40) < 8 or abs(y[0] - 15) < 1e-3:
        continue
    y[1:14] = rng.uniform(0.01, 0.99, 13)
    y[14] = rng.uniform(5e-5, 1e-3); y[15] = rng.uniform(1, 4); y[16] = rng.uniform(5e-5, 5e-3)
    y[17] = rng.uniform(8, 12); y[18] = 138.3
    a = M.field(y, p)[:18]
    b = np.array(R18.field(list(y[:18]), p18, M=math))
    rel = np.max(np.abs(a - b) / (np.abs(b) + 1e-300))
    worst = max(worst, rel)
print("max relative difference vs tp06_18d.py (|V+40|>8):", worst)

for conv in ("erhardt", "author"):
    p = M.params(conv)
    worst = 0.0
    for k in range(400):
        y = M.Y0.copy()
        y[0] = rng.uniform(-90, 50); y[1:14] = rng.uniform(0.01, 0.99, 13)
        y[14] = rng.uniform(5e-5, 1e-3); y[15] = rng.uniform(1, 4); y[16] = rng.uniform(5e-5, 5e-3)
        y[17] = rng.uniform(8, 12); y[18] = rng.uniform(130, 140)
        f = M.field(y, p)
        g = M.charge_grad(y, p)
        terms = g * f
        worst = max(worst, abs(terms.sum()) / np.abs(terms).sum())
    print(conv, "charge invariant: max |grad q . f| / sum|terms| =", worst)
    # with K-carried stimulus (author) the invariant also holds during stimulation
    y = M.Y0.copy(); f = M.field(y, p, i_stim=52.0); g = M.charge_grad(y, p)
    print(conv, "  with stimulus 52 pA/pF: relative residual", abs((g * f).sum()) / np.abs(g * f).sum())

p = M.params("author")
for dv in (1e-3, 1e-6, 1e-9, 0.0):
    y = M.Y0.copy(); y[0] = 15 + dv; y[7] = 0.5; y[8] = 0.9; y[9] = 0.9; y[10] = 0.9
    print("i_CaL at V=15+%g:" % dv, M.currents(y, p)["i_CaL"])
