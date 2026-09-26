# Signal spectra for the far-tail sensitivity of the MEME broken-power-law tail exponent alpha2.
# All spectra live on N = 8704 indices (the neuron count of the calibration recording).
import numpy as np

N = 8704
IND = np.arange(1, N + 1, dtype=float)


def bpl(a2, a1=0.5, brk=10, lam1=200.0):
    return lam1 * np.where(IND <= brk, IND ** -a1, brk ** -a1 * (IND / brk) ** -a2)


def variants(a2):
    """Spectra equal to the broken power law BPL(0.5, a2, break 10) in ranks 1-500 and different beyond
    (tail500_*, rank2800), and two that change every rank slightly (floor*, cutoff1000)."""
    base = bpl(a2)
    out = {'base': base}
    for a3 in (0.8, 1.0, 2.0, 3.0):
        lam = base.copy(); m = IND > 500
        lam[m] = base[499] * (IND[m] / 500) ** -a3
        out[f'tail500_{a3}'] = lam
    lam = base.copy(); lam[2800:] = 0
    out['rank2800'] = lam
    for frac in (0.05, 0.15):
        out[f'floor{int(frac * 100)}'] = base + frac * base.sum() / N
    out['cutoff1000'] = base * np.exp(-IND / 1000)
    return out


SIM_SPECTRA = ('base', 'tail500_0.8', 'tail500_1.0', 'tail500_2.0', 'tail500_3.0', 'rank2800')


def exact_moments(lam, K=8):
    lam = np.asarray(lam, float)
    return np.array([np.sum(lam ** (p + 1)) for p in range(K)])
