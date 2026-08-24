'use client'

import { useMemo, useRef, useState } from 'react'
import { useEscape } from '@/hooks/useEscape'
import { LIBRARY_TAXONOMY, getSubLabel } from '@/lib/memberTaxonomy'
import { LIBRARY_DOC_TYPES, LIBRARY_LANGUAGES } from './libraryPrefs'
import { shortDocType, LIMITS, type LibraryItem, type SecondaryTheme } from '@/lib/library'

/**
 * Φόρμα τεκμηρίου — δημιουργία ΚΑΙ επεξεργασία (ο Βιβλιοθηκάριος).
 *
 * ΤΟ ΑΡΧΕΙΟ ΑΝΕΒΑΙΝΕΙ ΚΑΤΕΥΘΕΙΑΝ ΣΤΟ DRIVE, όχι μέσω του server: το
 * πέρασμα από εμάς σκόνταφτε σε δύο αόρατα όρια γύρω στα 5 MB (multipart
 * του Drive, σώμα αιτήματος πλατφόρμας) και οι βιβλιοθηκάριοι έχασαν 18
 * από 50 αρχεία. Ο server ανοίγει τη συνεδρία· τα bytes πάνε στην Google.
 *
 * Τα όρια (LIMITS) επιβάλλονται ΚΑΙ εδώ ΚΑΙ στον server — εδώ για να μη
 * γραφτεί ποτέ παραπάνω, εκεί γιατί ο client δεν είναι όριο.
 */

const FULL: React.CSSProperties = { display: 'block', width: '100%', boxSizing: 'border-box' }
const RESET_SELECT: React.CSSProperties = {
  ...FULL, appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
  backgroundImage: 'none', paddingRight: '2rem',
}
const input = 'rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-base text-charcoal dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-coral'
const label = 'block text-sm font-bold text-gray-600 dark:text-gray-300 mb-1'

/** Ετικέτα που κοκκινίζει και λέει τι λείπει, δίπλα στο όνομα του πεδίου */
function FieldLabel({ htmlFor, text, err }: { htmlFor?: string; text: string; err?: string }) {
  return (
    <label className={`block text-sm font-bold mb-1 ${err ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-300'}`} htmlFor={htmlFor}>
      {text}
      {err && <span className="font-normal"> — {err}</span>}
    </label>
  )
}

