'use client'

/**
 * ΤΟ ΦΥΛΛΟ ΤΗΣ ΕΠΙΚΟΙΝΩΝΙΑΣ ΜΕΣΑ ΣΤΟ OC — καταγραφή δημοσιεύσεων + GANTT.
 *
 * ΓΙΑΤΙ ΔΥΟ ΟΨΕΙΣ ΚΑΙ ΟΧΙ ΜΙΑ: οι δύο καρτέλες δεν είναι το ίδιο σχήμα.
 * Η καταγραφή είναι λίστα που μεγαλώνει (59 γραμμές σήμερα) και διορθώνεται
 * αφού βγουν τα νούμερα· το GANTT είναι πλέγμα 12 δράσεων × 122 ημερών, που
 * δεν χωράει σε καμία οθόνη — γι' αυτό δείχνεται ένας μήνας τη φορά.
 *
 * Ο ΧΡΟΝΟΣ ΖΕΙ ΣΤΟ ΦΥΛΛΟ: κάθε αποθήκευση ξαναφορτώνει. Αν κάποιος δούλευε
 * στο Google την ίδια στιγμή, η οθόνη δείχνει ΤΟ ΔΙΚΟ ΤΟΥ αποτέλεσμα, όχι
 * μια τοπική εκδοχή που θα απέκλινε σιωπηλά.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'

type Field =
  | 'date' | 'channels' | 'contentTypes' | 'title' | 'link'
  | 'reach' | 'engagement' | 'opened' | 'uniqueClicks' | 'notes'

interface Row extends Record<Field, string> { rowNumber: number }

interface Gantt {
  rows: Array<{ rowNumber: number; label: string }>
  days: Array<{ col: number; colLetter: string; month: string; label: string }>
  cells: Record<number, Record<number, string>>
}

const FIELDS: Array<{ key: Field; label: string; width?: string }> = [
  { key: 'date', label: 'Ημ/νία', width: 'w-24' },
  { key: 'channels', label: 'Κανάλι', width: 'w-28' },
  { key: 'contentTypes', label: 'Είδος', width: 'w-24' },
  { key: 'title', label: 'Τίτλος / Θέμα' },
  { key: 'link', label: 'Σύνδεσμος' },
  { key: 'reach', label: 'Reach', width: 'w-20' },
  { key: 'engagement', label: 'Engagement', width: 'w-24' },
  { key: 'opened', label: 'Opened', width: 'w-20' },
  { key: 'uniqueClicks', label: 'Clicks', width: 'w-20' },
  { key: 'notes', label: 'Σημειώσεις' },
]

const EMPTY: Record<Field, string> = {
  date: '', channels: '', contentTypes: '', title: '', link: '',
  reach: '', engagement: '', opened: '', uniqueClicks: '', notes: '',
}

const input = 'w-full rounded-lg border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm bg-white dark:bg-gray-700 text-charcoal dark:text-gray-100'
const chip = 'px-3 py-1.5 rounded-full text-xs font-bold transition-colors'
const ghost = 'border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-coral'

export default function OcCommsSheet() {
  const [rows, setRows] = useState<Row[]>([])
  const [gantt, setGantt] = useState<Gantt | null>(null)
  const [canWrite, setCanWrite] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [view, setView] = useState<'log' | 'gantt'>('log')
  const [showAll, setShowAll] = useState(false)
  const [editRow, setEditRow] = useState<number | null>(null)
  const [draft, setDraft] = useState<Record<Field, string>>(EMPTY)
  const [adding, setAdding] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [month, setMonth] = useState<string | null>(null)
  const [cellEdit, setCellEdit] = useState<{ row: number; col: number } | null>(null)
  const [cellDraft, setCellDraft] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/oc/comms-sheet', { cache: 'no-store' })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.error || 'Αποτυχία')
      setRows(j.reporting || [])
      setGantt(j.gantt || null)
      setCanWrite(!!j.canWrite)
      setError(null)
    } catch (err: any) {
      setError(err?.message || 'Δεν διαβάστηκε το φύλλο')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const months = useMemo(
    () => [...new Set((gantt?.days || []).map(d => d.month))].filter(Boolean),
    [gantt])
  useEffect(() => { if (!month && months.length) setMonth(months[0]) }, [month, months])

  // Νεότερη πρώτη: η σειρά του φύλλου είναι χρονολογική, και το χρήσιμο
  // είναι ό,τι μόλις δημοσιεύτηκε — όχι ο Φεβρουάριος.
  const shown = useMemo(() => {
    const sorted = [...rows].reverse()
    return showAll ? sorted : sorted.slice(0, 12)
  }, [rows, showAll])

  async function send(method: 'POST' | 'PUT' | 'DELETE', body: any, okMsg: string) {
    setBusy(true); setError(null); setNote(null)
    try {
      const res = await fetch('/api/oc/comms-sheet', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || 'Αποτυχία')
      setNote(okMsg)
      setEditRow(null); setAdding(false); setConfirmDelete(null); setCellEdit(null)
      await load()
      return true
    } catch (err: any) {
      setError(err?.message || 'Αποτυχία')
      return false
    } finally {
      setBusy(false)
    }
  }

  const startEdit = (r: Row) => {
    setAdding(false); setConfirmDelete(null); setEditRow(r.rowNumber)
    const { rowNumber, ...rest } = r
    setDraft({ ...EMPTY, ...rest })
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-8">
        <p className="text-sm text-gray-400">Φόρτωση φύλλου επικοινωνίας…</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h2 className="text-2xl font-bold text-charcoal dark:text-gray-100">Φύλλο επικοινωνίας</h2>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setView('log')} aria-pressed={view === 'log'}
            className={`${chip} ${view === 'log' ? 'bg-coral text-charcoal' : ghost}`}>
            Καταγραφή
            <span className="ml-1.5 tabular-nums opacity-70">{rows.length}</span>
          </button>
          <button type="button" onClick={() => setView('gantt')} aria-pressed={view === 'gantt'}
            className={`${chip} ${view === 'gantt' ? 'bg-coral text-charcoal' : ghost}`}>
            GANTT
          </button>
          <button type="button" onClick={load} disabled={busy}
            className={`${chip} ${ghost} disabled:opacity-40`} title="Ανανέωση από το φύλλο">
            Ανανέωση
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-5 max-w-3xl">
        Γράφει απευθείας στο Google Sheet — ό,τι αλλάξει εδώ το βλέπει αμέσως όποιος το έχει ανοιχτό,
        και αντίστροφα. {canWrite ? 'Αλλαγές κάνουν Επικοινωνία, Media και IT.' : 'Οι αλλαγές γίνονται από Επικοινωνία, Media ή IT.'}
      </p>

      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300 mb-3">{error}</p>}
      {note && <p className="text-sm text-green-700 dark:text-green-300 mb-3">{note}</p>}

      {view === 'log' ? (
        <>
          {canWrite && !adding && (
            <button type="button" onClick={() => { setAdding(true); setEditRow(null); setDraft(EMPTY) }}
              className={`${chip} bg-coral text-charcoal mb-4`}>
              + Νέα καταχώρηση
            </button>
          )}

          {adding && (
            <div className="rounded-2xl border border-coral/50 p-4 mb-4">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-3">ΝΕΑ ΚΑΤΑΧΩΡΗΣΗ</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {FIELDS.map(f => (
                  <label key={f.key} className="block">
                    <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{f.label}</span>
                    <input className={input} value={draft[f.key]}
                      placeholder={f.key === 'date' ? 'ηη/μμ/εεεε' : undefined}
                      onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))} />
                  </label>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-4">
                <button type="button" disabled={busy || (!draft.date && !draft.title)}
                  onClick={() => send('POST', draft, 'Η καταχώρηση προστέθηκε στο φύλλο')}
                  className={`${chip} bg-coral text-charcoal disabled:opacity-40`}>
                  {busy ? 'Αποθήκευση…' : 'Αποθήκευση'}
                </button>
                <button type="button" onClick={() => setAdding(false)} className={`${chip} ${ghost}`}>Άκυρο</button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  {FIELDS.map(f => <th key={f.key} className={`py-2 pr-3 font-medium ${f.width || ''}`}>{f.label}</th>)}
                  {canWrite && <th className="py-2 font-medium w-28" />}
                </tr>
              </thead>
              <tbody>
                {shown.map(r => (
                  <tr key={r.rowNumber} className="border-b border-gray-100 dark:border-gray-700 align-top">
                    {editRow === r.rowNumber ? (
                      <>
                        {FIELDS.map(f => (
                          <td key={f.key} className="py-2 pr-3">
                            <input className={input} value={draft[f.key]}
                              aria-label={f.label}
                              onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))} />
                          </td>
                        ))}
                        <td className="py-2 whitespace-nowrap">
                          <button type="button" disabled={busy}
                            onClick={() => send('PUT', {
                              rowNumber: r.rowNumber, ...draft,
                              expectDate: r.date, expectTitle: r.title,
                            }, 'Η γραμμή ενημερώθηκε')}
                            className={`${chip} bg-coral text-charcoal disabled:opacity-40`}>OK</button>
                          <button type="button" onClick={() => setEditRow(null)}
                            className="ml-1 px-2 text-gray-500 hover:text-charcoal dark:hover:text-gray-200"
                            aria-label="Άκυρο">✕</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-2 pr-3 text-gray-600 dark:text-gray-300 notranslate whitespace-nowrap">{r.date || '—'}</td>
                        <td className="py-2 pr-3 text-gray-600 dark:text-gray-300">{r.channels}</td>
                        <td className="py-2 pr-3 text-gray-600 dark:text-gray-300">{r.contentTypes}</td>
                        <td className="py-2 pr-3 text-charcoal dark:text-gray-100">{r.title}</td>
                        <td className="py-2 pr-3 max-w-[12rem] truncate">
                          {r.link
                            ? <a href={r.link} target="_blank" rel="noopener noreferrer"
                                className="text-coral hover:underline" title={r.link}>άνοιγμα ↗</a>
                            : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="py-2 pr-3 text-gray-600 dark:text-gray-300 notranslate">{r.reach}</td>
                        <td className="py-2 pr-3 text-gray-600 dark:text-gray-300 notranslate">{r.engagement}</td>
                        <td className="py-2 pr-3 text-gray-600 dark:text-gray-300 notranslate">{r.opened}</td>
                        <td className="py-2 pr-3 text-gray-600 dark:text-gray-300 notranslate">{r.uniqueClicks}</td>
                        <td className="py-2 pr-3 text-gray-500 dark:text-gray-400">{r.notes}</td>
                        {canWrite && (
                          <td className="py-2 whitespace-nowrap">
                            {confirmDelete === r.rowNumber ? (
                              <>
                                <button type="button" disabled={busy}
                                  onClick={() => send('DELETE', {
                                    rowNumber: r.rowNumber, expectDate: r.date, expectTitle: r.title,
                                  }, 'Η γραμμή διαγράφηκε από το φύλλο')}
                                  className={`${chip} bg-red-600 text-white disabled:opacity-40`}>
                                  Διαγραφή;
                                </button>
                                <button type="button" onClick={() => setConfirmDelete(null)}
                                  className="ml-1 px-2 text-gray-500" aria-label="Άκυρο">✕</button>
                              </>
                            ) : (
                              <>
                                <button type="button" onClick={() => startEdit(r)}
                                  className="text-coral hover:underline text-xs">Επεξεργασία</button>
                                <button type="button" onClick={() => setConfirmDelete(r.rowNumber)}
                                  className="ml-3 text-gray-400 hover:text-red-600 dark:hover:text-red-400 text-xs">Διαγραφή</button>
                              </>
                            )}
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rows.length > 12 && (
            <button type="button" onClick={() => setShowAll(s => !s)}
              className="mt-4 text-sm text-coral hover:underline">
              {showAll ? 'Λιγότερα' : `Όλες οι ${rows.length} καταχωρήσεις`}
            </button>
          )}
        </>
      ) : (
        <>
          {months.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {months.map(m => (
                <button key={m} type="button" onClick={() => setMonth(m)} aria-pressed={month === m}
                  className={`${chip} ${month === m ? 'bg-charcoal text-white dark:bg-gray-600' : ghost}`}>
                  {m}
                </button>
              ))}
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                {canWrite ? 'κλικ σε κελί για επεξεργασία' : 'μόνο ανάγνωση'}
              </span>
            </div>
          )}

          {/* 122 μέρες δεν χωράνε: ένας μήνας τη φορά, και πάλι με οριζόντια κύλιση */}
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-white dark:bg-gray-800 text-left py-2 pr-3 font-medium text-gray-500 dark:text-gray-400 min-w-[11rem]">
                    Δράση / Κανάλι
                  </th>
                  {(gantt?.days || []).filter(d => d.month === month).map(d => (
                    <th key={d.col} className="py-2 px-1 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap w-36 min-w-[9rem]">
                      {d.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(gantt?.rows || []).map(row => (
                  <tr key={row.rowNumber} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 py-1.5 pr-3 text-charcoal dark:text-gray-200 font-medium">
                      {row.label}
                    </td>
                    {(gantt?.days || []).filter(d => d.month === month).map(d => {
                      const value = gantt?.cells?.[row.rowNumber]?.[d.col] || ''
                      const isEditing = cellEdit?.row === row.rowNumber && cellEdit?.col === d.col
                      return (
                        <td key={d.col} className="p-0.5 align-top">
                          {isEditing ? (
                            <span className="flex items-start gap-1">
                              <textarea rows={2} value={cellDraft} autoFocus
                                onChange={e => setCellDraft(e.target.value)}
                                aria-label={`${row.label} — ${d.label}`}
                                className="w-36 rounded-lg border border-coral px-1.5 py-1 text-xs bg-white dark:bg-gray-700 text-charcoal dark:text-gray-100" />
                              <span className="flex flex-col gap-1">
                                <button type="button" disabled={busy}
                                  onClick={() => send('POST', {
                                    target: 'gantt', rowNumber: row.rowNumber, col: d.col, value: cellDraft,
                                  }, 'Το κελί αποθηκεύτηκε')}
                                  className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-coral text-charcoal disabled:opacity-40">OK</button>
                                <button type="button" onClick={() => setCellEdit(null)}
                                  className="text-[11px] px-1.5 text-gray-500" aria-label="Άκυρο">✕</button>
                              </span>
                            </span>
                          ) : (
                            <button type="button" disabled={!canWrite}
                              onClick={() => { setCellEdit({ row: row.rowNumber, col: d.col }); setCellDraft(value) }}
                              title={value || undefined}
                              className={`w-full text-left min-h-[2.2rem] px-1.5 py-1 rounded-lg text-[11px] leading-tight ${
                                value
                                  ? 'bg-coral/15 text-charcoal dark:text-gray-100 hover:bg-coral/25'
                                  : 'text-gray-300 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                              } ${canWrite ? '' : 'cursor-default'}`}>
                              {/* Ένα κελί του φύλλου μπορεί να κρύβει ολόκληρο κείμενο ανάρτησης:
                                  χωρίς κόψιμο, μία γραμμή γίνεται 1000px και το πλέγμα χάνεται.
                                  Ολόκληρο φαίνεται στο tooltip και στην επεξεργασία. */}
                              <span className="line-clamp-3">{value || '·'}</span>
                            </button>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
