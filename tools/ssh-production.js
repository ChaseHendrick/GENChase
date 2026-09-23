'use strict';
// Actual ssh.js diagonalization and plate field against the independent Jacobi reference in
// tools/lib/ssh-reference.js, analytic Bloch energies and the analytic open-chain edge mode.
// node tools/ssh-production.js [--write]
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { load, replaceOnce, root } = require('./science-harness');
const ref = require('./lib/ssh-reference');
const { referencePlate: plate } = require('./lib/ssh-plate');
const sha = text => crypto.createHash('sha256').update(text).digest('hex');
const production = load('ssh', { names: 'sshEigen', capture: 'field,metric,extra,midE,W,H' });

// The plate rule rebuilt from the independent Jacobi eigenpairs (tools/lib/ssh-plate.js).
const referencePlate = (n, H, v, w, periodic) => plate(ref.sshHamiltonian(n, v, w, { periodic }), H, v, w);
const maxDiff = (a, b) => { let m = 0; for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i])); return m; };

function audit(fixture, subject = production) {
  const { grid, aspect, v, w, bc } = fixture, periodic = bc === 'periodic';
  const r = subject.compute({ grid, aspect, intra: v, w, bc }), n = r.W;
  const e = subject.hooks.sshEigen(n, v, w, periodic), Hm = ref.sshHamiltonian(n, v, w, { periodic });
  const R = referencePlate(n, r.H, v, w, periodic);
  let residual = 0, orthogonality = 0;
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < n; a++) {
      let s = 0;
      for (let b = 0; b < n; b++) s += Hm[a][b] * e.vectors[i][b];
      residual = Math.max(residual, Math.abs(s - e.values[i] * e.vectors[i][a]));
    }
    for (let j = i; j < n; j++) {
      let d = 0;
      for (let a = 0; a < n; a++) d += e.vectors[i][a] * e.vectors[j][a];
      orthogonality = Math.max(orthogonality, Math.abs(d - (i === j ? 1 : 0)));
    }
  }
  const row = {
    ...fixture, cells: [r.W, r.H], degenerateClusters: R.clusters,
    eigenvalueError: maxDiff(e.values, R.values), residual, orthogonality,
    fieldMaxError: maxDiff(r.field, R.field), fieldWords: r.field.length,
    endWeight: r.metric, endWeightError: Math.abs(r.metric - R.endWeight),
    midGapEnergy: r.midE, midGapEnergyError: Math.abs(r.midE - R.midE), winding: r.extra,
  };
  if (periodic) row.blochEnergyError = maxDiff(e.values, ref.analyticBulkEnergies(v, w, n / 2));
  else if (w > v) {
    // Weight of the analytic left zero mode inside the production mid-gap pair.
    const left = ref.analyticLeftEdge(n, v, w), pairIdx = e.values.map((x, i) => i).sort((a, b) => Math.abs(e.values[a]) - Math.abs(e.values[b])).slice(0, 2);
    row.leftEdgeCapture = pairIdx.reduce((s, m) => s + ref.overlapAbs(left, e.vectors[m]) ** 2, 0);
  }
  return row;
}
const pass = r => r.eigenvalueError < 1e-12 && r.residual < 1e-12 && r.orthogonality < 1e-12 && r.fieldMaxError < 1e-7 &&
  r.endWeightError < 1e-9 && r.midGapEnergyError < 1e-12 && (r.blochEnergyError === undefined || r.blochEnergyError < 1e-12);

const PRESETS = {
  topo: { v: 0.4, w: 1.2, bc: 'open' }, triv: { v: 1.2, w: 0.4, bc: 'open' }, ring: { v: 0.4, w: 1.2, bc: 'periodic' },
  edge: { v: 0.2, w: 1.4, bc: 'open' }, crit: { v: 0.9, w: 0.95, bc: 'open' }, log: { v: 0.35, w: 1.25, bc: 'open' },
  default: { v: 0.45, w: 1.15, bc: 'open' },
};
const fixtures = [];
for (const [name, p] of Object.entries(PRESETS)) fixtures.push({ name, grid: 96, aspect: '4:5', ...p });
for (const grid of [64, 160]) for (const aspect of ['1:1', '16:9']) for (const name of ['topo', 'triv', 'ring']) fixtures.push({ name, grid, aspect, ...PRESETS[name] });
fixtures.push({ name: 'balanced-open', grid: 96, aspect: '4:5', v: 1, w: 1, bc: 'open' }, { name: 'balanced-ring', grid: 96, aspect: '4:5', v: 1, w: 1, bc: 'periodic' });

