/**
 * Στέλνει δείγμα του email «Το email σου άλλαξε» (it@ → μέλος), για έλεγχο
 * εμφάνισης. ΔΕΝ αλλάζει τίποτα — μόνο αποστολή.
 *
 * Τρέξιμο: npx tsx scripts/send-email-changed-test.ts [παραλήπτης]
 */
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const TO = process.argv[2] || 'it@cultureforchange.net'

async function main() {
  const { sendOcEmailResult, emailChangedEmailHtml, IT_FROM, IT_EMAIL } = await import('../lib/ocEmails')
  const tpl = emailChangedEmailHtml('Γιώργο', 'palio@example.gr', 'neo@example.gr', 'Yoryos Stylianopoulos')
  const r = await sendOcEmailResult(TO, `[ΔΟΚΙΜΗ] ${tpl.subject}`, tpl.html, { from: IT_FROM, replyTo: IT_EMAIL })
  console.log(r.ok ? `OK → ${TO}` : `ΑΠΕΤΥΧΕ: ${r.error}`)
  process.exit(r.ok ? 0 : 1)
}
main()
