'use client'

import { useCallback, useEffect, useState } from 'react'
import OcCalendar, { daysUntil, untilLabel, type CalEvent } from '@/components/oc/OcCalendar'
import OcEventForm, { type SeatHolder } from '@/components/oc/OcEventForm'
import OcMonthlyView from '@/components/oc/OcMonthlyView'
import OcTasks from '@/components/oc/OcTasks'
import OcAgenda from '@/components/oc/OcAgenda'
import OcAttendance from '@/components/oc/OcAttendance'

/**
 * ΔΙΑΧΕΙΡΙΣΗ — το γραφείο της Γραμματείας.
 *
 * Απαντά σε δύο ερωτήσεις πριν από οτιδήποτε άλλο: τι εκκρεμεί και τι
 * έρχεται. Το ημερολόγιο εδώ δείχνει ΟΛΑ τα γεγονότα (σε αντίθεση με την
 * Επικοινωνία, που κρατά μόνο τα δικά της) γιατί οι προθεσμίες των έργων
 * και οι εσωτερικές συναντήσεις είναι ακριβώς η δουλειά αυτής της θέσης.
 */

const LINKS = [
  { label: 'Ημερήσια διάταξη & πρακτικά', href: 'https://docs.google.com/document/d/1FB5tjSpwbJMQuH_8fKSyhmh6ssEguHqxKx2OnbtHXwk/edit', primary: true },
  { label: 'Παλιά λίστα Slack (ιστορικό & σχόλια)', href: 'https://culture-for-change.slack.com/lists/T01CTE4JUQK/F0AH3GTSJD9' },
  { label: 'Καταγραφή attendance Cafe', href: 'https://docs.google.com/document/d/1tP5RUg8nIBJgiDRC3J0A7mOZiNsJtiwU/edit' },
  { label: 'Προτάσεις κινητικότητας', href: 'https://docs.google.com/document/d/1z5K7ERtQUaJS81g90gPTx9nM__SItEuCwht158SoDyc/edit' },
  { label: 'Απολογισμός δραστηριότητας', href: 'https://docs.google.com/spreadsheets/d/1h5Pbmua2J1pcUZ1KiftufmaiVasCM-8T/edit' },
  { label: 'Προϋπολογισμοί', href: 'https://drive.google.com/drive/folders/1IP8B8DBDYRU5r-R2LlzMT_294FI7yh62' },
]

