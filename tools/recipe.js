// node tools/recipe.js [extraSettleMs=0] [workers=2]
// Proves that raising a default did not break an older recipe.
//
// A hash carries only what differs from the defaults, so the day a default moves, every recipe that
// never named that key would silently reprint at the new value. Reprinting a seed years later is the
// product, so modules that changed a default declare the old one as `legacy: { <v>: { key: old } }`
// and the shell's legacyFill hands it back to any recipe written before version <v>.
//
// The cases are derived from studio.html itself rather than listed here, so this cannot drift from
// the file it checks: every legacy declaration in the source becomes five assertions.
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
  const settle = Number(process.argv[2] || 0);
  const workers = Number(process.argv[3] || 2);
  if (!Number.isFinite(settle) || settle < 0 || !Number.isInteger(workers) || workers < 1 || workers > 4) {
    throw new Error('Usage: node tools/recipe.js [extraSettleMs >= 0] [workers: 1..4]');
  }
  const started = Date.now();
  const studio = process.env.STUDIO ? path.resolve(process.env.STUDIO) : path.resolve(__dirname, '..', 'studio.html');
  const src = fs.readFileSync(studio, 'utf8');
  const cs = cases(src);
  if (!cs.length) { console.log('no legacy declarations to check'); return; }
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const jobs = [];
  const LABEL = { grid: 'Grid' };
  for (const c of cs) {
    const label = LABEL[c.key] || c.key;
    // The values were parsed out of the source as text, so they have to go back into a recipe as the
    // type the schema actually uses. A seg validates its options by strict equality, so a grid written
    // as the string "192" is not the option 192, and the first version of this test shipped that bug:
    // it built a recipe naming a string, the shell correctly rejected it, and the test blamed the
    // shell. Hence both a typed case and an explicit string case below.
    const typed = /^-?\d+(\.\d+)?$/.test(c.old) ? Number(c.old) : c.old;
    const trials = [
      ['#' + c.id + '/recipe-check', c.now, 'bare hash uses today\'s default'],
      ['#' + c.id + '/recipe-check/' + b64({ v: c.ver - 1 }), c.old, 'v' + (c.ver - 1) + ' recipe gets the old default back'],
      ['#' + c.id + '/recipe-check/' + b64({ v: c.ver, [c.key]: typed }), c.old, 'a current recipe that names the key keeps its own value'],
      ['#' + c.id + '/recipe-check/' + b64({ v: c.ver, [c.key]: String(c.old) }), c.old, 'a hand-edited recipe storing it as a string still works'],
      ['#' + c.id + '/recipe-check/' + b64({ v: c.ver }), c.now, 'v' + c.ver + ' recipe uses today\'s default'],
    ];
    for (const [hash, want, why] of trials) jobs.push({ ...c, label, hash, want, why });
  }
  const results = new Array(jobs.length);
  let next = 0;
  async function worker() {
    while (next < jobs.length) {
      const i = next++, c = jobs[i];
      // browser.newPage creates an isolated context. Closing it after each trial releases its
      // GPU resources and storage, so no recipe can inherit another trial's state.
      const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
      const errors = [];
      p.on('pageerror', e => errors.push(e.message));
      try {
        await p.goto('file://' + studio + c.hash, { waitUntil: 'domcontentloaded', timeout: 90000 });
        // Wait for the requested recipe's sidebar, never for the expected value: a wrong value
        // must fail immediately rather than turning into a misleading readiness timeout.
        await p.waitForFunction(({ id, label }) => {
          const tab = document.querySelector('.tab[aria-selected="true"]');
          const seed = document.querySelector('#seed');
          const seg = [...document.querySelectorAll('.seg')].filter(x => x.getAttribute('aria-label') === label).pop();
          return tab && tab.dataset.id === id && seed && seed.value === 'recipe-check' &&
            seg && seg.querySelector('button[aria-pressed="true"]');
        }, { id: c.id, label: c.label }, { timeout: 90000 });
        if (settle) await p.waitForTimeout(settle);
        const got = await p.evaluate(label => {
          const seg = [...document.querySelectorAll('.seg')].filter(x => x.getAttribute('aria-label') === label).pop();
          return seg.querySelector('button[aria-pressed="true"]').textContent.trim();
        }, c.label);
        results[i] = { ...c, got, ok: String(got) === String(c.want) && !errors.length, errors };
      } catch (error) {
        results[i] = { ...c, got: 'ERROR', ok: false, errors: [...errors, error.message] };
      } finally {
        await p.close();
      }
    }
  }
  try {
    await Promise.all(Array.from({ length: Math.min(workers, jobs.length) }, worker));
  } finally {
    await b.close();
  }
  let fail = 0;
  for (const r of results) {
    if (!r.ok) fail++;
    console.log((r.ok ? '  ok   ' : '  FAIL ') + (r.id + '.' + r.key + '            ').slice(0, 20) +
      'want ' + String(r.want).padStart(5) + '  got ' + String(r.got).padStart(5) + '   ' + r.why +
      (r.errors.length ? '   ' + r.errors.join('; ') : ''));
  }
  console.log(fail ? 'RECIPE COMPATIBILITY FAILED: ' + fail + ' of ' + results.length :
    'RECIPE COMPATIBILITY OK: ' + results.length + ' assertions');
  console.log('Elapsed: ' + ((Date.now() - started) / 1000).toFixed(1) + 's; workers: ' + workers);
  process.exitCode = fail ? 1 : 0;
})().catch(error => { console.error(error); process.exitCode = 1; });
