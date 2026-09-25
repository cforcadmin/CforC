// Sheet bridge for the CforC Μητρώο — Apps Script Web App transport.
//
// The Google Sheet runs our Apps Script, deployed as a Web App executing as
// the sheet's owner. The website POSTs JSON with a shared secret; the script
// writes the row itself. No service account, no Google Cloud keys (the org
// policy blocks key creation anyway), and all sheet logic stays in one place.
//
// Env vars (server-only):
//   SHEET_WEBAPP_URL     the /exec URL from Apps Script → Deploy → Web app
//   SHEET_WEBAPP_SECRET  shared secret (must match WEBAPP_SECRET in the script)

const WEBAPP_URL = process.env.SHEET_WEBAPP_URL
const WEBAPP_SECRET = process.env.SHEET_WEBAPP_SECRET

export function sheetsConfigured(): boolean {
  return !!(WEBAPP_URL && WEBAPP_SECRET)
}

export interface ApplicantRow {
  applicationDate: string   // dd/MM/yyyy
  lastName: string
  firstName: string
  gender: string
  email: string
  phone: string
  residenceCity: string
  activityCities: string
  reviewUrl: string
}

/**
 * Appends an applicant to «Νέα Μέλη → Προς έγκριση» via the Web App.
 * Throws on failure — callers treat the Sheet as best-effort (Strapi is
 * the source of truth) and record SheetSynced accordingly.
 */
export async function appendApplicantToSheet(row: ApplicantRow): Promise<void> {
  if (!WEBAPP_URL || !WEBAPP_SECRET) throw new Error('Sheet web app not configured')

  // Apps Script answers via a 302 redirect — fetch follows it by default.
  const res = await fetch(WEBAPP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: WEBAPP_SECRET,
      action: 'appendApplicant',
      row,
    }),
    redirect: 'follow',
  })
  if (!res.ok) {
    throw new Error(`Sheet web app HTTP ${res.status}: ${await res.text().catch(() => '')}`)
  }
  const json = await res.json().catch(() => null)
  if (!json?.ok) {
    throw new Error(`Sheet web app rejected: ${json?.error || 'unknown error'}`)
  }
}

/**
 * Applies an OC decision to the Sheet: moves the applicant's row from
 * «Προς έγκριση» to ΕΓΚΕΚΡΙΜΕΝΑ (ΠΛΗΡΩΜΗ=Όχι) or ΜΗ ΕΓΚΕΚΡΙΜΕΝΑ.
 * Throws on failure — the caller records the miss so the row can be moved
 * by hand (Strapi is already updated and remains the source of truth).
 */
/**
 * Executes the Sheet's member-deletion flow (snapshot → «Διαγρ. Μέλη»,
 * removal from Επισκόπηση/Συνδρομές) for the given ΑΜ. Initiated from the
 * OC — the Sheet skips its own back-sync (the site already updated Strapi).
 */
export async function sendMemberRemovalToSheet(am: number): Promise<void> {
  if (!WEBAPP_URL || !WEBAPP_SECRET) throw new Error('Sheet web app not configured')
  const res = await fetch(WEBAPP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: WEBAPP_SECRET, action: 'removeMember', am }),
    redirect: 'follow',
  })
  if (!res.ok) {
    throw new Error(`Sheet web app HTTP ${res.status}: ${await res.text().catch(() => '')}`)
  }
  const json = await res.json().catch(() => null)
  if (!json?.ok) {
    throw new Error(`Sheet web app rejected: ${json?.error || 'unknown error'}`)
  }
}

/**
 * Records a subscription payment from the OC (Financer): the Sheet sets
 * ΠΛΗΡΩΜΗ = «Ναι» on the applicant's ΕΓΚΕΚΡΙΜΕΝΑ row and runs the full
 * promotion (ΑΜ, Επισκόπηση/Συνδρομές, member creation via sheet-sync).
 * Returns the assigned ΑΜ. Throws on failure.
 */
