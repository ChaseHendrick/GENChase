"""Claim 7: periodic orbits of P with prescribed itineraries in {A, B}^n, by multiple-shooting Newton with my
own DP; initial guesses from the claimed (xi, eta) of each point with zeta = 0 (not from the claimed x0).
Then: residual, h-set membership, and distance to the claimed first point x0. NUMERICAL."""
import json, time
import numpy as np
import hhk, hsets

J = hsets.J
D = hsets.D
out = []
t0 = time.time()
for p in D['periodic']:
    code = p['code']; n = len(code)
    X = np.array([hsets.to_x(code[k], p['xi_eta'][k][0], p['xi_eta'][k][1], 0.0) for k in range(n)])
    for it in range(30):
        R = np.zeros(3 * n); K = np.zeros((3 * n, 3 * n))
        for k in range(n):
            y, info, M = hhk.P(X[k], J, var=True)
            R[3 * k:3 * k + 3] = y - X[(k + 1) % n]
            K[3 * k:3 * k + 3, 3 * k:3 * k + 3] = M
            K[3 * k:3 * k + 3, 3 * ((k + 1) % n):3 * ((k + 1) % n) + 3] -= np.eye(3)
        d = np.linalg.solve(K, -R).reshape(n, 3)
        X += d
        if np.abs(d).max() < 1e-14:
            break
    res = 0.0; T = 0.0; Mt = np.eye(3); umax = 0; fumin = 1e9; ch = []
    for k in range(n):
        y, info, M = hhk.P(X[k], J, var=True)
        res = max(res, np.abs(y - X[(k + 1) % n]).max()); T += info['t']; Mt = M @ Mt
        umax = max(umax, info['umax']); fumin = min(fumin, info['fu'])
        ch.append(hsets.to_chart(code[k], X[k]))
    ch = np.array(ch)
    inside = bool((np.abs(ch) <= 1).all())
    mu = np.linalg.eigvals(Mt); mu = mu[np.argsort(-np.abs(mu))]
    row = dict(code=code, residual=res, newton_iters=it + 1, T=T, T_claimed=p['period_ms'], mu=[complex(m).real for m in mu[:2]],
               mu_claimed=p['mu'], in_hsets=inside, chart_absmax=[float(v) for v in np.abs(ch).max(0)],
               dx0_vs_claimed=float(np.abs(X[0] - np.array(p['x0'])).max()), umax=umax, fu_min=fumin,
               claimed_x0_residual_of_Pn=None)
    # the claimed x0 iterated n times with my integrator (single shooting; amplified by the multiplier)
    x = np.array(p['x0'])
    for k in range(n):
        x, _ = hhk.P(x, J)
    row['claimed_x0_residual_of_Pn'] = float(np.abs(x - np.array(p['x0'])).max())
    out.append(row)
    print(code, 'res %.1e' % res, 'in', inside, 'dx0 %.1e' % row['dx0_vs_claimed'], 'T %.9f vs %.9f' % (T, p['period_ms']),
          'mu1 %.6e vs %.6e' % (row['mu'][0], p['mu'][0]), '|P^n(x0c)-x0c| %.1e' % row['claimed_x0_residual_of_Pn'],
          'chart max', np.round(row['chart_absmax'], 3), flush=True)
json.dump(out, open('periodic.json', 'w'), indent=0)
print('cycles', len(out), 'all in h-sets', all(r['in_hsets'] for r in out), 'max residual', max(r['residual'] for r in out),
      'max dx0', max(r['dx0_vs_claimed'] for r in out), 'max chart', np.max([r['chart_absmax'] for r in out], 0), time.time() - t0)
