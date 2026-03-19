#!/usr/bin/env node
/**
 * Convert HTML slides to 1920×1080 PNG images using Puppeteer.
 *
 * Usage:
 *   npx puppeteer browsers install chrome   # first time only
 *   node scripts/slides-to-png.js           # converts all docs/slide*.html + docs/cover*.html
 *   node scripts/slides-to-png.js docs/slide1-oe-participants.html   # single file
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const glob = require('glob');

const WIDTH = 1920;
const HEIGHT = 1080;

async function convertSlide(browser, htmlPath, outputDir) {
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 2 }); // 2x for crisp output

  const absolutePath = path.resolve(htmlPath);
  await page.goto(`file://${absolutePath}`, { waitUntil: 'networkidle0' });

  const baseName = path.basename(htmlPath, '.html');
  const outputPath = path.join(outputDir, `${baseName}.png`);

  await page.screenshot({
    path: outputPath,
    clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT },
  });

  await page.close();
  console.log(`✓ ${baseName}.png`);
  return outputPath;
}

async function main() {
  const args = process.argv.slice(2);
  const outputDir = path.resolve(__dirname, '..', 'docs', 'slides-png');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Determine which files to convert
  let files;
  if (args.length > 0) {
    files = args;
  } else {
    const docsDir = path.resolve(__dirname, '..', 'docs');
    files = [
      ...glob.sync(path.join(docsDir, 'slide*.html')),
      ...glob.sync(path.join(docsDir, 'cover*.html')),
    ].sort();
  }

  if (files.length === 0) {
    console.log('No HTML slide files found.');
    return;
  }

  console.log(`Converting ${files.length} slides to ${WIDTH}×${HEIGHT} PNG...\n`);

  const browser = await puppeteer.launch({ headless: true });

  for (const file of files) {
    await convertSlide(browser, file, outputDir);
  }

  await browser.close();
  console.log(`\nDone! PNGs saved to: docs/slides-png/`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
