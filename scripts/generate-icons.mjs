// Run with: node scripts/generate-icons.mjs
// Requires: npm install canvas (or use online tool)
// For now, creates placeholder HTML to generate icons
import { writeFileSync } from 'fs';
import { join } from 'path';

const sizes = [192, 512];
const svgTemplate = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#0f172a"/>
  <text x="${size/2}" y="${size/2 + size*0.12}" text-anchor="middle" fill="#0ea5e9" font-size="${size*0.4}" font-family="sans-serif" font-weight="bold">EE</text>
</svg>`;

sizes.forEach(size => {
  writeFileSync(join('public', 'icons', `icon-${size}x${size}.svg`), svgTemplate(size));
  console.log(`Created icon-${size}x${size}.svg`);
});

console.log('\nSVG placeholders created. Convert to PNG using:');
console.log('1. Online converter (e.g., cloudconvert.com)');
console.log('2. Or install `npm install -D canvas` and add rasterization logic');
