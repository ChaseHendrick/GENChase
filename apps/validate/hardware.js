'use strict';
const os = require('node:os'), cp = require('node:child_process');
const { redact } = require('./privacy');
function machineSlug(value = 'm1pro') {
  if (typeof value !== 'string' || value.length > 32 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) throw Error('Machine label must use lowercase letters, numbers and single hyphens, up to 32 characters.');
  return value;
}
function chipClass(model) {
  const value = String(model || '');
  const apple = value.match(/\bApple\s+(M\d+(?:\s+(?:Pro|Max|Ultra))?)\b/i);
  if (apple) return 'Apple ' + apple[1].replace(/^m/i, 'M').replace(/\b(pro|max|ultra)\b/gi, word => word[0].toUpperCase()+word.slice(1).toLowerCase());
  if (/\bIntel\b/i.test(value)) return 'Intel';
  if (/\bAMD\b/i.test(value)) return 'AMD';
  if (/\bARM\b|\baarch64\b/i.test(value)) return 'ARM';
  return 'Other';
}
function ramBucket(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return null;
  const gib = bytes / 1073741824;
  if (gib <= 8) return 'Up to 8 GiB';
  if (gib <= 16) return 'Over 8 to 16 GiB';
  if (gib <= 32) return 'Over 16 to 32 GiB';
  if (gib <= 64) return 'Over 32 to 64 GiB';
  if (gib <= 128) return 'Over 64 to 128 GiB';
  return 'Over 128 GiB';
}
function version(value) { return typeof value === 'string' && /^v?\d+(?:\.\d+){0,3}$/.test(value) ? value : null; }
function probe() {
  let model = os.cpus()[0]?.model || '', osRelease = os.release();
  if (process.platform === 'darwin') {
    const result = cp.spawnSync('/usr/bin/sw_vers', ['-productVersion'], { encoding:'utf8', timeout:3000 });
    osRelease = result.status === 0 ? result.stdout.trim() : '';
  }
  return { model, memoryBytes:os.totalmem(), platform:process.platform, arch:process.arch, osRelease, node:process.version };
}
function hardwareCard(input = {}, options = {}) {
  const p = (options.probe || probe)();
  const platform = {darwin:'macOS',linux:'Linux',win32:'Windows'}[p.platform] || 'Other';
  const majorMinor = String(p.osRelease || '').match(/^(\d+)\.(\d+)/);
  const browsers = {};
  for (const name of ['chromium','webkit','firefox','playwright']) {
    const v = version(input.browserVersions?.[name]); if (v) browsers[name] = v;
  }
  const label = machineSlug(input.machineSlug);
  return {
    machineSlug: label,
    chipClass: chipClass(p.model),
    arch: ['arm64','x64','ia32','arm'].includes(p.arch) ? p.arch : 'other',
    ramBucket: ramBucket(p.memoryBytes),
    osVersion: majorMinor ? platform + ' ' + majorMinor[1] + '.' + majorMinor[2] + (p.platform === 'linux' ? ' kernel' : '') : null,
    nodeVersion: version(p.node),
    browserVersions: browsers,
    webglRenderer: typeof input.webglRenderer === 'string' ? redact(input.webglRenderer, options).slice(0,200) : null,
    commit: typeof input.commit === 'string' && /^[0-9a-f]{7,64}$/i.test(input.commit) ? input.commit : null,
    command: typeof input.command === 'string' ? redact(input.command, options).slice(0,1000) : null,
    exitCode: Number.isInteger(input.exitCode) ? input.exitCode : null,
    elapsedSeconds: Number.isFinite(input.elapsedSeconds) && input.elapsedSeconds >= 0 ? Math.round(input.elapsedSeconds * 1000)/1000 : null,
  };
}
module.exports = { machineSlug, chipClass, ramBucket, hardwareCard, probe };
