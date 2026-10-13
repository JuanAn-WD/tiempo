import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import { DeviceOnlyNotice } from '@/components/device-only-notice';
import { FocusOrb } from '@/components/focus-orb';
import { NfcNotice } from '@/components/nfc-notice';
import { PermissionExplainer } from '@/components/permission-explainer';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { BrandMark } from '@/components/ui';
import { Palette, Radius, Type } from '@/constants/theme';
import { useTiempo } from '@/context/tiempo-store';
import { useI18n, type TranslationKey } from '@/i18n';
import { usePermissionRecord } from '@/lib/permission-ack';
import { openPermissionSettings } from '@/lib/permission-actions';
import { outcomeFromNfc } from '@/lib/permission-flow';

const STEP_ORDER = ['cost', 'key', 'pair'] as const;

const STEP_COPY = {
  cost: {
    kicker: 'onboarding.cost.kicker',
    title: 'onboarding.cost.title',
    body: 'onboarding.cost.body',
  },
  key: {
    kicker: 'onboarding.key.kicker',
    title: 'onboarding.key.title',
    body: 'onboarding.key.body',
  },
  pair: {
    kicker: 'onboarding.pair.kicker',
    title: 'onboarding.pair.title',
    body: 'onboarding.pair.body',
  },
} as const satisfies Record<
  (typeof STEP_ORDER)[number],
  { kicker: TranslationKey; title: TranslationKey; body: TranslationKey }
>;

function StepVisual({ kind }: { kind: (typeof STEP_ORDER)[number] }) {
  const { t } = useI18n();
  if (kind === 'cost') {
    return (
      <View style={styles.visualCard}>
        <Text style={styles.bigNum}>{t('onboarding.hours')}</Text>
        <Text style={styles.bigLabel}>{t('onboarding.daily')}</Text>
        <View style={styles.bars}>
          {[0.35, 0.55, 0.7, 0.9, 0.65, 0.8, 0.45].map((h, i) => (
            <View key={i} style={[styles.bar, { height: 18 + h * 54 }]} />
          ))}
        </View>
      </View>
    );
  }
  if (kind === 'key') {
    const lines = [t('onboarding.stepChoose'), t('onboarding.stepScan'), t('onboarding.stepPresent')];
    return (
      <View style={styles.visualCard}>
        {lines.map((line, i) => (
          <View key={line} style={styles.stepRow}>
            <LinearGradient
              colors={[Palette.accent, Palette.accentBright]}
              style={styles.stepNum}>
              <Text style={styles.stepNumText}>{i + 1}</Text>
            </LinearGradient>
            <Text style={styles.stepLine}>{line}</Text>
          </View>
        ))}
      </View>
    );
  }
  return null;
}

