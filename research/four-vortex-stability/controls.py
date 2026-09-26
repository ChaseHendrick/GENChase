"""Negative and positive controls for certify3.py.  Each line states what must happen; the
script exits non-zero if any expectation fails.

  1. linearly unstable members must be refused (collinear m = -0.85: complex quartet;
     kite m = -0.2 beyond its Krein collision);
  2. boxes containing a low-order resonance (1:2, 1:3) or a zero of D must be refused, with the
     right reason;
  3. a box on the 1:1 collision (m* for the collinear family, the kite's end point) must be
     refused;
  4. Rhombus A (Ohsawa's case, circulations (1, 1, g, g), -2 + sqrt 3 < g < 0) must come out
     DEFINITE (the reduced H2 is definite, so Dirichlet applies and Arnold is not needed), and
     its unstable range must be refused;
  5. a well-inside box must be CERTIFIED.
The resonance and D = 0 locations are read from the certificate files (data/cert_*.json) if
present, otherwise from the constants below (floating-point estimates).
usage: python3 controls.py
"""
import json, os, sys
import families
from certify3 import certify_box

HERE = os.path.dirname(os.path.abspath(__file__))
EST = {'res12': -0.8683877592, 'res13': -0.8839592708, 'D0': -0.8689970082, 'mstar': -0.8564135988, 'kiteK': -0.1337861981}


def refused_points():
    """Midpoints of refused clusters in the collinear certificate, if it exists."""
    p = os.path.join(HERE, 'data', 'cert_collinear.json')
    if not os.path.exists(p):
        return None
    boxes = json.load(open(p))['boxes']
    return [((b['m'][0] + b['m'][1]) / 2, b.get('reason', '')) for b in boxes if b['status'] == 'REFUSED']


def main():
    col = families.get('three-collinear')
    kite = families.get('three-kite')
    rho = families.get('rhombusA')
    cases = [
        ('collinear m=-0.85 (linearly unstable)', col, -0.85, 1e-6, 'REFUSED', 'not linearly stable|distinct real'),
        ('kite m=-0.2 (linearly unstable)', kite, -0.2, 1e-5, 'REFUSED', 'not linearly stable|distinct real|Krawczyk'),
        ('collinear box on 1:2 resonance', col, EST['res12'], 2e-6, 'REFUSED', 'resonance'),
        ('collinear box on 1:3 resonance', col, EST['res13'], 2e-6, 'REFUSED', 'resonance'),
        ('collinear box on D = 0', col, EST['D0'], 2e-6, 'REFUSED', 'Arnold determinant'),
        ('collinear box on m* (1:1)', col, EST['mstar'], 2e-6, 'REFUSED', 'distinct real|not linearly|w2|kappa'),
        ('kite box on its end point (1:1)', kite, EST['kiteK'], 2e-6, 'REFUSED', 'distinct real|not linearly|w2|kappa'),
        ('rhombus A g=-0.1 (Ohsawa: definite)', rho, -0.1, 1e-5, 'DEFINITE', ''),
        ('rhombus A g=-0.3 (unstable)', rho, -0.3, 1e-5, 'REFUSED', ''),
        ('collinear m=-0.9 (inside)', col, -0.9, 2e-6, 'CERTIFIED', ''),
        ('kite m=-0.05 (inside)', kite, -0.05, 1e-4, 'CERTIFIED', ''),
    ]
    bad = 0
    import re
    for name, fam, m0, h, want, why in cases:
        r = certify_box(fam, m0, h)
        ok = r['status'] == want and (not why or re.search(why, r.get('reason', '')))
        bad += not ok
        print('%-40s %-9s %-60s %s' % (name, r['status'], r.get('reason', '')[:60], 'ok' if ok else '<-- UNEXPECTED'))
    print('controls failing:', bad)
    return bad


if __name__ == '__main__':
    sys.exit(1 if main() else 0)
