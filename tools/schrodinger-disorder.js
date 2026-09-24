// A frozen finite-lattice experiment, not a discovery claim or continuum localization test.
// node tools/schrodinger-disorder.js > experiments/results/schrodinger-disorder.json
const { glArgs } = require('./lib/gl-args');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '..');
const SETTINGS = {
  model: 'H psi = -0.5 times the unit-spacing five-point Laplacian plus V psi',
  baseSize: 64, spacing: 1, seeds: [4101, 4102, 4103, 4104, 4105, 4106, 4107, 4108],
  disorderRms: .5, kernel: [1, 4, 6, 4, 1], kernelDivisor: 16,
  packet: { sigma: 3, supportRadius: 12, momentum: [.7, 0] },
  sampleTimes: [0, 8, 16, 24], dt: .1, smallerDt: .05, largerSize: 128, boundaryStrip: 4,
  criteria: { relativeEffect: .1, invariantDrift: 1e-5, timeStepSensitivity: .005, domainSensitivity: .02, edgeProbability: .001 },
  bootstrap: { replicates: 10000, seed: 91001, interval: [.025, .975] },
};
function random(seed) { let x = seed >>> 0; return () => { x += 0x6D2B79F5; let t = Math.imul(x ^ x >>> 15, 1 | x); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function mean(a) { return a.reduce((s, v) => s + v, 0) / a.length; }
function sd(a) { const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1)); }
function potential(seed) {
  const N = SETTINGS.baseSize, rng = random(seed), raw = new Float64Array(N * N), temp = new Float64Array(raw.length), smooth = new Float64Array(raw.length);
  for (let i = 0; i < raw.length; i += 2) { const r = Math.sqrt(-2 * Math.log(Math.max(rng(), 1e-15))), p = 2 * Math.PI * rng(); raw[i] = r * Math.cos(p); raw[i + 1] = r * Math.sin(p); }
  const at = (x, y) => ((y + N) % N) * N + (x + N) % N;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) for (let j = -2; j <= 2; j++) temp[at(x, y)] += SETTINGS.kernel[j + 2] * raw[at(x + j, y)] / 16;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) for (let j = -2; j <= 2; j++) smooth[at(x, y)] += SETTINGS.kernel[j + 2] * temp[at(x, y + j)] / 16;
  const m = mean(Array.from(smooth)), rms = Math.sqrt(smooth.reduce((s, v) => s + (v - m) ** 2, 0) / smooth.length);
  const correlated = Float32Array.from(smooth, v => (v - m) * SETTINGS.disorderRms / rms), shuffled = Float32Array.from(correlated), shuffle = random(seed ^ 0x5A1739);
  for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(shuffle() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
  function stats(values) {
    const a = Array.from(values), mu = mean(a), variance = mean(a.map(v => (v - mu) ** 2));
    const autocorrelation = lag => { let c = 0; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) c += (values[at(x, y)] - mu) * .5 * (values[at(x + lag, y)] + values[at(x, y + lag)] - 2 * mu); return c / (N * N * variance); };
    const bytes = Buffer.alloc(4 * values.length); for (let i = 0; i < values.length; i++) bytes.writeFloatLE(values[i], 4 * i);
    return { mean: mu, rms: Math.sqrt(mean(a.map(v => v * v))), minimum: Math.min(...a), maximum: Math.max(...a), neighborCorrelation: autocorrelation(1), lagFourCorrelation: autocorrelation(4), float32LittleEndianSha256: crypto.createHash('sha256').update(bytes).digest('hex') };
  }
  assert.deepEqual(Array.from(correlated).sort((a, b) => a - b), Array.from(shuffled).sort((a, b) => a - b), 'Matched potentials have different histograms');
  const metadata = { correlated: stats(correlated), shuffled: stats(shuffled), histogramIdentical: true };
  for (const arm of Object.values(metadata).filter(v => typeof v === 'object')) { assert(Math.abs(arm.mean) < 1e-7); assert(Math.abs(arm.rms - .5) < 1e-7); }
  return { seed, metadata, correlated: Array.from(correlated), shuffled: Array.from(shuffled) };
}
function pairedSummary(rows) {
  const c = rows.map(r => r.correlated), u = rows.map(r => r.shuffled), d = rows.map(r => r.correlated - r.shuffled), rng = random(SETTINGS.bootstrap.seed), boot = [];
  for (let b = 0; b < SETTINGS.bootstrap.replicates; b++) { let sum = 0; for (let i = 0; i < d.length; i++) sum += d[Math.floor(rng() * d.length)]; boot.push(sum / d.length); }
  boot.sort((a, b) => a - b);
  const interval = SETTINGS.bootstrap.interval.map(p => boot[Math.floor(p * (boot.length - 1))]), pooledSeedSd = Math.sqrt((sd(c) ** 2 + sd(u) ** 2) / 2), difference = mean(d);
  return { n: rows.length, correlatedMean: mean(c), shuffledMean: mean(u), pairedDifferences: d, meanDifference: difference, relativeDifference: difference / mean(u), pairedDifferenceSd: sd(d), pooledWithinArmSeedSd: pooledSeedSd, absoluteEffectOverSeedSd: Math.abs(difference) / Math.max(pooledSeedSd, 1e-15), pairedBootstrap95: interval,
    effectCriteriaPass: (interval[0] > 0 || interval[1] < 0) && Math.abs(difference) > pooledSeedSd && Math.abs(difference / mean(u)) >= SETTINGS.criteria.relativeEffect };
}
async function main() {
  assert.equal(process.argv.length, 2, 'This frozen experiment takes no arguments');
  const source = fs.readFileSync(path.join(ROOT, 'src/modules/wavesflow.js'), 'utf8'), sourceHash = crypto.createHash('sha256').update(source).digest('hex');
  const closing = source.lastIndexOf('})();'); assert(closing >= 0);
  const exposed = source.slice(0, closing) + 'window.disorderStepShader = SCH_STEP_FS;\n' + source.slice(closing), potentials = SETTINGS.seeds.map(potential);
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ args: glArgs() });
  let output;
  try {
    const page = await browser.newPage(); await page.goto('file://' + path.join(ROOT, 'dist/studio.html') + '#three-vortex-bound/disorder-experiment'); await page.evaluate(exposed);
    output = await page.evaluate(({ s, potentials }) => {
      const G = Studio.gl, gl = G.createGL(document.createElement('canvas'));
      if (!gl || !gl.floatExt) throw Error('Disorder experiment requires float32 WebGL2');
      const source = window.disorderStepShader, marker = '(c.g - u_dt * HR)';
      if (!source.includes(marker)) throw Error('Wrong-sign control marker missing');
      const good = new G.Pass(gl, source), wrong = new G.Pass(gl, source.replace(marker, '(c.g + u_dt * HR)'));
      const debug = gl.getExtension('WEBGL_debug_renderer_info'), backend = { userAgent: navigator.userAgent, renderer: gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER) };
      let forwardRuns = 0;
      function run({ label, values, N = 64, dt = .1, times = s.sampleTimes, plane = false, mutant = false }) {
        forwardRuns++;
        const data = new Float32Array(N * N * 4), pot = new Float32Array(data.length), tileN = s.baseSize;
        let norm = 0, maxV = 0, initialPotentialEnergy = 0;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const k = 4 * (y * N + x), dx = x - N / 2, dy = y - N / 2, q = (dx * dx + dy * dy) / s.packet.supportRadius ** 2;
          const amplitude = plane ? 1 : q < 1 ? Math.exp(-(dx * dx + dy * dy) / (4 * s.packet.sigma ** 2) + 1 - 1 / (1 - q)) : 0;
          const phase = plane ? 2 * Math.PI * (4 * x + 3 * y) / N : s.packet.momentum[0] * dx + s.packet.momentum[1] * dy;
          data[k] = amplitude * Math.cos(phase); data[k + 1] = amplitude * Math.sin(phase); norm += data[k] ** 2 + data[k + 1] ** 2;
          const px = ((dx + tileN / 2) % tileN + tileN) % tileN, py = ((dy + tileN / 2) % tileN + tileN) % tileN;
          pot[k] = values ? values[py * tileN + px] : 0; maxV = Math.max(maxV, Math.abs(pot[k]));
        }
        for (let i = 0; i < data.length; i += 4) { data[i] /= Math.sqrt(norm); data[i + 1] /= Math.sqrt(norm); data[i + 3] = data[i + 1]; initialPotentialEnergy += pot[i] * (data[i] ** 2 + data[i + 1] ** 2); }
        if (dt * (4 + maxV) >= 1.6) throw Error('Frozen step exceeds conservative spectral margin');
        const opts = { type: 'rgba32f', filter: 'nearest', wrap: 'repeat' };
        let current = new G.Target(gl, N, N, { ...opts, data }), next = new G.Target(gl, N, N, opts);
        const potentialTexture = new G.Target(gl, N, N, { ...opts, data: pot }), pixels = new Float32Array(data.length), pass = mutant ? wrong : good;
        const advance = (phase, amount) => { pass.draw(next, { u_p: current, u_pot: potentialTexture, u_res: [N, N], u_dt: amount, u_dtE: 0, u_damp: 0, u_phase: { int: phase } }); [current, next] = [next, current]; };
        function measure(time) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, current.fbo); gl.readPixels(0, 0, N, N, gl.RGBA, gl.FLOAT, pixels); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          if (gl.getError() !== gl.NO_ERROR) throw Error('Readback failed');
          let positiveNorm = 0, invariant = 0, mx = 0, my = 0, r2 = 0, edge = 0, ipr = 0, nonfinite = 0, exactError2 = 0;
          const eigenvalue = 2 - Math.cos(2 * Math.PI * 4 / N) - Math.cos(2 * Math.PI * 3 / N);
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
            const i = 4 * (y * N + x), re = pixels[i], plus = pixels[i + 1], minus = pixels[i + 3], im = .5 * (plus + minus), rho = re * re + im * im;
            if (![re, plus, minus].every(Number.isFinite)) { nonfinite++; continue; }
            const dx = x - N / 2, dy = y - N / 2;
            positiveNorm += rho; invariant += re * re + plus * minus; mx += dx * rho; my += dy * rho; r2 += (dx * dx + dy * dy) * rho; ipr += rho * rho;
            if (x < s.boundaryStrip || y < s.boundaryStrip || x >= N - s.boundaryStrip || y >= N - s.boundaryStrip) edge += rho;
            if (plane) { const phase = 2 * Math.PI * (4 * x + 3 * y) / N - eigenvalue * time; exactError2 += (re - Math.cos(phase) / N) ** 2 + (im - Math.sin(phase) / N) ** 2; }
          }
          return { time, positiveNorm, modifiedInvariant: invariant, centroid: [mx / positiveNorm, my / positiveNorm], variance: r2 / positiveNorm - (mx / positiveNorm) ** 2 - (my / positiveNorm) ** 2, secondMomentAboutStart: r2 / positiveNorm, inverseParticipationRatio: ipr / positiveNorm ** 2, boundaryStripProbability: edge / positiveNorm, nonfiniteCells: nonfinite, ...(plane ? { exactSemidiscreteL2Error: Math.sqrt(exactError2) } : {}) };
        }
        try {
          advance(3, dt / 2); const start = measure(0), samples = []; let completed = 0, drift = 0;
          for (const time of times) {
            const stop = Math.round(time / dt); if (Math.abs(stop * dt - time) > 1e-12) throw Error('Changed elapsed time');
            while (completed < stop) { advance(0, dt); advance(1, dt); completed++; }
            const row = measure(time); samples.push(row); drift = Math.max(drift, Math.abs(row.modifiedInvariant / start.modifiedInvariant - 1));
          }
          const nonfinite = samples.some(row => row.nonfiniteCells || !Number.isFinite(row.variance));
          return { label, lattice: [N, N], spacing: 1, dt, steps: completed, potentialTile: [tileN, tileN], spectralStabilityProductBound: dt * (4 + maxV), initialPotentialEnergy, start, samples, maxSampledModifiedInvariantRelativeDrift: Number.isFinite(drift) ? drift : null, valid: !nonfinite && drift < s.criteria.invariantDrift };
        } finally { current.dispose(); next.dispose(); potentialTexture.dispose(); }
      }
      const rows = [];
      for (const p of potentials) {
        const trials = {};
        for (const arm of ['correlated', 'shuffled']) trials[arm] = {
          main: run({ label: p.seed + '-' + arm, values: p[arm] }),
          smallerStep: run({ label: p.seed + '-' + arm + '-half-step', values: p[arm], dt: s.smallerDt }),
          largerDomain: run({ label: p.seed + '-' + arm + '-larger-domain', values: p[arm], N: s.largerSize }),
        };
        rows.push({ seed: p.seed, potential: p.metadata, trials });
      }
      const free = run({ label: 'free-reference', values: null });
      const analytic = run({ label: 'free-analytic-mode', N: 32, dt: .05, times: [0, 2], plane: true });
      const wrongSign = run({ label: 'wrong-imaginary-sign', N: 32, dt: .05, times: [0, 2], plane: true, mutant: true });
      const duplicate = run({ label: 'identical-potential-null', values: potentials[0].correlated });
      return { backend, rows, freeReference: free, controls: { analytic, wrongSign, identicalPotentialRepeat: duplicate }, forwardRuns };
    }, { s: SETTINGS, potentials });
  } finally { await browser.close(); }
  const last = row => row.samples.at(-1).variance;
  const summaries = Object.fromEntries(['main', 'smallerStep', 'largerDomain'].map(name => [name, pairedSummary(output.rows.map(row => ({ seed: row.seed, correlated: last(row.trials.correlated[name]), shuffled: last(row.trials.shuffled[name]) })))]));
  const relative = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-15);
  const sensitivity = output.rows.flatMap(row => ['correlated', 'shuffled'].map(arm => { const t = row.trials[arm]; return { seed: row.seed, arm, timeStepRelative: relative(last(t.main), last(t.smallerStep)), domainRelative: relative(last(t.main), last(t.largerDomain)), maxMainBoundaryProbability: Math.max(...t.main.samples.map(s => s.boundaryStripProbability)) }; }));
  const failures = [];
  if (!summaries.main.effectCriteriaPass) failures.push('Primary paired effect does not exceed the frozen relative, uncertainty and seed-variation requirements');
  for (const name of ['smallerStep', 'largerDomain']) if (!summaries[name].effectCriteriaPass || Math.sign(summaries[name].meanDifference) !== Math.sign(summaries.main.meanDifference)) failures.push(name + ' does not retain the effect criteria/direction');
  if (sensitivity.some(s => s.timeStepRelative > SETTINGS.criteria.timeStepSensitivity)) failures.push('Time-step sensitivity exceeds 0.5%');
  if (sensitivity.some(s => s.domainRelative > SETTINGS.criteria.domainSensitivity)) failures.push('Periodic-domain sensitivity exceeds 2%');
  if (sensitivity.some(s => s.maxMainBoundaryProbability > SETTINGS.criteria.edgeProbability)) failures.push('Boundary-strip probability exceeds 0.1%');
  assert(output.controls.analytic.valid && output.controls.analytic.samples.at(-1).exactSemidiscreteL2Error < .002, 'Independent free mode control failed');
  assert(!output.controls.wrongSign.valid && output.controls.wrongSign.samples.at(-1).exactSemidiscreteL2Error > .1, 'Wrong-sign failure was not detected');
  assert.deepEqual(output.controls.identicalPotentialRepeat.samples, output.rows[0].trials.correlated.main.samples, 'Identical potential does not reproduce');
  const nullSummary = pairedSummary(output.rows.map(row => ({ correlated: last(row.trials.correlated.main), shuffled: last(row.trials.correlated.main) })));
  assert.equal(nullSummary.effectCriteriaPass, false, 'Identical paired observations passed the effect criterion');
  const validRuns = output.rows.flatMap(row => Object.values(row.trials).flatMap(arm => Object.values(arm))).every(run => run.valid);
  if (!validRuns) failures.push('A scientific trial failed numerical integrity checks');
  // Descriptive sensitivity added after the frozen run, not a replacement acceptance rule.
  // For n=8, the two-sided Student 95% critical value at 7 degrees of freedom is 2.364624251.
  // This alternative assumes normally distributed pair differences; neither interval has a
  // distribution-free small-sample guarantee. Preserve both when they disagree about zero.
  const halfWidth = 2.364624251 * summaries.main.pairedDifferenceSd / Math.sqrt(8);
  const inferenceSensitivity = { postHoc: true, method: 'Paired Student 95% interval, seven degrees of freedom; normal pair-difference assumption',
    interval: [summaries.main.meanDifference - halfWidth, summaries.main.meanDifference + halfWidth],
    interpretation: 'The frozen percentile-bootstrap criterion is a screening rule. Eight seeds do not establish a robust population effect; interval choice changes whether zero is excluded.' };
  const result = { format: 'genchase-schrodinger-disorder-v1', command: 'node tools/schrodinger-disorder.js > experiments/results/schrodinger-disorder.json', sourceSha256: sourceHash, harnessSha256: crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex'), settings: SETTINGS,
    claimScope: 'Eight paired seeds of a finite discrete unit-spacing Hamiltonian; filtered versus histogram-identical shuffled disorder, RMS 0.5. Finite-time centered-density variance, not an Anderson-localization proof, continuum result, novel physical principle, or AI search.',
    largerDomainMeaning: 'The 64x64 potential tile is repeated in a 128x128 wavefunction domain at unchanged spacing, initial packet and time. This preserves the local potential exactly and tests periodic-wavefunction sensitivity; it is not independent disorder outside the original region, a thermodynamic limit, or spatial refinement.',
    statistics: 'Ten-thousand paired bootstrap resamples of eight independent seeds; percentile 95% interval. Small-sample uncertainty is approximate. Ordinary seed variation is the pooled within-arm sample SD. No fitting or outcome-based selection was performed; primary time was fixed at 24.',
    limitations: 'Spatial arrangement and all higher spatial correlations change, not just one correlation length. Equal global histogram does not match each packet’s local potential-energy distribution. Smaller finite-time variance may reflect classical trapping or scattering. No asymptotic exponent, spectral localization, rare-tail guarantee, external solver/device validation or general parameter claim.',
    summary: { supportedWithinThisFiniteExperiment: failures.length === 0, interpretation: 'Frozen finite-sample screening criterion only; no confirmed population effect or novelty', failures, primary: summaries.main, smallerStep: summaries.smallerStep, largerDomain: summaries.largerDomain, maximumTimeStepSensitivity: Math.max(...sensitivity.map(s => s.timeStepRelative)), maximumDomainSensitivity: Math.max(...sensitivity.map(s => s.domainRelative)), maximumBoundaryProbability: Math.max(...sensitivity.map(s => s.maxMainBoundaryProbability)), allScientificRunsNumericallyValid: validRuns }, inferenceSensitivity, sensitivity, nullSummary, ...output };
  console.log(JSON.stringify(result, null, 2));
}
module.exports = { SETTINGS, potential, pairedSummary };
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
