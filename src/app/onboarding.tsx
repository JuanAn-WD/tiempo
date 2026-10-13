import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FocusOrb } from '@/components/focus-orb';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { BrandMark } from '@/components/ui';
import { Palette, Radius } from '@/constants/theme';
import { useTiempo } from '@/context/tiempo-store';
import { useI18n, type TranslationKey } from '@/i18n';
import { openAndroidPermissionScreens } from '@/lib/blocker';

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
  const { pairTag, pairSpareTag, completeOnboarding, requestPermissions, nfcSupported, state } =
    useTiempo();
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const current = STEP_ORDER[step];

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
            <PrimaryButton
              label={t('onboarding.permissions')}
              onPress={() => {
                void requestPermissions();
                void openAndroidPermissionScreens();
              }}
            />
            <PrimaryButton muted label={t('onboarding.enter')} onPress={() => void completeOnboarding()} />
          </>
        )}
      </View>
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
    color: Palette.faint,
    fontWeight: '700',
    fontSize: 12,
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
    color: Palette.accentBright,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    fontSize: 11,
    fontWeight: '800',
  },
  title: {
    marginTop: 12,
    fontSize: 34,
    lineHeight: 40,
    color: Palette.ink,
    fontWeight: '600',
    letterSpacing: -1,
  },
  body: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
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
    fontSize: 64,
    fontWeight: '700',
    color: Palette.accentBright,
    letterSpacing: -2,
  },
  bigLabel: {
    color: Palette.muted,
    fontSize: 15,
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
    color: Palette.accentText,
    fontWeight: '800',
  },
  stepLine: {
    color: Palette.ink,
    fontSize: 16,
    fontWeight: '600',
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
    color: Palette.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    gap: 10,
    marginBottom: 8,
  },
});
