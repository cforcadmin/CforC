#!/usr/bin/env node
/**
 * Sync Sender.net Unsubscribes
 *
 * Compares Sender "External" group subscribers with Strapi newsletter-subscribers.
 * Any email in Strapi but NOT in Sender gets:
 *   1. Deleted from Strapi
 *   2. Sent a farewell email via Resend
 *
 * Run on the 12th of each month (before the 15th newsletter send).
 * Usage: node scripts/sync-sender-unsubscribes.js
 */

const path = require('path');
const fs = require('fs');
const https = require('https');

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
const SENDER_GROUP_ID = process.env.SENDER_GROUP_ID; // External group
const RESEND_API_KEY = process.env.RESEND_API_KEY;

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

// Fetch all subscribers from a Sender group (paginated)
async function fetchSenderSubscribers() {
  const emails = new Set();
  let page = 1;
  const limit = 100;

  while (true) {
    const url = `https://api.sender.net/v2/groups/${SENDER_GROUP_ID}/subscribers?limit=${limit}&page=${page}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${SENDER_API_KEY}`,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Sender API error (${res.status}): ${text}`);
    }

    const data = await res.json();
    const subscribers = data.data || [];
    if (subscribers.length === 0) break;

    for (const sub of subscribers) {
      if (sub.email) emails.add(sub.email.toLowerCase());
    }

    // Check if there are more pages
    if (!data.links?.next || subscribers.length < limit) break;
    page++;
  }

  return emails;
}

// Fetch all confirmed subscribers from Strapi
async function fetchStrapiSubscribers() {
  const subscribers = [];
  let page = 1;
  const pageSize = 100;

  while (true) {
    const url = `${STRAPI_URL}/api/newsletter-subscribers?pagination[page]=${page}&pagination[pageSize]=${pageSize}`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${STRAPI_API_TOKEN}` },
    });

    if (!res.ok) throw new Error(`Strapi API error: ${res.status}`);

    const data = await res.json();
    const entries = data.data || [];
    if (entries.length === 0) break;

    for (const entry of entries) {
      subscribers.push({
        id: entry.id,
        documentId: entry.documentId,
        email: (entry.Email || '').toLowerCase(),
        firstName: entry.FirstName || '',
        lastName: entry.LastName || '',
      });
    }

    if (entries.length < pageSize) break;
    page++;
  }

  return subscribers;
}

// Delete a subscriber from Strapi
async function deleteStrapiSubscriber(documentId) {
  const res = await fetch(`${STRAPI_URL}/api/newsletter-subscribers/${documentId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${STRAPI_API_TOKEN}` },
  });
  return res.ok;
}

// Send farewell email
async function sendFarewellEmail(email, firstName) {
  const name = firstName || '';
  const greeting = name ? `Αγαπητέ/ή ${name},` : 'Αγαπητέ/ή,';

  const html = `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"></head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f7fafc;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <div style="background-color: #FF6B4A; padding: 30px 20px; text-align: center; border-radius: 24px 24px 0 0;">
            <div style="background-color: white; display: inline-block; padding: 15px 30px; border-radius: 16px;">
              <h1 style="color: #2d3748; margin: 0; font-size: 20px;">CULTURE FOR CHANGE</h1>
            </div>
          </div>
          <div style="padding: 40px 30px;">
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">${greeting}</p>
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
              Λυπούμαστε που αποχωρείς από τη λίστα αλληλογραφίας μας. Η απεγγραφή σου έχει ολοκληρωθεί.
            </p>
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
              Αν θέλεις, μπορείς να απαντήσεις σε αυτό το email με μια σύντομη εξήγηση για τον λόγο αποχώρησής σου. Θα το εκτιμούσαμε πολύ — μας βοηθάει να βελτιωθούμε!
            </p>
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
              Αν αλλάξεις γνώμη, μπορείς πάντα να εγγραφείς ξανά στο
              <a href="https://cultureforchange.net" style="color: #FF6B4A; text-decoration: none;">cultureforchange.net</a>.
            </p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <p style="color: #4a5568; font-size: 16px;">Με εκτίμηση,</p>
              <p style="color: #2d3748; font-size: 16px; font-weight: 600;">Η Συντονιστική Ομάδα του Culture for Change</p>
            </div>
          </div>
          <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-radius: 0 0 24px 24px;">
            <p style="color: #718096; font-size: 14px; margin: 0;">
              Culture for Change | Αλεξάνδρας 48, 11473, Αθήνα
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  const payload = JSON.stringify({
    from: 'Culture for Change <communication@cultureforchange.net>',
    reply_to: 'communication@cultureforchange.net',
    to: [email],
    subject: 'Απεγγραφή από το Newsletter - Culture for Change',
    html,
  });

  return new Promise((resolve) => {
    const req = https.request('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(true);
        } else {
          log(`  Farewell email failed for ${email}: ${body}`);
          resolve(false);
        }
      });
    });
    req.on('error', () => resolve(false));
    req.write(payload);
    req.end();
  });
}

async function main() {
  log('Starting Sender unsubscribe sync...');

  if (!STRAPI_URL || !STRAPI_API_TOKEN || !SENDER_API_KEY || !SENDER_GROUP_ID) {
    log('ERROR: Missing required environment variables');
    process.exit(1);
  }

  // 1. Fetch both lists
  log('Fetching Sender subscribers...');
  const senderEmails = await fetchSenderSubscribers();
  log(`  Sender: ${senderEmails.size} subscribers`);

  log('Fetching Strapi subscribers...');
  const strapiSubscribers = await fetchStrapiSubscribers();
  log(`  Strapi: ${strapiSubscribers.length} subscribers`);

  // 2. Find emails in Strapi but NOT in Sender (unsubscribed)
  const unsubscribed = strapiSubscribers.filter(s => !senderEmails.has(s.email));

  if (unsubscribed.length === 0) {
    log('No unsubscribes detected. Strapi and Sender are in sync.');
    return;
  }

  log(`Found ${unsubscribed.length} unsubscribed email(s):`);
  for (const sub of unsubscribed) {
    log(`  - ${sub.email}`);
  }

  // 3. Delete from Strapi and send farewell emails
  let deleted = 0;
  let emailed = 0;
  for (const sub of unsubscribed) {
    const docId = sub.documentId || sub.id;
    const ok = await deleteStrapiSubscriber(docId);
    if (ok) {
      deleted++;
      log(`  Deleted from Strapi: ${sub.email}`);
    } else {
      log(`  FAILED to delete from Strapi: ${sub.email}`);
    }

    if (RESEND_API_KEY) {
      const sent = await sendFarewellEmail(sub.email, sub.firstName);
      if (sent) emailed++;
    }
  }

  log(`Sync complete: ${deleted} deleted from Strapi, ${emailed} farewell emails sent.`);
}

main().catch(err => {
  log(`FATAL: ${err.message}`);
  process.exit(1);
});
