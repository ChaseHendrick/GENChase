// Bounded offline configuration search; this does not discover/certify a physical law.
// Requires Playwright + Chromium as in BUILDING.md. The output JSON is also a replay input.
const { glArgs } = require('./lib/gl-args');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '..');
const SETTINGS = {
  domain: [1, 1], boundary: 'periodic', mu: 1, backgroundEpsilon: 1, rodEpsilon: 4,
  source: { center: [.1875, .5], radius: .14, cycles: 4, phase: .17, magneticAtZero: 0 },
  target: { x: [.6875, .8125], y: [.5625, .6875] },
  sampleTimes: [.3, .325, .35, .375, .4, .425, .45], courantCeiling: .6,
  rodRadius: .03125, siteColumns: 4, siteRows: 6,
  siteOrigin: [.375, .265625], siteSpacing: .09375, occupiedCount: 12,
};
const CRITERIA = { gain: .05, scoreRefinementRelative: .05, halfStepRelative: .01, energyRelativeDrift: 1e-4 };
function rng(seed) { let x = seed >>> 0; return () => { x += 0x6D2B79F5; let t = Math.imul(x ^ x >>> 15, 1 | x); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function layouts() {
  const result = [
    { id: 'simple-two-columns', kind: 'simple baseline', sites: Array.from({ length: 24 }, (_, i) => i).filter(i => i % 4 === 0 || i % 4 === 3) },
    { id: 'simple-checkerboard', kind: 'simple baseline', sites: Array.from({ length: 24 }, (_, i) => i).filter(i => (i % 4 + Math.floor(i / 4)) % 2 === 0) },
  ];
  const seen = new Set(result.map(row => row.sites.join(',')));
  for (let seed = 17001; result.length < 24; seed++) {
    const random = rng(seed), sites = Array.from({ length: 24 }, (_, i) => i);
    for (let i = 23; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [sites[i], sites[j]] = [sites[j], sites[i]]; }
    const selected = sites.slice(0, 12).sort((a, b) => a - b), key = selected.join(',');
    if (!seen.has(key)) { result.push({ id: 'random-' + seed, kind: 'seeded random', seed, sites: selected }); seen.add(key); }
  }
  return result;
}
function validateCandidate(value, sourceHash) {
  assert(value && value.format === 'genchase-maxwell-candidate-v1', 'Unsupported candidate format');
  assert.equal(value.sourceSha256, sourceHash, 'Candidate requires the recorded Maxwell source revision');
  assert.deepEqual(value.settings, SETTINGS, 'Replay settings differ from this frozen experiment');
  assert(value.geometry && typeof value.geometry.id === 'string');
  const sites = value.geometry.sites;
  assert(Array.isArray(sites) && sites.length === 12 && new Set(sites).size === 12, 'Exactly twelve distinct sites are required');
  assert(sites.every(i => Number.isInteger(i) && i >= 0 && i < 24), 'Invalid dielectric site');
  assert.deepEqual(sites, [...sites].sort((a, b) => a - b), 'Sites must be sorted');
  return value;
}
function parseArgs(args) {
  const options = { grid: 128, halfStep: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--replay') { assert(args[i + 1], '--replay requires a JSON file'); options.replay = args[++i]; }
    else if (args[i] === '--grid') { assert(args[i + 1], '--grid requires a size'); options.grid = Number(args[++i]); }
    else if (args[i] === '--half-step') options.halfStep = true;
    else throw Error('Unknown argument: ' + args[i]);
  }
  assert([128, 256, 512].includes(options.grid), 'Grid must be 128, 256 or 512');
  assert(options.replay || (options.grid === 128 && !options.halfStep), 'Grid/step overrides are for replay only');
  return options;
}
async function main() {
  const options = parseArgs(process.argv.slice(2)), source = fs.readFileSync(path.join(ROOT, 'src/modules/maxwell.js'), 'utf8');
  const sourceHash = crypto.createHash('sha256').update(source).digest('hex');
  let replay;
  if (options.replay) {
    const file = path.resolve(options.replay); assert(fs.statSync(file).isFile(), 'Replay must be a regular JSON file');
    const saved = JSON.parse(fs.readFileSync(file, 'utf8')); replay = validateCandidate(saved.candidate || saved, sourceHash);
  }
  const marker = '  Studio.register({'; assert.equal(source.split(marker).length, 2, 'Maxwell shader hook changed');
  const instrumented = source.replace(marker, '  window.maxwellSearchShaders = {H_FS,E_FS};\n' + marker);
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ args: glArgs() });
  try {
    const page = await browser.newPage();
    await page.goto('file://' + path.join(ROOT, 'dist/studio.html') + '#three-vortex-bound/maxwell-offline-search');
    await page.evaluate(instrumented);
    const result = await page.evaluate(({ settings: s, criteria, designs, replay, options }) => {
      const G = Studio.gl, shaders = window.maxwellSearchShaders, gl = G.createGL(document.createElement('canvas'));
      if (!gl || !gl.floatExt) throw Error('Offline experiment requires WebGL2 float32');
      const hp = new G.Pass(gl, shaders.H_FS), ep = new G.Pass(gl, shaders.E_FS);
      const badSource = shaders.E_FS.replace('q.r += u_dt * curlH', 'q.r -= u_dt * curlH');
      if (badSource === shaders.E_FS) throw Error('Wrong-curl control mutation did not apply');
      const bad = new G.Pass(gl, badSource), debug = gl.getExtension('WEBGL_debug_renderer_info');
      const backend = { userAgent: navigator.userAgent, vendor: gl.getParameter(debug ? debug.UNMASKED_VENDOR_WEBGL : gl.VENDOR), renderer: gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER) };
      let forwardRuns = 0;
      const random = seed => { let x = seed >>> 0; return () => { x += 0x6D2B79F5; let t = Math.imul(x ^ x >>> 15, 1 | x); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
      const relative = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-15);
      const at = (x, y, N) => 4 * (((y + N) % N) * N + (x + N) % N);
      function initial(N, design, perturbation, blank) {
        const data = new Float32Array(N * N * 4), rnd = random(perturbation.seed || 0), positions = [];
        for (let site = 0; site < 24; site++) positions.push([
          s.siteOrigin[0] + site % s.siteColumns * s.siteSpacing + (rnd() * 2 - 1) * (perturbation.jitter || 0),
          s.siteOrigin[1] + Math.floor(site / s.siteColumns) * s.siteSpacing + (rnd() * 2 - 1) * (perturbation.jitter || 0),
        ]);
        const radius = s.rodRadius * (perturbation.radiusScale || 1), epsilon = s.rodEpsilon * (perturbation.epsilonScale || 1);
        let initialElectricIntegral = 0, dielectricCells = 0;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const k = at(x, y, N), px = x / N, py = y / N;
          const dx = px - s.source.center[0], dy = py - s.source.center[1], r2 = (dx * dx + dy * dy) / s.source.radius ** 2;
          const e = !blank && r2 < 1 ? Math.exp(1 - 1 / (1 - r2)) * Math.cos(2 * Math.PI * s.source.cycles * dx + s.source.phase) : 0;
          data[k] = e; data[k + 3] = s.backgroundEpsilon;
          for (const site of design.sites) if (site !== perturbation.deletedSite && (px - positions[site][0]) ** 2 + (py - positions[site][1]) ** 2 <= radius ** 2) { data[k + 3] = epsilon; dielectricCells++; break; }
          if (data[k] !== 0 && data[k + 3] !== s.backgroundEpsilon) throw Error('Material intersects the fixed initial excitation');
          initialElectricIntegral += data[k] ** 2 / N ** 2;
        }
        return { data, initialElectricIntegral, dielectricArea: dielectricCells / N ** 2 };
      }
      // Independent CPU calculation of the cross-time Yee invariant, not positive display energy.
      function energy(data, N, dt) {
        let sum = 0;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const k = at(x, y, N), hx = data[k + 1], hy = data[k + 2];
          const hxPlus = hx - dt * N * (data[at(x, y + 1, N)] - data[k]) / s.mu;
          const hyPlus = hy + dt * N * (data[at(x + 1, y, N)] - data[k]) / s.mu;
          sum += data[k + 3] * data[k] ** 2 + s.mu * (hx * hxPlus + hy * hyPlus);
        }
        return sum / N ** 2;
      }
      function region(data, N) {
        let value = 0;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          // Voronoi cells about Ez nodes; partial detector cells avoid an arbitrary edge-row bias.
          const wx = Math.max(0, Math.min((x + .5) / N, s.target.x[1]) - Math.max((x - .5) / N, s.target.x[0]));
          const wy = Math.max(0, Math.min((y + .5) / N, s.target.y[1]) - Math.max((y - .5) / N, s.target.y[0]));
          value += wx * wy * data[at(x, y, N)] ** 2;
        }
        return value;
      }
      function run(design, N = 128, perturbation = { id: 'nominal' }, stepScale = 1, control = '') {
        forwardRuns++;
        const input = initial(N, design, perturbation, control === 'blank-source');
        const interval = .025, substeps = Math.ceil(interval / (s.courantCeiling / (Math.SQRT2 * N))) * stepScale;
        const dt = interval / substeps, state = new G.PingPong(gl, N, N, { type: 'rgba32f', filter: 'nearest', wrap: 'repeat' });
        const pixels = new Float32Array(N * N * 4), samples = [];
        let maxEnergyDrift = 0, nonfinite = 0, initialEnergy = 0, maxElectric = 0, materialChanged = false;
        const read = () => {
          gl.bindFramebuffer(gl.FRAMEBUFFER, state.read.fbo); gl.readPixels(0, 0, N, N, gl.RGBA, gl.FLOAT, pixels);
          gl.bindFramebuffer(gl.FRAMEBUFFER, null); if (gl.getError() !== gl.NO_ERROR) throw Error('GPU readback failed');
          for (let i = 0; i < pixels.length; i++) {
            if (!Number.isFinite(pixels[i])) nonfinite++;
            if (i % 4 === 0 && Number.isFinite(pixels[i])) maxElectric = Math.max(maxElectric, Math.abs(pixels[i]));
            if (i % 4 === 3 && pixels[i] !== input.data[i]) materialChanged = true;
          }
          return pixels;
        };
        const H = amount => { hp.draw(state.write, { u_state: state.read, u_size: { ivec: [N, N] }, u_dt: amount, u_dx: 1 / N, u_mu: s.mu }); state.swap(); };
        try {
          state.read.upload(input.data); H(-.5 * dt); initialEnergy = energy(read(), N, dt);
          let completed = 0;
          for (const time of s.sampleTimes) {
            const stop = Math.round(time / dt);
            if (Math.abs(stop * dt - time) > 1e-12) throw Error('Sample time is not aligned');
            while (completed < stop) { H(dt); (control === 'wrong-curl' ? bad : ep).draw(state.write, { u_state: state.read, u_size: { ivec: [N, N] }, u_dt: dt, u_dx: 1 / N }); state.swap(); completed++; }
            read();
            const currentEnergy = energy(pixels, N, dt);
            if (initialEnergy > 0 && Number.isFinite(currentEnergy)) maxEnergyDrift = Math.max(maxEnergyDrift, Math.abs(currentEnergy / initialEnergy - 1));
            samples.push({ time, electricIntegral: nonfinite ? null : region(pixels, N), modifiedEnergy: Number.isFinite(currentEnergy) ? currentEnergy : null });
            if (nonfinite) break;
          }
          const reasons = [];
          if (!(input.initialElectricIntegral > 1e-12)) reasons.push('zero initial electric norm');
          if (nonfinite) reasons.push('nonfinite field');
          if (materialChanged) reasons.push('material changed during evolution');
          if (maxEnergyDrift > criteria.energyRelativeDrift) reasons.push('cross-time energy drift');
          let score = null;
          if (!reasons.length) {
            let integral = 0;
            for (let i = 1; i < samples.length; i++) integral += .5 * (samples[i].electricIntegral + samples[i - 1].electricIntegral) * (samples[i].time - samples[i - 1].time);
            score = integral / ((s.sampleTimes.at(-1) - s.sampleTimes[0]) * input.initialElectricIntegral);
            if (!(Number.isFinite(score) && score >= 0)) { reasons.push('invalid concentration score'); score = null; }
          }
          return { geometryId: design.id, cells: [N, N], physicalDomain: s.domain, perturbation, dt, stepScale, steps: completed, initialElectricIntegral: input.initialElectricIntegral, dielectricArea: input.dielectricArea, initialModifiedEnergy: initialEnergy, maxModifiedEnergyRelativeDrift: maxEnergyDrift, nonfiniteValues: nonfinite, maxElectric, samples, valid: reasons.length === 0, rejectionReasons: reasons, score };
        } finally { state.dispose(); }
      }
      if (replay) return { backend, replay: run(replay.geometry, options.grid, { id: 'nominal' }, options.halfStep ? 2 : 1), forwardRuns };
      const controls = { blank: run(designs[0], 128, { id: 'nominal' }, 1, 'blank-source'), wrongCurl: run(designs[0], 128, { id: 'nominal' }, 1, 'wrong-curl') };
      if (controls.blank.valid || controls.blank.maxElectric !== 0 || controls.wrongCurl.valid) throw Error('An invalid-source or wrong-curl control escaped rejection');
      const screening = designs.map(geometry => ({ geometry, run: run(geometry) }));
      const valid = screening.filter(row => row.run.valid);
      if (!valid.length) throw Error('All candidate simulations were rejected');
      const byScore = (a, b) => b.run.score - a.run.score || a.geometry.id.localeCompare(b.geometry.id);
      const baseline = valid.filter(row => row.geometry.kind === 'simple baseline').sort(byScore)[0];
      const selected = valid.filter(row => row.geometry.kind === 'seeded random').sort(byScore)[0];
      if (!baseline || !selected) throw Error('No valid comparison is available');
      const heldOutConditions = [
        { id: 'jitter-27001', seed: 27001, jitter: .003 }, { id: 'jitter-27002', seed: 27002, jitter: .006 },
        { id: 'radius-plus-index-minus', seed: 27003, jitter: .003, radiusScale: 1.1, epsilonScale: .95 },
        { id: 'radius-minus-index-plus', seed: 27004, jitter: .003, radiusScale: .9, epsilonScale: 1.05 },
      ];
      const verification = [];
      for (const winner of [baseline, selected]) {
        const geometry = winner.geometry;
        const deletions = geometry.sites.map(site => run(geometry, 128, { id: 'delete-' + site, deletedSite: site }));
        const jitter = heldOutConditions.map(condition => run(geometry, 128, condition));
        if ([...deletions, ...jitter].some(row => !row.valid)) { verification.push({ geometryId: geometry.id, valid: false, deletions, jitter }); continue; }
        const worst = [...deletions].sort((a, b) => a.score - b.score)[0];
        const refinement = [256, 512].map(N => ({ nominal: run(geometry, N), worstDeletion: run(geometry, N, worst.perturbation) }));
        const halfStep = run(geometry, 256, { id: 'nominal' }, 2);
        const coarse = refinement[0], fine = refinement[1];
        verification.push({ geometryId: geometry.id, valid: [...refinement.flatMap(row => [row.nominal, row.worstDeletion]), halfStep].every(row => row.valid), deletions, jitter, worstDeletionAt128: worst.perturbation, refinement, halfStep,
          comparisons: { nominalRefinementRelative: relative(coarse.nominal.score, fine.nominal.score), deletionRefinementRelative: relative(coarse.worstDeletion.score, fine.worstDeletion.score), halfStepRelative: relative(coarse.nominal.score, halfStep.score), meanJitterScore: jitter.reduce((sum, row) => sum + row.score, 0) / jitter.length, worstDeletionScore: worst.score } });
      }
      const [b, c] = verification, observed = {};
      const reasons = [];
      if (!verification.every(row => row.valid)) reasons.push('a verification simulation was invalid');
      else {
        observed.nominalGainAt128 = selected.run.score / baseline.run.score - 1;
        observed.nominalGainAt512 = c.refinement[1].nominal.score / b.refinement[1].nominal.score - 1;
        observed.worstDeletionGainAt128 = c.comparisons.worstDeletionScore / b.comparisons.worstDeletionScore - 1;
        observed.meanHeldOutPerturbationGainAt128 = c.comparisons.meanJitterScore / b.comparisons.meanJitterScore - 1;
        for (const [name, gain] of Object.entries(observed)) if (!(gain >= criteria.gain)) reasons.push(name + ' below the frozen 5% threshold');
        for (const row of verification) {
          if (row.comparisons.nominalRefinementRelative > criteria.scoreRefinementRelative || row.comparisons.deletionRefinementRelative > criteria.scoreRefinementRelative) reasons.push(row.geometryId + ' is sensitive to grid refinement');
          if (row.comparisons.halfStepRelative > criteria.halfStepRelative) reasons.push(row.geometryId + ' is sensitive to the time step');
        }
      }
      return { backend, controls, screening, selectedGeometry: selected.geometry, baselineGeometry: baseline.geometry, verification, hypothesis: { supportedWithinThisFiniteTest: reasons.length === 0, observed, failedCriteria: reasons, statement: 'The best of 22 seeded random layouts exceeds the better of two fixed simple layouts by at least 5% in the stated nominal and held-out scores, with the stated grid/step sensitivity limits. This is not a claim about all defects, all layouts or search-method superiority.' }, vacuumCalibration: run({ id: 'uniform-no-rods', sites: [] }), forwardRuns };
    }, { settings: SETTINGS, criteria: CRITERIA, designs: layouts(), replay, options });
    const candidate = replay || { format: 'genchase-maxwell-candidate-v1', sourceSha256: sourceHash, settings: SETTINGS, geometry: result.selectedGeometry };
    const scoreFor = id => result.screening.find(row => row.geometry.id === id).run.score;
    const summary = replay ? { replayScore: result.replay.score, valid: result.replay.valid } : {
      bestRandom: { id: result.selectedGeometry.id, score: scoreFor(result.selectedGeometry.id) },
      bestSimple: { id: result.baselineGeometry.id, score: scoreFor(result.baselineGeometry.id) },
      uniformReference: { id: 'uniform-no-rods', score: result.vacuumCalibration.score, competing: false },
      hypothesisSupported: result.hypothesis.supportedWithinThisFiniteTest,
      scoreMeaning: 'Seven-sample trapezoidal mean of target-region Ez² / initial whole-domain Ez², at 128 cells per side. Larger means more electric-field concentration in this region/window, not higher energy efficiency.',
    };
    const output = {
      format: 'genchase-maxwell-search-v1', sourceSha256: sourceHash, harnessSha256: crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex'),
      command: options.replay ? 'node tools/maxwell-search.js --replay experiments/results/maxwell-search.json --grid ' + options.grid + (options.halfStep ? ' --half-step' : '') : 'node tools/maxwell-search.js > experiments/results/maxwell-search.json',
      scope: 'Offline periodic TMz dielectric configuration experiment using maintained Yee shaders. A trapezoidal average of seven raw regional Ez-squared samples divided by the fixed initial Ez-squared integral; not power, energy efficiency, a detector or a physical law.',
      method: 'Twenty-two seeded random configurations and two fixed simple baselines; no AI model or learned optimizer runs. Source, target, sample times, material budget and decision thresholds were fixed before evaluation.',
      limitations: 'No historical originality established. Experimental material masks are separate from app recipes. Held-out perturbations are a finite sample; one coarse-grid worst deletion alone is refined, so there is no finest-grid certificate across every deletion. Seven-time quadrature, staircase interfaces and periodic returns affect the score. No independent Meep replay, full time-quadrature study, external-device check or physical experiment. This is not a comparison of AI with other search methods.',
      periodicPathInference: 'The target center x=0.75 is horizontally 0.4375 from the source x=0.1875 via the left periodic edge, versus 0.5625 directly to the right. With a bidirectional finite-width excitation, the chosen window may collect substantial wrapped propagation that bypasses the rods. Transverse distance, pulse width and scattering also matter; this is a geometric explanation to investigate, not a verified mechanism or a pre-return claim.',
      summary, settings: SETTINGS, criteria: CRITERIA, candidate, ...result,
    };
    console.log(JSON.stringify(output, null, 2));
    if (replay && !result.replay.valid) process.exitCode = 1;
  } finally { await browser.close(); }
}
module.exports = { SETTINGS, CRITERIA, layouts, validateCandidate, parseArgs };
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
