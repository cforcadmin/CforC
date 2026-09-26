'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CampaignRichText from './CampaignRichText'

/**
 * Μαζική αποστολή email (Διαχείριση).
 *
 * Η διάταξη, οι κλάσεις και τα κείμενα είναι από το σχέδιο· η διαφορά είναι
 * ότι το σώμα δεν είναι textarea αλλά ΜΠΛΟΚ. Το HTML των email δεν είναι HTML
 * του web, οπότε ελεύθερο κείμενο θα έσπαγε σε Outlook και μια επικόλληση από
 * Word θα έφερνε ξένες γραμματοσειρές. Τα μπλοκ κάνουν το εκτός ταυτότητας
 * αποτέλεσμα αδύνατο.
 *
 * Η προεπισκόπηση ζει σε <iframe>: αλλιώς τα styles της σελίδας θα έβαφαν το
 * γράμμα και θα έδειχνε διαφορετικό απ' ό,τι φτάνει στο inbox.
 */

type Block = Record<string, any> & { type: string }
type Recipient = { email: string; name: string; via: string; am?: number | null }
type Selection = {
  allMembers?: boolean
  paymentStatus?: { year: number; paid: boolean }
  groups?: string[]
  memberDocIds?: string[]
  external?: string[]
}
type Campaign = {
  documentId: string; Subject: string; State: string
  SentCount: number; FailedCount: number; TotalCount: number
  QueuedAt?: string | null; CompletedAt?: string | null; CreatedByName?: string | null
}
type Meta = {
  memberCount: number
  groups: string[]
  blockLabels: Record<string, string>
  blockVariants: Record<string, { key: string; options: Array<{ value: string; label: string }> }>
  presets: Array<{ id: string; label: string; hint: string; blocks: Block[] }>
  mergeFields: Array<{ token: string; label: string; sample: string }>
  dailyBudget: number
  footerStyles?: Array<{ id: string; label: string; hint: string }>
  footerLooks?: Array<{ id: string; label: string; hint: string }>
  headerStyles?: Array<{ id: string; label: string; hint: string }>
  signer?: { name: string; role: string; email: string }
}

const CARD = 'bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6 sm:p-8 border border-gray-200 dark:border-gray-600'
const EYEBROW = 'text-xs font-bold tracking-wider text-gray-600 dark:text-gray-400'
const FIELD = 'w-full min-h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-base'
const CHIP = 'px-3 py-1.5 rounded-full border text-sm min-h-11 sm:min-h-0 inline-flex items-center gap-1.5'
/**
 * Έτοιμα κοινά. Σταθερά στον κώδικα — αν χρειαστεί νέο, μπαίνει εδώ.
 *
 * «Ομάδα Συντονισμού» σημαίνει ΟΛΟΥΣ τους κατόχους εδρών, μαζί με Γραμματεία
 * και IT: ο αποκλεισμός τους αφορούσε την ΨΗΦΟ στις αιτήσεις, όχι το ποιος
 * ενημερώνεται. Η Γραμματεία στηρίζει το ΔΣ και χρειάζεται την πληροφορία.
 */
const AUDIENCES: Array<{ id: string; label: string; hint: string; build: (m: Meta) => Selection }> = [
  {
    id: 'community', label: 'CforC κοινότητα', hint: 'Όλα τα εγγεγραμμένα μέλη',
    build: () => ({ allMembers: true }),
  },
  {
    id: 'board', label: 'Ομάδα Συντονισμού', hint: 'Όσοι κατέχουν έδρα στο ΔΣ',
    build: m => ({ groups: m.groups.filter(g => SEAT_NAMES.includes(g)) }),
  },
  {
    id: 'workgroups', label: 'Ομάδες Εργασίας', hint: 'Μέλη όλων των ομάδων εργασίας',
    build: m => ({ groups: m.groups.filter(g => !SEAT_NAMES.includes(g)) }),
  },
  {
    id: 'unpaid', label: `Απλήρωτοι ${new Date().getFullYear()}`, hint: 'Χωρίς συνδρομή για φέτος',
    build: () => ({ paymentStatus: { year: new Date().getFullYear(), paid: false } }),
  },
]

/** Οι έδρες, ώστε να ξεχωρίζουν από τις ομάδες εργασίας στην ίδια λίστα */
const SEAT_NAMES = ['Συντονισμός', 'Γραμματεία', 'Επικοινωνία', 'IT', 'Κοινότητα', 'Ταμίας', 'Outreach']

/**
 * Οι θυρίδες των εδρών. Μία ανά ρόλο, όχι έτοιμοι συνδυασμοί: ο συνδυασμός
 * που χρειάζεται κάθε φορά είναι διαφορετικός, και τα κουμπιά προστίθενται.
 */
const CC_SEATS: Array<{ label: string; email: string }> = [
  { label: 'Γραμματεία', email: 'hello@cultureforchange.net' },
  { label: 'Επικοινωνία', email: 'communication@cultureforchange.net' },
  { label: 'Κοινότητα', email: 'community@cultureforchange.net' },
  { label: 'Συντονισμός', email: 'coordination@cultureforchange.net' },
  { label: 'Ταμίας', email: 'finance@cultureforchange.net' },
  { label: 'IT', email: 'it@cultureforchange.net' },
  { label: 'Outreach', email: 'outreach@cultureforchange.net' },
]

const STATE_LABELS: Record<string, string> = {
  draft: 'Προσχέδιο', queued: 'Σε ουρά', sending: 'Σε εξέλιξη', sent: 'Ολοκληρώθηκε', cancelled: 'Ακυρώθηκε',
}

