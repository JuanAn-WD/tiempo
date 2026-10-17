/**
 * Pixel tree, 64×64, nearest-neighbor. Colors come from the app palette:
 * mint leaves, copper trunk, amber fruit. Seasons shift the leaves only.
 * A later substage only adds pixels, so the tree never looks smaller.
 */
import type { FocusModeId, PlantId, SurpriseId } from '@/lib/gamification';
import type { Season } from '@/lib/tree-growth';

export const SPRITE = 64;

type RGB = [number, number, number];

const SOIL_D: RGB = [28, 20, 14];
const SOIL: RGB = [54, 38, 26];
const SOIL_L: RGB = [92, 66, 44];
const GRASS_D: RGB = [26, 62, 46];
const GRASS: RGB = [46, 96, 70];
const MINT: RGB = [110, 231, 176];
const TRUNK_D: RGB = [54, 32, 18];
const TRUNK: RGB = [110, 68, 36];
const COPPER: RGB = [212, 146, 58];
const FRUIT: RGB = [232, 160, 64];
const GLOW: RGB = [255, 226, 176];
const PAPER: RGB = [228, 210, 192];

const LEAF: Record<Season, [RGB, RGB, RGB]> = {
  spring: [
    [36, 110, 78],
    [78, 168, 122],
    [168, 236, 204],
  ],
  summer: [
    [24, 82, 60],
    [46, 122, 90],
    [126, 214, 176],
  ],
  autumn: [
    [92, 64, 32],
    [150, 96, 48],
    [212, 146, 72],
  ],
  winter: [
    [58, 78, 70],
    [92, 112, 102],
    [168, 184, 174],
  ],
};

const SPECIES_LEAF: Record<PlantId, RGB> = {
  default: [110, 231, 176],
  olive: [168, 168, 120],
  fern: [32, 88, 72],
  clay: [196, 140, 120],
};

type Stamp = { x: number; y: number; rx: number; ry: number };

const LAYERS: Stamp[][] = [
  [],
  [
    { x: 32, y: 36, rx: 2.2, ry: 1.6 },
    { x: 29, y: 38, rx: 1.8, ry: 1.4 },
    { x: 35, y: 38, rx: 1.8, ry: 1.4 },
    { x: 31, y: 33, rx: 1.7, ry: 1.5 },
    { x: 34, y: 34, rx: 1.6, ry: 1.4 },
    { x: 28, y: 35, rx: 1.5, ry: 1.3 },
    { x: 36, y: 35, rx: 1.5, ry: 1.3 },
    { x: 32, y: 31, rx: 1.6, ry: 1.4 },
  ],
  [
    { x: 26, y: 34, rx: 2.4, ry: 2 },
    { x: 38, y: 34, rx: 2.4, ry: 2 },
    { x: 24, y: 38, rx: 2.1, ry: 1.8 },
    { x: 40, y: 38, rx: 2.1, ry: 1.8 },
    { x: 30, y: 30, rx: 2.2, ry: 2 },
    { x: 35, y: 29, rx: 2.2, ry: 2 },
    { x: 22, y: 32, rx: 1.8, ry: 1.6 },
    { x: 42, y: 32, rx: 1.8, ry: 1.6 },
  ],
  [
    { x: 28, y: 24, rx: 3.2, ry: 2.6 },
    { x: 37, y: 23, rx: 3.2, ry: 2.6 },
    { x: 22, y: 29, rx: 2.8, ry: 2.4 },
    { x: 43, y: 28, rx: 2.8, ry: 2.4 },
    { x: 32, y: 18, rx: 2.8, ry: 2.4 },
    { x: 18, y: 33, rx: 2.4, ry: 2 },
    { x: 46, y: 32, rx: 2.4, ry: 2 },
    { x: 32, y: 27, rx: 3, ry: 2.4 },
  ],
  [
    { x: 26, y: 18, rx: 3.6, ry: 3 },
    { x: 39, y: 17, rx: 3.6, ry: 3 },
    { x: 19, y: 24, rx: 3.2, ry: 2.6 },
    { x: 45, y: 23, rx: 3.2, ry: 2.6 },
    { x: 32, y: 12, rx: 3.2, ry: 2.6 },
    { x: 15, y: 30, rx: 2.8, ry: 2.3 },
    { x: 49, y: 29, rx: 2.8, ry: 2.3 },
    { x: 32, y: 21, rx: 3.4, ry: 2.6 },
  ],
  [
    { x: 24, y: 16, rx: 4, ry: 3.2 },
    { x: 40, y: 15, rx: 4, ry: 3.2 },
    { x: 17, y: 22, rx: 3.6, ry: 2.8 },
    { x: 47, y: 21, rx: 3.6, ry: 2.8 },
    { x: 32, y: 9, rx: 3.4, ry: 2.8 },
    { x: 13, y: 28, rx: 3.2, ry: 2.5 },
    { x: 51, y: 27, rx: 3.2, ry: 2.5 },
    { x: 32, y: 19, rx: 4.2, ry: 3.2 },
  ],
];

