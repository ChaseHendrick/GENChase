# End of the certified G_Ks branch (Theorem B, `fourier/branch.py`)

Written 2026-10-02T07:06Z by `write_end.py` (session scratchpad) from the logs, while the extension is still running: an interim snapshot; the logs are the reference.
Computed; awaiting adversarial review (the branch's Theorem B record status). No outside review has taken place.

## Coverage

- Branch: [0.027499735464, 0.027768853647] in 50 groups and 628 pieces, every consecutive pair glued by ball inclusion (Theorem B3; `python3 branch.py --collect` re-derives each gluing in Arb).
- Last certified G_Ks: 0.027768853647 (upper end of piece G49P11).
- Gap to g-stop 279/10000: 1.311464e-04. Gap to Erhardt's Hopf value 1395392946479/50000000000000 (cited): 1.390053e-04.

## The last group

- Group 49: [0.027765514044, 0.027768853647], 12 pieces (G49P0 to G49P11), piece widths 3.026e-07 to 3.103e-07.
- Group radii: r_* = 1485408904077402/1152921504606846976 (exact), Hessian cover radii R as logged in the group record.

## The last piece

- Piece G49P11: G_Ks in [0.027768551091, 0.027768853647], centre at G_Ks = 0.027768702369.
- Centre file: `fourier/data/branch/centres_K12.jsonl`, line 668 (the record with "g": "0.027768702369"; K = 12, omega and the coefficients a_{k,m} as exact dyadic hex strings in the scaled variables of `arbmodel.py`). SHA-256 of the centre (branch.centre_digest): 8162cf8f2871e75e2a6b0ce46b858faf949d6b47a6640d4d02c2d0f352b7f0ed.
- Norm: X = C x (l^1_nu)^18, nu = e^{1/4}, ||x|| = max(|omega| / eta_om, max_k ||a_k||_nu / eta_k), weights eta (exact) = 5794/1048576, 1048576/1048576, 1650/1048576, 8306/1048576, 6023/1048576, 1620/1048576, 77130/1048576, 75783/1048576, 6584/1048576, 20719/1048576, 1641/1048576, 19920/1048576, 38590/1048576, 46236/1048576, 12560/1048576, 38553/1048576, 4297/1048576, 173328/1048576, 28191/1048576.
- Enclosure (existence) radius r_existence = 0.0003169461831075471073236594 (hex 0x14c5797db4ba67p-64): for every G_Ks of the piece, the branch orbit x*(G_Ks) lies in the closed ball of this radius about the centre.
- Uniqueness radius r_uniqueness = 0.001288386848664025211008700 (hex 0x2a37c5b09702dp-59): x*(G_Ks) is the only zero of F(.; G_Ks) in that closed ball.
- Phase condition Im a_{1,V} = 0 (F_ph = a_{1,V} - a_{-1,V}); omega in [0.1186313356019941395169681, 0.1186348382306807863750820] per ms; period T in [52.96239602565765380859375, 52.96396011114120483398438] ms.
- Y0 = 2.6482e-04, Z1 = 0.0591, Z2 = 665.22, contraction at r_uniqueness 0.9161 (rounded here; exact values in the record).

## Logs at the time of writing

- `fourier/data/branch/run_K12.jsonl`: 678 lines, SHA-256 b390b565f97a0938d48e6a49ebdcc00c8e6d212d4490e57186cd7a373a81f905.
- `fourier/data/branch/centres_K12.jsonl`: 680 lines, SHA-256 2fc38caefa7cbcc92db45fbb2483c1c0a8376fec8211eb3416789797c09dfbd8.

To use the end of the branch: read the piece record from the run log (type "piece", rec.label as above), the centre with `branch.centre_from_record`, check `branch.centre_digest`, and use `branch.obj_from_record` for the exact radii and weights (as `branch.point_on_branch` does).
