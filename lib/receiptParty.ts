/**
 * Σε ποιον εκδίδεται η απόδειξη — και ΑΠΟ ΠΟΥ παίρνει τα στοιχεία.
 *
 * ΔΥΟ ΧΩΡΙΣΤΑ ΠΡΑΓΜΑΤΑ, που μπερδεύονταν:
 *
 *  · Η ΑΠΟΦΑΣΗ «φυσικό πρόσωπο ή εταιρεία;» ανήκει στο μέλος και δηλώνεται
 *    στην αίτηση (ReceiptType). Δεν τη μαντεύουμε.
 *  · Τα ΣΤΟΙΧΕΙΑ της εταιρείας είναι δεδομένο που παλιώνει. Η αίτηση είναι
 *    στιγμιότυπο της ημέρας που γράφτηκε· το μητρώο μέλους ενημερώνεται.
 *
 * Η απόδειξη έπαιρνε ΚΑΙ ΤΑ ΔΥΟ από την αίτηση. Όποιος συμπλήρωνε τα
 * εταιρικά του αργότερα στο προφίλ, έβλεπε απόδειξη χωρίς αυτά — και κανείς
 * δεν το μάθαινε μέχρι να τη διαβάσει ο λογιστής (ΑΠ. ΕΙΣ. 381, 2/10/2026).
 *
 * Εδώ: η απόφαση μένει στην αίτηση, τα στοιχεία έρχονται από το ΜΕΛΟΣ όταν
 * υπάρχουν, αλλιώς από την αίτηση. Και όταν τα δύο ΔΙΑΦΩΝΟΥΝ — το μέλος έχει
 * επωνυμία και ΑΦΜ αλλά η αίτηση λέει «φυσικό πρόσωπο» — δεν αποφασίζουμε
 * σιωπηλά: το σημαδεύουμε, για να το δει άνθρωπος.
 */

export interface ReceiptPartySource {
  ReceiptType?: string | null
  CompanyName?: string | null
  CompanyAddress?: string | null
  CompanyTaxId?: string | null
}

export interface ReceiptParty {
  isCompany: boolean
  companyName: string | null
  companyAddress: string | null
  companyTaxId: string | null
  /** 'member' | 'application' | null — από πού ήρθαν τα στοιχεία */
  source: 'member' | 'application' | null
  /** Το μέλος μοιάζει εταιρεία αλλά η αίτηση λέει φυσικό πρόσωπο */
  mismatch: boolean
}

const clean = (v: unknown): string | null => {
  const s = String(v ?? '').trim()
  return s || null
}

/** Έχει το μητρώο πλήρη εταιρική ταυτότητα; Επωνυμία ΚΑΙ ΑΦΜ, όχι το ένα. */
export const hasCompanyIdentity = (m: ReceiptPartySource | null | undefined): boolean =>
  !!(clean(m?.CompanyName) && clean(m?.CompanyTaxId))

export function resolveReceiptParty(
  app: ReceiptPartySource | null | undefined,
  member: ReceiptPartySource | null | undefined,
): ReceiptParty {
  const isCompany = clean(app?.ReceiptType) === 'Εταιρεία'
  const fromMember = hasCompanyIdentity(member)
  const mismatch = !isCompany && fromMember

  if (!isCompany) {
    return { isCompany: false, companyName: null, companyAddress: null, companyTaxId: null, source: null, mismatch }
  }

  // Το μέλος υπερισχύει ΜΟΝΟ όταν έχει πλήρη ταυτότητα: μισοσυμπληρωμένο
  // προφίλ δεν πρέπει να σβήσει σωστά στοιχεία που είχε η αίτηση.
  const src = fromMember ? member! : (app || {})
  return {
    isCompany: true,
    companyName: clean(src.CompanyName),
    companyAddress: clean(src.CompanyAddress) ?? clean(app?.CompanyAddress),
    companyTaxId: clean(src.CompanyTaxId),
    source: fromMember ? 'member' : 'application',
    mismatch: false,
  }
}
