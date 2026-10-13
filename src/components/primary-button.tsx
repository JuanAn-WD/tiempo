import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Palette, Radius } from '@/constants/theme';

type Props = {
  label: string;
  onPress: () => void;
  onLongPress?: () => void;
  accessibilityHint?: string;
  muted?: boolean;
  danger?: boolean;
  disabled?: boolean;
};

export function PrimaryButton({
  label,
  onPress,
  onLongPress,
  accessibilityHint,
  muted,
  danger,
  disabled,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      onLongPress={
        onLongPress
          ? () => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              onLongPress();
            }
          : undefined
      }
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        muted && !danger && styles.muted,
        danger && !muted && styles.danger,
        muted && danger && styles.mutedDanger,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      {danger ? <View style={styles.dangerDot} /> : null}
      <Text style={[styles.label, muted && styles.mutedLabel, danger && styles.dangerLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: Palette.accent,
    paddingVertical: 17,
    paddingHorizontal: 22,
    borderRadius: Radius.full,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    minHeight: 54,
  },
  muted: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Palette.lineStrong,
  },
  danger: {
    backgroundColor: Palette.dangerSoft,
    borderWidth: 1,
    borderColor: 'rgba(224,112,96,0.4)',
  },
  mutedDanger: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(224,112,96,0.45)',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.35,
  },
  label: {
    color: Palette.accentText,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  mutedLabel: {
    color: Palette.ink,
  },
  dangerLabel: {
    color: Palette.danger,
  },
  dangerDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Palette.danger,
  },
});
