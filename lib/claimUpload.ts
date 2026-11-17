/**
 * Μεταφόρτωση παραστατικών εξοδολογίου — ΠΡΙΝ φύγει το αίτημα.
 *
 * 17/11/2026: μέλος με δύο φωτογραφίες αποδείξεων από iPhone (2–4 MB η
 * καθεμία) είδε «Unexpected token 'R', "Request En"… is not valid JSON».
 * Το Vercel κόβει κάθε σώμα αιτήματος πάνω από 4,5 MB με 413 και ΚΕΙΜΕΝΟ
 * «Request Entity Too Large» — η διαδρομή μας δεν τρέχει καν, άρα ούτε
 * log υπάρχει, και ο client έκανε `res.json()` πάνω στο κείμενο.
 *
 * Τρεις δικλείδες, όλες στον browser:
 *   1. Οι εικόνες μικραίνουν σε ≤ 2000 px JPEG πριν σταλούν (μια απόδειξη
 *      διαβάζεται άνετα· ~300–600 KB αντί για 3 MB).
 *   2. Το σύνολο ελέγχεται ΠΡΙΝ το fetch, με μήνυμα που λέει τι να κάνει.
 *   3. Η απάντηση διαβάζεται ως κείμενο και μετά ως JSON — ένα 413 γίνεται
 *      ανθρώπινο μήνυμα, όχι σφάλμα parser.
 *
 * Τα όρια του server στο lib/expenseClaims (10 MB / 40 MB) αφορούν την
 * επεξεργασία ΜΕΤΑ την παραλαβή — στο Vercel δεν φτάνει ποτέ κανείς εκεί.
 */

/** 4,5 MB το όριο του Vercel· κρατάμε περιθώριο για το multipart και το JSON */
export const MAX_REQUEST_BYTES = 4 * 1024 * 1024
export const SHRINK_MAX_SIDE = 2000
export const SHRINK_QUALITY = 0.82
/** Κάτω από εδώ δεν πειράζουμε την εικόνα — είναι ήδη μικρή */
export const SHRINK_THRESHOLD_BYTES = 600 * 1024

const mb = (n: number) => (n / (1024 * 1024)).toLocaleString('el-GR', { maximumFractionDigits: 1 })

export const totalBytes = (files: Array<{ size: number }>) => files.reduce((s, f) => s + f.size, 0)

/** Μήνυμα όταν το σύνολο ξεπερνά το όριο — λέει ΚΑΙ τι να κάνει το μέλος */
export function tooLargeMessage(total: number, limit = MAX_REQUEST_BYTES): string {
  return `Τα παραστατικά είναι πολύ μεγάλα για να σταλούν μαζί (${mb(total)} MB — όριο ${mb(limit)} MB). `
    + 'Σκάναρε τις αποδείξεις ως PDF (iPhone: Σημειώσεις → κάμερα → Σάρωση εγγράφων) ή στείλε μικρότερες φωτογραφίες, '
    + 'και δοκίμασε ξανά.'
}

/**
 * Μικραίνει μια φωτογραφία στον browser. Επιστρέφει το ΙΔΙΟ αρχείο όταν:
 * δεν είναι εικόνα, είναι ήδη μικρή, ο browser δεν την αποκωδικοποιεί
 * (π.χ. HEIC στο Chrome), ή η σμίκρυνση δεν έβγαλε κάτι μικρότερο.
 * Ποτέ δεν ρίχνει — στη χειρότερη φεύγει το πρωτότυπο και το πιάνει
 * ο έλεγχος συνόλου.
 */
export async function shrinkImageFile(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.size <= SHRINK_THRESHOLD_BYTES) return file
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file
  let bitmap: ImageBitmap | null = null
  try {
    // from-image: σεβόμαστε το EXIF orientation — αλλιώς η απόδειξη βγαίνει πλάγια
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions)
    const scale = Math.min(1, SHRINK_MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    // Λευκό φόντο: PNG με διαφάνεια γίνεται JPEG χωρίς μαύρες περιοχές
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(bitmap, 0, 0, w, h)
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', SHRINK_QUALITY))
    if (!blob || blob.size >= file.size) return file
    const base = file.name.replace(/\.[^.]+$/, '') || 'receipt'
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg', lastModified: file.lastModified })
  } catch {
    return file
  } finally {
    bitmap?.close?.()
  }
}

/**
 * Διαβάζει μια απάντηση API χωρίς να υποθέτει JSON.
 * `error` είναι null μόνο όταν η απάντηση είναι OK.
 */
export async function readJsonResponse(res: Response): Promise<{ data: any; error: string | null }> {
  const text = await res.text().catch(() => '')
  let data: any = null
  try { data = text ? JSON.parse(text) : null } catch { data = null }
  if (res.ok) return { data, error: null }
  if (res.status === 413) {
    return { data, error: 'Τα παραστατικά είναι πολύ μεγάλα για να σταλούν μαζί. Σκάναρε τις αποδείξεις ως PDF ή στείλε μικρότερες φωτογραφίες και δοκίμασε ξανά.' }
  }
  const fromServer = typeof data?.error === 'string' && data.error.trim() ? data.error.trim() : null
  return { data, error: fromServer || `Σφάλμα ${res.status} — δοκίμασε ξανά σε λίγο` }
}
