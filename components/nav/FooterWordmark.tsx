'use client'

// Υποσέλιδο 2c «Wordmark» (design handoff 27/8/26) — για τα στυλ Modern και
// Cool· το Classic κρατά το παλιό Footer ανέγγιχτο. Ίδιο περιεχόμενο με το
// σημερινό, αναδιοργανωμένο: τρεις στήλες (ΕΠΙΚΟΙΝΩΝΙΑ με κοραλί CTA,
// SITEMAP σε δύο στήλες, ΠΟΛΙΤΙΚΗ με τα social από κάτω), νομική σειρά,
// και (προσαρμογή 27/8) το wordmark ΚΑΘΕΤΟ αριστερά
// της ΕΠΙΚΟΙΝΩΝΙΑΣ σε μικρότερα γράμματα, με τα στατιστικά δικτύου από
// κάτω — πραγματικά νούμερα από το /api/stats/network (μέλη με ΑΜ,
// διακριτές περιφέρειες), με τα στατικά του σχεδίου ως fallback.
// Σε contrast boost το wordmark κρύβεται.

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '../AuthProvider'
import ConfirmationModal from '../ConfirmationModal'

const LINK = 'hover:text-coral transition-colors duration-200'

const SOCIALS = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/culture-for-change-gr/posts/?feedView=all', icon: '/linkedin-icon-lg.png' },
  { label: 'Facebook', href: 'https://www.facebook.com/cultureforchange', icon: '/facebook-icon-lg.png' },
  { label: 'Instagram', href: 'https://www.instagram.com/culture_for_change/', icon: '/instagram-icon-lg.png' },
  { label: 'YouTube', href: 'https://www.youtube.com/channel/UCKFq7TQlenx36UPc3F63Opw', icon: '/youtube-icon-lg.png' },
  { label: 'Vimeo', href: 'https://vimeo.com/user165582483', icon: '/vimeo-square-icon-md.png' },
]

