'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BlockEditor, PreviewFrame, ImageField, CONTROL, type EditorBlock } from '@/components/oc/OcCampaigns'
import { CONTENT_TYPES, type ContentTypeKey, type ContentField } from '@/lib/ocContent'

/**
 * ΤΟ ΠΕΡΙΕΧΟΜΕΝΟ ΤΟΥ SITE, ΓΡΑΜΜΕΝΟ ΕΔΩ — Νέα, Έργα, Καταχωρήσεις.
 *
 * Μέχρι σήμερα άνοιγε κανείς το Strapi. Εδώ γράφονται με τα ΙΔΙΑ μπλοκ που
 * φτιάχνουν το newsletter, ώστε ένα άρθρο να μοιάζει με το γράμμα που το
 * ανήγγειλε.
 *
 * ΓΙΑΤΙ ΔΑΝΕΙΖΕΤΑΙ ΤΟΝ ΣΥΝΘΕΤΗ ΑΝΤΙ ΝΑ ΤΟΝ ΞΑΝΑΓΡΑΨΕΙ: ο BlockEditor, η
 * PreviewFrame και το ImageField είναι ΟΙ ΙΔΙΕΣ οθόνες που χρησιμοποιεί το
 * newsletter. Ένα δεύτερο αντίγραφο θα απέκλινε στην πρώτη διόρθωση, και θα
 * ξανάρχιζε το «η προεπισκόπηση δείχνει άλλο από το δημοσιευμένο».
 */

interface Meta {
  blockLabels: Record<string, string>
  blockVariants: Record<string, { key: string; options: Array<{ value: string; label: string }> }>
  presets: Array<{ id: string; label: string; hint: string; blocks: EditorBlock[] }>
  mergeFields: Array<{ token: string; label: string; sample: string }>
  tocDefaultTitle?: string
}

type Notice = { kind: 'ok' | 'err'; text: string } | null
type SortKey = 'recent' | 'oldest' | 'title'

const TABS: ContentTypeKey[] = ['news', 'projects', 'entries']

/** Πόσα δείχνει η λίστα πριν ζητηθούν κι άλλα */
const PAGE = 5

interface Draft {
  id: string | null
  fields: Record<string, any>
  blocks: EditorBlock[]
  headerStyle: 'none' | 'coral'
}

const emptyDraft = (): Draft => ({ id: null, fields: {}, blocks: [], headerStyle: 'none' })

/** Η ημερομηνία με την οποία ταξινομείται ένα στοιχείο, όποιο κι αν είναι */
const dateOf = (it: any): number => {
  const v = it.Date || it.publication_date || it.updatedAt || it.createdAt
  const t = v ? new Date(v).getTime() : NaN
  return Number.isNaN(t) ? 0 : t
}

