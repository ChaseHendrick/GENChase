'use strict';
// The ssh plate rule rebuilt from independent Jacobi eigenpairs (tools/lib/ssh-reference.js). Rows are modes
// in order of energy (the central band when the plate is shorter than the chain). Inside an exactly degenerate
// cluster the rows are fixed by pivoted Gram–Schmidt on the sites: the normalized projection of the site with
// the most remaining weight, ties to the leftmost site. The end weight is the mean share of the two modes
// nearest E = 0 on the outer tenth of sites at each end, from the cluster-mean density.
const ref = require('./ssh-reference');

function referencePlate(Hm, H, v, w) {
  const n = Hm.length, { values, vectors } = ref.jacobiEigen(Hm);
  const tol = 1e-8 * (Math.abs(v) + Math.abs(w)), rows = [], density = [];
  let clusters = 0;
  for (let i = 0; i < n;) {
    let j = i + 1;
    while (j < n && values[j] - values[j - 1] < tol) j++;
    const cluster = vectors.slice(i, j), rho = new Float64Array(n);
    for (const psi of cluster) for (let x = 0; x < n; x++) rho[x] += psi[x] ** 2;
    if (j - i === 1) rows[i] = vectors[i];
    else {
      clusters++;
      const remaining = Float64Array.from(rho), chosen = [];
      for (let m = i; m < j; m++) {
        let top = -Infinity;
        for (const r of remaining) top = Math.max(top, r);
        const site = remaining.findIndex(r => r >= top * (1 - 1e-9));
        const projected = new Float64Array(n);
        for (let x = 0; x < n; x++) {
          for (const psi of cluster) projected[x] += psi[site] * psi[x];
          for (const c of chosen) projected[x] -= c[site] * c[x];
        }
        let norm = 0;
        for (const p of projected) norm += p * p;
        norm = Math.sqrt(norm);
        const unit = projected.map(p => p / norm);
        for (let x = 0; x < n; x++) remaining[x] -= unit[x] ** 2;
        chosen.push(unit);
        rows[m] = unit;
      }
    }
    for (let m = i; m < j; m++) density[m] = rho.map(r => r / (j - i));
    i = j;
  }
  const modeOf = H >= n ? y => Math.floor(y * n / H) : y => n / 2 - Math.floor(H / 2) + y;
  const field = new Float32Array(n * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < n; x++) field[y * n + x] = Math.abs(rows[modeOf(y)][x]);
  const pair = values.map((e, i) => i).sort((a, b) => Math.abs(values[a]) - Math.abs(values[b])).slice(0, 2);
  const endWeight = pair.reduce((s, m) => s + ref.endWeight(Float64Array.from(density[m], Math.sqrt)) / 2, 0);
  return { values, vectors, rows, field, endWeight, metric: endWeight, midE: Math.max(...pair.map(m => Math.abs(values[m]))), pair, clusters };
}

module.exports = { referencePlate };