export default function FooterWordmark() {
  const { user, logout } = useAuth()
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  // Τα μέλη ζωντανά από τη βάση (με ΑΜ — ο ορισμός της Επισκόπησης OC)·
  // οι περιφέρειες ΣΤΑΘΕΡΑ 13 (απόφαση Γιώργου 27/8: το πεδίο Province
  // της βάσης δεν χαρτογραφεί αξιόπιστα τις 13 διοικητικές περιφέρειες)
  const [memberCount, setMemberCount] = useState(110)
  useEffect(() => {
    fetch('/api/stats/network').then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.members) setMemberCount(d.members) }).catch(() => {})
  }, [])

  const handleOpenCallsClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault()
      setShowMemberModal(true)
    }
  }

  return (
    <>
      {/* -mt-6 = η ακτίνα των γωνιών: το footer καβαλάει το τέλος της
          προηγούμενης ενότητας ώστε οι εγκοπές των γωνιών να δείχνουν ΑΥΤΗΝ
          (φωτογραφία ή φόντο σελίδας) — καμία βαμμένη λωρίδα, που πάντα θα
          ξένιζε κάπου (η κρεμ διαβαζόταν λευκή πλάι στη φωτογραφία). */}
      <footer role="contentinfo" aria-label="Πληροφορίες ιστότοπου" className="relative -mt-6 bg-charcoal rounded-t-3xl overflow-hidden">
        <div className="max-w-[80rem] mx-auto px-6 pt-8 md:px-14 md:pt-10 flex flex-col gap-8 pb-6 md:pb-8">

          {/* Στήλες */}
          <div className="flex flex-col lg:flex-row items-start lg:justify-between gap-10 lg:gap-12">
            {/* ΕΠΙΚΟΙΝΩΝΙΑ — το κοραλί eyebrow είναι σκόπιμη ασυμμετρία:
                η επαφή είναι η στήλη που θέλουμε να βρίσκεται πρώτη */}
            <div className="max-w-[30ch]">
              <h3 className="text-xs font-bold tracking-[.14em] uppercase text-coral mb-4">ΕΠΙΚΟΙΝΩΝΙΑ</h3>
              <ul role="list" className="space-y-2 text-base leading-normal text-white/80">
                <li>
                  <a
                    href="https://www.google.com/maps/place/Leof.+Alexandras+48,+Athina+114+73/@37.9905657,23.7374602,1006m/data=!3m2!1e3!4b1!4m6!3m5!1s0x14a1bd3522c01fef:0x1734422b9fe058ad!8m2!3d37.9905657!4d23.7374602!16s%2Fg%2F11b8v65q35?entry=ttu&g_ep=EgoyMDI1MTEwNC4xIKXMDSoASAFQAw%3D%3D"
                    target="_blank" rel="noopener noreferrer" className={LINK}
                  >
                    Λ. Αλεξάνδρας 48, 114 73, Αθήνα
                  </a>
                </li>
                <li><a href="mailto:hello@cultureforchange.net" className={LINK}>hello@cultureforchange.net</a></li>
                <li><a href="tel:+306976225704" className={`${LINK} notranslate`}>+306976225704</a></li>
                <li><Link href="/contact" className={LINK}>Επικοινώνησε μαζί μας</Link></li>
              </ul>
              {!user && (
                <Link
                  href="/participation"
                  className="inline-flex items-center min-h-11 px-6 mt-5 rounded-full bg-coral text-charcoal text-[13px] font-bold tracking-widest hover:bg-[#F07551] transition-colors duration-200"
                >
                  ΓΙΝΕ ΤΩΡΑ ΜΕΛΟΣ
                </Link>
              )}
            </div>

            {/* SITEMAP */}
            <nav aria-label="Sitemap">
              <h3 className="text-xs font-bold tracking-[.14em] uppercase text-white/45 mb-4">SITEMAP</h3>
              <ul role="list" className="grid grid-cols-2 gap-y-2 gap-x-8 text-[15px] text-white">
                <li><Link href="/" className={LINK}>Κεντρική</Link></li>
                <li><Link href="/about" className={LINK}>Σχετικά με εμάς</Link></li>
                <li><Link href="/news" className={LINK}>Νέα</Link></li>
                <li><Link href="/map" className={LINK}>Χάρτης</Link></li>
                <li>
                  {user ? (
                    <Link href="/open-calls" className={LINK}>Ανοιχτές προσκλήσεις</Link>
                  ) : (
                    <button type="button" onClick={handleOpenCallsClick} className={LINK}>Ανοιχτές προσκλήσεις</button>
                  )}
                </li>
                {!user && <li><Link href="/participation" className={LINK}>Συμμετοχή</Link></li>}
                <li><Link href="/members" className={LINK}>Εύρεση μελών</Link></li>
                {user ? (
                  <>
                    <li><Link href="/profile" className={LINK}>Ο χώρος μου</Link></li>
                    <li><button type="button" onClick={() => setIsLogoutModalOpen(true)} className={LINK}>Αποσύνδεση</button></li>
                  </>
                ) : (
                  <li><Link href="/login" className={LINK}>Σύνδεση</Link></li>
                )}
                <li><Link href="/transparency" className={LINK}>Διαφάνεια</Link></li>
              </ul>
            </nav>

            {/* ΠΟΛΙΤΙΚΗ + social */}
            <nav aria-label="Πολιτική">
              <h3 className="text-xs font-bold tracking-[.14em] uppercase text-white/45 mb-4">ΠΟΛΙΤΙΚΗ</h3>
              <ul role="list" className="space-y-2 text-[15px] text-white">
                <li><Link href="/terms" className={LINK}>Όροι &amp; Προϋποθέσεις</Link></li>
                <li><Link href="/privacy" className={LINK}>Πολιτική Απορρήτου</Link></li>
                <li><Link href="/cookies" className={LINK}>Πολιτική Cookies</Link></li>
                <li><Link href="/accessibility" className={LINK}>Προσβασιμότητα</Link></li>
              </ul>
              <div className="flex gap-2 mt-2.5">
                {SOCIALS.map(s => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank" rel="noopener noreferrer"
                    aria-label={s.label}
                    className="w-11 h-11 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/[.14] transition-colors duration-200"
                  >
                    <Image src={s.icon} alt="" width={20} height={20} className="w-5 h-5 object-contain brightness-0 invert" />
                  </a>
                ))}
              </div>
            </nav>
          </div>

          {/* Wordmark και αριθμοί δικτύου σε μία σειρά, πάνω από τη νομική */}
          <div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3">
              <span className="footer-wordmark notranslate uppercase font-bold text-sm tracking-[.18em] text-white/60">
                Culture for Change
              </span>
              <span className="w-px h-4 bg-white/20" aria-hidden="true" />
              <span className="flex items-baseline gap-3 text-[13px] font-bold tracking-[.12em] text-coral" style={{ fontVariantNumeric: 'tabular-nums' }}>
                <span className="notranslate">{memberCount} ΜΕΛΗ</span>
                <span className="text-white/25" aria-hidden="true">·</span>
                <span className="notranslate">13 ΠΕΡΙΦΕΡΕΙΕΣ</span>
              </span>
            </div>
            {/* Νομική σειρά */}
            <div className="border-t border-white/[.14] pt-4 flex flex-col lg:flex-row lg:justify-between gap-2 text-sm text-white/50">
              <p>Πνευματικά δικαιώματα © {new Date().getFullYear()} Culture For Change</p>
              <p>
                Developed by{' '}
                <a href="https://yoryosstyl.com" target="_blank" rel="noopener noreferrer" className="font-bold text-white hover:text-coral transition-colors duration-200">
                  Yoryos Styl
                </a>
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Modal «μόνο για μέλη» των ανοιχτών προσκλήσεων — ίδιο με το Classic */}
      {showMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="menu-glass-dense rounded-2xl max-w-md w-full p-8 relative">
            <button
              type="button"
              onClick={() => setShowMemberModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label="Κλείσιμο"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-4 dark:text-gray-100">Περιεχόμενο Μελών</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Οι ανοιχτές προσκλήσεις είναι διαθέσιμες μόνο για εγγεγραμμένα μέλη. Εγγραφείτε για πρόσβαση.
              </p>
              <div className="flex flex-col gap-3">
                <Link href="/participation" onClick={() => setShowMemberModal(false)} className="bg-charcoal dark:bg-gray-700 text-coral dark:text-coral-light border-2 border-coral dark:border-coral-light px-6 py-3 rounded-full font-medium hover:bg-coral hover:text-white transition-colors">
                  Εγγραφή
                </Link>
                <Link href="/login" onClick={() => setShowMemberModal(false)} className="bg-white dark:bg-gray-700 text-coral dark:text-coral-light border-2 border-coral dark:border-coral-light px-6 py-3 rounded-full font-medium hover:bg-coral hover:text-white transition-colors">
                  Σύνδεση
                </Link>
                <button type="button" onClick={() => setShowMemberModal(false)} className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                  Κλείσιμο
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={isLogoutModalOpen}
        title="Αποσύνδεση"
        message="Είστε σίγουροι ότι θέλετε να αποσυνδεθείτε;"
        confirmText="Αποσύνδεση"
        cancelText="Ακύρωση"
        onConfirm={async () => { await logout(); setIsLogoutModalOpen(false) }}
        onCancel={() => setIsLogoutModalOpen(false)}
        variant="info"
      />
    </>
  )
}
