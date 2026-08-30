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
/** Approval flow: υπογράφει η Γεν. Γραμματέας — από/απαντήσεις στο community@ */
export const COMMUNITY_FROM = 'Culture for Change <community@cultureforchange.net>'
export const COMMUNITY_EMAIL = 'community@cultureforchange.net'
/** Θέματα πληρωμών: αναλαμβάνει ο/η Financer — από/απαντήσεις στο finance@ */
export const FINANCE_FROM = 'Culture for Change <finance@cultureforchange.net>'
/** Onboarding/τεχνικά: IT */
export const IT_FROM = 'Culture for Change <it@cultureforchange.net>'
export const IT_EMAIL = 'it@cultureforchange.net'
/** Διαχείριση/Γραμματεία: επίσημη αλληλογραφία (λογιστήριο κ.λπ.) */
export const ADMIN_FROM = 'Culture for Change <admin@cultureforchange.net>'
export const ADMIN_EMAIL = 'admin@cultureforchange.net'
/** Κοινοποίηση welcome email σε όλες τις εμπλεκόμενες θέσεις */
export const WELCOME_CC = ['admin@cultureforchange.net', 'media@cultureforchange.net', 'communication@cultureforchange.net', 'it@cultureforchange.net']
/** Κοινοποίηση αποχαιρετιστήριου email στις εμπλεκόμενες θέσεις */
export const DEPARTURE_CC = ['admin@cultureforchange.net', 'finance@cultureforchange.net', 'community@cultureforchange.net']
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.startsWith('https')
  ? process.env.NEXT_PUBLIC_SITE_URL
  : 'https://www.cultureforchange.net'

/** Εσωτερική διεύθυνση οικονομικών ειδοποιήσεων */
export const FINANCE_EMAIL = 'finance@cultureforchange.net'

/** ⟨ΓΙΑ ΟΡΙΣΤΙΚΟΠΟΙΗΣΗ⟩ — ερωτηματολόγιο αποχώρησης */
export const EXIT_QUESTIONNAIRE_URL = '⟨QUESTIONNAIRE_URL⟩'

export function paymentClaimUrl(token: string): string {
  return `${SITE_URL}/payment-claim/${encodeURIComponent(token)}`
}

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

export async function sendOcEmail(
  to: string,
  subject: string,
  html: string,
  opts?: { from?: string; replyTo?: string; cc?: string[]; attachments?: Array<{ filename: string; content: string }> }
): Promise<boolean> {
  if (!RESEND_API_KEY) return false
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: opts?.from || FROM,
        to,
        subject,
        html,
        ...(opts?.replyTo && { reply_to: opts.replyTo }),
        ...(opts?.cc?.length && { cc: opts.cc }),
        ...(opts?.attachments?.length && { attachments: opts.attachments }),
      }),
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

const claimButton = (claimUrl: string, label = 'Πλήρωσα — ενημερώστε το CforC') => `
  <p style="margin:24px 0;">
    <a href="${claimUrl}"
       style="background:#FF8B6A;color:#fff;font-weight:bold;text-decoration:none;
              padding:12px 28px;border-radius:999px;display:inline-block;">
      ${label}
    </a>
  </p>
  <p style="font-size:13px;color:#888;">Με το κλικ ενημερώνεται αυτόματα η ομάδα οικονομικών
  ότι η κατάθεση έγινε, ώστε να την επιβεβαιώσει και να ολοκληρώσει την εγγραφή σου.</p>`

/**
 * Application-received email — αυτόματη επιβεβαίωση με την υποβολή της
 * αίτησης στο /apply. Design shell, υπογραφή Community, από community@.
 */
export function applicationReceivedEmailHtml(firstName: string, signerName = 'Culture for Change — Community'): { subject: string; html: string } {
  const html = `<!DOCTYPE html>
<html lang="el">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Λάβαμε την αίτησή σου — Culture for Change</title>
<!--[if mso]>
<style>body,table,td,a{font-family:Arial,Helvetica,sans-serif !important;}</style>
<![endif]-->
<style>
  @media only screen and (max-width:620px){
    .px{padding-left:24px !important;padding-right:24px !important;}
    .stack{display:block !important;width:100% !important;}
    .btn a{display:block !important;}
    .h1{font-size:26px !important;line-height:32px !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#F5F0EB;">
<span style="display:none;font-size:1px;color:#F5F0EB;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Λάβαμε την αίτηση εγγραφής σου — θα απαντήσουμε το συντομότερο δυνατόν.</span>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F0EB;">
<tr><td align="center" style="padding:32px 12px 48px 12px;">

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:#FFFFFF;border-radius:24px;overflow:hidden;border:1px solid #E5E7EB;">

  <!-- Header -->
  <tr>
    <td class="px" style="background-color:#FF8B6A;padding:36px 48px 32px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:16px;letter-spacing:1.6px;color:#FFFFFF;font-weight:bold;mso-line-height-rule:exactly;">CULTURE FOR CHANGE</td>
        </tr>
        <tr><td height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
        <tr>
          <td class="h1" style="font-family:Arial,Helvetica,sans-serif;font-size:30px;line-height:36px;color:#2D2D2D;font-weight:bold;mso-line-height-rule:exactly;">ΛΑΒΑΜΕ ΤΗΝ ΑΙΤΗΣΗ ΣΟΥ</td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td class="px" style="padding:40px 48px 8px 48px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#2D2D2D;mso-line-height-rule:exactly;">
      <p style="margin:0 0 20px 0;">Αγαπητή/αγαπητέ ${firstName},</p>
      <p style="margin:0 0 20px 0;">Σε ευχαριστούμε! Λάβαμε την αίτηση εγγραφής σου στο <strong>Culture For Change</strong>.</p>
      <p style="margin:0 0 20px 0;">Η Ομάδα Συντονισμού θα την εξετάσει και θα λάβεις απάντηση στο email σου
      το συντομότερο δυνατόν.</p>
      <p style="margin:0 0 24px 0;">Μέχρι τότε, μπορείς να γνωρίσεις καλύτερα το δίκτυο και τα μέλη του:</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td class="btn" align="center" bgcolor="#FF8B6A" style="background-color:#FF8B6A;border-radius:999px;">
            <a href="https://cultureforchange.net" style="display:block;padding:16px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:20px;font-weight:bold;color:#2D2D2D;text-decoration:none;border-radius:999px;mso-line-height-rule:exactly;">Γνώρισε το δίκτυο&nbsp;→</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Signature -->
  <tr>
    <td class="px" style="padding:32px 48px 0 48px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#2D2D2D;mso-line-height-rule:exactly;">
      <p style="margin:0 0 20px 0;">Ευχαριστούμε πολύ και είμαστε στη διάθεσή σου για οτιδήποτε.</p>
      <p style="margin:0;">Φιλικά,</p>
    </td>
  </tr>
  <tr>
    <td class="px" style="padding:16px 48px 40px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td height="1" style="height:1px;line-height:1px;font-size:0;background-color:#E5E7EB;">&nbsp;</td></tr>
        <tr><td height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:24px;color:#2D2D2D;font-weight:bold;mso-line-height-rule:exactly;">${signerName}</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#5A5A5A;mso-line-height-rule:exactly;">Secretary General<br>Community - Culture for Change</td></tr>
        <tr><td height="6" style="height:6px;line-height:6px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;mso-line-height-rule:exactly;"><a href="mailto:community@cultureforchange.net" style="color:#C9552F;text-decoration:underline;">community@cultureforchange.net</a></td></tr>
      </table>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td class="px" align="center" style="background-color:#2D2D2D;padding:32px 48px 32px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#F5F0EB;font-weight:bold;mso-line-height-rule:exactly;">Join our Social Networks &amp; Get Involved!</td></tr>
        <tr><td height="14" style="height:14px;line-height:14px;font-size:0;">&nbsp;</td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:26px;color:#F5F0EB;mso-line-height-rule:exactly;">
          <a href="https://cultureforchange.net" style="color:#FF8B6A;text-decoration:none;">Website</a>&nbsp; |&nbsp;
          <a href="https://www.facebook.com/cultureforchange" style="color:#FF8B6A;text-decoration:none;">Facebook</a>&nbsp; |&nbsp;
          <a href="https://www.instagram.com/cultureforchange" style="color:#FF8B6A;text-decoration:none;">Instagram</a>&nbsp; |&nbsp;
          <a href="https://www.linkedin.com/company/cultureforchange" style="color:#FF8B6A;text-decoration:none;">LinkedIn</a>&nbsp; |&nbsp;
          <a href="https://www.youtube.com/@cultureforchange" style="color:#FF8B6A;text-decoration:none;">YouTube</a>
        </td></tr>
        <tr><td height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#A0A0A0;mso-line-height-rule:exactly;">Δίκτυο Culture for Change — Αθήνα, Ελλάδα<br>Λαμβάνεις αυτό το email επειδή υπέβαλες αίτημα εγγραφής μέλους.</td></tr>
        <tr><td height="18" style="height:18px;line-height:18px;font-size:0;">&nbsp;</td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;color:#8A8A8A;mso-line-height-rule:exactly;">_______________________________________________________________<br>This email may contain confidential information. Read full disclaimer <a href="https://www.cultureforchange.net/email-confidentiality-disclaimer" style="color:#FF8B6A;text-decoration:underline;">here</a></td></tr>
      </table>
    </td>
  </tr>

</table>

</td></tr>
</table>
</body>
</html>
`
  return { subject: 'Λάβαμε την αίτησή σου — Culture for Change', html }
}

/**
 * Approval email — στέλνεται αυτόματα όταν η αίτηση εγκρίνεται (ψηφοφορία
 * ή IT/Admin). Ευχαριστεί και δίνει οδηγίες πληρωμής.
 */
