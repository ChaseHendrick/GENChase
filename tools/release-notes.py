#!/usr/bin/env python3
"""Write the public notes of a studio release from CHANGELOG.md.

  python3 tools/release-notes.py --version 0.8.0 --sha <commit> --repo owner/name [--date YYYY-MM-DD]
                                 [--pages-url URL] [--no-papers] [--existing] [--output notes.md]
  python3 tools/release-notes.py --self-test

The notes are the version's CHANGELOG section under "What's new", then how to get the studio, then
where the release was built from. A version without a CHANGELOG section, or with an empty one, is an
error, so a release cannot go out with empty notes. .github/workflows/release.yml runs this when it
publishes a release, and again with notes_only to rewrite the notes of a release that already exists.

Versions are written without a leading v (0.8.0, not v0.8.0; owner's decision, 2026-09-26), so a new
release takes the plain form only. The releases made before then keep their tags (v0.4.1 to v0.7.1):
with --existing, the version may be such a tag, and its notes come from the section of the version
without the v ("## 0.7.1"; a heading still written "## v0.7.1" is found too).
"""
import argparse
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# Every CHANGELOG section says this; the notes carry the date themselves.
DATE_LINE = 'The publication date is recorded in the GitHub release notes.'
PLAIN = re.compile(r'\d+\.\d+\.\d+')
LEGACY = re.compile(r'v\d+\.\d+\.\d+')


def plain(version):
    """The version as it is written, without the leading v of a tag made before 2026-09-26."""
    return version[1:] if LEGACY.fullmatch(version) else version


def check_version(version, existing=False):
    if PLAIN.fullmatch(version):
        return
    if LEGACY.fullmatch(version):
        if existing:
            return
        raise SystemExit(f'Write the version without a leading v: {version[1:]}, not {version}. '
                         'Only a release that already exists keeps its v tag (--existing).')
    raise SystemExit('The version must look like 0.8.0.')


def section(changelog, version):
    want, out, found = plain(version), [], False
    for line in changelog.splitlines():
        if line.startswith('## '):
            if found:
                break
            found = [plain(w) for w in line[3:].split()[0:1]] == [want]
            continue
        if found:
            out.append(line)
    if not found:
        raise SystemExit(f'CHANGELOG.md has no section "## {want}". Move the Unreleased entries under it first.')
    body = '\n'.join(l for l in out if l.strip() != DATE_LINE).strip()
    if not body:
        raise SystemExit(f'The CHANGELOG.md section "## {want}" is empty.')
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
        f'GENChase {plain(version)}: an offline studio of seeded scientific simulations for making and printing generative art. Every plate reprints from its recipe, and each technique states how far it has been validated.',
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


def self_test():
    """The version rule and the section lookup against a planted CHANGELOG, with the refusals."""
    changelog = '\n'.join([
        '# Changelog', '', '## Unreleased', '', '- Not released yet.', '',
        '## 0.8.0', '', DATE_LINE, '', '- A new release, tagged 0.8.0.', '',
        '## 0.7.1', '', DATE_LINE, '', '- An old release, tagged v0.7.1.', '',
        '## v0.6.2', '', '- A heading still written with the v.', '',
        '## 0.6.1', '', DATE_LINE, '',
    ])
    sha, checks, failures = 'a' * 40, 0, 0

    def expect(ok, what, run):
        nonlocal checks, failures
        checks += 1
        try:
            text, refused = run(), None
        except SystemExit as e:
            text, refused = None, str(e)
        if ok(text, refused) is not True:
            failures += 1
            print('FAIL ' + what + (': refused: ' + refused if refused else ': accepted'))

    def release(version, existing=False):
        check_version(version, existing)
        return notes(version, sha, 'o/r', '2026-09-26', changelog=changelog)

    expect(lambda t, r: t is not None and t.startswith('GENChase 0.8.0:') and 'tagged 0.8.0' in t and 'v0.7.1' not in t,
           'a new release written 0.8.0 gets its own section', lambda: release('0.8.0'))
    expect(lambda t, r: t is not None and DATE_LINE not in t, 'the date line is left out of the notes', lambda: release('0.8.0'))
    expect(lambda t, r: r is not None and 'without a leading v' in r, 'a new release written v0.8.0 is refused', lambda: release('v0.8.0'))
    expect(lambda t, r: t is not None and t.startswith('GENChase 0.7.1:') and 'tagged v0.7.1' in t,
           'an existing release tagged v0.7.1 takes the section "## 0.7.1", and the notes write 0.7.1',
           lambda: release('v0.7.1', existing=True))
    expect(lambda t, r: t is not None and 'tagged v0.7.1' in t, 'an existing release named by its plain version', lambda: release('0.7.1', existing=True))
    expect(lambda t, r: t is not None and 'still written with the v' in t, 'a heading still written "## v0.6.2" is found', lambda: release('v0.6.2', existing=True))
    expect(lambda t, r: r is not None and 'no section' in r, 'a version without a section is refused', lambda: release('v0.5.0', existing=True))
    expect(lambda t, r: r is not None and 'is empty' in r, 'an empty section is refused', lambda: release('0.6.1'))
    for bad in ['latest', '0.8', '0.8.0-rc1', 'V0.8.0']:
        expect(lambda t, r: r is not None and 'must look like' in r, f'"{bad}" is refused', lambda: release(bad, existing=True))
    print(('RELEASE NOTES SELF-TEST FAILED: ' + str(failures) + ' of ' if failures else 'Release notes self-test OK: ')
          + str(checks) + ' cases, including the refusals')
    return failures


def main():
    a = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    a.add_argument('--version', help='the version, written without a leading v (0.8.0)')
    a.add_argument('--sha')
    a.add_argument('--repo')
    a.add_argument('--date', default=datetime.now(timezone.utc).date().isoformat())
    a.add_argument('--pages-url')
    a.add_argument('--no-papers', action='store_true', help='the release attaches no paper PDFs')
    a.add_argument('--existing', action='store_true',
                   help='rewrite the notes of a release that already exists; its tag may carry the leading v it was made with')
    a.add_argument('--output')
    a.add_argument('--self-test', action='store_true', help='check the version rule and the section lookup, then stop')
    args = a.parse_args()
    if args.self_test:
        sys.exit(1 if self_test() else 0)
    if not (args.version and args.sha and args.repo):
        a.error('--version, --sha and --repo are required')
    check_version(args.version, args.existing)
    text = notes(args.version, args.sha, args.repo, args.date, args.pages_url, not args.no_papers)
    if args.output:
        Path(args.output).write_text(text, encoding='utf8')
    else:
        sys.stdout.write(text)


if __name__ == '__main__':
    main()
