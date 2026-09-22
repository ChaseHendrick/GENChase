'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { hardwareCard, machineSlug, chipClass, ramBucket } = require('./hardware');
const { redact, redactObject } = require('./privacy');
const privateContext = { root:'/Users/alex/Projects/GENChase', home:'/Users/alex', username:'alex', hostname:'alex-personal-mac', emails:['alex@example.org'] };
test('hardware card exposes an explicit pseudonymous allowlist, with no raw probe data', () => {
  const probe = () => ({model:'Apple M1 Pro serial SECRET',memoryBytes:17179869184,platform:'darwin',arch:'arm64',osRelease:'27.0.1',node:'v24.21.0',hostname:'PRIVATE-HOST',serial:'SECRET',username:'alex'});
  const card = hardwareCard({machineSlug:'m1pro',commit:'abcdef123456',command:'node /Users/alex/Projects/GENChase/tools/verify.js --all',exitCode:2,elapsedSeconds:12.34567,browserVersions:{chromium:'140.0.7339.0',webkit:'26.0',hostname:'PRIVATE-HOST'},webglRenderer:null,username:'alex'}, {...privateContext,probe});
  assert.deepEqual(Object.keys(card), ['machineSlug','chipClass','arch','ramBucket','osVersion','nodeVersion','browserVersions','webglRenderer','commit','command','exitCode','elapsedSeconds']);
  assert.equal(card.chipClass,'Apple M1 Pro'); assert.equal(card.ramBucket,'Over 8 to 16 GiB'); assert.equal(card.osVersion,'macOS 27.0');
  assert.deepEqual(card.browserVersions,{chromium:'140.0.7339.0',webkit:'26.0'}); assert.equal(card.webglRenderer,null); assert.equal(card.elapsedSeconds,12.346);
  assert.equal(card.command,'node ~/GENChase/tools/verify.js --all');
  assert(!/alex|SECRET|PRIVATE-HOST|Users/.test(JSON.stringify(card)));
});
test('unknown hardware fields remain unknown rather than becoming inferred measurements', () => {
  const card = hardwareCard({}, {probe:()=>({model:'PRIVATE MACHINE MODEL',platform:'unexpected',arch:'serial123',memoryBytes:NaN,osRelease:'secret',node:'secret'})});
  assert.equal(card.machineSlug,'m1pro'); assert.equal(card.chipClass,'Other'); assert.equal(card.arch,'other'); assert.equal(card.ramBucket,null);
  assert.equal(card.osVersion,null); assert.equal(card.nodeVersion,null); assert.deepEqual(card.browserVersions,{}); assert.equal(card.webglRenderer,null); assert.equal(card.elapsedSeconds,null);
  assert.equal(chipClass('Intel(R) Core(TM) i7 CPU @ 2.30GHz'),'Intel'); assert.equal(chipClass('AMD Ryzen 9'),'AMD');
  assert.equal(ramBucket(8*1073741824),'Up to 8 GiB'); assert.equal(ramBucket(8*1073741824+1),'Over 8 to 16 GiB');
  assert.equal(ramBucket(256*1073741824),'Over 128 GiB');
});
test('machine labels accept only short explicit pseudonyms', () => {
  assert.equal(machineSlug(),'m1pro'); assert.equal(machineSlug('lab-mac-2'),'lab-mac-2');
  for(const value of ['', 'a'.repeat(33), 'Alex Mac', '../secret','alex@example.org','/tmp/mac','a--b',null]) assert.throws(()=>machineSlug(value));
});
test('runtime redaction removes host identity and paths while preserving useful relative commands and times', () => {
  const input = [
    'node /Users/alex/Projects/GENChase/tools/verify.js --all',
    'Failed at /Users/alex/Library/Private/key.json:3 and /private/tmp/job/error.log',
    'host alex-personal-mac account alex mail alex@example.org',
    'IPv4 192.168.1.2 IPv6 2001:db8::1 loopback ::1 MAC ab:cd:ef:12:34:56',
    '2026-09-22T05:16:58.349Z elapsed 05:16:58',
    'serial number: PRIVATE_SERIAL',
    'Windows C:\\Users\\alex\\secret.txt',
  ].join('\n');
  const result = redact(input, privateContext);
  assert(result.includes('node ~/GENChase/tools/verify.js --all'));
  for (const secret of ['Users','Library','alex','192.168.1.2','2001:db8::1','::1','ab:cd:ef:12:34:56','PRIVATE_SERIAL','private/tmp']) assert(!result.includes(secret),secret+' leaked: '+result);
  assert(result.includes('2026-09-22T05:16:58.349Z elapsed 05:16:58'));
});
test('recursive redaction preserves JSON measurements and sanitizes nested artifact strings', () => {
  const before={passed:false,error:0.001,count:13,absent:null,details:[{message:'/Users/alex/Projects/GENChase/apps/check.js'},true]};
  const after=redactObject(before,privateContext);
  assert.deepEqual(after,{passed:false,error:0.001,count:13,absent:null,details:[{message:'~/GENChase/apps/check.js'},true]});
  assert.equal(before.details[0].message,'/Users/alex/Projects/GENChase/apps/check.js');
});

test('browser version fields survive redaction without letting unrelated IP text through', () => {
  const result=redactObject({browserVersions:{chromium:'123.0.0.1',webkit:'26.0',playwright:'1.58.2',host:'192.168.1.1'},message:'peer 192.168.1.1',measured:0.001},privateContext);
  assert.deepEqual(result.browserVersions,{chromium:'123.0.0.1',webkit:'26.0',playwright:'1.58.2'});
  assert.equal(result.message,'peer [IP]');assert.equal(result.measured,0.001);
  assert.equal(redact('Chromium 146.0.7680.0',privateContext),'Chromium 146.0.7680.0');
});
