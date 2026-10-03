"""Independent model-enclosure arithmetic and full-strip reconstruction.

Only the pinned literal TP06 field and decimal/scaling loader are shared with
arbmodel. Fourier evaluation, mixed directional differentiation, partition
coverage and DFT/alias assembly below are separate implementations. This does
not independently prove an orbit exists, or formal equivalence to a source
paper. Those are explicit premises/audits rather than hidden success flags.
"""
import hashlib
import json
import re
import time
import types
import platform
import sys
from fractions import Fraction as Q
from pathlib import Path

from flint import acb, arb, fmpq

# Load the explicitly shared literal/decimal helper from captured source bytes
# in a private module, so another producer's previously cached field cannot be
# mistaken for the field bound by this checker. This is still a shared trust
# dependency, not an independent model translation.
_HELPER_PATH = Path(__file__).with_name("arbmodel.py")
_HELPER_BYTES = _HELPER_PATH.read_bytes()
model = types.ModuleType("cardiac_model_replay_literal_loader")
model.__file__ = str(_HELPER_PATH)
exec(compile(_HELPER_BYTES, str(_HELPER_PATH), "exec"), model.__dict__)


class Refused(ValueError):
    pass


def require(condition, label):
    if not condition:
        raise Refused(label)


def rational(value):
    require(isinstance(value, (str, int, Q)) and not isinstance(value, bool), "exact rational required")
    if isinstance(value, str):
        match = re.fullmatch(r"(-?)0x([0-9a-fA-F]+)p([+-]?\d+)", value)
        if match:
            sign, mantissa, exponent = match.groups()
            return (-1 if sign else 1) * Q(int(mantissa, 16)) * Q(2) ** int(exponent)
    return Q(value)


def ball(value):
    if isinstance(value, (arb, acb)):
        return acb(value)
    q = rational(value)
    return acb(arb(fmpq(q.numerator, q.denominator)))


def interval(lo, hi):
    a, b = rational(lo), rational(hi)
    require(a <= b, "interval order")
    return ball(a).real.union(ball(b).real)


def rectangular(value):
    require(type(value) is list and len(value) == 2 and all(type(r) is list and len(r) == 2 for r in value),
            "complex rectangle")
    return acb(interval(*value[0]), interval(*value[1]))


class Mixed:
    """Value, state gradient, one direction, and mixed state/direction derivative."""
    __slots__ = ("v", "d", "t", "dt")

    def __init__(self, value, gradient=None, direction=0, mixed=None):
        self.v, self.t = ball(value), ball(direction)
        self.d, self.dt = dict(gradient or {}), dict(mixed or {})

    @staticmethod
    def lift(value):
        return value if isinstance(value, Mixed) else Mixed(value)

    def __add__(self, other):
        b = self.lift(other)
        keys = self.d.keys() | b.d.keys()
        mk = self.dt.keys() | b.dt.keys()
        return Mixed(self.v + b.v, {k: self.d.get(k, acb(0)) + b.d.get(k, acb(0)) for k in keys},
                     self.t + b.t, {k: self.dt.get(k, acb(0)) + b.dt.get(k, acb(0)) for k in mk})

    __radd__ = __add__

    def __neg__(self):
        return Mixed(-self.v, {k: -x for k, x in self.d.items()}, -self.t,
                     {k: -x for k, x in self.dt.items()})

    def __sub__(self, other):
        return self + -self.lift(other)

    def __rsub__(self, other):
        return self.lift(other) + -self

    def __mul__(self, other):
        b = self.lift(other)
        keys = self.d.keys() | b.d.keys()
        mk = keys | self.dt.keys() | b.dt.keys()
        return Mixed(self.v * b.v,
                     {k: self.d.get(k, acb(0)) * b.v + self.v * b.d.get(k, acb(0)) for k in keys},
                     self.t * b.v + self.v * b.t,
                     {k: self.dt.get(k, acb(0)) * b.v + self.d.get(k, acb(0)) * b.t
                         + self.t * b.d.get(k, acb(0)) + self.v * b.dt.get(k, acb(0)) for k in mk})

    __rmul__ = __mul__

    def compose(self, value, first, second):
        require(all(x.is_finite() for x in (value, first, second)), "nonfinite elementary function")
        keys = self.d.keys() | self.dt.keys()
        return Mixed(value, {k: first * x for k, x in self.d.items()}, first * self.t,
                     {k: first * self.dt.get(k, acb(0)) + second * self.d.get(k, acb(0)) * self.t for k in keys})

    def inverse(self):
        u = 1 / self.v
        return self.compose(u, -u * u, 2 * u * u * u)

    def __truediv__(self, other):
        return self * self.lift(other).inverse()

    def __rtruediv__(self, other):
        return self.lift(other) * self.inverse()

    def __pow__(self, n):
        require(type(n) is int, "integer exponent required")
        if n < 0:
            return self.inverse() ** (-n)
        result, base = Mixed(1), self
        while n:
            if n & 1:
                result = result * base
            base = base * base
            n //= 2
        return result

    def exp(self):
        y = self.v.exp()
        return self.compose(y, y, y)

    def log(self):
        require(self.v.real > 0, "log argument not certainly in right half-plane")
        u = 1 / self.v
        return self.compose(self.v.log(), u, -u * u)

    def sqrt(self):
        require(self.v.real > 0, "sqrt argument not certainly in right half-plane")
        y = self.v.sqrt()
        return self.compose(y, 1 / (2 * y), -1 / (4 * self.v * y))


