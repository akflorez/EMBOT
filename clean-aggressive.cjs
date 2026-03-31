const { Jimp } = require('jimp');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, 'src', 'assets');

async function cleanAggressive(filename, keepWhite = false) {
  try {
    const inputPath = path.join(ASSETS_DIR, filename);
    const outputPath = path.join(ASSETS_DIR, filename.replace('.png', '-clean.png'));
    
    const image = await Jimp.read(inputPath);
    
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      
      // LOGIC: If a pixel is "Grey-ish" (R~G~B) and not Pure White (if keepWhite is true), make transparent.
      // Or if it's "Light" but not the color we want.
      
      const isGrey = Math.abs(r - g) < 10 && Math.abs(g - b) < 10;
      const isLight = r > 150 && g > 150 && b > 150;
      
      if (isGrey && isLight) {
        // If it's a WHITE letter and we want to keep it:
        if (keepWhite && r > 240 && g > 240 && b > 240) {
          // Keep it
        } else {
          // It's part of the grey checkerboard
          this.bitmap.data[idx + 3] = 0;
        }
      }
    });
    
    await image.write(outputPath);
    console.log(`Aggressively cleaned: ${filename} -> ${outputPath}`);
  } catch (err) {
    console.error(`Failed ${filename}:`, err.message);
  }
}

async function run() {
  await cleanAggressive('bot-avatar.png'); // Bot: remove all grey/white edges
  await cleanAggressive('logo-white.png', true); // White logo: keep white letters, remove grey checkers
  await cleanAggressive('logo-black.png', false); // Black logo: remove all light/grey checkers
}

run();
