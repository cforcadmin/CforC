/**
 * Email της Ανοιχτής Βιβλιοθήκης — ίδιο ύφος με τα υπόλοιπα του OC.
 *
 * Τρία μηνύματα:
 *  · ευχαριστία στο μέλος που καταχώρησε τεκμήριο
 *  · ειδοποίηση στους Βιβλιοθηκάριους για πιθανή διπλοεγγραφή
 *  · απόρριψη διπλοεγγραφής προς το μέλος
 */

const SITE = 'https://cultureforchange.net'
const LIBRARY_URL = `${SITE}/profile?section=library`
export const LIBRARY_FROM = 'Culture for Change <community@cultureforchange.net>'

const esc = (s: string) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function shell(opts: {
  preheader: string
  heading: string
  body: string
  signer: string
  signerRole: string
  signerEmail: string
  footerNote: string
}): string {
  return `<!DOCTYPE html>
<html lang="el">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(opts.heading)} — Culture for Change</title>
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
<span style="display:none;font-size:1px;color:#F5F0EB;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${esc(opts.preheader)}</span>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F0EB;">
<tr><td align="center" style="padding:32px 12px 48px 12px;">

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:#FFFFFF;border-radius:24px;overflow:hidden;border:1px solid #E5E7EB;">

  <tr>
    <td class="px" style="background-color:#FF8B6A;padding:36px 48px 32px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:16px;letter-spacing:1.6px;color:#FFFFFF;font-weight:bold;mso-line-height-rule:exactly;">CULTURE FOR CHANGE</td></tr>
        <tr><td height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
        <tr><td class="h1" style="font-family:Arial,Helvetica,sans-serif;font-size:30px;line-height:36px;color:#2D2D2D;font-weight:bold;mso-line-height-rule:exactly;">${esc(opts.heading)}</td></tr>
      </table>
    </td>
  </tr>

  <tr>
    <td class="px" style="padding:40px 48px 8px 48px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#2D2D2D;mso-line-height-rule:exactly;">
      ${opts.body}
    </td>
  </tr>

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
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:24px;color:#2D2D2D;font-weight:bold;mso-line-height-rule:exactly;">${esc(opts.signer)}</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#5A5A5A;mso-line-height-rule:exactly;">${esc(opts.signerRole)}</td></tr>
        <tr><td height="6" style="height:6px;line-height:6px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;mso-line-height-rule:exactly;"><a href="mailto:${esc(opts.signerEmail)}" style="color:#C9552F;text-decoration:underline;">${esc(opts.signerEmail)}</a></td></tr>
      </table>
    </td>
  </tr>

  <tr>
    <td class="px" align="center" style="background-color:#2D2D2D;padding:32px 48px 32px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#F5F0EB;font-weight:bold;mso-line-height-rule:exactly;">Join our Social Networks &amp; Get Involved!</td></tr>
        <tr><td height="14" style="height:14px;line-height:14px;font-size:0;">&nbsp;</td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:26px;color:#F5F0EB;mso-line-height-rule:exactly;">
          <a href="${SITE}" style="color:#FF8B6A;text-decoration:none;">Website</a>&nbsp; |&nbsp;
          <a href="https://www.facebook.com/cultureforchange" style="color:#FF8B6A;text-decoration:none;">Facebook</a>&nbsp; |&nbsp;
          <a href="https://www.instagram.com/cultureforchange" style="color:#FF8B6A;text-decoration:none;">Instagram</a>&nbsp; |&nbsp;
          <a href="https://www.linkedin.com/company/cultureforchange" style="color:#FF8B6A;text-decoration:none;">LinkedIn</a>&nbsp; |&nbsp;
          <a href="https://www.youtube.com/@cultureforchange" style="color:#FF8B6A;text-decoration:none;">YouTube</a>
        </td></tr>
        <tr><td height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#A0A0A0;mso-line-height-rule:exactly;">Δίκτυο Culture for Change — Αθήνα, Ελλάδα<br>${esc(opts.footerNote)}</td></tr>
        <tr><td height="18" style="height:18px;line-height:18px;font-size:0;">&nbsp;</td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;color:#8A8A8A;mso-line-height-rule:exactly;">_______________________________________________________________<br>This email may contain confidential information. Read full disclaimer <a href="${SITE}/email-confidentiality-disclaimer" style="color:#FF8B6A;text-decoration:underline;">here</a></td></tr>
      </table>
    </td>
  </tr>

</table>

</td></tr>
</table>
</body>
</html>`
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td class="btn" align="center" bgcolor="#FF8B6A" style="background-color:#FF8B6A;border-radius:999px;">
            <a href="${href}" style="display:block;padding:16px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:20px;font-weight:bold;color:#2D2D2D;text-decoration:none;border-radius:999px;mso-line-height-rule:exactly;">${esc(label)}&nbsp;→</a>
          </td>
        </tr>
      </table>`
}

/** Καρτέλα τεκμηρίου μέσα στο email */
function itemCard(title: string, meta: string[]): string {
  const rows = meta.filter(Boolean)
    .map(m => `<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#5A5A5A;mso-line-height-rule:exactly;">${esc(m)}</td></tr>`)
    .join('')
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F0EB;border-radius:16px;margin:0 0 20px 0;">
        <tr><td style="padding:18px 22px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#2D2D2D;font-weight:bold;mso-line-height-rule:exactly;">${esc(title)}</td></tr>
            <tr><td height="6" style="height:6px;line-height:6px;font-size:0;">&nbsp;</td></tr>
            ${rows}
          </table>
        </td></tr>
      </table>`
}

// ── 1. Ευχαριστία στο μέλος ────────────────────────────────────
export function librarySubmissionThanksHtml(opts: {
  firstName: string
  title: string
  theme: string
  pending: boolean
}): { subject: string; html: string } {
  const body = `
      <p style="margin:0 0 20px 0;">Αγαπητή/αγαπητέ ${esc(opts.firstName)},</p>
      <p style="margin:0 0 20px 0;">Ευχαριστούμε! Η καταχώρησή σου στην <strong>Ανοιχτή Βιβλιοθήκη</strong> του δικτύου ολοκληρώθηκε.</p>
      ${itemCard(opts.title, [`Θεματική: ${opts.theme}`])}
      ${opts.pending
        ? `<p style="margin:0 0 20px 0;">Ο τίτλος μοιάζει με τεκμήριο που υπάρχει ήδη, οπότε πριν δημοσιευτεί θα το κοιτάξει ο Βιβλιοθηκάριος. Θα σε ενημερώσουμε με το που αποφασιστεί — δεν χρειάζεται να κάνεις κάτι.</p>`
        : `<p style="margin:0 0 20px 0;">Είναι ήδη ορατό σε όλα τα μέλη του δικτύου.</p>`}
      <p style="margin:0 0 24px 0;">Κάθε τεκμήριο που προσθέτει ένα μέλος κάνει τη βιβλιοθήκη πιο χρήσιμη για όλους. Ευχαριστούμε για τον χρόνο σου.</p>
      ${button(LIBRARY_URL, 'Δες τη βιβλιοθήκη')}`
  return {
    subject: opts.pending
      ? 'Λάβαμε την καταχώρησή σου — Ανοιχτή Βιβλιοθήκη'
      : 'Ευχαριστούμε για την καταχώρηση — Ανοιχτή Βιβλιοθήκη',
    html: shell({
      preheader: opts.pending
        ? 'Λάβαμε το τεκμήριο· ο Βιβλιοθηκάριος θα το ελέγξει για διπλοεγγραφή.'
        : 'Το τεκμήριο δημοσιεύτηκε στην Ανοιχτή Βιβλιοθήκη.',
      heading: opts.pending ? 'ΛΑΒΑΜΕ ΤΗΝ ΚΑΤΑΧΩΡΗΣΗ ΣΟΥ' : 'ΕΥΧΑΡΙΣΤΟΥΜΕ ΓΙΑ ΤΗΝ ΚΑΤΑΧΩΡΗΣΗ',
      body,
      signer: 'Culture for Change — Community',
      signerRole: 'Ανοιχτή Βιβλιοθήκη',
      signerEmail: 'community@cultureforchange.net',
      footerNote: 'Λαμβάνεις αυτό το email επειδή καταχώρησες τεκμήριο στην Ανοιχτή Βιβλιοθήκη.',
    }),
  }
}

// ── 2. Πιθανή διπλοεγγραφή → Βιβλιοθηκάριος ────────────────────
export function libraryDuplicateReviewHtml(opts: {
  librarianName: string
  newTitle: string
  existingTitle: string
  submitter: string
  similarity: number
  sharedWords?: number
  reviewUrl: string
}): { subject: string; html: string } {
  const pct = Math.round(opts.similarity * 100)
  const body = `
      <p style="margin:0 0 20px 0;">Αγαπητή/αγαπητέ ${esc(opts.librarianName)},</p>
      <p style="margin:0 0 20px 0;">Μια νέα καταχώρηση μοιάζει με τεκμήριο που υπάρχει ήδη στη βιβλιοθήκη${
        opts.sharedWords ? ` — <strong>${opts.sharedWords} κοινές λέξεις</strong> στον τίτλο` : ''
      } (ομοιότητα <strong>${pct}%</strong>). Δεν δημοσιεύτηκε — περιμένει την απόφασή σου.</p>
      <p style="margin:0 0 20px 0;font-size:14px;color:#5A5A5A;">Η σήμανση είναι σκόπιμα ευαίσθητη: προτιμούμε έναν περιττό έλεγχο από μια χαμένη διπλοεγγραφή. Αν δεν είναι το ίδιο τεκμήριο, ένα κλικ στην έγκριση το δημοσιεύει.</p>
      <p style="margin:0 0 8px 0;font-size:13px;letter-spacing:1px;color:#8A8A8A;font-weight:bold;">ΝΕΑ ΚΑΤΑΧΩΡΗΣΗ</p>
      ${itemCard(opts.newTitle, [`Από: ${opts.submitter}`])}
      <p style="margin:0 0 8px 0;font-size:13px;letter-spacing:1px;color:#8A8A8A;font-weight:bold;">ΥΠΑΡΧΕΙ ΗΔΗ</p>
      ${itemCard(opts.existingTitle, [])}
      <p style="margin:0 0 24px 0;">Άνοιξε τη σύγκριση για να δεις και τα δύο δίπλα-δίπλα και να εγκρίνεις ή να απορρίψεις.</p>
      ${button(opts.reviewUrl, 'Έλεγχος διπλοεγγραφής')}`
  return {
    subject: `Πιθανή διπλοεγγραφή στη βιβλιοθήκη — ${opts.newTitle.slice(0, 60)}`,
    html: shell({
      preheader: `Ομοιότητα ${pct}% με υπάρχον τεκμήριο. Περιμένει έλεγχο.`,
      heading: 'ΠΙΘΑΝΗ ΔΙΠΛΟΕΓΓΡΑΦΗ',
      body,
      signer: 'Culture for Change — Ανοιχτή Βιβλιοθήκη',
      signerRole: 'Αυτόματη ειδοποίηση',
      signerEmail: 'community@cultureforchange.net',
      footerNote: 'Λαμβάνεις αυτό το email ως Βιβλιοθηκάριος του δικτύου.',
    }),
  }
}

// ── 3. Απόρριψη διπλοεγγραφής → μέλος ──────────────────────────
export function libraryRejectedHtml(opts: {
  firstName: string
  title: string
  existingTitle: string
  reason?: string
}): { subject: string; html: string } {
  const body = `
      <p style="margin:0 0 20px 0;">Αγαπητή/αγαπητέ ${esc(opts.firstName)},</p>
      <p style="margin:0 0 20px 0;">Ευχαριστούμε που πρόσθεσες τεκμήριο στην Ανοιχτή Βιβλιοθήκη. Μετά από έλεγχο, η καταχώρηση δεν δημοσιεύτηκε γιατί το υλικό υπάρχει ήδη στη βιβλιοθήκη.</p>
      <p style="margin:0 0 8px 0;font-size:13px;letter-spacing:1px;color:#8A8A8A;font-weight:bold;">Η ΚΑΤΑΧΩΡΗΣΗ ΣΟΥ</p>
      ${itemCard(opts.title, [])}
      <p style="margin:0 0 8px 0;font-size:13px;letter-spacing:1px;color:#8A8A8A;font-weight:bold;">ΥΠΑΡΧΕΙ ΗΔΗ ΩΣ</p>
      ${itemCard(opts.existingTitle, [])}
      ${opts.reason ? `<p style="margin:0 0 20px 0;">${esc(opts.reason)}</p>` : ''}
      <p style="margin:0 0 24px 0;">Δεν χάθηκε τίποτα — το τεκμήριο είναι ήδη διαθέσιμο σε όλα τα μέλη. Αν πιστεύεις ότι πρόκειται για διαφορετικό υλικό (π.χ. άλλη έκδοση ή άλλη χρονιά), γράψε μας και θα το ξανακοιτάξουμε.</p>
      ${button(LIBRARY_URL, 'Δες τη βιβλιοθήκη')}`
  return {
    subject: 'Η καταχώρησή σου υπάρχει ήδη — Ανοιχτή Βιβλιοθήκη',
    html: shell({
      preheader: 'Το τεκμήριο υπάρχει ήδη στη βιβλιοθήκη.',
      heading: 'ΤΟ ΤΕΚΜΗΡΙΟ ΥΠΑΡΧΕΙ ΗΔΗ',
      body,
      signer: 'Culture for Change — Ανοιχτή Βιβλιοθήκη',
      signerRole: 'Βιβλιοθηκάριος',
      signerEmail: 'community@cultureforchange.net',
      footerNote: 'Λαμβάνεις αυτό το email επειδή καταχώρησες τεκμήριο στην Ανοιχτή Βιβλιοθήκη.',
    }),
  }
}

// ── Αποστολή ───────────────────────────────────────────────────

import { sendOcEmail } from '@/lib/ocEmails'
import { strapiAll } from '@/lib/strapiPaged'

const firstNameOf = (full: string) => String(full || '').trim().split(/\s+/)[0] || 'μέλος'

/** Όσοι έχουν IsLibrarian. Περισσότεροι από ένας επιτρέπονται σκόπιμα:
 *  η θητεία είναι εξάμηνη και η παράδοση θέλει επικάλυψη. */
export async function getLibrarians(): Promise<Array<{ name: string; email: string }>> {
  const r = await strapiAll('/members?filters[IsLibrarian][$eq]=true&fields[0]=Name&fields[1]=Email')
  return r.data
    .filter((m: any) => m.Email)
    .map((m: any) => ({ name: m.Name || 'Βιβλιοθηκάριε', email: m.Email }))
}

export async function notifyLibrariansOfDuplicate(opts: {
  newItem: { documentId?: string; title: string }
  existing: { documentId?: string; title: string }
  submitter: string
  similarity: number
  sharedWords?: number
}): Promise<void> {
  const librarians = await getLibrarians()
  if (!librarians.length) {
    // Δεν είναι σφάλμα του χρήστη, αλλά ΠΡΕΠΕΙ να φαίνεται: το τεκμήριο
    // μένει «pending» και χωρίς Βιβλιοθηκάριο δεν θα το δει ποτέ κανείς.
    console.error('libraryEmails: καμία εγγραφή με IsLibrarian — το τεκμήριο θα μείνει σε αναμονή')
    return
  }
  const reviewUrl = `${LIBRARY_URL}&review=${encodeURIComponent(opts.newItem.documentId || '')}`
  for (const l of librarians) {
    const { subject, html } = libraryDuplicateReviewHtml({
      librarianName: firstNameOf(l.name),
      newTitle: opts.newItem.title,
      existingTitle: opts.existing.title,
      submitter: opts.submitter,
      similarity: opts.similarity,
      sharedWords: opts.sharedWords,
      reviewUrl,
    })
    await sendOcEmail(l.email, subject, html, { from: LIBRARY_FROM })
  }
}

export async function sendSubmissionThanks(opts: {
  to: string
  name: string
  title: string
  theme: string
  pending: boolean
}): Promise<boolean> {
  if (!opts.to) return false
  const { subject, html } = librarySubmissionThanksHtml({
    firstName: firstNameOf(opts.name),
    title: opts.title,
    theme: opts.theme,
    pending: opts.pending,
  })
  return sendOcEmail(opts.to, subject, html, { from: LIBRARY_FROM })
}

export async function sendDuplicateRejection(opts: {
  to: string
  name: string
  title: string
  existingTitle: string
  reason?: string
}): Promise<boolean> {
  if (!opts.to) return false
  const { subject, html } = libraryRejectedHtml({
    firstName: firstNameOf(opts.name),
    title: opts.title,
    existingTitle: opts.existingTitle,
    reason: opts.reason,
  })
  return sendOcEmail(opts.to, subject, html, { from: LIBRARY_FROM })
}
