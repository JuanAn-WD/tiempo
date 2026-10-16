import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Text } from '@/components/app-text';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { Palette, Radius, Type } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { BADGE_MARK, LEVELS } from '@/lib/gamification';
import { BADGE_TITLE, LEVEL_NAME, PURPOSE_NAME, formatRecovered } from '@/lib/gamification-copy';
import { takeSessionClose, type SessionClose } from '@/lib/session-close';

export default function SessionDone() {
  const router = useRouter();
  const { t } = useI18n();
  const [close] = useState<SessionClose | null>(() => takeSessionClose());
  const scale = useSharedValue(1);
  const celebrate = close != null && (close.levelUp != null || close.badges.length > 0 || close.rewardCompleted);

  useEffect(() => {
    if (!celebrate) return;
    scale.value = 0.92;
    scale.value = withSpring(1, { damping: 14, stiffness: 160 });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [celebrate, scale]);

  const markStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const counted = close?.countedMinutes ?? 0;
  const week = close?.weekMinutes ?? 0;
  const time = formatRecovered(t, counted);
  const weekTime = formatRecovered(t, week);

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const share = () => {
    void Share.share({
      message: t('gamification.session.shareMessage', { time, week: weekTime }),
    });
  };

  return (
    <Screen tabPadding={false}>
      <Text style={styles.kicker}>{t('gamification.session.title')}</Text>
      <Animated.View style={markStyle}>
        <Text style={styles.time}>{counted > 0 ? time : t('gamification.session.short')}</Text>
      </Animated.View>
      {counted > 0 ? <Text style={styles.lead}>{t('gamification.session.recovered', { time })}</Text> : null}
      <Text style={styles.week}>{t('gamification.session.week', { time: weekTime })}</Text>
      {close?.purpose && week > 0 ? (
        <Text style={styles.purpose}>
          {t('gamification.purposeLine', { time: weekTime, purpose: t(PURPOSE_NAME[close.purpose]) })}
        </Text>
      ) : null}
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
});
