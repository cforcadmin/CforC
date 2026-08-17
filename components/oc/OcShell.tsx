'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import { AccessibilityButton } from '@/components/AccessibilityMenu'
import { OC_SEAT_LABELS, OC_SEAT_SHORT } from '@/components/oc/ocPrefs'
import OcSeatChoiceModal from '@/components/oc/OcSeatChoiceModal'
import OcOverview from '@/components/oc/OcOverview'
import OcFinances from '@/components/oc/OcFinances'
import OcMonthlyView from '@/components/oc/OcMonthlyView'
import OcComms from '@/components/oc/OcComms'
import type { OcOverviewData } from '@/lib/ocOverview'

// OC categories. Chip style: first letter in a filled block, remainder in a
// tinted panel — Inside Spaceman pattern, CforC identity (one hue per section).
const SECTIONS = [
  { key: 'overview', letter: 'Ε', rest: 'ΠΙΣΚΟΠΗΣΗ', hue: '#FF8B6A', title: 'Επισκόπηση' },
  { key: 'members', letter: 'Μ', rest: 'ΕΛΗ', hue: '#2A9D8F', title: 'Μέλη' },
  { key: 'finances', letter: 'Ο', rest: 'ΙΚΟΝΟΜΙΚΑ', hue: '#6A994E', title: 'Οικονομικά' },
  { key: 'admin', letter: 'Δ', rest: 'ΙΑΧΕΙΡΙΣΗ', hue: '#8E7CC3', title: 'Διαχείριση' },
  { key: 'projects', letter: 'Ε', rest: 'ΡΓΑ', hue: '#4A90D9', title: 'Έργα' },
  { key: 'comms', letter: 'Ε', rest: 'ΠΙΚΟΙΝΩΝΙΑ', hue: '#D96AA7', title: 'Επικοινωνία' },
  { key: 'reports', letter: 'Α', rest: 'ΝΑΦΟΡΕΣ', hue: '#E9A13B', title: 'Αναφορές' },
  { key: 'settings', letter: 'Ρ', rest: 'ΥΘΜΙΣΕΙΣ', hue: '#8A8FA3', title: 'Ρυθμίσεις' },
] as const

type SectionKey = (typeof SECTIONS)[number]['key']

/** Αρχική ενότητα ανά ρόλο — ο καθένας ανοίγει στο δικό του τραπέζι */
const SEAT_LANDING: Record<string, SectionKey> = {
  financer: 'finances',
  comms: 'comms',
  admin: 'admin',
  it: 'admin',
}

export interface OcApplicationSummary {
  id: string
  name: string
  state: string
  submittedAt: string | null
}

interface OcShellProps {
  seats: string[]
  /** Last-used seat from the server-stored cookie (null = none stored) */
  initialSeat: string | null
  /** 'oc' | 'members' | 'ask' from the server-stored cookie */
  initialLandingPref: string
  /** Membership applications (server-fetched) */
  applications?: OcApplicationSummary[]
  /** Επισκόπηση data (server-fetched, board-gated) */
  overview?: OcOverviewData | null
  /** Μητρώο μελών table prefs (από τα httpOnly cookies) */
  tableCols?: string[]
  tableDensity?: 'comfortable' | 'compact'
  /** Φόρμες αποχώρησης (server-fetched) */
  exitSurveys?: any[]
  /** /oc?open=renewals — deep link από το finance@ notice: Επισκόπηση με
   *  ανοιχτό το popup «Δήλωσαν πληρωμή συνδρομής» */
  initialOpenRenewals?: boolean
}

const APP_STATE_LABELS: Record<string, { label: string; cls: string }> = {
  submitted: { label: 'Εκκρεμεί ψήφιση', cls: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200' },
  approved: { label: 'Εγκρίθηκε', cls: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' },
  rejected: { label: 'Απορρίφθηκε', cls: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' },
  completed: { label: 'Ολοκληρώθηκε', cls: 'bg-coral/20 text-charcoal dark:bg-coral/30 dark:text-gray-100' },
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso))
  } catch {
    return '—'
  }
}

