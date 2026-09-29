// node tools/parameter-state-check.js: actual controls, stability clamps and pending geometry/data.
'use strict';
const assert = require('node:assert/strict'), path = require('node:path'), fs = require('node:fs'), os = require('node:os');
const { chromium } = require('playwright'), { glArgs } = require('./lib/gl-args');
(async () => {
  const browser = await chromium.launch({ args: glArgs() }), scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'genchase-parameters-'));
  try {
    const page = await browser.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
    const studio = process.env.STUDIO ? path.resolve(process.env.STUDIO) : path.resolve(__dirname, '../dist/studio.html');
    const hash = Buffer.from(JSON.stringify({ running: false, warmup: 0 })).toString('base64url');
    await page.goto('file://' + studio + '#convection/parameter-state/' + hash);
    await page.waitForFunction(() => document.querySelector('#p-convection-grid-256'));
    const convection = await page.evaluate(() => {
      const rows = [], check = label => {
        const s = { ...Studio.modules.convection.defaults, ...Studio.getRecipe() }, H = Math.max(64, Math.round(s.grid * 9 / 16)) & ~1, dx = 1 / (H - 1), Ra = 10 ** s.logRa;
        const ceiling = Math.min(0.2 * dx * dx / Math.max(1 / Math.sqrt(Ra * s.Pr), Math.sqrt(s.Pr / Ra)), 1.2 * dx);
        rows.push({ label, grid: s.grid, Pr: s.Pr, logRa: s.logRa, dt: s.dt, ceiling });
      };
      document.querySelector('#p-convection-grid-256').click(); check('grid');
      for (const [key, value] of [['Pr', 10], ['logRa', 3], ['dt', 0.03]]) {
        const el = document.querySelector('#p-convection-' + key); el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); check(key);
      }
      return rows;
    });
    for (const row of convection) assert.ok(row.dt <= row.ceiling + 1e-15, JSON.stringify(row));
    console.log('PASS actual convection grid/Pr/logRa/dt controls enforce diffusion ceiling', JSON.stringify(convection));
    // Register before boot so this fixture has real navigation buttons.
    const registerFixture = () => {
      const calls = window.parameterCalls = [];
      Studio.register({ id: 'parameter-fixture', name: 'Parameter fixture', order: 999, defaults: { size: 2, level: 1, tint: 1 },
        schema: [
          { key: 'size', group: 'Test', label: 'Size', type: 'range', kind: 'geom', min: 1, max: 32, step: 1 },
          { key: 'level', group: 'Test', label: 'Level', type: 'range', kind: 'live', min: 1, max: 32, step: 1 },
          { key: 'tint', group: 'Test', label: 'Tint', type: 'range', kind: 'paint', min: 1, max: 32, step: 1 }
        ], sanitize(s) { s.level = Math.min(s.size, s.level); },
        create(host) {
          window.parameterHost = host; let built = 0;
          return { aspect: () => 1, regenerate() { built = host.getState().size; host.setStatus('fixture built ' + built); calls.push({ type: 'build', built }); },
            repaint() { calls.push({ type: 'paint', built }); }, live(key, value) { calls.push({ type: 'live', value, state: host.getState()[key] }); }, resize() {}, pause() {}, resume() {},
            async exportData() { return { arrays: { size: { data: Float64Array.of(built), shape: [1] } }, meta: { built, requested: host.getState().size } }; }
          };
        }
      });
    };
    const source = fs.readFileSync(studio, 'utf8');
    assert.equal(source.split('Studio.boot();').length, 2);
    const fixtureStudio = path.join(scratch, 'studio.html');
    fs.writeFileSync(fixtureStudio, source.replace('Studio.boot();', '(' + registerFixture.toString() + ')();\nStudio.boot();'));
    await page.goto('file://' + fixtureStudio + '#parameter-fixture/state');
    await page.waitForFunction(() => Studio.getRecipe()?.id === 'parameter-fixture' && document.querySelector('#p-parameter-fixture-size'));
    const fixture = await page.evaluate(async () => {
      const set = (key, value) => { const before = parameterHost.getState(), el = document.querySelector('#p-parameter-fixture-' + key); el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); if (parameterHost.getState() !== before) throw Error('parameter edit replaced state identity'); };
      const data = async id => { const F = GenChaseDataFormats, zip = F.readZip(new Uint8Array(await (await Studio.exportData(id)).arrayBuffer())); const meta = JSON.parse(new TextDecoder().decode(zip['meta.json'])); if (meta.error) throw Error(meta.error); return meta; };
      set('size', 8); const active = await data();
      set('size', 12); document.querySelector('.tab[data-id=hopfield]').click(); const inactive = await data('parameter-fixture'), stillOnHopfield = Studio.getRecipe().id === 'hopfield';
      document.querySelector('.tab[data-id=parameter-fixture]').click();
      set('size', 14); document.querySelector('.tab[data-id=hopfield]').click(); document.querySelector('.tab[data-id=parameter-fixture]').click(); const returned = await data();
      set('size', 16); set('tint', 3); const painted = await data();
      set('level', 30); const live = parameterCalls.at(-1);
      return { active: active.grid, inactive: inactive.grid, inactiveId: inactive.provenance.technique.id, stillOnHopfield, returned: returned.grid, painted: painted.grid, live };
    });
    for (const [name, n] of [['active', 8], ['inactive', 12], ['returned', 14], ['painted', 16]]) assert.deepEqual(fixture[name], { built: n, requested: n });
    assert.equal(fixture.inactiveId, 'parameter-fixture'); assert.ok(fixture.stillOnHopfield); assert.deepEqual(fixture.live, { type: 'live', value: 16, state: 16 });
    console.log('PASS queued geometry is applied for active/inactive data exports, tab return and paint; sanitized live value and state identity retained');
    const recipe = Buffer.from(JSON.stringify({ count: 100, steps: 32 })).toString('base64url');
    await page.goto('file://' + studio + '#flow-matching/parameter-state/' + recipe);
    await page.waitForFunction(() => document.querySelector('#status').textContent.includes('complete'));
    const flow = await page.evaluate(async () => {
      const el = document.querySelector('#p-flow-matching-steps'); el.value = '256'; el.dispatchEvent(new Event('input', { bubbles: true }));
      const F = GenChaseDataFormats, zip = F.readZip(new Uint8Array(await (await Studio.exportData()).arrayBuffer())), array = F.readNpy(zip['trajectories.npy']);
      return { shape: array.shape, zeros: array.data.filter(v => v === 0).length, finite: array.data.every(Number.isFinite), meta: JSON.parse(new TextDecoder().decode(zip['meta.json'])).grid };
    });
    assert.deepEqual(flow.shape, [100, 257, 2]); assert.equal(flow.zeros, 0); assert.ok(flow.finite); assert.equal(flow.meta.steps, 256);
    console.log('PASS immediate flow export after a 32 to 256 step drag contains the regenerated trajectories, no zero padding');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); fs.rmSync(scratch, { recursive: true, force: true }); }
})().catch(e => { console.error(e); process.exitCode = 1; });
