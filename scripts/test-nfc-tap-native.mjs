/**
 * Android tap contract: the invisible activity owns NFC, the main activity
 * does not, and the toggle uses the blocker prefs plus the paired UID.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const manifest = read('modules/nfc-tap/android/src/main/AndroidManifest.xml');
assert.match(manifest, /Theme\.NoDisplay/);
assert.match(manifest, /excludeFromRecents/);
assert.match(manifest, /noHistory/);
assert.match(manifest, /com\.apartag\.app\.nfc/);
assert.match(manifest, /android.nfc.action.NDEF_DISCOVERED/);
assert.match(manifest, /android.nfc.action.TAG_DISCOVERED/);
assert.match(manifest, /android:scheme="apartag"/);
assert.match(manifest, /android:host="tag"/);
assert.match(manifest, /android:exported="true"/);

const activity = read('modules/nfc-tap/android/src/main/java/expo/modules/nfctap/NfcTapActivity.kt');
assert.match(activity, /finish\(\)/);
assert.match(activity, /ACTION_NDEF_DISCOVERED/);
assert.match(activity, /ACTION_TAG_DISCOVERED/);
assert.doesNotMatch(activity, /startActivity/);

const prefs = read('modules/nfc-tap/android/src/main/java/expo/modules/nfctap/NfcTapPrefs.kt');
assert.match(prefs, /apartag_nfc_tap/);
assert.match(prefs, /EXTRA_ID/);
assert.match(prefs, /EXTRA_TAG/);
assert.match(prefs, /startsWith\("08"\)/);
assert.match(prefs, /\.commit\(\)/);
assert.match(prefs, /pendingId/);

const controller = read('modules/nfc-tap/android/src/main/java/expo/modules/nfctap/NfcTapController.kt');
assert.match(controller, /expo\.modules\.appblocker\.AppBlockerService/);
assert.match(controller, /blocked_packages/);
assert.match(controller, /apartag\.blocked_packages/);
assert.match(controller, /startForegroundService/);
assert.match(controller, /stopService/);
assert.match(controller, /OPSTR_GET_USAGE_STATS/);
assert.match(controller, /canDrawOverlays/);
assert.match(controller, /packagesToBlock/);

const feedback = read('modules/nfc-tap/android/src/main/java/expo/modules/nfctap/NfcTapFeedback.kt');
assert.match(feedback, /Toast/);
assert.match(feedback, /VibrationEffect/);
assert.match(feedback, /80L/);

const plugin = read('plugins/with-nfc-launch.js');
assert.match(plugin, /NDEF_DISCOVERED/);
assert.match(plugin, /isNfcFilter/);
assert.doesNotMatch(plugin, /launchMode/);
assert.doesNotMatch(plugin, /intent-filter'\]\.push/);

const store = read('src/context/tiempo-store.tsx');
assert.match(store, /Platform\.OS !== 'ios'/);
assert.match(store, /consumeNativeTapRef/);
assert.doesNotMatch(store, /BackHandler/);

const app = JSON.parse(read('app.json'));
const plugins = app.expo.plugins.map((entry) => (Array.isArray(entry) ? entry[0] : entry));
assert.ok(plugins.includes('./plugins/with-nfc-launch'));
assert.ok(plugins.indexOf('./plugins/with-nfc-launch') > plugins.indexOf('react-native-nfc-manager'));

console.log('nfc tap native contract ok');
