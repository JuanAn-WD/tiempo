const { withAndroidManifest } = require('expo/config-plugins');
const { execFileSync } = require('child_process');
const path = require('path');

const SERVICE = 'expo.modules.appblocker.AppBlockerService';
const SUBTYPE = 'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE';
const SUBTYPE_VALUE =
  'Detects when a user-selected app is in the foreground during a focus session and covers it until the user unlocks with an NFC tag or phone key.';

const PERMISSIONS = [
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
  'android.permission.FOREGROUND_SERVICE_DATA_SYNC',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.RECEIVE_BOOT_COMPLETED',
  'android.permission.PACKAGE_USAGE_STATS',
];

/**
 * Copies the patched expo-app-blocker sources over node_modules, then makes
 * sure the merged manifest declares the foreground service the way Android 14+
 * requires. The library plugin already adds specialUse; it does not add the
 * subtype property or the dataSync permission, and the service calls
 * startForeground() without a type unless the patched sources are in place.
 */
function withAndroidBlocker(config) {
  const script = path.join(__dirname, '..', 'scripts', 'apply-android-blocker-patch.mjs');
  try {
    // The patch script logs to stdout. `stdio: 'inherit'` would mix that text
    // into `expo config --json` and EAS would fail to parse the config.
    execFileSync(process.execPath, [script], { stdio: ['ignore', process.stderr, process.stderr] });
  } catch (error) {
    throw new Error(`[with-android-blocker] failed to patch expo-app-blocker: ${error.message}`);
  }

  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    if (!manifest.manifest.$) manifest.manifest.$ = {};
    manifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    if (!manifest.manifest['uses-permission']) manifest.manifest['uses-permission'] = [];
    const permissions = manifest.manifest['uses-permission'];
    for (const name of PERMISSIONS) {
      if (permissions.some((entry) => entry.$?.['android:name'] === name)) continue;
      const attrs = { 'android:name': name };
      if (name === 'android.permission.PACKAGE_USAGE_STATS') {
        attrs['tools:ignore'] = 'ProtectedPermissions';
      }
      permissions.push({ $: attrs });
    }

    const application = manifest.manifest.application?.[0];
    if (!application) return config;
    if (!application.service) application.service = [];
    let service = application.service.find((entry) => entry.$?.['android:name'] === SERVICE);
    if (!service) {
      service = { $: { 'android:name': SERVICE } };
      application.service.push(service);
    }
    service.$['android:enabled'] = 'true';
    service.$['android:exported'] = 'false';
    service.$['android:foregroundServiceType'] = 'specialUse|dataSync';
    service.$['android:stopWithTask'] = 'false';
    if (!service.property) service.property = [];
    if (!service.property.some((entry) => entry.$?.['android:name'] === SUBTYPE)) {
      service.property.push({
        $: { 'android:name': SUBTYPE, 'android:value': SUBTYPE_VALUE },
      });
    }
    return config;
  });
}

module.exports = withAndroidBlocker;
