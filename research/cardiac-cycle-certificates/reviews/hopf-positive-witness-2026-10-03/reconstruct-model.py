"""Actual bounded reconstruction trial for saved positive-family primitives."""
import argparse
import gzip
import json
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/"fourier"))
import model_enclosure_replay as mr

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--input-dir",required=True)
    p.add_argument("--output",required=True)
    args=p.parse_args()
    root=Path(args.input_dir)
    with gzip.open(root/"witness.json.gz","rt") as f:
        witness=json.load(f)
    family=json.loads((root/"family.json").read_text())
    op=witness["operator"]
    tube=dict(state_radii=[x["hex"] for x in family["tube"]],
              conductance_radius=family["parameter_tube"]["hex"],
              frequency_radius=str(mr.rational(family["existence"]["eta"][0])*
                                   mr.rational(family["existence"]["r_existence"]["hex"])))
    pins=mr.source_pins()
    inputs={str(path):mr.hashlib.sha256(path.read_bytes()).hexdigest()
            for path in (root/"witness.json.gz",root/"family.json",Path(__file__))}
    centre=family["proposal"]["exact_centre"]
    out=dict(schema="cardiac-model-reconstruction-pilot/1",status="failed",inputs=inputs,
             checker_sources=pins,scope="one exact saved positive-amplitude family; explicit existence/literal-model premises")
    try:
        result=mr.verify_affine(op,centre,[family["e_lo"],family["e_hi"]],tube,
                               expected_operator_sha256=mr.canonical_hash(op),expected_sources=pins,
                               M=128,nx=32,ny=8,subdivisions=8,precision=256,
                               progress=lambda s:print(s,flush=True))
        out.update(status="passed",result=result)
    except Exception as err:
        out["error"]=type(err).__name__+": "+str(err)
    if mr.source_pins()!=pins or any(mr.hashlib.sha256(Path(path).read_bytes()).hexdigest()!=digest for path,digest in inputs.items()):
        raise RuntimeError("checker/input changed during actual trial")
    with open(args.output,"x") as f:
        json.dump(out,f,indent=2,allow_nan=False)
        f.write("\n")
    print(json.dumps(out),flush=True)
    return 0 if out["status"]=="passed" else 1

if __name__=="__main__":
    raise SystemExit(main())

