'use client'

// Modern header (σχέδιο 1b «Φλοτέ κάψουλα» + προσαρμογές Γιώργου):
// - ΟΛΗ η πλοήγηση σε σκούρα κάψουλα δεξιά, ενεργό στοιχείο = κοραλί pill
// - Δεύτερη σκούρα φούσκα αριστερά: Α-συστάδα (συμπτυγμένη στο τρίτο Α,
//   ξεδιπλώνει προς τα αριστερά στο hover) · αναζήτηση (hover = προεπισκόπηση
//   ίδια με το popup, κλικ = το πραγματικό popup) · θέμα · διακόπτης στυλ
// - Η γη (μετάφραση) ΕΞΩ από τις φούσκες· ΣΥΝΔΕΣΗ κοραλί έξω από την κάψουλα
// Βλ. docs/Nav-Modes.md για το σύστημα των τριών στυλ.

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import LanguageSwitcher from '../LanguageSwitcher'
import { useTheme } from '../ThemeProvider'
import { useAuth } from '../AuthProvider'
import { useTextSize } from '../TextSizeProvider'
import { useTranslation } from '../TranslationProvider'
import ConfirmationModal from '../ConfirmationModal'
import { AccessibilityButton } from '../AccessibilityMenu'
import GlobalSearch from '../GlobalSearch'
import { useOcAccess } from '../useOcAccess'
import OcSeatChoiceModal from '../oc/OcSeatChoiceModal'
import NavModeSwitch from './NavModeSwitch'
import { NAV_ITEMS, type NavItem } from './navItems'
import { getFeaturedProjects } from '@/lib/strapi'
import type { Project, StrapiResponse } from '@/lib/types'

interface CapsuleHeaderProps {
  variant?: 'default' | 'members'
}

const ABOUT_SUBPAGES = [
  { label: 'Το δίκτυο', href: '/about' },
  { label: 'Ομάδα Συντονισμού', href: '/coordination-team' },
  { label: 'Διαφάνεια', href: '/transparency' },
  { label: 'Επικοινωνία', href: '/contact' },
]

// Κοινές κλάσεις pill της κάψουλας (README: .8125rem, 700, tracking .1em)
const PILL = 'inline-flex items-center gap-1 min-h-9 px-4 rounded-full text-[13px] font-bold tracking-widest whitespace-nowrap transition-colors duration-200'
const PILL_IDLE = 'text-white/70 hover:bg-white/10 hover:text-white'
const PILL_ACTIVE = 'bg-coral text-charcoal'

