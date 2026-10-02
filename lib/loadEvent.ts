import { notFound } from 'next/navigation'
import { getEventBySlug } from '@/lib/strapi'
import type { CforcEvent } from '@/lib/types'

/**
 * Φέρνει τη δράση — και ΔΙΑΚΡΙΝΕΙ τα δύο «δεν την έχω».
 *
 * ΤΟ ΣΦΑΛΜΑ ΠΟΥ ΔΙΟΡΘΩΝΕΙ: και οι τέσσερις σελίδες έγραφαν
 *
 *     try { ev = await getEventBySlug(slug) } catch { }
 *     if (!ev) notFound()
 *
 * δηλαδή ΚΑΘΕ αποτυχία του Strapi γινόταν «αυτή η σελίδα δεν υπάρχει». Δύο
 * τελείως διαφορετικά πράγματα έβγαζαν το ίδιο μήνυμα:
 *
 *   · «δεν υπάρχει τέτοια δράση»  → σωστό 404, μόνιμο
 *   · «δεν απάντησε το Strapi»    → προσωρινό, και ο επισκέπτης φταίει να
 *                                    ξαναδοκιμάσει, όχι να φύγει
 *
 * Το δεύτερο δεν είναι θεωρητικό: το Strapi Cloud κοιμάται στο δωρεάν πακέτο
 * και η ψυχρή εκκίνηση κρατά 10–30 δευτερόλεπτα (δες CLAUDE.md). Όποιος
 * τύχαινε να πατήσει τότε έβλεπε «δεν βρέθηκε» για δράση που υπάρχει — και
 * εμείς ψάχναμε σπασμένους συνδέσμους που δεν υπήρχαν ποτέ.
 *
 * Τώρα η αποτυχία ΑΝΕΒΑΙΝΕΙ και την πιάνει το app/error.tsx: «κάτι πήγε
 * στραβά από τη μεριά μας, δοκίμασε ξανά» — με κουμπί που ξαναδοκιμάζει.
 */
export async function loadEvent(slug: string): Promise<CforcEvent> {
  let ev: CforcEvent | null
  try {
    ev = (await getEventBySlug(slug)) as CforcEvent | null
  } catch (err) {
    // ΔΕΝ γίνεται 404: η δράση μπορεί κάλλιστα να υπάρχει
    console.error(`loadEvent(${slug}): το Strapi δεν απάντησε`, err)
    throw err
  }
  if (!ev) notFound()
  return ev
}

/**
 * Για τα metadata, όπου η αποτυχία ΔΕΝ πρέπει να ρίξει τη σελίδα.
 *
 * Ένας τίτλος που λείπει είναι ασήμαντος μπροστά σε μια σελίδα που δεν
 * ανοίγει — εδώ η σιωπή είναι η σωστή συμπεριφορά, και μόνο εδώ.
 */
export async function loadEventForMetadata(slug: string): Promise<CforcEvent | null> {
  try {
    return (await getEventBySlug(slug)) as CforcEvent | null
  } catch {
    return null
  }
}
