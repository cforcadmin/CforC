#!/usr/bin/env node
/**
 * Παράγει τον κατάλογο πεδίων για τον Χάρτη δεδομένων (GDPR, άρθρο 30).
 *
 * ΓΙΑΤΙ ΔΕΝ ΔΙΑΒΑΖΕΤΑΙ ΖΩΝΤΑΝΑ: ο φάκελος StrapiDBforCforC είναι στο
 * .gitignore, άρα τα schema ΔΕΝ φτάνουν στο build της Vercel. Παράγουμε εδώ
 * ένα στιγμιότυπο και το δεσμεύουμε στο repo· η απόκλιση από την πραγματική
 * βάση ελέγχεται ξεχωριστά, ζωντανά, μέσα στην οθόνη.
 *
 * Τρέξε το μετά από ΚΑΘΕ αλλαγή schema:
 *     node scripts/generate-data-map.js
 */

const fs = require('fs')
const path = require('path')

const API_DIR = path.join(__dirname, '..', 'StrapiDBforCforC', 'src', 'api')
const OUT = path.join(__dirname, '..', 'lib', 'dataMapCatalog.json')

/**
 * Τι μετράει ως προσωπικό δεδομένο.
 *
 * Σκόπιμα ΓΕΝΝΑΙΟΔΩΡΟ: ένα ψευδώς θετικό το σβήνει ο άνθρωπος από τις
 * σημειώσεις, ένα ψευδώς αρνητικό μένει για χρόνια εκτός αρχείου. Το άρθρο 30
 * τιμωρεί το δεύτερο, όχι το πρώτο.
 */
const PERSONAL = [
  [/^email$|email/i, 'email'],
  [/phone|tel$|mobile|κινητ/i, 'τηλέφωνο'],
  [/iban|bank/i, 'τραπεζικός λογαριασμός'],
  [/signature|υπογραφ/i, 'υπογραφή'],
  [/afm|taxid|vat|αφμ/i, 'ΑΦΜ'],
  [/name|ονομ|επων/i, 'όνομα'],
  [/address|διεύθυνση|street/i, 'διεύθυνση'],
  [/city|province|πόλη|νομ/i, 'τόπος'],
  [/birth|γενν/i, 'ημερομηνία γέννησης'],
  [/photo|avatar|portrait|image|visual/i, 'εικόνα'],
  [/bio|about|βιογραφ/i, 'βιογραφικό'],
  [/password|token|secret|hash/i, 'διαπιστευτήριο'],
  [/^am$|memberid|μητρώ/i, 'αριθμός μητρώου'],
  [/receipt|invoice|παραστατικ|απόδειξ/i, 'παραστατικό'],
]

function classify(field) {
  for (const [re, kind] of PERSONAL) if (re.test(field)) return kind
  return null
}

const collections = []
for (const dir of fs.readdirSync(API_DIR).sort()) {
  const schemaPath = path.join(API_DIR, dir, 'content-types', dir, 'schema.json')
  if (!fs.existsSync(schemaPath)) continue
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'))
  const attrs = schema.attributes || {}
  const fields = Object.keys(attrs).sort().map(name => ({
    name,
    type: attrs[name].type,
    personal: classify(name),
  }))
  collections.push({
    api: dir,
    plural: schema.info?.pluralName || dir,
    displayName: schema.info?.displayName || dir,
    fields,
    personalCount: fields.filter(f => f.personal).length,
  })
}

const out = {
  generatedAt: new Date().toISOString(),
  note: 'Παράγεται από scripts/generate-data-map.js — μην το επεξεργάζεσαι με το χέρι',
  collections,
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n')

const withPersonal = collections.filter(c => c.personalCount > 0)
console.log(`Γράφτηκε ${path.relative(process.cwd(), OUT)}`)
console.log(`${collections.length} συλλογές · ${withPersonal.length} με προσωπικά δεδομένα`)
for (const c of withPersonal) {
  console.log(`  ${c.displayName.padEnd(26)} ${c.personalCount}/${c.fields.length}  ${c.fields.filter(f => f.personal).map(f => f.name).join(', ')}`)
}
