'use client'

// Η μπάρα καρτελών των τεσσάρων σελίδων «Σχετικά» (brief 3a, 28/8/26).
// Καρφωμένη στην κάτω ακμή του hero· ενεργή καρτέλα με κοραλί υπογράμμιση.
// Κοινό component — προορίζεται και για τις άλλες τρεις σελίδες (Cool).

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
  return (
    <nav aria-label="Σελίδες Σχετικά" className="absolute bottom-0 inset-x-0" style={{ backgroundColor: 'rgba(0,0,0,.5)' }}>
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
  )
}
