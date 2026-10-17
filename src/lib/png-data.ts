/** Uncompressed PNG, so a share card can show the pixel tree without a native encoder. */

const CRC_TABLE = new Uint32Array(256);
for (let index = 0; index < 256; index += 1) {
  let crc = index;
  for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  CRC_TABLE[index] = crc >>> 0;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function upscaleNearest(rgba: Uint8Array, size: number, factor: number): Uint8Array {
  const out = size * factor;
  const dest = new Uint8Array(out * out * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const source = (y * size + x) * 4;
      const alpha = rgba[source + 3];
      if (alpha === 0) continue;
      for (let dy = 0; dy < factor; dy += 1) {
        for (let dx = 0; dx < factor; dx += 1) {
          const offset = ((y * factor + dy) * out + (x * factor + dx)) * 4;
          dest[offset] = rgba[source];
          dest[offset + 1] = rgba[source + 1];
          dest[offset + 2] = rgba[source + 2];
          dest[offset + 3] = alpha;
        }
      }
    }
  }
  return dest;
}

export function pngDataUri(width: number, height: number, rgba: Uint8Array): string {
  return `data:image/png;base64,${base64(encodePng(width, height, rgba))}`;
}

function encodePng(width: number, height: number, rgba: Uint8Array): Uint8Array {
  const stride = width * 4;
  const raw = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    raw.set(rgba.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }
  const ihdr = new Uint8Array(13);
  writeU32(ihdr, 0, width);
  writeU32(ihdr, 4, height);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  return concat([signature, chunk('IHDR', ihdr), chunk('IDAT', deflateStore(raw)), chunk('IEND', new Uint8Array())]);
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const body = new Uint8Array(4 + data.length);
  body.set(ascii(type), 0);
  body.set(data, 4);
  const out = new Uint8Array(4 + body.length + 4);
  writeU32(out, 0, data.length);
  out.set(body, 4);
  writeU32(out, 4 + body.length, crc32(body));
  return out;
}

function deflateStore(data: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = [new Uint8Array([0x78, 0x01])];
  let offset = 0;
  while (offset < data.length) {
    const size = Math.min(65535, data.length - offset);
    const last = offset + size >= data.length ? 1 : 0;
    const header = new Uint8Array(5);
    header[0] = last;
    header[1] = size & 0xff;
    header[2] = (size >> 8) & 0xff;
    const nlen = size ^ 0xffff;
    header[3] = nlen & 0xff;
    header[4] = (nlen >> 8) & 0xff;
    parts.push(header, data.subarray(offset, offset + size));
    offset += size;
  }
  const sum = adler32(data);
  const tail = new Uint8Array(4);
  writeU32(tail, 0, sum);
  parts.push(tail);
  return concat(parts);
}

function adler32(data: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (let index = 0; index < data.length; index += 1) {
    a = (a + data[index]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let index = 0; index < data.length; index += 1) crc = CRC_TABLE[(crc ^ data[index]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function ascii(value: string): Uint8Array {
  const out = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) out[index] = value.charCodeAt(index);
  return out;
}

function writeU32(buf: Uint8Array, offset: number, value: number): void {
  buf[offset] = (value >>> 24) & 0xff;
  buf[offset + 1] = (value >>> 16) & 0xff;
  buf[offset + 2] = (value >>> 8) & 0xff;
  buf[offset + 3] = value & 0xff;
}

function base64(bytes: Uint8Array): string {
  let out = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const b0 = bytes[index];
    const b1 = index + 1 < bytes.length ? bytes[index + 1] : 0;
    const b2 = index + 2 < bytes.length ? bytes[index + 2] : 0;
    const triple = (b0 << 16) | (b1 << 8) | b2;
    out += B64[(triple >> 18) & 63];
    out += B64[(triple >> 12) & 63];
    out += index + 1 < bytes.length ? B64[(triple >> 6) & 63] : '=';
    out += index + 2 < bytes.length ? B64[triple & 63] : '=';
  }
  return out;
}