export default function OcCampaigns() {
  const [tab, setTab] = useState<'compose' | 'queue'>('compose')
  const [meta, setMeta] = useState<Meta | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const [subject, setSubject] = useState('')
  const [blocks, setBlocks] = useState<Block[]>([])
  const [selection, setSelection] = useState<Selection>({})
  const [cc, setCc] = useState<string[]>([])
  const [footerStyle, setFooterStyle] = useState('signature')
  const [footerLook, setFooterLook] = useState('plain')
  const [footerLogo, setFooterLogo] = useState(false)
  const [headerStyle, setHeaderStyle] = useState('coral')
  const [headerLogo, setHeaderLogo] = useState(false)
  const [resolved, setResolved] = useState<{ count: number; days: number; summary: string; recipients: Recipient[] }>(
    { count: 0, days: 0, summary: '', recipients: [] })
  const [preview, setPreview] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/oc/campaigns', { cache: 'no-store' })
    if (!res.ok) {
      // Το μήνυμα του server, όχι σκέτο «αποτυχία»: το «ανήκει στη Γραμματεία»
      // και το «εσωτερικό σφάλμα» θέλουν εντελώς διαφορετική αντίδραση.
      const d = await res.json().catch(() => null)
      setNotice({ kind: 'err', text: `${d?.error || 'Αποτυχία φόρτωσης'} (${res.status})` })
      setLoading(false); return
    }
    const d = await res.json()
    setMeta(d); setCampaigns(d.campaigns || []); setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  // Οι παραλήπτες ξαναϋπολογίζονται με καθυστέρηση: κάθε τικ σε chip αλλιώς
  // θα χτυπούσε τον server, και η λίστα των μελών δεν είναι μικρή.
  useEffect(() => {
    const t = setTimeout(async () => {
      const res = await fetch('/api/oc/campaigns', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve', selection }),
      })
      if (res.ok) setResolved(await res.json())
    }, 350)
    return () => clearTimeout(t)
  }, [selection])

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!blocks.length && !subject) { setPreview(''); return }
      const res = await fetch('/api/oc/campaigns', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview', subject, blocks, footerStyle, footerLook, footerLogo, headerStyle, headerLogo }),
      })
      if (res.ok) setPreview((await res.json()).html)
    }, 400)
    return () => clearTimeout(t)
  }, [subject, blocks, footerStyle, footerLook, footerLogo, headerStyle, headerLogo])

  /** Κάθε CC μετράει ξανά σε ΚΑΘΕ μήνυμα — γι' αυτό πολλαπλασιάζεται */
  const emailCost = resolved.count * (1 + cc.length)
  const days = meta ? Math.max(1, Math.ceil(emailCost / meta.dailyBudget)) : 1

  const send = async (action: 'save' | 'queue') => {
    setBusy(true); setNotice(null)
    try {
      const res = await fetch('/api/oc/campaigns', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, subject, blocks, selection, cc, footerStyle, footerLook, footerLogo, headerStyle, headerLogo }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || 'Αποτυχία')
      setNotice({
        kind: 'ok',
        text: action === 'queue'
          ? `Μπήκε στην ουρά: ${d.summary}. Η πρώτη παρτίδα φεύγει στις 08:00.`
          : 'Το προσχέδιο αποθηκεύτηκε.',
      })
      setConfirming(false)
      if (action === 'queue') { setTab('queue'); setSubject(''); setBlocks([]); setSelection({}); setCc([]) }
      await load()
    } catch (e: any) {
      setConfirming(false)
      setNotice({ kind: 'err', text: e?.message || 'Αποτυχία' })
    } finally { setBusy(false) }
  }

  if (loading) return <div className="text-sm text-gray-600 dark:text-gray-400">Φόρτωση…</div>

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold text-charcoal dark:text-gray-100">Μαζική αποστολή email</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
            Το μήνυμα φεύγει από το <span translate="no">hello@</span> με την ίδια ακριβώς μορφή που έχουν
            οι αποδείξεις, οι εγκρίσεις και οι υπενθυμίσεις του συστήματος.
          </p>
        </div>
        <div className="flex gap-1 p-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600" role="tablist">
          {(['compose', 'queue'] as const).map(t => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={`px-4 min-h-11 rounded-full text-sm font-semibold ${tab === t ? 'bg-coral text-charcoal' : 'text-gray-600 dark:text-gray-300'}`}>
              {t === 'compose' ? 'Νέο μήνυμα' : `Αποστολές ${campaigns.length ? `(${campaigns.length})` : ''}`}
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <div className={`rounded-2xl px-4 py-3 text-sm ${notice.kind === 'ok'
          ? 'bg-green-50 text-green-900 dark:bg-green-900/30 dark:text-green-200'
          : 'bg-red-50 text-red-900 dark:bg-red-900/30 dark:text-red-200'}`}>{notice.text}</div>
      )}

      {tab === 'queue' ? (
        <QueueView campaigns={campaigns} />
      ) : (
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] items-start">
          <div className="grid gap-6 min-w-0">

            <div className={CARD}>
              <h3 className={`${EYEBROW} mb-4`}>ΜΗΝΥΜΑ</h3>
              <div className="grid gap-4">
                <div className="text-sm flex flex-wrap gap-x-2">
                  <span className="text-gray-600 dark:text-gray-400">Από</span>
                  <span className="font-semibold">Γραμματεία CforC</span>
                  <span className="text-gray-600 dark:text-gray-400" translate="no">&lt;hello@cultureforchange.net&gt;</span>
                </div>
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold">Θέμα</span>
                  <input value={subject} onChange={e => setSubject(e.target.value)} className={FIELD}
                    placeholder="π.χ. Πρόσκληση σε Γενική Συνέλευση — 12 Οκτωβρίου" />
                </label>
                {meta?.headerStyles && (
                  <div className="grid gap-1.5">
                    <span className="text-sm font-semibold">Κεφαλίδα</span>
                    <div className="flex flex-wrap gap-2">
                      {meta.headerStyles.map(h => (
                        <button key={h.id} type="button" title={h.hint} onClick={() => setHeaderStyle(h.id)}
                          className={`${CHIP} ${headerStyle === h.id ? 'border-coral bg-coral/10' : 'border-gray-300 dark:border-gray-600'}`}>
                          {h.label}
                        </button>
                      ))}
                    </div>
                    <label className="flex items-center gap-2 text-sm pt-1">
                      <input type="checkbox" checked={headerLogo} onChange={e => setHeaderLogo(e.target.checked)}
                        className="accent-coral w-4 h-4" />
                      <span>Με λογότυπο δεξιά από τον τίτλο</span>
                    </label>
                  </div>
                )}

                {meta?.footerStyles && (
                  <div className="grid gap-1.5">
                    <span className="text-sm font-semibold">Υπογραφή</span>
                    <div className="flex flex-wrap gap-2">
                      {meta.footerStyles.map(f => (
                        <button key={f.id} type="button" title={f.hint} onClick={() => setFooterStyle(f.id)}
                          className={`${CHIP} ${footerStyle === f.id ? 'border-coral bg-coral/10' : 'border-gray-300 dark:border-gray-600'}`}>
                          {f.label}
                        </button>
                      ))}
                    </div>
                    {meta.footerLooks && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {meta.footerLooks.map(l => (
                          <button key={l.id} type="button" title={l.hint} onClick={() => setFooterLook(l.id)}
                            className={`${CHIP} ${footerLook === l.id ? 'border-coral bg-coral/10' : 'border-gray-300 dark:border-gray-600'}`}>
                            {l.label}
                          </button>
                        ))}
                      </div>
                    )}
                    <label className="flex items-center gap-2 text-sm pt-1">
                      <input type="checkbox" checked={footerLogo} onChange={e => setFooterLogo(e.target.checked)}
                        className="accent-coral w-4 h-4" />
                      <span>Με λογότυπο δεξιά από την υπογραφή</span>
                    </label>
                    {meta.signer && (
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        Υπογράφει: <strong>{meta.signer.name}</strong> · {meta.signer.role} ·{' '}
                        <span translate="no">{meta.signer.email}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {meta && (
              <BlockEditor blocks={blocks} setBlocks={setBlocks} meta={meta} />
            )}

            <div className={CARD}>
              <div className="flex flex-wrap items-baseline gap-2 mb-1">
                <h3 className={EYEBROW}>ΠΑΡΑΛΗΠΤΕΣ</h3>
                <span className="ml-auto text-sm font-bold tabular-nums" translate="no">{resolved.count}</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
                Συνδύασε όσες επιλογές χρειάζεσαι. Κάθε διεύθυνση μετράει μία φορά, όσες ομάδες κι αν την περιλαμβάνουν.
              </p>
              {meta && <RecipientPicker meta={meta} selection={selection} setSelection={setSelection} />}
            </div>

            <div className={CARD}>
              <h3 className={`${EYEBROW} mb-1`}>ΚΟΙΝΟΠΟΙΗΣΗ (CC)</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Η κοινοποίηση μπαίνει σε κάθε μήνυμα χωριστά, άρα κάθε διεύθυνση CC μετράει ξανά στο ημερήσιο όριο.
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                {CC_SEATS.map(p => {
                  const on = cc.includes(p.email)
                  return (
                    <button key={p.email} type="button" title={p.email}
                      onClick={() => setCc(on ? cc.filter(x => x !== p.email) : [...cc, p.email])}
                      className={`${CHIP} ${on ? 'border-coral bg-coral/10' : 'border-gray-300 dark:border-gray-600 hover:border-coral'}`}>
                      {p.label}
                    </button>
                  )
                })}
              </div>
              <EmailAdder values={cc} onChange={setCc} placeholder="π.χ. coordination@cultureforchange.net" />
              {cc.length > 0 && resolved.count > 0 && (
                <p className="mt-3 text-sm text-amber-800 dark:text-amber-200">
                  {resolved.count} παραλήπτες × {1 + cc.length} = <strong className="tabular-nums">{emailCost}</strong> email
                </p>
              )}
            </div>

            <div className={CARD}>
              <h3 className={`${EYEBROW} mb-1`}>ΠΡΟΓΡΑΜΜΑ ΑΠΟΣΤΟΛΗΣ</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Ο πάροχος στέλνει έως 100 email την ημέρα. Τα 20 κρατούνται για τα αυτόματα μηνύματα, ώστε μια
                απόδειξη ή μια έγκριση να μην περιμένει ποτέ. Τα υπόλοιπα {meta?.dailyBudget} είναι για μαζικές
                αποστολές· ό,τι δεν χωράει φεύγει αυτόματα στις 08:00 κάθε πρωί.
              </p>
              {resolved.count > 0 && (
                <div className="rounded-2xl bg-gray-100 dark:bg-gray-900 px-4 py-3 text-sm">
                  <strong className="tabular-nums">{emailCost}</strong> email ·{' '}
                  {days === 1 ? 'φεύγουν όλα με την πρώτη παρτίδα' : `${days} ημέρες, ${meta?.dailyBudget} την ημέρα`}
                </div>
              )}
            </div>
          </div>

          <aside className="lg:sticky lg:top-24 min-w-0">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-5 sm:p-6 border border-gray-200 dark:border-gray-600">
              <h3 className={`${EYEBROW} mb-3`}>ΠΡΟΕΠΙΣΚΟΠΗΣΗ</h3>
              {preview ? (
                <PreviewFrame html={preview} />
              ) : (
                <div className="h-[32rem] rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 grid place-items-center text-sm text-gray-500">
                  Γράψε θέμα και πρόσθεσε ένα μπλοκ
                </div>
              )}
              <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">
                Έτσι θα φτάσει. Το email είναι πάντα φωτεινό, ανεξάρτητα από το θέμα του OC.
              </p>
            </div>
          </aside>
        </section>
      )}

      {tab === 'compose' && (
        <div className="flex flex-wrap items-center gap-3 sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-600 -mx-4 px-4 py-3 sm:-mx-8 sm:px-8">
          <span className="text-sm text-gray-600 dark:text-gray-400">{resolved.summary || 'Κανένας παραλήπτης'}</span>
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={() => send('save')} disabled={busy}
              className="px-4 min-h-11 rounded-full border border-gray-300 dark:border-gray-600 text-sm font-semibold disabled:opacity-50">
              Αποθήκευση προσχεδίου
            </button>
            <button type="button" onClick={() => setConfirming(true)} disabled={busy || resolved.count === 0 || blocks.length === 0}
              className="px-5 min-h-11 rounded-full bg-coral text-charcoal text-sm font-bold disabled:opacity-50">
              Αποστολή…
            </button>
          </div>
        </div>
      )}

      {confirming && (
        <ConfirmDialog
          subject={subject} count={resolved.count} emailCost={emailCost} days={days}
          cc={cc} recipients={resolved.recipients} busy={busy}
          onCancel={() => setConfirming(false)} onConfirm={() => send('queue')}
        />
      )}
    </div>
  )
}

