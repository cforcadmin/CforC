/**
 * Στέλνει δείγμα του email «Το email σου άλλαξε» (it@ → μέλος), για έλεγχο
 * εμφάνισης. ΔΕΝ αλλάζει τίποτα — μόνο αποστολή.
 *
 * Τρέξιμο: npx tsx scripts/send-email-changed-test.ts [παραλήπτης] [--owed]
 */
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const TO = process.argv.slice(2).find(a => a.includes('@')) || 'it@cultureforchange.net'

async function main() {
  const { sendOcEmailResult, emailChangedEmailHtml, renewalClaimUrl, IT_FROM, IT_EMAIL } = await import('../lib/ocEmails')
  const { generateRenewalClaimToken } = await import('../lib/auth')
  // Παραλλαγή με εκκρεμείς συνδρομές (2025 + 2026) — «--owed». Χωρίς: σκέτη ειδοποίηση.
  const owed = process.argv.includes('--owed')
    ? { years: [2025, 2026], amount: 70, memberFullName: 'Γιώργος Στυλιανόπουλος', claimUrl: renewalClaimUrl(generateRenewalClaimToken('test-doc-id')) }
    : null
  const tpl = emailChangedEmailHtml('Γιώργο', 'palio@example.gr', 'neo@example.gr', 'Yoryos Stylianopoulos', owed)
  const r = await sendOcEmailResult(TO, `[ΔΟΚΙΜΗ] ${tpl.subject}`, tpl.html, { from: IT_FROM, replyTo: IT_EMAIL })
  console.log(r.ok ? `OK → ${TO}` : `ΑΠΕΤΥΧΕ: ${r.error}`)
  process.exit(r.ok ? 0 : 1)
}
main()
