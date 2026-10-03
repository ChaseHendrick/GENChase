"""Independent branch group shards. This helper does not change proof sources or promote paper status."""
import argparse
import hashlib
import importlib
import json
import math
import os
from pathlib import Path
import shutil
import sys
import time
from fractions import Fraction

ROOT = Path(__file__).resolve().parents[2]
FOURIER = ROOT / 'research/cardiac-cycle-certificates/fourier'
HISTORICAL = FOURIER / 'data/branch'
for variable in ('OMP_NUM_THREADS', 'OPENBLAS_NUM_THREADS', 'MKL_NUM_THREADS', 'BLIS_NUM_THREADS',
                 'VECLIB_MAXIMUM_THREADS', 'NUMEXPR_NUM_THREADS'):
    os.environ[variable] = '1'


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f'duplicate JSON key: {key}')
        result[key] = value
    return result


def check_diagnostic_numbers(value, path=()):
    """Preserve the three legacy positive-Infinity strip diagnostics, never proof bounds."""
    if isinstance(value, dict):
        for key, child in value.items():
            check_diagnostic_numbers(child, path + (key,))
    elif isinstance(value, list):
        for child in value:
            check_diagnostic_numbers(child, path + ('[]',))
    elif isinstance(value, float) and not math.isfinite(value):
        permitted = {('rec', 'strips', strip, 'S_over_L_max') for strip in ('J', 'dg_f', 'dg_J')}
        if value != math.inf or path not in permitted:
            raise ValueError(f'nonfinite number outside legacy strip diagnostic: {path}')


def read_jsonl(path):
    raw = Path(path).read_bytes()
    if raw and not raw.endswith(b'\n'):
        raise ValueError(f'incomplete JSONL tail: {path}')
    records = [json.loads(line, object_pairs_hook=unique_object)
               for line in raw.splitlines() if line.strip()]
    if any(not isinstance(r, dict) for r in records):
        raise ValueError(f'nonobject JSONL record: {path}')
    for record in records:
        check_diagnostic_numbers(record)
    return records


def write_new(path, records):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('x') as fh:
        for record in records:
            check_diagnostic_numbers(record)
            fh.write(json.dumps(record, sort_keys=True) + '\n')
        fh.flush()
        os.fsync(fh.fileno())


def rational_bound(record):
    text = record['hex']
    sign = -1 if text.startswith('-') else 1
    mantissa, exponent = text.lstrip('-')[2:].split('p')
    return sign * Fraction(int(mantissa, 16)) * Fraction(2) ** int(exponent)


def groups_for(historical, index, count):
    if type(index) is not int or type(count) is not int or count < 1 or not 0 <= index < count:
        raise ValueError('invalid shard index/count')
    groups = [r for r in historical if r.get('type') == 'group']
    ids = [g['group'] for g in groups]
    if ids != list(range(len(groups))):
        raise ValueError('historical group IDs are not consecutive')
    return [g for g in groups if g['group'] % count == index]


def verify_piece(record, prior, manifest):
    if record.get('type') != 'piece' or type(record.get('group')) is not int or record.get('group') != prior['group']:
        raise ValueError('piece group/type mismatch')
    for key in ('program_sha256', 'sources_sha256'):
        if digest(record.get(key)) != digest(manifest[key]):
            raise ValueError(f'piece {key} mismatch')
    if record.get('input_piece_sha256') != digest(prior):
        raise ValueError('historical piece identity mismatch')
    rec, original = record['rec'], prior['rec']
    if '_obj' in rec or 'MUTATED' in rec:
        raise ValueError('nonpublic or mutated proof output')
    keys = ('g_lo', 'g_hi', 'centre_g', 'centre_sha256', 'eta', 'settings', 'r_star', 'label',
            'hessian_cover', 'K', 'Kprime', 'M', 'omega_bar', 'parameter_half_width')
    if digest({k: rec[k] for k in keys}) != digest({k: original[k] for k in keys}):
        raise ValueError('exact logged inputs/settings changed')
    values = {k: rational_bound(rec[k]) for k in
              ('Y0', 'Z1', 'Z2', 'r_existence', 'r_uniqueness', 'r_star',
               'p_at_r_existence', 'p_at_r_uniqueness', 'contraction_at_r_uniqueness')}
    y, z1, z2 = (values[k] for k in ('Y0', 'Z1', 'Z2'))
    rl, rh, rs = (values[k] for k in ('r_existence', 'r_uniqueness', 'r_star'))
    if not (y >= 0 and 0 <= z1 < 1 and z2 >= 0 and 0 < rl < rh <= rs):
        raise ValueError('invalid exact bounds/radii')
    for radius, name in ((rl, 'p_at_r_existence'), (rh, 'p_at_r_uniqueness')):
        if not y + (z1 - 1) * radius + z2 * radius * radius / 2 <= values[name] < 0:
            raise ValueError('exact radii polynomial is not strictly negative or is underestimated')
    if not z1 + z2 * rh <= values['contraction_at_r_uniqueness'] < 1:
        raise ValueError('exact contraction bound invalid')
    if rational_bound(rec['a1V_margin']) <= 0:
        raise ValueError('nonconstant orbit margin is not strictly positive')
    for key in ('omega', 'T_ms'):
        if not 0 < rational_bound(rec[key]['lower']) <= rational_bound(rec[key]['upper']):
            raise ValueError(f'invalid positive {key} interval')


