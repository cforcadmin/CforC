'use client'

import { useCallback, useEffect, useState } from 'react'
import OcCalendar, { type CalEvent } from '@/components/oc/OcCalendar'
import OcEventForm from '@/components/oc/OcEventForm'

/**
 * ΕΠΙΚΟΙΝΩΝΙΑ — μία οθόνη για τον ρυθμό της επικοινωνίας:
 *   πλακίδια λιστών · επόμενα newsletters · οι δύο λίστες με τα ποσοστά
 *   ανοίγματος · ημερολόγιο δράσεων · επισκεψιμότητα ιστοσελίδας.
 * Κάθε πηγή αποτυγχάνει μόνη της — αν λείπει μία, οι άλλες φαίνονται.
 */

interface Campaign {
  subject: string; sentAt: string | null; recipients: number
  opens: number; clicks: number; openRate: number | null; clickRate: number | null
}
interface CommsData {
  lists: { paid: number; external: number; media: number } | null
  mediaUsed: boolean
  campaigns: { members: Campaign[]; external: Campaign[] }
  averages: { members: number | null; external: number | null }
  events: CalEvent[]
  nextNewsletters: {
    internal: { date: string; estimated: boolean; title: string }
    external: { date: string; estimated: boolean; title: string }
  }
  ga: {
    sessions: number; users: number; pageViews: number; engagementRate: number
    avgSessionSeconds: number; prev: { sessions: number; users: number }; spamSessions: number
  } | null
  gaDetail: {
    channels: Array<{ label: string; value: number }>
    sections: Array<{ label: string; value: number }>
    countries: Array<{ label: string; value: number }>
    devices: Array<{ label: string; value: number }>
    fromNewsletter: number; applyViews: number
  } | null
  configured: { sender: boolean; calendar: boolean; analytics: boolean }
}

/**
 * Τι αφορά την Επικοινωνία: ο ρυθμός προς τα έξω. Οι προθεσμίες των έργων
 * (Σ.Η.μα, παραδοτέα) και οι εσωτερικές συναντήσεις ανήκουν στη Διαχείριση —
 * φαίνονται μόνο με τον διακόπτη, δεν χάνονται.
 */
const COMMS_CATEGORIES = new Set(['cafe', 'newsletter-internal', 'newsletter-external', 'share', 'governance'])

const DOCS = [
  { label: 'Newsletter μελών — κείμενα', href: 'https://docs.google.com/document/d/1YLT-EJnUO5SLGe-l7Fh2sWaORTGEXzLb/edit' },
  { label: 'Newsletter κοινού — κείμενα', href: 'https://docs.google.com/document/d/1noVKWOFnN0MdO3Tv_z6ad6P1HXwPAMhdB8ZUjh1KOP0/edit' },
  { label: 'Sender (αποστολές)', href: 'https://app.sender.net' },
]

const grLong = (d: string) => new Date(d).toLocaleDateString('el-GR', { day: 'numeric', month: 'short' })
const num = (n: number) => n.toLocaleString('el-GR')

function daysUntil(d: string): number {
  const t = new Date(); t.setHours(0, 0, 0, 0)
  return Math.round((new Date(d.slice(0, 10)).getTime() - t.getTime()) / 86400000)
}
function untilLabel(d: string): string {
  const n = daysUntil(d)
  if (n === 0) return 'σήμερα'
  if (n === 1) return 'αύριο'
  if (n < 0) return `πριν ${Math.abs(n)} μέρες`
  return `σε ${n} μέρες`
}

