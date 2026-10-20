import { NextRequest, NextResponse } from 'next/server'
import { recordRun, cronAuthorized, triggerOf, pruneRunLog, type RunNote } from '@/lib/ocRunLog'
import { drainCampaigns } from '@/lib/campaignDrain'
import { reconcileNewsletterArchives } from '@/lib/newsletterArchive'

export const maxDuration = 300

/**
 * Η ημερήσια παρτίδα της ουράς. Όλη η λογική ζει στο lib/campaignDrain —
 * την ίδια καλεί και το OC αμέσως μετά το «Αποστολή», ώστε μια μικρή αποστολή
 * να μην περιμένει το πρωί. Κοινός κώδικας με import, όχι κλήση route σε route.
 */

const CRON_SECRET = process.env.CRON_SECRET

async function runJob(request: NextRequest, log: RunNote) {
  // Το `!CRON_SECRET` ΔΕΝ είναι περιττό: χωρίς τη μεταβλητή η σύγκριση γίνεται
  // με «Bearer undefined» και περνά όποιος το στείλει.
  if (!CRON_SECRET || request.headers.get('authorization') !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const started = Date.now()
    const r = await drainCampaigns()
    const n = (r as { sent?: unknown })?.sent
    log.note(typeof n === 'number' ? `${n} ${n === 1 ? 'αποστολή' : 'αποστολές'}` : 'ολοκληρώθηκε')
    /**
     * ΤΑ ΤΕΥΧΗ ΠΟΥ ΔΕΝ ΜΠΗΚΑΝ ΣΤΟ ΑΡΧΕΙΟ, ΜΠΑΙΝΟΥΝ ΤΩΡΑ.
     *
     * Δύο τρύπες κλείνουν εδώ. Η μία: η αρχειοθέτηση τη στιγμή της αποστολής
     * μπορεί να αποτύχει (έλειπε το δικαίωμα `create` και χάθηκαν τεύχη
     * χωρίς καμία ένδειξη). Η άλλη: το ΠΡΟΓΡΑΜΜΑΤΙΣΜΕΝΟ τεύχος φεύγει από
     * τον Sender ώρες μετά, χωρίς να περάσει ποτέ από τη διαδρομή αποστολής.
     *
     * Το τίμημα είναι καθυστέρηση έως μία ημέρα για τα προγραμματισμένα: η
     * σελίδα του τεύχους εμφανίζεται στην επόμενη εκτέλεση (08:15). Η
     * εναλλακτική — έλεγχος σε κάθε άνοιγμα του OC — κόστιζε κλήσεις Strapi
     * σε κάθε φόρτωση οθόνης για κάτι που αφορά δύο τεύχη τον μήνα.
     *
     * Ποτέ δεν ρίχνει την αποστολή που ήδη έγινε.
     */
    try {
      const arch = await reconcileNewsletterArchives()
      if (arch.created.length) log.note(`${arch.created.length} ${arch.created.length === 1 ? 'τεύχος' : 'τεύχη'} στο αρχείο`)
      if (arch.promoted.length) log.note(`${arch.promoted.length} προγραμματισμένα τεύχη βρέθηκαν σταλμένα`)
      for (const f of arch.failed) log.note(`ΤΟ ΑΡΧΕΙΟ ΔΕΝ ΓΡΑΦΤΗΚΕ — «${f.subject}»: ${f.error}`)
    } catch (err) {
      console.error('[CAMPAIGN-DRAIN] συμφιλίωση αρχείου τευχών:', err)
      log.note('η συμφιλίωση του αρχείου τευχών απέτυχε')
    }

    // Καθαρισμός ημερολογίου, μία φορά την ημέρα. Δεν ρίχνει ποτέ την αποστολή.
    const pruned = await pruneRunLog()
    if (pruned.deleted) log.note(`καθαρίστηκαν ${pruned.deleted} παλιές εγγραφές`)
    if (pruned.blocked) log.note('ο καθαρισμός ημερολογίου δεν επιτρέπεται με αυτό το token')
    return NextResponse.json({
      success: true, ...r, seconds: Math.round((Date.now() - started) / 1000),
    })
  } catch (err) {
    console.error('[CAMPAIGN-DRAIN] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Το περίβλημα καταγραφής. Ο έλεγχος μυστικού γίνεται ΠΡΙΝ από αυτό ώστε μια
 * ανεπιτυχής κλήση να μη γράφει «εκτέλεση» στο ημερολόγιο.
 */
export async function GET(request: NextRequest) {
  if (!cronAuthorized(request)) return runJob(request, { note: () => {} })
  return recordRun('/api/cron/campaign-drain', log => runJob(request, log), { trigger: triggerOf(request) })
}
