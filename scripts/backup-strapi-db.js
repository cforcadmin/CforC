#!/usr/bin/env node
/**
 * Strapi Full Backup Script
 *
 * Downloads ALL collection data as JSON + ALL referenced media files.
 * Produces a manifest.json that maps every media file back to its
 * source collection, entry (documentId + name/title), and field,
 * so the entire database can be restored from scratch.
 *
 * Destinations:
 *   1. Local:  Website/_Database_Backup/strapi-backup-DATE/  (JSON + media)
 *   2. GitHub: StrapiDBforCforC/backups/DATE/       (JSON + manifest only, no media)
 *   3. Google Drive: CforC-Backups/DATE/            (JSON + media, via rclone if configured)
 *
 * Notifications:
 *   Sends email to it@cultureforchange.net on success or failure via Resend.
 *
 * Usage:  node scripts/backup-strapi-db.js
 * Cron:   Runs automatically every 10 days
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { execSync } = require('child_process');

// ─── Config ──────────────────────────────────────────────
const PROJECT_DIR = path.resolve(__dirname, '..');
const STRAPI_REPO_DIR = path.join(PROJECT_DIR, 'StrapiDBforCforC');
const BACKUP_ROOT = path.join(PROJECT_DIR, '_Database_Backup');
const MAX_LOCAL_BACKUPS = 5;
const NOTIFY_EMAIL = 'finance@cultureforchange.net';
const RCLONE_REMOTE = 'CforC_WebsiteDB_BACKUP:CforC-Backups'; // rclone remote name

// Load .env.local
const envPath = path.join(PROJECT_DIR, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const val = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL;
const TOKEN = process.env.STRAPI_API_TOKEN;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!STRAPI_URL || !TOKEN) {
  console.error('ERROR: Missing STRAPI_URL or STRAPI_API_TOKEN in .env.local');
  process.exit(1);
}

// Collections to back up
const COLLECTIONS = [
  { endpoint: 'members?populate=*&pagination[limit]=1000', name: 'members', labelField: 'Name' },
  { endpoint: 'activities?populate=*&pagination[limit]=1000', name: 'activities', labelField: 'Title' },
  { endpoint: 'open-calls?populate=*&pagination[limit]=1000', name: 'open-calls', labelField: 'Title' },
  { endpoint: 'projects?populate[cover_image]=true&populate[project_images]=true&populate[partners][populate]=logo&populate[external_links]=true&populate[project_entries][populate][cover_image]=true&populate[supporters_banner_light]=true&populate[supporters_banner_dark]=true&pagination[limit]=1000', name: 'projects', labelField: 'title' },
  { endpoint: 'working-groups?populate=*&pagination[limit]=1000', name: 'working-groups', labelField: 'Title' },
  { endpoint: 'coordination-teams?populate=*&pagination[limit]=1000', name: 'coordination-teams', labelField: 'name' },
  { endpoint: 'newsletters?populate=*&pagination[limit]=1000', name: 'newsletters', labelField: 'Title' },
];

// ─── Helpers ─────────────────────────────────────────────

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      timeout: 60000,
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error(`Invalid JSON from ${url}: ${body.slice(0, 100)}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout: ${url}`)); });
  });
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout: 120000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} downloading ${url}`));
        return;
      }
      const file = fs.createWriteStream(destPath);
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
      file.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout downloading ${url}`)); });
  });
}

/**
 * Recursively find all media objects in a Strapi response.
 */
function extractMediaFromValue(value, currentPath = '') {
  const results = [];
  if (!value || typeof value !== 'object') return results;

  if (value.url && value.mime) {
    const entry = {
      url: value.url,
      fieldPath: currentPath,
      name: value.name || null,
      mime: value.mime,
      formats: {},
    };
    if (value.formats && typeof value.formats === 'object') {
      for (const [formatName, formatData] of Object.entries(value.formats)) {
        if (formatData && formatData.url) {
          entry.formats[formatName] = formatData.url;
        }
      }
    }
    results.push(entry);
    return results;
  }

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      results.push(...extractMediaFromValue(value[i], `${currentPath}[${i}]`));
    }
    return results;
  }

  for (const [key, val] of Object.entries(value)) {
    if (key === 'meta' || key === 'pagination') continue;
    results.push(...extractMediaFromValue(val, currentPath ? `${currentPath}.${key}` : key));
  }

  return results;
}

