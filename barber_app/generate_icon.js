// generate_icon.js
// Generates a 1024x1024 PNG icon for Kreno using only built-in Node.js modules.
// Background: #B8952A (gold/amber), white "K" lettermark centered.
// Run: node generate_icon.js  (from barber_app directory)

'use strict';

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const SIZE = 1024;

// ─── Create RGBA pixel buffer ───────────────────────────────────────────────
const pixels = Buffer.alloc(SIZE * SIZE * 4);

// Background color #B8952A
const BG_R = 0xB8, BG_G = 0x95, BG_B = 0x2A;

// Fill background
for (let i = 0; i < SIZE * SIZE; i++) {
  pixels[i * 4 + 0] = BG_R;
  pixels[i * 4 + 1] = BG_G;
  pixels[i * 4 + 2] = BG_B;
  pixels[i * 4 + 3] = 255;
}

// ─── Draw "K" as pixel rectangles ────────────────────────────────────────────
// K takes up ~60% of the icon → 614px tall, ~430px wide
// Centered in 1024x1024

function fillRect(x, y, w, h, r, g, b) {
  for (let row = y; row < y + h; row++) {
    for (let col = x; col < x + w; col++) {
      if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) continue;
      const idx = (row * SIZE + col) * 4;
      pixels[idx + 0] = r;
      pixels[idx + 1] = g;
      pixels[idx + 2] = b;
      pixels[idx + 3] = 255;
    }
  }
}

// K dimensions: 60% of 1024 = ~614px height, proportional width ~380px
const kH = Math.round(SIZE * 0.60);   // 614
const kW = Math.round(SIZE * 0.37);   // 379
const kX = Math.round((SIZE - kW) / 2); // left edge of K bounding box
const kY = Math.round((SIZE - kH) / 2); // top edge of K bounding box

const strokeW = Math.round(kW * 0.22); // stroke thickness ~83px

// 1) Vertical left bar — full height of K
fillRect(kX, kY, strokeW, kH, 255, 255, 255);

// 2) Upper diagonal arm — from middle-right going to top-right
//    Drawn as a rotated rectangle approximated by a set of horizontal slices
//    Upper arm: from (kX+strokeW, kY) to (kX+kW, kY + kH/2)
{
  const armH = Math.round(kH / 2);
  const armW = kW - strokeW;
  for (let row = 0; row < armH; row++) {
    // At row 0 (top), full width strip at top-right corner
    // At row armH (middle), strip starts at kX+strokeW
    const progress = row / armH; // 0 at top, 1 at middle
    // The left edge of the arm sweeps from kX+kW (at top) to kX+strokeW (at middle)
    const leftEdge = Math.round(kX + kW - (armW * progress));
    const sliceW = Math.round(kX + kW - leftEdge + strokeW * 0.1);
    const actualLeft = Math.max(leftEdge, kX + strokeW);
    const actualW = Math.max(0, kX + kW - actualLeft);
    if (actualW > 0) {
      fillRect(actualLeft, kY + row, actualW, 1, 255, 255, 255);
    }
  }
  // Thicken the arm by strokeW pixels perpendicular (diagonal thickness)
  // Re-draw with thickness by offsetting a few rows
  for (let t = 1; t <= strokeW; t++) {
    for (let row = 0; row < armH - t; row++) {
      const progress = row / armH;
      const leftEdge = Math.round(kX + kW - (armW * progress));
      const actualLeft = Math.max(leftEdge, kX + strokeW);
      const actualW = Math.max(0, kX + kW - actualLeft);
      if (actualW > 0) {
        fillRect(actualLeft, kY + row + t, actualW, 1, 255, 255, 255);
      }
    }
  }
}

// 3) Lower diagonal arm — from middle-right going to bottom-right
{
  const armH = Math.round(kH / 2);
  const armW = kW - strokeW;
  const midY = kY + Math.round(kH / 2);
  for (let row = 0; row < armH; row++) {
    const progress = row / armH; // 0 at middle, 1 at bottom
    // Left edge sweeps from kX+strokeW (at middle) to kX+kW (at bottom)
    const leftEdge = Math.round(kX + strokeW + armW * progress);
    const actualLeft = Math.max(leftEdge, kX + strokeW);
    const actualW = Math.max(0, kX + kW - actualLeft);
    if (actualW > 0) {
      fillRect(actualLeft, midY + row, actualW, 1, 255, 255, 255);
    }
  }
  // Thicken
  for (let t = 1; t <= strokeW; t++) {
    for (let row = t; row < armH; row++) {
      const progress = row / armH;
      const leftEdge = Math.round(kX + strokeW + armW * progress);
      const actualLeft = Math.max(leftEdge, kX + strokeW);
      const actualW = Math.max(0, kX + kW - actualLeft);
      if (actualW > 0) {
        fillRect(actualLeft, midY + row - t, actualW, 1, 255, 255, 255);
      }
    }
  }
}

// ─── Build PNG binary ─────────────────────────────────────────────────────────

function u32be(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n, 0);
  return b;
}

function crc32(buf) {
  // Standard CRC32 table
  const table = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[i] = c;
    }
    return t;
  })();
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const lenBuf = u32be(data.length);
  const crcData = Buffer.concat([typeBytes, data]);
  const crcBuf = u32be(crc32(crcData));
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
}

// PNG signature
const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

// IHDR chunk
const ihdrData = Buffer.alloc(13);
ihdrData.writeUInt32BE(SIZE, 0);  // width
ihdrData.writeUInt32BE(SIZE, 4);  // height
ihdrData[8] = 8;   // bit depth
ihdrData[9] = 2;   // color type: RGB (no alpha to keep it simple)
ihdrData[10] = 0;  // compression
ihdrData[11] = 0;  // filter
ihdrData[12] = 0;  // interlace

// Build raw image data (filter byte 0 = None, then RGB pixels)
// We stored RGBA but write RGB only
const rawRows = [];
for (let row = 0; row < SIZE; row++) {
  const rowBuf = Buffer.alloc(1 + SIZE * 3);
  rowBuf[0] = 0; // filter type None
  for (let col = 0; col < SIZE; col++) {
    const src = (row * SIZE + col) * 4;
    rowBuf[1 + col * 3 + 0] = pixels[src + 0];
    rowBuf[1 + col * 3 + 1] = pixels[src + 1];
    rowBuf[1 + col * 3 + 2] = pixels[src + 2];
  }
  rawRows.push(rowBuf);
}
const rawData = Buffer.concat(rawRows);

// Compress with zlib deflate (sync)
const compressed = zlib.deflateSync(rawData, { level: 6 });

// IDAT chunk
const idatChunk = makeChunk('IDAT', compressed);

// IEND chunk
const iendChunk = makeChunk('IEND', Buffer.alloc(0));

const png = Buffer.concat([
  PNG_SIG,
  makeChunk('IHDR', ihdrData),
  idatChunk,
  iendChunk,
]);

// ─── Write file ───────────────────────────────────────────────────────────────
const outPath = path.join(__dirname, 'assets', 'icon', 'icon.png');
fs.writeFileSync(outPath, png);
console.log(`Icon written to ${outPath} (${(png.length / 1024).toFixed(1)} KB)`);

// Also copy as icon_fg.png (same image for adaptive foreground)
const fgPath = path.join(__dirname, 'assets', 'icon', 'icon_fg.png');
fs.copyFileSync(outPath, fgPath);
console.log(`Foreground icon written to ${fgPath}`);
