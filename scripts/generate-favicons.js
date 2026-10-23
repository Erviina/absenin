const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Centered SVG logo mark (only the icon, no text)
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160" fill="none">
  <g transform="translate(5, 8)">
    <path 
      d="M 134,74 L 134,110 A 18,18 0 0 1 116,128 L 34,128 A 18,18 0 0 1 16,110 L 16,34 A 18,18 0 0 1 34,16 L 116,16 A 18,18 0 0 1 134,34 L 72,96 L 50,74" 
      fill="none" 
      stroke="#1E4738" 
      stroke-width="15" 
      stroke-linecap="round" 
      stroke-linejoin="round" 
    />
  </g>
</svg>`;

// Helper to create an ICO buffer containing multiple PNG images
function createIco(pngBuffers) {
  const headerLength = 6;
  const dirEntryLength = 16;
  const numImages = pngBuffers.length;
  
  let offset = headerLength + (dirEntryLength * numImages);
  const header = Buffer.alloc(headerLength);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // ICO type
  header.writeUInt16LE(numImages, 4); // Number of images

  const entries = [];
  for (const { buffer, size } of pngBuffers) {
    const entry = Buffer.alloc(dirEntryLength);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // Width
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // Height
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(buffer.length, 8); // Image data size
    entry.writeUInt32LE(offset, 12); // Image offset
    entries.push(entry);
    offset += buffer.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers.map(p => p.buffer)]);
}

async function run() {
  const svgBuffer = Buffer.from(svgContent);

  // 1. Save SVG
  const svgDest = path.join(__dirname, '../public/img/assets/logo-icon.svg');
  const appSvgDest = path.join(__dirname, '../src/app/icon.svg');
  fs.writeFileSync(svgDest, svgContent);
  fs.writeFileSync(appSvgDest, svgContent);

  // 2. Generate PNG sizes
  const sizes = [16, 32, 48, 180, 192, 512];
  const pngs = {};
  for (const s of sizes) {
    pngs[s] = await sharp(svgBuffer).resize(s, s).png().toBuffer();
  }

  // 3. Save standard icon files
  fs.writeFileSync(path.join(__dirname, '../public/img/assets/logo-icon.png'), pngs[512]);
  fs.writeFileSync(path.join(__dirname, '../public/img/assets/logo-icon-192.png'), pngs[192]);
  fs.writeFileSync(path.join(__dirname, '../src/app/icon.png'), pngs[192]);
  fs.writeFileSync(path.join(__dirname, '../src/app/apple-icon.png'), pngs[180]);

  // 4. Create multi-resolution ICO file (16, 32, 48)
  const icoBuffer = createIco([
    { buffer: pngs[16], size: 16 },
    { buffer: pngs[32], size: 32 },
    { buffer: pngs[48], size: 48 },
  ]);

  fs.writeFileSync(path.join(__dirname, '../public/favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(__dirname, '../src/app/favicon.ico'), icoBuffer);

  console.log('Successfully generated all favicons and icons without text!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