export async function sendPaymentToSheet(email: string): Promise<string> {
  if (!WEBAPP_URL || !WEBAPP_SECRET) throw new Error('Sheet web app not configured')
  const res = await fetch(WEBAPP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: WEBAPP_SECRET, action: 'recordPayment', email }),
    redirect: 'follow',
  })
  if (!res.ok) {
    throw new Error(`Sheet web app HTTP ${res.status}: ${await res.text().catch(() => '')}`)
  }
  const json = await res.json().catch(() => null)
  if (!json?.ok) {
    throw new Error(`Sheet web app rejected: ${json?.error || 'unknown error'}`)
  }
  return String(json.am || '')
}

export async function sendDecisionToSheet(email: string, decision: 'approved' | 'rejected'): Promise<void> {
  if (!WEBAPP_URL || !WEBAPP_SECRET) throw new Error('Sheet web app not configured')
  const res = await fetch(WEBAPP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: WEBAPP_SECRET,
      action: 'decide',
      email,
      decision,
    }),
    redirect: 'follow',
  })
  if (!res.ok) {
    throw new Error(`Sheet web app HTTP ${res.status}: ${await res.text().catch(() => '')}`)
  }
  const json = await res.json().catch(() => null)
  if (!json?.ok) {
    throw new Error(`Sheet web app rejected: ${json?.error || 'unknown error'}`)
  }
}

/**
 * Σβήνει τη γραμμή ενός/μιας εγκεκριμένου/ης αιτούντα/ούσας από τα
 * ΕΓΚΕΚΡΙΜΕΝΑ (ΠΛΗΡΩΜΗ=Όχι), όταν πέρασε άπρακτη η προθεσμία των 30 ημερών.
 *
 * Δεν κάνει τη δουλειά του `removeMember`: εκείνο δουλεύει με ΑΜ και τρέχει
 * ολόκληρη τη ροή διαγραφής μέλους (snapshot, Επισκόπηση, Συνδρομές). Εδώ
 * δεν υπάρχει ΑΜ — δεν έγινε ποτέ μέλος — ούτε snapshot: η υπόσχεση που
 * δόθηκε στα γράμματα ήταν ότι διαγράφονται ΟΛΑ τα στοιχεία.
 *
 * Πετάει σε αποτυχία: ο caller το γράφει στο email ειδοποίησης ως εκκρεμότητα
 * αντί να το καταπιεί — μια γραμμή που μένει στο φύλλο με ονοματεπώνυμο,
 * email και τηλέφωνο ακυρώνει ό,τι μόλις υποσχεθήκαμε.
 */
export async function removeApplicantFromSheet(email: string): Promise<void> {
  if (!WEBAPP_URL || !WEBAPP_SECRET) throw new Error('Sheet web app not configured')

  // Κρύα εκκίνηση: η πρώτη κλήση μετά από αδράνεια μπορεί να γυρίσει σελίδα
  // σφάλματος ή την απάντηση του doGet («CforC OC bridge…») αντί για JSON,
  // ενώ στο Apps Script η εκτέλεση φαίνεται Completed — δηλαδή η ΔΟΥΛΕΙΑ ΕΓΙΝΕ
  // και χάθηκε μόνο η απάντηση. Μετρημένο: 2/2 αποτυχίες σε κρύο, 6/6 επιτυχίες
  // σε ζεστό (24/9/26).
  //
  // Το cron τρέχει μία φορά την ημέρα, άρα ΚΑΘΕ πραγματική διαγραφή είναι κρύα
  // κλήση. Χωρίς επανάληψη, το email ειδοποίησης θα έγραφε «η γραμμή μένει στο
  // φύλλο» για γραμμές που είχαν ήδη καθαριστεί.
  //
  // Η επανάληψη είναι ασφαλής ΕΔΩ επειδή η ενέργεια είναι idempotent: αν η
  // γραμμή καθαρίστηκε στην πρώτη προσπάθεια, η δεύτερη γυρίζει row 0.
  // ΔΕΝ ισχύει για τα recordPayment/removeMember/decide — εκείνα αποδίδουν ΑΜ
  // και μετακινούν γραμμές, οπότε μια τυφλή επανάληψη θα διπλασίαζε ενέργειες.
  let lastError = ''
  let definitive = false
  for (let attempt = 1; attempt <= 3; attempt++) {
    if (attempt > 1) await new Promise(r => setTimeout(r, 3000))
    try {
      const res = await fetch(WEBAPP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: WEBAPP_SECRET, action: 'removeApplicant', email }),
        redirect: 'follow',
      })
      const text = await res.text()
      if (!res.ok) { lastError = `HTTP ${res.status}`; continue }
      let json: any = null
      try { json = JSON.parse(text) } catch {
        // HTML σελίδα ή το κείμενο του doGet — όχι απάντηση της ενέργειας
        lastError = 'μη αναγνωρίσιμη απάντηση (κρύα εκκίνηση;)'
        continue
      }
      // Καθαρή απάντηση με ok:false είναι ΚΡΙΣΗ του script, όχι δικτυακή αστοχία
      // (π.χ. «δεν βρέθηκε το μπλοκ»). Η επανάληψη δεν θα άλλαζε τίποτα.
      // ΔΕΝ πετάμε εδώ μέσα: το catch του βρόχου θα το κατάπινε και θα ξανάτρεχε.
      if (!json?.ok) { lastError = String(json?.error || 'unknown error'); definitive = true; break }
      return
    } catch (e) {
      lastError = (e as Error).message
    }
  }
  throw new Error(`Sheet web app: ${lastError}${definitive ? '' : ' (3 προσπάθειες)'}`)
}

