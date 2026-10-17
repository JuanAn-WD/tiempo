/**
 * Writes the pixel-tree sheets in assets/arbol from src/lib/tree-pixels.ts.
 * Summer palette, the one the app uses as its base. Seasons are tinted at runtime.
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cache = new Map();

function loadTs(rel) {
  const abs = path.join(root, rel);
  if (cache.has(abs)) return cache.get(abs).exports;
  const source = fs.readFileSync(abs, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      strict: false,
    },
    fileName: abs,
  }).outputText;
  const mod = { exports: {} };
  cache.set(abs, mod);
  const localRequire = (spec) => {
    if (spec.startsWith('@/')) return loadTs(`src/${spec.slice(2)}.ts`);
    if (spec.startsWith('.')) {
      const resolved = path.resolve(path.dirname(abs), spec);
      const file = resolved.endsWith('.ts') ? resolved : `${resolved}.ts`;
      return loadTs(path.relative(root, file));
    }
    return require(spec);
  };
  const runner = new Function('exports', 'require', 'module', output);
  runner(mod.exports, localRequire, mod);
  return mod.exports;
}

const { rasterScene, SPRITE } = loadTs('src/lib/tree-pixels.ts');

const SPECIES = [
  ['default', 'roble.png'],
  ['olive', 'olivo.png'],
  ['fern', 'pino.png'],
  ['clay', 'cerezo.png'],
];

function blank(width, height, rgba = [11, 10, 9, 255]) {
  const buf = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    buf[i * 4] = rgba[0];
    buf[i * 4 + 1] = rgba[1];
    buf[i * 4 + 2] = rgba[2];
    buf[i * 4 + 3] = rgba[3];
  }
  return buf;
}

function blit(dest, destW, src, size, dx, dy) {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const si = (y * size + x) * 4;
      if (src[si + 3] === 0) continue;
      const di = ((dy + y) * destW + (dx + x)) * 4;
      dest[di] = src[si];
      dest[di + 1] = src[si + 1];
      dest[di + 2] = src[si + 2];
      dest[di + 3] = 255;
    }
  }
}

function upscale(src, size, factor) {
  const out = size * factor;
  const dest = blank(out, out, [0, 0, 0, 0]);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const si = (y * size + x) * 4;
      if (src[si + 3] === 0) continue;
      for (let dy = 0; dy < factor; dy += 1) {
        for (let dx = 0; dx < factor; dx += 1) {
          const di = ((y * factor + dy) * out + (x * factor + dx)) * 4;
          dest[di] = src[si];
          dest[di + 1] = src[si + 1];
          dest[di + 2] = src[si + 2];
          dest[di + 3] = 255;
        }
      }
    }
  }
  return dest;
}

function crc32(buf) {
  let crc = ~0;
  for (let i = 0; i < buf.length; i += 1) {
    crc ^= buf[i];
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(body.length - 4, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function png(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function frame(species, stage, substage, extras = {}) {
  return rasterScene({
    species,
    stage,
    substage,
    season: 'summer',
    fruits: extras.fruits ?? 0,
    sleeping: extras.sleeping ?? false,
    surprises: extras.surprises ?? [],
    marks: extras.marks ?? [],
    sway: 0,
  });
}

const outDir = path.join(root, 'assets', 'arbol');
fs.mkdirSync(outDir, { recursive: true });

const atlas = { size: SPRITE, columns: 8, rows: 6, season: 'summer', species: {} };

for (const [species, file] of SPECIES) {
  const sheet = blank(SPRITE * 8, SPRITE * 6, [0, 0, 0, 0]);
  for (let stage = 0; stage < 6; stage += 1) {
    for (let sub = 0; sub < 8; sub += 1) {
      const pixels = frame(species, stage, sub, { fruits: stage >= 4 ? 4 : 0 });
      blit(sheet, SPRITE * 8, pixels, SPRITE, sub * SPRITE, stage * SPRITE);
    }
  }
  fs.writeFileSync(path.join(outDir, file), png(SPRITE * 8, SPRITE * 6, sheet));
  atlas.species[species] = file;
}

const scale = 4;
const gap = 8;
const cols = 6;
const rows = 4;
const cell = SPRITE * scale;
const previewW = cols * cell + (cols + 1) * gap;
const previewH = rows * cell + (rows + 1) * gap;
const preview = blank(previewW, previewH);
const tiles = [];
for (let stage = 0; stage < 6; stage += 1) tiles.push(frame('default', stage, 7, { fruits: stage >= 4 ? 5 : 0 }));
for (const species of ['default', 'olive', 'fern', 'clay']) {
  tiles.push(frame(species, 5, 7, { fruits: 5, surprises: ['mushroom', 'butterfly', 'bird', 'squirrel'] }));
}
tiles.push(frame('default', 3, 0));
tiles.push(frame('default', 3, 3));
tiles.push(frame('default', 3, 7));
tiles.push(
  frame('default', 4, 7, {
    fruits: 4,
    sleeping: true,
    marks: [
      { mode: 'trabajo', count: 1 },
      { mode: 'estudio', count: 1 },
      { mode: 'casa', count: 1 },
      { mode: 'gym', count: 2 },
    ],
  }),
);
tiles.push(frame('default', 0, 0));
tiles.push(frame('default', 0, 7));

tiles.forEach((pixels, index) => {
  const col = index % cols;
  const row = Math.floor(index / cols);
  const scaled = upscale(pixels, SPRITE, scale);
  const dx = gap + col * (cell + gap);
  const dy = gap + row * (cell + gap);
  for (let y = 0; y < cell; y += 1) {
    for (let x = 0; x < cell; x += 1) {
      const si = (y * cell + x) * 4;
      if (scaled[si + 3] === 0) continue;
      const di = ((dy + y) * previewW + (dx + x)) * 4;
      preview[di] = scaled[si];
      preview[di + 1] = scaled[si + 1];
      preview[di + 2] = scaled[si + 2];
      preview[di + 3] = 255;
    }
  }
});

fs.writeFileSync(path.join(outDir, 'preview.png'), png(previewW, previewH, preview));
fs.writeFileSync(path.join(outDir, 'atlas.json'), `${JSON.stringify(atlas, null, 2)}\n`);
console.log('wrote assets/arbol');