function Tile({ value, label, sub, accent, warn, idle }: {
  value: string; label: string; sub?: string; accent?: string; warn?: boolean; idle?: boolean
}) {
  return (
    <div className={`rounded-2xl shadow-sm p-5 flex flex-col border ${
      warn ? 'bg-amber-50 dark:bg-amber-900/25 border-amber-300 dark:border-amber-700'
      : idle ? 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 border-dashed'
      : 'bg-white dark:bg-gray-800 border-transparent'}`}>
      <span className="text-3xl font-bold notranslate" style={accent ? { color: accent } : undefined}>
        <span className={accent ? '' : 'text-charcoal dark:text-gray-100'}>{value}</span>
      </span>
      <span className="text-base text-gray-700 dark:text-gray-200 mt-1 leading-snug">{label}</span>
      {sub && <span className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-snug">{sub}</span>}
    </div>
  )
}

function Bars({ rows, unit = '' }: { rows: Array<{ label: string; value: number }>; unit?: string }) {
  const max = Math.max(1, ...rows.map(r => r.value))
  return (
    <div className="space-y-1.5">
      {rows.map(r => (
        <div key={r.label} className="flex items-center gap-3 text-base">
          <span className="w-36 shrink-0 text-gray-700 dark:text-gray-200 truncate" title={r.label}>{r.label}</span>
          <span className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
            <span className="block h-full rounded-full bg-coral" style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className="w-16 text-right font-medium text-charcoal dark:text-gray-100 notranslate">{num(r.value)}{unit}</span>
        </div>
      ))}
    </div>
  )
}

function NewsletterCard({ title, list, campaigns, avg, tone }: {
  title: string; list: number | null; campaigns: Campaign[]; avg: number | null; tone: string
}) {
  const latest = campaigns[0]
  const max = Math.max(1, ...campaigns.map(c => c.openRate || 0))
  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6 flex flex-col">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-bold text-charcoal dark:text-gray-100">{title}</h3>
        {list !== null && <span className="text-base text-gray-500 dark:text-gray-400 notranslate">{num(list)} παραλήπτες</span>}
      </div>
      {latest ? (
        <>
          <p className="text-4xl font-bold mt-3 notranslate" style={{ color: tone }}>{latest.openRate}%</p>
          <p className="text-base text-gray-600 dark:text-gray-300">
            άνοιγμα τελευταίας · <span className="notranslate font-medium">{latest.clickRate}%</span> κλικ
          </p>
          <p className="text-base text-charcoal dark:text-gray-100 mt-3 leading-snug">{latest.subject}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 notranslate mt-0.5">
            {latest.sentAt ? new Date(latest.sentAt).toLocaleDateString('el-GR') : '—'} · {num(latest.recipients)} παραλήπτες
          </p>

          {campaigns.length > 1 && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Ποσοστό ανοίγματος — προηγούμενες αποστολές
              </p>
              <div className="flex items-end gap-2 h-24">
                {[...campaigns].reverse().map((c, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1.5"
                    title={`${c.subject}${c.sentAt ? ' — ' + new Date(c.sentAt).toLocaleDateString('el-GR') : ''} · ${c.openRate}% άνοιγμα, ${c.clickRate}% κλικ`}>
                    <span className="w-full rounded-t min-h-[0.25rem]" style={{ height: `${((c.openRate || 0) / max) * 100}%`, backgroundColor: tone, opacity: 0.4 + (i / campaigns.length) * 0.6 }} />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300 notranslate">{c.openRate}%</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 notranslate">
                      {c.sentAt ? new Date(c.sentAt).toLocaleDateString('el-GR', { month: 'short' }) : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-gray-400 mt-3">Καμία αποστολή ακόμη.</p>
      )}
      {avg !== null && campaigns.length > 1 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
          Μέσος όρος <span className="notranslate font-medium text-charcoal dark:text-gray-200">{avg}%</span> στις τελευταίες {campaigns.length}
        </p>
      )}
    </div>
  )
}

export default function OcComms() {
  const [data, setData] = useState<CommsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [editing, setEditing] = useState<CalEvent | null>(null)
  const [creatingOn, setCreatingOn] = useState<string | null>(null)

  const load = useCallback(() => {
    fetch('/api/oc/comms')
      .then(async r => { if (!r.ok) throw new Error((await r.json())?.error || 'Αποτυχία'); return r.json() })
      .then(setData)
      .catch(e => setError(e?.message || 'Αποτυχία φόρτωσης'))
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  if (loading) return <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-8 text-gray-400">Φόρτωση…</div>
  if (error) return <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-8 text-red-600 dark:text-red-400">{error}</div>
  if (!data) return null

  const { lists, mediaUsed, campaigns, averages, events, nextNewsletters: nn, ga, gaDetail, configured } = data
  // Λίστα Τύπου χωρίς καμία αποστολή: φαίνεται, δεν κρύβεται πίσω από αριθμό
  const mediaUnused = !!lists?.media && !mediaUsed
  const ratio = averages.members && averages.external
    ? (averages.members / averages.external).toFixed(1) : null
  const sessionDelta = ga && ga.prev.sessions
    ? Math.round(((ga.sessions / ga.prev.sessions) - 1) * 100) : null

  const visibleEvents = (showAll ? events : events.filter(e => COMMS_CATEGORIES.has(e.category))) as CalEvent[]
  const hiddenCount = events.length - events.filter(e => COMMS_CATEGORIES.has(e.category)).length

  return (
    <div className="space-y-6">
      {/* Πλακίδια */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Tile value={lists ? num(lists.paid) : '—'} label="Λίστα μελών" sub="Sender · Paid" />
        <Tile value={lists ? num(lists.external) : '—'} label="Κοινό" sub="Sender · External" accent="#4A90D9" />
        <Tile
          value={lists ? num(lists.media) : '—'}
          label="Λίστα Τύπου"
          sub={mediaUnused ? 'δημοσιογράφοι · καμία αποστολή ακόμη' : 'δημοσιογράφοι & ΜΜΕ'}
          idle={mediaUnused}
        />
        <Tile
          value={ga ? num(ga.sessions) : '—'}
          label="Επισκέψεις 30ημ."
          sub={sessionDelta !== null ? `${sessionDelta >= 0 ? '↑' : '↓'} ${Math.abs(sessionDelta)}% vs προηγ.` : undefined}
          accent="#6A994E"
        />
        <Tile
          value={grLong(nn.internal.date)}
          label="Επόμενο Newsletter μελών"
          sub={`${untilLabel(nn.internal.date)}${nn.internal.estimated ? ' · εκτίμηση' : ''}`}
          warn={nn.internal.estimated}
        />
        <Tile
          value={grLong(nn.external.date)}
          label="Επόμενο Newsletter κοινού"
          sub={`${untilLabel(nn.external.date)}${nn.external.estimated ? ' · εκτίμηση' : ''}`}
          warn={nn.external.estimated}
        />
      </div>

      {/* Τα δύο newsletters */}
      <div className="grid md:grid-cols-2 gap-6">
        <NewsletterCard title="Newsletter Μελών" list={lists?.paid ?? null}
          campaigns={campaigns.members} avg={averages.members} tone="#FF8B6A" />
        <NewsletterCard title="Newsletter Κοινού" list={lists?.external ?? null}
          campaigns={campaigns.external} avg={averages.external} tone="#4A90D9" />
      </div>

      {ratio && (
        <p className="text-base text-center text-gray-600 dark:text-gray-300">
          Τα μέλη ανοίγουν <strong className="text-charcoal dark:text-gray-100 notranslate">{ratio}×</strong> περισσότερο από το κοινό
          {gaDetail && <> · το newsletter έφερε <span className="notranslate">{gaDetail.fromNewsletter}</span> επισκέψεις στο site τον τελευταίο μήνα</>}
        </p>
      )}

      {/* Ημερολόγιο */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <h2 className="text-2xl font-bold text-charcoal dark:text-gray-100">Ημερολόγιο επικοινωνίας</h2>
          <label className="flex items-center gap-2 text-base text-gray-600 dark:text-gray-300 cursor-pointer">
            <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)}
              className="w-4 h-4 accent-coral" />
            Όλα τα γεγονότα του δικτύου
            {hiddenCount > 0 && !showAll && <span className="text-gray-400 dark:text-gray-500">({hiddenCount} κρυφά)</span>}
          </label>
        </div>

        {!configured.calendar ? (
          <p className="text-base text-gray-400">Δεν έχει ρυθμιστεί η σύνδεση με το Google Calendar.</p>
        ) : (
          <OcCalendar
            events={visibleEvents}
            canEdit
            storageKey="oc-cal-view-comms"
            onEdit={setEditing}
            onCreate={setCreatingOn}
            emptyText="Κανένα γεγονός επικοινωνίας στο ημερολόγιο."
          />
        )}
      </div>

      {/* Ιστοσελίδα */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-4 mb-5">
          <h2 className="text-2xl font-bold text-charcoal dark:text-gray-100">Ιστοσελίδα</h2>
          <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer"
            className="px-5 py-2 rounded-full border border-gray-300 dark:border-gray-600 text-sm font-bold text-charcoal dark:text-gray-200 hover:border-coral">
            Πλήρη στοιχεία στο Google Analytics ↗
          </a>
        </div>

        {!ga || !gaDetail ? (
          <p className="text-sm text-gray-400">
            {configured.analytics ? 'Δεν επιστράφηκαν στοιχεία.' : 'Δεν έχει ρυθμιστεί η σύνδεση με το Google Analytics.'}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Tile value={num(ga.users)} label="Χρήστες" sub="τελευταίες 30 ημέρες" />
              <Tile value={num(ga.pageViews)} label="Προβολές σελίδων" />
              <Tile value={`${ga.engagementRate}%`} label="Ενεργή επίσκεψη"
                sub={`μέσος χρόνος ${Math.floor(ga.avgSessionSeconds / 60)}′ ${ga.avgSessionSeconds % 60}″`} />
              <Tile value={num(gaDetail.applyViews)} label="Είδαν τη σελίδα εγγραφής" accent="#6A994E" />
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Από πού έρχονται</p>
                <Bars rows={gaDetail.channels.slice(0, 6)} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Τι βλέπουν</p>
                <Bars rows={gaDetail.sections.slice(0, 6)} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Χώρες</p>
                <Bars rows={gaDetail.countries.slice(0, 5)} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Συσκευές</p>
                <Bars rows={gaDetail.devices.slice(0, 4)} />
              </div>
            </div>

            {ga.spamSessions > 0 && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-6 rounded-xl bg-gray-50 dark:bg-gray-700/50 px-4 py-3">
                Εξαιρέθηκαν <strong className="notranslate">{num(ga.spamSessions)}</strong> επισκέψεις από γνωστά bots (referral spam).
                Τα νούμερα εδώ είναι τα πραγματικά — στο Google Analytics θα δεις μεγαλύτερα.
              </p>
            )}
          </>
        )}
      </div>

      {(editing || creatingOn) && (
        <OcEventForm
          event={editing}
          date={creatingOn || undefined}
          onClose={() => { setEditing(null); setCreatingOn(null) }}
          onSaved={load}
        />
      )}

      {/* Έγγραφα */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-8">
        <h2 className="text-xl font-bold text-charcoal dark:text-gray-100 mb-4">Έγγραφα εργασίας</h2>
        <ul className="space-y-2">
          {DOCS.map(d => (
            <li key={d.href}>
              <a href={d.href} target="_blank" rel="noopener noreferrer"
                className="text-base text-coral dark:text-coral-light hover:underline">{d.label} ↗</a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
