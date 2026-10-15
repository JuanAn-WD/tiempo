/**
 * Overlays the vendored Android fixes onto expo-app-blocker@0.1.77.
 * Runs from postinstall and from plugins/with-android-blocker.js so EAS
 * compiles the patched service even when lifecycle scripts were skipped.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vendor = path.join(root, 'vendor/expo-app-blocker');
const dest = path.join(root, 'node_modules/expo-app-blocker');

const FILES = [
  'android/src/main/java/expo/modules/appblocker/AppBlockerService.kt',
  'android/src/main/java/expo/modules/appblocker/AppBlockerPrefs.kt',
  'android/src/main/java/expo/modules/appblocker/OverlayManager.kt',
  'android/src/main/java/expo/modules/appblocker/ExpoAppBlockerModule.kt',
  'src/index.ts',
];

if (!fs.existsSync(dest)) {
  console.log('apply-android-blocker-patch: expo-app-blocker is not installed yet');
  process.exit(0);
}

const installed = JSON.parse(fs.readFileSync(path.join(dest, 'package.json'), 'utf8'));
if (installed.version !== '0.1.77') {
  console.error(
    `apply-android-blocker-patch: expected expo-app-blocker 0.1.77, found ${installed.version}`,
  );
  process.exit(1);
}

for (const rel of FILES) {
  const from = path.join(vendor, rel);
  const to = path.join(dest, rel);
  if (!fs.existsSync(from)) {
    console.error(`apply-android-blocker-patch: missing vendor file ${rel}`);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

console.log('apply-android-blocker-patch: expo-app-blocker 0.1.77 patched');
