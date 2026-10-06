/* Rebuild with sharp available on NODE_PATH. Keep the original art for future edits. */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { ICONS } from '../public/core/icons.js';

const sharp = createRequire(import.meta.url)('sharp');
const root = fileURLToPath(new URL('../', import.meta.url));
const source = root + 'output/imagegen/ui-icons/menu-source.png';
const { width, height } = await sharp(source).metadata();
const layers = [];
for (let i = 0; i < ICONS.length; i++) {
  const name = ICONS[i];
  let image;
  if (i < 8) {
    const col = i % 4, row = Math.floor(i / 4);
    const left = Math.round(col * width / 4), top = Math.round(row * height / 2);
    image = sharp(source).extract({ left, top, width: Math.round((col + 1) * width / 4) - left, height: Math.round((row + 1) * height / 2) - top });
  } else {
    image = sharp(root + (i < 24 ? `public/assets/ui/${name}.webp` : `public/assets/games/defense/icon-${name}.png`));
  }
  const input = await sharp(await image.png().toBuffer()).trim().resize(56, 56, { fit: 'contain', background: '#00000000' }).extend({ top: 4, bottom: 4, left: 4, right: 4, background: '#00000000' }).png().toBuffer();
  layers.push({ input, left: (i % 8) * 64, top: Math.floor(i / 8) * 64 });
}
await sharp({ create: { width: 512, height: 256, channels: 4, background: '#00000000' } }).composite(layers).webp({ quality: 90, alphaQuality: 100 }).toFile(root + 'public/assets/ui/icons.webp');
console.log('Built 29 transparent icons in public/assets/ui/icons.webp (512×256, 64px cells).');
