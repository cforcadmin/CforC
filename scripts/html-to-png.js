const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function convertHtmlToPng() {
  const annual25Dir = path.join(__dirname, '..', 'docs', 'Annual25');
  const docsDir = path.join(__dirname, '..', 'docs');

  // Collect all HTML files to convert
  const filesToConvert = [];

  // All .html files in Annual25 folder
  const annual25Files = fs.readdirSync(annual25Dir).filter(f => f.endsWith('.html'));
  for (const file of annual25Files) {
    filesToConvert.push({
      input: path.join(annual25Dir, file),
      output: path.join(annual25Dir, file.replace('.html', '.png')),
    });
  }

  // Slides 2 and 8 from docs folder (the plan slides edited yesterday)
  const extraFiles = ['annual2025-02-coordination-team.html', 'annual2025-08-partnerships.html'];
  for (const file of extraFiles) {
    const fullPath = path.join(docsDir, file);
    if (fs.existsSync(fullPath)) {
      filesToConvert.push({
        input: fullPath,
        output: path.join(annual25Dir, file.replace('.html', '.png')),
      });
    }
  }

  console.log(`Converting ${filesToConvert.length} HTML files to PNG...`);

  const browser = await puppeteer.launch({ headless: true });

  for (let i = 0; i < filesToConvert.length; i++) {
    const { input, output } = filesToConvert[i];
    const fileName = path.basename(input);

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

      const fileUrl = `file://${input}`;
      await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });

      // Wait a bit for fonts to load
      await new Promise(r => setTimeout(r, 1000));

      await page.screenshot({
        path: output,
        type: 'png',
        clip: { x: 0, y: 0, width: 1920, height: 1080 }
      });

      await page.close();
      console.log(`[${i + 1}/${filesToConvert.length}] ✓ ${fileName} → ${path.basename(output)}`);
    } catch (err) {
      console.error(`[${i + 1}/${filesToConvert.length}] ✗ ${fileName}: ${err.message}`);
    }
  }

  await browser.close();
  console.log('\nDone!');
}

convertHtmlToPng().catch(console.error);
