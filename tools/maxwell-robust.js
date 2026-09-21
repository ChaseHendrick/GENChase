// New frozen experiment following MAXWELL-BOUNDARY.md, not a retuned earlier result.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '..');
const SETTINGS = {
  boundary: 'periodic', mu: 1, backgroundEpsilon: 1, rodEpsilon: 4,
  source: { center: [.1875, .5], radius: .14, cycles: 4, phase: .17, magneticAtZero: 0 },
  target: { x: [.6875, .8125], y: [.5625, .6875] },
  sampleTimes: [.6, .65, .7, .75, .8, .85, .9], courantCeiling: .6,
  rodRadius: .03125, siteColumns: 4, siteRows: 6, siteOrigin: [.375, .265625], siteSpacing: .09375, occupiedCount: 12,
};
const PLAN = {
  protocolDate: '2026-09-21', candidateCount: 12, randomSeedStart: 37001,
  selectionGrid: 128, selectionDomains: [[1, 1], [2, 2]], primaryDomain: [2, 2],
  verificationGrid: 256, finestGrid: 512, extendedDomain: [3, 3],
  heldOutSeedStart: 47001, heldOutCount: 8, jitter: .006, radiusRelativeError: .05, epsilonRelativeError: .05,
  requiredWorstCaseGain: .05, minimumHeldOutMeanGain: 0,
  maxGridRelativeDifference: .05, maxHalfStepRelativeDifference: .01, maxDomainRelativeDifference: .01,
  maxModifiedEnergyRelativeDrift: 1e-4,
  hypothesis: 'On the new buffered-domain pool, nominal and worst-single-deletion objectives select distinct layouts; the latter retains at least a 5% worst-case score advantage at 256 cells per unit, loses no mean held-out score, and passes the predeclared grid, step and domain sensitivity checks.',
};
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
function rng(seed) { let x = seed >>> 0; return () => { x += 0x6D2B79F5; let t = Math.imul(x ^ x >>> 15, 1 | x); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function layouts() {
  const sites = Array.from({ length: 24 }, (_, i) => i);
  const rows = [
    { id: 'simple-two-columns', kind: 'simple baseline', sites: sites.filter(i => i % 4 === 0 || i % 4 === 3) },
    { id: 'simple-checkerboard', kind: 'simple baseline', sites: sites.filter(i => (i % 4 + Math.floor(i / 4)) % 2 === 0) },
  ];
  const seen = new Set(rows.map(row => row.sites.join(',')));
  for (let seed = PLAN.randomSeedStart; rows.length < PLAN.candidateCount; seed++) {
    const random = rng(seed), shuffled = [...sites];
    for (let i = 23; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
    const chosen = shuffled.slice(0, 12).sort((a, b) => a - b), key = chosen.join(',');
    if (!seen.has(key)) { rows.push({ id: 'random-' + seed, kind: 'fresh seeded random', seed, sites: chosen }); seen.add(key); }
  }
  return rows;
}
function heldOutBank() {
  return Array.from({ length: PLAN.heldOutCount }, (_, i) => {
    const seed = PLAN.heldOutSeedStart + i, random = rng(seed);
    const offsets = Array.from({ length: 24 }, () => [(2 * random() - 1) * PLAN.jitter, (2 * random() - 1) * PLAN.jitter]);
    return { id: 'held-out-' + seed, seed, offsets, radiusScale: 1 + (2 * random() - 1) * PLAN.radiusRelativeError, epsilonScale: 1 + (2 * random() - 1) * PLAN.epsilonRelativeError };
  });
}
function summarize(geometry, runs) {
  assert.equal(runs.length, 13, 'Every layout needs nominal plus all twelve deletions');
  assert(runs.every(run => run.valid), 'Invalid simulation cannot be ranked');
  assert.equal(runs.filter(run => run.condition.id === 'nominal').length, 1);
  const deleted = runs.filter(run => run.condition.id !== 'nominal').map(run => run.condition.deletedSite).sort((a, b) => a - b);
  assert.deepEqual(deleted, geometry.sites, 'The entire single-deletion set must be tested');
  const nominal = runs.find(run => run.condition.id === 'nominal');
  const worst = [...runs].sort((a, b) => a.score - b.score || a.condition.id.localeCompare(b.condition.id))[0];
  return { geometryId: geometry.id, nominalScore: nominal.score, worstScore: worst.score, worstCondition: worst.condition, retentionFraction: worst.score / nominal.score };
}
function order(rows, key) { return [...rows].sort((a, b) => b[key] - a[key] || a.geometryId.localeCompare(b.geometryId)); }
function rankCorrelation(a, b, key) {
  const x = order(a, key), y = order(b, key), n = x.length;
  const square = x.reduce((sum, row, i) => sum + (i - y.findIndex(other => other.geometryId === row.geometryId)) ** 2, 0);
  return 1 - 6 * square / (n * (n * n - 1));
}
function checks() {
  const pool = layouts(); assert.equal(pool.length, 12); assert.equal(new Set(pool.map(g => g.sites.join(','))).size, 12);
  for (const g of pool) { assert.equal(g.sites.length, 12); assert.equal(new Set(g.sites).size, 12); }
  const g = pool[0], rows = [{ condition: { id: 'nominal' }, score: 10, valid: true }, ...g.sites.map(site => ({ condition: { id: 'delete-' + site, deletedSite: site }, score: site === 0 ? 1 : 5, valid: true }))];
  assert.equal(summarize(g, rows).worstScore, 1);
  assert.throws(() => summarize(g, rows.slice(0, 12)));
  assert.throws(() => summarize(g, rows.map((r, i) => i === 0 ? { ...r, valid: false } : r)));
  const missing = structuredClone(rows); missing[1].condition.deletedSite = 23; assert.throws(() => summarize(g, missing));
  const a = [{ geometryId: 'a', nominalScore: 10, worstScore: 1 }, { geometryId: 'b', nominalScore: 8, worstScore: 7 }];
  assert.equal(order(a, 'nominalScore')[0].geometryId, 'a'); assert.equal(order(a, 'worstScore')[0].geometryId, 'b');
  assert.equal(rankCorrelation(a, a, 'nominalScore'), 1);
  const bank = heldOutBank(); assert.equal(bank.length, 8); assert.deepEqual(bank, heldOutBank());
  return { candidates: pool.length, conditionsPerCandidate: 13, heldOutConditions: bank.length, passed: true };
}

// Kept independent of the search harness. Only the maintained shader strings are shared.
function installRunner({ s, plan }) {
  const G = Studio.gl, shaders = window.maxwellRobustShaders, gl = G.createGL(document.createElement('canvas'));
  if (!gl || !gl.floatExt) throw Error('Robust experiment requires WebGL2 float32');
  const hp = new G.Pass(gl, shaders.H_FS), ep = new G.Pass(gl, shaders.E_FS);
  const wrongSource = shaders.E_FS.replace('q.r += u_dt * curlH', 'q.r -= u_dt * curlH');
  if (wrongSource === shaders.E_FS) throw Error('Wrong-curl control mutation did not apply');
  const wrong = new G.Pass(gl, wrongSource), debug = gl.getExtension('WEBGL_debug_renderer_info');
  const at = (x, y, W, H) => 4 * (((y + H) % H) * W + (x + W) % W);
  function initial(design, N, W, H, condition, blank) {
    const data = new Float32Array(W * H * 4), detector = [], radius = s.rodRadius * (condition.radiusScale || 1);
    let norm = 0, dielectricCells = 0, targetArea = 0;
    const positions = Array.from({ length: 24 }, (_, site) => [s.siteOrigin[0] + site % 4 * s.siteSpacing + (condition.offsets?.[site]?.[0] || 0), s.siteOrigin[1] + Math.floor(site / 4) * s.siteSpacing + (condition.offsets?.[site]?.[1] || 0)]);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = at(x, y, W, H), px = x / N, py = y / N, sx = px - s.source.center[0], sy = py - s.source.center[1];
      const q = (sx * sx + sy * sy) / s.source.radius ** 2;
      data[k] = !blank && q < 1 ? Math.exp(1 - 1 / (1 - q)) * Math.cos(2 * Math.PI * s.source.cycles * sx + s.source.phase) : 0;
      data[k + 3] = s.backgroundEpsilon;
      for (const site of design.sites) if (site !== condition.deletedSite && (px - positions[site][0]) ** 2 + (py - positions[site][1]) ** 2 <= radius ** 2) { data[k + 3] = s.rodEpsilon * (condition.epsilonScale || 1); dielectricCells++; break; }
      if (data[k] && data[k + 3] !== s.backgroundEpsilon) throw Error('A material perturbation intersects the fixed source');
      norm += data[k] ** 2 / N ** 2;
      const wx = Math.max(0, Math.min((x + .5) / N, s.target.x[1]) - Math.max((x - .5) / N, s.target.x[0]));
      const wy = Math.max(0, Math.min((y + .5) / N, s.target.y[1]) - Math.max((y - .5) / N, s.target.y[0]));
      if (wx * wy > 0) { detector.push([k, wx * wy]); targetArea += wx * wy; }
    }
    if (Math.abs(targetArea - .015625) > 1e-14) throw Error('Physical target area changed');
    return { data, norm, detector, targetArea, dielectricArea: dielectricCells / N ** 2 };
  }
  function energy(data, N, W, H, dt) {
    let sum = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = at(x, y, W, H), hx = data[k + 1], hy = data[k + 2];
      const hxPlus = hx - dt * N * (data[at(x, y + 1, W, H)] - data[k]) / s.mu;
      const hyPlus = hy + dt * N * (data[at(x + 1, y, W, H)] - data[k]) / s.mu;
      sum += data[k + 3] * data[k] ** 2 + s.mu * (hx * hxPlus + hy * hyPlus);
    }
    return sum / N ** 2;
  }
  window.maxwellRobustRun = ({ design, N, domain, condition = { id: 'nominal' }, halfStep = false, control = '' }) => {
    const W = N * domain[0], H = N * domain[1], dx = 1 / N;
    if (![W, H].every(Number.isInteger) || Math.max(W, H) > gl.getParameter(gl.MAX_TEXTURE_SIZE)) throw Error('Unsupported physical domain/grid');
    const dt = .025 / Math.ceil(.025 / (s.courantCeiling / (Math.SQRT2 * N))) / (halfStep ? 2 : 1);
    const input = initial(design, N, W, H, condition, control === 'zero-source');
    const state = new G.PingPong(gl, W, H, { type: 'rgba32f', filter: 'nearest', wrap: 'repeat' });
    if ([state.read, state.write].some(target => target.w !== W || target.h !== H || target.type !== 'rgba32f')) throw Error('Physical grid was changed');
    const pixels = new Float32Array(W * H * 4), samples = [];
    let nonfiniteValues = 0, maxField = 0, materialChanged = false, maxEnergyDrift = 0;
    const read = () => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, state.read.fbo); gl.readPixels(0, 0, W, H, gl.RGBA, gl.FLOAT, pixels); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      if (gl.getError() !== gl.NO_ERROR) throw Error('Field readback failed');
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
        const stop = Math.round(time / dt); if (Math.abs(stop * dt - time) > 1e-12) throw Error('Unaligned sample time');
        while (steps < stop) { Hstep(dt); (control === 'wrong-curl' ? wrong : ep).draw(state.write, { u_state: state.read, u_size: { ivec: [W, H] }, u_dt: dt, u_dx: dx }); state.swap(); steps++; }
        read(); const currentEnergy = energy(pixels, N, W, H, dt);
        if (initialEnergy > 0 && Number.isFinite(currentEnergy)) maxEnergyDrift = Math.max(maxEnergyDrift, Math.abs(currentEnergy / initialEnergy - 1));
        const regional = input.detector.reduce((sum, [k, weight]) => sum + weight * pixels[k] ** 2, 0);
        samples.push({ time, electricIntegral: Number.isFinite(regional) ? regional : null, modifiedEnergy: Number.isFinite(currentEnergy) ? currentEnergy : null });
        if (nonfiniteValues) break;
      }
      const rejectionReasons = [];
      if (!(input.norm > 1e-12)) rejectionReasons.push('zero initial electric norm');
      if (nonfiniteValues) rejectionReasons.push('nonfinite field');
      if (materialChanged) rejectionReasons.push('material changed');
      if (maxEnergyDrift > plan.maxModifiedEnergyRelativeDrift) rejectionReasons.push('modified energy drift');
      let score = null;
      if (!rejectionReasons.length) {
        let integral = 0; for (let i = 1; i < samples.length; i++) integral += .5 * (samples[i].electricIntegral + samples[i - 1].electricIntegral) * (samples[i].time - samples[i - 1].time);
        score = integral / ((s.sampleTimes.at(-1) - s.sampleTimes[0]) * input.norm);
        if (!(Number.isFinite(score) && score >= 0)) { score = null; rejectionReasons.push('invalid score'); }
      }
      return { geometryId: design.id, condition, cellsPerUnit: N, physicalDomain: domain, cells: [W, H], dt, dx, halfStep, control, steps,
        initialElectricIntegral: input.norm, initialModifiedEnergy: initialEnergy, targetArea: input.targetArea, dielectricArea: input.dielectricArea,
        maxModifiedEnergyRelativeDrift: maxEnergyDrift, materialChanged, nonfiniteValues, maxField, samples, score, valid: !rejectionReasons.length, rejectionReasons };
    } finally { state.dispose(); }
  };
  return { userAgent: navigator.userAgent, vendor: gl.getParameter(debug ? debug.UNMASKED_VENDOR_WEBGL : gl.VENDOR), renderer: gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER) };
}