function absoluteUrl(url) {
  if (url.startsWith('http')) return url;
  return `${STRAPI_URL}${url}`;
}

function safeFilename(url) {
  const urlObj = new URL(absoluteUrl(url));
  return urlObj.pathname
    .replace(/^\/uploads\//, '')
    .replace(/\//g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Send email notification via Resend
 */
async function sendEmail(subject, htmlBody) {
  if (!RESEND_API_KEY) {
    console.log('WARN: No RESEND_API_KEY — skipping email notification');
    return;
  }

  const payload = JSON.stringify({
    from: 'CforC Backup <it@cultureforchange.net>',
    to: [NOTIFY_EMAIL],
    subject: subject,
    html: htmlBody,
  });

  return new Promise((resolve, reject) => {
    const req = https.request('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 15000,
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('Email notification sent successfully');
          resolve();
        } else {
          console.log(`Email send failed (HTTP ${res.statusCode}): ${body}`);
          reject(new Error(`Email failed: ${body}`));
        }
      });
    });
    req.on('error', (err) => {
      console.log(`Email send error: ${err.message}`);
      reject(err);
    });
    req.write(payload);
    req.end();
  });
}

/**
 * Push JSON data + manifest to GitHub (StrapiDBforCforC repo)
 */
function pushToGitHub(backupDir, dateStr) {
  const githubBackupDir = path.join(STRAPI_REPO_DIR, 'backups', dateStr);

  if (!fs.existsSync(STRAPI_REPO_DIR)) {
    console.log('WARN: StrapiDBforCforC repo not found — skipping GitHub push');
    return false;
  }

  try {
    // Create backup folder in Strapi repo
    fs.mkdirSync(githubBackupDir, { recursive: true });

    // Copy JSON data files
    const dataDir = path.join(backupDir, 'data');
    const ghDataDir = path.join(githubBackupDir, 'data');
    fs.mkdirSync(ghDataDir, { recursive: true });

    for (const file of fs.readdirSync(dataDir)) {
      fs.copyFileSync(path.join(dataDir, file), path.join(ghDataDir, file));
    }

    // Copy manifest and summary
    for (const file of ['manifest.json', 'summary.txt']) {
      const src = path.join(backupDir, file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(githubBackupDir, file));
      }
    }

    // Keep only last 5 backups in the repo too
    const ghBackupsRoot = path.join(STRAPI_REPO_DIR, 'backups');
    if (fs.existsSync(ghBackupsRoot)) {
      const dirs = fs.readdirSync(ghBackupsRoot)
        .filter(d => fs.statSync(path.join(ghBackupsRoot, d)).isDirectory())
        .sort()
        .reverse();

      for (let i = MAX_LOCAL_BACKUPS; i < dirs.length; i++) {
        fs.rmSync(path.join(ghBackupsRoot, dirs[i]), { recursive: true, force: true });
      }
    }

    // Git add, commit, push
    execSync('git add backups/', { cwd: STRAPI_REPO_DIR, stdio: 'pipe' });

    // Check if there are changes to commit
    const status = execSync('git status --porcelain backups/', { cwd: STRAPI_REPO_DIR }).toString().trim();
    if (!status) {
      console.log('GitHub: No changes to commit');
      return true;
    }

    execSync(`git commit -m "Automated backup ${dateStr}"`, { cwd: STRAPI_REPO_DIR, stdio: 'pipe' });
    execSync('git push origin main', { cwd: STRAPI_REPO_DIR, stdio: 'pipe', timeout: 60000 });

    console.log('GitHub: Backup pushed successfully');
    return true;
  } catch (err) {
    console.log(`GitHub push failed: ${err.message}`);
    return false;
  }
}

/**
 * Sync full backup (with media) to Google Drive via rclone
 */
