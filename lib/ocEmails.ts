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
