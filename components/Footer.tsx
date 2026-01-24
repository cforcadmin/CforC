'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from './AuthProvider'

interface FooterProps {
  variant?: 'default' | 'members'
}

export default function Footer({ variant = 'default' }: FooterProps) {
  const { user } = useAuth()
  const [showMemberModal, setShowMemberModal] = useState(false)
  const bgColor = variant === 'members' ? 'bg-[#F5F0EB] dark:bg-gray-800' : 'bg-gray-100 dark:bg-gray-800'

  const handleOpenCallsClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault()
      setShowMemberModal(true)
    }
  }

  return (
    <>
      {/* Member-Only Modal */}
      {showMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-8 relative">
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
              <div className="mb-4">
                <svg className="w-16 h-16 text-coral dark:text-coral-light mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4 dark:text-gray-100">Περιεχόμενο Μελών</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Οι ανοιχτές προσκλήσεις είναι διαθέσιμες μόνο για εγγεγραμμένα μέλη. Εγγραφείτε για πρόσβαση.
              </p>
              <div className="flex flex-col gap-3">
                <Link
                  href="/participation"
                  className="bg-charcoal dark:bg-gray-700 text-coral dark:text-coral-light border-2 border-coral dark:border-coral-light px-6 py-3 rounded-full font-medium hover:bg-coral hover:text-white dark:hover:bg-coral-light dark:hover:text-gray-900 transition-colors"
                  onClick={() => setShowMemberModal(false)}
                >
                  Εγγραφή
                </Link>
                <Link
                  href="/login"
                  className="bg-white dark:bg-gray-700 text-coral dark:text-coral-light border-2 border-coral dark:border-coral-light px-6 py-3 rounded-full font-medium hover:bg-coral hover:text-white dark:hover:bg-coral-light dark:hover:text-white transition-colors"
                  onClick={() => setShowMemberModal(false)}
                >
                  Σύνδεση
                </Link>
                <button
                  type="button"
                  onClick={() => setShowMemberModal(false)}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Κλείσιμο
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    <footer role="contentinfo" aria-label="Πληροφορίες ιστότοπου" className={bgColor}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row justify-between items-start mb-6">
          {/* Logo */}
          <div className="mb-8 md:mb-0">
            <Image
              src="/cforc_logo.svg"
              alt="Διακοσμητικό στοιχείο"
              width={160}
              height={64}
              className="w-40 dark:invert"
            />
          </div>

          {/* Right columns group */}
          <div className="flex gap-6 md:gap-8">
            {/* Sitemap */}
            <div>
              <h3 className="font-bold mb-3 text-coral dark:text-coral-light text-xs">SITEMAP</h3>
            <ul role="list" className="space-y-1.5 text-xs dark:text-gray-300">
              <li><Link href="/members" className="hover:text-coral dark:hover:text-coral-light transition-colors">ΕΥΡΕΣΗ ΜΕΛΩΝ</Link></li>
              <li><Link href="/about" className="hover:text-coral dark:hover:text-coral-light transition-colors">ΣΧΕΤΙΚΑ ΜΕ ΕΜΑΣ</Link></li>
              <li><Link href="/activities" className="hover:text-coral dark:hover:text-coral-light transition-colors">ΔΡΑΣΤΗΡΙΟΤΗΤΕΣ</Link></li>
              <li>
                {user ? (
                  <Link href="/open-calls" className="hover:text-coral dark:hover:text-coral-light transition-colors">ΑΝΟΙΧΤΕΣ ΠΡΟΣΚΛΗΣΕΙΣ</Link>
                ) : (
                  <button type="button" onClick={handleOpenCallsClick} className="hover:text-coral dark:hover:text-coral-light transition-colors">ΑΝΟΙΧΤΕΣ ΠΡΟΣΚΛΗΣΕΙΣ</button>
                )}
              </li>
              <li><Link href="/participation" className="hover:text-coral dark:hover:text-coral-light transition-colors">ΣΥΜΜΕΤΟΧΗ</Link></li>
              <li><Link href="/transparency" className="hover:text-coral dark:hover:text-coral-light transition-colors">ΔΙΑΦΑΝΕΙΑ</Link></li>
            </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="font-bold mb-3 text-coral dark:text-coral-light text-xs">ΕΠΙΚΟΙΝΩΝΙΑ</h3>
            <ul role="list" className="space-y-1.5 text-xs dark:text-gray-300">
              <li>
                <a
                  href="https://www.google.com/maps/place/Leof.+Alexandras+48,+Athina+114+73/@37.9905657,23.7374602,1006m/data=!3m2!1e3!4b1!4m6!3m5!1s0x14a1bd3522c01fef:0x1734422b9fe058ad!8m2!3d37.9905657!4d23.7374602!16s%2Fg%2F11b8v65q35?entry=ttu&g_ep=EgoyMDI1MTEwNC4xIKXMDSoASAFQAw%3D%3D"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-coral dark:hover:text-coral-light transition-colors"
                >
                  Λ. Αλεξάνδρας 48, 114 73, Αθήνα
                </a>
              </li>
              <li>
                <a
                  href="mailto:hello@cultureforchange.net"
                  className="hover:text-coral dark:hover:text-coral-light transition-colors"
                  title="Αποστολή email στο hello@cultureforchange.net (ανοίγει εφαρμογή email)"
                >
                  hello@cultureforchange.net
                  <span className="sr-only"> (ανοίγει εφαρμογή email)</span>
                </a>
              </li>
              <li>
                <a
                  href="tel:+306976225704"
                  className="hover:text-coral dark:hover:text-coral-light transition-colors"
                  title="Κλήση στο +306976225704 (ανοίγει εφαρμογή κλήσης)"
                >
                  +306976225704
                  <span className="sr-only"> (ανοίγει εφαρμογή κλήσης)</span>
                </a>
              </li>
            </ul>
            </div>

            {/* Policy */}
            <div>
              <h3 className="font-bold mb-3 text-coral dark:text-coral-light text-xs">ΠΟΛΙΤΙΚΗ</h3>
            <ul role="list" className="space-y-1.5 text-xs dark:text-gray-300">
              <li><Link href="/terms" className="hover:text-coral dark:hover:text-coral-light transition-colors">Όροι & Προϋποθέσεις</Link></li>
              <li><Link href="/privacy" className="hover:text-coral dark:hover:text-coral-light transition-colors">Πολιτική Απορρήτου</Link></li>
              <li><Link href="/cookies" className="hover:text-coral dark:hover:text-coral-light transition-colors">Πολιτική Cookies</Link></li>
              <li><Link href="/accessibility" className="hover:text-coral dark:hover:text-coral-light transition-colors">Προσβασιμότητα</Link></li>
            </ul>
            </div>

            {/* Social Media Icons */}
            <div className="relative" style={{marginRight: '-0.15em'}}>
              <h3 className="font-bold mb-3 text-coral dark:text-coral-light text-xs text-right">SOCIAL MEDIA</h3>
              <div className="grid grid-cols-2 gap-3 justify-items-end">
                <a href="https://www.linkedin.com/company/culture-for-change-gr/posts/?feedView=all" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity w-6 h-6 flex items-center justify-center">
                  <Image src="/linkedin-icon-lg.png" alt="LinkedIn" width={24} height={24} className="dark:invert w-full h-full object-contain" />
                </a>
                <a href="https://www.facebook.com/cultureforchange" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity w-6 h-6 flex items-center justify-center">
                  <Image src="/facebook-icon-lg.png" alt="Facebook" width={24} height={24} className="dark:invert w-full h-full object-contain" />
                </a>
                <a href="https://www.instagram.com/culture_for_change/" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity w-6 h-6 flex items-center justify-center">
                  <Image src="/instagram-icon-lg.png" alt="Instagram" width={24} height={24} className="dark:invert w-full h-full object-contain" />
                </a>
                <a href="https://www.youtube.com/channel/UCKFq7TQlenx36UPc3F63Opw" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity w-6 h-6 flex items-center justify-center">
                  <Image src="/youtube-icon-lg.png" alt="YouTube" width={24} height={24} className="dark:invert w-full h-full object-contain" />
                </a>
                <a href="https://vimeo.com/user165582483" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity w-6 h-6 flex items-center justify-center">
                  <Image src="/vimeo-square-icon-md.png" alt="Vimeo" width={24} height={24} className="dark:invert w-full h-full object-contain" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom section */}
        <div className="border-t border-gray-300 dark:border-gray-600 pt-6 flex flex-col md:flex-row justify-between items-center text-xs text-gray-700 dark:text-gray-400">
          <p>ΠΝΕΥΜΑΤΙΚΑ ΔΙΚΑΙΩΜΑΤΑ © 2026 CULTURE FOR CHANGE</p>
          <p className="mt-2 md:mt-0">
            Developed by <a href="https://yoryosstyl.com" target="_blank" rel="noopener noreferrer" className="font-medium hover:text-coral dark:hover:text-coral-light transition-colors">Yoryos Styl</a>
          </p>
        </div>
      </div>
    </footer>
    </>
  )
}
