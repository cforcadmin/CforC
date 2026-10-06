'use client'

import { useEffect, useState } from 'react'
import { CAPACITY_LABELS } from '@/lib/eventForm'
import { OPTION_KEYS, OPTION_KEY_LABELS, slugify, type OptionKey } from '@/lib/ocEventForm'
import CampaignRichText from '@/components/oc/CampaignRichText'

/**
 * ΝΕΑ / ΕΠΕΞΕΡΓΑΣΙΑ ΔΡΑΣΗΣ — η φόρμα του OC.
 *
 * ΜΙΑ ΠΗΓΗ ΚΑΝΟΝΩΝ: ο έλεγχος ζει στο lib/ocEventForm και τον τρέχει η
 * διαδρομή. Η φόρμα ΔΕΝ ξαναγράφει τους ίδιους κανόνες — δείχνει όσα
 * γυρίζει ο server. Δύο αντίγραφα του ίδιου ελέγχου αποκλίνουν σιωπηλά, και
 * τότε η οθόνη λέει «εντάξει» για κάτι που το Strapi απορρίπτει.
 *
 * ΤΟ SLUG ΔΕΝ ΑΚΟΛΟΥΘΕΙ ΤΟΝ ΤΙΤΛΟ ΜΕΤΑ ΤΗΝ ΠΡΩΤΗ ΓΡΑΦΗ: μόλις ο συντάκτης
 * το αγγίξει ή η δράση αποθηκευτεί, παγώνει. Μια διεύθυνση που αλλάζει μόνη
 * της επειδή διορθώθηκε ένας τόνος στον τίτλο είναι σπασμένοι σύνδεσμοι.
 */

type Capacity = keyof typeof CAPACITY_LABELS

interface SessionRow {
  Title: string; Subtitle: string; StartsAt: string; EndsAt: string
  AllowInPerson: boolean; AllowOnline: boolean; VisibleFor: Capacity[]
}
interface OptionRow {
  Key: OptionKey | ''; Title: string; Description: string
  Required: boolean; Choices: string; VisibleFor: Capacity[]
}
interface ResourceRow { Label: string; Url: string }

interface Draft {
  documentId?: string
  Title: string; Slug: string; Subtitle: string
  StartDate: string; EndDate: string; RegistrationDeadline: string
  City: string; Venue: string; HostedBy: string
  Audience: 'member' | 'non-member'
  Description: string; DescriptionEn: string
  Capacities: Capacity[]
  RegistrationOpen: boolean
  ConsentText: string; ConsentVersion: string
  PersonalDataMonths: string; DietaryPurgeDays: string
  Sessions: SessionRow[]
  Options: OptionRow[]
  OpenCall: {
    Title: string; Intro: string; Question: string; TimeSlots: string
    TypeOptions: string; FreeTypeLabel: string; Deadline: string
    ContactEmail: string; VisibleFor: Capacity[]; CollectInForm: boolean
  }
  Resources: ResourceRow[]
}

const EMPTY: Draft = {
  Title: '', Slug: '', Subtitle: '',
  StartDate: '', EndDate: '', RegistrationDeadline: '',
  City: '', Venue: '', HostedBy: '',
  Audience: 'member',
  Description: '', DescriptionEn: '',
  Capacities: [],
  RegistrationOpen: true,
  ConsentText: '', ConsentVersion: '',
  PersonalDataMonths: '', DietaryPurgeDays: '',
  Sessions: [], Options: [],
  OpenCall: {
    Title: '', Intro: '', Question: '', TimeSlots: '', TypeOptions: '',
    FreeTypeLabel: 'Δωρεάν δράση', Deadline: '', ContactEmail: 'hello@cultureforchange.net',
    VisibleFor: [], CollectInForm: true,
  },
  Resources: [],
}

const input = 'w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-charcoal dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-coral'
const label = 'block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1'
const hint = 'text-xs text-gray-500 dark:text-gray-400 mt-1'
const ghost = 'px-3 py-1.5 rounded-full text-xs font-bold border border-gray-300 dark:border-gray-600 text-charcoal dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'

