# Computation A. Noise-free population codes with Matern-nu tuning (infinitely many neurons), placed on the
# real stimulus coordinates of every 8D and 4D stimulus set.  For each set, nu and length scale ell, the
# eigenvalues of the centred kernel matrix H K H / P (P = 2800) are the noise-free population spectrum; we fit
# Stringer's window (ranks 11-500, weights 1/n).  Deterministic: no random numbers enter.
# Resumable: each stimulus set is checkpointed in out/matern_parts/<set>.{npz,json}; on a rerun only the
# (nu, ell) cells missing from a checkpoint are computed.
# Output: out/matern_spectra.npz (all spectra), out/matern_window.json, out/geometry.json.
import sys, os, json, time, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from common import stim_files, coords, geometry, matern, centred_spectrum, window_slope, NUS, ELLS, OUT


def jsonable(g):
    return {k: (v.tolist() if isinstance(v, np.ndarray) else v if isinstance(v, int) else float(v)) for k, v in g.items()}


t0 = time.time()
spectra, rows, geo = {}, [], {}
PART = f'{OUT}/matern_parts'; os.makedirs(PART, exist_ok=True)
for label, fn, d in stim_files():
    sp, rw = {}, []
    if os.path.exists(f'{PART}/{label}.json'):
        J = json.load(open(f'{PART}/{label}.json')); rw = J['rows']
        z = np.load(f'{PART}/{label}.npz'); sp = {k: z[k] for k in z.files}
    todo = [(nu, c) for nu in NUS for c in ELLS if f'{label}|{nu}|{c}' not in sp]
    Z, pcvar = coords(fn, d)
    g, D, med = geometry(Z, pcvar, d)
    geo[label] = jsonable(g); geo[label]['d'] = d
    print(f'{label}: d={d} PR {g["pr"]:.2f} rel {np.round(g["rel"], 3)} NN/med {g["nn_med"]:.3f} '
          f'min SD/NN {g["sd_over_nn"][-1]:.3f} frac {g["frac_top_d"]:.5f} next {g["next_rel"]:.1e}; '
          f'{len(sp)} cells from checkpoint, {len(todo)} to compute', flush=True)
    for nu, c in todo:
        ev = centred_spectrum(matern(D, nu, c * med))
        key = f'{label}|{nu}|{c}'
        sp[key] = ev
        r500 = ev[499] / ev[0]
        row = dict(set=label, d=d, nu=nu, ell=c, alpha_inf=1 + 2 * nu / d, bound=1 + 2 / d,
                   w11_500=window_slope(ev, 11, 500), w11_100=window_slope(ev, 11, 100),
                   w101_500=window_slope(ev, 101, 500), r500=r500, neg=int((ev[:500] <= 0).sum()),
                   reliable=bool(r500 > 1e-10 and (ev[:500] > 0).all()))
        rw.append(row)
        print(f'  nu={nu} ell={c:5.3f}*med  alpha_inf {row["alpha_inf"]:.3f}  win11-500 {row["w11_500"]:.3f}  '
              f'11-100 {row["w11_100"]:.3f}  101-500 {row["w101_500"]:.3f}  ev500/ev1 {r500:.1e} '
              f'{"" if row["reliable"] else "UNRELIABLE"} ({time.time()-t0:.0f}s)', flush=True)
    if todo:
        np.savez_compressed(f'{PART}/{label}.npz', **sp)
        json.dump(dict(rows=rw, geo=geo[label]), open(f'{PART}/{label}.json', 'w'), indent=1)
    spectra.update(sp); rows += rw
np.savez_compressed(f'{OUT}/matern_spectra.npz', **spectra)
json.dump(rows, open(f'{OUT}/matern_window.json', 'w'), indent=1)
json.dump(geo, open(f'{OUT}/geometry.json', 'w'), indent=1)
print(f'done {time.time()-t0:.0f}s')
