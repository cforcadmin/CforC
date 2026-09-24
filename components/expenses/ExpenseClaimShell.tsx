'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import SignaturePad from '@/components/expenses/SignaturePad'
import CityField from '@/components/expenses/CityField'
import MemberPicker from '@/components/expenses/MemberPicker'
import CforcLoader from '@/components/apply/CforcLoader'
import ExpenseGuideModal from '@/components/expenses/ExpenseGuideModal'
import { useAuth } from '@/components/AuthProvider'
import {
  EVENT_TYPES, EVENT_NEEDS_NAME, EXPENSE_CATEGORIES, RECEIPT_TYPES, receiptSpec,
  BANKS, BANK_OTHER, TRAVEL_MODES, buildReturnLegs, allLegs, missingTravelLines, computeTotals, eventDays,
  ibanLooksValid, validateClaim, type ClaimLine, type TravelLeg,
} from '@/lib/expenseClaims'

/**
 * Εξοδολόγιο — η φόρμα που αντικαθιστά το αρχείο Word.
 *
 * Το ονοματεπώνυμο έρχεται από τη συνεδρία και ΔΕΝ αλλάζει: ο server το
 * ξαναδιαβάζει από τη βάση, οπότε δεν υπάρχει λόγος να το επεξεργάζεται
 * κανείς εδώ. Οι κανόνες (ποια πεδία, ποια παραστατικά, τι είναι έγκυρο)
 * ζουν στο lib/expenseClaims και είναι οι ΙΔΙΟΙ με του server.
 */

type Draft = Omit<ClaimLine, 'files'> & { file1: File | null; file2: File | null }

const emptyLine = (): Draft => ({
  category: 'Ταξίδι', receiptType: '', description: '', date: '', dateEnd: '', amount: 0,
  file1: null, file2: null,
})

