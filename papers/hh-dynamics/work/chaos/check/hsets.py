"""Chart of the h-sets, written from the description in the task (not imported from ../code)."""
import json
import numpy as np
from numpy.polynomial import polynomial as Pl

D = json.load(open('/home/user/GENChase/papers/hh-dynamics/work/chaos/data/horseshoe_Jgo.json'))
J = D['J']
A = np.array(D['A']); E = np.array(D['E']); Einv = np.linalg.inv(E)
HS = {}
for h in D['hsets']:
    lo, hi = h['c2_range']
    HS[h['name'][-1]] = dict(lo=lo, hi=hi, mid=0.5 * (lo + hi), rad=0.5 * (hi - lo), r3=h['r3'],
                           z=np.array(h['z_coeffs_in_s']), w=np.array(h['w_coeffs_in_s']))


def to_x(name, xi, eta, zeta):
    H = HS[name]
    xi, eta, zeta = np.broadcast_arrays(np.asarray(xi, float), np.asarray(eta, float), np.asarray(zeta, float))
    c2 = H['mid'] + H['rad'] * eta
    c1 = Pl.polyval(eta, H['z']) + Pl.polyval(eta, H['w']) * xi
    c3 = H['r3'] * zeta
    c = np.stack([c1, c2, c3], -1)
    return A + c @ E.T


def to_chart(name, x):
    H = HS[name]
    c = (np.asarray(x) - A) @ Einv.T
    eta = (c[..., 1] - H['mid']) / H['rad']
    xi = (c[..., 0] - Pl.polyval(eta, H['z'])) / Pl.polyval(eta, H['w'])
    zeta = c[..., 2] / H['r3']
    return np.stack([xi, eta, zeta], -1)
