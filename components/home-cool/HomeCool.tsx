'use client'

// Η αρχική του Cool (βάση: Α1 «Κινηματογραφική σκηνή», με τις προσαρμογές
// του Γιώργου 29/8):
// - Full-bleed κάρτα-σκηνή με το βίντεο και τον τίτλο WordCycle· ΧΩΡΙΣ
//   μετρητές (ζουν στο /about) και ΧΩΡΙΣ κάτω μπάρα-πύλες (η αρχική δεν
//   έχει υπομενού)
// - Τρία γυάλινα κουτιά: ΠΟΙΟΙ ΕΙΜΑΣΤΕ (στατικό, οδηγεί στην ενότητα),
//   ΝΕΑ και ΑΝΟΙΧΤΕΣ ΠΡΟΣΚΛΗΣΕΙΣ — στο hover/focus των δύο τελευταίων
//   εμφανίζεται από κάτω η αντίστοιχη πλήρης ενότητα (αρχικά κρυφή)
// - ΠΟΙΟΙ ΕΙΜΑΣΤΕ: εικόνα + κείμενο σε νέα σύνθεση — γυάλινη πλάκα που
//   καβαλάει τη φωτογραφία
// - Πάνω από το footer, η ζώνη ΓΙΝΕ ΜΕΛΟΣ όπως σε όλες τις Cool σελίδες

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import CookieConsent from '@/components/CookieConsent'
import ScrollToTop from '@/components/ScrollToTop'
import ActivitiesSection from '@/components/ActivitiesSection'
import OpenCallsSection from '@/components/OpenCallsSection'
import WordCycle from '@/components/WordCycle'
import CoolMemberBand from '@/components/about-cool/CoolMemberBand'

const rotatingTexts = ['CHANGE', 'INNOVATION', 'PROGRESS', 'CREATION']

