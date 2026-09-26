"""Equations of motion of the double pendulum (Salnikov's Lagrangian, m = l = 1, gravity g)
in the variables x = (a1, a2, a1', a2'), and their Jacobian, generated with sympy.

L = a1'^2 + a1' a2' cos(a1 - a2) + a2'^2/2 + 2 g cos a1 + g cos a2.
The functions below take objects with .sin()/.cos() methods (acb, acb_series) or plain numbers."""
import sympy as sp

a1, a2, v1, v2, g = sp.symbols('a1 a2 v1 v2 g')
c = sp.cos(a1 - a2); s = sp.sin(a1 - a2)
R1 = -s*v2**2 - 2*g*sp.sin(a1)
R2 = s*v1**2 - g*sp.sin(a2)
det = 2 - c**2
F = sp.Matrix([v1, v2, (R1 - c*R2)/det, (2*R2 - c*R1)/det])
X = sp.Matrix([a1, a2, v1, v2])
J = F.jacobian(X)


def check_against_lagrangian():
    """Euler-Lagrange equations of L, solved for the accelerations, equal F (symbolic check)."""
    t = sp.symbols('t')
    A1 = sp.Function('A1')(t); A2 = sp.Function('A2')(t)
    L = A1.diff(t)**2 + A1.diff(t)*A2.diff(t)*sp.cos(A1 - A2) + A2.diff(t)**2/2 + 2*g*sp.cos(A1) + g*sp.cos(A2)
    eqs = [sp.diff(L.diff(q.diff(t)), t) - L.diff(q) for q in (A1, A2)]
    acc = sp.solve(eqs, [A1.diff(t, 2), A2.diff(t, 2)], dict=True)[0]
    sub = {A1.diff(t): v1, A2.diff(t): v2, A1: a1, A2: a2}
    e1 = sp.simplify(acc[A1.diff(t, 2)].subs(sub) - F[2])
    e2 = sp.simplify(acc[A2.diff(t, 2)].subs(sub) - F[3])
    return e1, e2


def energy_expr():
    return v1**2 + v1*v2*c + v2**2/2 - 2*g*sp.cos(a1) - g*sp.cos(a2)


def make_numeric(gval):
    """gval: the gravity constant as an acb (or number). Return f(x) -> list of 4 and jac(x) -> 4x4 list, working on series or scalars.
    Uses common subexpressions; sin/cos via methods."""
    exprs = list(F) + list(J)
    repl, red = sp.cse(exprs)
    lines = ['def _fun(a1, a2, v1, v2):']
    for sym, e in repl:
        lines.append('    %s = %s' % (sym, _py(e)))
    lines.append('    return [%s]' % ', '.join(_py(e) for e in red))
    ns = {'SIN': lambda z: z.sin(), 'COS': lambda z: z.cos(), 'g': gval}
    exec('\n'.join(lines), ns)
    fun = ns['_fun']

    def f_and_jac(x):
        out = fun(*x)
        return out[:4], [out[4 + 4*i:8 + 4*i] for i in range(4)]
    return f_and_jac, '\n'.join(lines)


def _py(e):
    from sympy.printing.pycode import PythonCodePrinter

    class P(PythonCodePrinter):
        def _print_Pow(self, expr, rational=False):
            b, ex = expr.as_base_exp()
            if ex.is_Integer and ex > 0:
                return '(' + '*'.join(['(%s)' % self._print(b)] * int(ex)) + ')'
            if ex.is_Integer and ex < 0:
                return '(1/(' + '*'.join(['(%s)' % self._print(b)] * int(-ex)) + '))'
            raise ValueError(expr)
    s = P().doprint(e)
    return s.replace('math.sin(', 'SIN(').replace('math.cos(', 'COS(')


if __name__ == '__main__':
    print(check_against_lagrangian())
    fj, code = make_numeric(1)
    print(code[:3000])
