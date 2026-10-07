'use client'

/**
 * ΠΡΟΤΑΣΗ ΝΕΑΣ ΟΜΑΔΑΣ ΕΡΓΑΣΙΑΣ — η φόρμα που αντικαθιστά το Google Form.
 *
 * Τα εννέα πεδία της φόρμας Google μεταφέρονται αυτούσια, με δύο διαφορές:
 *  - πολλαπλοί σύνδεσμοι αντί για ένα πεδίο Facebook μόνο
 *  - όνομα/email/τηλέφωνο προσυμπληρώνονται από το προφίλ (παραμένουν
 *    επεξεργάσιμα: το άτομο επικοινωνίας της ομάδας μπορεί να μην είναι
 *    ο λογαριασμός που συνδέθηκε)
 *
 * Η επικύρωση είναι Η ΙΔΙΑ συνάρτηση με τη διαδρομή του server
 * (lib/workingGroupProposals.ts) — η φόρμα δείχνει το λάθος νωρίς, δεν το
 * ελέγχει αποκλειστικά.
 */

import { useEffect, useState } from 'react'
import { validateProposal, MAX_LINKS } from '@/lib/workingGroupProposals'

const REGULATION_URL = 'https://www.cultureforchange.net/about'

const labelCls = 'block text-sm font-medium text-charcoal dark:text-gray-100 mb-1.5'
const fieldCls = 'w-full px-4 py-2.5 rounded-xl border border-black/15 dark:border-white/25 bg-white/70 dark:bg-white/5 text-charcoal dark:text-gray-100 text-sm focus:outline-none focus:border-coral'
const errCls = 'text-xs text-red-600 dark:text-red-400 mt-1'

/**
 * ΕΚΤΟΣ του γονέα επίτηδες: ένα component ορισμένο μέσα στο render είναι ΝΕΟΣ
 * τύπος σε κάθε πληκτρολόγηση — ο React ξεστήνει το input και χάνεται η
 * εστίαση μετά από κάθε χαρακτήρα.
 */
function Field({
  id, label, value, onChange, required, type = 'text', rows, error,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  type?: string
  rows?: number
  error?: string
}) {
  return (
    <div>
      <label htmlFor={id} className={labelCls}>
        {label}{required && <span className="text-coral"> *</span>}
      </label>
      {rows ? (
        <textarea id={id} rows={rows} value={value} onChange={e => onChange(e.target.value)} className={fieldCls} />
      ) : (
        <input id={id} type={type} value={value} onChange={e => onChange(e.target.value)} className={fieldCls} />
      )}
      {error && <p className={errCls}>{error}</p>}
    </div>
  )
}