export function approvedEmailHtml(firstName: string, claimUrl: string, signerName = 'Culture for Change — Community'): { subject: string; html: string } {
  const year = new Date().getFullYear()
  const html = `<!DOCTYPE html>
<html lang="el">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Έγκριση αιτήματος εγγραφής — Culture for Change</title>
<!--[if mso]>
<style>body,table,td,a{font-family:Arial,Helvetica,sans-serif !important;}</style>
<![endif]-->
<style>
  @media only screen and (max-width:620px){
    .px{padding-left:24px !important;padding-right:24px !important;}
    .stack{display:block !important;width:100% !important;}
    .btn a{display:block !important;}
    .h1{font-size:26px !important;line-height:32px !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#F5F0EB;">
<span style="display:none;font-size:1px;color:#F5F0EB;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Το αίτημα εγγραφής σου στο Culture for Change εγκρίθηκε — δες τα επόμενα βήματα.</span>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F0EB;">
<tr><td align="center" style="padding:32px 12px 48px 12px;">

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:#FFFFFF;border-radius:24px;overflow:hidden;border:1px solid #E5E7EB;">

  <!-- Header -->
  <tr>
    <td class="px" style="background-color:#FF8B6A;padding:36px 48px 32px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:16px;letter-spacing:1.6px;color:#FFFFFF;font-weight:bold;mso-line-height-rule:exactly;">CULTURE FOR CHANGE</td>
        </tr>
        <tr><td height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
        <tr>
          <td class="h1" style="font-family:Arial,Helvetica,sans-serif;font-size:30px;line-height:36px;color:#2D2D2D;font-weight:bold;mso-line-height-rule:exactly;">ΤΟ ΑΙΤΗΜΑ ΕΓΓΡΑΦΗΣ ΣΟΥ ΕΓΚΡΙΘΗΚΕ</td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td class="px" style="padding:40px 48px 8px 48px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#2D2D2D;mso-line-height-rule:exactly;">
      <p style="margin:0 0 20px 0;">Aγαπητή/αγαπητέ ${firstName},</p>
      <p style="margin:0 0 20px 0;">Θα θέλαμε να σε ενημερώσουμε ότι το αίτημα εγγραφής μέλους που υπέβαλες στο Culture for Change έχει εγκριθεί!</p>
      <p style="margin:0 0 20px 0;">Για να ολοκληρωθεί η διαδικασία της εγγραφής σου στο δίκτυο θα χρειαστεί, εντός 30 ημερών, να καταθέσεις το κόστος της εγγραφής που ανέρχεται στα 10€ (εφάπαξ ποσό) και την ετήσια συνδρομή σου για το οικονομικό έτος ${year} που ανέρχεται στα 35€ (ανανεώνεται κάθε έτος).</p>
    </td>
  </tr>

  <!-- Amount summary -->
  <tr>
    <td class="px" style="padding:8px 48px 8px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background-color:#F5F0EB;border-radius:16px;">
        <tr>
          <td style="padding:20px 24px 8px 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#2D2D2D;mso-line-height-rule:exactly;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2D2D2D;">Εγγραφή (εφάπαξ)</td>
                <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2D2D2D;">10,00 €</td>
              </tr>
              <tr>
                <td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2D2D2D;">Ετήσια συνδρομή ${year}</td>
                <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2D2D2D;">35,00 €</td>
              </tr>
              <tr><td colspan="2" style="padding:10px 0 0 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td height="1" style="height:1px;line-height:1px;font-size:0;background-color:#E0D8D0;">&nbsp;</td></tr></table></td></tr>
              <tr>
                <td style="padding-top:10px;font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:26px;color:#2D2D2D;font-weight:bold;">Σύνολο</td>
                <td align="right" style="padding-top:10px;font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:26px;color:#2D2D2D;font-weight:bold;">45,00 €</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td height="16" style="height:16px;line-height:16px;font-size:0;">&nbsp;</td></tr>
      </table>
    </td>
  </tr>

  <tr>
    <td class="px" style="padding:24px 48px 0 48px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#2D2D2D;mso-line-height-rule:exactly;">
      <p style="margin:0 0 20px 0;">Παρακάτω σημειώνονται τα στοιχεία του Τραπεζικού Λογαριασμού στην Τράπεζα ΑLPHA BANK, όπου θα χρειαστεί να καταθέσεις το συνολικό ποσό των 45€, σημειώνοντας στην Αιτιολογία:<br>Ονοματεπώνυμό και τη φράση Εγγραφή και Ετήσια Συνδρομή Μέλους CforC ${year}.</p>
    </td>
  </tr>

  <!-- IBAN -->
  <tr>
    <td class="px" style="padding:0 48px 8px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border:1px solid #E5E7EB;border-radius:16px;">
        <tr>
          <td style="padding:24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;letter-spacing:1.2px;color:#FF8B6A;font-weight:bold;mso-line-height-rule:exactly;">ΙBAN CULTURE FOR CHANGE</td></tr>
              <tr><td height="10" style="height:10px;line-height:10px;font-size:0;">&nbsp;</td></tr>
              <tr><td style="font-family:'Courier New',Courier,monospace;font-size:17px;line-height:26px;color:#2D2D2D;font-weight:bold;word-break:break-all;mso-line-height-rule:exactly;">GR7101401420142002320005140</td></tr>
              <tr><td height="10" style="height:10px;line-height:10px;font-size:0;">&nbsp;</td></tr>
              <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#5A5A5A;mso-line-height-rule:exactly;">ALPHA BANK — στη μεταφορά επίλεξε χρέωση εξόδων <strong>«OUR»</strong>, ώστε όλα τα τραπεζικά έξοδα να καλύπτονται από το μέλος. Αν η κατάθεση γίνει από λογαριασμό ALPHA BANK, δεν υπάρχουν επιπλέον έξοδα.</td></tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr>
    <td class="px" style="padding:24px 48px 0 48px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#2D2D2D;mso-line-height-rule:exactly;">
      <p style="margin:0 0 20px 0;">Μόλις ολοκληρώσεις την κατάθεση, πάτησε το παρακάτω κουμπί για να ενημερωθεί αυτόματα η ομάδα οικονομικών και ανέβασε το αποδεικτικό της κατάθεσης στην πλατφόρμα μας — θα λάβεις απόδειξη είσπραξης ψηφιακά. Αν χρειάζεσαι το πρωτότυπο της απόδειξης είσπραξης, μας ενημερώνεις για να τη στείλουμε ταχυδρομικά.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td class="btn" align="center" bgcolor="#FF8B6A" style="background-color:#FF8B6A;border-radius:999px;">
            <a href="${claimUrl}" style="display:block;padding:16px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:20px;font-weight:bold;color:#2D2D2D;text-decoration:none;border-radius:999px;mso-line-height-rule:exactly;">Έκανα την κατάθεση&nbsp;✓</a>
          </td>
        </tr>
        <tr><td height="24" style="height:24px;line-height:24px;font-size:0;">&nbsp;</td></tr>
      </table>
      <p style="margin:0 0 20px 0;">Στην <a href="https://cultureforchange.net" style="color:#C9552F;text-decoration:underline;">πλατφόρμα</a> του Culture for Change μπορείς να ενημερωθείς για τις δράσεις και τα νέα του δικτύου και <a href="https://cultureforchange.net/members" style="color:#C9552F;text-decoration:underline;">εδώ</a> να γνωρίσεις τα μέλη και να συνδεθείς μαζί τους. Με την ολοκλήρωση της κατάθεσής σου θα μπορείς να φτιάξεις το δικό σου προφίλ στην ιστοσελίδα μας και θα προωθήσουμε το βιογραφικό σου ως νέο μέλος στα Social Media, Newsletter του δικτύου.</p>
      <p style="margin:0 0 24px 0;">Εδώ σημειώνουμε συνδέσμους στο Καταστατικό και στον Εσωτερικό Κανονισμό για να ενημερωθείς για το όραμα και τις διαδικασίες του CforC.</p>
    </td>
  </tr>

  <!-- Buttons -->
  <tr>
    <td class="px" style="padding:0 48px 8px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td class="btn" align="center" style="border:1px solid #2D2D2D;border-radius:999px;">
            <a href="https://cultureforchange.net" style="display:block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:20px;font-weight:bold;color:#2D2D2D;text-decoration:none;border-radius:999px;mso-line-height-rule:exactly;">Μετάβαση στην πλατφόρμα</a>
          </td>
        </tr>
        <tr><td height="12" style="height:12px;line-height:12px;font-size:0;">&nbsp;</td></tr>
        <tr>
          <td>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td class="stack" width="49%" style="width:49%;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr><td class="btn" align="center" style="border:1px solid #2D2D2D;border-radius:999px;">
                      <a href="https://drive.google.com/file/d/19lZ6Ns6ai-HNn91j2-gpxIAQa5380XNE/view" style="display:block;padding:14px 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:20px;font-weight:bold;color:#2D2D2D;text-decoration:none;border-radius:999px;mso-line-height-rule:exactly;">Καταστατικό</a>
                    </td></tr>
                  </table>
                </td>
                <td class="stack" width="2%" style="width:2%;font-size:0;line-height:12px;">&nbsp;</td>
                <td class="stack" width="49%" style="width:49%;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr><td class="btn" align="center" style="border:1px solid #2D2D2D;border-radius:999px;">
                      <a href="https://drive.google.com/file/d/1bGdHe3rsuoCMNSPs7PUSEllG_0Ml5jrk/view?usp=sharing" style="display:block;padding:14px 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:20px;font-weight:bold;color:#2D2D2D;text-decoration:none;border-radius:999px;mso-line-height-rule:exactly;">Εσωτερικός Κανονισμός</a>
                    </td></tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Signature -->
  <tr>
    <td class="px" style="padding:32px 48px 0 48px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#2D2D2D;mso-line-height-rule:exactly;">
      <p style="margin:0 0 20px 0;">Ευχαριστούμε πολύ και είμαστε στη διάθεσή σου για οτιδήποτε.</p>
      <p style="margin:0;">Φιλικά,</p>
    </td>
  </tr>
  <tr>
    <td class="px" style="padding:16px 48px 40px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td height="1" style="height:1px;line-height:1px;font-size:0;background-color:#E5E7EB;">&nbsp;</td></tr>
        <tr><td height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:24px;color:#2D2D2D;font-weight:bold;mso-line-height-rule:exactly;">${signerName}</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#5A5A5A;mso-line-height-rule:exactly;">Secretary General<br>Community - Culture for Change</td></tr>
        <tr><td height="6" style="height:6px;line-height:6px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;mso-line-height-rule:exactly;"><a href="mailto:community@cultureforchange.net" style="color:#C9552F;text-decoration:underline;">community@cultureforchange.net</a></td></tr>
      </table>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td class="px" align="center" style="background-color:#2D2D2D;padding:32px 48px 32px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#F5F0EB;font-weight:bold;mso-line-height-rule:exactly;">Join our Social Networks &amp; Get Involved!</td></tr>
        <tr><td height="14" style="height:14px;line-height:14px;font-size:0;">&nbsp;</td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:26px;color:#F5F0EB;mso-line-height-rule:exactly;">
          <a href="https://cultureforchange.net" style="color:#FF8B6A;text-decoration:none;">Website</a>&nbsp; |&nbsp;
          <a href="https://www.facebook.com/cultureforchange" style="color:#FF8B6A;text-decoration:none;">Facebook</a>&nbsp; |&nbsp;
          <a href="https://www.instagram.com/cultureforchange" style="color:#FF8B6A;text-decoration:none;">Instagram</a>&nbsp; |&nbsp;
          <a href="https://www.linkedin.com/company/cultureforchange" style="color:#FF8B6A;text-decoration:none;">LinkedIn</a>&nbsp; |&nbsp;
          <a href="https://www.youtube.com/@cultureforchange" style="color:#FF8B6A;text-decoration:none;">YouTube</a>
        </td></tr>
        <tr><td height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#A0A0A0;mso-line-height-rule:exactly;">Δίκτυο Culture for Change — Αθήνα, Ελλάδα<br>Λαμβάνεις αυτό το email επειδή υπέβαλες αίτημα εγγραφής μέλους.</td></tr>
        <tr><td height="18" style="height:18px;line-height:18px;font-size:0;">&nbsp;</td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;color:#8A8A8A;mso-line-height-rule:exactly;">_______________________________________________________________<br>This email may contain confidential information. Read full disclaimer <a href="https://www.cultureforchange.net/email-confidentiality-disclaimer" style="color:#FF8B6A;text-decoration:underline;">here</a></td></tr>
      </table>
    </td>
  </tr>

</table>

</td></tr>
</table>
</body>
</html>
`
  return { subject: 'Έγκριση αιτήματος εγγραφής — Culture for Change', html }
}

/**
 * Reminder email — «Υπενθύμιση» από τον/την Financer στο popup του OC.
 * Ίδιο design shell με το approval email (παράγωγό του — αλλαγές: τίτλος,
 * intro, κουμπί «Έχω ήδη πληρώσει», χωρίς Καταστατικό/Κανονισμό).
 */
export function reminderEmailHtml(firstName: string, claimUrl: string, signerName = 'Culture for Change — Community'): { subject: string; html: string } {
  const year = new Date().getFullYear()
  const html = `<!DOCTYPE html>
<html lang="el">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Υπενθύμιση συνδρομής — Culture for Change</title>
<!--[if mso]>
<style>body,table,td,a{font-family:Arial,Helvetica,sans-serif !important;}</style>
<![endif]-->
<style>
  @media only screen and (max-width:620px){
    .px{padding-left:24px !important;padding-right:24px !important;}
    .stack{display:block !important;width:100% !important;}
    .btn a{display:block !important;}
    .h1{font-size:26px !important;line-height:32px !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#F5F0EB;">
<span style="display:none;font-size:1px;color:#F5F0EB;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Φιλική υπενθύμιση: εκκρεμεί η συνδρομή εγγραφής σου στο Culture for Change.</span>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F0EB;">
<tr><td align="center" style="padding:32px 12px 48px 12px;">

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:#FFFFFF;border-radius:24px;overflow:hidden;border:1px solid #E5E7EB;">

  <!-- Header -->
  <tr>
    <td class="px" style="background-color:#FF8B6A;padding:36px 48px 32px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:16px;letter-spacing:1.6px;color:#FFFFFF;font-weight:bold;mso-line-height-rule:exactly;">CULTURE FOR CHANGE</td>
        </tr>
        <tr><td height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
        <tr>
          <td class="h1" style="font-family:Arial,Helvetica,sans-serif;font-size:30px;line-height:36px;color:#2D2D2D;font-weight:bold;mso-line-height-rule:exactly;">ΥΠΕΝΘΥΜΙΣΗ ΣΥΝΔΡΟΜΗΣ</td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td class="px" style="padding:40px 48px 8px 48px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#2D2D2D;mso-line-height-rule:exactly;">
      <p style="margin:0 0 20px 0;">Aγαπητή/αγαπητέ ${firstName},</p>
      <p style="margin:0 0 20px 0;">Μια φιλική υπενθύμιση από το Culture for Change: το αίτημα εγγραφής σου έχει εγκριθεί και το μόνο που απομένει για να ολοκληρωθεί η εγγραφή σου είναι η καταβολή της εγγραφής και της ετήσιας συνδρομής σου.</p>
          </td>
  </tr>

  <!-- Amount summary -->
  <tr>
    <td class="px" style="padding:8px 48px 8px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background-color:#F5F0EB;border-radius:16px;">
        <tr>
          <td style="padding:20px 24px 8px 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#2D2D2D;mso-line-height-rule:exactly;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2D2D2D;">Εγγραφή (εφάπαξ)</td>
                <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2D2D2D;">10,00 €</td>
              </tr>
              <tr>
                <td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2D2D2D;">Ετήσια συνδρομή ${year}</td>
                <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2D2D2D;">35,00 €</td>
              </tr>
              <tr><td colspan="2" style="padding:10px 0 0 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td height="1" style="height:1px;line-height:1px;font-size:0;background-color:#E0D8D0;">&nbsp;</td></tr></table></td></tr>
              <tr>
                <td style="padding-top:10px;font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:26px;color:#2D2D2D;font-weight:bold;">Σύνολο</td>
                <td align="right" style="padding-top:10px;font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:26px;color:#2D2D2D;font-weight:bold;">45,00 €</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td height="16" style="height:16px;line-height:16px;font-size:0;">&nbsp;</td></tr>
      </table>
    </td>
  </tr>

  <tr>
    <td class="px" style="padding:24px 48px 0 48px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#2D2D2D;mso-line-height-rule:exactly;">
      <p style="margin:0 0 20px 0;">Παρακάτω σημειώνονται τα στοιχεία του Τραπεζικού Λογαριασμού στην Τράπεζα ΑLPHA BANK, όπου θα χρειαστεί να καταθέσεις το συνολικό ποσό των 45€, σημειώνοντας στην Αιτιολογία:<br>Ονοματεπώνυμό και τη φράση Εγγραφή και Ετήσια Συνδρομή Μέλους CforC ${year}.</p>
    </td>
  </tr>

  <!-- IBAN -->
  <tr>
    <td class="px" style="padding:0 48px 8px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border:1px solid #E5E7EB;border-radius:16px;">
        <tr>
          <td style="padding:24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;letter-spacing:1.2px;color:#FF8B6A;font-weight:bold;mso-line-height-rule:exactly;">ΙBAN CULTURE FOR CHANGE</td></tr>
              <tr><td height="10" style="height:10px;line-height:10px;font-size:0;">&nbsp;</td></tr>
              <tr><td style="font-family:'Courier New',Courier,monospace;font-size:17px;line-height:26px;color:#2D2D2D;font-weight:bold;word-break:break-all;mso-line-height-rule:exactly;">GR7101401420142002320005140</td></tr>
              <tr><td height="10" style="height:10px;line-height:10px;font-size:0;">&nbsp;</td></tr>
              <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#5A5A5A;mso-line-height-rule:exactly;">ALPHA BANK — στη μεταφορά επίλεξε χρέωση εξόδων <strong>«OUR»</strong>, ώστε όλα τα τραπεζικά έξοδα να καλύπτονται από το μέλος. Αν η κατάθεση γίνει από λογαριασμό ALPHA BANK, δεν υπάρχουν επιπλέον έξοδα.</td></tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr>
    <td class="px" style="padding:24px 48px 0 48px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#2D2D2D;mso-line-height-rule:exactly;">
      <p style="margin:0 0 20px 0;">Μόλις ολοκληρώσεις την κατάθεση, πάτησε το παρακάτω κουμπί για να ενημερωθεί αυτόματα η ομάδα οικονομικών και ανέβασε το αποδεικτικό της κατάθεσης στην πλατφόρμα μας — θα λάβεις απόδειξη είσπραξης ψηφιακά. Αν χρειάζεσαι το πρωτότυπο της απόδειξης είσπραξης, μας ενημερώνεις για να τη στείλουμε ταχυδρομικά.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td class="btn" align="center" bgcolor="#FF8B6A" style="background-color:#FF8B6A;border-radius:999px;">
            <a href="${claimUrl}" style="display:block;padding:16px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:20px;font-weight:bold;color:#2D2D2D;text-decoration:none;border-radius:999px;mso-line-height-rule:exactly;">Έχω ήδη πληρώσει&nbsp;✓</a>
          </td>
        </tr>
        <tr><td height="24" style="height:24px;line-height:24px;font-size:0;">&nbsp;</td></tr>
      </table>
    </td>
  </tr>

  <!-- Signature -->
  <tr>
    <td class="px" style="padding:32px 48px 0 48px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#2D2D2D;mso-line-height-rule:exactly;">
      <p style="margin:0 0 20px 0;">Αν η κατάθεσή σου διασταυρώθηκε με αυτό το email, αγνόησέ το — θα την καταχωρήσουμε άμεσα. Είμαστε στη διάθεσή σου για οτιδήποτε.</p>
      <p style="margin:0;">Φιλικά,</p>
    </td>
  </tr>
  <tr>
    <td class="px" style="padding:16px 48px 40px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td height="1" style="height:1px;line-height:1px;font-size:0;background-color:#E5E7EB;">&nbsp;</td></tr>
        <tr><td height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:24px;color:#2D2D2D;font-weight:bold;mso-line-height-rule:exactly;">${signerName}</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#5A5A5A;mso-line-height-rule:exactly;">Secretary General<br>Community - Culture for Change</td></tr>
        <tr><td height="6" style="height:6px;line-height:6px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;mso-line-height-rule:exactly;"><a href="mailto:community@cultureforchange.net" style="color:#C9552F;text-decoration:underline;">community@cultureforchange.net</a></td></tr>
      </table>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td class="px" align="center" style="background-color:#2D2D2D;padding:32px 48px 32px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#F5F0EB;font-weight:bold;mso-line-height-rule:exactly;">Join our Social Networks &amp; Get Involved!</td></tr>
        <tr><td height="14" style="height:14px;line-height:14px;font-size:0;">&nbsp;</td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:26px;color:#F5F0EB;mso-line-height-rule:exactly;">
          <a href="https://cultureforchange.net" style="color:#FF8B6A;text-decoration:none;">Website</a>&nbsp; |&nbsp;
          <a href="https://www.facebook.com/cultureforchange" style="color:#FF8B6A;text-decoration:none;">Facebook</a>&nbsp; |&nbsp;
          <a href="https://www.instagram.com/cultureforchange" style="color:#FF8B6A;text-decoration:none;">Instagram</a>&nbsp; |&nbsp;
          <a href="https://www.linkedin.com/company/cultureforchange" style="color:#FF8B6A;text-decoration:none;">LinkedIn</a>&nbsp; |&nbsp;
          <a href="https://www.youtube.com/@cultureforchange" style="color:#FF8B6A;text-decoration:none;">YouTube</a>
        </td></tr>
        <tr><td height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#A0A0A0;mso-line-height-rule:exactly;">Δίκτυο Culture for Change — Αθήνα, Ελλάδα<br>Λαμβάνεις αυτό το email επειδή υπέβαλες αίτημα εγγραφής μέλους.</td></tr>
        <tr><td height="18" style="height:18px;line-height:18px;font-size:0;">&nbsp;</td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;color:#8A8A8A;mso-line-height-rule:exactly;">_______________________________________________________________<br>This email may contain confidential information. Read full disclaimer <a href="https://www.cultureforchange.net/email-confidentiality-disclaimer" style="color:#FF8B6A;text-decoration:underline;">here</a></td></tr>
      </table>
    </td>
  </tr>

</table>

</td></tr>
</table>
</body>
</html>
`
  return { subject: 'Υπενθύμιση: εκκρεμεί η συνδρομή εγγραφής σου — Culture for Change', html }
}

