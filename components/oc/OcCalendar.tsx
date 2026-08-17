'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'

/**
 * Ημερολόγιο δράσεων — τρεις τρόποι να δεις τα ίδια δεδομένα:
 *   λίστα  · η ροή, με αντίστροφη μέτρηση (ό,τι είχαμε)
 *   πλέγμα · συμπαγής κάρτες ανά γεγονός
 *   μήνας/εβδομάδα/μέρα · πραγματικό ημερολόγιο
 *
 * Το ίδιο component σε Διαχείριση (όλα) και Επικοινωνία (φιλτραρισμένα με
 * διακόπτη). Η επιλογή προβολής θυμάται ανά σελίδα στο localStorage.
 */

export interface CalEvent {
  id: string
  title: string
  start: string
  end: string | null
  allDay: boolean
  category: string
  meetLink: string | null
  location: string | null
  description: string | null
  htmlLink: string | null
}

export const CAT_STYLE: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  cafe: { label: 'Meet Up Cafe', dot: 'bg-teal-500', text: 'text-teal-700 dark:text-teal-300', bg: 'bg-teal-100 dark:bg-teal-900/40' },
  'newsletter-internal': { label: 'Newsletter μελών', dot: 'bg-coral', text: 'text-coral', bg: 'bg-orange-100 dark:bg-orange-900/40' },
  'newsletter-external': { label: 'Newsletter κοινού', dot: 'bg-orange-400', text: 'text-orange-600 dark:text-orange-300', bg: 'bg-amber-100 dark:bg-amber-900/40' },
  governance: { label: 'Διοικητικά', dot: 'bg-red-500', text: 'text-red-600 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/40' },
  deadline: { label: 'Προθεσμία', dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/40' },
  share: { label: 'Share my experience', dot: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-300', bg: 'bg-purple-100 dark:bg-purple-900/40' },
  meeting: { label: 'Συνάντηση', dot: 'bg-gray-400', text: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700' },
}

const MONTHS = ['Ιανουαρίου', 'Φεβρουαρίου', 'Μαρτίου', 'Απριλίου', 'Μαΐου', 'Ιουνίου',
  'Ιουλίου', 'Αυγούστου', 'Σεπτεμβρίου', 'Οκτωβρίου', 'Νοεμβρίου', 'Δεκεμβρίου']
const MONTHS_NOM = ['Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος',
  'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος']
const DAYS_SHORT = ['Δε', 'Τρ', 'Τε', 'Πε', 'Πα', 'Σα', 'Κυ']

/**
 * Η δομή του πλέγματος μπαίνει inline, όχι με κλάσεις. Το grid-cols-7
 * υπήρχε στο CSS αλλά δεν έφτανε στον browser, και οι μέρες στοιβάζονταν
 * σε μία στήλη. Το layout ενός ημερολογιού δεν είναι θέμα θεματοδότησης —
 * είναι δομή, και έτσι δεν μπορεί να σπάσει από ρύθμιση.
 */
const WEEK_GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const dayKey = (e: CalEvent) => String(e.start).slice(0, 10)
const timeOf = (e: CalEvent) => e.allDay ? '' : new Date(e.start).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })

export function daysUntil(d: string): number {
  const t = new Date(); t.setHours(0, 0, 0, 0)
  const x = new Date(String(d).slice(0, 10)); x.setHours(0, 0, 0, 0)
  return Math.round((x.getTime() - t.getTime()) / 86400000)
}
export function untilLabel(d: string): string {
  const n = daysUntil(d)
  if (n === 0) return 'σήμερα'
  if (n === 1) return 'αύριο'
  if (n === -1) return 'χθες'
  if (n < 0) return `πριν ${Math.abs(n)} μέρες`
  return `σε ${n} μέρες`
}

/** Δευτέρα ως αρχή εβδομάδας — ελληνική σύμβαση, όχι Κυριακή */
function startOfWeek(d: Date): Date {
  const x = new Date(d)
  const wd = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - wd); x.setHours(0, 0, 0, 0)
  return x
}

type View = 'list' | 'grid' | 'month' | 'week' | 'day'

