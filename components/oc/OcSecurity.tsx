'use client'

// Ασφάλεια++ — μόνο για τη θέση IT. Φάση 1: τα Ζωτικά.
//
// Μία σειρά ανά έλεγχο, με χρώμα ΚΑΙ λέξη: το χρώμα μόνο του αποκλείει όποιον
// δεν το ξεχωρίζει, και η οθόνη υπάρχει ακριβώς για να λέει την αλήθεια.
//
// Τα υπόλοιπα τρία κουτιά (Χάρτης δεδομένων, Πρόσβαση & μυστικά, AI) έπονται —
// βλ. docs/OC-Asfaleia-Plus-Plus.md.

import { useCallback, useEffect, useState } from 'react'

type HealthState = 'ok' | 'warn' | 'down' | 'unknown'

interface SubCheck {
  key: string
  label: string
  state: HealthState
  detail: string
  action?: string
}

interface Check {
  key: string
  label: string
  state: HealthState
  detail: string
  ms?: number
  action?: string
  /** Ομαδοποιημένος έλεγχος (π.χ. τα αρχεία Google) — ανοίγει με κλικ */
  items?: SubCheck[]
}

interface Payload {
  checkedAt: string
  overall: HealthState
  checks: Check[]
  /** Τι ΔΕΝ ελέγχθηκε και γιατί — π.χ. όσα αφορούν μόνο την παραγωγή */
  notes?: string[]
}

interface MapRow {
  api: string
  displayName: string
  personalFields: { name: string; kind: string }[]
  purpose: string | null
  retention: string | null
  legalBasis: string | null
  processors: { key: string; name: string; role: string; region: string }[]
  note?: string
  missing: string[]
}

interface DataMap {
  generatedAt: string
  summary: { collections: number; fields: number; incomplete: number }
  processors: { key: string; name: string; role: string; region: string }[]
  rows: MapRow[]
  drift: { newFields: { api: string; fields: string[] }[]; unchecked: number; action: string | null }
}

import type { AccessPayload } from '@/app/api/oc/access/route'

const CARD = 'bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6 sm:p-8 border border-gray-200 dark:border-gray-600'
const EYEBROW = 'text-xs font-bold tracking-wider text-gray-600 dark:text-gray-400'

/** Χρώμα ΚΑΙ λέξη — ποτέ μόνο χρώμα */
const TONE: Record<HealthState, { dot: string; word: string; text: string }> = {
  ok: { dot: 'bg-emerald-500', word: 'Εντάξει', text: 'text-emerald-700 dark:text-emerald-300' },
  warn: { dot: 'bg-amber-500', word: 'Προσοχή', text: 'text-amber-700 dark:text-amber-200' },
  down: { dot: 'bg-red-600', word: 'Βλάβη', text: 'text-red-700 dark:text-red-300' },
  unknown: { dot: 'bg-gray-400', word: 'Άγνωστο', text: 'text-gray-600 dark:text-gray-300' },
}

const HEADLINE: Record<HealthState, string> = {
  ok: 'Όλα λειτουργούν',
  warn: 'Κάτι θέλει προσοχή',
  down: 'Κάτι έχει χαλάσει',
  unknown: 'Δεν απαντούν όλα',
}

