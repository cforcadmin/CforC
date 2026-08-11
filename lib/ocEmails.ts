/**
 * OC transactional emails (server-only, sent via Resend).
 *
 * ΔΟΜΗ — τα κείμενα είναι λειτουργικά αλλά τα σημεία με ⟨…⟩ είναι
 * placeholders που θα οριστικοποιηθούν σε επόμενο γύρο:
 *   - στοιχεία τραπέζης/ποσό στο approval email
 *   - συνημμένα: PDF απόδειξη (Πληρώθηκε) + Οδηγός Συμπλήρωσης (welcome)
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM = 'Culture for Change <noreply@cultureforchange.net>'

/** ⟨ΓΙΑ ΟΡΙΣΤΙΚΟΠΟΙΗΣΗ⟩ — στοιχεία πληρωμής συνδρομής */
export const PAYMENT_DETAILS = {
  amount: '⟨ΠΟΣΟ⟩ €',
  bank: '⟨ΤΡΑΠΕΖΑ⟩',
  iban: '⟨IBAN⟩',
  beneficiary: 'Culture For Change',
  reference: 'Ονοματεπώνυμο + «Συνδρομή»',
  /** Πού δηλώνει ο αιτών ότι πλήρωσε (θα γίνει signed link αργότερα) */
  paidNoticeAddress: 'finance@cultureforchange.net',
}

export async function sendOcEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    })
    return res.ok
  } catch {
    return false
  }
}

const wrap = (inner: string) => `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;color:#2D2D2D;line-height:1.6;">
    ${inner}
    <hr style="border:none;border-top:1px solid #eee;margin:28px 0 16px;">
    <p style="font-size:13px;color:#888;">
      Culture For Change · <a href="https://cultureforchange.net" style="color:#FF8B6A;">cultureforchange.net</a><br>
      Είμαστε στη διάθεσή σου — απάντησε σε αυτό το email για οτιδήποτε χρειαστείς.
    </p>
  </div>`

const sectionTitle = (t: string) => `
  <p style="margin:26px 0 10px;font-weight:bold;letter-spacing:.08em;color:#2D2D2D;">
    ━━━━━━━━━━━━━━━━━━━━<br>&nbsp;&nbsp;${t}<br>━━━━━━━━━━━━━━━━━━━━
  </p>`

/**
 * Approval email — στέλνεται αυτόματα όταν η αίτηση εγκρίνεται (ψηφοφορία
 * ή IT/Admin). Ευχαριστεί και δίνει οδηγίες πληρωμής.
 */
export function approvedEmailHtml(firstName: string): { subject: string; html: string } {
  const p = PAYMENT_DETAILS
  return {
    subject: 'Η αίτησή σου στο Culture for Change εγκρίθηκε! 🎉',
    html: wrap(`
      <h2 style="color:#FF8B6A;">Καλώς ήρθες, ${firstName}!</h2>
      <p>Σε ευχαριστούμε για την αίτησή σου στο Culture For Change — με χαρά σου
      ανακοινώνουμε ότι <strong>εγκρίθηκε από την Ομάδα Συντονισμού</strong>!</p>
      <p>Για να ολοκληρωθεί η εγγραφή σου, απομένει η καταβολή της συνδρομής:</p>
      ${sectionTitle('ΣΤΟΙΧΕΙΑ ΠΛΗΡΩΜΗΣ')}
      <table style="font-size:15px;border-collapse:collapse;">
        <tr><td style="padding:3px 14px 3px 0;color:#888;">Ποσό</td><td><strong>${p.amount}</strong></td></tr>
        <tr><td style="padding:3px 14px 3px 0;color:#888;">Τράπεζα</td><td>${p.bank}</td></tr>
        <tr><td style="padding:3px 14px 3px 0;color:#888;">IBAN</td><td style="font-family:monospace;">${p.iban}</td></tr>
        <tr><td style="padding:3px 14px 3px 0;color:#888;">Δικαιούχος</td><td>${p.beneficiary}</td></tr>
        <tr><td style="padding:3px 14px 3px 0;color:#888;">Αιτιολογία</td><td>${p.reference}</td></tr>
      </table>
      <p style="margin-top:22px;">
        Μόλις ολοκληρώσεις την πληρωμή,
        <a href="mailto:${p.paidNoticeAddress}?subject=Πληρωμή%20συνδρομής" style="color:#FF8B6A;font-weight:bold;">
          πάτησε εδώ για να μας ενημερώσεις</a> —
        θα ενεργοποιήσουμε το προφίλ σου και θα λάβεις τις οδηγίες πρώτης σύνδεσης.
      </p>`),
  }
}