/**
 * Payment-failure email — «Αποτυχία πληρωμής» από τον/την Financer όταν η
 * δηλωμένη κατάθεση δεν εμφανίστηκε στον λογαριασμό. Ίδιο design shell.
 */
export function paymentFailedEmailHtml(firstName: string, claimUrl: string, signerName = 'Culture for Change — Finance'): { subject: string; html: string } {
  const year = new Date().getFullYear()
  const html = `<!DOCTYPE html>
<html lang="el">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Σχετικά με την πληρωμή σου — Culture for Change</title>
<!--[if mso]>
<style>body,table,td,a{font-family:Arial,Helvetica,sans-serif !important;}</style>
<![endif]-->
<style>
  @media only screen and (max-width:620px){
    .px{padding-left:24px !important;padding-right:24px !important;}
    .stack{display:block !important;width:100% !important;}
    .btn a{display:block !important;}
    .h1{font-size:26px !important;line-height:32px !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#F5F0EB;">
<span style="display:none;font-size:1px;color:#F5F0EB;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Η κατάθεση της συνδρομής σου δεν έχει εμφανιστεί ακόμη στον λογαριασμό μας — δες τι μπορεί να συνέβη.</span>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F0EB;">
<tr><td align="center" style="padding:32px 12px 48px 12px;">

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:#FFFFFF;border-radius:24px;overflow:hidden;border:1px solid #E5E7EB;">

  <!-- Header -->
  <tr>
    <td class="px" style="background-color:#FF8B6A;padding:36px 48px 32px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:16px;letter-spacing:1.6px;color:#FFFFFF;font-weight:bold;mso-line-height-rule:exactly;">CULTURE FOR CHANGE</td>
        </tr>
        <tr><td height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
        <tr>
          <td class="h1" style="font-family:Arial,Helvetica,sans-serif;font-size:30px;line-height:36px;color:#2D2D2D;font-weight:bold;mso-line-height-rule:exactly;">ΣΧΕΤΙΚΑ ΜΕ ΤΗΝ ΠΛΗΡΩΜΗ ΣΟΥ</td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td class="px" style="padding:40px 48px 8px 48px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#2D2D2D;mso-line-height-rule:exactly;">
      <p style="margin:0 0 20px 0;">Aγαπητή/αγαπητέ ${firstName},</p>
      <p style="margin:0 0 20px 0;">Σε ευχαριστούμε που μας ενημέρωσες για την καταβολή της συνδρομής σου. Δυστυχώς, μέχρι στιγμής <strong>η κατάθεση δεν έχει εμφανιστεί στον τραπεζικό μας λογαριασμό</strong>.</p>
      <p style="margin:0 0 20px 0;">Σε παρακαλούμε να ελέγξεις ότι η μεταφορά ολοκληρώθηκε σωστά (σωστό IBAN, αιτιολογία, ποσό). Έχε υπόψη ότι:</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px 0;">
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2D2D2D;padding:0 0 8px 0;">•&nbsp;&nbsp;Οι μεταφορές μεταξύ διαφορετικών τραπεζών μπορεί να χρειαστούν <strong>έως δύο εργάσιμες ημέρες</strong>.</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2D2D2D;">•&nbsp;&nbsp;Ορισμένες φορές οι τράπεζες <strong>απορρίπτουν αυτόματα διατραπεζικές συναλλαγές για τεχνικούς λόγους</strong> — έχει ξανασυμβεί σε μέλη μας. Αν το ποσό επέστρεψε στον λογαριασμό σου, χρειάζεται να επαναλάβεις την κατάθεση.</td></tr>
      </table>
          </td>
  </tr>

  <!-- Amount summary -->
  <tr>
    <td class="px" style="padding:8px 48px 8px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background-color:#F5F0EB;border-radius:16px;">
        <tr>
          <td style="padding:20px 24px 8px 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#2D2D2D;mso-line-height-rule:exactly;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2D2D2D;">Εγγραφή (εφάπαξ)</td>
                <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2D2D2D;">10,00 €</td>
              </tr>
              <tr>
                <td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2D2D2D;">Ετήσια συνδρομή ${year}</td>
                <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2D2D2D;">35,00 €</td>
              </tr>
              <tr><td colspan="2" style="padding:10px 0 0 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td height="1" style="height:1px;line-height:1px;font-size:0;background-color:#E0D8D0;">&nbsp;</td></tr></table></td></tr>
              <tr>
                <td style="padding-top:10px;font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:26px;color:#2D2D2D;font-weight:bold;">Σύνολο</td>
                <td align="right" style="padding-top:10px;font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:26px;color:#2D2D2D;font-weight:bold;">45,00 €</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td height="16" style="height:16px;line-height:16px;font-size:0;">&nbsp;</td></tr>
      </table>
    </td>
  </tr>

  <tr>
    <td class="px" style="padding:24px 48px 0 48px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#2D2D2D;mso-line-height-rule:exactly;">
      <p style="margin:0 0 20px 0;">Παρακάτω σημειώνονται τα στοιχεία του Τραπεζικού Λογαριασμού στην Τράπεζα ΑLPHA BANK, όπου θα χρειαστεί να καταθέσεις το συνολικό ποσό των 45€, σημειώνοντας στην Αιτιολογία:<br>Ονοματεπώνυμό και τη φράση Εγγραφή και Ετήσια Συνδρομή Μέλους CforC ${year}.</p>
    </td>
  </tr>

  <!-- IBAN -->
  <tr>
    <td class="px" style="padding:0 48px 8px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border:1px solid #E5E7EB;border-radius:16px;">
        <tr>
          <td style="padding:24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;letter-spacing:1.2px;color:#FF8B6A;font-weight:bold;mso-line-height-rule:exactly;">ΙBAN CULTURE FOR CHANGE</td></tr>
              <tr><td height="10" style="height:10px;line-height:10px;font-size:0;">&nbsp;</td></tr>
              <tr><td style="font-family:'Courier New',Courier,monospace;font-size:17px;line-height:26px;color:#2D2D2D;font-weight:bold;word-break:break-all;mso-line-height-rule:exactly;">GR7101401420142002320005140</td></tr>
              <tr><td height="10" style="height:10px;line-height:10px;font-size:0;">&nbsp;</td></tr>
              <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#5A5A5A;mso-line-height-rule:exactly;">ALPHA BANK — στη μεταφορά επίλεξε χρέωση εξόδων <strong>«OUR»</strong>, ώστε όλα τα τραπεζικά έξοδα να καλύπτονται από το μέλος. Αν η κατάθεση γίνει από λογαριασμό ALPHA BANK, δεν υπάρχουν επιπλέον έξοδα.</td></tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr>
    <td class="px" style="padding:24px 48px 0 48px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#2D2D2D;mso-line-height-rule:exactly;">
      <p style="margin:0 0 20px 0;">Μόλις επιβεβαιώσεις ή επαναλάβεις την κατάθεση, πάτησε το παρακάτω κουμπί για να μας ενημερώσεις ξανά και ανέβασε το αποδεικτικό της κατάθεσης στην πλατφόρμα μας — έτσι μπορούμε να την εντοπίσουμε άμεσα.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td class="btn" align="center" bgcolor="#FF8B6A" style="background-color:#FF8B6A;border-radius:999px;">
            <a href="${claimUrl}" style="display:block;padding:16px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:20px;font-weight:bold;color:#2D2D2D;text-decoration:none;border-radius:999px;mso-line-height-rule:exactly;">Επιβεβαιώνω ξανά την πληρωμή&nbsp;✓</a>
          </td>
        </tr>
        <tr><td height="24" style="height:24px;line-height:24px;font-size:0;">&nbsp;</td></tr>
      </table>
    </td>
  </tr>

  <!-- Signature -->
  <tr>
    <td class="px" style="padding:32px 48px 0 48px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#2D2D2D;mso-line-height-rule:exactly;">
      <p style="margin:0 0 20px 0;">Αν θέλεις να το δούμε μαζί, γράψε μας απευθείας στο <a href="mailto:finance@cultureforchange.net" style="color:#C9552F;text-decoration:underline;">finance@cultureforchange.net</a> — είμαστε στη διάθεσή σου.</p>
      <p style="margin:0;">Φιλικά,</p>
    </td>
  </tr>
  <tr>
    <td class="px" style="padding:16px 48px 40px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td height="1" style="height:1px;line-height:1px;font-size:0;background-color:#E5E7EB;">&nbsp;</td></tr>
        <tr><td height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:24px;color:#2D2D2D;font-weight:bold;mso-line-height-rule:exactly;">${signerName}</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#5A5A5A;mso-line-height-rule:exactly;">Finance - Culture for Change</td></tr>
        <tr><td height="6" style="height:6px;line-height:6px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;mso-line-height-rule:exactly;"><a href="mailto:finance@cultureforchange.net" style="color:#C9552F;text-decoration:underline;">finance@cultureforchange.net</a></td></tr>
      </table>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td class="px" align="center" style="background-color:#2D2D2D;padding:32px 48px 32px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#F5F0EB;font-weight:bold;mso-line-height-rule:exactly;">Join our Social Networks &amp; Get Involved!</td></tr>
        <tr><td height="14" style="height:14px;line-height:14px;font-size:0;">&nbsp;</td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:26px;color:#F5F0EB;mso-line-height-rule:exactly;">
          <a href="https://cultureforchange.net" style="color:#FF8B6A;text-decoration:none;">Website</a>&nbsp; |&nbsp;
          <a href="https://www.facebook.com/cultureforchange" style="color:#FF8B6A;text-decoration:none;">Facebook</a>&nbsp; |&nbsp;
          <a href="https://www.instagram.com/cultureforchange" style="color:#FF8B6A;text-decoration:none;">Instagram</a>&nbsp; |&nbsp;
          <a href="https://www.linkedin.com/company/cultureforchange" style="color:#FF8B6A;text-decoration:none;">LinkedIn</a>&nbsp; |&nbsp;
          <a href="https://www.youtube.com/@cultureforchange" style="color:#FF8B6A;text-decoration:none;">YouTube</a>
        </td></tr>
        <tr><td height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#A0A0A0;mso-line-height-rule:exactly;">Δίκτυο Culture for Change — Αθήνα, Ελλάδα<br>Λαμβάνεις αυτό το email επειδή υπέβαλες αίτημα εγγραφής μέλους.</td></tr>
        <tr><td height="18" style="height:18px;line-height:18px;font-size:0;">&nbsp;</td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;color:#8A8A8A;mso-line-height-rule:exactly;">_______________________________________________________________<br>This email may contain confidential information. Read full disclaimer <a href="https://www.cultureforchange.net/email-confidentiality-disclaimer" style="color:#FF8B6A;text-decoration:underline;">here</a></td></tr>
      </table>
    </td>
  </tr>

</table>

</td></tr>
</table>
</body>
</html>
`
  return { subject: 'Σχετικά με την πληρωμή της συνδρομής σου — Culture for Change', html }
}

/**
 * Welcome/first-login email — στέλνεται όταν ο/η Financer καταχωρεί την
 * πληρωμή («Πληρώθηκε η εγγραφή»). Design shell + περιεχόμενο πρώτης
 * σύνδεσης. Αποστολή/υπογραφή: IT. ⟨TODO⟩: συνημμένα PDF (απόδειξη + Οδηγός).
 */
