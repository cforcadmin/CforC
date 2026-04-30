const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function convertPlanToPng() {
  const docsDir = path.join(__dirname, '..', 'docs');
  const outputDir = path.join(docsDir, 'FINALpng');

  // All plan*.html files in docs folder
  const planFiles = fs.readdirSync(docsDir).filter(f => f.startsWith('plan') && f.endsWith('.html'));

  console.log(`Converting ${planFiles.length} plan HTML files to PNG...`);

  const browser = await puppeteer.launch({ headless: true });

  for (let i = 0; i < planFiles.length; i++) {
    const file = planFiles[i];
    const input = path.join(docsDir, file);
    const output = path.join(outputDir, file.replace('.html', '.png'));

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

      await page.goto(`file://${input}`, { waitUntil: 'networkidle0', timeout: 30000 });
      await new Promise(r => setTimeout(r, 1000));

      await page.screenshot({
        path: output,
        type: 'png',
        clip: { x: 0, y: 0, width: 1920, height: 1080 }
      });

      await page.close();
      console.log(`[${i + 1}/${planFiles.length}] ✓ ${file} → ${file.replace('.html', '.png')}`);
    } catch (err) {
      console.error(`[${i + 1}/${planFiles.length}] ✗ ${file}: ${err.message}`);
    }
  }

  await browser.close();
  console.log('\nDone!');
}

convertPlanToPng().catch(console.error);
