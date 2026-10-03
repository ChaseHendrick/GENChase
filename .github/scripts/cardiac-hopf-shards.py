"""Isolated Hopf amplitude reproof shards. Collection never promotes publication status."""
import argparse
import ast
import copy
import hashlib
import importlib
import json
import math
import os
from pathlib import Path
import re
import sys
from fractions import Fraction

ROOT = Path(__file__).resolve().parents[2]
FOURIER = ROOT / 'research/cardiac-cycle-certificates/fourier'
INPUTS = FOURIER / 'data/hopf'
INPUT_NAMES = ('pieces.jsonl', 'covers.jsonl', 'theoremA_final.json',
               'gks_points.jsonl', 'gks_points_centres_K32.jsonl')
BRANCH_INPUTS = ('fourier/data/branch/run_K12_final.jsonl', 'fourier/data/branch/run_K12.jsonl',
                 'fourier/data/branch/centres_K12.jsonl', 'results/fourier-branch-gks.json',
                 'fourier/data/branch/points_K12.jsonl', 'fourier/data/branch/points_centres_K32.jsonl')
THEOREM_A_SHA256 = '430e769e30f0502adb5775e2395b5d19529b64b959b357632195b4a0ee4722f6'
for variable in ('OMP_NUM_THREADS', 'OPENBLAS_NUM_THREADS', 'MKL_NUM_THREADS', 'BLIS_NUM_THREADS',
                 'VECLIB_MAXIMUM_THREADS', 'NUMEXPR_NUM_THREADS'):
    os.environ[variable] = '1'


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def digest(value):
    return sha(json.dumps(value, sort_keys=True, separators=(',', ':'), allow_nan=False).encode())


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f'duplicate JSON key: {key}')
        result[key] = value
    return result


def check_numbers(value, diagnostics=False, path=()):
    if isinstance(value, dict):
        for key, child in value.items():
            check_numbers(child, diagnostics, path + (key,))
    elif isinstance(value, list):
        for child in value:
            check_numbers(child, diagnostics, path + ('[]',))
    elif isinstance(value, float) and not math.isfinite(value):
        permitted = {('rec', 'strips', strip, 'S_over_L_max') for strip in ('J', 'dg_f', 'dg_J')}
        if not diagnostics or value != math.inf or path not in permitted:
            raise ValueError(f'nonfinite number outside permitted point diagnostic: {path}')


def parse(raw, diagnostics=False):
    result = json.loads(raw, object_pairs_hook=unique_object)
    if not isinstance(result, dict):
        raise ValueError('JSON record must be an object')
    check_numbers(result, diagnostics)
    return result


def read_jsonl(path, diagnostics=False):
    raw = Path(path).read_bytes()
    if raw and not raw.endswith(b'\n'):
        raise ValueError(f'incomplete JSONL tail: {path}')
    return [parse(line, diagnostics) for line in raw.splitlines() if line.strip()]


def write_new(path, records):
    path = Path(path)
    with path.open('x') as fh:
        for record in records:
            fh.write(json.dumps(record, sort_keys=True, allow_nan=False) + '\n')
        fh.flush()
        os.fsync(fh.fileno())


def new_directory(path):
    path = Path(path).resolve()
    if path == INPUTS or INPUTS in path.parents or path == FOURIER / 'data/branch' or FOURIER / 'data/branch' in path.parents:
        raise ValueError('output must be outside canonical proof data')
    if path.exists():
        raise ValueError('output directory must be new; preserve prior evidence')
    path.mkdir(parents=True)
    return path


def input_bytes():
    out = {}
    for name in INPUT_NAMES:
        path = INPUTS / name
        if not path.exists() and name.startswith('gks_points'):
            continue
        raw = path.read_bytes()
        if name.endswith('.jsonl'):
            read_jsonl(path, diagnostics=name == 'gks_points.jsonl')
        else:
            parse(raw)
        out[name] = raw
    if sha(out['theoremA_final.json']) != THEOREM_A_SHA256:
        raise ValueError('Theorem A is not the accepted immutable 516-interval record')
    return out


