"""Read the integration path from the figure of Salnikov, arXiv:1303.4904 (file loops.eps in the arXiv
source, https://arxiv.org/e-print/1303.4904). The figure is a gnuplot EPS; axis ticks give the scale
Re t: pixel 1077 -> -0.2, 1860 -> 0; Im t: pixel 2660 -> 0, 3212 -> 0.5. Prints the path sampled.
Usage: python3 loops_from_eps.py path/to/loops.eps"""
import sys
lines = open(sys.argv[1]).read().split('\n')
start = [i for i, l in enumerate(lines) if l.startswith('% Begin plot #1')][0]
x = y = 0.0; pts = []
for l in lines[start:]:
    t = l.split()
    if len(t) == 3 and t[2] in ('M', 'V', 'R', 'L', 'N'):
        a, b = float(t[0]), float(t[1])
        if t[2] in ('M', 'N', 'L'):
            x, y = a, b
        else:
            x += a; y += b
        pts.append((x, y))
tx = lambda p: -0.2 + (p - 1077) * 0.2 / (1860 - 1077)
ty = lambda p: (p - 2660) / (3212 - 2660) * 0.5
print(len(pts), 'path points')
for j in range(0, len(pts), 300):
    print('%.3f %+.3fi' % (tx(pts[j][0]), ty(pts[j][1])))
