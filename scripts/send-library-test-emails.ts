/**
 * Στέλνει δείγμα από κάθε email της Ανοιχτής Βιβλιοθήκης, για έλεγχο εμφάνισης.
 *
 * Τρέξιμο: npx tsx scripts/send-library-test-emails.ts [παραλήπτης]
 */
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const TO = process.argv[2] || 'it@cultureforchange.net'
const TITLE = 'CREATIVE FLIP: Final Study – Towards more resilient cultural and creative ecosystems'

async function main() {
  const { sendOcEmail } = await import('../lib/ocEmails')
  const {
    librarySubmissionThanksHtml, libraryDuplicateReviewHtml, libraryRejectedHtml, LIBRARY_FROM,
  } = await import('../lib/libraryEmails')

  const samples: Array<{ what: string; subject: string; html: string }> = [
    {
      what: '1/4 Ευχαριστία (δημοσιεύτηκε)',
      ...librarySubmissionThanksHtml({
        firstName: 'Γιώργο', title: TITLE,
        theme: 'Ανθρωπιστικές & Κοινωνικές Επιστήμες', pending: false,
      }),
    },
    {
      what: '2/4 Ευχαριστία (σε αναμονή ελέγχου)',
      ...librarySubmissionThanksHtml({
        firstName: 'Γιώργο', title: TITLE,
        theme: 'Ανθρωπιστικές & Κοινωνικές Επιστήμες', pending: true,
      }),
    },
    {
      what: '3/4 Ειδοποίηση Βιβλιοθηκάριου',
      ...libraryDuplicateReviewHtml({
        librarianName: 'Γιώργο',
        newTitle: 'Creative Flip - final study, towards more resilient cultural and creative ecosystems',
        existingTitle: TITLE,
        submitter: 'Μαρία Παπαδοπούλου',
        similarity: 0.93,
        reviewUrl: 'https://cultureforchange.net/profile?section=library&review=demo',
      }),
    },
    {
      what: '4/4 Απόρριψη διπλοεγγραφής',
      ...libraryRejectedHtml({
        firstName: 'Μαρία',
        title: 'Creative Flip - final study, towards more resilient cultural and creative ecosystems',
        existingTitle: TITLE,
      }),
    },
  ]

  for (const s of samples) {
    const ok = await sendOcEmail(TO, `[ΔΟΚΙΜΗ] ${s.subject}`, s.html, { from: LIBRARY_FROM })
    console.log(`${ok ? '✓' : '✗'} ${s.what}  →  ${TO}`)
    if (!ok) console.log('   (έλεγξε το RESEND_API_KEY)')
  }
}
main()
