// Probe the actual headless renderer before collecting scientific observations.
'use strict';
async function probe(browser) {
  const page = await browser.newPage();
  try {
    return await page.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return { webgl2: false, float32: false, renderer: null };
      const debug = gl.getExtension('WEBGL_debug_renderer_info');
      const result = { webgl2: true, float32: !!gl.getExtension('EXT_color_buffer_float'),
        renderer: gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER) };
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return result;
    });
  } finally { await page.close(); }
}
async function launchGraphicsBrowser(chromium, { platform = process.platform } = {}) {
  const nativeArgs = platform === 'darwin' ? ['--use-gl=angle', '--use-angle=metal'] : [];
  let browser, graphics, fallbackReason;
  try {
    browser = await chromium.launch({ headless: true, args: nativeArgs });
    graphics = await probe(browser);
    if (graphics.webgl2 && graphics.float32) return { browser, graphics: { ...graphics, launchArgs: nativeArgs, fallback: false } };
    fallbackReason = 'Native headless browser lacks WebGL2 or float32 color buffers.';
  } catch (error) { fallbackReason = 'Native headless graphics setup failed: ' + error.message; }
  if (browser) await browser.close();
  // Only local repository pages are opened by harvest, with HTTP(S) requests blocked.
  const args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
  browser = await chromium.launch({ headless: true, args });
  try {
    graphics = await probe(browser);
    return { browser, graphics: { ...graphics, launchArgs: args, fallback: true, fallbackReason } };
  } catch (error) { await browser.close(); throw error; }
}
module.exports = { launchGraphicsBrowser };
