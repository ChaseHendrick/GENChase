"""Order-of-magnitude cost of a naive interval branch-and-bound for the global statement.

ESTIMATE ONLY, under stated assumptions; nothing here is a proof.

Model.  Configurations modulo rotations form an 11-dimensional space.  An interval (centred-form)
lower bound on a box of width h around a point x certifies E > E(B) when
      E(x) - E(B) > c2 h^2,
with c2 of the order of the Hessian norm (we take the largest Hessian eigenvalue at B, 6.93, as
an optimistic value).  Near the bipyramid, outside the region handled by the local certificate,
      E - E(B) ~ mu_ζ |zeta|^2 + q |xi|^4      (q = 1/10 exactly, mu_ζ ~ 0.27 numerically),
so the admissible box width at distance d along the degenerate plane is h ~ sqrt(q/c2) d^2.
The number of boxes needed to tile the shell between the local-certificate radius r0 and a
radius where the energy gap is comfortable (d1) is roughly the integral of 1/h^11 over the
11-dimensional region; boxes are counted per unit volume.
"""
import math

c2 = 6.93
q = 0.1
mu = 0.266


def boxes(r0, d1=0.3):
    # integrate over xi in the plane (2 dims) and zeta (9 dims) with zeta extent where the gap is below
    # the xi-gap: |zeta| <~ sqrt(q/mu) |xi|^2 ; boxes of width h(|xi|) = sqrt(q/c2) |xi|^2 (floor at the
    # width needed for the zeta-thickness, never below it).  Crude midpoint integration in log radius.
    total = 0.0
    n = 2000
    for k in range(n):
        d = r0 * (d1 / r0) ** ((k + 0.5) / n)
        dd = d * math.log(d1 / r0) / n
        h = math.sqrt(q / c2) * d * d
        zthick = max(math.sqrt(q / mu) * d * d, h)
        vol = 2 * math.pi * d * dd * (zthick ** 9) * (math.pi ** 4.5 / math.gamma(5.5))
        total += vol / h ** 11
    return total


if __name__ == "__main__":
    for r0 in (6.6e-4, 1e-2, 5e-2):
        print("local certificate radius %.1e: ~10^%.1f boxes near the degenerate minimum alone"
              % (r0, math.log10(boxes(r0))))
    print("(the ~ (1/h)^2 growth along the 2 degenerate directions dominates; the rest of the")
    print(" 11-dimensional space, including the 1:3:3 saddle only 0.0039 above E(B), adds more.)")
