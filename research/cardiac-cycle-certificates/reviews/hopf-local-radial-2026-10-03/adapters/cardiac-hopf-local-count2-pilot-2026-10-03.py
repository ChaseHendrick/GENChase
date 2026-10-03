"""Isolated two-critical-mode exclusion pilot, never an attraction certificate."""
import ast,hashlib,inspect,json,time,sys
from fractions import Fraction
from pathlib import Path
sys.path.insert(0,str(Path.cwd()))
import hopf as hp
import hopf_stability as hs
import branch_stability as bs

SOURCE_PINS={'hopf_stability.py':'e059814c85311f27774b62f681ea14564290439368975d6eea12f68ce39e8590',
             'branch_stability.py':'b04c1f827867cf5bbba31ed99f10e74cc6469b998ad43d3ad2372235cca59463'}
def assert_pins():
    hp._assert_sources_current();hs.assert_hill_sources()
    for name,digest in SOURCE_PINS.items():
        if hashlib.sha256((hs.HERE/name).read_bytes()).hexdigest()!=digest:
            raise RuntimeError('pinned draft source changed: '+name)
def selector(parent,halfwidth):
    if (parent['idx']!=0 or Fraction(parent['e_lo'])!=0
            or Fraction(parent['e_hi'])!=Fraction(1,500)
            or isinstance(halfwidth,(float,bool)) or Fraction(halfwidth)!=Fraction(1,1000)):
        raise ValueError('only the complete exact first zero-ending piece is allowed')
    return Fraction(0),Fraction(1,500)
def builders():
    assert_pins()
    ns=dict(vars(hs),symmetric_interval=selector)
    exec(compile(ast.parse(inspect.getsource(hs.build_family)),'<first-piece selector adapter>','exec'),ns)
    tree=ast.parse(inspect.getsource(bs._certify_uniform));hits=[]
    class Count(ast.NodeTransformer):
        def visit_Compare(self,node):
            if (isinstance(node.left,ast.Name) and node.left.id=='count' and len(node.ops)==1
                 and isinstance(node.ops[0],ast.NotEq) and len(node.comparators)==1
                 and isinstance(node.comparators[0],ast.Constant) and node.comparators[0].value==1):
                node.comparators[0]=ast.Constant(2);hits.append(1)
            return self.generic_visit(node)
    tree=Count().visit(tree);ast.fix_missing_locations(tree)
    if len(hits)!=1:raise RuntimeError('count guard AST shape changed')
    core=dict(vars(bs));exec(compile(tree,'<two-critical-rank adapter>','exec'),core)
    return ns['build_family'],core['_certify_uniform']
def main():
    t=time.monotonic();builder,core=builders()
    own=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    parent=hp.final_pieces()[0];cover=hp.cover_records()[parent['cover']]
    paths=[Path(hp.DATA)/n for n in ('pieces.jsonl','covers.jsonl',hp.REPROVE_LOG,'theoremA_final.json')]
    pins={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
    out=dict(kind='hopf_first_piece_other16_exclusion_pilot',schema=1,
        model_stability_certified=False,expected_critical_rank=2,
        scope='exclude other16 exponents only on epsilon[0,1/500]; no radial sign or attraction claim',
        adapter_sha256=own,source_pins=SOURCE_PINS,scientific_sources=hp.SOURCE_SHA256,
        hill_sources=bs.SOURCES_SHA256,inputs_sha256=pins)
    try:
        U,meta=builder(parent,cover,halfwidth='1/1000',Ke=12,Kp=64,M=128,centre_K=20,log=print)
        out['family']=meta
        st=dict(bs.DEFAULTS,delta='3e-5',Ke_offset=12)
        with hp.am.precision(int(st['prec'])):
            cert=core(U,st,{},print,int(st['prec']))
        if cert['count_in_Omega']!=2:raise RuntimeError('wrong final cluster count')
        cert['outside_critical_cluster_multiplier_upper']=cert.pop('multiplier_bound_full_period')
        out.update(spectral_certificate=cert,other16_exclusion_passed=True)
    except Exception as exc:
        out.update(error=type(exc).__name__+': '+str(exc),other16_exclusion_passed=False)
    assert_pins()
    if any(hashlib.sha256(p.read_bytes()).hexdigest()!=pins[p.name] for p in paths):
        raise RuntimeError('scientific inputs changed during pilot')
    if hashlib.sha256(Path(__file__).read_bytes()).hexdigest()!=own:raise RuntimeError('adapter changed')
    out['seconds']=time.monotonic()-t
    dest=Path('/private/tmp/cardiac-hopf-local-count2-pilot-2026-10-03.json')
    with dest.open('x') as f:json.dump(out,f,indent=2,sort_keys=True,allow_nan=False);f.write('\n')
    if not out['other16_exclusion_passed']:raise SystemExit(2)
if __name__=='__main__':main()
