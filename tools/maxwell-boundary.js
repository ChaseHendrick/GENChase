// Frozen domain-extension experiment, not a claim of novel physics or device performance.
// Requires Playwright + Chromium per BUILDING.md. Run from the repository root.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '..');
const SAVED = 'experiments/results/maxwell-search.json';
const SETTINGS = {
  domain: [1, 1], boundary: 'periodic', mu: 1, backgroundEpsilon: 1, rodEpsilon: 4,
  source: { center: [.1875, .5], radius: .14, cycles: 4, phase: .17, magneticAtZero: 0 },
  target: { x: [.6875, .8125], y: [.5625, .6875] },
  sampleTimes: [.3, .325, .35, .375, .4, .425, .45], courantCeiling: .6,
  rodRadius: .03125, siteColumns: 4, siteRows: 6,
  siteOrigin: [.375, .265625], siteSpacing: .09375, occupiedCount: 12,
};
const PLAN = {
  cellsPerUnit: [128, 256], domainWidths: [1, 2], domainHeight: 1,
  requiredUniformScoreDecrease: .9, maxModifiedEnergyRelativeDrift: 1e-4,
  maxReplayRelativeDifference: 1e-5,
  statement: 'Doubling only the periodic domain width from 1 to 2 decreases the uniform-medium score by at least 90% at both 128 and 256 cells per unit length, with fixed source, physical spacing, time step and target/window.',
};
const sha = data => crypto.createHash('sha256').update(data).digest('hex');

