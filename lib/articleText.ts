/**
 * ΤΟ ΚΕΙΜΕΝΟ ΕΝΟΣ ΑΡΘΡΟΥ ΧΩΡΙΣ ΕΤΙΚΕΤΕΣ.
 *
 * Χωρίς εξαρτήσεις επίτηδες: το χρησιμοποιούν και οι κάρτες (client), και η
 * σελίδα (server). Μια εισαγωγή του lib/campaignBlocks από εδώ θα κουβαλούσε
 * ολόκληρο τον renderer του email στο πακέτο του browser.
 */
export function articleText(html?: string | null): string {
  return String(html || '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Η ΠΕΡΙΛΗΨΗ ΕΝΟΣ ΣΤΟΙΧΕΙΟΥ, ΜΕ ΣΕΙΡΑ ΠΡΟΤΕΡΑΙΟΤΗΤΑΣ.
 *
 * Τρεις οθόνες τη ζητούν: η πίσω όψη της κάρτας, η περιγραφή στο Google και
 * η αναζήτηση του site. Μέχρι σήμερα έβγαινε ΠΑΝΤΑ από το πεδίο `blocks` με
 * extractTextFromBlocks. Μόλις ένα άρθρο γραφτεί στον συνθέτη, εκείνο το
 * πεδίο μένει άδειο — και οι τρεις θα άδειαζαν σιωπηλά μαζί του.
 *
 *  1. Η γραμμένη περίληψη. Την έγραψε άνθρωπος· είναι η σωστή απάντηση.
 *  2. Το παλιό κείμενο, για ό,τι δεν έχει ξαναγραφτεί.
 *  3. Το σύνθετο HTML — εφεδρεία, γιατί η πρώτη πρόταση σπάνια είναι καλή
 *     περιγραφή. Γι' αυτό η περίληψη είναι υποχρεωτικό πεδίο στον συνθέτη.
 */
export function summaryOf(
  excerpt: string | null | undefined,
  fromBlocks: string | null | undefined,
  html?: string | null,
): string {
  const written = String(excerpt || '').trim()
  if (written) return written
  const old = String(fromBlocks || '').trim()
  if (old) return old
  return articleText(html)
}
