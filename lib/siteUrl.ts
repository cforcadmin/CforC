/**
 * Η ΔΗΜΟΣΙΑ ΔΙΕΥΘΥΝΣΗ ΤΟΥ SITE — μία πηγή για ό,τι φεύγει προς τα έξω.
 *
 * ΤΟ ΠΕΡΙΣΤΑΤΙΚΟ (8/10/2026): το email «ο μήνας είναι έτοιμος» έφτασε στη
 * Γραμματεία με κουμπί «Άνοιγμα OC» που έδειχνε στο http://localhost:3000/oc.
 * Ο λόγος: το γράμμα στάλθηκε από τον τοπικό διακομιστή, όπου το
 * NEXT_PUBLIC_SITE_URL είναι — σωστά — localhost. Η διαδρομή το έπαιρνε
 * αυτούσιο με ένα `|| 'https://…'`, που πιάνει μόνο την περίπτωση «λείπει».
 *
 * ΓΙ' ΑΥΤΟ Ο ΕΛΕΓΧΟΣ ΕΙΝΑΙ ΓΙΑ https, ΟΧΙ ΓΙΑ «ΥΠΑΡΧΕΙ». Ένα γράμμα, ένα
 * τιμολόγιο ή ένα newsletter διαβάζεται από άλλον άνθρωπο, σε άλλο μηχάνημα:
 * εκεί το localhost δεν είναι λάθος ρύθμιση, είναι νεκρός σύνδεσμος.
 *
 * Κανονικό είναι το www: το γυμνό cultureforchange.net απαντά 307 προς αυτό
 * (μετρημένο 8/10/2026), και μια ανακατεύθυνση σε κουμπί email είναι ένα
 * ταξίδι παραπάνω χωρίς κανένα κέρδος.
 */

const CANONICAL = 'https://www.cultureforchange.net'

export const PUBLIC_SITE_URL: string = (() => {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || '').trim()
  return raw.startsWith('https://') ? raw.replace(/\/+$/, '') : CANONICAL
})()

/** Μόνο το όνομα του κόμβου — για ελέγχους που ρωτούν «ποιος είναι ο ζωντανός» */
export const PUBLIC_SITE_HOST: string =
  PUBLIC_SITE_URL.replace(/^https?:\/\//, '').replace(/\/.*$/, '')

/**
 * Σύνδεσμος προς ενότητα του OC: `/oc#admin`, `/oc#finances`…
 *
 * Το άγκιστρο ΔΕΝ είναι διακοσμητικό — είναι ο τρόπος να σταλεί κάποιος
 * ΑΚΡΙΒΩΣ εκεί που τον αφορά, αντί να προσγειωθεί στην Επισκόπηση και να
 * ψάξει. Το διαβάζει το OcShell στο άνοιγμα.
 */
export const ocUrl = (section?: string): string =>
  section ? `${PUBLIC_SITE_URL}/oc#${section}` : `${PUBLIC_SITE_URL}/oc`
