"""Pseudo-spectral reference solver for GENChase's periodic 4th-order PDE tabs. Needs only NumPy.

Written from the published equations, not from the studio's shaders:

  Cahn-Hilliard (Cahn & Hilliard, J. Chem. Phys. 28, 258, 1958), constant mobility
      dc/dt = M lap( c^3 - c - eps^2 lap c )
  Swift-Hohenberg (Swift & Hohenberg, Phys. Rev. A 15, 319, 1977), with the usual quadratic term
      du/dt = r u - (k0^2 + lap)^2 u + g u^2 - b u^3
  Kuramoto-Sivashinsky (Kuramoto & Tsuzuki 1976; Sivashinsky 1977), two dimensions
      du/dt = -nu lap^2 u - lap u - (alpha/2) |grad u|^2

Domain: a periodic Ny x Nx grid with unit spacing, the tabs' lattice units. Time stepping: ETDRK4
(Cox & Matthews, J. Comput. Phys. 176, 430, 2002) with the phi-function coefficients evaluated by the
contour integral of Kassam & Trefethen (SIAM J. Sci. Comput. 26, 1214, 2005); fourth order in time,
exact for the linear part.

Two spatial symbols, chosen per call:

  continuum  lap -> -|k|^2, d/dx -> i k. The PDE itself, spectrally accurate on this grid.
  lattice    lap -> -(4 sin^2(kx/2) + 4 sin^2(ky/2)), d/dx -> i sin k. These are the exact Fourier
             multipliers of the standard 5-point Laplacian and the centred first difference, so this
             mode integrates the spatially discrete (method-of-lines) system a finite-difference code
             with those stencils solves, with an independent time integrator. Differences from a
             finite-difference code are then time-scheme and precision error only.

No dealiasing is applied: the tabs' fields are grid functions, and a 2/3 or 1/2 filter would itself alter
the initial condition taken from the studio. The damped tabs keep little power near the grid scale; see
tools/xref/README.md for what that leaves unverified.
"""
import numpy as np

SYMBOLS = ('continuum', 'lattice')


def operators(shape, symbol):
    """Fourier symbols on the rfft2 layout: (lap, ddx, ddy, |k|)."""
    ny, nx = shape
    kx = 2 * np.pi * np.fft.rfftfreq(nx)
    ky = 2 * np.pi * np.fft.fftfreq(ny)
    KX, KY = np.meshgrid(kx, ky)
    if symbol == 'continuum':
        lap = -(KX ** 2 + KY ** 2)
        ddx, ddy = 1j * KX, 1j * KY
        # An odd derivative of a real field has no Nyquist component.
        if nx % 2 == 0:
            ddx[:, -1] = 0
        if ny % 2 == 0:
            ddy[ny // 2, :] = 0
    elif symbol == 'lattice':
        lap = -(4 * np.sin(KX / 2) ** 2 + 4 * np.sin(KY / 2) ** 2)
        ddx, ddy = 1j * np.sin(KX), 1j * np.sin(KY)
    else:
        raise ValueError('symbol must be one of ' + ', '.join(SYMBOLS))
    return lap, ddx, ddy, np.sqrt(KX ** 2 + KY ** 2)


def etdrk4_coefficients(L, h, m=32):
    """Kassam-Trefethen contour-integral phi functions for a diagonal linear operator L (array)."""
    r = np.exp(1j * np.pi * (np.arange(1, m + 1) - 0.5) / m)
    LR = h * L[..., None] + r
    E, E2 = np.exp(h * L), np.exp(h * L / 2)
    Q = h * np.real(np.mean((np.exp(LR / 2) - 1) / LR, axis=-1))
    f1 = h * np.real(np.mean((-4 - LR + np.exp(LR) * (4 - 3 * LR + LR ** 2)) / LR ** 3, axis=-1))
    f2 = h * np.real(np.mean((2 + LR + np.exp(LR) * (-2 + LR)) / LR ** 3, axis=-1))
    f3 = h * np.real(np.mean((-4 - 3 * LR - LR ** 2 + np.exp(LR) * (4 - LR)) / LR ** 3, axis=-1))
    return E, E2, Q, f1, f2, f3


def model(tab, params, shape, symbol):
    """(L, N) for one tab: L is the stiff linear symbol, N(u_hat) the explicit remainder."""
    lap, ddx, ddy, _ = operators(shape, symbol)
    ny, nx = shape
    irfft = lambda a: np.fft.irfft2(a, s=(ny, nx))
    rfft = np.fft.rfft2
    if tab == 'cahn':
        M, eps = float(params['M']), float(params['eps'])
        # c^3 - c = (c^3 - 3c) + 2c: the 2c part is diffusive and goes into L, so the explicit remainder
        # vanishes to first order at the equilibria c = +-1. The split is exact; only the stiffness moves.
        L = M * (2 * lap - eps ** 2 * lap ** 2)

        def N(uh):
            c = irfft(uh)
            return M * lap * rfft(c ** 3 - 3 * c)
    elif tab == 'swift':
        r, k0, g, b = (float(params[k]) for k in ('r', 'k0', 'g', 'cub'))
        L = r - (k0 ** 2 + lap) ** 2

        def N(uh):
            u = irfft(uh)
            return rfft(g * u ** 2 - b * u ** 3)
    elif tab == 'ks':
        nu, alpha = float(params['nu']), float(params['alpha'])
        L = -nu * lap ** 2 - lap

        def N(uh):
            ux, uy = irfft(ddx * uh), irfft(ddy * uh)
            return rfft(-0.5 * alpha * (ux ** 2 + uy ** 2))
    else:
        raise ValueError('no reference model for tab ' + repr(tab))
    return L, N


def evolve(u0, tab, params, T, h, symbol='continuum'):
    """Evolve the real 2D field u0 to time T with ETDRK4 at a step no larger than h. Returns float64."""
    u0 = np.asarray(u0, dtype=np.float64)
    n = max(1, int(np.ceil(T / h - 1e-9)))
    h = T / n
    L, N = model(tab, params, u0.shape, symbol)
    E, E2, Q, f1, f2, f3 = etdrk4_coefficients(L, h)
    v = np.fft.rfft2(u0)
    for _ in range(n):
        Nv = N(v)
        a = E2 * v + Q * Nv
        Na = N(a)
        b = E2 * v + Q * Na
        Nb = N(b)
        c = E2 * a + Q * (2 * Nb - Nv)
        Nc = N(c)
        v = E * v + Nv * f1 + 2 * (Na + Nb) * f2 + Nc * f3
    out = np.fft.irfft2(v, s=u0.shape)
    if not np.all(np.isfinite(out)):
        raise FloatingPointError('reference diverged; lower the reference step')
    return out


def radial_spectrum(u):
    """Shell-averaged power spectrum of the fluctuation u - <u>, one shell per 2 pi / N; returns (k, S)."""
    ny, nx = u.shape
    p = np.abs(np.fft.fft2(u - u.mean())) ** 2 / (nx * ny)
    kx, ky = 2 * np.pi * np.fft.fftfreq(nx), 2 * np.pi * np.fft.fftfreq(ny)
    K = np.sqrt(kx[None, :] ** 2 + ky[:, None] ** 2)
    dk = 2 * np.pi / max(nx, ny)
    shell = np.rint(K / dk).astype(int)
    count = np.bincount(shell.ravel())
    total = np.bincount(shell.ravel(), weights=p.ravel())
    keep = count > 0
    k = np.arange(len(count))[keep] * dk
    S = total[keep] / count[keep]
    return k[1:], S[1:]