/**
 * Η προεπισκόπηση στο ΠΡΑΓΜΑΤΙΚΟ πλάτος του email, σμικρυμένη ώστε να χωρά.
 *
 * Το γράμμα είναι 600px και στοιβάζει τις δύο στήλες κάτω από τα 620px. Η
 * στήλη της προεπισκόπησης είναι ~480px, οπότε ένα iframe στο πλάτος της
 * έδειχνε ΠΑΝΤΑ τη μορφή κινητού: η «εικόνα αριστερά» φαινόταν από πάνω και
 * έμοιαζε με σφάλμα. Εδώ το iframe έχει σταθερό πλάτος 640px και σμικρύνεται
 * με transform, οπότε βλέπεις τη διάταξη υπολογιστή· ο διακόπτης δείχνει και
 * τη μορφή κινητού, που είναι υπαρκτή και σκόπιμη.
 */
function PreviewFrame({ html }: { html: string }) {
  const wrap = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [mode, setMode] = useState<'desktop' | 'mobile'>('desktop')
  const frameWidth = mode === 'desktop' ? 640 : 390

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const fit = () => setScale(Math.min(1, el.clientWidth / frameWidth))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [frameWidth])

  const height = 520
  return (
    <div>
      <div className="flex gap-1 mb-2">
        {(['desktop', 'mobile'] as const).map(m => (
          <button key={m} type="button" onClick={() => setMode(m)}
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              mode === m ? 'bg-coral text-charcoal' : 'text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600'}`}>
            {m === 'desktop' ? 'Υπολογιστής' : 'Κινητό'}
          </button>
        ))}
      </div>
      <div ref={wrap} className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-600 bg-white"
        style={{ height: height * scale }}>
        <iframe title="Προεπισκόπηση" srcDoc={html} sandbox=""
          style={{
            width: frameWidth, height, border: 0,
            transform: `scale(${scale})`, transformOrigin: 'top left',
          }} />
      </div>
    </div>
  )
}

// ── Ο επεξεργαστής μπλοκ ────────────────────────────────────────────────────

function BlockEditor({ blocks, setBlocks, meta }: { blocks: Block[]; setBlocks: (b: Block[]) => void; meta: Meta }) {
  const [adding, setAdding] = useState(false)
  // Σύρσιμο για αναδιάταξη. Τα βελάκια μένουν: είναι ο μόνος τρόπος με
  // πληκτρολόγιο, και το σύρσιμο δεν δουλεύει σε κάθε συσκευή.
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const drop = (to: number) => {
    if (dragFrom === null || dragFrom === to) { setDragFrom(null); setDragOver(null); return }
    const next = [...blocks]
    const [moved] = next.splice(dragFrom, 1)
    next.splice(to, 0, moved)
    setBlocks(next); setDragFrom(null); setDragOver(null)
  }
  const update = (i: number, patch: Record<string, any>) =>
    setBlocks(blocks.map((b, j) => (j === i ? { ...b, ...patch } : b)))
  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= blocks.length) return
    const next = [...blocks]; [next[i], next[j]] = [next[j], next[i]]; setBlocks(next)
  }

  return (
    <div className={CARD}>
      <div className="flex flex-wrap items-baseline gap-2 mb-1">
        <h3 className={EYEBROW}>ΣΩΜΑ ΜΗΝΥΜΑΤΟΣ</h3>
        <span className="ml-auto text-sm text-gray-600 dark:text-gray-400 tabular-nums">{blocks.length} μπλοκ</span>
        {blocks.length > 0 && (
          <button type="button"
            onClick={() => { if (confirm('Να αφαιρεθούν και τα ' + blocks.length + ' μπλοκ;')) setBlocks([]) }}
            className="text-sm text-red-700 dark:text-red-300 underline">Καθαρισμός όλων</button>
        )}
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Η γραμματοσειρά, τα χρώματα και οι αποστάσεις είναι της ταυτότητας και δεν αλλάζουν. Εσύ διαλέγεις
        στοιχεία και παραλλαγές.
      </p>

      {blocks.length === 0 && (
        <div className="grid gap-2 mb-4">
          <span className="text-sm font-semibold">Ξεκίνα από ένα έτοιμο σχέδιο</span>
          <div className="flex flex-wrap gap-2">
            {meta.presets.map(p => (
              <button key={p.id} type="button" onClick={() => setBlocks(structuredClone(p.blocks))}
                title={p.hint}
                className={`${CHIP} border-gray-300 dark:border-gray-600 hover:border-coral`}>{p.label}</button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {blocks.map((b, i) => (
          <div key={i}
            onDragOver={e => { e.preventDefault(); setDragOver(i) }}
            onDragLeave={() => setDragOver(o => (o === i ? null : o))}
            onDrop={e => { e.preventDefault(); drop(i) }}
            className={`rounded-2xl border p-3 transition-colors ${
              dragOver === i && dragFrom !== null && dragFrom !== i
                ? 'border-coral border-2 bg-coral/5'
                : 'border-gray-200 dark:border-gray-600'
            } ${dragFrom === i ? 'opacity-50' : ''}`}>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span draggable onDragStart={() => setDragFrom(i)} onDragEnd={() => { setDragFrom(null); setDragOver(null) }}
                title="Σύρε για αναδιάταξη" aria-hidden="true"
                className="cursor-grab active:cursor-grabbing select-none px-1 text-gray-400 hover:text-coral">⠿</span>
              <span className="text-xs font-bold tracking-wider text-coral">{meta.blockLabels[b.type] || b.type}</span>
              {meta.blockVariants[b.type] && (
                <select value={b[meta.blockVariants[b.type].key] ?? meta.blockVariants[b.type].options[0].value}
                  onChange={e => update(i, { [meta.blockVariants[b.type].key]: e.target.value })}
                  className="text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1">
                  {meta.blockVariants[b.type].options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              )}
              <div className="ml-auto flex gap-1">
                <button type="button" onClick={() => move(i, -1)} aria-label="Πάνω"
                  className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">↑</button>
                <button type="button" onClick={() => move(i, 1)} aria-label="Κάτω"
                  className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">↓</button>
                <button type="button" onClick={() => setBlocks(blocks.filter((_, j) => j !== i))} aria-label="Διαγραφή"
                  className="w-8 h-8 rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 text-red-700 dark:text-red-300">✕</button>
              </div>
            </div>
            <BlockFields block={b} onChange={p => update(i, p)} />
          </div>
        ))}
      </div>

      <div className="mt-4">
        {adding ? (
          <div className="flex flex-wrap gap-2">
            {Object.entries(meta.blockLabels).map(([type, label]) => (
              <button key={type} type="button"
                onClick={() => { setBlocks([...blocks, newBlock(type)]); setAdding(false) }}
                className={`${CHIP} border-gray-300 dark:border-gray-600 hover:border-coral`}>{label}</button>
            ))}
            <button type="button" onClick={() => setAdding(false)}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400">Άκυρο</button>
          </div>
        ) : (
          <button type="button" onClick={() => setAdding(true)}
            className="px-4 min-h-11 rounded-full border border-dashed border-gray-400 dark:border-gray-500 text-sm font-semibold hover:border-coral">
            + Προσθήκη στοιχείου
          </button>
        )}
      </div>

      <details className="mt-4">
        <summary className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">Πεδία που συμπληρώνονται ανά παραλήπτη</summary>
        <div className="flex flex-wrap gap-2 mt-2">
          {meta.mergeFields.map(f => (
            <code key={f.token} className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-900" translate="no">
              {f.token} <span className="text-gray-500">→ {f.sample}</span>
            </code>
          ))}
        </div>
      </details>
    </div>
  )
}

function newBlock(type: string): Block {
  switch (type) {
    case 'section': return { type, title: 'Τίτλος ενότητας' }
    case 'text': return { type, html: '' }
    case 'image': return { type, src: '', alt: '' }
    case 'imageText': return { type, src: '', alt: '', html: '' }
    case 'card': return { type, title: '', html: '' }
    case 'person': return { type, name: '', role: '', html: '' }
    case 'logos': return { type, items: [] }
    case 'button': return { type, label: '', href: '' }
    case 'box': return { type, title: '', html: '', tone: 'cream' }
    case 'divider': return { type, style: 'line' }
    case 'amounts': return { type, rows: [{ label: '', amount: '' }] }
    case 'mono': return { type, label: '', value: '' }
    default: return { type }
  }
}

const IN = 'w-full min-h-11 px-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm'

function BlockFields({ block: b, onChange }: { block: Block; onChange: (p: Record<string, any>) => void }) {
  const rich = (label: string, key = 'html') => (
    <div className="grid gap-1">
      <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
      <CampaignRichText value={b[key] || ''} onChange={v => onChange({ [key]: v })} />
    </div>
  )
  const line = (label: string, key: string, placeholder = '') => (
    <label className="grid gap-1">
      <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
      <input value={b[key] || ''} onChange={e => onChange({ [key]: e.target.value })} className={IN} placeholder={placeholder} />
    </label>
  )

  switch (b.type) {
    case 'section': return line('Τίτλος', 'title')
    case 'text': return rich('Κείμενο')
    case 'divider': return null
    case 'image': return <div className="grid gap-2"><ImageField src={b.src || ''} alt={b.alt || ''} mediaId={b.mediaId} branded={b.branded} origSrc={b.origSrc} origMediaId={b.origMediaId} onChange={onChange} />{line('Σύνδεσμος στον οποίο οδηγεί (προαιρετικό)', 'href')}</div>
    case 'imageText': return <div className="grid gap-2"><ImageField src={b.src || ''} alt={b.alt || ''} mediaId={b.mediaId} branded={b.branded} origSrc={b.origSrc} origMediaId={b.origMediaId} onChange={onChange} />{rich('Κείμενο δίπλα')}</div>
    case 'card': return <div className="grid gap-2">{line('Τίτλος', 'title')}{rich('Κείμενο')}<ImageField src={b.src || ''} alt={b.alt || ''} mediaId={b.mediaId} branded={b.branded} origSrc={b.origSrc} origMediaId={b.origMediaId} onChange={onChange} />{line('Κουμπί — ετικέτα', 'buttonLabel')}{line('Κουμπί — σύνδεσμος', 'buttonHref')}</div>
    case 'person': return <div className="grid gap-2">{line('Όνομα', 'name')}{line('Ιδιότητα', 'role')}<ImageField src={b.src || ''} alt={b.alt || ''} mediaId={b.mediaId} branded={b.branded} origSrc={b.origSrc} origMediaId={b.origMediaId} onChange={onChange} />{rich('Κείμενο')}</div>
    case 'button': return <div className="grid gap-2">{line('Ετικέτα', 'label')}{line('Σύνδεσμος', 'href', 'https://…')}</div>
    case 'box': return <div className="grid gap-2">{line('Τίτλος (προαιρετικό)', 'title')}{rich('Κείμενο')}</div>
    case 'mono': return <div className="grid gap-2">{line('Ετικέτα', 'label', 'π.χ. IBAN')}{line('Τιμή', 'value')}</div>
    case 'logos': return <LogosFields items={b.items || []} onChange={items => onChange({ items })} />
    case 'amounts': return <AmountsFields rows={b.rows || []} total={b.total || ''} onChange={onChange} />
    case 'toc': return <p className="text-xs text-gray-600 dark:text-gray-400">Χτίζεται αυτόματα από τις ενότητες του μηνύματος.</p>
    default: return null
  }
}

/**
 * Εικόνα: από τον υπολογιστή ή με σύνδεσμο.
 *
 * Το ανέβασμα κρατά και το `mediaId`, γιατί χωρίς αυτό δεν ξέρουμε τι να
 * σβήσουμε αργότερα. Μια εικόνα με σκέτο σύνδεσμο (εξωτερική) ΔΕΝ σβήνεται —
 * δεν είναι δική μας.
 */
function ImageField({ src, alt, mediaId, branded, origSrc, origMediaId, onChange }: {
  src: string; alt: string; mediaId?: number
  branded?: 'light' | 'dark'; origSrc?: string; origMediaId?: number
  onChange: (p: Record<string, any>) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [branding, setBranding] = useState(false)
  const [err, setErr] = useState('')

  /**
   * Το σήμα δημιουργεί ΝΕΟ αρχείο και κρατά το πρωτότυπο, ώστε το ξετικάρισμα
   * να επιστρέφει ακριβώς ό,τι ανέβηκε αντί για μια δεύτερη επεξεργασία.
   */
  const setBrand = async (tone: 'none' | 'light' | 'dark') => {
    if ((branded || 'none') === tone) return
    setErr(''); setBranding(true)
    try {
      // Πάντα ξεκινάμε από το ΠΡΩΤΟΤΥΠΟ: αλλιώς το λευκό πάνω στο μαύρο θα
      // έβαζε δύο σήματα στην ίδια εικόνα.
      const source = origSrc || src
      const sourceId = origSrc ? origMediaId : mediaId
      const stale = origSrc ? mediaId : undefined

      if (tone === 'none') {
        onChange({ src: source, mediaId: sourceId, branded: undefined, origSrc: undefined, origMediaId: undefined })
      } else {
        const res = await fetch('/api/oc/campaigns/image', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ src: source, tone }),
        })
        const d = await res.json()
        if (!res.ok) throw new Error(d?.error || 'Αποτυχία')
        onChange({ src: d.url, mediaId: d.id, branded: tone, origSrc: source, origMediaId: sourceId })
      }
      if (stale) await fetch(`/api/oc/campaigns/image?id=${stale}`, { method: 'DELETE' }).catch(() => {})
    } catch (e: any) { setErr(e?.message || 'Αποτυχία') } finally { setBranding(false) }
  }

  const upload = async (f: File) => {
    setBusy(true); setErr('')
    try {
      const fd = new FormData(); fd.append('file', f)
      const res = await fetch('/api/oc/campaigns/image', { method: 'POST', body: fd })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || 'Αποτυχία ανεβάσματος')
      onChange({ src: d.url, mediaId: d.id, alt: alt || d.name.replace(/\.[a-z]+$/i, '') })
    } catch (e: any) { setErr(e?.message || 'Αποτυχία') } finally { setBusy(false) }
  }

  const remove = async () => {
    setErr('')
    if (mediaId) {
      // Σβήνεται και από τη Βιβλιοθήκη — εκτός αν τη χρησιμοποιεί σταλμένο μήνυμα
      const res = await fetch(`/api/oc/campaigns/image?id=${mediaId}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => null)
        setErr(d?.error || 'Η εικόνα δεν διαγράφηκε από τη Βιβλιοθήκη')
      }
    }
    onChange({ src: '', mediaId: undefined })
  }

  return (
    <div className="grid gap-2">
      {src ? (
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-600" />
          <div className="min-w-0 flex-1 grid gap-1">
            <span className="text-xs text-gray-600 dark:text-gray-400 truncate" translate="no">{src}</span>
            <span className="text-xs text-gray-500">{mediaId ? 'Στη Βιβλιοθήκη Πολυμέσων' : 'Εξωτερικός σύνδεσμος'}</span>
          </div>
          <button type="button" onClick={remove} className="px-3 py-1.5 text-sm rounded-full border border-gray-300 dark:border-gray-600 text-red-700 dark:text-red-300">Αφαίρεση</button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 items-center">
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
            className="px-4 min-h-11 rounded-full border border-gray-300 dark:border-gray-600 text-sm font-semibold disabled:opacity-50">
            {busy ? 'Ανεβαίνει…' : 'Από τον υπολογιστή'}
          </button>
          <span className="text-xs text-gray-500">ή</span>
          <input value={src} onChange={e => onChange({ src: e.target.value, mediaId: undefined })}
            className={`flex-1 min-w-40 ${IN}`} placeholder="https://… σύνδεσμος εικόνας" translate="no" />
        </div>
      )}
      {src && (
        <div className="grid gap-1.5">
          <span className="text-xs text-gray-600 dark:text-gray-400">
            Σήμα CforC κάτω δεξιά — ενσωματώνεται μέσα στην εικόνα, γιατί τα email δεν υποστηρίζουν επικάλυψη
          </span>
          <div className="flex flex-wrap gap-2">
            {([
              { v: 'none', label: 'Χωρίς σήμα' },
              { v: 'dark', label: 'Μαύρο σήμα' },
              { v: 'light', label: 'Λευκό σήμα' },
            ] as const).map(o => (
              <button key={o.v} type="button" disabled={branding}
                onClick={() => setBrand(o.v)}
                className={`${CHIP} disabled:opacity-50 ${
                  (branded || 'none') === o.v ? 'border-coral bg-coral/10' : 'border-gray-300 dark:border-gray-600'}`}>
                {o.label}
              </button>
            ))}
            {branding && <span className="text-xs text-gray-500 self-center">Εφαρμόζεται…</span>}
          </div>
        </div>
      )}
      <label className="grid gap-1">
        <span className="text-xs text-gray-600 dark:text-gray-400">Εναλλακτικό κείμενο — διαβάζεται όταν η εικόνα δεν φορτώνει</span>
        <input value={alt} onChange={e => onChange({ alt: e.target.value })} className={IN} />
      </label>
      {err && <p className="text-sm text-red-700 dark:text-red-300">{err}</p>}
    </div>
  )
}