export default function Onboarding() {
  const router = useRouter();
  const { pairTag, pairSpareTag, completeOnboarding, nfcSupported, nfcEnabled, nfcNotice, state } = useTiempo();
  const { t } = useI18n();
  const { record, ready: permissionsReady, markSeen, markAttempted } = usePermissionRecord();
  const [step, setStep] = useState(0);
  const current = STEP_ORDER[step];
  const holdPair = current === 'pair' && !permissionsReady;
  const explainNfc = current === 'pair' && permissionsReady && !record.seen.includes('nfc');
  const nfcSnapshot = outcomeFromNfc({ supported: nfcSupported, enabled: nfcEnabled });

  return (
    <Screen tabPadding={false}>
      <View style={styles.top}>
        <BrandMark />
        <Text style={styles.stepCount}>
          {step + 1} / {STEP_ORDER.length}
        </Text>
      </View>

      <View style={styles.dots}>
        {STEP_ORDER.map((id, i) => (
          <View key={id} style={[styles.dot, i <= step && styles.dotOn]} />
        ))}
      </View>
      <DeviceOnlyNotice notice="preview" />

      {holdPair ? (
        <View style={styles.tag} />
      ) : explainNfc ? (
        <View style={styles.tag}>
          <PermissionExplainer
            id="nfc"
            outcome={nfcSnapshot.outcome}
            canAskAgain={nfcSnapshot.canAskAgain}
            onRequest={() => {
              void markSeen('nfc');
            }}
            onContinue={() => {
              void markSeen('nfc');
            }}
            onOpenSettings={() => {
              void markAttempted('nfc');
              void openPermissionSettings('nfc');
            }}
            onSkip={() => setStep(step - 1)}
            skipLabel={t('onboarding.back')}
          />
        </View>
      ) : (
        <>
      <Text style={styles.kicker}>{t(STEP_COPY[current].kicker)}</Text>
      <Text style={styles.title}>{t(STEP_COPY[current].title)}</Text>
      <Text style={styles.body}>{t(STEP_COPY[current].body)}</Text>

      {step === 2 ? (
        <View style={styles.tag}>
          <FocusOrb
            locked={false}
            hint={
              state.tagId
                ? t('onboarding.ready', { id: state.tagId.slice(0, 12) })
                : __DEV__
                  ? nfcSupported
                    ? t('onboarding.hintDevNfc')
                    : t('onboarding.hintDev')
                  : nfcSupported
                    ? t('onboarding.hintNfc')
                    : t('onboarding.hintNoNfc')
            }
            onPress={() => void pairTag()}
            onLongPress={__DEV__ ? () => void pairTag('DEMO-TAG') : undefined}
          />
          <NfcNotice
            scope={['pair', 'spare']}
            onRetry={() => {
              if (nfcNotice?.scope === 'spare') void pairSpareTag();
              else void pairTag();
            }}
          />
          {state.tagId ? (
            <View style={styles.spare}>
              <Text style={styles.spareHint}>
                {state.spareTagId ? t('onboarding.spareReady') : t('onboarding.spareAsk')}
              </Text>
              {state.spareTagId ? null : (
                <>
                  <PrimaryButton
                    muted
                    label={t('onboarding.spareAdd')}
                    onPress={() => void pairSpareTag()}
                    onLongPress={__DEV__ ? () => void pairSpareTag('DEMO-SPARE') : undefined}
                  />
                  {__DEV__ ? (
                    <PrimaryButton
                      muted
                      label={t('onboarding.spareSimulate')}
                      onPress={() => void pairSpareTag('DEMO-SPARE')}
                    />
                  ) : null}
                </>
              )}
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.visualWrap}>
          <StepVisual kind={current} />
        </View>
      )}

      <View style={styles.actions}>
        {step < 2 ? (
          <>
            <PrimaryButton label={t('onboarding.continue')} onPress={() => setStep(step + 1)} />
            {step > 0 ? <PrimaryButton muted label={t('onboarding.back')} onPress={() => setStep(step - 1)} /> : null}
          </>
        ) : (
          <>
            <PrimaryButton label={t('onboarding.permissions')} onPress={() => router.push('/permissions')} />
            <PrimaryButton muted label={t('onboarding.enter')} onPress={() => void completeOnboarding()} />
          </>
        )}
      </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  stepCount: {
    ...Type.captionBold,
    color: Palette.faintText,
    letterSpacing: 1,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 28,
  },
  dot: {
    flex: 1,
    height: 3,
    borderRadius: Radius.full,
    backgroundColor: Palette.surfaceHigh,
  },
  dotOn: {
    backgroundColor: Palette.accent,
  },
  kicker: {
    ...Type.kicker,
    color: Palette.accentBright,
    letterSpacing: 1.4,
  },
  title: {
    ...Type.displayL,
    marginTop: 12,
    color: Palette.ink,
  },
  body: {
    ...Type.bodyL,
    marginTop: 12,
    color: Palette.muted,
  },
  visualWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  visualCard: {
    backgroundColor: Palette.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Palette.line,
    padding: 22,
    gap: 14,
  },
  bigNum: {
    ...Type.displayXl,
    color: Palette.accentBright,
  },
  bigLabel: {
    ...Type.body,
    color: Palette.muted,
    marginTop: -8,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    height: 80,
    marginTop: 8,
  },
  bar: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: Palette.accentSoft,
    borderWidth: 1,
    borderColor: 'rgba(212,146,58,0.25)',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 8,
  },
  stepNum: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    ...Type.labelBold,
    color: Palette.accentText,
  },
  stepLine: {
    ...Type.label,
    color: Palette.ink,
  },
  tag: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
  },
  spare: {
    gap: 8,
  },
  spareHint: {
    ...Type.body,
    color: Palette.muted,
    textAlign: 'center',
  },
  actions: {
    gap: 10,
    marginBottom: 8,
  },
});
