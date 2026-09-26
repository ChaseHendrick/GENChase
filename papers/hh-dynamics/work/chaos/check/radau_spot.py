"""Second integrator (scipy Radau only, rtol 1e-12, atol 1e-14, analytic Jacobian, event location) on the corners
and face centres of N_A and N_B: chart coordinates of the image against the GBS values. NUMERICAL."""
import json, itertools
import numpy as np
import hhk, hsets

J = hsets.J
rows = []
for src in 'AB':
    for xi, eta, zeta in itertools.chain(itertools.product((-1, 1), (-1, 1), (-1, 1)),
                                         [(-1, 0, 0), (1, 0, 0), (0, 0, 0), (0, 1, 0), (0, -1, 0)]):
        g = hsets.to_x(src, xi, eta, zeta)
        xg, ig = hhk.P(g, J)
        xr, ir = hhk.P_scipy(g, J, method='Radau', rtol=1e-12, atol=1e-14)
        xl = xr  # LSODA dropped: scipy's event root finder fails at t = 0 on the section
        for tgt in 'AB':
            cg, cr, cl = hsets.to_chart(tgt, xg), hsets.to_chart(tgt, xr), hsets.to_chart(tgt, xl)
            rows.append(dict(src=src, pt=[xi, eta, zeta], tgt=tgt, gbs=list(cg), radau=list(cr), lsoda=list(cl),
                             dmax_radau=float(np.abs(cg - cr).max()), dmax_lsoda=float(np.abs(cg - cl).max()),
                             dT=ig['t'] - ir['t'], dx_radau=float(np.abs(xg - xr).max())))
        print(src, (xi, eta, zeta), np.round(hsets.to_chart('A', xg), 6), np.round(hsets.to_chart('A', xr), 6),
              '|dx| %.2e' % np.abs(xg - xr).max(), '|dx lsoda| %.2e' % np.abs(xg - xl).max(), flush=True)
json.dump(rows, open('radau_spot.json', 'w'), indent=0)
print('max |x_gbs - x_radau|', max(r['dx_radau'] for r in rows))
print('max chart diff radau', max(r['dmax_radau'] for r in rows))
