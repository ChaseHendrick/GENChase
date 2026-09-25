// Actual GPU coarsening measurements; analysis is independently implemented in Python.
// node tools/cahn-scaling.js [--write | --controls]
const { glArgs } = require('./lib/gl-args');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), hash = v => crypto.createHash('sha256').update(v).digest('hex');
const protocol = {
  version: 1, frozenDate: '2026-09-21', N: 128, dt: .008, mobility: 1, epsilons: [.8, 1, 1.2],
  seeds: Array.from({ length: 6 }, (_, i) => `cahn-scaling-${i}`), noiseAmplitude: .1,
  times: [16, 24, 32, 48, 64, 96], trainingSeeds: [0, 1, 2, 3], trainingEpsilons: [.8, 1.2], trainingTimes: [16, 24, 32, 48],
  halfStepSeeds: [4, 5], halfStepDt: .004, largerSeeds: [4, 5], largerN: 256, auditEverySteps: 128,
  limits: { categoryRMSE: .08, worstSeedRMSE: .12, baselineErrorRatio: .75, exponentIntervalWidth: .1,
    splitExponentDifference: .05, halfStepRelativeDifference: .02, largerMeanRelativeDifference: .08,
    maximumAmplitude: 1.69, massDrift: 2e-5, relativeEnergyIncrease: 1e-5, lengthBoxFraction: .25 },
};
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let size = 2; size <= n; size *= 2) {
    const angle = -2 * Math.PI / size;
    for (let start = 0; start < n; start += size) for (let j = 0; j < size / 2; j++) {
      const c = Math.cos(angle * j), s = Math.sin(angle * j), k = start + j, l = k + size / 2;
      const tr = c * re[l] - s * im[l], ti = s * re[l] + c * im[l];
      re[l] = re[k] - tr; im[l] = im[k] - ti; re[k] += tr; im[k] += ti;
    }
  }
}
function spectrum(field, N) {
  assert.equal(N & (N - 1), 0); assert.equal(field.length, N * N);
  const mean = field.reduce((s, v) => s + v, 0) / field.length;
  const re = Float64Array.from(field, c => c - mean), im = new Float64Array(re.length);
  const ar = new Float64Array(N), ai = new Float64Array(N);
  for (let y = 0; y < N; y++) fft(re.subarray(y * N, (y + 1) * N), im.subarray(y * N, (y + 1) * N));
  for (let x = 0; x < N; x++) {
    for (let y = 0; y < N; y++) { ar[y] = re[y * N + x]; ai[y] = im[y * N + x]; }
    fft(ar, ai);
    for (let y = 0; y < N; y++) { re[y * N + x] = ar[y]; im[y * N + x] = ai[y]; }
  }
  let sumS = 0, moment = 0, xMoment = 0;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (x === 0 && y === 0) continue;
    const kx = 2 * Math.PI * (x <= N / 2 ? x : x - N) / N;
    const ky = 2 * Math.PI * (y <= N / 2 ? y : y - N) / N;
    const i = y * N + x, S = re[i] ** 2 + im[i] ** 2;
    sumS += S; moment += Math.hypot(kx, ky) * S; xMoment += Math.abs(kx) * S;
  }
  const realPower = field.reduce((s, c) => s + (c - mean) ** 2, 0);
  return { length: sumS > 0 && moment > 0 ? 2 * Math.PI * sumS / moment : null,
    mean, variance: realPower / field.length, parsevalRelativeError: Math.abs(sumS / field.length - realPower) / Math.max(realPower, 1e-30),
    omittedTwoPi: sumS / moment, xOnly: 2 * Math.PI * sumS / xMoment, re, im };
}
function measurementControls() {
  const modes = [];
  for (const [mx, my, amplitude, offset] of [[4, 0, 1, 0], [3, 4, 1, 0], [3, 4, .23, .7]]) {
    const N = 32, field = Float64Array.from({ length: N * N }, (_, i) => offset + amplitude * Math.cos(2 * Math.PI * (mx * (i % N) + my * Math.floor(i / N)) / N));
    const measured = spectrum(field, N), expected = N / Math.hypot(mx, my);
    assert(Math.abs(measured.length - expected) < 1e-11); assert(measured.parsevalRelativeError < 1e-12);
    assert(Math.abs(measured.omittedTwoPi - expected) > 1);
    if (my) assert(Math.abs(measured.xOnly - expected) > 1);
    modes.push({ mx, my, amplitude, offset, expected, measured: measured.length,
      parsevalRelativeError: measured.parsevalRelativeError, negativeControls: { omittedTwoPi: measured.omittedTwoPi, xOnly: measured.xOnly } });
  }
  const N = 8, field = Float64Array.from({ length: N * N }, (_, i) => Math.sin(i * 1.31) + .3 * Math.cos(i * .7));
  const got = spectrum(field, N); let maxDirectDFTError = 0;
  for (let ky = 0; ky < N; ky++) for (let kx = 0; kx < N; kx++) {
    let real = 0, imag = 0;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const a = -2 * Math.PI * (kx * x + ky * y) / N, c = field[y * N + x] - got.mean;
      real += c * Math.cos(a); imag += c * Math.sin(a);
    }
    maxDirectDFTError = Math.max(maxDirectDFTError, Math.abs(got.re[ky * N + kx] - real), Math.abs(got.im[ky * N + kx] - imag));
  }
  assert(maxDirectDFTError < 1e-10);
  return { modes, maxDirectDFTError, passed: true };
}
const controls = measurementControls();
if (process.argv.includes('--controls')) { console.log(JSON.stringify(controls, null, 2)); process.exit(0); }

