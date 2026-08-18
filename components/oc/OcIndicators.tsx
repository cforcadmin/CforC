'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * ΔΕΙΚΤΕΣ — «Πλαίσιο παρακολούθησης και αξιολόγησης έργου και αντικτύπου».
 *
 * Δύο κανόνες διέπουν αυτή την οθόνη:
 *  1. Κάθε ποσοστό δείχνει τη ΒΑΣΗ του. «Αττική 49%» χωρίς το «σε 76 μέλη
 *     με καταγεγραμμένη περιφέρεια» κρύβει ότι 24 μέλη δεν έχουν καθόλου.
 *  2. Ό,τι δεν υπολογίζεται, δηλώνεται ως χειροκίνητο — δεν μαντεύεται.
 *     Ένας δείκτης που φαίνεται σίγουρος ενώ είναι ελλιπής δεν ξαναελέγχεται
 *     από κανέναν.
 */

interface Counted { label: string; value: number; share: number | null }
interface Tally { items: Counted[]; known: number; unknown: number }
interface Data {
  year: number
  network: { total: number; newThisYear: number; paidThisYear: number; gender: Tally; province: Tally; fields: Tally }
  finance: {
    registrations: number; subscriptions: number; otherReceipts: number
    bySector: Counted[]; incomeTotal: number; expenseTotal: number
    expenseByCategory: Counted[]; unclassified: number
  }
  participation: {
    records: Array<{ title: string; date: string; members: number; nonMembers: number; share: number | null; gender: Counted[] }>
    actionsByType: Counted[]; actionsTotal: number
    eventsWithoutAttendance: Array<{ title: string; date: string }>
  }
  communication: {
    ga: { sessions: number; users: number; pageViews: number; sections: Counted[]; countries: Counted[]; channels: Counted[]; partial: boolean } | null
    gaConfigured: boolean
    openCalls: number | null
  }
  manual: string[]
}

const SECTOR_LABELS: Record<string, string> = {
  public: 'Δημόσιος τομέας', european: 'Ευρωπαϊκά προγράμματα', private: 'Ιδιωτικοί πόροι',
  services: 'Υπηρεσίες', other: 'Άλλο', unclassified: '⚠ Αταξινόμητα',
}
const EXPENSE_LABELS: Record<string, string> = {
  'Office Expenses': 'Λειτουργικά', Services: 'Υπηρεσίες',
  'Travel and Accommodation': 'Μετακινήσεις & διαμονή', Others: 'Λοιπά',
}

const eur = (n: number) => `${n.toLocaleString('el-GR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`
const num = (n: number) => n.toLocaleString('el-GR')

function Section({ code, title, children, note }: {
  code: string; title: string; children: React.ReactNode; note?: string
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-8">
      <div className="flex flex-wrap items-baseline gap-3 mb-1">
        <span className="text-sm font-bold text-coral notranslate">{code}</span>
        <h3 className="text-xl font-bold text-charcoal dark:text-gray-100">{title}</h3>
      </div>
      {note && <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{note}</p>}
      <div className={note ? '' : 'mt-4'}>{children}</div>
    </div>
  )
}

function Rows({ tally, unit = '' }: { tally: Tally; unit?: string }) {
  const max = Math.max(1, ...tally.items.map(i => i.value))
  return (
    <>
      <div className="space-y-1.5">
        {tally.items.slice(0, 12).map(i => (
          <div key={i.label} className="flex items-center gap-3 text-base">
            <span className="w-44 shrink-0 text-gray-700 dark:text-gray-200 truncate" title={i.label}>{i.label}</span>
            <span className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
              <span className="block h-full rounded-full bg-coral" style={{ width: `${(i.value / max) * 100}%` }} />
            </span>
            <span className="w-24 text-right text-charcoal dark:text-gray-100 notranslate">
              {num(i.value)}{unit}
              {i.share !== null && <span className="text-gray-400 dark:text-gray-500"> · {i.share}%</span>}
            </span>
          </div>
        ))}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
        Βάση: <span className="notranslate">{num(tally.known)}</span> με καταγεγραμμένη τιμή
        {tally.unknown > 0 && (
          <span className="text-amber-700 dark:text-amber-300 font-medium">
            {' '}· <span className="notranslate">{num(tally.unknown)}</span> χωρίς — τα ποσοστά δεν τα περιλαμβάνουν
          </span>
        )}
      </p>
    </>
  )
}

