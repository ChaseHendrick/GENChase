# Computation B (d = 1). A stationary code on the circle of directions has Fourier-mode eigenfunctions and
# kernel spectrum c_k = c(|k|); we take the Matern-type c_k = (1 + (k/kappa)^2)^-(nu + 1/2), whose ranked
# spectrum decays asymptotically as n^-(1 + 2 nu) (ranks 2k-1, 2k carry c_k); nu = 1 is the differentiability
# border 1 + 2/d = 3.  With P = 32 equally spaced directions the centred kernel matrix K/P is circulant, with
# eigenvalues mu_j = sum_{k = j mod 32} c_k, j = 1..31 (exact aliasing).  We compare Stringer's ranks 5-30
# window exponent of (i) the operator spectrum (no sampling) and (ii) the 32-direction spectrum, so that the
# shortfall below 1 + 2 nu splits into a finite-bandwidth part (i minus asymptote) and an aliasing part
# (ii minus i).  Finite populations: N neurons with independent tuning curves drawn from the Gaussian process
# give a population spectrum distributed as eig(D^1/2 W D^1/2), W ~ Wishart(I_32, N)/N.
# Also the numerical example for Proposition 1: two codes equal up to |k| = K1 with tails of exponent 2
# (not differentiable) and 5 (differentiable).
# Output: out/circle_d1.json.  In it, 'finite_bw' is the operator window minus the asymptote, which the note calls
# the pre-asymptotic part (finite bandwidth and the twofold degeneracy of Fourier modes).
import sys, json, numpy as np
sys.path.insert(0, __import__('os').path.dirname(__file__))
from common import window_slope, OUT

P = 32
KMAX = 2 ** 22
k = np.arange(1, KMAX + 1, dtype=float)
N_NEUR = 8704
R = 2000


def c_of(nu, kappa):
    return (1 + (k / kappa) ** 2) ** (-(nu + 0.5))


def tail_correction(c_last, a):
    # sum_{k > KMAX} c_KMAX (k/KMAX)^-a  ~  c_KMAX KMAX / (a - 1)   (integral approximation)
    return c_last * KMAX / (a - 1)


def sampled(cpos, a):
    """mu_j = sum_{k = j mod P} c_k over k in Z \\ {0}, j = 1..P-1, with c_-k = c_k; analytic tail beyond KMAX."""
    mu = np.zeros(P)
    # positive k: k mod P; negative k: (-k) mod P
    np.add.at(mu, (k.astype(np.int64) % P), cpos)
    np.add.at(mu, ((-k).astype(np.int64) % P), cpos)
    tail = 2 * tail_correction(cpos[-1], a) / P      # spread evenly over the P residues (to first order)
    mu += tail
    return np.sort(mu[1:])[::-1]


def operator(cpos, nmax=200):
    return np.repeat(cpos[:nmax // 2], 2)


rng = np.random.default_rng(20260926)
rows = []
for nu in (0.5, 1.0, 1.5, 2.0):
    for kappa in (0.5, 1.0, 2.0, 4.0, 8.0, 16.0):
        c = c_of(nu, kappa)
        op = operator(c)
        mu = sampled(c, 2 * nu + 1)
        w_op = window_slope(op, 5, 30); w_s = window_slope(mu, 5, 30)
        # finite populations of N neurons (tuning curves drawn from the Gaussian process)
        sq = np.sqrt(mu)
        ws = np.empty(R)
        for r in range(R):
            Zm = rng.standard_normal((P - 1, N_NEUR))
            W = Zm @ Zm.T / N_NEUR
            ev = np.linalg.eigvalsh(sq[:, None] * W * sq[None, :])[::-1]
            ws[r] = window_slope(ev, 5, 30)
        row = dict(nu=nu, kappa=kappa, alpha_inf=1 + 2 * nu, w_operator=w_op, w_sampled=w_s,
                   w_sampled_5_15=window_slope(mu, 5, 15), finite_bw=w_op - (1 + 2 * nu), aliasing=w_s - w_op,
                   finiteN_mean=ws.mean(), finiteN_sd=ws.std(ddof=1), finiteN_q025=np.percentile(ws, 2.5),
                   finiteN_q975=np.percentile(ws, 97.5))
        rows.append(row)
        print(f'nu={nu} kappa={kappa:5.1f}  asym {1+2*nu:.1f}  window 5-30: operator {w_op:.3f}  32 dirs {w_s:.3f} '
              f'(finite bandwidth {row["finite_bw"]:+.3f}, aliasing {row["aliasing"]:+.3f})  '
              f'N={N_NEUR}: {ws.mean():.3f} [{row["finiteN_q025"]:.3f}, {row["finiteN_q975"]:.3f}]', flush=True)

# Proposition 1, numerical examples: a Matern-type head c_k(nu, kappa) for |k| <= K1, then c_k = c_K1 (k/K1)^-a
# with a = 2 (not differentiable) or a = 5 (differentiable).  (nu, kappa) = (1, 2) and (1, 8): border heads;
# (1.5, 1): a differentiable head whose 32-direction window exceeds 3 (added in revision).
ex = {}
K1 = 1000
for nu_h, kappa in ((1.0, 2.0), (1.0, 8.0), (1.5, 1.0)):
    base = c_of(nu_h, kappa)
    tag = f'nu{nu_h}_kappa{kappa}'
    for a in (2.0, 5.0):
        c = base.copy()
        m = k > K1
        c[m] = base[K1 - 1] * (k[m] / K1) ** (-a)
        mu = sampled(c, a)
        T = 2 * (c[m].sum() + tail_correction(c[-1], a))
        ex[f'{tag}_a{a}'] = dict(mu=mu.tolist(), w=window_slope(mu, 5, 30), tail_mass=T,
                                 w_operator=window_slope(operator(c), 5, 30),
                                 differentiable=bool(a > 3), alpha_inf=a)
    A, B = ex[f'{tag}_a2.0'], ex[f'{tag}_a5.0']
    dmu = np.max(np.abs(np.array(A['mu']) - np.array(B['mu'])))
    rel = dmu / min(np.array(A['mu'])[29], np.array(B['mu'])[29])
    ex[f'{tag}_summary'] = dict(max_abs_dmu=dmu, max_dmu_over_mu30=rel,
                                prop1_bound=max(A['tail_mass'], B['tail_mass']))
    print(f'Prop.1 example head nu={nu_h} kappa={kappa}: K1={K1}; tail exponent 2 (not differentiable): window '
          f'{A["w"]:.4f}, tail mass {A["tail_mass"]:.2e}; exponent 5 (differentiable): window {B["w"]:.4f}, tail mass '
          f'{B["tail_mass"]:.2e}; max |mu_A - mu_B| = {dmu:.2e} = {rel:.2e} x mu_30', flush=True)
json.dump(dict(rows=rows, prop1=ex, P=P, KMAX=KMAX, N=N_NEUR, R=R), open(f'{OUT}/circle_d1.json', 'w'), indent=1)
