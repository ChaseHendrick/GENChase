import numpy as np, sys
from ev import evans
def winding(pts, f):
    vals = [f(p) for p in pts]
    tot = 0.0
    for a, b in zip(vals[:-1], vals[1:]):
        d = np.angle(b/a)
        tot += d
    return tot/(2*np.pi), vals
x0, x1, y1 = float(sys.argv[1]), float(sys.argv[2]), float(sys.argv[3]); n = int(sys.argv[4])
# rectangle counterclockwise
side = lambda a, b: [a + (b-a)*k/n for k in range(n)]
pts = side(complex(x0,-y1), complex(x1,-y1)) + side(complex(x1,-y1), complex(x1,y1)) + side(complex(x1,y1), complex(x0,y1)) + side(complex(x0,y1), complex(x0,-y1)) + [complex(x0,-y1)]
w, vals = winding(pts, evans)
print('winding', w)
mn = min(range(len(vals)), key=lambda i: abs(vals[i]))
print('min |D| on contour', abs(vals[mn]), 'at', pts[mn])
# max arg jump
jumps = [abs(np.angle(b/a)) for a,b in zip(vals[:-1], vals[1:])]
print('max arg jump', max(jumps))
