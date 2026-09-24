// Actual TMz GPU shaders: dielectric Fresnel R/T + discontinuous-interface refinement
// versus independent Float64 Yee twins and continuum Fresnel formulas.
// Subtract-before-add: zero-contrast and ignore-epsilon mutants must fail first.
// Setup: Playwright + Chromium per BUILDING.md.
// Run: node tools/maxwell-dielectric-science.js
const { glArgs } = require('./lib/gl-args');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require('playwright');

(async () => {
  const root = path.resolve(__dirname, '..');
  const sourcePath = path.join(root, 'src/modules/maxwell.js');
  const source = fs.readFileSync(sourcePath, 'utf8');
  const sourceSha256 = crypto.createHash('sha256').update(source).digest('hex');
  const marker = '  Studio.register({';
  assert.equal(source.split(marker).length, 2, 'Maxwell register hook changed');
  const exposed = source.replace(marker, '  window.maxwellDielectricAudit={H_FS,E_FS};\n' + marker);
  const outPath = path.join(root, 'validation/results/maxwell-dielectric-science.json');

  const browser = await chromium.launch({
    args: glArgs()
  });
  try {
    const page = await browser.newPage();
    await page.goto('file://' + path.join(root, 'dist/studio.html') + '#three-vortex-bound/maxwell-dielectric-science');
    await page.evaluate(exposed);
    const measured = await page.evaluate(() => {
      const G = Studio.gl;
      const A = window.maxwellDielectricAudit;
      const canvas = document.createElement('canvas');
      const gl = G.createGL(canvas);
      if (!gl || !gl.floatExt) throw Error('Maxwell dielectric benchmark requires WebGL2 float32');

      const ignoreSrc = A.E_FS.replace('/ (q.a * u_dx)', '/ (1.0 * u_dx)');
      if (ignoreSrc === A.E_FS) throw Error('Ignore-epsilon failure-control mutation did not apply');

      const hPass = new G.Pass(gl, A.H_FS);
      const ePass = new G.Pass(gl, A.E_FS);
      const ignorePass = new G.Pass(gl, ignoreSrc);
      const debug = gl.getExtension('WEBGL_debug_renderer_info');
      const backend = {
        userAgent: navigator.userAgent,
        renderer: gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER)
      };
      const twoPi = 2 * Math.PI;
      const index = (x, y, W, H) => 4 * (((y + H) % H) * W + ((x + W) % W));

      function cpuH(data, W, H, dt, dx, mu) {
        const out = Float64Array.from(data);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const i = index(x, y, W, H), up = index(x, y + 1, W, H), right = index(x + 1, y, W, H);
          out[i + 1] -= dt * (data[up] - data[i]) / (mu * dx);
          out[i + 2] += dt * (data[right] - data[i]) / (mu * dx);
        }
        return out;
      }
      function cpuE(data, W, H, dt, dx, ignoreEpsilon) {
        const out = Float64Array.from(data);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const i = index(x, y, W, H), left = index(x - 1, y, W, H), down = index(x, y - 1, W, H);
          const eps = ignoreEpsilon ? 1 : data[i + 3];
          out[i] += dt * ((data[i + 2] - data[left + 2]) - (data[i + 1] - data[down + 1])) / (eps * dx);
        }
        return out;
      }
      function cpuStep(data, W, H, dt, dx, mu, ignoreEpsilon) {
        return cpuE(cpuH(data, W, H, dt, dx, mu), W, H, dt, dx, ignoreEpsilon);
      }

      function fresnel(eps1, eps2, mu) {
        const n1 = Math.sqrt(eps1), n2 = Math.sqrt(eps2);
        return { n1, n2, Gamma: (n1 - n2) / (n1 + n2), T: (2 * n1) / (n1 + n2), Z1: Math.sqrt(mu / eps1) };
      }

      function makeInitial({ W, H, eps1, eps2, mu, x0, sigma, cycles, interfaceX, homogeneous }) {
        const { Z1 } = fresnel(eps1, eps2, mu);
        const k0 = twoPi * cycles;
        const data = new Float32Array(W * H * 4);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const i = index(x, y, W, H);
          const px = (x + 0.5) / W, pxH = (x + 1) / W;
          const ez = Math.exp(-((px - x0) ** 2) / (2 * sigma * sigma)) * Math.cos(k0 * (px - x0));
          const hy = -Math.exp(-((pxH - x0) ** 2) / (2 * sigma * sigma)) * Math.cos(k0 * (pxH - x0)) / Z1;
          data[i] = ez; data[i + 1] = 0; data[i + 2] = hy;
          data[i + 3] = homogeneous || px < interfaceX ? eps1 : eps2;
        }
        return data;
      }

      function fieldDiff(actual, expected) {
        let max = 0, sum = 0, count = 0;
        for (let i = 0; i < actual.length; i++) {
          if (!Number.isFinite(actual[i])) throw Error('Nonfinite field');
          if (i % 4 === 3) {
            if (actual[i] !== expected[i]) throw Error('Material coefficient changed');
            continue;
          }
          const d = actual[i] - expected[i];
          max = Math.max(max, Math.abs(d));
          sum += d * d;
          count++;
        }
        return { max, rms: Math.sqrt(sum / count) };
      }

      function gpuEvolve(initial, W, H, dt, dx, mu, steps, electricPass) {
        const opts = { type: 'rgba32f', filter: 'nearest', wrap: 'repeat' };
        const state = new G.PingPong(gl, W, H, opts);
        state.read.upload(initial);
        const advanceH = amount => {
          hPass.draw(state.write, { u_state: state.read, u_size: { ivec: [W, H] }, u_dt: amount, u_dx: dx, u_mu: mu });
          state.swap();
        };
        const read = () => {
          const values = new Float32Array(W * H * 4);
          gl.bindFramebuffer(gl.FRAMEBUFFER, state.read.fbo);
          gl.readPixels(0, 0, W, H, gl.RGBA, gl.FLOAT, values);
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          if (gl.getError() !== gl.NO_ERROR) throw Error('GPU readback failed');
          return values;
        };
        advanceH(-0.5 * dt);
        for (let n = 0; n < steps; n++) {
          advanceH(dt);
          electricPass.draw(state.write, { u_state: state.read, u_size: { ivec: [W, H] }, u_dt: dt, u_dx: dx });
          state.swap();
        }
        const end = read();
        state.dispose();
        return end;
      }

      function cpuEvolve(initial, W, H, dt, dx, mu, steps, ignoreEpsilon) {
        let state = cpuH(Float64Array.from(initial), W, H, -0.5 * dt, dx, mu);
        for (let n = 0; n < steps; n++) state = cpuStep(state, W, H, dt, dx, mu, ignoreEpsilon);
        return state;
      }

      function peakInWindow(start, W, H, dt, dx, mu, xProbe, t0, t1, opts) {
        const electricPass = opts.pass || ePass;
        const useGpu = !!opts.gpu;
        const ignoreEpsilon = !!opts.ignoreEpsilon;
        let state = null, gpuState = null;
        if (useGpu) {
          const o = { type: 'rgba32f', filter: 'nearest', wrap: 'repeat' };
          gpuState = new G.PingPong(gl, W, H, o);
          gpuState.read.upload(start);
          hPass.draw(gpuState.write, { u_state: gpuState.read, u_size: { ivec: [W, H] }, u_dt: -0.5 * dt, u_dx: dx, u_mu: mu });
          gpuState.swap();
        } else {
          state = cpuH(Float64Array.from(start), W, H, -0.5 * dt, dx, mu);
        }
        const steps1 = Math.ceil(t1 / dt);
        const xi = Math.min(W - 1, Math.max(0, Math.round(xProbe * W - 0.5)));
        let best = 0, at = 0;
        const readEz = () => {
          if (gpuState) {
            const values = new Float32Array(W * H * 4);
            gl.bindFramebuffer(gl.FRAMEBUFFER, gpuState.read.fbo);
            gl.readPixels(0, 0, W, H, gl.RGBA, gl.FLOAT, values);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            let sum = 0;
            for (let y = 0; y < H; y++) sum += values[index(xi, y, W, H)];
            return sum / H;
          }
          let sum = 0;
          for (let y = 0; y < H; y++) sum += state[index(xi, y, W, H)];
          return sum / H;
        };
        for (let n = 0; n <= steps1; n++) {
          const t = n * dt;
          if (t >= t0 && t <= t1) {
            const ez = readEz();
            if (Math.abs(ez) > Math.abs(best)) { best = ez; at = t; }
          }
          if (n < steps1) {
            if (gpuState) {
              hPass.draw(gpuState.write, { u_state: gpuState.read, u_size: { ivec: [W, H] }, u_dt: dt, u_dx: dx, u_mu: mu });
              gpuState.swap();
              electricPass.draw(gpuState.write, { u_state: gpuState.read, u_size: { ivec: [W, H] }, u_dt: dt, u_dx: dx });
              gpuState.swap();
            } else {
              state = cpuStep(state, W, H, dt, dx, mu, ignoreEpsilon);
            }
          }
        }
        if (gpuState) gpuState.dispose();
        return { peak: best, at };
      }

      function measureRT({ W, H, eps1, eps2, mu, x0, sigma, cycles, interfaceX, mode }) {
        const dx = 1 / W;
        const ref = fresnel(eps1, eps2, mu);
        const dt = 0.55 * Math.sqrt(Math.min(eps1, eps2) * mu) / (Math.SQRT2 * W);
        const c1 = 1 / ref.n1, c2 = 1 / ref.n2;
        const icH = makeInitial({ W, H, eps1, eps2, mu, x0, sigma, cycles, interfaceX, homogeneous: true });
        const icD = makeInitial({ W, H, eps1, eps2, mu, x0, sigma, cycles, interfaceX, homogeneous: false });
        const xi = 0.34, xt = 0.70, tw = 0.09;
        const tHit = (interfaceX - x0) / c1;
        const iWin = [(xi - x0) / c1 - tw, (xi - x0) / c1 + tw];
        const rWin = [tHit + (interfaceX - xi) / c1 - tw, tHit + (interfaceX - xi) / c1 + tw];
        const tWin = [tHit + (xt - interfaceX) / c2 - tw * ref.n2, tHit + (xt - interfaceX) / c2 + tw * ref.n2];
        const I = peakInWindow(icH, W, H, dt, dx, mu, xi, iWin[0], iWin[1], mode);
        const R = peakInWindow(icD, W, H, dt, dx, mu, xi, rWin[0], rWin[1], mode);
        const T = peakInWindow(icD, W, H, dt, dx, mu, xt, tWin[0], tWin[1], mode);
        if (!(Math.abs(I.peak) > 1e-3)) throw Error('Incident probe peak vanished');
        const Rmeas = R.peak / I.peak;
        const Tmeas = T.peak / I.peak;
        const powerIdentity = Rmeas * Rmeas + (ref.n2 / ref.n1) * Tmeas * Tmeas;
        return {
          cells: [W, H], eps1, eps2, mu, dt, cycles, sigma, x0, interfaceX,
          analytic: { Gamma: ref.Gamma, T: ref.T, n1: ref.n1, n2: ref.n2 },
          measured: {
            R: Rmeas, T: Tmeas,
            incidentPeak: I.peak, reflectedPeak: R.peak, transmittedPeak: T.peak,
            incidentAt: I.at, reflectedAt: R.at, transmittedAt: T.at
          },
          errors: {
            R: Rmeas - ref.Gamma,
            T: Tmeas - ref.T,
            absR: Math.abs(Rmeas - ref.Gamma),
            absT: Math.abs(Tmeas - ref.T)
          },
          powerIdentity,
          powerIdentityError: powerIdentity - 1
        };
      }

      const H = 8, mu = 1, x0 = 0.22, sigma = 0.04, cycles = 8, interfaceX = 0.5;
      const grids = [128, 192, 256, 384, 512];
      const materials = [{ eps1: 1, eps2: 4 }, { eps1: 1, eps2: 2.25 }];
      const gpuMode = { gpu: true, pass: ePass };
      const cpuMode = { gpu: false };
      const ignoreMode = { gpu: true, pass: ignorePass };

      const zeroContrast = (() => {
        const W = 256, eps1 = 1, eps2 = 4;
        const dx = 1 / W;
        const ref = fresnel(eps1, eps2, mu);
        const dt = 0.55 * Math.sqrt(eps1 * mu) / (Math.SQRT2 * W);
        const c1 = 1 / ref.n1;
        const icH = makeInitial({ W, H, eps1, eps2, mu, x0, sigma, cycles, interfaceX, homogeneous: true });
        const xi = 0.34, tw = 0.09;
        const tHit = (interfaceX - x0) / c1;
        const iWin = [(xi - x0) / c1 - tw, (xi - x0) / c1 + tw];
        const rWin = [tHit + (interfaceX - xi) / c1 - tw, tHit + (interfaceX - xi) / c1 + tw];
        const I = peakInWindow(icH, W, H, dt, dx, mu, xi, iWin[0], iWin[1], gpuMode);
        const R = peakInWindow(icH, W, H, dt, dx, mu, xi, rWin[0], rWin[1], gpuMode);
        const Rmeas = R.peak / I.peak;
        const absErrorVsFresnel = Math.abs(Rmeas - ref.Gamma);
        const rejected = absErrorVsFresnel > 0.2 && Math.abs(Rmeas) < 0.08;
        return { cells: [W, H], analyticGamma: ref.Gamma, measuredR: Rmeas, absErrorVsFresnel, rejected };
      })();
      if (!zeroContrast.rejected) throw Error('Zero-contrast failure control escaped: ' + JSON.stringify(zeroContrast));

      const ignoreEps = measureRT({
        W: 256, H, eps1: 1, eps2: 4, mu, x0, sigma, cycles, interfaceX, mode: ignoreMode
      });
      const ignoreRejected = ignoreEps.errors.absR > 0.15 || ignoreEps.errors.absT > 0.15;
      if (!ignoreRejected) throw Error('Ignore-epsilon mutant matched Fresnel unexpectedly: ' + JSON.stringify(ignoreEps.errors));

      const twinRows = [];
      for (const W of [64, 128, 256]) {
        const eps1 = 1, eps2 = 4;
        const dx = 1 / W;
        const dt = 0.5 * Math.sqrt(Math.min(eps1, eps2) * mu) / (Math.SQRT2 * W);
        const steps = 80;
        const initial = makeInitial({ W, H, eps1, eps2, mu, x0: 0.3, sigma: 0.05, cycles: 6, interfaceX, homogeneous: false });
        const gpu = gpuEvolve(initial, W, H, dt, dx, mu, steps, ePass);
        const cpu = cpuEvolve(initial, W, H, dt, dx, mu, steps, false);
        const err = fieldDiff(gpu, cpu);
        if (err.max > 2e-5) throw Error('GPU/Float64 discontinuous twin failed at W=' + W + ': ' + JSON.stringify(err));
        twinRows.push({ cells: [W, H], eps: [eps1, eps2], mu, dt, steps, error: err });
      }

      const fresnelRows = [];
      for (const mat of materials) {
        const series = [];
        for (const W of grids) {
          const gpuRow = measureRT({ W, H, ...mat, mu, x0, sigma, cycles, interfaceX, mode: gpuMode });
          const cpuRow = measureRT({ W, H, ...mat, mu, x0, sigma, cycles, interfaceX, mode: cpuMode });
          const gpuCpuR = Math.abs(gpuRow.measured.R - cpuRow.measured.R);
          const gpuCpuT = Math.abs(gpuRow.measured.T - cpuRow.measured.T);
          if (gpuCpuR > 5e-4 || gpuCpuT > 5e-4) {
            throw Error('GPU/Float64 RT coefficient mismatch: ' + JSON.stringify({ W, mat, gpuCpuR, gpuCpuT }));
          }
          series.push({
            cells: [W, H],
            eps1: mat.eps1,
            eps2: mat.eps2,
            analytic: gpuRow.analytic,
            gpu: gpuRow.measured,
            float64: cpuRow.measured,
            errors: gpuRow.errors,
            powerIdentity: gpuRow.powerIdentity,
            powerIdentityError: gpuRow.powerIdentityError,
            gpuFloat64CoefficientDelta: { R: gpuCpuR, T: gpuCpuT },
            dt: gpuRow.dt
          });
        }
        const at256 = series.find(r => r.cells[0] === 256);
        const at512 = series.find(r => r.cells[0] === 512);
        const at128 = series.find(r => r.cells[0] === 128);
        if (at256.errors.absR > 0.02 || at256.errors.absT > 0.03) throw Error('Fresnel 256 failed: ' + JSON.stringify(at256.errors));
        if (at512.errors.absR > 0.01 || at512.errors.absT > 0.01) throw Error('Fresnel 512 failed: ' + JSON.stringify(at512.errors));
        if (!(at128.errors.absR > at256.errors.absR && at256.errors.absR > at512.errors.absR)) {
          throw Error('Reflection error did not refine: ' + JSON.stringify(series.map(r => r.errors.absR)));
        }
        if (!(at128.errors.absT > at512.errors.absT)) {
          throw Error('Transmission error did not refine overall: ' + JSON.stringify(series.map(r => r.errors.absT)));
        }
        if (Math.abs(at512.powerIdentityError) > 0.02) throw Error('Power identity failed at 512: ' + at512.powerIdentity);
        fresnelRows.push({ material: mat, refinement: series });
      }

      const refineRows = [];
      const fineW = 512, eps1 = 1, eps2 = 4;
      const Tphys = 0.35;
      const fineDx = 1 / fineW;
      const fineSteps = Math.round(Tphys / (0.5 * Math.sqrt(Math.min(eps1, eps2) * mu) / (Math.SQRT2 * fineW)));
      const fineDtExact = Tphys / fineSteps;
      const fineIC = makeInitial({ W: fineW, H, eps1, eps2, mu, x0: 0.25, sigma: 0.045, cycles: 7, interfaceX, homogeneous: false });
      const fineRef = cpuEvolve(fineIC, fineW, H, fineDtExact, fineDx, mu, fineSteps, false);
      for (const W of [128, 256]) {
        const dx = 1 / W;
        const steps = Math.round(Tphys / (0.5 * Math.sqrt(Math.min(eps1, eps2) * mu) / (Math.SQRT2 * W)));
        const dt = Tphys / steps;
        const ic = makeInitial({ W, H, eps1, eps2, mu, x0: 0.25, sigma: 0.045, cycles: 7, interfaceX, homogeneous: false });
        const gpu = gpuEvolve(ic, W, H, dt, dx, mu, steps, ePass);
        let squared = 0, count = 0;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const px = (x + 0.5) / W;
          const xf = Math.min(fineW - 1, Math.max(0, Math.round(px * fineW - 0.5)));
          const ez = gpu[index(x, y, W, H)];
          const refv = fineRef[index(xf, y, fineW, H)];
          squared += (ez - refv) ** 2;
          count++;
        }
        const rms = Math.sqrt(squared / count);
        refineRows.push({ cells: [W, H], referenceCells: [fineW, H], time: Tphys, dt, steps, electricRmsVsFineFloat64: rms });
      }
      const ratio = refineRows[0].electricRmsVsFineFloat64 / refineRows[1].electricRmsVsFineFloat64;
      refineRows[1].refinementRatio = ratio;
      if (!(ratio > 1.5)) throw Error('Discontinuous-interface field refinement too weak: ' + ratio);

      return {
        backend,
        scope: 'Periodic lossless TMz Yee float32 shaders with a vertical discontinuous dielectric interface. Normal-incidence Gaussian packets measured against continuum Fresnel Ez coefficients and an independent Float64 Yee twin; fixed-time discontinuous field refinement versus a fine Float64 reference.',
        domain: {
          parameters: 'eps1=1 with eps2 in {2.25,4}, mu=1, cycles=8, sigma=0.04, interface at x=0.5, y-invariant H=8 strips',
          conditions: 'Periodic unit-width domain; one-way rightward packet initialized with matching Hy; no PML/losses/dispersion',
          resolution: 'RT grids 128/192/256/384/512; twin checks 64/128/256; field refinement 128 and 256 vs Float64 512',
          precision: 'GPU float32 shaders; independent Float64 CPU Yee and continuum Fresnel references'
        },
        failureControls: {
          zeroContrast,
          ignoreEpsilonFresnelErrors: ignoreEps.errors,
          ignoreEpsilonRejected: ignoreRejected
        },
        float64Twins: twinRows,
        fresnel: fresnelRows,
        discontinuousRefinement: refineRows,
        limitations: 'Normal-incidence staircase interfaces only; peak-in-window coefficient extraction before periodic wrap; not oblique incidence, subcell averaging, PML, losses, experimental measurement, or arbitrary long-time certification.'
      };
    });

    assert.equal(measured.failureControls.zeroContrast.rejected, true);
    assert.equal(measured.failureControls.ignoreEpsilonRejected, true);
    assert.ok(measured.float64Twins.every(r => r.error.max < 2e-5));
    assert.equal(measured.fresnel.length, 2);

    const harnessSrc = fs.readFileSync(__filename);
    const result = {
      format: 'genchase-maxwell-dielectric-science-v1',
      command: 'node tools/maxwell-dielectric-science.js',
      sourceSha256,
      harnessSha256: crypto.createHash('sha256').update(harnessSrc).digest('hex'),
      pass: true,
      ...measured
    };
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');
    const summary = {
      pass: true,
      twinMaxError: Math.max(...measured.float64Twins.map(r => r.error.max)),
      fresnel512: measured.fresnel.map(block => {
        const row = block.refinement.find(r => r.cells[0] === 512);
        return { eps2: block.material.eps2, absR: row.errors.absR, absT: row.errors.absT, powerIdentity: row.powerIdentity };
      }),
      discontinuousRatio: measured.discontinuousRefinement[1].refinementRatio,
      zeroContrastAbsR: measured.failureControls.zeroContrast.absErrorVsFresnel,
      ignoreEpsAbsR: measured.failureControls.ignoreEpsilonFresnelErrors.absR
    };
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
