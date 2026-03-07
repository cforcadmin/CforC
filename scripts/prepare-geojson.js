/**
 * One-time script: Download Eurostat NUTS2 GeoJSON for Greece + simplified Europe outline.
 * Run from project root: node scripts/prepare-geojson.js
 */

const fs = require('fs');
const path = require('path');

const GEO_DIR = path.join(__dirname, '..', 'public', 'geo');

async function downloadGreeceProvinces() {
  // Eurostat NUTS 2024 boundaries — NUTS level 2, 1:10M resolution, GeoJSON
  const url = 'https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_10M_2024_4326_LEVL_2.geojson';
  console.log('Downloading NUTS2 GeoJSON from Eurostat...');

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const data = await res.json();

  // Filter to Greece only (CNTR_CODE === "EL")
  const greeceFeatures = data.features.filter(f => f.properties.CNTR_CODE === 'EL');
  console.log(`Found ${greeceFeatures.length} Greek NUTS2 regions`);

  const greeceGeoJson = {
    type: 'FeatureCollection',
    features: greeceFeatures,
  };

  const outPath = path.join(GEO_DIR, 'greece-provinces-nuts2.json');
  fs.writeFileSync(outPath, JSON.stringify(greeceGeoJson));
  console.log(`Saved to ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
}

async function downloadEuropeOutline() {
  // Simple country boundaries — NUTS level 0, 20M resolution
  const url = 'https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_20M_2024_4326_LEVL_0.geojson';
  console.log('Downloading Europe outline from Eurostat...');

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const data = await res.json();

  // Filter to European countries (rough bounding box: lat 35-72, lon -25-45)
  const europeanCountries = data.features.filter(f => {
    const coords = f.geometry.coordinates;
    // Flatten to get any coordinate to check rough location
    const flat = JSON.stringify(coords);
    // Keep countries with NUTS_ID length 2 (country level)
    return f.properties.NUTS_ID && f.properties.NUTS_ID.length === 2;
  });

  // Keep only a subset of relevant European countries for a clean inset
  const keepCountries = new Set([
    'AT', 'BE', 'BG', 'CH', 'CY', 'CZ', 'DE', 'DK', 'EE', 'EL', 'ES',
    'FI', 'FR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'ME', 'MK',
    'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'RS', 'SE', 'SI', 'SK', 'TR',
    'UK', 'AL', 'BA', 'XK',
  ]);

  const filtered = europeanCountries.filter(f => keepCountries.has(f.properties.CNTR_CODE || f.properties.NUTS_ID));
  console.log(`Kept ${filtered.length} European countries`);

  const europeGeoJson = {
    type: 'FeatureCollection',
    features: filtered,
  };

  const outPath = path.join(GEO_DIR, 'europe-simple.json');
  fs.writeFileSync(outPath, JSON.stringify(europeGeoJson));
  console.log(`Saved to ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
}

async function main() {
  if (!fs.existsSync(GEO_DIR)) {
    fs.mkdirSync(GEO_DIR, { recursive: true });
  }

  await downloadGreeceProvinces();
  await downloadEuropeOutline();
  console.log('\nDone! GeoJSON files ready in public/geo/');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