/**
 * Reminder email — «Υπενθύμιση» από τον/την Financer στο popup του OC.
 * Ευγενική υπενθύμιση καταβολής συνδρομής σε εγκεκριμένο/η αιτούντα/ούσα.
 */
export function reminderEmailHtml(firstName: string): { subject: string; html: string } {
  const p = PAYMENT_DETAILS
  return {
    subject: 'Υπενθύμιση: εκκρεμεί η συνδρομή σου στο Culture for Change',
    html: wrap(`
      <h2 style="color:#FF8B6A;">Γεια σου, ${firstName}!</h2>
      <p>Μια φιλική υπενθύμιση από το Culture For Change: η αίτησή σου έχει εγκριθεί
      και το μόνο που απομένει για να ολοκληρωθεί η εγγραφή σου είναι η καταβολή
      της συνδρομής.</p>
      ${sectionTitle('ΣΤΟΙΧΕΙΑ ΠΛΗΡΩΜΗΣ')}
      <table style="font-size:15px;border-collapse:collapse;">
        <tr><td style="padding:3px 14px 3px 0;color:#888;">Ποσό</td><td><strong>${p.amount}</strong></td></tr>
        <tr><td style="padding:3px 14px 3px 0;color:#888;">Τράπεζα</td><td>${p.bank}</td></tr>
        <tr><td style="padding:3px 14px 3px 0;color:#888;">IBAN</td><td style="font-family:monospace;">${p.iban}</td></tr>
        <tr><td style="padding:3px 14px 3px 0;color:#888;">Δικαιούχος</td><td>${p.beneficiary}</td></tr>
        <tr><td style="padding:3px 14px 3px 0;color:#888;">Αιτιολογία</td><td>${p.reference}</td></tr>
      </table>
      <p style="margin-top:22px;">
        Αν έχεις ήδη πληρώσει, αγνόησε αυτό το μήνυμα — ή
        <a href="mailto:${p.paidNoticeAddress}?subject=Πληρωμή%20συνδρομής" style="color:#FF8B6A;">ενημέρωσέ μας εδώ</a>
        για να το καταχωρήσουμε άμεσα. Για οποιαδήποτε απορία, απάντησε σε αυτό το email.
      </p>`),
  }
}

/**
 * Welcome/first-login email — στέλνεται όταν ο/η Financer καταχωρεί την
 * πληρωμή («Πληρώθηκε η εγγραφή»). Βασισμένο στο πρότυπο του Γιώργου.
 * ⟨TODO λεπτομερειών⟩: συνημμένα PDF (απόδειξη + Οδηγός Συμπλήρωσης).
 */
