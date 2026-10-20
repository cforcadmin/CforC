'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BlockEditor, PreviewFrame, ImageField, type EditorBlock } from '@/components/oc/OcCampaigns'
import { CONTENT_TYPES, type ContentTypeKey, type ContentField } from '@/lib/ocContent'

/**
 * ΤΟ ΠΕΡΙΕΧΟΜΕΝΟ ΤΟΥ SITE, ΓΡΑΜΜΕΝΟ ΕΔΩ — Νέα, Έργα, Καταχωρήσεις.
 *
 * Μέχρι σήμερα άνοιγε κανείς το Strapi. Εδώ γράφονται με τα ΙΔΙΑ μπλοκ που
 * φτιάχνουν το newsletter, ώστε ένα άρθρο να μοιάζει με το γράμμα που το
 * ανήγγειλε.
 *
 * ΓΙΑΤΙ ΔΑΝΕΙΖΕΤΑΙ ΤΟΝ ΣΥΝΘΕΤΗ ΑΝΤΙ ΝΑ ΤΟΝ ΞΑΝΑΓΡΑΨΕΙ: ο BlockEditor και η
 * PreviewFrame είναι ΟΙ ΙΔΙΕΣ οθόνες που χρησιμοποιεί το newsletter. Ένα
 * δεύτερο αντίγραφο θα απέκλινε στην πρώτη διόρθωση, και θα ξανάρχιζε το
 * «η προεπισκόπηση δείχνει άλλο από το δημοσιευμένο».
 */

interface Meta {
  blockLabels: Record<string, string>
  blockVariants: Record<string, { key: string; options: Array<{ value: string; label: string }> }>
  presets: Array<{ id: string; label: string; hint: string; blocks: EditorBlock[] }>
  mergeFields: Array<{ token: string; label: string; sample: string }>
  tocDefaultTitle?: string
}

type Notice = { kind: 'ok' | 'err'; text: string } | null

const TABS: ContentTypeKey[] = ['news', 'projects', 'entries']

/** Ό,τι κρατά ένα άρθρο ενώ γράφεται */
interface Draft {
  id: string | null
  fields: Record<string, any>
  blocks: EditorBlock[]
  headerStyle: 'none' | 'coral'
}

const emptyDraft = (): Draft => ({ id: null, fields: {}, blocks: [], headerStyle: 'none' })

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

      /* ΣΥΜΒΑΤΟΤΗΤΑ: ό,τι γράφτηκε πριν από αυτή την οθόνη δεν έχει μπλοκ —
         έχει το παλιό πεδίο `blocks` του Strapi. Ανοίγει με άδειο συνθέτη και
         μια σημείωση, αντί να σκάσει ή να σβήσει ό,τι υπάρχει. */
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
      {/* ── καρτέλες ειδών ───────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map(k => (
          <button key={k} type="button" onClick={() => { setType(k); setDraft(null); setNotice(null) }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
              type === k
                ? 'bg-charcoal text-white border-charcoal dark:bg-gray-100 dark:text-gray-900 dark:border-gray-100'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
            }`}>
            {CONTENT_TYPES[k].label}
          </button>
        ))}
        <div className="ml-auto">
          <button type="button" onClick={openNew}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-coral text-white hover:bg-coral-dark">
            + Νέο {t.singular}
          </button>
        </div>
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
        <ContentList
          items={items} type={type} loading={loading}
          onOpen={openItem} busy={busy}
        />
      )}

      {draft && meta && (
        <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)_380px] gap-5 items-start">
          {/* ── στοιχεία κάρτας ── */}
          <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <h3 className="px-4 py-3 text-xs font-bold tracking-wider uppercase text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              Στοιχεία κάρτας
            </h3>
            <div className="p-4 space-y-3">
              {t.fields.map(f => (
                <Field key={f.name} field={f}
                  value={draft.fields[f.name]}
                  onChange={v => setField(f.name, v)} />
              ))}
            </div>
          </section>

          {/* ── ο συνθέτης ── */}
          <section className="space-y-4">
            <BlockEditor
              blocks={draft.blocks}
              setBlocks={b => setDraft(d => d ? { ...d, blocks: b } : d)}
              meta={meta as any}
              kind="page"
              onReveal={i => setGoTo(g => ({ i, n: (g?.n ?? 0) + 1 }))}
            />
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 flex flex-wrap items-center gap-3">
              <label className="text-sm text-charcoal dark:text-gray-200 flex items-center gap-2">
                <input type="checkbox" checked={draft.headerStyle === 'coral'}
                  onChange={e => setDraft(d => d ? { ...d, headerStyle: e.target.checked ? 'coral' : 'none' } : d)} />
                Κοραλί ζώνη με τον τίτλο
              </label>
              {/* Η σελίδα τυπώνει ΗΔΗ δικό της <h1>· η ζώνη τον δείχνει δεύτερη φορά. */}
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Η σελίδα δείχνει ήδη τον τίτλο από πάνω — άφησέ το κλειστό εκτός αν τον θες και μέσα στο άρθρο.
              </span>
            </div>
          </section>

          {/* ── προεπισκόπηση + αποθήκευση ── */}
          <section className="space-y-4 xl:sticky xl:top-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <h3 className="px-4 py-3 text-xs font-bold tracking-wider uppercase text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                Πώς φαίνεται στη σελίδα
              </h3>
              <PreviewFrame html={preview} goTo={goTo} height={460} />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
              {missing.length > 0 && (
                <p className="text-xs text-coral-dark dark:text-coral-light">
                  Λείπουν: {missing.join(' · ')}
                </p>
              )}
              <div className="flex gap-2">
                <button type="button" onClick={save} disabled={busy || missing.length > 0}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-coral text-white hover:bg-coral-dark disabled:opacity-40">
                  {busy ? 'Αποθήκευση…' : draft.id ? 'Αποθήκευση' : `Δημοσίευση ${t.singular}`}
                </button>
                <button type="button" onClick={() => { setDraft(null); setNotice(null) }}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300">
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

/** Η λίστα: μόνο τα στοιχεία της κάρτας, χωρίς το κείμενο — είναι δεκάδες KB */
function ContentList({ items, type, loading, onOpen, busy }: {
  items: any[]; type: ContentTypeKey; loading: boolean
  onOpen: (id: string) => void; busy: boolean
}) {
  const t = CONTENT_TYPES[type]
  if (loading) return <p className="text-sm text-gray-500 dark:text-gray-400">Φόρτωση…</p>
  if (!items.length) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Κανένα {t.singular} ακόμη.</p>
  }
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
      {items.map(it => (
        <button key={it.documentId} type="button" disabled={busy}
          onClick={() => onOpen(it.documentId)}
          className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-3 disabled:opacity-50">
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-semibold text-charcoal dark:text-gray-100 truncate">
              {it[t.titleField] || '(χωρίς τίτλο)'}
            </span>
            <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
              {t.listFields.filter(f => f !== t.titleField)
                .map(f => it[f]).filter(v => v !== null && v !== undefined && v !== '')
                .join(' · ')}
            </span>
          </span>
          <span className="text-xs text-gray-400">Άνοιγμα</span>
        </button>
      ))}
    </div>
  )
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
        <ImageField
          src={value?.src || ''} alt={value?.alt || ''} mediaId={value?.mediaId}
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
