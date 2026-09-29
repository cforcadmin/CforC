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
  [/^bankname$/i, 'όνομα τράπεζας'],   // η τράπεζα, όχι ο λογαριασμός
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

/**
 * Τύποι που ΔΕΝ μπορούν να κρατούν όνομα, email, IBAN ή ΑΦΜ, όσο κι αν
 * μοιάζει το όνομα του πεδίου.
 *
 * Χωρίς αυτό, το `VatAmount` (decimal — ποσό ΦΠΑ) καταγραφόταν ως «ΑΦΜ» και
 * το `ReceiptType` (enumeration: Φυσικό πρόσωπο / Εταιρεία) ως «παραστατικό».
 * Ο έλεγχος τύπου είναι μηχανικός και σωστός· τα υπόλοιπα ψευδώς θετικά
 * θέλουν ανθρώπινη κρίση και ζουν στο lib/dataMap.ts.
 *
 * Οι ημερομηνίες ΔΕΝ αποκλείονται: η ημερομηνία γέννησης είναι προσωπικό
 * δεδομένο και είναι date.
 */
const IMPOSSIBLE_TYPES = new Set([
  'decimal', 'integer', 'float', 'biginteger', 'boolean', 'enumeration',
])

function classify(field, attr) {
  const type = attr?.type
  /**
   * ΣΧΕΣΗ ΠΡΟΣ ΜΕΛΟΣ = προσωπικά δεδομένα δι' αναφοράς.
   *
   * Το πιο σοβαρό κενό της πρώτης εκδοχής: 21 πεδία σχέσης δείχνουν στο
   * `member` και κανένα δεν είχε εντοπιστεί. Οι Ομάδες Εργασίας και οι
   * Εργασίες OC έλειπαν ΟΛΟΚΛΗΡΕΣ από το αρχείο του άρθρου 30, ενώ η Ομάδα
   * Συντονισμού μετριόταν για τα ΛΑΘΟΣ πεδία.
   */
  if (type === 'relation' && /api::member\.member/.test(String(attr?.target || ''))) {
    return 'σύνδεση με μέλος'
  }
  if (IMPOSSIBLE_TYPES.has(type)) return null
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
    personal: classify(name, attrs[name]),
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
