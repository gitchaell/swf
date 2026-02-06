import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const SVG_PATH = path.join(process.cwd(), 'public', 'logo.svg');
const PUBLIC_DIR = path.join(process.cwd(), 'public');

async function generate() {
    console.log('Generating assets from', SVG_PATH);
    const svgBuffer = fs.readFileSync(SVG_PATH);

    // Favicon.ico (We will save as png, browsers handle it)
    await sharp(svgBuffer)
        .resize(32, 32)
        .png()
        .toFile(path.join(PUBLIC_DIR, 'favicon.ico'));
    console.log('Generated favicon.ico');

    // PWA 192
    await sharp(svgBuffer)
        .resize(192, 192)
        .png()
        .toFile(path.join(PUBLIC_DIR, 'pwa-192x192.png'));
    console.log('Generated pwa-192x192.png');

    // PWA 512
    await sharp(svgBuffer)
        .resize(512, 512)
        .png()
        .toFile(path.join(PUBLIC_DIR, 'pwa-512x512.png'));
    console.log('Generated pwa-512x512.png');
}

generate().catch(console.error);
