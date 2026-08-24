'use client'

import { useState } from 'react'
import type { CalEvent } from '@/components/oc/OcCalendar'

/**
 * Νέο / επεξεργασία γεγονότος στο κοινό ημερολόγιο.
 *
 * Τα «είδη» προσυμπληρώνουν ό,τι επαναλαμβάνεται: ώρα, τίτλο, σύνδεσμο
 * Meet. Όλα παραμένουν επεξεργάσιμα — το είδος είναι αφετηρία, όχι κανόνας.
 */

/** Μόνιμος σύνδεσμος βιντεοκλήσης του CforC — ο ίδιος για κάθε συνάντηση */
const CFORC_MEET = 'https://meet.google.com/xyi-kazc-yzy'

interface Preset {
  key: string
  label: string
  title: string
  allDay: boolean
  startTime?: string
  endTime?: string
  meetLink?: string
}

const PRESETS: Preset[] = [
  { key: 'cafe', label: 'Meet Up Cafe', title: 'Meet Up Cafe ☕', allDay: false, startTime: '19:00', endTime: '20:30', meetLink: CFORC_MEET },
  { key: 'nl-in', label: 'Newsletter μελών', title: 'Newsletter εσωτερικής κοινότητας', allDay: true },
  { key: 'nl-out', label: 'Newsletter κοινού', title: 'Newsletter εξωτερικής κοινότητας', allDay: true },
  { key: 'share', label: 'Share my experience', title: 'Share my experience', allDay: false, startTime: '19:00', endTime: '20:30', meetLink: CFORC_MEET },
  { key: 'ds', label: 'ΔΣ', title: 'ΔΣ', allDay: false, startTime: '09:00', endTime: '11:00', meetLink: CFORC_MEET },
  { key: 'deadline', label: 'Προθεσμία', title: '', allDay: true },
  { key: 'other', label: 'Άλλο', title: '', allDay: false, startTime: '18:00', endTime: '19:00' },
]

const inputCls = 'w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-base text-charcoal dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-coral'
const labelCls = 'block text-sm font-bold text-gray-600 dark:text-gray-300 mb-1'

export interface SeatHolder { name: string; email: string; personalEmail?: string; labels: string }