export default function OcSecurity() {
  const [data, setData] = useState<Payload | null>(null)
  const [map, setMap] = useState<DataMap | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const [access, setAccess] = useState<AccessPayload | null>(null)
  const [accessError, setAccessError] = useState<string | null>(null)
  const [openRow, setOpenRow] = useState<string | null>(null)
  /** Ποιες ομαδοποιημένες γραμμές είναι ανοιχτές */
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/oc/security', { cache: 'no-store' })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.error || 'Αποτυχία')
      setData(j)
    } catch (err: any) {
      setError(err?.message || 'Κάτι πήγε στραβά')
    } finally {
      setBusy(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  // Ο χάρτης φορτώνει ΧΩΡΙΣΤΑ: είναι πιο αργός (ελέγχει τη ζωντανή βάση για
  // απόκλιση) και δεν πρέπει να κρατά πίσω τα Ζωτικά.
  useEffect(() => {
    let alive = true
    fetch('/api/oc/data-map', { cache: 'no-store' })
      .then(async r => {
        const j = await r.json()
        if (!r.ok) throw new Error(j?.error || 'Αποτυχία')
        if (alive) setMap(j)
      })
      .catch(err => { if (alive) setMapError(err?.message || 'Κάτι πήγε στραβά') })
    return () => { alive = false }
  }, [])

  // Η πρόσβαση φορτώνει ΧΩΡΙΣΤΑ, για τον ίδιο λόγο: ρωτά το Vercel και μια
  // αργή απάντηση εκεί δεν πρέπει να κρατά πίσω τίποτα άλλο.
  useEffect(() => {
    let alive = true
    fetch('/api/oc/access', { cache: 'no-store' })
      .then(async r => {
        const j = await r.json()
        if (!r.ok) throw new Error(j?.error || 'Αποτυχία')
        if (alive) setAccess(j)
      })
      .catch(err => { if (alive) setAccessError(err?.message || 'Κάτι πήγε στραβά') })
    return () => { alive = false }
  }, [])

  return (
    <div className="grid gap-6">
      <div className={CARD}>
        <div className="flex flex-wrap items-baseline gap-3 mb-1">
          <h3 className={EYEBROW}>ΖΩΤΙΚΑ</h3>
          {data && (
            <span className={`text-sm font-bold ${TONE[data.overall].text}`}>{HEADLINE[data.overall]}</span>
          )}
          <button type="button" onClick={load} disabled={busy}
            className="ml-auto px-4 min-h-11 rounded-full border border-gray-300 dark:border-gray-600 text-sm font-semibold disabled:opacity-50">
            {busy ? 'Έλεγχος…' : 'Επανέλεγχος'}
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Κάθε έλεγχος τρέχει ζωντανά, τώρα. Κανένας δεν εξαρτάται από τους άλλους — αν ένας πάροχος
          δεν απαντά, οι υπόλοιποι εξακολουθούν να λένε την αλήθεια.
        </p>

        {error && (
          <p className="text-sm text-red-700 dark:text-red-300 mb-4">{error}</p>
        )}

        {!data && busy && (
          <p className="text-sm text-gray-500">Γίνεται έλεγχος…</p>
        )}

        {data && (
          <div className="grid gap-2">
            {data.checks.map(c => {
              const group = !!c.items?.length
              const isOpen = !!open[c.key]
              return (
                <div key={c.key}
                  className="rounded-2xl border border-gray-200 dark:border-gray-600 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span aria-hidden="true" className={`w-2.5 h-2.5 rounded-full shrink-0 ${TONE[c.state].dot}`} />
                    {group ? (
                      <button type="button" onClick={() => setOpen(o => ({ ...o, [c.key]: !o[c.key] }))}
                        aria-expanded={isOpen}
                        className="font-semibold min-w-0 text-left hover:text-coral">
                        {c.label}
                        <span aria-hidden="true" className={`ml-1.5 inline-block text-coral transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                      </button>
                    ) : (
                      <span className="font-semibold min-w-0">{c.label}</span>
                    )}
                    <span className={`text-xs font-bold ${TONE[c.state].text}`}>{TONE[c.state].word}</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400 min-w-0">{c.detail}</span>
                    {typeof c.ms === 'number' && (
                      <span className="text-xs text-gray-500 tabular-nums ml-auto">{c.ms} ms</span>
                    )}
                  </div>
                  {c.action && (
                    <p className="text-xs text-gray-600 dark:text-gray-300 pl-6 pt-1">→ {c.action}</p>
                  )}
                  {/* Τα επιμέρους αρχεία: ανοίγουν με κλικ, αλλά ό,τι ΔΕΝ είναι
                      εντάξει φαίνεται ήδη στη σύνοψη της γραμμής — κανείς δεν
                      χρειάζεται να ανοίξει για να μάθει ότι κάτι έσπασε. */}
                  {group && isOpen && (
                    <div className="mt-3 grid gap-1.5 pl-6">
                      {c.items!.map(it => (
                        <div key={it.key} className="text-sm">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <span aria-hidden="true" className={`w-2 h-2 rounded-full shrink-0 ${TONE[it.state].dot}`} />
                            <span className="font-medium">{it.label}</span>
                            <span className={`text-xs font-bold ${TONE[it.state].text}`}>{TONE[it.state].word}</span>
                            <span className="text-gray-600 dark:text-gray-400">{it.detail}</span>
                          </div>
                          {it.action && (
                            <p className="text-xs text-gray-600 dark:text-gray-300 pl-4 pt-0.5">→ {it.action}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {data?.notes?.map(n => (
          <p key={n} className="mt-3 text-xs text-gray-600 dark:text-gray-300">{n}</p>
        ))}

        {data && (
          <p className="mt-4 text-xs text-gray-500">
            Τελευταίος έλεγχος: {new Date(data.checkedAt).toLocaleString('el-GR')}
          </p>
        )}
      </div>

      {/* ── Χάρτης δεδομένων: το αρχείο δραστηριοτήτων επεξεργασίας (άρθρο 30) */}
      <div className={CARD}>
        <div className="flex flex-wrap items-baseline gap-3 mb-1">
          <h3 className={EYEBROW}>ΧΑΡΤΗΣ ΔΕΔΟΜΕΝΩΝ</h3>
          {map && (
            <span className="text-sm font-bold text-charcoal dark:text-white">
              {map.summary.collections} συλλογές · {map.summary.fields} προσωπικά πεδία
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Ποια προσωπικά δεδομένα κρατάμε, πού ζουν και ποιος τρίτος τα αγγίζει — το αρχείο
          δραστηριοτήτων επεξεργασίας του ΓΚΠΔ (άρθρο 30). Ο κατάλογος των πεδίων παράγεται
          από τα schema· ο σκοπός και ο χρόνος διατήρησης είναι ανθρώπινη απόφαση και όπου
          λείπει, <strong>το λέμε</strong> αντί να το συμπληρώσουμε με εικασία.
        </p>

        {mapError && <p className="text-sm text-red-700 dark:text-red-300 mb-4">{mapError}</p>}
        {!map && !mapError && <p className="text-sm text-gray-500">Φορτώνει…</p>}

        {map && (
          <>
            {/* Η απόκλιση πρώτη: ένα νέο πεδίο που λείπει από τον χάρτη είναι
                ακριβώς το πράγμα που δεν πρέπει να περάσει απαρατήρητο. */}
            {map.drift.newFields.length > 0 && (
              <div className="rounded-2xl border border-amber-400 bg-amber-50 dark:bg-amber-900/20 p-4 mb-4">
                <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                  Νέα πεδία στη βάση που λείπουν από τον χάρτη
                </p>
                <ul className="mt-1 text-sm text-amber-900 dark:text-amber-100 grid gap-0.5">
                  {map.drift.newFields.map(d => (
                    <li key={d.api}>· <strong>{d.api}</strong>: {d.fields.join(', ')}</li>
                  ))}
                </ul>
                {map.drift.action && (
                  <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">→ {map.drift.action}</p>
                )}
              </div>
            )}

            {map.summary.incomplete > 0 && (
              <p className="text-sm mb-4 text-amber-700 dark:text-amber-200">
                <strong>{map.summary.incomplete}</strong> από {map.summary.collections} γραμμές είναι ατελείς —
                λείπει κυρίως ο χρόνος διατήρησης, που είναι απόφαση της ΟΣ.
              </p>
            )}

            <div className="grid gap-2">
              {map.rows.map(r => {
                const isOpen = openRow === r.api
                return (
                  <div key={r.api} className="rounded-2xl border border-gray-200 dark:border-gray-600 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <button type="button" onClick={() => setOpenRow(isOpen ? null : r.api)}
                        aria-expanded={isOpen}
                        className="font-semibold min-w-0 text-left hover:text-coral">
                        {r.displayName}
                        <span aria-hidden="true" className={`ml-1.5 inline-block text-coral transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                      </button>
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-300 tabular-nums">
                        {r.personalFields.length} πεδία
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400 min-w-0">
                        {r.purpose || <em>χωρίς καταγεγραμμένο σκοπό</em>}
                      </span>
                      {r.missing.length > 0 && (
                        <span className="text-xs font-bold text-amber-700 dark:text-amber-200 ml-auto">
                          λείπει: {r.missing.join(', ')}
                        </span>
                      )}
                    </div>

                    {isOpen && (
                      <div className="mt-3 pl-1 grid gap-2 text-sm">
                        <div>
                          <span className="font-medium">Πεδία: </span>
                          <span className="text-gray-600 dark:text-gray-400">
                            {r.personalFields.map(f => `${f.name} (${f.kind})`).join(' · ')}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Τρίτοι: </span>
                          <span className="text-gray-600 dark:text-gray-400">
                            {r.processors.map(p => `${p.name} [${p.region}]`).join(' · ')}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Νομική βάση: </span>
                          <span className="text-gray-600 dark:text-gray-400">
                            {r.legalBasis || 'εκκρεμεί απόφαση'}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Διατήρηση: </span>
                          <span className="text-gray-600 dark:text-gray-400">
                            {r.retention || 'εκκρεμεί απόφαση της ΟΣ'}
                          </span>
                        </div>
                        {r.note && <p className="text-gray-600 dark:text-gray-300">{r.note}</p>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <p className="mt-4 text-xs text-gray-500">
              Κατάλογος πεδίων: {new Date(map.generatedAt).toLocaleDateString('el-GR')}
              {map.drift.unchecked > 0 && ` · ${map.drift.unchecked} συλλογές δεν ελέγχθηκαν ζωντανά (άδειες ή χωρίς απάντηση)`}
            </p>
          </>
        )}
      </div>

      {/* ── Πρόσβαση & μυστικά ─────────────────────────────────────────────
          ΜΟΝΟ ΑΝΑΦΟΡΑ. Καμία τιμή κλειδιού δεν φτάνει ως εδώ — ονόματα,
          περιβάλλοντα και ημερομηνίες. Η ηλικία ΔΕΙΧΝΕΤΑΙ χωρίς κρίση: ένα
          κλειδί δεν είναι χαλασμένο επειδή είναι παλιό. */}
      <div className={CARD}>
        <div className="flex items-baseline gap-3 mb-1">
          <h3 className={EYEBROW}>ΠΡΟΣΒΑΣΗ &amp; ΜΥΣΤΙΚΑ</h3>
          {access && (
            <span className={`text-xs font-bold ${TONE[access.state].text}`}>
              <span className={`inline-block w-2 h-2 rounded-full mr-1.5 align-middle ${TONE[access.state].dot}`} aria-hidden="true" />
              {TONE[access.state].word}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Ποια κλειδιά υπάρχουν, σε ποιο περιβάλλον και πόσο παλιά. Καμία τιμή
          δεν διαβάζεται — ούτε από την οθόνη, ούτε από τη διαδρομή.
        </p>

        {accessError && <p className="text-sm text-red-700 dark:text-red-300">{accessError}</p>}
        {!access && !accessError && <p className="text-sm text-gray-500">Φορτώνει…</p>}

        {access?.vercel !== 'ok' && access && (
          <p className="text-sm text-amber-700 dark:text-amber-200">
            Δεν ρωτήθηκε το Vercel{access.vercelDetail ? ` — ${access.vercelDetail}` : ''}.
          </p>
        )}

        {access?.vercel === 'ok' && (
          <>
            {access.findings.length === 0 ? (
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                Κανένα εύρημα: ό,τι χρειάζεται ο κώδικας είναι ορισμένο στην παραγωγή,
                και κανένα προνομιούχο κλειδί δεν κρύβεται πίσω από δημόσιο όνομα.
              </p>
            ) : (
              <ul className="grid gap-2">
                {access.findings.map(f => (
                  <li key={`${f.key}-${f.title}`}
                    className="rounded-2xl border border-gray-200 dark:border-gray-600 p-3">
                    <span className="flex items-baseline gap-2 flex-wrap">
                      <span className={`inline-block w-2 h-2 rounded-full ${TONE[f.severity].dot}`} aria-hidden="true" />
                      <strong className="text-sm text-charcoal dark:text-gray-100 font-mono">{f.key}</strong>
                      <span className={`text-xs font-bold ${TONE[f.severity].text}`}>{f.title}</span>
                    </span>
                    <span className="block text-sm text-gray-600 dark:text-gray-400 mt-1">{f.detail}</span>
                    {f.action && (
                      <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">→ {f.action}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {access.keys.length > 0 && (
              <details className="mt-4">
                <summary className="text-sm font-semibold text-charcoal dark:text-gray-200 cursor-pointer">
                  Ηλικία κλειδιών ({access.keys.length})
                </summary>
                <ul className="mt-2 grid gap-1">
                  {access.keys.map(k => (
                    <li key={k.key} className="text-sm flex items-baseline gap-2 flex-wrap">
                      <span className="font-mono text-charcoal dark:text-gray-200">{k.key}</span>
                      <span className="text-xs text-gray-500">{k.targets.join(', ') || '—'}</span>
                      <span className="ml-auto text-xs text-gray-600 dark:text-gray-400 tabular-nums">
                        {k.ageDays == null ? '—' : `${k.ageDays} ημ.`}
                      </span>
                      {!k.known && <span className="text-xs text-amber-700 dark:text-amber-200">άγνωστο στον κώδικα</span>}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <p className="mt-4 text-xs text-gray-500">
              Έλεγχος: {new Date(access.checkedAt).toLocaleString('el-GR')}
            </p>
          </>
        )}
      </div>

      {/* Το επόμενο κουτί δηλώνεται εδώ ώστε να μη μοιάζει τελειωμένη η οθόνη */}
      <div className={CARD}>
        <h3 className={`${EYEBROW} mb-2`}>ΕΠΟΜΕΝΑ</h3>
        <ul className="text-sm text-gray-600 dark:text-gray-400 grid gap-1.5">
          <li>· <strong>AI &amp; δεδομένα</strong> — ανώνυμα δεδομένα ανάπτυξης, ώστε να μη χρειάζεται ερώτημα σε ζωντανά μέλη</li>
        </ul>
      </div>
    </div>
  )
}
