'use strict';
const os = require('node:os'), net = require('node:net');
function escaped(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function redact(text, options = {}) {
  let out = String(text ?? '');
  const root = options.root || process.cwd(), home = options.home || os.homedir();
  let username = options.username;
  if (username === undefined) { try { username = os.userInfo().username; } catch { username = ''; } }
  const hostname = options.hostname === undefined ? os.hostname() : options.hostname;
  // Replace the repository prefix first so useful relative reproduction paths survive.
  for (const base of [root, root && root.replace(/\\/g, '/')].filter(Boolean).sort((a,b) => b.length-a.length)) {
    out = out.replace(new RegExp(escaped(base.replace(/[\\/]+$/, '')) + '(?=[\\/\\s"\'`):,]|$)', 'g'), '~/GENChase');
  }
  if (home) out = out.replace(new RegExp(escaped(home) + '(?=[\\/\\s"\'`):,]|$)', 'g'), '~');
  for (const value of [...(options.emails || []), hostname, username].filter(Boolean)) {
    // Match complete account/host tokens rather than substrings inside ordinary words.
    out = out.replace(new RegExp('(?<![A-Za-z0-9_-])' + escaped(value) + '(?![A-Za-z0-9_-])', 'gi'), '[private]');
  }
  out = out.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email]');
  out = out.replace(/\b(?:[0-9a-f]{2}[:-]){5}[0-9a-f]{2}\b/gi, '[hardware address]');
  out = out.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, candidate => net.isIP(candidate) === 4 ? '[IP]' : candidate);
  out = out.replace(/(?<![0-9a-f:])(?:[0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}(?![0-9a-f:])/gi, candidate => net.isIP(candidate) === 6 ? '[IP]' : candidate);
  out = out.replace(/(?<![\w:/~])(?:[A-Za-z]:[\\/]|\/)(?:[^\s"'`<>|,;()\[\]]+)/g, '[local path]');
  // A home-relative path outside the checkout can still contain account/workspace names.
  out = out.replace(/~\/(?!GENChase(?:\/|\b))[^\s"'`<>|,;()\[\]]+/g, '[local path]');
  out = out.replace(/\b(?:hostname|user(?:name)?|serial(?:\s+number)?|machine\s*id|git\s+(?:author|committer)|author|committer)\s*[:=]\s*[^\r\n]+/gi, '[private metadata]');
  return out;
}
function sanitize(value, options, key = '') {
  if (key === 'browserVersions' && value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.fromEntries(Object.entries(value).filter(([name, version]) => ['chromium','webkit','firefox','playwright'].includes(name) && typeof version === 'string' && /^v?\d+(?:\.\d+){0,3}$/.test(version)));
  }
  if (typeof value === 'string') return redact(value, options);
  if (Array.isArray(value)) return value.map(item => sanitize(item, options));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key,item]) => [key, sanitize(item, options, key)]));
  return value;
}
module.exports = { redact, sanitize, redactObject: sanitize };
