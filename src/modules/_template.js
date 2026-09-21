/* Copy to a named family file; this template is deliberately not registered or built.
 * Replace the illustrative marks with a cited model and add a validation record.
 * Add the named include to src/studio.html, then register the completed definition.
 * Keep seed, recipe, palette, history and print orchestration in the shared engine.
 */
'use strict';

function makeTemplateDefinition(Studio) {
  return {
    id: 'example', name: 'Example', tab: 'Example', order: 100,
    subtitle: 'replace with the model and year',
    equation: 'Replace with the implemented equation and assumptions.',
    credit: 'Replace with the paper authors, title and publication reference.',
    blurb: 'Unregistered drawing scaffold, not a scientific simulation.',
    schema: [{ group: 'Marks', key: 'count', label: 'Count', type: 'range',
      kind: 'geom', min: 10, max: 200, step: 1, fmt: String }],
    defaults: { count: 60 }, presets: {},
    palette: true, defaultPalette: 'kiln',
    create(host) {
      const U = host.util;
      let points = [];
      function paint(canvas) {
        const s = host.getState(), ctx = canvas.getContext('2d');
        ctx.fillStyle = s.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = s.palette[0];
        for (const [x, y] of points) {
          ctx.beginPath();
          ctx.arc(x * canvas.width, y * canvas.height,
            Math.min(canvas.width, canvas.height) * 0.008, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
      function regenerate() {
        const s = host.getState(), rng = U.makeRng(s.seed + '/marks');
        points = Array.from({ length: s.count }, () => [rng.range(0.05, 0.95), rng.range(0.05, 0.95)]);
        paint(host.canvas);
        host.setStatus('<span>Scaffold only: no scientific check</span>');
      }
      return {
        aspect: () => 1, regenerate,
        repaint: () => paint(host.canvas), resize: () => paint(host.canvas),
        pause() {}, resume() {},
        async exportPNG(w, h) {
          const out = document.createElement('canvas');
          out.width = w; out.height = h; paint(out);
          return U.toBlob(out);
        }
        // For discrete marks, add exportSVG that emits the actual geometry.
        // For evolving fields, implement pause/resume and bounded, nonblocking steps.
      };
    }
  };
}

// After replacing this scaffold and adding scientific evidence metadata:
// Studio.register(makeTemplateDefinition(Studio));