def verify_shard(records, historical, manifest, index, count):
    selected = groups_for(historical, index, count)
    ids = {g['group'] for g in selected}
    expected = {r['rec']['label']: r for r in historical if r.get('type') == 'piece' and r['group'] in ids}
    headers = [r for r in records if r.get('type') == 'reproof_manifest']
    if digest(headers) != digest([manifest]):
        raise ValueError('shard manifest mismatch')
    groups = [r for r in records if r.get('type') == 'group']
    if digest(groups) != digest(selected):
        raise ValueError('shard group metadata incomplete, duplicated or changed')
    pieces = [r for r in records if r.get('type') == 'piece']
    labels = [r['rec']['label'] for r in pieces]
    if len(labels) != len(set(labels)) or set(labels) != set(expected):
        raise ValueError('shard piece coverage missing, duplicated or outside assignment')
    if any(r.get('type') not in ('reproof_manifest', 'group', 'piece') for r in records):
        raise ValueError('unexpected shard record type')
    for record in pieces:
        verify_piece(record, expected[record['rec']['label']], manifest)
    return pieces


def load_branch(data=None):
    if data is not None:
        os.environ['BRANCH_DATA'] = str(data)
    sys.path.insert(0, str(FOURIER))
    br = importlib.import_module('branch')
    importlib.import_module('arbmodel').check_flint()
    return br


def partition(args):
    out = Path(args.out).resolve()
    if out.exists():
        raise ValueError('shard output directory must be new; preserve existing artifacts')
    if out == HISTORICAL or HISTORICAL in out.parents:
        raise ValueError('shard output must be outside canonical branch data')
    data = out / 'data'
    data.mkdir(parents=True)
    for name in ('run_K12.jsonl', 'centres_K12.jsonl', 'points_K12.jsonl', 'points_centres_K32.jsonl'):
        source = HISTORICAL / name
        if source.exists():
            read_jsonl(source)
            shutil.copyfile(source, data / name)
    if args.workers < 1 or args.budget <= 0 or args.count != 6:
        raise ValueError("positive worker/budget and exactly six shards required")
    br = load_branch(data)
    manifest, historical, centres = br.reproof_manifest(12)
    assigned = groups_for(historical, args.index, args.count)
    ids = {g['group'] for g in assigned}
    labels = {r['rec']['label'] for r in historical if r.get('type') == 'piece' and r['group'] in ids}
    (out / 'assignment.json').write_text(json.dumps(dict(index=args.index, count=args.count,
        groups=sorted(ids), labels=sorted(labels), manifest=manifest), indent=2) + '\n')
    br.reprove(12, workers=args.workers, budget_s=args.budget, labels=labels)
    records = read_jsonl(data / 'run_K12_final.jsonl')
    pieces = verify_shard(records, historical, manifest, args.index, args.count)
    # Independently check exact centre hashes through the existing proof implementation.
    bycentre = {r['g']: r for r in centres}
    for piece in pieces:
        rec = piece['rec']
        centre = bycentre[br._dstr(Fraction(rec['centre_g']))]
        om, coeffs = br.centre_from_record(centre)
        if br.centre_digest(om, coeffs) != rec['centre_sha256']:
            raise ValueError('fresh shard centre digest mismatch')
    header = dict(type='shard_header', index=args.index, count=args.count, manifest=manifest,
                  groups=sorted(ids), labels=sorted(labels), runtime=dict(python=sys.version,
                  python_flint=br.flint.__version__, FLINT=br.flint.__FLINT_VERSION__, numpy=br.np.__version__))
    write_new(out / 'shard.jsonl', [header] + records)
    print(json.dumps(dict(shard=args.index, count=args.count, pieces=len(pieces), output=str(out / 'shard.jsonl'))))


