// node tools/plate.js <hash> <out.jpg|out.png> [waitMs=9000] [cssWidth=900]
// Renders one plate at device scale 2 and saves the canvas alone, for README gallery tiles.
// Set STUDIO=path/to/studio.html to render from a test copy.
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const hash = process.argv[2], out = process.argv[3], wait = +(process.argv[4] || 9000), cssW = +(process.argv[5] || 900);
  if (!hash || !out) { console.error('usage: node tools/plate.js <hash> <out.jpg> [waitMs] [cssWidth]'); process.exit(1); }
  const studio = process.env.STUDIO ? path.resolve(process.env.STUDIO) : path.resolve(__dirname, '..', 'studio.html');
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: cssW + 560, height: cssW + 200 }, deviceScaleFactor: 2 });
  await p.goto('file://' + studio + '#' + hash);
  await p.keyboard.press('f');            // focus mode: the plate fills the window
  await p.addStyleTag({ content: '.witness, #status, #toast { display: none !important; }' });   // overlays sit above the canvas
  await p.waitForTimeout(wait);
  const c = p.locator('canvas.art:visible').first();
  const box = await c.boundingBox();
  const type = /\.png$/i.test(out) ? 'png' : 'jpeg';
  await c.screenshot({ path: path.resolve(out), type, quality: type === 'jpeg' ? 88 : undefined });
  console.log('wrote', out, Math.round(box.width * 2) + 'x' + Math.round(box.height * 2));
  await b.close();
})();