function Field({ k, children, note }: { k: string; children: React.ReactNode; note?: string }) {
  return (
    <div>
      <span className={label}>{k}</span>
      {children}
      {note && <p className={hint}>{note}</p>}
    </div>
  )
}

function CapacityPicker({ value, onChange, note }: {
  value: Capacity[]; onChange: (v: Capacity[]) => void; note?: string
}) {
  const toggle = (c: Capacity) =>
    onChange(value.includes(c) ? value.filter(x => x !== c) : [...value, c])
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(CAPACITY_LABELS) as Capacity[]).map(c => (
          <button key={c} type="button" onClick={() => toggle(c)}
            aria-pressed={value.includes(c)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
              value.includes(c)
                ? 'bg-coral text-charcoal border-coral'
                : 'border-gray-300 dark:border-gray-600 text-charcoal dark:text-gray-300 hover:border-coral'
            }`}>
            {CAPACITY_LABELS[c]}
          </button>
        ))}
      </div>
      {note && <p className={hint}>{note}</p>}
    </div>
  )
}

function Card({ title, onRemove, children }: {
  title: string; onRemove: () => void; children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-600 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-charcoal dark:text-gray-100">{title}</span>
        <button type="button" onClick={onRemove}
          className="ml-auto text-xs font-bold text-red-600 dark:text-red-400 hover:underline">
          Αφαίρεση
        </button>
      </div>
      {children}
    </div>
  )
}

export default function OcEventEditor({ documentId, onClose, onSaved }: {
  /** undefined = νέα δράση */
  documentId?: string
  onClose: () => void
  onSaved: (slug: string) => void
}) {
  const [d, setD] = useState<Draft>(EMPTY)
  const [loading, setLoading] = useState(!!documentId)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [slugLocked, setSlugLocked] = useState(false)
  const [slugTouched, setSlugTouched] = useState(false)
  const [lockReason, setLockReason] = useState<string | null>(null)

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (!documentId) return
    let alive = true
    fetch(`/api/oc/events?documentId=${documentId}`, { cache: 'no-store' })
      .then(async r => {
        const j = await r.json()
        if (!r.ok) throw new Error(j?.error || 'Αποτυχία')
        if (!alive) return
        const e = j.event
        setD({
          documentId,
          Title: e.Title || '', Slug: e.Slug || '', Subtitle: e.Subtitle || '',
          StartDate: e.StartDate || '', EndDate: e.EndDate || '',
          RegistrationDeadline: e.RegistrationDeadline || '',
          City: e.City || '', Venue: e.Venue || '', HostedBy: e.HostedBy || '',
          Audience: e.Audience === 'non-member' ? 'non-member' : 'member',
          Description: e.Description || '', DescriptionEn: e.DescriptionEn || '',
          Capacities: Array.isArray(e.Capacities) ? e.Capacities : [],
          RegistrationOpen: e.RegistrationOpen !== false,
          ConsentText: e.ConsentText || '', ConsentVersion: e.ConsentVersion || '',
          PersonalDataMonths: e.PersonalDataMonths == null ? '' : String(e.PersonalDataMonths),
          DietaryPurgeDays: e.DietaryPurgeDays == null ? '' : String(e.DietaryPurgeDays),
          Sessions: (e.Sessions || []).map((s: any) => ({
            Title: s.Title || '', Subtitle: s.Subtitle || '',
            StartsAt: (s.StartsAt || '').slice(0, 16), EndsAt: (s.EndsAt || '').slice(0, 16),
            AllowInPerson: s.AllowInPerson !== false, AllowOnline: s.AllowOnline !== false,
            VisibleFor: Array.isArray(s.VisibleFor) ? s.VisibleFor : [],
          })),
          Options: (e.Options || []).map((o: any) => ({
            Key: o.Key || '', Title: o.Title || '', Description: o.Description || '',
            Required: !!o.Required,
            // «τιμή | ετικέτα» ΑΝΑ ΓΡΑΜΜΗ. Το σκέτο join() έγραφε
            // «[object Object]» και έσβηνε τα κείμενα των επιλογών (6/10/2026).
            Choices: Array.isArray(o.Choices)
              ? o.Choices.map((c: any) => typeof c === 'string' ? c : `${c?.value ?? ''} | ${c?.label ?? ''}`).join('\n')
              : '',
            VisibleFor: Array.isArray(o.VisibleFor) ? o.VisibleFor : [],
          })),
          OpenCall: e.OpenCall ? {
            Title: e.OpenCall.Title || '', Intro: e.OpenCall.Intro || '',
            Question: e.OpenCall.Question || '', TimeSlots: e.OpenCall.TimeSlots || '',
            TypeOptions: e.OpenCall.TypeOptions || '',
            FreeTypeLabel: e.OpenCall.FreeTypeLabel || 'Δωρεάν δράση',
            Deadline: e.OpenCall.Deadline || '',
            ContactEmail: e.OpenCall.ContactEmail || 'hello@cultureforchange.net',
            VisibleFor: Array.isArray(e.OpenCall.VisibleFor) ? e.OpenCall.VisibleFor : [],
            CollectInForm: e.OpenCall.CollectInForm !== false,
          } : EMPTY.OpenCall,
          Resources: (e.Resources || []).map((r: any) => ({
            Label: r.Label || '', Url: r.Url || '',
          })),
        })
        setSlugTouched(true)
        if (j.registrations > 0) {
          setSlugLocked(true)
          setLockReason(`${j.registrations} δηλώσεις κρέμονται από αυτή τη διεύθυνση — ο σύνδεσμος έχει ήδη σταλεί`)
        }
      })
      .catch(err => setErrors([err?.message || 'Κάτι πήγε στραβά']))
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [documentId])

  // Το slug ακολουθεί τον τίτλο ΜΟΝΟ σε νέα δράση και ΜΟΝΟ πριν το αγγίξει
  // κανείς. Μετά παγώνει: μια διεύθυνση που μετακινείται μόνη της σπάει ό,τι
  // έχει ήδη σταλεί.
  const onTitle = (t: string) => {
    setD(p => ({ ...p, Title: t, ...(!slugTouched && !documentId && { Slug: slugify(t) }) }))
  }

  async function save() {
    setBusy(true); setErrors([])
    try {
      const payload = {
        ...d,
        Slug: d.Slug || slugify(d.Title),
        Options: d.Options.map(o => ({
          ...o, Choices: o.Choices.split('\n').map(s => s.trim()).filter(Boolean),  // τις αναλύει το lib/ocEventForm
        })),
        // Κενή ανοιχτή πρόσκληση δεν στέλνεται καθόλου
        OpenCall: d.OpenCall.Title.trim() || d.OpenCall.Question.trim() ? d.OpenCall : null,
      }
      const res = await fetch('/api/oc/events', {
        method: documentId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const j = await res.json().catch(() => null)
      if (!res.ok || !j?.ok) {
        setErrors(Array.isArray(j?.errors) && j.errors.length > 1 ? j.errors : [j?.error || 'Αποτυχία αποθήκευσης'])
        if (j?.lockedSlug) { setD(p => ({ ...p, Slug: j.lockedSlug })); setSlugLocked(true) }
        return
      }
      onSaved(j.slug)
    } catch {
      setErrors(['Δεν ολοκληρώθηκε η κλήση — δοκίμασε ξανά'])
    } finally {
      setBusy(false)
    }
  }

  const addSession = () => set('Sessions', [...d.Sessions, {
    Title: '', Subtitle: '', StartsAt: d.StartDate ? `${d.StartDate}T10:00` : '',
    EndsAt: '', AllowInPerson: true, AllowOnline: true, VisibleFor: [],
  }])
  const patchSession = (i: number, p: Partial<SessionRow>) =>
    set('Sessions', d.Sessions.map((s, n) => n === i ? { ...s, ...p } : s))

  const usedKeys = new Set(d.Options.map(o => o.Key).filter(Boolean))
  const addOption = () => {
    const free = OPTION_KEYS.find(k => !usedKeys.has(k))
    set('Options', [...d.Options, {
      Key: free || '', Title: free ? OPTION_KEY_LABELS[free] : '',
      Description: '', Required: false, Choices: '', VisibleFor: [],
    }])
  }
  const patchOption = (i: number, p: Partial<OptionRow>) =>
    set('Options', d.Options.map((o, n) => n === i ? { ...o, ...p } : o))

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 text-sm text-charcoal dark:text-gray-200">
          Φόρτωση δράσης…
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 overflow-y-auto p-4 sm:p-8">
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-xl">
        <div className="sticky top-0 z-10 flex items-center gap-3 px-6 sm:px-8 py-5 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600 rounded-t-3xl">
          <h2 className="text-xl font-bold text-charcoal dark:text-gray-100">
            {documentId ? 'Επεξεργασία δράσης' : 'Νέα δράση'}
          </h2>
          <button type="button" onClick={onClose} className={`ml-auto ${ghost}`}>Κλείσιμο</button>
        </div>

        <div className="px-6 sm:px-8 py-6 space-y-8">
          {errors.length > 0 && (
            <div className="rounded-2xl border-2 border-red-400 bg-red-50 dark:bg-red-500/10 p-4">
              <p className="text-sm font-bold text-red-700 dark:text-red-300 mb-1">
                {errors.length === 1 ? 'Δεν αποθηκεύτηκε' : `${errors.length} σημεία θέλουν διόρθωση`}
              </p>
              <ul className="text-sm text-red-700 dark:text-red-300 list-disc pl-5 space-y-0.5">
                {errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          {/* ── Βασικά ── */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold tracking-wider text-gray-600 dark:text-gray-400">ΒΑΣΙΚΑ</h3>
            <Field k="Τίτλος *">
              <input className={input} value={d.Title} onChange={e => onTitle(e.target.value)} />
            </Field>
            <Field k="Διεύθυνση (slug) *"
              note={lockReason ? `Κλειδωμένη: ${lockReason}` : `Η σελίδα θα είναι /events/${d.Slug || '…'}`}>
              <input className={`${input} ${slugLocked ? 'opacity-60' : ''}`} value={d.Slug}
                disabled={slugLocked}
                onChange={e => { setSlugTouched(true); set('Slug', e.target.value) }}
                onBlur={e => set('Slug', slugify(e.target.value))} />
            </Field>
            <Field k="Υπότιτλος">
              <input className={input} value={d.Subtitle} onChange={e => set('Subtitle', e.target.value)} />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field k="Κοινό *" note="Καθορίζει αν η σελίδα είναι ανοιχτή σε μη μέλη">
                <select className={input} value={d.Audience}
                  onChange={e => set('Audience', e.target.value as Draft['Audience'])}>
                  <option value="member">Μέλη</option>
                  <option value="non-member">Και μη μέλη</option>
                </select>
              </Field>
              <Field k="Δηλώσεις">
                <label className="flex items-center gap-2 text-sm text-charcoal dark:text-gray-200 pt-2">
                  <input type="checkbox" checked={d.RegistrationOpen}
                    onChange={e => set('RegistrationOpen', e.target.checked)} />
                  Ανοιχτές
                </label>
              </Field>
            </div>
          </section>

          {/* ── Ημερομηνίες ── */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold tracking-wider text-gray-600 dark:text-gray-400">ΗΜΕΡΟΜΗΝΙΕΣ</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              <Field k="Έναρξη *">
                <input type="date" className={input} value={d.StartDate}
                  onChange={e => set('StartDate', e.target.value)} />
              </Field>
              <Field k="Λήξη *">
                <input type="date" className={input} value={d.EndDate}
                  onChange={e => set('EndDate', e.target.value)} />
              </Field>
              <Field k="Προθεσμία δηλώσεων">
                <input type="date" className={input} value={d.RegistrationDeadline}
                  onChange={e => set('RegistrationDeadline', e.target.value)} />
              </Field>
            </div>
          </section>

          {/* ── Τόπος ── */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold tracking-wider text-gray-600 dark:text-gray-400">ΤΟΠΟΣ</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              <Field k="Πόλη">
                <input className={input} value={d.City} onChange={e => set('City', e.target.value)} />
              </Field>
              <Field k="Χώρος">
                <input className={input} value={d.Venue} onChange={e => set('Venue', e.target.value)} />
              </Field>
              <Field k="Φιλοξενία">
                <input className={input} value={d.HostedBy} onChange={e => set('HostedBy', e.target.value)} />
              </Field>
            </div>
          </section>

          {/* ── Περιγραφή ── */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold tracking-wider text-gray-600 dark:text-gray-400">ΠΕΡΙΓΡΑΦΗ</h3>
            {/* Ο ΙΔΙΟΣ επεξεργαστής με τα μπλοκ κειμένου της μαζικής
                αποστολής — έντονα, πλάγια, υπογράμμιση, επικεφαλίδες, λίστες,
                σύνδεσμος, στοίχιση. Δεν φτιάχτηκε δεύτερος: μία γραμμή
                εργαλείων σημαίνει μία συμπεριφορά να συντηρηθεί, και η
                περιγραφή καθαρίζεται με την ίδια λίστα ετικετών. */}
            <Field k="Ελληνικά">
              <CampaignRichText value={d.Description}
                onChange={html => set('Description', html)}
                placeholder="Η πρόσκληση προς τα μέλη…" />
            </Field>
            <Field k="Αγγλικά">
              <CampaignRichText value={d.DescriptionEn}
                onChange={html => set('DescriptionEn', html)}
                placeholder="English version (optional)…" />
            </Field>
          </section>

          {/* ── Ιδιότητες ── */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold tracking-wider text-gray-600 dark:text-gray-400">
              ΠΟΙΟΙ ΜΠΟΡΟΥΝ ΝΑ ΔΗΛΩΣΟΥΝ
            </h3>
            <CapacityPicker value={d.Capacities} onChange={v => set('Capacities', v)}
              note="Κενό = μόνο μέλη CforC. Αυτή είναι η ασφαλής προεπιλογή του κώδικα." />
          </section>

          {/* ── Συνεδρίες ── */}
          <section className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-xs font-bold tracking-wider text-gray-600 dark:text-gray-400">
                ΣΥΝΕΔΡΙΕΣ ({d.Sessions.length})
              </h3>
              <button type="button" onClick={addSession} className={`ml-auto ${ghost}`}>+ Συνεδρία</button>
            </div>
            {d.Sessions.map((s, i) => (
              <Card key={i} title={`Συνεδρία ${i + 1}`}
                onRemove={() => set('Sessions', d.Sessions.filter((_, n) => n !== i))}>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field k="Τίτλος *">
                    <input className={input} value={s.Title}
                      onChange={e => patchSession(i, { Title: e.target.value })} />
                  </Field>
                  <Field k="Υπότιτλος">
                    <input className={input} value={s.Subtitle}
                      onChange={e => patchSession(i, { Subtitle: e.target.value })} />
                  </Field>
                  <Field k="Έναρξη *">
                    <input type="datetime-local" className={input} value={s.StartsAt}
                      onChange={e => patchSession(i, { StartsAt: e.target.value })} />
                  </Field>
                  <Field k="Λήξη">
                    <input type="datetime-local" className={input} value={s.EndsAt}
                      onChange={e => patchSession(i, { EndsAt: e.target.value })} />
                  </Field>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-charcoal dark:text-gray-200">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={s.AllowInPerson}
                      onChange={e => patchSession(i, { AllowInPerson: e.target.checked })} />
                    Δια ζώσης
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={s.AllowOnline}
                      onChange={e => patchSession(i, { AllowOnline: e.target.checked })} />
                    Διαδικτυακά
                  </label>
                </div>
                <CapacityPicker value={s.VisibleFor} onChange={v => patchSession(i, { VisibleFor: v })}
                  note="Κενό = ορατή σε όλους" />
              </Card>
            ))}
          </section>

          {/* ── Μπλοκ logistics ── */}
          <section className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-xs font-bold tracking-wider text-gray-600 dark:text-gray-400">
                ΕΡΩΤΗΣΕΙΣ ΦΟΡΜΑΣ ({d.Options.length})
              </h3>
              <button type="button" onClick={addOption} disabled={usedKeys.size >= OPTION_KEYS.length}
                className={`ml-auto ${ghost} disabled:opacity-40`}>+ Ερώτηση</button>
            </div>
            {d.Options.map((o, i) => (
              <Card key={i} title={o.Key ? OPTION_KEY_LABELS[o.Key] : `Ερώτηση ${i + 1}`}
                onRemove={() => set('Options', d.Options.filter((_, n) => n !== i))}>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field k="Είδος *">
                    <select className={input} value={o.Key}
                      onChange={e => patchOption(i, { Key: e.target.value as OptionKey })}>
                      <option value="">— διάλεξε —</option>
                      {OPTION_KEYS.map(k => (
                        <option key={k} value={k} disabled={usedKeys.has(k) && k !== o.Key}>
                          {OPTION_KEY_LABELS[k]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field k="Τίτλος *">
                    <input className={input} value={o.Title}
                      onChange={e => patchOption(i, { Title: e.target.value })} />
                  </Field>
                </div>
                <Field k="Επεξήγηση">
                  <textarea rows={2} className={input} value={o.Description}
                    onChange={e => patchOption(i, { Description: e.target.value })} />
                </Field>
                <Field k="Επιλογές"
                  note="Μία ανά γραμμή, στη μορφή «τιμή | ετικέτα». Η ΤΙΜΗ αποθηκεύεται στις δηλώσεις — μην την αλλάξεις σε επιλογή που χρησιμοποιείται ήδη. Κενό = ελεύθερο κείμενο.">
                  <textarea rows={3} className={input} value={o.Choices}
                    onChange={e => patchOption(i, { Choices: e.target.value })} />
                </Field>
                <label className="flex items-center gap-2 text-sm text-charcoal dark:text-gray-200">
                  <input type="checkbox" checked={o.Required}
                    onChange={e => patchOption(i, { Required: e.target.checked })} />
                  Υποχρεωτική
                </label>
                <CapacityPicker value={o.VisibleFor} onChange={v => patchOption(i, { VisibleFor: v })}
                  note="Κενό = ορατή σε όλους" />
              </Card>
            ))}
          </section>

          {/* ── Ανοιχτή πρόσκληση ── */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold tracking-wider text-gray-600 dark:text-gray-400">
              ΑΝΟΙΧΤΗ ΠΡΟΣΚΛΗΣΗ
            </h3>
            <p className={hint}>Άφησε τον τίτλο και την ερώτηση κενά αν η δράση δεν έχει ανοιχτή πρόσκληση.</p>
            {(() => {
              const oc = d.OpenCall
              const p = (patch: Partial<Draft['OpenCall']>) => set('OpenCall', { ...oc, ...patch })
              return (
                <div className="rounded-2xl border border-gray-200 dark:border-gray-600 p-4 space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field k="Τίτλος">
                      <input className={input} value={oc.Title} onChange={e => p({ Title: e.target.value })} />
                    </Field>
                    <Field k="Ερώτηση προς το μέλος">
                      <input className={input} value={oc.Question} onChange={e => p({ Question: e.target.value })} />
                    </Field>
                  </div>
                  <Field k="Εισαγωγή">
                    <textarea rows={3} className={input} value={oc.Intro} onChange={e => p({ Intro: e.target.value })} />
                  </Field>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field k="Χρονικά πλαίσια" note="Μία επιλογή ανά γραμμή">
                      <textarea rows={3} className={input} value={oc.TimeSlots}
                        onChange={e => p({ TimeSlots: e.target.value })} />
                    </Field>
                    <Field k="Είδη δράσης" note="Μία επιλογή ανά γραμμή">
                      <textarea rows={3} className={input} value={oc.TypeOptions}
                        onChange={e => p({ TypeOptions: e.target.value })} />
                    </Field>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <Field k="Ετικέτα δωρεάν">
                      <input className={input} value={oc.FreeTypeLabel}
                        onChange={e => p({ FreeTypeLabel: e.target.value })} />
                    </Field>
                    <Field k="Προθεσμία">
                      <input type="date" className={input} value={oc.Deadline}
                        onChange={e => p({ Deadline: e.target.value })} />
                    </Field>
                    <Field k="Email επικοινωνίας">
                      <input className={input} value={oc.ContactEmail}
                        onChange={e => p({ ContactEmail: e.target.value })} />
                    </Field>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-charcoal dark:text-gray-200">
                    <input type="checkbox" checked={oc.CollectInForm}
                      onChange={e => p({ CollectInForm: e.target.checked })} />
                    Συμπληρώνεται μέσα στη φόρμα δήλωσης
                  </label>
                  <CapacityPicker value={oc.VisibleFor} onChange={v => p({ VisibleFor: v })}
                    note="Κενό = ορατή σε όλους" />
                </div>
              )
            })()}
          </section>

          {/* ── Υλικό ── */}
          <section className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-xs font-bold tracking-wider text-gray-600 dark:text-gray-400">
                ΥΛΙΚΟ ({d.Resources.length})
              </h3>
              <button type="button" className={`ml-auto ${ghost}`}
                onClick={() => set('Resources', [...d.Resources, { Label: '', Url: '' }])}>
                + Υλικό
              </button>
            </div>
            <p className={hint}>Σύνδεσμοι. Για ανέβασμα αρχείου, το πεδίο File μένει στο Strapi.</p>
            {d.Resources.map((r, i) => (
              <Card key={i} title={`Υλικό ${i + 1}`}
                onRemove={() => set('Resources', d.Resources.filter((_, n) => n !== i))}>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field k="Ετικέτα *">
                    <input className={input} value={r.Label}
                      onChange={e => set('Resources', d.Resources.map((x, n) => n === i ? { ...x, Label: e.target.value } : x))} />
                  </Field>
                  <Field k="Σύνδεσμος *" note="Ξεκινά με https://">
                    <input className={input} value={r.Url}
                      onChange={e => set('Resources', d.Resources.map((x, n) => n === i ? { ...x, Url: e.target.value } : x))} />
                  </Field>
                </div>
              </Card>
            ))}
          </section>

          {/* ── Συναίνεση & διατήρηση ── */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold tracking-wider text-gray-600 dark:text-gray-400">
              ΣΥΝΑΙΝΕΣΗ & ΔΙΑΤΗΡΗΣΗ
            </h3>
            <Field k="Κείμενο συναίνεσης" note="Αποθηκεύεται μαζί με κάθε δήλωση — αλλαγή εδώ δεν αγγίζει τις παλιές.">
              <textarea rows={3} className={input} value={d.ConsentText}
                onChange={e => set('ConsentText', e.target.value)} />
            </Field>
            <div className="grid sm:grid-cols-3 gap-4">
              <Field k="Έκδοση συναίνεσης">
                <input className={input} value={d.ConsentVersion}
                  onChange={e => set('ConsentVersion', e.target.value)} />
              </Field>
              <Field k="Διατήρηση (μήνες)" note="Κενό = 12">
                <input type="number" min={1} max={120} className={input} value={d.PersonalDataMonths}
                  onChange={e => set('PersonalDataMonths', e.target.value)} />
              </Field>
              <Field k="Διαγραφή διατροφικών (ημέρες)" note="Κενό = 0">
                <input type="number" min={0} max={365} className={input} value={d.DietaryPurgeDays}
                  onChange={e => set('DietaryPurgeDays', e.target.value)} />
              </Field>
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 flex items-center gap-3 px-6 sm:px-8 py-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-600 rounded-b-3xl">
          <button type="button" onClick={onClose} className={ghost}>Ακύρωση</button>
          <button type="button" onClick={save} disabled={busy}
            className="ml-auto px-5 py-2.5 rounded-full text-sm font-bold bg-coral text-charcoal hover:bg-coral/90 disabled:opacity-50">
            {busy ? 'Αποθήκευση…' : documentId ? 'Αποθήκευση αλλαγών' : 'Δημιουργία δράσης'}
          </button>
        </div>
      </div>
    </div>
  )
}
