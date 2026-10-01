'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import ScrollToTop from '@/components/ScrollToTop'
import type { CforcEvent, EventCapacity } from '@/lib/types'
import { dateRangeLabel, grDate } from '@/lib/events'
import { upperGreek } from '@/lib/campaignBlocks'
import {
  CAPACITY_LABELS, MEMBER_CAPACITIES, offeredCapacities, visibleSessions, visibleOptions, sessionChoices,
  validateRegistration, emptyDraft, type RegistrationDraft, type SessionChoice,
} from '@/lib/eventForm'

type Prefill = { FirstName: string; LastName: string; Email: string; Phone: string } | null

/**
 * Η δήλωση συμμετοχής.
 *
 * Η ΙΔΙΟΤΗΤΑ είναι το πρώτο πράγμα που ζητάμε, γιατί ΑΥΤΗ ορίζει τι
 * ακολουθεί: ποιες συνεδρίες, ποια μπλοκ logistics. Οι κανόνες ζουν στο
 * lib/eventForm και είναι ΟΙ ΙΔΙΟΙ με του server — εδώ μόνο ζωγραφίζονται.
 */
export default function RegistrationForm({ ev, isMember, prefill }: {
  ev: CforcEvent; isMember: boolean; prefill: Prefill
}) {
  const [d, setD] = useState<RegistrationDraft>(() => ({ ...emptyDraft(), ...(prefill || {}) }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ status: 'confirmed' | 'pending'; email: string } | null>(null)

  const capacities = useMemo(() => offeredCapacities(ev), [ev])
  const sessions = useMemo(() => visibleSessions(ev, d.Capacity), [ev, d.Capacity])
  const options = useMemo(() => visibleOptions(ev, d.Capacity), [ev, d.Capacity])

  /* Αλλάζοντας ιδιότητα, οι απαντήσεις σε ΚΡΥΜΜΕΝΑ πλέον στοιχεία φεύγουν:
     αλλιώς θα στελνόταν απάντηση σε ερώτηση που ο άνθρωπος δεν είδε ποτέ. */
  useEffect(() => {
    if (!d.Capacity) return
    const okS = new Set<string>(sessions.map(s => String(s.id)))
    // ΚΑΙ το travelFromCity, που είναι συνέχεια του 'travel' και όχι δικό του μπλοκ
    const okO = new Set<string>([...options.map(o => String(o.Key)), 'travelFromCity'])
    setD(prev => ({
      ...prev,
      SessionChoices: Object.fromEntries(Object.entries(prev.SessionChoices).filter(([k]) => okS.has(k))),
      OptionAnswers: Object.fromEntries(Object.entries(prev.OptionAnswers).filter(([k]) => okO.has(k))),
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.Capacity])

  const set = (patch: Partial<RegistrationDraft>) => setD(prev => ({ ...prev, ...patch }))
  const setSession = (id: number, v: SessionChoice) =>
    setD(prev => ({ ...prev, SessionChoices: { ...prev.SessionChoices, [String(id)]: v } }))
  const setOption = (key: string, v: string) =>
    setD(prev => ({ ...prev, OptionAnswers: { ...prev.OptionAnswers, [key]: v } }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const problem = validateRegistration(ev, d, isMember)
    if (problem) { setError(problem); return }
    setBusy(true)
    try {
      const res = await fetch('/api/events/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: ev.Slug, ...d }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.error || 'Κάτι πήγε στραβά')
      setDone({ status: j.status, email: d.Email })
    } catch (err: any) {
      setError(err?.message || 'Κάτι πήγε στραβά')
    } finally { setBusy(false) }
  }

  if (done) return <AfterSubmit ev={ev} status={done.status} email={done.email} />

  return (
    <div className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900">
      <Navigation />
      <main id="main-content" className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <Link href={`/events/${ev.Slug}`} className="text-sm font-bold text-coral dark:text-coral-light hover:underline">
          ← {ev.Title}
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-charcoal dark:text-white">Δήλωση συμμετοχής</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          {dateRangeLabel(ev.StartDate, ev.EndDate)}{ev.City ? ` · ${ev.City}` : ''}
          {ev.RegistrationDeadline && <> · προθεσμία {grDate(ev.RegistrationDeadline)}</>}
        </p>

        <form onSubmit={submit} className="mt-8 grid gap-6">
          {/* ── Ιδιότητα: ΠΡΩΤΗ, γιατί ορίζει τα υπόλοιπα ── */}
          <Card title="Η ιδιότητά σου">
            <div className="grid gap-2">
              {capacities.map(c => (
                <Radio key={c} name="capacity" checked={d.Capacity === c}
                  onChange={() => set({ Capacity: c as EventCapacity })}
                  label={CAPACITY_LABELS[c]} />
              ))}
            </div>
            {d.Capacity === 'other' && (
              <Input label="Γράψε μας την ιδιότητά σου" value={d.CapacityOther}
                onChange={v => set({ CapacityOther: v })} />
            )}
          </Card>

          {/* Ιδιότητα ΜΕΛΟΥΣ από μη συνδεδεμένο: σταματά ΕΔΩ.
              Ο server το απορρίπτει έτσι κι αλλιώς, αλλά αν το μάθαινε
              κανείς μόνο στην υποβολή θα είχε συμπληρώσει ολόκληρη τη φόρμα
              για να φάει άρνηση. Και η σύνδεση φέρνει τα στοιχεία έτοιμα. */}
          {!isMember && d.Capacity && MEMBER_CAPACITIES.includes(d.Capacity) && (
            <section className="rounded-3xl bg-white dark:bg-gray-800 border-2 border-coral p-6 sm:p-8">
              <h2 className="font-bold text-lg text-charcoal dark:text-white mb-2">
                Χρειάζεται να συνδεθείς
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Δήλωσες ότι είσαι μέλος του CforC. Συνδέσου για να συνεχίσεις — τα στοιχεία σου
                θα έρθουν συμπληρωμένα και η δήλωση θα συνδεθεί με το προφίλ σου.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href={`/login?returnTo=${encodeURIComponent(`/events/${ev.Slug}/register/form`)}`}
                  className="px-6 py-2.5 rounded-full bg-coral text-charcoal font-bold text-sm hover:brightness-105 transition">
                  Σύνδεση
                </Link>
                <button type="button" onClick={() => set({ Capacity: '' })}
                  className="px-6 py-2.5 rounded-full border-2 border-coral text-coral dark:text-coral-light font-bold text-sm">
                  Δεν είμαι μέλος τελικά
                </button>
              </div>
            </section>
          )}

          {d.Capacity && !(!isMember && MEMBER_CAPACITIES.includes(d.Capacity)) && (
            <>
              <Card title="Τα στοιχεία σου">
                {isMember && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    Ήρθαν από το προφίλ σου — διόρθωσέ τα αν χρειάζεται.
                  </p>
                )}
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input label="Όνομα" required value={d.FirstName} onChange={v => set({ FirstName: v })} />
                  <Input label="Επίθετο" required value={d.LastName} onChange={v => set({ LastName: v })} />
                  <Input label="Email" required type="email" value={d.Email} onChange={v => set({ Email: v })} />
                  <Input label="Τηλέφωνο" required value={d.Phone} onChange={v => set({ Phone: v })} />
                </div>
              </Card>

              {sessions.length > 0 && (
                <Card title="Συμμετοχή στις δράσεις">
                  <div className="grid gap-5">
                    {sessions.map(s => (
                      <fieldset key={s.id}>
                        <legend className="font-bold text-charcoal dark:text-white">{s.Title}</legend>
                        {s.Subtitle && <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{s.Subtitle}</p>}
                        <div className="grid gap-2 mt-2">
                          {sessionChoices(s).map(c => (
                            <Radio key={c.value} name={`s-${s.id}`}
                              checked={d.SessionChoices[String(s.id)] === c.value}
                              onChange={() => setSession(s.id, c.value)} label={c.label} />
                          ))}
                        </div>
                      </fieldset>
                    ))}
                  </div>
                </Card>
              )}

              {options.map(o => (
                <Card key={o.Key} title={o.Title}>
                  {o.Description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 whitespace-pre-line">{o.Description}</p>
                  )}

                  {o.Key === 'dietary' ? (
                    <>
                      <textarea rows={3} value={d.Dietary} onChange={e => set({ Dietary: e.target.value })}
                        placeholder="π.χ. vegan, χωρίς γλουτένη, αλλεργία σε ξηρούς καρπούς"
                        className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-charcoal dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-coral" />
                      {/* ΑΡΘΡΟ 9: χωρίς ΡΗΤΗ συγκατάθεση δεν αποθηκεύεται ποτέ */}
                      {d.Dietary.trim() && (
                        <label className="flex items-start gap-3 mt-3 cursor-pointer">
                          <input type="checkbox" checked={d.DietaryConsent}
                            onChange={e => set({ DietaryConsent: e.target.checked })}
                            className="mt-1 w-4 h-4 text-coral rounded focus:ring-coral" />
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            Συμφωνώ να κρατήσετε αυτή την πληροφορία <strong>μόνο για τη διατροφή μου σε αυτή τη
                            δράση</strong>. Διαγράφεται μόλις τελειώσει.
                          </span>
                        </label>
                      )}
                    </>
                  ) : Array.isArray(o.Choices) && o.Choices.length > 0 ? (
                    <div className="grid gap-2">
                      {o.Choices.map(c => (
                        <Radio key={c.value} name={`o-${o.Key}`} checked={d.OptionAnswers[o.Key] === c.value}
                          onChange={() => setOption(o.Key, c.value)} label={c.label} />
                      ))}
                    </div>
                  ) : (
                    <Input label="" value={d.OptionAnswers[o.Key] || ''} onChange={v => setOption(o.Key, v)} />
                  )}

                  {/* Η μετακίνηση έχει συνέχεια: από πού ξεκινάς */}
                  {o.Key === 'travel' && d.OptionAnswers.travel && d.OptionAnswers.travel !== 'no' && (
                    <div className="mt-4">
                      <Input label="Από ποια πόλη θα μετακινηθείς;"
                        value={d.OptionAnswers.travelFromCity || ''}
                        onChange={v => setOption('travelFromCity', v)} />
                    </div>
                  )}
                </Card>
              ))}

              <Card title="Θέματα και σχόλια">
                <Textarea label="Θέμα που προτείνεις για την ατζέντα" value={d.AgendaTopic}
                  onChange={v => set({ AgendaTopic: v })} />
                <Textarea label="Γενικά σχόλια ή ιδέες" value={d.GeneralComments}
                  onChange={v => set({ GeneralComments: v })} />
              </Card>

              {!isMember && (
                <Card title="Τα δεδομένα σου">
                  <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">
                    {ev.ConsentText || DEFAULT_CONSENT}
                  </p>
                  <label className="flex items-start gap-3 mt-4 cursor-pointer">
                    <input type="checkbox" checked={d.Consent}
                      onChange={e => set({ Consent: e.target.checked })}
                      className="mt-1 w-4 h-4 text-coral rounded focus:ring-coral" />
                    <span className="text-sm text-charcoal dark:text-gray-200">
                      Διάβασα και αποδέχομαι τα παραπάνω.
                    </span>
                  </label>
                </Card>
              )}

              {error && (
                <p role="alert" className="rounded-2xl bg-red-50 dark:bg-red-900/25 border border-red-300 dark:border-red-700 px-4 py-3 text-sm text-red-800 dark:text-red-200">
                  {error}
                </p>
              )}

              <button type="submit" disabled={busy}
                className="px-6 py-3 rounded-full bg-coral text-charcoal font-bold hover:brightness-105 disabled:opacity-50 transition">
                {busy ? 'Υποβολή…' : 'Υποβολή δήλωσης'}
              </button>
            </>
          )}
        </form>
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  )
}

const DEFAULT_CONSENT =
  'Κρατάμε τα στοιχεία σου για να οργανώσουμε τη συμμετοχή σου: πρόγραμμα, εστίαση, '
  + 'διαμονή και αποστολή του συνδέσμου. Τα βλέπει η Ομάδα Συντονισμού του CforC. '
  + 'Όπου χρειάζεται, κοινοποιούμε μόνο το όνομα — στο ξενοδοχείο για την κράτηση και '
  + 'στον χώρο διεξαγωγής για την είσοδο. Δεν πωλούνται, δεν δίνονται σε διαφημιστές και '
  + 'δεν χρησιμοποιούνται για άλλο σκοπό. Τυχόν στατιστικά βγαίνουν μόνο συγκεντρωτικά, '
  + 'χωρίς ονόματα. Μπορείς να ζητήσεις πρόσβαση, διόρθωση ή διαγραφή στο '
  + 'hello@cultureforchange.net.'

/** Μετά την υποβολή — ΕΔΩ μπαίνουν οι προτροπές, όχι πριν */
function AfterSubmit({ ev, status, email }: { ev: CforcEvent; status: 'confirmed' | 'pending'; email: string }) {
  return (
    <div className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900">
      <Navigation />
      <main id="main-content" className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 p-8">
          <h1 className="text-2xl font-bold text-charcoal dark:text-white mb-3">
            {status === 'confirmed' ? 'Η δήλωσή σου καταχωρήθηκε ✓' : 'Ένα βήμα ακόμη'}
          </h1>
          {status === 'confirmed' ? (
            <p className="text-gray-600 dark:text-gray-300">
              Σε περιμένουμε στο {ev.Title}. Θα λάβεις τις λεπτομέρειες στο <strong>{email}</strong>.
            </p>
          ) : (
            <p className="text-gray-600 dark:text-gray-300">
              Στείλαμε email στο <strong>{email}</strong>. Πάτα τον σύνδεσμο μέσα για να
              επιβεβαιώσεις τη διεύθυνσή σου — χωρίς αυτό η δήλωση δεν ολοκληρώνεται.
            </p>
          )}
        </div>

        {/* Οι προτροπές ΜΕΤΑ την υποβολή — τη στιγμή που κάποιος μόλις
            δεσμεύτηκε να έρθει, είναι και η πιο πρόθυμη να πλησιάσει. */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-6">
            <h2 className="font-bold text-charcoal dark:text-white">Γίνε μέλος του CforC</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Το δίκτυο των ανθρώπων του πολιτισμού που θέλουν να αλλάξουν πράγματα.
            </p>
            <Link href="/apply" className="mt-4 inline-flex px-5 py-2.5 rounded-full bg-coral text-charcoal font-bold text-sm">
              Αίτηση εγγραφής
            </Link>
          </div>
          <div className="rounded-3xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-6">
            <h2 className="font-bold text-charcoal dark:text-white">Newsletter</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Τι κάνουμε, πού χρειαζόμαστε χέρια, ποιες προσκλήσεις τρέχουν.
            </p>
            <Link href="/#newsletter" className="mt-4 inline-flex px-5 py-2.5 rounded-full border-2 border-coral text-coral dark:text-coral-light font-bold text-sm">
              Εγγραφή
            </Link>
          </div>
        </div>
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  )
}

/* ── μικρά δομικά ── */
const inputCls = 'w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-charcoal dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-coral'

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 p-6 sm:p-8">
      <h2 className="text-xs font-bold tracking-wider text-gray-600 dark:text-gray-400 mb-4">{upperGreek(title)}</h2>
      {children}
    </section>
  )
}

function Input({ label, value, onChange, required, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string
}) {
  return (
    <label className="block">
      {label && (
        <span className="block text-sm font-bold text-charcoal dark:text-gray-200 mb-1.5">
          {label}{required && <span className="text-coral"> *</span>}
        </span>
      )}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} className={inputCls} />
    </label>
  )
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block mb-4 last:mb-0">
      <span className="block text-sm font-bold text-charcoal dark:text-gray-200 mb-1.5">{label}</span>
      <textarea rows={3} value={value} onChange={e => onChange(e.target.value)} className={inputCls} />
    </label>
  )
}

function Radio({ name, checked, onChange, label }: {
  name: string; checked: boolean; onChange: () => void; label: string
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input type="radio" name={name} checked={checked} onChange={onChange}
        className="mt-1 w-4 h-4 text-coral focus:ring-coral" />
      <span className="text-sm text-charcoal dark:text-gray-200">{label}</span>
    </label>
  )
}
