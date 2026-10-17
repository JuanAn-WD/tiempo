import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Text } from '@/components/app-text';
import { PrimaryButton } from '@/components/primary-button';
import { ProgressGarden } from '@/components/progress-garden';
import { ShareCard } from '@/components/share-card';
import { Screen } from '@/components/screen';
import { Palette, Radius, Type } from '@/constants/theme';
import { usePro } from '@/context/pro-store';
import { useI18n } from '@/i18n';
import { BADGE_MARK, FREE_PLANT, FREE_SKY, LEVELS } from '@/lib/gamification';
import { BADGE_TITLE, LEVEL_NAME, PURPOSE_NAME, formatRecovered } from '@/lib/gamification-copy';
import { shareProgressImage } from '@/lib/share-progress';
import { takeSessionClose, type SessionClose } from '@/lib/session-close';

export default function SessionDone() {
  const router = useRouter();
  const { t } = useI18n();
  const { isPro } = usePro();
  const [close] = useState<SessionClose | null>(() => takeSessionClose());
  const shotRef = useRef<View>(null);
  const scale = useSharedValue(1);
  const celebrate =
    close != null && (close.levelUp != null || close.badges.length > 0 || close.rewardCompleted || close.treesCompleted > 0);

  useEffect(() => {
    if (!celebrate) return;
    scale.value = 0.92;
    scale.value = withSpring(1, { damping: 14, stiffness: 160 });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [celebrate, scale]);

  const markStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const counted = close?.countedMinutes ?? 0;
  const week = close?.weekMinutes ?? 0;
  const streak = close?.streak ?? 0;
  const time = formatRecovered(t, counted);
  const weekTime = formatRecovered(t, week);
  const planted = close != null && (close.growth > 0 || close.treesCompleted > 0 || counted > 0);
  const plant = isPro ? (close?.plant ?? FREE_PLANT) : FREE_PLANT;
  const sky = isPro ? (close?.sky ?? FREE_SKY) : FREE_SKY;
  const streakLabel = t(streak === 1 ? 'gamification.streakOne' : 'gamification.streak', { count: streak });

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const share = () => {
    void shareProgressImage(
      shotRef,
      t('gamification.session.shareMessage', { time, week: weekTime, streak }),
      t('gamification.session.share'),
    );
  };

  return (
    <Screen tabPadding={false}>
      <View pointerEvents="none" style={styles.offscreen}>
        <ShareCard
          ref={shotRef}
          planted={planted}
          growth={close?.growth ?? 0}
          mode={close?.mode ?? null}
          plant={plant}
          sky={sky}
          brand={t('gamification.session.shareBrand')}
          streak={streakLabel}
          week={t('gamification.session.shareWeek', { time: weekTime })}
          tagline={t('gamification.session.shareTag')}
        />
      </View>
      <Text style={styles.kicker}>{t('gamification.session.title')}</Text>
      <ProgressGarden
        growth={close?.growth ?? 0}
        planted={planted}
        mode={close?.mode ?? null}
        plant={plant}
        sky={sky}
        label={t('gamification.gardenLabel')}
        caption={t('gamification.tagline')}
      />
      <Animated.View style={markStyle}>
        <Text style={styles.time}>{counted > 0 ? time : t('gamification.session.short')}</Text>
      </Animated.View>
      {counted > 0 ? <Text style={styles.lead}>{t('gamification.session.recovered', { time })}</Text> : null}
      <Text style={styles.week}>{t('gamification.session.week', { time: weekTime })}</Text>
      <Text style={styles.week}>{streakLabel}</Text>
      {close?.purpose && week > 0 ? (
        <Text style={styles.purpose}>
          {t('gamification.purposeLine', { time: weekTime, purpose: t(PURPOSE_NAME[close.purpose]) })}
        </Text>
      ) : null}
      {close && close.treesCompleted > 0 ? <Text style={styles.note}>{t('gamification.forestJoined')}</Text> : null}
      {close?.levelUp ? (
        <Text style={styles.note}>
          {t('gamification.reached', {
            name: t(LEVEL_NAME[close.levelUp]),
            time: formatRecovered(t, LEVELS.find((level) => level.id === close.levelUp)?.minMinutes ?? 0),
          })}
        </Text>
      ) : null}
      {close?.badges.map((id) => (
        <View key={id} style={styles.badge}>
          <Text style={styles.badgeMark}>{BADGE_MARK[id]}</Text>
          <Text style={styles.badgeTitle}>{t(BADGE_TITLE[id])}</Text>
        </View>
      ))}
      {close?.rewardCompleted ? (
        <Text style={styles.note}>
          {t('gamification.reward.done')}
          {close.rewardText ? ` · ${close.rewardText}` : ''}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <PrimaryButton label={t('gamification.session.done')} onPress={leave} />
        <PrimaryButton muted label={t('gamification.session.share')} onPress={share} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: {
    ...Type.kicker,
    color: Palette.accentBright,
    marginTop: 12,
  },
  time: {
    ...Type.displayL,
    color: Palette.ink,
    marginTop: 18,
  },
  lead: {
    ...Type.bodyL,
    color: Palette.ink,
    marginTop: 8,
  },
  week: {
    ...Type.bodyL,
    color: Palette.muted,
    marginTop: 6,
  },
  purpose: {
    ...Type.body,
    color: Palette.accentBright,
    marginTop: 10,
  },
  note: {
    ...Type.body,
    color: Palette.ink,
    marginTop: 16,
  },
  badge: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Radius.lg,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
  },
  badgeMark: {
    ...Type.captionBold,
    color: Palette.accentBright,
    width: 36,
  },
  badgeTitle: {
    ...Type.label,
    color: Palette.ink,
    flex: 1,
  },
  actions: {
    marginTop: 28,
    gap: 10,
  },
  offscreen: {
    position: 'absolute',
    left: -1200,
    top: 0,
  },
});