export function welcomeEmailHtml(firstName: string): { subject: string; html: string } {
  return {
    subject: 'Καλώς ήρθες στο Culture for Change — το προφίλ σου είναι έτοιμο!',
    html: wrap(`
      <h2 style="color:#FF8B6A;">Αγαπητή/έ ${firstName},</h2>
      <p>Σε καλωσορίζουμε στο <strong>Culture For Change</strong>! 🎉</p>
      <p>Σε ενημερώνουμε ότι η πληρωμή σου καταχωρήθηκε, το email σου έχει προστεθεί
      στη βάση δεδομένων της ιστοσελίδας μας και το προφίλ σου είναι έτοιμο για ενεργοποίηση.</p>

      ${sectionTitle('ΠΡΩΤΗ ΣΥΝΔΕΣΗ')}
      <ol style="padding-left:20px;">
        <li>Μπες στο: <a href="https://cultureforchange.net/login" style="color:#FF8B6A;">cultureforchange.net/login</a></li>
        <li>Πήγαινε στην καρτέλα «Πρώτη Σύνδεση»</li>
        <li>Βάλε το email σου και πάτα στο κουμπί «Αποστολή συνδέσμου»</li>
        <li>Θα λάβεις ένα email — κάνε κλικ στον σύνδεσμο που περιέχει</li>
        <li>Όρισε τον κωδικό πρόσβασής σου — θα μεταφερθείς αυτόματα στο προφίλ σου
        για να ξεκινήσεις την επεξεργασία των στοιχείων σου!</li>
      </ol>
      <p style="background:#F5F0EB;border-radius:12px;padding:12px 16px;">
        💡 Σημείωσε κάπου τον κωδικό που θα ορίσεις — θα τον χρειαστείς για μελλοντικές
        συνδέσεις. Αν τον ξεχάσεις, μπορείς να κάνεις επαναφορά κωδικού (reset password)
        από τη σελίδα σύνδεσης.
      </p>

      ${sectionTitle('ΤΙ ΠΡΕΠΕΙ ΝΑ ΚΑΝΕΙΣ')}
      <ul style="padding-left:20px;">
        <li>Αφού συνδεθείς, μπες στο προφίλ σου και συμπλήρωσε <strong>ΟΛΑ</strong> τα στοιχεία σου
        (βιογραφικό, πόλη, πεδία πρακτικής, ιστοσελίδες/social media κλπ.)</li>
        <li>Πρόσθεσε 2 αντιπροσωπευτικά έργα σου (προαιρετικό, αλλά το συνιστούμε θερμά —
        βοηθά στην προβολή σου!)</li>
        <li>Συμπλήρωσε τα πεδία προσβασιμότητας (accessibility): εναλλακτικό κείμενο για τη
        φωτογραφία προφίλ σου και τις εικόνες των έργων σου. Αυτά βοηθούν τυφλά άτομα να
        κατανοήσουν τις εικόνες μέσω αναγνωστών οθόνης (screen readers). Περίγραψε τι
        απεικονίζεται — μη γράψεις απλώς το όνομά σου ή τον τίτλο του έργου.</li>
        <li>Μόλις μπεις στο προφίλ σου, θα δεις οδηγίες για κάθε πεδίο. Μπορείς να τις
        ξαναβρείς οποιαδήποτε στιγμή πατώντας «Οδηγίες Συμπλήρωσης» πάνω δεξιά.</li>
      </ul>

      ${sectionTitle('Ο ΧΩΡΟΣ ΜΟΥ')}
      <p>Στο προφίλ σου («Ο Χώρος Μου») υπάρχει ένα δευτερεύον μενού με πρόσβαση σε:</p>
      <ul style="padding-left:20px;">
        <li><strong>Ανοιχτά Καλέσματα</strong> — δες τι ευκαιρίες υπάρχουν για σένα</li>
        <li><strong>Newsletter</strong> — τα newsletter που λαμβάνεις και μέσω email</li>
        <li><strong>Οδηγός Τσέπης</strong> — πρακτικός οδηγός για μέλη</li>
        <li><strong>Ομάδες Εργασίας</strong> — πληροφορίες σχετικές με τις ΟΕ</li>
        <li><strong>Εκπαιδευτικό Υλικό / Εργαλεία</strong> — το εκπαιδευτικό υλικό του CforC</li>
        <li><strong>Πληροφορίες για Δίκτυα</strong> — πληροφορίες για δίκτυα που συμμετέχει το CforC και όχι μόνο</li>
      </ul>

      ${sectionTitle('ΣΗΜΑΝΤΙΚΟ')}
      <ul style="padding-left:20px;">
        <li>Η συμπλήρωση πρέπει να γίνει <strong>εντός μίας εβδομάδας</strong> για λόγους
        logistics και εύρυθμης λειτουργίας του CforC.</li>
        <li>Απάντησε σε αυτό το email αφού συμπληρώσεις το προφίλ σου, ώστε η υπεύθυνη
        Comms να ενημερωθεί και να προγραμματίσει την προώθηση του προφίλ σου στα
        Social Media του CforC.</li>
        <li>Είσαι υπεύθυνη/ος για την ενημέρωση του προφίλ σου. Φρόντισε να κάνεις μια
        ενημέρωση κάθε φορά που αλλάζει κάτι στο βιογραφικό ή στα projects σου, ή
        τουλάχιστον κάθε λίγους μήνες.</li>
      </ul>
      <p>Καλή αρχή! 🚀</p>`),
  }
}
