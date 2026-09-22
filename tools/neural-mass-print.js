// Actual browser trace, vector/raster print and shell export checks.
// Requires Playwright and Chromium. node tools/neural-mass-print.js [--write]
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { chromium } = require('playwright'), reference=require('./lib/mpr-reference');
(async () => {
  const root = path.resolve(__dirname, '..'), temp = path.join(root, '.neural-mass-print-test.html');
  const source = fs.readFileSync(path.join(root, 'src/modules/neural-mass.js'), 'utf8');
  const marker = '    return {\n      aspect()'; assert(source.includes(marker));
  const instrumented = source.replace(marker, `    return globalThis.neuralAudit = {
      audit() { return { parameters: {...host.getState()}, n: sim.n, steps: sim.steps, recorded: sim.recorded, complete: sim.complete, halted: sim.halted, time: sim.time, r: [...sim.r], v: [...sim.v], historyR: [...sim.historyR], historyV: [...sim.historyV], times: [...sim.times] }; },
      restartPaused() { this.regenerate(); this.pause(); return this.audit(); },
      auditStop() {
        stop(); sim = makeSim(host.getState()); sim.r[0] = .2; sim.v[0] = 100; sim.reference();
        const before = JSON.stringify(this.audit()); sim.advance(1); draw();
        return { before, after: JSON.stringify(this.audit()), message: sim.halted };
      },
      aspect()`);
  const built = fs.readFileSync(path.join(root, 'dist/studio.html'), 'utf8'); assert(built.includes(source));
  fs.writeFileSync(temp, built.replace(source, instrumented)); let browser;
  try {
    browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } }), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const rows = [];
    for (const fixture of [{ view: 'phase', populations: 32 }, { view: 'rate', populations: 128, drive: 'pulse' }, { view: 'voltage', populations: 32, J: -6 }]) {
      const encoded = Buffer.from(JSON.stringify({ v: 2, ...fixture })).toString('base64url');
      await page.goto('file://' + temp + '#neural-mass/neural-print/' + encoded);
      await page.waitForFunction(() => window.neuralAudit && neuralAudit.audit().complete, null, { timeout: 120000 });
      const recording=await page.evaluate(()=>neuralAudit.audit()),p=recording.parameters;
      const referenceRuns=[.002,.001].map(step=>reference(p,recording.historyR.slice(0,recording.n),recording.historyV.slice(0,recording.n),recording.times,step));
      let trajectoryError=0,referenceError=0,wrongTraceError=0;
      for(let j=0;j<recording.historyR.length;j++){
        trajectoryError=Math.max(trajectoryError,Math.abs(recording.historyR[j]-referenceRuns[1].r[j]),Math.abs(recording.historyV[j]-referenceRuns[1].v[j]));
        referenceError=Math.max(referenceError,Math.abs(referenceRuns[0].r[j]-referenceRuns[1].r[j]),Math.abs(referenceRuns[0].v[j]-referenceRuns[1].v[j]));
        wrongTraceError=Math.max(wrongTraceError,Math.abs(recording.historyV[j]-referenceRuns[1].v[(j+recording.n)%recording.historyV.length]));
      }
      assert(trajectoryError<1e-6&&referenceError<1e-8&&wrongTraceError>.01,JSON.stringify({trajectoryError,referenceError,wrongTraceError}));
      rows.push(await page.evaluate(async fixture => {
        const instance = neuralAudit, initial = instance.audit(), before = JSON.stringify(initial), tests = [];
        instance.pause();
        for (const [w, h] of [[2400, 2400], [2400, 1800]]) {
          const png = await instance.exportPNG(w, h), svg = instance.exportSVG(w, h), a = await createImageBitmap(png);
          const image = new Image(), url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
          image.src = url; await image.decode();
          const c = document.createElement('canvas'); c.width = 400; c.height = Math.round(400 * h / w);
          const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(a, 0, 0, c.width, c.height);
          const pixels = g.getImageData(0, 0, c.width, c.height).data;
          const vectorCanvas = document.createElement('canvas'); vectorCanvas.width = w; vectorCanvas.height = h;
          vectorCanvas.getContext('2d').drawImage(image, 0, 0, w, h);
          g.clearRect(0, 0, c.width, c.height); g.drawImage(vectorCanvas, 0, 0, c.width, c.height);
          const vector = g.getImageData(0, 0, c.width, c.height).data;
          let difference = 0;
          for (let i = 0; i < pixels.length; i += 4) for (let k = 0; k < 3; k++) difference += Math.abs(pixels[i + k] - vector[i + k]);
          const documentSVG = new DOMParser().parseFromString(svg, 'image/svg+xml');
          const paths = documentSVG.querySelector('g').querySelectorAll('path');
          const curves = [...paths].map(path=>[...path.getAttribute('d').matchAll(/[ML]([\d.e+-]+),([\d.e+-]+)/g)].map(m=>[Number(m[1]),Number(m[2])])),points=curves[0];
          // Independently recover the coordinate map from the stored physical data.
          const yy = fixture.view === 'rate' ? initial.historyR : initial.historyV;
          let ymin = Infinity, ymax = -Infinity, xmin = Infinity, xmax = -Infinity;
          for (const v of yy) { ymin = Math.min(ymin, v); ymax = Math.max(ymax, v); }
          const ypad = Math.max(.02, (ymax - ymin) * .08); ymin -= ypad; ymax += ypad;
          if (fixture.view === 'phase') {
            for (const v of initial.historyR) { xmin = Math.min(xmin, v); xmax = Math.max(xmax, v); }
            const xpad = Math.max(.02, (xmax - xmin) * .05); xmin = Math.max(0, xmin - xpad); xmax += xpad;
          } else { xmin = 0; xmax = initial.time; }
          let coordinateError = 0,wrongScaleError=0,coordinatesChecked=0;
          for(let cell=0;cell<initial.n;cell++)for(let j=0;j<initial.times.length;j++){
            const physicalX = fixture.view === 'phase' ? initial.historyR[j * initial.n+cell] : initial.times[j];
            const referenceX = w * (.11 + .83 * (physicalX - xmin) / (xmax - xmin));
            const referenceY = h * (.89 - .82 * (yy[j * initial.n+cell] - ymin) / (ymax - ymin));
            coordinateError = Math.max(coordinateError, Math.hypot(curves[cell][j][0] - referenceX, curves[cell][j][1] - referenceY));
            wrongScaleError=Math.max(wrongScaleError,Math.abs(curves[cell][j][0]*1.02-referenceX));coordinatesChecked+=2;
          }
          if(wrongScaleError<1)throw Error('Wrong trace scale was not detected');
          tests.push({ coordinatesChecked,wrongScaleError, requested: [w, h], width: a.width, height: a.height, svgWidth: image.naturalWidth, svgHeight: image.naturalHeight, pngBytes: png.size, svgBytes: svg.length, tracePaths: paths.length, pointsPerPath: points.length, physicalCoordinateErrorPixels: coordinateError, rasterVectorMAD: difference / (pixels.length * .75) });
          a.close(); URL.revokeObjectURL(url);
        }
        return { fixture, steps: initial.steps, complete: initial.complete, halted: initial.halted, tests, unchanged: before === JSON.stringify(instance.audit()) };
      }, fixture));
      rows[rows.length-1].independentTrajectory={valuesCompared:recording.historyR.length*2,maximumError:trajectoryError,referenceStepSizes:[.002,.001],referenceRefinementError:referenceError,shiftedTraceError:wrongTraceError,parameters:p};
    }
    const shellBefore = await page.evaluate(() => JSON.stringify(neuralAudit.audit()));
    await page.evaluate(() => {
      for (const [id, value] of [['export-inches', '8'], ['export-dpi', '300']]) {
        const el = document.getElementById(id); el.value = value; el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      document.getElementById('btn-export').click();
    });
    await page.waitForFunction(() => { const i = document.getElementById('export-img'); return i && !i.hidden && i.naturalWidth > 0; }, null, { timeout: 120000 });
    const shell = await page.evaluate(before => {
      const img = document.getElementById('export-img');
      return { width: img.naturalWidth, height: img.naturalHeight, note: document.getElementById('export-note').textContent, unchanged: before === JSON.stringify(neuralAudit.audit()) };
    }, shellBefore);
    assert.equal(shell.width, 2400); assert.equal(shell.height, 2400); assert(shell.unchanged); assert(shell.note.includes('vector'));
    for (const row of rows) {
      assert(row.unchanged); assert(row.complete); assert.equal(row.halted, '');
      for (const t of row.tests) {
        assert.deepEqual([t.width, t.height], t.requested); assert.deepEqual([t.svgWidth, t.svgHeight], t.requested);
        assert.equal(t.tracePaths, row.fixture.populations); assert.equal(t.pointsPerPath, 1201); assert(t.physicalCoordinateErrorPixels < 1e-9);
        assert(t.rasterVectorMAD < 1.5, JSON.stringify(t));
      }
    }
    const paused = await page.evaluate(() => { document.getElementById('export-close').click(); return JSON.stringify(neuralAudit.restartPaused()); });
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => JSON.stringify(neuralAudit.audit())), paused);
    await page.evaluate(() => neuralAudit.resume());
    await page.waitForFunction(() => neuralAudit.audit().complete, null, { timeout: 120000 });
    const complete = await page.evaluate(() => JSON.stringify(neuralAudit.audit())); await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => JSON.stringify(neuralAudit.audit())), complete);
    const stop = await page.evaluate(async () => {
      const result = neuralAudit.auditStop(), before = JSON.parse(result.before), after = JSON.parse(result.after);
      delete before.halted; delete after.halted;
      let exportMessage = ''; try { await neuralAudit.exportPNG(2400, 2400); } catch (e) { exportMessage = e.message; }
      return { message: result.message, status: document.getElementById('status').textContent, rolledBack: JSON.stringify(before) === JSON.stringify(after), exportMessage };
    });
    assert(stop.rolledBack); assert(stop.status.includes('Stopped:')); assert(stop.status.includes('Time step is too large')); assert.equal(stop.exportMessage, stop.message); assert.deepEqual(errors, []);
    const result = { scope: 'Actual browser module: three trace views, 32/128 preparations, completed real seeded trajectories; 2400px square/non-square real vectors and raster exports; independent complete Dormand-Prince trajectories and every physical-to-SVG coordinate and exact numerical-state preservation; actual shell vector print; pause/resume and finite completion; visible rejected-step guard and refused incomplete export.', sourceSHA256: crypto.createHash('sha256').update(source).digest('hex'), rows, shell, computation: { pauseStops: true, resumeCompletes: true, finishedStateStaysStill: true }, stop, errors };
    if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, 'validation/results/neural-mass-print.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result, null, 2));
  } finally { if (browser) await browser.close(); fs.rmSync(temp, { force: true }); }
})().catch(e => { console.error(e); process.exitCode = 1; });
