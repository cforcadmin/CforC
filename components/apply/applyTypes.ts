import { MAX_BIO_WORDS } from './applyData'

// Full application draft — everything except the photo File (kept in memory,
// File objects can't be serialised to sessionStorage).
export interface ApplicationDraft {
  // Βήμα 1 — Ταυτότητα
  FirstName: string
  LastName: string
  NameLatin: string
  Profession: string
  AgeRange: string
  Gender: string
  Disability: string
  ResidenceCity: string
  ResidenceRegion: string
  Address: string
  ActivityCityA: string
  ActivityCityB: string
  Email: string
  Phone: string
  Website: string
  Facebook: string
  LinkedIn: string
  Instagram: string
  BoschProfile: string
  Bio: string
  BioEn: string
  PublishConsent: string[]
  // Βήμα 2 — Δραστηριότητα
  Education: string
  EmploymentStatus: string[]
  EmpFreelancer: string
  EmpCompany: string
  EmpEmployee: string
  EmpNgo: string
  EmpOccasional: string
  BoschAlumni: string
  BoschPrograms: string
  StartFellow: string
  Experience: string
  FieldsOfActivity: string
  ActionFormats: string[]
  AudienceGroups: string[]
  Themes: string[]
  // Βήμα 3 — Ανάγκες & Συμβολή
  Challenges: string[]
  ProposedSolutions: string
  NetworkContribution: string
  // Βήμα 4 — Οικονομικά & Συναινέσεις
  ReceiptType: string
  FatherName: string
  TaxId: string
  CompanyName: string
  CompanyAddress: string
  CompanyTaxId: string
  NewsletterOptIn: boolean
  AcceptStatute: boolean
  AcceptRegulation: boolean
  AcceptPrivacy: boolean
}

export const EMPTY_DRAFT: ApplicationDraft = {
  FirstName: '', LastName: '', NameLatin: '', Profession: '',
  AgeRange: '', Gender: '', Disability: '',
  ResidenceCity: '', ResidenceRegion: '', Address: '',
  ActivityCityA: '', ActivityCityB: '',
  Email: '', Phone: '',
  Website: '', Facebook: '', LinkedIn: '', Instagram: '', BoschProfile: '',
  Bio: '', BioEn: '', PublishConsent: [],
  Education: '', EmploymentStatus: [],
  EmpFreelancer: '', EmpCompany: '', EmpEmployee: '', EmpNgo: '', EmpOccasional: '',
  BoschAlumni: '', BoschPrograms: '', StartFellow: '',
  Experience: '', FieldsOfActivity: '',
  ActionFormats: [], AudienceGroups: [], Themes: [],
  Challenges: [], ProposedSolutions: '', NetworkContribution: '',
  ReceiptType: 'Φυσικό πρόσωπο', FatherName: '', TaxId: '',
  CompanyName: '', CompanyAddress: '', CompanyTaxId: '',
  NewsletterOptIn: false,
  AcceptStatute: false, AcceptRegulation: false, AcceptPrivacy: false,
}

export type DraftErrors = Partial<Record<keyof ApplicationDraft | 'Photo', string>>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const AFM_RE = /^\d{9}$/

export function wordCount(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length
}