def merge_records(paths, historical, manifest):
    allpieces, seen, expected_count = {}, set(), None
    for path in paths:
        records = read_jsonl(path)
        if not records or records[0].get('type') != 'shard_header':
            raise ValueError('missing shard header')
        header, body = records[0], records[1:]
        index, count = header['index'], header['count']
        if type(count) is not int or count != 6:
            raise ValueError('merge requires exactly six shards')
        selected = groups_for(historical, index, count)
        labels = sorted(r['rec']['label'] for r in historical if r.get('type') == 'piece'
                        and r['group'] in {g['group'] for g in selected})
        if (digest(header.get('manifest')) != digest(manifest)
                or digest(header.get('groups')) != digest([g['group'] for g in selected])
                or digest(header.get('labels')) != digest(labels) or index in seen or expected_count not in (None, count)):
            raise ValueError('shard identity/assignment mismatch or duplicate shard')
        expected_count = count
        seen.add(index)
        for piece in verify_shard(body, historical, manifest, index, count):
            label = piece['rec']['label']
            if label in allpieces:
                raise ValueError('duplicate merged piece')
            allpieces[label] = piece
    if expected_count is None or seen != set(range(expected_count)):
        raise ValueError('missing shards')
    original = [r for r in historical if r.get('type') == 'piece']
    if set(allpieces) != {r['rec']['label'] for r in original}:
        raise ValueError('merged exact piece coverage is incomplete')
    result = [manifest]
    for group in [r for r in historical if r.get('type') == 'group']:
        result.extend(allpieces[r['rec']['label']] for r in original if r['group'] == group['group'])
        result.append(group)
    return result


def merge(args):
    out = Path(args.out).resolve()
    if out.name != 'run_K12_final.jsonl':
        raise ValueError('merged output must be named run_K12_final.jsonl')
    record_out = out.with_name('fourier-branch-gks.json')
    if record_out.exists():
        raise ValueError('refuse to overwrite an existing collected record')
    if out.exists() and not args.backup_existing:
        raise ValueError('existing Mac/final log preserved; explicit --backup-existing is required')
    br = load_branch()
    manifest, historical, centres = br.reproof_manifest(12)
    records = merge_records(sorted(Path(args.shards).rglob('shard.jsonl')), historical, manifest)
    if len([r for r in records if r.get('type') == 'piece']) != 712:
        raise ValueError('merge requires exactly 712 distinct pieces')
    # Validate before publishing anything at the requested canonical path.
    br.validate_final(12, records=records, centre_records=centres)
    br.validate_logs(12, reglue=True, repair=False, records=records, centre_records=centres)
    if out.exists():
        if not args.backup_existing:
            raise ValueError('existing Mac/final log preserved; explicit --backup-existing is required')
        backup = out.with_name(out.name + '.backup-' + str(time.time_ns()))
        shutil.copyfile(out, backup)
        out.unlink()
    write_new(out, records)
    old = br.RUN_LOG
    br.RUN_LOG = str(out.parent / 'run_K{K}_final.jsonl')
    try:
        br.validate_final(12)
        result = br.collect(12, write=False)
    finally:
        br.RUN_LOG = old
    with record_out.open('x') as fh:
        fh.write(json.dumps(result, indent=2, allow_nan=False) + '\n')
        fh.flush()
        os.fsync(fh.fileno())
    print(json.dumps(dict(pieces=712, gluings=711, log=str(out), record=str(record_out), status='collected; no status promoted')))