async function main() {
  assert.equal(process.argv.length, 2, 'This frozen experiment takes no options');
  const source = fs.readFileSync(path.join(ROOT, 'src/modules/maxwell.js'), 'utf8');
  const savedText = fs.readFileSync(path.join(ROOT, SAVED), 'utf8'), saved = JSON.parse(savedText);
  assert.equal(saved.format, 'genchase-maxwell-search-v1');
  assert.equal(saved.sourceSha256, sha(source), 'Saved search used a different Maxwell source; review before rerunning');
  assert.deepEqual(saved.settings, SETTINGS, 'Saved search settings differ from the frozen boundary experiment');
  assert.deepEqual(saved.candidate.settings, SETTINGS);
  assert.deepEqual(saved.candidate.geometry, saved.selectedGeometry);
  const designs = [{ id: 'uniform-no-rods', kind: 'uniform reference', sites: [] }, saved.baselineGeometry, saved.candidate.geometry];
  for (const design of designs.slice(1)) {
    assert.equal(design.sites.length, SETTINGS.occupiedCount);
    assert.equal(new Set(design.sites).size, SETTINGS.occupiedCount);
    assert(design.sites.every(site => Number.isInteger(site) && site >= 0 && site < 24));
  }
  assert.equal(designs[1].id, saved.summary.bestSimple.id);
  assert.equal(designs[2].id, saved.summary.bestRandom.id);
  const marker = '  Studio.register({';
  assert.equal(source.split(marker).length, 2, 'Maintained shader hook changed');
  const instrumented = source.replace(marker, '  window.maxwellBoundaryShaders = {H_FS,E_FS};\n' + marker);
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage();
    await page.goto('file://' + path.join(ROOT, 'dist/studio.html') + '#three-vortex-bound/maxwell-boundary');
    await page.evaluate(instrumented);
    const result = await page.evaluate(({ s, plan, designs }) => {
      const G = Studio.gl, shaders = window.maxwellBoundaryShaders;
      const gl = G.createGL(document.createElement('canvas'));
      if (!gl || !gl.floatExt) throw Error('Boundary experiment requires WebGL2 float32');
      const hp = new G.Pass(gl, shaders.H_FS), ep = new G.Pass(gl, shaders.E_FS);
      const wrongSource = shaders.E_FS.replace('q.r += u_dt * curlH', 'q.r -= u_dt * curlH');
      if (wrongSource === shaders.E_FS) throw Error('Wrong-curl control mutation did not apply');
      const wrongPass = new G.Pass(gl, wrongSource), debug = gl.getExtension('WEBGL_debug_renderer_info');
      const backend = {
        userAgent: navigator.userAgent,
        vendor: gl.getParameter(debug ? debug.UNMASKED_VENDOR_WEBGL : gl.VENDOR),
        renderer: gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER),
      };
      const index = (x, y, W, H) => 4 * (((y + H) % H) * W + (x + W) % W);
      // Separate rectangle dimensions are essential: dx depends on cells per physical unit, not W.
      if (index(-1, 0, 256, 128) !== 4 * 255 || index(256, 0, 256, 128) !== 0 || index(0, 128, 256, 128) !== 0) throw Error('Rectangle indexing check failed');
      function initial(design, N, W, H, blank) {
        const data = new Float32Array(W * H * 4), target = [];
        let electricIntegral = 0, dielectricCells = 0, targetArea = 0;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const k = index(x, y, W, H), px = x / N, py = y / N;
          const sx = px - s.source.center[0], sy = py - s.source.center[1];
          const q = (sx * sx + sy * sy) / s.source.radius ** 2;
          data[k] = !blank && q < 1 ? Math.exp(1 - 1 / (1 - q)) * Math.cos(2 * Math.PI * s.source.cycles * sx + s.source.phase) : 0;
          data[k + 3] = s.backgroundEpsilon;
          for (const site of design.sites) {
            const cx = s.siteOrigin[0] + site % s.siteColumns * s.siteSpacing;
            const cy = s.siteOrigin[1] + Math.floor(site / s.siteColumns) * s.siteSpacing;
            if ((px - cx) ** 2 + (py - cy) ** 2 <= s.rodRadius ** 2) { data[k + 3] = s.rodEpsilon; dielectricCells++; break; }
          }
          if (data[k] !== 0 && data[k + 3] !== s.backgroundEpsilon) throw Error('Initial source overlaps a rod');
          electricIntegral += data[k] ** 2 / N ** 2;
          const wx = Math.max(0, Math.min((x + .5) / N, s.target.x[1]) - Math.max((x - .5) / N, s.target.x[0]));
          const wy = Math.max(0, Math.min((y + .5) / N, s.target.y[1]) - Math.max((y - .5) / N, s.target.y[0]));
          if (wx * wy > 0) { target.push([k, wx * wy]); targetArea += wx * wy; }
        }
        if (Math.abs(targetArea - (s.target.x[1] - s.target.x[0]) * (s.target.y[1] - s.target.y[0])) > 1e-14) throw Error('Detector area changed');
        return { data, target, targetArea, electricIntegral, dielectricArea: dielectricCells / N ** 2 };
      }
      // Independent CPU cross-time Yee invariant; integrate over physical cell area 1/N².
      function energy(data, N, W, H, dt) {
        let sum = 0;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const k = index(x, y, W, H), hx = data[k + 1], hy = data[k + 2];
          const hxPlus = hx - dt * N * (data[index(x, y + 1, W, H)] - data[k]) / s.mu;
          const hyPlus = hy + dt * N * (data[index(x + 1, y, W, H)] - data[k]) / s.mu;
          sum += data[k + 3] * data[k] ** 2 + s.mu * (hx * hxPlus + hy * hyPlus);
        }
        return sum / N ** 2;
      }
      function run(design, N, Lx, control = '') {
        const W = Lx * N, H = plan.domainHeight * N, dx = 1 / N;
        if (Math.max(W, H) > gl.getParameter(gl.MAX_TEXTURE_SIZE)) throw Error('Requested rectangle exceeds GPU capacity');
        const dt = .025 / Math.ceil(.025 / (s.courantCeiling / (Math.SQRT2 * N)));
        if (dt > s.courantCeiling * Math.sqrt(s.backgroundEpsilon * s.mu) * dx / Math.SQRT2) throw Error('CFL bound failed');
        const input = initial(design, N, W, H, control === 'zero-source');
        const state = new G.PingPong(gl, W, H, { type: 'rgba32f', filter: 'nearest', wrap: 'repeat' });
        const pixels = new Float32Array(W * H * 4), samples = [];
        let nonfiniteValues = 0, maxField = 0, materialChanged = false, maxEnergyDrift = 0;
        const read = () => {
          gl.bindFramebuffer(gl.FRAMEBUFFER, state.read.fbo);
          if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw Error('Incomplete field rectangle');
          gl.readPixels(0, 0, W, H, gl.RGBA, gl.FLOAT, pixels);
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          if (gl.getError() !== gl.NO_ERROR) throw Error('GPU readback failed');
          for (let k = 0; k < pixels.length; k++) {
            if (!Number.isFinite(pixels[k])) nonfiniteValues++;
            if (k % 4 !== 3 && Number.isFinite(pixels[k])) maxField = Math.max(maxField, Math.abs(pixels[k]));
            if (k % 4 === 3 && pixels[k] !== input.data[k]) materialChanged = true;
          }
        };
        const Hstep = amount => { hp.draw(state.write, { u_state: state.read, u_size: { ivec: [W, H] }, u_dt: amount, u_dx: dx, u_mu: s.mu }); state.swap(); };
        try {
          state.read.upload(input.data); Hstep(-.5 * dt); read();
          const initialEnergy = energy(pixels, N, W, H, dt);
          let steps = 0;
          for (const time of s.sampleTimes) {
            const stop = Math.round(time / dt);
            if (Math.abs(stop * dt - time) > 1e-12) throw Error('Sampling time is not aligned');
            while (steps < stop) {
              Hstep(dt);
              (control === 'wrong-curl' ? wrongPass : ep).draw(state.write, { u_state: state.read, u_size: { ivec: [W, H] }, u_dt: dt, u_dx: dx });
              state.swap(); steps++;
            }
            read();
            const currentEnergy = energy(pixels, N, W, H, dt);
            if (initialEnergy > 0 && Number.isFinite(currentEnergy)) maxEnergyDrift = Math.max(maxEnergyDrift, Math.abs(currentEnergy / initialEnergy - 1));
            const regional = input.target.reduce((sum, [k, weight]) => sum + weight * pixels[k] ** 2, 0);
            samples.push({ time, electricIntegral: Number.isFinite(regional) ? regional : null, modifiedEnergy: Number.isFinite(currentEnergy) ? currentEnergy : null });
            if (nonfiniteValues) break;
          }
          const rejectionReasons = [];
          if (!(input.electricIntegral > 1e-12)) rejectionReasons.push('zero initial electric norm');
          if (nonfiniteValues) rejectionReasons.push('nonfinite field');
          if (materialChanged) rejectionReasons.push('material changed during evolution');
          if (maxEnergyDrift > plan.maxModifiedEnergyRelativeDrift) rejectionReasons.push('cross-time energy drift');
          let score = null;
          if (!rejectionReasons.length) {
            let integral = 0;
            for (let i = 1; i < samples.length; i++) integral += .5 * (samples[i].electricIntegral + samples[i - 1].electricIntegral) * (samples[i].time - samples[i - 1].time);
            score = integral / ((s.sampleTimes.at(-1) - s.sampleTimes[0]) * input.electricIntegral);
            if (!(Number.isFinite(score) && score >= 0)) { score = null; rejectionReasons.push('invalid score'); }
          }
          return { geometryId: design.id, control, cellsPerUnit: N, cells: [W, H], physicalDomain: [Lx, plan.domainHeight], dx, dt, steps,
            initialElectricIntegral: input.electricIntegral, dielectricArea: input.dielectricArea, targetArea: input.targetArea,
            initialModifiedEnergy: initialEnergy, maxModifiedEnergyRelativeDrift: maxEnergyDrift,
            nonfiniteValues, materialChanged, maxField, samples, score, valid: rejectionReasons.length === 0, rejectionReasons };
        } finally { state.dispose(); }
      }
      const controls = {
        zeroSource: run(designs[0], 128, 2, 'zero-source'),
        wrongCurl: run(designs[0], 128, 2, 'wrong-curl'),
      };
      if (controls.zeroSource.valid || controls.zeroSource.maxField !== 0 || controls.zeroSource.nonfiniteValues || controls.wrongCurl.valid) throw Error('A deliberate control escaped detection');
      const runs = [];
      for (const N of plan.cellsPerUnit) for (const design of designs) for (const Lx of plan.domainWidths) runs.push(run(design, N, Lx));
      if (runs.some(row => !row.valid)) throw Error('A physical simulation failed independent validity checks: ' + JSON.stringify(runs.filter(row => !row.valid)));
      return { backend, controls, runs };
    }, { s: SETTINGS, plan: PLAN, designs });

    const comparisons = [], replayChecks = [];
    for (const N of PLAN.cellsPerUnit) for (const design of designs) {
      const pair = PLAN.domainWidths.map(Lx => result.runs.find(row => row.cellsPerUnit === N && row.geometryId === design.id && row.physicalDomain[0] === Lx));
      for (const key of ['initialElectricIntegral', 'dielectricArea', 'targetArea', 'dx', 'dt', 'initialModifiedEnergy']) assert.equal(pair[0][key], pair[1][key], 'Domain extension changed ' + key);
      comparisons.push({ geometryId: design.id, cellsPerUnit: N, unitDomainScore: pair[0].score, doubledDomainScore: pair[1].score, doubledToUnitRatio: pair[1].score / pair[0].score, scoreDecreaseFraction: 1 - pair[1].score / pair[0].score });
      const reference = N === 128 ? (design.sites.length ? saved.screening.find(row => row.geometry.id === design.id).run : saved.vacuumCalibration)
        : saved.verification.find(row => row.geometryId === design.id)?.refinement[0].nominal;
      if (reference) {
        const relativeDifference = Math.abs(pair[0].score / reference.score - 1);
        assert(relativeDifference <= PLAN.maxReplayRelativeDifference, 'Original square setup did not reproduce: ' + design.id);
        replayChecks.push({ geometryId: design.id, cellsPerUnit: N, savedScore: reference.score, observedScore: pair[0].score, relativeDifference });
      }
    }
    const uniform = comparisons.filter(row => row.geometryId === 'uniform-no-rods');
    const hypothesisSupported = uniform.every(row => row.scoreDecreaseFraction >= PLAN.requiredUniformScoreDecrease);
    const distanceToTarget = (cx, cy) => Math.hypot(Math.max(SETTINGS.target.x[0] - cx, 0, cx - SETTINGS.target.x[1]), Math.max(SETTINGS.target.y[0] - cy, 0, cy - SETTINGS.target.y[1])) - SETTINGS.source.radius;
    const geometricInference = {
      backgroundWaveSpeed: 1 / Math.sqrt(SETTINGS.backgroundEpsilon * SETTINGS.mu),
      directSupportToTargetDistance: distanceToTarget(...SETTINGS.source.center),
      periodicSourceImageDistances: PLAN.domainWidths.map(Lx => ({ domainWidth: Lx, nearestXImageSupportToTargetDistance: Math.min(distanceToTarget(SETTINGS.source.center[0] + Lx, SETTINGS.source.center[1]), distanceToTarget(SETTINGS.source.center[0] - Lx, SETTINGS.source.center[1])) })),
      interpretation: 'Continuum geometry suggests an earlier wrapped route in the unit domain and removes that short route when width doubles. These distances are support-to-target lower bounds, not measured ray paths or a proof of causal support for the discrete scheme. Direct propagation can enter the later part of the same window.',
    };
    const output = {
      format: 'genchase-maxwell-boundary-v1',
      command: 'node tools/maxwell-boundary.js > experiments/results/maxwell-boundary.json',
      sourceSha256: sha(source), harnessSha256: sha(fs.readFileSync(__filename)), savedSearchPath: SAVED, savedSearchSha256: sha(savedText),
      scope: 'Paired domain-extension experiment using maintained H/E shaders, at unchanged physical dx/dt and initial E, H(t=0)=0. Raw regional electric-field concentration, not power, transmission or a physical law.',
      settings: SETTINGS, frozenPlan: PLAN, geometries: designs,
      summary: { hypothesisSupportedWithinThisFiniteTest: hypothesisSupported, uniformScoreDecreaseFractions: uniform.map(row => ({ cellsPerUnit: row.cellsPerUnit, decrease: row.scoreDecreaseFraction })), maximumPhysicalRunEnergyDrift: Math.max(...result.runs.map(row => row.maxModifiedEnergyRelativeDrift)), originalSetupReplayChecks: replayChecks.length, forwardRuns: result.runs.length + 2 },
      hypothesis: { statement: PLAN.statement, supportedWithinThisFiniteTest: hypothesisSupported, failedCriteria: uniform.filter(row => row.scoreDecreaseFraction < PLAN.requiredUniformScoreDecrease).map(row => 'Uniform score decrease below 90% at ' + row.cellsPerUnit + ' cells per physical unit') },
      comparisons, replayChecks, geometricInference, ...result,
      limitations: 'Changing periodic width changes the mathematical problem. The score difference includes wave interference, so it cannot be interpreted as an additive fraction of energy carried by a path. Seven-time trapezoidal quadrature and two grids are finite evidence; no independent Meep replay, absorbing-boundary comparison, device/experiment claim or novelty claim. This does not certify every material, time window or layout.',
    };
    console.log(JSON.stringify(output, null, 2));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
