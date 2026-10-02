# End of the certified G_Ks branch (Theorem B, `fourier/branch.py`)

Written 2026-10-02T07:50Z by `write_end.py` (session scratchpad) from the logs, after the extension run stopped.
Computed; awaiting adversarial review (the branch's Theorem B record status). No outside review has taken place.

## Coverage

- Branch: [0.027499735464, 0.02778996093] in 57 groups and 712 pieces, every consecutive pair glued by ball inclusion (Theorem B3; `python3 branch.py --collect` re-derives each gluing in Arb).
- Last certified G_Ks: 0.02778996093 (upper end of piece G56P11).
- Gap to g-stop 0.02790: 1.100391e-04. Gap to Erhardt's Hopf value 0.027907858929580 (cited): 1.178980e-04.

## Why the extension stopped here

The run was stopped on 2026-10-02 at 07:49Z at a group boundary (the last line of the run log is the record of group 56; the centres of the interrupted next group are in the centres file but no piece of it was logged), at the coordinator's request: the Hopf bridge record `results/fourier-hopf.json` (computed; awaiting adversarial review) glues the bridge to this branch at G_Ks = 0.02778 (a point proof in the uniqueness balls of piece G53P6 and of the blown-up branch) and states existence from about 0.0277783 (its `bridge_g_covered`) up to the Hopf point. The branch ends about 1.0e-5 past that gluing point. Nothing here depends on the bridge record; it only explains why the run was not continued to 0.02790.

## The last group

- Group 56: [0.027787127095, 0.02778996093], 12 pieces (G56P0 to G56P11), piece widths 2.566e-07 to 2.635e-07.
- Group radii: r_* = 1343445309656161/1152921504606846976 (exact), Hessian cover radii R as logged in the group record.

## The last piece

- Piece G56P11: G_Ks in [0.027789704346, 0.02778996093], centre at G_Ks = 0.027789832638.
- Centre file: `fourier/data/branch/centres_K12.jsonl`, line 752 (the record with "g": "0.027789832638"; K = 12, omega and the coefficients a_{k,m} as exact dyadic hex strings in the scaled variables of `arbmodel.py`). SHA-256 of the centre (branch.centre_digest): 9c2e8a6f458ccff91052736b65b3319b8bc142559e4c0f581e3f45ed551613fd.
- Norm: X = C x (l^1_nu)^18, nu = e^{1/4}, ||x|| = max(|omega| / eta_om, max_k ||a_k||_nu / eta_k), weights eta (exact) = 5794/1048576, 1048576/1048576, 1650/1048576, 8306/1048576, 6023/1048576, 1620/1048576, 77130/1048576, 75783/1048576, 6584/1048576, 20719/1048576, 1641/1048576, 19920/1048576, 38590/1048576, 46236/1048576, 12560/1048576, 38553/1048576, 4297/1048576, 173328/1048576, 28191/1048576.
- Enclosure (existence) radius r_existence = 0.0002863551513669034594838925 (hex 0x4b10f80a67e6fp-62): for every G_Ks of the piece, the branch orbit x*(G_Ks) lies in the closed ball of this radius about the centre.
- Uniqueness radius r_uniqueness = 0.001165253058675736787253019 (hex 0x4c5db3c750c61p-60): x*(G_Ks) is the only zero of F(.; G_Ks) in that closed ball.
- Phase condition Im a_{1,V} = 0 (F_ph = a_{1,V} - a_{-1,V}); omega in [0.1187393013519152246137977, 0.1187424659136692012273429] per ms; period T in [52.91439116001129150390625, 52.91580176353454589843750] ms.
- Y0 = 2.4053e-04, Z1 = 0.0540, Z2 = 740.57, contraction at r_uniqueness 0.9170 (rounded here; exact values in the record).

## Logs at the time of writing

- `fourier/data/branch/run_K12.jsonl`: 769 lines, SHA-256 b761e1b150ec2a1f3165a671c7af570863bd09fce4c1d82ba7c7734ce98eafcb.
- `fourier/data/branch/centres_K12.jsonl`: 764 lines, SHA-256 396610e93cb6b8d233776d88aacdd7a461970f3efd638eb1b8d9e1688b789b36.

To use the end of the branch: read the piece record from the run log (type "piece", rec.label as above), the centre with `branch.centre_from_record`, check `branch.centre_digest`, and use `branch.obj_from_record` for the exact radii and weights (as `branch.point_on_branch` does).
