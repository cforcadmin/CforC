'use client'

import { useMemo, useRef, useState } from 'react'
import { LIBRARY_TAXONOMY, getSubLabel } from '@/lib/memberTaxonomy'
import { LIBRARY_DOC_TYPES, LIBRARY_LANGUAGES } from './libraryPrefs'
import { shortDocType } from '@/lib/library'

/**
 * Φόρμα καταχώρησης τεκμηρίου.
 *
 * Η υποθεματική ακολουθεί τη θεματική — αυτό ακριβώς ζήτησε η ομάδα και
 * δεν λύνεται μέσα στο υπολογιστικό φύλλο. Οι λίστες βγαίνουν από την ίδια
 * ταξινομία με τα πεδία των μελών, οπότε δεν μπορούν να αποκλίνουν.
 *
 * Οι κλάσεις διάταξης (πλάτη, στοίβες, βελάκι select) μπαίνουν inline:
 * σε αυτό το project έχουν ήδη αποτύχει σιωπηλά τέσσερις φορές.
 */

const FULL: React.CSSProperties = { display: 'block', width: '100%', boxSizing: 'border-box' }
const RESET_SELECT: React.CSSProperties = {
  ...FULL, appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
  backgroundImage: 'none', paddingRight: '2rem',
}
const input = 'rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-base text-charcoal dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-coral'
const label = 'block text-sm font-bold text-gray-600 dark:text-gray-300 mb-1'

