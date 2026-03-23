import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { resolve } from 'path';

mkdirSync('public/icons', { recursive: true });
mkdirSync('public/screenshots', { recursive: true });

// Accept logo path as CLI arg — required
const SOURCE_LOGO = process.argv[2];
if (!SOURCE_LOGO) {
  console.error('Usage: node generate-icons.mjs /path/to/logo.png');
  process.exit(1);
}
console.log(`Using logo: ${SOURCE_LOGO}`);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

for (const size of sizes) {
  await sharp(SOURCE_LOGO)
    .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(`public/icons/icon-${size}x${size}.png`);
  console.log(`✓ icon-${size}x${size}.png`);
}

// Maskable: logo centered with white padding (safe zone = inner 80%)
await sharp(SOURCE_LOGO)
  .resize(410, 410, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 255 } })
  .extend({ top: 51, bottom: 51, left: 51, right: 51, background: { r: 255, g: 255, b: 255, alpha: 255 } })
  .png()
  .toFile('public/icons/icon-512x512-maskable.png');
console.log('✓ icon-512x512-maskable.png');

// Screenshots — logo centered on light background
const logo200 = await sharp(SOURCE_LOGO)
  .resize(200, 200, { fit: 'contain', background: { r: 248, g: 250, b: 252, alpha: 255 } })
  .png()
  .toBuffer();

const wideBase = await sharp({
  create: { width: 1280, height: 720, channels: 4, background: { r: 248, g: 250, b: 252, alpha: 255 } }
}).png().toBuffer();

await sharp(wideBase)
  .composite([{ input: logo200, left: 540, top: 260 }])
  .toFile('public/screenshots/screenshot-wide.png');
console.log('✓ screenshot-wide.png');

const logo150 = await sharp(SOURCE_LOGO)
  .resize(150, 150, { fit: 'contain', background: { r: 248, g: 250, b: 252, alpha: 255 } })
  .png()
  .toBuffer();

const narrowBase = await sharp({
  create: { width: 390, height: 844, channels: 4, background: { r: 248, g: 250, b: 252, alpha: 255 } }
}).png().toBuffer();

await sharp(narrowBase)
  .composite([{ input: logo150, left: 120, top: 347 }])
  .toFile('public/screenshots/screenshot-narrow.png');
console.log('✓ screenshot-narrow.png');

console.log('\nAll PWA assets generated from Eswari Capital logo!');
