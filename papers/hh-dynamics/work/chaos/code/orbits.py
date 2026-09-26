"""The periodic orbits used for the horseshoe, on G&O's section u = 4.5 crossed with u increasing (their
p1 and p2 lie there; the text's "v increasing" does not match their own points). NUMERICAL."""
import numpy as np
import hhc
import pmap

SEC = 4.5
DIR = +1
EL_GO = 10.599


def j_ours(j_go):
    """Guckenheimer and Oliva's current (E_l = 10.599) mapped to E_l = EL0: J + 0.3 E_l is invariant."""
    return j_go + 0.3 * (EL_GO - hhc.EL0)


def branch_orbit(J, part, branch='../data/branch.npz'):
    """Orbit A (part 'A', before the first fold) or B (part 'B', after it) of the Hopf branch at J, returned as
    its crossing of u = SEC with u increasing, polished by Newton."""
    d = np.load(branch)
    r, s = d['rows'], float(d['s'])
    k = int(np.argmax(np.sign(r[:, -1]) > 0))      # first row after the fold (tJ > 0)
    rows = r[:k] if part == 'A' else r[k:]
    i = np.where((rows[:-1, 0] - J) * (rows[1:, 0] - J) <= 0)[0][0]
    a = (J - rows[i, 0]) / (rows[i + 1, 0] - rows[i, 0])
    x = rows[i, 1:4] + a * (rows[i + 1, 1:4] - rows[i, 1:4])
    x = pmap.newton_fixed(x, J, s)[0]
    y = hhc.to_section(np.r_[s, x], J, SEC, DIR, 1)[0]
    return pmap.newton_fixed(y[1:], J, SEC, direction=DIR)


def eig_sorted(DP):
    w, V = np.linalg.eig(DP)
    o = np.argsort(-np.abs(w))
    return w[o], V[:, o]
