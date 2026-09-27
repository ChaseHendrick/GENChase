// Skip browser work only for known documentation in a verified pull-request merge.
'use strict';
const cp = require('node:child_process');
const path = require('node:path');
const ROOT_DOCS = new Set([
  'AGENTS.md', 'BUILDING.md', 'CHANGELOG.md', 'COMPUTE.md', 'CONTRIBUTING.md',
  'DESIGN-PLAN.md', 'IDENTITIES.md', 'OUTPUT-RIGHTS.md', 'PROJECT-FLOW.md',
  'README.md', 'RESEARCH.md', 'SECURITY.md', 'TESTING.md', 'VALIDATION.md',
]);
const full = reason => ({ browserRequired: true, reason });
function documentation(file) {
  if (!file || /[\\\x00-\x1f\x7f\ufffd]/.test(file) || file.split('/').some(p => !p || p === '.' || p === '..')) return false;
  return ROOT_DOCS.has(file) || /^(docs|papers|research|experiments|identities)\/.+\.md$/.test(file);
}
function classifyRaw(raw) {
  if (typeof raw !== 'string' || !raw || !raw.endsWith('\0')) return full('Missing or malformed changed-file data');
  const fields = raw.slice(0, -1).split('\0');
  if (fields.length % 2) return full('Malformed changed-file records');
  const seen = new Set();
  for (let i = 0; i < fields.length; i += 2) {
    const entry = /^:(\d{6}) (\d{6}) ([a-f0-9]{40}|[a-f0-9]{64}) ([a-f0-9]{40}|[a-f0-9]{64}) ([AMD])$/.exec(fields[i]);
    if (!entry) return full('Unrecognized changed-file record');
    const [, before, after, oldObject, newObject, status] = entry;
    const modes = { A: ['000000', '100644'], D: ['100644', '000000'], M: ['100644', '100644'] };
    if (before !== modes[status][0] || after !== modes[status][1] || oldObject.length !== newObject.length) return full('Nonregular or inconsistent changed-file record');
    if (/^0+$/.test(oldObject) !== (before === '000000') || /^0+$/.test(newObject) !== (after === '000000') || seen.has(fields[i + 1])) return full('Inconsistent or duplicate changed-file record');
    seen.add(fields[i + 1]);
    if (!documentation(fields[i + 1])) return full('Change reaches source, generated files, or an unknown path');
  }
  return { browserRequired: false, reason: 'Only allowlisted regular Markdown documentation changed' };
}
function textOnly(raw, numstat) {
  if (typeof numstat !== 'string' || !numstat || !numstat.endsWith('\0')) return false;
  const paths = new Set(raw.slice(0, -1).split('\0').filter((_, i) => i % 2));
  for (const record of numstat.slice(0, -1).split('\0')) {
    const entry = /^\d+\t\d+\t([^\t\n]+)$/.exec(record);
    if (!entry || !paths.delete(entry[1])) return false;
  }
  return paths.size === 0;
}
function classify({ eventName = process.env.CI_EVENT_NAME, cwd = path.resolve(__dirname, '..'), git = args => cp.execFileSync('git', args, {
  cwd, encoding: 'utf8', timeout: 10000, maxBuffer: 8 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
}) } = {}) {
  if (eventName !== 'pull_request') return full('Full checks for non-pull-request events');
  try {
    const parents = git(['rev-list', '--parents', '-n', '1', 'HEAD']).trim().split(/\s+/);
    if (parents.length !== 3 || !parents.every(p => /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(p))) return full('Checkout is not a verified two-parent pull-request merge');
    const raw = git(['diff', '--raw', '--no-abbrev', '-z', '--no-renames', '--no-ext-diff', '--no-textconv', 'HEAD^1', 'HEAD', '--']);
    const result = classifyRaw(raw);
    if (result.browserRequired) return result;
    const numstat = git(['diff', '--numstat', '-z', '--no-renames', '--no-ext-diff', '--no-textconv', 'HEAD^1', 'HEAD', '--']);
    return textOnly(raw, numstat) ? result : full('Binary documentation or inconsistent text-change data');
  } catch { return full('Changed-file inspection unavailable; running full checks'); }
}
if (require.main === module) process.stdout.write(JSON.stringify(classify()) + '\n');
module.exports = { classify, classifyRaw, documentation, textOnly };
