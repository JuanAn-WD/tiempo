/**
 * The Android lock must not report success with an empty package list,
 * and own-app filtering must not throw away the apps the user picked.
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

const { packageIdsOnly, packagesToBlock, androidLockDecision } = loadTs('src/lib/android-lock.ts');

const social = [
  'com.instagram.android',
  'com.zhiliaoapp.musically',
  'com.google.android.youtube',
  'com.twitter.android',
];

assert.deepEqual(packageIdsOnly(['com.apartag.app', 'apartag', 'tiempo', '', '  ', 'COM.Apartag.App']), [
  'com.apartag.app',
]);
assert.deepEqual(packagesToBlock(social, ['com.apartag.app', 'apartag', 'tiempo', '']), social);
assert.deepEqual(packagesToBlock([...social, 'com.apartag.app'], ['COM.Apartag.App']), social);
assert.deepEqual(packagesToBlock(['com.apartag.app'], ['com.apartag.app']), []);

assert.deepEqual(
  androidLockDecision({ packages: social, ownIds: ['com.apartag.app'], usage: false, overlay: true }),
  { ok: false, reason: 'permissions' },
);
assert.deepEqual(
  androidLockDecision({ packages: social, ownIds: ['com.apartag.app'], usage: true, overlay: false }),
  { ok: false, reason: 'permissions' },
);
assert.deepEqual(
  androidLockDecision({ packages: ['com.apartag.app'], ownIds: ['com.apartag.app'], usage: true, overlay: true }),
  { ok: false, reason: 'no-apps' },
);
assert.deepEqual(
  androidLockDecision({ packages: [], ownIds: [], usage: true, overlay: true }),
  { ok: false, reason: 'no-apps' },
);

const ready = androidLockDecision({
  packages: social,
  ownIds: ['COM.Apartag.App', 'tiempo', 'apartag'],
  usage: true,
  overlay: true,
});
assert.equal(ready.ok, true);
if (ready.ok) assert.deepEqual(ready.packages, social);

console.log('android lock ok');
