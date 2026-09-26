# Checks every ``...'' quotation in the manuscript against the saved source texts.  A quotation, with LaTeX
# markup reduced to plain text, must occur verbatim after whitespace and symbol normalization (curly quotes,
# minus signs, math markup).  A quotation found only after all spaces are removed is reported as SPACE and counts
# as a failure; it has to be checked by hand (PDF extraction sometimes drops spaces).
# Sources: the stage-1 lit/ folder (Stringer et al. main text and SI, Pospisil and Pillow text, SI appendix and
# correction) and this folder's lit/ (Davidovich and Roudi 2022).  Paths can be overridden with the environment
# variable NOTE_LIT (a colon-separated list of directories).
import re, os, sys, glob
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
dirs = os.environ.get('NOTE_LIT', f'{ROOT}/../spectrum-power/lit:{ROOT}/lit').split(':')
FILES = ('stringer2019.txt', 'stringer_SI.txt', 'PMC12625980.math.txt', 'PMC12625980.txt', 'pp_sapp.txt',
         'PMC12718384.txt', 'a.txt')
src, found = '', []
for f in FILES:
    for d in dirs:
        p = os.path.join(d, f)
        if os.path.exists(p):
            src += ' ' + open(p, encoding='utf-8', errors='replace').read(); found.append(p); break
    else:
        sys.exit(f'source text {f} not found in {dirs}')


def norm(t):
    t = t.replace('\u2212', '-').replace('\u2009', ' ').replace('\u00a0', ' ').replace('–', '-')
    t = t.replace('\u2019', "'").replace('\u2018', "'").replace('\u201c', '"').replace('\u201d', '"')
    t = re.sub(r'[⟨⟩]', ' ', t)
    t = t.replace('α', 'alpha').replace('∼', '~').replace('§', 'S')
    t = re.sub(r'\s+', ' ', t)
    t = re.sub(r' ([,.;:)])', r'\1', t)          # math markup leaves a space before punctuation (both sides)
    return t.strip()


def delatex(q):
    q = q.replace('\\S', 'S').replace('~', ' ').replace('\\,', ' ')
    q = q.replace('\\alpha', 'alpha').replace('\\sim', '~').replace('\\%', '%')
    q = re.sub(r'\\ref\{[^}]*\}', '', q)
    q = q.replace('_', ' ').replace('^', '').replace('$', ' ').replace('{', '').replace('}', '').replace('\\', '')
    return norm(q)


S = norm(src)
Sc = S.replace(' ', '')
PAPER = os.path.join(ROOT, 'paper')
MAIN = 'rank-window.tex' if os.path.exists(os.path.join(PAPER, 'rank-window.tex')) else 'note.tex'
tex = ''.join(open(os.path.join(PAPER, f)).read() for f in (MAIN, 'abstract.tex', 'results.tex', 'discussion.tex'))
quotes = re.findall(r"``(.*?)''", tex, flags=re.S)
bad = 0
for q in quotes:
    p = delatex(q)
    if p in S:
        tag = 'OK   '
    elif p.replace(' ', '') in Sc:
        tag = 'SPACE'; bad += 1
    else:
        tag = 'MISS '; bad += 1
    print(tag + ' ' + p[:150])
print(f'{len(quotes)} quotations, {bad} not found verbatim (sources: {len(found)} files)')
sys.exit(1 if bad else 0)
