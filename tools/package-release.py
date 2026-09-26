#!/usr/bin/env python3
"""Make a reproducible, allowlisted offline art bundle using standard libraries only."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parent.parent

def validate_version(version):
    # Versions are written without a leading v (owner's decision, 2026-09-26). The releases made before
    # then keep their v tags, but this builds a new release, so it takes the plain form only.
    if re.fullmatch(r'v[0-9]+\.[0-9]+\.[0-9]+', version):
        raise ValueError('Write the version without a leading v: ' + version[1:] + ', not ' + version)
    if not re.fullmatch(r'(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)', version):
        raise ValueError('Use a numbered release such as 0.8.0 (no leading v, date or leading zeros)')


def package(output, version):
    validate_version(version)
    subprocess.run(['node', 'tools/build.js', '--check'], cwd=ROOT, check=True)
    subprocess.run(['node', 'tools/science.js'], cwd=ROOT, check=True)
    commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    dirty = bool(subprocess.check_output(['git', 'status', '--porcelain', '--untracked-files=no'], cwd=ROOT, text=True).strip())
    names = ['CHANGELOG.md', 'dist/studio.html', 'LICENSE', 'NOTICE', 'OUTPUT-RIGHTS.md', 'VALIDATION.md']
    names += ['gallery/' + x + '.jpg' for x in ['tilings', 'snowflake', 'hyperbolic']]
    names += [p.relative_to(ROOT).as_posix() for p in sorted((ROOT/'validation').glob('*.md'))]
    names += ['validation/techniques.json']
    names += [p.relative_to(ROOT).as_posix() for p in sorted((ROOT/'validation/results').glob('*.json')) if not p.name.startswith('witnesses-')]
    # Read only tracked evidence, never volunteer submissions, credentials, .git, or local runs.
    tracked = set(subprocess.check_output(['git', 'ls-files'], cwd=ROOT, text=True).splitlines())
    names = sorted(set(n for n in names if n in tracked))
    data = {}
    for name in names:
        file = ROOT/name
        if file.is_symlink() or not file.is_file():
            raise ValueError('Expected a regular file: ' + name)
        data[name] = file.read_bytes()
    start = (ROOT/'start.html').read_text().replace('./index.html', './dist/studio.html')
    start = start.replace('Runs in your browser. No account, installation, or payment.', 'Your offline copy. Open the studio directly from this folder.')
    data['START-HERE.html'] = start.encode()
    data['VERSION.json'] = (json.dumps({'version': version, 'commit': commit, 'workingTreeModified': dirty, 'entry': 'START-HERE.html'}, indent=2)+'\n').encode()
    data['READ-ME.txt'] = ('GENChase '+version+'\n\nExtract this ZIP, then double-click START-HERE.html.\nNo installation is needed to make art. Keep this complete folder together.\n\nTo test or contribute, use the source checkout and instructions on the start page.\nYour generated artwork belongs to you; see OUTPUT-RIGHTS.md.\nScientific scope: VALIDATION.md and each technique report.\n').encode()
    output = Path(output).resolve();output.mkdir(parents=True, exist_ok=True)
    artifact=output/'GENChase-studio.zip'
    with zipfile.ZipFile(artifact, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, content in sorted(data.items()):
            info=zipfile.ZipInfo('GENChase/'+name, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644 << 16
            archive.writestr(info, content)
    digest=hashlib.sha256(artifact.read_bytes()).hexdigest()
    (output/'SHA256SUMS.txt').write_text(digest+'  '+artifact.name+'\n')
    print(json.dumps({'archive':str(artifact),'sha256':digest,'files':len(data),'bytes':artifact.stat().st_size,'version':version,'commit':commit,'workingTreeModified':dirty},indent=2))
    return artifact

if __name__ == '__main__':
    args=argparse.ArgumentParser(description=__doc__)
    args.add_argument('--output', default='tools/dist/release')
    args.add_argument('--version', required=True)
    args.add_argument('--check-version', action='store_true', help='Validate the release number without building')
    a=args.parse_args()
    if a.check_version:
        validate_version(a.version)
    else:
        package(a.output,a.version)
