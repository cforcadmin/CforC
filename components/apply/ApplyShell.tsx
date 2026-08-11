'use client'

import { useEffect, useRef, useState } from 'react'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import PreviewCard from './PreviewCard'
import StepIdentity from './StepIdentity'
import StepActivity from './StepActivity'
import StepNeeds from './StepNeeds'
import StepFinancial from './StepFinancial'
import {
  type ApplicationDraft, type DraftErrors,
  loadDraft, saveDraft, clearDraft, draftProgress, validateStep, stepIsValid,
} from './applyTypes'
import { PUBLISH_FIELDS } from './applyData'

/**
 * /apply — Αίτηση Εγγραφής (concept C: «Χτίσε το προφίλ σου»)
 * Chunk 2: full fields, live preview binding, per-field progress,
 * sessionStorage draft persistence, validation on Συνέχεια.
 * Submit is stubbed — the API arrives in Chunk 3.
 */

const STATIONS = [
  { key: 'identity', label: 'Ταυτότητα', internal: false },
  { key: 'activity', label: 'Δραστηριότητα', internal: false },
  { key: 'needs', label: 'Ανάγκες & Συμβολή', internal: true },
  { key: 'financial', label: 'Οικονομικά', internal: true },
  { key: 'review', label: 'Έλεγχος', internal: false },
] as const

const INTRO_SEEN_KEY = 'cforc-apply-intro-seen'

