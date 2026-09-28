import numpy as np
from cone import margin, W0, X, Mof
Xs = X[:600]
for re in [-0.3, 0, 0.5, 1, 2, 5, 10, 20]:
    row = []
    for im in [0, 0.5, 1, 2, 5, 10, 20, 50]:
        row.append(margin(complex(re, im), W0, Xs))
    print('Re %5.1f:' % re, ' '.join('%8.3f' % v for v in row))