export default function LibraryForm({ onClose, onSaved }: {
  onClose: () => void
  onSaved: (result: { state: string; duplicateOf: { title: string } | null }) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [year, setYear] = useState('')
  const [theme, setTheme] = useState('')
  const [subthemes, setSubthemes] = useState<string[]>([])
  const [docType, setDocType] = useState('')
  const [language, setLanguage] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const subOptions = useMemo(() => {
    const cat = LIBRARY_TAXONOMY.find(c => c.label === theme)
    return cat ? cat.subcategories.map(getSubLabel) : []
  }, [theme])

  const pickTheme = (t: string) => { setTheme(t); setSubthemes([]) }
  const toggleSub = (s: string) =>
    setSubthemes(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!title.trim()) return setError('Συμπλήρωσε τον τίτλο')
    if (!theme) return setError('Διάλεξε θεματική')
    if (!docType) return setError('Διάλεξε είδος αρχείου')
    if (!file && !sourceUrl.trim()) return setError('Χρειάζεται αρχείο ή σύνδεσμος πηγής')

    setBusy(true)
    try {
      const fd = new FormData()
      fd.set('title', title.trim())
      fd.set('description', description.trim())
      fd.set('year', year)
      fd.set('theme', theme)
      fd.set('subthemes', JSON.stringify(subthemes))
      fd.set('docType', docType)
      fd.set('language', language)
      fd.set('sourceUrl', sourceUrl.trim())
      if (file) fd.set('file', file)

      const res = await fetch('/api/library/submit', { method: 'POST', body: fd })
      const j = await res.json().catch(() => null)
      if (!res.ok) throw new Error(j?.error || 'Η καταχώρηση απέτυχε')
      onSaved({ state: j.state, duplicateOf: j.duplicateOf })
    } catch (err: any) {
      setError(err?.message || 'Απρόσμενο σφάλμα')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="lib-form-title"
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl max-w-2xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-6">
          <h3 id="lib-form-title" className="text-2xl font-bold text-charcoal dark:text-gray-100">Νέο τεκμήριο</h3>
          <button type="button" onClick={onClose} aria-label="Κλείσιμο"
            className="text-gray-400 hover:text-charcoal dark:hover:text-gray-100 text-2xl leading-none">×</button>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className={label} htmlFor="lib-title">Τίτλος *</label>
            <input id="lib-title" value={title} onChange={e => setTitle(e.target.value)}
              style={FULL} className={input} placeholder="Ο πλήρης τίτλος του τεκμηρίου" />
          </div>

          <div>
            <label className={label} htmlFor="lib-desc">Περιγραφή</label>
            <textarea id="lib-desc" value={description} onChange={e => setDescription(e.target.value)}
              rows={4} style={FULL} className={input}
              placeholder="Τι πραγματεύεται, σε ποιους απευθύνεται, τι χρησιμεύει" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className={label} htmlFor="lib-theme">Θεματική *</label>
              <div style={{ position: 'relative' }}>
                <select id="lib-theme" value={theme} onChange={e => pickTheme(e.target.value)}
                  style={RESET_SELECT} className={input}>
                  <option value="">— Διάλεξε —</option>
                  {LIBRARY_TAXONOMY.map(c => <option key={c.label} value={c.label}>{c.label}</option>)}
                </select>
                <span aria-hidden="true" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 10 }} className="text-gray-400">▼</span>
              </div>
            </div>
            <div>
              <label className={label} htmlFor="lib-year">Έτος κυκλοφορίας</label>
              <input id="lib-year" value={year} onChange={e => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                inputMode="numeric" style={FULL} className={input} placeholder="2026" />
            </div>
          </div>

          {theme && (
            <div>
              <span className={label}>Υποθεματική</span>
              <div className="rounded-xl border border-gray-200 dark:border-gray-600 p-3 max-h-44 overflow-y-auto"
                style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {subOptions.map(s => {
                  const on = subthemes.includes(s)
                  return (
                    <button key={s} type="button" onClick={() => toggleSub(s)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        on ? 'bg-coral text-white border-coral'
                          : 'border-gray-300 dark:border-gray-600 text-charcoal dark:text-gray-200 hover:border-coral'
                      }`}>{s}</button>
                  )
                })}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Μία ή περισσότερες.</p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className={label} htmlFor="lib-type">Είδος αρχείου *</label>
              <div style={{ position: 'relative' }}>
                <select id="lib-type" value={docType} onChange={e => setDocType(e.target.value)}
                  style={RESET_SELECT} className={input}>
                  <option value="">— Διάλεξε —</option>
                  {LIBRARY_DOC_TYPES.map(d => <option key={d} value={d}>{shortDocType(d)}</option>)}
                </select>
                <span aria-hidden="true" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 10 }} className="text-gray-400">▼</span>
              </div>
            </div>
            <div>
              <label className={label} htmlFor="lib-lang">Γλώσσα</label>
              <div style={{ position: 'relative' }}>
                <select id="lib-lang" value={language} onChange={e => setLanguage(e.target.value)}
                  style={RESET_SELECT} className={input}>
                  <option value="">— Διάλεξε —</option>
                  {LIBRARY_LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <span aria-hidden="true" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 10 }} className="text-gray-400">▼</span>
              </div>
            </div>
          </div>

          <div>
            <label className={label} htmlFor="lib-src">Σύνδεσμος πηγής (εκδότη)</label>
            <input id="lib-src" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)}
              style={FULL} className={input} placeholder="https://…" />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Προαιρετικό, αλλά προτιμότερο όπου υπάρχει — σωστή απόδοση και κανένα ζήτημα δικαιωμάτων.
            </p>
          </div>

          <div>
            <span className={label}>Αρχείο</span>
            <input ref={fileRef} type="file" onChange={e => setFile(e.target.files?.[0] ?? null)}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.epub,.txt,.csv,.png,.jpg,.jpeg"
              style={FULL}
              className="text-sm text-charcoal dark:text-gray-200 file:mr-3 file:px-4 file:py-2 file:rounded-full file:border-0 file:bg-coral file:text-white file:text-sm file:font-bold" />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Έως 40 MB. Ανεβαίνει στον φάκελο της βιβλιοθήκης και το ανοίγουν μόνο συνδεδεμένα μέλη.
            </p>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button type="submit" disabled={busy}
              className="px-6 py-2.5 rounded-full bg-coral text-white text-sm font-bold hover:bg-coral/90 disabled:opacity-40">
              {busy ? 'Καταχώρηση…' : 'Καταχώρηση'}
            </button>
            <button type="button" onClick={onClose} disabled={busy}
              className="px-5 py-2.5 rounded-full border border-gray-300 dark:border-gray-600 text-sm text-charcoal dark:text-gray-200">
              Άκυρο
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
