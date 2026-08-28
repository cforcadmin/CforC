'use client'

// Οι τέσσερις καρτέλες του «Σχετικά» στο Cool — ΔΕΝ είναι σύνδεσμοι: είναι
// διακόπτες υποενοτήτων ΜΙΑΣ σελίδας (αλλάζουν hero + περιεχόμενο επί
// τόπου, το URL ενημερώνεται με pushState). Στην κάτω ακμή του hero, και
// στο scroll αναδύονται πίσω από την πάνω αριστερή φούσκα του Cool και
// δένουν μαζί της (strip-slide, z-40 κάτω από το z-50 της).

import { useEffect, useRef, useState } from 'react'

export const ABOUT_SECTIONS = [
  { key: 'diktyo', label: 'ΤΟ ΔΙΚΤΥΟ', href: '/about' },
  { key: 'team', label: 'ΟΜΑΔΑ ΣΥΝΤΟΝΙΣΜΟΥ', href: '/coordination-team' },
  { key: 'transparency', label: 'ΔΙΑΦΑΝΕΙΑ', href: '/transparency' },
  { key: 'contact', label: 'ΕΠΙΚΟΙΝΩΝΙΑ', href: '/contact' },
] as const

export type AboutSectionKey = (typeof ABOUT_SECTIONS)[number]['key']

export default function AboutTabs({
  active,
  onSelect,
}: {
  active: AboutSectionKey
  onSelect: (key: AboutSectionKey) => void
}) {
  const barRef = useRef<HTMLElement>(null)
  const [docked, setDocked] = useState(false)

  useEffect(() => {
    const el = barRef.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => setDocked(!e.isIntersecting), { threshold: 0 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <>
      {/* Η μπάρα μέσα στο hero — υγρό γυαλί πάνω στο φόντο του */}
      <nav ref={barRef} aria-label="Ενότητες Σχετικά" className="absolute bottom-0 inset-x-0"
        style={{ backgroundColor: 'rgba(10, 14, 24, .45)', backdropFilter: 'blur(16px) saturate(170%)', WebkitBackdropFilter: 'blur(16px) saturate(170%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.12)' }}>
        <ul role="list" className="flex overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {ABOUT_SECTIONS.map(t => {
            const on = active === t.key
            return (
              <li key={t.key} className="flex-shrink-0">
                <button
                  type="button"
                  onClick={() => onSelect(t.key)}
                  aria-current={on ? 'page' : undefined}
                  className={`inline-flex items-center min-h-11 px-5 text-sm font-bold tracking-widest whitespace-nowrap border-b-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 ${
                    on ? 'text-white border-coral' : 'text-white/70 border-transparent hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Στο scroll: οι τέσσερις επιλογές αναδύονται ΠΙΣΩ από την αριστερή
          φούσκα του Cool και κολλούν από κάτω της — δύο οντότητες, ένα σώμα.
          Desktop μόνο (στο κινητό το Cool σερβίρει Modern). */}
      <div
        className={`hidden lg:block fixed left-4 z-40 ${docked ? '' : 'pointer-events-none'}`}
        style={{ top: '3.4rem' }}
        aria-hidden={!docked}
      >
        <nav aria-label="Ενότητες Σχετικά (καρφιτσωμένες)"
          className={`menu-glass glass-rim strip-slide flex items-center gap-1 px-2 pt-2.5 pb-1.5 rounded-b-2xl ${docked ? 'strip-shown' : 'strip-hidden'}`}
          style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
          {ABOUT_SECTIONS.map(t => {
            const on = active === t.key
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => onSelect(t.key)}
                tabIndex={docked ? 0 : -1}
                aria-current={on ? 'page' : undefined}
                className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wide whitespace-nowrap transition-colors duration-200 ${
                  on ? 'bg-coral text-white' : 'text-charcoal dark:text-gray-200 hover:bg-coral/15'
                }`}
              >
                {t.label}
              </button>
            )
          })}
        </nav>
      </div>
    </>
  )
}