export function welcomeEmailHtml(firstName: string, signerName = 'Culture for Change — IT'): { subject: string; html: string } {
  const html = `<!DOCTYPE html>
<html lang="el">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Καλώς ήρθες — Culture for Change</title>
<!--[if mso]>
<style>body,table,td,a{font-family:Arial,Helvetica,sans-serif !important;}</style>
<![endif]-->
<style>
  @media only screen and (max-width:620px){
    .px{padding-left:24px !important;padding-right:24px !important;}
    .stack{display:block !important;width:100% !important;}
    .btn a{display:block !important;}
    .h1{font-size:26px !important;line-height:32px !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#F5F0EB;">
<span style="display:none;font-size:1px;color:#F5F0EB;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Η πληρωμή σου καταχωρήθηκε — το προφίλ σου στο Culture for Change είναι έτοιμο για ενεργοποίηση.</span>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F0EB;">
<tr><td align="center" style="padding:32px 12px 48px 12px;">

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:#FFFFFF;border-radius:24px;overflow:hidden;border:1px solid #E5E7EB;">

  <!-- Header -->
  <tr>
    <td class="px" style="background-color:#FF8B6A;padding:36px 48px 32px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:16px;letter-spacing:1.6px;color:#FFFFFF;font-weight:bold;mso-line-height-rule:exactly;">CULTURE FOR CHANGE</td>
        </tr>
        <tr><td height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
        <tr>
          <td class="h1" style="font-family:Arial,Helvetica,sans-serif;font-size:30px;line-height:36px;color:#2D2D2D;font-weight:bold;mso-line-height-rule:exactly;">ΚΑΛΩΣ ΗΡΘΕΣ ΣΤΟ CULTURE FOR CHANGE</td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td class="px" style="padding:40px 48px 0 48px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#2D2D2D;mso-line-height-rule:exactly;">
      <p style="margin:0 0 20px 0;">Αγαπητή/αγαπητέ ${firstName},</p>
      <p style="margin:0 0 20px 0;">Σε καλωσορίζουμε στο <strong>Culture For Change</strong>! 🎉 Η πληρωμή σου καταχωρήθηκε, το email σου έχει προστεθεί στη βάση δεδομένων της ιστοσελίδας μας και το προφίλ σου είναι έτοιμο για ενεργοποίηση.</p>
    </td>
  </tr>

<tr><td class="px" style="padding:28px 48px 4px 48px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;letter-spacing:1.4px;color:#FF8B6A;font-weight:bold;mso-line-height-rule:exactly;">ΠΡΩΤΗ ΣΥΝΔΕΣΗ</td></tr>
  <tr>
    <td class="px" style="padding:12px 48px 0 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2D2D2D;padding:0 0 10px 0;"><strong>1.</strong>&nbsp; Μπες στο <a href="https://cultureforchange.net/login" style="color:#C9552F;text-decoration:underline;">cultureforchange.net/login</a></td></tr>
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2D2D2D;padding:0 0 10px 0;"><strong>2.</strong>&nbsp; Πήγαινε στην καρτέλα «Πρώτη Σύνδεση»</td></tr>
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2D2D2D;padding:0 0 10px 0;"><strong>3.</strong>&nbsp; Βάλε το email σου και πάτα «Αποστολή συνδέσμου»</td></tr>
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2D2D2D;padding:0 0 10px 0;"><strong>4.</strong>&nbsp; Θα λάβεις ένα email — κάνε κλικ στον σύνδεσμο που περιέχει</td></tr>
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2D2D2D;padding:0 0 10px 0;"><strong>5.</strong>&nbsp; Όρισε τον κωδικό πρόσβασής σου — θα μεταφερθείς αυτόματα στο προφίλ σου για να ξεκινήσεις την επεξεργασία των στοιχείων σου!</td></tr>
      </table>
    </td>
  </tr>
  <tr>
    <td class="px" style="padding:8px 48px 0 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F0EB;border-radius:16px;">
        <tr><td style="padding:16px 20px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#2D2D2D;mso-line-height-rule:exactly;">💡 Σημείωσε κάπου τον κωδικό που θα ορίσεις — θα τον χρειαστείς για μελλοντικές συνδέσεις. Αν τον ξεχάσεις, μπορείς να κάνεις επαναφορά κωδικού (reset password) από τη σελίδα σύνδεσης.</td></tr>
      </table>
    </td>
  </tr>
  <tr>
    <td class="px" style="padding:20px 48px 0 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td class="btn" align="center" bgcolor="#FF8B6A" style="background-color:#FF8B6A;border-radius:999px;">
            <a href="https://cultureforchange.net/login" style="display:block;padding:16px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:20px;font-weight:bold;color:#2D2D2D;text-decoration:none;border-radius:999px;mso-line-height-rule:exactly;">Πρώτη Σύνδεση&nbsp;→</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>

<tr><td class="px" style="padding:28px 48px 4px 48px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;letter-spacing:1.4px;color:#FF8B6A;font-weight:bold;mso-line-height-rule:exactly;">ΤΙ ΠΡΕΠΕΙ ΝΑ ΚΑΝΕΙΣ</td></tr>
  <tr>
    <td class="px" style="padding:12px 48px 0 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2D2D2D;padding:0 0 10px 0;">•&nbsp;&nbsp;Αφού συνδεθείς, μπες στο προφίλ σου και ενημέρωσε <strong>ΟΛΑ</strong> τα στοιχεία σου (βιογραφικό, πόλη, πεδία πρακτικής, ιστοσελίδες/social media κλπ.).</td></tr>
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2D2D2D;padding:0 0 10px 0;">•&nbsp;&nbsp;Στα <strong>Πεδία Πρακτικής</strong> διάλεξε από την έτοιμη λίστα κατηγοριών και υποκατηγοριών — ή πρόσθεσε δικά σου.</td></tr>
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2D2D2D;padding:0 0 10px 0;">•&nbsp;&nbsp;Πρόσθεσε <strong>2 αντιπροσωπευτικά έργα σου</strong> με φωτογραφίες (προαιρετικό, αλλά το συνιστούμε θερμά — βοηθά στην προβολή σου!).</td></tr>
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2D2D2D;padding:0 0 10px 0;">•&nbsp;&nbsp;Συμπλήρωσε τα πεδία προσβασιμότητας (accessibility): εναλλακτικό κείμενο για τη φωτογραφία προφίλ σου και τις εικόνες των έργων σου. Βοηθούν τυφλά άτομα να κατανοήσουν τις εικόνες μέσω αναγνωστών οθόνης — περίγραψε τι απεικονίζεται, μη γράψεις απλώς το όνομά σου ή τον τίτλο του έργου.</td></tr>
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2D2D2D;padding:0 0 10px 0;">•&nbsp;&nbsp;Πριν αποθηκεύσεις, δες πώς θα φαίνεται το προφίλ σου με την <strong>προεπισκόπηση προφίλ</strong>.</td></tr>
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2D2D2D;padding:0 0 10px 0;">•&nbsp;&nbsp;Μέσα στο προφίλ θα βρεις οδηγίες για κάθε πεδίο — μπορείς να τις ξαναβρείς οποιαδήποτε στιγμή πατώντας <strong>«Οδηγίες Συμπλήρωσης»</strong> πάνω δεξιά.</td></tr>
      </table>
    </td>
  </tr>

<tr><td class="px" style="padding:28px 48px 4px 48px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;letter-spacing:1.4px;color:#FF8B6A;font-weight:bold;mso-line-height-rule:exactly;">Ο ΧΩΡΟΣ ΜΟΥ</td></tr>
<tr><td class="px" style="padding:10px 48px 0 48px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#2D2D2D;mso-line-height-rule:exactly;">Στο προφίλ σου («Ο Χώρος Μου») υπάρχει ένα δευτερεύον μενού με πρόσβαση σε:</td></tr>
  <tr>
    <td class="px" style="padding:12px 48px 0 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2D2D2D;padding:0 0 10px 0;">•&nbsp;&nbsp;<strong>Προφίλ</strong> — τα στοιχεία σου, με επεξεργασία ανά πεδίο και προεπισκόπηση</td></tr>
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2D2D2D;padding:0 0 10px 0;">•&nbsp;&nbsp;<strong>Ανοιχτές Προσκλήσεις</strong> — δες τι ευκαιρίες υπάρχουν για σένα</td></tr>
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2D2D2D;padding:0 0 10px 0;">•&nbsp;&nbsp;<strong>Εκπαιδευτικό Υλικό</strong> — το εκπαιδευτικό υλικό και τα εργαλεία του CforC</td></tr>
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2D2D2D;padding:0 0 10px 0;">•&nbsp;&nbsp;<strong>Δίκτυα / Κοινότητες</strong> — πληροφορίες για δίκτυα που συμμετέχει το CforC και όχι μόνο</td></tr>
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2D2D2D;padding:0 0 10px 0;">•&nbsp;&nbsp;<strong>Ομάδες Εργασίας</strong> — πληροφορίες σχετικές με τις ΟΕ</td></tr>
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2D2D2D;padding:0 0 10px 0;">•&nbsp;&nbsp;<strong>Οδηγός Τσέπης</strong> — πρακτικός οδηγός για μέλη</td></tr>
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2D2D2D;padding:0 0 10px 0;">•&nbsp;&nbsp;<strong>Newsletters</strong> — τα newsletter που λαμβάνεις και μέσω email</td></tr>
      </table>
    </td>
  </tr>

<tr><td class="px" style="padding:28px 48px 4px 48px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;letter-spacing:1.4px;color:#FF8B6A;font-weight:bold;mso-line-height-rule:exactly;">ΣΗΜΑΝΤΙΚΟ</td></tr>
  <tr>
    <td class="px" style="padding:12px 48px 8px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2D2D2D;padding:0 0 10px 0;">•&nbsp;&nbsp;Η συμπλήρωση πρέπει να γίνει <strong>εντός μίας εβδομάδας</strong> για λόγους logistics και εύρυθμης λειτουργίας του CforC.</td></tr>
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2D2D2D;padding:0 0 10px 0;">•&nbsp;&nbsp;Είσαι υπεύθυνη/ος για την ενημέρωση του προφίλ σου. Φρόντισε να κάνεις μια ενημέρωση κάθε φορά που αλλάζει κάτι στο βιογραφικό ή στα projects σου, ή τουλάχιστον κάθε λίγους μήνες.</td></tr>
      </table>
    </td>
  </tr>

  <!-- Signature -->
  <tr>
    <td class="px" style="padding:32px 48px 0 48px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#2D2D2D;mso-line-height-rule:exactly;">
      <p style="margin:0 0 20px 0;">Καλή αρχή! 🚀 Είμαστε στη διάθεσή σου για οτιδήποτε χρειαστείς — απάντησε σε αυτό το email αν έχεις ερωτήσεις.</p>
      <p style="margin:0;">Φιλικά,</p>
    </td>
  </tr>
  <tr>
    <td class="px" style="padding:16px 48px 40px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td height="1" style="height:1px;line-height:1px;font-size:0;background-color:#E5E7EB;">&nbsp;</td></tr>
        <tr><td height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:24px;color:#2D2D2D;font-weight:bold;mso-line-height-rule:exactly;">${signerName}</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#5A5A5A;mso-line-height-rule:exactly;">IT - Culture for Change</td></tr>
        <tr><td height="6" style="height:6px;line-height:6px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;mso-line-height-rule:exactly;"><a href="mailto:it@cultureforchange.net" style="color:#C9552F;text-decoration:underline;">it@cultureforchange.net</a></td></tr>
      </table>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td class="px" align="center" style="background-color:#2D2D2D;padding:32px 48px 32px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#F5F0EB;font-weight:bold;mso-line-height-rule:exactly;">Join our Social Networks &amp; Get Involved!</td></tr>
        <tr><td height="14" style="height:14px;line-height:14px;font-size:0;">&nbsp;</td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:26px;color:#F5F0EB;mso-line-height-rule:exactly;">
          <a href="https://cultureforchange.net" style="color:#FF8B6A;text-decoration:none;">Website</a>&nbsp; |&nbsp;
          <a href="https://www.facebook.com/cultureforchange" style="color:#FF8B6A;text-decoration:none;">Facebook</a>&nbsp; |&nbsp;
          <a href="https://www.instagram.com/cultureforchange" style="color:#FF8B6A;text-decoration:none;">Instagram</a>&nbsp; |&nbsp;
          <a href="https://www.linkedin.com/company/cultureforchange" style="color:#FF8B6A;text-decoration:none;">LinkedIn</a>&nbsp; |&nbsp;
          <a href="https://www.youtube.com/@cultureforchange" style="color:#FF8B6A;text-decoration:none;">YouTube</a>
        </td></tr>
        <tr><td height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#A0A0A0;mso-line-height-rule:exactly;">Δίκτυο Culture for Change — Αθήνα, Ελλάδα<br>Λαμβάνεις αυτό το email επειδή ολοκληρώθηκε η εγγραφή σου ως μέλος.</td></tr>
        <tr><td height="18" style="height:18px;line-height:18px;font-size:0;">&nbsp;</td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;color:#8A8A8A;mso-line-height-rule:exactly;">_______________________________________________________________<br>This email may contain confidential information. Read full disclaimer <a href="https://www.cultureforchange.net/email-confidentiality-disclaimer" style="color:#FF8B6A;text-decoration:underline;">here</a></td></tr>
      </table>
    </td>
  </tr>

</table>

</td></tr>
</table>
</body>
</html>
`
  return { subject: 'Καλώς ήρθες στο Culture for Change — το προφίλ σου είναι έτοιμο!', html }
}

/**
 * Finance receipt email — συνοδεύει το welcome όταν καταχωρείται η πληρωμή:
 * σύντομο καλωσόρισμα από finance@ με συνημμένη την απόδειξη είσπραξης.
 */
