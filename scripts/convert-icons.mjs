import sharp from 'sharp';
import { readFile } from 'fs/promises';
import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.resolve(__dirname, '..', 'public', 'icons');

async function convertSvgToPng(svgPath, pngPath, size) {
  const svg = await readFile(svgPath, 'utf-8');
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(pngPath);
  console.log(`Created ${pngPath} (${size}x${size})`);
}

async function main() {
  await convertSvgToPng(
    path.join(iconsDir, 'icon-192x192.svg'),
    path.join(iconsDir, 'icon-192x192.png'),
    192
  );
  await convertSvgToPng(
    path.join(iconsDir, 'icon-512x512.svg'),
    path.join(iconsDir, 'icon-512x512.png'),
    512
  );
}

main().catch(console.error);
