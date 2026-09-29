/* Bipolar, zero-threshold Hopfield memory. Integer overlaps implement the dense
 * symmetric Hebbian matrix exactly without storing N*N floating-point weights. */
(() => {
  'use strict';
  const U = Studio.util, GEOM = 'geom', PAINT = 'paint';
  const RANGE = (group, key, label, min, max, step, fmt) => ({ group, key, label, type: 'range', kind: GEOM, min, max, step, fmt });
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  function memories(s) {
    const N = s.side * s.side, rng = U.makeRng(s.seed + '/hopfield/memories');
    return Array.from({ length: s.count }, (_, m) => Int8Array.from({ length: N }, (_, i) => {
      if (s.patterns === 'random') return rng() < 0.5 ? -1 : 1;
      // Deliberately correlated geometric memories, not independent capacity samples.
      const x = i % s.side, y = Math.floor(i / s.side), k = 2 + Math.floor(m / 4);
      return (m % 4 === 0 ? x % (2 * k) < k : m % 4 === 1 ? y % (2 * k) < k :
        m % 4 === 2 ? (x + y) % (2 * k) < k : Math.abs(x - y) < k) ? 1 : -1;
    }));
  }
  function shuffle(a, rng) {
    for (let i = a.length - 1; i > 0; i--) { const j = rng.int(0, i); [a[i], a[j]] = [a[j], a[i]]; }
  }
  function recall(patterns, cue, sweeps, rng, visit) {
    const N = cue.length, P = patterns.length, state = new Int8Array(cue);
    const overlaps = patterns.map(p => p.reduce((v, x, i) => v + x * state[i], 0));
    const energy = () => -(overlaps.reduce((v, x) => v + x * x, 0) - P * N) / (2 * N);
    const energies = [energy()], order = Array.from({ length: N }, (_, i) => i);
    let done = 0, settled = false, flips = 0;
    for (let t = 0; t < sweeps; t++) {
      shuffle(order, rng); let changed = 0;
      for (const i of order) {
        // N*h_i = sum_mu xi_mu_i * overlap_mu - P*s_i removes w_ii.
        let field = -P * state[i];
        for (let m = 0; m < P; m++) field += patterns[m][i] * overlaps[m];
        const next = field > 0 ? 1 : field < 0 ? -1 : state[i], delta = next - state[i];
        if (delta) {
          state[i] = next; changed++; flips++;
          for (let m = 0; m < P; m++) overlaps[m] += patterns[m][i] * delta;
        }
        if (visit) visit(i, state, field, energy());
      }
      done++; energies.push(energy());
      if (!changed) { settled = true; break; }
    }
    return { state, energies, overlaps, sweeps: done, settled, flips };
  }
  function simulate(s) {
    const patterns = memories(s), cue = new Int8Array(patterns[0]), ids = Array.from(cue.keys());
    shuffle(ids, U.makeRng(s.seed + '/hopfield/cue'));
    const corrupted = Math.round(cue.length * s.corruption / 100);
    for (let i = 0; i < corrupted; i++) cue[ids[i]] *= -1;
    return { patterns, cue, corrupted, ...recall(patterns, cue, s.sweeps, U.makeRng(s.seed + '/hopfield/updates')) };
  }
  Studio.register({
    id: 'hopfield', name: 'Hopfield Memory', tab: 'Hopfield', order: 54.82, familiarity: 'common',
    subtitle: 'Associative neural memory · 1982',
    equation: 'w_ij = (1/N) sum_mu xi_i^mu xi_j^mu, w_ii = 0; s_i <- sign(sum_j w_ij s_j); E = -1/2 sum_ij w_ij s_i s_j',
    credit: 'John J. Hopfield, Neural networks and physical systems with emergent collective computational abilities, PNAS 79, 2554-2558 (1982), doi:10.1073/pnas.79.8.2554. This tab uses the bipolar, zero-threshold Hebbian specialization with sequential updates.',
    blurb: 'A small recurrent neural network stores binary patterns in symmetric connections. Start it with a damaged copy and each neuron takes its turn responding to all the others. The three panels show the first stored memory, the damaged cue and the resulting recall. More memories interfere; a badly damaged cue can settle into a different pattern or the inverse memory. Energy descent does not guarantee correct recall. These are finite binary associative memories, with no language model or remote service.',
    schema: [
      RANGE('Memory', 'side', 'Cells per side', 8, 24, 2, String),
      RANGE('Memory', 'count', 'Stored memories', 1, 64, 1, String),
      { group: 'Memory', key: 'patterns', label: 'Pattern family', type: 'seg', kind: GEOM, options: [['random', 'Random'], ['stripes', 'Geometric']] },
      RANGE('Recall', 'corruption', 'Flipped cue cells', 0, 100, 1, v => v + '%'),
      RANGE('Recall', 'sweeps', 'Maximum sweeps', 0, 25, 1, String),
      { group: 'Picture', key: 'aspect', label: 'Aspect', type: 'seg', kind: GEOM, options: Object.keys(ASPECTS).map(k => [k, k]) },
      { group: 'Picture', key: 'gap', label: 'Cell spacing', type: 'range', kind: PAINT, min: 0, max: 0.2, step: 0.01, fmt: v => v.toFixed(2) }
    ],
    defaults: { seed: 'hopfield-1982', side: 16, count: 4, patterns: 'random', corruption: 20, sweeps: 12, aspect: '3:2', gap: 0.04 },
    palette: true, defaultPalette: 'kiln', headline: 'corruption', headlineLabel: 'Cue damage',
    presets: {
      one: { label: 'One memory, recoverable cue', p: { count: 1, corruption: 25, patterns: 'random', sweeps: 12 }, palette: Studio.PALETTES.harbor },
      four: { label: 'Four memories', p: { count: 4, corruption: 20, patterns: 'random', sweeps: 12 }, palette: Studio.PALETTES.kiln },
      crowded: { label: 'Overloaded small network', p: { side: 8, count: 64, corruption: 25, patterns: 'random', sweeps: 25 }, palette: Studio.PALETTES.risograph },
      inverse: { label: 'Across the wrong basin', p: { count: 1, corruption: 80, patterns: 'random', sweeps: 12 }, palette: Studio.PALETTES.nightshade },
      geometric: { label: 'Correlated geometric memories', p: { count: 6, corruption: 25, patterns: 'stripes', sweeps: 12 }, palette: Studio.PALETTES.verdigris },
      cue: { label: 'Before the first update', p: { count: 4, corruption: 40, patterns: 'random', sweeps: 0 }, palette: Studio.PALETTES.ember }
    },
    hints: { Memory: 'Every cell connects to every other cell. The picture places neurons on a square for display; it adds no spatial coupling. Geometric memories can be correlated or repeated.', Recall: 'One sweep visits every neuron once in a seeded shuffled order. A zero local field keeps its previous sign. Reaching a fixed point can still mean the wrong memory.', Picture: 'Left to right: stored memory, damaged cue, recall. In portrait format the panels run top to bottom. Colors encode the two signs, not confidence.' },
    closedGroups: ['Picture'],
    surprise: rng => ({ side: rng.pick([12, 16, 20]), count: rng.int(1, 16), patterns: 'random', corruption: rng.int(5, 45), sweeps: 12, gap: 0.04 }),
    create(host) {
      let result = null;
      function tiles(w, h) {
        const s = host.getState(), vertical = h > w, margin = Math.min(w, h) * 0.06;
        const cell = Math.min((w - 2 * margin) / (vertical ? s.side : 3 * s.side + 2), (h - 2 * margin) / (vertical ? 3 * s.side + 2 : s.side));
        const bw = cell * (vertical ? s.side : 3 * s.side + 2), bh = cell * (vertical ? 3 * s.side + 2 : s.side);
        return { cell, x: (w - bw) / 2, y: (h - bh) / 2, vertical };
      }
      function marks(w, h, rect) {
        if (!result) return;
        const s = host.getState(), layout = tiles(w, h), { cell, x, y, vertical } = layout;
        [result.patterns[0], result.cue, result.state].forEach((values, panel) => {
          for (let i = 0; i < values.length; i++) {
            const px = x + cell * (i % s.side + (vertical ? 0 : panel * (s.side + 1)));
            const py = y + cell * (Math.floor(i / s.side) + (vertical ? panel * (s.side + 1) : 0));
            rect(px + cell * s.gap / 2, py + cell * s.gap / 2, cell * (1 - s.gap), values[i] > 0 ? s.palette[0] : (s.palette[1] || s.bg));
          }
        });
      }
      function paint(canvas) {
        const ctx = canvas.getContext('2d'); ctx.fillStyle = host.getState().bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
        marks(canvas.width, canvas.height, (x, y, size, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, size, size); });
      }
      function regenerate() {
        const s = host.getState(); result = simulate(s); paint(host.canvas);
        const mismatch = result.state.reduce((n, x, i) => n + (x !== result.patterns[0][i]), 0);
        host.setStatus('<span>memory · cue · recall <b>' + s.side + '×' + s.side + '</b></span><span>target mismatch <b>' + mismatch + '/' + result.state.length + '</b> · stored ' + s.count + '</span><span>energy <b>' + result.energies.at(-1).toFixed(3) + '</b></span><span>sweep <b>' + result.sweeps + '</b> · ' + (result.settled ? 'fixed point' : 'budget reached; fixed point not checked') + '</span>');
      }
      return {
        aspect: s => ASPECTS[s.aspect] || 1, regenerate, repaint: () => paint(host.canvas), resize: () => paint(host.canvas), pause() {}, resume() {},
        async exportPNG(w, h) { const out = document.createElement('canvas'); out.width = w; out.height = h; paint(out); return U.toBlob(out); },
        exportSVG(w, h) {
          const body = []; marks(w, h, (x, y, size, color) => body.push('<rect x="' + x + '" y="' + y + '" width="' + size + '" height="' + size + '" fill="' + U.svgEsc(color) + '"/>'));
          return U.svgDoc(w, h, host.getState().bg, body.join(''));
        },
        async exportData() {
          const s = host.getState(), N = result.state.length;
          return { arrays: {
            memories: { data: Int8Array.from(result.patterns.flatMap(p => Array.from(p))), shape: [s.count, s.side, s.side], description: 'Stored bipolar patterns; target is memory zero.' },
            cue: { data: new Int8Array(result.cue), shape: [s.side, s.side] },
            state: { data: new Int8Array(result.state), shape: [s.side, s.side] },
            energy: { data: Float64Array.from(result.energies), shape: [result.energies.length], description: 'Initial energy, then energy after each complete sweep.' },
            overlaps: { data: Float64Array.from(result.overlaps, v => v / N), shape: [s.count] }
          }, meta: { tab: 'hopfield', neurons: N, memories: s.count, corruptedCells: result.corrupted, sweeps: result.sweeps, fixedPoint: result.settled, flips: result.flips, weights: 'w_ij=sum_mu xi_mu_i*xi_mu_j/N for i!=j; w_ii=0', update: 'seeded shuffled asynchronous; ties retain sign; zero threshold', energy: '-s^T W s/2', panels: ['memory zero', 'cue', 'recall'], spatialBoundary: 'none: fully connected', seed: s.seed } };
        }
      };
    }
  });
})();
