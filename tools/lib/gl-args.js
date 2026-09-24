'use strict';
// One switch for the WebGL renderer every browser tool launches.
//
//   default              SwiftShader, Chromium's CPU implementation of Vulkan under ANGLE. Deterministic on
//                        any machine, which is why the recorded evidence uses it.
//   GENCHASE_GL=hardware the machine's own GPU: the full Chromium build in new headless mode (the headless
//                        shell Playwright uses by default is the old headless implementation), with the ANGLE
//                        backend the platform's GPU driver speaks.
//
// Tools call glArgs() where they used to spell out the SwiftShader list. In hardware mode, requiring this
// file also wraps Playwright's chromium.launch, for launches that pass glArgs() only: the wrapper selects
// the Chromium channel, then opens a blank page, reads the WebGL renderer string and refuses the browser
// when that string names a software renderer. A tool therefore cannot run on SwiftShader, llvmpipe or
// WARP while the run is called hardware. When GENCHASE_GL_LOG names a file, every such launch, in either
// mode, appends its probe there as one JSON line, which is how tools/gpu-science.js knows what each tool
// ran on. Without GENCHASE_GL_LOG the default mode installs nothing and launches exactly as before.
//
// Overrides, for a machine where the defaults do not reach the GPU (docs/HARDWARE-GPU.md):
//   GENCHASE_ANGLE       ANGLE backend: metal, d3d11, vulkan, gl, gl-egl, ... (default per platform below)
//   GENCHASE_GL_CHANNEL  chromium (default), chrome or msedge for an installed browser, or shell for
//                        Playwright's headless shell
// Flags verified here: none on real hardware (the container that wrote this has no GPU; every
// configuration fell back to SwiftShader, and the wrapper refused it). See docs/HARDWARE-GPU.md.
const fs = require('node:fs');

const SWIFTSHADER = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const BACKEND = { darwin: 'metal', win32: 'd3d11', linux: 'vulkan' };
const SOFTWARE = /swiftshader|llvmpipe|lavapipe|softpipe|software (?:renderer|rasterizer)|basic render driver|\bwarp\b/i;

function glMode(env = process.env) {
  const value = String(env.GENCHASE_GL || '').trim().toLowerCase();
  if (!value || value === 'swiftshader' || value === 'software') return 'swiftshader';
  if (value === 'hardware') return 'hardware';
  throw Error('GENCHASE_GL must be unset, swiftshader or hardware, not ' + JSON.stringify(env.GENCHASE_GL));
}
function swiftshaderArgs() { return SWIFTSHADER.slice(); }
function hardwareBackend(env = process.env, platform = process.platform) {
  const backend = String(env.GENCHASE_ANGLE || BACKEND[platform] || 'default').trim();
  if (!/^[a-z0-9-]+$/.test(backend)) throw Error('GENCHASE_ANGLE must name an ANGLE backend, not ' + JSON.stringify(backend));
  if (backend === 'swiftshader') throw Error('GENCHASE_ANGLE=swiftshader is the software renderer; unset GENCHASE_GL instead');
  return backend;
}
function hardwareArgs(env = process.env, platform = process.platform) {
  const backend = hardwareBackend(env, platform);
  const args = ['--ignore-gpu-blocklist', '--enable-gpu', '--use-gl=angle', '--use-angle=' + backend];
  // Headless Linux reaches a Vulkan driver without a window surface. The last --enable-features wins in
  // Chromium, so Playwright's own feature is repeated here rather than silently dropped.
  if (backend === 'vulkan' && platform === 'linux') args.push('--enable-features=Vulkan,CDPScreenshotNewSurface', '--disable-vulkan-surface');
  return args;
}
function glArgs(env = process.env, platform = process.platform) {
  return glMode(env) === 'hardware' ? hardwareArgs(env, platform) : swiftshaderArgs();
}
function hardwareChannel(env = process.env) {
  const channel = String(env.GENCHASE_GL_CHANNEL || 'chromium').trim();
  if (channel === 'shell') return null;
  if (!['chromium', 'chrome', 'chrome-beta', 'chrome-dev', 'chrome-canary', 'msedge', 'msedge-beta', 'msedge-dev'].includes(channel)) throw Error('GENCHASE_GL_CHANNEL must be chromium, chrome, msedge or shell, not ' + JSON.stringify(channel));
  return channel;
}
function isSoftwareRenderer(renderer) { return !renderer || SOFTWARE.test(String(renderer)); }

