#!/usr/bin/env node
/**
 * Φύλακας φρεσκάδας αντιγράφων — τρέχει ΚΑΘΕ ΜΕΡΑ, ανεξάρτητα από το backup.
 *
 * ΓΙΑΤΙ ΞΕΧΩΡΙΣΤΟ ΑΡΧΕΙΟ. Το backup-strapi-db.js μπορεί να αναφέρει μόνο
 * όσα βλέπει ΟΤΑΝ ΤΡΕΧΕΙ. Δεν μπορεί να πει «δεν έτρεξα» — αν ο Mac
 * κοιμόταν στις 10:00 της 1ης του μήνα, δεν εκτελείται καμία γραμμή του
 * και κανείς δεν μαθαίνει τίποτα. Ακριβώς αυτό έγινε: τελευταίο επιτυχές
 * αντίγραφο 16/8/2026, η εκτέλεση της 1/9 απέτυχε χωρίς δίκτυο, και το
 * κενό φάνηκε στις 30/9 — 45 μέρες αργότερα, κατά τύχη.
 *
 * Η ΛΟΓΙΚΗ ΕΙΝΑΙ ΑΝΤΙΣΤΡΟΦΗ: δεν περιμένουμε μήνυμα όταν κάτι σπάει —
 * ελέγχουμε την ΑΠΟΥΣΙΑ επιτυχίας. Μια σιωπή που διαρκεί είναι το σήμα.
 *
 * ΧΩΡΙΣ ΔΙΚΤΥΟ: κοιτάζει τον δίσκο και ειδοποιεί με macOS notification.
 * Δεν στέλνει email επίτηδες — το email ήταν ακριβώς ο κρίκος που έσπασε.
 *
 * Usage: node scripts/check-backup-freshness.js
 * Exit:  0 = φρέσκο · 1 = μπαγιάτικο ή λείπει
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BACKUP_ROOT = path.join(path.resolve(__dirname, '..'), '_Database_Backup');

/** Το πρόγραμμα είναι ΜΗΝΙΑΙΟ (1η του μήνα, 10:00). Στις 40 ημέρες έχει
 *  σίγουρα χαθεί μια εκτέλεση — όχι απλώς καθυστέρησε. */
const MAX_AGE_DAYS = 40;

/** Πόσα αρχεία δεδομένων περιμένουμε· λιγότερα = μισό αντίγραφο */
const EXPECTED_DATA_FILES = 7;

function notify(title, message) {
  try {
    const esc = (s) => String(s).replace(/[\\"]/g, '').replace(/[\r\n]+/g, ' ').slice(0, 200);
    execSync(
      `osascript -e 'display notification "${esc(message)}" with title "${esc(title)}" sound name "Basso"'`,
      { stdio: 'pipe', timeout: 10000 }
    );
  } catch (err) {
    // Αν δεν περνά ούτε η ειδοποίηση, μένει η έξοδος != 0 και το stdout
  }
}

function fail(msg) {
  console.error(`STALE: ${msg}`);
  notify('CforC backup is stale', msg);
  process.exit(1);
}

if (!fs.existsSync(BACKUP_ROOT)) {
  fail('Ο φάκελος _Database_Backup δεν υπάρχει καν.');
}

const dirs = fs.readdirSync(BACKUP_ROOT)
  .filter((d) => d.startsWith('strapi-backup-'))
  .filter((d) => fs.statSync(path.join(BACKUP_ROOT, d)).isDirectory())
  .sort();

if (dirs.length === 0) {
  fail('Δεν υπάρχει ΚΑΝΕΝΑ αντίγραφο στον δίσκο.');
}

const newest = dirs[dirs.length - 1];
const newestPath = path.join(BACKUP_ROOT, newest);

// Η ημερομηνία βγαίνει από το ΟΝΟΜΑ, όχι από το mtime: ένα `cp` ή ένα
// άγγιγμα του φακέλου θα έκανε ένα παλιό αντίγραφο να δείχνει φρέσκο.
const m = newest.match(/^strapi-backup-(\d{4})-(\d{2})-(\d{2})_/);
if (!m) fail(`Το νεότερο αντίγραφο έχει όνομα που δεν διαβάζεται: ${newest}`);

const backupDate = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
const ageDays = Math.floor((Date.now() - backupDate.getTime()) / 86400000);

// Μισό αντίγραφο είναι χειρότερο από κανένα: σε αφήνει να νομίζεις ότι έχεις.
const dataDir = path.join(newestPath, 'data');
const dataFiles = fs.existsSync(dataDir)
  ? fs.readdirSync(dataDir).filter((f) => f.endsWith('.json')).length
  : 0;

if (dataFiles < EXPECTED_DATA_FILES) {
  fail(`Το νεότερο αντίγραφο (${newest}) έχει ${dataFiles}/${EXPECTED_DATA_FILES} αρχεία δεδομένων — ατελές.`);
}

if (ageDays > MAX_AGE_DAYS) {
  fail(`Τελευταίο αντίγραφο πριν από ${ageDays} ημέρες (${newest}). Το πρόγραμμα είναι μηνιαίο.`);
}

console.log(`OK: ${newest} — ${ageDays} ημερών, ${dataFiles} αρχεία δεδομένων.`);
process.exit(0);
