/**
 * Permission explainer rules: one system request at a time,
 * accessibility is never requested, and both catalogs explain every permission.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cache = new Map();

function loadTs(rel) {
  const abs = path.join(root, rel);
  if (cache.has(abs)) return cache.get(abs).exports;
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
  cache.set(abs, mod);
  const localRequire = (spec) => {
    if (spec.startsWith('.')) {
      const resolved = path.resolve(path.dirname(abs), spec);
      if (resolved.endsWith('.json')) return JSON.parse(fs.readFileSync(resolved, 'utf8'));
      const file = resolved.endsWith('.ts') ? resolved : `${resolved}.ts`;
      return loadTs(path.relative(root, file));
    }
    return require(spec);
  };
  const runner = new Function('exports', 'require', 'module', output);
  runner(mod.exports, localRequire, mod);
  return mod.exports;
}

function flatten(value, prefix, bag) {
  if (typeof value === 'string') {
    bag[prefix] = value;
    return;
  }
  for (const key of Object.keys(value)) {
    flatten(value[key], prefix ? `${prefix}.${key}` : key, bag);
  }
}

const flow = loadTs('src/lib/permission-flow.ts');
const { es } = loadTs('src/i18n/es.ts');
const { en } = loadTs('src/i18n/en.ts');
const esFlat = {};
const enFlat = {};
flatten(es, '', esFlat);
flatten(en, '', enFlat);

const {
  PERMISSION_IDS,
  PERMISSION_COPY_FIELDS,
  stepsFor,
  activeStep,
  explainerAction,
  settingsTarget,
  requestsSystemPrompt,
  outcomeFromNfc,
  outcomeFromFamilyControls,
  outcomeFromFlag,
  outcomeFromPrompt,
  needsAttention,
  firstPendingIndex,
  parseFlowScope,
  normalizePlatform,
} = flow;

assert.deepEqual(PERMISSION_IDS, [
  'nfc',
  'screenTime',
  'usage',
  'overlay',
  'accessibility',
  'notifications',
  'camera',
]);

const android = stepsFor('android', 'session');
const ios = stepsFor('ios', 'session');
assert.deepEqual(android, ['nfc', 'usage', 'overlay', 'accessibility', 'notifications', 'camera']);
assert.deepEqual(ios, ['nfc', 'screenTime', 'notifications', 'camera']);
assert.equal(android.includes('screenTime'), false);
assert.equal(ios.includes('usage'), false);
assert.equal(ios.includes('overlay'), false);
assert.equal(ios.includes('accessibility'), false);
assert.deepEqual(stepsFor('ios', 'nfc'), ['nfc']);
assert.deepEqual(stepsFor('android', 'camera'), ['camera']);
assert.deepEqual(stepsFor('android', 'block'), ['usage', 'overlay', 'notifications']);
assert.deepEqual(stepsFor('ios', 'block'), []);
assert.equal(parseFlowScope('block'), 'block');
assert.equal(new Set(android).size, android.length);

assert.equal(activeStep(android, 0), 'nfc');
assert.equal(activeStep(android, 1), 'usage');
assert.equal(activeStep(android, android.length), null);
assert.equal(activeStep(android, -1), null);

for (const outcome of ['granted', 'denied', 'undetermined', 'unavailable', 'notUsed']) {
  assert.equal(explainerAction('accessibility', outcome, true), 'acknowledge');
  assert.equal(explainerAction('accessibility', outcome, false), 'acknowledge');
}
assert.equal(settingsTarget('accessibility'), 'none');
assert.equal(requestsSystemPrompt('accessibility'), false);
assert.equal(requestsSystemPrompt('usage'), false);
assert.equal(requestsSystemPrompt('overlay'), false);
assert.equal(requestsSystemPrompt('screenTime'), true);
assert.equal(requestsSystemPrompt('notifications'), true);
assert.equal(requestsSystemPrompt('camera'), true);

assert.equal(explainerAction('usage', 'undetermined', false), 'settings');
assert.equal(explainerAction('overlay', 'denied', false), 'settings');
assert.equal(explainerAction('usage', 'granted', false), 'continue');

assert.equal(explainerAction('nfc', 'denied', false), 'settings');
assert.equal(explainerAction('nfc', 'granted', false), 'continue');
assert.equal(explainerAction('nfc', 'unavailable', false), 'continue');
assert.equal(explainerAction('screenTime', 'undetermined', true), 'request');
assert.equal(explainerAction('screenTime', 'denied', false), 'settings');
assert.equal(explainerAction('camera', 'denied', true), 'request');
assert.equal(explainerAction('camera', 'denied', false), 'settings');
assert.equal(explainerAction('notifications', 'undetermined', true), 'request');
assert.equal(explainerAction('notifications', 'denied', false), 'settings');

assert.deepEqual(outcomeFromNfc(null), { outcome: 'undetermined', canAskAgain: true });
assert.equal(outcomeFromNfc({ supported: false, enabled: false }).outcome, 'unavailable');
assert.equal(outcomeFromNfc({ supported: true, enabled: false }).outcome, 'denied');
assert.equal(outcomeFromNfc({ supported: true, enabled: true }).outcome, 'granted');

assert.equal(outcomeFromFamilyControls('notDetermined', false).outcome, 'undetermined');
assert.equal(outcomeFromFamilyControls('notDetermined', false).canAskAgain, true);
assert.equal(outcomeFromFamilyControls('denied', false).canAskAgain, false);
assert.equal(outcomeFromFamilyControls('denied', false).outcome, 'denied');
assert.equal(outcomeFromFamilyControls('approved', true).outcome, 'granted');

assert.equal(outcomeFromFlag(false, false).outcome, 'undetermined');
assert.equal(outcomeFromFlag(false, true).outcome, 'denied');
assert.equal(outcomeFromFlag(true, false).outcome, 'granted');

assert.equal(outcomeFromPrompt(false, true, 'undetermined').outcome, 'undetermined');
assert.equal(outcomeFromPrompt(false, false, 'denied').canAskAgain, false);
assert.equal(outcomeFromPrompt(true, false, 'granted').outcome, 'granted');

assert.equal(needsAttention('accessibility', 'notUsed', new Set()), true);
assert.equal(needsAttention('accessibility', 'notUsed', new Set(['accessibility'])), false);
assert.equal(needsAttention('usage', 'granted', new Set()), true);
assert.equal(needsAttention('usage', 'granted', new Set(['usage'])), false);
assert.equal(needsAttention('usage', 'denied', new Set(['usage'])), true);
assert.equal(needsAttention('nfc', 'unavailable', new Set(['nfc'])), false);
assert.equal(needsAttention('nfc', 'unavailable', new Set()), true);

const outcomes = { nfc: 'granted', usage: 'denied', overlay: 'undetermined' };
assert.equal(firstPendingIndex(['nfc', 'usage', 'overlay'], outcomes, new Set()), 0);
assert.equal(firstPendingIndex(['nfc', 'usage', 'overlay'], outcomes, new Set(['nfc'])), 1);
assert.equal(firstPendingIndex(['nfc'], { nfc: 'granted' }, new Set(['nfc'])), -1);

assert.equal(parseFlowScope('nfc'), 'nfc');
assert.equal(parseFlowScope(['camera']), 'camera');
assert.equal(parseFlowScope(undefined), 'session');
assert.equal(parseFlowScope('nope'), 'session');
assert.equal(normalizePlatform('ios'), 'ios');
assert.equal(normalizePlatform('web'), 'web');

for (const id of PERMISSION_IDS) {
  for (const field of PERMISSION_COPY_FIELDS) {
    const key = `permissions.item.${id}.${field}`;
    assert.equal(typeof esFlat[key], 'string', key);
    assert.equal(typeof enFlat[key], 'string', key);
    assert.notEqual(esFlat[key].trim(), '');
    assert.notEqual(enFlat[key].trim(), '');
  }
}
assert.equal(typeof esFlat['permissions.openSettings'], 'string');
assert.equal(typeof enFlat['permissions.openSettings'], 'string');
assert.equal(typeof esFlat['permissions.item.notifications.channel'], 'string');
assert.equal(typeof enFlat['permissions.item.notifications.channel'], 'string');

const undeterminedAndroid = android.filter(
  (id) => explainerAction(id, id === 'accessibility' ? 'notUsed' : 'undetermined', true) === 'settings',
);
assert.deepEqual(undeterminedAndroid, ['usage', 'overlay']);
assert.equal(activeStep(undeterminedAndroid, 0) === activeStep(undeterminedAndroid, 1), false);

console.log('permission flow ok');
