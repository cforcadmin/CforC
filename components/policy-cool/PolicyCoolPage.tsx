'use client'

// Το ενιαίο ΠΟΛΙΤΙΚΗ στο Cool — ίδια γραμματική με το Σχετικά: ΜΙΑ σελίδα,
// τέσσερις όψεις (Όροι & Προϋποθέσεις, Πολιτική Απορρήτου, Πολιτική Cookies,
// Προσβασιμότητα) που εναλλάσσονται επί τόπου από τις καρτέλες, με το URL να
// ακολουθεί μέσω pushState. Navy hero χωρίς εικόνα, τα νομικά σώματα σε
// γυάλινο πάνελ με το παράθυρο-λογότυπο, και η ζώνη ΓΙΝΕ ΜΕΛΟΣ στη θέση του
// παλιού CombinedCtaSection.

import { useEffect, useState } from 'react'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import CookieConsent from '@/components/CookieConsent'
import ScrollToTop from '@/components/ScrollToTop'
import AboutTabs from '@/components/about-cool/AboutTabs'
import CoolMemberBand from '@/components/about-cool/CoolMemberBand'
import TermsBody from './TermsBody'
import PrivacyBody from './PrivacyBody'
import CookiesBody from './CookiesBody'
import AccessibilityBody from './AccessibilityBody'

export const POLICY_SECTIONS = [
  { key: 'terms', label: 'ΟΡΟΙ & ΠΡΟΫΠΟΘΕΣΕΙΣ', href: '/terms' },
  { key: 'privacy', label: 'ΠΟΛΙΤΙΚΗ ΑΠΟΡΡΗΤΟΥ', href: '/privacy' },
  { key: 'cookies', label: 'ΠΟΛΙΤΙΚΗ COOKIES', href: '/cookies' },
  { key: 'accessibility', label: 'ΠΡΟΣΒΑΣΙΜΟΤΗΤΑ', href: '/accessibility' },
] as const

export type PolicySectionKey = (typeof POLICY_SECTIONS)[number]['key']

const BODIES: Record<PolicySectionKey, React.ComponentType> = {
  terms: TermsBody,
  privacy: PrivacyBody,
  cookies: CookiesBody,
  accessibility: AccessibilityBody,
}

export default function PolicyCoolPage({ initialSection = 'terms' }: { initialSection?: PolicySectionKey }) {
  const [section, setSection] = useState<PolicySectionKey>(initialSection)

  const selectSection = (k: PolicySectionKey) => {
    setSection(k)
    const href = POLICY_SECTIONS.find(t => t.key === k)?.href
    if (href && typeof window !== 'undefined' && window.location.pathname !== href) {
      window.history.pushState({}, '', href)
    }
    window.scrollTo({ top: 0 })
  }

  // Back/Forward: το pushState των καρτελών πρέπει να ΞΕγράφεται — στο
  // popstate η όψη ακολουθεί το URL, αλλιώς το κουμπί Πίσω άλλαζε μόνο
  // τη γραμμή διεύθυνσης
  useEffect(() => {
    const onPop = () => {
      const hit = POLICY_SECTIONS.find(t => t.href === window.location.pathname)
      if (hit) setSection(hit.key)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const Body = BODIES[section]
  const title = POLICY_SECTIONS.find(t => t.key === section)!.label

  return (
    <>
      {/* Hero — navy, χωρίς εικόνα: οι πολιτικές δεν έχουν φωτογραφία */}
      <section className="px-2 pt-2 md:px-3 md:pt-3">
        <div className="relative rounded-3xl overflow-hidden min-h-[45vh] md:min-h-[52vh] flex flex-col justify-end" style={{ backgroundColor: '#1B2438' }}>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,.10) 30%, rgba(0,0,0,.5) 100%)' }} aria-hidden="true" />
          <div className="relative px-6 md:px-12 pb-20 md:pb-24 pt-28">
            <p className="text-coral font-bold text-sm tracking-[.18em] mb-3">ΠΟΛΙΤΙΚΗ</p>
            <h1 className="text-white font-bold" style={{ fontSize: 'clamp(2rem, 4vw, 3.4rem)', lineHeight: 0.95 }}>
              {title}
            </h1>
          </div>
          <AboutTabs sections={POLICY_SECTIONS} active={section} onSelect={selectSection} />
        </div>
      </section>

      {/* Το νομικό σώμα σε γυάλινο πάνελ με το παράθυρο-λογότυπο */}
      <section className="py-16 bg-[#F5F0EB] dark:bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden menu-glass glass-rim rounded-3xl py-10">
            <span className="logo-reveal" aria-hidden="true" />
            <Body />
          </div>
        </div>
      </section>
    </>
  )
}

/** Πλήρης σελίδα-φορέας για τα τέσσερα routes ΠΟΛΙΤΙΚΗ στο Cool */
export function PolicyCoolRoute({ section }: { section: PolicySectionKey }) {
  return (
    <div className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900">
      <Navigation />
      <main id="main-content">
        <PolicyCoolPage initialSection={section} />
        <CoolMemberBand />
      </main>
      <Footer />
      <CookieConsent />
      <ScrollToTop />
    </div>
  )
}
