/**
 * Check which member cities are not mapped in greekCities.ts or mapData.ts
 * Run: node scripts/check-unmapped-cities.js
 */
require('dotenv').config({ path: '.env.local' });

const url = process.env.STRAPI_URL;
const token = process.env.STRAPI_API_TOKEN;

async function main() {
  const res = await fetch(
    `${url}/api/members?pagination[limit]=1000&fields[0]=Name&fields[1]=City&fields[2]=HideProfile&fields[3]=Slug`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const json = await res.json();
  if (!json.data) {
    console.error('No data returned. Status:', res.status, 'Response:', JSON.stringify(json).slice(0, 200));
    return;
  }
  const members = json.data.filter(m => m.HideProfile !== true);

  // Load mappings from TS source files
  const fs = require('fs');
  const greekCitiesSrc = fs.readFileSync('./lib/greekCities.ts', 'utf8');
  const mapDataSrc = fs.readFileSync('./lib/mapData.ts', 'utf8');

  // Extract city keys from CITY_TO_PROVINCE
  const cityKeys = new Set();
  const cityMatches = greekCitiesSrc.matchAll(/'([^']+)':\s*\[/g);
  for (const m of cityMatches) cityKeys.add(m[1]);

  // Extract city keys from CITY_COORDINATES
  const coordMatches = mapDataSrc.matchAll(/export const CITY_COORDINATES[\s\S]*?\n\}$/gm);
  const coordSection = mapDataSrc.match(/CITY_COORDINATES[^}]+\{([^}]+(?:\{[^}]+\}[^}]*)*)\}/s);
  if (coordSection) {
    const coordKeys = coordSection[0].matchAll(/'([^']+)':\s*\[/g);
    for (const m of coordKeys) cityKeys.add(m[1]);
  }

  console.log(`\nLoaded ${cityKeys.size} mapped cities from greekCities.ts + CITY_COORDINATES`);

  const noCityMembers = members.filter(m => {
    const raw = m.City?.trim();
    return !raw || raw === '-';
  });

  console.log(`\n=== Members with empty/missing City field (${noCityMembers.length}) ===`);
  noCityMembers.forEach(m => console.log(`  - ${m.Name} (City: ${JSON.stringify(m.City)})`));

  const unmapped = [];
  members.forEach(m => {
    const raw = m.City?.trim();
    if (!raw || raw === '-') return;
    raw.split(',').map(c => c.trim()).filter(c => c && c !== '-').forEach(city => {
      if (!cityKeys.has(city)) {
        unmapped.push({ name: m.Name, city, slug: m.Slug });
      }
    });
  });

  const uniqueUnmapped = [...new Set(unmapped.map(u => u.city))];
  console.log(`\n=== Unmapped cities (${uniqueUnmapped.length}) — not in greekCities.ts or CITY_COORDINATES ===`);
  uniqueUnmapped.forEach(city => {
    const mems = unmapped.filter(u => u.city === city);
    console.log(`  - "${city}" (${mems.length} members): ${mems.map(m => m.name).join(', ')}`);
  });

  if (uniqueUnmapped.length > 0) {
    console.log('\nTo fix: add these cities to lib/greekCities.ts (CITY_TO_PROVINCE) or lib/mapData.ts (CITY_COORDINATES).');
  } else {
    console.log('\nAll cities are mapped!');
  }
}

main().catch(console.error);
