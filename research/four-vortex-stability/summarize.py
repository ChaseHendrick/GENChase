"""Summarise certificate files: check that the boxes tile [m_lo, m_hi] exactly (consecutive
float endpoints equal), merge CERTIFIED boxes into maximal intervals, list the refused
clusters with reasons, and report ranges of the frequency ratio and of D / w1^3.

usage: python3 summarize.py data/cert_X.json [...]
"""
import json, sys


def iv(s):
    """Parse '[lo, hi]' (outward-rounded floats)."""
    lo, hi = s.strip('[]').split(',')
    return float(lo), float(hi)


def lohi(b):
    return (b['lo'], b['hi']) if 'lo' in b else tuple(b['m'])


def summarize(path):
    C = json.load(open(path))
    boxes = sorted(C['boxes'], key=lambda b: lohi(b)[0])
    lo, hi = C['m']
    gaps = []
    if lohi(boxes[0])[0] != lo or lohi(boxes[-1])[1] != hi:
        gaps.append(('ends', lohi(boxes[0])[0], lohi(boxes[-1])[1]))
    for a, b in zip(boxes, boxes[1:]):
        if lohi(a)[1] != lohi(b)[0]:
            gaps.append((lohi(a)[1], lohi(b)[0]))
    good, bad = [], []
    for b in boxes:
        l, h = lohi(b)
        tgt = good if b['status'] in ('CERTIFIED', 'DEFINITE') else bad
        if tgt and tgt[-1][1] == l and (tgt is good or tgt[-1][2] == b.get('reason', '')[:50]):
            tgt[-1][1] = h
        else:
            tgt.append([l, h, b.get('reason', '')[:50] if tgt is bad else b['status']])
    st = {}
    for b in boxes:
        st[b['status']] = st.get(b['status'], 0) + 1
    print('%s: family %s, [%r, %r], %d boxes %s' % (path, C['family'], lo, hi, len(boxes), st))
    print('  tiling gaps/overlaps: %s' % (gaps if gaps else 'none'))
    for l, h, s in good:
        print('  certified  [%.12f, %.12f]' % (l, h))
    for l, h, s in bad:
        print('  refused    [%.12f, %.12f]  width %.2e  %s' % (l, h, h - l, s))
    cert = [b for b in boxes if b['status'] == 'CERTIFIED']
    if cert:
        rat = [iv(b['ratio']) for b in cert]
        print('  ratio w1/w2 over certified boxes: [%.6f, %.6f]' % (min(r[0] for r in rat), max(r[1] for r in rat)))
        sg = {}
        for b in cert:
            lo_, hi_ = iv(b['D'])
            k = '+' if lo_ > 0 else ('-' if hi_ < 0 else '?')
            sg[k] = sg.get(k, 0) + 1
        print('  sign of D over certified boxes (+ means lower bound > 0): %s' % sg)
        dn = [iv(b['Dnorm']) for b in cert]
        print('  D / w1^3 enclosures: min lower %.4g, max upper %.4g' % (min(d[0] for d in dn), max(d[1] for d in dn)))
        J = [iv(b['J0']) for b in cert if 'J0' in b]
        if J:
            print('  J0 range: [%.6g, %.6g]' % (min(x[0] for x in J), max(x[1] for x in J)))
    return good, bad, gaps


if __name__ == '__main__':
    for p in sys.argv[1:]:
        summarize(p)
