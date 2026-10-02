/**
 * Email δηλώσεων συμμετοχής.
 *
 * ΦΩΣ ΜΟΝΟ, από την πρώτη γραμμή: `color-scheme: light only` ΚΑΙ
 * `supported-color-schemes: light only`. Την 1/10/2026 βρέθηκαν 16 πρότυπα
 * που δήλωναν «light dark» χωρίς να υλοποιούν σκούρο θέμα — ο πελάτης
 * αναστρέφει το φόντο, το καρφωμένο σκούρο κείμενο μένει, και το γράμμα
 * γίνεται αδιάβαστο. Τρία από αυτά δεν είχαν καν το δεύτερο meta, που είναι
 * ακριβώς αυτό που διαβάζει το Apple Mail.
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cultureforchange.net'

const esc = (s: string) => String(s || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function shell(title: string, inner: string): string {
  return `<!DOCTYPE html>
<html lang="el">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${esc(title)} — Culture for Change</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F0EB;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F0EB;">
<tr><td align="center" style="padding:32px 12px 48px 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:#FFFFFF;border-radius:24px;overflow:hidden;">
  <tr><td style="background-color:#FF8B6A;padding:32px 40px;">
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:1.6px;color:#FFFFFF;font-weight:bold;">CULTURE FOR CHANGE</div>
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:28px;line-height:34px;color:#2D2D2D;font-weight:bold;padding-top:12px;">${esc(title)}</div>
  </td></tr>
  <tr><td style="padding:32px 40px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#2D2D2D;">
    ${inner}
  </td></tr>
  <tr><td style="background-color:#2D2D2D;padding:20px 40px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#CCCCCC;text-align:center;">
    Σωματείο Κοινωνικής και Πολιτισμικής Καινοτομίας — Culture for Change
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

const button = (href: string, label: string) =>
  `<p style="margin:28px 0;"><a href="${esc(href)}" style="display:inline-block;padding:14px 32px;`
  + `font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#2D2D2D;`
  + `background-color:#FF8B6A;border-radius:999px;text-decoration:none;">${esc(label)}</a></p>`

/**
 * Η ΕΝΗΜΕΡΩΣΗ ΓΙΑ ΤΑ ΔΕΔΟΜΕΝΑ — ακριβής, όχι καθησυχαστική.
 *
 * ΔΕΝ λέει «μόνο για στατιστικούς λόγους»: δεν είναι αλήθεια, και μια
 * ανακριβής ενημέρωση επεξεργασίας είναι η ίδια παράβαση. Ο κύριος σκοπός
 * είναι να ΤΡΕΞΕΙ η δράση. Ούτε λέει «δεν δίνουμε τίποτα σε τρίτους»: η
 * κράτηση ξενοδοχείου και η είσοδος στον χώρο ΑΠΑΙΤΟΥΝ ονόματα.
 */
export const GDPR_NOTICE_HTML = `
<p style="margin:0 0 10px 0;font-weight:bold;">Τι κάνουμε με τα στοιχεία σου</p>
<ul style="margin:0 0 16px 0;padding-left:20px;">
  <li>Τα κρατάμε για να <strong>οργανώσουμε τη συμμετοχή σου</strong>: πρόγραμμα, εστίαση, διαμονή και αποστολή του συνδέσμου.</li>
  <li>Τα βλέπει η <strong>Ομάδα Συντονισμού</strong> του CforC.</li>
  <li>Όπου χρειάζεται, δίνουμε <strong>μόνο το όνομα</strong>: στο ξενοδοχείο για την κράτηση και στον χώρο διεξαγωγής για την είσοδο.</li>
  <li><strong>Ποτέ</strong> δεν πωλούνται, δεν δίνονται σε διαφημιστές και δεν χρησιμοποιούνται για άλλο σκοπό.</li>
  <li>Τυχόν στατιστικά βγαίνουν <strong>μόνο συγκεντρωτικά</strong>, χωρίς ονόματα.</li>
  <li>Μπορείς να ζητήσεις πρόσβαση, διόρθωση ή διαγραφή στο <a href="mailto:hello@cultureforchange.net" style="color:#C2410C;">hello@cultureforchange.net</a>.</li>
</ul>`