(async () => {
  const { chromium } = require('playwright');
  const shared = fs.readFileSync(path.join(root, 'src/shared/engine.js'), 'utf8');
  const source = fs.readFileSync(path.join(root, 'src/modules/pde.js'), 'utf8');
  const expose = source.slice(0, source.indexOf('  Studio.register({')) + '\nwindow.cahnScalingShaders={MU_CH,STEP_CH,chMaxDt};})();';
  const browser = await chromium.launch({ args: glArgs() });
  const runs = [], start = Date.now(); let gpuControls, renderer;
  try {
    const page = await browser.newPage();
    await page.setContent('<!doctype html><title>Cahn scaling numerical experiment</title>');
    await page.addScriptTag({ content: shared }); await page.evaluate(expose);
    await page.evaluate(() => {
      window.scalingGpuRun = config => {
        const { N, epsilon, dt, seed, times, amplitude, auditEvery, mode } = config;
        const G = Studio.gl, shaders = window.cahnScalingShaders, gl = G.createGL(document.createElement('canvas'));
        if (!gl || !gl.floatExt) throw Error('Cahn scaling requires float32 WebGL2');
        const size = N * N, data = new Float32Array(size * 4), rng = Studio.util.makeRng(seed);
        let initMean = 0;
        for (let i = 0; i < size; i++) {
          const c = mode ? amplitude * Math.cos(2 * Math.PI * 4 * (i % N) / N) : amplitude * (2 * rng() - 1);
          data[4 * i] = c; initMean += data[4 * i]; data[4 * i + 3] = 1;
        }
        initMean /= size;
        for (let i = 0; i < size; i++) data[4 * i] -= initMean;
        const opts = { type: 'rgba32f', filter: 'nearest', wrap: 'repeat' };
        let a = new G.Target(gl, N, N, { ...opts, data }), b = new G.Target(gl, N, N, opts);
        const mu = new G.Target(gl, N, N, opts), pMu = new G.Pass(gl, shaders.MU_CH), pStep = new G.Pass(gl, shaders.STEP_CH);
        const pixels = new Float32Array(size * 4), samples = [];
        let elapsed = 0, steps = 0, maximumAmplitude = 0, maximumMassDrift = 0, maximumEnergyRise = 0, nonfinite = 0, audits = 0;
        let referenceMean = null, referenceEnergy = null, previousEnergy = null;
        function audit() {
          gl.bindFramebuffer(gl.FRAMEBUFFER, a.fbo); gl.readPixels(0, 0, N, N, gl.RGBA, gl.FLOAT, pixels);
          if (gl.isContextLost() || gl.getError() !== gl.NO_ERROR) throw Error('GPU readback or context failed');
          const field = new Float64Array(size); let mean = 0, energy = 0;
          for (let i = 0; i < size; i++) { field[i] = pixels[4 * i]; mean += field[i]; maximumAmplitude = Math.max(maximumAmplitude, Math.abs(field[i])); nonfinite += !Number.isFinite(field[i]); }
          mean /= size;
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
            const c = field[y * N + x], dx = field[y * N + (x + 1) % N] - c, dy = field[((y + 1) % N) * N + x] - c;
            energy += .25 * (c * c - 1) ** 2 + .5 * epsilon ** 2 * (dx * dx + dy * dy);
          }
          if (referenceMean === null) { referenceMean = mean; referenceEnergy = energy; previousEnergy = energy; }
          maximumMassDrift = Math.max(maximumMassDrift, Math.abs(mean - referenceMean));
          maximumEnergyRise = Math.max(maximumEnergyRise, (energy - previousEnergy) / referenceEnergy); previousEnergy = energy; audits++;
          return { field: Array.from(field), mean, energy };
        }
        const initial = audit();
        for (const tau of times) {
          const target = tau * epsilon ** 2;
          while (target - elapsed > 1e-10) {
            const stepDt = Math.min(dt, target - elapsed);
            pMu.draw(mu, { u_c: a, u_res: [N, N], u_eps2: epsilon ** 2 });
            pStep.draw(b, { u_c: a, u_mu: mu, u_res: [N, N], u_dt: stepDt, u_M: mode === 'reversed' ? -1 : 1, u_deg: 0, u_noise: 0, u_step: steps, u_nOff: 0 });
            [a, b] = [b, a]; elapsed += stepDt; steps++;
            if (steps % auditEvery === 0) audit();
          }
          samples.push({ tau, time: elapsed, steps, ...audit() });
        }
        const result = { N, epsilon, dt, seed, initialMean: initial.mean, initialEnergy: initial.energy, samples,
          maximumAmplitude, maximumMassDrift, maximumEnergyRise, nonfinite, audits, ceiling: shaders.chMaxDt(1, epsilon),
          renderer: gl.getParameter(gl.RENDERER), precision: 'rgba32f' };
        for (const target of [a, b, mu]) target.dispose(); gl.deleteProgram(pMu.prog); gl.deleteProgram(pStep.prog);
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return result;
      };
    });
    const linear = [];
    for (const mode of ['correct', 'reversed']) {
      const r = await page.evaluate(c => window.scalingGpuRun(c), { N: 64, epsilon: 1, dt: .008, seed: 'mode-control', times: [1.6], amplitude: 1e-4, auditEvery: 128, mode });
      const field = r.samples[0].field, measured = 2 * field.reduce((s, c, i) => s + c * Math.cos(2 * Math.PI * 4 * (i % 64) / 64), 0) / field.length;
      const q = 4 * Math.sin(Math.PI * 4 / 64) ** 2, expected = 1e-4 * (1 + .008 * q * (1 - q)) ** 200;
      linear.push({ mode, expected, measured, error: Math.abs(measured - expected) }); renderer = r.renderer;
    }
    assert(linear[0].error < 2e-7 && linear[1].error > 1e-5);
    gpuControls = { linear, passed: true };
    const jobs = [];
    for (const epsilon of protocol.epsilons) for (const seed of protocol.seeds) jobs.push({ kind: 'main', N: protocol.N, epsilon, seed, dt: protocol.dt });
    for (const i of protocol.halfStepSeeds) jobs.push({ kind: 'halfStep', N: protocol.N, epsilon: 1, seed: protocol.seeds[i], dt: protocol.halfStepDt });
    for (const i of protocol.largerSeeds) jobs.push({ kind: 'larger', N: protocol.largerN, epsilon: 1, seed: protocol.seeds[i], dt: protocol.dt });
    for (const job of jobs) {
      const r = await page.evaluate(c => window.scalingGpuRun(c), { ...job, times: protocol.times, amplitude: protocol.noiseAmplitude, auditEvery: protocol.auditEverySteps });
      for (const sample of r.samples) {
        const s = spectrum(sample.field, r.N); delete sample.field;
        Object.assign(sample, { length: s.length, variance: s.variance, parsevalRelativeError: s.parsevalRelativeError });
      }
      r.kind = job.kind;
      r.numericalGuards = r.dt <= r.ceiling && r.nonfinite === 0 && r.maximumAmplitude < protocol.limits.maximumAmplitude &&
        r.maximumMassDrift < protocol.limits.massDrift && r.maximumEnergyRise < protocol.limits.relativeEnergyIncrease;
      r.boxGuard = r.samples.every(s => s.length !== null && s.length < protocol.limits.lengthBoxFraction * r.N);
      runs.push(r);
      console.error(`Cahn scaling ${runs.length}/${jobs.length}: ${job.kind}, N=${r.N}, epsilon=${r.epsilon}, ${r.seed}; elapsed ${((Date.now() - start) / 1000).toFixed(1)} s`);
    }
  } finally { await browser.close(); }
  const doc = fs.readFileSync(path.join(root, 'experiments/CAHN-SCALING.md'), 'utf8');
  const protocolText = doc.slice(doc.indexOf('## Protocol frozen'), doc.indexOf('## Prior work'));
  const result = { experiment: 'cahn-finite-lattice-calibration', timestamp: new Date().toISOString(), protocol,
    provenance: { sourceSHA256: hash(source), sharedSHA256: hash(shared), scriptSHA256: hash(fs.readFileSync(__filename)),
      protocolSHA256: hash(JSON.stringify(protocol)), frozenProtocolTextSHA256: hash(protocolText), renderer },
    controls, gpuControls, runs, seconds: (Date.now() - start) / 1000,
    interpretation: 'Raw finite-lattice measurements. Run the frozen Python held-out analysis; no novelty or asymptotic-law claim.' };
  if (process.argv.includes('--write')) {
    const dest = path.join(root, 'experiments/results/cahn-scaling.json'); fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, JSON.stringify(result, null, 2) + '\n');
  }
  console.log(JSON.stringify({ controls, gpuControls, runCount: runs.length, numericalGuards: runs.every(r => r.numericalGuards), boxGuard: runs.every(r => r.boxGuard), seconds: result.seconds }, null, 2));
})().catch(e => { console.error(e); process.exitCode = 1; });