const FRUIT_SLOTS: { x: number; y: number }[] = [
  { x: 28, y: 18 },
  { x: 37, y: 16 },
  { x: 22, y: 24 },
  { x: 42, y: 22 },
  { x: 32, y: 13 },
  { x: 18, y: 20 },
];

const TRUNK_TOP = [52, 40, 33, 25, 17, 11];

export type RasterInput = {
  species: PlantId;
  stage: number;
  substage: number;
  season: Season;
  fruits: number;
  sleeping: boolean;
  surprises: readonly SurpriseId[];
  marks: readonly { mode: FocusModeId; count: number }[];
  sway: number;
};

export function rasterScene(input: RasterInput): Uint8Array {
  const indices = paintIndices(input);
  return toRgba(indices, input.season, input.species, input.sway);
}

export function opaqueCount(rgba: Uint8Array): number {
  let count = 0;
  for (let index = 3; index < rgba.length; index += 4) {
    if (rgba[index] > 0) count += 1;
  }
  return count;
}

function paintIndices(input: RasterInput): Uint8Array {
  const buf = new Uint8Array(SPRITE * SPRITE);
  const stage = clamp(input.stage, 0, 5);
  const sub = clamp(input.substage, 0, 7);
  drawGround(buf, stage, sub);
  if (stage >= 2) drawRoots(buf, stage);
  if (stage >= 1) drawTrunk(buf, stage, sub);
  if (stage >= 2) drawBranches(buf, stage, sub);
  drawCanopy(buf, stage, sub, input.species);
  if (stage === 0) drawSeed(buf, sub);
  if (stage >= 4) drawFruits(buf, input.fruits, stage);
  drawMarks(buf, input.marks, stage);
  drawSurprises(buf, input.surprises, stage, input.sleeping);
  if (input.sleeping && stage >= 2) drawBird(buf, stage >= 4 ? 46 : 40, stage >= 4 ? 24 : 30, true);
  return buf;
}

function drawGround(buf: Uint8Array, stage: number, sub: number): void {
  const rx = 9 + stage * 2 + Math.floor(sub / 3);
  const ry = 4 + Math.floor(stage / 2);
  ellipse(buf, 32, 54, rx, ry, 2);
  ellipse(buf, 32, 53, rx - 2, Math.max(2, ry - 1), 3);
  ellipse(buf, 32, 56, rx - 1, 3, 1);
  const tufts = 4 + stage * 2 + Math.floor(sub / 2);
  for (let index = 0; index < tufts; index += 1) {
    const x = Math.round(32 - rx + 2 + ((index * 17) % Math.max(4, rx * 2 - 2)));
    const height = 2 + (index % 3 === 0 ? 1 : 0);
    for (let dy = 0; dy < height; dy += 1) {
      set(buf, x, 52 - dy, dy === height - 1 && index % 2 === 0 ? 6 : 5);
    }
    set(buf, x, 53, 4);
  }
  if (stage >= 3) {
    set(buf, 18, 55, 1);
    set(buf, 19, 55, 3);
    set(buf, 46, 56, 1);
    set(buf, 47, 55, 3);
  }
}

function drawRoots(buf: Uint8Array, stage: number): void {
  line(buf, 32, 50, 24 - stage, 56, 7);
  line(buf, 32, 50, 40 + stage, 56, 7);
  if (stage >= 4) {
    line(buf, 30, 51, 22, 57, 8);
    line(buf, 34, 51, 44, 57, 8);
  }
}

