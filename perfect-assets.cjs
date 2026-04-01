const { Jimp } = require('jimp');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, 'src', 'assets');

async function perfectImage(filename, mode = 'default') {
  try {
    const inputPath = path.join(ASSETS_DIR, filename);
    const outputPath = path.join(ASSETS_DIR, filename.replace('.png', '-perfect.png'));
    
    const image = await Jimp.read(inputPath);
    
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      const alpha = this.bitmap.data[idx + 3];

      if (mode === 'logo-white') {
        // Keep only pure white or near pure white
        // Remove everything else (checkerboard, etc)
        const isWhite = r > 240 && g > 240 && b > 240;
        if (!isWhite) {
          this.bitmap.data[idx + 3] = 0;
        }
      } else if (mode === 'logo-black') {
        // Keep only dark colors
        const isDark = r < 100 && g < 100 && b < 100;
        if (!isDark) {
          this.bitmap.data[idx + 3] = 0;
        }
      } else if (mode === 'bot') {
        // Remove white or near-white (background/halo)
        const isLight = r > 240 && g > 240 && b > 240;
        if (isLight) {
          this.bitmap.data[idx + 3] = 0;
        }
      }
    });
    
    await image.write(outputPath);
    console.log(`Perfected: ${filename} -> ${outputPath}`);
  } catch (err) {
    console.error(`Failed ${filename}:`, err.message);
  }
}

async function run() {
  await perfectImage('bot-avatar.png', 'bot');
  await perfectImage('logo-white.png', 'logo-white');
  await perfectImage('logo-black.png', 'logo-black');
}

run();
