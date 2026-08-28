'use client'

// Η μπάρα καρτελών των τεσσάρων σελίδων «Σχετικά» (brief 3a, 28/8/26) —
// γυαλί καρφωμένο στην κάτω ακμή του hero, ενεργή καρτέλα με κοραλί
// υπογράμμιση. Χρησιμοποιείται μόνο στα Cool σώματα των τεσσάρων σελίδων.
//
// ΚΑΙ: όταν το hero (άρα κι η μπάρα) βγει από το οπτικό πεδίο, οι τέσσερις
// επιλογές «γλιστρούν» κάτω από την πάνω αριστερή φούσκα του Cool και
// δένουν μαζί της σε ένα σώμα — ίδια χορογραφία με τις λωρίδες profile/OC
// (strip-slide, από πίσω προς τα κάτω), z-40 κάτω από το z-50 της φούσκας.

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { label: 'ΤΟ ΔΙΚΤΥΟ', href: '/about' },
  { label: 'ΟΜΑΔΑ ΣΥΝΤΟΝΙΣΜΟΥ', href: '/coordination-team' },
  { label: 'ΔΙΑΦΑΝΕΙΑ', href: '/transparency' },
  { label: 'ΕΠΙΚΟΙΝΩΝΙΑ', href: '/contact' },
]

export default function AboutTabs() {
  const pathname = usePathname()
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
      <nav ref={barRef} aria-label="Σελίδες Σχετικά" className="absolute bottom-0 inset-x-0"
        style={{ backgroundColor: 'rgba(10, 14, 24, .45)', backdropFilter: 'blur(16px) saturate(170%)', WebkitBackdropFilter: 'blur(16px) saturate(170%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.12)' }}>
        <ul role="list" className="flex overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(t => {
            const active = pathname === t.href
            return (
              <li key={t.href} className="flex-shrink-0">
                <Link
                  href={t.href}
                  aria-current={active ? 'page' : undefined}
                  className={`inline-flex items-center min-h-11 px-5 text-sm font-bold tracking-widest whitespace-nowrap border-b-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 ${
                    active ? 'text-white border-coral' : 'text-white/70 border-transparent hover:text-white'
                  }`}
                >
                  {t.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Στο scroll: οι τέσσερις επιλογές αναδύονται ΠΙΣΩ από την αριστερή
          φούσκα του Cool (top-3 left-4, ύψος ~3.75rem) και κολλούν από κάτω
          της — δύο οντότητες γίνονται μία. Desktop μόνο (στο κινητό το Cool
          σερβίρει Modern). */}
      <div
        className={`hidden lg:block fixed left-4 z-40 ${docked ? '' : 'pointer-events-none'}`}
        style={{ top: '3.4rem' }}
        aria-hidden={!docked}
      >
        <nav aria-label="Σελίδες Σχετικά (καρφιτσωμένες)"
          className={`menu-glass glass-rim strip-slide flex items-center gap-1 px-2 pt-2.5 pb-1.5 rounded-b-2xl ${docked ? 'strip-shown' : 'strip-hidden'}`}
          style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
          {TABS.map(t => {
            const active = pathname === t.href
            return (
              <Link
                key={t.href}
                href={t.href}
                tabIndex={docked ? 0 : -1}
                aria-current={active ? 'page' : undefined}
                className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wide whitespace-nowrap transition-colors duration-200 ${
                  active ? 'bg-coral text-white' : 'text-charcoal dark:text-gray-200 hover:bg-coral/15'
                }`}
              >
                {t.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </>
  )
}
