# Swap-chain diagnostics on the real data: relaxation from the observed configuration (burn-in), autocorrelation, and
# the Monte Carlo SD of the pooled null mean for the short chains used inside the bootstrap.
import sys, json, time, numpy as np
import cx
ds = cx.load_real(); G3 = np.asarray(cx.stack_measures(ds, cx.W + '/G3.npy'))
cp = cx.Copies(ds, np.ones(ds['npre'], np.int64), np.ones(ds['J'], np.int64))
out = {}
for c in ['N1', 'N2', 'N3']:
    m = cx.Model(ds, 'dt', c); b, eta, info = m.fit(ds, np.ones(len(ds['y'])))
    nb_ = cx.NBIN if m.cfg['bins'] else 1
    ptr, pc, go = cp.pool(True, nb_); cum = np.cumsum(cp.O_pc[pc].astype(float)); Lw = cx.logw_dense(ds, eta)
    # 8 chains from the observed state, every sweep recorded for 300 sweeps
    tr = []
    for k in range(8):
        _, t_, _ = cx.null_swap(1000 + k, 0, 300, 1, cp.syn_g, cp.syn_p, cp.gc_orig, cp.pc_orig, cp.pc_bin, nb_, cp.O_pc, ptr, pc, cum, Lw,
                                cp.elig, cp.gsyn_ptr, cp.gsyn, cp.pc_node, G3[:1], True)
        tr.append(np.nanmean(t_[:, :, 0], 1))
    tr = np.array(tr)            # chains x sweeps: pooled (over eligible groups) rho of the sil measure
    late = tr[:, 150:].mean()
    rel = tr.mean(0) - late
    first_within = int(np.argmax(np.abs(rel) < 2 * tr[:, 150:].std() / np.sqrt(8)))
    # MC SD of the pooled null mean for a short chain: burn 40, 30 draws every 2 sweeps
    short = tr[:, 40:100:2].mean(1)
    out[c] = {'late_mean': float(late), 'sweep0': float(tr[:, 0].mean()), 'excess_of_mean_at_sweep': {str(s): float(rel[s]) for s in [0, 5, 10, 20, 30, 40, 60, 100]},
              'short_chain_mean_sd': float(short.std(ddof=1)), 'short_minus_late': float(short.mean() - late), 'per_sweep_sd': float(tr[:, 150:].std())}
    print(c, json.dumps(out[c]), flush=True)
json.dump(out, open(cx.W + '/chain_diag.json', 'w'), indent=1)