async function main() {
  const options = process.argv.slice(2); assert(options.length <= 1 && options.every(option => ['--check', '--plan'].includes(option)), 'Use --check, --plan or no option');
  const checkResult = checks(), pool = layouts(), bank = heldOutBank();
  const protocol = { settings: SETTINGS, plan: PLAN, pool, heldOutBank: bank };
  if (options[0] === '--check') { console.log(JSON.stringify(checkResult, null, 2)); return; }
  if (options[0] === '--plan') { console.log(JSON.stringify({ ...protocol, protocolSha256: sha(JSON.stringify(protocol)) }, null, 2)); return; }
  const source = fs.readFileSync(path.join(ROOT, 'src/modules/maxwell.js'), 'utf8'), marker = '  Studio.register({';
  assert.equal(source.split(marker).length, 2, 'Maintained shader hook changed');
  const boundaryText = fs.readFileSync(path.join(ROOT, 'experiments/results/maxwell-boundary.json'), 'utf8'), boundary = JSON.parse(boundaryText);
  assert.equal(boundary.sourceSha256, sha(source), 'Boundary evidence belongs to another solver revision');
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage();
    await page.goto('file://' + path.join(ROOT, 'studio.html') + '#three-vortex-bound/maxwell-robust');
    await page.evaluate(source.replace(marker, '  window.maxwellRobustShaders={H_FS,E_FS};\n' + marker));
    const backend = await page.evaluate(installRunner, { s: SETTINGS, plan: PLAN });
    let forwardRuns = 0;
    const physicalRuns = [];
    const run = async args => {
      const result = await page.evaluate(args => window.maxwellRobustRun(args), args); forwardRuns++;
      if (!args.control) { assert(result.valid, 'Invalid physical run: ' + JSON.stringify(result)); physicalRuns.push(result); }
      return result;
    };
    const allConditions = geometry => [{ id: 'nominal' }, ...geometry.sites.map(site => ({ id: 'delete-' + site, deletedSite: site }))];
    const evaluateLayout = async (geometry, N, domain) => {
      const runs = []; for (const condition of allConditions(geometry)) runs.push(await run({ design: geometry, N, domain, condition }));
      return { geometry, summary: summarize(geometry, runs), runs };
    };
    const uniform = { id: 'uniform-no-rods', kind: 'noncompeting reference', sites: [] };
    const controls = {
      zeroSource: await run({ design: uniform, N: 128, domain: [2, 2], control: 'zero-source' }),
      wrongCurl: await run({ design: uniform, N: 128, domain: [2, 2], control: 'wrong-curl' }),
    };
    assert(!controls.zeroSource.valid && controls.zeroSource.maxField === 0 && !controls.zeroSource.nonfiniteValues);
    assert(!controls.wrongCurl.valid, 'Wrong-curl mutation escaped rejection');
    const selection = [];
    for (const domain of PLAN.selectionDomains) {
      const rows = [];
      for (const geometry of pool) {
        rows.push(await evaluateLayout(geometry, PLAN.selectionGrid, domain));
        process.stderr.write('selection ' + domain.join('x') + ': ' + rows.length + '/' + pool.length + ' layouts; ' + forwardRuns + ' runs\n');
      }
      const summaries = rows.map(row => row.summary);
      selection.push({ domain, rows, nominalOrder: order(summaries, 'nominalScore').map(row => row.geometryId), robustOrder: order(summaries, 'worstScore').map(row => row.geometryId) });
    }
    const primary = selection[1], nominalId = primary.nominalOrder[0], robustId = primary.robustOrder[0];
    const bestSimpleId = order(primary.rows.filter(row => row.geometry.kind === 'simple baseline').map(row => row.summary), 'worstScore')[0].geometryId;
    const finalists = [...new Set([nominalId, robustId, bestSimpleId])].map(id => pool.find(g => g.id === id));
    const verification = [];
    for (const geometry of finalists) {
      const full = await evaluateLayout(geometry, PLAN.verificationGrid, PLAN.primaryDomain);
      const selectedConditions = [...new Map([{ id: 'nominal' }, full.summary.worstCondition].map(c => [c.id, c])).values()];
      const fine = [], halfStep = [], extended = [], heldOut = [];
      for (const condition of selectedConditions) {
        fine.push(await run({ design: geometry, N: PLAN.finestGrid, domain: PLAN.primaryDomain, condition }));
        halfStep.push(await run({ design: geometry, N: PLAN.verificationGrid, domain: PLAN.primaryDomain, condition, halfStep: true }));
        extended.push(await run({ design: geometry, N: PLAN.selectionGrid, domain: PLAN.extendedDomain, condition }));
      }
      for (const condition of bank) heldOut.push(await run({ design: geometry, N: PLAN.verificationGrid, domain: PLAN.primaryDomain, condition }));
      const relative = (a, b) => Math.abs(a / b - 1), coarseRuns = primary.rows.find(row => row.geometry.id === geometry.id).runs;
      const sensitivity = selectedConditions.map(condition => {
        const matching = runs => runs.find(row => row.condition.id === condition.id);
        return { condition: condition.id,
          grid128To256Relative: relative(matching(coarseRuns).score, matching(full.runs).score),
          grid256To512Relative: relative(matching(full.runs).score, matching(fine).score),
          halfStepRelative: relative(matching(full.runs).score, matching(halfStep).score),
          domain2To3Relative: relative(matching(coarseRuns).score, matching(extended).score) };
      });
      verification.push({ geometry, full, fineSelectedConditions: fine, halfStepSelectedConditions: halfStep, extendedSelectedConditions: extended, heldOut, sensitivity });
      process.stderr.write('verified ' + geometry.id + '; ' + forwardRuns + ' runs\n');
    }
    const references = [];
    for (const N of [128, 256]) for (const domain of [[2, 2], [3, 3]]) references.push(await run({ design: uniform, N, domain }));
    const nominal = verification.find(row => row.geometry.id === nominalId), robust = verification.find(row => row.geometry.id === robustId);
    const worstCaseGainAt256 = robust.full.summary.worstScore / nominal.full.summary.worstScore - 1;
    const nominalScoreCostAt256 = 1 - robust.full.summary.nominalScore / nominal.full.summary.nominalScore;
    const pairedHeldOut = bank.map((condition, i) => ({ conditionId: condition.id, nominalScore: nominal.heldOut[i].score, robustScore: robust.heldOut[i].score, difference: robust.heldOut[i].score - nominal.heldOut[i].score }));
    const mean = rows => rows.reduce((sum, row) => sum + row, 0) / rows.length;
    const heldOutMeanGain = mean(pairedHeldOut.map(row => row.robustScore)) / mean(pairedHeldOut.map(row => row.nominalScore)) - 1;
    const random = rng(57001), boot = [];
    for (let k = 0; k < 10000; k++) boot.push(mean(Array.from({ length: pairedHeldOut.length }, () => pairedHeldOut[Math.floor(random() * pairedHeldOut.length)].difference)));
    boot.sort((a, b) => a - b);
    const failedCriteria = [];
    if (nominalId === robustId) failedCriteria.push('Nominal and robust objectives selected the same layout');
    if (worstCaseGainAt256 < PLAN.requiredWorstCaseGain) failedCriteria.push('Worst-case gain at256 below5%');
    if (heldOutMeanGain < PLAN.minimumHeldOutMeanGain) failedCriteria.push('Mean held-out score decreased');
    for (const row of [nominal, robust]) for (const check of row.sensitivity) {
      if (check.grid256To512Relative > PLAN.maxGridRelativeDifference) failedCriteria.push(row.geometry.id + '/' + check.condition + ' grid sensitivity above5%');
      if (check.halfStepRelative > PLAN.maxHalfStepRelativeDifference) failedCriteria.push(row.geometry.id + '/' + check.condition + ' half-step sensitivity above1%');
      if (check.domain2To3Relative > PLAN.maxDomainRelativeDifference) failedCriteria.push(row.geometry.id + '/' + check.condition + ' domain sensitivity above1%');
    }
    const rankComparison = {
      nominalSpearman: rankCorrelation(selection[0].rows.map(row => row.summary), primary.rows.map(row => row.summary), 'nominalScore'),
      robustSpearman: rankCorrelation(selection[0].rows.map(row => row.summary), primary.rows.map(row => row.summary), 'worstScore'),
      unitDomainWinners: { nominal: selection[0].nominalOrder[0], robust: selection[0].robustOrder[0] },
      bufferedDomainWinners: { nominal: nominalId, robust: robustId },
    };
    console.log(JSON.stringify({
      format: 'genchase-maxwell-robust-v1', command: 'node tools/maxwell-robust.js > experiments/results/maxwell-robust.json',
      sourceSha256: sha(source), harnessSha256: sha(fs.readFileSync(__filename)), boundaryEvidenceSha256: sha(boundaryText), protocolSha256: sha(JSON.stringify(protocol)),
      scope: 'Fixed-pool comparison of nominal versus worst-single-deletion selection. Buffered periodic TMz initial-value fields, raw regional Ez² concentration, not power or transmission. No learned optimizer runs.',
      ...protocol, backend, controls, selection, verification, uniformReferences: references,
      summary: { hypothesisSupportedWithinThisFiniteTest: !failedCriteria.length, nominalSelection: nominalId, robustSelection: robustId, bestSimpleRobustSelection: bestSimpleId,
        worstCaseGainAt256, nominalScoreCostAt256, heldOutMeanGain, rankComparison,
        pairedHeldOutMeanDifference: mean(pairedHeldOut.map(row => row.difference)), pairedHeldOutBootstrap95Percentile: [boot[250], boot[9749]], pairedHeldOut,
        maximumModifiedEnergyRelativeDrift: Math.max(...physicalRuns.map(row => row.maxModifiedEnergyRelativeDrift)), forwardRuns,
        budget: { selection: PLAN.candidateCount * 13 * PLAN.selectionDomains.length, verification: forwardRuns - PLAN.candidateCount * 13 * PLAN.selectionDomains.length - references.length - 2, references: references.length, controls: 2 } },
      hypothesis: { statement: PLAN.hypothesis, supportedWithinThisFiniteTest: !failedCriteria.length, failedCriteria: [...new Set(failedCriteria)] },
      limitations: 'The training worst-case advantage is guaranteed by selection and is not independent evidence. One common evaluated pool is compared, not equally costly optimization algorithms or AI against ordinary search. All single deletions are tested only at128 for the pool and256 for finalists;512 refines only nominal and the256-selected worst condition. Eight held-out errors and their bootstrap reflect finite sampling, not all defects or solver uncertainty. Seven-time quadrature is the objective definition; not a converged continuous exposure. No PML, independent Meep replay, physical validation, or established historical novelty.',
    }, null, 2));
  } finally { await browser.close(); }
}
module.exports = { SETTINGS, PLAN, layouts, heldOutBank, summarize, rankCorrelation, checks };
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
