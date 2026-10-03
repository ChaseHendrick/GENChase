#!/usr/bin/env python3
"""Build a branded paper ZIP from a committed companion tree, without publishing.

Usage: python3 tools/paper-archive-build.py PAPER VERSION REPO OUTDIR [REF]
Creates HendrickResearch_<paper>_<version>.zip and its external manifest.
Every regular tracked file must survive Git archive unchanged. Existing outputs
are refused. This checks packaging, not scientific validity or PDF freshness.
"""
import hashlib
import importlib.util
import io
import json
from pathlib import Path, PurePosixPath
import re
import stat
import subprocess
import sys
import zipfile

SPEC = importlib.util.spec_from_file_location('paper_archive_check', Path(__file__).with_name('paper-archive-check.py'))
CHECK = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(CHECK)

def archive_name(paper, version):
    if not isinstance(paper, str) or re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', paper) is None:
        raise ValueError('paper id must contain lowercase letters, digits and single separating hyphens')
    if not isinstance(version, str) or re.fullmatch(r'(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)', version) is None:
        raise ValueError('new branded archives require a plain semver version')
    return f'HendrickResearch_{paper}_{version}'

def safe_path(name):
    if (not name or name.startswith('/') or '\\' in name or
            any(ord(c) < 32 or ord(c) == 127 for c in name) or
            any(p in ('', '.', '..') for p in name.split('/')) or
            str(PurePosixPath(name)) != name):
        raise ValueError('unsafe archive member path')

def verify_zip(data, root, expected):
    """Require exactly one root and exact complete regular-file bytes."""
    found, names = {}, set()
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        for info in z.infolist():
            if info.filename in names:
                raise ValueError('duplicate archive member')
            names.add(info.filename)
            mode = info.external_attr >> 16
            if stat.S_ISLNK(mode):
                raise ValueError('archive symlink refused')
            if stat.S_IFMT(mode) not in (0, stat.S_IFREG, stat.S_IFDIR):
                raise ValueError('special archive member refused')
            if info.flag_bits & 1:
                raise ValueError('encrypted archive member refused')
            if info.is_dir():
                if stat.S_IFMT(mode) not in (0, stat.S_IFDIR):
                    raise ValueError('directory name has a file mode')
                if info.filename != root + '/':
                    raise ValueError('unexpected directory or archive root')
                if z.read(info):
                    raise ValueError('directory entry has payload')
                continue
            if stat.S_IFMT(mode) == stat.S_IFDIR:
                raise ValueError('file name has a directory mode')
            if not info.filename.startswith(root + '/'):
                raise ValueError('archive root differs from branded name')
            relative = info.filename[len(root) + 1:]
            safe_path(relative)
            if relative not in expected or z.read(info) != expected[relative]:
                raise ValueError('unexpected or changed archive file')
            found[relative] = hashlib.sha256(z.read(info)).hexdigest()
    if set(found) != set(expected):
        raise ValueError('archive has missing files')
    return found

def build(paper, version, repo, outdir, ref='HEAD'):
    root = archive_name(paper, version)
    def git(*args):
        return subprocess.run(['git', '-C', str(repo), *args], check=True,
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60).stdout
    # The existing registered-PDF gate is preserved and runs before writing.
    commit = git('rev-parse', '--verify', ref + '^{commit}').decode().strip()
    pdf = CHECK.check(paper, str(repo), commit)
    expected = {}
    modes = {}
    for row in git('ls-tree', '-rz', '--full-tree', commit).split(b'\0'):
        if not row:
            continue
        header, raw_name = row.split(b'\t', 1)
        mode, kind, oid = header.decode().split()
        name = raw_name.decode('utf8')
        safe_path(name)
        if kind != 'blob' or mode not in ('100644', '100755'):
            raise ValueError('only regular tracked files belong in the branded paper ZIP')
        expected[name] = git('cat-file', 'blob', oid)
        modes[name] = int(mode, 8)
    if not expected:
        raise ValueError('empty paper archive')
    # Refuse export-ignore/export-subst that omit or alter any expected bytes.
    raw = git('archive', '--format=zip', '--prefix=' + root + '/', commit)
    # Git includes nested directory entries; normalize them away without changing files.
    stream = io.BytesIO()
    with zipfile.ZipFile(io.BytesIO(raw)) as source, zipfile.ZipFile(stream, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as target:
        seen = set()
        for info in source.infolist():
            if info.filename in seen:
                raise ValueError('duplicate source ZIP member')
            seen.add(info.filename)
            if stat.S_ISLNK(info.external_attr >> 16):
                raise ValueError('source ZIP symlink refused')
            if info.is_dir():
                continue
            if not info.filename.startswith(root + '/'):
                raise ValueError('unexpected source ZIP root')
            relative = info.filename[len(root) + 1:]
            safe_path(relative)
            if relative not in expected or source.read(info) != expected[relative]:
                raise ValueError('Git archive changed an expected committed file')
            normalized = zipfile.ZipInfo(info.filename, (1980, 1, 1, 0, 0, 0))
            normalized.create_system = 3
            normalized.external_attr = modes[relative] << 16
            normalized.compress_type = zipfile.ZIP_DEFLATED
            target.writestr(normalized, expected[relative], compresslevel=9)
        target.comment = commit.encode('ascii')
    data = stream.getvalue()
    files = verify_zip(data, root, expected)
    out = Path(outdir)
    out.mkdir(parents=True, exist_ok=True)
    archive = out / (root + '.zip')
    manifest = out / (root + '.manifest.json')
    if archive.exists() or archive.is_symlink() or manifest.exists() or manifest.is_symlink():
        raise ValueError('existing branded archive or manifest is never replaced')
    receipt = {'paper': paper, 'version': version, 'filename': archive.name,
               'root': root, 'commit': commit, 'tree': git('rev-parse', commit + '^{tree}').decode().strip(),
               'zip_sha256': hashlib.sha256(data).hexdigest(), 'pdf': pdf,
               'files_sha256': files, 'file_count': len(files),
               'scope': 'complete committed-file packaging; no scientific validation or publication'}
    # Exclusive opens also refuse a concurrent replacement or a dangling symlink.
    with archive.open('xb') as f:
        f.write(data)
    with manifest.open('x') as f:
        f.write(json.dumps(receipt, indent=2, sort_keys=True) + '\n')
    return receipt

if __name__ == '__main__':
    try:
        if len(sys.argv) not in (5, 6):
            raise ValueError(__doc__.strip())
        print(json.dumps(build(*sys.argv[1:]), sort_keys=True))
    except (ValueError, KeyError, StopIteration, OSError, UnicodeError, subprocess.SubprocessError, zipfile.BadZipFile) as exc:
        print(f'paper-archive-build: {exc}', file=sys.stderr)
        sys.exit(1)
