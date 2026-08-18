'use client'

import { useEffect, useState } from 'react'

/**
 * Ημερήσια διάταξη & πρακτικά — προεπισκόπηση του εγγράφου.
 *
 * Το έγγραφο ΠΑΡΑΜΕΝΕΙ η πηγή αλήθειας· εδώ φαίνονται μόνο τα θέματα, για
 * να ξέρεις τι συζητείται χωρίς να ανοίξεις 3.900 παραγράφους. Η δομή
 * διαβάζεται από τα χρώματα επισήμανσης — αν κάποιος σταματήσει να
 * επισημαίνει, τα θέματα σταματούν να εμφανίζονται· γι' αυτό το λέμε.
 */

interface Item { title: string; owner: string | null }
interface Meeting { label: string; number: number | null; minutes: number | null; when: string | null; items: Item[] }

const ERRORS: Record<string, string> = {
  unconfigured: 'Δεν έχει ρυθμιστεί η σύνδεση με το Google Docs.',
  forbidden: 'Το έγγραφο δεν έχει μοιραστεί με το service account.',
  unreachable: 'Το έγγραφο δεν απαντά.',
  auth: 'Αποτυχία ταυτοποίησης.',
}

export default function OcAgenda() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [docUrl, setDocUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(0)

  useEffect(() => {
    fetch('/api/oc/agenda')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return
        setMeetings(d.meetings || []); setDocUrl(d.docUrl || ''); setError(d.error || null)
      })
      .catch(() => setError('unreachable'))
      .finally(() => setLoading(false))
  }, [])

  const latest = meetings[0]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-4 mb-5">
        <h2 className="text-2xl font-bold text-charcoal dark:text-gray-100">Ημερήσια διάταξη &amp; πρακτικά</h2>
        {docUrl && (
          <a href={docUrl} target="_blank" rel="noopener noreferrer"
            className="px-5 py-2 rounded-full border border-gray-300 dark:border-gray-600 text-sm font-bold text-charcoal dark:text-gray-200 hover:border-coral">
            Άνοιγμα εγγράφου ↗
          </a>
        )}
      </div>

      {loading && <p className="text-base text-gray-400">Φόρτωση…</p>}

      {error && (
        <p className="text-base rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200 px-4 py-3">
          {ERRORS[error] || 'Δεν ήταν δυνατή η ανάγνωση του εγγράφου.'}
        </p>
      )}

      {!loading && !error && meetings.length === 0 && (
        <p className="text-base text-gray-400 dark:text-gray-500">Δεν βρέθηκαν συνεδριάσεις στο έγγραφο.</p>
      )}

      {latest && (
        <>
          {meetings.map((m, i) => (
            <div key={m.label + i} className={i > 0 ? 'mt-4 pt-4 border-t border-gray-100 dark:border-gray-700' : ''}>
              <button type="button" onClick={() => setExpanded(expanded === i ? null : i)}
                className="w-full flex flex-wrap items-baseline gap-3 text-left">
                <span className={`text-base font-bold ${i === 0 ? 'text-charcoal dark:text-gray-100' : 'text-gray-600 dark:text-gray-300'}`}>
                  {m.label}
                </span>
                <span className="text-sm text-gray-400 dark:text-gray-500 notranslate">
                  {m.items.length} {m.items.length === 1 ? 'θέμα' : 'θέματα'}
                </span>
                {i === 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-coral/15 text-coral text-xs font-bold">πιο πρόσφατο</span>
                )}
                <span className={`ml-auto text-coral transition-transform ${expanded === i ? 'rotate-180' : ''}`} aria-hidden="true">▾</span>
              </button>

              {expanded === i && (
                m.items.length === 0 ? (
                  <p className="text-sm text-gray-400 mt-2">Δεν έχουν καταγραφεί θέματα.</p>
                ) : (
                  <ul className="mt-3 space-y-1.5">
                    {m.items.map((it, k) => (
                      <li key={k} className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-coral shrink-0" aria-hidden="true" />
                        <span className="text-base text-charcoal dark:text-gray-100 leading-snug">
                          {it.title}
                          {it.owner && (
                            <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-sm text-gray-600 dark:text-gray-300">
                              {it.owner}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )
              )}
            </div>
          ))}

          <p className="text-sm text-gray-500 dark:text-gray-400 mt-5">
            Τα θέματα διαβάζονται από τις <strong>κυανές επισημάνσεις</strong> του εγγράφου και οι συνεδριάσεις
            από τις κίτρινες. Όσα δεν είναι επισημασμένα δεν εμφανίζονται εδώ.
          </p>
        </>
      )}
    </div>
  )
}
