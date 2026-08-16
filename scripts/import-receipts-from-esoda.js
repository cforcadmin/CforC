/**
 * One-time import: ΕΣΟΔΑ 2026 receipts → Strapi receipt collection.
 *
 * Usage: node scripts/import-receipts-from-esoda.js <receipts.json>
 *
 * The JSON is produced by parsing the ΕΣΟΔΑ sheet (rows with ΑΠ. ΕΙΣ.
 * παραστατικό only — grants/ΕΝΤ rows are excluded). Existing numbers are
 * UPDATED with sheet data (e.g. a seed record); new numbers are created.
 * Field mapping per the 16 Aug 2026 decisions:
 *   column C = PaymentDate, column R = IssueDate, SheetSynced = true.
 */

const fs = require('fs');
const path = require('path');

// .env.local
const envPath = path.join(__dirname, '..', '.env.local');
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}
const STRAPI_URL = (process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL || '').trim();
const TOKEN = (process.env.STRAPI_API_TOKEN || '').trim();
if (!STRAPI_URL || !TOKEN) { console.error('Missing STRAPI_URL / STRAPI_API_TOKEN'); process.exit(1); }

const jsonPath = process.argv[2];
if (!jsonPath || !fs.existsSync(jsonPath)) { console.error('Usage: node import-receipts-from-esoda.js <receipts.json>'); process.exit(1); }
const rows = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

async function api(p, method = 'GET', data) {
  const res = await fetch(`${STRAPI_URL}/api${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    ...(data !== undefined && { body: JSON.stringify({ data }) }),
  });
  const json = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, json };
}

function mapRow(e) {
  const subFee = (e.older || 0) + (e.sub2025 || 0) + (e.sub2026 || 0);
  const amount = (e.regFee || 0) + subFee + (e.ektakta || 0) + (e.dorees || 0) + (e.epix || 0) + (e.xorigies || 0);
  let type = 'other';
  if (e.regFee > 0) type = 'registration';
  else if (subFee > 0) type = 'subscription';
  else if (e.dorees > 0) type = 'donation';
  else if (e.ektakta > 0) type = 'extraordinary';
  else if (e.xorigies > 0) type = 'grant';
  let year = null;
  if (e.sub2026 > 0) year = 2026;
  else if (e.sub2025 > 0) year = 2025;
  else { const m = /20\d\d/.exec(e.reason || ''); if (m) year = parseInt(m[0], 10); }
  return {
    Number: e.number,
    Type: type,
    Amount: amount,
    RegistrationFee: e.regFee > 0 ? e.regFee : null,
    SubscriptionFee: subFee > 0 ? subFee : null,
    SubscriptionYear: year,
    PaymentDate: e.dateC || e.dateR || null,
    IssueDate: e.dateR || e.dateC || null,
    MemberName: e.name || null,
    PaymentMethod: e.cash > 0 ? 'cash' : 'bank',
    SheetSynced: true,
    Notes: `Εισαγωγή από ΕΣΟΔΑ 2026 (Α/Α ${e.aa}) · ${e.reason}${e.symp > 0 ? ' · συμψηφισμός' : ''}`,
    CreatedBy: 'import-esoda-2026',
  };
}

(async () => {
  // existing numbers → documentId (to update instead of colliding)
  const existing = {};
  const ex = await api('/receipts?pagination[limit]=500&fields[0]=Number');
  for (const r of ex.json?.data || []) existing[r.Number] = r.documentId;
  console.log(`Existing in DB: ${Object.keys(existing).length}`);

  let created = 0, updated = 0, failed = 0;
  for (const e of rows.sort((a, b) => a.number - b.number)) {
    const data = mapRow(e);
    let res;
    if (existing[e.number]) {
      res = await api(`/receipts/${existing[e.number]}`, 'PUT', data);
      if (res.ok) { updated++; console.log(`~ ${e.number} updated (${data.MemberName})`); }
    } else {
      res = await api('/receipts', 'POST', data);
      if (res.ok) { created++; }
    }
    if (!res.ok) {
      failed++;
      console.error(`✗ ${e.number}: ${res.status} ${JSON.stringify(res.json?.error || {}).slice(0, 150)}`);
    }
  }
  const top = await api('/receipts?sort=Number:desc&pagination[limit]=1&fields[0]=Number');
  const count = await api('/receipts?pagination[limit]=1');
  console.log(`\nDone: ${created} created, ${updated} updated, ${failed} failed.`);
  console.log(`Total in DB: ${count.json?.meta?.pagination?.total} · Max number: ${top.json?.data?.[0]?.Number} · Next: ${(top.json?.data?.[0]?.Number || 0) + 1}`);
})();