function LogosFields({ items, onChange }: {
  items: Array<{ src: string; alt: string; mediaId?: number }>
  onChange: (v: any[]) => void
}) {
  const set = (i: number, patch: Record<string, any>) =>
    onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  return (
    <div className="grid gap-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-600 p-2 grid gap-2">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              {/* Ίδιο πεδίο με τις υπόλοιπες εικόνες: ανέβασμα ή σύνδεσμος */}
              <ImageField src={it.src || ''} alt={it.alt || ''} mediaId={it.mediaId}
                onChange={p => set(i, p)} />
            </div>
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))}
              aria-label="Αφαίρεση λογοτύπου"
              className="px-3 py-1.5 rounded-lg text-red-700 dark:text-red-300">✕</button>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, { src: '', alt: '' }])}
        className="justify-self-start px-3 py-1.5 text-sm rounded-full border border-gray-300 dark:border-gray-600">
        + Λογότυπο
      </button>
    </div>
  )
}

function AmountsFields({ rows, total, onChange }: { rows: Array<{ label: string; amount: string }>; total: string; onChange: (p: any) => void }) {
  return (
    <div className="grid gap-2">
      {rows.map((r, i) => (
        <div key={i} className="flex gap-2">
          <input value={r.label} onChange={e => onChange({ rows: rows.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })} className={IN} placeholder="Περιγραφή" />
          <input value={r.amount} onChange={e => onChange({ rows: rows.map((x, j) => j === i ? { ...x, amount: e.target.value } : x) })} className={`${IN} max-w-32`} placeholder="35,00 €" />
          <button type="button" onClick={() => onChange({ rows: rows.filter((_, j) => j !== i) })} className="px-3 rounded-lg text-red-700 dark:text-red-300">✕</button>
        </div>
      ))}
      <div className="flex gap-2">
        <button type="button" onClick={() => onChange({ rows: [...rows, { label: '', amount: '' }] })}
          className="px-3 py-1.5 text-sm rounded-full border border-gray-300 dark:border-gray-600">+ Γραμμή</button>
        <input value={total} onChange={e => onChange({ total: e.target.value })} className={`${IN} max-w-40`} placeholder="Σύνολο" />
      </div>
    </div>
  )
}