const money = (n: number) => n.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function ExpenseClaimShell() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  const [prefill, setPrefill] = useState<{ name: string; email: string; phone: string; bankName: string; accountHolder: string; iban: string } | null>(null)
  const [phone, setPhone] = useState('')
  const [eventType, setEventType] = useState<string>('')
  const [eventName, setEventName] = useState('')
  const [eventStart, setEventStart] = useState('')
  const [eventEnd, setEventEnd] = useState('')
  const [legs, setLegs] = useState<TravelLeg[]>([{ from: '', to: '', mode: '', direction: 'outbound' }])
  const [returnIncluded, setReturnIncluded] = useState(true)
  const [coTravellers, setCoTravellers] = useState<string[]>([])
  const [memberNames, setMemberNames] = useState<string[]>([])
  const [lines, setLines] = useState<Draft[]>([emptyLine()])
  const [advance, setAdvance] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountHolder, setAccountHolder] = useState('')
  const [iban, setIban] = useState('')
  const [bankOther, setBankOther] = useState(false)
  const [rememberBank, setRememberBank] = useState(true)
  const [signature, setSignature] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [showGuide, setShowGuide] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ claimNumber: string; payable: number } | null>(null)

  useEffect(() => {
    if (!isAuthenticated) return
    fetch('/api/expenses/claim')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d?.member) return
        setPrefill(d.member)
        if (Array.isArray(d.members)) setMemberNames(d.members)
        setPhone(d.member.phone || '')
        setBankName(d.member.bankName || '')
        setAccountHolder(d.member.accountHolder || d.member.name || '')
        setIban(d.member.iban || '')
      })
      .catch(() => { /* σιωπηλά — τα πεδία μένουν κενά */ })
  }, [isAuthenticated])

  // Μετά την επιτυχία, το μέλος γυρίζει στη λίστα των εξοδολογίων του: εκεί
  // βλέπει τη νέα εγγραφή και τα έγγραφά της. Ο χρόνος φτάνει για να
  // διαβαστεί ο αριθμός — και υπάρχει και κουμπί για όποιον βιάζεται.
  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => router.push('/profile#expenses'), 5000)
    return () => clearTimeout(t)
  }, [done, router])

  const days = eventDays(eventStart, eventEnd)
  const returnPreview = useMemo(() => buildReturnLegs(legs), [legs])
  // Υπόδειξη, όχι κανόνας: ποια σκέλη της διαδρομής δεν έχουν ακόμη έξοδο
  const missingLegs = useMemo(
    () => missingTravelLines(allLegs(legs, returnIncluded), lines),
    [legs, returnIncluded, lines],
  )
  const totals = useMemo(
    () => computeTotals(lines.map(l => ({ ...l, amount: Number(l.amount) || 0, files: [] })), Number(advance) || 0),
    [lines, advance],
  )

  function patchLeg(i: number, changes: Partial<TravelLeg>) {
    setLegs(prev => prev.map((l, idx) => (idx === i ? { ...l, ...changes } : l)))
  }

  /** Ίδιο είδος παραστατικού, καθαρά ποσά και αρχεία — για το δεύτερο εισιτήριο */
  function duplicateLine(i: number) {
    setLines(prev => {
      const src = prev[i]
      const copy: Draft = { ...emptyLine(), category: src.category, receiptType: src.receiptType }
      return [...prev.slice(0, i + 1), copy, ...prev.slice(i + 1)]
    })
  }

  /** Γραμμή για σκέλος που λείπει, με το μέσο και τη διαδρομή συμπληρωμένα */
  function addLineForLeg(leg: { from: string; to: string; mode: string }) {
    setLines(prev => [...prev, {
      ...emptyLine(), category: 'Ταξίδι', receiptType: leg.mode,
      description: `${leg.from} → ${leg.to}`,
    }])
  }

  function patch(i: number, changes: Partial<Draft>) {
    setLines(prev => prev.map((l, idx) => (idx === i ? { ...l, ...changes } : l)))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const payload = {
      phone,
      eventType, eventName, eventStart, eventEnd,
      travelLegs: legs, returnIncluded, coTravellers: coTravellers.join(', '),
      advance: Number(advance) || 0,
      bankName, accountHolder, iban, rememberBank,
      signature, notes,
      lines: lines.map(l => ({
        category: l.category, receiptType: l.receiptType, description: l.description,
        date: l.date, dateEnd: l.dateEnd || undefined, amount: Number(l.amount) || 0,
        files: [
          ...(l.file1 ? [{ slot: 1 as const, name: l.file1.name, size: l.file1.size }] : []),
          ...(l.file2 ? [{ slot: 2 as const, name: l.file2.name, size: l.file2.size }] : []),
        ],
      })),
    }
    const problem = validateClaim(payload as any)
    if (problem) { setError(problem); return }

    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('data', JSON.stringify(payload))
      lines.forEach((l, i) => {
        if (l.file1) fd.append(`file-${i}-1`, l.file1)
        if (l.file2) fd.append(`file-${i}-2`, l.file2)
      })
      const res = await fetch('/api/expenses/claim', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Αποτυχία υποβολής')
      setDone({ claimNumber: data.claimNumber, payable: data.payable })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err: any) {
      setError(err?.message || 'Κάτι πήγε στραβά — δοκίμασε ξανά')
    } finally {
      setBusy(false)
    }
  }

  // ── Οθόνες εκτός φόρμας ────────────────────────────────────────
  if (isLoading) {
    return (
      <Page><p className="text-gray-500 dark:text-gray-400 text-center py-20">Φόρτωση…</p></Page>
    )
  }
  if (!isAuthenticated) {
    return (
      <Page>
        <div className="max-w-lg mx-auto text-center py-16">
          <h1 className="text-3xl font-bold text-charcoal dark:text-coral mb-4">ΕΞΟΔΟΛΟΓΙΟ</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            Η υποβολή εξοδολογίου γίνεται μόνο από συνδεδεμένα μέλη — έτσι ξέρουμε με βεβαιότητα
            ποιος υποβάλλει και δεν χρειάζεται να συμπληρώσεις ξανά τα στοιχεία σου.
          </p>
          <Link href="/login?redirect=/expenses"
            className="inline-block bg-coral text-white font-bold rounded-full px-8 py-3 hover:bg-coral/90 transition-colors">
            Σύνδεση
          </Link>
        </div>
      </Page>
    )
  }
  if (done) {
    return (
      <Page>
        <div className="max-w-lg mx-auto text-center py-16">
          <div className="w-20 h-20 rounded-full bg-coral/10 dark:bg-coral/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-coral dark:text-coral-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-charcoal dark:text-coral mb-4">Το εξοδολόγιο υποβλήθηκε!</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-2">
            Αριθμός: <span className="font-bold notranslate">{done.claimNumber}</span>
          </p>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            Πληρωτέο ποσό: <span className="font-bold notranslate">{money(done.payable)} €</span>
          </p>
          <Link href="/profile#expenses" className="inline-block bg-coral text-white font-bold rounded-full px-8 py-3 hover:bg-coral/90 transition-colors">
            Τα εξοδολόγιά μου
          </Link>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            Σε λίγο θα μεταφερθείς εκεί αυτόματα.
          </p>
        </div>
      </Page>
    )
  }

  const memberName = prefill?.name || user?.Name || ''

  return (
    <Page>
      {/* Η υποβολή φτιάχνει PDF, ανεβάζει παραστατικά στο Drive και στέλνει
          email — μπορεί να κρατήσει. Ο loader λέει ρητά «μην ανανεώσεις». */}
      {busy && (
        <CforcLoader
          label="Υποβολή εξοδολογίου"
          note={<>Μπορεί να πάρει 1-2 λεπτά να ολοκληρωθεί η υποβολή.<br /><strong>ΜΗΝ επαναφορτώσεις τη σελίδα!</strong><br />Περίμενε μέχρι να σου βγάλει μήνυμα επιτυχίας. Ευχαριστούμε :-)</>}
        />
      )}
      <form onSubmit={submit} className="max-w-3xl mx-auto space-y-10">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl md:text-4xl font-bold text-charcoal dark:text-coral">ΕΞΟΔΟΛΟΓΙΟ</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Κάλυψη εξόδων μετακίνησης, διαμονής και διατροφής για δράσεις του δικτύου.
              Κάθε έξοδο χρειάζεται το παραστατικό του.
            </p>
          </div>
          <button type="button" onClick={() => setShowGuide(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-coral text-coral dark:text-coral-light font-bold text-sm hover:bg-coral hover:text-white transition-colors whitespace-nowrap">
            <span aria-hidden="true">📄</span> Οδηγίες συμπλήρωσης
          </button>
        </header>
        <ExpenseGuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />

        {/* ── Στοιχεία μέλους ── */}
        <Card title="Τα στοιχεία σου">
          <Field label="Ονοματεπώνυμο">
            <input type="text" value={memberName} readOnly disabled
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 px-4 py-2.5 text-charcoal dark:text-gray-200 cursor-not-allowed" />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Από το προφίλ σου — δεν αλλάζει.
            </p>
          </Field>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
            <Field label="Email">
              <input type="email" value={prefill?.email || user?.Email || ''} readOnly disabled
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 px-4 py-2.5 text-charcoal dark:text-gray-200 cursor-not-allowed" />
            </Field>
            <Field label="Τηλέφωνο">
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="69…"
                className={inputClass} />
            </Field>
          </div>
        </Card>

        {/* ── Αφορμή ── */}
        <Card title="Για ποια δράση">
          <Field label="Αφορμή μετακίνησης" required>
            <select value={eventType} onChange={e => { setEventType(e.target.value); setEventName('') }} className={inputClass}>
              <option value="">— διάλεξε —</option>
              {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          {EVENT_NEEDS_NAME.includes(eventType as any) && (
            <Field label={eventType === 'Project' ? 'Ποιο project;' : 'Ποια δράση;'} required>
              <input type="text" value={eventName} onChange={e => setEventName(e.target.value)} className={inputClass} />
            </Field>
          )}
          <div className="grid sm:grid-cols-3 gap-x-6 gap-y-5 items-end">
            <Field label="Από" required tip="Οι ημερομηνίες της ΔΡΑΣΗΣ, όχι των εξόδων σου. Αν ταξίδεψες μια μέρα νωρίτερα, το έξοδο μπαίνει με τη δική του ημερομηνία πιο κάτω.">
              <input type="date" value={eventStart} onChange={e => setEventStart(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Έως" required>
              <input type="date" value={eventEnd} min={eventStart || undefined} onChange={e => setEventEnd(e.target.value)} className={inputClass} />
            </Field>
            <div className="pb-2">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Διάρκεια: <span className="font-bold notranslate">{days ? `${days} ${days === 1 ? 'ημέρα' : 'ημέρες'}` : '—'}</span>
              </p>
            </div>
          </div>
        </Card>

        {/* ── Μετακίνηση ── */}
        <Card title="Μετακίνηση">
          <div className="space-y-5">
            {legs.map((leg, i) => (
              <div key={i} className="grid sm:grid-cols-[1fr_1fr_1fr_auto] gap-x-5 gap-y-4 items-end">
                <Field label={i === 0 ? 'Από' : 'Έπειτα από'}>
                  <CityField value={leg.from} onChange={v => patchLeg(i, { from: v })} placeholder="π.χ. Θεσσαλονίκη" />
                </Field>
                <Field label="Προς">
                  <CityField value={leg.to} onChange={v => patchLeg(i, { to: v })} placeholder="π.χ. Πάτρα" />
                </Field>
                <Field label="Μέσο" tip="Με τι έγινε αυτό το σκέλος. Το ίδιο θα ανεβάσεις και ως παραστατικό — και η φόρμα θα σου θυμίσει αν λείπει.">
                  <select value={leg.mode} onChange={e => patchLeg(i, { mode: e.target.value })} className={inputClass}>
                    <option value="">— διάλεξε —</option>
                    {TRAVEL_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </Field>
                <div className="pb-2.5">
                  {legs.length > 1 && (
                    <button type="button" onClick={() => setLegs(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-xs font-bold text-coral dark:text-coral-light hover:underline whitespace-nowrap">
                      Αφαίρεση
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button type="button"
            onClick={() => setLegs(prev => [...prev, { from: prev[prev.length - 1]?.to || '', to: '', mode: '', direction: 'outbound' }])}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-coral text-coral dark:text-coral-light font-bold text-sm hover:bg-coral hover:text-white transition-colors">
            + Ενδιάμεση στάση
          </button>

          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={returnIncluded} onChange={e => setReturnIncluded(e.target.checked)}
              className="mt-1 w-4 h-4 text-coral rounded focus:ring-coral" />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Περιλαμβάνεται και η επιστροφή. Συμπληρώνεται μόνη της, ανάποδα από τη διαδρομή που έγραψες —
              ξετσέκαρέ το αν γύρισες από αλλού ή με άλλο μέσο, και πρόσθεσε τα σκέλη με το χέρι.
            </span>
          </label>

          {returnIncluded && returnPreview.length > 0 && (
            <div className="rounded-2xl bg-[#F5F0EB] dark:bg-gray-700 p-4">
              <p className="text-xs font-bold tracking-wide text-gray-500 dark:text-gray-400 mb-2">ΕΠΙΣΤΡΟΦΗ ΠΟΥ ΘΑ ΚΑΤΑΓΡΑΦΕΙ</p>
              <ul className="space-y-1">
                {returnPreview.map((l, i) => (
                  <li key={i} className="text-sm text-charcoal dark:text-gray-200">
                    {l.from} → {l.to}{l.mode ? ` · ${l.mode}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Field label="Μετακίνηση μαζί με μέλη" tip="Ποια μέλη ταξίδεψαν μαζί σου. Έτσι φαίνεται ότι ένα έξοδο — π.χ. βενζίνη ή διόδια — κάλυψε περισσότερους από έναν.">
            <MemberPicker value={coTravellers} onChange={setCoTravellers} options={memberNames} />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Γράψε τα πρώτα γράμματα και διάλεξε από το μητρώο. Μπορείς να προσθέσεις και όνομα
              εκτός δικτύου — γράψ' το και πάτα Enter.
            </p>
          </Field>
        </Card>

        {/* ── Έξοδα ── */}
        <Card title="Τα έξοδα">
          <div className="space-y-6">
            {lines.map((line, i) => {
              const spec = receiptSpec(line.category, line.receiptType)
              return (
                <div key={i} className="rounded-2xl border border-gray-200 dark:border-gray-600 p-5 sm:p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold tracking-wide text-gray-500 dark:text-gray-400">ΕΞΟΔΟ {i + 1}</span>
                    <span className="flex items-center gap-4">
                      {line.receiptType && (
                        <button type="button" onClick={() => duplicateLine(i)}
                          title="Ίδιο είδος παραστατικού, κενά ποσό και αρχεία"
                          className="text-xs font-bold text-coral dark:text-coral-light hover:underline">
                          + Ακόμη ένα ίδιο
                        </button>
                      )}
                      {lines.length > 1 && (
                        <button type="button" onClick={() => setLines(prev => prev.filter((_, idx) => idx !== i))}
                          className="text-xs font-bold text-coral dark:text-coral-light hover:underline">Αφαίρεση</button>
                      )}
                    </span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
                    <Field label="Κατηγορία" required>
                      <select value={line.category} onChange={e => patch(i, { category: e.target.value, receiptType: '' })} className={inputClass}>
                        {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </Field>
                    <Field label="Είδος παραστατικού" required>
                      <select value={line.receiptType} onChange={e => patch(i, { receiptType: e.target.value, file2: null })} className={inputClass}>
                        <option value="">— διάλεξε —</option>
                        {RECEIPT_TYPES[line.category as keyof typeof RECEIPT_TYPES].map(r => (
                          <option key={r.label} value={r.label}>{r.label}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
                    <Field label="Έναρξη" required>
                      <input type="date" value={line.date} onChange={e => patch(i, { date: e.target.value })} className={inputClass} />
                    </Field>
                    <Field label="Ολοκλήρωση" tip="Για έξοδα που κρατούν μέρες — π.χ. ξενοδοχείο 3 βραδιών ή ενοικίαση αυτοκινήτου. Άφησέ το κενό αν το έξοδο αφορά μία μέρα.">
                      <input type="date" value={line.dateEnd || ''} min={line.date || undefined}
                        onChange={e => patch(i, { dateEnd: e.target.value })} className={inputClass} />
                    </Field>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
                    <Field label="Ποσό (€)" required>
                      <input type="number" step="0.01" min="0" value={line.amount || ''} onChange={e => patch(i, { amount: Number(e.target.value) })} className={inputClass} />
                    </Field>
                    <Field label="Περιγραφή" tip="Τι ακριβώς κάλυψε το έξοδο, με δυο λέξεις: «βενζίνη Αθήνα–Ιωάννινα», «δύο διανυκτερεύσεις», «γεύμα ομάδας». Βοηθά τα Οικονομικά να αναγνωρίσουν τη δαπάνη χωρίς να ανοίξουν το παραστατικό.">
                      <input type="text" value={line.description} onChange={e => patch(i, { description: e.target.value })} className={inputClass} />
                    </Field>
                  </div>
                  <Field label={spec?.pair ? `Αρχείο 1 — ${spec.pair.first}` : 'Παραστατικό'} required>
                    <input type="file" accept="application/pdf,image/*" onChange={e => patch(i, { file1: e.target.files?.[0] || null })} className={fileClass} />
                  </Field>
                  {spec?.pair && (
                    <Field label={`Αρχείο 2 — ${spec.pair.second}`} required>
                      <input type="file" accept="application/pdf,image/*" onChange={e => patch(i, { file2: e.target.files?.[0] || null })} className={fileClass} />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Φωτογραφία ή στιγμιότυπο από το κινητό είναι μια χαρά.
                      </p>
                    </Field>
                  )}
                </div>
              )
            })}
          </div>
          {missingLegs.length > 0 && (
            <div className="mt-5 rounded-2xl bg-[#F5F0EB] dark:bg-gray-700 p-4">
              <p className="text-sm text-charcoal dark:text-gray-200">
                Η διαδρομή σου έχει σκέλη χωρίς έξοδο. Αν πλήρωσες εσύ, πρόσθεσέ τα με ένα κλικ:
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {missingLegs.map((leg, i) => (
                  <button key={`${leg.from}-${leg.to}-${i}`} type="button" onClick={() => addLineForLeg(leg)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-coral text-coral dark:text-coral-light text-sm font-bold hover:bg-coral hover:text-white transition-colors">
                    + {leg.from} → {leg.to} · {leg.mode}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                Αγνόησέ το αν το πλήρωσε κάποιος άλλος ή αν ένα παραστατικό καλύπτει και τις δύο κατευθύνσεις.
              </p>
            </div>
          )}

          <button type="button" onClick={() => setLines(prev => [...prev, emptyLine()])}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-coral text-coral dark:text-coral-light font-bold text-sm hover:bg-coral hover:text-white transition-colors">
            + Προσθήκη εξόδου
          </button>
        </Card>

        {/* ── Σύνολα ── */}
        <Card title="Σύνολα">
          <Field label="Προκαταβολή / μετρητά που έχεις ήδη λάβει (€)" tip="Μόνο αν είχες πάρει χρήματα ΠΡΙΝ από τη δράση. Αφαιρείται από το σύνολο, και το «πληρωτέο» που μένει είναι αυτό που θα κατατεθεί στον λογαριασμό σου.">
            <input type="number" step="0.01" min="0" value={advance} onChange={e => setAdvance(e.target.value)} placeholder="0,00" className={inputClass} />
          </Field>
          <div className="rounded-2xl bg-[#F5F0EB] dark:bg-gray-700 p-5 space-y-2">
            <Row label="Σύνολο εξόδων" value={`${money(totals.total)} €`} />
            <Row label="Προκαταβολή" value={`− ${money(totals.advance)} €`} />
            <div className="border-t border-gray-300 dark:border-gray-600 pt-2">
              <Row label="Πληρωτέο" value={`${money(totals.payable)} €`} strong />
            </div>
          </div>
        </Card>

        {/* ── Τραπεζικά ── */}
        <Card title="Πού θα γίνει η κατάθεση">
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
            <Field label="Τράπεζα">
              <select
                value={BANKS.includes(bankName as any) ? bankName : (bankName || bankOther ? BANK_OTHER : '')}
                onChange={e => {
                  if (e.target.value === BANK_OTHER) { setBankOther(true); setBankName('') }
                  else { setBankOther(false); setBankName(e.target.value) }
                }}
                className={inputClass}
              >
                <option value="">— διάλεξε —</option>
                {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                <option value={BANK_OTHER}>{BANK_OTHER}</option>
              </select>
              {bankOther && (
                <input type="text" value={bankName} onChange={e => setBankName(e.target.value)}
                  placeholder="Γράψε την τράπεζα" className={`${inputClass} mt-2`} />
              )}
            </Field>
            <Field label="Όνομα δικαιούχου" required tip="Το όνομα όπως ακριβώς το έχει η τράπεζα στον λογαριασμό — αν διαφέρει από το δικό σου (π.χ. κοινός λογαριασμός), γράψε αυτό της τράπεζας."><input type="text" value={accountHolder} onChange={e => setAccountHolder(e.target.value)} className={inputClass} /></Field>
          </div>
          <Field label="IBAN" required>
            <input type="text" value={iban} onChange={e => setIban(e.target.value)} placeholder="GR…" className={`${inputClass} notranslate font-mono`} />
            {iban && !ibanLooksValid(iban) && (
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">Το IBAN δεν περνάει τον έλεγχο — τσέκαρε μήπως λείπει ή περισσεύει χαρακτήρας.</p>
            )}
          </Field>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={rememberBank} onChange={e => setRememberBank(e.target.checked)}
              className="mt-1 w-4 h-4 text-coral rounded focus:ring-coral" />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Να θυμάμαι αυτά τα στοιχεία για την επόμενη φορά. Αποθηκεύονται στο προφίλ σου και δεν
              δημοσιεύονται πουθενά.
            </span>
          </label>
        </Card>

        {/* ── Υπογραφή ── */}
        <Card title="Υπογραφή">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            Η υποβολή γίνεται από τον λογαριασμό σου και καταγράφεται με ημερομηνία και ώρα — αυτό
            επέχει θέση υπογραφής. Αν θέλεις, σχεδίασε και την υπογραφή σου για το αρχείο.
          </p>
          <SignaturePad onChange={setSignature} />
          <Field label="Σχόλια" tip="Ό,τι χρειάζεται να ξέρουν τα Οικονομικά και δεν φαίνεται αλλού: π.χ. «η βενζίνη καλύπτει και τις δύο κατευθύνσεις» ή «λείπει η απόδειξη του ταξί, ζητήθηκε αντίγραφο».">
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inputClass} />
          </Field>
        </Card>

        {error && (
          <div className="rounded-2xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4">
            <p className="text-sm font-bold text-charcoal dark:text-gray-100">{error}</p>
          </div>
        )}

        <div className="flex justify-end pb-4">
          <button type="submit" disabled={busy}
            className="bg-coral text-white font-bold rounded-full px-8 py-4 hover:bg-coral/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {busy ? 'Υποβολή…' : `Υποβολή εξοδολογίου — ${money(totals.payable)} €`}
          </button>
        </div>
      </form>
    </Page>
  )
}

// ── Μικρά δομικά ──────────────────────────────────────────────────
const inputClass = 'w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-charcoal dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-coral'
const fileClass = 'w-full text-sm py-1 text-gray-600 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-coral/10 file:text-coral dark:file:bg-coral/20 dark:file:text-coral-light hover:file:bg-coral/20 cursor-pointer'

function Page({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900 flex flex-col">
      <Navigation />
      <main id="main-content" className="flex-1 pt-28 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
      </main>
      <Footer />
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 space-y-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-bold text-charcoal dark:text-gray-100 mb-1">{title}</h2>
      {children}
    </section>
  )
}

/**
 * Πεδίο με προαιρετικό σημείωμα «(i)».
 *
 * Το σημείωμα ανοίγει ΜΕΣΑ στη ροή, κάτω από την ετικέτα — όχι ως
 * αιωρούμενο tooltip: στο OC τα αιωρούμενα κόβονταν από τα όρια του
 * pop-up. Ανοίγει με hover, focus και κλικ, ώστε να δουλεύει και στην αφή.
 */
function Field({ label, required, tip, children }: {
  label: string; required?: boolean; tip?: string; children: React.ReactNode
}) {
  // Δύο ΞΕΧΩΡΙΣΤΕΣ καταστάσεις. Με μία, το ποντίκι άνοιγε το σημείωμα στο
  // hover και το κλικ —που έρχεται πάντα μετά— το ξανάκλεινε αμέσως.
  // Τώρα: το hover δείχνει προσωρινά, το κλικ καρφιτσώνει.
  const [pinned, setPinned] = useState(false)
  const [hovered, setHovered] = useState(false)
  const showTip = pinned || hovered
  // useId αντί για slug της ελληνικής ετικέτας: τα ελληνικά σε CSS id
  // δουλεύουν αλλά κάνουν τα selectors εύθραυστα χωρίς κανένα κέρδος
  const tipId = useId()
  return (
    <label className="block">
      <span className="flex items-center gap-2 mb-2">
        <span className="text-sm font-bold text-charcoal dark:text-gray-200">
          {label}{required && <span className="text-coral"> *</span>}
        </span>
        {tip && (
          <button
            type="button"
            // Το κουμπί ζει μέσα σε <label>: χωρίς stopPropagation το κλικ
            // φτάνει στο label, εστιάζει το πεδίο και το blur έκλεινε το
            // σημείωμα την ίδια στιγμή που άνοιγε. Το κλείσιμο γίνεται με
            // δεύτερο κλικ ή όταν φύγει το ποντίκι — όχι με blur.
            onClick={e => { e.preventDefault(); e.stopPropagation(); setPinned(v => !v) }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocus={() => setHovered(true)}
            onBlur={() => setHovered(false)}
            aria-label={`Τι συμπληρώνω στο πεδίο ${label}`}
            aria-expanded={showTip}
            aria-controls={tipId}
            className={`w-5 h-5 shrink-0 rounded-full border border-coral text-[11px] font-bold leading-none flex items-center justify-center transition-colors ${
              showTip ? 'bg-coral text-white' : 'text-coral dark:text-coral-light hover:bg-coral hover:text-white'
            }`}
          >
            i
          </button>
        )}
      </span>
      {tip && showTip && (
        <p id={tipId} className="mb-2 rounded-xl bg-[#F5F0EB] dark:bg-gray-700 px-3 py-2 text-xs leading-relaxed text-charcoal dark:text-gray-200">
          {tip}
        </p>
      )}
      {children}
    </label>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={strong ? 'font-bold text-charcoal dark:text-gray-100' : 'text-gray-600 dark:text-gray-300'}>{label}</span>
      <span className={`notranslate ${strong ? 'text-lg font-bold text-charcoal dark:text-gray-100' : 'text-gray-600 dark:text-gray-300'}`}>{value}</span>
    </div>
  )
}
