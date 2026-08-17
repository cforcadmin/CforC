'use client'

import { useEffect, useState } from 'react'

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
interface CalEvent {
  id: string; title: string; start: string; allDay: boolean
  category: string; meetLink: string | null; location: string | null; htmlLink: string | null
}
interface CommsData {
  lists: { paid: number; external: number; media: number } | null
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

const CAT_STYLE: Record<string, { label: string; dot: string; text: string }> = {
  cafe: { label: 'Cafe', dot: 'bg-teal-500', text: 'text-teal-700 dark:text-teal-300' },
  'newsletter-internal': { label: 'Newsletter μελών', dot: 'bg-coral', text: 'text-coral' },
  'newsletter-external': { label: 'Newsletter κοινού', dot: 'bg-orange-400', text: 'text-orange-600 dark:text-orange-300' },
  governance: { label: 'Διοικητικά', dot: 'bg-red-500', text: 'text-red-600 dark:text-red-300' },
  deadline: { label: 'Προθεσμία', dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300' },
  share: { label: 'Share my experience', dot: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-300' },
  meeting: { label: 'Συνάντηση', dot: 'bg-gray-400', text: 'text-gray-500 dark:text-gray-400' },
}

const DOCS = [
  { label: 'Newsletter μελών — κείμενα', href: 'https://docs.google.com/document/d/1YLT-EJnUO5SLGe-l7Fh2sWaORTGEXzLb/edit' },
  { label: 'Newsletter κοινού — κείμενα', href: 'https://docs.google.com/document/d/1noVKWOFnN0MdO3Tv_z6ad6P1HXwPAMhdB8ZUjh1KOP0/edit' },
  { label: 'Sender (αποστολές)', href: 'https://app.sender.net' },
]

const gr = (d: string) => new Date(d).toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit' })
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

function Tile({ value, label, sub, accent, warn }: {
  value: string; label: string; sub?: string; accent?: string; warn?: boolean
}) {
  return (
    <div className={`rounded-2xl shadow-sm p-5 flex flex-col border ${warn
      ? 'bg-amber-50 dark:bg-amber-900/25 border-amber-300 dark:border-amber-700'
      : 'bg-white dark:bg-gray-800 border-transparent'}`}>
      <span className="text-3xl font-bold notranslate" style={accent ? { color: accent } : undefined}>
        <span className={accent ? '' : 'text-charcoal dark:text-gray-100'}>{value}</span>
      </span>
      <span className="text-sm text-gray-600 dark:text-gray-300 mt-1 leading-snug">{label}</span>
      {sub && <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</span>}
    </div>
  )
}

function Bars({ rows, unit = '' }: { rows: Array<{ label: string; value: number }>; unit?: string }) {
  const max = Math.max(1, ...rows.map(r => r.value))
  return (
    <div className="space-y-1.5">
      {rows.map(r => (
        <div key={r.label} className="flex items-center gap-3 text-sm">
          <span className="w-36 shrink-0 text-gray-600 dark:text-gray-300 truncate" title={r.label}>{r.label}</span>
          <span className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
            <span className="block h-full rounded-full bg-coral" style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className="w-16 text-right text-charcoal dark:text-gray-200 notranslate">{num(r.value)}{unit}</span>
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
        {list !== null && <span className="text-sm text-gray-400 notranslate">{num(list)} παραλήπτες</span>}
      </div>
      {latest ? (
        <>
          <p className="text-4xl font-bold mt-3 notranslate" style={{ color: tone }}>{latest.openRate}%</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            άνοιγμα τελευταίας · <span className="notranslate">{latest.clickRate}%</span> κλικ
          </p>
          <p className="text-sm text-charcoal dark:text-gray-200 mt-3 leading-snug">{latest.subject}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 notranslate">
            {latest.sentAt ? new Date(latest.sentAt).toLocaleDateString('el-GR') : '—'} · {num(latest.recipients)} παραλήπτες
          </p>

          {campaigns.length > 1 && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Προηγούμενες</p>
              <div className="flex items-end gap-1.5 h-16">
                {[...campaigns].reverse().map((c, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1" title={`${c.subject} — ${c.openRate}%`}>
                    <span className="w-full rounded-t" style={{ height: `${((c.openRate || 0) / max) * 100}%`, backgroundColor: tone, opacity: 0.35 + (i / campaigns.length) * 0.65 }} />
                    <span className="text-[10px] text-gray-400 notranslate">{c.openRate}</span>
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
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
          Μέσος όρος <span className="notranslate">{avg}%</span> στις τελευταίες {campaigns.length}
        </p>
      )}
    </div>
  )
}

export default function OcComms() {
  const [data, setData] = useState<CommsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showMeetings, setShowMeetings] = useState(false)

  useEffect(() => {
    fetch('/api/oc/comms')
      .then(async r => { if (!r.ok) throw new Error((await r.json())?.error || 'Αποτυχία'); return r.json() })
      .then(setData)
      .catch(e => setError(e?.message || 'Αποτυχία φόρτωσης'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-8 text-gray-400">Φόρτωση…</div>
  if (error) return <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-8 text-red-600 dark:text-red-400">{error}</div>
  if (!data) return null

  const { lists, campaigns, averages, events, nextNewsletters: nn, ga, gaDetail, configured } = data
  const ratio = averages.members && averages.external
    ? (averages.members / averages.external).toFixed(1) : null
  const sessionDelta = ga && ga.prev.sessions
    ? Math.round(((ga.sessions / ga.prev.sessions) - 1) * 100) : null

  const upcoming = events
    .filter(e => daysUntil(e.start) >= 0)
    .sort((a, b) => String(a.start).localeCompare(String(b.start)))
  const highlights = upcoming.filter(e => e.category !== 'meeting')
  const meetings = upcoming.filter(e => e.category === 'meeting')

  return (
    <div className="space-y-6">
      {/* Πλακίδια */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Tile value={lists ? num(lists.paid) : '—'} label="Λίστα μελών" sub="Sender · Paid" />
        <Tile value={lists ? num(lists.external) : '—'} label="Κοινό" sub="Sender · External" accent="#4A90D9" />
        <Tile value={lists ? num(lists.media) : '—'} label="Media" />
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
        <p className="text-sm text-center text-gray-500 dark:text-gray-400">
          Τα μέλη ανοίγουν <strong className="text-charcoal dark:text-gray-100 notranslate">{ratio}×</strong> περισσότερο από το κοινό
          {gaDetail && <> · το newsletter έφερε <span className="notranslate">{gaDetail.fromNewsletter}</span> επισκέψεις στο site τον τελευταίο μήνα</>}
        </p>
      )}

      {/* Ημερολόγιο */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-8">
        <div className="flex items-baseline justify-between gap-4 mb-5">
          <h2 className="text-2xl font-bold text-charcoal dark:text-gray-100">Ημερολόγιο δράσεων</h2>
          <span className="text-sm text-gray-400">επόμενοι 5 μήνες</span>
        </div>

        {!configured.calendar ? (
          <p className="text-sm text-gray-400">Δεν έχει ρυθμιστεί η σύνδεση με το Google Calendar.</p>
        ) : highlights.length === 0 ? (
          <p className="text-sm text-gray-400">Κανένα προγραμματισμένο γεγονός.</p>
        ) : (
          <ul className="space-y-2">
            {highlights.map(e => {
              const st = CAT_STYLE[e.category] || CAT_STYLE.meeting
              const soon = daysUntil(e.start) <= 2
              return (
                <li key={e.id} className={`flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 ${
                  soon ? 'bg-gray-50 dark:bg-gray-700/50' : ''}`}>
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${st.dot}`} aria-hidden="true" />
                  <span className="w-16 shrink-0 text-sm font-bold text-charcoal dark:text-gray-100 notranslate">{gr(e.start)}</span>
                  <span className="flex-1 min-w-48">
                    <span className="text-sm text-charcoal dark:text-gray-100">{e.title}</span>
                    <span className={`block text-xs ${st.text}`}>
                      {st.label}
                      {!e.allDay && <span className="notranslate"> · {new Date(e.start).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}</span>}
                    </span>
                  </span>
                  <span className={`text-xs shrink-0 ${soon ? 'font-bold text-coral' : 'text-gray-400 dark:text-gray-500'}`}>
                    {untilLabel(e.start)}
                  </span>
                  {e.meetLink && (
                    <a href={e.meetLink} target="_blank" rel="noopener noreferrer"
                      className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold ${
                        e.category === 'cafe' && soon
                          ? 'bg-teal-600 text-white hover:opacity-90'
                          : 'border border-gray-300 dark:border-gray-600 text-charcoal dark:text-gray-200 hover:border-coral'}`}>
                      {e.category === 'cafe' ? 'Σύνδεση στο Cafe' : 'Meet'}
                    </a>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {meetings.length > 0 && (
          <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
            <button type="button" onClick={() => setShowMeetings(!showMeetings)}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-coral">
              {showMeetings ? '▾' : '▸'} Λοιπές συναντήσεις ({meetings.length})
            </button>
            {showMeetings && (
              <ul className="mt-3 space-y-1.5">
                {meetings.map(e => (
                  <li key={e.id} className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                    <span className="w-16 shrink-0 notranslate">{gr(e.start)}</span>
                    <span className="flex-1">{e.title}</span>
                    {e.meetLink && (
                      <a href={e.meetLink} target="_blank" rel="noopener noreferrer" className="text-coral hover:underline text-xs">meet ↗</a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
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
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Από πού έρχονται</p>
                <Bars rows={gaDetail.channels.slice(0, 6)} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Τι βλέπουν</p>
                <Bars rows={gaDetail.sections.slice(0, 6)} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Χώρες</p>
                <Bars rows={gaDetail.countries.slice(0, 5)} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Συσκευές</p>
                <Bars rows={gaDetail.devices.slice(0, 4)} />
              </div>
            </div>

            {ga.spamSessions > 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-6 rounded-xl bg-gray-50 dark:bg-gray-700/50 px-4 py-3">
                Εξαιρέθηκαν <strong className="notranslate">{num(ga.spamSessions)}</strong> επισκέψεις από γνωστά bots (referral spam).
                Τα νούμερα εδώ είναι τα πραγματικά — στο Google Analytics θα δεις μεγαλύτερα.
              </p>
            )}
          </>
        )}
      </div>

      {/* Έγγραφα */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-8">
        <h2 className="text-xl font-bold text-charcoal dark:text-gray-100 mb-4">Έγγραφα εργασίας</h2>
        <ul className="space-y-2">
          {DOCS.map(d => (
            <li key={d.href}>
              <a href={d.href} target="_blank" rel="noopener noreferrer"
                className="text-sm text-coral dark:text-coral-light hover:underline">{d.label} ↗</a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