// ── Παραλήπτες ──────────────────────────────────────────────────────────────

function RecipientPicker({ meta, selection, setSelection }: { meta: Meta; selection: Selection; setSelection: (s: Selection) => void }) {
  const year = new Date().getFullYear()
  const all = !!selection.allMembers
  const toggleGroup = (g: string) => {
    const cur = selection.groups || []
    setSelection({ ...selection, groups: cur.includes(g) ? cur.filter(x => x !== g) : [...cur, g] })
  }
  const setPay = (paid: boolean | null) =>
    setSelection({ ...selection, paymentStatus: paid === null ? undefined : { year, paid } })

  return (
    <div className="grid gap-5">
      <div>
        <h4 className="text-sm font-semibold mb-2">Έτοιμα κοινά</h4>
        <div className="flex flex-wrap gap-2">
          {AUDIENCES.map(a => (
            <button key={a.id} type="button" title={a.hint}
              onClick={() => setSelection(a.build(meta))}
              className={`${CHIP} border-gray-300 dark:border-gray-600 hover:border-coral`}>
              {a.label}
              {a.id === 'community' && <span className="tabular-nums text-gray-500">{meta.memberCount}</span>}
            </button>
          ))}
          {(selection.allMembers || selection.groups?.length || selection.paymentStatus || selection.memberDocIds?.length) && (
            <button type="button" onClick={() => setSelection({ external: selection.external })}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 underline">Καθαρισμός</button>
          )}
        </div>
      </div>

      <button type="button" onClick={() => setSelection({ ...selection, allMembers: !all })}
        className={`w-full text-left rounded-2xl border-2 p-4 min-h-11 flex items-center gap-4 ${all ? 'border-coral bg-coral/10' : 'border-gray-200 dark:border-gray-600'}`}>
        <span className="font-semibold">Όλα τα μέλη</span>
        <span className="ml-auto tabular-nums text-sm text-gray-600 dark:text-gray-400">{meta.memberCount}</span>
      </button>

      {all ? (
        <div className="text-sm rounded-xl bg-gray-100 dark:bg-gray-900 px-4 py-3 text-gray-700 dark:text-gray-300">
          Όλα τα μέλη περιλαμβάνονται ήδη. Οι επιλογές κατά πληρωμή, ομάδα ή όνομα δεν προσθέτουν κανέναν —
          πρόσθεσε μόνο εξωτερικές διευθύνσεις αν χρειάζεται.
        </div>
      ) : (
        <div className="grid gap-5">
          <div>
            <h4 className="text-sm font-semibold mb-2">Κατά κατάσταση συνδρομής</h4>
            <div className="flex flex-wrap gap-2">
              {[
                { label: `Απλήρωτοι ${year}`, paid: false },
                { label: `Πληρωμένοι ${year}`, paid: true },
              ].map(o => {
                const on = selection.paymentStatus?.paid === o.paid
                return (
                  <button key={o.label} type="button" onClick={() => setPay(on ? null : o.paid)}
                    className={`${CHIP} ${on ? 'border-coral bg-coral/10' : 'border-gray-300 dark:border-gray-600'}`}>{o.label}</button>
                )
              })}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">Κατά ομάδα εργασίας ή έδρα</h4>
            <div className="flex flex-wrap gap-2">
              {meta.groups.map(g => {
                const on = (selection.groups || []).includes(g)
                return (
                  <button key={g} type="button" onClick={() => toggleGroup(g)}
                    className={`${CHIP} ${on ? 'border-coral bg-coral/10' : 'border-gray-300 dark:border-gray-600'}`}>{g}</button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold mb-2">Εξωτερικές διευθύνσεις</h4>
        <EmailAdder values={selection.external || []} onChange={v => setSelection({ ...selection, external: v })}
          placeholder="όνομα@παράδειγμα.gr" />
      </div>
    </div>
  )
}

function EmailAdder({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState('')
  const [err, setErr] = useState('')
  const add = () => {
    const v = draft.trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { setErr('Μη έγκυρη διεύθυνση'); return }
    if (values.includes(v)) { setErr('Υπάρχει ήδη'); return }
    onChange([...values, v]); setDraft(''); setErr('')
  }
  return (
    <div>
      <div className="flex gap-2">
        <input type="email" value={draft} translate="no" placeholder={placeholder}
          onChange={e => { setDraft(e.target.value); setErr('') }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          className={`flex-1 min-w-0 ${FIELD}`} />
        <button type="button" onClick={add}
          className="px-4 min-h-11 rounded-full border border-gray-300 dark:border-gray-600 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-700">Προσθήκη</button>
      </div>
      {err && <p className="mt-1.5 text-sm text-red-700 dark:text-red-300">{err}</p>}
      <div className="flex flex-wrap gap-2 mt-2">
        {values.map(v => (
          <span key={v} className={`${CHIP} border-gray-300 dark:border-gray-600`} translate="no">
            {v}
            <button type="button" onClick={() => onChange(values.filter(x => x !== v))} aria-label={`Αφαίρεση ${v}`}
              className="text-gray-500 hover:text-red-600">✕</button>
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Επιβεβαίωση και ουρά ────────────────────────────────────────────────────

function ConfirmDialog(props: {
  subject: string; count: number; emailCost: number; days: number; cc: string[]
  recipients: Recipient[]; busy: boolean; onCancel: () => void; onConfirm: () => void
}) {
  const { subject, count, emailCost, days, cc, recipients, busy, onCancel, onConfirm } = props
  const byVia = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of recipients) m.set(r.via, (m.get(r.via) || 0) + 1)
    return [...m.entries()]
  }, [recipients])
  const VIA: Record<string, string> = {
    all: 'όλα τα μέλη', payment: 'κατά συνδρομή', group: 'κατά ομάδα',
    individual: 'μεμονωμένα', external: 'εξωτερικές',
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:p-6" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-gray-800 w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold mb-1">Επιβεβαίωση αποστολής</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Το μήνυμα φεύγει σε πραγματικούς ανθρώπους και <strong>δεν ανακαλείται</strong>.
        </p>
        <dl className="grid gap-2 text-sm mb-4">
          <div className="flex gap-2"><dt className="text-gray-600 dark:text-gray-400 w-32">Θέμα</dt><dd className="font-semibold min-w-0">{subject || '—'}</dd></div>
          <div className="flex gap-2"><dt className="text-gray-600 dark:text-gray-400 w-32">Παραλήπτες</dt><dd className="tabular-nums">{count}</dd></div>
          {cc.length > 0 && <div className="flex gap-2"><dt className="text-gray-600 dark:text-gray-400 w-32">CC</dt><dd translate="no">{cc.join(', ')}</dd></div>}
          <div className="flex gap-2"><dt className="text-gray-600 dark:text-gray-400 w-32">Σύνολο email</dt><dd className="tabular-nums">{emailCost}</dd></div>
          <div className="flex gap-2"><dt className="text-gray-600 dark:text-gray-400 w-32">Πότε</dt><dd>{days === 1 ? 'με την επόμενη παρτίδα (08:00)' : `σε ${days} ημέρες, από τις 08:00`}</dd></div>
        </dl>
        <div className="rounded-2xl bg-gray-100 dark:bg-gray-900 px-4 py-3 text-sm mb-5">
          <div className="font-semibold mb-1">Ποιοι θα το λάβουν</div>
          {byVia.map(([via, n]) => <div key={via} className="text-gray-700 dark:text-gray-300">{n} {VIA[via] || via}</div>)}
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onCancel} disabled={busy}
            className="px-4 min-h-11 rounded-full border border-gray-300 dark:border-gray-600 text-sm font-semibold">Άκυρο</button>
          <button type="button" onClick={onConfirm} disabled={busy}
            className="px-5 min-h-11 rounded-full bg-coral text-charcoal text-sm font-bold disabled:opacity-50">
            {busy ? 'Καταχώριση…' : `Αποστολή σε ${count}`}
          </button>
        </div>
      </div>
    </div>
  )
}

function QueueView({ campaigns }: { campaigns: Campaign[] }) {
  if (campaigns.length === 0) {
    return (
      <div className={`${CARD} text-center`}>
        <p className="font-semibold">Καμία μαζική αποστολή ακόμη</p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Ό,τι στείλεις θα εμφανίζεται εδώ με την πορεία του.</p>
      </div>
    )
  }
  return (
    <div className="grid gap-3">
      {campaigns.map(c => {
        const pct = c.TotalCount ? Math.round((c.SentCount / c.TotalCount) * 100) : 0
        return (
          <div key={c.documentId} className={CARD}>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-semibold min-w-0">{c.Subject}</span>
              <span className="ml-auto text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-900">{STATE_LABELS[c.State] || c.State}</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div className="h-full bg-coral" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 tabular-nums">
              {c.SentCount}/{c.TotalCount} στάλθηκαν
              {c.FailedCount > 0 && <span className="text-red-700 dark:text-red-300"> · {c.FailedCount} απέτυχαν</span>}
              {c.CreatedByName && <span> · {c.CreatedByName}</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