function drawTrunk(buf: Uint8Array, stage: number, sub: number): void {
  const top = TRUNK_TOP[stage] - Math.floor(sub / 2);
  const width = stage <= 1 ? 0 : stage === 2 ? 1 : stage === 3 ? 1 : stage === 4 ? 2 : 3;
  for (let y = top; y <= 51; y += 1) {
    const flare = y > 46 ? 1 : 0;
    const half = width + flare;
    for (let dx = -half; dx <= half; dx += 1) {
      const edge = dx === -half || dx === half;
      const knot = (y + dx * 3) % 6 === 0;
      set(buf, 32 + dx, y, edge ? 9 : knot ? 7 : 8);
    }
  }
  if (stage >= 4) {
    line(buf, 32, top + 6, 27, 48, 8);
    line(buf, 32, top + 6, 37, 48, 8);
  }
}

function drawBranches(buf: Uint8Array, stage: number, sub: number): void {
  const top = TRUNK_TOP[stage] - Math.floor(sub / 2);
  const reach = 4 + stage * 2 + Math.floor(sub / 2);
  line(buf, 32, top + 4, 32 - reach, top + 8, 8);
  line(buf, 32, top + 3, 32 + reach, top + 7, 8);
  if (stage >= 3) {
    line(buf, 32, top + 1, 32 - reach + 2, top - 1, 7);
    line(buf, 32, top + 1, 32 + reach - 2, top - 2, 7);
  }
}

function drawCanopy(buf: Uint8Array, stage: number, sub: number, species: PlantId): void {
  for (let layer = 1; layer <= stage; layer += 1) {
    const limit = layer < stage ? 8 : sub + 1;
    const stamps = LAYERS[layer];
    for (let index = 0; index < limit; index += 1) {
      const stamp = shapeStamp(stamps[index], species, layer);
      disk(buf, stamp, layer * 8 + index, species === 'clay' ? 0.16 : 0);
    }
  }
}

function drawSeed(buf: Uint8Array, sub: number): void {
  ellipse(buf, 32, 49, 3, 2, 8);
  ellipse(buf, 32, 49, 2, 1, 9);
  set(buf, 32, 48, 3);
  if (sub >= 2) {
    set(buf, 32, 48, 14);
    set(buf, 31, 49, 14);
  }
  if (sub >= 4) {
    const height = sub - 3;
    for (let dy = 0; dy < height; dy += 1) set(buf, 32, 47 - dy, 11);
    if (sub >= 6) {
      set(buf, 31, 45, 12);
      set(buf, 33, 45, 12);
    }
    if (sub >= 7) {
      set(buf, 30, 46, 11);
      set(buf, 34, 46, 11);
    }
  }
  if (sub >= 1) {
    set(buf, 36, 45, 14);
    set(buf, 37, 44, 14);
  }
}

function drawFruits(buf: Uint8Array, count: number, stage: number): void {
  const shown = Math.max(0, Math.min(FRUIT_SLOTS.length, count));
  for (let index = 0; index < shown; index += 1) {
    const slot = FRUIT_SLOTS[index];
    const y = slot.y + (stage === 4 ? 4 : 0);
    set(buf, slot.x, y, 13);
    set(buf, slot.x + 1, y, 13);
    set(buf, slot.x, y + 1, 13);
    set(buf, slot.x + 1, y + 1, 14);
  }
}

function drawMarks(buf: Uint8Array, marks: RasterInput['marks'], stage: number): void {
  for (const mark of marks) {
    const count = Math.max(0, Math.min(3, mark.count));
    if (count === 0) continue;
    if (mark.mode === 'trabajo') lamp(buf, 12, 48, count);
    if (mark.mode === 'estudio') books(buf, 50, 49, count);
    if (mark.mode === 'casa') bench(buf, 14, 50, count);
    if (mark.mode === 'gym') path(buf, 48, 57, count, stage);
  }
}

