/**
 * WCAG 2.x contrast for the text/background pairs Apartag actually paints.
 * Every pair must reach 4.5:1. The large-text 3:1 cutoff is not used: dynamic
 * type can shrink a headline below 24px (or 18.5px bold).
 *
 * Run: node scripts/check-contrast.mjs
 */
import { readFileSync } from 'node:fs';

const MIN = 4.5;

const theme = readFileSync(new URL('../src/constants/theme.ts', import.meta.url), 'utf8');

function token(name) {
  const match = theme.match(new RegExp(`${name}:\\s*'(#[0-9A-Fa-f]{6})'`));
  if (!match) throw new Error(`Missing Palette.${name} hex in theme.ts`);
  return match[1].toUpperCase();
}

const ink = token('ink');
const muted = token('muted');
const faint = token('faint');
const faintText = token('faintText');
const accent = token('accent');
const accentBright = token('accentBright');
const accentText = token('accentText');
const focus = token('focus');
const danger = token('danger');
const bg = token('bg');
const bgElevated = token('bgElevated');
const surface = token('surface');
const surfaceHigh = token('surfaceHigh');

const gradIdleTop = '#1A120A';
const gradFocusTop = '#0F1A14';
const gradBottom = '#070605';

function channel(c) {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function rgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function luminance(hex) {
  const [r, g, b] = rgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a, b) {
  const hi = Math.max(luminance(a), luminance(b));
  const lo = Math.min(luminance(a), luminance(b));
  return (hi + 0.05) / (lo + 0.05);
}

function blend(fg, background, alpha) {
  const [fr, fgG, fb] = rgb(fg);
  const [br, bgG, bb] = rgb(background);
  const mix = (f, b) => Math.round(f * alpha + b * (1 - alpha));
  return (
    '#' +
    [mix(fr, br), mix(fgG, bgG), mix(fb, bb)].map((n) => n.toString(16).padStart(2, '0')).join('')
  ).toUpperCase();
}

const accentOn = (background) => blend(accent, background, 0.14);
const focusOn = (background) => blend(focus, background, 0.12);
const dangerOn = (background) => blend(danger, background, 0.14);
const glowOn = (background) => blend(accent, background, 0.1);
const amberIcon = blend(accent, surface, 0.25);

/** [label, text, background] — pairs that exist in the UI today. */
const pairs = [
  ['ink on bg', ink, bg],
  ['ink on elevated', ink, bgElevated],
  ['ink on surface', ink, surface],
  ['ink on surfaceHigh', ink, surfaceHigh],
  ['ink on idle gradient top', ink, gradIdleTop],
  ['ink on focus gradient top', ink, gradFocusTop],
  ['ink on amber wash / bg', ink, accentOn(bg)],
  ['ink on amber wash / idle top', ink, accentOn(gradIdleTop)],
  ['ink on amber wash / surface', ink, accentOn(surface)],
  ['ink on icon fallback', ink, surfaceHigh],
  ['ink on selected icon wash', ink, amberIcon],
  ['muted on bg', muted, bg],
  ['muted on elevated', muted, bgElevated],
  ['muted on surface', muted, surface],
  ['muted on surfaceHigh (badges)', muted, surfaceHigh],
  ['muted on idle gradient top', muted, gradIdleTop],
  ['muted on focus gradient top', muted, gradFocusTop],
  ['muted on amber glow / idle top', muted, glowOn(gradIdleTop)],
  ['muted on amber glow / focus top', muted, glowOn(gradFocusTop)],
  ['muted on amber wash / bg (stat label)', muted, accentOn(bg)],
  ['muted on amber wash / idle top (hero meta)', muted, accentOn(gradIdleTop)],
  ['faintText on bg (footer, legal, steps)', faintText, bg],
  ['faintText on elevated (mode mark, placeholder)', faintText, bgElevated],
  ['faintText on surface (dates, timer)', faintText, surface],
  ['faintText on idle gradient top', faintText, gradIdleTop],
  ['faintText on gradient bottom', faintText, gradBottom],
  ['accent on bg', accent, bg],
  ['accent on elevated (clock)', accent, bgElevated],
  ['accent on amber wash / elevated (orb status)', accent, accentOn(bgElevated)],
  ['accentBright on bg', accentBright, bg],
  ['accentBright on surface', accentBright, surface],
  ['accentBright on amber wash / bg', accentBright, accentOn(bg)],
  ['accentBright on amber wash / surface', accentBright, accentOn(surface)],
  ['accentBright on amber wash / idle top', accentBright, accentOn(gradIdleTop)],
  ['accentText on accent (buttons, step numbers)', accentText, accent],
  ['accentText on accentBright (step gradient)', accentText, accentBright],
  ['focus on bg', focus, bg],
  ['focus on elevated', focus, bgElevated],
  ['focus on surface', focus, surface],
  ['focus on mint wash / elevated (orb status)', focus, focusOn(bgElevated)],
  ['focus on mint wash / surface (badge)', focus, focusOn(surface)],
  ['danger on bg', danger, bg],
  ['danger on surface', danger, surface],
  ['danger on surfaceHigh', danger, surfaceHigh],
  ['danger on coral wash / bg', danger, dangerOn(bg)],
  ['danger on coral wash / surface (button in a card)', danger, dangerOn(surface)],
  ['danger on idle gradient top', danger, gradIdleTop],
];

let failed = 0;
const rows = pairs.map(([label, text, background]) => {
  const ratio = contrast(text, background);
  const ok = ratio >= MIN;
  if (!ok) failed += 1;
  return { label, ratio, ok, background };
});

const faintRatio = contrast(faint, bg);
console.log(`Decorative stone-700 (faint) on bg: ${faintRatio.toFixed(2)}:1 — not used for text`);
console.log('');
console.log('| Par | Fondo efectivo | Ratio |');
console.log('| --- | --- | ---: |');
for (const row of rows) {
  const mark = row.ok ? '' : ' FAIL';
  console.log(`| ${row.label} | \`${row.background}\` | ${row.ratio.toFixed(2)}:1${mark} |`);
}

if (failed > 0) {
  console.error(`\n${failed} pair(s) below ${MIN}:1`);
  process.exit(1);
}

console.log(`\n${rows.length} text pairs ≥ ${MIN}:1`);