const rows = fixtures.map(f => audit(f));
for (const r of rows) assert(pass(r), 'production disagrees with reference: ' + JSON.stringify(r));
const byName = Object.fromEntries(rows.filter(r => r.grid === 96).map(r => [r.name, r]));
// Physics read from the measured plates, not imposed on them.
assert(['topo', 'edge', 'log', 'default'].every(k => byName[k].endWeight > 0.99 && byName[k].midGapEnergy < 1e-10 && byName[k].leftEdgeCapture > 0.999));
assert(byName.triv.endWeight < 0.05 && byName.triv.midGapEnergy > 0.7);
for (const k of ['ring', 'balanced-ring']) assert(Math.abs(byName[k].endWeight - 18 / 96) < 1e-12);
assert(Math.abs(byName.ring.midGapEnergy - 0.8) < 1e-12 && byName['balanced-ring'].midGapEnergy < 1e-12);

// Failure controls on the actual module source.
const swapped = load('ssh', { names: 'sshEigen', capture: 'field,metric,extra,midE,W,H',
  mutate: s => replaceOnce(s, 'V[i][i + 1] = V[i + 1][i] = i % 2 === 0 ? v : w;', 'V[i][i + 1] = V[i + 1][i] = i % 2 === 0 ? w : v;') });
const wrongRing = load('ssh', { names: 'sshEigen', capture: 'field,metric,extra,midE,W,H',
  mutate: s => replaceOnce(s, 'if (periodic) V[0][n - 1] = V[n - 1][0] = w;', 'if (periodic) V[0][n - 1] = V[n - 1][0] = v;') });
const swappedTopo = audit(fixtures[0], swapped), wrongRingRow = audit(fixtures[2], wrongRing);
const perturbed = production.compute({ grid: 96, aspect: '4:5', intra: 0.4 * 1.01, w: 1.2, bc: 'open' });
const refTopo = referencePlate(96, 120, 0.4, 1.2, false);
const failureControls = {
  swappedHoppings: { fieldMaxError: swappedTopo.fieldMaxError, endWeight: swappedTopo.endWeight, rejected: !pass(swappedTopo) },
  wrongRingBond: { eigenvalueError: wrongRingRow.eigenvalueError, blochEnergyError: wrongRingRow.blochEnergyError, rejected: !pass(wrongRingRow) },
  onePercentIntraHopping: { fieldMaxError: maxDiff(perturbed.field, refTopo.field), rejected: maxDiff(perturbed.field, refTopo.field) > 1e-3 },
};
assert(Object.values(failureControls).every(c => c.rejected), 'failure control not detected: ' + JSON.stringify(failureControls));

const original = fs.readFileSync(path.join(root, 'src/modules/ssh.js'), 'utf8');
const result = {
  pass: true, source: 'src/modules/ssh.js', sourceSha256: sha(original), harnessSha256: sha(fs.readFileSync(__filename)),
  command: 'node tools/ssh-production.js --write',
  scope: 'Actual ssh.js Householder/QL diagonalization and Float32 plate field for the six presets and the default at grid 96 (4:5), topo/triv/ring at grids 64 and 160 on 1:1 and 16:9 sheets, and balanced v = w open and periodic chains, against an independent Jacobi reference, analytic Bloch energies and the analytic left zero mode.',
  criteria: 'Eigenvalues, residual |Hψ − Eψ| and orthonormality within 1e-12; every plate field word within 1e-7 of the reference plate; end weight within 1e-9 and mid-gap |E| within 1e-12; ring energies within 1e-12 of E(k) = ±sqrt(v² + w² + 2vw cos k); topological presets end weight above 0.99 with mid-gap |E| below 1e-10 and more than 0.999 of the analytic left zero mode inside the mid-gap pair; swapped hoppings, a wrong ring bond and a 1% intra-hopping change rejected.',
  rows, failureControls,
  limitations: [
    'Finite chains of 64 to 160 sites at the enumerated hoppings; single-particle nearest-neighbour SSH only, no disorder, interactions or experiment.',
    'Degenerate eigenvalues (every ring ±k pair, the zero modes of long open chains) are shown as cluster mean densities; individual rows inside a cluster are not unique and are not claimed.',
  ],
  environment: { node: process.version },
};
if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, 'validation/results/ssh-production.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ rows: rows.map(r => [r.name, r.grid, r.aspect, r.cells.join('x'), +r.endWeight.toFixed(4), r.midGapEnergy.toExponential(2), r.fieldMaxError.toExponential(2), r.eigenvalueError.toExponential(2), r.leftEdgeCapture?.toFixed(6) ?? r.blochEnergyError?.toExponential(2)]), failureControls }, null, 1));