/**
 * Καταχωρεί πληρωμένη συνδρομή έτους στο Μητρώο: γράφει στην Επισκόπηση και
 * το Apps Script καθρεφτίζει στις Συνδρομές.
 *
 * Γιατί υπάρχει: το `recordPayment` αφορά ΝΕΟ μέλος (αποδίδει ΑΜ, τρέχει όλη
 * την προαγωγή). Για ανανέωση παλιού μέλους δεν υπήρχε ΚΑΜΙΑ διαδρομή προς το
 * Μητρώο — η πληρωμή ζούσε μόνο στο Strapi και στο ΕΣΟΔΑ.
 *
 * Το έτος δίνεται ΡΗΤΑ, δεν υποτίθεται το τρέχον: στις 25/9/2026 ένα μέλος
 * πλήρωσε 2025 και 2026 μαζί, με χωριστή απόδειξη το καθένα.
 *
 * Επανάληψη όπως στο removeApplicantFromSheet, για τον ίδιο μετρημένο λόγο:
 * η κλήση που ΟΝΤΩΣ γράφει χάνει την απάντησή της σε κρύα εκκίνηση (3/3 φορές
 * στη δοκιμή). Ασφαλής επειδή η ενέργεια είναι idempotent — γράφει την ίδια
 * τιμή στο ίδιο κελί.
 */
export async function recordSubscriptionYearInSheet(
  am: number | string,
  year: number,
  value: number | string = 1,
): Promise<void> {
  if (!WEBAPP_URL || !WEBAPP_SECRET) throw new Error('Sheet web app not configured')
  const amClean = String(am ?? '').trim()
  if (!amClean) throw new Error('Λείπει ο ΑΜ')
  if (!Number.isFinite(Number(year))) throw new Error('Λείπει το έτος')

  let lastError = ''
  let definitive = false
  for (let attempt = 1; attempt <= 3; attempt++) {
    if (attempt > 1) await new Promise(r => setTimeout(r, 3000))
    try {
      const res = await fetch(WEBAPP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: WEBAPP_SECRET, action: 'recordSubscriptionYear',
          am: amClean, year: Number(year), value,
        }),
        redirect: 'follow',
      })
      const text = await res.text()
      if (!res.ok) { lastError = `HTTP ${res.status}`; continue }
      let json: any = null
      try { json = JSON.parse(text) } catch {
        lastError = 'μη αναγνωρίσιμη απάντηση (κρύα εκκίνηση;)'
        continue
      }
      // Καθαρό ok:false είναι κρίση του script («δεν βρέθηκε ΑΜ»), όχι δίκτυο
      if (!json?.ok) { lastError = String(json?.error || 'unknown error'); definitive = true; break }
      return
    } catch (e) {
      lastError = (e as Error).message
    }
  }
  throw new Error(`Sheet web app: ${lastError}${definitive ? '' : ' (3 προσπάθειες)'}`)
}