export default function ApplyShell() {
  const [showIntro, setShowIntro] = useState(false)
  const [step, setStep] = useState(0)
  const [maxVisited, setMaxVisited] = useState(0)
  const [draft, setDraft] = useState<ApplicationDraft | null>(null)
  const [errors, setErrors] = useState<DraftErrors>({})
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [showMobilePreview, setShowMobilePreview] = useState(false)
  const photoUrlRef = useRef<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const honeypotRef = useRef<HTMLInputElement>(null)

  // Load draft client-side (sessionStorage unavailable during SSR)
  useEffect(() => {
    setDraft(loadDraft())
    if (!sessionStorage.getItem(INTRO_SEEN_KEY)) setShowIntro(true)
  }, [])

  // Persist on every change
  useEffect(() => {
    if (draft) saveDraft(draft)
  }, [draft])

  function set<K extends keyof ApplicationDraft>(key: K, value: ApplicationDraft[K]) {
    setDraft(d => {
      if (!d) return d
      const next = { ...d, [key]: value }
      // Activity city A follows the residence city until the user diverges
      if (key === 'ResidenceCity') {
        if (d.ActivityCityA.trim() === '' || d.ActivityCityA === d.ResidenceCity) {
          next.ActivityCityA = value as string
        }
      }
      return next
    })
    // Clear the field's error as the user fixes it
    setErrors(e => {
      if (!(key in e)) return e
      const next = { ...e }
      delete next[key]
      return next
    })
  }

  function onPhotoChange(file: File | null) {
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current)
    setPhotoFile(file)
    const url = file ? URL.createObjectURL(file) : null
    photoUrlRef.current = url
    setPhotoUrl(url)
    if (file) setErrors(e => { const n = { ...e }; delete n.Photo; return n })
  }

  function dismissIntro() {
    sessionStorage.setItem(INTRO_SEEN_KEY, '1')
    setShowIntro(false)
  }

  function goTo(index: number, options?: { skipValidation?: boolean }) {
    if (!draft || index < 0 || index >= STATIONS.length) return
    // Moving forward from a form step validates it first
    if (!options?.skipValidation && index > step && step < 4) {
      const stepErrors = validateStep(step, draft, !!photoFile)
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors)
        // jump to the first visible error
        requestAnimationFrame(() => {
          document.querySelector('[role="alert"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        })
        return
      }
    }
    setErrors({})
    setStep(index)
    setMaxVisited(m => Math.max(m, index))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit() {
    if (!draft || !photoFile || submitting) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const fd = new FormData()
      fd.append('data', JSON.stringify(draft))
      fd.append('photo', photoFile)
      fd.append('website_hp', honeypotRef.current?.value || '')
      const res = await fetch('/api/apply', { method: 'POST', body: fd })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSubmitError(json.error || 'Κάτι πήγε στραβά — δοκίμασε ξανά')
        return
      }
      clearDraft()
      setSubmitted(true)
      window.scrollTo({ top: 0 })
    } catch {
      setSubmitError('Σφάλμα δικτύου — έλεγξε τη σύνδεσή σου και δοκίμασε ξανά')
    } finally {
      setSubmitting(false)
    }
  }

  if (!draft) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Φόρτωση…</p>
      </div>
    )
  }

  // Thank-you screen replaces the whole form after successful submission
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900 flex flex-col">
        <Navigation />
        <main id="main-content" className="flex-1 pt-28 pb-16 flex items-center justify-center">
          <div className="max-w-lg mx-auto px-4 text-center">
            <div className="w-20 h-20 rounded-full bg-coral/10 dark:bg-coral/20 flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-coral dark:text-coral-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-charcoal dark:text-coral mb-4">Η αίτησή σου υποβλήθηκε!</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-3">
              Σου στείλαμε email επιβεβαίωσης. Η Ομάδα Συντονισμού θα εξετάσει την
              αίτησή σου και θα λάβεις απάντηση το αργότερο εντός <strong>14 ημερών</strong>.
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
              Μέχρι τότε, ρίξε μια ματιά στις δράσεις και τα μέλη του δικτύου.
            </p>
            <a href="/" className="inline-block bg-coral text-white font-bold rounded-full px-8 py-3 hover:bg-coral/90 transition-colors">
              Επιστροφή στην αρχική
            </a>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const progress = draftProgress(draft, !!photoFile)
  const current = STATIONS[step]
  const allValid = [0, 1, 2, 3].every(s => stepIsValid(s, draft, !!photoFile))

  return (
    <div className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900 flex flex-col">
      <Navigation />

      <main id="main-content" className="flex-1 pt-28 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-charcoal dark:text-coral">ΑΙΤΗΣΗ ΕΓΓΡΑΦΗΣ</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Χρόνος συμπλήρωσης: ~20 λεπτά · Ένα μικρό μέρος των στοιχείων δημοσιεύεται στο
              προφίλ σου — όλα τα υπόλοιπα είναι μόνο για εσωτερική χρήση του CforC.
            </p>
          </div>

          {/* Station line */}
          <nav aria-label="Βήματα αίτησης" className="mb-2 overflow-x-auto">
            <ol className="flex items-center min-w-[560px]">
              {STATIONS.map((s, i) => {
                const done = i < step
                const active = i === step
                const reachable = i <= maxVisited && i !== step
                return (
                  <li key={s.key} className={`flex items-center ${i < STATIONS.length - 1 ? 'flex-1' : ''}`}>
                    <button
                      type="button"
                      onClick={() => reachable && goTo(i, { skipValidation: i < step })}
                      disabled={!reachable && !active}
                      aria-current={active ? 'step' : undefined}
                      className={`flex flex-col items-center ${reachable ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                        active
                          ? 'bg-coral border-coral text-white'
                          : done || i <= maxVisited
                            ? 'bg-coral/20 border-coral text-coral dark:text-coral-light'
                            : 'bg-transparent border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500'
                      }`}>
                        {done ? '✓' : i + 1}
                      </span>
                      <span className={`mt-1.5 text-xs font-medium whitespace-nowrap ${
                        active ? 'text-charcoal dark:text-coral-light font-bold' : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {s.label}
                        {s.internal && (
                          <span className="ml-1" title="Μόνο για εσωτερική χρήση" aria-label="Μόνο για εσωτερική χρήση">🔒</span>
                        )}
                      </span>
                    </button>
                    {i < STATIONS.length - 1 && (
                      <span aria-hidden="true" className={`flex-1 h-0.5 mx-2 mb-5 rounded ${i < maxVisited ? 'bg-coral' : 'bg-gray-300 dark:bg-gray-600'}`} />
                    )}
                  </li>
                )
              })}
            </ol>
          </nav>

          {/* Progress bar (per answered field) */}
          <div
            className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-1"
            role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}
            aria-label="Πρόοδος συμπλήρωσης"
          >
            <div className="h-full bg-coral rounded-full transition-all duration-500" style={{ width: `${Math.max(progress, 2)}%` }} />
          </div>
          <p className="text-right text-xs text-gray-400 dark:text-gray-500 mb-6">{progress}%</p>

          {/* Split layout */}
          <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
            {/* Left: step content */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6 md:p-10">
              <div className="flex items-center gap-3 mb-6 flex-wrap">
                <h2 className="text-xl font-bold text-charcoal dark:text-gray-100">
                  {current.key === 'review' ? 'Έλεγχος & Υποβολή' : current.label}
                </h2>
                {current.internal && (
                  <span className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs px-3 py-1 rounded-full">
                    🔒 Μόνο για εσωτερική χρήση
                  </span>
                )}
              </div>

              {current.key === 'identity' && (
                <StepIdentity
                  draft={draft} set={set} errors={errors}
                  photoUrl={photoUrl} onPhotoChange={onPhotoChange} photoError={errors.Photo}
                />
              )}
              {current.key === 'activity' && <StepActivity draft={draft} set={set} errors={errors} />}
              {current.key === 'needs' && <StepNeeds draft={draft} set={set} errors={errors} />}
              {current.key === 'financial' && <StepFinancial draft={draft} set={set} errors={errors} />}
              {current.key === 'review' && (
                <ReviewStep
                  draft={draft} hasPhoto={!!photoFile}
                  goTo={i => goTo(i, { skipValidation: true })}
                  allValid={allValid}
                  submitting={submitting}
                  submitError={submitError}
                  onSubmit={handleSubmit}
                />
              )}

              {/* Honeypot — invisible to humans, irresistible to bots */}
              <input
                ref={honeypotRef}
                type="text"
                name="website_hp"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="absolute left-[-9999px] w-px h-px opacity-0"
              />

              {/* Navigation buttons */}
              <div className="flex items-center justify-between mt-8">
                <button
                  type="button"
                  onClick={() => goTo(step - 1, { skipValidation: true })}
                  disabled={step === 0}
                  className="px-6 py-3 rounded-full border-2 border-charcoal dark:border-gray-400 text-charcoal dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Πίσω
                </button>
                {current.key !== 'review' && (
                  <button
                    type="button"
                    onClick={() => goTo(step + 1)}
                    className="px-8 py-3 rounded-full bg-coral text-white font-bold hover:bg-coral/90 transition-colors"
                  >
                    Συνέχεια →
                  </button>
                )}
              </div>
            </div>

            {/* Right: live preview (desktop) */}
            <aside className="hidden lg:block sticky top-28" aria-label="Προεπισκόπηση προφίλ">
              <PreviewCard draft={draft} photoUrl={photoUrl} dimmed={current.internal} />
              <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-3">
                {current.internal
                  ? 'Αυτή η ενότητα δεν εμφανίζεται στο δημόσιο προφίλ.'
                  : 'Το προφίλ σου — χτίζεται όσο συμπληρώνεις.'}
              </p>
            </aside>
          </div>
        </div>
      </main>

      <Footer />

      {/* Mobile preview peek */}
      <button
        type="button"
        onClick={() => setShowMobilePreview(true)}
        className="lg:hidden fixed bottom-6 left-6 z-40 bg-charcoal dark:bg-coral text-white rounded-full px-4 py-3 shadow-lg text-sm font-medium"
      >
        Προφίλ 👤
      </button>
      {showMobilePreview && (
        <div
          className="lg:hidden fixed inset-0 z-[90] bg-black/50 flex items-end justify-center p-4"
          onClick={() => setShowMobilePreview(false)}
          role="dialog" aria-modal="true" aria-label="Προεπισκόπηση προφίλ"
        >
          <div className="w-full max-w-sm max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <PreviewCard draft={draft} photoUrl={photoUrl} dimmed={false} />
            <button
              type="button"
              onClick={() => setShowMobilePreview(false)}
              className="mt-3 w-full bg-white dark:bg-gray-800 text-charcoal dark:text-gray-200 rounded-2xl py-3 font-medium"
            >
              Κλείσιμο
            </button>
          </div>
        </div>
      )}

      {/* Intro popup */}
      {showIntro && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="apply-intro-title">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 w-full max-w-lg animate-flyIn max-h-[90vh] overflow-y-auto">
            <h2 id="apply-intro-title" className="text-2xl font-bold text-charcoal dark:text-gray-100 mb-4">Καλωσήρθες! 👋</h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>Σ&rsquo; ευχαριστούμε για το ενδιαφέρον σου να γίνεις μέλος του Culture for Change!</p>
              <p>
                Η αίτηση θέλει λίγο περισσότερο χρόνο από μια συνηθισμένη φόρμα — <strong>περίπου 20 λεπτά</strong>.
                Ο λόγος είναι απλός: όσα μοιραστείς μαζί μας δεν χρειάζονται μόνο για την αξιολόγηση της αίτησης —
                χτίζουν από τώρα το προφίλ σου, ώστε να σε παρουσιάσουμε όσο καλύτερα γίνεται στην κοινότητα και
                προς τα έξω. Θα το βλέπεις να παίρνει μορφή δίπλα σου όσο συμπληρώνεις.
              </p>
              <p>Και το καλύτερο; <strong>Το κάνεις μία φορά.</strong> Βάλε τα δυνατά σου!</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                Ένα μικρό μέρος των στοιχείων δημοσιεύεται στο προφίλ σου στην ιστοσελίδα — όλα τα υπόλοιπα
                χρησιμοποιούνται αποκλειστικά για τις εσωτερικές διαδικασίες του CforC.
              </p>
            </div>
            <button
              type="button"
              onClick={dismissIntro}
              className="mt-6 w-full bg-coral text-white font-bold rounded-2xl px-6 py-4 hover:bg-coral/90 transition-colors"
            >
              Ξεκινάμε →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─────────── Review step ─────────── */

function ReviewStep({
  draft, hasPhoto, goTo, allValid, submitting, submitError, onSubmit,
}: {
  draft: ApplicationDraft; hasPhoto: boolean; goTo: (i: number) => void; allValid: boolean
  submitting: boolean; submitError: string | null; onSubmit: () => void
}) {
  const sections: Array<{ step: number; title: string; items: Array<[string, string]> }> = [
    {
      step: 0,
      title: 'Ταυτότητα',
      items: [
        ['Ονοματεπώνυμο', `${draft.FirstName} ${draft.LastName}`.trim() || '—'],
        ['Ιδιότητα', draft.Profession || '—'],
        ['Ηλικία / Φύλο', [draft.AgeRange, draft.Gender].filter(Boolean).join(' / ') || '—'],
        ['Πόλη διαμονής', draft.ResidenceCity || '—'],
        ['Πόλη/πόλεις δραστηριότητας', draft.ActivityCityA || '—'],
        ['Email / Τηλέφωνο', [draft.Email, draft.Phone].filter(Boolean).join(' · ') || '—'],
        ['Φωτογραφία', hasPhoto ? '✓' : '✗ λείπει'],
        ['Δημοσίευση επαφών', draft.PublishConsent.length > 0
          ? draft.PublishConsent.map(k => PUBLISH_FIELDS.find(f => f.key === k)?.label || k).join(', ')
          : 'Καμία'],
      ],
    },
    {
      step: 1,
      title: 'Δραστηριότητα',
      items: [
        ['Επαγγελματική κατάσταση', draft.EmploymentStatus.join(', ') || '—'],
        ['Πεδία δραστηριότητας', draft.FieldsOfActivity || '—'],
        ['Τρόποι εφαρμογής', `${draft.ActionFormats.length} επιλογές`],
        ['Ομάδες κοινού', `${draft.AudienceGroups.length} επιλογές`],
        ['Θεματικές', `${draft.Themes.length} επιλογές`],
        ['Bosch / START', `${draft.BoschAlumni || '—'} / ${draft.StartFellow || '—'}`],
      ],
    },
    {
      step: 2,
      title: 'Ανάγκες & Συμβολή',
      items: [
        ['Προκλήσεις', `${draft.Challenges.length} επιλογές`],
        ['Λύσεις', draft.ProposedSolutions ? '✓ συμπληρώθηκε' : '—'],
        ['Συμβολή δικτύου', draft.NetworkContribution ? '✓ συμπληρώθηκε' : '—'],
      ],
    },
    {
      step: 3,
      title: 'Οικονομικά & Συναινέσεις',
      items: [
        ['Απόδειξη σε', draft.ReceiptType],
        ...(draft.ReceiptType === 'Εταιρεία'
          ? ([['Εταιρεία / ΑΦΜ', `${draft.CompanyName || '—'} / ${draft.CompanyTaxId ? '✓ 9 ψηφία' : '—'}`]] as Array<[string, string]>)
          : []),
        ['Newsletter', draft.NewsletterOptIn ? 'Ναι' : 'Όχι'],
        ['Αποδοχές', [draft.AcceptStatute, draft.AcceptRegulation, draft.AcceptPrivacy].every(Boolean) ? '✓ και οι τρεις' : '✗ εκκρεμούν'],
      ],
    },
  ]

  return (
    <div className="space-y-5">
      <p className="text-gray-600 dark:text-gray-300">
        Έλεγξε τις απαντήσεις σου. Με το «Αλλαγή» επιστρέφεις στο αντίστοιχο βήμα.
      </p>
      {sections.map(s => (
        <div key={s.step} className="border border-gray-200 dark:border-gray-600 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-charcoal dark:text-gray-100">{s.title}</h3>
            <button type="button" onClick={() => goTo(s.step)} className="text-sm text-coral dark:text-coral-light hover:underline">
              Αλλαγή
            </button>
          </div>
          <dl className="space-y-1.5">
            {s.items.map(([k, v]) => (
              <div key={k} className="flex gap-3 text-sm">
                <dt className="text-gray-500 dark:text-gray-400 w-44 flex-shrink-0">{k}</dt>
                <dd className="text-charcoal dark:text-gray-200 break-words min-w-0">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
      {submitError && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded-2xl p-4 text-sm" role="alert">
          {submitError}
        </div>
      )}
      <button
        type="button"
        disabled={!allValid || submitting}
        onClick={onSubmit}
        className="w-full bg-coral text-white font-bold rounded-2xl px-6 py-4 hover:bg-coral/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={allValid ? undefined : 'Συμπλήρωσε όλα τα υποχρεωτικά πεδία πρώτα'}
      >
        {submitting
          ? 'Υποβολή…'
          : allValid
            ? 'Υποβολή Αίτησης'
            : 'Υποβολή Αίτησης (συμπλήρωσε τα υποχρεωτικά)'}
      </button>
    </div>
  )
}