class Math:
    exp = staticmethod(lambda x: Mixed.lift(x).exp())
    log = staticmethod(lambda x: Mixed.lift(x).log())
    sqrt = staticmethod(lambda x: Mixed.lift(x).sqrt())


class Hessian:
    """Sparse full second derivative for state and conductance variables."""
    __slots__ = ("v", "d", "h")

    def __init__(self, value, gradient=None, second=None):
        self.v = ball(value)
        self.d, self.h = dict(gradient or {}), dict(second or {})

    @staticmethod
    def lift(value):
        return value if isinstance(value, Hessian) else Hessian(value)

    def __add__(self, other):
        b = self.lift(other)
        return Hessian(self.v+b.v,
                       {k: self.d.get(k,acb(0))+b.d.get(k,acb(0)) for k in self.d.keys()|b.d.keys()},
                       {k: self.h.get(k,acb(0))+b.h.get(k,acb(0)) for k in self.h.keys()|b.h.keys()})

    __radd__ = __add__

    def __neg__(self):
        return Hessian(-self.v,{k:-v for k,v in self.d.items()},{k:-v for k,v in self.h.items()})

    def __sub__(self, other):
        return self+-self.lift(other)

    def __rsub__(self, other):
        return self.lift(other)+-self

    def __mul__(self, other):
        b = self.lift(other)
        keys = self.d.keys()|b.d.keys()
        pairs = self.h.keys()|b.h.keys()|{(i,j) for i in self.d for j in b.d}|{(j,i) for i in self.d for j in b.d}
        return Hessian(self.v*b.v,
                       {i:self.d.get(i,acb(0))*b.v+self.v*b.d.get(i,acb(0)) for i in keys},
                       {(i,j):self.h.get((i,j),acb(0))*b.v+self.d.get(i,acb(0))*b.d.get(j,acb(0))+
                                self.d.get(j,acb(0))*b.d.get(i,acb(0))+self.v*b.h.get((i,j),acb(0)) for i,j in pairs})

    __rmul__ = __mul__

    def compose(self, value, first, second):
        require(all(x.is_finite() for x in (value,first,second)), "finite Hessian elementary function")
        pairs = self.h.keys()|{(i,j) for i in self.d for j in self.d}
        return Hessian(value,{i:first*v for i,v in self.d.items()},
                       {(i,j):first*self.h.get((i,j),acb(0))+second*self.d.get(i,acb(0))*self.d.get(j,acb(0)) for i,j in pairs})

    def inverse(self):
        y=1/self.v
        return self.compose(y,-y*y,2*y*y*y)

    def __truediv__(self, other):
        return self*self.lift(other).inverse()

    def __rtruediv__(self, other):
        return self.lift(other)*self.inverse()

    def __pow__(self, n):
        require(type(n) is int,"integer Hessian exponent")
        if n<0: return self.inverse()**(-n)
        result,base=Hessian(1),self
        while n:
            if n&1: result=result*base
            base=base*base
            n//=2
        return result

    def exp(self):
        y=self.v.exp()
        return self.compose(y,y,y)

    def log(self):
        require(self.v.real>0,"Hessian log domain")
        y=1/self.v
        return self.compose(self.v.log(),y,-y*y)

    def sqrt(self):
        require(self.v.real>0,"Hessian sqrt domain")
        y=self.v.sqrt()
        return self.compose(y,1/(2*y),-1/(4*self.v*y))


