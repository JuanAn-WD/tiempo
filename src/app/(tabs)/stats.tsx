import { useEffect, useMemo, useState } from 'react';
import { AppState, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import { BlockedAttemptsCard } from '@/components/blocked-attempts-card';
import { DeviceOnlyNotice } from '@/components/device-only-notice';
import { Screen } from '@/components/screen';
import { BrandMark, Card } from '@/components/ui';
import { FontFamily, Palette, Radius, Type } from '@/constants/theme';
import { useTiempo } from '@/context/tiempo-store';
import { useI18n } from '@/i18n';
import type { TranslationKey } from '@/i18n/translate';
import { openUsagePermission } from '@/lib/blocker';
import {
  formatOneDecimal,
  resolveCalculator,
  stepHours,
  yearsFromDailyHours,
  type CalculatorSource,
} from '@/lib/screen-years';
import { formatDuration, MODES } from '@/lib/storage';
import { readTodayUsage, type UsageReading } from '@/lib/usage-today';

const MANUAL_HOURS = 5;

const SOURCE_KEY: Record<Exclude<CalculatorSource, 'pending'>, TranslationKey> = {
  ios: 'stats.sourceIos',
  manual: 'stats.sourceManual',
  unavailable: 'stats.sourceUnavailable',
  denied: 'stats.sourceDenied',
  empty: 'stats.sourceEmpty',
  measured: 'stats.sourceMeasured',
  capped: 'stats.sourceCapped',
};

function Stepper({
  label,
  value,
  decreaseLabel,
  increaseLabel,
  onDecrease,
  onIncrease,
}: {
  label: string;
  value: string;
  decreaseLabel: string;
  increaseLabel: string;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.sliderLabel}>
        {label} <Text style={styles.sliderValue}>{value}</Text>
      </Text>
      <View style={styles.stepRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={decreaseLabel}
          style={styles.stepBtn}
          onPress={onDecrease}>
          <Text style={styles.stepTxt}>−</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={increaseLabel}
          style={styles.stepBtn}
          onPress={onIncrease}>
          <Text style={styles.stepTxt}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function StatsScreen() {
  const { state } = useTiempo();
  const { locale, t } = useI18n();
  const last = state.sessions.slice(0, 8);
  const [age, setAge] = useState(30);
  const [overrideHours, setOverrideHours] = useState<number | null>(null);
  const [reading, setReading] = useState<UsageReading>({ status: 'pending' });

  useEffect(() => {
    let alive = true;
    const load = () => {
      void readTodayUsage().then((next) => {
        if (alive) setReading(next);
      });
    };
    load();
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') load();
    });
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);

  const platform = Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web';
  const resolved = useMemo(
    () =>
      resolveCalculator({
        platform,
        reading: reading.status,
        totalMs: reading.status === 'ready' ? reading.totalMs : 0,
        overrideHours,
        manualHours: MANUAL_HOURS,
      }),
    [overrideHours, platform, reading],
  );
  const years = yearsFromDailyHours(resolved.hours, age);
  const yearsLabel = formatOneDecimal(years, locale);
  const hoursLabel = formatOneDecimal(resolved.hours, locale);
  const rawLabel = formatOneDecimal(resolved.rawHours ?? resolved.hours, locale);
  const sourceKey = resolved.source === 'pending' ? null : SOURCE_KEY[resolved.source];
  const sourceHours = resolved.source === 'capped' ? rawLabel : hoursLabel;

  return (
    <Screen scroll>
      <View style={styles.topBar}>
        <BrandMark size={20} />
      </View>

      <Text style={styles.title}>{t('stats.title')}</Text>

      <Card style={styles.hero}>
        <Text style={styles.heroLabel}>{t('stats.reclaimed')}</Text>
        <Text style={styles.heroValue}>{formatDuration(state.recoveredMs, locale)}</Text>
        <Text style={styles.heroMeta}>
          {t(state.sessions.length === 1 ? 'stats.sessionsOne' : 'stats.sessions', {
            count: state.sessions.length,
          })}
        </Text>
      </Card>

      <BlockedAttemptsCard />

      <Card style={styles.yearsCard}>
        <Text style={styles.cardTitle}>{t('stats.pace')}</Text>
        <Text style={styles.years}>{yearsLabel}</Text>
        <Text style={styles.yearsUnit}>{t('stats.years')}</Text>
        <Text style={styles.basis}>{t('stats.basis')}</Text>
        {sourceKey ? (
          <Text style={styles.source}>{t(sourceKey, { hours: sourceHours })}</Text>
        ) : null}
        <DeviceOnlyNotice notice="usage" />
        <Stepper
          label={t('stats.age')}
          value={`${age}`}
          decreaseLabel={t('stats.ageDown')}
          increaseLabel={t('stats.ageUp')}
          onDecrease={() => setAge((current) => Math.max(14, current - 1))}
          onIncrease={() => setAge((current) => Math.min(70, current + 1))}
        />
        <Stepper
          label={t('stats.hours')}
          value={hoursLabel}
          decreaseLabel={t('stats.hoursDown')}
          increaseLabel={t('stats.hoursUp')}
          onDecrease={() => setOverrideHours(stepHours(resolved.hours, -1))}
          onIncrease={() => setOverrideHours(stepHours(resolved.hours, 1))}
        />
        {resolved.canUseToday ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('stats.useToday')}
            style={styles.textBtn}
            onPress={() => setOverrideHours(null)}>
            <Text style={styles.textBtnLabel}>{t('stats.useToday')}</Text>
          </Pressable>
        ) : null}
        {resolved.canRequestUsage ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('stats.openUsage')}
            style={styles.textBtn}
            onPress={() => {
              void openUsagePermission();
            }}>
            <Text style={styles.textBtnLabel}>{t('stats.openUsage')}</Text>
          </Pressable>
        ) : null}
      </Card>

      <Text style={styles.section}>{t('stats.section')}</Text>
      {last.length === 0 ? (
        <Card>
          <Text style={styles.emptyTitle}>{t('stats.emptyTitle')}</Text>
          <Text style={styles.empty}>{t('stats.emptyBody')}</Text>
        </Card>
      ) : (
        <View style={styles.sessionList}>
          {last.map((session) => {
            const mode = MODES.find((item) => item.id === session.mode);
            return (
              <Card key={session.startedAt} style={styles.sessionRow}>
                <View>
                  <Text style={styles.rowTitle}>{mode ? t(mode.titleKey) : session.mode}</Text>
                  {session.emergency ? <Text style={styles.emergencyLabel}>{t('stats.emergency')}</Text> : null}
                  <Text style={styles.rowDate}>
                    {new Date(session.startedAt).toLocaleDateString(locale, {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                <Text style={styles.rowMeta}>{formatDuration(session.endedAt - session.startedAt, locale)}</Text>
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    marginBottom: 18,
  },
  title: {
    ...Type.displayL,
    color: Palette.ink,
    marginBottom: 20,
  },
  hero: {
    marginBottom: 12,
    backgroundColor: Palette.accentSoft,
    borderColor: 'rgba(212,146,58,0.28)',
  },
  heroLabel: {
    ...Type.kicker,
    color: Palette.accentBright,
  },
  heroValue: {
    ...Type.displayXl,
    marginTop: 10,
    color: Palette.ink,
  },
  heroMeta: {
    ...Type.body,
    marginTop: 6,
    color: Palette.muted,
  },
  yearsCard: {
    marginBottom: 24,
  },
  cardTitle: {
    ...Type.labelBold,
    color: Palette.ink,
  },
  years: {
    ...Type.displayXl,
    marginTop: 12,
    color: Palette.accentBright,
  },
  yearsUnit: {
    ...Type.body,
    color: Palette.muted,
  },
  basis: {
    ...Type.body,
    color: Palette.muted,
    marginTop: 8,
  },
  source: {
    ...Type.caption,
    color: Palette.muted,
    marginTop: 4,
  },
  stepper: {
    marginTop: 10,
  },
  sliderLabel: {
    ...Type.body,
    color: Palette.muted,
  },
  sliderValue: {
    ...Type.mono,
    fontSize: 15,
    lineHeight: 22,
    color: Palette.ink,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  stepBtn: {
    minWidth: 48,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    backgroundColor: Palette.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.line,
  },
  stepTxt: {
    fontFamily: FontFamily.uiSemibold,
    fontSize: 22,
    lineHeight: 26,
    color: Palette.ink,
  },
  textBtn: {
    minHeight: 44,
    marginTop: 12,
    alignSelf: 'flex-start',
    justifyContent: 'center',
  },
  textBtnLabel: {
    ...Type.label,
    color: Palette.ink,
  },
  section: {
    ...Type.labelBold,
    color: Palette.ink,
    marginBottom: 10,
  },
  emptyTitle: {
    ...Type.labelBold,
    color: Palette.ink,
    marginBottom: 4,
  },
  empty: {
    ...Type.body,
    color: Palette.muted,
  },
  sessionList: {
    gap: 8,
    paddingBottom: 20,
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rowTitle: {
    ...Type.labelBold,
    textTransform: 'capitalize',
    color: Palette.ink,
  },
  emergencyLabel: {
    ...Type.captionBold,
    color: Palette.danger,
    marginTop: 2,
  },
  rowDate: {
    ...Type.caption,
    color: Palette.faintText,
    marginTop: 3,
  },
  rowMeta: {
    ...Type.mono,
    fontSize: 15,
    lineHeight: 20,
    color: Palette.accentBright,
  },
});