/** Μετρητής όπως στο προφίλ: εμφανίζεται πάντα, κοκκινίζει στο όριο */
function Counter({ len, max }: { len: number; max: number }) {
  return (
    <p className={`text-xs mt-1 ${len >= max ? 'text-red-500 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
      <span className="notranslate">{len} / {max}</span> χαρακτήρες
    </p>
  )
}

function Chevron() {
  return <span aria-hidden="true" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 10 }} className="text-gray-400">▼</span>
}

export default function LibraryForm({ onClose, onSaved, onShowGuide, editItem }: {
  onClose: () => void
  onSaved: (result: { state: string; duplicateOf: { title: string } | null; previous?: Record<string, unknown> }) => void
  onShowGuide?: () => void
  /** Αν δοθεί, η φόρμα επεξεργάζεται υπάρχον τεκμήριο (μόνο Βιβλιοθηκάριος) */
  editItem?: LibraryItem | null
}) {
  const editing = !!editItem
  const [title, setTitle] = useState(editItem?.title ?? '')
  const [description, setDescription] = useState(editItem?.description ?? '')
  const [year, setYear] = useState(editItem?.year ? String(editItem.year) : '')
  const [theme, setTheme] = useState(editItem?.theme ?? '')
  const [subthemes, setSubthemes] = useState<string[]>(editItem?.subthemes ?? [])
  const [secondary, setSecondary] = useState<SecondaryTheme[]>(editItem?.secondaryThemes ?? [])
  const [docType, setDocType] = useState(editItem?.docType ?? '')
  const [language, setLanguage] = useState(editItem?.language ?? '')
  const [sourceUrl, setSourceUrl] = useState(editItem?.sourceUrl ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Σφάλμα ΑΝΑ πεδίο, δίπλα στην ετικέτα του — ένα γενικό μήνυμα στο τέλος
  // ανάγκαζε τον χρήστη να μαντέψει ποιο πεδίο φταίει.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [showYears, setShowYears] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const clearFieldError = (k: string) =>
    setFieldErrors(p => (k in p ? Object.fromEntries(Object.entries(p).filter(([x]) => x !== k)) : p))

  useEscape(() => {
    if (showYears) { setShowYears(false); return }
    if (!busy) onClose()   // στη μέση ανεβάσματος το Escape δεν πετά τη δουλειά
  })

  const YEARS = (() => {
    const max = new Date().getFullYear() + 1
    const out: number[] = []
    for (let y = max; y >= LIMITS.yearMin; y--) out.push(y)
    return out
  })()

  const subOptions = useMemo(() => {
    const cat = LIBRARY_TAXONOMY.find(c => c.label === theme)
    return cat ? cat.subcategories.map(getSubLabel) : []
  }, [theme])

  const pickTheme = (t: string) => {
    setTheme(t); setSubthemes([])
    setSecondary(p => p.filter(b => b.theme !== t))
  }
  const toggleSub = (s: string) =>
    setSubthemes(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])

  // ── Δευτερεύουσες θεματικές ─────────────────────────────────
  const usedThemes = [theme, ...secondary.map(b => b.theme)]
  const addSecondary = () => setSecondary(p => [...p, { theme: '', subthemes: [] }])
  const setSecondaryTheme = (i: number, t: string) =>
    setSecondary(p => p.map((b, j) => j === i ? { theme: t, subthemes: [] } : b))
  const toggleSecondarySub = (i: number, s: string) =>
    setSecondary(p => p.map((b, j) => j === i
      ? { ...b, subthemes: b.subthemes.includes(s) ? b.subthemes.filter(x => x !== s) : [...b.subthemes, s] }
      : b))
  const removeSecondary = (i: number) => setSecondary(p => p.filter((_, j) => j !== i))

  /** Bytes κατευθείαν στην Google, με πρόοδο. Επιστρέφει το id του αρχείου.
   *
   * ΠΡΟΣΟΧΗ ΣΤΟ 100%: το onprogress μετρά bytes που ΣΤΑΛΘΗΚΑΝ, όχι που
   * έγιναν δεκτά — μπάρα στο 100% δεν σημαίνει επιτυχία. Γι' αυτό κάθε
   * κατάληξη εδώ λέει ΑΚΡΙΒΩΣ τι απάντησε (ή δεν απάντησε) η Google, και
   * όλα τα βήματα γράφουν [library-upload] στην κονσόλα για ιχνηλάτηση. */
  function putToDrive(uploadUrl: string, f: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', uploadUrl)
      xhr.setRequestHeader('Content-Type', f.type)
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
      }
      xhr.onload = () => {
        console.info('[library-upload] PUT απάντηση:', xhr.status, String(xhr.responseText).slice(0, 200))
        try {
          const j = JSON.parse(xhr.responseText)
          if (xhr.status < 300 && j.id) { console.info('[library-upload] ✓ id:', j.id); resolve(j.id) }
          else reject(new Error(`Το Drive απέρριψε το ανέβασμα (HTTP ${xhr.status}): ${String(xhr.responseText).slice(0, 120)}`))
        } catch {
          reject(new Error(`Απρόσμενη απάντηση από το Drive (HTTP ${xhr.status}).`))
        }
      }
      xhr.onerror = () => {
        console.error('[library-upload] PUT onerror — η απάντηση μπλοκαρίστηκε (πιθανό CORS) ή κόπηκε η σύνδεση')
        reject(new Error('Το ανέβασμα ολοκληρώθηκε αλλά η απάντηση της Google μπλοκαρίστηκε (πιθανό CORS) ή διακόπηκε η σύνδεση. Στείλε μας τι γράφει η κονσόλα (⌥⌘J).'))
      }
      xhr.send(f)
    })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    // Όλα τα σφάλματα ΜΑΖΙ, το καθένα δίπλα στο πεδίο του
    const errs: Record<string, string> = {}
    if (!title.trim()) errs.title = 'Ξέχασες να βάλεις τον τίτλο.'
    if (!theme) errs.theme = 'Ξέχασες να διαλέξεις θεματική.'
    if (!docType) errs.docType = 'Ξέχασες να διαλέξεις είδος.'
    if (!editing && !file && !sourceUrl.trim()) errs.file = 'Χρειάζεται αρχείο ή σύνδεσμος πηγής — τουλάχιστον ένα.'
    secondary.forEach((b, i) => { if (!b.theme) errs[`sec-${i}`] = 'Διάλεξε θεματική ή αφαίρεσέ τη.' })
    setFieldErrors(errs)
    if (Object.keys(errs).length) {
      setError(Object.keys(errs).length === 1 ? 'Λείπει ένα πεδίο — δες την κόκκινη ένδειξη.' : `Λείπουν ${Object.keys(errs).length} πεδία — δες τις κόκκινες ενδείξεις.`)
      return
    }

    setBusy(true)
    try {
      // 1. Το αρχείο πρώτα, κατευθείαν στο Drive
      let driveFileId: string | null = null
      if (file) {
        const sess = await fetch('/api/library/upload-session', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: file.name, mimeType: file.type, size: file.size }),
        })
        const sj = await sess.json().catch(() => null)
        console.info('[library-upload] συνεδρία:', sess.status, sj?.uploadUrl ? 'ok' : sj)
        if (!sess.ok) throw new Error(sj?.error || `Δεν άνοιξε συνεδρία ανεβάσματος (HTTP ${sess.status}).`)
        setProgress(0)
        driveFileId = await putToDrive(sj.uploadUrl, file)
        setProgress(null)
      }

      // 2. Η καταχώρηση
      if (editing) {
        const res = await fetch('/api/library/manage', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentId: editItem!.documentId,
            title: title.trim(), description: description.trim(), year: year || null,
            theme, subthemes, secondaryThemes: secondary, docType,
            language, sourceUrl: sourceUrl.trim(),
            ...(driveFileId ? { driveFileId } : {}),
          }),
        })
        const j = await res.json().catch(() => null)
        if (!res.ok) throw new Error(j?.error || 'Η ενημέρωση απέτυχε — δοκίμασε ξανά.')
        onSaved({ state: 'updated', duplicateOf: null, previous: j?.previous })
      } else {
        const fd = new FormData()
        fd.set('title', title.trim())
        fd.set('description', description.trim())
        fd.set('year', year)
        fd.set('theme', theme)
        fd.set('subthemes', JSON.stringify(subthemes))
        fd.set('secondaryThemes', JSON.stringify(secondary.filter(b => b.theme)))
        fd.set('docType', docType)
        fd.set('language', language)
        fd.set('sourceUrl', sourceUrl.trim())
        if (driveFileId) fd.set('driveFileId', driveFileId)
        const res = await fetch('/api/library/submit', { method: 'POST', body: fd })
        const j = await res.json().catch(() => null)
        console.info('[library-submit] απάντηση:', res.status, j)
        if (!res.ok) throw new Error(j?.error || 'Η καταχώρηση απέτυχε — αν το πρόβλημα επιμένει, ενημέρωσε το it@cultureforchange.net.')
        onSaved({ state: j.state, duplicateOf: j.duplicateOf })
      }
    } catch (err: any) {
      setError(err?.message || 'Απρόσμενο σφάλμα.')
      setProgress(null)
    } finally {
      setBusy(false)
    }
  }

  const themeSelect = (value: string, exclude: string[], onChange: (t: string) => void, id: string) => (
    <div style={{ position: 'relative' }}>
      <select id={id} value={value} onChange={e => onChange(e.target.value)} style={RESET_SELECT} className={input}>
        <option value="">— Διάλεξε —</option>
        {LIBRARY_TAXONOMY.filter(c => c.label === value || !exclude.includes(c.label))
          .map(c => <option key={c.label} value={c.label}>{c.label}</option>)}
      </select>
      <Chevron />
    </div>
  )

  const subChips = (options: string[], picked: string[], toggle: (s: string) => void) => (
    <div className="rounded-xl border border-gray-200 dark:border-gray-600 p-3 max-h-44 overflow-y-auto"
      style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map(s => {
        const on = picked.includes(s)
        return (
          <button key={s} type="button" onClick={() => toggle(s)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              on ? 'bg-coral text-white border-coral'
                : 'border-gray-300 dark:border-gray-600 text-charcoal dark:text-gray-200 hover:border-coral'
            }`}>{s}</button>
        )
      })}
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="lib-form-title"
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl max-w-2xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-6">
          <h3 id="lib-form-title" className="text-2xl font-bold text-charcoal dark:text-gray-100">
            {editing ? 'Επεξεργασία τεκμηρίου' : 'Νέο τεκμήριο'}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {onShowGuide && (
              <button type="button" onClick={onShowGuide}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-charcoal dark:text-gray-200 rounded-full text-sm font-medium transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Οδηγίες συμπλήρωσης
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Κλείσιμο"
              className="text-gray-400 hover:text-charcoal dark:hover:text-gray-100 text-2xl leading-none">×</button>
          </div>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <FieldLabel htmlFor="lib-title" text="Τίτλος *" err={fieldErrors.title} />
            <input id="lib-title" value={title} maxLength={LIMITS.title}
              onChange={e => { setTitle(e.target.value); clearFieldError('title') }}
              style={FULL} className={input} placeholder="Ο πλήρης τίτλος του τεκμηρίου" />
            <Counter len={title.length} max={LIMITS.title} />
          </div>

          <div>
            <label className={label} htmlFor="lib-desc">Περιγραφή</label>
            <textarea id="lib-desc" value={description} maxLength={LIMITS.description}
              onChange={e => setDescription(e.target.value)}
              rows={4} style={FULL} className={input}
              placeholder="Τι πραγματεύεται, σε ποιους απευθύνεται, τι χρησιμεύει" />
            <Counter len={description.length} max={LIMITS.description} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <FieldLabel htmlFor="lib-theme" text="Θεματική *" err={fieldErrors.theme} />
              {themeSelect(theme, usedThemes, t => { pickTheme(t); clearFieldError('theme') }, 'lib-theme')}
            </div>
            <div>
              <label className={label} htmlFor="lib-year">Έτος κυκλοφορίας</label>
              <div style={{ position: 'relative' }}>
                <input id="lib-year" value={year}
                  onChange={e => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  onFocus={() => setShowYears(true)}
                  inputMode="numeric" style={{ ...FULL, paddingRight: '2rem' }} className={input} placeholder="2026" />
                <button type="button" aria-label="Επιλογή έτους από λίστα"
                  onClick={() => setShowYears(v => !v)}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}
                  className="text-gray-400 hover:text-coral text-[10px] px-1">▼</button>
                {showYears && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 55 }} onClick={() => setShowYears(false)} aria-hidden="true" />
                    <div className="menu-glass rounded-xl"
                      style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, maxHeight: 200, overflowY: 'auto', zIndex: 56 }}>
                      {YEARS.map(y => (
                        <button key={y} type="button"
                          onClick={() => { setYear(String(y)); setShowYears(false) }}
                          className={`notranslate block w-full text-left px-4 py-1 text-sm ${
                            String(y) === year ? 'menu-row-on' : 'menu-row-off text-charcoal dark:text-gray-100'
                          }`}
                          style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}>
                          {y}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {theme && (
            <div>
              <span className={label}>Υποθεματική</span>
              {subChips(subOptions, subthemes, toggleSub)}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Μία ή περισσότερες.</p>
            </div>
          )}

          {/* Δευτερεύουσες θεματικές: για τεκμήρια που εμπίπτουν σε
              περισσότερα πεδία. Η κύρια καθορίζει πού «ζει»· όλες φιλτράρουν. */}
          {theme && secondary.map((block, i) => {
            const opts = LIBRARY_TAXONOMY.find(c => c.label === block.theme)?.subcategories.map(getSubLabel) ?? []
            return (
              <div key={i} className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-4"
                style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span className={`text-sm font-bold ${fieldErrors[`sec-${i}`] ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-300'}`}>
                    Δευτερεύουσα θεματική
                    {fieldErrors[`sec-${i}`] && <span className="font-normal"> — {fieldErrors[`sec-${i}`]}</span>}
                  </span>
                  <button type="button" onClick={() => removeSecondary(i)} aria-label="Αφαίρεση δευτερεύουσας θεματικής"
                    className="text-gray-400 hover:text-red-500 text-lg leading-none">×</button>
                </div>
                {themeSelect(block.theme, usedThemes, t => { setSecondaryTheme(i, t); clearFieldError(`sec-${i}`) }, `lib-sec-${i}`)}
                {block.theme && (
                  <div>
                    <span className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Υποθεματικές της δευτερεύουσας</span>
                    {subChips(opts, block.subthemes, s => toggleSecondarySub(i, s))}
                  </div>
                )}
              </div>
            )
          })}
          {theme && usedThemes.filter(Boolean).length < LIBRARY_TAXONOMY.length && (
            <button type="button" onClick={addSecondary}
              className="self-start text-sm text-coral dark:text-coral-light hover:underline">
              + Δευτερεύουσα θεματική
            </button>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <FieldLabel htmlFor="lib-type" text="Είδος αρχείου *" err={fieldErrors.docType} />
              <div style={{ position: 'relative' }}>
                <select id="lib-type" value={docType} onChange={e => { setDocType(e.target.value); clearFieldError('docType') }}
                  style={RESET_SELECT} className={input}>
                  <option value="">— Διάλεξε —</option>
                  {LIBRARY_DOC_TYPES.map(d => <option key={d} value={d}>{shortDocType(d)}</option>)}
                </select>
                <Chevron />
              </div>
            </div>
            <div>
              <label className={label} htmlFor="lib-lang">Γλώσσα</label>
              <div style={{ position: 'relative' }}>
                <select id="lib-lang" value={language ?? ''} onChange={e => setLanguage(e.target.value)}
                  style={RESET_SELECT} className={input}>
                  <option value="">— Διάλεξε —</option>
                  {LIBRARY_LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <Chevron />
              </div>
            </div>
          </div>

          <div>
            <label className={label} htmlFor="lib-src">Σύνδεσμος πηγής (εκδότη)</label>
            <input id="lib-src" value={sourceUrl ?? ''} maxLength={LIMITS.sourceUrl}
              onChange={e => { setSourceUrl(e.target.value); clearFieldError('file') }}
              style={FULL} className={input} placeholder="https://…" />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Προαιρετικό, αλλά προτιμότερο όπου υπάρχει — σωστή απόδοση και κανένα ζήτημα δικαιωμάτων.
            </p>
          </div>

          <div>
            <FieldLabel text={editing ? 'Αντικατάσταση αρχείου (προαιρετικό)' : 'Αρχείο'} err={fieldErrors.file} />
            <input ref={fileRef} type="file" onChange={e => { setFile(e.target.files?.[0] ?? null); clearFieldError('file') }}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.epub,.txt,.csv,.png,.jpg,.jpeg"
              style={FULL}
              className="text-sm text-charcoal dark:text-gray-200 file:mr-3 file:px-4 file:py-2 file:rounded-full file:border-0 file:bg-coral file:text-white file:text-sm file:font-bold" />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Έως 40 MB. Ανεβαίνει κατευθείαν στον φάκελο της βιβλιοθήκης και το ανοίγουν μόνο συνδεδεμένα μέλη.
              {editing && editItem?.fileName ? ` Τώρα: ${editItem.fileName}` : ''}
            </p>
          </div>

          {progress !== null && (
            <div>
              <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden">
                <div className="h-full bg-coral transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Ανέβασμα αρχείου… <span className="notranslate">{progress}%</span>
              </p>
            </div>
          )}

          {error && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button type="submit" disabled={busy}
              className="px-6 py-2.5 rounded-full bg-coral text-white text-sm font-bold hover:bg-coral/90 disabled:opacity-40">
              {busy ? (progress !== null ? 'Ανέβασμα…' : 'Αποθήκευση…') : (editing ? 'Αποθήκευση' : 'Καταχώρηση')}
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