function syncToGoogleDrive(backupDir, dateStr) {
  try {
    // Check if rclone is installed and configured
    execSync('which rclone', { stdio: 'pipe' });
    execSync('rclone listremotes', { stdio: 'pipe' });
  } catch {
    console.log('WARN: rclone not installed or not configured — skipping Google Drive sync');
    return false;
  }

  try {
    const remotePath = `${RCLONE_REMOTE}/${dateStr}`;
    execSync(`rclone copy "${backupDir}" "${remotePath}" --progress`, {
      stdio: 'pipe',
      timeout: 1800000, // 30 min timeout for large uploads
    });

    // Clean old backups on Drive (keep last 5)
    try {
      const lsOutput = execSync(`rclone lsd "${RCLONE_REMOTE}"`, { stdio: 'pipe' }).toString();
      const driveDirs = lsOutput
        .split('\n')
        .map(line => line.trim().split(/\s+/).pop())
        .filter(d => d && d.startsWith('2'))
        .sort()
        .reverse();

      for (let i = MAX_LOCAL_BACKUPS; i < driveDirs.length; i++) {
        execSync(`rclone purge "${RCLONE_REMOTE}/${driveDirs[i]}"`, { stdio: 'pipe', timeout: 30000 });
      }
    } catch (cleanupErr) {
      console.log(`Google Drive cleanup warning: ${cleanupErr.message}`);
    }

    console.log('Google Drive: Backup synced successfully');
    return true;
  } catch (err) {
    console.log(`Google Drive sync failed: ${err.message}`);
    return false;
  }
}

// ─── Main ────────────────────────────────────────────────