/** Οι προτροπές — ΜΟΝΟ εδώ και στην οθόνη μετά την υποβολή, ποτέ πριν */
const CTA_HTML = `
<hr style="border:none;border-top:1px solid #E5E5E5;margin:28px 0;">
<p style="margin:0 0 8px 0;font-weight:bold;">Μήπως σε ενδιαφέρει και αυτό;</p>
<p style="margin:0 0 6px 0;">
  <a href="${SITE}/apply" style="color:#C2410C;">Γίνε μέλος του CforC</a>
  — το δίκτυο των ανθρώπων του πολιτισμού που θέλουν να αλλάξουν πράγματα.
</p>
<p style="margin:0;">
  <a href="${SITE}/#newsletter" style="color:#C2410C;">Γράψου στο newsletter</a>
  — τι κάνουμε, πού χρειαζόμαστε χέρια, ποιες προσκλήσεις τρέχουν.
</p>`

/** Μη μέλος: επιβεβαίωση διεύθυνσης (double opt-in) */
export function eventConfirmEmailHtml(opts: {
  firstName: string; eventTitle: string; dates: string; venue?: string; confirmUrl: string
}) {
  const inner = `
<p style="margin:0 0 16px 0;">${esc(opts.firstName)},</p>
<p style="margin:0 0 16px 0;">
  λάβαμε τη δήλωση συμμετοχής σου στο <strong>${esc(opts.eventTitle)}</strong>
  (${esc(opts.dates)}${opts.venue ? `, ${esc(opts.venue)}` : ''}).
</p>
<p style="margin:0 0 8px 0;">
  <strong>Μένει ένα βήμα:</strong> πάτησε το κουμπί για να επιβεβαιώσεις τη διεύθυνσή σου.
  Χωρίς αυτό η δήλωση δεν ολοκληρώνεται και δεν σε μετράμε στις κρατήσεις.
</p>
${button(opts.confirmUrl, 'Επιβεβαιώνω τη συμμετοχή μου')}
<p style="margin:0 0 20px 0;font-size:14px;color:#666666;">
  Ο σύνδεσμος ισχύει για 7 ημέρες. Αν δεν έκανες εσύ αυτή τη δήλωση, αγνόησε αυτό το μήνυμα —
  τίποτα δεν καταχωρείται χωρίς το κλικ σου.
</p>
${GDPR_NOTICE_HTML}
${CTA_HTML}`
  return { subject: `Επιβεβαίωσε τη συμμετοχή σου — ${opts.eventTitle}`, html: shell('Επιβεβαίωση συμμετοχής', inner) }
}

/**
 * Ο σύνδεσμος μιας χρήσης για το εξοδολόγιο.
 *
 * Φεύγει ΜΟΝΟ προς τη διεύθυνση της δήλωσης, κατά παραγγελία και μετά τη
 * λήξη της δράσης — ποτέ μαζί με το email επιβεβαίωσης, που φεύγει εβδομάδες
 * νωρίτερα: ένα διακριτικό δύο μηνών σε γραμματοκιβώτιο είναι διαπιστευτήριο
 * που περιμένει, και μέχρι να χρειαστεί θα είχε ούτως ή άλλως λήξει.
 */
