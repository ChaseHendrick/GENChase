"""Independent check (mpmath, 60 digits) of the GHK window of proof/ring19.hpp and proof/engine.hpp:

1. every interval coefficient c_n printed by `ap_proof ghk-unit` contains B_n / n! (exact rationals from mpmath);
2. for each (K, zeta_max) in the table, the tail bounds T0, T1, T2 are >= the true sup over |zeta| <= zeta_max of
   |R|, |R'|, |R''| with R = zeta/(e^zeta - 1) - p_K(zeta) (sampled on 2001 points of [-zeta_max, zeta_max]; the
   series bound is a theorem, the sampling only checks the implementation), and reports the overestimation ratio;
3. negative control: a perturbed coefficient (c_2 * (1 + 1e-6)) makes the remainder exceed T0 at zeta_max = 0.749.
Writes results/check_ghk.json. Usage: python3 check_ghk.py AP_PROOF_BINARY WORKDIR
"""
import json, os, subprocess, sys
import mpmath as mp

mp.mp.dps = 60
HERE = os.path.dirname(os.path.abspath(__file__))
binary, work = sys.argv[1], sys.argv[2]
os.makedirs(work, exist_ok=True)
fn = os.path.join(work, "ghk_unit.txt")
subprocess.run([binary, "ghk-unit", fn], check=True, timeout=120)
L = open(fn).read().split("\n")
nc = int(L[0].split()[1])
coef = [tuple(float.fromhex(t) for t in L[1 + i].split()) for i in range(nc)]
exact = [mp.bernoulli(n) / mp.factorial(n) for n in range(nc)]  # mpmath B_1 = -1/2
ok_coef = all(mp.mpf(lo) <= e <= mp.mpf(hi) for (lo, hi), e in zip(coef, exact))
worst_width = max(float((mp.mpf(hi) - mp.mpf(lo)) / max(abs(e), mp.mpf(10) ** -300)) for (lo, hi), e in zip(coef, exact) if e != 0)
rows = [r.split() for r in L[L.index("tails") + 1:] if r.strip()]


def g(z):
    return z / mp.expm1(z) if z != 0 else mp.mpf(1)


def pK(z, K, c=None):
    c = c or exact
    return sum(c[n] * z ** n for n in range(K + 1))


tab, ok_tails = [], True
for K, zm, t0, t1, t2 in rows:
    K = int(K); zm = float.fromhex(zm); T = [float.fromhex(t) for t in (t0, t1, t2)]
    if zm >= mp.pi:  # outside the admissible window the bound is not used
        continue
    m0 = m1 = m2 = mp.mpf(0)
    for i in range(2001):
        z = mp.mpf(zm) * (2 * i / 2000 - 1)
        if z == 0:
            z = mp.mpf(10) ** -30
        R = lambda zz: g(zz) - pK(zz, K)
        m0 = max(m0, abs(R(z)))
        m1 = max(m1, abs(mp.diff(R, z, 1)))
        m2 = max(m2, abs(mp.diff(R, z, 2)))
    good = m0 <= T[0] and m1 <= T[1] and m2 <= T[2]
    ok_tails = ok_tails and good
    tab.append(dict(K=K, zeta_max=zm, T0=T[0], sup_R=float(m0), T1=T[1], sup_R1=float(m1), T2=T[2], sup_R2=float(m2),
                    ratio0=float(T[0] / m0) if m0 else None, bound_holds=bool(good)))
# negative control: a wrong coefficient is not covered by the tail bound
bad = list(exact); bad[2] = bad[2] * (1 + mp.mpf("1e-6"))
zm = 0.749
T0_24 = [r for r in tab if r["K"] == 24 and abs(r["zeta_max"] - zm) < 1e-12][0]["T0"]
viol = max(abs(g(mp.mpf(zm)) - pK(mp.mpf(zm), 24, bad)), abs(g(-mp.mpf(zm)) - pK(-mp.mpf(zm), 24, bad)))
out = dict(note="mpmath check of the GHK window coefficients and tail bounds; implementation check, not a proof by itself",
           coefficients_contain_exact=bool(ok_coef), coefficient_max_relative_width=worst_width,
           tail_bounds_hold_on_samples=bool(ok_tails), table=tab,
           negative_control=dict(perturbed="c_2 * (1 + 1e-6)", zeta=zm, remainder=float(viol), T0_K24=T0_24,
                                 detected=bool(viol > T0_24)))
json.dump(out, open(os.path.join(HERE, "results", "check_ghk.json"), "w"), indent=1)
print(json.dumps({k: out[k] for k in ("coefficients_contain_exact", "coefficient_max_relative_width", "tail_bounds_hold_on_samples")}),
      json.dumps(out["negative_control"]))
for r in tab:
    if r["K"] == 24:
        print(r["zeta_max"], "T0", r["T0"], "sup", r["sup_R"], "T1", r["T1"], "sup1", r["sup_R1"])
