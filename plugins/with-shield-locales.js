const fs = require('fs');
const path = require('path');

const MARKER = 'apartagPrefersEnglish';

function readNative() {
  const root = path.join(__dirname, '..', 'src', 'i18n', 'native');
  return {
    es: JSON.parse(fs.readFileSync(path.join(root, 'es.json'), 'utf8')),
    en: JSON.parse(fs.readFileSync(path.join(root, 'en.json'), 'utf8')),
  };
}

function swiftLiteral(value) {
  const escaped = String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\{count\}/g, '\\(count)');
  return `"${escaped}"`;
}

function replaceOnce(content, search, replacement, label) {
  const count = content.split(search).length - 1;
  if (count !== 1) {
    throw new Error(`with-shield-locales: expected 1 occurrence of ${label}, found ${count}`);
  }
  return content.replace(search, replacement);
}

const HELPER = `
  // apartag-i18n: device language, Spanish fallback.
  private func apartagPrefersEnglish() -> Bool {
    let code = Locale.preferredLanguages.first?.lowercased() ?? "es"
    return code.hasPrefix("en")
  }

  private func apartagText(_ spanish: String, _ english: String) -> String {
    apartagPrefersEnglish() ? english : spanish
  }

`;

function patchShieldConfiguration(content, copy) {
  if (content.includes(MARKER)) return content;
  if (!content.includes('private func makeConfig(appName: String) -> ShieldConfiguration {')) {
    throw new Error('with-shield-locales: ShieldConfiguration template changed');
  }
  content = content.replace(
    '  private func makeConfig(appName: String) -> ShieldConfiguration {',
    `${HELPER}  private func makeConfig(appName: String) -> ShieldConfiguration {`,
  );

  const textSwaps = [
    ['text: shieldTempUnlockTitle,', `text: apartagText(shieldTempUnlockTitle, ${swiftLiteral(copy.en.shieldTempTitle)}),`],
    ['text: shieldTempUnlockSubtitle,', `text: apartagText(shieldTempUnlockSubtitle, ${swiftLiteral(copy.en.shieldTempSubtitle)}),`],
    ['text: shieldTempUnlockButtonLabel,', `text: apartagText(shieldTempUnlockButtonLabel, ${swiftLiteral(copy.en.shieldTempButton)}),`],
    ['text: shieldTitle,', `text: apartagText(shieldTitle, ${swiftLiteral(copy.en.shieldTitle)}),`],
    ['text: shieldPrimaryButtonLabel,', `text: apartagText(shieldPrimaryButtonLabel, ${swiftLiteral(copy.en.shieldButton)}),`],
  ];
  for (const [search, replacement] of textSwaps) {
    content = replaceOnce(content, search, replacement, search);
  }

  content = replaceOnce(
    content,
    'let subtitle = shieldSubtitle.replacingOccurrences(of: "{appName}", with: appName) + context',
    `let subtitle = apartagText(shieldSubtitle, ${swiftLiteral(copy.en.shieldSubtitle)}).replacingOccurrences(of: "{appName}", with: appName) + context`,
    'shield subtitle',
  );

  const contextRe = /let context = count > 1 \? "((?:\\.|[^"\\])*)" : ""/;
  const contextMatch = content.match(contextRe);
  if (!contextMatch) {
    throw new Error('with-shield-locales: missing shield count suffix');
  }
  const englishCount = swiftLiteral(copy.en.shieldCount);
  content = content.replace(
    contextRe,
    `let context = count > 1 ? apartagText("${contextMatch[1]}", ${englishCount}) : ""`,
  );

  const fallbacks = [
    ['?? "This app"', `?? apartagText(${swiftLiteral(copy.es.fallbackApp)}, ${swiftLiteral(copy.en.fallbackApp)})`, 1],
    ['?? "This category"', `?? apartagText(${swiftLiteral(copy.es.fallbackCategory)}, ${swiftLiteral(copy.en.fallbackCategory)})`, 1],
    ['?? "This website"', `?? apartagText(${swiftLiteral(copy.es.fallbackWebsite)}, ${swiftLiteral(copy.en.fallbackWebsite)})`, 2],
  ];
  for (const [search, replacement, expected] of fallbacks) {
    const found = content.split(search).length - 1;
    if (found !== expected) {
      throw new Error(`with-shield-locales: expected ${expected} of ${search}, found ${found}`);
    }
    content = content.split(search).join(replacement);
  }
  return content;
}

function patchShieldAction(content, copy) {
  if (content.includes(MARKER)) return content;
  const anchor = '  private func schedulePendingUnlockNotification(completion: @escaping (Bool) -> Void) {';
  if (!content.includes(anchor)) {
    throw new Error('with-shield-locales: ShieldAction template changed');
  }
  content = content.replace(anchor, `${HELPER}${anchor}`);
  content = replaceOnce(
    content,
    'content.title = notificationTitle',
    `content.title = apartagText(notificationTitle, ${swiftLiteral(copy.en.notificationTitle)})`,
    'notification title',
  );
  content = replaceOnce(
    content,
    'content.body = notificationBody',
    `content.body = apartagText(notificationBody, ${swiftLiteral(copy.en.notificationBody)})`,
    'notification body',
  );
  return content;
}

function restoreAppGroup(projectRoot) {
  for (const name of ['ShieldConfiguration', 'ShieldAction', 'DeviceActivityMonitor']) {
    const file = path.join(projectRoot, 'targets', name, 'expo-target.config.js');
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    const next = content.replaceAll('group.expo.app-blocker', 'group.com.apartag.app');
    if (next !== content) fs.writeFileSync(file, next);
  }
}

function patchTargets(projectRoot) {
  const copy = readNative();
  const shield = path.join(projectRoot, 'targets', 'ShieldConfiguration', 'ShieldConfigurationExtension.swift');
  const action = path.join(projectRoot, 'targets', 'ShieldAction', 'ShieldActionExtension.swift');
  if (!fs.existsSync(shield) || !fs.existsSync(action)) return;
  fs.writeFileSync(shield, patchShieldConfiguration(fs.readFileSync(shield, 'utf8'), copy));
  fs.writeFileSync(action, patchShieldAction(fs.readFileSync(action, 'utf8'), copy));
  restoreAppGroup(projectRoot);
}

/** Runs after expo-app-blocker copies and substitutes the extension templates. */
function withShieldLocales(config) {
  const projectRoot = config._internal?.projectRoot || process.cwd();
  patchTargets(projectRoot);
  return config;
}

module.exports = withShieldLocales;
module.exports.patchShieldConfiguration = patchShieldConfiguration;
module.exports.patchShieldAction = patchShieldAction;
