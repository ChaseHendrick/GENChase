// node tools/surfaces-print.js [--write]
// Actual-instance raster/vector export regression, separate from curvature evidence.
'use strict';
const { glArgs } = require('./lib/gl-args');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), { chromium } = require('playwright');
(async () => {
  const root = path.resolve(__dirname, '..'), source = fs.readFileSync(path.join(root, 'src/modules/surfaces.js'), 'utf8');
  const instrumented = source.replace('  Studio.register({', '  window.surfaceAudit = { camera };\n  Studio.register({');
  const softwareCanvas = process.argv.includes('--software-canvas');
  const browser = await chromium.launch({ args: [...glArgs(),
    ...(softwareCanvas ? ['--disable-accelerated-2d-canvas'] : [])] });
  try {
    const page = await browser.newPage();
    await page.goto('file://' + path.join(root, 'dist/studio.html') + '#surfaces/print-benchmark');
    await page.evaluate(instrumented);
    const result = await page.evaluate(async () => {
      const mod = Studio.modules.surfaces, rows = [], failures = [];
      const require = (test, message) => { if (!test) failures.push(message); };
      const decode = async blob => {
        const url = URL.createObjectURL(blob), img = new Image();
        try {
          await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = url; });
          const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
          const g = canvas.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
          return { w: img.width, h: img.height, canvas, data: g.getImageData(0, 0, img.width, img.height).data };
        } finally { URL.revokeObjectURL(url); }
      };
      // Reconstruct parameter coordinates using complex polynomials and a combined
      // orthogonal matrix, without production point/mesh/rotate/project calls.
      function referenceProjection(s, w, h) {
        const c=surfaceAudit.camera(s), C=Math.cos(c.yaw), S=Math.sin(c.yaw), T=Math.cos(c.tilt), U=Math.sin(c.tilt), R=Math.cos(c.roll), Q=Math.sin(c.roll);
        const rows=[[R*C+Q*U*S,-R*S+Q*U*C,-Q*T],[Q*C-R*U*S,-Q*S-R*U*C,R*T],[T*S,T*C,U]];
        const d=s.family==='enneper'?[-s.extent,s.extent,-s.extent,s.extent]:s.family==='dini'?[-Math.PI*s.turns,Math.PI*s.turns,.15,1.4]:[-Math.PI,Math.PI,-s.extent,s.extent],vertices=[];
        for(let j=0;j<=s.detail;j++)for(let i=0;i<=s.detail;i++){
          const u=d[0]+(d[1]-d[0])*i/s.detail,v=d[2]+(d[3]-d[2])*j/s.detail;let p;
          if(s.family==='enneper'){const z2=[u*u-v*v,2*u*v],z3=[z2[0]*u-z2[1]*v,z2[0]*v+z2[1]*u];p=[u-z3[0]/3,v+z3[1]/3,z2[0]];}
          else if(s.family==='dini'){const radius=Math.sin(v);p=[radius*Math.cos(u),radius*Math.sin(u),Math.cos(v)+Math.log(Math.sin(v)/(1+Math.cos(v)))+s.pitch*u];}
          else {const t=s.associate*Math.PI/2,a=Math.cos(t)*(Math.exp(v)+Math.exp(-v))/2,b=-Math.sin(t)*(Math.exp(v)-Math.exp(-v))/2;p=[a*Math.cos(u)-b*Math.sin(u),a*Math.sin(u)+b*Math.cos(u),Math.cos(t)*v+Math.sin(t)*u];}
          vertices.push(...rows.map(row=>row.reduce((n,x,k)=>n+x*p[k],0)));
        }
        const xs=vertices.filter((_,i)=>i%3===0),ys=vertices.filter((_,i)=>i%3===1),lo=[Math.min(...xs),Math.min(...ys)],hi=[Math.max(...xs),Math.max(...ys)],scale=.84*Math.min(w/(hi[0]-lo[0]),h/(hi[1]-lo[1]));
        for(let k=0;k<vertices.length;k+=3){vertices[k]=w/2+scale*(vertices[k]-(lo[0]+hi[0])/2);vertices[k+1]=h/2-scale*(vertices[k+1]-(lo[1]+hi[1])/2);}return vertices;
      }
      const fingerprint = values => { let n = 2166136261; for (const x of values) { n ^= x; n = Math.imul(n, 16777619); } return (n >>> 0).toString(16); };
      let controlError = 0;
      for (const [key, preset] of Object.entries(mod.presets)) {
        const palette = preset.palette, s = { ...mod.defaults, ...preset.p,
          seed: 'surface-print-fixed', palette: palette.colors, bg: palette.bg };
        mod.sanitize(s);
        const canvas = document.createElement('canvas'); canvas.width = 800; canvas.height = 800;
        const inst = mod.create({ canvas, getState: () => s, setStatus() {}, reducedMotion: () => true,
          isActive: () => false, requestRepaint() {} });
        inst.regenerate();
        const stateBefore = JSON.stringify(s), screenBefore = fingerprint(canvas.getContext('2d').getImageData(0, 0, 800, 800).data);
        for (const [w, h] of [[800, 800], [1600, 2000], [2400, 2400]]) {
          const png = await decode(await inst.exportPNG(w, h)), svg = inst.exportSVG(w, h);
          const xml = new DOMParser().parseFromString(svg, 'image/svg+xml');
          require(!xml.querySelector('parsererror,image'), key + ' valid SVG with no raster image');
          const paths = [...xml.querySelectorAll('path')], coords = paths.map(p =>
            [...p.getAttribute('d').matchAll(/[ML]([-\d.]+),([-\d.]+)/g)].map(m => [+m[1], +m[2]]));
          const vertices = referenceProjection(s, w, h);
          let coordinateError = 0, path = 0;
          for (let axis = 0; axis < 2; axis++) for (let line = 0; line <= s.wires; line++) {
            if (axis === 0 && line === s.wires && s.family === 'associate' && s.associate === 0) continue;
            const fixed = Math.round(line * s.detail / s.wires);
            require(coords[path] && coords[path].length === s.detail + 1, key + ' every curve sample survives vector export');
            for (let step = 0; step <= s.detail; step++) {
              const i = axis === 0 ? fixed : step, j = axis === 0 ? step : fixed, k = 3 * (j * (s.detail + 1) + i);
              const actual = coords[path]?.[step] || [Infinity, Infinity];
              coordinateError = Math.max(coordinateError, Math.abs(actual[0] - vertices[k]), Math.abs(actual[1] - vertices[k + 1]));
              if (path === 0 && step === 0) controlError = Math.max(controlError, Math.abs(actual[0] * 1.02 - vertices[k]));
              require(actual[0] >= 0 && actual[0] <= w && actual[1] >= 0 && actual[1] <= h, key + ' mesh fits requested sheet');
            }
            path++;
          }
          require(paths.length === path && coordinateError <= 0.000051, key + ' SVG preserves projected geometry');
          require(png.w === w && png.h === h, key + ' exact PNG dimensions');
          const vectorImage = await decode(new Blob([svg], { type: 'image/svg+xml' }));
          require(vectorImage.w === w && vectorImage.h === h, key + ' exact SVG dimensions');
          let mad = 0, ink = 0;
          const bg = Studio.util.hexToRgb(s.bg);
          for (let i = 0; i < png.data.length; i += 4) {
            mad += Math.abs(png.data[i] - vectorImage.data[i]) + Math.abs(png.data[i + 1] - vectorImage.data[i + 1]) +
              Math.abs(png.data[i + 2] - vectorImage.data[i + 2]);
            if (Math.max(Math.abs(png.data[i] - bg[0]), Math.abs(png.data[i + 1] - bg[1]), Math.abs(png.data[i + 2] - bg[2])) > 10) ink++;
          }
          mad /= w * h * 3;
          // Accelerated Canvas2D and SVG use different subpixel stroke rasterizers. The strict
          // coordinate test above is unchanged; at print sizes the pixel bound remains 1/255.
          require(mad < (w === 800 ? 2 : 1), key + ' raster and SVG image agreement');
          require(ink / (w * h) > 0.005, key + ' nonblank print');
          rows.push({ preset: key, width: w, height: h, paths: paths.length, verticesPerPath: s.detail + 1,
            coordinateError, rasterVectorMeanAbsoluteChannelError: mad, inkFraction: ink / (w * h), pngFingerprint: fingerprint(png.data) });
        }
        const replay = await decode(await inst.exportPNG(800, 800));
        require(replay && fingerprint(replay.data) === rows[rows.length - 3].pngFingerprint, key + ' deterministic replay');
        require(JSON.stringify(s) === stateBefore && fingerprint(canvas.getContext('2d').getImageData(0, 0, 800, 800).data) === screenBefore,
          key + ' exports preserve recipe and visible plate');
        s.seed = 'different-surface-view'; inst.regenerate();
        require(fingerprint(canvas.getContext('2d').getImageData(0, 0, 800, 800).data) !== screenBefore, key + ' seed changes the rendered camera/color');
        inst.pause();
      }
      require(controlError > 1, '2% wrong SVG horizontal scale is detected');
      return { rows, failures, wrongScaleControlErrorPixels: controlError, userAgent: navigator.userAgent };
    });
    if (result.failures.length) console.error(JSON.stringify(result, null, 2));
    assert.deepEqual(result.failures, [], 'surface print regressions: ' + result.failures.join('; '));
    const artifact = { schemaVersion: 1, date: new Date().toISOString().slice(0, 10), passed: true,
      source: 'src/modules/surfaces.js', reference: 'Independent complex-coordinate maps and combined camera matrix reconstruct every exported vertex; camera random offsets are captured as display inputs.',
      sourceSha256: crypto.createHash('sha256').update(source).digest('hex'),
      softwareCanvas,
      criteria: { svgCoordinateErrorPixels: 0.000051, rasterVectorMeanAbsoluteChannelError: { preview800: 2, print: 1 }, minInkFraction: 0.005,
        exactDimensions: true, deterministicReplay: true, recipeAndVisiblePlatePreserved: true, seedChangesView: true },
      ...result, limitations: ['Print checks preserve the finite wire mesh, not an exact smooth surface.',
        'All wires remain visible; this is not hidden-surface rendering or a solid manufacturing model.',
        'Raster/vector agreement depends on subpixel stroke rasterization. --software-canvas isolates the accelerated Canvas2D difference.',
        'This Chromium run does not certify all printer or SVG implementations.',
        'Independent differential geometry is tested separately in surfaces-science.js.'] };
    if (softwareCanvas) assert(Math.max(...artifact.rows.map(r => r.rasterVectorMeanAbsoluteChannelError)) < 0.01,
      'software Canvas2D isolates accelerated stroke antialiasing differences');
    if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, 'validation/results/surfaces-print' +
      (softwareCanvas ? '-software' : '') + '.json'), JSON.stringify(artifact, null, 2) + '\n');
    console.log(JSON.stringify(artifact, null, 2));
  } finally { await browser.close(); }
})().catch(err => { console.error(err.stack || err); process.exitCode = 1; });
