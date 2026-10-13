/**
 * Which permission to explain, and what the button is allowed to do.
 * One step at a time: nothing here opens a second system screen.
 * Accessibility is explained and never requested.
 */

export const PERMISSION_IDS = [
  'nfc',
  'screenTime',
  'usage',
  'overlay',
  'accessibility',
  'notifications',
  'camera',
] as const;

export type PermissionId = (typeof PERMISSION_IDS)[number];

export const PERMISSION_COPY_FIELDS = ['title', 'body', 'denied', 'unavailable', 'allow'] as const;

export type AppPlatform = 'ios' | 'android' | 'web';

export type FlowScope = 'session' | 'nfc' | 'camera';

export type PermissionOutcome = 'granted' | 'denied' | 'undetermined' | 'unavailable' | 'notUsed';

export type ExplainerAction = 'request' | 'settings' | 'continue' | 'acknowledge';

export type SettingsTarget = 'app' | 'nfc' | 'usage' | 'overlay' | 'none';

export type PermissionSnapshot = {
  outcome: PermissionOutcome;
  canAskAgain: boolean;
};

const SETTINGS_ONLY = new Set<PermissionId>(['usage', 'overlay']);

export function normalizePlatform(os: string): AppPlatform {
  if (os === 'ios' || os === 'android') return os;
  return 'web';
}

export function parseFlowScope(value: string | string[] | undefined): FlowScope {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'nfc' || raw === 'camera') return raw;
  return 'session';
}

/** Permissions this platform actually walks through, in explanation order. */
export function stepsFor(platform: AppPlatform, scope: FlowScope): PermissionId[] {
  if (scope === 'nfc') return ['nfc'];
  if (scope === 'camera') return ['camera'];
  if (platform === 'ios') return ['nfc', 'screenTime', 'notifications', 'camera'];
  if (platform === 'android') return ['nfc', 'usage', 'overlay', 'accessibility', 'notifications', 'camera'];
  return ['nfc', 'screenTime', 'usage', 'overlay', 'accessibility', 'notifications', 'camera'];
}

export function activeStep(steps: readonly PermissionId[], index: number): PermissionId | null {
  if (index < 0 || index >= steps.length) return null;
  return steps[index] ?? null;
}

export function outcomeFromNfc(status: { supported: boolean; enabled: boolean } | null): PermissionSnapshot {
  if (!status) return { outcome: 'undetermined', canAskAgain: true };
  if (!status.supported) return { outcome: 'unavailable', canAskAgain: false };
  if (!status.enabled) return { outcome: 'denied', canAskAgain: false };
  return { outcome: 'granted', canAskAgain: false };
}

export function outcomeFromFamilyControls(
  status: 'notDetermined' | 'denied' | 'approved' | null,
  authorized: boolean,
): PermissionSnapshot {
  if (authorized || status === 'approved') return { outcome: 'granted', canAskAgain: false };
  if (status === 'denied') return { outcome: 'denied', canAskAgain: false };
  return { outcome: 'undetermined', canAskAgain: true };
}

/** Usage access and overlay only report a boolean, so “denied” starts after the user has been sent to settings. */
export function outcomeFromFlag(granted: boolean, attempted: boolean): PermissionSnapshot {
  if (granted) return { outcome: 'granted', canAskAgain: false };
  if (!attempted) return { outcome: 'undetermined', canAskAgain: false };
  return { outcome: 'denied', canAskAgain: false };
}

export function outcomeFromPrompt(granted: boolean, canAskAgain: boolean, status: string): PermissionSnapshot {
  if (granted || status === 'granted') return { outcome: 'granted', canAskAgain: false };
  if (status === 'undetermined') return { outcome: 'undetermined', canAskAgain: true };
  return { outcome: 'denied', canAskAgain };
}

export function explainerAction(
  id: PermissionId,
  outcome: PermissionOutcome,
  canAskAgain: boolean,
): ExplainerAction {
  if (id === 'accessibility' || outcome === 'notUsed') return 'acknowledge';
  if (outcome === 'granted' || outcome === 'unavailable') return 'continue';
  if (SETTINGS_ONLY.has(id)) return 'settings';
  if (id === 'nfc' && outcome === 'denied') return 'settings';
  if (outcome === 'denied' && !canAskAgain) return 'settings';
  return 'request';
}

export function settingsTarget(id: PermissionId): SettingsTarget {
  if (id === 'accessibility') return 'none';
  if (id === 'nfc') return 'nfc';
  if (id === 'usage') return 'usage';
  if (id === 'overlay') return 'overlay';
  return 'app';
}

/** System dialogs. Usage, overlay, and accessibility are not in this set. */
export function requestsSystemPrompt(id: PermissionId): boolean {
  return id === 'screenTime' || id === 'notifications' || id === 'camera';
}

/**
 * Unseen steps are always shown, even when the system already allowed them,
 * so the explanation happens before any later request. After that, only a
 * real denial keeps the step in the flow.
 */
export function needsAttention(
  id: PermissionId,
  outcome: PermissionOutcome,
  seen: ReadonlySet<PermissionId>,
): boolean {
  if (!seen.has(id)) return true;
  return outcome !== 'granted' && outcome !== 'unavailable' && outcome !== 'notUsed';
}

/** Index of the first step that still needs a decision, or -1 when the flow is done. */
export function firstPendingIndex(
  steps: readonly PermissionId[],
  outcomes: Readonly<Partial<Record<PermissionId, PermissionOutcome>>>,
  seen: ReadonlySet<PermissionId>,
): number {
  return steps.findIndex((id) => needsAttention(id, outcomes[id] ?? 'undetermined', seen));
}
