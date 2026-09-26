# Computation C. The MEME broken-power-law tail exponent alpha2.  Fit: est.meme_fit (8 eigenmoments, broken
# power law over N = 8704 indices, break profiled over {4,6,8,10,12,15,20,30}, least squares on log moments with
# diagonal weights 1/SD), and, as a check, the same fit with full-covariance whitening of the log moments (in the
# spirit of Pospisil and Pillow's whitening matrix).
# Data: meme_sim_0_19.npz / meme_sim_17_19.npz (paired data sets 0-19 of the base spectrum and its five far-tail
# variants, common random numbers) and meme_sim_base_20_99.npz (80 further data sets of the base spectrum).
# Weights / whitening: estimated from base data sets 20-99, independent of the paired sets 0-19.
# Null distribution of the misfit of the correctly specified model: the 100 base data sets, cross-fitted in five
# folds of 20 (each fold's misfits use weights estimated from the other 80).
#   (1) exact moments of the far-tail variants of BPL(0.5, 1.25) and BPL(0.5, 1.5);
#   (2) the simulated data sets: alpha2, paired differences, misfits and how often they exceed the null 95th pct;
#   (3) the Matern codes: Kong-Valiant eigenmoments of their noise-free responses at the 2,800 stimuli
#       (matern_extra.py kv), which estimate the population moments MEME targets; and (second revision) the same
#       for a finite population of 8,704 neurons at ell = 1/4 (matern_extra.py kvN).
# Output: out/meme.json
import sys, os, glob, json, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import est
from tails import N, variants, SIM_SPECTRA, exact_moments, IND
from common import window_slope, OUT, NUS, ELLS
from scipy import stats
from scipy.optimize import least_squares

# ------------------------------------------------------------------ data
parts = []
for f in sorted(glob.glob(f'{OUT}/meme_sim_[0-9]*_[0-9]*.npz')):
    z = np.load(f); parts.append((int(z['R0']), z['H']))
Hp = np.full((20, len(SIM_SPECTRA), 8), np.nan)
for R0, H in parts:
    for i in range(len(H)):
        if np.isfinite(H[i]).all() and R0 + i < 20:
            Hp[R0 + i] = H[i]
assert np.isfinite(Hp).all(), 'paired data sets 0-19 incomplete'
fb = f'{OUT}/meme_sim_base_20_99.npz'
Hb_extra = np.load(fb)['H'][:, 0] if os.path.exists(fb) else np.zeros((0, 8))
Hb_extra = Hb_extra[np.isfinite(Hb_extra).all(1)]
Hbase = np.concatenate([Hp[:, 0], Hb_extra], 0)          # base data sets 0..(19 + n_extra)
nb = len(Hbase)
print(f'paired data sets: 20; base data sets in total: {nb}')
L = lambda H: np.log(np.clip(H, 1e-300, None))


def diag_w(Hset):
    return 1 / L(Hset).std(0, ddof=1)


def full_w(Hset):
    C = np.cov(L(Hset), rowvar=False)
    w, U = np.linalg.eigh(C)
    return (U / np.sqrt(w)) @ U.T, float(w.max() / w.min())


def meme_fit_full(H, W):
    """est.meme_fit(kind='bpl') with the residual vector whitened by the matrix W instead of diagonal weights."""
    ind = IND; y = L(H); K = len(H)
    def moms(lam):
        return np.log(np.array([np.sum(lam ** (p + 1)) for p in range(K)]))
    best = None
    for b in (4, 6, 8, 10, 12, 15, 20, 30):
        def r(x):
            lam = np.exp(est._bpl_log(x[0], x[1], x[2], b, ind))
            return W @ (moms(lam) - y)
        for a2 in (1.0, 1.5):
            x0 = [np.log(max(H[0], 1e-6) / (np.sum(np.minimum(ind, b) ** -0.5 * np.maximum(ind / b, 1) ** -a2))), 0.5, a2]
            rr = least_squares(r, x0, bounds=([-np.inf, 0.0, 0.05], [np.inf, 5, 6]), method='trf')
            if best is None or rr.cost < best[0].cost:
                best = (rr, b)
    rr, b = best
    return rr.x[2], rr.x[1], b, 2 * rr.cost


