import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/app-text';
import { PrimaryButton } from '@/components/primary-button';
import { Palette, Radius, Type } from '@/constants/theme';
import { usePro } from '@/context/pro-store';
import { useTiempo } from '@/context/tiempo-store';
import { useI18n } from '@/i18n';
import {
  BADGE_IDS,
  BADGE_MARK,
  FREE_PLANT,
  FREE_SKY,
  MODE_IDS,
  PLANT_IDS,
  PURPOSE_IDS,
  SKY_IDS,
  addDays,
  challengeSnapshot,
  computeStreak,
  deviceOffsetMinutes,
  rewardSnapshot,
  stepGoalMinutes,
  weeklyProgress,
  type PlantId,
  type SkyId,
} from '@/lib/gamification';
import {
  BADGE_BODY,
  BADGE_TITLE,
  PLANT_NAME,
  PURPOSE_NAME,
  SKY_NAME,
  formatRecovered,
} from '@/lib/gamification-copy';
import { MODES, formatDuration } from '@/lib/storage';
import { fruitWeekCount } from '@/lib/tree-growth';
import { useNow } from '@/lib/use-now';

/** History and the controls that used to fill Progreso. Swipe up to reach it. */
export function TreeSheet() {
  const { state, setFocusGoalMinutes, setReward, setChallenge, setPurpose, setPlant, setSky } = useTiempo();
  const { isPro, requirePro } = usePro();
  const { locale, t } = useI18n();
  const progress = state.gamification;
  const now = useNow(progress);
  const offset = deviceOffsetMinutes(now);
  const week = weeklyProgress(progress, now, offset);
  const streak = computeStreak(progress, now, offset);
  const reward = rewardSnapshot(progress);
  const challenge = challengeSnapshot(progress, now, offset);
  const shownPlant = isPro ? progress.plant : FREE_PLANT;
  const shownSky = isPro ? progress.sky : FREE_SKY;
  const yesterday = progress.days[addDays(week.todayKey, -1)]?.attempts ?? 0;
  const todayAttempts = progress.days[week.todayKey]?.attempts ?? 0;
  const showAttempts = progress.attemptsNoted > 0 || todayAttempts > 0 || yesterday > 0;
  const modeMax = Math.max(1, ...MODE_IDS.map((id) => week.modes[id] ?? 0));
  const fruits = fruitWeekCount(progress);
  const sessions = state.sessions.slice(0, 8);

  const [rewardOpen, setRewardOpen] = useState(false);
  const [rewardHours, setRewardHours] = useState(progress.reward?.hours ?? 10);
  const [rewardText, setRewardText] = useState(progress.reward?.text ?? '');
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [challengeText, setChallengeText] = useState(progress.challenge?.text ?? '');
  const [challengeMode, setChallengeMode] = useState(progress.challenge?.mode ?? state.mode);
  const [challengeTarget, setChallengeTarget] = useState(progress.challenge?.target ?? 3);

  const choosePlant = (plant: PlantId) => {
    if (plant !== FREE_PLANT && !isPro) {
      requirePro();
      return;
    }
    setPlant(plant);
  };
  const chooseSky = (sky: SkyId) => {
    if (sky !== FREE_SKY && !isPro) {
      requirePro();
      return;
    }
    setSky(sky);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.handle}>{t('gamification.tree.history')}</Text>

      <Text style={styles.section}>{t('gamification.tree.sessions')}</Text>
      {sessions.length === 0 ? (
        <Text style={styles.note}>{t('gamification.tree.sessionsEmpty')}</Text>
      ) : (
        sessions.map((session) => {
          const mode = MODES.find((item) => item.id === session.mode);
          return (
            <View key={session.startedAt} style={styles.session}>
              <Text style={styles.sessionTitle}>{mode ? t(mode.titleKey) : session.mode}</Text>
              <Text style={styles.sessionTime}>{formatDuration(Math.max(0, session.endedAt - session.startedAt), locale)}</Text>
            </View>
          );
        })
      )}

      <Text style={styles.section}>{t('gamification.tree.fruitsTitle')}</Text>
      <Text style={styles.note}>
        {fruits === 0
          ? t('gamification.tree.fruitsEmpty')
          : t(fruits === 1 ? 'gamification.tree.fruitsCountOne' : 'gamification.tree.fruitsCount', { count: fruits })}
      </Text>

      <Text style={styles.section}>{t('gamification.weekly')}</Text>
      <Text style={styles.weekLine}>{t('gamification.weekOf', { done: week.daysMet })}</Text>
      <View style={styles.dots}>
        {week.days.map((day) => (
          <View
            key={day.key}
            accessibilityLabel={`${day.key} ${day.status}`}
            style={[
              styles.dot,
              day.status === 'met' && styles.dotMet,
              day.status === 'today' && styles.dotToday,
              day.status === 'grace' && styles.dotGrace,
              day.status === 'pause' && styles.dotPause,
            ]}
          />
        ))}
      </View>
      <Text style={styles.note}>{streak.graceAvailable ? t('gamification.graceLeft') : t('gamification.graceSpent')}</Text>
      <Text style={styles.note}>{t('gamification.streakHint')}</Text>

      <View style={styles.goalRow}>
        <Text style={styles.goalLabel}>
          {t('gamification.goal')} <Text style={styles.goalValue}>{progress.goalMinutes}</Text>
        </Text>
        <View style={styles.stepper}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('gamification.goalDown')}
            onPress={() => setFocusGoalMinutes(stepGoalMinutes(progress.goalMinutes, -1))}
            style={styles.step}>
            <Text style={styles.stepText}>−</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('gamification.goalUp')}
            onPress={() => setFocusGoalMinutes(stepGoalMinutes(progress.goalMinutes, 1))}
            style={styles.step}>
            <Text style={styles.stepText}>+</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.section}>{t('gamification.modes')}</Text>
      {MODE_IDS.every((id) => (week.modes[id] ?? 0) === 0) ? (
        <Text style={styles.note}>{t('gamification.modesEmpty')}</Text>
      ) : (
        MODE_IDS.map((id) => {
          const minutes = week.modes[id] ?? 0;
          const title = MODES.find((item) => item.id === id);
          return (
            <View key={id} style={styles.modeRow}>
              <Text style={styles.modeName}>{title ? t(title.titleKey) : id}</Text>
              <View style={styles.modeTrack}>
                <View style={[styles.modeFill, { width: `${Math.round((minutes / modeMax) * 100)}%` }]} />
              </View>
              <Text style={styles.modeTime}>{formatRecovered(t, minutes)}</Text>
            </View>
          );
        })
      )}

      {showAttempts ? (
        <Text style={styles.attempts}>
          {t(todayAttempts === 1 ? 'gamification.attemptsOne' : 'gamification.attempts', {
            today: todayAttempts,
            yesterday,
          })}
        </Text>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.kicker}>{t('gamification.reward.title')}</Text>
        {reward && !rewardOpen ? (
          <>
            <Text style={styles.cardTitle}>{reward.text}</Text>
            <Text style={styles.note}>
              {reward.completed
                ? t('gamification.reward.done')
                : t('gamification.reward.progress', {
                    done: formatRecovered(t, reward.gainedMinutes),
                    target: formatRecovered(t, reward.targetMinutes),
                  })}
            </Text>
          </>
        ) : (
          <Text style={styles.note}>{t('gamification.reward.hint')}</Text>
        )}
        {rewardOpen ? (
          <View style={styles.form}>
            <View style={styles.goalRow}>
              <Text style={styles.goalValue}>{t('gamification.reward.hours', { count: rewardHours })}</Text>
              <View style={styles.stepper}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('gamification.reward.hoursDown')}
                  onPress={() => setRewardHours((value) => Math.max(1, value - 1))}
                  style={styles.step}>
                  <Text style={styles.stepText}>−</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('gamification.reward.hoursUp')}
                  onPress={() => setRewardHours((value) => Math.min(500, value + 1))}
                  style={styles.step}>
                  <Text style={styles.stepText}>+</Text>
                </Pressable>
              </View>
            </View>
            <TextInput
              value={rewardText}
              onChangeText={setRewardText}
              placeholder={t('gamification.reward.placeholder')}
              placeholderTextColor={Palette.faintText}
              maxLength={80}
              style={styles.input}
            />
            <PrimaryButton
              label={t('gamification.reward.save')}
              onPress={() => {
                setReward(rewardHours, rewardText);
                setRewardOpen(false);
              }}
            />
          </View>
        ) : (
          <View style={styles.form}>
            <PrimaryButton
              muted={Boolean(reward)}
              label={t('gamification.reward.title')}
              onPress={() => setRewardOpen(true)}
            />
            {reward ? <PrimaryButton muted label={t('gamification.reward.clear')} onPress={() => setReward(null)} /> : null}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.kicker}>{t('gamification.challenge.title')}</Text>
        <Text style={styles.note}>{t('gamification.challenge.hint')}</Text>
        {challenge && !challengeOpen ? (
          <Text style={styles.cardTitle}>
            {challenge.text}
            {' · '}
            {challenge.met
              ? t('gamification.challenge.met')
              : t('gamification.challenge.progress', { done: challenge.days, target: challenge.target })}
          </Text>
        ) : null}
        {challengeOpen ? (
          <View style={styles.form}>
            <View style={styles.chips}>
              {MODES.map((item) => {
                const on = item.id === challengeMode;
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    onPress={() => setChallengeMode(item.id)}
                    style={[styles.chip, on && styles.chipOn]}>
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{t(item.titleKey)}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.goalRow}>
              <Text style={styles.goalValue}>{t('gamification.challenge.target', { count: challengeTarget })}</Text>
              <View style={styles.stepper}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('gamification.challenge.targetDown')}
                  onPress={() => setChallengeTarget((value) => Math.max(1, value - 1))}
                  style={styles.step}>
                  <Text style={styles.stepText}>−</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('gamification.challenge.targetUp')}
                  onPress={() => setChallengeTarget((value) => Math.min(7, value + 1))}
                  style={styles.step}>
                  <Text style={styles.stepText}>+</Text>
                </Pressable>
              </View>
            </View>
            <TextInput
              value={challengeText}
              onChangeText={setChallengeText}
              placeholder={t('gamification.challenge.placeholder')}
              placeholderTextColor={Palette.faintText}
              maxLength={80}
              style={styles.input}
            />
            <PrimaryButton
              label={t('gamification.challenge.save')}
              onPress={() => {
                setChallenge(challengeText, challengeMode, challengeTarget);
                setChallengeOpen(false);
              }}
            />
          </View>
        ) : (
          <View style={styles.form}>
            <PrimaryButton
              muted={Boolean(challenge)}
              label={t('gamification.challenge.title')}
              onPress={() => setChallengeOpen(true)}
            />
            {challenge ? (
              <PrimaryButton muted label={t('gamification.challenge.clear')} onPress={() => setChallenge(null)} />
            ) : null}
          </View>
        )}
      </View>

      <Text style={styles.section}>{t('gamification.purpose.title')}</Text>
      <View style={styles.chips}>
        {PURPOSE_IDS.map((id) => {
          const on = progress.purpose === id;
          return (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => setPurpose(on ? null : id)}
              style={[styles.chip, on && styles.chipOn]}>
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{t(PURPOSE_NAME[id])}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.section}>{t('gamification.badges')}</Text>
      <Text style={styles.note}>
        {t('gamification.unlockedCount', {
          count: BADGE_IDS.filter((id) => progress.unlocked[id] != null).length,
          total: BADGE_IDS.length,
        })}
      </Text>
      <View style={styles.badgeGrid}>
        {BADGE_IDS.map((id) => {
          const open = progress.unlocked[id] != null;
          return (
            <View key={id} style={[styles.badge, !open && styles.badgeLocked]}>
              <Text style={styles.badgeMark}>{BADGE_MARK[id]}</Text>
              <Text style={styles.badgeTitle}>{t(BADGE_TITLE[id])}</Text>
              <Text style={styles.badgeBody}>{open ? t(BADGE_BODY[id]) : t('gamification.locked')}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.card}>
        <Text style={styles.kicker}>{t('gamification.cosmetics.title')}</Text>
        <Text style={styles.note}>{t('gamification.cosmetics.body')}</Text>
        <Text style={styles.note}>
          {t('gamification.tree.thisTree', {
            name: t(PLANT_NAME[isPro || progress.sprout === FREE_PLANT ? progress.sprout : FREE_PLANT]),
          })}
        </Text>
        <Text style={styles.note}>{t('gamification.tree.nextSeed', { name: t(PLANT_NAME[shownPlant]) })}</Text>
        <Text style={styles.note}>{t('gamification.tree.speciesNote')}</Text>
        <Text style={styles.modeName}>{t('gamification.cosmetics.plant')}</Text>
        <View style={styles.chips}>
          {PLANT_IDS.map((id) => {
            const on = shownPlant === id;
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => choosePlant(id)}
                style={[styles.chip, on && styles.chipOn]}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{t(PLANT_NAME[id])}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.modeName}>{t('gamification.cosmetics.sky')}</Text>
        <Text style={styles.note}>{t('gamification.tree.skyNote')}</Text>
        <View style={styles.chips}>
          {SKY_IDS.map((id) => {
            const on = shownSky === id;
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => chooseSky(id)}
                style={[styles.chip, on && styles.chipOn]}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{t(SKY_NAME[id])}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
  },
  handle: {
    ...Type.kicker,
    color: Palette.muted,
    textAlign: 'center',
    marginTop: 18,
  },
  section: {
    ...Type.label,
    color: Palette.ink,
    marginTop: 22,
  },
  note: {
    ...Type.body,
    color: Palette.muted,
    marginTop: 6,
  },
  weekLine: {
    ...Type.bodyL,
    color: Palette.ink,
    marginTop: 8,
  },
  session: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Radius.lg,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  sessionTitle: {
    ...Type.label,
    color: Palette.ink,
    flex: 1,
  },
  sessionTime: {
    ...Type.caption,
    color: Palette.muted,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Palette.surfaceHigh,
    borderWidth: 1,
    borderColor: Palette.lineStrong,
  },
  dotMet: {
    backgroundColor: Palette.accent,
    borderColor: Palette.accent,
  },
  dotToday: {
    backgroundColor: 'transparent',
    borderColor: Palette.accentBright,
  },
  dotGrace: {
    backgroundColor: Palette.focus,
    borderColor: Palette.focus,
  },
  dotPause: {
    backgroundColor: 'transparent',
    borderColor: Palette.muted,
  },
  goalRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goalLabel: {
    ...Type.body,
    color: Palette.muted,
  },
  goalValue: {
    ...Type.label,
    color: Palette.ink,
  },
  stepper: {
    flexDirection: 'row',
    gap: 8,
  },
  step: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surfaceHigh,
  },
  stepText: {
    ...Type.label,
    color: Palette.ink,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  modeName: {
    ...Type.caption,
    color: Palette.ink,
    width: 72,
    marginTop: 10,
  },
  modeTrack: {
    flex: 1,
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: Palette.surfaceHigh,
    overflow: 'hidden',
  },
  modeFill: {
    height: '100%',
    backgroundColor: Palette.focus,
  },
  modeTime: {
    ...Type.caption,
    color: Palette.muted,
    width: 72,
    textAlign: 'right',
  },
  attempts: {
    ...Type.body,
    color: Palette.muted,
    marginTop: 16,
  },
  card: {
    marginTop: 18,
    padding: 16,
    borderRadius: Radius.xl,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    gap: 8,
  },
  kicker: {
    ...Type.kicker,
    color: Palette.accentBright,
  },
  cardTitle: {
    ...Type.label,
    color: Palette.ink,
  },
  form: {
    gap: 10,
    marginTop: 8,
  },
  input: {
    ...Type.body,
    color: Palette.ink,
    backgroundColor: Palette.bg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.lineStrong,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    backgroundColor: Palette.surfaceHigh,
    borderWidth: 1,
    borderColor: Palette.line,
  },
  chipOn: {
    backgroundColor: Palette.accentSoft,
    borderColor: Palette.accent,
  },
  chipText: {
    ...Type.caption,
    color: Palette.muted,
  },
  chipTextOn: {
    color: Palette.accentBright,
  },
  badgeGrid: {
    gap: 8,
    marginTop: 10,
  },
  badge: {
    padding: 12,
    borderRadius: Radius.lg,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
  },
  badgeLocked: {
    opacity: 0.55,
  },
  badgeMark: {
    ...Type.captionBold,
    color: Palette.accentBright,
  },
  badgeTitle: {
    ...Type.label,
    color: Palette.ink,
    marginTop: 2,
  },
  badgeBody: {
    ...Type.caption,
    color: Palette.muted,
    marginTop: 2,
  },
});
