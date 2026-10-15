const { withAndroidManifest } = require('expo/config-plugins');

const ACTION = 'android.nfc.action.NDEF_DISCOVERED';
const SCHEME = 'apartag';
const HOST = 'tag';

/**
 * Expo's android.intentFilters always prefixes the action with
 * `android.intent.action.`, which turns NDEF_DISCOVERED into a name Android
 * will never deliver. The filter is written here, on the main activity, for
 * the launcher URI `apartag://tag` (scheme + host, no path).
 *
 * singleTask keeps a second tap on the same task (onNewIntent) instead of
 * starting another copy of the app.
 */
function withNfcLaunch(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    const activities = application?.activity;
    if (!activities?.length) return config;

    const main =
      activities.find((activity) =>
        (activity['intent-filter'] ?? []).some((filter) =>
          (filter.action ?? []).some((action) => action.$?.['android:name'] === 'android.intent.action.MAIN'),
        ),
      ) ?? activities[0];

    if (!main.$) main.$ = {};
    main.$['android:launchMode'] = 'singleTask';
    if (!main['intent-filter']) main['intent-filter'] = [];

    const already = main['intent-filter'].some((filter) => {
      const hasAction = (filter.action ?? []).some((action) => action.$?.['android:name'] === ACTION);
      const hasData = (filter.data ?? []).some(
        (data) => data.$?.['android:scheme'] === SCHEME && data.$?.['android:host'] === HOST,
      );
      return hasAction && hasData;
    });
    if (already) return config;

    main['intent-filter'].push({
      action: [{ $: { 'android:name': ACTION } }],
      category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
      data: [{ $: { 'android:scheme': SCHEME, 'android:host': HOST } }],
    });
    return config;
  });
}

module.exports = withNfcLaunch;
