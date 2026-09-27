from common import *
for E, p2s in [(arb(-1)/2, '-1.244860970918396'), (arb(1)/2, '-1.627044959203058')]:
    out, T, xc, Df = ftilde((arb(0), arb(p2s)), E=E, deriv=True)
    tr = Df[0][0] + Df[1][1]; det = Df[0][0]*Df[1][1] - Df[0][1]*Df[1][0]
    lam = tr/2 - (tr*tr/4 - det).sqrt() if tr < 0 else tr/2 + (tr*tr/4-det).sqrt()
    print('E', E.str(3), 'f~(p0)-p0 =', (out[0]).str(6, radius=True), (out[1]-arb(p2s)).str(6, radius=True), 'T', T.str(12), 'trace', tr.str(10, radius=True), 'det', det.str(10, radius=True), 'lambda', lam.str(10, radius=True), flush=True)
