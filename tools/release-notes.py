#!/usr/bin/env python3
"""Write the public notes of a studio release from CHANGELOG.md.

  python3 tools/release-notes.py --version v0.7.0 --sha <commit> --repo owner/name [--date YYYY-MM-DD]
                                 [--pages-url URL] [--no-papers] [--output notes.md]

The notes are the version's CHANGELOG section under "What's new", then how to get the studio, then
where the release was built from. A version without a CHANGELOG section, or with an empty one, is an
error, so a release cannot go out with empty notes. .github/workflows/release.yml runs this when it
publishes a release, and again with notes_only to rewrite the notes of a release that already exists.
"""
import argparse
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# Every CHANGELOG section says this; the notes carry the date themselves.
DATE_LINE = 'The publication date is recorded in the GitHub release notes.'


def section(changelog, version):
    lines, out, found = changelog.splitlines(), [], False
    for line in lines:
        if line.startswith('## '):
            if found:
                break
            found = line[3:].split()[0:1] == [version]
            continue
        if found:
            out.append(line)
    if not found:
        raise SystemExit(f'CHANGELOG.md has no section "## {version}". Move the Unreleased entries under it first.')
    body = '\n'.join(l for l in out if l.strip() != DATE_LINE).strip()
    if not body:
        raise SystemExit(f'The CHANGELOG.md section "## {version}" is empty.')
    return body


def notes(version, sha, repo, date, pages_url=None, papers=True, changelog=None):
    changelog = changelog if changelog is not None else (ROOT / 'CHANGELOG.md').read_text(encoding='utf8')
    new = section(changelog, version)
    get = ['Download **GENChase-studio.zip**, extract it, and open **START-HERE.html**. No development tools are needed for the offline art studio.']
    if pages_url:
        get.append(f'You can also make art in your browser at {pages_url}.')
    bundle = 'The ZIP includes the portable studio, introductory examples, licenses, and scientific evidence. **SHA256SUMS.txt** records its checksum.'
    if papers:
        bundle += ' The research papers are attached as PDFs, together with the programs that verify them and their output.'
    bundle += ' Use the automatically attached source archive for local checks or code contributions, following CONTRIBUTING.md.'
    return '\n'.join([
        f'GENChase {version}: an offline studio of seeded scientific simulations for making and printing generative art. Every plate reprints from its recipe, and each technique states how far it has been validated.',
        '',
        "## What's new",
        '',
        new,
        '',
        '## Get the studio',
        '',
        ' '.join(get),
        '',
        bundle,
        '',
        '## Provenance',
        '',
        f'Released {date}. Built from [{sha[:12]}](https://github.com/{repo}/commit/{sha}). Validation is limited to the domains in '
        f'[VALIDATION.md](https://github.com/{repo}/blob/{sha}/VALIDATION.md); this release does not certify every simulation.',
        '',
    ])


def main():
    a = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    a.add_argument('--version', required=True)
    a.add_argument('--sha', required=True)
    a.add_argument('--repo', required=True)
    a.add_argument('--date', default=datetime.now(timezone.utc).date().isoformat())
    a.add_argument('--pages-url')
    a.add_argument('--no-papers', action='store_true', help='the release attaches no paper PDFs')
    a.add_argument('--output')
    args = a.parse_args()
    if not re.fullmatch(r'v\d+\.\d+\.\d+', args.version):
        raise SystemExit('The version must look like v0.7.0.')
    text = notes(args.version, args.sha, args.repo, args.date, args.pages_url, not args.no_papers)
    if args.output:
        Path(args.output).write_text(text, encoding='utf8')
    else:
        sys.stdout.write(text)


if __name__ == '__main__':
    main()