def copy_inputs(data, blobs):
    data.mkdir()
    for name, raw in blobs.items():
        with (data / name).open('xb') as fh:
            fh.write(raw)


def load_hopf(data):
    os.environ['HOPF_DATA'] = str(data)
    sys.path.insert(0, str(FOURIER))
    h = importlib.import_module('hopf')
    h.am.check_flint()
    return h


def manifest_for(h, blobs):
    thA = parse(blobs['theoremA_final.json'])
    if (digest(thA.get('sources_sha256')) != digest(h.SOURCE_SHA256)
            or thA.get('code_sha256') != h.CODE_SHA256 or h.check_theoremA_cover(thA).get('ok') is not True):
        raise ValueError('Theorem A structural or current-source check failed')
    branch_hashes = {}
    for name in BRANCH_INPUTS:
        path = FOURIER.parent / name
        raw = path.read_bytes()
        if name.endswith('.jsonl'):
            read_jsonl(path, diagnostics='run_K12' in name or 'points_K12' in name)
        else:
            parse(raw)
        branch_hashes[name] = sha(raw)
    return dict(type='hopf_shard_manifest', code_sha256=h.CODE_SHA256,
                sources_sha256=dict(h.SOURCE_SHA256), inputs_sha256={k: sha(v) for k, v in blobs.items()},
                branch_inputs_sha256=branch_hashes, orchestrator_sha256=sha(Path(__file__).read_bytes()),
                expected_pieces=68, eps_range=['0', '6427/50000'])


def assignment(lines, index, count):
    if type(index) is not int or type(count) is not int or count != 6 or not 0 <= index < count:
        raise ValueError('require shard index 0..5 and exactly six shards')
    if sorted(lines) != list(range(68)):
        raise ValueError('assignment requires all 68 distinct historical pieces')
    groups = {}
    for i, (piece, _) in sorted(lines.items()):
        groups.setdefault(piece['cover'], []).append(i)
    selected = [cover for ordinal, cover in enumerate(groups) if ordinal % count == index]
    return selected, sorted(i for cover in selected for i in groups[cover])


def verify_receipts(h, records, lines, covers, wanted):
    ids = [r.get('idx') for r in records]
    if (any(type(i) is not int for i in ids) or len(ids) != len(set(ids))
            or set(ids) != set(wanted)):
        raise ValueError('missing, duplicated or outside-assignment receipt indices')
    for r in records:
        i = r['idx']; piece, line_sha = lines[i]
        result = r.get('result', {})
        if 'MUTATED' in r or '_obj' in r:
            raise ValueError(f'piece {i}: mutated or nonpublic receipt')
        bounds = [result[key] for key in h.REPROVE_KEYS]
        bounds += [result[key][side] for key in ('g', 'omega', 'T_ms') for side in ('lower', 'upper')]
        if any(type(b['hex']) is not str or re.fullmatch(r'-?0x[0-9a-fA-F]+p[+-]?[0-9]+', b['hex']) is None for b in bounds):
            raise ValueError(f'piece {i}: malformed exact hexadecimal bound')
        if (r.get('type') != 'reprove' or r.get('code_sha256') != h.CODE_SHA256
                or digest(r.get('sources_sha256')) != digest(h.SOURCE_SHA256)
                or r.get('piece_line_sha256') != line_sha or not h._reproof_matches(r, piece, covers)):
            raise ValueError(f'piece {i}: current-source/input/settings/exact-bound acceptance failed')
        # Type-sensitive identities supplement the scientific Boolean gate.
        for key in ('cover', 'e_lo', 'e_hi'):
            if digest(r.get(key)) != digest(piece[key]):
                raise ValueError(f'piece {i}: changed typed {key}')
        if digest(r.get('values')) != digest(h._exact_values(r['result'])):
            raise ValueError(f'piece {i}: inconsistent exact result values')
    return sorted(records, key=lambda r: r['idx'])


