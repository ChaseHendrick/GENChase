
/* modules/aztec.js */
/* GENChase: uniformly random domino tilings of the Aztec diamond by domino shuffling, and the arctic circle they draw. */
(function () {
  'use strict';
  const U = Studio.util;
  const GEOM = 'geom', PAINT = 'paint';
  const f2 = v => v.toFixed(2), pct = v => Math.round(v * 100) + '%';
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const Pal = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });

  // Domino types: N moves up, S down, W left, E right. A domino keeps its type while it slides. At creation the type
  // follows the checkerboard of the current order: in the order-n frame, cell (i, j) is "dark" when (i + j + n) is odd,
  // a horizontal domino whose left cell is dark is N (else S), a vertical domino whose top cell is dark is W (else E).
  const N = 1, S = 2, W = 3, E = 4;
  const dark = (i, j, n) => ((i + j + n) & 1) === 1;

  function inside(i, j, n) { return Math.abs(i + 0.5 - n) + Math.abs(j + 0.5 - n) <= n; }

  // One shuffling step: order n tiling -> order n+1 tiling. Cells hold the type of the domino covering them, 0 if empty.
  // The grid for order n is (2n)^2; cell (i, j) of order n becomes (i+1, j+1) of order n+1.
  function shuffle(grid, n, rng) {
    const m = n + 1, w2 = 2 * m, next = new Uint8Array(w2 * w2);
    const w1 = 2 * n;
    // destruction: an S domino directly above an N domino, or an E domino directly left of a W domino, would cross; drop both.
    // The left cell of an S and the top cell of an E are light cells, so scanning light cells finds each pair once.
    const g = new Uint8Array(grid);
    for (let j = 0; j < w1; j++) for (let i = 0; i < w1; i++) {
      if (dark(i, j, n)) continue;
      const t = g[j * w1 + i];
      if (t === S && j + 1 < w1 && i + 1 < w1 && g[(j + 1) * w1 + i] === N && g[(j + 1) * w1 + i + 1] === N) {
        g[j * w1 + i] = 0; g[j * w1 + i + 1] = 0; g[(j + 1) * w1 + i] = 0; g[(j + 1) * w1 + i + 1] = 0;
      } else if (t === E && i + 1 < w1 && j + 1 < w1 && g[j * w1 + i + 1] === W && g[(j + 1) * w1 + i + 1] === W) {
        g[j * w1 + i] = 0; g[(j + 1) * w1 + i] = 0; g[j * w1 + i + 1] = 0; g[(j + 1) * w1 + i + 1] = 0;
      }
    }
    // sliding: every surviving domino moves one cell in its direction, in the larger frame
    for (let j = 0; j < w1; j++) for (let i = 0; i < w1; i++) {
      const t = g[j * w1 + i]; if (!t) continue;
      let ni = i + 1, nj = j + 1;
      if (t === N) nj -= 1; else if (t === S) nj += 1; else if (t === W) ni -= 1; else ni += 1;
      next[nj * w2 + ni] = t;
    }
    // creation: the empty cells of the order n+1 diamond decompose uniquely into 2x2 blocks; fill each with a random pair
    for (let j = 0; j < w2; j++) for (let i = 0; i < w2; i++) {
      if (!inside(i, j, m) || next[j * w2 + i]) continue;
      if (i + 1 >= w2 || j + 1 >= w2 || next[j * w2 + i + 1] || next[(j + 1) * w2 + i] || next[(j + 1) * w2 + i + 1]) continue;
      if (rng() < 0.5) {
        // two horizontals: top left cell (i, j) and bottom left (i, j+1); types follow the checkerboard of order m
        const top = dark(i, j, m) ? N : S, bot = dark(i, j + 1, m) ? N : S;
        next[j * w2 + i] = top; next[j * w2 + i + 1] = top; next[(j + 1) * w2 + i] = bot; next[(j + 1) * w2 + i + 1] = bot;
      } else {
        const left = dark(i, j, m) ? W : E, right = dark(i + 1, j, m) ? W : E;
        next[j * w2 + i] = left; next[(j + 1) * w2 + i] = left; next[j * w2 + i + 1] = right; next[(j + 1) * w2 + i + 1] = right;
      }
    }
    return next;
  }

  // Each domino listed once from its left (horizontal) or top (vertical) cell: (x, y, type, horizontal).
  // That start cell is dark for N and W, light for S and E.
  function dominoes(grid, n) {
    const w = 2 * n, out = [];
    for (let j = 0; j < w; j++) for (let i = 0; i < w; i++) {
      const t = grid[j * w + i]; if (!t) continue;
      const d = dark(i, j, n);
      if ((t === N && d) || (t === S && !d)) out.push([i, j, t, true]);
      else if ((t === W && d) || (t === E && !d)) out.push([i, j, t, false]);
    }
    return out;
  }

  const ASPECT = 1;

  /* ---------- Arctic Circle ---------- */
  Studio.register({
    id: 'aztec',
    name: 'Arctic Circle',
    subtitle: 'random domino tilings of the Aztec diamond · 1992',
    order: 47,
    equation: 'order n → n+1: delete colliding pairs, slide N↑ S↓ W← E→, fill each empty 2×2 block with a random pair',
    credit: "Noam Elkies, Greg Kuperberg, Michael Larsen and James Propp, Journal of Algebraic Combinatorics 1, 111 and 219 (1992), counted the domino tilings of the Aztec diamond of order n (there are 2^{n(n+1)/2}) and gave the shuffling algorithm that samples one uniformly. William Jockusch, James Propp and Peter Shor, 'Random domino tilings and the arctic circle theorem' (1998), proved that a uniformly random tiling is frozen outside the inscribed circle and disordered inside it. James Propp, Theoretical Computer Science 303, 267 (2003), on generalized domino shuffling.",
    blurb: 'Take the diamond-shaped region of the square grid and tile it with dominoes at random, every tiling equally likely. Near each of the four corners the dominoes lock into a brickwork of one orientation and never vary; in the middle they are a jumble. The boundary between frozen and free is, in the limit, exactly the circle inscribed in the diamond. Nothing about the rule mentions a circle. The shuffling algorithm grows the tiling one order at a time, so the plate is built rather than drawn, and every domino is a rectangle, so the export is a true vector.',
    schema: [
      RANGE('Diamond', 'n', 'Order n', GEOM, 8, 320, 1, String, { hint: 'The diamond has 2n(n+1) cells. Above about 200 the circle is sharp and the plate is a texture; below 40 you can read individual dominoes.' }),
      { group: 'Tiles', key: 'fill', label: 'Color by', type: 'seg', kind: PAINT, wrap: true,
        options: [['type', 'Domino type'], ['orient', 'Orientation'], ['frozen', 'Frozen vs free']] },
      RANGE('Tiles', 'shift', 'Palette offset', PAINT, 0, 15, 1, String),
      RANGE('Tiles', 'inset', 'Gap inset (grout)', PAINT, 0, 0.3, 0.01, f2),
      RANGE('Tiles', 'strokeWidth', 'Stroke weight', PAINT, 0, 3, 0.1, v => v.toFixed(1)),
      RANGE('Tiles', 'strokeColor', 'Stroke color index', PAINT, 0, 15, 1, String, { dimUnless: s => s.strokeWidth > 0 }),
      { group: 'Finish', key: 'circle', label: 'Draw the inscribed circle', type: 'toggle', kind: PAINT },
      RANGE('Finish', 'margin', 'Margin', PAINT, 0, 0.2, 0.01, f2),
      RANGE('Finish', 'grain', 'Grain', PAINT, 0, 0.6, 0.02, pct),
    ],
    defaults: {
      n: 120, fill: 'type', shift: 0, inset: 0.08, strokeWidth: 0, strokeColor: 3, circle: false, margin: 0.05, grain: 0.05,
      seed: 'propp-1992',
    },
    presets: {
      classic: pre('Four frozen corners', { n: 120, fill: 'type', inset: 0.08, strokeWidth: 0, circle: false }, Pal.kiln),
      fine: pre('Fine, n = 260', { n: 260, fill: 'type', inset: 0.02, strokeWidth: 0, circle: false }, Pal.harbor),
      readable: pre('Readable, n = 28', { n: 28, fill: 'type', inset: 0.12, strokeWidth: 1, strokeColor: 3, circle: false }, Pal.tram),
      orient: pre('Two orientations', { n: 140, fill: 'orient', inset: 0.05, strokeWidth: 0, circle: false }, Pal.graphite),
      proof: pre('Frozen versus free', { n: 180, fill: 'frozen', inset: 0.03, strokeWidth: 0, circle: true }, Pal.verdigris),
      brick: pre('Brickwork', { n: 90, fill: 'type', inset: 0, strokeWidth: 0.8, strokeColor: 4, circle: false }, Pal.risograph),
    },
    hints: {
      Diamond: 'The seed decides every coin flip in the shuffle, so the same seed and order reprint the same tiling exactly.',
      Tiles: 'Domino type is the four directions the shuffle uses, which is also the four frozen phases. Frozen versus free colors a domino by whether all its neighbors share its type.',
    },
    palette: true, defaultPalette: 'kiln', paletteLabel: 'Colors (N, S, W, E)',
    headline: 'n', headlineLabel: 'order',
    sanitize(s) { s.n = U.clamp(Math.round(Number(s.n) || 120), 8, 320); },
    surprise(rng) {
      return {
        n: rng.pick([40, 80, 120, 160, 220, 280]), fill: rng.pick(['type', 'type', 'orient', 'frozen']),
        shift: rng.int(0, 4), inset: rng.pick([0, 0.03, 0.08, 0.14]), strokeWidth: rng.pick([0, 0, 0.6, 1]), strokeColor: rng.int(0, 5),
        circle: rng() < 0.2, margin: 0.05, grain: rng.pick([0, 0.05, 0.1]),
      };
    },
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d');
      let grid = null, order = 0, list = null, frozen = null, timer = 0, building = false;

      function build(s, done) {
        clearTimeout(timer); building = true;
        const rng = U.makeRng(s.seed + '/aztec');
        let n = 1;
        // order 1: cell (0, 0) is dark, so the top horizontal is N and the left vertical is W
        grid = new Uint8Array(4);
        if (rng() < 0.5) { grid[0] = N; grid[1] = N; grid[2] = S; grid[3] = S; } else { grid[0] = W; grid[2] = W; grid[1] = E; grid[3] = E; }
        const target = s.n;
        (function chunk() {
          const t0 = performance.now();
          while (n < target && performance.now() - t0 < 40) { grid = shuffle(grid, n, rng); n++; }
          order = n;
          if (n < target) { status('shuffling ' + n + ' / ' + target); timer = setTimeout(chunk, 0); }
          else { building = false; finish(); done(); }
        })();
      }
      function finish() {
        list = dominoes(grid, order);
        // frozen: every neighboring domino cell shares this domino's type
        const w = 2 * order; frozen = new Uint8Array(list.length);
        list.forEach((d, k) => {
          const [x, y, t, hz] = d; let ok = true;
          const cells = hz ? [[x, y], [x + 1, y]] : [[x, y], [x, y + 1]];
          for (const [cx, cy] of cells) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = cx + dx, ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= w || !inside(nx, ny, order)) continue;
            if (grid[ny * w + nx] !== t) { ok = false; break; }
          }
          frozen[k] = ok ? 1 : 0;
        });
      }
      function status(extra) {
        const s = host.getState();
        const fr = frozen ? Math.round(100 * frozen.reduce((a, b) => a + b, 0) / Math.max(1, frozen.length)) : 0;
        host.setStatus('<span>order <b>' + order + '</b> · ' + (2 * order * (order + 1)).toLocaleString() + ' cells</span>' +
          (list ? '<span>' + list.length.toLocaleString() + ' dominoes · frozen <b>' + fr + '%</b></span>' : '') +
          (extra ? '<span>' + extra + '</span>' : ''));
      }
      function colorOf(s, d, k) {
        const P = s.palette, n = P.length;
        if (s.fill === 'orient') return P[(s.shift + (d[3] ? 0 : 1)) % n];
        if (s.fill === 'frozen') return P[(s.shift + (frozen[k] ? d[2] - 1 : 4)) % n];
        return P[(s.shift + d[2] - 1) % n];
      }
      function paint(c2, W, H) {
        const s = host.getState();
        c2.fillStyle = s.bg; c2.fillRect(0, 0, W, H);
        if (!list) return;
        const side = Math.min(W, H) * (1 - 2 * s.margin), cell = side / (2 * order);
        const ox = (W - side) / 2, oy = (H - side) / 2, g = s.inset * cell;
        for (let k = 0; k < list.length; k++) {
          const d = list[k];
          const x = ox + d[0] * cell + g, y = oy + d[1] * cell + g;
          const w = (d[3] ? 2 : 1) * cell - 2 * g, h = (d[3] ? 1 : 2) * cell - 2 * g;
          c2.fillStyle = colorOf(s, d, k);
          c2.fillRect(x, y, w, h);
          if (s.strokeWidth > 0) { c2.lineWidth = s.strokeWidth * cell / 12; c2.strokeStyle = s.palette[s.strokeColor % s.palette.length]; c2.strokeRect(x, y, w, h); }
        }
        if (s.circle) {
          c2.beginPath(); c2.arc(W / 2, H / 2, side / 2, 0, U.TAU);
          c2.lineWidth = Math.max(1, cell * 0.35); c2.strokeStyle = U.inkRgba(s.bg, 0.8); c2.stroke();
        }
        if (s.grain > 0) {
          const rng = U.makeRng(s.seed + '/grain'), img = c2.getImageData(0, 0, W, H), px = img.data, a = s.grain * 28;
          for (let i = 0; i < px.length; i += 4) { const v = (rng() - 0.5) * a; px[i] += v; px[i + 1] += v; px[i + 2] += v; }
          c2.putImageData(img, 0, 0);
        }
      }
      function render() { paint(ctx, canvas.width, canvas.height); }

      return {
        aspect() { return ASPECT; },
        regenerate() {
          const s = host.getState();
          list = null; frozen = null; render(); status('shuffling');
          build(s, () => { render(); status(); });
        },
        repaint() { if (!building) render(); },
        resize() { if (!building) render(); },
        pause() {}, resume() { if (!building) render(); },
        async exportPNG(w, h) {
          if (!list) throw new Error('nothing to export');
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          paint(c.getContext('2d'), w, h);
          return U.toBlob(c);
        },
        exportSVG(w, h) {
          if (!list) throw new Error('nothing to export');
          const s = host.getState();
          const side = Math.min(w, h) * (1 - 2 * s.margin), cell = side / (2 * order);
          const ox = (w - side) / 2, oy = (h - side) / 2, g = s.inset * cell;
          const r = v => Math.round(v * 100) / 100;
          const stroke = s.strokeWidth > 0 ? ' stroke="' + s.palette[s.strokeColor % s.palette.length] + '" stroke-width="' + r(s.strokeWidth * cell / 12) + '"' : '';
          let body = '';
          for (let k = 0; k < list.length; k++) {
            const d = list[k];
            body += '<rect x="' + r(ox + d[0] * cell + g) + '" y="' + r(oy + d[1] * cell + g) + '" width="' + r((d[3] ? 2 : 1) * cell - 2 * g) + '" height="' + r((d[3] ? 1 : 2) * cell - 2 * g) + '" fill="' + colorOf(s, d, k) + '"' + stroke + '/>';
          }
          if (s.circle) body += '<circle cx="' + r(w / 2) + '" cy="' + r(h / 2) + '" r="' + r(side / 2) + '" fill="none" stroke="' + U.inkFor(s.bg) + '" stroke-opacity="0.8" stroke-width="' + r(Math.max(1, cell * 0.35)) + '"/>';
          return U.svgDoc(w, h, s.bg, body);
        },
      };
    },
  });
})();
