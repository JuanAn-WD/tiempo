import { useFocusEffect } from 'expo-router';
import { useCallback, useSyncExternalStore } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import { Card } from '@/components/ui';
import { Palette, Type } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { platformLimitKey } from '@/lib/blocked-attempts';
import {
  getAttemptsSnapshot,
  refreshBlockedAttempts,
  subscribeAttempts,
} from '@/lib/blocked-attempts-sync';

const VISIBLE_RECENT = 3;

function formatWhen(ms: number, locale: string) {
  return new Date(ms).toLocaleString(locale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Free stats card. Every install sees it; Pro is not required.
 * The number is the shareable part. The caption states what this phone can
 * actually count.
 */
export function BlockedAttemptsCard() {
  const { locale, t } = useI18n();
  const { ledger, limit, hydrated } = useSyncExternalStore(
    subscribeAttempts,
    getAttemptsSnapshot,
    getAttemptsSnapshot,
  );

  useFocusEffect(
    useCallback(() => {
      void refreshBlockedAttempts();
    }, []),
  );

  const count = ledger.total;
  const formatted = count.toLocaleString(locale);
  const limitKey = platformLimitKey(limit);
  const recent = ledger.recent.slice(0, VISIBLE_RECENT);

  function share() {
    const message = t(count === 1 ? 'attempts.shareMessageOne' : 'attempts.shareMessage', { count: formatted });
    void Share.share({ message }).catch(() => undefined);
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.kicker}>{t('attempts.title')}</Text>
      <Text style={styles.figure}>{hydrated ? formatted : t('common.dash')}</Text>
      <Text style={styles.body}>{hydrated && count === 0 ? t('attempts.empty') : t('attempts.body')}</Text>
      <Text style={styles.limit}>{t(limitKey)}</Text>
      {hydrated && recent.length > 0 ? (
        <View style={styles.recent}>
          <Text style={styles.recentTitle}>{t('attempts.recent')}</Text>
          {recent.map((item) => (
            <Text key={`${item.interceptedAt}:${item.appName ?? ''}`} style={styles.recentRow} numberOfLines={1}>
              {item.appName ?? t('attempts.unnamed')}
              <Text style={styles.recentWhen}> · {formatWhen(item.interceptedAt, locale)}</Text>
            </Text>
          ))}
        </View>
      ) : null}
      {hydrated && count > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('attempts.share')}
          style={styles.share}
          onPress={share}>
          <Text style={styles.shareLabel}>{t('attempts.share')}</Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  kicker: {
    ...Type.kicker,
    color: Palette.muted,
  },
  figure: {
    ...Type.displayL,
    color: Palette.accentBright,
    fontVariant: ['tabular-nums'],
    marginTop: 8,
  },
  body: {
    ...Type.body,
    color: Palette.muted,
    marginTop: 6,
  },
  limit: {
    ...Type.caption,
    color: Palette.faintText,
    marginTop: 8,
  },
  recent: {
    marginTop: 14,
    gap: 4,
  },
  recentTitle: {
    ...Type.captionBold,
    color: Palette.ink,
    marginBottom: 2,
  },
  recentRow: {
    ...Type.body,
    color: Palette.ink,
  },
  recentWhen: {
    ...Type.caption,
    color: Palette.faintText,
  },
  share: {
    minHeight: 44,
    marginTop: 8,
    alignSelf: 'flex-start',
    justifyContent: 'center',
  },
  shareLabel: {
    ...Type.label,
    color: Palette.ink,
  },
});
