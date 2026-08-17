'use client'

import { useEffect, useState } from 'react'

/**
 * Ταμείο — popup από το πλακίδιο της Επισκόπησης.
 *
 * Το υπόλοιπο δεν υπολογίζεται· το διαβάζει ο/η Financer από την τράπεζα
 * και το καταχωρεί. Όλο το ΔΣ βλέπει· μόνο ο/η Financer γράφει. Κάθε
 * μέτρηση κρατιέται, οπότε το ιστορικό δείχνει πορεία και όχι μόνο σημείο.
 */

export interface TreasuryReading {
  documentId: string
  bank: number
  cash: number | null
  asOf: string
  notes: string | null
  recordedBy: string | null
}

const eur = (n: number) => `${n.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
const gr = (d: string) => new Date(d).toLocaleDateString('el-GR')

export default function OcTreasuryPopup({ canEdit, onClose, onSaved }: {
  canEdit: boolean
  onClose: () => void
  onSaved?: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [latest, setLatest] = useState<TreasuryReading | null>(null)
  const [history, setHistory] = useState<TreasuryReading[]>([])
  const [stale, setStale] = useState(false)
  const [unconfigured, setUnconfigured] = useState(false)
  const [adding, setAdding] = useState(false)

  const today = new Date().toISOString().slice(0, 10)
  const [bank, setBank] = useState('')
  const [cash, setCash] = useState('')
  const [asOf, setAsOf] = useState(today)
  const [notes, setNotes] = useState('')

  async function load() {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/oc/treasury')
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || 'Αποτυχία')
      setLatest(d.latest); setHistory(d.history || []); setStale(!!d.stale)
      setUnconfigured(!!d.unconfigured)
      if (d.latest) { setBank(String(d.latest.bank)); setCash(d.latest.cash == null ? '' : String(d.latest.cash)) }
      setAdding(!d.latest)
    } catch (err: any) {
      setError(err?.message || 'Αποτυχία φόρτωσης')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  async function save() {
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/oc/treasury', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bank: bank.replace(',', '.'), cash: cash.replace(',', '.'), asOf, notes }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || 'Αποτυχία')
      setNotes(''); setAdding(false)
      await load()
      onSaved?.()
    } catch (err: any) {
      setError(err?.message || 'Αποτυχία καταχώρησης')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-charcoal dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-coral'
  const labelCls = 'block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl max-w-lg w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h3 className="text-xl font-bold text-charcoal dark:text-gray-100">Ταμείο</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">υπόλοιπο όπως το διάβασε ο/η Ταμίας</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Κλείσιμο"
            className="text-gray-400 hover:text-charcoal dark:hover:text-gray-100 text-2xl leading-none">×</button>
        </div>

        {loading && <p className="text-sm text-gray-400">Φόρτωση…</p>}
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

        {unconfigured && (
          <p className="text-sm rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200 px-4 py-3">
            Η συλλογή Ταμείου δεν έχει φτάσει ακόμη στο Strapi. Δοκίμασε ξανά μόλις ολοκληρωθεί το deploy.
          </p>
        )}

        {!loading && !unconfigured && (
          <>
            {latest && (
              <div className={`rounded-2xl px-5 py-4 mb-5 ${stale
                ? 'bg-amber-50 dark:bg-amber-900/25 border border-amber-300 dark:border-amber-700'
                : 'bg-gray-50 dark:bg-gray-700/50'}`}>
                <p className="text-3xl font-bold text-charcoal dark:text-gray-100 notranslate">{eur(latest.bank)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  στην τράπεζα{latest.cash != null && <> · <span className="notranslate">{eur(latest.cash)}</span> μετρητά</>}
                </p>
                <p className={`text-xs mt-2 ${stale ? 'text-amber-800 dark:text-amber-200 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
                  {stale ? '⚠ ' : ''}μέτρηση <span className="notranslate">{gr(latest.asOf)}</span>
                  {stale && ' — δεν έχει ενημερωθεί αυτόν τον μήνα'}
                </p>
                {latest.notes && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">{latest.notes}</p>}
              </div>
            )}

            {canEdit && !adding && (
              <button type="button" onClick={() => { setAdding(true); setAsOf(today) }}
                className="px-5 py-2.5 rounded-full bg-coral text-white text-sm font-bold hover:bg-coral/90 mb-5">
                Νέα μέτρηση
              </button>
            )}

            {canEdit && adding && (
              <div className="space-y-3 mb-5 rounded-2xl border border-gray-200 dark:border-gray-600 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls} htmlFor="tr-bank">Τράπεζα (€)</label>
                    <input id="tr-bank" className={inputCls} inputMode="decimal" value={bank}
                      onChange={e => setBank(e.target.value)} placeholder="12345,67" />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="tr-cash">Μετρητά (€)</label>
                    <input id="tr-cash" className={inputCls} inputMode="decimal" value={cash}
                      onChange={e => setCash(e.target.value)} placeholder="προαιρετικό" />
                  </div>
                </div>
                <div>
                  <label className={labelCls} htmlFor="tr-date">Ημερομηνία μέτρησης</label>
                  <input id="tr-date" type="date" max={today} className={inputCls} value={asOf}
                    onChange={e => setAsOf(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="tr-notes">Σημείωση</label>
                  <input id="tr-notes" className={inputCls} value={notes}
                    onChange={e => setNotes(e.target.value)} placeholder="προαιρετικό" />
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <button type="button" onClick={save} disabled={saving || !bank.trim()}
                    className="px-5 py-2 rounded-full bg-[#6A994E] text-white text-sm font-bold hover:opacity-90 disabled:opacity-40">
                    {saving ? 'Καταχώρηση…' : 'Καταχώρηση'}
                  </button>
                  {latest && (
                    <button type="button" onClick={() => setAdding(false)} disabled={saving}
                      className="px-5 py-2 rounded-full border border-gray-300 dark:border-gray-600 text-sm text-charcoal dark:text-gray-200">
                      Άκυρο
                    </button>
                  )}
                </div>
              </div>
            )}

            {!canEdit && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">
                Την ενημέρωση του ταμείου την κάνει ο/η Ταμίας.
              </p>
            )}

            {history.length > 1 && (
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Προηγούμενες μετρήσεις</p>
                <table className="w-full text-sm">
                  <tbody>
                    {history.slice(1).map(h => (
                      <tr key={h.documentId} className="border-t border-gray-100 dark:border-gray-700">
                        <td className="py-2 text-gray-500 dark:text-gray-400 notranslate">{gr(h.asOf)}</td>
                        <td className="py-2 text-right text-charcoal dark:text-gray-200 notranslate">{eur(h.bank)}</td>
                        <td className="py-2 text-right text-gray-400 dark:text-gray-500 notranslate w-24">
                          {h.cash != null ? eur(h.cash) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!latest && !canEdit && (
              <p className="text-sm text-gray-400 dark:text-gray-500">Δεν έχει καταχωρηθεί ακόμη μέτρηση.</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