export function claimLinkEmailHtml(opts: {
  firstName: string; eventTitle: string; url: string; hours: number
}) {
  const inner = `
<p style="margin:0 0 16px 0;">${esc(opts.firstName)},</p>
<p style="margin:0 0 16px 0;">
  ο σύνδεσμος για να υποβάλεις το εξοδολόγιό σου για τη δράση
  <strong>${esc(opts.eventTitle)}</strong> είναι έτοιμος.
</p>
${button(opts.url, 'Υποβολή εξοδολογίου')}
<p style="margin:0 0 12px 0;">
  Θα χρειαστείς τις <strong>αποδείξεις ή τα εισιτήριά σου</strong> σε αρχείο ή φωτογραφία,
  και τα στοιχεία του τραπεζικού σου λογαριασμού (IBAN).
</p>
<p style="margin:0 0 20px 0;font-size:14px;color:#666666;">
  Ο σύνδεσμος ισχύει για ${opts.hours} ώρες και χρησιμοποιείται ΜΙΑ φορά. Αν λήξει, ζήτα
  καινούργιον από την ίδια σελίδα. Αν δεν τον ζήτησες εσύ, αγνόησε αυτό το μήνυμα.
</p>
${GDPR_NOTICE_HTML}`
  return {
    subject: `Το εξοδολόγιό σου — ${opts.eventTitle}`,
    html: shell('Υποβολή εξοδολογίου', inner),
  }
}

/** Μετά το κλικ — ή αμέσως, για συνδεδεμένο μέλος */
export function eventRegisteredEmailHtml(opts: {
  firstName: string; eventTitle: string; dates: string; venue?: string
  /** Η σελίδα του εξοδολογίου για ΑΥΤΗ τη δράση — κενό όταν δεν καλύπτονται έξοδα */
  expensesUrl?: string; isMember: boolean; eventUrl: string
}) {
  const inner = `
<p style="margin:0 0 16px 0;">${esc(opts.firstName)},</p>
<p style="margin:0 0 16px 0;">
  η συμμετοχή σου στο <strong>${esc(opts.eventTitle)}</strong>
  (${esc(opts.dates)}${opts.venue ? `, ${esc(opts.venue)}` : ''}) είναι <strong>καταχωρημένη</strong>.
</p>
<p style="margin:0 0 16px 0;">
  Θα σου στείλουμε τις λεπτομέρειες — πρόγραμμα, οδηγίες και, όπου υπάρχει, τον σύνδεσμο
  για διαδικτυακή παρακολούθηση — πιο κοντά στην ημερομηνία.
</p>
${button(opts.eventUrl, 'Δες τη δράση')}
${opts.expensesUrl ? `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F0EB;border-radius:12px;margin:0 0 20px 0;">
  <tr><td style="padding:16px 20px;font-size:15px;line-height:22px;color:#2D2D2D;">
    <strong style="display:block;margin-bottom:6px;">Έξοδα μετακίνησης — ΜΕΤΑ τη δράση</strong>
    Κράτησε αυτή τη διεύθυνση· θα τη χρειαστείς όταν τελειώσει η δράση, με τις αποδείξεις
    ή τα εισιτήριά σου και τον IBAN σου:<br>
    <a href="${opts.expensesUrl}" style="color:#C2410C;word-break:break-all;">${opts.expensesUrl}</a><br>
    <strong style="display:block;margin-top:10px;">Από τις 23 έως τις 30 Νοεμβρίου 2026.</strong>
    <span style="font-size:14px;color:#666666;">
      Μέσα σε αυτό το διάστημα η εκκαθάριση γίνεται με μία κίνηση για όλους — γι' αυτό
      σε παρακαλούμε να μην το αφήσεις για μετά. Αν χρειαστείς περισσότερο χρόνο, γράψε
      στο <a href="mailto:finance@cultureforchange.net" style="color:#C2410C;">finance@cultureforchange.net</a>.<br>
      Αν έχεις λογαριασμό στο cultureforchange.net, συνδέσου. Αν όχι, θα σου στείλουμε
      σύνδεσμο μιας χρήσης σε αυτό εδώ το email.
    </span>
  </td></tr>
</table>` : ''}
<p style="margin:0 0 20px 0;font-size:14px;color:#666666;">
  Αν αλλάξει κάτι, γράψε μας στο
  <a href="mailto:hello@cultureforchange.net" style="color:#C2410C;">hello@cultureforchange.net</a>.
</p>
${GDPR_NOTICE_HTML}
${opts.isMember ? '' : CTA_HTML}`
  return { subject: `Η συμμετοχή σου καταχωρήθηκε — ${opts.eventTitle}`, html: shell('Συμμετοχή καταχωρήθηκε', inner) }
}
