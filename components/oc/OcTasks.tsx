'use client'

import { useColumnWidths } from '@/components/oc/useColumnWidths'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/**
 * ΠΙΝΑΚΑΣ ΕΚΚΡΕΜΟΤΗΤΩΝ — η λίστα του Slack, μέσα στο OC.
 *
 * Κρατά τη λογική που είχε η ομάδα: το τικ ολοκλήρωσης είναι ΞΕΧΩΡΙΣΤΟ από
 * την κατάσταση (θέμα κλείνει ενώ ήταν «σε εξέλιξη»), οι κατηγορίες είναι
 * πολλαπλές, και οι ανάδοχοι περισσότεροι του ενός.
 */

export interface Task {
  documentId: string
  title: string
  completed: boolean
  status: 'not_started' | 'in_progress' | 'done'
  categories: string[]
  description: string | null
  links: string | null
  dueDate: string | null
  priority: 'low' | 'normal' | 'high'
  completedAt: string | null
  sortIndex: number
  boardId: string | null
  assignees: Array<{ documentId: string; name: string; email: string | null }>
}
export interface Board { documentId: string; title: string; slug: string; scope: string; description: string | null }
export interface Holder { name: string; email: string; labels: string; memberDocId?: string }
export interface MemberLite { documentId: string; name: string; am: number | null }

const SCOPE_META: Record<string, string> = {
  coordination: 'Ομάδα Συντονισμού', members: 'Όλα τα μέλη', project: 'Έργο',
}