export default function CapsuleHeader(_props: CapsuleHeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const { textSize, setTextSize } = useTextSize()
  const { isAuthenticated, logout } = useAuth()
  const { isTranslated } = useTranslation()
  const ocAccess = useOcAccess(isAuthenticated)

  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [showOcSeatModal, setShowOcSeatModal] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [featuredProjects, setFeaturedProjects] = useState<Project[]>([])

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 150)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Cmd+K / Ctrl+K — ίδια συντόμευση με το classic header
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsSearchOpen(true)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // ?search=1 (π.χ. redirect μετά από σύνδεση)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('search') === '1') {
      setIsSearchOpen(true)
      const url = new URL(window.location.href)
      url.searchParams.delete('search')
      window.history.replaceState({}, '', url.pathname + (url.search || ''))
    }
  }, [])

  useEffect(() => {
    async function fetchProjects() {
      try {
        const response: StrapiResponse<Project[]> = await getFeaturedProjects()
        setFeaturedProjects(response.data)
      } catch (err) {
        console.error('Error fetching featured projects:', err)
      }
    }
    fetchProjects()
  }, [])

  const isAboutActive = pathname === '/about' || pathname === '/coordination-team' || pathname === '/transparency' || pathname === '/contact'

  const isItemActive = (item: NavItem): boolean => {
    switch (item.key) {
      case 'about': return isAboutActive
      case 'news': return !!pathname?.startsWith('/news')
      case 'projects': return !!pathname?.startsWith('/projects')
      case 'map': return pathname === '/map'
      case 'participation': return pathname === '/participation'
      case 'members': return !!pathname?.startsWith('/members')
      default: return false
    }
  }

  const itemLabel = (item: NavItem): string => {
    if (item.key === 'members' && isAuthenticated) return 'ΜΕΛΗ'
    if (item.key === 'map' && isTranslated) return 'MAP'
    return item.label
  }

  const visibleItems = NAV_ITEMS.filter(item => !(item.anonOnly && isAuthenticated))

  // TEMPORARY: multi-seat μέλη διαλέγουν ρόλο σε κάθε είσοδο στο OC από το μενού
  const handleOcNavClick = (e: React.MouseEvent) => {
    if (ocAccess.seats.length > 1) {
      e.preventDefault()
      setMobileOpen(false)
      setShowOcSeatModal(true)
    }
  }

  const handleLogout = async () => {
    await logout()
    setIsLogoutModalOpen(false)
  }

  // Α-συστάδα: μεγέθη με τη σειρά του TextSizeToggle (μεγάλο → μικρό)·
  // τα δύο πρώτα ζουν στη «φωλιά» που ξεδιπλώνει το hover
  const A_SIZES = [
    { size: 'large' as const, fontSize: 18, label: 'Μεγάλο μέγεθος κειμένου' },
    { size: 'medium' as const, fontSize: 16, label: 'Μεσαίο μέγεθος κειμένου' },
    { size: 'small' as const, fontSize: 14, label: 'Κανονικό μέγεθος κειμένου' },
  ]
  const renderA = ({ size, fontSize, label }: (typeof A_SIZES)[number]) => (
    <button
      key={size}
      type="button"
      onClick={() => setTextSize(size)}
      aria-label={label}
      aria-pressed={textSize === size}
      className={`notranslate w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 transition-colors ${
        textSize === size ? 'bg-white text-black' : 'text-white hover:bg-white/10'
      }`}
      style={{ fontSize: `${fontSize}px` }}
    >
      A
    </button>
  )

  const searchChips = ['Όλα', 'Μέλη', 'Νέα', 'Ανοιχτές Προσκλήσεις', 'Σελίδες']

  return (
    <header className={`fixed ${isScrolled ? 'top-2 px-4' : 'top-0'} w-full z-50 ${isScrolled ? 'shadow-none' : 'shadow-sm dark:shadow-gray-700'} transition-all duration-300`}>
      {/* Ίδια χορογραφία με το Classic: στο scroll το header γίνεται πλωτό
          γυάλινο pill (κρεμ γυαλί, δαχτυλίδι κοραλί, scale-90) */}
      <div className={`${isScrolled ? 'nav-glass nav-glass-cream rounded-2xl scale-90 ring-2 ring-coral' : 'bg-[#F5F0EB] dark:bg-gray-900'} transition-all duration-300`}>
      <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-20 gap-3">
          {/* Λογότυπο */}
          <Link href="/" className="flex items-center flex-shrink-0">
            <img src="/cforc_logo.svg" alt="Culture for Change" className="h-11 dark:invert header-logo" />
          </Link>

          {/* Αριστερή φούσκα εργαλείων */}
          <div className="hidden lg:flex items-center gap-1 bubble-glass glass-rim rounded-full p-1.5 ml-1">
            {/* Α-συστάδα: ορατό μόνο το τρίτο (δεξί) Α — hover ξεδιπλώνει τα δύο μεγαλύτερα */}
            <div className="a-cluster" role="group" aria-label="Μέγεθος κειμένου">
              <div className="a-nest">{A_SIZES.slice(0, 2).map(renderA)}</div>
              {renderA(A_SIZES[2])}
            </div>

            {/* Αναζήτηση: hover = προεπισκόπηση σαν το popup, κλικ = το popup */}
            <div className="hover-reveal">
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                aria-label="Αναζήτηση (Cmd+K)"
                className="w-9 h-9 rounded-full flex items-center justify-center text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <div className="reveal-panel absolute top-full left-0 mt-3 w-96 z-50 pointer-events-none" aria-hidden="true">
                <div className="menu-glass-dense glass-rim rounded-3xl overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span className="flex-1 text-base text-charcoal/60 dark:text-white/60">Αναζήτηση…</span>
                    <kbd className="px-1.5 py-0.5 bg-charcoal/10 dark:bg-white/15 text-charcoal dark:text-white rounded text-[10px] font-mono font-bold border border-charcoal/20 dark:border-white/30">ESC</kbd>
                  </div>
                  <div className="px-6 py-3 flex items-center gap-2 flex-wrap">
                    {searchChips.map((chip, i) => (
                      <span
                        key={chip}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                          i === 0
                            ? 'bg-coral text-white border-coral'
                            : 'text-charcoal dark:text-gray-200 border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Θέμα */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'light' ? 'Ενεργοποίηση σκούρου θέματος' : 'Ενεργοποίηση ανοιχτού θέματος'}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            >
              {theme === 'light' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>

            {/* Στυλ μενού */}
            <NavModeSwitch align="left" />
          </div>

          {/* Δεξιά: κάψουλα πλοήγησης + ΣΥΝΔΕΣΗ + γη + προσβασιμότητα */}
          <div className="hidden lg:flex items-center gap-2.5 ml-auto">
            <nav aria-label="Κύρια πλοήγηση" className="flex items-center gap-1 bubble-glass glass-rim rounded-full p-1.5">
              {visibleItems.map(item => {
                const active = isItemActive(item)
                const pillCls = `${PILL} ${active ? PILL_ACTIVE : PILL_IDLE}`
                if (item.dropdown === 'about') {
                  return (
                    <div key={item.key} className="hover-reveal">
                      <Link href={item.href} className={pillCls} aria-current={active ? 'page' : undefined} aria-haspopup="true">
                        {itemLabel(item)}
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </Link>
                      <div className="reveal-panel absolute top-full left-0 mt-3 w-60 menu-glass-dense glass-rim rounded-2xl py-1.5 z-50">
                        {ABOUT_SUBPAGES.map(sub => (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            className={`block px-4 py-2.5 text-sm min-h-11 flex items-center transition-colors ${
                              pathname === sub.href
                                ? 'text-coral dark:text-coral-light font-bold bg-gray-50/60 dark:bg-gray-700/60'
                                : 'text-charcoal dark:text-gray-200 hover:bg-gray-100/70 dark:hover:bg-gray-700/70'
                            }`}
                          >
                            {sub.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )
                }
                if (item.dropdown === 'projects') {
                  return (
                    <div key={item.key} className="hover-reveal">
                      <Link href={item.href} className={pillCls} aria-current={active ? 'page' : undefined} aria-haspopup="true">
                        {itemLabel(item)}
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </Link>
                      {featuredProjects.length > 0 && (
                        <div className="reveal-panel absolute top-full left-0 mt-3 w-72 menu-glass-dense glass-rim rounded-2xl py-1.5 z-50">
                          {featuredProjects.map(project => (
                            <Link
                              key={project.id}
                              href={`/projects/${project.slug}`}
                              className="block px-4 py-2.5 text-sm min-h-11 flex items-center text-charcoal dark:text-gray-200 hover:bg-gray-100/70 dark:hover:bg-gray-700/70 transition-colors"
                            >
                              <span className="truncate">{project.title}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                }
                return (
                  <Link key={item.key} href={item.href} className={pillCls} aria-current={active ? 'page' : undefined}>
                    <span className={item.key === 'map' ? 'notranslate' : undefined}>{itemLabel(item)}</span>
                  </Link>
                )
              })}

              {/* Μέλος: όλα μέσα στην κάψουλα, όπως ζητήθηκε */}
              {isAuthenticated && (
                <>
                  <Link href="/profile" className={`${PILL} ${pathname === '/profile' ? PILL_ACTIVE : PILL_IDLE}`} aria-current={pathname === '/profile' ? 'page' : undefined}>
                    Ο ΧΩΡΟΣ ΜΟΥ
                  </Link>
                  {ocAccess.isBoard && (
                    <Link
                      href="/oc"
                      onClick={handleOcNavClick}
                      className={`notranslate ${PILL} ${pathname?.startsWith('/oc') ? PILL_ACTIVE : PILL_IDLE}`}
                      aria-current={pathname?.startsWith('/oc') ? 'page' : undefined}
                    >
                      OC
                    </Link>
                  )}
                  <button type="button" onClick={() => setIsLogoutModalOpen(true)} className={`${PILL} ${PILL_IDLE}`}>
                    ΑΠΟΣΥΝΔΕΣΗ
                  </button>
                </>
              )}
            </nav>

            {/* ΣΥΝΔΕΣΗ έξω από την κάψουλα (README 1b) */}
            {!isAuthenticated && (
              <Link
                href="/login"
                className="inline-flex items-center min-h-11 px-5 rounded-full bg-coral text-white text-[13px] font-bold tracking-widest whitespace-nowrap hover:bg-[#F07551] transition-colors"
              >
                ΣΥΝΔΕΣΗ
              </Link>
            )}

            {/* Η γη (μετάφραση) — ΕΞΩ από τις φούσκες */}
            <LanguageSwitcher />

            {/* Προσβασιμότητα — εμφανίζεται στο scroll, όπως στο classic */}
            <div className={`transition-all duration-300 flex items-center ${isScrolled ? 'opacity-100 scale-100' : 'opacity-0 scale-0 w-0 overflow-hidden'}`}>
              <AccessibilityButton size="small" />
            </div>
          </div>

          {/* Κινητό / στενές οθόνες */}
          <div className="lg:hidden flex items-center gap-2 ml-auto">
            {!isAuthenticated ? (
              <Link href="/login" className="inline-flex items-center min-h-10 px-4 rounded-full bg-coral text-white text-[13px] font-bold tracking-widest hover:bg-[#F07551] transition-colors">
                ΣΥΝΔΕΣΗ
              </Link>
            ) : (
              <Link href="/profile" className="inline-flex items-center min-h-10 px-4 rounded-full bg-coral text-white text-[13px] font-bold tracking-widest hover:bg-[#F07551] transition-colors">
                Ο ΧΩΡΟΣ ΜΟΥ
              </Link>
            )}
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 text-charcoal dark:text-gray-200"
              aria-label={mobileOpen ? 'Κλείσιμο μενού' : 'Άνοιγμα μενού'}
              aria-expanded={mobileOpen}
              aria-controls="capsule-mobile-menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Κινητό: ολοσέλιδο σκούρο φύλλο (README 1b) */}
      <div
        id="capsule-mobile-menu"
        className={`lg:hidden bg-charcoal dark:bg-gray-800 border-t border-white/10 ${mobileOpen ? '' : 'hidden'}`}
      >
        <nav aria-label="Κύρια πλοήγηση κινητού" className="px-6 py-5 space-y-1">
          {visibleItems.map(item => (
            <Link
              key={item.key}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`block py-2.5 text-2xl font-bold tracking-wide min-h-11 ${
                isItemActive(item) ? 'text-coral' : 'text-white/85 hover:text-white'
              }`}
            >
              {itemLabel(item)}
            </Link>
          ))}
          {isAuthenticated && (
            <>
              <Link href="/profile" onClick={() => setMobileOpen(false)} className={`block py-2.5 text-2xl font-bold tracking-wide min-h-11 ${pathname === '/profile' ? 'text-coral' : 'text-white/85 hover:text-white'}`}>
                Ο ΧΩΡΟΣ ΜΟΥ
              </Link>
              {ocAccess.isBoard && (
                <Link href="/oc" onClick={(e) => { handleOcNavClick(e) }} className="notranslate block py-2.5 text-2xl font-bold tracking-wide min-h-11 text-white/85 hover:text-white">
                  OPERATIONAL CENTER
                </Link>
              )}
              <button type="button" onClick={() => { setMobileOpen(false); setIsLogoutModalOpen(true) }} className="block py-2.5 text-2xl font-bold tracking-wide min-h-11 text-white/60 hover:text-white text-left">
                ΑΠΟΣΥΝΔΕΣΗ
              </button>
            </>
          )}
          <div className="flex items-center gap-3 pt-4 border-t border-white/10 mt-3">
            <div className="flex items-center gap-1" role="group" aria-label="Μέγεθος κειμένου">
              {A_SIZES.map(renderA)}
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Εναλλαγή θέματος"
              className="w-9 h-9 rounded-full flex items-center justify-center text-white/80 hover:bg-white/10"
            >
              {theme === 'light' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={() => { setMobileOpen(false); setIsSearchOpen(true) }}
              aria-label="Αναζήτηση"
              className="w-9 h-9 rounded-full flex items-center justify-center text-white/80 hover:bg-white/10"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <NavModeSwitch align="left" />
            <div className="ml-auto">
              <LanguageSwitcher />
            </div>
          </div>
        </nav>
      </div>

      </div>

      {/* TEMPORARY: επιλογή ρόλου για multi-seat μέλη προς το OC */}
      {showOcSeatModal && (
        <OcSeatChoiceModal
          seats={ocAccess.seats}
          onChoose={async (seat) => {
            try {
              await fetch('/api/oc/prefs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ seat }),
                keepalive: true,
              })
            } catch { /* non-fatal */ }
            setShowOcSeatModal(false)
            router.push('/oc')
          }}
          onDismiss={() => setShowOcSeatModal(false)}
        />
      )}

      <ConfirmationModal
        isOpen={isLogoutModalOpen}
        title="Αποσύνδεση"
        message="Είστε σίγουροι ότι θέλετε να αποσυνδεθείτε;"
        confirmText="Αποσύνδεση"
        cancelText="Ακύρωση"
        onConfirm={handleLogout}
        onCancel={() => setIsLogoutModalOpen(false)}
        variant="info"
      />
      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </header>
  )
}
