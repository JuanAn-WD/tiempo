import Svg, { Ellipse, Path } from 'react-native-svg';

import { Palette } from '@/constants/theme';
import { LEVELS, TREE_MINUTES, type FocusModeId, type PlantId, type SkyId } from '@/lib/gamification';

const MODE_TINT: Record<FocusModeId, string> = {
  trabajo: Palette.accent,
  estudio: Palette.focus,
  casa: '#E0A070',
  gym: '#7EC8C3',
};

export const TREE_SKY: Record<SkyId, string> = {
  default: Palette.surface,
  dawn: '#3A2A22',
  dusk: '#2A2438',
  night: '#12161C',
};

const STOPS = [...LEVELS.map((level) => level.minMinutes / TREE_MINUTES), 1];

type Frame = {
  seed: number;
  trunk: number;
  width: number;
  canopy: number;
  lift: number;
};

const FRAMES: Frame[] = [
  { seed: 1, trunk: 0, width: 0, canopy: 0, lift: 0 },
  { seed: 0.15, trunk: 24, width: 2.2, canopy: 10, lift: 20 },
  { seed: 0, trunk: 40, width: 3, canopy: 16, lift: 36 },
  { seed: 0, trunk: 56, width: 4, canopy: 24, lift: 52 },
  { seed: 0, trunk: 70, width: 5.2, canopy: 32, lift: 66 },
  { seed: 0, trunk: 80, width: 6, canopy: 38, lift: 76 },
  { seed: 0, trunk: 88, width: 6.6, canopy: 44, lift: 84 },
];

type Props = {
  growth: number;
  planted: boolean;
  mode: FocusModeId | null;
  plant: PlantId;
  height?: number;
};

export function TreeArt({ growth, planted, mode, plant, height = 168 }: Props) {
  const tint = mode ? MODE_TINT[mode] : Palette.accentBright;
  const shape = planted ? lerpFrame(growth) : FRAMES[0];
  const leaf = plant === 'olive' ? 0.78 : plant === 'fern' ? 0.92 : plant === 'clay' ? 1.16 : 1;
  const tall = plant === 'olive' ? 1.12 : plant === 'clay' ? 0.86 : 1;
  const base = 118;
  const top = base - shape.trunk;
  const crown = base - shape.lift;
  const root = shape.trunk > 28 ? Math.min(1, (shape.trunk - 28) / 24) : 0;

  return (
    <Svg width="100%" height={height} viewBox="0 0 200 140">
      <Ellipse cx="100" cy="124" rx="58" ry="8" fill="rgba(247,241,232,0.08)" />
      {planted && root > 0 ? (
        <>
          <Path
            d={`M86 122 C90 112 96 108 100 ${base - 8}`}
            stroke={Palette.muted}
            strokeWidth={1.4}
            fill="none"
            opacity={root}
          />
          <Path
            d={`M114 122 C110 112 104 108 100 ${base - 8}`}
            stroke={Palette.muted}
            strokeWidth={1.4}
            fill="none"
            opacity={root}
          />
        </>
      ) : null}
      {planted && shape.trunk > 1 ? (
        <Path
          d={`M100 ${base} C100 ${base - shape.trunk * 0.45} 100 ${base - shape.trunk * 0.75} 100 ${top}`}
          stroke={Palette.muted}
          strokeWidth={shape.width}
          strokeLinecap="round"
          fill="none"
        />
      ) : null}
      {planted && shape.canopy > 2 ? (
        <>
          <Ellipse
            cx={100 - shape.canopy * 0.46}
            cy={crown + 8}
            rx={shape.canopy * leaf}
            ry={shape.canopy * 0.72 * tall}
            fill={tint}
          />
          <Ellipse
            cx={100 + shape.canopy * 0.42}
            cy={crown + 1}
            rx={shape.canopy * 0.92 * leaf}
            ry={shape.canopy * 0.66 * tall}
            fill={tint}
          />
          <Ellipse
            cx={100}
            cy={crown - shape.canopy * 0.32}
            rx={shape.canopy * 0.7 * leaf}
            ry={shape.canopy * 0.56 * tall}
            fill={tint}
            opacity={0.92}
          />
          {plant === 'fern' && shape.canopy > 12 ? (
            <Ellipse
              cx={100 - shape.canopy * 0.1}
              cy={crown - shape.canopy * 0.55}
              rx={shape.canopy * 0.28}
              ry={shape.canopy * 0.5}
              fill={tint}
              opacity={0.8}
            />
          ) : null}
        </>
      ) : null}
      {planted && shape.seed > 0.04 ? (
        <Ellipse cx="100" cy="116" rx={8 * shape.seed} ry={5.5 * shape.seed} fill={tint} />
      ) : null}
    </Svg>
  );
}

function lerpFrame(growth: number): Frame {
  const value = Math.min(1, Math.max(0, growth));
  let index = 0;
  while (index < STOPS.length - 2 && value >= STOPS[index + 1]) index += 1;
  const span = STOPS[index + 1] - STOPS[index] || 1;
  const t = Math.min(1, Math.max(0, (value - STOPS[index]) / span));
  const from = FRAMES[index];
  const to = FRAMES[index + 1];
  return {
    seed: from.seed + (to.seed - from.seed) * t,
    trunk: from.trunk + (to.trunk - from.trunk) * t,
    width: from.width + (to.width - from.width) * t,
    canopy: from.canopy + (to.canopy - from.canopy) * t,
    lift: from.lift + (to.lift - from.lift) * t,
  };
}
