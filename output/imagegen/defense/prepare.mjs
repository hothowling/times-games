import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let sharp;
try { sharp = require('sharp'); }
catch {
  sharp = require('/Users/bsjung/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
}
const root = path.resolve(import.meta.dirname, '../../..');
const destination = path.join(root, 'public/assets/games/defense');
const generation = JSON.parse(await fs.readFile(path.join(import.meta.dirname, 'generation.json'), 'utf8'));
await fs.mkdir(destination, { recursive: true });
const assets = {};
const clear = { r: 0, g: 0, b: 0, alpha: 0 };

async function alphaBounds(source, threshold = 8) {
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = -1, bottom = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] <= threshold) continue;
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
  }
  if (right < left) throw new Error('Empty transparent image');
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

async function spriteStrip(source, frameWidth, frameHeight, columns, rows, inset = 0) {
  const { width, height } = await sharp(source).metadata();
  const frames = [];
  for (let index = 0; index < columns * rows; index++) {
    const col = index % columns, row = Math.floor(index / columns);
    const left = Math.round(col * width / columns), top = Math.round(row * height / rows);
    const right = Math.round((col + 1) * width / columns), bottom = Math.round((row + 1) * height / rows);
    let frame = sharp(source).extract({ left, top, width: right - left, height: bottom - top })
      .resize(frameWidth - inset * 2, frameHeight - inset * 2, { fit: 'fill', kernel: 'lanczos3' });
    if (inset) frame = frame.extend({ top: inset, bottom: inset, left: inset, right: inset, background: clear });
    const input = await frame.png().toBuffer();
    frames.push({ input, left: index * frameWidth, top: 0 });
  }
  return sharp({ create: { width: frameWidth * columns * rows, height: frameHeight, channels: 4, background: clear } })
    .composite(frames).png().toBuffer();
}

const zombieSizes = { normal: 96, fast: 80, tank: 140, quiz: 104 };
const intactRecord = generation.records.find(record => record.id === 'fence-intact');
const intactMeta = intactRecord && await sharp(intactRecord.source).metadata();
const plankBounds = intactRecord && await alphaBounds(intactRecord.source);

for (const record of generation.records) {
  const { id, source } = record;
  let filename = `${id}.png`, buffer, info;
  if (id in zombieSizes) {
    const size = zombieSizes[id];
    filename = `zombie-${id}.png`;
    buffer = await spriteStrip(source, size, size, 3, 2, id === 'quiz' ? 2 : 0);
    info = { frameWidth: size, frameHeight: size, frameCount: 6,
      animations: { walk: { frames: [0, 1, 2, 3], fps: id === 'fast' ? 12 : 8, loop: true },
        bite: { frames: [4, 5], fps: 8, loop: true } }, anchor: [0.5, 0.9] };
  } else if (id === 'explosion') {
    buffer = await spriteStrip(source, 128, 128, 4, 2);
    info = { frameWidth: 128, frameHeight: 128, frameCount: 8, fps: 20, loop: false, anchor: [0.5, 0.5] };
  } else if (id.startsWith('fence-') && id !== 'fence-rail') {
    // One shared source rectangle keeps all three damage states on the same scale and baseline.
    const meta = await sharp(source).metadata();
    const scaleX = meta.width / intactMeta.width, scaleY = meta.height / intactMeta.height;
    const left = Math.max(0, Math.round((plankBounds.left - 8) * scaleX));
    const top = Math.max(0, Math.round((plankBounds.top - 8) * scaleY));
    const width = Math.min(meta.width - left, Math.round((plankBounds.width + 16) * scaleX));
    const height = Math.min(meta.height - top, Math.round((plankBounds.height + 16) * scaleY));
    buffer = await sharp(source).extract({ left, top, width, height })
      .resize(64, 112, { fit: 'contain', background: clear }).png().toBuffer();
    info = { anchor: [0.5, 1] };
  } else if (id === 'background') {
    const { width, height } = await sharp(source).metadata();
    // Source art's grass-to-yard boundary is at y=1220 on its 1870px canvas.
    // Normalize both sections separately so the final yard occupies exactly 30%.
    const boundary = Math.round(height * 1220 / 1870);
    const field = await sharp(source).extract({ left: 0, top: 0, width, height: boundary })
      .resize(720, 1120, { fit: 'fill' }).png().toBuffer();
    const yard = await sharp(source).extract({ left: 0, top: boundary, width, height: height - boundary })
      .resize(720, 480, { fit: 'fill' }).png().toBuffer();
    buffer = await sharp({ create: { width: 720, height: 1600, channels: 3, background: '#83a848' } })
      .composite([{ input: field, left: 0, top: 0 }, { input: yard, left: 0, top: 1120 }]).removeAlpha().png().toBuffer();
    info = { fieldHeight: 1120, yardHeight: 480, yardStart: 1120 };
  } else if (id === 'thumbnail') {
    buffer = await sharp(source).resize(234, 234, { fit: 'cover' }).png().toBuffer();
  } else {
    const bounds = await alphaBounds(source);
    let width, height;
    if (id === 'fence-rail') { width = 360; height = 24; }
    else if (id.startsWith('missile-')) { width = 48; height = 20; }
    else if (id.startsWith('icon-')) { width = 128; height = 128; }
    else throw new Error(`Unknown asset: ${id}`);
    const margin = id.startsWith('icon-') ? 7 : id.startsWith('missile-') ? 1 : 0;
    const trimmed = await sharp(source).extract(bounds).resize(width - margin * 2, height - margin * 2,
      { fit: id === 'fence-rail' ? 'fill' : 'contain', background: clear }).png().toBuffer();
    buffer = await sharp({ create: { width, height, channels: 4, background: clear } })
      .composite([{ input: trimmed, left: margin, top: margin }]).png().toBuffer();
    info = id.startsWith('missile-') ? { level: Number(id.slice(8)), facing: 'right', anchor: [0.5, 0.5] } : {};
  }
  await fs.writeFile(path.join(destination, filename), buffer);
  const meta = await sharp(buffer).metadata();
  assets[id] = { file: filename, width: meta.width, height: meta.height, transparent: meta.hasAlpha, ...info };
}
await fs.writeFile(path.join(destination, 'manifest.json'), JSON.stringify({
  version: 1, basePath: 'assets/games/defense/', format: 'png', frameIndexBase: 0,
  spriteLayout: 'horizontal', generationTool: 'built-in image_gen', assets
}, null, 2) + '\n');
console.log(`Prepared ${Object.keys(assets).length} assets in ${destination}`);
