'use strict';
// Independent references for tools/sle-science.js, written from the Loewner equation rather than
// from src/modules/sle.js. Chordal normalization: dg_t/dt = 2 / (g_t(z) - xi(t)), g_t(z) = z + 2t/z + ...,
// and the trace point gamma(t) is the z with g_t(z) = xi(t).

/* ---- xi = 0: the vertical segment [0, 2i sqrt(t)], half-plane capacity 2t ---- */
const zeroTrace = t => [0, 2 * Math.sqrt(t)];

/* ---- xi(t) = c t (Kager, Nienhuis and Kadanoff, J. Stat. Phys. 115, 805, 2004, section 3) ----
   With h = g_t(z) - c t, dh/dt = 2/h - c, which separates: t = (z - h)/c + (2/c^2) ln((2 - c z)/(2 - c h)).
   The trace point has h = 0, so t = (2/c^2) (w + ln(1 - w)) with w = c z / 2. Writing w = u + i v in the
   upper half plane, the imaginary part forces v = arg of 1/(1 - w), i.e. w = 1 - theta cot theta + i theta
   for theta in (0, pi), and then 2 c^2 t / 4 = 1 - theta cot theta + ln(theta / sin theta). The curve rises
   from 0 and approaches the horizontal line Im z = 2 pi / c. A negative c is the mirror image. */
function linearTrace(c, t) {
  if (c === 0) return zeroTrace(t);
  const target = 2 * c * c * t / 4, f = th => 1 - th / Math.tan(th) + Math.log(th / Math.sin(th)) - target;
  let lo = 1e-12, hi = Math.PI - 1e-15;
  for (let i = 0; i < 300; i++) { const m = 0.5 * (lo + hi); if (f(m) > 0) hi = m; else lo = m; }
  const th = 0.5 * (lo + hi), a = Math.abs(c);
  const x = 2 / a * (1 - th / Math.tan(th)), y = 2 / a * th;
  return [c > 0 ? x : -x, y];
}

/* ---- xi(t) = c sqrt(t): a straight ray from 0 at angle alpha pi ----
   F(w) = (w + a)^{1-alpha} (w - b)^alpha maps H onto H minus the segment [0, L e^{i alpha pi}] with
   hydrodynamic normalization when (1 - alpha) a = alpha b. Its 1/w coefficient gives the capacity
   t = alpha b^2 / (4 (1 - alpha)), the tip's preimage is xi = b (1 - 2 alpha)/(1 - alpha), and the tip is at
   |F(xi)| = b^{1-alpha} a^alpha. Together: c = 2 (1 - 2 alpha) / sqrt(alpha (1 - alpha)) and
   L(t) = 2 sqrt(t) (alpha / (1 - alpha))^{alpha - 1/2}. At alpha = 1/2 this is the vertical slit. */
const sqrtDriverCoefficient = alpha => 2 * (1 - 2 * alpha) / Math.sqrt(alpha * (1 - alpha));
function sqrtTrace(alpha, t) {
  const L = 2 * Math.sqrt(t) * Math.pow(alpha / (1 - alpha), alpha - 0.5);
  return [L * Math.cos(alpha * Math.PI), L * Math.sin(alpha * Math.PI)];
}

/* ---- box counting of a polyline ----
   Counts the eps-grid squares that the polyline from (x0, y0) through the points meets, by exact
   grid traversal of every segment (Amanatides and Woo), so a long segment marks every square it
   crosses and a short one is not skipped. */
function boxCount(xs, ys, eps, x0 = 0, y0 = 0) {
  const seen = new Set(), key = (i, j) => (i + 1048576) * 2097152 + (j + 1048576);
  let px = x0, py = y0;
  for (let k = 0; k <= xs.length; k++) {
    const qx = k < xs.length ? xs[k] : px, qy = k < ys.length ? ys[k] : py;
    let i = Math.floor(px / eps), j = Math.floor(py / eps);
    const ie = Math.floor(qx / eps), je = Math.floor(qy / eps);
    seen.add(key(i, j));
    const dx = qx - px, dy = qy - py, sx = Math.sign(dx), sy = Math.sign(dy);
    let tx = dx !== 0 ? ((sx > 0 ? (i + 1) * eps : i * eps) - px) / dx : Infinity;
    let ty = dy !== 0 ? ((sy > 0 ? (j + 1) * eps : j * eps) - py) / dy : Infinity;
    const stepX = dx !== 0 ? eps / Math.abs(dx) : Infinity, stepY = dy !== 0 ? eps / Math.abs(dy) : Infinity;
    let guard = 0;
    while ((i !== ie || j !== je) && guard++ < 1e7) {
      if (tx < ty) { i += sx; tx += stepX; } else { j += sy; ty += stepY; }
      seen.add(key(i, j));
      if (tx > 1 && ty > 1) break;
    }
    seen.add(key(ie, je));
    px = qx; py = qy;
  }
  return seen.size;
}

/* ---- calibration curves of known dimension ----
   The generalized Koch (Cesaro) curve: each segment is replaced by four copies scaled by
   r = 1 / (2 + 2 cos theta), the middle two forming a spike at angle theta. It is a simple self-similar
   curve of dimension log 4 / log(1/r). Returns the points after the start (0, 0), ending at (1, 0). */
function kochCurve(dimension, level) {
  const r = Math.pow(4, -1 / dimension), cosT = (1 / r - 2) / 2, theta = Math.acos(cosT);
  let pts = [[0, 0], [1, 0]];
  for (let l = 0; l < level; l++) {
    const next = [pts[0]];
    for (let i = 0; i + 1 < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1], dx = bx - ax, dy = by - ay;
      const p1 = [ax + r * dx, ay + r * dy], p3 = [bx - r * dx, by - r * dy];
      const c = Math.cos(theta), s = Math.sin(theta), tipX = p1[0] + r * (c * dx - s * dy), tipY = p1[1] + r * (s * dx + c * dy);
      next.push(p1, [tipX, tipY], p3, [bx, by]);
    }
    pts = next;
  }
  return { xs: pts.slice(1).map(p => p[0]), ys: pts.slice(1).map(p => p[1]), dimension: Math.log(4) / Math.log(1 / r), theta };
}

function ols(xs, ys) {
  const n = xs.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; }
  return { slope: sxy / sxx, intercept: my - sxy / sxx * mx };
}

module.exports = { zeroTrace, linearTrace, sqrtDriverCoefficient, sqrtTrace, boxCount, kochCurve, ols };