const STATUS_META: Record<Task['status'], { label: string; cls: string }> = {
  not_started: { label: 'Not started', cls: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200' },
  in_progress: { label: 'In progress', cls: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-100' },
  done: { label: 'Done', cls: 'bg-[#6A994E]/20 text-[#3f5f2e] dark:bg-[#6A994E]/40 dark:text-green-100' },
}
const PRIORITY_META: Record<Task['priority'], { label: string; cls: string; rank: number }> = {
  high: { label: 'Υψηλή', cls: 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-100', rank: 0 },
  normal: { label: 'Κανονική', cls: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200', rank: 1 },
  low: { label: 'Χαμηλή', cls: 'bg-gray-50 text-gray-500 dark:bg-gray-700/50 dark:text-gray-400', rank: 2 },
}

type Scope = 'all' | 'open' | 'completed' | 'mine'
type GroupBy = 'none' | 'completed' | 'assignee' | 'due' | 'priority' | 'status' | 'category'
type Layout = 'table' | 'board'

const SCOPE_LABELS: Record<Scope, string> = {
  all: 'Όλα', open: 'Ανοιχτά', completed: 'Ολοκληρωμένα', mine: 'Δικά μου',
}
const GROUP_LABELS: Record<GroupBy, string> = {
  none: 'Χωρίς ομαδοποίηση', completed: 'Ολοκλήρωση', assignee: 'Ανάδοχο',
  due: 'Προθεσμία', priority: 'Προτεραιότητα', status: 'Κατάσταση', category: 'δράση/κατηγορία',
}

/**
 * Το native select αγνοεί τα utility classes σε αυτό το project (ίδιο
 * πρόβλημα με το grid του ημερολογίου): το appearance-none υπάρχει στο CSS
 * αλλά δεν φτάνει στο στοιχείο, οπότε έμενε το διπλό βελάκι του συστήματος.
 * Οι μηχανισμοί εμφάνισης μπαίνουν inline — δεν είναι θεματοδότηση, είναι
 * το αν φαίνεται σωστά ή όχι.
 */
const RESET_SELECT: React.CSSProperties = {
  WebkitAppearance: 'none',
  MozAppearance: 'none',
  appearance: 'none',
  backgroundImage: 'none',
}

function PillSelect({ value, onChange, children, title }: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
  title?: string
}) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <select
        value={value}
        title={title}
        onChange={e => onChange(e.target.value)}
        style={{ ...RESET_SELECT, paddingRight: '2.25rem' }}
        className="rounded-full bg-gray-50 dark:bg-gray-700/50 border-0 pl-4 py-2
          text-sm font-medium text-charcoal dark:text-gray-200 cursor-pointer
          hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-coral"
      >
        {children}
      </select>
      <span aria-hidden="true"
        style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        className="text-xs text-gray-400 dark:text-gray-500">▾</span>
    </span>
  )
}

const gr = (d: string) => new Date(d).toLocaleDateString('el-GR')
function overdue(t: Task): boolean {
  if (!t.dueDate || t.completed) return false
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return new Date(t.dueDate) < today
}
/** Πρώτο URL μέσα σε ελεύθερο κείμενο — η στήλη Description του Slack συχνά κρύβει σύνδεσμο */
function firstUrl(...parts: Array<string | null>): string | null {
  for (const p of parts) {
    const m = /https?:\/\/\S+/.exec(String(p || ''))
    if (m) return m[0]
  }
  return null
}

export interface LockedBoard {
  slug: string
  title: string
  description?: string
}

export default function OcTasks({ canEdit = true, lockedBoard, embedded = false, onLoaded }: {
  canEdit?: boolean
  /** Καρφωμένος πίνακας (π.χ. Διορθώσεις/Προτάσεις ανά σελίδα): χωρίς επιλογέα,
   *  χωρίς «+ Πίνακας»· δημιουργείται μόνος του την πρώτη φορά */
  lockedBoard?: LockedBoard
  /** Μέσα σε άλλη κάρτα: χωρίς δικό του φόντο/τίτλο */
  embedded?: boolean
  /** Ενημέρωση γονέα μετά από κάθε φόρτωση (π.χ. μετρητές) */
  onLoaded?: (tasks: Task[]) => void
}) {
  const [boards, setBoards] = useState<Board[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [holders, setHolders] = useState<Holder[]>([])
  const [members, setMembers] = useState<MemberLite[]>([])
  const [newBoard, setNewBoard] = useState(false)
  const [boardId, setBoardId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unconfigured, setUnconfigured] = useState(false)
  const [meDocId, setMeDocId] = useState<string | null>(null)

  const [scope, setScope] = useState<Scope>('open')
  const [groupBy, setGroupBy] = useState<GroupBy>('none')
  const [layout, setLayout] = useState<Layout>('table')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Task | null>(null)
  const [creating, setCreating] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    try {
      const s = localStorage.getItem('oc-tasks-view')
      if (s) {
        const v = JSON.parse(s)
        if (v.scope) setScope(v.scope); if (v.groupBy) setGroupBy(v.groupBy); if (v.layout) setLayout(v.layout)
      }
    } catch { /* ιδιωτική περιήγηση */ }
  }, [])
  useEffect(() => {
    try { localStorage.setItem('oc-tasks-view', JSON.stringify({ scope, groupBy, layout })) } catch { /* ok */ }
  }, [scope, groupBy, layout])

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(lockedBoard ? `/api/oc/tasks?board=${encodeURIComponent(lockedBoard.slug)}` : '/api/oc/tasks')
      let d = await res.json()
      if (!res.ok) throw new Error(d?.error || 'Αποτυχία')
      // Καρφωμένος πίνακας που δεν υπάρχει ακόμη → δημιουργία μία φορά, ξαναφόρτωμα
      if (lockedBoard && !d.unconfigured && !(d.boards || []).length && !ensuredRef.current) {
        ensuredRef.current = true
        const c = await fetch('/api/oc/tasks/boards', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: lockedBoard.title, scope: 'coordination', description: lockedBoard.description || '', slug: lockedBoard.slug }),
        })
        if (!c.ok) throw new Error((await c.json())?.error || 'Αποτυχία δημιουργίας πίνακα')
        const again = await fetch(`/api/oc/tasks?board=${encodeURIComponent(lockedBoard.slug)}`)
        d = await again.json()
        if (!again.ok) throw new Error(d?.error || 'Αποτυχία')
      }
      setBoards(d.boards || []); setTasks(d.tasks || []); setHolders(d.seatHolders || [])
      onLoaded?.(d.tasks || [])
      setMembers(d.members || [])
      setUnconfigured(!!d.unconfigured)
      setMeDocId(d.me || null)
      setBoardId(prev => prev || d.boards?.[0]?.documentId || null)
    } catch (err: any) {
      setError(err?.message || 'Αποτυχία φόρτωσης')
    } finally { setLoading(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedBoard?.slug])
  const ensuredRef = useRef(false)
  const cw = useColumnWidths(lockedBoard ? `tasks-${lockedBoard.slug}` : 'tasks')
  useEffect(() => { load() }, [load])

  async function patch(id: string, body: Record<string, any>) {
    setBusyId(id)
    // Αισιόδοξη ενημέρωση: το τικ πρέπει να απαντά αμέσως, όχι μετά από γύρο δικτύου
    setTasks(ts => ts.map(t => t.documentId === id ? { ...t, ...body } as Task : t))
    try {
      const res = await fetch('/api/oc/tasks', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...body }),
      })
      if (!res.ok) throw new Error((await res.json())?.error || 'Αποτυχία')
    } catch (err: any) {
      setError(err?.message || 'Αποτυχία ενημέρωσης')
      await load()
    } finally { setBusyId(null) }
  }

  const board = boards.find(b => b.documentId === boardId) || null
  const boardTasks = useMemo(
    () => tasks.filter(t => !boardId || t.boardId === boardId),
    [tasks, boardId])

  /**
   * Χωρίς ταξινόμηση η προτεραιότητα ήταν διακοσμητική. Σειρά που σημαίνει
   * κάτι: πρώτα ό,τι έχει ήδη περάσει, μετά η προτεραιότητα, μετά η
   * εγγύτερη προθεσμία — και τα ολοκληρωμένα πάντα στο τέλος.
   */
  const byUrgency = (a: Task, b: Task) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    const ov = (t: Task) => overdue(t) ? 0 : 1
    if (ov(a) !== ov(b)) return ov(a) - ov(b)
    const pr = PRIORITY_META[a.priority].rank - PRIORITY_META[b.priority].rank
    if (pr !== 0) return pr
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
    if (a.dueDate !== b.dueDate) return a.dueDate ? -1 : 1
    return a.sortIndex - b.sortIndex
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return boardTasks.filter(t => {
      if (scope === 'open' && t.completed) return false
      if (scope === 'completed' && !t.completed) return false
      if (scope === 'mine' && !(meDocId && t.assignees.some(a => a.documentId === meDocId))) return false
      if (q && !(`${t.title} ${t.description || ''} ${t.categories.join(' ')}`.toLowerCase().includes(q))) return false
      return true
    }).sort(byUrgency)
  }, [boardTasks, scope, query, meDocId])

  const counts = useMemo(() => ({
    all: boardTasks.length,
    open: boardTasks.filter(t => !t.completed).length,
    completed: boardTasks.filter(t => t.completed).length,
    mine: meDocId ? boardTasks.filter(t => t.assignees.some(a => a.documentId === meDocId)).length : 0,
    overdue: boardTasks.filter(overdue).length,
  }), [boardTasks, meDocId])

  const groups = useMemo(() => {
    if (groupBy === 'none') return [{ key: '', label: '', items: visible }]
    const m = new Map<string, { label: string; items: Task[] }>()
    const push = (k: string, label: string, t: Task) => {
      if (!m.has(k)) m.set(k, { label, items: [] })
      m.get(k)!.items.push(t)
    }
    for (const t of visible) {
      if (groupBy === 'completed') push(t.completed ? 'y' : 'n', t.completed ? 'Ολοκληρωμένα' : 'Ανοιχτά', t)
      else if (groupBy === 'status') push(t.status, STATUS_META[t.status].label, t)
      else if (groupBy === 'priority') push(t.priority, PRIORITY_META[t.priority].label, t)
      else if (groupBy === 'due') {
        const k = t.dueDate ? (overdue(t) ? '0' : t.dueDate.slice(0, 7)) : 'z'
        push(k, t.dueDate ? (overdue(t) ? 'Εκπρόθεσμα' : new Date(t.dueDate).toLocaleDateString('el-GR', { month: 'long', year: 'numeric' })) : 'Χωρίς προθεσμία', t)
      } else if (groupBy === 'assignee') {
        if (t.assignees.length === 0) push('z', 'Χωρίς ανάδοχο', t)
        else t.assignees.forEach(a => push(a.documentId, a.name, t))
      } else if (groupBy === 'category') {
        if (t.categories.length === 0) push('z', 'Χωρίς κατηγορία', t)
        else t.categories.forEach(c => push(c, c, t))
      }
    }
    const order = groupBy === 'priority'
      ? (k: string) => String(PRIORITY_META[k as Task['priority']]?.rank ?? 9)
      : (k: string) => k
    return [...m.entries()]
      .sort(([a], [b]) => order(a).localeCompare(order(b), 'el'))
      .map(([key, v]) => ({ key, ...v }))
  }, [visible, groupBy])

  const pill = (active: boolean) =>
    `px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${active
      ? 'bg-coral text-white' : 'text-charcoal dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`

  function Row({ t }: { t: Task }) {
    const st = STATUS_META[t.status]
    const url = firstUrl(t.links, t.description)
    return (
      <tr className={`border-b border-gray-100 dark:border-gray-700 ${busyId === t.documentId ? 'opacity-60' : ''}`}>
        <td className="py-3 pr-3 align-top">
          <button type="button" disabled={!canEdit}
            onClick={() => patch(t.documentId, { completed: !t.completed })}
            aria-label={t.completed ? 'Άνοιγμα ξανά' : 'Ολοκληρώθηκε'}
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
              t.completed ? 'bg-[#6A994E] border-[#6A994E] text-white' : 'border-gray-300 dark:border-gray-500 hover:border-coral'}`}>
            {t.completed && <span className="text-xs leading-none">✓</span>}
          </button>
        </td>
        <td className="py-3 pr-4 align-top">
          <button type="button" onClick={() => canEdit && setEditing(t)}
            className={`text-left text-base leading-snug ${t.completed
              ? 'line-through text-gray-400 dark:text-gray-500' : 'text-charcoal dark:text-gray-100 hover:text-coral'}`}>
            {t.title}
          </button>
          {t.description && (
            <span className="block text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{t.description}</span>
          )}
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="inline-block text-sm text-coral hover:underline mt-0.5">σύνδεσμος ↗</a>
          )}
        </td>
        <td className="py-3 pr-4 align-top">
          {canEdit ? (
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <select value={t.status} onChange={e => patch(t.documentId, { status: e.target.value })}
                style={{ ...RESET_SELECT, paddingLeft: '0.7rem', paddingRight: '1.7rem' }}
                className={`rounded-full py-1 text-sm border-0 cursor-pointer ${st.cls}`}>
                {(Object.keys(STATUS_META) as Task['status'][]).map(k =>
                  <option key={k} value={k}>{STATUS_META[k].label}</option>)}
              </select>
              <span aria-hidden="true"
                style={{ position: 'absolute', right: '0.55rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                className="text-[10px] opacity-60">▾</span>
            </span>
          ) : <span className={`rounded-full px-2.5 py-1 text-sm ${st.cls}`}>{st.label}</span>}
        </td>
        <td className="py-3 pr-4 align-top">
          <span className="flex flex-wrap gap-1">
            {t.categories.map(c => (
              <span key={c} className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-200">{c}</span>
            ))}
          </span>
        </td>
        <td className="py-3 pr-4 align-top">
          <span className="flex flex-wrap gap-1">
            {t.assignees.map(a => (
              <span key={a.documentId} title={a.name}
                className="px-2 py-0.5 rounded-full bg-coral/15 text-coral text-xs font-medium">
                {a.name.split(' ')[0]}
              </span>
            ))}
            {t.assignees.length === 0 && <span className="text-sm text-gray-300 dark:text-gray-600">—</span>}
          </span>
        </td>
        <td className="py-3 pr-4 align-top whitespace-nowrap">
          {t.dueDate ? (
            <span className={`text-sm notranslate ${overdue(t) ? 'text-red-600 dark:text-red-400 font-bold' : 'text-gray-500 dark:text-gray-400'}`}>
              {overdue(t) && '⚠ '}{gr(t.dueDate)}
            </span>
          ) : <span className="text-sm text-gray-300 dark:text-gray-600">—</span>}
        </td>
        <td className="py-3 align-top">
          {canEdit ? (
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <select value={t.priority} onChange={e => patch(t.documentId, { priority: e.target.value })}
                style={{ ...RESET_SELECT, paddingLeft: '0.7rem', paddingRight: '1.7rem' }}
                className={`rounded-full py-1 text-sm border-0 cursor-pointer ${PRIORITY_META[t.priority].cls}`}>
                {(['high', 'normal', 'low'] as Task['priority'][]).map(k =>
                  <option key={k} value={k}>{PRIORITY_META[k].label}</option>)}
              </select>
              <span aria-hidden="true"
                style={{ position: 'absolute', right: '0.55rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                className="text-[10px] opacity-60">▾</span>
            </span>
          ) : (
            <span className={`rounded-full px-2.5 py-1 text-sm ${PRIORITY_META[t.priority].cls}`}>
              {PRIORITY_META[t.priority].label}
            </span>
          )}
        </td>
      </tr>
    )
  }

  const shell = embedded ? '' : 'bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-8'
  if (loading) return <div className={`${shell} text-gray-400`}>Φόρτωση…</div>

  return (
    <div className={shell}>
      <div className="flex flex-wrap items-baseline justify-between gap-4 mb-1">
        {!embedded && <h2 className="text-2xl font-bold text-charcoal dark:text-gray-100">{board?.title || 'Εκκρεμότητες'}</h2>}
        {counts.overdue > 0 && (
          <span className="px-3 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 text-sm font-bold">
            {counts.overdue} εκπρόθεσμα
          </span>
        )}
      </div>
      {!embedded && board?.description && <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{board.description}</p>}

      {unconfigured && (
        <p className="text-base rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200 px-4 py-3 mb-5">
          Οι πίνακες εκκρεμοτήτων δεν έχουν φτάσει ακόμη στο Strapi.
        </p>
      )}
      {error && <p className="text-base text-red-600 dark:text-red-400 mb-4">{error}</p>}

      {/* Χειριστήρια */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {boards.length > 1 && (
          <PillSelect value={boardId || ''} onChange={setBoardId} title="Πίνακας">
            {boards.map(b => <option key={b.documentId} value={b.documentId}>{b.title}</option>)}
          </PillSelect>
        )}

        <div className="flex items-center gap-1 rounded-full bg-gray-50 dark:bg-gray-700/50 p-1">
          {(['open', 'all', 'completed', 'mine'] as Scope[]).map(s => (
            <button key={s} type="button" onClick={() => setScope(s)} className={pill(scope === s)}>
              {SCOPE_LABELS[s]} <span className="opacity-60 notranslate">{counts[s]}</span>
            </button>
          ))}
        </div>

        <PillSelect value={groupBy} onChange={v => setGroupBy(v as GroupBy)} title="Ομαδοποίηση">
          {(Object.keys(GROUP_LABELS) as GroupBy[]).map(g =>
            <option key={g} value={g}>{g === 'none' ? GROUP_LABELS[g] : `Ομαδοποίηση: ${GROUP_LABELS[g]}`}</option>)}
        </PillSelect>

        <div className="flex items-center gap-1 rounded-full bg-gray-50 dark:bg-gray-700/50 p-1">
          <button type="button" onClick={() => setLayout('table')} className={pill(layout === 'table')}>Πίνακας</button>
          <button type="button" onClick={() => setLayout('board')} className={pill(layout === 'board')}>Στήλες</button>
        </div>

        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Αναζήτηση…"
          className="rounded-full bg-gray-50 dark:bg-gray-700/50 border-0 px-4 py-2 text-sm
            text-charcoal dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500
            focus:outline-none focus:ring-2 focus:ring-coral min-w-[10rem]" />

        {canEdit && (
          <span className="ml-auto flex items-center gap-2">
            {!lockedBoard && (
              <button type="button" onClick={() => setNewBoard(true)}
                className="px-4 py-2 rounded-full border border-gray-300 dark:border-gray-600 text-sm text-charcoal dark:text-gray-200 hover:border-coral">
                + Πίνακας
              </button>
            )}
            {boardId && (
              <button type="button" onClick={() => setCreating(true)}
                className="px-5 py-2 rounded-full bg-coral text-white text-sm font-bold hover:bg-coral/90">
                + Νέα εκκρεμότητα
              </button>
            )}
          </span>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="text-base text-gray-400 dark:text-gray-500">Καμία εκκρεμότητα σε αυτή την προβολή.</p>
      ) : layout === 'board' ? (
        <div className="grid md:grid-cols-3 gap-4">
          {(Object.keys(STATUS_META) as Task['status'][]).map(s => {
            const items = visible.filter(t => t.status === s)
            return (
              <div key={s} className="rounded-2xl bg-gray-50 dark:bg-gray-700/40 p-4">
                <p className="font-bold text-charcoal dark:text-gray-100 mb-3">
                  {STATUS_META[s].label} <span className="text-gray-400 notranslate">{items.length}</span>
                </p>
                <div className="space-y-2">
                  {items.map(t => (
                    <button key={t.documentId} type="button" onClick={() => canEdit && setEditing(t)}
                      className="w-full text-left rounded-xl bg-white dark:bg-gray-800 p-3 hover:shadow-sm">
                      <span className={`block text-base leading-snug ${t.completed ? 'line-through text-gray-400' : 'text-charcoal dark:text-gray-100'}`}>
                        {t.title}
                      </span>
                      <span className="flex flex-wrap items-center gap-2 mt-1.5">
                        {t.priority === 'high' && (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-100 text-xs font-bold">
                            Υψηλή
                          </span>
                        )}
                        {t.assignees.map(a => (
                          <span key={a.documentId} className="px-2 py-0.5 rounded-full bg-coral/15 text-coral text-xs">{a.name.split(' ')[0]}</span>
                        ))}
                        {t.dueDate && (
                          <span className={`text-xs notranslate ${overdue(t) ? 'text-red-600 dark:text-red-400 font-bold' : 'text-gray-400'}`}>
                            {overdue(t) && '⚠ '}{gr(t.dueDate)}
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                  {items.length === 0 && <p className="text-sm text-gray-300 dark:text-gray-600">—</p>}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(g => (
            <div key={g.key}>
              {g.label && (
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  {g.label} <span className="notranslate opacity-70">{g.items.length}</span>
                </p>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ tableLayout: cw.hasCustom ? 'fixed' : 'auto', minWidth: '100%' }}>
                  <colgroup>
                    {['tick', 'title', 'status', 'cat', 'assignee', 'due', 'prio'].map(k => (
                      <col key={k} style={cw.width(k) ? { width: `${cw.width(k)}px` } : (k === 'tick' ? { width: '2rem' } : undefined)} />
                    ))}
                  </colgroup>
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-600">
                      <th className="py-2 pr-3 w-8"></th>
                      <th className="relative py-2 pr-4 font-medium">Εκκρεμότητα<cw.ResizeHandle colKey="title" /></th>
                      <th className="relative py-2 pr-4 font-medium">Κατάσταση<cw.ResizeHandle colKey="status" /></th>
                      <th className="relative py-2 pr-4 font-medium">δράση/κατηγορία<cw.ResizeHandle colKey="cat" /></th>
                      <th className="relative py-2 pr-4 font-medium">Ανάδοχος<cw.ResizeHandle colKey="assignee" /></th>
                      <th className="relative py-2 pr-4 font-medium">Προθεσμία<cw.ResizeHandle colKey="due" /></th>
                      <th className="relative py-2 font-medium">Προτεραιότητα<cw.ResizeHandle colKey="prio" /></th>
                    </tr>
                  </thead>
                  <tbody>{g.items.map(t => <Row key={t.documentId + g.key} t={t} />)}</tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {newBoard && <BoardForm onClose={() => setNewBoard(false)} onSaved={load} />}

      {(editing || creating) && (
        <TaskForm
          task={editing}
          boardId={boardId!}
          scope={board?.scope || 'coordination'}
          holders={holders}
          members={members}
          onClose={() => { setEditing(null); setCreating(false) }}
          onSaved={load}
        />
      )}
    </div>
  )
}

// ─── Φόρμα ───────────────────────────────────────────────────────────────

const inputCls = 'w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-base text-charcoal dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-coral'
const labelCls = 'block text-sm font-bold text-gray-600 dark:text-gray-300 mb-1'

function TaskForm({ task, boardId, scope, holders, members, onClose, onSaved }: {
  task: Task | null; boardId: string; scope: string
  holders: Holder[]; members: MemberLite[]
  onClose: () => void; onSaved: () => void
}) {
  const editing = !!task
  const [title, setTitle] = useState(task?.title || '')
  const [status, setStatus] = useState<Task['status']>(task?.status || 'not_started')
  const [priority, setPriority] = useState<Task['priority']>(task?.priority || 'normal')
  const [dueDate, setDueDate] = useState(task?.dueDate || '')
  const [categories, setCategories] = useState((task?.categories || []).join(', '))
  const [description, setDescription] = useState(task?.description || '')
  const [links, setLinks] = useState(task?.links || '')
  const [assignees, setAssignees] = useState<string[]>(task?.assignees.map(a => a.documentId) || [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [memberQuery, setMemberQuery] = useState('')

  const toggle = (id: string) => setAssignees(a => a.includes(id) ? a.filter(x => x !== id) : [...a, id])

  // Σε πίνακα «όλα τα μέλη» ο ανάδοχος μπορεί να είναι οποιοδήποτε μέλος —
  // αναζήτηση αντί για 112 κουμπιά
  const memberHits = memberQuery.trim().length < 2 ? [] : members
    .filter(m => m.name.toLowerCase().includes(memberQuery.trim().toLowerCase()))
    .filter(m => !assignees.includes(m.documentId))
    .slice(0, 6)
  const chosen = members.filter(m => assignees.includes(m.documentId))

  async function save() {
    setBusy(true); setError(null)
    try {
      const body = {
        title, status, priority, dueDate: dueDate || null,
        categories: categories.split(',').map(c => c.trim()).filter(Boolean),
        description, links, assignees,
        ...(editing ? { id: task!.documentId } : { boardId }),
      }
      const res = await fetch('/api/oc/tasks', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json())?.error || 'Αποτυχία')
      onSaved(); onClose()
    } catch (err: any) {
      setError(err?.message || 'Αποτυχία')
    } finally { setBusy(false) }
  }

  async function remove() {
    setBusy(true)
    try {
      const res = await fetch(`/api/oc/tasks?id=${encodeURIComponent(task!.documentId)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json())?.error || 'Αποτυχία')
      onSaved(); onClose()
    } catch (err: any) {
      setError(err?.message || 'Αποτυχία διαγραφής')
    } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="menu-glass rounded-3xl max-w-lg w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-5">
          <h3 className="text-xl font-bold text-charcoal dark:text-gray-100">
            {editing ? 'Επεξεργασία εκκρεμότητας' : 'Νέα εκκρεμότητα'}
          </h3>
          <button type="button" onClick={onClose} aria-label="Κλείσιμο"
            className="text-gray-400 hover:text-charcoal dark:hover:text-gray-100 text-2xl leading-none">×</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className={labelCls} htmlFor="tk-title">Τίτλος</label>
            <input id="tk-title" className={inputCls} value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="tk-status">Κατάσταση</label>
              <select id="tk-status" className={inputCls} value={status} onChange={e => setStatus(e.target.value as Task['status'])}>
                {(Object.keys(STATUS_META) as Task['status'][]).map(k => <option key={k} value={k}>{STATUS_META[k].label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="tk-priority">Προτεραιότητα</label>
              <select id="tk-priority" className={inputCls} value={priority} onChange={e => setPriority(e.target.value as Task['priority'])}>
                {(Object.keys(PRIORITY_META) as Task['priority'][]).map(k => <option key={k} value={k}>{PRIORITY_META[k].label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="tk-due">Προθεσμία</label>
              <input id="tk-due" type="date" className={inputCls} value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div>
              <label className={labelCls} htmlFor="tk-cats">δράση/κατηγορία</label>
              <input id="tk-cats" className={inputCls} value={categories} onChange={e => setCategories(e.target.value)}
                placeholder="επικοινωνία, ιστοσελίδα" />
            </div>
          </div>

          <div>
            <span className={labelCls}>Ανάδοχοι</span>
            {scope === 'members' ? (
              <>
                <div className="flex flex-wrap gap-2 mb-2">
                  {chosen.map(m => (
                    <span key={m.documentId} className="px-3 py-1.5 rounded-full bg-coral text-white text-sm">
                      {m.name}
                      <button type="button" onClick={() => toggle(m.documentId)} aria-label={`Αφαίρεση ${m.name}`}
                        className="ml-2 opacity-80 hover:opacity-100">×</button>
                    </span>
                  ))}
                  {chosen.length === 0 && <span className="text-sm text-gray-400">Κανένας ακόμη</span>}
                </div>
                <input className={inputCls} value={memberQuery} onChange={e => setMemberQuery(e.target.value)}
                  placeholder="Αναζήτηση μέλους…" />
                {memberHits.length > 0 && (
                  <div className="mt-1 rounded-xl border border-gray-200 dark:border-gray-600 divide-y divide-gray-100 dark:divide-gray-700">
                    {memberHits.map(m => (
                      <button key={m.documentId} type="button"
                        onClick={() => { toggle(m.documentId); setMemberQuery('') }}
                        className="w-full text-left px-3 py-2 text-sm text-charcoal dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700">
                        {m.name}{m.am ? <span className="text-gray-400 notranslate"> · ΑΜ {m.am}</span> : null}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
            <div className="flex flex-wrap gap-2">
              {holders.map(h => {
                const id = h.memberDocId || ''
                if (!id) return null
                const on = assignees.includes(id)
                return (
                  <button key={h.email} type="button" onClick={() => toggle(id)} title={`${h.labels} — ${h.name}`}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${on
                      ? 'bg-coral text-white border-coral'
                      : 'border-gray-300 dark:border-gray-600 text-charcoal dark:text-gray-200 hover:border-coral'}`}>
                    {on ? '✓ ' : ''}{h.labels.split(' · ')[0]}<span className="opacity-70"> · {h.name.split(' ')[0]}</span>
                  </button>
                )
              })}
            </div>
            )}
          </div>

          <div>
            <label className={labelCls} htmlFor="tk-desc">Περιγραφή</label>
            <textarea id="tk-desc" rows={3} className={inputCls} value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          <div>
            <label className={labelCls} htmlFor="tk-links">Σύνδεσμος</label>
            <input id="tk-links" className={inputCls} value={links} onChange={e => setLinks(e.target.value)} placeholder="https://…" />
          </div>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400 mt-4">{error}</p>}

        <div className="flex flex-wrap items-center gap-3 mt-6">
          <button type="button" onClick={save} disabled={busy || !title.trim()}
            className="px-6 py-2.5 rounded-full bg-coral text-white text-sm font-bold hover:bg-coral/90 disabled:opacity-40">
            {busy ? 'Αποθήκευση…' : editing ? 'Αποθήκευση' : 'Δημιουργία'}
          </button>
          <button type="button" onClick={onClose} disabled={busy}
            className="px-5 py-2.5 rounded-full border border-gray-300 dark:border-gray-600 text-sm text-charcoal dark:text-gray-200">
            Άκυρο
          </button>
          {editing && (
            <span className="ml-auto">
              {!confirmDelete ? (
                <button type="button" onClick={() => setConfirmDelete(true)} disabled={busy}
                  className="px-4 py-2 rounded-full text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                  Διαγραφή
                </button>
              ) : (
                <span className="flex items-center gap-2">
                  <span className="text-sm text-charcoal dark:text-gray-200">Σίγουρα;</span>
                  <button type="button" onClick={remove} disabled={busy}
                    className="px-4 py-2 rounded-full bg-red-600 text-white text-sm font-bold">Ναι</button>
                  <button type="button" onClick={() => setConfirmDelete(false)} disabled={busy}
                    className="px-3 py-2 rounded-full border border-gray-300 dark:border-gray-600 text-sm text-charcoal dark:text-gray-200">Όχι</button>
                </span>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function BoardForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState('')
  const [scope, setScope] = useState('project')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/oc/tasks/boards', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, scope, description }),
      })
      if (!res.ok) throw new Error((await res.json())?.error || 'Αποτυχία')
      onSaved(); onClose()
    } catch (err: any) {
      setError(err?.message || 'Αποτυχία')
    } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="menu-glass rounded-3xl max-w-md w-full p-6 sm:p-8"
        onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold text-charcoal dark:text-gray-100 mb-5">Νέος πίνακας</h3>
        <div className="space-y-4">
          <div>
            <label className={labelCls} htmlFor="bd-title">Τίτλος</label>
            <input id="bd-title" className={inputCls} value={title} onChange={e => setTitle(e.target.value)}
              placeholder="π.χ. Σ.Η.μα — εκκρεμότητες" />
          </div>
          <div>
            <label className={labelCls} htmlFor="bd-scope">Ποιοι αναλαμβάνουν</label>
            <select id="bd-scope" className={inputCls} value={scope} onChange={e => setScope(e.target.value)}>
              {Object.entries(SCOPE_META).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Ορίζει ποιοι εμφανίζονται ως πιθανοί ανάδοχοι — αλλάζει αργότερα.
            </p>
          </div>
          <div>
            <label className={labelCls} htmlFor="bd-desc">Περιγραφή</label>
            <textarea id="bd-desc" rows={2} className={inputCls} value={description}
              onChange={e => setDescription(e.target.value)} placeholder="προαιρετικό" />
          </div>
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400 mt-4">{error}</p>}
        <div className="flex items-center gap-3 mt-6">
          <button type="button" onClick={save} disabled={busy || !title.trim()}
            className="px-6 py-2.5 rounded-full bg-coral text-white text-sm font-bold hover:bg-coral/90 disabled:opacity-40">
            {busy ? 'Δημιουργία…' : 'Δημιουργία'}
          </button>
          <button type="button" onClick={onClose} disabled={busy}
            className="px-5 py-2.5 rounded-full border border-gray-300 dark:border-gray-600 text-sm text-charcoal dark:text-gray-200">
            Άκυρο
          </button>
        </div>
      </div>
    </div>
  )
}
