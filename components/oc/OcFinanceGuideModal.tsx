'use client'

// Οδηγίες μηνιαίου οικονομικού κύκλου — το ίδιο περιεχόμενο με το email
// υπενθύμισης (lib/financeMonthlyGuide), σε γυάλινο pop-up μέσα στο OC.

import { useEffect, useState } from 'react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { FINANCE_MONTHLY_STEPS, renderGuideHtml, adminPhrase } from '@/lib/financeMonthlyGuide'

interface OcFinanceGuideModalProps {
  isOpen: boolean
  onClose: () => void
  /** Όνομα του/της Admin αν είναι γνωστό — για τη φράση του βήματος 3 */
  adminName?: string | null
}

/** Το (i): hover, focus ΚΑΙ κλικ (για αφή). Το ίδιο το σημείωμα
 *  αποδίδεται από την κάρτα-βήμα ΜΕΣΑ στη ροή της (πλήρες πλάτος, σταθερό
 *  ύψος με κύλιση) — όχι ως αιωρούμενο tooltip που το έκοβαν τα όρια του
 *  pop-up (30/8). */
function TipInfo({ id, show, setShow }: { id: string; show: boolean; setShow: (v: boolean) => void }) {
  return (
    <button type="button"
      onClick={() => setShow(!show)}
      onMouseEnter={() => setShow(true)}
      onFocus={() => setShow(true)}
      aria-label="Προσωπική σημείωση" aria-expanded={show} aria-controls={id}
      className={`w-5 h-5 rounded-full border border-coral text-[11px] font-bold leading-none flex items-center justify-center transition-colors ${
        show ? 'bg-coral text-white' : 'text-coral hover:bg-coral hover:text-white'
      }`}>
      i
    </button>
  )
}

export default function OcFinanceGuideModal({ isOpen, onClose, adminName }: OcFinanceGuideModalProps) {
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen)
  const [openTip, setOpenTip] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="finance-guide-title">
      <div className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div ref={modalRef} className="relative menu-glass glass-rim rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header — γυάλινο κι αυτό, κολλά στην κορυφή στο scroll */}
        <div className="sticky top-0 z-10 menu-glass-dense p-6 border-b border-black/10 dark:border-white/10 rounded-t-3xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-coral/15 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl" aria-hidden="true">🏦</span>
              </div>
              <div>
                <h2 id="finance-guide-title" className="text-xl font-bold text-charcoal dark:text-gray-100">
                  Οδηγίες μηνιαίου οικονομικού κύκλου
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Τα ίδια βήματα που έρχονται με την υπενθύμιση στο τέλος κάθε μήνα
                </p>
              </div>
            </div>
            <button type="button" onClick={onClose}
              className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex-shrink-0"
              aria-label="Κλείσιμο">
              <svg className="w-6 h-6 text-charcoal dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Βήματα — ίδια κάρτα-βήμα με το email, σε γυαλί */}
        <div className="p-6 space-y-4">
          {FINANCE_MONTHLY_STEPS.map(st => (
            <div key={st.n} className="relative menu-glass rounded-2xl p-5 flex gap-4">
              <span className="text-2xl font-bold text-coral leading-none pt-0.5 w-8 flex-shrink-0" aria-hidden="true">{st.n}</span>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-charcoal dark:text-gray-100 mb-1 flex items-center gap-2">
                  {st.title}
                  {st.tip && (
                    <TipInfo id={`guide-tip-${st.n}`} show={openTip === st.n} setShow={v => setOpenTip(v ? st.n : null)} />
                  )}
                </h3>
                {st.tip && openTip === st.n && (
                  <div id={`guide-tip-${st.n}`} role="note"
                    className="relative menu-glass-dense glass-rim rounded-2xl text-sm leading-relaxed text-charcoal dark:text-gray-100 mb-3 [&_a]:text-coral [&_a]:underline"
                    style={{ height: '14rem', overflowY: 'auto', padding: '1rem 1.25rem' }}>
                    <button type="button" onClick={() => setOpenTip(null)} aria-label="Κλείσιμο σημείωσης"
                      className="absolute top-2 right-2 w-6 h-6 rounded-full text-gray-500 hover:bg-black/10 dark:hover:bg-white/10 text-sm leading-none">×</button>
                    <div dangerouslySetInnerHTML={{ __html: `<strong>💡 Προσωπική σημείωση:</strong> ${st.tip}` }} />
                  </div>
                )}
                <div
                  className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 [&_img]:block [&_img]:w-full [&_img]:rounded-xl [&_img]:border [&_img]:border-black/10 dark:[&_img]:border-white/10 [&_img]:my-3 [&_.guide-code]:my-1.5 [&_code]:font-mono [&_code]:text-xs [&_code]:bg-white/60 dark:[&_code]:bg-black/30 [&_code]:border [&_code]:border-black/10 dark:[&_code]:border-white/15 [&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:whitespace-nowrap"
                  dangerouslySetInnerHTML={{
                    __html: renderGuideHtml(st.html, {
                      imageUrl: file => `/email/${file}`,
                      adminPhrase: adminPhrase(adminName),
                    }),
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 pb-6 flex justify-end">
          <button type="button" onClick={onClose}
            className="px-6 py-2.5 rounded-full bg-coral text-white text-sm font-bold hover:bg-coral/90 transition-colors">
            Εντάξει
          </button>
        </div>
      </div>
    </div>
  )
}
