import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Palette, Radius } from '@/constants/theme';

type Props = {
  locked: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  hint: string;
  clock?: string;
};

export function FocusOrb({ locked, onPress, onLongPress, hint, clock }: Props) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: locked ? 2200 : 3200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [locked, pulse]);

  const ringOuter = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, locked ? 1.08 : 1.04]) }],
    opacity: interpolate(pulse.value, [0, 1], [0.35, locked ? 0.7 : 0.5]),
  }));

  const ringMid = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, locked ? 1.05 : 1.025]) }],
    opacity: interpolate(pulse.value, [0, 1], [0.45, 0.75]),
  }));

  return (
    <View style={styles.wrap}>
      <View style={styles.stage}>
        <Animated.View style={[styles.halo, locked ? styles.haloFocus : styles.haloIdle, ringOuter]} />
        <Animated.View style={[styles.haloMid, locked ? styles.haloFocus : styles.haloIdle, ringMid]} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={locked ? 'Desbloquear con tag' : 'Bloquear con tag'}
          onPress={onPress}
          onLongPress={onLongPress}
          delayLongPress={380}
          style={({ pressed }) => [styles.press, pressed && styles.pressed]}>
          <LinearGradient
            colors={
              locked
                ? ['#2A4035', '#15241C', Palette.focus, '#1C2E24']
                : ['#3A2E22', '#181410', Palette.accentBright, '#241C14']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ring}>
            <View style={styles.inner}>
              <Text style={styles.wordmark}>
                apartag<Text style={{ color: locked ? Palette.focus : Palette.accent }}>.</Text>
              </Text>
              {clock ? (
                <Text style={[styles.clock, locked && styles.clockLock]}>{clock}</Text>
              ) : (
                <View style={[styles.pill, locked && styles.pillLock]}>
                  <View style={[styles.dot, locked && styles.dotLock]} />
                  <Text style={[styles.status, locked && styles.statusLock]}>
                    {locked ? 'en foco' : 'tocar · tag'}
                  </Text>
                </View>
              )}
            </View>
          </LinearGradient>
        </Pressable>
      </View>
      <Text style={styles.hint}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 20,
  },
  stage: {
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: 268,
    height: 268,
    borderRadius: 70,
    borderWidth: 1,
  },
  haloMid: {
    position: 'absolute',
    width: 248,
    height: 248,
    borderRadius: 62,
    borderWidth: 1,
  },
  haloIdle: {
    borderColor: 'rgba(212,146,58,0.35)',
  },
  haloFocus: {
    borderColor: 'rgba(110,231,176,0.4)',
  },
  press: {
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    elevation: 16,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  ring: {
    width: 228,
    height: 228,
    borderRadius: 56,
    padding: 2,
  },
  inner: {
    flex: 1,
    borderRadius: 54,
    backgroundColor: Palette.bgElevated,
    borderWidth: 1,
    borderColor: 'rgba(247,241,232,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  wordmark: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1.4,
    color: Palette.ink,
  },
  clock: {
    fontSize: 28,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
    color: Palette.accent,
  },
  clockLock: {
    color: Palette.focus,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    backgroundColor: Palette.accentSoft,
  },
  pillLock: {
    backgroundColor: Palette.focusSoft,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Palette.accent,
  },
  dotLock: {
    backgroundColor: Palette.focus,
  },
  status: {
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    fontWeight: '700',
    color: Palette.accent,
  },
  statusLock: {
    color: Palette.focus,
  },
  hint: {
    color: Palette.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 280,
  },
});
