
/* modules/tilings.js */
/* GENChase — Aperiodic Tilings: Penrose, Ammann–Beenker, and the 2023 hat / spectre monotiles. */
(function () {
  'use strict';
  const U = Studio.util;
  const GEOM = 'geom', PAINT = 'paint';
  const PHI = (1 + Math.sqrt(5)) / 2, IPHI = 1 / PHI, IPHI2 = 1 - IPHI;
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const f1 = v => v.toFixed(1), f2 = v => v.toFixed(2), deg = v => v + '°';
  const pct = v => Math.round(v * 100) + '%';
  const CAP = 200000;          // hard ceiling on tiles in one patch
  const BASE = 2.2;            // half-height of the view, in tile edges, at depth 1

  /* Tiling modes. `sub` modes are built by deflation of Robinson half-tiles; `grid` modes
     by de Bruijn's dual multigrid. `avg` is the mean tile area with edge = 1, used to
     predict the tile count before building. */
  const MODES = {
    p3:  { label: 'Penrose P3',      short: 'Penrose rhombs', build: 'sub',  dirs: 10, phase: Math.PI / 10, avg: 0.8123, names: ['thin', 'thick'] },
    p2:  { label: 'Penrose P2',      short: 'Kite & dart',    build: 'sub',  dirs: 10, phase: Math.PI / 10, avg: 0.5021, names: ['kite', 'dart'] },
    ab:  { label: 'Ammann–Beenker',  short: 'Ammann–Beenker', build: 'grid', n: 4, dirs: 8,  phase: 0, avg: 0.8284, names: ['rhomb', 'square'] },
    d12: { label: 'Dodecagonal',     short: 'Dodecagonal',    build: 'grid', n: 6, dirs: 12, phase: 0, avg: 0.8040, names: ['30° rhomb', '60° rhomb', 'square'] },
    hat: { label: 'Hat (2023)',      short: 'Hat',            build: 'mono', kind: 'hat', dirs: 12, phase: 0, avg: 13.856, inflate: 2.618, maxDepth: 6, names: ['H1', 'H', 'T', 'P', 'F'] },
    spec:{ label: 'Spectre (2023)',  short: 'Spectre',        build: 'mono', kind: 'spectre', dirs: 12, phase: 0, avg: 8.196, inflate: 3.0, maxDepth: 5, names: ['Γ', 'Γ′', 'Δ', 'Θ', 'Λ', 'Ξ', 'Π', 'Σ', 'Φ', 'Ψ'] },
  };

  /* Matching-rule arc decorations, verified to join across every shared edge.
     corners: which two polygon corners carry an arc; r: arc radii; fam: which of the two
     arc families (colors) each belongs to. Distances are in tile-edge units. */
  const ARCS = {
    p3: [{ c: [0, 2], r: [IPHI2, IPHI2], f: [0, 0] },      // thin rhomb: two small arcs at the 36° corners
         { c: [1, 3], r: [IPHI2, IPHI], f: [0, 1] }],      // thick rhomb: small + large at the 72° corners
    p2: [{ c: [1, 3], r: [IPHI, IPHI2], f: [0, 1] },       // kite: arcs at tip and back vertex
         { c: [1, 3], r: [IPHI2 * IPHI, IPHI2], f: [1, 0] }], // dart: arcs at the reflex and 72° vertex
  };

  /* ================================================================
     half-tile lists (Robinson triangles): A = apex, B/C = base ends
  ================================================================ */
  function triSet(cap) {
    return {
      n: 0, v: new Float64Array(cap * 6), t: new Uint8Array(cap), anc: new Int32Array(cap),
      grow(k) {
        if (this.n + k <= this.t.length) return;
        const c = Math.max(this.t.length * 2, this.n + k);
        const v = new Float64Array(c * 6); v.set(this.v); this.v = v;
        const t = new Uint8Array(c); t.set(this.t); this.t = t;
        const a = new Int32Array(c); a.set(this.anc); this.anc = a;
      },
      add(ty, ax, ay, bx, by, cx, cy, an) {
        this.grow(1);
        const o = this.n * 6, v = this.v;
        v[o] = ax; v[o + 1] = ay; v[o + 2] = bx; v[o + 3] = by; v[o + 4] = cx; v[o + 5] = cy;
        this.t[this.n] = ty; this.anc[this.n] = an; this.n++;
      },
    };
  }

  // Sun seed: ten acute half-tiles around a point, alternating handedness.
  function seedWheel(R, cx, cy, rot) {
    const s = triSet(16);
    for (let i = 0; i < 10; i++) {
      const a1 = (2 * i - 1) * Math.PI / 10 + rot, a2 = (2 * i + 1) * Math.PI / 10 + rot;
      let bx = cx + R * Math.cos(a1), by = cy + R * Math.sin(a1);
      let dx = cx + R * Math.cos(a2), dy = cy + R * Math.sin(a2);
      if (i % 2 === 0) { const tx = bx, ty = by; bx = dx; by = dy; dx = tx; dy = ty; }
      s.add(0, cx, cy, bx, by, dx, dy, i);
    }
    return s;
  }

  /* One deflation step. Children lie inside their parent, so culling the parent against the
     view rectangle can never drop a tile that would have been visible. */
  function deflate(mode, src, rect, stamp) {
    const out = triSet(Math.max(64, src.n * 2));
    const v = src.v;
    for (let i = 0; i < src.n; i++) {
      const o = i * 6;
      const ax = v[o], ay = v[o + 1], bx = v[o + 2], by = v[o + 3], cx = v[o + 4], cy = v[o + 5];
      if (Math.min(ax, bx, cx) > rect.x1 || Math.max(ax, bx, cx) < rect.x0 ||
          Math.min(ay, by, cy) > rect.y1 || Math.max(ay, by, cy) < rect.y0) continue;
      const an = stamp ? i : src.anc[i];
      if (mode === 'p3') {
        if (src.t[i] === 0) {
          const px = ax + (bx - ax) * IPHI, py = ay + (by - ay) * IPHI;
          out.add(0, cx, cy, px, py, bx, by, an);
          out.add(1, px, py, cx, cy, ax, ay, an);
        } else {
          const qx = bx + (ax - bx) * IPHI, qy = by + (ay - by) * IPHI;
          const rx = bx + (cx - bx) * IPHI, ry = by + (cy - by) * IPHI;
          out.add(1, rx, ry, cx, cy, ax, ay, an);
          out.add(1, qx, qy, rx, ry, bx, by, an);
          out.add(0, rx, ry, qx, qy, ax, ay, an);
        }
      } else {
        if (src.t[i] === 0) {
          const qx = ax + (bx - ax) * IPHI, qy = ay + (by - ay) * IPHI;
          const wx = ax + (cx - ax) * IPHI2, wy = ay + (cy - ay) * IPHI2;
          out.add(1, wx, wy, ax, ay, qx, qy, an);
          out.add(0, cx, cy, qx, qy, wx, wy, an);
          out.add(0, cx, cy, qx, qy, bx, by, an);
        } else {
          const dx = bx + (cx - bx) * IPHI, dy = by + (cy - by) * IPHI;
          out.add(0, bx, by, ax, ay, dx, dy, an);
          out.add(1, dx, dy, cx, cy, ax, ay, an);
        }
      }
    }
    return out;
  }

  /* ================================================================
     whole tiles
  ================================================================ */
  function tileSet(cap) {
    return {
      n: 0, _used: 0,
      xy: new Float64Array(cap * 8), off: new Int32Array(cap), nv: new Uint8Array(cap),
      type: new Uint8Array(cap), cls: new Uint8Array(cap),
      anc: new Int32Array(cap), flip: new Uint8Array(cap),
      grow(k) {
        if (this.n + k <= this.type.length) return;
        const c = Math.max(this.type.length * 2, this.n + k);
        const xy = this.xy, off = new Int32Array(c), nv = new Uint8Array(c);
        off.set(this.off); nv.set(this.nv); this.off = off; this.nv = nv;
        const t = new Uint8Array(c); t.set(this.type); this.type = t;
        const cl = new Uint8Array(c); cl.set(this.cls); this.cls = cl;
        const a = new Int32Array(c); a.set(this.anc); this.anc = a;
        const f = new Uint8Array(c); f.set(this.flip); this.flip = f;
      },
      growXY(extra) {
        if (this._used + extra <= this.xy.length) return;
        const xy = new Float64Array(Math.max(this.xy.length * 2, this._used + extra));
        xy.set(this.xy); this.xy = xy;
      },
      // p = [x0,y0,...] in any winding; stored counter-clockwise.
      add(ty, p, an, dirOf) {
        const m = p.length >> 1;
        this.grow(1); this.growXY(m * 2);
        let area = 0;
        for (let i = 0; i < m; i++) {
          const j = (i + 1) % m;
          area += p[2 * i] * p[2 * j + 1] - p[2 * j] * p[2 * i + 1];
        }
        const flip = area < 0 ? 1 : 0;
        const o = this._used, xy = this.xy;
        for (let i = 0; i < m; i++) {
          const k = flip ? (m - i) % m : i;
          xy[o + 2 * i] = p[2 * k]; xy[o + 2 * i + 1] = p[2 * k + 1];
        }
        this.off[this.n] = o; this.nv[this.n] = m; this._used += m * 2;
        const d0 = dirOf(xy[o + 2] - xy[o], xy[o + 3] - xy[o + 1]);
        const d1 = m > 2 ? dirOf(xy[o + 4] - xy[o + 2], xy[o + 5] - xy[o + 3]) : 0;
        this.type[this.n] = ty; this.flip[this.n] = flip; this.anc[this.n] = an;
        this.cls[this.n] = m === 4 ? (d0 + d1) : d0;
        this.n++;
      },
    };
  }

  const ekey = (x, y) => Math.round(x * 8192) + ',' + Math.round(y * 8192);

  /* Glue half-tiles into whole tiles across the shared internal edge: the base for P3
     rhombs, the axis leg for P2 kites and darts. */
  function glue(mode, tris, dirOf) {
    const i0 = mode === 'p3' ? 1 : 0, i1 = mode === 'p3' ? 2 : 1, fr = mode === 'p3' ? 0 : 2;
    const out = tileSet(Math.max(64, tris.n >> 1));
    const seen = new Map(), v = tris.v, p = new Float64Array(8);
    for (let i = 0; i < tris.n; i++) {
      const o = i * 6;
      const ax = v[o + 2 * i0], ay = v[o + 2 * i0 + 1], bx = v[o + 2 * i1], by = v[o + 2 * i1 + 1];
      const k = ekey((ax + bx) / 2, (ay + by) / 2);
      const j = seen.get(k);
      if (j === undefined) { seen.set(k, i); continue; }
      const q = j * 6;
      p[0] = v[q + 2 * fr]; p[1] = v[q + 2 * fr + 1];
      p[2] = v[q + 2 * i0]; p[3] = v[q + 2 * i0 + 1];
      p[4] = v[o + 2 * fr]; p[5] = v[o + 2 * fr + 1];
      p[6] = v[q + 2 * i1]; p[7] = v[q + 2 * i1 + 1];
      out.add(tris.t[j], p, tris.anc[j], dirOf);
      seen.delete(k);
    }
    return out;
  }

  /* Deduplicated edge segments of a half-tile list: every tile edge once, internal
     (glue) edges never. Used for the line drawings and the inflation-level overlay. */
  function edgesOf(mode, tris, rect) {
    const legs = mode === 'p3' ? [[0, 1], [0, 2]] : [[0, 2], [1, 2]];
    const seen = new Set(), seg = [], v = tris.v;
    for (let i = 0; i < tris.n; i++) {
      const o = i * 6;
      for (let e = 0; e < 2; e++) {
        const a = legs[e][0], b = legs[e][1];
        const x1 = v[o + 2 * a], y1 = v[o + 2 * a + 1], x2 = v[o + 2 * b], y2 = v[o + 2 * b + 1];
        if (Math.min(x1, x2) > rect.x1 || Math.max(x1, x2) < rect.x0 ||
            Math.min(y1, y2) > rect.y1 || Math.max(y1, y2) < rect.y0) continue;
        const k = ekey((x1 + x2) / 2, (y1 + y2) / 2);
        if (seen.has(k)) continue;
        seen.add(k);
        seg.push(x1, y1, x2, y2);
      }
    }
    return Float64Array.from(seg);
  }

  function tileEdges(tiles, rect) {
    const seen = new Set(), seg = [], xy = tiles.xy;
    for (let i = 0; i < tiles.n; i++) {
      const o = tiles.off[i], m = tiles.nv[i];
      for (let e = 0; e < m; e++) {
        const a = e, b = (e + 1) % m;
        const x1 = xy[o + 2 * a], y1 = xy[o + 2 * a + 1], x2 = xy[o + 2 * b], y2 = xy[o + 2 * b + 1];
        if (Math.min(x1, x2) > rect.x1 || Math.max(x1, x2) < rect.x0 ||
            Math.min(y1, y2) > rect.y1 || Math.max(y1, y2) < rect.y0) continue;
        const k = ekey((x1 + x2) / 2, (y1 + y2) / 2);
        if (seen.has(k)) continue;
        seen.add(k);
        seg.push(x1, y1, x2, y2);
      }
    }
    return Float64Array.from(seg);
  }

  /* ================================================================
     Hat (2023) and Spectre (2023) monotiles
     Smith, Myers, Kaplan, Goodman-Strauss — arXiv:2303.10798, 2305.17743.
     Hat substitution is the published H/T/P/F metatile system; Spectre is
     the nine-hex substitution of the chiral paper. Affine matching is the
     standard segment-to-segment map used in the authors' constructions.
  ================================================================ */
  const HR3 = Math.sqrt(3) / 2;
  const AF_ID = [1, 0, 0, 0, 1, 0];
  const afMul = (A, B) => [
    A[0] * B[0] + A[1] * B[3], A[0] * B[1] + A[1] * B[4], A[0] * B[2] + A[1] * B[5] + A[2],
    A[3] * B[0] + A[4] * B[3], A[3] * B[1] + A[4] * B[4], A[3] * B[2] + A[4] * B[5] + A[5],
  ];
  const afInv = (T) => {
    const det = T[0] * T[4] - T[1] * T[3];
    return [T[4] / det, -T[1] / det, (T[1] * T[5] - T[2] * T[4]) / det,
      -T[3] / det, T[0] / det, (T[2] * T[3] - T[0] * T[5]) / det];
  };
  const afRot = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0]; };
  const afTr = (x, y) => [1, 0, x, 0, 1, y];
  const afPt = (M, P) => ({ x: M[0] * P.x + M[1] * P.y + M[2], y: M[3] * P.x + M[4] * P.y + M[5] });
  const afAdd = (p, q) => ({ x: p.x + q.x, y: p.y + q.y });
  const afSub = (p, q) => ({ x: p.x - q.x, y: p.y - q.y });
  const afRotAbout = (p, a) => afMul(afTr(p.x, p.y), afMul(afRot(a), afTr(-p.x, -p.y)));
  const matchSeg = (p, q) => [q.x - p.x, p.y - q.y, p.x, q.y - p.y, q.x - p.x, p.y];
  const matchTwo = (p1, q1, p2, q2) => afMul(matchSeg(p2, q2), afInv(matchSeg(p1, q1)));
  function intersectSeg(p1, q1, p2, q2) {
    const d = (q2.y - p2.y) * (q1.x - p1.x) - (q2.x - p2.x) * (q1.y - p1.y);
    const u = ((q2.x - p2.x) * (p1.y - p2.y) - (q2.y - p2.y) * (p1.x - p2.x)) / d;
    return { x: p1.x + u * (q1.x - p1.x), y: p1.y + u * (q1.y - p1.y) };
  }
  const hexPt = (x, y) => ({ x: x + 0.5 * y, y: HR3 * y });
  const HAT_OUT = [
    hexPt(0, 0), hexPt(-1, -1), hexPt(0, -2), hexPt(2, -2),
    hexPt(2, -1), hexPt(4, -2), hexPt(5, -1), hexPt(4, 0),
    hexPt(3, 0), hexPt(2, 2), hexPt(0, 3), hexPt(0, 2), hexPt(-1, 2),
  ];
  const HAT_TYPE = { H1: 0, H: 1, T: 2, P: 3, F: 4 };
  function hatLeaf(label) { return { leaf: true, label: label }; }
  function hatMeta(shape, children) { return { shape: shape, children: children }; }
  function hatChildPt(node, n, i) {
    const ch = node.children[n];
    return afPt(ch.T, ch.geom.shape[i]);
  }
  function hatRecenter(node) {
    let cx = 0, cy = 0, n = node.shape.length;
    for (const p of node.shape) { cx += p.x; cy += p.y; }
    cx /= n; cy /= n;
    for (let i = 0; i < n; i++) node.shape[i] = afAdd(node.shape[i], { x: -cx, y: -cy });
    const M = afTr(-cx, -cy);
    for (const ch of node.children) ch.T = afMul(M, ch.T);
  }

  function hatInit() {
    const H_hat = hatLeaf('H'), H1_hat = hatLeaf('H1'), T_hat = hatLeaf('T'), P_hat = hatLeaf('P'), F_hat = hatLeaf('F');
    const Ho = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4.5, y: HR3 }, { x: 2.5, y: 5 * HR3 }, { x: 1.5, y: 5 * HR3 }, { x: -0.5, y: HR3 }];
    const H = hatMeta(Ho, [
      { T: matchTwo(HAT_OUT[5], HAT_OUT[7], Ho[5], Ho[0]), geom: H_hat },
      { T: matchTwo(HAT_OUT[9], HAT_OUT[11], Ho[1], Ho[2]), geom: H_hat },
      { T: matchTwo(HAT_OUT[5], HAT_OUT[7], Ho[3], Ho[4]), geom: H_hat },
      { T: afMul(afTr(2.5, HR3), afMul([-0.5, -HR3, 0, HR3, -0.5, 0], [0.5, 0, 0, 0, -0.5, 0])), geom: H1_hat },
    ]);
    const To = [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 1.5, y: 3 * HR3 }];
    const T = hatMeta(To, [{ T: [0.5, 0, 0.5, 0, 0.5, HR3], geom: T_hat }]);
    const Po = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 3, y: 2 * HR3 }, { x: -1, y: 2 * HR3 }];
    const P = hatMeta(Po, [
      { T: [0.5, 0, 1.5, 0, 0.5, HR3], geom: P_hat },
      { T: afMul(afTr(0, 2 * HR3), afMul([0.5, HR3, 0, -HR3, 0.5, 0], [0.5, 0, 0, 0, 0.5, 0])), geom: P_hat },
    ]);
    const Fo = [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 3.5, y: HR3 }, { x: 3, y: 2 * HR3 }, { x: -1, y: 2 * HR3 }];
    const F = hatMeta(Fo, [
      { T: [0.5, 0, 1.5, 0, 0.5, HR3], geom: F_hat },
      { T: afMul(afTr(0, 2 * HR3), afMul([0.5, HR3, 0, -HR3, 0.5, 0], [0.5, 0, 0, 0, 0.5, 0])), geom: F_hat },
    ]);
    return [H, T, P, F];
  }

  function hatPatch(H, T, P, F) {
    const rules = [
      ['H'], [0, 0, 'P', 2], [1, 0, 'H', 2], [2, 0, 'P', 2], [3, 0, 'H', 2], [4, 4, 'P', 2],
      [0, 4, 'F', 3], [2, 4, 'F', 3], [4, 1, 3, 2, 'F', 0], [8, 3, 'H', 0], [9, 2, 'P', 0],
      [10, 2, 'H', 0], [11, 4, 'P', 2], [12, 0, 'H', 2], [13, 0, 'F', 3], [14, 2, 'F', 1],
      [15, 3, 'H', 4], [8, 2, 'F', 1], [17, 3, 'H', 0], [18, 2, 'P', 0], [19, 2, 'H', 2],
      [20, 4, 'F', 3], [20, 0, 'P', 2], [22, 0, 'H', 2], [23, 4, 'F', 3], [23, 0, 'F', 3],
      [16, 0, 'P', 2], [9, 4, 0, 2, 'T', 2], [4, 0, 'F', 3],
    ];
    const ret = hatMeta([], []);
    const shapes = { H: H, T: T, P: P, F: F };
    for (const r of rules) {
      if (r.length === 1) ret.children.push({ T: AF_ID, geom: shapes[r[0]] });
      else if (r.length === 4) {
        const poly = ret.children[r[0]].geom.shape, Tr = ret.children[r[0]].T;
        const P0 = afPt(Tr, poly[(r[1] + 1) % poly.length]), Q0 = afPt(Tr, poly[r[1]]);
        const nshp = shapes[r[2]], npoly = nshp.shape;
        ret.children.push({ T: matchTwo(npoly[r[3]], npoly[(r[3] + 1) % npoly.length], P0, Q0), geom: nshp });
      } else {
        const chP = ret.children[r[0]], chQ = ret.children[r[2]];
        const P0 = afPt(chQ.T, chQ.geom.shape[r[3]]), Q0 = afPt(chP.T, chP.geom.shape[r[1]]);
        const nshp = shapes[r[4]], npoly = nshp.shape;
        ret.children.push({ T: matchTwo(npoly[r[5]], npoly[(r[5] + 1) % npoly.length], P0, Q0), geom: nshp });
      }
    }
    return ret;
  }

  function hatPromote(patch) {
    const bps1 = hatChildPt(patch, 8, 2), bps2 = hatChildPt(patch, 21, 2);
    const rbps = afPt(afRotAbout(bps1, -2 * Math.PI / 3), bps2);
    const p72 = hatChildPt(patch, 7, 2), p252 = hatChildPt(patch, 25, 2);
    const llc = intersectSeg(bps1, rbps, hatChildPt(patch, 6, 2), p72);
    let w = afSub(hatChildPt(patch, 6, 2), llc);
    const nH = [llc, bps1];
    w = afPt(afRot(-Math.PI / 3), w);
    nH.push(afAdd(nH[1], w));
    nH.push(hatChildPt(patch, 14, 2));
    w = afPt(afRot(-Math.PI / 3), w);
    nH.push(afSub(nH[3], w));
    nH.push(hatChildPt(patch, 6, 2));
    const H = hatMeta(nH, [0, 9, 16, 27, 26, 6, 1, 8, 10, 15].map(i => patch.children[i]));
    const P = hatMeta([p72, afAdd(p72, afSub(bps1, llc)), bps1, llc], [7, 2, 3, 4, 28].map(i => patch.children[i]));
    const F = hatMeta(
      [bps2, hatChildPt(patch, 24, 2), hatChildPt(patch, 25, 0), p252, afAdd(p252, afSub(llc, bps1))],
      [21, 20, 22, 23, 24, 25].map(i => patch.children[i])
    );
    const AAA = nH[2], BBB = afAdd(nH[1], afSub(nH[4], nH[5])), CCC = afPt(afRotAbout(BBB, -Math.PI / 3), AAA);
    const T = hatMeta([BBB, CCC, AAA], [patch.children[11]]);
    hatRecenter(H); hatRecenter(P); hatRecenter(F); hatRecenter(T);
    return [H, T, P, F];
  }

  const S3 = Math.sqrt(3);
  const SPEC_PTS = [
    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1.5, y: -S3 / 2 },
    { x: 1.5 + S3 / 2, y: 0.5 - S3 / 2 }, { x: 1.5 + S3 / 2, y: 1.5 - S3 / 2 },
    { x: 2.5 + S3 / 2, y: 1.5 - S3 / 2 }, { x: 3 + S3 / 2, y: 1.5 },
    { x: 3, y: 2 }, { x: 3 - S3 / 2, y: 1.5 },
    { x: 2.5 - S3 / 2, y: 1.5 + S3 / 2 }, { x: 1.5 - S3 / 2, y: 1.5 + S3 / 2 },
    { x: 0.5 - S3 / 2, y: 1.5 + S3 / 2 }, { x: -S3 / 2, y: 1.5 }, { x: 0, y: 1 },
  ];
  const SPEC_NAMES = ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi'];
  const SPEC_TYPE = { Gamma: 0, Gamma1: 0, Gamma2: 1, Delta: 2, Theta: 3, Lambda: 4, Xi: 5, Pi: 6, Sigma: 7, Phi: 8, Psi: 9 };
  const SPEC_RULES = {
    Gamma:  ['Pi', 'Delta', null, 'Theta', 'Sigma', 'Xi', 'Phi', 'Gamma'],
    Delta:  ['Xi', 'Delta', 'Xi', 'Phi', 'Sigma', 'Pi', 'Phi', 'Gamma'],
    Theta:  ['Psi', 'Delta', 'Pi', 'Phi', 'Sigma', 'Pi', 'Phi', 'Gamma'],
    Lambda: ['Psi', 'Delta', 'Xi', 'Phi', 'Sigma', 'Pi', 'Phi', 'Gamma'],
    Xi:     ['Psi', 'Delta', 'Pi', 'Phi', 'Sigma', 'Psi', 'Phi', 'Gamma'],
    Pi:     ['Psi', 'Delta', 'Xi', 'Phi', 'Sigma', 'Psi', 'Phi', 'Gamma'],
    Sigma:  ['Xi', 'Delta', 'Xi', 'Phi', 'Sigma', 'Pi', 'Lambda', 'Gamma'],
    Phi:    ['Psi', 'Delta', 'Psi', 'Phi', 'Sigma', 'Pi', 'Phi', 'Gamma'],
    Psi:    ['Psi', 'Delta', 'Psi', 'Phi', 'Sigma', 'Psi', 'Phi', 'Gamma'],
  };
  const SPEC_STEPS = [[60, 3, 1], [0, 2, 0], [60, 3, 1], [60, 3, 1], [0, 2, 0], [60, 3, 1], [-120, 3, 3]];

  function spectreBase() {
    const quad = [SPEC_PTS[3], SPEC_PTS[5], SPEC_PTS[7], SPEC_PTS[11]];
    const sys = {};
    for (const name of SPEC_NAMES) {
      if (name === 'Gamma') continue;
      sys[name] = { leaf: true, label: name, quad: quad };
    }
    sys.Gamma = {
      children: [
        { geom: { leaf: true, label: 'Gamma1' }, T: AF_ID },
        { geom: { leaf: true, label: 'Gamma2' }, T: afMul(afTr(SPEC_PTS[8].x, SPEC_PTS[8].y), afRot(Math.PI / 6)) },
      ],
      quad: quad,
    };
    return sys;
  }
  function spectrePromote(sys) {
    const quad = sys.Delta.quad, R = [-1, 0, 0, 0, 1, 0];
    const trs = [AF_ID];
    let total = 0, rotation = AF_ID, tq = quad.slice();
    for (const [ang, from, to] of SPEC_STEPS) {
      if (ang !== 0) {
        total += ang;
        rotation = afRot(total * Math.PI / 180);
        tq = quad.map(p => afPt(rotation, p));
      }
      const ttt = afTr(afPt(trs[trs.length - 1], quad[from]).x - tq[to].x, afPt(trs[trs.length - 1], quad[from]).y - tq[to].y);
      trs.push(afMul(ttt, rotation));
    }
    for (let i = 0; i < trs.length; i++) trs[i] = afMul(R, trs[i]);
    const superQuad = [afPt(trs[6], quad[2]), afPt(trs[5], quad[1]), afPt(trs[3], quad[2]), afPt(trs[0], quad[1])];
    const out = {};
    for (const name of SPEC_NAMES) {
      const subs = SPEC_RULES[name], children = [];
      for (let i = 0; i < subs.length; i++) {
        if (!subs[i]) continue;
        children.push({ geom: sys[subs[i]], T: trs[i] });
      }
      out[name] = { children: children, quad: superQuad };
    }
    return out;
  }

  function walkLeaves(node, T, visit) {
    if (node.leaf) { visit(node, T); return; }
    for (const ch of node.children) walkLeaves(ch.geom, afMul(T, ch.T), visit);
  }

  function buildMono(s, kind, rect, dirOf) {
    const depth = Math.max(1, Math.min(s.depth, (kind === 'hat' ? 6 : 5)));
    let root, outline, typeOf;
    if (kind === 'hat') {
      let tiles = hatInit();
      for (let k = 1; k < depth; k++) tiles = hatPromote(hatPatch(tiles[0], tiles[1], tiles[2], tiles[3]));
      const pick = (Math.abs(s.panx) + Math.abs(s.pany) > 0.05) ? (Math.floor((s.panx + 3) * 2) % 4) : 0;
      root = tiles[pick];
      outline = HAT_OUT;
      typeOf = lab => HAT_TYPE[lab] || 0;
    } else {
      let sys = spectreBase();
      for (let k = 1; k < depth; k++) sys = spectrePromote(sys);
      root = sys.Delta;
      outline = SPEC_PTS;
      typeOf = lab => SPEC_TYPE[lab] || 0;
    }
    const leaves = [];
    walkLeaves(root, AF_ID, (node, T) => leaves.push({ node, T }));
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const tmp = [];
    for (const L of leaves) {
      for (const p of outline) {
        const q = afPt(L.T, p);
        if (q.x < x0) x0 = q.x; if (q.x > x1) x1 = q.x;
        if (q.y < y0) y0 = q.y; if (q.y > y1) y1 = q.y;
      }
    }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const bw = Math.max(1e-6, x1 - x0), bh = Math.max(1e-6, y1 - y0);
    const hx = (rect.x1 - rect.x0) * 0.42, hy = (rect.y1 - rect.y0) * 0.42;
    const sc = Math.min(hx * 2 / bw, hy * 2 / bh) * s.zoom;
    const th = s.rotation * Math.PI / 180, co = Math.cos(th), si = Math.sin(th);
    const ox = s.panx * hy, oy = s.pany * hy;
    const out = tileSet(Math.max(64, leaves.length));
    const pbuf = new Float64Array(outline.length * 2);
    for (const L of leaves) {
      let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
      for (let i = 0; i < outline.length; i++) {
        const q = afPt(L.T, outline[i]);
        const vx = (q.x - cx) * sc, vy = (q.y - cy) * sc;
        const wx = vx * co - vy * si + ox, wy = vx * si + vy * co + oy;
        pbuf[2 * i] = wx; pbuf[2 * i + 1] = wy;
        if (wx < minx) minx = wx; if (wx > maxx) maxx = wx;
        if (wy < miny) miny = wy; if (wy > maxy) maxy = wy;
      }
      if (minx > rect.x1 || maxx < rect.x0 || miny > rect.y1 || maxy < rect.y0) continue;
      const an = (Math.round(L.T[2] * 8) * 131 + Math.round(L.T[5] * 8)) | 0;
      out.add(typeOf(L.node.label), pbuf, an, dirOf);
    }
    return out;
  }

  /* ================================================================
     de Bruijn dual multigrid (Ammann–Beenker, dodecagonal)
  ================================================================ */
  function multigrid(n, gamma, cx, cy, rad, xf, rect, dirOf) {
    const e = [], f = [];
    for (let j = 0; j < n; j++) {
      const a = j * Math.PI / n;
      e.push([Math.cos(a), Math.sin(a)]); f.push([-Math.sin(a), Math.cos(a)]);
    }
    const out = tileSet(4096), p = new Float64Array(8);
    for (let j = 0; j < n; j++) for (let l = j + 1; l < n; l++) {
      const co = e[j][0] * e[l][0] + e[j][1] * e[l][1];
      const si = f[j][0] * e[l][0] + f[j][1] * e[l][1];
      const mid = cx * e[j][0] + cy * e[j][1];
      const kj0 = Math.ceil(mid - rad - gamma[j]), kj1 = Math.floor(mid + rad - gamma[j]);
      for (let kj = kj0; kj <= kj1; kj++) {
        const aj = kj + gamma[j];
        const ox = aj * e[j][0] - cx, oy = aj * e[j][1] - cy;
        const b = ox * f[j][0] + oy * f[j][1], cc = ox * ox + oy * oy - rad * rad;
        const disc = b * b - cc;
        if (disc <= 0) continue;
        const sq = Math.sqrt(disc);
        const u0 = aj * co + (-b - sq) * si - gamma[l], u1 = aj * co + (-b + sq) * si - gamma[l];
        const lo = Math.ceil(Math.min(u0, u1)), hi = Math.floor(Math.max(u0, u1));
        for (let kl = lo; kl <= hi; kl++) {
          const t = (kl + gamma[l] - aj * co) / si;
          const px = aj * e[j][0] + t * f[j][0], py = aj * e[j][1] + t * f[j][1];
          let vx = kj * e[j][0] + kl * e[l][0], vy = kj * e[j][1] + kl * e[l][1];
          for (let i = 0; i < n; i++) {
            if (i === j || i === l) continue;
            const K = Math.ceil(px * e[i][0] + py * e[i][1] - gamma[i]);
            vx += K * e[i][0]; vy += K * e[i][1];
          }
          const qx = [vx, vx + e[j][0], vx + e[j][0] + e[l][0], vx + e[l][0]];
          const qy = [vy, vy + e[j][1], vy + e[j][1] + e[l][1], vy + e[l][1]];
          let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
          for (let i = 0; i < 4; i++) {
            const wx = xf.c * qx[i] + xf.s * qy[i] + xf.tx, wy = -xf.s * qx[i] + xf.c * qy[i] + xf.ty;
            p[2 * i] = wx; p[2 * i + 1] = wy;
            if (wx < x0) x0 = wx; if (wx > x1) x1 = wx;
            if (wy < y0) y0 = wy; if (wy > y1) y1 = wy;
          }
          if (x0 > rect.x1 || x1 < rect.x0 || y0 > rect.y1 || y1 < rect.y0) continue;
          const d = Math.min(Math.abs(j - l), n - Math.abs(j - l));
          out.add(d === n / 2 ? n / 2 - 1 : d - 1, p, kj * 31 + kl, dirOf);
        }
      }
    }
    return out;
  }

  /* ================================================================
     the model: geometry for the current seed + state
  ================================================================ */
  function spanOf(depth, zoom, inflate) { return BASE * Math.pow(inflate || PHI, depth - 1) / zoom; }

  function fitDepth(s) {
    const ar = ASPECTS[s.aspect] || 1, M = MODES[s.mode], avg = M.avg;
    let d = s.depth;
    if (M.maxDepth) d = Math.min(d, M.maxDepth);
    while (d > 1) {
      const hy = spanOf(d, s.zoom, M.inflate), hx = hy / ar;
      if (4 * hx * hy / avg <= CAP) break;
      d--;
    }
    return d;
  }

  function buildModel(s) {
    const M = MODES[s.mode], ar = ASPECTS[s.aspect] || 1;
    const depth = fitDepth(s);
    const hy = spanOf(depth, s.zoom, M.inflate), hx = hy / ar;
    const rng = U.makeRng(s.seed + '/tilings/' + s.mode);
    const th = s.rotation * Math.PI / 180, co = Math.cos(th), si = Math.sin(th);
    // view center in tiling coordinates: pan plus a seeded crop offset, in view-heights
    const ccx = (s.panx + rng.range(-1.2, 1.2)) * hy, ccy = (s.pany + rng.range(-1.2, 1.2)) * hy;
    // world -> view: rotate by -th about the view center
    const xf = { c: co, s: si, tx: -(ccx * co + ccy * si), ty: -(-ccx * si + ccy * co) };
    const margin = 2.5 + 0.05 * Math.max(hx, hy);
    const rect = { x0: -hx - margin, x1: hx + margin, y0: -hy - margin, y1: hy + margin };
    const step = Math.PI / (M.dirs / 2);
    const dirOf = (dx, dy) => {
      const a = Math.atan2(dy, dx) + th - M.phase;
      return ((Math.round(a / step) % M.dirs) + M.dirs) % M.dirs;
    };

    let tiles, levelSegs = [], levels = 0;
    if (M.build === 'mono') {
      tiles = buildMono(s, M.kind, rect, dirOf);
    } else if (M.build === 'sub') {
      const cx = xf.tx, cy = xf.ty;                    // tiling origin, in view coordinates
      const need = Math.hypot(Math.abs(cx) + rect.x1, Math.abs(cy) + rect.y1) + 1;
      levels = Math.max(1, Math.min(26, Math.ceil(Math.log(need / 0.92) / Math.log(PHI))));
      let tris = seedWheel(Math.pow(PHI, levels), cx, cy, -th);
      const stampAt = Math.max(0, levels - s.superLevel);
      const keep = Math.min(5, levels - 1);
      const coarse = [];
      for (let k = 0; k < levels; k++) {
        tris = deflate(s.mode, tris, rect, k === stampAt);
        if (levels - 1 - k <= keep && levels - 1 - k >= 1) coarse[levels - 1 - k] = tris;
      }
      tiles = glue(s.mode, tris, dirOf);
      for (let k = 1; k <= keep; k++) if (coarse[k]) levelSegs.push(edgesOf(s.mode, coarse[k], rect));
      tiles.tris = tris;
    } else {
      const n = M.n, gamma = [];
      for (let i = 0; i < n; i++) gamma.push(rng.range(0.08, 0.92));
      const rad = (Math.hypot(rect.x1, rect.y1) + 2 * n + 4) * 2 / n;
      const gx = (ccx * 2 / n), gy = (ccy * 2 / n);
      tiles = multigrid(n, gamma, gx, gy, rad, xf, rect, dirOf);
    }
    return { mode: s.mode, tiles, levelSegs, levels, depth, hx, hy, rect, edges: null };
  }

  /* ================================================================
     painting
  ================================================================ */
  const JIT = 17;
  function jitterRamp(pal, amount) {
    const out = [];
    for (let c = 0; c < pal.length; c++) {
      const rgb = U.hexToRgb(pal[c]), hsl = U.rgbToHsl(rgb[0], rgb[1], rgb[2]);
      for (let j = 0; j < JIT; j++) {
        const t = amount === 0 ? 0 : ((j / (JIT - 1)) * 2 - 1) * amount;
        out.push(amount === 0 ? pal[c] : U.hslToHex(hsl[0], U.clamp(hsl[1] * (1 - 0.22 * t), 0, 100), U.clamp(hsl[2] + t * 13, 4, 96)));
      }
    }
    return out;
  }
  const mix32 = v => { v = Math.imul(v ^ (v >>> 15), 2246822507); v = Math.imul(v ^ (v >>> 13), 3266489909); return (v ^ (v >>> 16)) >>> 0; };

  // Mitred inward offset of a polygon; returns false when the inset collapses it.
  function insetPoly(px, py, n, d, out) {
    let per = 0, area = 0;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      per += Math.hypot(px[j] - px[i], py[j] - py[i]);
      area += px[i] * py[j] - px[j] * py[i];
    }
    const dd = Math.min(d, 0.42 * Math.abs(area) / per);
    for (let i = 0; i < n; i++) {
      const h = (i + n - 1) % n, j = (i + 1) % n;
      let ux = px[i] - px[h], uy = py[i] - py[h];
      let wx = px[j] - px[i], wy = py[j] - py[i];
      const lu = Math.hypot(ux, uy) || 1, lw = Math.hypot(wx, wy) || 1;
      ux /= lu; uy /= lu; wx /= lw; wy /= lw;
      const nux = -uy, nuy = ux, nwx = -wy, nwy = wx;
      const den = 1 + nux * nwx + nuy * nwy;
      if (den < 0.12) return false;
      out[2 * i] = px[i] + dd * (nux + nwx) / den;
      out[2 * i + 1] = py[i] + dd * (nuy + nwy) / den;
    }
    return true;
  }

  function render(c2, w, h, s, M, grainTile) {
    const sc = Math.max(w / (2 * M.hx), h / (2 * M.hy));
    const ox = w / 2, oy = h / 2;
    const pal = s.palette, np = pal.length;
    const tiles = M.tiles, xy = tiles.xy;
    const ink = pal[Math.min(np - 1, s.strokeColor)];
    const px = new Float64Array(16), py = new Float64Array(16), ins = new Float64Array(32);
    const inset = s.inset, doInset = inset > 0.0005;

    c2.setTransform(1, 0, 0, 1, 0, 0);
    c2.globalAlpha = 1; c2.globalCompositeOperation = 'source-over';
    c2.fillStyle = s.bg; c2.fillRect(0, 0, w, h);
    c2.lineJoin = 'round'; c2.lineCap = 'round';

    const lwBase = Math.max(0.35 * h / 900, s.strokeWidth * sc * 0.035);

    /* ---- fills ---- */
    if (s.fill !== 'none') {
      const hex = jitterRamp(pal, s.jitter * 0.85);
      const buckets = new Map();
      for (let i = 0; i < tiles.n; i++) {
        let ci;
        if (s.fill === 'type') ci = tiles.type[i];
        else if (s.fill === 'orient') ci = tiles.cls[i];
        else ci = mix32(tiles.anc[i] + 7) & 1023;
        ci = (ci + s.shift) % np;
        const ji = s.jitter > 0 ? mix32(i * 2654435761 + 11) % JIT : (JIT >> 1);
        const key = ci * JIT + ji;
        let path = buckets.get(key);
        if (!path) buckets.set(key, path = new Path2D());
        const o = tiles.off[i], m = tiles.nv[i];
        for (let k = 0; k < m; k++) { px[k] = ox + xy[o + 2 * k] * sc; py[k] = oy - xy[o + 2 * k + 1] * sc; }
        if (doInset && insetPoly(px, py, m, inset * sc, ins)) {
          path.moveTo(ins[0], ins[1]);
          for (let k = 1; k < m; k++) path.lineTo(ins[2 * k], ins[2 * k + 1]);
        } else {
          path.moveTo(px[0], py[0]);
          for (let k = 1; k < m; k++) path.lineTo(px[k], py[k]);
        }
        path.closePath();
      }
      for (const [key, path] of buckets) { c2.fillStyle = hex[key]; c2.fill(path); }
    }

    /* ---- tile outlines ---- */
    if (s.strokeWidth > 0.001) {
      c2.strokeStyle = ink; c2.lineWidth = lwBase;
      if (s.linework && !doInset) {
        if (!M.edges) M.edges = tileEdges(tiles, M.rect);
        const e = M.edges, path = new Path2D();
        for (let i = 0; i < e.length; i += 4) {
          path.moveTo(ox + e[i] * sc, oy - e[i + 1] * sc);
          path.lineTo(ox + e[i + 2] * sc, oy - e[i + 3] * sc);
        }
        c2.stroke(path);
      } else {
        const path = new Path2D();
        for (let i = 0; i < tiles.n; i++) {
          const o = tiles.off[i], m = tiles.nv[i];
          for (let k = 0; k < m; k++) { px[k] = ox + xy[o + 2 * k] * sc; py[k] = oy - xy[o + 2 * k + 1] * sc; }
          const use = doInset && insetPoly(px, py, m, inset * sc, ins);
          path.moveTo(use ? ins[0] : px[0], use ? ins[1] : py[0]);
          for (let k = 1; k < m; k++) path.lineTo(use ? ins[2 * k] : px[k], use ? ins[2 * k + 1] : py[k]);
          path.closePath();
        }
        c2.stroke(path);
      }
    }

    /* ---- inflation-level overlay: earlier generations drawn heavier ---- */
    if (s.levels > 0 && M.levelSegs.length) {
      c2.strokeStyle = ink;
      const nl = Math.min(s.levels, M.levelSegs.length);
      for (let k = nl - 1; k >= 0; k--) {
        const e = M.levelSegs[k], path = new Path2D();
        for (let i = 0; i < e.length; i += 4) {
          path.moveTo(ox + e[i] * sc, oy - e[i + 1] * sc);
          path.lineTo(ox + e[i + 2] * sc, oy - e[i + 3] * sc);
        }
        c2.lineWidth = Math.max(lwBase, 0.35 * h / 900) * Math.pow(s.levelWeight, k + 1);
        c2.stroke(path);
      }
    }

    /* ---- matching-rule arcs ---- */
    const arcSpec = ARCS[M.mode];
    if (s.arcs && arcSpec) {
      const paths = [new Path2D(), new Path2D()];
      for (let i = 0; i < tiles.n; i++) {
        const spec = arcSpec[tiles.type[i]], o = tiles.off[i], fl = tiles.flip[i];
        for (let k = 0; k < 4; k++) { px[k] = ox + xy[o + 2 * k] * sc; py[k] = oy - xy[o + 2 * k + 1] * sc; }
        for (let a = 0; a < 2; a++) {
          const idx = spec.c[a], r = spec.r[fl ? 1 - a : a] * sc;
          const prev = (idx + 3) & 3, next = (idx + 1) & 3;
          const aOut = Math.atan2(py[next] - py[idx], px[next] - px[idx]);
          const aIn = Math.atan2(py[prev] - py[idx], px[prev] - px[idx]);
          const p = paths[spec.f[fl ? 1 - a : a]];
          p.moveTo(px[idx] + r * Math.cos(aOut), py[idx] + r * Math.sin(aOut));
          p.arc(px[idx], py[idx], r, aOut, aIn, true);
        }
      }
      c2.lineCap = 'butt';
      for (let a = 0; a < 2; a++) {
        c2.strokeStyle = pal[(s.arcColor + a) % np];
        c2.lineWidth = Math.max(0.4 * h / 900, s.arcWidth * sc * 0.035);
        c2.stroke(paths[a]);
      }
      c2.lineCap = 'round';
    }

    if (s.grain > 0) {
      c2.save();
      c2.globalCompositeOperation = 'overlay';
      c2.globalAlpha = s.grain * 0.7;
      c2.fillStyle = c2.createPattern(grainTile, 'repeat');
      c2.fillRect(0, 0, w, h);
      c2.restore();
    }
  }

  /* ================================================================
     schema
  ================================================================ */
  const SCHEMA = [
    { group: 'Tiling', key: 'mode', label: 'Tiling', type: 'seg', kind: GEOM, wrap: true,
      options: [['p3', 'Penrose rhombs'], ['p2', 'Kite & dart'], ['hat', 'Hat'], ['spec', 'Spectre'], ['ab', 'Ammann–Beenker'], ['d12', 'Dodecagonal']] },
    { group: 'Tiling', key: 'depth', label: 'Substitution depth', type: 'range', kind: GEOM, min: 1, max: 9, step: 1,
      hint: 'Each step shrinks the tiles by the golden ratio, so the frame holds φ² times as many.' },
    { group: 'Tiling', key: 'zoom', label: 'Zoom', type: 'range', kind: GEOM, min: 0.3, max: 4, step: 0.05, fmt: f2 },
    { group: 'Tiling', key: 'rotation', label: 'Rotation', type: 'range', kind: GEOM, min: 0, max: 360, step: 1, fmt: deg },
    { group: 'Tiling', key: 'panx', label: 'Pan x', type: 'range', kind: GEOM, min: -3, max: 3, step: 0.05, fmt: f2 },
    { group: 'Tiling', key: 'pany', label: 'Pan y', type: 'range', kind: GEOM, min: -3, max: 3, step: 0.05, fmt: f2 },

    { group: 'Tiles', key: 'fill', label: 'Fill', type: 'seg', kind: PAINT, wrap: true,
      options: [['type', 'By tile type'], ['orient', 'By orientation'], ['gen', 'By supertile'], ['none', 'None']] },
    { group: 'Tiles', key: 'superLevel', label: 'Supertile generation', type: 'range', kind: GEOM, min: 1, max: 5, step: 1,
      dimUnless: s => s.fill === 'gen' && (s.mode === 'p3' || s.mode === 'p2') },
    { group: 'Tiles', key: 'shift', label: 'Palette offset', type: 'range', kind: PAINT, min: 0, max: 15, step: 1, dimUnless: s => s.fill !== 'none' },
    { group: 'Tiles', key: 'jitter', label: 'Color jitter', type: 'range', kind: PAINT, min: 0, max: 1, step: 0.02, fmt: pct, dimUnless: s => s.fill !== 'none' },
    { group: 'Tiles', key: 'inset', label: 'Gap inset (grout)', type: 'range', kind: PAINT, min: 0, max: 0.12, step: 0.002, fmt: v => v.toFixed(3) },

    { group: 'Line', key: 'strokeWidth', label: 'Stroke weight', type: 'range', kind: PAINT, min: 0, max: 5, step: 0.1, fmt: f1 },
    { group: 'Line', key: 'strokeColor', label: 'Stroke color index', type: 'range', kind: PAINT, min: 0, max: 15, step: 1, dimUnless: s => s.strokeWidth > 0 },
    { group: 'Line', key: 'linework', label: 'Edge-only line drawing', type: 'toggle', kind: PAINT, dimUnless: s => s.inset === 0,
      hint: 'Draws each shared edge once instead of outlining every tile — true hairlines, no doubled strokes.' },
    { group: 'Line', key: 'levels', label: 'Inflation levels', type: 'range', kind: PAINT, min: 0, max: 5, step: 1,
      dimUnless: s => s.mode === 'p3' || s.mode === 'p2' },
    { group: 'Line', key: 'levelWeight', label: 'Level weight', type: 'range', kind: PAINT, min: 1.1, max: 3, step: 0.05, fmt: f2,
      dimUnless: s => s.levels > 0 && (s.mode === 'p3' || s.mode === 'p2') },

    { group: 'Matching rules', key: 'arcs', label: 'Penrose arcs', type: 'toggle', kind: PAINT, dimUnless: s => s.mode === 'p3' || s.mode === 'p2' },
    { group: 'Matching rules', key: 'arcWidth', label: 'Arc weight', type: 'range', kind: PAINT, min: 0.2, max: 5, step: 0.1, fmt: f1, dimUnless: s => s.arcs },
    { group: 'Matching rules', key: 'arcColor', label: 'Arc color index', type: 'range', kind: PAINT, min: 0, max: 15, step: 1, dimUnless: s => s.arcs },

    { group: 'Finish', key: 'grain', label: 'Grain', type: 'range', kind: PAINT, min: 0, max: 1, step: 0.05, fmt: pct },
    { group: 'Finish', key: 'aspect', label: 'Aspect', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['3:2', '3:2'], ['16:9', '16:9']] },
  ];

  const DEFAULTS = {
    mode: 'p3', depth: 5, zoom: 1, rotation: 0, panx: 0, pany: 0,
    fill: 'type', superLevel: 3, shift: 0, jitter: 0.3, inset: 0.012,
    strokeWidth: 1.2, strokeColor: 3, linework: false, levels: 0, levelWeight: 1.8,
    arcs: false, arcWidth: 1.4, arcColor: 0,
    grain: 0.12, aspect: '1:1',
    seed: 'penrose-1974',
  };

  const PRESETS = {
    rhombs: { label: 'Penrose rhombs', p: { mode: 'p3', depth: 5, zoom: 1, fill: 'type', shift: 0, jitter: 0.3, inset: 0.012, strokeWidth: 1.2, strokeColor: 3, linework: false, levels: 0, arcs: false, grain: 0.12, aspect: '1:1' }, palette: Studio.PALETTES.kiln },
    arcs: { label: 'Penrose arcs', p: { mode: 'p3', depth: 6, zoom: 1.1, fill: 'none', inset: 0, strokeWidth: 0.5, strokeColor: 2, linework: true, levels: 0, arcs: true, arcWidth: 1.7, arcColor: 2, grain: 0.1, aspect: '1:1' }, palette: Studio.PALETTES.nightshade },
    kitedart: { label: 'Kite and dart', p: { mode: 'p2', depth: 5, zoom: 1, fill: 'type', shift: 0, jitter: 0.25, inset: 0.02, strokeWidth: 1.1, strokeColor: 4, linework: false, levels: 0, arcs: false, grain: 0.12, aspect: '1:1' }, palette: Studio.PALETTES.harbor },
    ammann: { label: 'Ammann–Beenker', p: { mode: 'ab', depth: 5, zoom: 1, fill: 'orient', shift: 1, jitter: 0.2, inset: 0.016, strokeWidth: 1, strokeColor: 4, linework: false, levels: 0, arcs: false, grain: 0.1, aspect: '1:1' }, palette: Studio.PALETTES.verdigris },
    inflation: { label: 'Inflation levels', p: { mode: 'p3', depth: 7, zoom: 1, fill: 'none', inset: 0, strokeWidth: 0.55, strokeColor: 1, linework: true, levels: 4, levelWeight: 1.85, arcs: false, grain: 0.08, aspect: '1:1' }, palette: Studio.PALETTES.graphite },
    linedrawing: { label: 'Line drawing', p: { mode: 'p2', depth: 7, zoom: 1.2, fill: 'none', inset: 0, strokeWidth: 0.6, strokeColor: 0, linework: true, levels: 0, arcs: false, grain: 0.06, aspect: '4:5' }, palette: Studio.PALETTES.xray },
    dodeca: { label: 'Dodecagonal', p: { mode: 'd12', depth: 5, zoom: 1, fill: 'orient', shift: 0, jitter: 0.3, inset: 0.02, strokeWidth: 1, strokeColor: 3, linework: false, levels: 0, arcs: false, grain: 0.12, aspect: '1:1' }, palette: Studio.PALETTES.tram },
    hat: { label: 'Hat (2023)', p: { mode: 'hat', depth: 4, zoom: 1, fill: 'type', shift: 0, jitter: 0.22, inset: 0.01, strokeWidth: 1, strokeColor: 3, linework: false, levels: 0, arcs: false, grain: 0.1, aspect: '1:1' }, palette: Studio.PALETTES.kiln },
    spectre: { label: 'Spectre (2023)', p: { mode: 'spec', depth: 4, zoom: 1, fill: 'type', shift: 1, jitter: 0.18, inset: 0.008, strokeWidth: 0.9, strokeColor: 4, linework: false, levels: 0, arcs: false, grain: 0.08, aspect: '1:1' }, palette: Studio.PALETTES.nightshade },
    hatline: { label: 'Hat linework', p: { mode: 'hat', depth: 5, zoom: 1.1, fill: 'none', inset: 0, strokeWidth: 0.55, strokeColor: 0, linework: true, levels: 0, arcs: false, grain: 0.06, aspect: '4:5' }, palette: Studio.PALETTES.graphite },
    kilnfloor: { label: 'Kiln floor', p: { mode: 'p3', depth: 6, zoom: 1, fill: 'gen', superLevel: 3, shift: 0, jitter: 0.55, inset: 0.05, strokeWidth: 0, strokeColor: 3, linework: false, levels: 0, arcs: false, grain: 0.22, aspect: '5:4' }, palette: Studio.PALETTES.petri },
  };

  Studio.register({
    id: 'tilings',
    name: 'Aperiodic Tilings',
    subtitle: 'tiles that cover the plane but never repeat · 1974–2023',
    equation: 'Penrose: thick half → 2 thick + 1 thin;   hat: 13-gon + mirror;   spectre: 14-gon, one handedness',
    credit: 'Roger Penrose, Pentaplexity, 1974, and Martin Gardner\'s Mathematical Games, January 1977. Robinson triangles carry the deflation; N. G. de Bruijn\'s dual multigrid (1981) gives the octagonal Ammann–Beenker and dodecagonal cases. The hat — a single 13-sided polykite that tiles the plane only aperiodically, and only with its reflection — is Smith, Myers, Kaplan and Goodman-Strauss, arXiv:2303.10798 (March 2023). The spectre is the chiral 14-gon from the same authors, arXiv:2305.17743: one handedness, no mirrors.',
    order: 85,
    blurb: 'A Penrose tiling covers the plane with two shapes and never repeats: slide a copy of it any distance in any direction and it will never land back on itself, yet every finite patch you can find recurs infinitely often. The patches here are grown by deflation, the operation Penrose used to prove the tilings exist. Start with a wheel of ten half-tiles and cut each one into smaller copies of itself along golden-ratio divisions — thick halves into two thick and one thin, thin halves into one of each — then repeat. Every generation is a legal tiling of the same region with tiles φ times smaller, and the hierarchy of parents is still legible in the finished pattern, which is what the inflation-level linework draws. The arcs are Penrose\'s matching rule made visible: two circular arcs on each tile, placed so that they can only meet edge to edge if the tiling is a correct one, and they knit themselves into the long closed curves that wander across the patch. The eightfold and twelvefold tilings come from a different route to the same phenomenon — de Bruijn\'s dual of a grid of lines in several directions — which is also how quasicrystals were eventually understood: a periodic lattice in a higher-dimensional space, sliced at an irrational angle. The hat (March 2023) is the first tile that does this job alone: a concave 13-gon, union of eight kites, that tiles the plane only aperiodically, and only if you also allow its mirror image. The spectre (July 2023) goes one step further — a 14-gon of a single handedness, no reflections — grown here by the authors\' nine-hex substitution.',
    schema: SCHEMA,
    defaults: DEFAULTS,
    presets: PRESETS,
    closedGroups: ['Matching rules'],
    hints: {
      'Tiling': 'Depth is the number of substitution steps: the patch stays the same size on the page and the tiles shrink, so it doubles as a density control. The seed picks which region of the infinite tiling is cropped — reseed to travel. Hat and Spectre grow a supertile of that depth (the 2023 monotiles); zoom crops it.',
      'Tiles': 'Coloring by supertile reveals the parent tiles a few generations up, the hierarchy that makes these tilings quasiperiodic rather than random.',
      'Matching rules': 'Penrose marked each rhomb with two arcs. A tiling is legal exactly when every arc continues across every edge, which is why the curves close up into loops instead of stopping.',
    },
    palette: true,
    defaultPalette: 'kiln',
    paletteLabel: 'Colors (tile types, then accents)',
    headline: 'depth',
    headlineLabel: 'depth',

    onParam(state) {
      const top = state.palette.length - 1;
      if (state.strokeColor > top) state.strokeColor = top;
      if (state.arcColor > top) state.arcColor = top;
      if (state.shift > top) state.shift = top;
    },

    surprise(rng) {
      const mode = rng.pick(['p3', 'p3', 'p2', 'hat', 'hat', 'spec', 'ab', 'd12']);
      const pen = mode === 'p3' || mode === 'p2';
      const style = rng.pick(['solid', 'solid', 'line', 'arcs', 'levels', 'grout']);
      const fill = style === 'solid' ? rng.pick(['type', 'orient', 'gen']) : (style === 'grout' ? rng.pick(['gen', 'orient']) : 'none');
      return {
        mode,
        depth: style === 'solid' || style === 'grout' ? rng.int(4, 6) : rng.int(5, 8),
        zoom: Math.round(rng.range(0.8, 1.6) * 20) / 20,
        rotation: rng.pick([0, 0, rng.int(0, 359)]),
        panx: 0, pany: 0,
        fill: pen ? fill : (fill === 'gen' ? 'orient' : fill),
        superLevel: rng.int(2, 4),
        shift: rng.int(0, 3),
        jitter: Math.round(rng.range(0.1, 0.7) * 50) / 50,
        inset: style === 'grout' ? Math.round(rng.range(0.03, 0.08) * 500) / 500 : (rng() < 0.4 ? 0.012 : 0),
        strokeWidth: style === 'grout' ? 0 : Math.round(rng.range(0.5, 1.8) * 10) / 10,
        strokeColor: rng.int(0, 4),
        linework: style === 'line' || style === 'arcs',
        levels: style === 'levels' && pen ? rng.int(3, 5) : 0,
        levelWeight: Math.round(rng.range(1.5, 2.2) * 20) / 20,
        arcs: style === 'arcs' && pen,
        arcWidth: Math.round(rng.range(1.2, 2.2) * 10) / 10,
        arcColor: rng.int(0, 3),
        grain: Math.round(rng.range(0.05, 0.25) * 20) / 20,
        aspect: rng.pick(['1:1', '1:1', '4:5', '5:4', '3:2']),
      };
    },

    create(host) {
      const canvas = host.canvas;
      const ctx = canvas.getContext('2d', { alpha: false });
      let model = null;

      const grainTile = (() => {
        const t = document.createElement('canvas'); t.width = t.height = 160;
        const g = t.getContext('2d'), img = g.createImageData(160, 160), d = img.data, r = U.makeRng('tilings/grain');
        for (let i = 0; i < d.length; i += 4) { const v = 128 + r.gauss() * 30; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
        g.putImageData(img, 0, 0); return t;
      })();

      function status(s) {
        const M = MODES[s.mode];
        const parts = ['<span><b>' + M.short + '</b></span>',
          '<span>' + model.tiles.n.toLocaleString() + ' tiles</span>'];
        parts.push('<span>depth ' + model.depth + (model.depth !== s.depth ? ' (capped)' : '') +
          (model.levels ? ' · ' + model.levels + ' inflations' : '') + '</span>');
        host.setStatus(parts.join(''));
      }

      function draw() {
        const s = host.getState();
        render(ctx, canvas.width, canvas.height, s, model, grainTile);
        status(s);
      }

      return {
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        regenerate() { model = buildModel(host.getState()); draw(); },
        repaint() { if (!model) model = buildModel(host.getState()); draw(); },
        resize() { if (!model) model = buildModel(host.getState()); draw(); },
        pause() {},
        resume() { if (model) draw(); },
        async exportPNG(w, h) {
          const s = host.getState();
          if (!model) model = buildModel(s);
          const out = document.createElement('canvas');
          out.width = w; out.height = h;
          render(out.getContext('2d', { alpha: false }), w, h, s, model, grainTile);
          return U.toBlob(out);
        },
        exportSVG(w, h) {
          const s = host.getState();
          if (!model) model = buildModel(s);
          const W = w || 1000, H = h || Math.round(W * (ASPECTS[s.aspect] || 1));
          const sc = Math.max(W / (2 * model.hx), H / (2 * model.hy));
          const ox = W / 2, oy = H / 2;
          const tiles = model.tiles, xy = tiles.xy, pal = s.palette, np = pal.length;
          const ink = pal[Math.min(np - 1, s.strokeColor)] || pal[0] || '#000';
          const lwBase = Math.max(0.35 * H / 900, s.strokeWidth * sc * 0.035);
          const hex = jitterRamp(pal, s.jitter * 0.85);
          const inset = s.inset, doInset = inset > 0.0005;
          const px = new Float64Array(16), py = new Float64Array(16), ins = new Float64Array(32);
          const ptsOf = (n, arr) => {
            const pts = [];
            for (let k = 0; k < n; k++) pts.push(arr[2 * k].toFixed(2) + ',' + arr[2 * k + 1].toFixed(2));
            return pts.join(' ');
          };
          const polyPts = (i) => {
            const o = tiles.off[i], m = tiles.nv[i];
            for (let k = 0; k < m; k++) { px[k] = ox + xy[o + 2 * k] * sc; py[k] = oy - xy[o + 2 * k + 1] * sc; }
            if (doInset && insetPoly(px, py, m, inset * sc, ins)) return { n: m, pts: ptsOf(m, ins) };
            const raw = new Float64Array(2 * m);
            for (let k = 0; k < m; k++) { raw[2 * k] = px[k]; raw[2 * k + 1] = py[k]; }
            return { n: m, pts: ptsOf(m, raw) };
          };
          let body = '';
          if (s.fill !== 'none') {
            for (let i = 0; i < tiles.n; i++) {
              let ci;
              if (s.fill === 'type') ci = tiles.type[i];
              else if (s.fill === 'orient') ci = tiles.cls[i];
              else ci = mix32(tiles.anc[i] + 7) & 1023;
              ci = ((ci + s.shift) % np + np) % np;
              const ji = s.jitter > 0 ? mix32(i * 2654435761 + 11) % JIT : (JIT >> 1);
              const col = hex[ci * JIT + ji] || pal[ci] || pal[0];
              const P = polyPts(i);
              body += '<polygon fill="' + U.svgEsc(col) + '" stroke="none" points="' + P.pts + '"/>\n';
            }
          }
          if (s.strokeWidth > 0.001) {
            if (s.linework && !doInset) {
              if (!model.edges) model.edges = tileEdges(tiles, model.rect);
              const e = model.edges;
              let d = '';
              for (let i = 0; i < e.length; i += 4) {
                d += 'M' + (ox + e[i] * sc).toFixed(2) + ' ' + (oy - e[i + 1] * sc).toFixed(2) +
                     'L' + (ox + e[i + 2] * sc).toFixed(2) + ' ' + (oy - e[i + 3] * sc).toFixed(2);
              }
              body += '<path d="' + d + '" fill="none" stroke="' + U.svgEsc(ink) + '" stroke-width="' + lwBase.toFixed(3) +
                      '" stroke-linejoin="round" stroke-linecap="round"/>\n';
            } else {
              for (let i = 0; i < tiles.n; i++) {
                const P = polyPts(i);
                body += '<polygon fill="none" stroke="' + U.svgEsc(ink) + '" stroke-width="' + lwBase.toFixed(3) +
                        '" stroke-linejoin="round" points="' + P.pts + '"/>\n';
              }
            }
          }
          if (s.levels > 0 && model.levelSegs.length) {
            const nl = Math.min(s.levels, model.levelSegs.length);
            for (let k = nl - 1; k >= 0; k--) {
              const e = model.levelSegs[k];
              let d = '';
              for (let i = 0; i < e.length; i += 4) {
                d += 'M' + (ox + e[i] * sc).toFixed(2) + ' ' + (oy - e[i + 1] * sc).toFixed(2) +
                     'L' + (ox + e[i + 2] * sc).toFixed(2) + ' ' + (oy - e[i + 3] * sc).toFixed(2);
              }
              const lw = Math.max(lwBase, 0.35 * H / 900) * Math.pow(s.levelWeight, k + 1);
              body += '<path d="' + d + '" fill="none" stroke="' + U.svgEsc(ink) + '" stroke-width="' + lw.toFixed(3) +
                      '" stroke-linejoin="round" stroke-linecap="round"/>\n';
            }
          }
          const arcSpec = ARCS[model.mode];
          if (s.arcs && arcSpec) {
            const ds = ['', ''];
            for (let i = 0; i < tiles.n; i++) {
              const spec = arcSpec[tiles.type[i]], o = tiles.off[i], fl = tiles.flip[i];
              for (let k = 0; k < 4; k++) { px[k] = ox + xy[o + 2 * k] * sc; py[k] = oy - xy[o + 2 * k + 1] * sc; }
              for (let a = 0; a < 2; a++) {
                const idx = spec.c[a], r = spec.r[fl ? 1 - a : a] * sc;
                const prev = (idx + 3) & 3, next = (idx + 1) & 3;
                const aOut = Math.atan2(py[next] - py[idx], px[next] - px[idx]);
                const aIn = Math.atan2(py[prev] - py[idx], px[prev] - px[idx]);
                const x0 = px[idx] + r * Math.cos(aOut), y0 = py[idx] + r * Math.sin(aOut);
                const x1 = px[idx] + r * Math.cos(aIn), y1 = py[idx] + r * Math.sin(aIn);
                ds[spec.f[fl ? 1 - a : a]] += 'M' + x0.toFixed(2) + ' ' + y0.toFixed(2) +
                  'A' + r.toFixed(2) + ' ' + r.toFixed(2) + ' 0 0 0 ' + x1.toFixed(2) + ' ' + y1.toFixed(2);
              }
            }
            const alw = Math.max(0.4 * H / 900, s.arcWidth * sc * 0.035);
            for (let a = 0; a < 2; a++) if (ds[a]) {
              body += '<path d="' + ds[a] + '" fill="none" stroke="' + U.svgEsc(pal[(s.arcColor + a) % np]) +
                      '" stroke-width="' + alw.toFixed(3) + '" stroke-linecap="butt"/>\n';
            }
          }
          return U.svgBlob(W, H, s.bg, body);
        },
      };
    },
  });
})();