def shard(args):
    if args.workers < 1 or not math.isfinite(args.budget) or args.budget <= 0:
        raise ValueError('positive workers and finite budget required')
    blobs = input_bytes()
    out = new_directory(args.out); data = out / 'data'; copy_inputs(data, blobs)
    h = load_hopf(data); manifest = manifest_for(h, blobs)
    lines, covers = h.piece_lines(data), h.cover_records(data)
    h.validate_piece_inputs(lines, covers)
    selected, wanted = assignment(lines, args.index, args.count)
    header = dict(type='hopf_shard_header', index=args.index, count=args.count,
                  covers=selected, pieces=wanted, manifest=manifest,
                  runtime=dict(python=sys.version, python_flint=h.flint.__version__,
                               FLINT=h.flint.__FLINT_VERSION__, numpy=h.np.__version__))
    write_new(out / 'assignment.jsonl', [header])
    path = data / h.REPROVE_LOG
    if path.exists():
        raise ValueError('new shard must start without receipts, including pilots')
    h.reprove_all(pieces=wanted, workers=args.workers, budget_s=args.budget, data=data, out_path=str(path))
    records = verify_receipts(h, read_jsonl(path), lines, covers, wanted)
    h._assert_sources_current()
    if digest(manifest_for(h, input_bytes())) != digest(manifest):
        raise ValueError('frozen accepted inputs changed during shard calculation')
    write_new(out / 'shard.jsonl', [header] + records)
    print(json.dumps(dict(status='shard complete', shard=args.index, pieces=len(records), artifact=str(out / 'shard.jsonl'))))


def merge_records(h, paths, lines, covers, manifest):
    seen, allrecords = set(), []
    for path in paths:
        rows = read_jsonl(path)
        if not rows or rows[0].get('type') != 'hopf_shard_header':
            raise ValueError('missing shard header')
        head = rows[0]; index, count = head['index'], head['count']
        selected, wanted = assignment(lines, index, count)
        if (index in seen or digest(head.get('manifest')) != digest(manifest)
                or digest(head.get('covers')) != digest(selected) or digest(head.get('pieces')) != digest(wanted)):
            raise ValueError('duplicate shard or changed source/input/cover assignment')
        seen.add(index)
        allrecords.extend(verify_receipts(h, rows[1:], lines, covers, wanted))
    if seen != set(range(6)):
        raise ValueError('all six complete shards required')
    return verify_receipts(h, allrecords, lines, covers, list(range(68)))


def merge(args):
    blobs = input_bytes()
    out = new_directory(args.out); data = out / 'data'; copy_inputs(data, blobs)
    h = load_hopf(data); manifest = manifest_for(h, blobs)
    lines, covers = h.piece_lines(data), h.cover_records(data)
    h.validate_piece_inputs(lines, covers)
    records = merge_records(h, sorted(Path(args.shards).rglob('shard.jsonl')), lines, covers, manifest)
    # Only isolated data receives the merged actual receipts. Canonical inputs and results are unchanged.
    write_new(data / h.REPROVE_LOG, records)
    # Historical point inputs remain preserved, but never seed the fresh bridge point receipt.
    for name in ('gks_points.jsonl', 'gks_points_centres_K32.jsonl'):
        path = data / name
        if path.exists():
            path.rename(data / (name + '.historical'))
    fresh_points = h.gks_point_proofs(['0.02778'], stability=False, data=data, K=32)
    admitted, _ = h.gks_points(data)
    if len(fresh_points) != 1 or len(admitted) != 1 or admitted[0]['source'] != 'hopf':
        raise ValueError('fresh existence-only bridge point was not admitted with current sources')
    result = h.collect(write=False, data=data)
    if (result.get('n_pieces') != 68 or result.get('gluing_eps_pieces', {}).get('n') != 67
            or result.get('identification_at_eps0', {}).get('ok') is not True
            or result.get('hopf_gap_closed') is not True or result.get('bridge_checks', {}).get('ok') is not True):
        raise ValueError('complete fresh amplitude/gluing/zero-amplitude/final-branch bridge admission failed')
    snapshot = result['bridge_checks']['gks_branch_snapshot']
    if snapshot.get('n_pieces') != 712 or snapshot.get('consecutive_gluings_rederived') != 711:
        raise ValueError('bridge did not use the complete accepted final branch')
    h._assert_sources_current()
    if digest(manifest_for(h, input_bytes())) != digest(manifest):
        raise ValueError('accepted branch or point inputs changed during collection')
    write_new(data / 'gluing_gks_final.json', [result['bridge_checks']])
    write_new(out / 'fourier-hopf.json', [result])
    write_new(out / 'merge-receipt.json', [dict(manifest=manifest, n_pieces=68, n_gluings=67,
        reproof_sha256=sha((data / h.REPROVE_LOG).read_bytes()),
        result_sha256=sha((out / 'fourier-hopf.json').read_bytes()), branch_snapshot=snapshot,
        bridge_point_existence_reproof_performed=True,
        point_stability_reproof_performed=False,
        point_inputs_scope='Historical point inputs preserved and pinned, but excluded from bridge admission. '
                           'The isolated G_Ks=0.02778 point existence proof and memberships are fresh. '
                           'No Stage S or uniform stability reproof is claimed.',
        status='complete numerical collection; independent final review pending; no publication status promoted')])
    print(json.dumps(dict(status='collected; independent review pending', pieces=68, gluings=67,
                          identification_at_eps0=True, bridge=True, output=str(out))))