export default function WorkingGroupProposalModal({
  userName, userEmail, userPhone, onClose,
}: {
  userName: string
  userEmail: string
  userPhone?: string
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [theme, setTheme] = useState('')
  const [goal, setGoal] = useState('')
  const [moreInfo, setMoreInfo] = useState('')
  const [contactPerson, setContactPerson] = useState(userName || '')
  const [proposerName, setProposerName] = useState(userName || '')
  const [proposerEmail, setProposerEmail] = useState(userEmail || '')
  const [phone, setPhone] = useState(userPhone || '')
  const [facebook, setFacebook] = useState('')
  const [links, setLinks] = useState<string[]>([''])

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = 'unset' }
  }, [])

  const draft = {
    title, theme, goal, moreInfo, contactPerson,
    proposerName, proposerEmail, phone, facebook,
    links: links.filter(l => l.trim()),
  }

  const setLink = (i: number, value: string) =>
    setLinks(prev => prev.map((l, idx) => (idx === i ? value : l)))
  const addLink = () => setLinks(prev => (prev.length >= MAX_LINKS ? prev : [...prev, '']))
  const removeLink = (i: number) =>
    setLinks(prev => (prev.length === 1 ? [''] : prev.filter((_, idx) => idx !== i)))

  const handleSubmit = async () => {
    const check = validateProposal(draft)
    setErrors(check.errors)
    setFailure(null)
    if (!check.ok) {
      // Το κουμπί είναι ΚΑΤΩ και το πρώτο κενό πεδίο συνήθως ΠΑΝΩ: χωρίς
      // αυτό, το κλικ μοιάζει να μην κάνει τίποτα (φάνηκε σε στιγμιότυπο).
      const firstField = Object.keys(check.errors).find(k => document.getElementById(k))
      if (firstField) {
        const el = document.getElementById(firstField)
        el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
        el?.focus({ preventScroll: true })
      }
      return
    }

    setSending(true)
    try {
      const res = await fetch('/api/working-groups/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setSent(true)
      } else {
        if (data.errors) setErrors(data.errors)
        setFailure(data.error || 'Αποτυχία αποστολής. Δοκίμασε ξανά.')
      }
    } catch {
      setFailure('Σφάλμα δικτύου. Δοκίμασε ξανά.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog" aria-modal="true" aria-labelledby="wg-proposal-title">
      <div className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div className="relative menu-glass rounded-3xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          aria-label="Κλείσιμο">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h3 id="wg-proposal-title" className="text-xl font-bold text-charcoal dark:text-gray-100 mb-2 pr-8">
          Αίτημα Δημιουργίας Ομάδας Εργασίας
        </h3>

        {sent ? (
          <div className="py-8 text-center">
            <div className="w-14 h-14 rounded-full bg-coral/15 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-coral" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-charcoal dark:text-gray-100 font-medium mb-1">Η πρόταση καταχωρήθηκε</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Έλαβες αντίγραφο στο <span className="notranslate">{proposerEmail}</span>. Θα επικοινωνήσουμε μαζί σου.
            </p>
            <button type="button" onClick={onClose}
              className="mt-6 px-6 py-2.5 rounded-full bg-coral text-white text-sm font-bold hover:bg-coral/90">
              Κλείσιμο
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              Είναι σημαντικό για όλους εμάς στο <strong>Culture for Change</strong> να νιώθουμε ότι υπάρχει ο χώρος
              να δημιουργήσουμε και να υλοποιήσουμε καινοτόμες ιδέες για τον πολιτισμό. Γι&apos; αυτό τον σκοπό καλούμε
              όλους και όλες να δημιουργούν και να συμμετέχουν σε Ομάδες Εργασίας για την ανάπτυξη κοινών έργων,
              υποδομών ή διεκδικήσεων με στόχο τη διασφάλιση της βιωσιμότητας του δικτύου και των μελών του.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              Μάθε περισσότερα για τις <strong>Ομάδες Εργασίας</strong> στον{' '}
              <a href={REGULATION_URL} className="text-coral hover:underline">Εσωτερικό Κανονισμό</a> του δικτύου (σελ. 12 &amp; 13).
            </p>

            <div className="space-y-4">
              <Field id="title" label="Τι τίτλο θα έχει η Ομάδα Εργασίας;" value={title} onChange={setTitle} required  error={errors.title} />
              <Field id="theme" label="Τι θεματική θα θέλατε να έχει η Ομάδα Εργασίας;" value={theme} onChange={setTheme} required rows={3}  error={errors.theme} />
              <Field id="goal" label="Ποιός είναι ο στόχος της Ομάδας Εργασίας;" value={goal} onChange={setGoal} required rows={3}  error={errors.goal} />
              <Field id="moreInfo" label="Μοιραστείτε περισσότερα (αν το επιθυμείτε)" value={moreInfo} onChange={setMoreInfo} rows={3}  error={errors.moreInfo} />
              <Field id="contactPerson" label="Προσωρινό άτομο επικοινωνίας (ρόλος Συντονίστριας/Συντονιστή)" value={contactPerson} onChange={setContactPerson} required  error={errors.contactPerson} />

              <div className="pt-2 border-t border-black/10 dark:border-white/10" />

              <Field id="proposerName" label="Ονοματεπώνυμο" value={proposerName} onChange={setProposerName} required  error={errors.proposerName} />
              <Field id="proposerEmail" label="E-mail" value={proposerEmail} onChange={setProposerEmail} required type="email"  error={errors.proposerEmail} />
              <Field id="phone" label="Τηλέφωνο επικοινωνίας" value={phone} onChange={setPhone} required type="tel"  error={errors.phone} />
              <Field id="facebook" label="Facebook Profile (εφόσον υπάρχει)" value={facebook} onChange={setFacebook}  error={errors.facebook} />

              <div>
                <label className={labelCls}>Σύνδεσμοι (προαιρετικά)</label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Ό,τι βοηθά να καταλάβουμε την πρόταση: κείμενο, ιστοσελίδα, φάκελος.
                </p>
                <div className="space-y-2">
                  {links.map((value, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="url"
                        value={value}
                        onChange={e => setLink(i, e.target.value)}
                        placeholder="https://…"
                        aria-label={`Σύνδεσμος ${i + 1}`}
                        className={fieldCls}
                      />
                      <button type="button" onClick={() => removeLink(i)}
                        className="p-2 rounded-full text-gray-400 hover:text-red-600 dark:hover:text-red-400 flex-shrink-0"
                        aria-label={`Αφαίρεση συνδέσμου ${i + 1}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                {links.length < MAX_LINKS && (
                  <button type="button" onClick={addLink} className="mt-2 text-sm text-coral hover:underline">
                    + Προσθήκη συνδέσμου
                  </button>
                )}
                {errors.links && <p className={errCls}>{errors.links}</p>}
              </div>
            </div>

            {failure && (
              <p className="mt-5 text-sm text-red-600 dark:text-red-400">{failure}</p>
            )}

            <div className="flex items-center gap-3 mt-7">
              <button type="button" onClick={handleSubmit} disabled={sending}
                className="px-6 py-2.5 rounded-full bg-coral text-white text-sm font-bold hover:bg-coral/90 disabled:opacity-50">
                {sending ? 'Αποστολή…' : 'Υποβολή πρότασης'}
              </button>
              <button type="button" onClick={onClose}
                className="px-5 py-2.5 rounded-full border border-black/15 dark:border-white/25 text-sm text-charcoal dark:text-gray-200 hover:border-coral">
                Άκυρο
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
