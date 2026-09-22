'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { launchGraphicsBrowser } = require('./browser');
function mock(results) {
  const calls = [], closed = [], pagesClosed = [];
  return { calls, closed, pagesClosed, chromium: { async launch(options) {
    const i = calls.push(options) - 1;
    if (results[i] instanceof Error) throw results[i];
    return { close: async () => closed.push(i), newPage: async () => ({
      evaluate: async () => results[i], close: async () => pagesClosed.push(i)
    }) };
  } } };
}
test('macOS prefers Metal and records the actual renderer without fallback', async () => {
  const info = { webgl2: true, float32: true, renderer: 'ANGLE Metal Renderer: Apple M1 Pro' }, m = mock([info]);
  const result = await launchGraphicsBrowser(m.chromium, { platform: 'darwin' });
  assert.deepEqual(m.calls[0].args, ['--use-gl=angle', '--use-angle=metal']);
  assert.equal(result.graphics.renderer, info.renderer); assert.equal(result.graphics.fallback, false);
  assert.deepEqual(m.pagesClosed, [0]); assert.deepEqual(m.closed, []); await result.browser.close();
});
test('missing WebGL2 or float buffers triggers an explicit software fallback', async () => {
  for (const first of [{ webgl2: false, float32: false, renderer: null }, { webgl2: true, float32: false, renderer: 'native' }]) {
    const m = mock([first, { webgl2: true, float32: true, renderer: 'SwiftShader' }]);
    const result = await launchGraphicsBrowser(m.chromium, { platform: 'linux' });
    assert.deepEqual(m.calls[0].args, []); assert(m.calls[1].args.includes('--enable-unsafe-swiftshader'));
    assert.equal(result.graphics.fallback, true); assert.match(result.graphics.fallbackReason, /lacks WebGL2 or float32/);
    assert.equal(result.graphics.renderer, 'SwiftShader'); assert.deepEqual(m.closed, [0]); assert.deepEqual(m.pagesClosed, [0, 1]);
    await result.browser.close();
  }
});
test('native startup failure falls back, and unavailable software graphics stays unavailable', async () => {
  const m = mock([new Error('driver unavailable'), { webgl2: false, float32: false, renderer: null }]);
  const result = await launchGraphicsBrowser(m.chromium, { platform: 'darwin' });
  assert.equal(result.graphics.webgl2, false); assert.equal(result.graphics.fallback, true);
  assert.match(result.graphics.fallbackReason, /driver unavailable/); await result.browser.close();
});