export function financeWelcomeEmailHtml(firstName: string, signerName = 'Culture for Change — Finance'): { subject: string; html: string } {
  const html = `<!DOCTYPE html>
<html lang="el">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Απόδειξη είσπραξης — Culture for Change</title>
<!--[if mso]>
<style>body,table,td,a{font-family:Arial,Helvetica,sans-serif !important;}</style>
<![endif]-->
<style>
  @media only screen and (max-width:620px){
    .px{padding-left:24px !important;padding-right:24px !important;}
    .stack{display:block !important;width:100% !important;}
    .btn a{display:block !important;}
    .h1{font-size:26px !important;line-height:32px !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#F5F0EB;">
<span style="display:none;font-size:1px;color:#F5F0EB;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Η απόδειξη είσπραξης της συνδρομής σου — Culture for Change.</span>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F0EB;">
<tr><td align="center" style="padding:32px 12px 48px 12px;">

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:#FFFFFF;border-radius:24px;overflow:hidden;border:1px solid #E5E7EB;">

  <!-- Header -->
  <tr>
    <td class="px" style="background-color:#FF8B6A;padding:36px 48px 32px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:16px;letter-spacing:1.6px;color:#FFFFFF;font-weight:bold;mso-line-height-rule:exactly;">CULTURE FOR CHANGE</td>
        </tr>
        <tr><td height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
        <tr>
          <td class="h1" style="font-family:Arial,Helvetica,sans-serif;font-size:30px;line-height:36px;color:#2D2D2D;font-weight:bold;mso-line-height-rule:exactly;">Η ΑΠΟΔΕΙΞΗ ΕΙΣΠΡΑΞΗΣ ΣΟΥ</td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td class="px" style="padding:40px 48px 8px 48px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#2D2D2D;mso-line-height-rule:exactly;">
      <p style="margin:0 0 20px 0;">Αγαπητή/αγαπητέ ${firstName},</p>
      <p style="margin:0 0 20px 0;">Καλώς ήρθες στο Culture For Change! Η πληρωμή της εγγραφής και της ετήσιας συνδρομής σου καταχωρήθηκε.</p>
      <p style="margin:0 0 20px 0;">📎 Επισυνάπτεται η <strong>απόδειξη είσπραξης</strong> σε PDF. Αν χρειάζεσαι το πρωτότυπο, απάντησε σε αυτό το email για να τη στείλουμε ταχυδρομικά.</p>
    </td>
  </tr>

  <!-- Signature -->
  <tr>
    <td class="px" style="padding:32px 48px 0 48px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#2D2D2D;mso-line-height-rule:exactly;">
      <p style="margin:0 0 20px 0;">Σε ευχαριστούμε και καλώς όρισες στο δίκτυο!</p>
      <p style="margin:0;">Φιλικά,</p>
    </td>
  </tr>
  <tr>
    <td class="px" style="padding:16px 48px 40px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td height="1" style="height:1px;line-height:1px;font-size:0;background-color:#E5E7EB;">&nbsp;</td></tr>
        <tr><td height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:24px;color:#2D2D2D;font-weight:bold;mso-line-height-rule:exactly;">${signerName}</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#5A5A5A;mso-line-height-rule:exactly;">Finance - Culture for Change</td></tr>
        <tr><td height="6" style="height:6px;line-height:6px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;mso-line-height-rule:exactly;"><a href="mailto:finance@cultureforchange.net" style="color:#C9552F;text-decoration:underline;">finance@cultureforchange.net</a></td></tr>
      </table>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td class="px" align="center" style="background-color:#2D2D2D;padding:32px 48px 32px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#F5F0EB;font-weight:bold;mso-line-height-rule:exactly;">Join our Social Networks &amp; Get Involved!</td></tr>
        <tr><td height="14" style="height:14px;line-height:14px;font-size:0;">&nbsp;</td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:26px;color:#F5F0EB;mso-line-height-rule:exactly;">
          <a href="https://cultureforchange.net" style="color:#FF8B6A;text-decoration:none;">Website</a>&nbsp; |&nbsp;
          <a href="https://www.facebook.com/cultureforchange" style="color:#FF8B6A;text-decoration:none;">Facebook</a>&nbsp; |&nbsp;
          <a href="https://www.instagram.com/cultureforchange" style="color:#FF8B6A;text-decoration:none;">Instagram</a>&nbsp; |&nbsp;
          <a href="https://www.linkedin.com/company/cultureforchange" style="color:#FF8B6A;text-decoration:none;">LinkedIn</a>&nbsp; |&nbsp;
          <a href="https://www.youtube.com/@cultureforchange" style="color:#FF8B6A;text-decoration:none;">YouTube</a>
        </td></tr>
        <tr><td height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#A0A0A0;mso-line-height-rule:exactly;">Δίκτυο Culture for Change — Αθήνα, Ελλάδα<br>Λαμβάνεις αυτό το email επειδή ολοκληρώθηκε η εγγραφή σου ως μέλος.</td></tr>
        <tr><td height="18" style="height:18px;line-height:18px;font-size:0;">&nbsp;</td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;color:#8A8A8A;mso-line-height-rule:exactly;">_______________________________________________________________<br>This email may contain confidential information. Read full disclaimer <a href="https://www.cultureforchange.net/email-confidentiality-disclaimer" style="color:#FF8B6A;text-decoration:underline;">here</a></td></tr>
      </table>
    </td>
  </tr>

</table>

</td></tr>
</table>
</body>
</html>
`
  return { subject: 'Η απόδειξη είσπραξης της συνδρομής σου — Culture for Change', html }
}

/**
 * Απόδειξη από χειροκίνητη έκδοση (φόρμα Financer στο OC) — ανανεώσεις
 * συνδρομής, έκτακτες εισφορές, δωρεές. Design shell, υπογραφή Financer.
 * detail: π.χ. «Ετήσια συνδρομή 2026» ή «Δωρεά».
 */
export function manualReceiptEmailHtml(firstName: string, detail: string, signerName = 'Culture for Change — Finance'): { subject: string; html: string } {
  const html = `<!DOCTYPE html>
<html lang="el">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Η απόδειξή σου — Culture for Change</title>
<!--[if mso]>
<style>body,table,td,a{font-family:Arial,Helvetica,sans-serif !important;}</style>
<![endif]-->
<style>
  @media only screen and (max-width:620px){
    .px{padding-left:24px !important;padding-right:24px !important;}
    .stack{display:block !important;width:100% !important;}
    .btn a{display:block !important;}
    .h1{font-size:26px !important;line-height:32px !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#F5F0EB;">
<span style="display:none;font-size:1px;color:#F5F0EB;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Η απόδειξη είσπραξής σου — Culture for Change.</span>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F0EB;">
<tr><td align="center" style="padding:32px 12px 48px 12px;">

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:#FFFFFF;border-radius:24px;overflow:hidden;border:1px solid #E5E7EB;">

  <!-- Header -->
  <tr>
    <td class="px" style="background-color:#FF8B6A;padding:36px 48px 32px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:16px;letter-spacing:1.6px;color:#FFFFFF;font-weight:bold;mso-line-height-rule:exactly;">CULTURE FOR CHANGE</td>
        </tr>
        <tr><td height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
        <tr>
          <td class="h1" style="font-family:Arial,Helvetica,sans-serif;font-size:30px;line-height:36px;color:#2D2D2D;font-weight:bold;mso-line-height-rule:exactly;">Η ΑΠΟΔΕΙΞΗ ΣΟΥ</td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td class="px" style="padding:40px 48px 8px 48px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#2D2D2D;mso-line-height-rule:exactly;">
      <p style="margin:0 0 20px 0;">Αγαπητή/αγαπητέ ${firstName},</p>
      <p style="margin:0 0 20px 0;">Η πληρωμή σου (<strong>${detail}</strong>) καταχωρήθηκε. Σε ευχαριστούμε!</p>
      <p style="margin:0 0 20px 0;">📎 Επισυνάπτεται η <strong>απόδειξη είσπραξης</strong> σε PDF. Αν χρειάζεσαι κάτι σχετικό με την απόδειξη, απάντησε σε αυτό το email.</p>
    </td>
  </tr>

  <!-- Signature -->
  <tr>
    <td class="px" style="padding:32px 48px 0 48px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#2D2D2D;mso-line-height-rule:exactly;">
      <p style="margin:0;">Φιλικά,</p>
    </td>
  </tr>
  <tr>
    <td class="px" style="padding:16px 48px 40px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td height="1" style="height:1px;line-height:1px;font-size:0;background-color:#E5E7EB;">&nbsp;</td></tr>
        <tr><td height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:24px;color:#2D2D2D;font-weight:bold;mso-line-height-rule:exactly;">${signerName}</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#5A5A5A;mso-line-height-rule:exactly;">Finance - Culture for Change</td></tr>
        <tr><td height="6" style="height:6px;line-height:6px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;mso-line-height-rule:exactly;"><a href="mailto:finance@cultureforchange.net" style="color:#C9552F;text-decoration:underline;">finance@cultureforchange.net</a></td></tr>
      </table>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td class="px" align="center" style="background-color:#2D2D2D;padding:32px 48px 32px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#F5F0EB;font-weight:bold;mso-line-height-rule:exactly;">Join our Social Networks &amp; Get Involved!</td></tr>
        <tr><td height="14" style="height:14px;line-height:14px;font-size:0;">&nbsp;</td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:26px;color:#F5F0EB;mso-line-height-rule:exactly;">
          <a href="https://cultureforchange.net" style="color:#FF8B6A;text-decoration:none;">Website</a>&nbsp; |&nbsp;
          <a href="https://www.facebook.com/cultureforchange" style="color:#FF8B6A;text-decoration:none;">Facebook</a>&nbsp; |&nbsp;
          <a href="https://www.instagram.com/cultureforchange" style="color:#FF8B6A;text-decoration:none;">Instagram</a>&nbsp; |&nbsp;
          <a href="https://www.linkedin.com/company/cultureforchange" style="color:#FF8B6A;text-decoration:none;">LinkedIn</a>&nbsp; |&nbsp;
          <a href="https://www.youtube.com/@cultureforchange" style="color:#FF8B6A;text-decoration:none;">YouTube</a>
        </td></tr>
        <tr><td height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#A0A0A0;mso-line-height-rule:exactly;">Δίκτυο Culture for Change — Αθήνα, Ελλάδα<br>Λαμβάνεις αυτό το email επειδή καταχωρήθηκε πληρωμή σου προς το Culture for Change.</td></tr>
        <tr><td height="18" style="height:18px;line-height:18px;font-size:0;">&nbsp;</td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;color:#8A8A8A;mso-line-height-rule:exactly;">_______________________________________________________________<br>This email may contain confidential information. Read full disclaimer <a href="https://www.cultureforchange.net/email-confidentiality-disclaimer" style="color:#FF8B6A;text-decoration:underline;">here</a></td></tr>
      </table>
    </td>
  </tr>

</table>

</td></tr>
</table>
</body>
</html>
`
  return { subject: 'Η απόδειξη είσπραξής σου — Culture for Change', html }
}

/**
 * Υπενθύμιση συνδρομής ΜΕΛΟΥΣ (ανανέωση) — από τα bubbles «Προς ειδοποίηση /
 * Προς διαγραφή» στα Οικονομικά του OC. Design shell, υπογραφή Financer.
 * owedYears: τα έτη που εκκρεμούν (1 ή 2) · amount: το σύνολο (35 ή 70).
 */
export function renewalClaimUrl(token: string): string {
  return `${SITE_URL}/renewal-claim/${encodeURIComponent(token)}`
}

export function subscriptionReminderEmailHtml(
  firstName: string,
  memberFullName: string,
  owedYears: number[],
  amount: number,
  claimUrl: string,
  signerName = 'Culture for Change — Finance',
): { subject: string; html: string } {
  const yearsText = owedYears.length > 1
    ? `τα έτη ${owedYears.join(' και ')}`
    : `το έτος ${owedYears[0]}`
  const amountText = `${amount},00 €`
  const html = `<!DOCTYPE html>
<html lang="el">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Υπενθύμιση συνδρομής — Culture for Change</title>
<!--[if mso]>
<style>body,table,td,a{font-family:Arial,Helvetica,sans-serif !important;}</style>
<![endif]-->
<style>
  @media only screen and (max-width:620px){
    .px{padding-left:24px !important;padding-right:24px !important;}
    .stack{display:block !important;width:100% !important;}
    .h1{font-size:26px !important;line-height:32px !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#F5F0EB;">
<span style="display:none;font-size:1px;color:#F5F0EB;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Μια φιλική υπενθύμιση για τη συνδρομή σου στο Culture for Change.</span>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F0EB;">
<tr><td align="center" style="padding:32px 12px 48px 12px;">

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:#FFFFFF;border-radius:24px;overflow:hidden;border:1px solid #E5E7EB;">

  <!-- Header -->
  <tr>
    <td class="px" style="background-color:#FF8B6A;padding:36px 48px 32px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:16px;letter-spacing:1.6px;color:#FFFFFF;font-weight:bold;mso-line-height-rule:exactly;">CULTURE FOR CHANGE</td>
        </tr>
        <tr><td height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
        <tr>
          <td class="h1" style="font-family:Arial,Helvetica,sans-serif;font-size:30px;line-height:36px;color:#2D2D2D;font-weight:bold;mso-line-height-rule:exactly;">ΥΠΕΝΘΥΜΙΣΗ ΣΥΝΔΡΟΜΗΣ</td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td class="px" style="padding:40px 48px 8px 48px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#2D2D2D;mso-line-height-rule:exactly;">
      <p style="margin:0 0 20px 0;">Αγαπητή/αγαπητέ ${firstName},</p>
      <p style="margin:0 0 20px 0;">Μια φιλική υπενθύμιση: η συνδρομή σου στο Δίκτυο Culture for Change για ${yearsText} εκκρεμεί. Η ετήσια συνδρομή είναι το πιο άμεσο στήριγμα της δράσης του δικτύου — σε ευχαριστούμε προκαταβολικά!</p>
    </td>
  </tr>

  <!-- Payment box -->
  <tr>
    <td class="px" style="padding:8px 48px 8px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F0EB;border-radius:16px;">
        <tr><td style="padding:24px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2D2D2D;">
          <p style="margin:0 0 6px 0;"><strong>Ποσό:</strong> ${amountText}</p>
          <p style="margin:0 0 6px 0;"><strong>Τράπεζα:</strong> ALPHA BANK</p>
          <p style="margin:0 0 6px 0;"><strong>IBAN:</strong> <span style="white-space:nowrap;">GR71 0140 1420 1420 0232 0005 140</span></p>
          <p style="margin:0 0 6px 0;"><strong>Δικαιούχος:</strong> Culture for Change — Σωματείο</p>
          <p style="margin:0;"><strong>Αιτιολογία:</strong> ${memberFullName} — Συνδρομή</p>
        </td></tr>
      </table>
    </td>
  </tr>

  <!-- Claim button -->
  <tr>
    <td class="px" align="center" style="padding:24px 48px 8px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="btn">
        <tr>
          <td style="background-color:#2D2D2D;border-radius:999px;">
            <a href="${claimUrl}" style="display:inline-block;padding:15px 36px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#FFFFFF;text-decoration:none;border-radius:999px;">Έκανα την κατάθεση ✓</a>
          </td>
        </tr>
      </table>
      <p style="margin:12px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:19px;color:#8A8A8A;">Πάτησέ το μόλις κάνεις τη μεταφορά — έτσι η ομάδα οικονομικών ξέρει να την αναζητήσει και θα λάβεις την απόδειξή σου συντομότερα.</p>
    </td>
  </tr>

  <tr>
    <td class="px" style="padding:16px 48px 8px 48px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#5A5A5A;mso-line-height-rule:exactly;">
      <p style="margin:0 0 12px 0;">💡 Αν μεταφέρεις από άλλη τράπεζα, επίλεξε χρέωση εξόδων <strong>«OUR»</strong> ώστε να φτάσει ολόκληρο το ποσό.</p>
      <p style="margin:0 0 12px 0;">Μόλις καταχωρηθεί η πληρωμή σου θα λάβεις την απόδειξή σου με email. Αν έχεις ήδη πληρώσει τις τελευταίες ημέρες, αγνόησε αυτό το μήνυμα — ή απάντησέ μας για να το ελέγξουμε.</p>
    </td>
  </tr>

  <!-- Signature -->
  <tr>
    <td class="px" style="padding:24px 48px 0 48px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#2D2D2D;mso-line-height-rule:exactly;">
      <p style="margin:0;">Φιλικά,</p>
    </td>
  </tr>
  <tr>
    <td class="px" style="padding:16px 48px 40px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td height="1" style="height:1px;line-height:1px;font-size:0;background-color:#E5E7EB;">&nbsp;</td></tr>
        <tr><td height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:24px;color:#2D2D2D;font-weight:bold;mso-line-height-rule:exactly;">${signerName}</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#5A5A5A;mso-line-height-rule:exactly;">Finance - Culture for Change</td></tr>
        <tr><td height="6" style="height:6px;line-height:6px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;mso-line-height-rule:exactly;"><a href="mailto:finance@cultureforchange.net" style="color:#C9552F;text-decoration:underline;">finance@cultureforchange.net</a></td></tr>
      </table>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td class="px" align="center" style="background-color:#2D2D2D;padding:32px 48px 32px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#F5F0EB;font-weight:bold;mso-line-height-rule:exactly;">Join our Social Networks &amp; Get Involved!</td></tr>
        <tr><td height="14" style="height:14px;line-height:14px;font-size:0;">&nbsp;</td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:26px;color:#F5F0EB;mso-line-height-rule:exactly;">
          <a href="https://cultureforchange.net" style="color:#FF8B6A;text-decoration:none;">Website</a>&nbsp; |&nbsp;
          <a href="https://www.facebook.com/cultureforchange" style="color:#FF8B6A;text-decoration:none;">Facebook</a>&nbsp; |&nbsp;
          <a href="https://www.instagram.com/cultureforchange" style="color:#FF8B6A;text-decoration:none;">Instagram</a>&nbsp; |&nbsp;
          <a href="https://www.linkedin.com/company/cultureforchange" style="color:#FF8B6A;text-decoration:none;">LinkedIn</a>&nbsp; |&nbsp;
          <a href="https://www.youtube.com/@cultureforchange" style="color:#FF8B6A;text-decoration:none;">YouTube</a>
        </td></tr>
        <tr><td height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#A0A0A0;mso-line-height-rule:exactly;">Δίκτυο Culture for Change — Αθήνα, Ελλάδα<br>Λαμβάνεις αυτό το email ως μέλος του δικτύου Culture for Change.</td></tr>
        <tr><td height="18" style="height:18px;line-height:18px;font-size:0;">&nbsp;</td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;color:#8A8A8A;mso-line-height-rule:exactly;">_______________________________________________________________<br>This email may contain confidential information. Read full disclaimer <a href="https://www.cultureforchange.net/email-confidentiality-disclaimer" style="color:#FF8B6A;text-decoration:underline;">here</a></td></tr>
      </table>
    </td>
  </tr>

</table>

</td></tr>
</table>
</body>
</html>
`
  return { subject: 'Υπενθύμιση συνδρομής — Culture for Change', html }
}

