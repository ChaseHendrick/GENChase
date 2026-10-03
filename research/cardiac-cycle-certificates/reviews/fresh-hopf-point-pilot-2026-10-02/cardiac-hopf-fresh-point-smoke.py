import copy
import json
import os
import sys
import tempfile
sys.path.insert(0, '/Users/chasehendrick/Documents/Codex/2026-09-29/github-plugin-github-openai-curated-remote/work/cardiac-rings-1.1.0-2026-10-02/research/cardiac-cycle-certificates/fourier')
import hopf as h
data = tempfile.mkdtemp(prefix='cardiac-hopf-fresh-point-')
print(json.dumps(dict(data=data, source=h.CODE_SHA256)), flush=True)
records = h.gks_point_proofs(['0.02778'], stability=False, data=data, K=32)
points, centres = h.gks_points(data)
assert len(records) == 1 and len(points) == 1
assert records[0]['ok_existence'] is True and records[0]['ok'] is False
assert records[0]['stability'] == 'not run'
centre = centres[('hopf', records[0]['g'])]
assert h._gks_point_matches(records[0], centre)
controls = 0
for key, value in [('code_sha256', 'stale'), ('sources_sha256', {}), ('MUTATED', []),
                   ('effective_settings', dict(records[0]['effective_settings'], M=192.0))]:
    bad = copy.deepcopy(records[0]); bad[key] = value
    assert not h._gks_point_matches(bad, centre); controls += 1
for key, value in [('p_at_r_existence', {'hex':'0x1p1'}), ('Kprime', 1), ('centre_g', '0.02779')]:
    bad = copy.deepcopy(records[0]); bad['rec'][key] = value
    assert not h._gks_point_matches(bad, centre); controls += 1
print(json.dumps(dict(status='passed', fresh_point=True, stability_reproved=False,
                     negative_controls=controls, data=data, source=h.CODE_SHA256)), flush=True)