async function main() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 16).replace('T', '_').replace(':', '');
  const backupDir = path.join(BACKUP_ROOT, `strapi-backup-${dateStr}`);
  const dataDir = path.join(backupDir, 'data');
  const mediaDir = path.join(backupDir, 'media');
  const logLines = [];
  const errors = [];

  function log(msg) {
    const line = `[${new Date().toISOString()}] ${msg}`;
    console.log(line);
    logLines.push(line);
  }

  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(mediaDir, { recursive: true });

  log(`Starting full backup to ${backupDir}`);
  log(`Strapi URL: ${STRAPI_URL}`);

  // ── Phase 1: Download JSON data ──
  const manifest = {
    backupDate: now.toISOString(),
    strapiUrl: STRAPI_URL,
    collections: {},
    media: [],
  };

  let totalEntries = 0;
  let successCollections = 0;

  for (const col of COLLECTIONS) {
    try {
      const url = `${STRAPI_URL}/api/${col.endpoint}`;
      log(`Fetching ${col.name}...`);
      const json = await fetchJSON(url);

      const filePath = path.join(dataDir, `${col.name}.json`);
      fs.writeFileSync(filePath, JSON.stringify(json, null, 2));

      const entries = col.isSingle ? (json.data ? [json.data] : []) : (json.data || []);
      totalEntries += entries.length;
      successCollections++;

      manifest.collections[col.name] = {
        entryCount: entries.length,
        file: `data/${col.name}.json`,
        labelField: col.labelField,
      };

      for (const entry of entries) {
        const entryId = entry.documentId || entry.id || 'unknown';
        const entryLabel = col.labelField ? (entry[col.labelField] || entryId) : entryId;
        const mediaItems = extractMediaFromValue(entry);

        for (const media of mediaItems) {
          const localName = safeFilename(media.url);
          const mediaEntry = {
            collection: col.name,
            entryDocumentId: entry.documentId || null,
            entryId: entry.id || null,
            entryLabel: entryLabel,
            field: media.fieldPath,
            originalUrl: absoluteUrl(media.url),
            localFile: `media/${localName}`,
            mime: media.mime,
            formats: {},
          };

          for (const [formatName, formatUrl] of Object.entries(media.formats)) {
            const formatLocalName = `${formatName}_${safeFilename(formatUrl)}`;
            mediaEntry.formats[formatName] = {
              originalUrl: absoluteUrl(formatUrl),
              localFile: `media/${formatLocalName}`,
            };
          }

          manifest.media.push(mediaEntry);
        }
      }

      log(`  OK ${col.name}: ${entries.length} entries`);
    } catch (err) {
      log(`  FAIL ${col.name}: ${err.message}`);
      errors.push(`${col.name}: ${err.message}`);
      manifest.collections[col.name] = { error: err.message };
    }
  }

  if (successCollections === 0) {
    log('ERROR: All collection downloads failed. Strapi may be down.');

    await sendEmail(
      '🔴 CforC Backup FAILED — Strapi is down',
      `<h2 style="color:#e53e3e;">Backup Failed</h2>
       <p><strong>Date:</strong> ${now.toISOString()}</p>
       <p><strong>Reason:</strong> All API requests failed. Strapi appears to be down.</p>
       <h3>Errors:</h3>
       <ul>${errors.map(e => `<li>${e}</li>`).join('')}</ul>
       <p>Please check Strapi Cloud dashboard immediately:<br>
       <a href="https://cloud.strapi.io">cloud.strapi.io</a></p>`
    ).catch(() => {});

    fs.rmSync(backupDir, { recursive: true, force: true });
    process.exit(1);
  }

  // ── Phase 2: Download media files ──
  const allUrls = new Map();
  for (const m of manifest.media) {
    allUrls.set(m.originalUrl, m.localFile);
    for (const fmt of Object.values(m.formats)) {
      allUrls.set(fmt.originalUrl, fmt.localFile);
    }
  }

  const totalMedia = allUrls.size;
  log(`Downloading ${totalMedia} media files...`);

  let mediaSuccess = 0;
  let mediaFailed = 0;
  let downloaded = 0;

  const urlEntries = [...allUrls.entries()];
  for (let i = 0; i < urlEntries.length; i += 5) {
    const batch = urlEntries.slice(i, i + 5);
    const promises = batch.map(async ([url, localFile]) => {
      const destPath = path.join(backupDir, localFile);
      try {
        await downloadFile(url, destPath);
        mediaSuccess++;
      } catch (err) {
        mediaFailed++;
        log(`  WARN: Failed to download ${url}: ${err.message}`);
      }
      downloaded++;
      if (downloaded % 100 === 0 || downloaded === totalMedia) {
        log(`  Media progress: ${downloaded}/${totalMedia}`);
      }
    });
    await Promise.all(promises);
  }

  log(`Media download complete: ${mediaSuccess} OK, ${mediaFailed} failed`);

  // ── Phase 3: Write manifest and summary ──
  fs.writeFileSync(
    path.join(backupDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  const summary = [
    `STRAPI BACKUP SUMMARY`,
    `=====================`,
    `Date: ${now.toISOString()}`,
    `Strapi: ${STRAPI_URL}`,
    ``,
    `COLLECTIONS:`,
    ...Object.entries(manifest.collections).map(([name, info]) =>
      info.error
        ? `  ${name}: FAILED (${info.error})`
        : `  ${name}: ${info.entryCount} entries`
    ),
    ``,
    `MEDIA: ${mediaSuccess} files downloaded (${mediaFailed} failed)`,
    ``,
    `MEDIA MAPPING (collection → entry → field → file):`,
    ``,
  ];

  const mediaByCollection = {};
  for (const m of manifest.media) {
    if (!mediaByCollection[m.collection]) mediaByCollection[m.collection] = [];
    mediaByCollection[m.collection].push(m);
  }

  for (const [colName, items] of Object.entries(mediaByCollection)) {
    summary.push(`── ${colName} ──`);
    for (const m of items) {
      summary.push(`  ${m.entryLabel}`);
      summary.push(`    documentId: ${m.entryDocumentId}`);
      summary.push(`    field: ${m.field}`);
      summary.push(`    file: ${m.localFile}`);
      if (Object.keys(m.formats).length > 0) {
        for (const [fmt, fmtData] of Object.entries(m.formats)) {
          summary.push(`    ${fmt}: ${fmtData.localFile}`);
        }
      }
    }
    summary.push(``);
  }

  fs.writeFileSync(path.join(backupDir, 'summary.txt'), summary.join('\n'));

  // ── Phase 4: Cleanup old local backups ──
  if (fs.existsSync(BACKUP_ROOT)) {
    const dirs = fs.readdirSync(BACKUP_ROOT)
      .filter(d => d.startsWith('strapi-backup-') && fs.statSync(path.join(BACKUP_ROOT, d)).isDirectory())
      .sort()
      .reverse();

    for (let i = MAX_LOCAL_BACKUPS; i < dirs.length; i++) {
      const oldDir = path.join(BACKUP_ROOT, dirs[i]);
      fs.rmSync(oldDir, { recursive: true, force: true });
      log(`Removed old local backup: ${dirs[i]}`);
    }
  }

  // ── Phase 5: Push to GitHub (JSON + manifest only) ──
  log('Pushing to GitHub...');
  const githubOk = pushToGitHub(backupDir, dateStr);

  // ── Phase 6: Sync to Google Drive (full backup with media) ──
  log('Syncing to Google Drive...');
  const gdriveOk = syncToGoogleDrive(backupDir, dateStr);

  // ── Phase 7: Append to persistent log ──
  const logFile = path.join(BACKUP_ROOT, 'backup.log');
  fs.appendFileSync(logFile, logLines.join('\n') + '\n---\n');

  log(`Backup complete! ${totalEntries} entries, ${mediaSuccess} media files.`);

  // ── Phase 8: Send email notification ──
  const collectionRows = Object.entries(manifest.collections)
    .map(([name, info]) => {
      if (info.error) return `<tr><td>${name}</td><td style="color:#e53e3e;">FAILED</td><td>${info.error}</td></tr>`;
      return `<tr><td>${name}</td><td style="color:#38a169;">${info.entryCount} entries</td><td>OK</td></tr>`;
    }).join('');

  const destinations = [];
  destinations.push('Local: ✅');
  destinations.push(`GitHub: ${githubOk ? '✅' : '⚠️ Failed'}`);
  destinations.push(`Google Drive: ${gdriveOk ? '✅' : '⚠️ Not configured or failed'}`);

  const hasErrors = errors.length > 0 || mediaFailed > 0 || !githubOk;
  const emailSubject = hasErrors
    ? `⚠️ CforC Backup completed with warnings — ${now.toISOString().slice(0, 10)}`
    : `✅ CforC Backup successful — ${now.toISOString().slice(0, 10)}`;

  await sendEmail(emailSubject,
    `<div style="font-family:sans-serif;max-width:600px;">
      <h2 style="color:${hasErrors ? '#d69e2e' : '#38a169'};">
        ${hasErrors ? 'Backup Completed with Warnings' : 'Backup Successful'}
      </h2>
      <p><strong>Date:</strong> ${now.toISOString()}</p>
      <p><strong>Total entries:</strong> ${totalEntries}</p>
      <p><strong>Media files:</strong> ${mediaSuccess} downloaded, ${mediaFailed} failed</p>

      <h3>Collections</h3>
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
        <tr style="background:#f7f7f7;"><th>Collection</th><th>Status</th><th>Details</th></tr>
        ${collectionRows}
      </table>

      <h3>Backup Destinations</h3>
      <ul>
        ${destinations.map(d => `<li>${d}</li>`).join('')}
      </ul>

      ${errors.length > 0 ? `<h3 style="color:#e53e3e;">Errors</h3><ul>${errors.map(e => `<li>${e}</li>`).join('')}</ul>` : ''}

      <hr>
      <p style="font-size:12px;color:#888;">
        Automated backup by CforC Website backup script.<br>
        Manifest: manifest.json maps every media file to its source entry for full restorability.
      </p>
    </div>`
  ).catch((err) => {
    log(`Failed to send email notification: ${err.message}`);
  });
}

main().catch(async (err) => {
  console.error('Backup script failed:', err);

  // Try to send failure email
  if (RESEND_API_KEY) {
    await sendEmail(
      '🔴 CforC Backup FAILED — Script error',
      `<h2 style="color:#e53e3e;">Backup Script Crashed</h2>
       <p><strong>Error:</strong> ${err.message}</p>
       <pre>${err.stack}</pre>`
    ).catch(() => {});
  }

  process.exit(1);
});
