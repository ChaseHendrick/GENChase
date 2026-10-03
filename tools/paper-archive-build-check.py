#!/usr/bin/env python3
"""Network-free positive and negative controls for branded paper ZIP packaging."""
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import stat
import subprocess
import tempfile
import warnings
import zipfile
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('builder', Path(__file__).with_name('paper-archive-build.py'))
b = importlib.util.module_from_spec(spec)
spec.loader.exec_module(b)

def main():
    if not __debug__:
        raise ValueError('controls require Python assertions enabled')
    count = 0
    def refused(call):
        nonlocal count
        try:
            call()
        except (ValueError, KeyError, OSError, subprocess.SubprocessError):
            count += 1
            return
        raise AssertionError('negative control was accepted')
    for paper in ['../paper', '/paper', 'a/b', 'Paper', '', 'a--b', 'paper\n', True]:
        refused(lambda paper=paper:b.archive_name(paper,'1.2.3'))
    for version in ['v1.2.3','01.2.3','1.2','1.2.3\n','../1.2.3','1.2.3-beta',True]:
        refused(lambda version=version:b.archive_name('test',version))
    registry=json.loads((Path(__file__).resolve().parent.parent/'papers/papers.json').read_text())
    p=next(p for p in registry['papers'] if p.get('pdf'))
    relative=p['pdf'][len('papers/'+p['id']+'/'):]
    with tempfile.TemporaryDirectory(prefix='paper-branded-controls-') as temporary:
        root=Path(temporary);repo=root/'repo';repo.mkdir()
        def git(*args):
            return subprocess.check_output(['git','-C',str(repo),*args],stderr=subprocess.PIPE).decode().strip()
        git('init','-q');git('config','user.name','Fixture');git('config','user.email','fixture@example.invalid')
        pdf=repo/relative;pdf.parent.mkdir(parents=True);pdf.write_bytes(b'%PDF-1.7\nfixture\n%%EOF\n')
        (repo/'README.md').write_text('Fixture\n');(repo/'code').mkdir();(repo/'code/run.py').write_text('print(1)\n')
        git('add','-A');git('commit','-qm','fixture')
        initial=git('rev-parse','HEAD')
        original_check=b.CHECK.check
        def advance_head(paper, repository, ref):
            assert ref==initial
            result=original_check(paper,repository,ref)
            (repo/'README.md').write_text('Concurrent new commit\n')
            git('add','-A');git('commit','-qm','advance during PDF check')
            return result
        with patch.object(b.CHECK,'check',side_effect=advance_head):
            pinned=b.build(p['id'],'9.8.6',repo,root/'pinned')
        assert pinned['commit']==initial and pinned['files_sha256']['README.md']==hashlib.sha256(b'Fixture\n').hexdigest();count+=1
        first=b.build(p['id'],'9.8.7',repo,root/'one');second=b.build(p['id'],'9.8.7',repo,root/'two')
        assert first==second;assert first['filename']==f'HendrickResearch_{p["id"]}_9.8.7.zip';count+=1
        data=(root/'one'/first['filename']).read_bytes();assert hashlib.sha256(data).hexdigest()==first['zip_sha256'];count+=1
        expected={f:(repo/f).read_bytes() for f in first['files_sha256']}
        assert len(b.verify_zip(data,first['root'],expected))==3;count+=1
        refused(lambda:b.build(p['id'],'9.8.7',repo,root/'one'))
        assert (root/'one'/first['filename']).read_bytes()==data;count+=1
        def crafted(rows):
            stream=io.BytesIO()
            with warnings.catch_warnings():
                warnings.simplefilter('ignore',UserWarning)
                with zipfile.ZipFile(stream,'w') as z:
                    for name,content,mode in rows:
                        info=zipfile.ZipInfo(name);info.create_system=3;info.external_attr=mode<<16;z.writestr(info,content)
            return stream.getvalue()
        valid=[(first['root']+'/'+name,content,stat.S_IFREG|0o644) for name,content in expected.items()]
        cases=[valid+valid[:1],valid[:-1],valid+[(first['root']+'/extra',b'x',stat.S_IFREG|0o644)],
               [('other/'+name,content,mode) for name,content,mode in valid],
               valid+[(first['root']+'/../escape',b'x',stat.S_IFREG|0o644)],
               valid+[(first['root']+'/code/',b'../../escape',stat.S_IFLNK|0o777)],
               valid+[(first['root']+'/',b'',stat.S_IFIFO|0o644)],
               valid+[(first['root']+'/',b'',stat.S_IFREG|0o644)],
               valid+[(first['root']+'/',b'payload',stat.S_IFDIR|0o755)],
               [(name,content+b'drift',mode) for name,content,mode in valid]]
        for rows in cases:refused(lambda rows=rows:b.verify_zip(crafted(rows),first['root'],expected))
        assert len(b.verify_zip(crafted(valid+[(first['root']+'/',b'',stat.S_IFDIR|0o755)]),first['root'],expected))==3;count+=1
        (repo/'.gitattributes').write_text('code/* export-ignore\n');git('add','-A');git('commit','-qm','exclude code')
        refused(lambda:b.build(p['id'],'9.8.8',repo,root/'excluded'))
        assert not (root/'excluded').exists();count+=1
        (repo/'.gitattributes').unlink();os.symlink('../external',repo/'link');git('add','-A');git('commit','-qm','plant symlink')
        refused(lambda:b.build(p['id'],'9.8.9',repo,root/'symlink'))
        (repo/'link').unlink();pdf.write_bytes(b'%PDF-1.7\ntruncated\n');git('add','-A');git('commit','-qm','truncate PDF')
        refused(lambda:b.build(p['id'],'9.9.0',repo,root/'truncated'))
    print(f'Branded archive controls passed: {count} network-free checks')

if __name__=='__main__':main()