/**
 * «Δεν εντοπίσαμε την κατάθεση» για ΑΝΑΝΕΩΣΗ συνδρομής — όταν ο/η Financer
 * πατά «Αποτυχία» σε δήλωση πληρωμής μέλους. Ίδιος τόνος με το αντίστοιχο
 * email της φάσης εγγραφής (διατραπεζικές καθυστερήσεις/απορρίψεις) +
 * νέο κουμπί δήλωσης για όταν επαναληφθεί η κατάθεση.
 */
export function renewalPaymentFailedEmailHtml(
  firstName: string,
  owedYears: number[],
  claimUrl: string,
  signerName = 'Culture for Change — Finance',
): { subject: string; html: string } {
  const amount = owedYears.length * 35
  const rows = owedYears.map(y => `
              <tr>
                <td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2D2D2D;">Ετήσια συνδρομή ${y}</td>
                <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2D2D2D;">35,00 €</td>
              </tr>`).join('')
  const html = `<!DOCTYPE html>
<html lang="el">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Σχετικά με την πληρωμή σου — Culture for Change</title>
<!--[if mso]>
<style>body,table,td,a{font-family:Arial,Helvetica,sans-serif !important;}</style>
<![endif]-->
<style>
  @media only screen and (max-width:620px){
    .px{padding-left:24px !important;padding-right:24px !important;}
    .btn a{display:block !important;}
    .h1{font-size:26px !important;line-height:32px !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#F5F0EB;">
<span style="display:none;font-size:1px;color:#F5F0EB;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Η κατάθεση της συνδρομής σου δεν έχει εμφανιστεί ακόμη — ας το ελέγξουμε μαζί.</span>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F0EB;">
<tr><td align="center" style="padding:32px 12px 48px 12px;">

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:#FFFFFF;border-radius:24px;overflow:hidden;border:1px solid #E5E7EB;">

  <!-- Header -->
  <tr>
    <td class="px" style="background-color:#FF8B6A;padding:36px 48px 32px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:16px;letter-spacing:1.6px;color:#FFFFFF;font-weight:bold;mso-line-height-rule:exactly;">CULTURE FOR CHANGE</td>
        </tr>
        <tr><td height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
        <tr>
          <td class="h1" style="font-family:Arial,Helvetica,sans-serif;font-size:30px;line-height:36px;color:#2D2D2D;font-weight:bold;mso-line-height-rule:exactly;">ΣΧΕΤΙΚΑ ΜΕ ΤΗΝ ΠΛΗΡΩΜΗ ΣΟΥ</td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td class="px" style="padding:40px 48px 8px 48px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#2D2D2D;mso-line-height-rule:exactly;">
      <p style="margin:0 0 20px 0;">Αγαπητή/αγαπητέ ${firstName},</p>
      <p style="margin:0 0 20px 0;">Σε ευχαριστούμε που μας ενημέρωσες για την καταβολή της συνδρομής σου. Δυστυχώς, μέχρι στιγμής <strong>η κατάθεση δεν έχει εμφανιστεί στον τραπεζικό μας λογαριασμό</strong>.</p>
      <p style="margin:0 0 20px 0;">Σε παρακαλούμε να ελέγξεις ότι η μεταφορά ολοκληρώθηκε σωστά (σωστό IBAN, αιτιολογία, ποσό). Έχε υπόψη ότι:</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px 0;">
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2D2D2D;padding:0 0 8px 0;">•&nbsp;&nbsp;Οι μεταφορές μεταξύ διαφορετικών τραπεζών μπορεί να χρειαστούν <strong>έως δύο εργάσιμες ημέρες</strong>, και οι καταθέσεις Σαββατοκύριακου εκκαθαρίζονται τη Δευτέρα.</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2D2D2D;">•&nbsp;&nbsp;Ορισμένες φορές οι τράπεζες <strong>απορρίπτουν αυτόματα διατραπεζικές συναλλαγές για τεχνικούς λόγους</strong> — έχει ξανασυμβεί σε μέλη μας. Αν το ποσό επέστρεψε στον λογαριασμό σου, χρειάζεται να επαναλάβεις την κατάθεση.</td></tr>
      </table>
    </td>
  </tr>

  <!-- Amount summary -->
  <tr>
    <td class="px" style="padding:8px 48px 8px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background-color:#F5F0EB;border-radius:16px;">
        <tr>
          <td style="padding:20px 24px 8px 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#2D2D2D;mso-line-height-rule:exactly;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${rows}
              <tr><td colspan="2" style="padding:10px 0 0 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td height="1" style="height:1px;line-height:1px;font-size:0;background-color:#E0D8D0;">&nbsp;</td></tr></table></td></tr>
              <tr>
                <td style="padding-top:10px;font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:26px;color:#2D2D2D;font-weight:bold;">Σύνολο</td>
                <td align="right" style="padding-top:10px;font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:26px;color:#2D2D2D;font-weight:bold;">${amount},00 €</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td height="16" style="height:16px;line-height:16px;font-size:0;">&nbsp;</td></tr>
      </table>
    </td>
  </tr>

  <tr>
    <td class="px" style="padding:16px 48px 8px 48px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#5A5A5A;mso-line-height-rule:exactly;">
      <p style="margin:0 0 6px 0;"><strong>Τράπεζα:</strong> ALPHA BANK · <strong>IBAN:</strong> <span style="white-space:nowrap;">GR71 0140 1420 1420 0232 0005 140</span></p>
      <p style="margin:0 0 12px 0;"><strong>Δικαιούχος:</strong> Culture for Change — Σωματείο · <strong>Χρέωση εξόδων:</strong> «OUR»</p>
    </td>
  </tr>

  <!-- Re-claim button -->
  <tr>
    <td class="px" align="center" style="padding:16px 48px 8px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="btn">
        <tr>
          <td style="background-color:#2D2D2D;border-radius:999px;">
            <a href="${claimUrl}" style="display:inline-block;padding:15px 36px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#FFFFFF;text-decoration:none;border-radius:999px;">Επανέλαβα την κατάθεση ✓</a>
          </td>
        </tr>
      </table>
      <p style="margin:12px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:19px;color:#8A8A8A;">Αν είσαι σίγουρη/ος ότι η μεταφορά έχει ολοκληρωθεί, απάντησε σε αυτό το email για να το ελέγξουμε μαζί.</p>
    </td>
  </tr>

  <!-- Signature -->
  <tr>
    <td class="px" style="padding:24px 48px 0 48px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#2D2D2D;mso-line-height-rule:exactly;">
      <p style="margin:0;">Φιλικά,</p>
    </td>
  </tr>
  <tr>
    <td class="px" style="padding:16px 48px 40px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td height="1" style="height:1px;line-height:1px;font-size:0;background-color:#E5E7EB;">&nbsp;</td></tr>
        <tr><td height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:24px;color:#2D2D2D;font-weight:bold;mso-line-height-rule:exactly;">${signerName}</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#5A5A5A;mso-line-height-rule:exactly;">Finance - Culture for Change</td></tr>
        <tr><td height="6" style="height:6px;line-height:6px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;mso-line-height-rule:exactly;"><a href="mailto:finance@cultureforchange.net" style="color:#C9552F;text-decoration:underline;">finance@cultureforchange.net</a></td></tr>
      </table>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td class="px" align="center" style="background-color:#2D2D2D;padding:32px 48px 32px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#A0A0A0;mso-line-height-rule:exactly;">Δίκτυο Culture for Change — Αθήνα, Ελλάδα<br>Λαμβάνεις αυτό το email ως μέλος του δικτύου Culture for Change.</td></tr>
        <tr><td height="18" style="height:18px;line-height:18px;font-size:0;">&nbsp;</td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;color:#8A8A8A;mso-line-height-rule:exactly;">_______________________________________________________________<br>This email may contain confidential information. Read full disclaimer <a href="https://www.cultureforchange.net/email-confidentiality-disclaimer" style="color:#FF8B6A;text-decoration:underline;">here</a></td></tr>
      </table>
    </td>
  </tr>

</table>

</td></tr>
</table>
</body>
</html>
`
  return { subject: 'Σχετικά με την πληρωμή της συνδρομής σου — Culture for Change', html }
}

/**
 * Μηνιαία εικόνα προς το ΛΟΓΙΣΤΙΚΟ ΓΡΑΦΕΙΟ — επίσημο εξωτερικό email,
 * πλήρες design shell, υπογραφή Διαχείρισης (admin), αποστολή από admin@.
 * Μέχρι να οριστεί ACCOUNTANT_EMAIL πηγαίνει στο finance@ για δοκιμή/προώθηση.
 */
export interface MonthlyDispatchInput {
  /** [κατηγορία, ποσό «45,00»] */
  incomeLines: Array<[string, string]>
  incomeCount: number
  incomeTotal: string          // «80,00»
  expenseLines: Array<[string, string]>
  expenseCount: number
  expenseTotal: string
  balance: string              // έσοδα − έξοδα, με πρόσημο
  signerName?: string
  viaFallback?: boolean
}

