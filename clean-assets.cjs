const { Jimp } = require('jimp');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, 'src', 'assets');

async function cleanImage(filename, removeChecker = false) {
  try {
    const inputPath = path.join(ASSETS_DIR, filename);
    const outputPath = path.join(ASSETS_DIR, filename); // Overwrite
    
    console.log(`Processing: ${inputPath}`);
    const image = await Jimp.read(inputPath);
    
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      
      // Remove White/Near-White
      if (r > 240 && g > 240 && b > 240) {
        this.bitmap.data[idx + 3] = 0;
      }
      
      // Remove Checkerboard Grey (#CCCCCC / #D9D9D9 range)
      if (removeChecker) {
        if (r > 180 && r < 225 && g > 180 && g < 225 && b > 180 && b < 225) {
           // Double check it's a grey tone
           if (Math.abs(r - g) < 5 && Math.abs(g - b) < 5) {
             this.bitmap.data[idx + 3] = 0;
           }
        }
      }
    });
    
    await image.write(outputPath);
    console.log(`Successfully cleaned ${filename}`);
  } catch (err) {
    console.error(`Failed to clean ${filename}:`, err.message);
  }
}

async function run() {
  await cleanImage('bot-avatar.png');
  await cleanImage('logo-white.png', true);
  await cleanImage('logo-black.png', true);
  await cleanImage('logo-cartera.png');
  await cleanImage('logo-efigas.png');
  await cleanImage('logo-ph.png');
  await cleanImage('logo-juridico.png');
  await cleanImage('logo-emdata.png');
}

run();
