# Own formulation of the N-vortex self-similar collapse problem (written independently).
# Variables v = [g_2..g_N, x_1, y_1, ..., x_N, y_N, b], Gamma_1 = 1, kappa = -1 + i b.
# Constraints (2(N-1) + 2 + 1 = 2N+1 real):
#   E_j = sum_k G_k/(z_j - z_k) + (2 pi i - 2 pi b) conj(z_j) = 0, j = 1..N-1  (Re, Im)
#   (E_N follows from sum_j G_j E_j = 0 when sum G z = 0 and G_N != 0)
#   sum_k G_k z_k = 0 (Re, Im);  y_1 = 0 (rotation gauge).
# conj(zdot_j) = (1/(2 pi i)) sum_k G_k/(z_j - z_k) and zdot_j = kappa z_j  <=>  E_j = 0.
import sympy as sp

def build(N):
    g = [sp.Integer(1)] + list(sp.symbols('g2:%d' % (N + 1), real=True))
    xs = sp.symbols('x1:%d' % (N + 1), real=True)
    ys = sp.symbols('y1:%d' % (N + 1), real=True)
    b = sp.Symbol('b', real=True)
    v = list(g[1:]) + [c for p in zip(xs, ys) for c in p] + [b]
    cons = []
    for j in range(N - 1):
        re_s = 0
        im_s = 0
        for k in range(N):
            if k == j:
                continue
            dx = xs[j] - xs[k]
            dy = ys[j] - ys[k]
            r2 = dx ** 2 + dy ** 2
            # G/(dx + i dy) = G (dx - i dy)/r2
            re_s += g[k] * dx / r2
            im_s += -g[k] * dy / r2
        # (2 pi i - 2 pi b)(x - i y) = 2 pi y - 2 pi b x + i(2 pi x + 2 pi b y)
        re_s += 2 * sp.pi * ys[j] - 2 * sp.pi * b * xs[j]
        im_s += 2 * sp.pi * xs[j] + 2 * sp.pi * b * ys[j]
        cons += [re_s, im_s]
    cons.append(sum(g[k] * xs[k] for k in range(N)))
    cons.append(sum(g[k] * ys[k] for k in range(N)))
    cons.append(ys[0])
    return v, cons

def lambdas(N, module='mpmath', hessian=False):
    v, cons = build(N)
    C = sp.Matrix(cons)
    J = C.jacobian(v)
    fC = sp.lambdify(v, C, module)
    fJ = sp.lambdify(v, J, module)
    out = {'v': v, 'C': fC, 'J': fJ}
    if hessian:
        lam = sp.symbols('l1:%d' % (len(cons) + 1))
        Lg = sum(l * c for l, c in zip(lam, cons))
        H = sp.hessian(Lg, v)
        out['H'] = sp.lambdify(list(v) + list(lam), H, module)
    return out
