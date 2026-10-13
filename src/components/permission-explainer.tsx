import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import { PrimaryButton } from '@/components/primary-button';
import { Badge } from '@/components/ui';
import { Palette, Type } from '@/constants/theme';
import { useI18n, type TranslationKey } from '@/i18n';
import {
  explainerAction,
  settingsTarget,
  type ExplainerAction,
  type PermissionId,
  type PermissionOutcome,
} from '@/lib/permission-flow';

const COPY = {
  nfc: {
    title: 'permissions.item.nfc.title',
    body: 'permissions.item.nfc.body',
    denied: 'permissions.item.nfc.denied',
    unavailable: 'permissions.item.nfc.unavailable',
    allow: 'permissions.item.nfc.allow',
  },
  screenTime: {
    title: 'permissions.item.screenTime.title',
    body: 'permissions.item.screenTime.body',
    denied: 'permissions.item.screenTime.denied',
    unavailable: 'permissions.item.screenTime.unavailable',
    allow: 'permissions.item.screenTime.allow',
  },
  usage: {
    title: 'permissions.item.usage.title',
    body: 'permissions.item.usage.body',
    denied: 'permissions.item.usage.denied',
    unavailable: 'permissions.item.usage.unavailable',
    allow: 'permissions.item.usage.allow',
  },
  overlay: {
    title: 'permissions.item.overlay.title',
    body: 'permissions.item.overlay.body',
    denied: 'permissions.item.overlay.denied',
    unavailable: 'permissions.item.overlay.unavailable',
    allow: 'permissions.item.overlay.allow',
  },
  accessibility: {
    title: 'permissions.item.accessibility.title',
    body: 'permissions.item.accessibility.body',
    denied: 'permissions.item.accessibility.denied',
    unavailable: 'permissions.item.accessibility.unavailable',
    allow: 'permissions.item.accessibility.allow',
  },
  notifications: {
    title: 'permissions.item.notifications.title',
    body: 'permissions.item.notifications.body',
    denied: 'permissions.item.notifications.denied',
    unavailable: 'permissions.item.notifications.unavailable',
    allow: 'permissions.item.notifications.allow',
  },
  camera: {
    title: 'permissions.item.camera.title',
    body: 'permissions.item.camera.body',
    denied: 'permissions.item.camera.denied',
    unavailable: 'permissions.item.camera.unavailable',
    allow: 'permissions.item.camera.allow',
  },
} as const satisfies Record<
  PermissionId,
  { title: TranslationKey; body: TranslationKey; denied: TranslationKey; unavailable: TranslationKey; allow: TranslationKey }
>;

const STATUS_KEY: Record<PermissionOutcome, TranslationKey> = {
  granted: 'permissions.granted',
  denied: 'permissions.denied',
  undetermined: 'permissions.missing',
  unavailable: 'permissions.unavailable',
  notUsed: 'permissions.notUsed',
};

type Props = {
  id: PermissionId;
  outcome: PermissionOutcome;
  canAskAgain: boolean;
  busy?: boolean;
  index?: number;
  total?: number;
  onRequest: () => void;
  onOpenSettings: () => void;
  onContinue: () => void;
  onSkip?: () => void;
  skipLabel?: string;
};

function primaryLabel(
  action: ExplainerAction,
  outcome: PermissionOutcome,
  allow: string,
  openSettings: string,
  continueLabel: string,
  understood: string,
): string {
  if (action === 'acknowledge') return understood;
  if (action === 'continue') return continueLabel;
  if (action === 'settings' && outcome === 'denied') return openSettings;
  return allow;
}

export function PermissionExplainer({
  id,
  outcome,
  canAskAgain,
  busy,
  index,
  total,
  onRequest,
  onOpenSettings,
  onContinue,
  onSkip,
  skipLabel,
}: Props) {
  const { t } = useI18n();
  const copy = COPY[id];
  const action = explainerAction(id, outcome, canAskAgain);
  const tone = outcome === 'granted' ? 'focus' : outcome === 'denied' ? 'danger' : 'neutral';
  const label = primaryLabel(
    action,
    outcome,
    t(copy.allow),
    t('permissions.openSettings'),
    t('permissions.continue'),
    t('permissions.understood'),
  );

  const onPrimary = () => {
    if (busy) return;
    if (action === 'settings') onOpenSettings();
    else if (action === 'request') onRequest();
    else onContinue();
  };

  return (
    <View style={styles.root}>
      <Text style={styles.kicker}>{t('permissions.kicker')}</Text>
      {typeof index === 'number' && typeof total === 'number' ? (
        <Text style={styles.progress}>{t('permissions.progress', { current: index + 1, total })}</Text>
      ) : null}
      <Text style={styles.title}>{t(copy.title)}</Text>
      <Text style={styles.body}>{t(copy.body)}</Text>
      <View style={styles.status}>
        <Badge label={t(STATUS_KEY[outcome])} tone={tone} />
      </View>
      {outcome === 'denied' ? <Text style={styles.denied}>{t(copy.denied)}</Text> : null}
      {outcome === 'unavailable' ? <Text style={styles.note}>{t(copy.unavailable)}</Text> : null}
      <View style={styles.actions}>
        <PrimaryButton label={label} onPress={onPrimary} disabled={busy} />
        {outcome === 'denied' && action !== 'settings' && settingsTarget(id) !== 'none' ? (
          <PrimaryButton muted label={t('permissions.openSettings')} onPress={onOpenSettings} disabled={busy} />
        ) : null}
        {onSkip ? <PrimaryButton muted label={skipLabel ?? t('permissions.notNow')} onPress={onSkip} disabled={busy} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 12,
  },
  kicker: {
    ...Type.kicker,
    color: Palette.accentBright,
  },
  progress: {
    ...Type.caption,
    color: Palette.faintText,
  },
  title: {
    ...Type.displayL,
    color: Palette.ink,
  },
  body: {
    ...Type.bodyL,
    color: Palette.muted,
  },
  status: {
    marginTop: 4,
  },
  denied: {
    ...Type.body,
    color: Palette.danger,
  },
  note: {
    ...Type.body,
    color: Palette.muted,
  },
  actions: {
    gap: 10,
    paddingTop: 20,
  },
});
