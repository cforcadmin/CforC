'use client'

import { useEffect, useState } from 'react'

/**
 * Καταγραφή παρουσιών σε δράση.
 *
 * Ο λόγος που υπάρχει: κάθε δείκτης συμμετοχής του πλαισίου είναι
 * «παρόντες ÷ μέλη». Ο παρονομαστής υπάρχει στο μητρώο· ο αριθμητής
 * πουθενά. Καταγράφεται πάνω στο γεγονός του ημερολογίου, όχι σε χωριστό
 * αρχείο, ώστε να μη χρειάζεται να θυμάται κανείς ένα δεύτερο μέρος.
 *
 * Τα μη-μέλη μετριούνται ως αριθμός (και προαιρετικά ονόματα): το πλαίσιο
 * τα ζητά χωριστά και δεν θέλουμε να δημιουργούμε εγγραφές για κόσμο που
 * απλώς πέρασε από μια εκδήλωση.
 */

interface MemberLite { documentId: string; name: string; am: number | null }
interface Record {
  documentId: string
  attendees: Array<{ documentId: string; name: string; gender: string | null }>
  nonMemberCount: number
  guestNames: string | null
  notes: string | null
  recordedAt: string | null
}

const inputCls = 'w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-base text-charcoal dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-coral'
const labelCls = 'block text-sm font-bold text-gray-600 dark:text-gray-300 mb-1'

export default function OcAttendance({ event, members, onClose, onSaved }: {
  event: { id: string; title: string; start: string; category: string }
  members: MemberLite[]
  onClose: () => void
  onSaved?: () => void
}) {
  const [picked, setPicked] = useState<string[]>([])
  const [nonMembers, setNonMembers] = useState('0')
  const [guestNames, setGuestNames] = useState('')
  const [notes, setNotes] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recordedAt, setRecordedAt] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/oc/attendance?eventId=${encodeURIComponent(event.id)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const rec: Record | undefined = d?.records?.[0]
        if (rec) {
          setPicked(rec.attendees.map(a => a.documentId))
          setNonMembers(String(rec.nonMemberCount ?? 0))
          setGuestNames(rec.guestNames || '')
          setNotes(rec.notes || '')
          setRecordedAt(rec.recordedAt)
        }
      })
      .catch(() => { /* νέα καταγραφή */ })
      .finally(() => setLoading(false))
  }, [event.id])

  const toggle = (id: string) => setPicked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  const hits = query.trim().length < 2 ? [] : members
    .filter(m => m.name.toLowerCase().includes(query.trim().toLowerCase()))
    .filter(m => !picked.includes(m.documentId))
    .slice(0, 8)
  const chosen = members.filter(m => picked.includes(m.documentId))
  const total = picked.length + (Number(nonMembers) || 0)
  const share = members.length ? Math.round((picked.length / members.length) * 1000) / 10 : null

  async function save() {
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/oc/attendance', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id, eventTitle: event.title,
          eventDate: String(event.start).slice(0, 10), eventCategory: event.category,
          attendees: picked, nonMemberCount: Number(nonMembers) || 0,
          guestNames, notes,
        }),
      })
      if (!res.ok) throw new Error((await res.json())?.error || 'Αποτυχία')
      onSaved?.(); onClose()
    } catch (err: any) {
      setError(err?.message || 'Αποτυχία καταχώρησης')
    } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="menu-glass rounded-3xl max-w-lg w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-1">
          <h3 className="text-xl font-bold text-charcoal dark:text-gray-100">Παρουσίες</h3>
          <button type="button" onClick={onClose} aria-label="Κλείσιμο"
            className="text-gray-400 hover:text-charcoal dark:hover:text-gray-100 text-2xl leading-none">×</button>
        </div>
        <p className="text-base text-gray-600 dark:text-gray-300 mb-5">
          {event.title}
          <span className="block text-sm text-gray-500 dark:text-gray-400 notranslate">
            {new Date(event.start).toLocaleDateString('el-GR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </p>

        {loading ? <p className="text-base text-gray-400">Φόρτωση…</p> : (
          <>
            <div className="rounded-2xl bg-gray-50 dark:bg-gray-700/50 px-5 py-4 mb-5">
              <p className="text-3xl font-bold text-charcoal dark:text-gray-100 notranslate">{total}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <span className="notranslate">{picked.length}</span> μέλη
                {share !== null && <span className="text-gray-500 dark:text-gray-400 notranslate"> ({share}% του μητρώου)</span>}
                {' · '}<span className="notranslate">{Number(nonMembers) || 0}</span> μη μέλη
              </p>
              {recordedAt && (
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 notranslate">
                  τελευταία καταγραφή {new Date(recordedAt).toLocaleDateString('el-GR')}
                </p>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <span className={labelCls}>Μέλη που παρευρέθηκαν</span>
                <div className="flex flex-wrap gap-2 mb-2">
                  {chosen.map(m => (
                    <span key={m.documentId} className="px-3 py-1.5 rounded-full bg-coral text-white text-sm">
                      {m.name}
                      <button type="button" onClick={() => toggle(m.documentId)} aria-label={`Αφαίρεση ${m.name}`}
                        className="ml-2 opacity-80 hover:opacity-100">×</button>
                    </span>
                  ))}
                  {chosen.length === 0 && <span className="text-sm text-gray-400">Κανένα ακόμη</span>}
                </div>
                <input className={inputCls} value={query} onChange={e => setQuery(e.target.value)}
                  placeholder="Αναζήτηση μέλους…" />
                {hits.length > 0 && (
                  <div className="mt-1 rounded-xl border border-gray-200 dark:border-gray-600 divide-y divide-gray-100 dark:divide-gray-700 max-h-52 overflow-y-auto">
                    {hits.map(m => (
                      <button key={m.documentId} type="button"
                        onClick={() => { toggle(m.documentId); setQuery('') }}
                        className="w-full text-left px-3 py-2 text-sm text-charcoal dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700">
                        {m.name}{m.am ? <span className="text-gray-400 notranslate"> · ΑΜ {m.am}</span> : null}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} htmlFor="at-non">Μη μέλη (αριθμός)</label>
                  <input id="at-non" type="number" min={0} className={inputCls} value={nonMembers}
                    onChange={e => setNonMembers(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="at-guests">Ονόματα μη μελών</label>
                  <input id="at-guests" className={inputCls} value={guestNames}
                    onChange={e => setGuestNames(e.target.value)} placeholder="προαιρετικό" />
                </div>
              </div>

              <div>
                <label className={labelCls} htmlFor="at-notes">Σημείωση</label>
                <input id="at-notes" className={inputCls} value={notes}
                  onChange={e => setNotes(e.target.value)} placeholder="προαιρετικό" />
              </div>
            </div>

            {error && <p className="text-sm text-red-600 dark:text-red-400 mt-4">{error}</p>}

            <div className="flex items-center gap-3 mt-6">
              <button type="button" onClick={save} disabled={busy}
                className="px-6 py-2.5 rounded-full bg-coral text-white text-sm font-bold hover:bg-coral/90 disabled:opacity-40">
                {busy ? 'Αποθήκευση…' : 'Αποθήκευση'}
              </button>
              <button type="button" onClick={onClose} disabled={busy}
                className="px-5 py-2.5 rounded-full border border-gray-300 dark:border-gray-600 text-sm text-charcoal dark:text-gray-200">
                Άκυρο
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
