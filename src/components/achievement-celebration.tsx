import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Text } from '@/components/app-text';
import { Palette, Radius, Type } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { ACHIEVEMENT_IDS, ACHIEVEMENT_MARK, type AchievementId } from '@/lib/gamification';
import { ACHIEVEMENT_BODY, ACHIEVEMENT_TITLE } from '@/lib/gamification-copy';
import { subscribeUnlocks } from '@/lib/gamification-feed';
import { notifyAchievement } from '@/lib/gamification-notify';

const DISMISS_MS = 3600;

export function AchievementCelebration() {
  const { t } = useI18n();
  const [queue, setQueue] = useState<AchievementId[]>([]);
  const [reduceMotion, setReduceMotion] = useState(false);
  const current = queue[0];
  const scale = useSharedValue(1);

  useEffect(() => subscribeUnlocks((ids) => {
    setQueue((existing) => {
      const seen = new Set(existing);
      const next = [...existing];
      for (const id of ids) {
        if (!ACHIEVEMENT_IDS.includes(id) || seen.has(id)) continue;
        seen.add(id);
        next.push(id);
      }
      return next.length === existing.length ? existing : next;
    });
  }), []);

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
      return;
    }
    scale.value = 0.92;
    scale.value = withSpring(1, { damping: 16, stiffness: 220 });
  }, [current, reduceMotion, scale]);

  useEffect(() => {
    if (!current) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    void notifyAchievement({
      title: t('gamification.notifyTitle', { title: t(ACHIEVEMENT_TITLE[current]) }),
      body: t(ACHIEVEMENT_BODY[current]),
      channelName: t('gamification.channel'),
    });
  }, [current, t]);

  const dismiss = useCallback(() => {
    setQueue((existing) => existing.slice(1));
  }, []);

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => {
      setQueue((existing) => (existing[0] === current ? existing.slice(1) : existing));
    }, DISMISS_MS);
    return () => clearTimeout(timer);
  }, [current]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!current) return null;
  const title = t(ACHIEVEMENT_TITLE[current]);
  const body = t(ACHIEVEMENT_BODY[current]);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('gamification.celebrationDismiss')}
          style={StyleSheet.absoluteFill}
          onPress={dismiss}
        />
        <Animated.View style={[styles.card, cardStyle]}>
          <Text style={styles.kicker}>{t('gamification.kicker')}</Text>
          <View
            accessible
            accessibilityLiveRegion="polite"
            accessibilityLabel={`${title}. ${body}`}
            style={styles.copy}>
            <View style={styles.mark}>
              <Text style={styles.markText}>{ACHIEVEMENT_MARK[current]}</Text>
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.body}>{body}</Text>
          </View>
          {queue.length > 1 ? (
            <Text style={styles.progress}>
              {t('gamification.celebrationProgress', { index: 1, total: queue.length })}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('gamification.celebrationDismiss')}
            style={styles.button}
            onPress={dismiss}>
            <Text style={styles.buttonLabel}>{t('gamification.celebrationDismiss')}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(7,6,5,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Palette.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(212,146,58,0.45)',
    padding: 24,
  },
  kicker: {
    ...Type.kicker,
    color: Palette.accentBright,
  },
  copy: {
    alignItems: 'center',
    marginTop: 18,
  },
  mark: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.accentSoft,
    borderWidth: 1,
    borderColor: 'rgba(212,146,58,0.4)',
  },
  markText: {
    ...Type.title,
    color: Palette.accentBright,
  },
  title: {
    ...Type.displayL,
    color: Palette.ink,
    textAlign: 'center',
    marginTop: 16,
  },
  body: {
    ...Type.body,
    color: Palette.muted,
    textAlign: 'center',
    marginTop: 8,
  },
  progress: {
    ...Type.caption,
    color: Palette.faintText,
    textAlign: 'center',
    marginTop: 16,
  },
  button: {
    marginTop: 18,
    minHeight: 48,
    borderRadius: Radius.full,
    backgroundColor: Palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    ...Type.label,
    color: Palette.accentText,
  },
});
