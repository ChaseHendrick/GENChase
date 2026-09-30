// Skip browser work only for proven inert documentation/publication metadata in a PR merge.
'use strict';
const cp = require('node:child_process');
const path = require('node:path');
const { isDeepStrictEqual } = require('node:util');
const ROOT_DOCS = new Set([
  'AGENTS.md', 'BUILDING.md', 'CHANGELOG.md', 'COMPUTE.md', 'CONTRIBUTING.md',
  'DESIGN-PLAN.md', 'IDENTITIES.md', 'OUTPUT-RIGHTS.md', 'PROJECT-FLOW.md',
  'README.md', 'RESEARCH.md', 'SECURITY.md', 'TESTING.md', 'VALIDATION.md',
]);
const full = reason => ({ browserRequired: true, reason });
const REGISTRY = 'papers/papers.json';
const PUBLICATION_FIELDS = new Set(['note', 'codeDoi', 'archiveVersion']);
const PREPRINTS = new Set(['minimal-winding', 'collapse-without-rotation', 'stable-expansion', 'rank-window', 'hh-dynamics', 'double-pendulum', 'nf-pulse', 'hh-pulse']);
const own = (value, key) => Object.hasOwn(value, key);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const line = (value, max = 20000) => typeof value === 'string' && value.length > 0 && value.length <= max && value.trim() === value && !/[\x00-\x1f\x7f\ufffd]/.test(value);
const version = value => typeof value === 'string' && value.length <= 64 && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value);
const doi = value => typeof value === 'string' && /^10\.5281\/zenodo\.[1-9]\d{0,20}$/.test(value);
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const commit = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
function keys(value, required, optional = []) {
  return object(value) && required.every(key => own(value, key)) && Object.keys(value).every(key => required.includes(key) || optional.includes(key));
}
function date(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
}
function auditPath(file) {
  const match = /^docs\/paper-zenodo-release-audit-(\d{4}-\d{2}-\d{2})-(layout|figures)\.json$/.exec(file);
  return !!match && date(match[1]);
}
function strictJson(text) {
  const value = JSON.parse(text); // Validates the complete grammar, including all escapes.
  const tokens = text.match(/"(?:\\.|[^"\\])*"|[{}\[\]:,]|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null/g);
  let at = 0;
  function scan(depth = 0) {
    if (depth > 100) throw Error('JSON nesting limit');
    const token = tokens[at++];
    if (token === '{') {
      const seen = new Set();
      while (tokens[at] !== '}') {
        const key = JSON.parse(tokens[at++]);
        if (seen.has(key)) throw Error('Duplicate JSON key');
        seen.add(key); at++; scan(depth + 1);
        if (tokens[at] === ',') at++;
      }
      at++;
    } else if (token === '[') {
      while (tokens[at] !== ']') { scan(depth + 1); if (tokens[at] === ',') at++; }
      at++;
    } else if (/^-?\d/.test(token) && (!/^-?(?:0|[1-9]\d*)$/.test(token) || !Number.isSafeInteger(Number(token)))) {
      throw Error('Unsupported or imprecise JSON number'); // Prevent rounded nonmetadata values from comparing equal.
    }
  }
  scan();
  if (at !== tokens.length) throw Error('Inconsistent JSON tokens');
  return value;
}
function registryOnly(before, after) {
  const a = strictJson(before), b = strictJson(after);
  if (!object(a) || !object(b) || !Array.isArray(a.papers) || !Array.isArray(b.papers) || !a.papers.length || a.papers.length !== b.papers.length) return false;
  const omit = (value, fields) => Object.fromEntries(Object.entries(value).filter(([key]) => !fields.has(key)));
  if (!isDeepStrictEqual(omit(a, new Set(['papers'])), omit(b, new Set(['papers'])))) return false;
  const seen = new Set();
  return a.papers.every((paper, i) => {
    const next = b.papers[i];
    if (!object(paper) || !object(next) || typeof paper.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(paper.id) || paper.id !== next.id || seen.has(paper.id)) return false;
    seen.add(paper.id);
    if (!isDeepStrictEqual(omit(paper, PUBLICATION_FIELDS), omit(next, PUBLICATION_FIELDS))) return false;
    for (const field of PUBLICATION_FIELDS) {
      if (isDeepStrictEqual(paper[field], next[field]) && own(paper, field) === own(next, field)) continue;
      if (!PREPRINTS.has(paper.id) || paper.companion !== 'ChaseHendrick/' + paper.id || !own(next, field)) return false;
      if (field === 'note' && (!own(paper, field) || !line(paper[field]) || !line(next[field]))) return false;
      if (field === 'codeDoi' && (!own(paper, field) || !doi(paper[field]) || !doi(next[field]))) return false;
      if (field === 'archiveVersion' && (!version(next[field]) || (own(paper, field) && !version(paper[field])) || !doi(next.codeDoi))) return false;
    }
    return true;
  });
}
function archiveMetadata(meta) {
  const flags = ['titleMatches', 'preprint', 'licenseMatches', 'componentRightsDisclosed', 'creatorMatches'];
  const optional = ['version', 'expectedVersion', 'validExpectedVersion', 'versionMatches'];
  return keys(meta, ['title', ...flags, 'resourceType', 'license', 'expectedLicense'], optional) && line(meta.title, 500) &&
    flags.every(key => typeof meta[key] === 'boolean') && meta.license === 'other-closed' && meta.expectedLicense === 'other-closed' &&
    keys(meta.resourceType, ['type', 'subtype'], ['title']) && meta.resourceType.type === 'publication' && meta.resourceType.subtype === 'preprint' &&
    (!own(meta.resourceType, 'title') || meta.resourceType.title === 'Preprint') && optional.every(key => !own(meta, key) ||
      (key === 'version' || key === 'expectedVersion' ? version(meta[key]) : typeof meta[key] === 'boolean'));
}
function auditOnly(text) {
  const audit = strictJson(text);
  if (!keys(audit, ['checkedAt', 'publicationCommit', 'reviewedFigureCommit', 'allVerified', 'scope', 'papers']) ||
      typeof audit.checkedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|\+00:00)$/.test(audit.checkedAt) ||
      !date(audit.checkedAt.slice(0, 10)) || !Number.isFinite(Date.parse(audit.checkedAt)) ||
      !commit(audit.publicationCommit) || !commit(audit.reviewedFigureCommit) || typeof audit.allVerified !== 'boolean' || !line(audit.scope, 2000) ||
      !Array.isArray(audit.papers) || audit.papers.length !== PREPRINTS.size) return false;
  const seen = new Set();
  return audit.papers.every(p => {
    if (!keys(p, ['paper', 'version', 'doi', 'record', 'release', 'releaseTagCommit', 'reviewedPdfSha256', 'githubZipSha256', 'zenodoArchives', 'recordMetadata', 'ok']) ||
        !PREPRINTS.has(p.paper) || seen.has(p.paper) || !version(p.version) || !doi(p.doi) || !commit(p.releaseTagCommit) ||
        !hash(p.reviewedPdfSha256) || !hash(p.githubZipSha256) || typeof p.ok !== 'boolean' || !archiveMetadata(p.recordMetadata)) return false;
    seen.add(p.paper);
    const record = p.doi.split('.').pop(), file = 'ChaseHendrick/' + p.paper + '-' + p.version + '.zip';
    if (p.record !== 'https://zenodo.org/records/' + record || p.release !== 'https://github.com/ChaseHendrick/' + p.paper + '/releases/tag/' + p.version ||
        !Array.isArray(p.zenodoArchives) || p.zenodoArchives.length !== 1) return false;
    const z = p.zenodoArchives[0], pdf = p.paper === 'rank-window' ? 'note' : p.paper;
    return keys(z, ['file', 'url', 'zipSha256', 'manuscript', 'manuscriptSha256', 'reviewedPdfSha256', 'matchesReviewedPdf', 'archiveMetadata', 'ok']) &&
      z.file === file && z.url === 'https://zenodo.org/api/records/' + record + '/files/' + file + '/content' &&
      z.manuscript === 'ChaseHendrick-' + p.paper + '-' + p.releaseTagCommit.slice(0, 7) + '/paper/' + pdf + '.pdf' &&
      hash(z.zipSha256) && hash(z.manuscriptSha256) && hash(z.reviewedPdfSha256) && typeof z.matchesReviewedPdf === 'boolean' &&
      typeof z.ok === 'boolean' && archiveMetadata(z.archiveMetadata);
  });
}
function documentation(file) {
  if (!file || /[\\\x00-\x1f\x7f\ufffd]/.test(file) || file.split('/').some(p => !p || p === '.' || p === '..')) return false;
  return ROOT_DOCS.has(file) || /^(docs|papers|research|experiments|identities)\/.+\.md$/.test(file);
}
function classifyRaw(raw, readBlob) {
  if (typeof raw !== 'string' || !raw || !raw.endsWith('\0')) return full('Missing or malformed changed-file data');
  const fields = raw.slice(0, -1).split('\0');
  if (fields.length % 2) return full('Malformed changed-file records');
  const seen = new Set();
  let publication = false;
  for (let i = 0; i < fields.length; i += 2) {
    const entry = /^:(\d{6}) (\d{6}) ([a-f0-9]{40}|[a-f0-9]{64}) ([a-f0-9]{40}|[a-f0-9]{64}) ([AMD])$/.exec(fields[i]);
    if (!entry) return full('Unrecognized changed-file record');
    const [, before, after, oldObject, newObject, status] = entry;
    const modes = { A: ['000000', '100644'], D: ['100644', '000000'], M: ['100644', '100644'] };
    if (before !== modes[status][0] || after !== modes[status][1] || oldObject.length !== newObject.length) return full('Nonregular or inconsistent changed-file record');
    if (/^0+$/.test(oldObject) !== (before === '000000') || /^0+$/.test(newObject) !== (after === '000000') || seen.has(fields[i + 1])) return full('Inconsistent or duplicate changed-file record');
    seen.add(fields[i + 1]);
    const file = fields[i + 1];
    if (documentation(file)) continue;
    if (!readBlob || (file !== REGISTRY && !auditPath(file))) return full('Change reaches source, generated files, or an unknown path');
    try {
      if (file === REGISTRY) {
        if (status !== 'M' || !registryOnly(readBlob(oldObject), readBlob(newObject))) return full('Paper registry change is not proven publication metadata only');
      } else if (status === 'D' || !auditOnly(readBlob(newObject)) || (status === 'M' && !auditOnly(readBlob(oldObject)))) {
        return full('Publication audit change has an unknown or malformed schema');
      }
    } catch { return full('Publication metadata could not be parsed strictly'); }
    publication = true;
  }
  return { browserRequired: false, reason: publication ? 'Only allowlisted documentation and strictly parsed inert publication metadata changed' : 'Only allowlisted regular Markdown documentation changed' };
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
    const result = classifyRaw(raw, object => git(['cat-file', 'blob', object]));
    if (result.browserRequired) return result;
    const numstat = git(['diff', '--numstat', '-z', '--no-renames', '--no-ext-diff', '--no-textconv', 'HEAD^1', 'HEAD', '--']);
    return textOnly(raw, numstat) ? result : full('Binary documentation or inconsistent text-change data');
  } catch { return full('Changed-file inspection unavailable; running full checks'); }
}
if (require.main === module) process.stdout.write(JSON.stringify(classify()) + '\n');
module.exports = { classify, classifyRaw, documentation, textOnly, strictJson, registryOnly, auditOnly, auditPath };
