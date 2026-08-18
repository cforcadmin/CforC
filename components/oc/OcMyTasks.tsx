'use client'

import { useEffect, useState } from 'react'

/**
 * «Τι με περιμένει» — μικρή προεπισκόπηση στην Επισκόπηση.
 *
 * Δείχνει ΤΙΣ ΔΙΚΕΣ ΣΟΥ εκκρεμότητες, τις πιο επείγουσες πρώτα, από όλους
 * τους πίνακες μαζί. Είναι το κομμάτι που το Slack δεν μπορούσε να κάνει:
 * εκεί έπρεπε να θυμηθείς να ανοίξεις τη λίστα και να φιλτράρεις.
 *
 * Δεν εμφανίζεται καθόλου όταν δεν έχεις τίποτα — μια κενή κάρτα «0
 * εκκρεμότητες» καταλαμβάνει χώρο χωρίς να λέει κάτι.
 */

interface Task {
  documentId: string
  title: string
  completed: boolean
  dueDate: string | null
  priority: 'low' | 'normal' | 'high'
  boardId: string | null
  assignees: Array<{ documentId: string; name: string }>
}
interface Board { documentId: string; title: string }

const RANK = { high: 0, normal: 1, low: 2 } as const

function daysUntil(d: string): number {
  const t = new Date(); t.setHours(0, 0, 0, 0)
  const x = new Date(d); x.setHours(0, 0, 0, 0)
  return Math.round((x.getTime() - t.getTime()) / 86400000)
}
function whenLabel(d: string | null): { text: string; urgent: boolean } {
  if (!d) return { text: 'χωρίς προθεσμία', urgent: false }
  const n = daysUntil(d)
  if (n < 0) return { text: `εκπρόθεσμο ${Math.abs(n)} μέρες`, urgent: true }
  if (n === 0) return { text: 'σήμερα', urgent: true }
  if (n === 1) return { text: 'αύριο', urgent: true }
  if (n <= 7) return { text: `σε ${n} μέρες`, urgent: false }
  return { text: new Date(d).toLocaleDateString('el-GR'), urgent: false }
}

export default function OcMyTasks({ onOpenTasks }: { onOpenTasks?: () => void }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [boards, setBoards] = useState<Board[]>([])
  const [me, setMe] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  async function load() {
    try {
      const res = await fetch('/api/oc/tasks')
      if (!res.ok) return
      const d = await res.json()
      setTasks(d.tasks || []); setBoards(d.boards || []); setMe(d.me || null)
    } catch { /* σιωπηλά — η Επισκόπηση δεν πρέπει να σπάει γι' αυτό */ }
    finally { setReady(true) }
  }
  useEffect(() => { load() }, [])

  async function complete(id: string) {
    setBusy(id)
    setTasks(ts => ts.map(t => t.documentId === id ? { ...t, completed: true } : t))
    try {
      await fetch('/api/oc/tasks', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, completed: true }),
      })
    } catch { await load() } finally { setBusy(null) }
  }

  if (!ready || !me) return null

  const mine = tasks
    .filter(t => !t.completed && t.assignees.some(a => a.documentId === me))
    .sort((a, b) => {
      const ov = (t: Task) => (t.dueDate && daysUntil(t.dueDate) < 0) ? 0 : 1
      if (ov(a) !== ov(b)) return ov(a) - ov(b)
      if (RANK[a.priority] !== RANK[b.priority]) return RANK[a.priority] - RANK[b.priority]
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
      return a.dueDate ? -1 : 1
    })

  if (mine.length === 0) return null

  const overdue = mine.filter(t => t.dueDate && daysUntil(t.dueDate) < 0).length
  const shown = mine.slice(0, 5)
  const boardName = (id: string | null) => boards.find(b => b.documentId === id)?.title || ''

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
        <h3 className="font-bold text-charcoal dark:text-gray-100">
          Τι με περιμένει <span className="text-gray-400 notranslate font-normal">{mine.length}</span>
        </h3>
        {overdue > 0 && (
          <span className="px-3 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 text-sm font-bold">
            {overdue} εκπρόθεσμα
          </span>
        )}
      </div>

      <ul className="space-y-2">
        {shown.map(t => {
          const w = whenLabel(t.dueDate)
          return (
            <li key={t.documentId} className={`flex items-start gap-3 ${busy === t.documentId ? 'opacity-60' : ''}`}>
              <button type="button" onClick={() => complete(t.documentId)} aria-label="Ολοκληρώθηκε"
                className="mt-0.5 w-5 h-5 shrink-0 rounded-full border-2 border-gray-300 dark:border-gray-500 hover:border-[#6A994E] hover:bg-[#6A994E]/10" />
              <span className="flex-1 min-w-0">
                <span className="block text-base text-charcoal dark:text-gray-100 leading-snug">{t.title}</span>
                <span className="block text-sm">
                  <span className={w.urgent ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-500 dark:text-gray-400'}>
                    {w.urgent && '⚠ '}{w.text}
                  </span>
                  {t.priority === 'high' && <span className="text-red-600 dark:text-red-400"> · υψηλή</span>}
                  {boards.length > 1 && boardName(t.boardId) && (
                    <span className="text-gray-400 dark:text-gray-500"> · {boardName(t.boardId)}</span>
                  )}
                </span>
              </span>
            </li>
          )
        })}
      </ul>

      {mine.length > shown.length && (
        <button type="button" onClick={onOpenTasks}
          className="mt-4 text-sm font-medium text-coral hover:underline">
          και άλλες {mine.length - shown.length} →
        </button>
      )}
    </div>
  )
}