class HessianMath:
    exp=staticmethod(lambda x:Hessian.lift(x).exp())
    log=staticmethod(lambda x:Hessian.lift(x).log())
    sqrt=staticmethod(lambda x:Hessian.lift(x).sqrt())


def jacobian_tube_majorant(z, g, radii, conductance_radius, precision=256):
    """Sum exact disk radii times independent Hessian component majorants.

    z/g already enclose the whole straight-segment tube. The direction radii
    are kept as disks in the triangle estimate instead of enlarged square
    directions, so no unnecessary sqrt(2) is inserted into the saved bound.
    """
    with model.precision(precision):
        require(len(z)==len(radii)==18,"tube Hessian dimensions")
        states=[Hessian(ball(z[k])*model.SIG[k],{k:model.SIG[k]}) for k in range(18)]
        parameters=model.params(precision)
        parameters["g_Ks"]=Hessian(g,{18:acb(1)})
        values=model.model()["field"](states,parameters,HessianMath,acb(0))
        values=[Hessian.lift(v)*model.ISIG[k] for k,v in enumerate(values)]
        require(all(x.is_finite() for v in values for x in (v.v,*v.d.values(),*v.h.values())),"finite Hessian tube")
        weights=[ball(x).real for x in radii]+[ball(conductance_radius).real]
        require(all(x>=0 for x in weights),"nonnegative tube weights")
        return [acb(sum((values[k].h.get((j,l),acb(0)).abs_upper()*weights[l] for l in range(19)),arb(0)).upper())
                for k in range(18) for j in range(18)]


def jacobian_and_direction(z, direction, g, dg=0, precision=256):
    """Return independently differentiated scaled J and dJ along (direction,dg)."""
    require(len(z) == len(direction) == 18, "18 model states required")
    with model.precision(precision):
        states = [Mixed(ball(z[k]) * model.SIG[k], {k: model.SIG[k]},
                        ball(direction[k]) * model.SIG[k]) for k in range(18)]
        parameters = model.params(precision)
        parameters["g_Ks"] = Mixed(g, direction=dg)
        values = model.model()["field"](states, parameters, Math, acb(0))
        values = [Mixed.lift(v) * model.ISIG[k] for k, v in enumerate(values)]
        require(all(x.is_finite() for v in values for x in (v.v, v.t, *v.d.values(), *v.dt.values())),
                "nonfinite model enclosure")
        return ([values[k].d.get(j, acb(0)) for k in range(18) for j in range(18)],
                [values[k].dt.get(j, acb(0)) for k in range(18) for j in range(18)])


def evaluate(coefficients, theta):
    """Direct signed exponential sum, independent of the producer's recurrence."""
    require(type(coefficients) is list and coefficients and all(len(r) == len(coefficients[0]) for r in coefficients),
            "rectangular Fourier array")
    width = len(coefficients[0])
    require(width % 2 == 1, "odd Fourier width")
    K = width // 2
    factors = [(acb(0, n) * theta).exp() for n in range(-K, K + 1)]
    return [sum((x * e for x, e in zip(row, factors)), acb(0)) for row in coefficients]


