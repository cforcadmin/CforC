'use client'

import { useEffect } from 'react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { GUIDE_SECTIONS, GUIDE_TITLE, GUIDE_SUBTITLE, GUIDE_FOOTER } from '@/lib/expenseGuide'

/**
 * Οδηγίες συμπλήρωσης — ίδιο κείμενο με το PDF (lib/expenseGuide), χωρίς
 * τις ενότητες που αφορούν το OC: εδώ στέκεται κάποιος με τα παραστατικά
 * στο χέρι και θέλει να τελειώνει, όχι να διαβάσει τη ροή του Financer.
 * Το κουμπί που το ανοίγει κάθεται πάνω δεξιά στη σελίδα του εξοδολογίου.
 */
export default function ExpenseGuideModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen)

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
      role="dialog" aria-modal="true" aria-labelledby="expense-guide-title">
      <div ref={modalRef}
        className="menu-glass rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto animate-flyIn">
        <div className="sticky top-0 z-10 menu-glass px-6 sm:px-8 pt-6 pb-4 flex items-start justify-between gap-4 border-b border-white/10">
          <div>
            <h2 id="expense-guide-title" className="text-2xl font-bold text-charcoal dark:text-gray-100">{GUIDE_TITLE}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{GUIDE_SUBTITLE}</p>
          </div>
          <button type="button" onClick={onClose}
            className="text-sm font-bold text-charcoal dark:text-gray-200 hover:text-coral whitespace-nowrap">
            Κλείσιμο
          </button>
        </div>

        <div className="px-6 sm:px-8 py-6 space-y-8">
          {GUIDE_SECTIONS.filter(s => !s.ocOnly).map(section => (
            <section key={section.heading}>
              <h3 className="text-xs font-bold tracking-widest text-coral dark:text-coral-light uppercase">
                {section.heading}
              </h3>
              {section.intro && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{section.intro}</p>
              )}
              <div className="mt-4 space-y-5">
                {section.steps.map(step => (
                  <div key={step.title}>
                    <h4 className="font-bold text-charcoal dark:text-gray-100">{step.title}</h4>
                    {step.body.map((line, i) => (
                      <p key={i} className="text-sm text-gray-700 dark:text-gray-300 mt-1.5 leading-relaxed">{line}</p>
                    ))}
                    {step.warning && (
                      <p className="mt-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/25 border border-amber-300 dark:border-amber-700 px-4 py-2.5 text-sm text-charcoal dark:text-gray-100">
                        <strong>Προσοχή:</strong> {step.warning}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}

          <div className="pt-4 border-t border-gray-200 dark:border-gray-600 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">{GUIDE_FOOTER}</p>
            <a href="/api/expenses/guide" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-coral text-coral dark:text-coral-light font-bold text-sm hover:bg-coral hover:text-white transition-colors whitespace-nowrap">
              Κατέβασε σε PDF ↓
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
