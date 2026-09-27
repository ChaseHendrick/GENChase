import numpy as np, sys
from ev import evans
def adaptive(a, b, fa, fb, depth=0):
    d = np.angle(fb/fa)
    if abs(d) < 0.3 or depth > 14:
        return d, min(abs(fa), abs(fb))
    m = (a+b)/2; fm = evans(m)
    d1, m1 = adaptive(a, m, fa, fm, depth+1); d2, m2 = adaptive(m, b, fm, fb, depth+1)
    return d1+d2, min(m1, m2)
x0, x1, y1 = float(sys.argv[1]), float(sys.argv[2]), float(sys.argv[3])
corners = [complex(x0, 0), complex(x0, y1), complex(x1, y1), complex(x1, 0)]
# upper half, from x1 (real) counterclockwise to x0 (real): x1 -> x1+iy1 -> x0+iy1 -> x0
path = [complex(x1,0), complex(x1,y1), complex(x0,y1), complex(x0,0)]
tot, mn = 0.0, 1e300
for a, b in zip(path[:-1], path[1:]):
    pts = [a + (b-a)*k/40 for k in range(41)]
    vals = [evans(p) for p in pts]
    for i in range(40):
        d, m = adaptive(pts[i], pts[i+1], vals[i], vals[i+1]); tot += d; mn = min(mn, m)
    print('edge', a, b, 'arg so far', tot, flush=True)
print('D(x0)=', evans(complex(x0,0)), 'D(x1)=', evans(complex(x1,0)))
print('winding (2 x upper half)/2pi =', 2*tot/(2*np.pi), 'min |D|', mn)