export default function OcContent() {
  const [type, setType] = useState<ContentTypeKey>('news')
  const [meta, setMeta] = useState<Meta | null>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)
  const [preview, setPreview] = useState('')
  const [goTo, setGoTo] = useState<{ i: number; n: number } | null>(null)

  const t = CONTENT_TYPES[type]

  const load = useCallback(async (which: ContentTypeKey) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/oc/content?type=${which}`)
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || 'Αποτυχία')
      setItems(d.items || [])
      if (d.meta) setMeta(d.meta)
    } catch (e: any) {
      setNotice({ kind: 'err', text: e?.message || 'Αποτυχία φόρτωσης' })
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load(type) }, [type, load])

  /**
   * Η προεπισκόπηση αποδίδεται στον SERVER, με τον ίδιο κώδικα που γράφει και
   * η αποθήκευση — ποτέ με δεύτερη υλοποίηση στον browser.
   *
   * Με καθυστέρηση: χωρίς αυτήν κάθε πληκτρολόγηση θα ήταν μία κλήση.
   */
  const previewTimer = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (!draft) return
    window.clearTimeout(previewTimer.current)
    previewTimer.current = window.setTimeout(async () => {
      try {
        const res = await fetch('/api/oc/content', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'preview', type,
            fields: draft.fields, blocks: draft.blocks, headerStyle: draft.headerStyle,
            /* Το πλαίσιο είναι ξεχωριστό έγγραφο και δεν ξέρει το θέμα του OC */
            theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
          }),
        })
        const d = await res.json()
        if (res.ok) setPreview(d.html || '')
      } catch { /* η προεπισκόπηση δεν σταματά τη δουλειά */ }
    }, 400)
    return () => window.clearTimeout(previewTimer.current)
  }, [draft, type])

  const openNew = () => { setDraft(emptyDraft()); setPreview(''); setNotice(null) }

  const openItem = async (id: string) => {
    setBusy(true); setNotice(null)
    try {
      const res = await fetch(`/api/oc/content?type=${type}&id=${encodeURIComponent(id)}`)
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || 'Δεν βρέθηκε')
      const item = d.item || {}
      const stored = item.Blocks || {}
      const blocks: EditorBlock[] = Array.isArray(stored.blocks) ? stored.blocks : []

      const fields: Record<string, any> = {}
      for (const f of t.fields) {
        const v = item[f.name]
        if (f.kind === 'media') {
          const m = Array.isArray(v) ? v[0] : v
          fields[f.name] = m ? { mediaId: m.id, src: m.url, alt: '' } : undefined
        } else fields[f.name] = v ?? ''
      }

      setDraft({ id, fields, blocks, headerStyle: stored.headerStyle === 'coral' ? 'coral' : 'none' })

      /* ΣΥΜΒΑΤΟΤΗΤΑ: ό,τι γράφτηκε πριν από αυτή την οθόνη δεν έχει μπλοκ.
         Ανοίγει με άδειο συνθέτη και μια σημείωση, αντί να σβήσει ό,τι υπάρχει. */
      if (!blocks.length) {
        setNotice({ kind: 'ok', text:
          `Αυτό το ${t.singular} γράφτηκε στο Strapi, όχι εδώ — το κείμενό του δεν έχει μπλοκ. `
          + 'Όσο ο συνθέτης μένει άδειος, η σελίδα συνεχίζει να δείχνει το παλιό κείμενο.' })
      }
    } catch (e: any) {
      setNotice({ kind: 'err', text: e?.message || 'Αποτυχία' })
    } finally { setBusy(false) }
  }

  const setField = (name: string, value: any) =>
    setDraft(d => d ? { ...d, fields: { ...d.fields, [name]: value } } : d)

  const save = async () => {
    if (!draft) return
    setBusy(true); setNotice(null)
    try {
      const res = await fetch('/api/oc/content', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save', type, id: draft.id || undefined,
          fields: draft.fields, blocks: draft.blocks, headerStyle: draft.headerStyle,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || 'Αποτυχία αποθήκευσης')
      setNotice({ kind: 'ok', text: `Το ${t.singular} αποθηκεύτηκε και είναι ζωντανό στο site.` })
      setDraft(dr => dr ? { ...dr, id: d.id } : dr)
      await load(type)
    } catch (e: any) {
      setNotice({ kind: 'err', text: e?.message || 'Αποτυχία' })
    } finally { setBusy(false) }
  }

  const missing = useMemo(() => {
    if (!draft) return []
    return t.fields
      .filter(f => f.required)
      .filter(f => f.kind === 'media'
        ? !Number.isInteger(draft.fields[f.name]?.mediaId)
        : String(draft.fields[f.name] ?? '').trim() === '')
      .map(f => f.label)
  }, [draft, t])

  return (
    <div className="space-y-5">
      {/* Ίδια μπάρα με τις καρτέλες του μηνύματος: ένα γυάλινο ενιαίο πλαίσιο
          με κοραλί το ενεργό. Τα χειριστήρια του OC είναι ένα λεξιλόγιο —
          δεν αποκτά κάθε οθόνη δικό της. */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 p-1 rounded-full glass-control" role="tablist">
          {TABS.map(k => (
            <button key={k} type="button" role="tab" aria-selected={type === k}
              onClick={() => { setType(k); setDraft(null); setNotice(null) }}
              className={`px-4 min-h-11 rounded-full text-sm font-semibold transition-colors ${
                type === k ? 'bg-coral text-charcoal' : 'text-gray-600 dark:text-gray-300'
              }`}>
              {CONTENT_TYPES[k].label}
            </button>
          ))}
        </div>
        <button type="button" onClick={openNew}
          className="ml-auto px-5 min-h-11 rounded-full bg-coral text-white text-sm font-bold hover:bg-coral-dark">
          + Νέο {t.singular}
        </button>
      </div>

      {notice && (
        <div role={notice.kind === 'err' ? 'alert' : 'status'}
          className={`rounded-2xl px-4 py-3 text-sm ${
            notice.kind === 'err'
              ? 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-800'
              : 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-800'
          }`}>
          {notice.text}
        </div>
      )}

      {!draft && (
        <ContentList items={items} type={type} loading={loading} onOpen={openItem} busy={busy} />
      )}

      {draft && meta && (
        /**
         * Η ΠΡΟΕΠΙΣΚΟΠΗΣΗ ΔΙΠΛΑ, ΟΧΙ ΑΠΟ ΚΑΤΩ.
         *
         * Στο `lg` (1024px) η οθόνη χωρίζεται ήδη στα δύο: αριστερά στοιχεία
         * και συνθέτης, δεξιά η προεπισκόπηση — κολλημένη, ώστε να μένει
         * ορατή όσο κατεβαίνει κανείς στα μπλοκ. Στο `2xl` ανοίγει σε τρεις
         * στήλες. Με όριο μόνο στο `xl` η προεπισκόπηση έπεφτε κάτω από τα
         * πάντα σε κανονικό παράθυρο, που είναι σαν να μην υπάρχει.
         */
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[280px_minmax(0,1fr)_420px] gap-5 items-start">
          <div className="space-y-5 2xl:contents">
            <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <h3 className="px-4 py-3 text-xs font-bold tracking-wider uppercase text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                Στοιχεία κάρτας
              </h3>
              <div className="p-4 space-y-3">
                {t.fields.map(f => (
                  <Field key={f.name} field={f} value={draft.fields[f.name]}
                    onChange={v => setField(f.name, v)} />
                ))}
              </div>
            </section>

            <section className="space-y-4 min-w-0">
              <BlockEditor
                blocks={draft.blocks}
                setBlocks={b => setDraft(d => d ? { ...d, blocks: b } : d)}
                meta={meta as any}
                kind="page"
                onReveal={i => setGoTo(g => ({ i, n: (g?.n ?? 0) + 1 }))}
              />
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                <label className="text-sm text-charcoal dark:text-gray-200 flex items-center gap-2">
                  <input type="checkbox" checked={draft.headerStyle === 'coral'}
                    onChange={e => setDraft(d => d ? { ...d, headerStyle: e.target.checked ? 'coral' : 'none' } : d)} />
                  Κοραλί ζώνη με τον τίτλο μέσα στο άρθρο
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Η σελίδα δείχνει ήδη τον τίτλο στην κορυφή — άφησέ το κλειστό εκτός αν τον θες και δεύτερη φορά.
                </p>
              </div>
            </section>
          </div>

          <section className="space-y-4 lg:sticky lg:top-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <h3 className="px-4 py-3 text-xs font-bold tracking-wider uppercase text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                Πώς φαίνεται στη σελίδα
              </h3>
              <PreviewFrame html={preview} goTo={goTo} height={520} />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
              {missing.length > 0 && (
                <p className="text-xs text-coral-dark dark:text-coral-light">Λείπουν: {missing.join(' · ')}</p>
              )}
              <div className="flex gap-2">
                <button type="button" onClick={save} disabled={busy || missing.length > 0}
                  className="flex-1 px-5 min-h-11 rounded-full bg-coral text-white text-sm font-bold hover:bg-coral-dark disabled:opacity-40">
                  {busy ? 'Αποθήκευση…' : draft.id ? 'Αποθήκευση' : `Δημοσίευση ${t.singular}`}
                </button>
                <button type="button" onClick={() => { setDraft(null); setNotice(null) }}
                  className={`${CONTROL} font-semibold`}>
                  Κλείσιμο
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Η διαγραφή γίνεται από το Strapi — το διακριτικό του site δεν τη δικαιούται.
              </p>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

/**
 * Η ΛΙΣΤΑ: ΤΑ ΠΕΝΤΕ ΠΙΟ ΠΡΟΣΦΑΤΑ, ΚΑΙ ΜΕΤΑ ΟΣΑ ΖΗΤΗΘΟΥΝ.
 *
 * Σχεδόν πάντα η δουλειά αφορά κάτι που μόλις γράφτηκε. Σαράντα οκτώ άρθρα
 * σε μια στήλη κρύβουν ακριβώς αυτά. Η αναζήτηση και τα φίλτρα δουλεύουν
 * πάνω σε ΟΛΑ, όχι μόνο στα ορατά — αλλιώς «δεν βρέθηκε» θα σήμαινε «δεν
 * φαινόταν».
 */
function ContentList({ items, type, loading, onOpen, busy }: {
  items: any[]; type: ContentTypeKey; loading: boolean
  onOpen: (id: string) => void; busy: boolean
}) {
  const t = CONTENT_TYPES[type]
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('')
  const [sort, setSort] = useState<SortKey>('recent')
  const [shown, setShown] = useState(PAGE)

  useEffect(() => { setShown(PAGE) }, [q, filter, sort, type])

  /** Οι τιμές του φίλτρου βγαίνουν από τα ΙΔΙΑ τα δεδομένα */
  const options = useMemo(() => {
    const f = t.filterField
    if (!f) return []
    const seen = new Map<string, string>()
    for (const it of items) {
      for (const raw of String(it[f.name] ?? '').split(',')) {
        const v = raw.trim()
        if (v) seen.set(v, labelFor(type, f.name, v))
      }
    }
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1], 'el'))
  }, [items, t, type])

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const out = items.filter(it => {
      if (needle && !String(it[t.titleField] ?? '').toLowerCase().includes(needle)) return false
      if (filter && t.filterField) {
        const vals = String(it[t.filterField.name] ?? '').split(',').map(x => x.trim())
        if (!vals.includes(filter)) return false
      }
      return true
    })
    out.sort((a, b) => sort === 'title'
      ? String(a[t.titleField] ?? '').localeCompare(String(b[t.titleField] ?? ''), 'el')
      : sort === 'oldest' ? dateOf(a) - dateOf(b) : dateOf(b) - dateOf(a))
    return out
  }, [items, q, filter, sort, t])

  if (loading) return <p className="text-sm text-gray-500 dark:text-gray-400">Φόρτωση…</p>

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input type="search" value={q} onChange={e => setQ(e.target.value)}
          placeholder={`Αναζήτηση σε ${items.length}…`} className={`${CONTROL} flex-1 min-w-52`} />
        {t.filterField && options.length > 0 && (
          <select value={filter} onChange={e => setFilter(e.target.value)} className={CONTROL}>
            <option value="">Όλα — {t.filterField.label}</option>
            {options.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
          </select>
        )}
        <select value={sort} onChange={e => setSort(e.target.value as SortKey)} className={CONTROL}>
          <option value="recent">Πιο πρόσφατα πρώτα</option>
          <option value="oldest">Παλαιότερα πρώτα</option>
          <option value="title">Αλφαβητικά</option>
        </select>
      </div>

      {!visible.length ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {items.length ? 'Κανένα αποτέλεσμα με αυτά τα φίλτρα.' : `Κανένα ${t.singular} ακόμη.`}
        </p>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
            {visible.slice(0, shown).map(it => (
              <button key={it.documentId} type="button" disabled={busy}
                onClick={() => onOpen(it.documentId)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-3 disabled:opacity-50">
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-charcoal dark:text-gray-100 truncate">
                    {it[t.titleField] || '(χωρίς τίτλο)'}
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
                    {/* Το slug φορτώνεται (το θέλει το άνοιγμα) αλλά ΔΕΝ δείχνεται:
                        είναι μια γραμμή greeklish που πνίγει ημερομηνία και
                        κατηγορία, δηλαδή ακριβώς ό,τι ψάχνει το μάτι. */}
                    {t.listFields
                      .filter(f => f !== t.titleField && f !== t.slugField)
                      .map(f => labelFor(type, f, it[f]))
                      .filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span className="text-xs text-gray-400">Άνοιγμα</span>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {Math.min(shown, visible.length)} από {visible.length}
            </span>
            {shown < visible.length && (
              <button type="button" onClick={() => setShown(s => s + PAGE * 3)}
                className={`${CONTROL} font-semibold`}>
                Δες περισσότερα
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/** Οι κωδικοί του Strapi γίνονται λέξεις — «in_progress» δεν λέει τίποτα */
function labelFor(type: ContentTypeKey, field: string, value: any): string {
  if (value === null || value === undefined || value === '') return ''
  if (value === true) return 'Προβεβλημένο'
  if (value === false) return ''
  const opt = CONTENT_TYPES[type].fields.find(f => f.name === field)
    ?.options?.find(o => o.value === value)
  if (opt) return opt.label
  /* Ίδια παγίδα με την προεπισκόπηση: ημερομηνία χωρίς ώρα δεν περνά ποτέ
     από new Date(), αλλιώς γυρίζει μια μέρα πίσω σε ζώνη πίσω από το UTC. */
  const ymd = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (ymd) return `${Number(ymd[3])}/${Number(ymd[2])}/${ymd[1]}`
  return String(value)
}

/** Ένα πεδίο — η μορφή του βγαίνει από το είδος, όχι από αντιγραμμένο JSX */
function Field({ field: f, value, onChange }: {
  field: ContentField; value: any; onChange: (v: any) => void
}) {
  const label = (
    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
      {f.label}{f.required && <span className="text-coral-dark dark:text-coral-light"> *</span>}
    </label>
  )
  const cls = 'w-full text-sm px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-charcoal dark:text-gray-100'
  const hint = f.hint && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 leading-snug">{f.hint}</p>

  if (f.kind === 'media') {
    return (
      <div>
        {label}
        <ImageField src={value?.src || ''} alt={value?.alt || ''} mediaId={value?.mediaId}
          onChange={p => onChange({ ...(value || {}), ...p })} />
        {hint}
      </div>
    )
  }

  if (f.kind === 'boolean') {
    return (
      <div>
        <label className="flex items-center gap-2 text-sm text-charcoal dark:text-gray-200">
          <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} />
          {f.label}
        </label>
        {hint}
      </div>
    )
  }

  if (f.chips) {
    return <div>{label}<ChipsInput value={value ?? ''} onChange={onChange} />{hint}</div>
  }

  return (
    <div>
      {label}
      {f.kind === 'textarea' ? (
        <textarea rows={3} className={cls} value={value ?? ''} onChange={e => onChange(e.target.value)} />
      ) : f.kind === 'select' ? (
        <select className={cls} value={value ?? ''} onChange={e => onChange(e.target.value)}>
          <option value="">—</option>
          {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input
          type={f.kind === 'date' ? 'date' : f.kind === 'datetime' ? 'datetime-local' : f.kind === 'number' ? 'number' : 'text'}
          className={cls}
          value={f.kind === 'datetime' ? String(value ?? '').slice(0, 16) : (value ?? '')}
          onChange={e => onChange(e.target.value)} />
      )}
      {hint}
    </div>
  )
}

/**
 * ΕΤΙΚΕΤΕΣ ΩΣ ΦΥΣΑΛΙΔΕΣ. Enter ή κόμμα κλείνει την τρέχουσα και περιμένει την
 * επόμενη.
 *
 * Το πεδίο στο Strapi παραμένει ΚΕΙΜΕΝΟ χωρισμένο με κόμματα — έτσι το
 * διαβάζουν ήδη οι κάρτες και τα φίλτρα του site. Αλλάζει μόνο το πώς
 * γράφεται: σε ένα ενιαίο κουτί κανείς δεν ξέρει αν το κενό μετά το κόμμα
 * μετράει, και οι ετικέτες κατέληγαν με κενά μπροστά.
 */
function ChipsInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState('')
  const chips = useMemo(
    () => String(value ?? '').split(',').map(x => x.trim()).filter(Boolean), [value])

  const commit = (raw: string) => {
    const next = raw.trim()
    if (!next) return
    /* Χωρίς διπλά: η ίδια ετικέτα δύο φορές φτιάχνει δύο πανομοιότυπα
       φίλτρα στη σελίδα. Η σύγκριση αγνοεί πεζά/κεφαλαία. */
    if (!chips.some(c => c.toLowerCase() === next.toLowerCase())) {
      onChange([...chips, next].join(', '))
    }
    setText('')
  }

  const remove = (i: number) => onChange(chips.filter((_, x) => x !== i).join(', '))

  return (
    <div>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {chips.map((c, i) => (
            <span key={`${c}-${i}`}
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-cream dark:bg-gray-700 text-charcoal dark:text-gray-100 border border-gray-200 dark:border-gray-600">
              {c}
              <button type="button" onClick={() => remove(i)}
                aria-label={`Αφαίρεση ${c}`}
                className="text-gray-400 hover:text-coral-dark dark:hover:text-coral-light leading-none">×</button>
            </span>
          ))}
        </div>
      )}
      <input
        type="text" value={text}
        className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-charcoal dark:text-gray-100"
        placeholder={chips.length ? 'κι άλλη…' : 'γράψε και πάτα Enter'}
        onChange={e => {
          /* Το κόμμα κλείνει την ετικέτα τη στιγμή που γράφεται — και όταν
             κολληθεί ολόκληρη λίστα, μπαίνουν όλες μαζί. */
          if (e.target.value.includes(',')) {
            const parts = e.target.value.split(',')
            const rest = parts.pop() ?? ''
            let acc = chips
            for (const p of parts) {
              const n = p.trim()
              if (n && !acc.some(c => c.toLowerCase() === n.toLowerCase())) acc = [...acc, n]
            }
            onChange(acc.join(', '))
            setText(rest)
          } else setText(e.target.value)
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); commit(text) }
          /* Backspace σε άδειο κουτί σβήνει την τελευταία — η συνήθεια από
             κάθε άλλο πεδίο ετικετών. */
          else if (e.key === 'Backspace' && !text && chips.length) remove(chips.length - 1)
        }}
        onBlur={() => commit(text)}
      />
    </div>
  )
}