export default function OcCalendar({
  events, canEdit = false, storageKey = 'oc-cal-view',
  onEdit, onCreate, emptyText = 'Κανένα γεγονός.',
}: {
  events: CalEvent[]
  canEdit?: boolean
  storageKey?: string
  onEdit?: (e: CalEvent) => void
  onCreate?: (date: string) => void
  emptyText?: string
}) {
  const [view, setView] = useState<View>('list')
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d })

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null
    if (saved && ['list', 'grid', 'month', 'week', 'day'].includes(saved)) setView(saved as View)
  }, [storageKey])
  const pick = useCallback((v: View) => {
    setView(v)
    try { window.localStorage.setItem(storageKey, v) } catch { /* ιδιωτική περιήγηση */ }
  }, [storageKey])

  const byDay = useMemo(() => {
    const m = new Map<string, CalEvent[]>()
    for (const e of events) {
      const k = dayKey(e)
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(e)
    }
    for (const list of m.values()) {
      list.sort((a, b) => (a.allDay === b.allDay ? String(a.start).localeCompare(String(b.start)) : a.allDay ? -1 : 1))
    }
    return m
  }, [events])

  const upcoming = useMemo(
    () => events.filter(e => daysUntil(e.start) >= 0).sort((a, b) => String(a.start).localeCompare(String(b.start))),
    [events],
  )

  function shift(delta: number) {
    const d = new Date(cursor)
    if (view === 'month') d.setMonth(d.getMonth() + delta)
    else if (view === 'week') d.setDate(d.getDate() + delta * 7)
    else d.setDate(d.getDate() + delta)
    setCursor(d)
  }

  const periodLabel = view === 'month'
    ? `${MONTHS_NOM[cursor.getMonth()]} ${cursor.getFullYear()}`
    : view === 'week'
      ? (() => { const s = startOfWeek(cursor); const e = new Date(s); e.setDate(e.getDate() + 6)
        return `${s.getDate()} ${MONTHS[s.getMonth()].slice(0, 3)} – ${e.getDate()} ${MONTHS[e.getMonth()].slice(0, 3)}` })()
      : `${cursor.getDate()} ${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`

  const btn = (v: View, label: string) => (
    <button key={v} type="button" onClick={() => pick(v)}
      className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
        view === v ? 'bg-coral text-white' : 'text-charcoal dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
      {label}
    </button>
  )

  const Chip = ({ e }: { e: CalEvent }) => {
    const st = CAT_STYLE[e.category] || CAT_STYLE.meeting
    return (
      <button type="button" onClick={() => onEdit?.(e)} disabled={!onEdit}
        title={`${e.title}${e.allDay ? '' : ' · ' + timeOf(e)}`}
        className={`w-full text-left px-1.5 py-1 rounded text-xs leading-tight truncate ${st.bg} ${st.text} ${onEdit ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}`}>
        {!e.allDay && <span className="notranslate font-medium">{timeOf(e)} </span>}{e.title}
      </button>
    )
  }

  return (
    <div className="space-y-4">
      {/* Χειριστήρια */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-full bg-gray-50 dark:bg-gray-700/50 p-1">
          {btn('list', 'Λίστα')}
          {btn('grid', 'Πλέγμα')}
          {btn('month', 'Μήνας')}
          {btn('week', 'Εβδομάδα')}
          {btn('day', 'Μέρα')}
        </div>

        {(view === 'month' || view === 'week' || view === 'day') && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => shift(-1)} aria-label="Προηγούμενο"
              className="w-9 h-9 rounded-full border border-gray-300 dark:border-gray-600 text-charcoal dark:text-gray-200 hover:border-coral">←</button>
            <span className="font-bold text-charcoal dark:text-gray-100 min-w-[11rem] text-center">{periodLabel}</span>
            <button type="button" onClick={() => shift(1)} aria-label="Επόμενο"
              className="w-9 h-9 rounded-full border border-gray-300 dark:border-gray-600 text-charcoal dark:text-gray-200 hover:border-coral">→</button>
            <button type="button" onClick={() => { const d = new Date(); d.setHours(0, 0, 0, 0); setCursor(d) }}
              className="px-4 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 text-sm text-charcoal dark:text-gray-200 hover:border-coral">Σήμερα</button>
          </div>
        )}

        {canEdit && onCreate && (
          <button type="button" onClick={() => onCreate(iso(view === 'list' || view === 'grid' ? new Date() : cursor))}
            className="ml-auto px-5 py-2 rounded-full bg-coral text-white text-sm font-bold hover:bg-coral/90">
            + Νέο γεγονός
          </button>
        )}
      </div>

      {/* ΛΙΣΤΑ */}
      {view === 'list' && (
        upcoming.length === 0 ? <p className="text-base text-gray-400 dark:text-gray-500">{emptyText}</p> : (
          <ul className="space-y-2">
            {upcoming.map(e => {
              const st = CAT_STYLE[e.category] || CAT_STYLE.meeting
              const soon = daysUntil(e.start) <= 2
              return (
                <li key={e.id} className={`flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 ${soon ? 'bg-gray-50 dark:bg-gray-700/50' : ''}`}>
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${st.dot}`} aria-hidden="true" />
                  <span className="w-16 shrink-0 text-base font-bold text-charcoal dark:text-gray-100 notranslate">
                    {new Date(e.start).toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit' })}
                  </span>
                  <span className="flex-1 min-w-[12rem]">
                    <button type="button" onClick={() => onEdit?.(e)} disabled={!onEdit}
                      className={`text-base text-left text-charcoal dark:text-gray-100 ${onEdit ? 'hover:text-coral' : 'cursor-default'}`}>
                      {e.title}
                    </button>
                    <span className={`block text-sm ${st.text}`}>
                      {st.label}{!e.allDay && <span className="notranslate"> · {timeOf(e)}</span>}
                    </span>
                  </span>
                  <span className={`text-sm shrink-0 ${soon ? 'font-bold text-coral' : 'text-gray-500 dark:text-gray-400'}`}>
                    {untilLabel(e.start)}
                  </span>
                  {e.meetLink && (
                    <a href={e.meetLink} target="_blank" rel="noopener noreferrer"
                      className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-bold ${
                        e.category === 'cafe' && soon ? 'bg-teal-600 text-white hover:opacity-90'
                          : 'border border-gray-300 dark:border-gray-600 text-charcoal dark:text-gray-200 hover:border-coral'}`}>
                      {e.category === 'cafe' ? 'Σύνδεση στο Cafe' : 'Meet'}
                    </a>
                  )}
                </li>
              )
            })}
          </ul>
        )
      )}

      {/* ΠΛΕΓΜΑ */}
      {view === 'grid' && (
        upcoming.length === 0 ? <p className="text-base text-gray-400 dark:text-gray-500">{emptyText}</p> : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcoming.map(e => {
              const st = CAT_STYLE[e.category] || CAT_STYLE.meeting
              return (
                <div key={e.id} className="rounded-2xl border border-gray-200 dark:border-gray-600 p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${st.dot}`} aria-hidden="true" />
                    <span className={`text-xs font-bold uppercase tracking-wide ${st.text}`}>{st.label}</span>
                    <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">{untilLabel(e.start)}</span>
                  </div>
                  <button type="button" onClick={() => onEdit?.(e)} disabled={!onEdit}
                    className={`text-left text-base font-medium text-charcoal dark:text-gray-100 leading-snug ${onEdit ? 'hover:text-coral' : 'cursor-default'}`}>
                    {e.title}
                  </button>
                  <p className="text-sm text-gray-500 dark:text-gray-400 notranslate">
                    {new Date(e.start).toLocaleDateString('el-GR', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {!e.allDay && ` · ${timeOf(e)}`}
                  </p>
                  {e.meetLink && (
                    <a href={e.meetLink} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-coral hover:underline mt-auto">
                      {e.category === 'cafe' ? 'Σύνδεση στο Cafe ↗' : 'Meet ↗'}
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ΜΗΝΑΣ */}
      {view === 'month' && (() => {
        const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
        const gridStart = startOfWeek(first)
        const cells: Date[] = []
        for (let i = 0; i < 42; i++) { const d = new Date(gridStart); d.setDate(d.getDate() + i); cells.push(d) }
        const todayIso = iso(new Date())
        return (
          <div className="overflow-x-auto">
            <div style={{ minWidth: '42rem' }}>
              <div style={{ ...WEEK_GRID, gap: '1px', marginBottom: '1px' }}>
                {DAYS_SHORT.map(d => (
                  <div key={d} className="text-center text-sm font-bold text-gray-500 dark:text-gray-400 py-2">{d}</div>
                ))}
              </div>
              <div style={{ ...WEEK_GRID, gap: '1px' }} className="bg-gray-200 dark:bg-gray-700 rounded-2xl overflow-hidden">
                {cells.map(d => {
                  const k = iso(d)
                  const list = byDay.get(k) || []
                  const otherMonth = d.getMonth() !== cursor.getMonth()
                  return (
                    <div key={k} style={{ minHeight: '6.5rem' }}
                      className={`p-1.5 bg-white dark:bg-gray-800 ${otherMonth ? 'opacity-40' : ''}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm notranslate ${k === todayIso
                          ? 'w-6 h-6 rounded-full bg-coral text-white flex items-center justify-center font-bold'
                          : 'text-gray-500 dark:text-gray-400'}`}>{d.getDate()}</span>
                        {canEdit && onCreate && (
                          <button type="button" onClick={() => onCreate(k)} aria-label={`Νέο γεγονός ${k}`}
                            className="text-gray-300 dark:text-gray-600 hover:text-coral text-sm leading-none">+</button>
                        )}
                      </div>
                      <div className="space-y-1">
                        {list.slice(0, 3).map(e => <Chip key={e.id} e={e} />)}
                        {list.length > 3 && (
                          <button type="button" onClick={() => { setCursor(new Date(k)); pick('day') }}
                            className="text-xs text-gray-400 hover:text-coral">+{list.length - 3} ακόμη</button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })()}

      {/* ΕΒΔΟΜΑΔΑ */}
      {view === 'week' && (() => {
        const s = startOfWeek(cursor)
        const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(s); d.setDate(d.getDate() + i); return d })
        const todayIso = iso(new Date())
        return (
          <div className="overflow-x-auto">
            <div style={{ ...WEEK_GRID, gap: '1px', minWidth: '42rem' }}
              className="bg-gray-200 dark:bg-gray-700 rounded-2xl overflow-hidden">
              {days.map(d => {
                const k = iso(d)
                const list = byDay.get(k) || []
                return (
                  <div key={k} style={{ minHeight: '12rem' }} className="bg-white dark:bg-gray-800 p-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-bold ${k === todayIso ? 'text-coral' : 'text-charcoal dark:text-gray-100'}`}>
                        {DAYS_SHORT[(d.getDay() + 6) % 7]} <span className="notranslate font-normal text-gray-500 dark:text-gray-400">{d.getDate()}</span>
                      </span>
                      {canEdit && onCreate && (
                        <button type="button" onClick={() => onCreate(k)} aria-label={`Νέο γεγονός ${k}`}
                          className="text-gray-300 dark:text-gray-600 hover:text-coral">+</button>
                      )}
                    </div>
                    <div className="space-y-1">
                      {list.map(e => <Chip key={e.id} e={e} />)}
                      {list.length === 0 && <span className="text-xs text-gray-300 dark:text-gray-600">—</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* ΜΕΡΑ */}
      {view === 'day' && (() => {
        const k = iso(cursor)
        const list = byDay.get(k) || []
        return list.length === 0 ? (
          <p className="text-base text-gray-400 dark:text-gray-500">Κανένα γεγονός στις {cursor.toLocaleDateString('el-GR')}.</p>
        ) : (
          <ul className="space-y-2">
            {list.map(e => {
              const st = CAT_STYLE[e.category] || CAT_STYLE.meeting
              return (
                <li key={e.id} className="flex flex-wrap items-start gap-3 rounded-2xl border border-gray-200 dark:border-gray-600 px-4 py-3">
                  <span className="w-20 shrink-0 text-base font-bold text-charcoal dark:text-gray-100 notranslate">
                    {e.allDay ? 'όλη μέρα' : timeOf(e)}
                  </span>
                  <span className="flex-1 min-w-[12rem]">
                    <button type="button" onClick={() => onEdit?.(e)} disabled={!onEdit}
                      className={`text-base text-left text-charcoal dark:text-gray-100 ${onEdit ? 'hover:text-coral' : 'cursor-default'}`}>
                      {e.title}
                    </button>
                    <span className={`block text-sm ${st.text}`}>{st.label}</span>
                    {e.description && <span className="block text-sm text-gray-500 dark:text-gray-400 mt-1">{e.description}</span>}
                  </span>
                  {e.meetLink && (
                    <a href={e.meetLink} target="_blank" rel="noopener noreferrer"
                      className="shrink-0 px-4 py-1.5 rounded-full text-sm font-bold border border-gray-300 dark:border-gray-600 text-charcoal dark:text-gray-200 hover:border-coral">
                      Meet ↗
                    </a>
                  )}
                </li>
              )
            })}
          </ul>
        )
      })()}
    </div>
  )
}
