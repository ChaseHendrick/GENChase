"""Task 3, stage 2 only (NUMERICAL): classify c(T=140) -+ 1e-62 from shoot_mp_dps<DPS>.json.
Classification: after the excursion (U > 0.5) and the return to within 0.05 of rest (sup norm), the sign of
l_u . (x - rest) when its modulus first exceeds 5e-3."""
import json, sys
from multiprocessing import Pool
DPS = int(sys.argv[1])
sys.argv = [sys.argv[0], str(DPS)]
import shoot_mp as M
from mpmath import mpf, nstr

def job(cs):
    return M.orbit(mpf(cs), classify=True)

if __name__ == "__main__":
    log = json.load(open(f"shoot_mp_dps{DPS}.json"))
    cstar = mpf(log["secant_stages"][-1][1])
    d = mpf(10) ** -62
    cs = [nstr(cstar - d, DPS), nstr(cstar + d, DPS)]
    with Pool(2) as p:
        r = p.map(job, cs)
    log["bracket"] = {"c_lo": cs[0], "class_lo": r[0], "c_hi": cs[1], "class_hi": r[1]}
    print(json.dumps(log["bracket"], indent=1))
    json.dump(log, open(f"shoot_mp_dps{DPS}.json", "w"), indent=1)