// Preferences persist via /api/oc/prefs (httpOnly cookies) — client web
// storage is unreliable under content blockers, so it is not used at all.
async function persistPrefs(prefs: { landing?: string; seat?: string }) {
  try {
    await fetch('/api/oc/prefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs),
      keepalive: true,
    })
  } catch {
    // Non-fatal: worst case the preference is asked again next time
  }
}

export default function OcShell({ seats, initialSeat, initialLandingPref, applications = [], overview = null, tableCols, tableDensity, exitSurveys = [], initialOpenRenewals = false }: OcShellProps) {
  const pending = applications.filter(a => a.state === 'submitted')
  // Κάθε ρόλος προσγειώνεται εκεί που δουλεύει — όχι σε γενική επισκόπηση
  const [activeSection, setActiveSection] = useState<SectionKey>(
    initialOpenRenewals ? 'overview' : SEAT_LANDING[initialSeat || ''] || 'overview'
  )
  const [landingPref, setLandingPref] = useState<string>(initialLandingPref)
  // TEMPORARY: which seat a multi-seat member is acting as right now
  const [activeSeat, setActiveSeat] = useState<string | null>(
    initialSeat ?? (seats.length === 1 ? seats[0] : null)
  )
  // Direct entry without a stored seat and several seats held — ask in place
  const [showSeatModal, setShowSeatModal] = useState(!initialSeat && seats.length > 1)
  // Same threshold as Navigation: the OC hero minimizes in sync with the
  // header pill, and its accessibility button yields to the header's own
  const [isScrolled, setIsScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 150)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    // Single-seat members: make sure the cookie reflects their one seat
    if (!initialSeat && seats.length === 1) persistPrefs({ seat: seats[0] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function applySeat(seat: string) {
    setActiveSeat(seat)
    persistPrefs({ seat })
    // Each seat lands on its most relevant section
    if (seat === 'financer') setActiveSection('finances')
  }

  function updateLandingPref(value: string) {
    setLandingPref(value)
    persistPrefs({ landing: value })
  }

  const current = SECTIONS.find(s => s.key === activeSection)!

  return (
    <div className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900">
      <Navigation />
      <main id="main-content">
        {/* Minimized OC hero — sticky so the category chips never scroll away.
            pt clears the fixed site navbar, which overlays the padding area. */}
        <section className="sticky top-0 z-40">
          <div className={`bg-coral dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 rounded-b-3xl relative transition-all duration-300 ${
            isScrolled ? 'pt-24 pb-3' : 'pt-28 pb-6'
          }`}>
            <div className="w-full px-6 lg:px-12">
              <div className="flex flex-wrap items-center gap-4">
                {/* Title + member-area switch */}
                <div className="flex items-center gap-4 min-w-0">
                  <h1 className="text-[clamp(1.1rem,2.5vw,2rem)] font-bold leading-none whitespace-nowrap dark:text-coral notranslate">
                    <span className="sr-only">Operational Center</span>
                    <span aria-hidden="true">OC</span>
                  </h1>
                  {activeSeat && (
                    <button
                      type="button"
                      onClick={() => {
                        // Multi-seat: clicking the bubble switches straight to the next seat
                        if (seats.length > 1) {
                          const i = seats.indexOf(activeSeat)
                          applySeat(seats[(i + 1) % seats.length])
                        }
                      }}
                      title={
                        seats.length > 1
                          ? `${OC_SEAT_LABELS[activeSeat] || activeSeat} — πάτησε για εναλλαγή ρόλου`
                          : OC_SEAT_LABELS[activeSeat] || activeSeat
                      }
                      aria-label={
                        seats.length > 1
                          ? `Ενεργός ρόλος: ${OC_SEAT_LABELS[activeSeat] || activeSeat}. Πάτησε για εναλλαγή ρόλου.`
                          : `Ενεργός ρόλος: ${OC_SEAT_LABELS[activeSeat] || activeSeat}`
                      }
                      className={`notranslate bg-white/20 text-white dark:text-gray-200 border border-white/50 dark:border-gray-500 min-w-9 px-2.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap text-center ${
                        seats.length > 1 ? 'hover:bg-white/30 cursor-pointer' : 'cursor-default'
                      }`}
                    >
                      {OC_SEAT_SHORT[activeSeat] || activeSeat}
                    </button>
                  )}
                  <Link
                    href="/profile"
                    className="bg-charcoal/60 dark:bg-white/10 text-white dark:text-gray-300 hover:bg-charcoal/80 dark:hover:bg-white/20 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap"
                  >
                    Ο Χώρος μου
                  </Link>
                </div>

                {/* Category chips */}
                <nav aria-label="Ενότητες OC" className="flex-1 flex flex-wrap gap-2.5 items-center justify-center pr-4 lg:pr-10">
                  {SECTIONS.map(section => {
                    const active = section.key === activeSection
                    return (
                      <button
                        key={section.key}
                        type="button"
                        onClick={() => setActiveSection(section.key)}
                        aria-current={active ? 'page' : undefined}
                        className={`inline-flex items-stretch rounded-lg overflow-hidden text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                          active ? 'shadow-md scale-105' : 'opacity-85 hover:opacity-100'
                        }`}
                      >
                        <span
                          className="px-2 py-1.5 text-white flex items-center flex-shrink-0"
                          style={{ backgroundColor: section.hue }}
                          aria-hidden="true"
                        >
                          {section.letter}
                        </span>
                        <span
                          className={`flex-1 pl-1.5 pr-2.5 py-1.5 text-left ${active ? 'text-charcoal dark:text-white' : 'text-charcoal/80 dark:text-gray-200'}`}
                          style={{
                            backgroundColor: active ? `${section.hue}55` : `${section.hue}26`,
                          }}
                        >
                          {section.rest}
                        </span>
                        <span className="sr-only">{section.title}</span>
                      </button>
                    )
                  })}
                </nav>

                {/* Accessibility Menu Trigger — in-flow so it aligns with the row.
                    Hidden while scrolled: the header pill shows its own. */}
                <div className={`flex-shrink-0 transition-all duration-300 ${
                  isScrolled ? 'opacity-0 scale-0 w-0 overflow-hidden' : 'opacity-100 scale-100'
                }`}>
                  <AccessibilityButton />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {activeSection === 'overview' && (
            overview ? (
              <OcOverview
                data={overview}
                applications={applications}
                canDeleteMembers={activeSeat === 'it' || activeSeat === 'admin'}
                canRecordPayments={activeSeat === 'financer'}
                canRemind={activeSeat === 'financer' || activeSeat === 'community'}
                initialShowRenewals={initialOpenRenewals}
                tableCols={tableCols}
                tableDensity={tableDensity}
              />
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-8">
                <h2 className="text-2xl font-bold text-charcoal dark:text-gray-100 mb-2">Επισκόπηση</h2>
                <p className="text-gray-500 dark:text-gray-400">
                  Δεν ήταν δυνατή η φόρτωση των δεδομένων επισκόπησης. Δοκίμασε ανανέωση.
                </p>
              </div>
            )
          )}

          {activeSection === 'members' && (
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-8">
              <h2 className="text-2xl font-bold text-charcoal dark:text-gray-100 mb-6">Νέα μέλη</h2>
              {applications.length === 0 ? (
                <p className="text-gray-400 dark:text-gray-500">Καμία αίτηση ακόμη.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-600">
                        <th className="py-2 pr-4 font-medium">Ονοματεπώνυμο</th>
                        <th className="py-2 pr-4 font-medium">Ημ. υποβολής</th>
                        <th className="py-2 pr-4 font-medium">Κατάσταση</th>
                        <th className="py-2 font-medium sr-only">Ενέργειες</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applications.map(app => {
                        const st = APP_STATE_LABELS[app.state] || APP_STATE_LABELS.submitted
                        return (
                          <tr key={app.id} className="border-b border-gray-100 dark:border-gray-700">
                            <td className="py-3 pr-4 text-charcoal dark:text-gray-200 font-medium">{app.name || '—'}</td>
                            <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{formatDate(app.submittedAt)}</td>
                            <td className="py-3 pr-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${st.cls}`}>{st.label}</span>
                            </td>
                            <td className="py-3">
                              <Link href={`/oc/applications/${app.id}`} className="text-coral dark:text-coral-light hover:underline whitespace-nowrap">
                                Άνοιγμα →
                              </Link>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-5">
                Τα «Τακτικά μέλη» (μητρώο με πληρωμές ανά έτος) έρχονται με τη φάση των Οικονομικών.
              </p>

              {/* Φόρμες αποχώρησης */}
              <div className="border-t border-gray-200 dark:border-gray-700 mt-8 pt-6">
                <h3 className="font-bold text-charcoal dark:text-gray-100 mb-4">
                  Φόρμες αποχώρησης
                  <span className="ml-2 text-sm font-normal text-gray-400 dark:text-gray-500">({exitSurveys.length})</span>
                </h3>
                {exitSurveys.length === 0 ? (
                  <p className="text-gray-400 dark:text-gray-500 text-sm">Καμία φόρμα αποχώρησης ακόμη.</p>
                ) : (
                  <div className="space-y-2">
                    {exitSurveys.map((sv: any) => (
                      <details key={sv.documentId} className="rounded-2xl border border-gray-200 dark:border-gray-600 group">
                        <summary className="flex flex-wrap items-center gap-3 p-4 cursor-pointer list-none">
                          <span className="font-medium text-sm text-charcoal dark:text-gray-200">
                            {sv.Anonymous ? 'Ανώνυμο μέλος' : (sv.MemberName || '—')}
                          </span>
                          {sv.Satisfaction != null && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-coral/15 text-coral dark:text-coral-light font-bold">
                              Ικανοποίηση {sv.Satisfaction}/5
                            </span>
                          )}
                          {sv.AllowFollowUp && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200">δέχεται follow-up</span>
                          )}
                          <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto notranslate">{formatDate(sv.SubmittedAt)}</span>
                          <span className="text-coral dark:text-coral-light text-xs select-none group-open:rotate-180 transition-transform" aria-hidden="true">▼</span>
                        </summary>
                        <div className="px-4 pb-4 text-sm text-gray-700 dark:text-gray-300 space-y-2">
                          {Array.isArray(sv.Reasons) && sv.Reasons.length > 0 && (
                            <p><span className="text-gray-400">Λόγοι:</span> {sv.Reasons.join(' · ')}{sv.ReasonOther ? ` · ${sv.ReasonOther}` : ''}</p>
                          )}
                          {Array.isArray(sv.MostUseful) && sv.MostUseful.length > 0 && (
                            <p><span className="text-gray-400">Πιο χρήσιμα:</span> {sv.MostUseful.join(' · ')}</p>
                          )}
                          {Array.isArray(sv.Barriers) && sv.Barriers.length > 0 && (
                            <p><span className="text-gray-400">Εμπόδια:</span> {sv.Barriers.join(' · ')}</p>
                          )}
                          {sv.WouldChange && <p><span className="text-gray-400">Τι θα άλλαζε:</span> {sv.WouldChange}</p>}
                          {Array.isArray(sv.WouldReturn) && sv.WouldReturn.length > 0 && (
                            <p><span className="text-gray-400">Θα επέστρεφε αν:</span> {sv.WouldReturn.join(' · ')}</p>
                          )}
                          {sv.KeepNewsletter != null && (
                            <p><span className="text-gray-400">Newsletter:</span> {sv.KeepNewsletter ? 'παραμένει' : 'όχι'}</p>
                          )}
                          {sv.FinalComment && <p><span className="text-gray-400">Σχόλιο:</span> {sv.FinalComment}</p>}
                        </div>
                      </details>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'settings' && (
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-8">
              <h2 className="text-2xl font-bold text-charcoal dark:text-gray-100 mb-6">
                Ρυθμίσεις
              </h2>
              <div className="max-w-xl">
                <h3 className="font-bold text-charcoal dark:text-gray-100 mb-1">
                  Προεπιλογή κατά τη σύνδεση
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Πού να μεταφέρεσαι αυτόματα μετά τη σύνδεσή σου.
                </p>
                <div className="space-y-2" role="radiogroup" aria-label="Προεπιλογή κατά τη σύνδεση">
                  {[
                    { value: 'ask', label: 'Να ερωτώμαι κάθε φορά' },
                    { value: 'members', label: 'Περιοχή μελών' },
                    { value: 'oc', label: 'Operational Center' },
                  ].map(opt => (
                    <label
                      key={opt.value}
                      className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-coral dark:hover:border-coral-light cursor-pointer transition-colors"
                    >
                      <input
                        type="radio"
                        name="oc-landing"
                        value={opt.value}
                        checked={landingPref === opt.value}
                        onChange={() => updateLandingPref(opt.value)}
                        className="accent-[#FF8B6A]"
                      />
                      <span className="text-charcoal dark:text-gray-200">{opt.label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
                  Η προτίμηση αποθηκεύεται σε αυτή τη συσκευή.
                </p>
              </div>
            </div>
          )}

          {activeSection === 'finances' && (
            <OcFinances
              canIssue={activeSeat === 'financer'}
              canRemind={activeSeat === 'financer' || activeSeat === 'community'}
              members={(overview?.members || []).map(m => ({
                docId: m.docId, name: m.name, am: m.am, email: m.email,
              }))}
              subMembers={(overview?.members || []).map(m => ({
                docId: m.docId, name: m.name, am: m.am, payments: m.payments, status: m.status,
                renewalClaimedAt: m.renewalClaimedAt, reminderSentAt: m.reminderSentAt,
              }))}
            />
          )}

          {activeSection === 'admin' && (
            <div className="space-y-8">
              {/* Μηνιαία εικόνα σε λειτουργία Διαχείρισης: αποστολή στο
                  λογιστήριο όταν ο/η Financer έχει εγκρίνει τον μήνα */}
              <OcMonthlyView mode="admin" canDispatch={activeSeat === 'admin' || activeSeat === 'it'} />
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-8 text-center">
                <p className="text-gray-500 dark:text-gray-400">Οι υπόλοιπες λειτουργίες Διαχείρισης — σύντομα διαθέσιμες.</p>
              </div>
            </div>
          )}

          {activeSection === 'comms' && <OcComms />}

          {activeSection !== 'overview' && activeSection !== 'settings' && activeSection !== 'members' && activeSection !== 'finances' && activeSection !== 'admin' && activeSection !== 'comms' && (
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-12 text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ backgroundColor: `${current.hue}26` }}
              >
                <span className="text-2xl font-bold" style={{ color: current.hue }}>
                  {current.letter}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-charcoal dark:text-gray-100 mb-2">
                {current.title}
              </h2>
              <p className="text-gray-500 dark:text-gray-400">Σύντομα διαθέσιμο</p>
            </div>
          )}
        </div>
      </main>

      {/* TEMPORARY: in-shell seat chooser (direct URL entry or seat switch) */}
      {showSeatModal && (
        <OcSeatChoiceModal
          seats={seats}
          onChoose={(seat) => {
            applySeat(seat)
            setShowSeatModal(false)
          }}
          onDismiss={() => {
            // Dismissing without a prior seat defaults to the first held seat
            if (!activeSeat && seats.length > 0) applySeat(seats[0])
            setShowSeatModal(false)
          }}
        />
      )}
    </div>
  )
}
