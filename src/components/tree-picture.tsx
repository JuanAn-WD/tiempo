import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { PixelSprite } from '@/components/pixel-sprite';
import { Palette, Radius } from '@/constants/theme';
import type { FocusModeId, PlantId, SurpriseId } from '@/lib/gamification';
import { SPRITE, rasterScene } from '@/lib/tree-pixels';
import type { Season, TimeSky } from '@/lib/tree-growth';

export const SKY: Record<TimeSky, readonly [string, string, string]> = {
  dawn: ['#4A2E1C', '#1A120C', '#0B0A09'],
  day: ['#2A1C12', '#14110E', '#0B0A09'],
  dusk: ['#3A2230', '#140E16', '#0B0A09'],
  night: ['#101820', '#0C1016', '#07080C'],
};

const STARS: ViewStyle[] = [
  { left: '12%', top: '14%' },
  { left: '28%', top: '8%' },
  { left: '70%', top: '12%' },
  { left: '84%', top: '22%' },
  { left: '48%', top: '6%' },
  { left: '18%', top: '28%' },
];

const FIREFLY: ViewStyle[] = [
  { left: '22%', top: '30%' },
  { left: '70%', top: '26%' },
  { left: '38%', top: '18%' },
  { left: '58%', top: '34%' },
  { left: '30%', top: '42%' },
  { left: '76%', top: '40%' },
  { left: '48%', top: '22%' },
];

export type TreePictureProps = {
  species: PlantId;
  stage: number;
  substage: number;
  season: Season;
  sky: TimeSky;
  fruits: number;
  sleeping: boolean;
  surprises: readonly SurpriseId[];
  marks: readonly { mode: FocusModeId; count: number }[];
  fireflies?: number;
  paused?: boolean;
  width: number;
  shake?: number;
  /** Small tree on Foco. No frame, no idle motion. */
  compact?: boolean;
};

export function TreePicture({
  species,
  stage,
  substage,
  season,
  sky,
  fruits,
  sleeping,
  surprises,
  marks,
  fireflies = 0,
  paused = false,
  width,
  shake = 0,
  compact = false,
}: TreePictureProps) {
  const [frame, setFrame] = useState(0);
  const side = Math.max(SPRITE, Math.min(width, SPRITE * 6));
  const scale = Math.max(1, Math.floor(side / SPRITE));
  const drawn = compact ? width : SPRITE * scale;
  const sway = paused || compact ? 0 : [0, 1, 0, -1][frame % 4];
  const glow = paused || compact ? true : frame % 2 === 0;

  useEffect(() => {
    if (paused || compact) return;
    const timer = setInterval(() => setFrame((value) => value + 1), 680);
    return () => clearInterval(timer);
  }, [paused, compact]);

  const rgba = useMemo(
    () =>
      rasterScene({
        species,
        stage,
        substage,
        season,
        fruits,
        sleeping,
        surprises,
        marks,
        sway,
      }),
    [species, stage, substage, season, fruits, sleeping, surprises, marks, sway],
  );

  return (
    <View style={[styles.sky, compact && styles.compact, { backgroundColor: SKY[sky][2] }]}>
      <LinearGradient colors={SKY[sky]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      {sky === 'night' && !compact
        ? STARS.map((star) => <View key={`${star.left}${star.top}`} pointerEvents="none" style={[styles.star, star]} />)
        : null}
      <View style={{ width: drawn, height: drawn, transform: [{ translateX: shake }] }}>
        <PixelSprite rgba={rgba} size={SPRITE} width={drawn} height={drawn} />
      </View>
      {Array.from({ length: Math.min(7, fireflies) }, (_, index) => (
        <View
          key={index}
          pointerEvents="none"
          style={[
            styles.firefly,
            FIREFLY[index],
            { opacity: paused || glow || index % 2 === 0 ? 1 : 0.35 },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sky: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.lineStrong,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: 240,
  },
  compact: {
    minHeight: 0,
    borderWidth: 0,
    borderRadius: Radius.sm,
    justifyContent: 'center',
  },
  star: {
    position: 'absolute',
    width: 2,
    height: 2,
    backgroundColor: Palette.ink,
    opacity: 0.7,
  },
  firefly: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.accentBright,
  },
});
