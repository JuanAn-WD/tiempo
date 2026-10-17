import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { Text } from '@/components/app-text';
import { Palette, Type } from '@/constants/theme';

type Phase = 'drops' | 'grow' | 'stage';

type Props = {
  phase: Phase;
  reduceMotion: boolean;
  title: string | null;
  sessionLine: string | null;
  skipLabel: string;
  onSkip: () => void;
};

export function TreeCelebration({ phase, reduceMotion, title, sessionLine, skipLabel, onSkip }: Props) {
  const showDrops = phase === 'drops' && !reduceMotion;
  const showLeaves = (phase === 'grow' || phase === 'stage') && !reduceMotion;
  const leafCount = phase === 'stage' ? 8 : 2;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={skipLabel}
      onPress={onSkip}
      style={styles.hit}>
      {sessionLine ? <Text style={styles.session}>{sessionLine}</Text> : null}
      {showDrops
        ? Array.from({ length: 6 }, (_, index) => <LightDrop key={index} index={index} />)
        : null}
      {showLeaves
        ? Array.from({ length: leafCount }, (_, index) => (
            <Leaf key={index} index={index} burst={phase === 'stage'} />
          ))
        : null}
      {phase === 'stage' && title ? (
        <Text accessibilityLiveRegion="polite" style={styles.title}>
          {title}
        </Text>
      ) : null}
    </Pressable>
  );
}

function LightDrop({ index }: { index: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(index * 50, withTiming(1, { duration: 800 }));
  }, [index, progress]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.value * 0.15,
    transform: [
      { translateX: (index - 2.5) * 22 * (1 - progress.value) },
      { translateY: 168 - progress.value * 130 },
    ],
  }));
  return <Animated.View pointerEvents="none" style={[styles.drop, style]} />;
}

function Leaf({ index, burst }: { index: number; burst: boolean }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(index * (burst ? 40 : 120), withTiming(1, { duration: burst ? 700 : 900 }));
  }, [burst, index, progress]);
  const style = useAnimatedStyle(() => {
    const angle = (index / 8) * Math.PI * 2;
    const distance = burst ? 28 + progress.value * 72 : 0;
    const drift = burst ? Math.cos(angle) * distance : (index % 2 === 0 ? -18 : 22) + progress.value * (index % 2 === 0 ? -10 : 12);
    const fall = burst ? 78 + Math.sin(angle) * distance * 0.45 + progress.value * 24 : 70 + progress.value * 90;
    return {
      opacity: 1 - progress.value,
      transform: [{ translateX: drift }, { translateY: fall }],
    };
  });
  return <Animated.View pointerEvents="none" style={[styles.leaf, index % 2 === 1 && styles.leafWarm, style]} />;
}

const styles = StyleSheet.create({
  hit: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  session: {
    ...Type.bodyL,
    color: Palette.ink,
    marginTop: 10,
    textAlign: 'center',
  },
  title: {
    ...Type.title,
    color: Palette.ink,
    textAlign: 'center',
    marginTop: 36,
    paddingHorizontal: 16,
  },
  drop: {
    position: 'absolute',
    top: 28,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Palette.accentBright,
  },
  leaf: {
    position: 'absolute',
    top: 40,
    width: 6,
    height: 4,
    backgroundColor: Palette.focus,
  },
  leafWarm: {
    backgroundColor: Palette.accent,
  },
});
