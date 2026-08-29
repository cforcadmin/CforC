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

export interface TabSection { key: string; label: string; href?: string }

// Γενικευμένο (29/8): το ίδιο σύστημα καρτελών + dock εξυπηρετεί και το
// ενιαίο ΠΟΛΙΤΙΚΗ — η λίστα ενοτήτων έρχεται ως prop. (30/8) Και τα
// preset strips των ΝΕΑ/ΕΡΓΑ/ΜΕΛΗ: το href έγινε προαιρετικό και το
// aria-label παραμετρικό.
export default function AboutTabs<T extends TabSection>({
  sections,
  active,
  onSelect,
  ariaLabel = 'Ενότητες Σχετικά',
}: {
  sections: ReadonlyArray<T>
  active: T['key']
  onSelect: (key: T['key']) => void
  ariaLabel?: string
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
      <nav ref={barRef} aria-label={ariaLabel} className="absolute bottom-0 inset-x-0"
        style={{ backgroundColor: 'rgba(10, 14, 24, .45)', backdropFilter: 'blur(16px) saturate(170%)', WebkitBackdropFilter: 'blur(16px) saturate(170%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.12)' }}>
        <ul role="list" className="flex overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {sections.map(t => {
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
        {/* ΙΔΙΑ εμφάνιση με την μπάρα του hero (σκούρο γυαλί, λευκά γράμματα,
            κοραλί υπογράμμιση) — ΟΧΙ ανοιχτό γυαλί με pills, που διαβαζόταν
            σαν να εμφανίστηκε το Modern header (αναφορά 28/8). Η μπάρα του
            hero απλώς «ελλιμενίζεται» κάτω από τη φούσκα. */}
        <nav aria-label={`${ariaLabel} (καρφιτσωμένες)`}
          className={`strip-slide flex items-center rounded-b-2xl overflow-hidden ${docked ? 'strip-shown' : 'strip-hidden'}`}
          style={{
            backgroundColor: 'rgba(10, 14, 24, .6)',
            backdropFilter: 'blur(16px) saturate(170%)', WebkitBackdropFilter: 'blur(16px) saturate(170%)',
            boxShadow: 'inset 0 -1px 0 rgba(255,255,255,.1), 0 10px 26px rgba(0,0,0,.35)',
          }}>
          {sections.map(t => {
            const on = active === t.key
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => onSelect(t.key)}
                tabIndex={docked ? 0 : -1}
                aria-current={on ? 'page' : undefined}
                className={`inline-flex items-center min-h-10 px-4 pt-1 text-xs font-bold tracking-widest whitespace-nowrap border-b-2 transition-colors duration-200 ${
                  on ? 'text-white border-coral' : 'text-white/70 border-transparent hover:text-white'
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