/** Validation per step. Step 0-3 = form steps; photo checked in step 0 via hasPhoto. */
export function validateStep(step: number, d: ApplicationDraft, hasPhoto: boolean): DraftErrors {
  const e: DraftErrors = {}
  const req = (k: keyof ApplicationDraft, msg = 'Υποχρεωτικό πεδίο') => {
    const v = d[k]
    if (typeof v === 'string' && v.trim() === '') e[k] = msg
    if (Array.isArray(v) && v.length === 0) e[k] = msg
  }

  if (step === 0) {
    req('FirstName'); req('LastName'); req('Profession')
    req('AgeRange', 'Επίλεξε ηλικιακή ομάδα'); req('Gender', 'Επίλεξε μία επιλογή'); req('Disability', 'Επίλεξε μία επιλογή')
    req('ResidenceCity'); req('Address'); req('ActivityCityA')
    req('Email'); req('Phone'); req('Bio')
    if (d.Email && !EMAIL_RE.test(d.Email.trim())) e.Email = 'Μη έγκυρη διεύθυνση email'
    if (d.Phone && d.Phone.replace(/\D/g, '').length < 10) e.Phone = 'Συμπλήρωσε έγκυρο τηλέφωνο (10+ ψηφία)'
    if (d.Bio && wordCount(d.Bio) > MAX_BIO_WORDS) e.Bio = `Έως ${MAX_BIO_WORDS} λέξεις (τώρα: ${wordCount(d.Bio)})`
    if (!hasPhoto) e.Photo = 'Η φωτογραφία είναι υποχρεωτική'
  }

  if (step === 1) {
    req('Education'); req('EmploymentStatus', 'Επίλεξε τουλάχιστον μία')
    req('BoschAlumni', 'Επίλεξε μία επιλογή'); req('StartFellow', 'Επίλεξε μία επιλογή')
    req('Experience'); req('FieldsOfActivity', 'Επίλεξε τουλάχιστον ένα πεδίο')
    req('ActionFormats', 'Επίλεξε τουλάχιστον μία'); req('AudienceGroups', 'Επίλεξε τουλάχιστον μία')
    req('Themes', 'Επίλεξε τουλάχιστον μία')
    if (d.BoschAlumni === 'Ναι' && d.BoschPrograms.trim() === '') e.BoschPrograms = 'Συμπλήρωσε τα προγράμματα'
  }

  if (step === 2) {
    req('Challenges', 'Επίλεξε τουλάχιστον μία')
    req('ProposedSolutions'); req('NetworkContribution')
  }

  if (step === 3) {
    // Φυσικό πρόσωπο: no extra fields — the receipt uses the identity data.
    // Εταιρεία: full company details required.
    if (d.ReceiptType === 'Εταιρεία') {
      req('CompanyName'); req('CompanyAddress'); req('CompanyTaxId')
      if (d.CompanyTaxId && !AFM_RE.test(d.CompanyTaxId)) e.CompanyTaxId = 'Το ΑΦΜ πρέπει να έχει ακριβώς 9 ψηφία'
    }
    if (!d.AcceptStatute) e.AcceptStatute = 'Απαιτείται αποδοχή'
    if (!d.AcceptRegulation) e.AcceptRegulation = 'Απαιτείται αποδοχή'
    if (!d.AcceptPrivacy) e.AcceptPrivacy = 'Απαιτείται αποδοχή'
  }

  return e
}

export function stepIsValid(step: number, d: ApplicationDraft, hasPhoto: boolean): boolean {
  return Object.keys(validateStep(step, d, hasPhoto)).length === 0
}

/** Per-field progress across the whole application (for the progress bar). */
export function draftProgress(d: ApplicationDraft, hasPhoto: boolean): number {
  const checks: boolean[] = [
    d.FirstName.trim() !== '', d.LastName.trim() !== '', d.Profession.trim() !== '',
    d.AgeRange !== '', d.Gender !== '', d.Disability !== '',
    d.ResidenceCity.trim() !== '', d.Address.trim() !== '', d.ActivityCityA.trim() !== '',
    EMAIL_RE.test(d.Email.trim()), d.Phone.trim() !== '', d.Bio.trim() !== '', hasPhoto,
    d.Education.trim() !== '', d.EmploymentStatus.length > 0,
    d.BoschAlumni !== '', d.StartFellow !== '',
    d.Experience.trim() !== '', d.FieldsOfActivity.trim() !== '',
    d.ActionFormats.length > 0, d.AudienceGroups.length > 0, d.Themes.length > 0,
    d.Challenges.length > 0, d.ProposedSolutions.trim() !== '', d.NetworkContribution.trim() !== '',
    d.ReceiptType === 'Φυσικό πρόσωπο' || (d.CompanyName.trim() !== '' && AFM_RE.test(d.CompanyTaxId)),
    d.AcceptStatute, d.AcceptRegulation, d.AcceptPrivacy,
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

// ── sessionStorage draft persistence (photo excluded) ──
const DRAFT_KEY = 'cforc-apply-draft'

export function loadDraft(): ApplicationDraft {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    if (!raw) return { ...EMPTY_DRAFT }
    return { ...EMPTY_DRAFT, ...JSON.parse(raw) }
  } catch {
    return { ...EMPTY_DRAFT }
  }
}

export function saveDraft(d: ApplicationDraft) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d))
  } catch {
    // storage may be blocked — the form still works, just without refresh-persistence
  }
}

export function clearDraft() {
  try { sessionStorage.removeItem(DRAFT_KEY) } catch { /* noop */ }
}