def self_test():
    """Run the frozen exact receipt gate via AST extraction, without importing a numerical runtime."""
    import tempfile
    import types
    source = ast.parse((FOURIER / 'hopf.py').read_text())
    names = {'hex_fraction', '_result_certified', '_exact_values', '_reproof_matches', '_record_digest'}
    env = dict(Fraction=Fraction, hashlib=hashlib, json=json, flint=types.SimpleNamespace(__version__='0.9.0'))
    for node in source.body:
        if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id in ('REPROVE_KEYS', 'PIECE_DEFAULTS') for t in node.targets):
            exec(compile(ast.Module(body=[node], type_ignores=[]), '<frozen settings>', 'exec'), env)
        elif isinstance(node, ast.FunctionDef) and node.name in names:
            exec(compile(ast.Module(body=[node], type_ignores=[]), '<frozen gate>', 'exec'), env)
    h = types.SimpleNamespace(CODE_SHA256='a'*64, SOURCE_SHA256={'proof.py':'b'*64},
                             REPROVE_KEYS=env['REPROVE_KEYS'],
                             _reproof_matches=env['_reproof_matches'], _exact_values=env['_exact_values'])
    bound = lambda text: dict(hex=text)
    lines, covers, receipts = {}, {}, []
    for i in range(68):
        cover=f'C{i//4}';covers[cover]=dict(id=cover)
        result=dict(e_lo=str(i),e_hi=str(i+1),e_c=str(Fraction(2*i+1,2)),K=8,Kprime=16,M=64,
            centre_sha256='c'*64,cover=cover,eta=['1'],r_star=bound('0x1p-1'),
            Y0=bound('0x1p-6'),Z1=bound('0x1p-2'),Z2=bound('0x1p-2'),
            r_existence=bound('0x1p-4'),r_uniqueness=bound('0x1p-3'),
            p_at_r_existence=bound('-0x1p-6'),p_at_r_uniqueness=bound('-0x1p-5'),
            contraction_at_r_uniqueness=bound('0x1p-1'))
        for key in ('g','omega','T_ms'):result[key]=dict(lower=bound('0x1p-2'),upper=bound('0x1p-1'))
        piece=dict(idx=i,cover=cover,e_lo=str(i),e_hi=str(i+1),eta=['1'],r_star=bound('0x1p-1'),
                   settings=dict(M=64,nsub_xi=2,nsub_s=2,rho0='1/8'),result=result)
        lines[i]=(piece,str(i))
        receipts.append(dict(type='reprove',idx=i,cover=cover,e_lo=piece['e_lo'],e_hi=piece['e_hi'],
            code_sha256=h.CODE_SHA256,sources_sha256=h.SOURCE_SHA256,piece_line_sha256=str(i),
            certified=True,centre_digest_ok=True,cover_digest_reproduced=True,result=result,
            values=h._exact_values(result),python_flint='0.9.0',cover_record_sha256=digest(covers[cover]),
            effective_settings=dict(env['PIECE_DEFAULTS'],**piece['settings'])))
    manifest=dict(type='hopf_shard_manifest',code_sha256=h.CODE_SHA256,sources_sha256=h.SOURCE_SHA256)
    failures=0
    with tempfile.TemporaryDirectory() as directory:
        paths=[]
        for index in range(6):
            selected,wanted=assignment(lines,index,6);path=Path(directory)/f'{index}.jsonl'
            head=dict(type='hopf_shard_header',index=index,count=6,covers=selected,pieces=wanted,manifest=manifest)
            write_new(path,[head]+[receipts[i] for i in wanted]);paths.append(path)
        assert len(merge_records(h,paths,lines,covers,manifest))==68
        for bad in (paths[:-1],paths+[paths[0]]):
            try:merge_records(h,bad,lines,covers,manifest)
            except ValueError:failures+=1
            else:raise AssertionError('invalid shard coverage admitted')
        for key,value in (('code_sha256','stale'),('piece_line_sha256','stale'),('sources_sha256',{}),
                          ('effective_settings',dict(receipts[0]['effective_settings'],M=64.0))):
            bad=copy.deepcopy(receipts[0]);bad[key]=value
            try:verify_receipts(h,[bad],lines,covers,[0])
            except ValueError:failures+=1
            else:raise AssertionError('stale/typed mismatch admitted')
        for mutation in ('polynomial','MUTATED','duplicate','missing','cover','bad-hex','top-MUTATED'):
            bad=copy.deepcopy(receipts[0]);rows=[bad]
            if mutation=='polynomial':bad['result']['p_at_r_existence']['hex']='0x1p-4'
            elif mutation=='MUTATED':bad['result']['MUTATED']=[]
            elif mutation=='duplicate':rows.append(bad)
            elif mutation=='missing':rows=[]
            elif mutation=='bad-hex':bad['result']['Y0']['hex']='zz1p-6'
            elif mutation=='top-MUTATED':bad['MUTATED']=[]
            else:bad['cover']='wrong'
            try:verify_receipts(h,rows,lines,covers,[0])
            except ValueError:failures+=1
            else:raise AssertionError('invalid result admitted')
        path=Path(directory)/'bad.jsonl'
        for raw in (b'{}',b'{bad}\n',b'{"idx":0,"idx":1}\n',b'{"x":NaN}\n',b'{"x":Infinity}\n'):
            path.write_bytes(raw)
            try:read_jsonl(path)
            except ValueError:failures+=1
            else:raise AssertionError('malformed evidence admitted')
        try:write_new(paths[0],[])
        except FileExistsError:failures+=1
        else:raise AssertionError('evidence overwritten')
    print(json.dumps(dict(positive_merge=True,whole_cover_partition=True,negative_controls=failures)))


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    sub=parser.add_subparsers(dest='command',required=True)
    run=sub.add_parser('shard');run.add_argument('--index',type=int,required=True)
    run.add_argument('--count',type=int,default=6);run.add_argument('--workers',type=int,default=3)
    run.add_argument('--budget',type=float,default=2400);run.add_argument('--out',required=True)
    merge_parser=sub.add_parser('merge');merge_parser.add_argument('--shards',required=True)
    merge_parser.add_argument('--out',required=True);sub.add_parser('self-test');args=parser.parse_args()
    try:
        if args.command=='shard':shard(args)
        elif args.command=='merge':merge(args)
        else:self_test()
    except Exception as exc:
        print(json.dumps(dict(status='failed',error=f'{type(exc).__name__}: {exc}')),file=sys.stderr)
        raise SystemExit(1)


if __name__=='__main__':main()
