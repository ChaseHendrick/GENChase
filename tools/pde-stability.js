// Actual PDE instances, fixed elapsed times and deliberately restored old failures.
// Test instrumentation changes neither the checked-in solver nor its generated build.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const root = path.resolve(__dirname, '..');
  let source = fs.readFileSync(path.join(root, 'src/modules/pde.js'), 'utf8');
  const marker = '        fieldCells()';
  assert(source.includes(marker), 'PDE instrumentation marker is missing');
  assert(source.includes('spec.pokeMode ?? 1'), 'The explicit mixing mode must be preserved');
  source = source.replace(marker, `        auditAdvance(n) { step(n); },
        auditUpload(data) { upload(C.read, data); },
        auditField() {
          if (texType !== 'rgba32f') throw Error('Stability benchmark requires float32');
          const pixels = new Float32Array(gw * gh * 4);
          gl.bindFramebuffer(gl.FRAMEBUFFER, C.read.fbo);
          gl.readPixels(0, 0, gw, gh, gl.RGBA, gl.FLOAT, pixels);
          if (gl.getError() !== gl.NO_ERROR) throw Error('Stability readback failed');
          return pixels;
        },
${marker}`);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const rows = [], mixing = [];
  try {
    for (const fixture of ['real-click', 'uniform-mode']) for (const legacy of [false, true]) {
      const page = await browser.newPage();
      try {
        await page.goto('file://' + path.join(root, 'studio.html') + '#three-vortex-bound/stability');
        // The click failure control restores both historical defects. The uniform-mode
        // failure control changes only dt, isolating the amplitude-envelope error.
        const tested = fixture === 'real-click' && legacy ? source.replace('spec.pokeMode ?? 1', 'spec.pokeMode || 1') : source;
        await page.evaluate(tested);
        rows.push(await page.evaluate(({ legacy, fixture }) => {
          const mod = Studio.modules.cahn, palette = Studio.PALETTES[mod.defaultPalette];
          const state = { ...mod.defaults, grid: 512, warmup: 0, running: false,
            palette: palette.colors, bg: palette.bg, noise: 0, c0: .6, amp: .02,
            M: 2.5, eps: .6, dt: .12, seed: 'stability-disturbance' };
          mod.sanitize(state);
          const correctedDt = state.dt;
          const legacyDt = 1.6 / (state.M * (64 * state.eps ** 2 + 8 * (3 * 1.2 ** 2 - 1)));
          if (legacy) state.dt = legacyDt;
          const baseDt = state.dt, canvas = document.createElement('canvas');
          canvas.width = 512; canvas.height = 512;
          const instance = mod.create({ canvas, getState: () => state, setStatus() {},
            isActive: () => false, reducedMotion: () => true, requestRepaint() {},
            fault(message) { throw Error(message); } });
          const measure = () => {
            const values = instance.auditField();
            let min = Infinity, max = -Infinity, mean = 0, clipped = 0, nonfinite = 0, modeAmplitude = 0;
            for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
              const c = values[4 * (y * 512 + x)]; min = Math.min(min, c); max = Math.max(max, c);
              mean += c; clipped += Math.abs(c) > 1.69999; nonfinite += !Number.isFinite(c);
              modeAmplitude += c * ((x + y) % 2 ? 1 : -1);
            }
            return { min, max, mean: mean / 512 ** 2, clipped, nonfinite, modeAmplitude: modeAmplitude / 512 ** 2 };
          };
          instance.regenerate(); instance.pause();
          const seeded = measure();
          if (fixture === 'real-click') {
            instance.disturb({ x: .5, yGL: .5 }); instance.pause();
          } else {
            // A stationary homogeneous concentration with a small Nyquist perturbation.
            // This is an injected mathematical fixture, not a shipped initialization.
            const data = new Float32Array(512 * 512 * 4);
            for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
              const k = 4 * (y * 512 + x); data[k] = 1.6 + .001 * ((x + y) % 2 ? 1 : -1); data[k + 3] = 1;
            }
            instance.auditUpload(data);
          }
          const initial = measure(), samples = [];
          let elapsed = 0, steps = 0;
          for (const legacySteps of [10, 20, 40, 80]) {
            const target = legacyDt * legacySteps;
            // Shorten the last step to compare identical physical times.
            while (target - elapsed > 1e-12) {
              state.dt = Math.min(baseDt, target - elapsed);
              instance.auditAdvance(1); elapsed += state.dt; steps++;
            }
            const measurement = measure();
            samples.push({ elapsed, steps, ...measurement, massDrift: Math.abs(measurement.mean - initial.mean) });
          }
          state.dt = baseDt; instance.pause();
          const highParameters = { ...state, M: 2.5, eps: 2.4, dt: .12 };
          mod.sanitize(highParameters);
          const ohta = Studio.modules.ohta;
          const ohtaState = { ...ohta.defaults, M: 2.5, eps: .7, sigma: .24, dt: .12 };
          ohta.sanitize(ohtaState);
          return { fixture, mode: legacy ? 'historical-negative-control' : 'corrected',
            grid: 512, boundary: state.bc, degenerate: state.deg, M: state.M, eps: state.eps,
            requestedDt: .12, dt: baseDt, correctedDt, seeded, initial, samples,
            highParameterDt: highParameters.dt, ohtaDt: ohtaState.dt };
        }, { legacy, fixture }));
      } finally { await page.close(); }
    }
    for (const id of ['cahn', 'ohta', 'amb']) {
      const page = await browser.newPage();
      try {
        await page.goto('file://' + path.join(root, 'studio.html') + '#three-vortex-bound/mixing');
        await page.evaluate(source);
        mixing.push(await page.evaluate(id => {
          const mod = Studio.modules[id], palette = Studio.PALETTES[mod.defaultPalette], N = 128;
          const state = { ...mod.defaults, grid: N, warmup: 0, running: false,
            palette: palette.colors, bg: palette.bg, noise: 0, c0: .3, amp: .02, seed: 'mixing-mode' };
          mod.sanitize(state);
          const canvas = document.createElement('canvas'); canvas.width = N; canvas.height = N;
          const instance = mod.create({ canvas, getState: () => state, setStatus() {},
            isActive: () => false, reducedMotion: () => true, requestRepaint() {},
            fault(message) { throw Error(message); } });
          instance.regenerate(); instance.pause(); const before = instance.auditField();
          instance.disturb({ x: .5, yGL: .5 }); instance.pause(); const after = instance.auditField();
          const radius = id === 'ohta' ? .07 : .06;
          let maxError = 0, maxConcentration = -Infinity;
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
            const k = 4 * (y * N + x), dx = (x + .5) / N - .5, dy = (y + .5) / N - .5;
            const weight = Math.exp(-(dx * dx + dy * dy) / (radius * radius));
            const expected = before[k] * (1 - weight) + weight;
            maxError = Math.max(maxError, Math.abs(after[k] - expected));
            maxConcentration = Math.max(maxConcentration, after[k]);
          }
          return { id, grid: N, radius, maxError, maxConcentration };
        }, id));
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
  for (const fixture of ['real-click', 'uniform-mode']) {
    const [corrected, legacy] = rows.filter(row => row.fixture === fixture);
    assert.deepEqual(corrected.seeded, legacy.seeded, 'Failure control must start from identical seeded state');
    if (fixture === 'uniform-mode') assert.deepEqual(corrected.initial, legacy.initial, 'Uniform-mode inputs must match');
    assert.equal(corrected.initial.clipped, 0, 'Corrected fixture must start without clipping');
    for (let i = 0; i < corrected.samples.length; i++) {
      const sample = corrected.samples[i];
      assert(Math.abs(sample.elapsed - legacy.samples[i].elapsed) < 1e-11, 'Comparison times must match');
      assert.equal(sample.nonfinite, 0, 'Corrected fixture became nonfinite');
      assert.equal(sample.clipped, 0, 'Corrected fixture reached the clipping guard');
      assert(sample.massDrift < 2e-8, 'Corrected fixture lost composition after initialization/disturbance');
    }
    assert(legacy.samples.some(sample => sample.clipped > 0 && sample.massDrift > 1e-5), 'Historical negative control must reproduce numerical failure');
    assert(corrected.highParameterDt > 0 && corrected.highParameterDt < .002, 'Sanitizer ignored the upper ceiling');
    const expectedOhta = 1.6 / (2.5 * (64 * .7 ** 2 + 8 * (3 * 1.7 ** 2 - 1)) + .24);
    assert(Math.abs(corrected.ohtaDt - expectedOhta) < 1e-14, 'Ohta ceiling omitted its reaction term');
    if (fixture === 'uniform-mode') assert(Math.abs(corrected.samples[0].modeAmplitude) < 1e-6, 'A stable homogeneous-state perturbation must decay');
  }
  for (const row of mixing) {
    assert(row.maxError < 2e-6, row.id + ': declared mixing mode was not applied');
    assert(row.maxConcentration <= 1 + 2e-6, row.id + ': mixing toward one overshot one');
  }
  console.log(JSON.stringify({ scope: 'Noise-free periodic constant-mobility float32 Cahn-Hilliard: real click and injected homogeneous-mode fixtures at 512 cells, fixed elapsed times, historical negative controls. Separate three-module mixing checks at 128 cells. Not a global nonlinear, variable-mobility or active-model stability proof.', rows, mixing }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
