import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import { TREE_SKY, TreeArt } from '@/components/tree-art';
import { Palette, Radius, Type } from '@/constants/theme';
import type { FocusModeId, PlantId, SkyId } from '@/lib/gamification';

type Props = {
  growth: number;
  planted: boolean;
  mode: FocusModeId | null;
  plant: PlantId;
  sky: SkyId;
  label: string;
  caption: string;
};

export function ProgressGarden({ growth, planted, mode, plant, sky, label, caption }: Props) {
  const shown = useGrown(planted ? growth : 0);
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`${label}. ${caption}`}
      style={[styles.sky, { backgroundColor: TREE_SKY[sky] }]}>
      <TreeArt growth={shown} planted={planted} mode={mode} plant={plant} />
      <Text style={styles.caption}>{caption}</Text>
    </View>
  );
}

function useGrown(growth: number): number {
  const [shown, setShown] = useState(growth);
  const shownRef = useRef(growth);
  const reduceRef = useRef(false);

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (alive) reduceRef.current = enabled;
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      reduceRef.current = enabled;
    });
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const from = shownRef.current;
    const to = growth;
    if (from === to) return;
    const start = Date.now();
    let frame = 0;
    const tick = () => {
      const t = reduceRef.current ? 1 : Math.min(1, (Date.now() - start) / 700);
      const eased = 1 - (1 - t) ** 3;
      const value = from + (to - from) * eased;
      shownRef.current = value;
      setShown(value);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [growth]);

  return shown;
}

const styles = StyleSheet.create({
  sky: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Palette.line,
    paddingTop: 8,
    paddingBottom: 14,
    marginBottom: 16,
    overflow: 'hidden',
  },
  caption: {
    ...Type.body,
    color: Palette.muted,
    textAlign: 'center',
    marginTop: -4,
    paddingHorizontal: 16,
  },
});
