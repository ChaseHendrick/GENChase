"""Test 4: read (only) the parameters G, w of the explorer's certified minimizers and re-validate
them with my own code: Biot-Savart self-similarity residual, collapse sign, and the formula."""
import json, glob, mpmath as mp
from core import *

base = '/tmp/claude-0/-home-user-GENChase/04604b4b-7efe-5ca6-9b53-4838030930e5/scratchpad/research/n-vortex/'
files = sorted(glob.glob(base + 'cert*.json') + glob.glob(base + 'n4_cert130.json') + glob.glob(base + 'n5_cert60.json') + glob.glob(base + 'n6_cert60.json') + glob.glob(base + 'k2cert_*.json'))
for fn in files:
    d = json.load(open(fn))
    if 'G' not in d or 'w' not in d:
        continue
    dps = int(d.get('dps', 40))
    mp.mp.dps = dps
    G = [mp.mpf(g) for g in d['G']]
    z = [mp.mpc(mp.mpf(a), mp.mpf(b)) for a, b in d['w']]
    N = len(G)
    kap, res, u, w = direct_kappa(G, z)
    form, dd = formula(G, z)
    P = abs(mp.im(kap)) / (-2 * mp.re(kap))
    Pf = abs(dd['Gt']) * dd['sigma'] / (2 * abs(dd['vEG']))
    print('%-22s N=%2d dps=%3d ss_res=%s Re k=%s |k-form|/|k|=%s P=%s |P-Pf|/P=%s sigma/max s=%s' % (
        fn.split('/')[-1], N, dps, mp.nstr(res, 3), mp.nstr(mp.re(kap), 6), mp.nstr(abs(kap - form) / abs(kap), 3),
        mp.nstr(P, 12), mp.nstr(abs(P - Pf) / P, 3), mp.nstr(dd['sigma'] / max(dd['s']), 6)))
