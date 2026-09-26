import json, numpy as np
p = json.load(open('continuation.json'))
J = np.array([q['J'] for q in p]); tJ = np.array([q['tJ'] for q in p])
g = np.array([q['g'] for q in p])
s = np.r_[0, np.cumsum(np.linalg.norm(np.diff(np.c_[g, J], axis=0), axis=1))]
mu = [[complex(m) for m in q['mu']] for q in p]
res = {}
for k in np.where(np.sign(tJ[1:]) != np.sign(tJ[:-1]))[0]:
    idx = np.arange(max(k - 3, 0), min(k + 5, len(J)))
    c = np.polyfit(s[idx] - s[k], J[idx], 4)
    r = np.roots(np.polyder(c)); r = r[np.isreal(r)].real
    r = r[np.argmin(abs(r - 0))]
    Jf = np.polyval(c, r)
    # multiplier closest to +1 at nearest points
    near = [min(mu[i], key=lambda z: abs(z - 1)) for i in (k, k + 1)]
    res['fold_%d' % k] = dict(J=Jf, J_bracket=[J[k], J[k + 1]], mu_near_1=[str(z) for z in near], T=p[k]['T'])
# PD: a real multiplier through -1
for i in range(len(p) - 1):
    for a in mu[i]:
        if abs(a.imag) < 1e-9 and abs(a + 1) < 0.2:
            pass
reals = []
for i in range(len(p)):
    rr = [z.real for z in mu[i] if abs(z.imag) < 1e-9 and z.real < -0.5]
    reals.append(max(rr) if rr else np.nan)  # the weaker negative one
reals = np.array(reals)
for i in range(len(p) - 1):
    if np.isfinite(reals[i]) and np.isfinite(reals[i + 1]) and (reals[i] + 1) * (reals[i + 1] + 1) < 0:
        idx = np.arange(max(i - 3, 0), min(i + 5, len(p)))
        c = np.polyfit(s[idx] - s[i], reals[idx] + 1, 3)
        r = np.roots(c); r = r[np.isreal(r)].real; r = r[np.argmin(abs(r))]
        cJ = np.polyfit(s[idx] - s[i], J[idx], 3)
        res['PD_%d' % i] = dict(J=np.polyval(cJ, r), J_bracket=[J[i], J[i + 1]], mu=[reals[i], reals[i + 1]], T=p[i]['T'])
print(json.dumps(res, indent=1, default=float))
json.dump(res, open('continuation_events.json', 'w'), indent=1, default=float)
print('J range', J.min(), J.max(), 'last', J[-1], p[-1]['mu'])