export default function OcEventForm({ event, date, seatHolders = [], onClose, onSaved }: {
  event?: CalEvent | null
  date?: string
  seatHolders?: SeatHolder[]
  onClose: () => void
  onSaved: () => void
}) {
  const editing = !!event
  const [title, setTitle] = useState(event?.title || '')
  const [day, setDay] = useState(event ? String(event.start).slice(0, 10) : (date || new Date().toISOString().slice(0, 10)))
  const [allDay, setAllDay] = useState(event?.allDay ?? false)
  const [startTime, setStartTime] = useState(
    event && !event.allDay ? new Date(event.start).toTimeString().slice(0, 5) : '19:00')
  const [endTime, setEndTime] = useState(
    event?.end && !event.allDay ? new Date(event.end).toTimeString().slice(0, 5) : '20:30')
  const [description, setDescription] = useState(event?.description || '')
  const [location, setLocation] = useState(event?.location || '')
  const [meetLink, setMeetLink] = useState(event?.meetLink || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [attendees, setAttendees] = useState<string[]>(event?.attendees?.map(a => a.email) || [])
  const [extraEmail, setExtraEmail] = useState('')

  const has = (email: string) => attendees.includes(email.toLowerCase())
  const toggle = (email: string) => setAttendees(a =>
    has(email) ? a.filter(x => x !== email.toLowerCase()) : [...a, email.toLowerCase()])
  const inviteAll = () => setAttendees(a =>
    [...new Set([...a, ...seatHolders.map(h => h.email.toLowerCase())])])
  const addExtra = () => {
    const e = extraEmail.trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return
    if (!has(e)) setAttendees(a => [...a, e])
    setExtraEmail('')
  }
  const allInvited = seatHolders.length > 0 && seatHolders.every(h => has(h.email))
  const others = attendees.filter(e => !seatHolders.some(h => h.email.toLowerCase() === e))

  function applyPreset(p: Preset) {
    if (p.title) setTitle(p.title)
    setAllDay(p.allDay)
    if (p.startTime) setStartTime(p.startTime)
    if (p.endTime) setEndTime(p.endTime)
    if (p.meetLink) setMeetLink(p.meetLink)
  }

  async function save() {
    setBusy(true); setError(null)
    try {
      const body = { title, date: day, allDay, startTime, endTime, description, location, meetLink, attendees }
      const res = await fetch('/api/oc/calendar', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing ? { ...body, id: event!.id } : body),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || 'Αποτυχία')
      onSaved(); onClose()
    } catch (err: any) {
      setError(err?.message || 'Αποτυχία καταχώρησης')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/oc/calendar?id=${encodeURIComponent(event!.id)}`, { method: 'DELETE' })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || 'Αποτυχία')
      onSaved(); onClose()
    } catch (err: any) {
      setError(err?.message || 'Αποτυχία διαγραφής')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="menu-glass rounded-3xl max-w-lg w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-5">
          <h3 className="text-xl font-bold text-charcoal dark:text-gray-100">
            {editing ? 'Επεξεργασία γεγονότος' : 'Νέο γεγονός'}
          </h3>
          <button type="button" onClick={onClose} aria-label="Κλείσιμο"
            className="text-gray-400 hover:text-charcoal dark:hover:text-gray-100 text-2xl leading-none">×</button>
        </div>

        {!editing && (
          <div className="mb-5">
            <p className={labelCls}>Είδος — συμπληρώνει τα συνηθισμένα</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <button key={p.key} type="button" onClick={() => applyPreset(p)}
                  className="px-3.5 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 text-sm text-charcoal dark:text-gray-200 hover:border-coral hover:text-coral">
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className={labelCls} htmlFor="ev-title">Τίτλος</label>
            <input id="ev-title" className={inputCls} value={title} onChange={e => setTitle(e.target.value)}
              placeholder="π.χ. Meet Up Cafe ☕" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="ev-date">Ημερομηνία</label>
              <input id="ev-date" type="date" className={inputCls} value={day} onChange={e => setDay(e.target.value)} />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-base text-charcoal dark:text-gray-200">
                <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)}
                  className="w-4 h-4 accent-coral" />
                Ολοήμερο
              </label>
            </div>
          </div>

          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="ev-start">Από</label>
                <input id="ev-start" type="time" className={inputCls} value={startTime} onChange={e => setStartTime(e.target.value)} />
              </div>
              <div>
                <label className={labelCls} htmlFor="ev-end">Έως</label>
                <input id="ev-end" type="time" className={inputCls} value={endTime} onChange={e => setEndTime(e.target.value)} />
              </div>
            </div>
          )}

          <div>
            <label className={labelCls} htmlFor="ev-meet">Σύνδεσμος βιντεοκλήσης</label>
            <input id="ev-meet" className={inputCls} value={meetLink} onChange={e => setMeetLink(e.target.value)}
              placeholder="προαιρετικό" />
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <button type="button" onClick={() => setMeetLink(CFORC_MEET)}
                disabled={meetLink === CFORC_MEET}
                className="px-3.5 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 text-sm text-charcoal dark:text-gray-200 hover:border-coral hover:text-coral disabled:opacity-40 disabled:hover:border-gray-300 dark:disabled:hover:border-gray-600">
                {meetLink === CFORC_MEET ? '✓ Μόνιμος σύνδεσμος CforC' : 'Μόνιμος σύνδεσμος CforC'}
              </button>
              {meetLink && (
                <button type="button" onClick={() => setMeetLink('')}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-coral">καθαρισμός</button>
              )}
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
              <span className={labelCls + ' mb-0'}>Προσκλήσεις</span>
              {seatHolders.length > 0 && (
                <button type="button" onClick={allInvited ? () => setAttendees(others) : inviteAll}
                  className="text-sm font-bold text-coral hover:underline">
                  {allInvited ? 'Καμία από την Ομάδα' : `Όλη η Ομάδα Συντονισμού (${seatHolders.length})`}
                </button>
              )}
            </div>

            {seatHolders.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Δεν βρέθηκαν emails θέσεων.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {seatHolders.map(h => (
                  <button key={h.email} type="button" onClick={() => toggle(h.email)}
                    title={`${h.labels} — ${h.name}\nΠρόσκληση στη θυρίδα ${h.email}`}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      has(h.email)
                        ? 'bg-coral text-white border-coral'
                        : 'border-gray-300 dark:border-gray-600 text-charcoal dark:text-gray-200 hover:border-coral'}`}>
                    {has(h.email) ? '✓ ' : ''}{h.labels.split(' · ')[0]}
                    <span className="opacity-70"> · {h.name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-2">
              <input className={inputCls + ' flex-1 min-w-[12rem]'} value={extraEmail}
                onChange={e => setExtraEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addExtra() } }}
                placeholder="και άλλο email…" />
              <button type="button" onClick={addExtra} disabled={!extraEmail.trim()}
                className="px-4 py-2 rounded-full border border-gray-300 dark:border-gray-600 text-sm text-charcoal dark:text-gray-200 disabled:opacity-40">
                Προσθήκη
              </button>
            </div>

            {others.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {others.map(e => (
                  <span key={e} className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-sm text-charcoal dark:text-gray-200">
                    {e}
                    <button type="button" onClick={() => toggle(e)} aria-label={`Αφαίρεση ${e}`}
                      className="ml-2 text-gray-400 hover:text-red-500">×</button>
                  </span>
                ))}
              </div>
            )}

            {attendees.length > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Πρόσκληση σε {attendees.length} {attendees.length === 1 ? 'παραλήπτη' : 'παραλήπτες'} μόλις αποθηκευτεί.
                Οι θέσεις προσκαλούνται στη <strong>θυρίδα του ρόλου</strong> — έτσι οι προσκλήσεις δεν χρειάζονται
                αλλαγή μετά από εκλογές.
              </p>
            )}
          </div>

          <div>
            <label className={labelCls} htmlFor="ev-desc">Περιγραφή</label>
            <textarea id="ev-desc" rows={3} className={inputCls} value={description}
              onChange={e => setDescription(e.target.value)} placeholder="προαιρετικό" />
          </div>

          <div>
            <label className={labelCls} htmlFor="ev-loc">Τοποθεσία</label>
            <input id="ev-loc" className={inputCls} value={location} onChange={e => setLocation(e.target.value)}
              placeholder="προαιρετικό" />
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
                    className="px-4 py-2 rounded-full bg-red-600 text-white text-sm font-bold hover:opacity-90">Ναι</button>
                  <button type="button" onClick={() => setConfirmDelete(false)} disabled={busy}
                    className="px-3 py-2 rounded-full border border-gray-300 dark:border-gray-600 text-sm text-charcoal dark:text-gray-200">Όχι</button>
                </span>
              )}
            </span>
          )}
        </div>

        {editing && confirmDelete && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
            Το γεγονός πάει στον κάδο του Google Calendar και μπορεί να ανακτηθεί για ~30 μέρες.
          </p>
        )}
      </div>
    </div>
  )
}