function drawSurprises(buf: Uint8Array, surprises: readonly SurpriseId[], stage: number, sleeping: boolean): void {
  if (surprises.includes('mushroom')) mushroom(buf, 20, 51);
  if (surprises.includes('butterfly') && stage >= 1) butterfly(buf, stage >= 3 ? 18 : 26, stage >= 3 ? 16 : 28);
  if (surprises.includes('bird') && !sleeping && stage >= 2) drawBird(buf, 18, stage >= 4 ? 20 : 28, false);
  if (surprises.includes('squirrel') && stage >= 2) squirrel(buf, 36, 46);
}

function lamp(buf: Uint8Array, x: number, y: number, count: number): void {
  for (let index = 0; index < count; index += 1) {
    const ox = x + index * 3;
    set(buf, ox, y, 8);
    set(buf, ox, y - 1, 8);
    set(buf, ox, y - 2, 8);
    set(buf, ox - 1, y - 3, 13);
    set(buf, ox, y - 3, 14);
    set(buf, ox + 1, y - 3, 13);
  }
}

function books(buf: Uint8Array, x: number, y: number, count: number): void {
  for (let index = 0; index < count; index += 1) {
    const ox = x + (index % 2) * 4;
    const oy = y - Math.floor(index / 2) * 3;
    set(buf, ox, oy, 9);
    set(buf, ox + 1, oy, 8);
    set(buf, ox + 2, oy, 7);
    set(buf, ox, oy - 1, 15);
    set(buf, ox + 1, oy - 1, 15);
    set(buf, ox + 2, oy - 1, 9);
  }
}

function bench(buf: Uint8Array, x: number, y: number, count: number): void {
  const width = 4 + count;
  for (let dx = 0; dx < width; dx += 1) set(buf, x + dx, y, 8);
  set(buf, x, y + 1, 7);
  set(buf, x + width - 1, y + 1, 7);
}

function path(buf: Uint8Array, x: number, y: number, count: number, stage: number): void {
  const stones = 2 + count + Math.min(2, stage);
  for (let index = 0; index < stones; index += 1) {
    const ox = x - index * 3;
    set(buf, ox, y - (index % 2), 3);
    set(buf, ox + 1, y - (index % 2), 1);
  }
}

function mushroom(buf: Uint8Array, x: number, y: number): void {
  set(buf, x, y, 15);
  set(buf, x, y + 1, 8);
  set(buf, x - 1, y, 13);
  set(buf, x + 1, y, 13);
  set(buf, x, y - 1, 9);
}

function butterfly(buf: Uint8Array, x: number, y: number): void {
  set(buf, x, y, 7);
  set(buf, x - 1, y, 12);
  set(buf, x + 1, y, 12);
  set(buf, x - 2, y + 1, 11);
  set(buf, x + 2, y + 1, 11);
  set(buf, x, y - 1, 14);
}

function squirrel(buf: Uint8Array, x: number, y: number): void {
  set(buf, x, y, 8);
  set(buf, x + 1, y, 9);
  set(buf, x, y - 1, 8);
  set(buf, x + 1, y - 1, 15);
  set(buf, x + 2, y - 2, 9);
  set(buf, x + 2, y - 1, 8);
  set(buf, x - 1, y, 7);
}

function drawBird(buf: Uint8Array, x: number, y: number, asleep: boolean): void {
  set(buf, x, y, 15);
  set(buf, x + 1, y, 15);
  set(buf, x - 1, y, 7);
  set(buf, x, y - 1, 7);
  set(buf, x + 1, y - 1, 15);
  set(buf, x + 2, y, 9);
  if (asleep) {
    set(buf, x + 1, y - 1, 7);
    set(buf, x + 3, y - 3, 15);
    set(buf, x + 4, y - 4, 14);
    set(buf, x + 5, y - 5, 15);
  } else {
    set(buf, x + 1, y - 1, 14);
  }
}

function shapeStamp(stamp: Stamp, species: PlantId, layer: number): Stamp {
  if (species === 'fern') {
    const dy = Math.max(0, Math.min(1, (48 - stamp.y) / 36));
    const squeeze = 0.28 + (1 - dy) * 0.85;
    return {
      x: 32 + (stamp.x - 32) * squeeze,
      y: stamp.y - layer,
      rx: stamp.rx * 0.82,
      ry: stamp.ry * 0.7,
    };
  }
  if (species === 'olive') {
    return {
      x: 32 + (stamp.x - 32) * 0.7,
      y: stamp.y - 2,
      rx: stamp.rx * 0.78,
      ry: stamp.ry * 1.2,
    };
  }
  if (species === 'clay') {
    return { x: stamp.x, y: stamp.y + 1, rx: stamp.rx * 1.06, ry: stamp.ry * 0.96 };
  }
  return stamp;
}