function Tile({ value, label, sub, accent }: { value: string; label: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 flex flex-col">
      <span className="text-3xl font-bold notranslate" style={accent ? { color: accent } : undefined}>
        <span className={accent ? '' : 'text-charcoal dark:text-gray-100'}>{value}</span>
      </span>
      <span className="text-base text-gray-700 dark:text-gray-200 mt-1 leading-snug">{label}</span>
      {sub && <span className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-snug">{sub}</span>}
    </div>
  )
}

export default function OcAdmin({ canEdit, canDispatch }: { canEdit: boolean; canDispatch: boolean }) {
  const [events, setEvents] = useState<CalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<CalEvent | null>(null)
  const [creatingOn, setCreatingOn] = useState<string | null>(null)
  const [seatHolders, setSeatHolders] = useState<SeatHolder[]>([])
  const [members, setMembers] = useState<Array<{ documentId: string; name: string; am: number | null }>>([])
  const [attendanceFor, setAttendanceFor] = useState<CalEvent | null>(null)
  const [attendance, setAttendance] = useState<Record<string, number>>({})

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/oc/calendar?past=365&future=210')
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || 'Αποτυχία')
      setEvents(d.events || [])
      setSeatHolders(d.seatHolders || [])
      // Μέλη για την καταγραφή παρουσιών — ίδια πηγή με τις εκκρεμότητες
      fetch('/api/oc/tasks').then(r => r.ok ? r.json() : null)
        .then(t => setMembers(t?.members || [])).catch(() => {})
      loadAttendance()
    } catch (err: any) {
      setError(err?.message || 'Αποτυχία φόρτωσης ημερολογίου')
    } finally {
      setLoading(false)
    }
  }, [])
  const loadAttendance = useCallback(async () => {
    try {
      const res = await fetch(`/api/oc/attendance?year=${new Date().getFullYear()}`)
      if (!res.ok) return
      const d = await res.json()
      const map: Record<string, number> = {}
      for (const r of d.records || []) map[r.eventId] = r.memberCount + (r.nonMemberCount || 0)
      setAttendance(map)
    } catch { /* σιωπηλά — η σελίδα δεν πρέπει να σπάει γι' αυτό */ }
  }, [])

  useEffect(() => { load() }, [load])

  const upcoming = events.filter(e => daysUntil(e.start) >= 0)
  const nextBoard = upcoming.find(e => e.category === 'governance')
  const nextCafe = upcoming.find(e => e.category === 'cafe')
  const deadlines30 = upcoming.filter(e => e.category === 'deadline' && daysUntil(e.start) <= 30)
  const nextDeadline = deadlines30[0]

  return (
    <div className="space-y-6">
      {/* Τι έρχεται */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile
          value={nextBoard ? new Date(nextBoard.start).toLocaleDateString('el-GR', { day: 'numeric', month: 'short' }) : '—'}
          label="Επόμενο ΔΣ"
          sub={nextBoard ? untilLabel(nextBoard.start) : 'δεν έχει οριστεί στο ημερολόγιο'}
          accent="#8E7CC3"
        />
        <Tile
          value={String(deadlines30.length)}
          label="Προθεσμίες 30 ημερών"
          sub={nextDeadline ? `επόμενη: ${nextDeadline.title.slice(0, 34)}` : 'καμία σε εκκρεμότητα'}
          accent={deadlines30.length > 0 ? '#E9A13B' : undefined}
        />
        <Tile
          value={nextCafe ? new Date(nextCafe.start).toLocaleDateString('el-GR', { day: 'numeric', month: 'short' }) : '—'}
          label="Επόμενο Meet Up Cafe"
          sub={nextCafe ? untilLabel(nextCafe.start) : undefined}
          accent="#2A9D8F"
        />
        <Tile value={String(upcoming.length)} label="Γεγονότα στο ημερολόγιο" sub="επόμενοι 7 μήνες" />
      </div>

      {/* Ημερήσια διάταξη */}
      <OcAgenda />

      {/* Εκκρεμότητες */}
      <OcTasks />

      {/* Ημερολόγιο */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-4 mb-5">
          <h2 className="text-2xl font-bold text-charcoal dark:text-gray-100">Ημερολόγιο δράσεων</h2>
          <span className="text-base text-gray-500 dark:text-gray-400">όλα τα γεγονότα του δικτύου</span>
        </div>
        {loading ? <p className="text-base text-gray-400">Φόρτωση…</p>
          : error ? <p className="text-base text-red-600 dark:text-red-400">{error}</p>
            : (
              <OcCalendar
                events={events}
                canEdit={canEdit}
                storageKey="oc-cal-view-admin"
                onEdit={canEdit ? setEditing : undefined}
                onCreate={canEdit ? setCreatingOn : undefined}
                onAttendance={setAttendanceFor}
                attendanceByEvent={attendance}
                emptyText="Κανένα γεγονός στο ημερολόγιο."
              />
            )}
      </div>

      {/* Μηνιαία οικονομική εικόνα */}
      <OcMonthlyView mode="admin" canDispatch={canDispatch} />

      {/* Σύνδεσμοι */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-8">
        <h2 className="text-xl font-bold text-charcoal dark:text-gray-100 mb-4">Έγγραφα &amp; εργαλεία</h2>
        <ul className="space-y-2.5">
          {LINKS.map(l => (
            <li key={l.href}>
              <a href={l.href} target="_blank" rel="noopener noreferrer"
                className={`hover:underline ${l.primary
                  ? 'text-base font-bold text-coral dark:text-coral-light'
                  : 'text-base text-coral dark:text-coral-light'}`}>
                {l.label} ↗
              </a>
            </li>
          ))}
        </ul>
      </div>

      {attendanceFor && (
        <OcAttendance
          event={{ id: attendanceFor.id, title: attendanceFor.title, start: attendanceFor.start, category: attendanceFor.category }}
          members={members}
          onClose={() => setAttendanceFor(null)}
          onSaved={loadAttendance}
        />
      )}

      {(editing || creatingOn) && (
        <OcEventForm
          event={editing}
          date={creatingOn || undefined}
          seatHolders={seatHolders}
          onClose={() => { setEditing(null); setCreatingOn(null) }}
          onSaved={load}
        />
      )}
    </div>
  )
}
