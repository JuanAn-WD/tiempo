import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import { Screen } from '@/components/screen';
import { Badge, BrandMark, Card } from '@/components/ui';
import { FontFamily, Palette, Radius, Type } from '@/constants/theme';
import { useTiempo } from '@/context/tiempo-store';
import { useI18n } from '@/i18n';
import {
  ACHIEVEMENT_IDS,
  ACHIEVEMENT_MARK,
  LEVELS,
  MAX_GOAL_MINUTES,
  MIN_GOAL_MINUTES,
  computeStreak,
  deviceOffsetMinutes,
  levelProgress,
  stepGoalMinutes,
  weeklySummary,
} from '@/lib/gamification';
import { ACHIEVEMENT_BODY, ACHIEVEMENT_TITLE, LEVEL_NAME } from '@/lib/gamification-copy';
import { useNow } from '@/lib/use-now';

function Meter({
  ratio,
  label,
}: {
  ratio: number;
  label: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(ratio * 100)));
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      style={styles.track}>
      <View style={[styles.fill, { width: `${pct}%` }]} />
    </View>
  );
}

export default function LogrosScreen() {
  const { state, setFocusGoalMinutes } = useTiempo();
  const { locale, t } = useI18n();
  const progress = state.gamification;
  const now = useNow(progress);
  const offset = deviceOffsetMinutes(now);
  const level = levelProgress(progress.xp);
  const streak = computeStreak(progress, now, offset);
  const week = weeklySummary(progress, now, offset);
  const levelName = t(LEVEL_NAME[level.id]);
  const nextLevel = LEVELS.find((item) => item.minXp === level.nextXp);
  const nextName = nextLevel ? t(LEVEL_NAME[nextLevel.id]) : null;
  const unlockedCount = ACHIEVEMENT_IDS.filter((id) => progress.unlocked[id] != null).length;
  const goal = progress.goalMinutes;
  const todayRatio = goal <= 0 ? 0 : Math.min(1, streak.todayMinutes / goal);

  return (
    <Screen scroll>
      <View style={styles.topBar}>
        <BrandMark size={20} />
        <Badge label={t('gamification.kicker')} tone="accent" />
      </View>
      <Text style={styles.title}>{t('gamification.title')}</Text>

      <Card style={styles.levelCard}>
        <Text style={styles.kicker}>{t('gamification.level', { level: level.level })}</Text>
        <Text style={styles.levelName}>{levelName}</Text>
        <Text style={styles.xp}>{t('gamification.xp', { count: progress.xp })}</Text>
        <Meter ratio={level.ratio} label={t('gamification.level', { level: level.level })} />
        <Text style={styles.meta}>
          {level.nextXp == null || nextName == null
            ? t('gamification.maxLevel')
            : t('gamification.xpToNext', { count: level.nextXp - progress.xp, name: nextName })}
        </Text>
        <Text style={styles.rules}>{t('gamification.rules')}</Text>
      </Card>

      <Card style={styles.block}>
        <Text style={styles.kicker}>{t('gamification.streak')}</Text>
        <Text style={styles.streakValue}>
          {t(streak.streak === 1 ? 'gamification.streakOne' : 'gamification.streakCount', {
            count: streak.streak,
          })}
        </Text>
        <Text style={styles.meta}>
          {streak.todayMet
            ? t('gamification.todayMet')
            : t('gamification.today', { done: streak.todayMinutes, goal })}
        </Text>
        <Meter
          ratio={todayRatio}
          label={t('gamification.today', { done: streak.todayMinutes, goal })}
        />
        <Text style={styles.comodin}>
          {streak.comodinUsedThisWeek ? t('gamification.comodinUsed') : t('gamification.comodinAvailable')}
        </Text>
        <Text style={styles.rules}>{t('gamification.comodinHint')}</Text>
      </Card>

      <Card style={styles.block}>
        <Text style={styles.kicker}>{t('gamification.weekly')}</Text>
        <View style={styles.weekRow}>
          <View style={styles.weekStat}>
            <Text style={styles.weekValue}>{week.focusMinutes}</Text>
            <Text style={styles.weekLabel}>{t('gamification.weeklyFocus')}</Text>
          </View>
          <View style={styles.weekStat}>
            <Text style={styles.weekValue}>{week.xp}</Text>
            <Text style={styles.weekLabel}>{t('gamification.weeklyXp')}</Text>
          </View>
          <View style={styles.weekStat}>
            <Text style={styles.weekValue}>{week.resisted}</Text>
            <Text style={styles.weekLabel}>{t('gamification.weeklyResisted')}</Text>
          </View>
        </View>
        <Text style={styles.meta}>
          {t(week.daysMet === 1 ? 'gamification.weeklyDaysOne' : 'gamification.weeklyDays', {
            count: week.daysMet,
          })}
        </Text>
      </Card>

      <Card style={styles.block}>
        <Text style={styles.goalLabel}>
          {t('gamification.goal')} <Text style={styles.goalValue}>{goal}</Text>
        </Text>
        <View style={styles.stepRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('gamification.goalDown')}
            accessibilityState={{ disabled: goal <= MIN_GOAL_MINUTES }}
            disabled={goal <= MIN_GOAL_MINUTES}
            style={[styles.stepBtn, goal <= MIN_GOAL_MINUTES && styles.stepBtnOff]}
            onPress={() => setFocusGoalMinutes(stepGoalMinutes(goal, -1))}>
            <Text style={styles.stepTxt}>−</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('gamification.goalUp')}
            accessibilityState={{ disabled: goal >= MAX_GOAL_MINUTES }}
            disabled={goal >= MAX_GOAL_MINUTES}
            style={[styles.stepBtn, goal >= MAX_GOAL_MINUTES && styles.stepBtnOff]}
            onPress={() => setFocusGoalMinutes(stepGoalMinutes(goal, 1))}>
            <Text style={styles.stepTxt}>+</Text>
          </Pressable>
        </View>
      </Card>

      <View style={styles.sectionRow}>
        <Text style={styles.section}>{t('gamification.badges')}</Text>
        <Text style={styles.sectionMeta}>
          {t('gamification.unlockedCount', { count: unlockedCount, total: ACHIEVEMENT_IDS.length })}
        </Text>
      </View>
      <View style={styles.grid}>
        {ACHIEVEMENT_IDS.map((id) => {
          const when = progress.unlocked[id];
          const open = when != null;
          const title = t(ACHIEVEMENT_TITLE[id]);
          const body = t(ACHIEVEMENT_BODY[id]);
          return (
            <View
              key={id}
              accessible
              accessibilityLabel={open ? `${title}. ${body}` : `${title}. ${t('gamification.locked')}`}
              style={[styles.badge, open && styles.badgeOn]}>
              <View style={[styles.badgeMark, open && styles.badgeMarkOn]}>
                <Text style={[styles.badgeMarkText, open && styles.badgeMarkTextOn]}>{ACHIEVEMENT_MARK[id]}</Text>
              </View>
              <Text style={[styles.badgeTitle, !open && styles.badgeTitleOff]}>{title}</Text>
              <Text style={styles.badgeBody} numberOfLines={3}>
                {body}
              </Text>
              <Text style={styles.badgeState}>
                {open
                  ? new Date(when).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
                  : t('gamification.locked')}
              </Text>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  title: {
    ...Type.displayL,
    color: Palette.ink,
    marginBottom: 20,
  },
  levelCard: {
    marginBottom: 12,
    backgroundColor: Palette.accentSoft,
    borderColor: 'rgba(212,146,58,0.28)',
  },
  block: {
    marginBottom: 12,
  },
  kicker: {
    ...Type.kicker,
    color: Palette.accentBright,
  },
  levelName: {
    ...Type.displayL,
    color: Palette.ink,
    marginTop: 8,
  },
  xp: {
    ...Type.mono,
    fontSize: 15,
    lineHeight: 20,
    color: Palette.ink,
    marginTop: 4,
    marginBottom: 12,
  },
  track: {
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: Palette.surfaceHigh,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.full,
    backgroundColor: Palette.accent,
  },
  meta: {
    ...Type.body,
    color: Palette.muted,
    marginTop: 10,
  },
  rules: {
    ...Type.caption,
    color: Palette.faintText,
    marginTop: 8,
  },
  streakValue: {
    ...Type.displayL,
    color: Palette.ink,
    marginTop: 6,
  },
  comodin: {
    ...Type.label,
    color: Palette.ink,
    marginTop: 14,
  },
  weekRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  weekStat: {
    flex: 1,
  },
  weekValue: {
    ...Type.mono,
    fontSize: 22,
    lineHeight: 28,
    color: Palette.ink,
  },
  weekLabel: {
    ...Type.caption,
    color: Palette.muted,
    marginTop: 2,
  },
  goalLabel: {
    ...Type.body,
    color: Palette.muted,
  },
  goalValue: {
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
  stepBtnOff: {
    opacity: 0.4,
  },
  stepTxt: {
    fontFamily: FontFamily.uiSemibold,
    fontSize: 22,
    lineHeight: 26,
    color: Palette.ink,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 10,
  },
  section: {
    ...Type.labelBold,
    color: Palette.ink,
  },
  sectionMeta: {
    ...Type.caption,
    color: Palette.faintText,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    paddingBottom: 12,
  },
  badge: {
    width: '48.5%',
    backgroundColor: Palette.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.line,
    padding: 14,
  },
  badgeOn: {
    borderColor: 'rgba(212,146,58,0.4)',
    backgroundColor: Palette.bgElevated,
  },
  badgeMark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surfaceHigh,
  },
  badgeMarkOn: {
    backgroundColor: Palette.accentSoft,
  },
  badgeMarkText: {
    ...Type.captionBold,
    color: Palette.faintText,
  },
  badgeMarkTextOn: {
    color: Palette.accentBright,
  },
  badgeTitle: {
    ...Type.label,
    color: Palette.ink,
    marginTop: 10,
  },
  badgeTitleOff: {
    color: Palette.muted,
  },
  badgeBody: {
    ...Type.caption,
    color: Palette.muted,
    marginTop: 4,
  },
  badgeState: {
    ...Type.caption,
    color: Palette.faintText,
    marginTop: 8,
  },
});
