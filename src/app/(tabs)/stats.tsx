import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import { Screen } from '@/components/screen';
import { BrandMark, Card } from '@/components/ui';
import { FontFamily, Palette, Radius, Type } from '@/constants/theme';
import { useTiempo } from '@/context/tiempo-store';
import { useI18n } from '@/i18n';
import { formatDuration, MODES, yearsFromDailyHours } from '@/lib/storage';

function Stepper({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.sliderLabel}>
        {label} <Text style={styles.sliderValue}>{display}</Text>
      </Text>
      <View style={styles.stepRow}>
        <Pressable style={styles.stepBtn} onPress={() => onChange(Math.max(min, +(value - step).toFixed(1)))}>
          <Text style={styles.stepTxt}>−</Text>
        </Pressable>
        <Pressable style={styles.stepBtn} onPress={() => onChange(Math.min(max, +(value + step).toFixed(1)))}>
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
  const [hours, setHours] = useState(5);
  const years = useMemo(() => yearsFromDailyHours(hours, age), [age, hours]);

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

      <Card style={styles.yearsCard}>
        <Text style={styles.cardTitle}>{t('stats.pace')}</Text>
        <Text style={styles.years}>{years.toFixed(1)}</Text>
        <Text style={styles.yearsUnit}>{t('stats.years')}</Text>
        <Stepper label={t('stats.age')} value={age} display={`${age}`} min={14} max={70} step={1} onChange={setAge} />
        <Stepper
          label={t('stats.hours')}
          value={hours}
          display={hours.toFixed(1)}
          min={0.5}
          max={12}
          step={0.5}
          onChange={setHours}
        />
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
    marginBottom: 16,
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
    width: 48,
    height: 40,
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