export default function HomeCool() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  // Ποια ενότητα έχει αποκαλυφθεί από τα κουτιά (αρχικά καμία)
  const [reveal, setReveal] = useState<'news' | 'calls' | null>(null)

  // Ίδια λογική με το κλασικό hero: το βίντεο ξεκινά μετά τη συγκατάθεση
  // cookies (ή στο πρώτο κλικ αν υπάρχει ήδη) — ποτέ αυτόβουλα πριν από αυτήν
  useEffect(() => {
    if (isPlaying) return
    const tryPlay = () => {
      videoRef.current?.play().then(() => setIsPlaying(true)).catch(() => {})
    }
    const consent = localStorage.getItem('cookieConsent')
    if (consent) {
      window.addEventListener('click', tryPlay, { once: true })
      return () => window.removeEventListener('click', tryPlay)
    }
    window.addEventListener('cookie-consent-dismissed', tryPlay)
    return () => window.removeEventListener('cookie-consent-dismissed', tryPlay)
  }, [isPlaying])

  const boxBase = 'relative overflow-hidden menu-glass glass-rim rounded-2xl p-6 text-left transition-all duration-200'

  return (
    <div className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900">
      <Navigation />
      <main id="main-content">
        {/* ═══ Η σκηνή: το βίντεο ΕΙΝΑΙ η αρχική ═══ */}
        <section className="px-2 pt-2 md:px-3 md:pt-3">
          <div className="relative rounded-3xl overflow-hidden min-h-[58vh] md:min-h-[68vh] flex flex-col justify-end" style={{ backgroundColor: '#1B2438' }}>
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              muted loop playsInline
            >
              <source src="/hero-video.mp4" type="video/mp4" />
              <source src="/hero-video.webm" type="video/webm" />
            </video>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,.12) 30%, rgba(0,0,0,.72) 100%)' }} aria-hidden="true" />

            {!isPlaying && (
              <button
                type="button"
                onClick={() => { videoRef.current?.play(); setIsPlaying(true) }}
                aria-label="Αναπαραγωγή βίντεο"
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
                style={{ backgroundColor: 'rgba(255,255,255,.22)', border: '1px solid rgba(255,255,255,.45)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
              >
                <span aria-hidden="true">▶</span>
              </button>
            )}

            <div className="relative px-6 md:px-12 pb-12 md:pb-16 pt-32">
              <h1
                className="text-white leading-none"
                style={{ fontWeight: 850, transform: 'scaleY(0.86)', transformOrigin: 'left center', letterSpacing: '0.01em', fontSize: 'clamp(2.4rem, 5.5vw, 4.6rem)' }}
              >
                <div>CULTURE</div>
                <div className="flex items-center">
                  <span>FOR&nbsp;</span>
                  <span className="text-coral"><WordCycle words={rotatingTexts} hold={700} dur={600} /></span>
                </div>
              </h1>
            </div>
          </div>
        </section>

        {/* ═══ Τρία κουτιά — τα δύο αποκαλύπτουν την ενότητά τους ═══ */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <div className="grid md:grid-cols-3 gap-5">
            <a href="#poioi-eimaste" className={`${boxBase} block hover:-translate-y-0.5`}>
              <span className="logo-reveal" aria-hidden="true" />
              <span className="inline-block bg-charcoal text-coral px-3 py-1 rounded-full text-xs font-bold">ΠΟΙΟΙ ΕΙΜΑΣΤΕ</span>
              <h2 className="text-lg font-bold text-charcoal dark:text-gray-100 mt-3 leading-snug">ΤΟ CULTURE FOR CHANGE ΜΕ ΜΙΑ ΜΑΤΙΑ</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">Το πρώτο ελληνικό δίκτυο για την κοινωνική καινοτομία.</p>
              <span className="text-coral text-sm font-bold mt-3 inline-block" aria-hidden="true">↓</span>
            </a>

            <button
              type="button"
              onMouseEnter={() => setReveal('news')}
              onFocus={() => setReveal('news')}
              onClick={() => setReveal('news')}
              aria-expanded={reveal === 'news'}
              className={`${boxBase} ${reveal === 'news' ? 'ring-2 ring-coral -translate-y-0.5' : 'hover:-translate-y-0.5'}`}
            >
              <span className="logo-reveal" aria-hidden="true" />
              <span className="inline-block bg-charcoal text-coral px-3 py-1 rounded-full text-xs font-bold">ΠΡΟΣΦΑΤΑ ΝΕΑ</span>
              <h2 className="text-lg font-bold text-charcoal dark:text-gray-100 mt-3 leading-snug">ΝΕΑ ΤΟΥ CULTURE FOR CHANGE</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">Δράσεις, έρευνες και ιστορίες του δικτύου.</p>
              <span className="text-coral text-sm font-bold mt-3 inline-block">{reveal === 'news' ? '▾ Ανοιχτό' : 'Δες τα νέα ▾'}</span>
            </button>

            <button
              type="button"
              onMouseEnter={() => setReveal('calls')}
              onFocus={() => setReveal('calls')}
              onClick={() => setReveal('calls')}
              aria-expanded={reveal === 'calls'}
              className={`${boxBase} ${reveal === 'calls' ? 'ring-2 ring-coral -translate-y-0.5' : 'hover:-translate-y-0.5'}`}
            >
              <span className="logo-reveal" aria-hidden="true" />
              <span className="inline-block bg-charcoal text-coral px-3 py-1 rounded-full text-xs font-bold">ΑΝΟΙΧΤΕΣ ΠΡΟΣΚΛΗΣΕΙΣ</span>
              <h2 className="text-lg font-bold text-charcoal dark:text-gray-100 mt-3 leading-snug">ΑΝΟΙΧΤΕΣ ΠΡΟΣΚΛΗΣΕΙΣ ΤΟΥ CULTURE FOR CHANGE</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">Ευκαιρίες που τρέχουν τώρα για τα μέλη.</p>
              <span className="text-coral text-sm font-bold mt-3 inline-block">{reveal === 'calls' ? '▾ Ανοιχτό' : 'Δες τις προσκλήσεις ▾'}</span>
            </button>
          </div>
        </section>

        {/* Η αποκαλυπτόμενη ενότητα — αρχικά κρυφή, εναλλάσσεται με το hover */}
        {reveal === 'news' && <div className="mt-6"><ActivitiesSection /></div>}
        {reveal === 'calls' && <div className="mt-6"><OpenCallsSection /></div>}

        {/* ═══ ΠΟΙΟΙ ΕΙΜΑΣΤΕ — η πλάκα καβαλάει τη φωτογραφία ═══ */}
        <section id="poioi-eimaste" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 mb-16">
          <div className="relative rounded-3xl overflow-hidden min-h-[24rem]" style={{ backgroundColor: '#1B2438' }}>
            <Image
              src="/Homepage_Block1.jpg"
              alt="Μέλη του δικτύου Culture for Change σε συνάντηση εργασίας"
              fill className="object-cover"
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(0,0,0,.35) 0%, transparent 55%)' }} aria-hidden="true" />
          </div>
          {/* Η γυάλινη πλάκα πατά ΠΑΝΩ στη φωτογραφία — μισή μέσα, μισή έξω */}
          <div className="relative -mt-24 md:-mt-28 md:max-w-2xl md:ml-10 menu-glass glass-rim rounded-3xl p-7 md:p-9"
            style={{ backdropFilter: 'blur(18px) saturate(170%)', WebkitBackdropFilter: 'blur(18px) saturate(170%)' }}>
            <span className="inline-block bg-charcoal text-coral px-3 py-1 rounded-full text-xs font-bold">ΠΟΙΟΙ ΕΙΜΑΣΤΕ</span>
            <h2 className="text-2xl md:text-3xl font-bold text-charcoal dark:text-gray-100 mt-3 leading-tight">
              ΤΟ ΠΡΩΤΟ ΕΛΛΗΝΙΚΟ ΔΙΚΤΥΟ ΓΙΑ ΤΗΝ ΚΟΙΝΩΝΙΚΗ ΚΑΙΝΟΤΟΜΙΑ ΣΤΗΝ ΕΛΛΑΔΑ
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mt-4" style={{ lineHeight: 1.6 }}>
              Μέσα από τις δράσεις του το δίκτυο Culture for Change αναπτύσσει την
              κοινωνική καινοτομία στην Ελλάδα υποστηρίζοντας τους επαγγελματίες
              του πολιτισμού, αναδεικνύοντας τον θετικό αντίκτυπο που επιφέρουν
              πολιτιστικές δράσεις και έργα για την ευημερία όλων.
            </p>
            <Link href="/about" className="inline-flex items-center gap-2 min-h-11 px-6 mt-5 rounded-full bg-coral text-charcoal text-sm font-bold tracking-widest hover:bg-[#F07551] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2">
              ΣΧΕΤΙΚΑ ΜΕ ΕΜΑΣ <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>

        <CoolMemberBand />
      </main>
      <Footer />
      <CookieConsent />
      <ScrollToTop />
    </div>
  )
}
