const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

/**
 * These packages throw while the module is evaluated on web
 * (`requireNativeModule`, or a missing NativeModule). The app only calls
 * them on a phone; the web bundle still has to load, so it gets a stub.
 */
const webStubs = {
  'expo-app-blocker': path.join(__dirname, 'src/shims/expo-app-blocker.web.tsx'),
  'react-native-nfc-manager': path.join(__dirname, 'src/shims/react-native-nfc-manager.web.ts'),
  'expo-iap': path.join(__dirname, 'src/shims/expo-iap.web.ts'),
  'expo-store-review': path.join(__dirname, 'src/shims/expo-store-review.web.ts'),
};

const usageStatsWeb = path.join(__dirname, 'modules/usage-stats/src/index.web.ts');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && Object.prototype.hasOwnProperty.call(webStubs, moduleName)) {
    return { type: 'sourceFile', filePath: webStubs[moduleName] };
  }
  if (
    platform === 'web' &&
    (moduleName === 'usage-stats' ||
      moduleName.endsWith('/modules/usage-stats') ||
      moduleName.endsWith('\\modules\\usage-stats'))
  ) {
    return { type: 'sourceFile', filePath: usageStatsWeb };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