export function monthlyDispatchEmailHtml(
  monthLabel: string,
  input: MonthlyDispatchInput,
): { subject: string; html: string } {
  const {
    incomeLines, incomeCount, incomeTotal,
    expenseLines, expenseCount, expenseTotal, balance,
    signerName = 'Culture for Change — Διαχείριση', viaFallback = false,
  } = input
  const count = incomeCount + expenseCount
  const total = incomeTotal
  const rowsOf = (lines: Array<[string, string]>) => lines.map(([k, v]) => `
              <tr>
                <td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2D2D2D;">${k}</td>
                <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2D2D2D;">${v} €</td>
              </tr>`).join('')
  const totalsRows = rowsOf(incomeLines)
  const expenseRows = rowsOf(expenseLines)
  const html = `<!DOCTYPE html>
<html lang="el">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Μηνιαία εικόνα — Culture for Change</title>
<!--[if mso]>
<style>body,table,td,a{font-family:Arial,Helvetica,sans-serif !important;}</style>
<![endif]-->
<style>
  @media only screen and (max-width:620px){
    .px{padding-left:24px !important;padding-right:24px !important;}
    .h1{font-size:26px !important;line-height:32px !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#F5F0EB;">
<span style="display:none;font-size:1px;color:#F5F0EB;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Η μηνιαία εικόνα εσόδων και εξόδων του Culture for Change — ${monthLabel}.</span>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F0EB;">
<tr><td align="center" style="padding:32px 12px 48px 12px;">

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:#FFFFFF;border-radius:24px;overflow:hidden;border:1px solid #E5E7EB;">

  <!-- Header -->
  <tr>
    <td class="px" style="background-color:#FF8B6A;padding:36px 48px 32px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:16px;letter-spacing:1.6px;color:#FFFFFF;font-weight:bold;mso-line-height-rule:exactly;">CULTURE FOR CHANGE</td>
        </tr>
        <tr><td height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
        <tr>
          <td class="h1" style="font-family:Arial,Helvetica,sans-serif;font-size:30px;line-height:36px;color:#2D2D2D;font-weight:bold;mso-line-height-rule:exactly;">ΜΗΝΙΑΙΑ ΕΙΚΟΝΑ — ${monthLabel.toLocaleUpperCase('el')}</td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td class="px" style="padding:40px 48px 8px 48px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#2D2D2D;mso-line-height-rule:exactly;">
      <p style="margin:0 0 20px 0;">Αγαπητοί συνεργάτες,</p>
      <p style="margin:0 0 20px 0;">σας αποστέλλουμε τη μηνιαία εικόνα εσόδων και εξόδων του σωματείου για τον μήνα <strong>${monthLabel}</strong>. Επισυνάπτεται αναλυτικό αρχείο με ${count} παραστατικά (${incomeCount} εσόδων, ${expenseCount} εξόδων).</p>
    </td>
  </tr>

  <!-- Totals box -->
  <tr>
    <td class="px" style="padding:8px 48px 8px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background-color:#F5F0EB;border-radius:16px;">
        <tr>
          <td style="padding:20px 24px 8px 24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${totalsRows}
              <tr><td colspan="2" style="padding:10px 0 0 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td height="1" style="height:1px;line-height:1px;font-size:0;background-color:#E0D8D0;">&nbsp;</td></tr></table></td></tr>
              <tr>
                <td style="padding-top:10px;font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:26px;color:#2D2D2D;font-weight:bold;">Σύνολο εσόδων</td>
                <td align="right" style="padding-top:10px;font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:26px;color:#2D2D2D;font-weight:bold;">${total} €</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td height="16" style="height:16px;line-height:16px;font-size:0;">&nbsp;</td></tr>
      </table>
    </td>
  </tr>

  <!-- Έξοδα -->
  <tr>
    <td class="px" style="padding:8px 48px 8px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background-color:#F5F0EB;border-radius:16px;">
        <tr>
          <td style="padding:20px 24px 8px 24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${expenseRows || `
              <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#5A5A5A;">Καμία δαπάνη τον μήνα αυτό.</td></tr>`}
              <tr><td colspan="2" style="padding:10px 0 0 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td height="1" style="height:1px;line-height:1px;font-size:0;background-color:#E0D8D0;">&nbsp;</td></tr></table></td></tr>
              <tr>
                <td style="padding-top:10px;font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:26px;color:#2D2D2D;font-weight:bold;">Σύνολο εξόδων</td>
                <td align="right" style="padding-top:10px;font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:26px;color:#2D2D2D;font-weight:bold;">${expenseTotal} €</td>
              </tr>
              <tr>
                <td style="padding-top:6px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#5A5A5A;">Ισοζύγιο μήνα</td>
                <td align="right" style="padding-top:6px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#5A5A5A;">${balance} €</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td height="16" style="height:16px;line-height:16px;font-size:0;">&nbsp;</td></tr>
      </table>
    </td>
  </tr>

  <tr>
    <td class="px" style="padding:16px 48px 8px 48px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#5A5A5A;mso-line-height-rule:exactly;">
      <p style="margin:0 0 12px 0;">Το πλήρες αρχείο ΕΣΟΔΑ-ΕΞΟΔΑ και όλα τα παραστατικά βρίσκονται, ως συνήθως, στο κοινόχρηστο Excel και στους φακέλους Drive στους οποίους έχετε πρόσβαση.</p>
      <p style="margin:0;">Για οποιαδήποτε διευκρίνιση, απαντήστε σε αυτό το email.</p>
      ${viaFallback ? '<p style="margin:12px 0 0 0;color:#a05a2c;">⚠ Δοκιμαστική αποστολή: δεν έχει οριστεί email λογιστηρίου — το μήνυμα ήρθε στο finance@ για έλεγχο/προώθηση.</p>' : ''}
    </td>
  </tr>

  <!-- Signature -->
  <tr>
    <td class="px" style="padding:24px 48px 0 48px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#2D2D2D;mso-line-height-rule:exactly;">
      <p style="margin:0;">Με εκτίμηση,</p>
    </td>
  </tr>
  <tr>
    <td class="px" style="padding:16px 48px 40px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td height="1" style="height:1px;line-height:1px;font-size:0;background-color:#E5E7EB;">&nbsp;</td></tr>
        <tr><td height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:24px;color:#2D2D2D;font-weight:bold;mso-line-height-rule:exactly;">${signerName}</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#5A5A5A;mso-line-height-rule:exactly;">Διαχείριση - Culture for Change</td></tr>
        <tr><td height="6" style="height:6px;line-height:6px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;mso-line-height-rule:exactly;"><a href="mailto:admin@cultureforchange.net" style="color:#C9552F;text-decoration:underline;">admin@cultureforchange.net</a></td></tr>
      </table>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td class="px" align="center" style="background-color:#2D2D2D;padding:32px 48px 32px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#A0A0A0;mso-line-height-rule:exactly;">Σωματείο Κοινωνικής και Πολιτισμικής Καινοτομίας — Culture for Change<br>Λεωφόρος Αλεξάνδρας 48, 11473 Αθήνα · ΑΦΜ 996788256<br>Λαμβάνετε αυτό το email ως συνεργαζόμενο λογιστικό γραφείο του σωματείου.</td></tr>
        <tr><td height="18" style="height:18px;line-height:18px;font-size:0;">&nbsp;</td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;color:#8A8A8A;mso-line-height-rule:exactly;">_______________________________________________________________<br>This email may contain confidential information. Read full disclaimer <a href="https://www.cultureforchange.net/email-confidentiality-disclaimer" style="color:#FF8B6A;text-decoration:underline;">here</a></td></tr>
      </table>
    </td>
  </tr>

</table>

</td></tr>
</table>
</body>
</html>
`
  return { subject: `Μηνιαία εικόνα εσόδων-εξόδων ${monthLabel} — Culture for Change`, html }
}

/**
 * Υπενθύμιση ταμείου — φεύγει την 1η κάθε μήνα στον/στην τρέχοντα Financer.
 * Σκοπός: να μη βασίζεται η ενημέρωση του ταμείου στη μνήμη κανενός.
 */
export function treasuryReminderEmailHtml(
  firstName: string,
  monthLabel: string,
  last: { amount: string; date: string } | null,
  ocUrl: string,
): { subject: string; html: string } {
  const lastBlock = last
    ? `<p style="margin:0 0 20px 0;">Η τελευταία καταχωρημένη μέτρηση είναι <strong>${last.amount} €</strong> στις ${last.date}.</p>`
    : `<p style="margin:0 0 20px 0;">Δεν έχει καταχωρηθεί ακόμη καμία μέτρηση.</p>`
  const html = `<!DOCTYPE html>
<html lang="el">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>Ενημέρωση ταμείου — Culture for Change</title>
<style>
  @media only screen and (max-width:620px){
    .px{padding-left:24px !important;padding-right:24px !important;}
    .h1{font-size:26px !important;line-height:32px !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#F5F0EB;">
<span style="display:none;font-size:1px;color:#F5F0EB;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Ώρα να ενημερωθεί το ταμείο για τον ${monthLabel}.</span>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F0EB;">
<tr><td align="center" style="padding:32px 12px 48px 12px;">

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:#FFFFFF;border-radius:24px;overflow:hidden;border:1px solid #E5E7EB;">

  <tr>
    <td class="px" style="background-color:#FF8B6A;padding:36px 48px 32px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:16px;letter-spacing:1.6px;color:#FFFFFF;font-weight:bold;">CULTURE FOR CHANGE</td></tr>
        <tr><td height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
        <tr><td class="h1" style="font-family:Arial,Helvetica,sans-serif;font-size:30px;line-height:36px;color:#2D2D2D;font-weight:bold;">ΕΝΗΜΕΡΩΣΗ ΤΑΜΕΙΟΥ</td></tr>
      </table>
    </td>
  </tr>

  <tr>
    <td class="px" style="padding:40px 48px 8px 48px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#2D2D2D;">
      <p style="margin:0 0 20px 0;">${firstName ? firstName + ',' : 'Καλημέρα,'}</p>
      <p style="margin:0 0 20px 0;">αρχή μήνα — ώρα να καταχωρηθεί το υπόλοιπο του ταμείου για τον <strong>${monthLabel}</strong>.</p>
      ${lastBlock}
      <p style="margin:0 0 8px 0;">Άνοιξε το πλακίδιο «Ταμείο» στην Επισκόπηση του OC και γράψε το υπόλοιπο της τράπεζας όπως το βλέπεις σήμερα.</p>
    </td>
  </tr>

  <tr>
    <td class="px" style="padding:16px 48px 8px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="background-color:#FF8B6A;border-radius:999px;">
          <a href="${ocUrl}" style="display:inline-block;padding:14px 32px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:20px;color:#FFFFFF;text-decoration:none;font-weight:bold;">Ενημέρωση ταμείου</a>
        </td>
      </tr></table>
    </td>
  </tr>

  <tr>
    <td class="px" style="padding:24px 48px 40px 48px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#5A5A5A;">
      <p style="margin:0;">Αυτόματη υπενθύμιση, την 1η κάθε μήνα.</p>
    </td>
  </tr>

  <tr>
    <td class="px" align="center" style="background-color:#2D2D2D;padding:32px 48px 32px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#A0A0A0;">Σωματείο Κοινωνικής και Πολιτισμικής Καινοτομίας — Culture for Change</td></tr>
      </table>
    </td>
  </tr>

</table>

</td></tr>
</table>
</body>
</html>
`
  return { subject: `Ενημέρωση ταμείου — ${monthLabel}`, html }
}

/**
 * Departure email — στέλνεται όταν διαγράφεται μέλος (OC ή Sheet).
 * Design shell, υπογραφή Community. ⟨TODO⟩: πραγματικό URL ερωτηματολογίου.
 */
export function farewellUrl(token: string): string {
  return `${SITE_URL}/farewell/${encodeURIComponent(token)}`
}

export function departureEmailHtml(firstName: string, signerName = 'Culture for Change — Community', questionnaireUrl = EXIT_QUESTIONNAIRE_URL): { subject: string; html: string } {
  const year = new Date().getFullYear()
  const html = `<!DOCTYPE html>
<html lang="el">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Σε αποχαιρετούμε — Culture for Change</title>
<!--[if mso]>
<style>body,table,td,a{font-family:Arial,Helvetica,sans-serif !important;}</style>
<![endif]-->
<style>
  @media only screen and (max-width:620px){
    .px{padding-left:24px !important;padding-right:24px !important;}
    .stack{display:block !important;width:100% !important;}
    .btn a{display:block !important;}
    .h1{font-size:26px !important;line-height:32px !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#F5F0EB;">
<span style="display:none;font-size:1px;color:#F5F0EB;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Σε αποχαιρετούμε — και σε ευχαριστούμε για όσα μοιράστηκες με το δίκτυο.</span>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F0EB;">
<tr><td align="center" style="padding:32px 12px 48px 12px;">

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:#FFFFFF;border-radius:24px;overflow:hidden;border:1px solid #E5E7EB;">

  <!-- Header -->
  <tr>
    <td class="px" style="background-color:#FF8B6A;padding:36px 48px 32px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:16px;letter-spacing:1.6px;color:#FFFFFF;font-weight:bold;mso-line-height-rule:exactly;">CULTURE FOR CHANGE</td>
        </tr>
        <tr><td height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
        <tr>
          <td class="h1" style="font-family:Arial,Helvetica,sans-serif;font-size:30px;line-height:36px;color:#2D2D2D;font-weight:bold;mso-line-height-rule:exactly;">ΣΕ ΑΠΟΧΑΙΡΕΤΟΥΜΕ</td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td class="px" style="padding:40px 48px 8px 48px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#2D2D2D;mso-line-height-rule:exactly;">
      <p style="margin:0 0 20px 0;">Αγαπητή/αγαπητέ ${firstName},</p>
      <p style="margin:0 0 20px 0;">Λυπούμαστε που σε βλέπουμε να φεύγεις από το Culture For Change. Σε ευχαριστούμε
      θερμά για όσα μοιράστηκες μαζί μας όλο αυτό το διάστημα — η παρουσία σου έκανε το δίκτυο πλουσιότερο.</p>
      <p style="margin:0 0 20px 0;">Αν κάποια στιγμή θελήσεις να επιστρέψεις, οι εγγραφές είναι πάντα ανοιχτές —
      θα χρειαστεί απλώς νέα αίτηση και καταβολή της συνδρομής από την αρχή.</p>
      <p style="margin:0 0 20px 0;">Θα μας βοηθούσε πολύ αν αφιέρωνες 2-3 λεπτά σε ένα σύντομο ερωτηματολόγιο
      για τους λόγους της αποχώρησής σου και την εμπειρία σου στο δίκτυο — μας βοηθά να γινόμαστε καλύτεροι:</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td class="btn" align="center" bgcolor="#FF8B6A" style="background-color:#FF8B6A;border-radius:999px;">
            <a href="${questionnaireUrl}" style="display:block;padding:16px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:20px;font-weight:bold;color:#2D2D2D;text-decoration:none;border-radius:999px;mso-line-height-rule:exactly;">Ερωτηματολόγιο αποχώρησης</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Signature -->
  <tr>
    <td class="px" style="padding:32px 48px 0 48px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#2D2D2D;mso-line-height-rule:exactly;">
      <p style="margin:0 0 20px 0;">Σε ευχαριστούμε για όλα και σου ευχόμαστε ό,τι καλύτερο! 💛</p>
      <p style="margin:0;">Φιλικά,</p>
    </td>
  </tr>
  <tr>
    <td class="px" style="padding:16px 48px 40px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td height="1" style="height:1px;line-height:1px;font-size:0;background-color:#E5E7EB;">&nbsp;</td></tr>
        <tr><td height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:24px;color:#2D2D2D;font-weight:bold;mso-line-height-rule:exactly;">${signerName}</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#5A5A5A;mso-line-height-rule:exactly;">Secretary General<br>Community - Culture for Change</td></tr>
        <tr><td height="6" style="height:6px;line-height:6px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;mso-line-height-rule:exactly;"><a href="mailto:community@cultureforchange.net" style="color:#C9552F;text-decoration:underline;">community@cultureforchange.net</a></td></tr>
      </table>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td class="px" align="center" style="background-color:#2D2D2D;padding:32px 48px 32px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#F5F0EB;font-weight:bold;mso-line-height-rule:exactly;">Join our Social Networks &amp; Get Involved!</td></tr>
        <tr><td height="14" style="height:14px;line-height:14px;font-size:0;">&nbsp;</td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:26px;color:#F5F0EB;mso-line-height-rule:exactly;">
          <a href="https://cultureforchange.net" style="color:#FF8B6A;text-decoration:none;">Website</a>&nbsp; |&nbsp;
          <a href="https://www.facebook.com/cultureforchange" style="color:#FF8B6A;text-decoration:none;">Facebook</a>&nbsp; |&nbsp;
          <a href="https://www.instagram.com/cultureforchange" style="color:#FF8B6A;text-decoration:none;">Instagram</a>&nbsp; |&nbsp;
          <a href="https://www.linkedin.com/company/cultureforchange" style="color:#FF8B6A;text-decoration:none;">LinkedIn</a>&nbsp; |&nbsp;
          <a href="https://www.youtube.com/@cultureforchange" style="color:#FF8B6A;text-decoration:none;">YouTube</a>
        </td></tr>
        <tr><td height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#A0A0A0;mso-line-height-rule:exactly;">Δίκτυο Culture for Change — Αθήνα, Ελλάδα<br>Λαμβάνεις αυτό το email επειδή ολοκληρώθηκε η διαγραφή σου από το μητρώο μελών.</td></tr>
        <tr><td height="18" style="height:18px;line-height:18px;font-size:0;">&nbsp;</td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;color:#8A8A8A;mso-line-height-rule:exactly;">_______________________________________________________________<br>This email may contain confidential information. Read full disclaimer <a href="https://www.cultureforchange.net/email-confidentiality-disclaimer" style="color:#FF8B6A;text-decoration:underline;">here</a></td></tr>
      </table>
    </td>
  </tr>

</table>

</td></tr>
</table>
</body>
</html>
`
  return { subject: 'Σε αποχαιρετούμε — Culture for Change', html }
}

/** Εσωτερική ειδοποίηση finance@: δήλωση πληρωμής (design shell, χωρίς υπογραφή) */
export function paymentClaimNoticeHtml(name: string, email: string, applicationId: string, receiptUrl?: string | null): { subject: string; html: string } {
  const receiptBlock = receiptUrl
    ? `<p style="margin:0 0 20px 0;">📎 <a href="${receiptUrl}" style="color:#C9552F;font-weight:bold;text-decoration:underline;">Αποδεικτικό κατάθεσης</a> (ανέβηκε από το μέλος)</p>`
    : '<p style="margin:0 0 20px 0;color:#888;">Δεν επισυνάφθηκε αποδεικτικό κατάθεσης.</p>'
  const html = `<!DOCTYPE html>
<html lang="el">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Δήλωση πληρωμής — Culture for Change OC</title>
<!--[if mso]>
<style>body,table,td,a{font-family:Arial,Helvetica,sans-serif !important;}</style>
<![endif]-->
<style>
  @media only screen and (max-width:620px){
    .px{padding-left:24px !important;padding-right:24px !important;}
    .stack{display:block !important;width:100% !important;}
    .btn a{display:block !important;}
    .h1{font-size:26px !important;line-height:32px !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#F5F0EB;">
<span style="display:none;font-size:1px;color:#F5F0EB;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Νέα δήλωση πληρωμής συνδρομής — προς επιβεβαίωση.</span>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F0EB;">
<tr><td align="center" style="padding:32px 12px 48px 12px;">

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:#FFFFFF;border-radius:24px;overflow:hidden;border:1px solid #E5E7EB;">

  <!-- Header -->
  <tr>
    <td class="px" style="background-color:#FF8B6A;padding:36px 48px 32px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:16px;letter-spacing:1.6px;color:#FFFFFF;font-weight:bold;mso-line-height-rule:exactly;">CULTURE FOR CHANGE</td>
        </tr>
        <tr><td height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
        <tr>
          <td class="h1" style="font-family:Arial,Helvetica,sans-serif;font-size:30px;line-height:36px;color:#2D2D2D;font-weight:bold;mso-line-height-rule:exactly;">ΔΗΛΩΣΗ ΠΛΗΡΩΜΗΣ ΣΥΝΔΡΟΜΗΣ</td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td class="px" style="padding:40px 48px 40px 48px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#2D2D2D;mso-line-height-rule:exactly;">
      <p style="margin:0 0 20px 0;"><strong>${name}</strong> (${email}) δήλωσε ότι ολοκλήρωσε την καταβολή
      της συνδρομής εγγραφής.</p>
      ${receiptBlock}
      <p style="margin:0 0 20px 0;">Έλεγξε τον τραπεζικό λογαριασμό και, μόλις επιβεβαιωθεί η κατάθεση,
      καταχώρησε την πληρωμή από το OC:</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td class="btn" align="center" bgcolor="#FF8B6A" style="background-color:#FF8B6A;border-radius:999px;">
            <a href="https://www.cultureforchange.net/oc" style="display:block;padding:16px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:20px;font-weight:bold;color:#2D2D2D;text-decoration:none;border-radius:999px;mso-line-height-rule:exactly;">Άνοιγμα OC → Εγκρίθηκαν — αναμονή πληρωμής</a>
          </td>
        </tr>
      </table>
      <p style="margin:20px 0 0 0;font-size:13px;color:#888;">Application: ${applicationId}</p>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td class="px" align="center" style="background-color:#2D2D2D;padding:32px 48px 32px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#F5F0EB;font-weight:bold;mso-line-height-rule:exactly;">Join our Social Networks &amp; Get Involved!</td></tr>
        <tr><td height="14" style="height:14px;line-height:14px;font-size:0;">&nbsp;</td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:26px;color:#F5F0EB;mso-line-height-rule:exactly;">
          <a href="https://cultureforchange.net" style="color:#FF8B6A;text-decoration:none;">Website</a>&nbsp; |&nbsp;
          <a href="https://www.facebook.com/cultureforchange" style="color:#FF8B6A;text-decoration:none;">Facebook</a>&nbsp; |&nbsp;
          <a href="https://www.instagram.com/cultureforchange" style="color:#FF8B6A;text-decoration:none;">Instagram</a>&nbsp; |&nbsp;
          <a href="https://www.linkedin.com/company/cultureforchange" style="color:#FF8B6A;text-decoration:none;">LinkedIn</a>&nbsp; |&nbsp;
          <a href="https://www.youtube.com/@cultureforchange" style="color:#FF8B6A;text-decoration:none;">YouTube</a>
        </td></tr>
        <tr><td height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#A0A0A0;mso-line-height-rule:exactly;">Δίκτυο Culture for Change — Αθήνα, Ελλάδα<br>Εσωτερική ειδοποίηση του Operational Center προς την ομάδα οικονομικών.</td></tr>
        <tr><td height="18" style="height:18px;line-height:18px;font-size:0;">&nbsp;</td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;color:#8A8A8A;mso-line-height-rule:exactly;">_______________________________________________________________<br>This email may contain confidential information. Read full disclaimer <a href="https://www.cultureforchange.net/email-confidentiality-disclaimer" style="color:#FF8B6A;text-decoration:underline;">here</a></td></tr>
      </table>
    </td>
  </tr>

</table>

</td></tr>
</table>
</body>
</html>
`
  return { subject: `Δήλωση πληρωμής: ${name}`, html }
}

/** Μηνιαία υπενθύμιση προς τον/την Financer (τελευταία μέρα του μήνα):
 *  αύριο κλείνει ο μήνας — προετοιμασία των παραστατικών με την ενιαία
 *  ονοματολογία και τα τρία βήματα του κύκλου στο OC. Ίδιο πρότυπο με τα
 *  υπόλοιπα email του OC. */
export function financeMonthlyReminderEmailHtml(monthLabel: string, adminName?: string | null, signerName = 'Culture for Change — Finance'): { subject: string; html: string } {
  const code = (t: string) => `<code style="font-family:Menlo,Consolas,monospace;font-size:13px;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:6px;padding:2px 6px;white-space:nowrap;">${t}</code>`
  const shot = (file: string, alt: string) => `<img src="https://www.cultureforchange.net/email/${file}" alt="${alt}" width="100%" style="display:block;width:100%;max-width:100%;height:auto;border-radius:12px;border:1px solid #E5E7EB;margin:10px 0 4px 0;">`
  const step = (n: string, title: string, body: string) => `
        <tr>
          <td style="padding:0 0 18px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F0EB;border-radius:16px;">
              <tr>
                <td width="56" valign="top" style="padding:18px 0 18px 20px;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:30px;font-weight:bold;color:#FF8B6A;mso-line-height-rule:exactly;">${n}</td>
                <td valign="top" style="padding:18px 20px 18px 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:23px;color:#2D2D2D;mso-line-height-rule:exactly;">
                  <strong style="display:block;font-size:16px;margin-bottom:4px;">${title}</strong>
                  ${body}
                </td>
              </tr>
            </table>
          </td>
        </tr>`
  const html = `<!DOCTYPE html>
<html lang="el">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Μηνιαίος οικονομικός απολογισμός — Culture for Change</title>
<!--[if mso]>
<style>body,table,td,a{font-family:Arial,Helvetica,sans-serif !important;}</style>
<![endif]-->
<style>
  @media only screen and (max-width:620px){
    .px{padding-left:24px !important;padding-right:24px !important;}
    .btn a{display:block !important;}
    .h1{font-size:26px !important;line-height:32px !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#F5F0EB;">
<span style="display:none;font-size:1px;color:#F5F0EB;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Αύριο κλείνει ο ${monthLabel} — τα βήματα του μηνιαίου κύκλου στο OC.</span>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F0EB;">
<tr><td align="center" style="padding:32px 12px 48px 12px;">

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:#FFFFFF;border-radius:24px;overflow:hidden;border:1px solid #E5E7EB;">

  <!-- Header -->
  <tr>
    <td class="px" style="background-color:#FF8B6A;padding:36px 48px 32px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:16px;letter-spacing:1.6px;color:#FFFFFF;font-weight:bold;mso-line-height-rule:exactly;">CULTURE FOR CHANGE · OPERATIONAL CENTER</td>
        </tr>
        <tr><td height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
        <tr>
          <td class="h1" style="font-family:Arial,Helvetica,sans-serif;font-size:30px;line-height:36px;color:#2D2D2D;font-weight:bold;mso-line-height-rule:exactly;">ΑΥΡΙΟ ΚΛΕΙΝΕΙ Ο ΜΗΝΑΣ</td>
        </tr>
        <tr><td height="8" style="height:8px;line-height:8px;font-size:0;">&nbsp;</td></tr>
        <tr>
          <td style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#2D2D2D;mso-line-height-rule:exactly;">Μηνιαίος οικονομικός απολογισμός · ${monthLabel}</td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Intro -->
  <tr>
    <td class="px" style="padding:40px 48px 8px 48px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#2D2D2D;mso-line-height-rule:exactly;">
      <p style="margin:0 0 20px 0;">Γεια σου!</p>
      <p style="margin:0 0 20px 0;">Αύριο είναι η 1η του μήνα — ώρα για τον μηνιαίο οικονομικό κύκλο του <strong>${monthLabel}</strong>. Τέσσερα βήματα, με τη σειρά:</p>
    </td>
  </tr>

  <!-- Steps -->
  <tr>
    <td class="px" style="padding:8px 48px 8px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        ${step('0', 'Προετοιμασία — τα παραστατικά στη θέση τους', `Αποθήκευσε όλα τα τιμολόγια που έλαβες μέσω email στον υπολογιστή σου.<br>
                  <strong>Τραπεζικά έξοδα:</strong> μπες στο e-banking της Alpha Bank, διάλεξε <strong>Έγγραφα</strong> από το πάνω μενού και <strong>Τιμολόγια</strong> από το υπομενού, και κατέβασε όλα τα τιμολόγια του προηγούμενου μήνα — είναι οι προμήθειες για μεταφορές σε λογαριασμούς εκτός Alpha.${shot('oc-alpha-invoices.png', 'Alpha Bank: Έγγραφα → Τιμολόγια')}
                  Μετάφερέ τα όλα στο Drive, στα <strong>Παραστατικά → Έξοδα</strong> του τρέχοντος μήνα. Εκεί μετονόμασέ τα με την ενιαία ονοματολογία:
                  <div style="margin:10px 0 6px 0;">${code('{σε ποιον}_{αριθμός}_{ΜΑΡΚ}_{ΗΗ-ΜΜ-ΕΕΕΕ}_{ποσό}.pdf')}</div>
                  <div style="margin:0 0 10px 0;">π.χ. ${code('ΑΒ Βασιλόπουλος_4471-88012_400014700880013_28-08-2026_62,50.pdf')}</div>
                  Ό,τι λείπει (π.χ. ΜΑΡΚ) απλώς παραλείπεται· το Α/Α το βάζει το OC στην έγκριση.<br>
                  <strong>Κρατήσεις;</strong> Όταν το τιμολόγιο έχει άλλο σύνολο κι άλλο πληρωτέο, γράψε το ποσό ως <strong>σύνολο→πληρωτέο</strong>:
                  <div style="margin:6px 0 0 0;">${code('Παπαδοπούλου_112_18-08-2026_120,00→96,00.pdf')}</div>
                  Το OC διαβάζει 120,00 σύνολο, 96,00 πληρωτέο και συμπληρώνει μόνο του κρατήσεις 24,00 — στη βάση και στο φύλλο ΕΞΟΔΑ. (Δεκτά και τα «->» ή «>» αν το βέλος δυσκολεύει.)`)}
        ${step('1', 'Κινήσεις τράπεζας', `Κατέβασε από το e-banking τις κινήσεις του μήνα και επικόλλησέ τις στο πλαίσιο «Κινήσεις τράπεζας» της καρτέλας <em>Οικονομικά</em>. Το OC τις ταιριάζει με τα παραστατικά του φακέλου — και με τα ποσά πληρωτέα, όχι τα σύνολα.<br>
                  <strong>Πώς:</strong> Στην <strong>Επισκόπηση</strong> (η πρώτη οθόνη μετά το login) επίλεξε τον λογαριασμό (ένας υπάρχει). Στις <strong>Κινήσεις</strong>, όρισε το διάστημα από την πρώτη ως την τελευταία μέρα του μήνα που ετοιμάζεις και πάτησε τον μεγεθυντικό φακό (αναζήτηση) — έτσι επιλέγονται όλες οι συναλλαγές του μήνα. Μετά πάτησε δεξιά το <strong>CSV</strong>: ανοίγει νέο παράθυρο με κείμενο. Αντίγραψέ το όλο και επικόλλησέ το στο πλαίσιο «Κινήσεις τράπεζας» του OC.${shot('oc-alpha-kiniseis.png', 'Alpha Bank: Κινήσεις — διάστημα μήνα, αναζήτηση, CSV')}`)}
        ${step('2', 'Ταμείο', `Παρομοίως, πήγαινε στο υπομενού <strong>Εισερχόμενες εντολές</strong>, όρισε ξανά το διάστημα από την πρώτη ως την τελευταία μέρα του μήνα, πάτησε τον μεγεθυντικό φακό (αναζήτηση) και μετά <strong>CSV</strong>. Αντίγραψε το κείμενο και επικόλλησέ το στο πλαίσιο «Ταμείο» του OC.${shot('oc-alpha-eiserxomenes.png', 'Alpha Bank: Εισερχόμενες εντολές — διάστημα μήνα, αναζήτηση, CSV')}`)}
        ${step('3', 'Μηνιαία εικόνα', `Έλεγξε τη «Μηνιαία εικόνα» στην καρτέλα <em>Οικονομικά</em> και, όταν όλα δείχνουν σωστά, πάτησε την έγκριση του μήνα. Την αποστολή προς το Λογιστήριο την αναλαμβάνει ${adminName ? `η/ο ${adminName} (Διαχείριση)` : 'η Διαχείριση'}.`)}
      </table>
    </td>
  </tr>

  <!-- CTA -->
  <tr>
    <td class="px" align="center" style="padding:16px 48px 8px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="btn">
        <tr>
          <td align="center" style="background-color:#FF8B6A;border-radius:999px;">
            <a href="https://cultureforchange.net/oc" style="display:inline-block;padding:14px 32px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:20px;font-weight:bold;color:#FFFFFF;text-decoration:none;">Άνοιξε το Operational Center</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Signature -->
  <tr>
    <td class="px" style="padding:32px 48px 0 48px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#2D2D2D;mso-line-height-rule:exactly;">
      <p style="margin:0;">Καλή δουλειά,</p>
    </td>
  </tr>
  <tr>
    <td class="px" style="padding:16px 48px 40px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td height="1" style="height:1px;line-height:1px;font-size:0;background-color:#E5E7EB;">&nbsp;</td></tr>
        <tr><td height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:24px;color:#2D2D2D;font-weight:bold;mso-line-height-rule:exactly;">${signerName}</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#5A5A5A;mso-line-height-rule:exactly;">Αυτόματη υπενθύμιση · στέλνεται την τελευταία μέρα κάθε μήνα</td></tr>
        <tr><td height="6" style="height:6px;line-height:6px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;mso-line-height-rule:exactly;"><a href="mailto:finance@cultureforchange.net" style="color:#C9552F;text-decoration:underline;">finance@cultureforchange.net</a></td></tr>
      </table>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`
  return { subject: `Υπενθύμιση: αύριο ο μηνιαίος οικονομικός απολογισμός (${monthLabel})`, html }
}
