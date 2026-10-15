const { withAndroidManifest } = require('expo/config-plugins');

const NFC_ACTIONS = new Set([
  'android.nfc.action.NDEF_DISCOVERED',
  'android.nfc.action.TAG_DISCOVERED',
  'android.nfc.action.TECH_DISCOVERED',
]);

/**
 * Android must not open React Native when a tag is tapped.
 *
 * Expo's android.intentFilters prefixes every action with
 * `android.intent.action.`, so NDEF_DISCOVERED cannot be declared in app.json.
 * The invisible handler lives in modules/nfc-tap (autolinked on prebuild):
 * Theme.NoDisplay, excludeFromRecents, noHistory, and its own taskAffinity.
 * It receives NDEF_DISCOVERED for apartag://tag and TAG_DISCOVERED as a UID
 * fallback, toggles the blocker, and finishes.
 *
 * This plugin only strips those actions from the main activity, including any
 * filter added by an earlier plugin. iOS still uses the apartag://tag deep
 * link because iOS cannot run this activity in the background.
 */
function isMainActivity(activity) {
  return (activity['intent-filter'] ?? []).some((filter) =>
    (filter.action ?? []).some((action) => action.$?.['android:name'] === 'android.intent.action.MAIN'),
  );
}

function isNfcFilter(filter) {
  return (filter.action ?? []).some((action) => NFC_ACTIONS.has(action.$?.['android:name']));
}

function withNfcLaunch(config) {
  return withAndroidManifest(config, (config) => {
    const activities = config.modResults.manifest.application?.[0]?.activity;
    if (!activities?.length) return config;

    for (const activity of activities) {
      if (!isMainActivity(activity)) continue;
      if (!activity['intent-filter']) continue;
      activity['intent-filter'] = activity['intent-filter'].filter((filter) => !isNfcFilter(filter));
    }
    return config;
  });
}

module.exports = withNfcLaunch;
