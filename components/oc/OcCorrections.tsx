'use client'

// Διορθώσεις / Προτάσεις — μόνο για τη θέση IT. Ένα κουτί ανά σελίδα του OC,
// καθένα με δικό του πίνακα εκκρεμοτήτων (ο ίδιος μηχανισμός με Διαχείριση →
// Εκκρεμότητες). Οι πίνακες ζουν στο Strapi ως oc-task-board με slug
// «it-corrections-<σελίδα>» και δεν εμφανίζονται πουθενά αλλού.

import { useCallback, useEffect, useState } from 'react'
import OcTasks from '@/components/oc/OcTasks'

export const IT_BOARD_PREFIX = 'it-corrections-'

/** Οι σελίδες του OC — ίδια σειρά και χρώματα με τα chips του OcShell */
export const OC_PAGES = [
  { key: 'overview', letter: 'Ε', title: 'Επισκόπηση', hue: '#FF8B6A', blurb: 'Η πρώτη οθόνη: ταμείο, αιτήσεις, εκκρεμότητες, ανανεώσεις' },
  { key: 'members', letter: 'Μ', title: 'Μέλη', hue: '#2A9D8F', blurb: 'Μητρώο μελών, συνδρομές, υπενθυμίσεις, προφίλ' },
  { key: 'finances', letter: 'Ο', title: 'Οικονομικά', hue: '#6A994E', blurb: 'Επικόλληση τράπεζας, αποδείξεις, έξοδα, μηνιαία εικόνα, αποστολή λογιστηρίου' },
  { key: 'admin', letter: 'Δ', title: 'Διαχείριση', hue: '#8E7CC3', blurb: 'Ημερήσια διάταξη, εκκρεμότητες, ημερολόγιο, παρουσίες' },
  { key: 'projects', letter: 'Ε', title: 'Έργα', hue: '#4A90D9', blurb: 'Έργα και ομάδες έργου' },
  { key: 'comms', letter: 'Ε', title: 'Επικοινωνία', hue: '#D96AA7', blurb: 'Newsletter, ανακοινώσεις, κανάλια' },
  { key: 'reports', letter: 'Α', title: 'Αναφορές', hue: '#E9A13B', blurb: 'Δείκτες και αναφορές' },
  { key: 'settings', letter: 'Ρ', title: 'Ρυθμίσεις', hue: '#8A8FA3', blurb: 'Προτιμήσεις, θέσεις, εμφάνιση' },
] as const

export default function OcCorrections() {
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [counts, setCounts] = useState<Record<string, { open: number; all: number }>>({})

  // Μετρητές για όλα τα κουτιά με ένα αίτημα (τα ίδια τα κουτιά φορτώνουν μόνο όταν ανοίξουν)
  const loadCounts = useCallback(async () => {
    try {
      const res = await fetch(`/api/oc/tasks?prefix=${IT_BOARD_PREFIX}`)
      if (!res.ok) return
      const d = await res.json()
      const bySlug = new Map<string, string>((d.boards || []).map((b: any) => [b.documentId, b.slug]))
      const next: Record<string, { open: number; all: number }> = {}
      for (const t of d.tasks || []) {
        const slug = bySlug.get(t.boardId); if (!slug) continue
        const key = slug.slice(IT_BOARD_PREFIX.length)
        next[key] = next[key] || { open: 0, all: 0 }
        next[key].all += 1
        if (!t.completed) next[key].open += 1
      }
      setCounts(next)
    } catch { /* μη κρίσιμο */ }
  }, [])
  useEffect(() => { loadCounts() }, [loadCounts])

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-2xl font-bold text-charcoal dark:text-gray-100">Διορθώσεις / Προτάσεις</h2>
          <span className="px-3 py-1 rounded-full bg-coral/15 text-coral text-xs font-bold tracking-wide">ΜΟΝΟ IT</span>
        </div>
        <p className="text-base text-gray-600 dark:text-gray-300 mt-2 max-w-3xl">
          Ένα κουτί για κάθε σελίδα του OC. Ό,τι πρέπει να διορθωθεί ή προτείνεται να αλλάξει σε μια σελίδα
          καταγράφεται στον δικό της πίνακα — με ανάδοχο, προτεραιότητα, προθεσμία και κατάσταση, όπως οι
          Εκκρεμότητες της Διαχείρισης. Οι πίνακες αυτοί δεν εμφανίζονται σε καμία άλλη θέση.
        </p>
      </div>

      {OC_PAGES.map(p => {
        const isOpen = !!open[p.key]
        const c = counts[p.key]
        return (
          <section key={p.key} className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm overflow-hidden"
            style={{ borderLeft: `6px solid ${p.hue}` }}>
            <button type="button" onClick={() => setOpen(o => ({ ...o, [p.key]: !isOpen }))}
              aria-expanded={isOpen} aria-controls={`itc-${p.key}`}
              className="w-full flex items-center gap-4 text-left px-8 py-5">
              <span className="w-9 h-9 rounded-lg text-white font-bold flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: p.hue }} aria-hidden="true">{p.letter}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-bold text-charcoal dark:text-gray-100">{p.title}</span>
                <span className="block text-sm text-gray-500 dark:text-gray-400 truncate">{p.blurb}</span>
              </span>
              {c && (
                <span className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                  c.open > 0 ? 'bg-coral/15 text-coral' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'
                }`}>
                  {c.open > 0 ? `${c.open} ανοιχτές` : c.all > 0 ? 'όλα έγιναν' : 'κενό'}
                </span>
              )}
              <span className={`text-coral transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true">▼</span>
            </button>
            {isOpen && (
              <div id={`itc-${p.key}`} className="px-8 pb-8">
                <OcTasks embedded
                  lockedBoard={{
                    slug: `${IT_BOARD_PREFIX}${p.key}`,
                    title: `Διορθώσεις/Προτάσεις — ${p.title}`,
                    description: `Διορθώσεις και προτάσεις για τη σελίδα «${p.title}» του OC (μόνο IT)`,
                  }}
                  onLoaded={tasks => setCounts(prev => ({
                    ...prev,
                    [p.key]: { all: tasks.length, open: tasks.filter((t: any) => !t.completed).length },
                  }))}
                />
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
