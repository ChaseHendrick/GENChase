"""Numerical cross-check (not rigorous) of the shooting bracket with different settings:
dps 110, a different manifold amplitude (1e-36) and a different Taylor order."""
import sys, json
sys.argv = [sys.argv[0], '110']
import mpmath as mp
import shoot_mp as SM
r = json.load(open('shoot_mp_result.json'))
lo = mp.mpf(r['lo']) - mp.mpf('1e-62'); hi = mp.mpf(r['hi']) + mp.mpf('1e-62')
out = {}
for name, c in (('lo-1e-62', lo), ('hi+1e-62', hi)):
    s, t, G, x, umax = SM.escape_sign(c, delta=mp.mpf('1e-36'))
    out[name] = dict(c=mp.nstr(c, 80), sign=s, xi_decision=float(t), max_U=mp.nstr(umax, 12))
    print(name, out[name], flush=True)
json.dump(out, open('check_mp_result.json', 'w'), indent=1)