def self_test():
    import copy
    import tempfile
    manifest = dict(type='reproof_manifest', program_sha256='a'*64, sources_sha256={'proof.py':'b'*64})
    bound = lambda text: dict(hex=text)
    original, records = [], []
    for index in range(6):
        rec = dict(label=f'G{index}P0', g_lo=str(index), g_hi=str(index+1), centre_g=str(index),
            centre_sha256='c'*64, eta=['1'], settings={'M':64}, r_star=bound('0x1p-1'),
            hessian_cover='d'*64, K=12, Kprime=24, M=64, omega_bar='0x1p-1',
            parameter_half_width=bound('0x1p-1'), a1V_margin=bound('0x1p-2'),
            omega=dict(lower=bound('0x1p-2'),upper=bound('0x1p-1')),
            T_ms=dict(lower=bound('0x1p1'),upper=bound('0x1p2')),
            Y0=bound('0x1p-6'), Z1=bound('0x1p-2'), Z2=bound('0x1p-2'),
            r_existence=bound('0x1p-4'), r_uniqueness=bound('0x1p-3'),
            p_at_r_existence=bound('-0x1p-6'), p_at_r_uniqueness=bound('-0x1p-5'),
            contraction_at_r_uniqueness=bound('0x1p-1'))
        prior=dict(type='piece', group=index, rec=rec)
        original += [prior, dict(type='group',group=index,n_pieces=1)]
        records.append(dict(prior, program_sha256=manifest['program_sha256'],
            sources_sha256=manifest['sources_sha256'], input_piece_sha256=digest(prior)))
    with tempfile.TemporaryDirectory() as directory:
        paths=[]
        for i in range(6):
            header=dict(type='shard_header',index=i,count=6,manifest=manifest,groups=[i],labels=[f'G{i}P0'])
            path=Path(directory)/f'{i}.jsonl';write_new(path,[header,manifest,records[i],original[2*i+1]]);paths.append(path)
        assert len([r for r in merge_records(paths,original,manifest) if r.get('type')=='piece'])==6
        failures=0
        for badpaths in (paths[:-1],paths+[paths[0]]):
            try:merge_records(badpaths,original,manifest)
            except ValueError:failures+=1
            else:raise AssertionError('invalid shard coverage accepted')
        for key,value in (('input_piece_sha256','bad'),('sources_sha256',{})):
            bad=copy.deepcopy(records[0]);bad[key]=value
            try:verify_piece(bad,original[0],manifest)
            except ValueError:failures+=1
            else:raise AssertionError('stale piece accepted')
        bad=copy.deepcopy(records[0]);bad['rec']['p_at_r_existence']['hex']='0x1p-4'
        try:verify_piece(bad,original[0],manifest)
        except ValueError:failures+=1
        else:raise AssertionError('invalid proof sign accepted')
        tail=Path(directory)/'tail.jsonl'
        for payload in (b'{}', b'{bad}\n', b'{"x":1,"x":2}\n', b'{"x":NaN}\n', b'{"x":Infinity}\n',
                        b'{"rec":{"strips":{"J":{"S_over_L_max":-Infinity}}}}\n'):
            tail.write_bytes(payload)
            try:read_jsonl(tail)
            except ValueError:failures+=1
            else:raise AssertionError('malformed/nonfinite/partial JSON accepted')
        try:write_new(paths[0],[])
        except FileExistsError:failures+=1
        else:raise AssertionError('existing evidence overwritten')
        assert len({g['group'] for i in range(6) for g in groups_for(original,i,6)})==6
        diagnostic=Path(directory)/'diagnostic.jsonl'
        permitted=dict(rec=dict(strips=dict(J=dict(S_over_L_max=math.inf))))
        write_new(diagnostic,[permitted]);assert digest(read_jsonl(diagnostic))==digest([permitted])
        print(json.dumps(dict(positive_merge=True, partition=True, negative_controls=failures)))


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    sub=parser.add_subparsers(dest='command',required=True)
    shard=sub.add_parser('shard');shard.add_argument('--index',type=int,required=True)
    shard.add_argument('--count',type=int,default=6);shard.add_argument('--workers',type=int,default=3)
    shard.add_argument('--budget',type=float,default=2400);shard.add_argument('--out',required=True)
    combine=sub.add_parser('merge');combine.add_argument('--shards',required=True)
    combine.add_argument('--out',required=True);combine.add_argument('--backup-existing',action='store_true')
    sub.add_parser('self-test');args=parser.parse_args()
    try:
        if args.command=='shard':partition(args)
        elif args.command=='merge':merge(args)
        else:self_test()
    except Exception as exc:
        print(json.dumps(dict(status='failed',error=f'{type(exc).__name__}: {exc}')),file=sys.stderr)
        raise SystemExit(1)


if __name__=='__main__':main()
