const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');

async function removeBackground(inputPath, outputPath) {
    try {
        const image = await loadImage(inputPath);
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d');
        
        ctx.drawImage(image, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Remove white or near-white background
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // If very close to white, make transparent
            if (r > 240 && g > 240 && b > 240) {
                data[i + 3] = 0;
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(outputPath, buffer);
        console.log(`Finished processing ${inputPath} -> ${outputPath}`);
    } catch (err) {
        console.error('Error processing image:', err);
    }
}

// Process assets
removeBackground('src/assets/bot-avatar-raw.png', 'src/assets/bot-avatar.png');
removeBackground('src/assets/logo-black.png', 'src/assets/logo-black-trans.png');
removeBackground('src/assets/logo-white.png', 'src/assets/logo-white-trans.png');