def partition(nx, ny):
    require(type(nx) is type(ny) is int and nx > 0 and ny > 0, "positive integer grid")
    return [(Q(i, nx), Q(i + 1, nx), Q(2 * j, ny) - 1, Q(2 * (j + 1), ny) - 1)
            for i in range(nx) for j in range(ny)]


def check_partition(rectangles):
    """Exact sweep proves full strip coverage with no positive-area overlap."""
    require(type(rectangles) is list and rectangles, "nonempty strip partition")
    rows = [tuple(map(rational, row)) for row in rectangles]
    require(all(len(row) == 4 and 0 <= row[0] < row[1] <= 1 and -1 <= row[2] < row[3] <= 1 for row in rows),
            "strip rectangle domain")
    xs = sorted({Q(0), Q(1), *(x for row in rows for x in row[:2])})
    for left, right in zip(xs, xs[1:]):
        intervals = sorted((yl, yr) for xl, xr, yl, yr in rows if xl <= left and right <= xr)
        require(intervals, "strip coverage gap")
        endpoint = Q(-1)
        for lo, hi in intervals:
            require(lo == endpoint, "strip gap or overlap")
            endpoint = hi
        require(endpoint == 1, "strip coverage height")
    return rows


def strip_bounds(function, rho, rectangles, precision=256):
    require(rational(rho) > 0, "positive analytic strip")
    rows = check_partition(rectangles)
    with model.precision(precision):
        pi2, rr = 2 * arb.pi(), ball(rho).real
        bounds = None
        for xl, xr, yl, yr in rows:
            theta = acb(pi2 * interval(xl, xr), rr * interval(yl, yr))
            values = list(function(theta))
            require(values and all(isinstance(v, acb) and v.is_finite() for v in values), "invalid strip evaluation")
            current = [v.abs_upper() for v in values]
            if bounds is None:
                bounds = current
            else:
                require(len(current) == len(bounds), "strip component dimension")
                bounds = [b if b >= c else c if c >= b else b.union(c).upper() for b, c in zip(bounds, current)]
        return bounds


def coefficients(function, rho, M, Kp, strip, precision=256):
    """Signed direct DFT plus both infinite alias sums, all in fresh Arb."""
    require(type(M) is type(Kp) is int and 0 <= Kp < M, "DFT dimensions")
    require(rational(rho) > 0, "positive analytic strip")
    require(type(strip) is list and strip and
            all(isinstance(x, arb) and x.is_finite() and x >= 0 for x in strip),
            "finite nonnegative strip majorants")
    with model.precision(precision):
        nodes = [list(function(acb(2 * arb.pi() * ball(Q(j, M)).real))) for j in range(M)]
        require(all(len(row) == len(strip) and all(z.is_finite() for z in row) for row in nodes), "DFT node dimension/domain")
        rr = ball(rho).real
        denominator = 1 - (-rr * M).exp()
        require(denominator > 0, "positive alias denominator")
        result = {}
        for n in range(-Kp, Kp + 1):
            factors = [(-acb(0, n) * 2 * arb.pi() * ball(Q(j, M)).real).exp() for j in range(M)]
            alias = ((-rr * (M - abs(n))).exp() + (-rr * (M + abs(n))).exp()) / denominator
            result[n] = []
            for k, sup in enumerate(strip):
                value = sum((nodes[j][k] * factors[j] for j in range(M)), acb(0)) / M
                error = (sup * alias).upper()
                result[n].append(value + acb(arb(0, error), arb(0, error)))
            require(all(z.is_finite() for z in result[n]), "finite Fourier enclosures")
        return result


def source_pins():
    root = Path(__file__).resolve().parent.parent
    names = ["model/tp06_18d.py", "model/scales.txt", "fourier/arbmodel.py", "fourier/tp06_18d_arb.py",
             "fourier/model_enclosure_replay.py"]
    return {name: hashlib.sha256((root / name).read_bytes()).hexdigest() for name in names}


