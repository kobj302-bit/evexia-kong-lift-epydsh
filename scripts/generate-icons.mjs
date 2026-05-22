import sharp from 'sharp';
import fs from 'node:fs';

const SIZE = 1024;
const PAD = 0.12;
const KONG_SIZE = Math.round(SIZE * (1 - PAD * 2));
const KONG_OFFSET = Math.round(SIZE * PAD);
const BG = '#1A2814';

// Resize Kong PNG to fit padded area (transparent bg preserved)
const kongResized = await sharp('assets/images/kong-happy.png')
  .resize(KONG_SIZE, KONG_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toBuffer();

// Solid green square base → assets/icon.png (iOS + fallback, no transparency)
await sharp({
  create: { width: SIZE, height: SIZE, channels: 4, background: BG },
})
  .composite([{ input: kongResized, top: KONG_OFFSET, left: KONG_OFFSET }])
  .flatten({ background: BG })
  .png()
  .toFile('assets/icon.png');

const iconStat = fs.statSync('assets/icon.png');
console.log(`assets/icon.png — ${(iconStat.size / 1024).toFixed(1)} KB`);

// Android adaptive foreground (transparent bg) → assets/images/kong-icon-foreground.png
await sharp({
  create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([{ input: kongResized, top: KONG_OFFSET, left: KONG_OFFSET }])
  .png()
  .toFile('assets/images/kong-icon-foreground.png');

const fgStat = fs.statSync('assets/images/kong-icon-foreground.png');
console.log(`assets/images/kong-icon-foreground.png — ${(fgStat.size / 1024).toFixed(1)} KB`);

// Verify dimensions via sharp metadata
const iconMeta = await sharp('assets/icon.png').metadata();
const fgMeta = await sharp('assets/images/kong-icon-foreground.png').metadata();

console.log(`assets/icon.png dimensions: ${iconMeta.width}x${iconMeta.height}`);
console.log(`assets/images/kong-icon-foreground.png dimensions: ${fgMeta.width}x${fgMeta.height}`);
console.log('Icons generated successfully');
