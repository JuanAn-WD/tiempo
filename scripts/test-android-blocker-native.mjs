/**
 * The vendored native patch and the config plugin have to keep the Android 14
 * service contract. These strings are what make a lock actually block.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const service = read('vendor/expo-app-blocker/android/src/main/java/expo/modules/appblocker/AppBlockerService.kt');
assert.match(service, /ACTIVITY_RESUMED/);
assert.match(service, /MOVE_TO_FOREGROUND/);
assert.match(service, /LOOKBACK_WINDOW_MS = 120_000L/);
assert.match(service, /POLL_INTERVAL_MS = 1_000L/);
assert.match(service, /FOREGROUND_SERVICE_TYPE_SPECIAL_USE/);
assert.match(service, /FOREGROUND_SERVICE_TYPE_DATA_SYNC/);
assert.match(service, /fun isRunning\(\)/);

const prefs = read('vendor/expo-app-blocker/android/src/main/java/expo/modules/appblocker/AppBlockerPrefs.kt');
assert.match(prefs, /expo_app_blocker_prefs/);
assert.match(prefs, /apartag\.blocked_packages/);
assert.match(prefs, /tiempo_app_blocker_prefs/);
assert.match(prefs, /\.commit\(\)/);

const overlay = read('vendor/expo-app-blocker/android/src/main/java/expo/modules/appblocker/OverlayManager.kt');
assert.match(overlay, /TYPE_APPLICATION_OVERLAY/);
assert.doesNotMatch(overlay, /FLAG_NOT_FOCUSABLE/);
assert.doesNotMatch(overlay, /FLAG_NOT_TOUCHABLE/);

const moduleKt = read('vendor/expo-app-blocker/android/src/main/java/expo/modules/appblocker/ExpoAppBlockerModule.kt');
assert.match(moduleKt, /Function\("isMonitoring"\)/);
assert.match(moduleKt, /isIgnoringBatteryOptimizations/);
assert.match(moduleKt, /openBatterySettings/);

const index = read('vendor/expo-app-blocker/src/index.ts');
assert.match(index, /export function isMonitoring\(\)/);
assert.match(index, /export function openBatterySettings\(\)/);

const plugin = read('plugins/with-android-blocker.js');
assert.match(plugin, /FOREGROUND_SERVICE_SPECIAL_USE/);
assert.match(plugin, /FOREGROUND_SERVICE_DATA_SYNC/);
assert.match(plugin, /POST_NOTIFICATIONS/);
assert.match(plugin, /specialUse\|dataSync/);
assert.match(plugin, /PROPERTY_SPECIAL_USE_FGS_SUBTYPE/);
assert.match(plugin, /expo\.modules\.appblocker\.AppBlockerService/);

const app = JSON.parse(read('app.json'));
assert.equal(app.expo.slug, 'tiempo');
assert.equal(app.expo.extra.eas.projectId, '58a7bafd-e180-4240-a594-9f17bc2ae327');
assert.equal(app.expo.name, 'Apartag');
const plugins = app.expo.plugins.map((entry) => (Array.isArray(entry) ? entry[0] : entry));
assert.ok(plugins.includes('expo-app-blocker'));
assert.ok(plugins.includes('./plugins/with-android-blocker'));
assert.ok(plugins.indexOf('./plugins/with-android-blocker') > plugins.indexOf('expo-app-blocker'));

const flow = read('src/lib/permission-flow.ts');
assert.match(flow, /scope === 'block'/);

const store = read('src/context/tiempo-store.tsx');
assert.match(store, /startAndroidBlock\(current\.selectedPackages\)/);
assert.match(store, /startAndroidBlock\(next\.selectedPackages\)/);
assert.match(store, /applyNativeLock\(loaded\)/);
assert.match(store, /permissions\?scope=block/);

console.log('android blocker native contract ok');
