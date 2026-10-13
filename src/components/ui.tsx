import { type ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { Palette, Radius, Spacing } from '@/constants/theme';

export function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <Text style={[styles.brand, { fontSize: size }]}>
      apartag<Text style={styles.brandDot}>.</Text>
    </Text>
  );
}

export function Kicker({
  children,
  tone = 'muted',
}: {
  children: ReactNode;
  tone?: 'muted' | 'accent' | 'focus';
}) {
  return (
    <Text
      style={[
        styles.kicker,
        tone === 'accent' && { color: Palette.accentBright },
        tone === 'focus' && { color: Palette.focus },
      ]}>
      {children}
    </Text>
  );
}

export function Heading({ children, style }: { children: ReactNode; style?: TextStyle }) {
  return <Text style={[styles.heading, style]}>{children}</Text>;
}

export function Body({ children, style }: { children: ReactNode; style?: TextStyle }) {
  return <Text style={[styles.body, style]}>{children}</Text>;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'accent' | 'focus' | 'danger';
}) {
  return (
    <View
      style={[
        styles.badge,
        tone === 'accent' && styles.badgeAccent,
        tone === 'focus' && styles.badgeFocus,
        tone === 'danger' && styles.badgeDanger,
      ]}>
      <View
        style={[
          styles.badgeDot,
          tone === 'accent' && { backgroundColor: Palette.accent },
          tone === 'focus' && { backgroundColor: Palette.focus },
          tone === 'danger' && { backgroundColor: Palette.danger },
        ]}
      />
      <Text
        style={[
          styles.badgeText,
          tone === 'accent' && { color: Palette.accentBright },
          tone === 'focus' && { color: Palette.focus },
          tone === 'danger' && { color: Palette.danger },
        ]}>
        {label}
      </Text>
    </View>
  );
}

export function StatTile({
  value,
  label,
  emphasize,
}: {
  value: string;
  label: string;
  emphasize?: boolean;
}) {
  return (
    <Card style={[styles.stat, emphasize && styles.statEmph]}>
      <Text style={[styles.statValue, emphasize && styles.statValueEmph]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  brand: {
    fontWeight: '700',
    letterSpacing: -1,
    color: Palette.ink,
  },
  brandDot: {
    color: Palette.accent,
  },
  kicker: {
    color: Palette.muted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontSize: 11,
    fontWeight: '700',
  },
  heading: {
    marginTop: 10,
    fontSize: 32,
    lineHeight: 38,
    color: Palette.ink,
    fontWeight: '600',
    letterSpacing: -0.9,
  },
  body: {
    marginTop: 10,
    fontSize: 16,
    lineHeight: 24,
    color: Palette.muted,
  },
  card: {
    backgroundColor: Palette.surface,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: Palette.line,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: Radius.full,
    backgroundColor: Palette.surfaceHigh,
    borderWidth: 1,
    borderColor: Palette.line,
  },
  badgeAccent: {
    backgroundColor: Palette.accentSoft,
    borderColor: 'rgba(212,146,58,0.28)',
  },
  badgeFocus: {
    backgroundColor: Palette.focusSoft,
    borderColor: 'rgba(110,231,176,0.28)',
  },
  badgeDanger: {
    backgroundColor: Palette.dangerSoft,
    borderColor: 'rgba(224,112,96,0.28)',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Palette.faint,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Palette.muted,
    letterSpacing: 0.8,
  },
  stat: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  statEmph: {
    backgroundColor: Palette.accentSoft,
    borderColor: 'rgba(212,146,58,0.25)',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Palette.ink,
    letterSpacing: -0.6,
    fontVariant: ['tabular-nums'],
  },
  statValueEmph: {
    color: Palette.accentBright,
  },
  statLabel: {
    marginTop: 6,
    color: Palette.muted,
    fontSize: 12,
    fontWeight: '600',
  },
});
