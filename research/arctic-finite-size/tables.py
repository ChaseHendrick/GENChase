"""Print the markdown tables of REPORT.md from data/*.json."""
import json
import numpy as np

az = json.load(open('data/aztec_exact.json'))['rows']
print('| order n | exact polar fraction q(n) | (q - (1 - pi/4)) n^(2/3) |')
print('|---|---|---|')
for r in az:
    if r['n'] in (8, 12, 16, 24, 32, 40, 57, 80, 113, 160, 226, 320, 448, 640, 896, 1280, 1536, 1792, 2048, 2560):
        print('| %d | %.12f | %.6f |' % (r['n'], r['polarFraction'], (r['polarFraction'] - (1 - np.pi / 4)) * r['n'] ** (2 / 3)))
for fam, lim, pick in [('regular', np.pi / (2 * np.sqrt(3)), (4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128, 192, 256, 384, 512, 640, 768, 1024)),
                       ('skew', 0.8850434659350882, (1, 2, 4, 5, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128, 160, 192))]:
    rows = json.load(open('data/hexagon_exact_%s.json' % fam))['rows']
    print()
    print('| %s | box | exact free fraction | (free - limit) n^(2/3) |' % ('side n' if fam == 'regular' else 'k'))
    print('|---|---|---|---|')
    for r in rows:
        if r['size'] in pick:
            print('| %d | %s | %.12f | %.6f |' % (r['size'], '·'.join(map(str, r['box'])), r['freeFraction'], (r['freeFraction'] - lim) * r['size'] ** (2 / 3)))
