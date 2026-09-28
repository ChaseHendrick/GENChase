#!/usr/bin/env python3
"""List the paper files that a release attaches, one path per line (.github/workflows/release.yml).

A release attaches each paper's PDFs, the programs in its code/ folder and the files directly in its data/ folder.
Subfolders of data/ are not attached (a release asset is a single file); they are in the source archive and in the
paper's companion repository. GitHub names an asset by the file name it is given. A name that occurs once, or whose
copies are byte for byte the same, is attached once under that file name. Different files that share a file name
are copied to tools/dist/release-assets/ as <paper-id>--<file name> and those paths are listed, so one upload does
not replace another. The '#' form is not used: gh release upload treats it as a display label and keeps the old name.

    python3 tools/release-assets.py            the list, for the release step
    python3 tools/release-assets.py --check    the same checks, and a summary instead of the list
"""
import glob
import hashlib
import os
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATTERNS = ('papers/*/paper/*.pdf', 'papers/*/data/*', 'papers/*/code/*.py')
STAGE = os.path.join(ROOT, 'tools', 'dist', 'release-assets')


def digest(path):
    with open(path, 'rb') as fh:
        return hashlib.sha256(fh.read()).hexdigest()


def paper_id(rel):
    parts = rel.split('/')
    if len(parts) < 2 or parts[0] != 'papers':
        raise ValueError('not a paper file: ' + rel)
    return parts[1]


def assets(stage):
    chosen, groups, skipped = [], {}, []
    for pattern in PATTERNS:
        for rel in sorted(glob.glob(pattern, root_dir=ROOT)):
            path = os.path.join(ROOT, rel)
            if not os.path.isfile(path):
                skipped.append(rel)
                continue
            groups.setdefault(os.path.basename(rel), []).append(rel)
    renamed = 0
    if stage and os.path.isdir(STAGE):
        shutil.rmtree(STAGE)
    for name, rels in sorted(groups.items()):
        digests = {digest(os.path.join(ROOT, rel)) for rel in rels}
        if len(digests) == 1:
            chosen.append(rels[0])
            continue
        if stage:
            os.makedirs(STAGE, exist_ok=True)
        for rel in rels:
            renamed += 1
            asset = '%s--%s' % (paper_id(rel), name)
            if not stage:
                chosen.append(asset)
                continue
            dest = os.path.join(STAGE, asset)
            shutil.copy2(os.path.join(ROOT, rel), dest)
            chosen.append(os.path.relpath(dest, ROOT))
    return chosen, skipped, renamed


def main():
    check = '--check' in sys.argv[1:]
    chosen, skipped, renamed = assets(stage=not check)
    if any('#' in item for item in chosen):
        print('release-assets: a path contains #, which gh would treat as a label', file=sys.stderr)
        return 1
    names = [os.path.basename(item) for item in chosen]
    if len(names) != len(set(names)):
        print('release-assets: two listed files still share an asset name', file=sys.stderr)
        return 1
    if check:
        print('release-assets: %d files to attach, %d under a paper-id name; %d folders left to the source archive (%s)'
              % (len(chosen), renamed, len(skipped), ', '.join(skipped) or 'none'))
    else:
        print('\n'.join(chosen))
    return 0


if __name__ == '__main__':
    sys.exit(main())
