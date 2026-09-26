"""For a current J: the zero curves z1 < z2 (< z3) of c1' along lines c2 = const on the section, the gap from
z2 to the one-return firing boundary, and the heights c2' where the images of z1 and z2 land. Used to choose
J* and the c2 window of the h-sets. NUMERICAL.   python3 scanJ.py J"""
import sys
import numpy as np
import horseshoe as hs

J = float(sys.argv[1])
S = hs.Setup(J)
print('J=%.10f A=%s mu_A=%s B_c=%s mu_B=%s T_A=%.4f T_B=%.4f' % (J, S.A, np.round(S.muA.real, 4), S.c_of(S.B),
                                                              np.round(S.muB.real, 4), S.TA, S.TB), flush=True)
for c2 in np.linspace(-9e-3, 3e-3, 25):
    try:
        z, cb, v, cs = S.zeros(c2)
    except Exception as e:
        print('c2=%+.4f failed %s' % (c2, e))
        continue
    s = 'c2=%+.5f nzeros=%d bnd=%.6e' % (c2, len(z), cb)
    for zz in z[:3]:
        cp, T, um, D = S.image([zz, c2, 0.0], var=True)
        s += ' | z=%.6e c2p=%+.4e slope=%+.2e' % (zz, cp[1], D[0, 0])
    if len(z) >= 2:
        s += ' | gap=%.2e' % (cb - z[1])
    print(s, flush=True)
