/**
 * Tapping the launcher link must not be enough to lock or unlock.
 * The presented tag UID has to match a paired tag, and a new lock still
 * has to pass the Android permission and empty-list guards.
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadTs(rel) {
  const abs = path.join(root, rel);
  const source = fs.readFileSync(abs, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      strict: false,
    },
    fileName: abs,
  }).outputText;
  const mod = { exports: {} };
  const localRequire = (spec) => {
    if (spec.startsWith('@/')) return loadTs(`src/${spec.slice(2)}.ts`);
    if (spec.startsWith('.')) {
      const resolved = path.resolve(path.dirname(abs), spec);
      const file = resolved.endsWith('.ts') ? resolved : `${resolved}.ts`;
      return loadTs(path.relative(root, file));
    }
    throw new Error(`unexpected import ${spec}`);
  };
  const runner = new Function('exports', 'require', 'module', output);
  runner(mod.exports, localRequire, mod);
  return mod.exports;
}

const { TAG_LAUNCHER_URL, launcherUriPayload, isTagLauncherUrl, decideTagToggle } = loadTs('src/lib/nfc-tap.ts');
const { classifyNfcError } = loadTs('src/lib/nfc-errors.ts');

const PAIRED = '04A1B2C3D4E5F6';
const SPARE = 'AABBCCDD';
const SOCIAL = [
  'com.instagram.android',
  'com.zhiliaoapp.musically',
  'com.google.android.youtube',
];

assert.equal(TAG_LAUNCHER_URL, 'apartag://tag');
assert.deepEqual(launcherUriPayload(), [0x00, ...Buffer.from('apartag://tag')]);
assert.equal(Buffer.from(launcherUriPayload().slice(1)).toString(), 'apartag://tag');

for (const url of ['apartag://tag', 'apartag://tag/', '  APARTAG://tag  ', 'apartag://tag?id=DEADBEEF']) {
  assert.equal(isTagLauncherUrl(url), true, url);
}
for (const url of [
  null,
  '',
  'https://apartag.app/tag',
  'apartag://other',
  'apartag://tag/extra',
  'apartag://tag.evil.com',
  'apartag://evil.example/tag',
  'apartag://user:secret@tag',
  'apartag://tag:1234',
]) {
  assert.equal(isTagLauncherUrl(url), false, String(url));
}

function decide(overrides = {}) {
  return decideTagToggle({
    onboarded: true,
    presentedTagId: PAIRED,
    pairedTagIds: [PAIRED],
    locked: false,
    platform: 'android',
    usage: true,
    overlay: true,
    packages: SOCIAL,
    ownIds: ['com.apartag.app'],
    iosItemCount: 0,
    ...overrides,
  });
}

assert.deepEqual(decide(), { ok: true, action: 'lock' });
assert.deepEqual(decide({ presentedTagId: PAIRED.toLowerCase() }), { ok: true, action: 'lock' });
assert.deepEqual(decide({ locked: true, packages: [], usage: false, overlay: false }), {
  ok: true,
  action: 'unlock',
});
assert.deepEqual(decide({ pairedTagIds: [PAIRED, SPARE], presentedTagId: 'aabbccdd' }), {
  ok: true,
  action: 'lock',
});

assert.deepEqual(decide({ onboarded: false }), { ok: false, reason: 'not-ready' });
assert.deepEqual(decide({ pairedTagIds: [null, ''] }), { ok: false, reason: 'no-paired-tag' });
assert.deepEqual(decide({ presentedTagId: null }), { ok: false, reason: 'missing-id' });
assert.deepEqual(decide({ presentedTagId: '08112233' }), { ok: false, reason: 'unstable' });
assert.deepEqual(decide({ presentedTagId: 'DEADBEEF' }), { ok: false, reason: 'wrong-tag' });
assert.deepEqual(decide({ usage: false }), { ok: false, reason: 'permissions' });
assert.deepEqual(decide({ overlay: false }), { ok: false, reason: 'permissions' });
assert.deepEqual(decide({ packages: [] }), { ok: false, reason: 'no-apps' });
assert.deepEqual(decide({ packages: ['com.apartag.app'] }), { ok: false, reason: 'no-apps' });
assert.deepEqual(
  decide({ packages: [...SOCIAL, 'com.apartag.app', 'apartag', 'tiempo'] }),
  { ok: true, action: 'lock' },
);

assert.deepEqual(decide({ platform: 'ios', iosItemCount: 2, usage: false, overlay: false, packages: [] }), {
  ok: true,
  action: 'lock',
});
assert.deepEqual(decide({ platform: 'ios', iosItemCount: 0 }), { ok: false, reason: 'no-apps' });
assert.deepEqual(decide({ platform: 'ios', locked: true, iosItemCount: 0 }), { ok: true, action: 'unlock' });

assert.equal(classifyNfcError('Tag is not writeable'), 'read-only');
assert.equal(classifyNfcError('NfcError:400'), 'read-only');
assert.equal(classifyNfcError('Tag is not ndef formattable'), 'not-ndef');
assert.equal(classifyNfcError('fail to apply ndef formatable tech'), 'not-ndef');

console.log('nfc tap ok');
