"""From the chart ball of local_certificate.py to an explicit neighbourhood of the rotation orbit.

Lemma (proved in REPORT.md, constants evaluated here in ball arithmetic).  Let B = (b_0, ..., b_6) be
the labelled bipyramid of model.py (b_0 = north pole, b_1 = south pole, b_{2+k} = (cos 2pi k/5,
sin 2pi k/5, 0)).  If X in (S^2)^7 and g in SO(3) satisfy |x_i - g b_i| <= delta for all i (Euclidean
distance in R^3), then some rotation of X lies in the chart with |w|_2 <= Lambda(delta), where
   d  = 2 delta,
   d' = 2 delta + 2 sin(arcsin(d) / 2),
   e_S = d' / sqrt(4 - d'^2),
   e_R = the largest solution of e = d' sqrt(2 (1 + (1 + e)^2)) / 2  (bounded by a verified e*),
   Lambda(delta) = sqrt(e_S^2 + 5 e_R^2).
Prints the largest delta (on a grid) with Lambda(delta) <= chart ball radius of certificate.json.
"""
import json

import flint

arb = flint.arb
flint.ctx.prec = 128


def Lambda(delta):
    d = 2 * delta
    dp = 2 * delta + 2 * (d.asin() / 2).sin()
    eS = dp / (4 - dp * dp).sqrt()
    # e_R: verify a candidate e* with g(e*) <= e*, g(e) = d' sqrt(2(1+(1+e)^2))/2
    e = dp
    for _ in range(60):
        e = dp * (2 * (1 + (1 + e) * (1 + e))).sqrt() / 2
    estar = arb(e.upper()) * arb("1.000001")
    g = dp * (2 * (1 + (1 + estar) * (1 + estar))).sqrt() / 2
    if not g < estar:
        raise RuntimeError('fixed-point bound not verified')
    # g'(e) < 1 on [0, e*] (so e <= g(e) implies e <= e*):  g'(e) = d' (1+e) / sqrt(2 (1 + (1+e)^2)) <= d'
    if not dp < 1:
        raise RuntimeError('contraction bound not verified')
    return (eS * eS + 5 * estar * estar).sqrt()


def main():
    cert = json.load(open("certificate.json"))
    r = arb(cert["chart_ball_radius"].split("+/-")[0].strip("[ "))
    best = None
    for k in range(1, 2000):
        delta = arb(k) / 10 ** 7
        L = Lambda(delta)
        if L < r:
            best = (delta, L)
        else:
            break
    delta, L = best
    print("chart ball radius %s" % r)
    print("PROVED: if |x_i - g b_i| <= delta0 = %s for all i and some rotation g, then a rotation of X has "
          "chart coordinates with |w| <= %s < chart radius" % (delta, L.str(8)))
    return float(delta.mid())


if __name__ == "__main__":
    main()
