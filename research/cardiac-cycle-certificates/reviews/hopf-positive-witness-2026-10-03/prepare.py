"""Bounded draft witness capture for one positive-amplitude Hopf subpiece.

A capture is no full-bridge conclusion. This does not change any admitted
historical record and refuses existing output paths.
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path
from fractions import Fraction
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "fourier"))
import hopf_stability as hs
import hopf as hp
import branch_stability as bs
import stability_witness as sw

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--output-dir", required=True)
    args = p.parse_args()
    out = Path(args.output_dir)
    out.mkdir(parents=True, exist_ok=False)
    root = Path(hs.HERE).parent
    sources = dict(hp.SOURCE_SHA256)
    sources.update(bs.SOURCES_SHA256)
    for path in (Path(hs.__file__), Path(sw.__file__), Path(sw.__file__).with_name("certificate_replay.py"), Path(__file__)):
        sources[str(path.resolve().relative_to(root))] = sw.sha(path)
    inputs = {str((Path(hp.DATA)/name).relative_to(root)): sw.sha(Path(hp.DATA)/name)
              for name in ("pieces.jsonl", "covers.jsonl", hp.REPROVE_LOG)}
    parent = {r["idx"]: r for r in hp.final_pieces()}[4]
    cover = hp.cover_records()[parent["cover"]]
    U, meta = hs.build_family(parent, cover, halfwidth="1/1000000", centre_K=20, M=128, Kp=64)
    settings = dict(bs.DEFAULTS, delta="1e-6", Ke_offset=12)
    domain = [meta["e_lo"], meta["e_hi"]]
    bindings = dict(identity="hopf-positive-p4-K20-h1e-6", settings=settings,
                    sources=sources, inputs=inputs, domain=domain,
                    parameter_center=str(sum(Fraction(x) for x in domain)/2),
                    geometry=dict(N=1,DIM=18,IV=0,Ke=12,nA=64,nc=settings["n_c"],D="1/64000",expected_count=1),
                    trust="admitted parent identification and existence; independently reviewable Jacobian enclosure construction")
    witness, result, receipt = sw.capture(lambda: bs.certify_uniform(U,settings=settings),
                                           bs._certify_uniform,bindings)
    for group in (sources,inputs):
        for path,digest in group.items():
            if sw.sha(root/path)!=digest:
                raise RuntimeError("source/input changed during capture: "+path)
    sw.write(witness,out/"witness.json.gz")
    for name,value in (("bindings.json",bindings),("family.json",meta),("native-result.json",result),("capture-receipt.json",receipt)):
        with (out/name).open("x") as f:
            json.dump(value,f,indent=2,allow_nan=False)
            f.write("\n")
    print(json.dumps(dict(status="passed",capture=receipt,scope="one positive-amplitude subpiece")),flush=True)

if __name__=="__main__":
    main()