def centre_data(record):
    """Decode the exact signed Fourier centre, without importing its producer."""
    K = record["K"]
    require(type(K) is int and K >= 1, "centre order")
    require(all(len(record[key]) == 18 for key in ("c", "t_c", "w", "t_w")), "centre state dimensions")
    def rows(key):
        out = []
        for row in record[key]:
            require(len(row) == K and all(type(z) is list and len(z) == 2 for z in row), "positive centre harmonics")
            positive = [acb(ball(z[0]).real, ball(z[1]).real) for z in row]
            out.append([x.conjugate() for x in reversed(positive)] + [acb(0)] + positive)
        return out
    W, TW = rows("w"), rows("t_w")
    require(W[0][K + 1] == acb(arb(1) / 2) and TW[0][K + 1].is_zero(), "fixed voltage normalization")
    return dict(K=K, c=[ball(x) for x in record["c"]], tc=[ball(x) for x in record["t_c"]],
                w=W, tw=TW, g=ball(record["g"]), tg=ball(record["t_g"]),
                omega=ball(record["omega"]), t_omega=ball(record["t_omega"]))


def path_values(C, centre_epsilon, xi, theta):
    d = xi - ball(centre_epsilon)
    W, TW = evaluate(C["w"], theta), evaluate(C["tw"], theta)
    u = [W[k] + d * TW[k] for k in range(18)]
    phi = [C["c"][k] + d * C["tc"][k] + xi * u[k] for k in range(18)]
    direction = [C["tc"][k] + u[k] + xi * TW[k] for k in range(18)]
    return phi, direction, C["g"] + d * C["tg"]


def affine_functions(centre, a, b, subdivisions=8, precision=256):
    """Actual amplitude-path J0/J1 functions with exact parameter subdivision."""
    aa, bb = rational(a), rational(b)
    require(0 <= aa < bb and type(subdivisions) is int and subdivisions > 0, "positive path interval/partition")
    C, ec = centre_data(centre), (aa + bb) / 2
    def j0(theta):
        phi, _, g = path_values(C, ec, ball(ec), theta)
        return jacobian_and_direction(phi, [0] * 18, g, precision=precision)[0]
    def j1(theta):
        hull = None
        for i in range(subdivisions):
            xl = aa + (bb - aa) * Q(i, subdivisions)
            xr = aa + (bb - aa) * Q(i + 1, subdivisions)
            phi, tangent, g = path_values(C, ec, acb(interval(xl, xr)), theta)
            values = jacobian_and_direction(phi, tangent, g, C["tg"], precision)[1]
            hull = values if hull is None else [acb(u.real.union(v.real), u.imag.union(v.imag)) for u, v in zip(hull, values)]
        return hull
    return C, j0, j1


def canonical_hash(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()).hexdigest()


def real_bounds(value):
    require(type(value) is list and len(value) == 2, "serialized real interval")
    lo, hi = (rational(x) for x in value)
    require(lo <= hi, "serialized real interval order")
    return lo, hi


def contains_real(saved, fresh):
    lo, hi = real_bounds(saved)
    require(fresh.is_finite(), "finite reconstructed real enclosure")
    # Exact endpoint comparisons, without expanding the claimed saved interval.
    return ball(lo).real <= fresh.lower() and fresh.upper() <= ball(hi).real


def contains_complex(saved, fresh):
    require(type(saved) is list and len(saved) == 2, "serialized complex rectangle")
    return contains_real(saved[0], fresh.real) and contains_real(saved[1], fresh.imag)


