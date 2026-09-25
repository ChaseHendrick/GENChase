#!/usr/bin/env python3
"""List the paper files that a release attaches, one path per line (.github/workflows/release.yml).

A release attaches each paper's PDFs, the programs in its code/ folder and the files directly in its data/ folder.
Subfolders of data/ are not attached (a release asset is a single file); they are in the source archive and in the
paper's companion repository. A release asset is named by its file name alone, so two papers may ship the same name
only if the files are identical (a module one paper copies from another, or a shared data file); it is then attached
once. Two different files with the same name stop the release, since one would silently replace the other.

    python3 tools/release-assets.py            the list, for the release step
    python3 tools/release-assets.py --check    the same checks, and a summary instead of the list
"""
import glob
import hashlib
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATTERNS = ('papers/*/paper/*.pdf', 'papers/*/data/*', 'papers/*/code/*.py')


def digest(path):
    with open(path, 'rb') as fh:
        return hashlib.sha256(fh.read()).hexdigest()


def assets():
    chosen, seen, skipped, errors = [], {}, [], []
    for pattern in PATTERNS:
        for rel in sorted(glob.glob(pattern, root_dir=ROOT)):
            path = os.path.join(ROOT, rel)
            if not os.path.isfile(path):
                skipped.append(rel)
                continue
            name = os.path.basename(rel)
            if name in seen:
                first = seen[name]
                if digest(os.path.join(ROOT, first)) != digest(path):
                    errors.append('%s and %s are different files with the same asset name %s' % (first, rel, name))
                continue
            seen[name] = rel
            chosen.append(rel)
    return chosen, skipped, errors


def main():
    chosen, skipped, errors = assets()
    for e in errors:
        print('release-assets: ' + e, file=sys.stderr)
    if errors:
        return 1
    if '--check' in sys.argv[1:]:
        print('release-assets: %d files to attach; %d folders left to the source archive (%s)'
              % (len(chosen), len(skipped), ', '.join(skipped) or 'none'))
    else:
        print('\n'.join(chosen))
    return 0


if __name__ == '__main__':
    sys.exit(main())
