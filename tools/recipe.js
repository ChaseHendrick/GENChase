// node tools/recipe.js [settleMs=2600]
// Proves that raising a default did not break an older recipe.
//
// A hash carries only what differs from the defaults, so the day a default moves, every recipe that
// never named that key would silently reprint at the new value. Reprinting a seed years later is the
// product, so modules that changed a default declare the old one as `legacy: { <v>: { key: old } }`
// and the shell's legacyFill hands it back to any recipe written before version <v>.
//
// The cases are derived from studio.html itself rather than listed here, so this cannot drift from
// the file it checks: every legacy declaration in the source becomes four assertions.
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');

function cases(src) {
  const out = [];
  const regs = [...src.matchAll(/Studio\.register\(\{\s*\n?\s*id:\s*'([^']+)'/g)];
  const cur = new Map();
  // current default for a key, read from the first object literal of the module's `defaults`
  for (let i = 0; i < regs.length; i++) {
    const a = regs[i].index, b = i + 1 < regs.length ? regs[i + 1].index : src.length;
    const own = src.slice(a, b);
    const leg = own.match(/legacy:\s*\{([^}]*\{[^}]*\}[^}]*)\}/);
    if (!leg) continue;
    const id = regs[i][1];
    // the module's present-day value for each legacy key
    const dm = own.match(/\n\s*defaults:\s*(?:Object\.assign\(\s*)?\{/);
    let body = '';
    if (dm) {
      let j = a + dm.index + dm[0].length - 1, depth = 0, k = j;
      for (; k < b; k++) { if (src[k] === '{') depth++; else if (src[k] === '}') { depth--; if (!depth) break; } }
      body = src.slice(j, k + 1);
    } else {
      // defaults comes from a shared DEFAULTS object in the same script block
      const blk = src.lastIndexOf('const DEFAULTS = {', a);
      if (blk >= 0) body = src.slice(blk, src.indexOf('};', blk) + 2);
    }
    for (const m of leg[1].matchAll(/(\d+):\s*\{([^}]*)\}/g)) {
      const ver = +m[1];
      for (const kv of m[2].matchAll(/(\w+):\s*([^,\s}]+)/g)) {
        const key = kv[1], old = kv[2].replace(/'/g, '');
        const nowM = body.match(new RegExp('\\b' + key + ':\\s*([^,\\s}]+)'));
        if (!nowM) { console.error('  ! no current default for', id, key); continue; }
        const now = nowM[1].replace(/'/g, '');
        if (now === old) { console.error('  ! legacy equals current for', id, key); continue; }
        out.push({ id, key, old, now, ver });
        cur.set(id + '.' + key, now);
      }
    }
  }
  return out;
}

(async () => {
  const settle = +(process.argv[2] || 2600);
  const studio = process.env.STUDIO ? path.resolve(process.env.STUDIO) : path.resolve(__dirname, '..', 'studio.html');
  const src = fs.readFileSync(studio, 'utf8');
  const cs = cases(src);
  if (!cs.length) { console.log('no legacy declarations to check'); return; }
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  p.on('console', () => {});
  let fail = 0, n = 0;

  // Read the control back off the sidebar: a seg shows which option is pressed, a range its number.
  const read = (label) => p.evaluate(l => {
    const seg = [...document.querySelectorAll('.seg[aria-label="' + l + '"]')].pop();
    if (seg) {
      const on = [...seg.querySelectorAll('button')].find(x => x.getAttribute('aria-pressed') === 'true');
      return on ? on.textContent.trim() : 'NONE';
    }
    return 'NO CONTROL';
  }, label);

  const LABEL = { grid: 'Grid' };
  for (const c of cs) {
    const label = LABEL[c.key] || c.key;
    const trials = [
      ['#' + c.id + '/recipe-check', c.now, 'bare hash uses today\'s default'],
      ['#' + c.id + '/recipe-check/' + b64({ v: c.ver - 1 }), c.old, 'v' + (c.ver - 1) + ' recipe gets the old default back'],
      ['#' + c.id + '/recipe-check/' + b64({ v: c.ver, [c.key]: c.old }), c.old, 'a current recipe that names the key keeps its own value'],
      ['#' + c.id + '/recipe-check/' + b64({ v: c.ver }), c.now, 'v' + c.ver + ' recipe uses today\'s default'],
    ];
    for (const [hash, want, why] of trials) {
      await p.goto('file://' + studio + hash, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await p.waitForTimeout(settle);
      const got = await read(label);
      const ok = String(got) === String(want);
      n++; if (!ok) fail++;
      console.log((ok ? '  ok   ' : '  FAIL ') + (c.id + '.' + c.key + '            ').slice(0, 20) +
        'want ' + String(want).padStart(5) + '  got ' + String(got).padStart(5) + '   ' + why);
    }
  }
  await b.close();
  console.log(fail ? 'RECIPE COMPATIBILITY FAILED: ' + fail + ' of ' + n : 'RECIPE COMPATIBILITY OK: ' + n + ' assertions');
  process.exit(fail ? 1 : 0);
})();