def fit(H, how, w):
    if how == 'diag':
        a, a1, br, c = est.meme_fit(H, N, w, 'bpl')
    else:
        a, a1, br, c = meme_fit_full(H, w)
    return a, a1, br, c


extra_idx = np.arange(20, nb)                       # data sets used for the weights of the paired analysis
out = dict(n_base=nb, n_weights=len(extra_idx), exact={}, sim={}, matern=[], maternN=[], null={})
for how in ('diag', 'full'):
    wmain = diag_w(Hbase[extra_idx]) if how == 'diag' else full_w(Hbase[extra_idx])[0]
    if how == 'diag':
        out['sd_logmom'] = L(Hbase[extra_idx]).std(0, ddof=1).tolist(); out['weights'] = wmain.tolist()
    else:
        out['full_condition'] = full_w(Hbase[extra_idx])[1]
    # null: five folds of 20 over all base data sets
    nullm, nulla = np.full(nb, np.nan), np.full(nb, np.nan)
    folds = np.array_split(np.arange(nb), 5)
    for fo in folds:
        rest = np.setdiff1d(np.arange(nb), fo)
        w = diag_w(Hbase[rest]) if how == 'diag' else full_w(Hbase[rest])[0]
        for i in fo:
            a, _, _, c = fit(Hbase[i], how, w)
            nullm[i], nulla[i] = c, a
    q95 = float(np.percentile(nullm, 95))
    out['null'][how] = dict(misfit=nullm.tolist(), alpha2=nulla.tolist(), median=float(np.median(nullm)), q95=q95)
    print(f'[{how}] null misfit over {nb} base data sets: median {np.median(nullm):.4f}, 95th pct {q95:.4f}')
    # (1) exact moments
    ex = {}
    for a2 in (1.25, 1.5):
        V = variants(a2)
        mb = L(exact_moments(V['base']))
        sd = L(Hbase[extra_idx]).std(0, ddof=1)
        for name, lam in V.items():
            m = exact_moments(lam)
            a, a1, br, c = fit(m, how, wmain)
            z = (L(m) - mb) / sd
            ex[f'{a2}|{name}'] = dict(window=window_slope(np.sort(lam)[::-1]), alpha2=a, alpha1=a1, brk=br, cost=c,
                                      z=z.tolist(), z_ge2=z[1:].tolist(), trace_ratio=m[0] / np.exp(mb[0]))
            print(f'[{how}] exact a2={a2} {name:12s} window {ex[f"{a2}|{name}"]["window"]:.3f}  alpha2 {a:.3f} '
                  f'(shift {a-a2:+.3f}, break {br}, misfit {c:.3f})  trace x{m[0]/np.exp(mb[0]):.3f}  '
                  f'max|z| p>=2 {np.max(np.abs(z[1:])):.2f}  z1 {z[0]:+.2f}')
    out['exact'][how] = ex
    # (2) simulated paired data sets
    A2 = np.full((20, len(SIM_SPECTRA)), np.nan); C2 = np.full_like(A2, np.nan)
    for i in range(20):
        for j in range(len(SIM_SPECTRA)):
            a, _, _, c = fit(Hp[i, j], how, wmain)
            A2[i, j], C2[i, j] = a, c
    sim = {}
    t = stats.t.ppf(0.975, 19)
    for j, name in enumerate(SIM_SPECTRA):
        v = A2[:, j]; dlt = v - A2[:, 0]
        rec = dict(alpha2=v.tolist(), mean=v.mean(), sd=v.std(ddof=1), se=v.std(ddof=1) / np.sqrt(20),
                   cost=C2[:, j].tolist(), cost_median=float(np.median(C2[:, j])),
                   frac_flag=float(np.mean(C2[:, j] > q95)), exact_alpha2=ex[f'1.25|{name}']['alpha2'])
        if j:
            rec.update(diff_mean=dlt.mean(), diff_sd=dlt.std(ddof=1),
                       diff_ci=[dlt.mean() - t * dlt.std(ddof=1) / np.sqrt(20), dlt.mean() + t * dlt.std(ddof=1) / np.sqrt(20)],
                       frac_beyond_010=float(np.mean(np.abs(dlt) > 0.10)),
                       corr_with_base=float(np.corrcoef(v, A2[:, 0])[0, 1]))
        sim[name] = rec
        print(f'[{how}] sim {name:12s} alpha2 {rec["mean"]:.3f} +/- {rec["se"]:.3f} (SD {rec["sd"]:.3f})'
              + (f'; paired diff {rec["diff_mean"]:+.3f} [{rec["diff_ci"][0]:+.3f}, {rec["diff_ci"][1]:+.3f}] '
                 f'(paired SD {rec["diff_sd"]:.3f}, corr with base {rec["corr_with_base"]:.2f})' if j else '')
              + f'; misfit median {rec["cost_median"]:.3f}, flagged {rec["frac_flag"]:.2f}')
    out['sim'][how] = sim
    # (3) Matern codes, Kong-Valiant moments of noise-free responses
    # the stimulus sets, from the kv checkpoints (the image files are not needed here); same order as stim_files()
    for label, d in [(os.path.basename(f)[:-len('_kv.json')], int(os.path.basename(f)[0]))
                     for f in sorted(glob.glob(f'{OUT}/extra_parts/*_kv.json'))]:
        fk = f'{OUT}/extra_parts/{label}_kv.json'
        if not os.path.exists(fk):
            continue
        KV = json.load(open(fk))
        for key, H in KV.items():
            nu, c = map(float, key.split('|'))
            H = np.array(H)
            if not (H > 0).all():
                out['matern'].append(dict(how=how, set=label, d=d, nu=nu, ell=c, alpha2=None, cost=None, note='moment <= 0'))
                continue
            a, a1, br, cc = fit(H, how, wmain)
            out['matern'].append(dict(how=how, set=label, d=d, nu=nu, ell=c, alpha2=a, alpha1=a1, brk=br, cost=cc,
                                      within_null=bool(cc <= q95), bound=1 + 2 / d, alpha_inf=1 + 2 * nu / d))
        # (3b) second revision: the same codes with a finite population of 8,704 neurons (ell = 1/4; kvN)
        fk = f'{OUT}/extra_parts/{label}_kvN.json'
        if os.path.exists(fk):
            for key, H in json.load(open(fk)).items():
                nu, c = map(float, key.split('|'))
                H = np.array(H)
                if not (H > 0).all():
                    out['maternN'].append(dict(how=how, set=label, d=d, nu=nu, ell=c, alpha2=None, cost=None)); continue
                a, a1, br, cc = fit(H, how, wmain)
                out['maternN'].append(dict(how=how, set=label, d=d, nu=nu, ell=c, alpha2=a, alpha1=a1, brk=br, cost=cc,
                                           within_null=bool(cc <= q95), bound=1 + 2 / d, alpha_inf=1 + 2 * nu / d,
                                           logmom=np.log(H).tolist()))
    mm = [r for r in out['matern'] if r['how'] == how and r['alpha2'] is not None]
    if mm:
        good = [r for r in mm if r['within_null']]
        print(f'[{how}] Matern: {len(mm)} fits, {len(good)} within the null 95th pct')
# (4) Full whitening with the covariance estimated from only the 20 paired base data sets, leave one out (the
#     setting of the independent referee's check): null = base data set i whitened with the covariance of the
#     other 19; variant data set i whitened with the same covariance.
loo = {'null': [], 'var': {}}
for i in range(20):
    rest = np.setdiff1d(np.arange(20), [i])
    w, _ = full_w(Hp[rest, 0])
    loo['null'].append(fit(Hp[i, 0], 'full', w)[3])
    for j, name in enumerate(SIM_SPECTRA[1:], start=1):
        loo['var'].setdefault(name, []).append(fit(Hp[i, j], 'full', w)[3])
q = float(np.percentile(loo['null'], 95))
out['loo19'] = dict(null=loo['null'], q95=q, frac_flag={k: float(np.mean(np.array(v) > q)) for k, v in loo['var'].items()},
                    var=loo['var'])
print(f'[full, covariance from 19 data sets] null 95th pct {q:.2f}; flagged: ' +
      ', '.join(f'{k} {v:.2f}' for k, v in out['loo19']['frac_flag'].items()))
json.dump(out, open(f'{OUT}/meme.json', 'w'), indent=1)
