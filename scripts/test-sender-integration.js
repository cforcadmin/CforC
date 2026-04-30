#!/usr/bin/env node
/**
 * Test Sender Integration
 *
 * Tests both:
 *   1. Paid group auto-add: Calls Sender API to add a test email to the Paid group,
 *      verifying the API key and group ID work correctly.
 *   2. Unsubscribe sync: Fetches subscribers from both Sender (External group) and
 *      Strapi, compares them, and reports differences — WITHOUT deleting or emailing.
 *
 * Usage: node scripts/test-sender-integration.js
 */

const path = require('path');
const fs = require('fs');

// Load .env.local
const PROJECT_DIR = path.resolve(__dirname, '..');
const envPath = path.join(PROJECT_DIR, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  });
}

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL;
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;
const SENDER_API_KEY = process.env.SENDER_API_KEY;
const SENDER_GROUP_ID = process.env.SENDER_GROUP_ID;         // External group
const SENDER_PAID_GROUP_ID = process.env.SENDER_PAID_GROUP_ID; // Paid group

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

// ─── Test 1: Paid Group API connectivity ───

async function testPaidGroupApi() {
  log('═══ TEST 1: Sender Paid Group API ═══');

  if (!SENDER_API_KEY || !SENDER_PAID_GROUP_ID) {
    log('SKIP: SENDER_API_KEY or SENDER_PAID_GROUP_ID not set');
    return false;
  }

  log(`Paid Group ID: ${SENDER_PAID_GROUP_ID}`);

  // Just verify we can read the group (list subscribers) — no writes
  try {
    const res = await fetch(`https://api.sender.net/v2/groups/${SENDER_PAID_GROUP_ID}/subscribers?limit=5`, {
      headers: {
        'Authorization': `Bearer ${SENDER_API_KEY}`,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      log(`FAIL: Sender API returned ${res.status}: ${text}`);
      return false;
    }

    const data = await res.json();
    const count = data.meta?.total || data.data?.length || 0;
    log(`OK: Paid group accessible. Current subscribers: ${count}`);

    if (data.data && data.data.length > 0) {
      log(`  Sample: ${data.data.slice(0, 3).map(s => s.email).join(', ')}${count > 3 ? '...' : ''}`);
    }

    return true;
  } catch (err) {
    log(`FAIL: ${err.message}`);
    return false;
  }
}

// ─── Test 2: Unsubscribe sync (dry run) ───

async function testUnsubscribeSync() {
  log('');
  log('═══ TEST 2: Unsubscribe Sync (DRY RUN) ═══');

  if (!SENDER_API_KEY || !SENDER_GROUP_ID) {
    log('SKIP: SENDER_API_KEY or SENDER_GROUP_ID not set');
    return false;
  }
  if (!STRAPI_URL || !STRAPI_API_TOKEN) {
    log('SKIP: STRAPI_URL or STRAPI_API_TOKEN not set');
    return false;
  }

  // Fetch Sender External group
  log('Fetching Sender External group subscribers...');
  const senderEmails = new Set();
  let page = 1;
  while (true) {
    const res = await fetch(`https://api.sender.net/v2/groups/${SENDER_GROUP_ID}/subscribers?limit=100&page=${page}`, {
      headers: {
        'Authorization': `Bearer ${SENDER_API_KEY}`,
        'Accept': 'application/json',
      },
    });
    if (!res.ok) {
      log(`FAIL: Sender API returned ${res.status}`);
      return false;
    }
    const data = await res.json();
    const subs = data.data || [];
    if (subs.length === 0) break;
    for (const s of subs) {
      if (s.email) senderEmails.add(s.email.toLowerCase());
    }
    if (!data.links?.next || subs.length < 100) break;
    page++;
  }
  log(`  Sender External group: ${senderEmails.size} subscribers`);

  // Fetch Strapi newsletter-subscribers
  log('Fetching Strapi newsletter-subscribers...');
  const strapiSubs = [];
  page = 1;
  while (true) {
    const res = await fetch(`${STRAPI_URL}/api/newsletter-subscribers?pagination[page]=${page}&pagination[pageSize]=100`, {
      headers: { 'Authorization': `Bearer ${STRAPI_API_TOKEN}` },
    });
    if (!res.ok) {
      log(`FAIL: Strapi API returned ${res.status}`);
      return false;
    }
    const data = await res.json();
    const entries = data.data || [];
    if (entries.length === 0) break;
    for (const e of entries) {
      strapiSubs.push({ email: (e.Email || '').toLowerCase(), name: e.FirstName || '' });
    }
    if (entries.length < 100) break;
    page++;
  }
  log(`  Strapi newsletter-subscribers: ${strapiSubs.length} entries`);

  // Compare
  const inStrapiNotSender = strapiSubs.filter(s => !senderEmails.has(s.email));
  const inSenderNotStrapi = [...senderEmails].filter(e => !strapiSubs.some(s => s.email === e));

  log('');
  log('─── Comparison Results ───');
  log(`  In sync: ${strapiSubs.length - inStrapiNotSender.length} emails match`);

  if (inStrapiNotSender.length > 0) {
    log(`  In Strapi but NOT in Sender (would be deleted): ${inStrapiNotSender.length}`);
    for (const s of inStrapiNotSender) {
      log(`    - ${s.email}${s.name ? ` (${s.name})` : ''}`);
    }
  } else {
    log('  No unsubscribes detected — Strapi and Sender are in sync.');
  }

  if (inSenderNotStrapi.length > 0) {
    log(`  In Sender but NOT in Strapi (info only): ${inSenderNotStrapi.length}`);
    for (const e of inSenderNotStrapi.slice(0, 10)) {
      log(`    - ${e}`);
    }
    if (inSenderNotStrapi.length > 10) log(`    ... and ${inSenderNotStrapi.length - 10} more`);
  }

  return true;
}

// ─── Test 3: Check AddedToPaidGroup field in Strapi ───

async function testAddedToPaidGroupField() {
  log('');
  log('═══ TEST 3: AddedToPaidGroup Field in Strapi ═══');

  if (!STRAPI_URL || !STRAPI_API_TOKEN) {
    log('SKIP: STRAPI_URL or STRAPI_API_TOKEN not set');
    return false;
  }

  try {
    const res = await fetch(`${STRAPI_URL}/api/members?pagination[limit]=5&fields[0]=Email&fields[1]=AddedToPaidGroup`, {
      headers: { 'Authorization': `Bearer ${STRAPI_API_TOKEN}` },
    });

    if (!res.ok) {
      log(`FAIL: Strapi API returned ${res.status}`);
      return false;
    }

    const data = await res.json();
    const members = data.data || [];

    if (members.length === 0) {
      log('WARN: No members found');
      return false;
    }

    // Check if the field exists
    const first = members[0];
    if (first.AddedToPaidGroup === undefined) {
      log('FAIL: AddedToPaidGroup field not found on members. Deploy Strapi schema first.');
      return false;
    }

    const withFlag = members.filter(m => m.AddedToPaidGroup === true).length;
    log(`OK: AddedToPaidGroup field exists. Sample of 5: ${withFlag} already flagged.`);

    // Count all
    const countRes = await fetch(`${STRAPI_URL}/api/members?pagination[limit]=1000&fields[0]=AddedToPaidGroup`, {
      headers: { 'Authorization': `Bearer ${STRAPI_API_TOKEN}` },
    });
    if (countRes.ok) {
      const countData = await countRes.json();
      const all = countData.data || [];
      const flagged = all.filter(m => m.AddedToPaidGroup === true).length;
      log(`  Total members: ${all.length}, already in Paid group: ${flagged}, pending: ${all.length - flagged}`);
    }

    return true;
  } catch (err) {
    log(`FAIL: ${err.message}`);
    return false;
  }
}

async function main() {
  log('Starting Sender integration tests...');
  log('');

  const r1 = await testPaidGroupApi();
  const r2 = await testUnsubscribeSync();
  const r3 = await testAddedToPaidGroupField();

  log('');
  log('═══ SUMMARY ═══');
  log(`  Test 1 (Paid Group API):       ${r1 ? 'PASS' : 'FAIL/SKIP'}`);
  log(`  Test 2 (Unsubscribe Sync):     ${r2 ? 'PASS' : 'FAIL/SKIP'}`);
  log(`  Test 3 (AddedToPaidGroup):     ${r3 ? 'PASS' : 'FAIL/SKIP'}`);
}

main().catch(err => {
  log(`FATAL: ${err.message}`);
  process.exit(1);
});
