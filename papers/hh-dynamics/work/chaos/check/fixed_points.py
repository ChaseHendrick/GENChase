"""Claims 1-4: fixed points A, B, C at J*, and G&O's printed p1, p2. NUMERICAL."""
import json
import numpy as np
import hhk

D = json.load(open('../data/horseshoe_Jgo.json'))
R = json.load(open('../data/rates.json'))
Js = 7.861806449482496
out = {'EL_mine': hhk.EL, 'EL_claimed': 10.5989209693917, 'Jstar_mine': 7.8617827403 + 0.3 * (10.599 - hhk.EL)}
print('EL', repr(hhk.EL), 'J*', repr(out['Jstar_mine']))
claims = {'A': (D['A'], D['T_A'], D['mu_A']), 'B': (D['B'], D['T_B'], D['mu_B']),
          'C': (R['C_point'], R['orbits'][2]['period_ms'], R['orbits'][2]['multipliers'])}
for k, (x0, T0, mu0) in claims.items():
    x0 = np.array(x0)
    r_claim = np.abs(hhk.P(x0, Js)[0] - x0).max()
    r_claim_radau = np.abs(hhk.P_scipy(x0, Js)[0] - x0).max()
    g, res, info, M = hhk.newton_fp(x0, Js)
    mu = np.linalg.eigvals(M)
    mu = mu[np.argsort(-np.abs(mu))]
    # tolerance sensitivity of my fixed point
    g2, res2, info2, M2 = hhk.newton_fp(x0, Js, rtol=1e-11, atol=1e-13)
    row = dict(claimed=list(x0), mine=list(g), diff=list(g - x0), resid_mine=res,
               P_of_claimed_minus_claimed_GBS=r_claim, P_of_claimed_minus_claimed_Radau=r_claim_radau,
               T_mine=info['t'], T_claimed=T0, mu_mine=[complex(m).real if abs(complex(m).imag) < 1e-12 else str(m) for m in mu],
               mu_claimed=mu0, fp_shift_rtol1em11=float(np.abs(g2 - g).max()), umax=info['umax'])
    out[k] = row
    print(k, json.dumps(row, default=str))
# G&O points
p1 = np.array([0.08508337639787, 0.37698374610906, 0.43727279295129])
p2 = np.array([0.08499590453730, 0.37635277095981, 0.43229451177364])
I, ELgo = 7.8617827403, 10.599
for name, p in [('p1', p1), ('p2', p2)]:
    xi, ii = hhk.P(p, I, ELgo)
    xr, ir = hhk.P_scipy(p, I, ELgo)
    xd, idn = hhk.P(p, I, ELgo, sign=-1)
    fv = np.empty(4); hhk.f(np.r_[4.5, p], I, ELgo, fv)
    g, res, info, M = hhk.newton_fp(p, I, ELgo)
    row = dict(P_inc_minus_p=float(np.abs(xi - p).max()), P_inc_minus_p_Radau=float(np.abs(xr - p).max()),
               P_dec_minus_p=float(np.abs(xd - p).max()), dudt_at_p=fv[0], T_inc=ii['t'], T_dec=idn['t'],
               newton_fp=list(g), fp_minus_printed=float(np.abs(g - p).max()))
    out['GO_' + name] = row
    print(name, row)
    # also: is there a fixed point of the u-decreasing map near p? Newton from the u-decreasing crossing
json.dump(out, open('fixed_points.json', 'w'), indent=1, default=str)