function disk(buf: Uint8Array, stamp: Stamp, salt: number, blossom: number): void {
  const x0 = Math.floor(stamp.x - stamp.rx);
  const x1 = Math.ceil(stamp.x + stamp.rx);
  const y0 = Math.floor(stamp.y - stamp.ry);
  const y1 = Math.ceil(stamp.y + stamp.ry);
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const nx = (x + 0.5 - stamp.x) / stamp.rx;
      const ny = (y + 0.5 - stamp.y) / stamp.ry;
      const dist = nx * nx + ny * ny;
      if (dist > 1) continue;
      const edge = dist > 0.62;
      const h = hash(x, y, salt);
      let color = 11;
      if (edge || ny > 0.35) color = 10;
      else if (h < 0.16 && ny < 0) color = 12;
      if (blossom > 0 && h > 1 - blossom && !edge) color = 15;
      set(buf, x, y, color);
    }
  }
}

function ellipse(buf: Uint8Array, cx: number, cy: number, rx: number, ry: number, color: number): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      const nx = (x + 0.5 - cx) / rx;
      const ny = (y + 0.5 - cy) / ry;
      if (nx * nx + ny * ny <= 1) set(buf, x, y, color);
    }
  }
}

function line(buf: Uint8Array, x0: number, y0: number, x1: number, y1: number, color: number): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let step = 0; step <= steps; step += 1) {
    const t = steps === 0 ? 0 : step / steps;
    set(buf, Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), color);
  }
}

function set(buf: Uint8Array, x: number, y: number, color: number): void {
  if (x < 0 || y < 0 || x >= SPRITE || y >= SPRITE) return;
  buf[y * SPRITE + x] = color;
}

function toRgba(indices: Uint8Array, season: Season, species: PlantId, sway: number): Uint8Array {
  const rgba = new Uint8Array(SPRITE * SPRITE * 4);
  const shift = sway < 0 ? -1 : sway > 0 ? 1 : 0;
  const leaves = leafTrio(season, species);
  for (let y = 0; y < SPRITE; y += 1) {
    for (let x = 0; x < SPRITE; x += 1) {
      const sampleX = y < 50 ? x - shift : x;
      const color = sampleX < 0 || sampleX >= SPRITE ? 0 : indices[y * SPRITE + sampleX];
      const rgb = rgbOf(color, leaves);
      if (!rgb) continue;
      const offset = (y * SPRITE + x) * 4;
      rgba[offset] = rgb[0];
      rgba[offset + 1] = rgb[1];
      rgba[offset + 2] = rgb[2];
      rgba[offset + 3] = 255;
    }
  }
  return rgba;
}

function leafTrio(season: Season, species: PlantId): [RGB, RGB, RGB] {
  const base = LEAF[season];
  const bias = SPECIES_LEAF[species];
  const amount = species === 'default' ? 0.08 : 0.38;
  return [mix(base[0], bias, amount), mix(base[1], bias, amount * 0.8), mix(base[2], bias, amount * 0.45)];
}

function rgbOf(color: number, leaves: [RGB, RGB, RGB]): RGB | null {
  switch (color) {
    case 1:
      return SOIL_D;
    case 2:
      return SOIL;
    case 3:
      return SOIL_L;
    case 4:
      return GRASS_D;
    case 5:
      return GRASS;
    case 6:
      return MINT;
    case 7:
      return TRUNK_D;
    case 8:
      return TRUNK;
    case 9:
      return COPPER;
    case 10:
      return leaves[0];
    case 11:
      return leaves[1];
    case 12:
      return leaves[2];
    case 13:
      return FRUIT;
    case 14:
      return GLOW;
    case 15:
      return PAPER;
    default:
      return null;
  }
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function hash(x: number, y: number, salt: number): number {
  let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(salt, 1442695041)) >>> 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.floor(value)));
}
