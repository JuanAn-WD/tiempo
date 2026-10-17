import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Text } from '@/components/app-text';
import { Palette, Radius, Type } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { BADGE_MARK, LEVELS } from '@/lib/gamification';
import { BADGE_BODY, BADGE_TITLE, LEVEL_NAME, formatRecovered } from '@/lib/gamification-copy';
import { subscribeCelebrations, celebrationKey, type Celebration } from '@/lib/gamification-feed';

const DISMISS_MS = 3200;

export function AchievementCelebration() {
  const { t } = useI18n();
  const [queue, setQueue] = useState<Celebration[]>([]);
  const [reduceMotion, setReduceMotion] = useState(false);
  const current = queue[0];
  const scale = useSharedValue(1);

  useEffect(
    () =>
      subscribeCelebrations((items) => {
        setQueue((existing) => {
          const seen = new Set(existing.map((item) => celebrationKey(item)));
          const next = [...existing];
          for (const item of items) {
            const key = celebrationKey(item);
            if (seen.has(key)) continue;
            seen.add(key);
            next.push(item);
          }
          return next.length === existing.length ? existing : next;
        });
      }),
    [],
  );

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (alive) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!current) return;
    if (reduceMotion) {
      scale.value = 1;
    } else {
      scale.value = 0.86;
      scale.value = withSpring(1, { damping: 14, stiffness: 180 });
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const timer = setTimeout(() => {
      setQueue((existing) => existing.slice(1));
    }, DISMISS_MS);
    return () => clearTimeout(timer);
  }, [current, reduceMotion, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  if (!current) return null;

  const title =
    current.kind === 'forest'
      ? t('gamification.forestJoined')
      : current.kind === 'level'
        ? t('gamification.reached', {
            name: t(LEVEL_NAME[current.id]),
            time: formatRecovered(t, LEVELS.find((level) => level.id === current.id)?.minMinutes ?? 0),
          })
        : t(BADGE_TITLE[current.id]);
  const body =
    current.kind === 'forest'
      ? t('gamification.tagline')
      : current.kind === 'level'
        ? t('gamification.levelNote')
        : t(BADGE_BODY[current.id]);
  const mark =
    current.kind === 'forest' ? '↑' : current.kind === 'level' ? t(LEVEL_NAME[current.id]).slice(0, 1) : BADGE_MARK[current.id];

  return (
    <Modal transparent visible animationType="fade" onRequestClose={() => setQueue((existing) => existing.slice(1))}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('gamification.celebrationDismiss')}
        onPress={() => setQueue((existing) => existing.slice(1))}
        style={styles.backdrop}>
        <Animated.View style={[styles.card, style]}>
          <Text style={styles.kicker}>{t('gamification.kicker')}</Text>
          <View style={styles.mark}>
            <Text style={styles.markText}>{mark}</Text>
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('gamification.celebrationDismiss')}
            onPress={() => setQueue((existing) => existing.slice(1))}
            style={styles.button}>
            <Text style={styles.buttonLabel}>{t('gamification.celebrationDismiss')}</Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(11,10,9,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Palette.bgElevated,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Palette.lineStrong,
    padding: 24,
    alignItems: 'center',
  },
  kicker: {
    ...Type.kicker,
    color: Palette.accentBright,
  },
  mark: {
    marginTop: 16,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.accentSoft,
  },
  markText: {
    ...Type.labelBold,
    color: Palette.accentBright,
  },
  title: {
    ...Type.title,
    color: Palette.ink,
    textAlign: 'center',
    marginTop: 14,
  },
  body: {
    ...Type.body,
    color: Palette.muted,
    textAlign: 'center',
    marginTop: 8,
  },
  button: {
    marginTop: 18,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  buttonLabel: {
    ...Type.labelBold,
    color: Palette.accentBright,
  },
});