// Runs in a blank page. The same fields the volunteer runner's probe reads, plus the vendor and version.
function readGraphics() {
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return { webgl2: false, float32: false, renderer: null, vendor: null, version: null };
  const debug = gl.getExtension('WEBGL_debug_renderer_info');
  const result = { webgl2: true, float32: !!gl.getExtension('EXT_color_buffer_float'),
    renderer: String(gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER)),
    vendor: String(gl.getParameter(debug ? debug.UNMASKED_VENDOR_WEBGL : gl.VENDOR)), version: String(gl.getParameter(gl.VERSION)) };
  const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
  return result;
}
async function probeGraphics(browser) {
  const page = await browser.newPage();
  try { return await page.evaluate(readGraphics); } finally { await page.close(); }
}

// Wrap chromium.launch for the launches that pass glArgs(): in hardware mode always, in the default mode
// only when GENCHASE_GL_LOG asks for a record (tools/gpu-science.js --software-control). Launches with
// other arguments, or none, pass through untouched. The unwrapped launch stays reachable for a caller
// that must see a software renderer rather than be refused by it.
function installLaunchWrapper(chromium, env = process.env, platform = process.platform) {
  if (!chromium || chromium.__genchaseLaunch) return;
  const mode = glMode(env), hardware = mode === 'hardware';
  const marker = hardware ? '--use-angle=' + hardwareBackend(env, platform) : '--use-angle=swiftshader';
  const channel = hardware ? hardwareChannel(env) : null, launch = chromium.launch;
  Object.defineProperty(chromium, '__genchaseLaunch', { value: launch });
  chromium.launch = async function (options = {}) {
    if (!(options.args || []).includes(marker)) return launch.call(this, options);
    const opts = { ...options };
    if (channel && !opts.channel && !opts.executablePath) opts.channel = channel;
    const browser = await launch.call(this, opts);
    let graphics;
    try { graphics = await probeGraphics(browser); } catch (error) { graphics = { webgl2: false, renderer: null, error: error.message }; }
    const record = { mode, channel: opts.channel || 'headless-shell', browser: browser.version(), args: opts.args, ...graphics, software: isSoftwareRenderer(graphics.renderer) };
    if (env.GENCHASE_GL_LOG) fs.appendFileSync(env.GENCHASE_GL_LOG, JSON.stringify(record) + '\n');
    if (hardware && (!graphics.webgl2 || record.software)) {
      await browser.close();
      throw Error('GENCHASE_GL=hardware, but the browser ' + (graphics.webgl2 ? 'renders WebGL2 with the software renderer "' + graphics.renderer + '"' : 'has no WebGL2') +
        '. Refusing to run on it as hardware. See docs/HARDWARE-GPU.md for GENCHASE_ANGLE and GENCHASE_GL_CHANNEL.');
    }
    return browser;
  };
}
// The unwrapped launch, for a probe that has to report a software renderer instead of throwing on it.
function rawLaunch(chromium) { return chromium.__genchaseLaunch || chromium.launch; }
if (glMode() === 'hardware' || process.env.GENCHASE_GL_LOG) {
  let playwright = null;
  try { playwright = require('playwright'); } catch { /* the tool reports the missing dependency itself */ }
  if (playwright) installLaunchWrapper(playwright.chromium);
}

module.exports = { glArgs, glMode, swiftshaderArgs, hardwareArgs, hardwareBackend, hardwareChannel, isSoftwareRenderer, readGraphics, probeGraphics, installLaunchWrapper, rawLaunch, SOFTWARE };