def upper_claim(saved, fresh, label):
    # Witness real matrices retain the generic complex-rectangle encoding.
    # Decode it only after requiring an exactly zero imaginary interval.
    if type(saved) is list and len(saved) == 2 and all(type(axis) is list for axis in saved):
        require(real_bounds(saved[1]) == (Q(0), Q(0)), label + " real majorant required")
        saved = saved[0]
    lo, hi = real_bounds(saved)
    require(lo >= 0 and fresh.is_finite() and fresh >= 0, label + " nonnegative bound")
    # A majorant is the entire saved real interval, including its lower endpoint.
    require(fresh <= ball(lo).real, label + " saved majorant too small")


def flatten_matrix(matrix, label):
    require(type(matrix) is list and len(matrix) == 18 and
            all(type(row) is list and len(row) == 18 for row in matrix), label + " 18x18 dimensions")
    return [x for row in matrix for x in row]


def verify_affine(operator, centre, domain, tube, *, expected_operator_sha256,
                  expected_sources, M=128, nx=32, ny=8, subdivisions=8,
                  precision=256, progress=lambda *_: None):
    """Discharge the model/DFT premises for one exact affine amplitude family.

    The admitted existence tube is an explicit independent mathematical premise.
    This checks J0, the whole-parameter derivative disks, full strips, the true
    orbit's Jacobian tube and frequency against saved primitive bounds. It does
    not independently validate the contraction that supplied the tube.
    """
    start = time.monotonic()
    require(__import__("flint").__version__ == "0.9.0", "validated python-flint runtime required")
    pins = source_pins()
    require(pins == _LOADED_SOURCES, "model/checker source changed since loading")
    require(type(expected_sources) is dict and expected_sources == pins, "independent current model/source bindings")
    require(expected_operator_sha256 == canonical_hash(operator), "operator identity binding")
    require(type(operator) is dict and operator.get("kind") == "affine", "affine operator required")
    require(set(operator) == {"kind", "S_exponents", "J", "strip", "radii", "error", "rho", "rho0", "rho2", "omega", "omega_error", "h", "D"}, "operator primitive fields")
    require(type(domain) is list and len(domain) == 2, "exact domain pair")
    aa, bb = (rational(x) for x in domain)
    require(0 < aa < bb, "strictly positive amplitude domain")
    ec, h = (aa + bb) / 2, (bb - aa) / 2
    require(real_bounds(operator["h"])[0] >= h, "saved amplitude halfwidth")
    require(type(precision) is int and precision >= 192, "arithmetic precision")
    require(type(M) is int and M > 0, "DFT size")
    require(type(operator["J"]) is list and len(operator["J"]) == 2 and
            type(operator["strip"]) is list and len(operator["strip"]) == 2 and
            type(operator["radii"]) is list and len(operator["radii"]) == 1, "affine primitive dimensions")
    J0, J1 = operator["J"]
    require(type(J0) is type(J1) is dict and set(J0) == set(J1), "coefficient direction coverage")
    require(all(re.fullmatch(r"-?\d+", n) and str(int(n)) == n for n in J0), "canonical signed modes")
    modes = sorted(int(n) for n in J0)
    require(modes and modes == list(range(-max(modes), max(modes) + 1)), "complete two-sided mode coverage")
    Kp = max(modes)
    require(0 <= Kp < M and set(operator["radii"][0]) == set(J0), "derivative radius coverage")
    require(set(tube) == {"state_radii", "conductance_radius", "frequency_radius"}, "explicit existence tube fields")
    require(type(tube["state_radii"]) is list and len(tube["state_radii"]) == 18, "existence tube dimensions")
    require(all(rational(x) >= 0 for x in [*tube["state_radii"], tube["conductance_radius"], tube["frequency_radius"]]), "nonnegative existence tube")
    with model.precision(precision):
        rho = real_bounds(operator["rho"])[0]
        rho0 = real_bounds(operator["rho0"])[0]
        require(real_bounds(operator["rho"])[1] == rho and real_bounds(operator["rho0"])[1] == rho0,
                "exact strip widths")
        require(0 < rho and 0 < rho0, "positive strips")
        C, f0, f1 = affine_functions(centre, aa, bb, subdivisions, precision)
        require(contains_real(operator["omega"][0], C["omega"].real) and
                contains_real(operator["omega"][1], C["t_omega"].real), "frequency proposal binding")
        upper_claim(operator["omega_error"], ball(tube["frequency_radius"]).real, "frequency error")
        grid = partition(nx, ny)
        derived = []
        for name, fn, saved_strip in zip(("J0", "J1"), (f0, f1), operator["strip"]):
            progress("independent full-strip " + name)
            S = strip_bounds(fn, rho, grid, precision)
            for k, saved in enumerate(flatten_matrix(saved_strip, name + " strip")):
                upper_claim(saved, S[k], name + " strip component " + str(k))
            progress("independent signed DFT/alias " + name)
            derived.append(coefficients(fn, rho, M, Kp, S, precision))
        for n in modes:
            for k, (saved, fresh) in enumerate(zip(flatten_matrix(J0[str(n)], "J0"), derived[0][n])):
                require(contains_complex(saved, fresh), f"J0 coefficient {n},{k}")
            centres = flatten_matrix(J1[str(n)], "J1")
            radii = flatten_matrix(operator["radii"][0][str(n)], "J1 radii")
            for k, (saved, rad, fresh) in enumerate(zip(centres, radii, derived[1][n])):
                # The derivative primitive is a disk, not a rectangle. Its exact
                # centre must be a point in each coordinate.
                require(all(real_bounds(axis)[0] == real_bounds(axis)[1] for axis in saved), "exact derivative centre")
                radius = (fresh - rectangular(saved)).abs_upper()
                upper_claim(rad, radius, f"J1 disk {n},{k}")
        state = [acb(arb(0, ball(v).real), arb(0, ball(v).real)) for v in tube["state_radii"]]
        conductance = acb(arb(0, ball(tube["conductance_radius"]).real),
                          arb(0, ball(tube["conductance_radius"]).real))
        def tube_derivative(theta):
            hull = None
            for i in range(subdivisions):
                xi = acb(interval(aa + (bb-aa)*Q(i, subdivisions), aa + (bb-aa)*Q(i+1, subdivisions)))
                phi, _, g = path_values(C, ec, xi, theta)
                values = jacobian_tube_majorant([z+d for z,d in zip(phi,state)],g+conductance,
                                                tube["state_radii"],tube["conductance_radius"],precision)
                hull = values if hull is None else [acb(u.real.union(v.real), u.imag.union(v.imag)) for u,v in zip(hull,values)]
            return hull
        progress("independent full-strip actual orbit tube")
        errors = strip_bounds(tube_derivative, rho0, grid, precision)
        for k, saved in enumerate(flatten_matrix(operator["error"], "Jacobian tube")):
            upper_claim(saved, errors[k], "Jacobian tube component " + str(k))
    require(source_pins() == pins, "model/checker sources changed during replay")
    return dict(schema="cardiac-model-enclosure-replay/1", status="passed",
                scope="one positive-amplitude affine single-cell Jacobian family, conditional on supplied existence tube",
                premises=["admitted orbit existence/identification and stated analytic state/parameter/frequency tube",
                          "pinned literal 18-state model translation and exact decimal/scaling loader"],
                independent_model_translation=False, independent_orbit_existence=False,
                operator_sha256=canonical_hash(operator), centre_sha256=canonical_hash(centre),
                domain=[str(aa), str(bb)], tube_sha256=canonical_hash(tube), sources=pins,
                runtime=dict(python=sys.version, platform=platform.platform(), python_flint=__import__("flint").__version__),
                settings=dict(M=M, Kp=Kp, nx=nx, ny=ny, subdivisions=subdivisions, precision=precision),
                checked_complex_coefficients=2*18*18*(2*Kp+1), wall_s=time.monotonic()-start)


_LOADED_SOURCES = source_pins()
require(_LOADED_SOURCES["fourier/arbmodel.py"] == hashlib.sha256(_HELPER_BYTES).hexdigest(),
        "literal helper changed while loading")