export default function OcIndicators() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [d, setD] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (y: number) => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/oc/indicators?year=${y}`)
      const j = await res.json()
      if (!res.ok) throw new Error(j?.error || 'Αποτυχία')
      setD(j)
    } catch (err: any) {
      setError(err?.message || 'Αποτυχία φόρτωσης')
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { load(year) }, [load, year])

  if (loading) return <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-8 text-gray-400">Υπολογισμός…</div>
  if (error) return <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-8 text-red-600 dark:text-red-400">{error}</div>
  if (!d) return null

  const years = [year + 1, year, year - 1, year - 2].filter(y => y >= 2021 && y <= new Date().getFullYear())

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-charcoal dark:text-gray-100">Δείκτες</h2>
            <p className="text-base text-gray-600 dark:text-gray-300 mt-1">
              Πλαίσιο παρακολούθησης και αξιολόγησης έργου και αντικτύπου
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-gray-50 dark:bg-gray-700/50 p-1">
            {years.map(y => (
              <button key={y} type="button" onClick={() => setYear(y)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium notranslate ${y === year
                  ? 'bg-coral text-white' : 'text-charcoal dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                {y}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Α. ΟΙΚΟΝΟΜΙΚΗ ΑΥΤΟΝΟΜΙΑ */}
      <Section code="Α.1" title="Πηγές χρηματοδότησης"
        note="Έσοδα από αποδείξεις και από χρηματοδοτήσεις χωρίς απόδειξη, όπως καταχωρήθηκαν στο ΕΣΟΔΑ.">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          {[['Εγγραφές', d.finance.registrations], ['Συνδρομές', d.finance.subscriptions],
            ['Λοιπές εισπράξεις', d.finance.otherReceipts], ['Σύνολο εσόδων', d.finance.incomeTotal]].map(([l, v]) => (
            <div key={String(l)} className="rounded-2xl bg-gray-50 dark:bg-gray-700/50 px-5 py-4">
              <p className="text-2xl font-bold text-charcoal dark:text-gray-100 notranslate">{eur(Number(v))}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">{l}</p>
            </div>
          ))}
        </div>
        <Rows tally={{
          items: d.finance.bySector.map(s => ({
            label: SECTOR_LABELS[s.label] || s.label, value: s.value,
            share: d.finance.incomeTotal ? Math.round((s.value / d.finance.incomeTotal) * 1000) / 10 : null,
          })),
          known: d.finance.bySector.reduce((a, b) => a + b.value, 0), unknown: 0,
        }} unit=" €" />
        {d.finance.unclassified > 0 && (
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-2">
            ⚠ <span className="notranslate">{eur(d.finance.unclassified)}</span> χωρίς τομέα προέλευσης —
            συμπλήρωσέ τον στα Οικονομικά για να είναι σωστά τα ποσοστά.
          </p>
        )}
        <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700">
          <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Έξοδα — σύνολο <span className="notranslate">{eur(d.finance.expenseTotal)}</span>
          </p>
          <Rows tally={{
            items: d.finance.expenseByCategory.map(c => ({
              label: EXPENSE_LABELS[c.label] || c.label, value: c.value,
              share: d.finance.expenseTotal ? Math.round((c.value / d.finance.expenseTotal) * 1000) / 10 : null,
            })),
            known: d.finance.expenseByCategory.reduce((a, b) => a + b.value, 0), unknown: 0,
          }} unit=" €" />
        </div>
      </Section>

      {/* Β.1 ΔΙΚΤΥΟ */}
      <Section code="Β.1" title="Ανάπτυξη δικτύου">
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          {[['Μέλη', d.network.total], [`Νέα μέλη ${d.year}`, d.network.newThisYear],
            [`Πλήρωσαν ${d.year}`, d.network.paidThisYear]].map(([l, v]) => (
            <div key={String(l)} className="rounded-2xl bg-gray-50 dark:bg-gray-700/50 px-5 py-4">
              <p className="text-3xl font-bold text-charcoal dark:text-gray-100 notranslate">{num(Number(v))}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">{l}</p>
            </div>
          ))}
        </div>
        <div className="space-y-6">
          <div>
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Φύλο</p>
            <Rows tally={d.network.gender} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Περιφέρεια</p>
            <Rows tally={d.network.province} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Πεδίο δραστηριοποίησης</p>
            <Rows tally={d.network.fields} />
          </div>
        </div>
      </Section>

      {/* Β.3 ΣΥΜΜΕΤΟΧΗ */}
      <Section code="Β.3" title="Συμμετοχή σε δράσεις"
        note={`${d.participation.actionsTotal} δράσεις έγιναν το ${d.year} · τα ποσοστά είναι επί ${num(d.network.total)} μελών.`}>
        {d.participation.records.length === 0 ? (
          <p className="text-base text-gray-400 dark:text-gray-500">
            Δεν έχουν καταγραφεί παρουσίες. Η καταγραφή γίνεται στη Διαχείριση, κάτω από το ημερολόγιο.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-600">
                  <th className="py-2 pr-4 font-medium">Δράση</th>
                  <th className="py-2 pr-4 font-medium">Ημ/νία</th>
                  <th className="py-2 pr-4 font-medium text-right">Μέλη</th>
                  <th className="py-2 pr-4 font-medium text-right">Συμμετοχή</th>
                  <th className="py-2 pr-4 font-medium text-right">Μη μέλη</th>
                  <th className="py-2 font-medium">Φύλο</th>
                </tr>
              </thead>
              <tbody>
                {d.participation.records.map((r, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-2.5 pr-4 text-base text-charcoal dark:text-gray-100">{r.title}</td>
                    <td className="py-2.5 pr-4 text-gray-500 dark:text-gray-400 notranslate">
                      {new Date(r.date).toLocaleDateString('el-GR')}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-charcoal dark:text-gray-100 notranslate">{r.members}</td>
                    <td className="py-2.5 pr-4 text-right text-charcoal dark:text-gray-100 notranslate">
                      {r.share !== null ? `${r.share}%` : '—'}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-gray-500 dark:text-gray-400 notranslate">{r.nonMembers}</td>
                    <td className="py-2.5 text-sm text-gray-500 dark:text-gray-400">
                      {r.gender.length ? r.gender.map(g => `${g.label} ${g.value}`).join(' · ') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {d.participation.eventsWithoutAttendance.length > 0 && (
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
            ⚠ <strong>{d.participation.eventsWithoutAttendance.length}</strong> δράσεις χωρίς καταγραφή παρουσιών:{' '}
            {d.participation.eventsWithoutAttendance.slice(0, 4).map(e => e.title).join(' · ')}
            {d.participation.eventsWithoutAttendance.length > 4 && ' …'}
            <span className="block mt-1">Όσο λείπουν, τα ποσοστά συμμετοχής είναι ελλιπή.</span>
          </p>
        )}
      </Section>

      {/* Δ. ΕΠΙΚΟΙΝΩΝΙΑ */}
      <Section code="Δ" title="Επικοινωνία — ιστοσελίδα"
        note={d.communication.ga?.partial ? `Μερικό έτος: μέχρι σήμερα.` : undefined}>
        {!d.communication.ga ? (
          <p className="text-base text-gray-400">
            {d.communication.gaConfigured ? 'Δεν επιστράφηκαν στοιχεία.' : 'Δεν έχει ρυθμιστεί το Google Analytics.'}
          </p>
        ) : (
          <>
            <div className="grid sm:grid-cols-4 gap-4 mb-5">
              {[['Επισκέψεις', d.communication.ga.sessions], ['Χρήστες', d.communication.ga.users],
                ['Προβολές', d.communication.ga.pageViews], ['Open calls', d.communication.openCalls ?? 0]].map(([l, v]) => (
                <div key={String(l)} className="rounded-2xl bg-gray-50 dark:bg-gray-700/50 px-5 py-4">
                  <p className="text-2xl font-bold text-charcoal dark:text-gray-100 notranslate">{num(Number(v))}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{l}</p>
                </div>
              ))}
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Ανά ενότητα</p>
                <Rows tally={{ items: d.communication.ga.sections.slice(0, 7), known: d.communication.ga.pageViews, unknown: 0 }} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Χώρες</p>
                <Rows tally={{ items: d.communication.ga.countries.slice(0, 6), known: d.communication.ga.users, unknown: 0 }} />
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
              Τα newsletter και τα μέσα κοινωνικής δικτύωσης βρίσκονται στην ενότητα Επικοινωνία.
            </p>
          </>
        )}
      </Section>

      {/* Χειροκίνητα */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-8">
        <h3 className="text-xl font-bold text-charcoal dark:text-gray-100 mb-2">Δεν υπολογίζονται αυτόματα</h3>
        <p className="text-base text-gray-600 dark:text-gray-300 mb-4">
          Το OC δεν κρατά τα δεδομένα αυτών των δεικτών. Συμπληρώνονται στο ίδιο το πλαίσιο —
          δεν εμφανίζονται εδώ με μαντεμένες τιμές.
        </p>
        <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-1.5">
          {d.manual.map(m => (
            <li key={m} className="text-base text-gray-600 dark:text-gray-300 flex items-start gap-2">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 shrink-0" aria-hidden="true" />
              {m}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
