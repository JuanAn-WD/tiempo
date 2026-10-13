/**
 * Fails when Spanish and English catalogs drift, or when native copy
 * no longer matches the baked app config and shield extensions.
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function fail(message) {
  failures.push(message);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function readJson(rel) {
  return JSON.parse(read(rel));
}

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
      const nested = path.relative(root, file);
      return loadTs(nested);
    }
    return require(spec);
  };
  const runner = new Function('exports', 'require', 'module', output);
  runner(mod.exports, localRequire, mod);
  return mod.exports;
}

function flatten(value, prefix, bag) {
  if (typeof value === 'string') {
    if (value.trim() === '') fail(`empty string at ${prefix}`);
    bag[prefix] = value;
    return;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`expected a string at ${prefix}`);
    return;
  }
  for (const key of Object.keys(value)) {
    flatten(value[key], prefix ? `${prefix}.${key}` : key, bag);
  }
}

function sameKeys(left, right, label) {
  const missing = Object.keys(left).filter((key) => !(key in right));
  const extra = Object.keys(right).filter((key) => !(key in left));
  if (missing.length) fail(`${label} missing keys: ${missing.join(', ')}`);
  if (extra.length) fail(`${label} extra keys: ${extra.join(', ')}`);
}

const { es } = loadTs('src/i18n/es.ts');
const { en } = loadTs('src/i18n/en.ts');
const esFlat = {};
const enFlat = {};
flatten(es, '', esFlat);
flatten(en, '', enFlat);
sameKeys(esFlat, enFlat, 'catalog');

if (!enFlat['onboarding.cost.body']?.includes('Set your phone apart. Get your time back.')) {
  fail('English onboarding slogan is missing');
}
if (esFlat['strict.word'] !== 'ESTRICTO' || enFlat['strict.word'] !== 'STRICT') {
  fail('strict confirmation words drifted from ESTRICTO / STRICT');
}

const nativeEs = readJson('src/i18n/native/es.json');
const nativeEn = readJson('src/i18n/native/en.json');
sameKeys(nativeEs, nativeEn, 'native json');

const localeEs = readJson('locales/es.json');
const localeEn = readJson('locales/en.json');
const localeEsFlat = {};
const localeEnFlat = {};
flatten(localeEs, '', localeEsFlat);
flatten(localeEn, '', localeEnFlat);
sameKeys(localeEsFlat, localeEnFlat, 'expo locales');

const app = readJson('app.json');
const blocker = app.expo.plugins.find((entry) => Array.isArray(entry) && entry[0] === 'expo-app-blocker');
if (!blocker) fail('expo-app-blocker plugin missing from app.json');
else {
  const shield = blocker[1].ios.shield;
  const notification = blocker[1].ios.notification;
  const android = blocker[1].android;
  const baked = [
    [shield.title, nativeEs.shieldTitle, 'shield.title'],
    [shield.subtitle, nativeEs.shieldSubtitle, 'shield.subtitle'],
    [shield.primaryButtonLabel, nativeEs.shieldButton, 'shield.primaryButtonLabel'],
    [shield.tempUnlockTitle, nativeEs.shieldTempTitle, 'shield.tempUnlockTitle'],
    [shield.tempUnlockSubtitle, nativeEs.shieldTempSubtitle, 'shield.tempUnlockSubtitle'],
    [shield.tempUnlockButtonLabel, nativeEs.shieldTempButton, 'shield.tempUnlockButtonLabel'],
    [shield.countSuffix, nativeEs.shieldCount, 'shield.countSuffix'],
    [notification.title, nativeEs.notificationTitle, 'notification.title'],
    [notification.body, nativeEs.notificationBody, 'notification.body'],
    [android.overlayTitle, nativeEs.overlayTitle, 'android.overlayTitle'],
    [android.overlayText, nativeEs.overlayText, 'android.overlayText'],
    [android.notificationTitle, nativeEs.overlayNotificationTitle, 'android.notificationTitle'],
    [android.notificationText, nativeEs.overlayNotificationText, 'android.notificationText'],
  ];
  for (const [actual, expected, label] of baked) {
    if (actual !== expected) fail(`app.json ${label} does not match native/es.json`);
  }
}

const shieldSwift = read('targets/ShieldConfiguration/ShieldConfigurationExtension.swift');
const actionSwift = read('targets/ShieldAction/ShieldActionExtension.swift');
for (const snippet of [
  'apartagPrefersEnglish',
  nativeEn.shieldTitle,
  nativeEn.shieldSubtitle,
  nativeEn.shieldButton,
  nativeEn.shieldTempTitle,
  nativeEn.shieldTempSubtitle,
  nativeEn.shieldCount.replace('{count}', '\\(count)'),
  nativeEn.fallbackApp,
  nativeEn.fallbackCategory,
  nativeEn.fallbackWebsite,
]) {
  if (!shieldSwift.includes(snippet)) fail(`shield extension missing: ${snippet}`);
}
for (const snippet of ['apartagPrefersEnglish', nativeEn.notificationTitle, nativeEn.notificationBody]) {
  if (!actionSwift.includes(snippet)) fail(`shield action missing: ${snippet}`);
}

for (const name of ['ShieldConfiguration', 'ShieldAction', 'DeviceActivityMonitor']) {
  const config = read(`targets/${name}/expo-target.config.js`);
  if (config.includes('group.expo.app-blocker')) {
    fail(`${name} expo-target.config.js still uses the package app group`);
  }
  if (!config.includes('group.com.apartag.app')) {
    fail(`${name} expo-target.config.js missing group.com.apartag.app`);
  }
}

const storage = read('src/lib/storage.ts');
for (const needle of [
  'tiempo.state.v3',
  'tiempo.state.v2',
  'tiempo.state.v1',
  "'trabajo'",
  "'estudio'",
  "'casa'",
  "'gym'",
]) {
  if (!storage.includes(needle)) fail(`storage no longer contains ${needle}`);
}

const { pickLocale } = loadTs('src/i18n/locale.ts');
const localeCases = [
  [[], 'es'],
  [['en'], 'en'],
  [['en-US'], 'en'],
  [['EN'], 'en'],
  [['es'], 'es'],
  [['es-MX'], 'es'],
  [['fr'], 'es'],
  [['fr', 'en'], 'es'],
  [[null, '', 'en'], 'en'],
  [[''], 'es'],
];
for (const [input, expected] of localeCases) {
  const actual = pickLocale(input);
  if (actual !== expected) fail(`pickLocale(${JSON.stringify(input)}) = ${actual}, expected ${expected}`);
}

const emergency = loadTs('src/lib/emergency.ts');
if (emergency.STRICT_CONFIRMATION !== 'ESTRICTO') fail('STRICT_CONFIRMATION changed');
if (emergency.STRICT_CONFIRMATION_EN !== 'STRICT') fail('STRICT_CONFIRMATION_EN changed');
if (!emergency.acceptsStrictConfirmation('ESTRICTO')) fail('ESTRICTO must still confirm strict mode');
if (!emergency.acceptsStrictConfirmation('  STRICT  ')) fail('STRICT must confirm strict mode');
if (emergency.acceptsStrictConfirmation('estricto')) fail('confirmation must stay case-sensitive');
if (emergency.acceptsStrictConfirmation('strict')) fail('confirmation must stay case-sensitive');
if (emergency.strictConfirmationWord('en') !== 'STRICT') fail('English confirmation word');
if (emergency.strictConfirmationWord('es') !== 'ESTRICTO') fail('Spanish confirmation word');

if (failures.length) {
  console.error(`i18n check failed (${failures.length}):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log(`i18n check ok (${Object.keys(esFlat).length} catalog keys)`);
