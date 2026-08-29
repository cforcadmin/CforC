'use client'

// Cool στυλ (σχέδιο 1a «Κάθετες κολόνες» + προσαρμογές Γιώργου):
// - Οι ενότητες ως κάθετες κολόνες liquid-glass στη ΔΕΞΙΑ άκρη, ΣΕ ΟΛΕΣ τις
//   σελίδες — μόνο αποχρώσεις πορτοκαλί, με συμπληρωματικό περίγραμμα ΜΟΝΟ
//   στην αριστερή πλευρά κάθε κολόνας (hue/edge από το navItems)
// - Στην κορυφή: ένδειξη «κύλισε»· στο scroll οι κολόνες συμπιέζονται δεξιά
//   στο 50% ορατότητας· hover τις ξανανοίγει· κλικ «ανοίγει» τις διπλανές
//   (αριστερές προς τα αριστερά, δεξιές προς τα δεξιά) και μετά πλοηγεί
// - Πάνω: μόνιμη γυάλινη μπάρα (Α-συστάδα όπως στο 1b, αναζήτηση, θέμα,
//   στυλ, Σύνδεση, μετάφραση, προσβασιμότητα) που μικραίνει στο scroll
// Desktop μόνο — στο κινητό ο dispatcher δείχνει το Modern header.

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import LanguageSwitcher from '../LanguageSwitcher'
import { useTheme } from '../ThemeProvider'
import { useAuth } from '../AuthProvider'
import { useTextSize } from '../TextSizeProvider'
import ConfirmationModal from '../ConfirmationModal'
import { AccessibilityButton } from '../AccessibilityMenu'
import GlobalSearch from '../GlobalSearch'
import { useOcAccess } from '../useOcAccess'
import OcSeatChoiceModal from '../oc/OcSeatChoiceModal'
import NavModeSwitch from './NavModeSwitch'
import { NAV_ITEMS, mapLabel } from './navItems'
import { getFeaturedProjects } from '@/lib/strapi'
import type { Project, StrapiResponse } from '@/lib/types'
import { useTranslation } from '../TranslationProvider'

// Διαχωριστικές γραμμές: διαφορετική απόχρωση γκρι ανά κολόνα — σκούρες
// στο φωτεινό θέμα, ανοιχτές στο σκοτεινό, πάντα ορατές πάνω στο πορτοκαλί
const EDGE_GRAYS_LIGHT = ['#0f0f0f', '#1f1f1f', '#333333', '#474747', '#5b5b5b', '#6f6f6f', '#838383']
const EDGE_GRAYS_DARK = ['#ffffff', '#f5f5f5', '#dedede', '#c7c7c7', '#b0b0b0', '#999999', '#828282']
/* Δ3: οι γραμμές του flyout περνούν από τους τόνους της ράγας — όχι ένα
   επίπεδο χρώμα αλλά η ίδια πορτοκαλί κλίμακα της παλέτας */
const FLY_TONES = ['#FFB199', '#FF9E80', '#FF8B6A', '#F07551']

function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

export default function CoolNav() {
  const router = useRouter()
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  const { textSize, setTextSize } = useTextSize()
  const { isAuthenticated, logout } = useAuth()
  const { lang } = useTranslation()
  const [featuredProjects, setFeaturedProjects] = useState<Project[]>([])

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

  // Δ3 (30/8): δεύτερο επίπεδο στο dock — γυάλινο flyout αριστερά της
  // κολόνας, ίδια υπο-στοιχεία με τα dropdowns των άλλων στυλ
  const SUBS_ABOUT = [
    { label: 'Το δίκτυο', href: '/about' },
    { label: 'Ομάδα Συντονισμού', href: '/coordination-team' },
    { label: 'Διαφάνεια', href: '/transparency' },
    { label: 'Επικοινωνία', href: '/contact' },
  ]
  const subsFor = (key: string): Array<{ label: string; href: string }> =>
    key === 'about'
      ? SUBS_ABOUT
      : key === 'projects'
        ? featuredProjects.map(p => ({ label: p.title, href: `/projects/${p.slug}` }))
        : []

  // UI-gating μόνο — το πραγματικό φράγμα του /oc το επιβάλλει ο server
  const ocAccess = useOcAccess(isAuthenticated)
  const [showOcSeatModal, setShowOcSeatModal] = useState(false)

  const [isScrolled, setIsScrolled] = useState(false)
  const [railHover, setRailHover] = useState(false)
  // Χειροκίνητη εντολή από Escape: true/false υπερισχύει του αυτόματου,
  // null = αυτόματη συμπεριφορά. Μηδενίζεται σε κάθε αλλαγή σελίδας.
  const [manualExpand, setManualExpand] = useState<boolean | null>(null)
  const [partingKey, setPartingKey] = useState<string | null>(null)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  // Πρώτη επαφή με το Cool: μια φορά ανά browser, εξήγηση του dock + Escape
  const [showIntro, setShowIntro] = useState(false)
  useEffect(() => {
    try {
      if (localStorage.getItem('cforc-cool-intro-seen') !== '1') setShowIntro(true)
    } catch {}
  }, [])
  const dismissIntro = () => {
    setShowIntro(false)
    try { localStorage.setItem('cforc-cool-intro-seen', '1') } catch {}
  }

  // Όσο το Cool είναι ενεργό, το <html> φέρει τη σημαία nav-cool: το CSS
  // των hero ανεβάζει την κάρτα στην πραγματική κορυφή (δεν υπάρχει
  // full-width header να καλύψει τη ζώνη των 5rem).
  useEffect(() => {
    document.documentElement.classList.add('nav-cool')
    return () => document.documentElement.classList.remove('nav-cool')
  }, [])

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 80)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Cmd+K όπως στα άλλα δύο στυλ
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

  useEffect(() => { setManualExpand(null) }, [pathname])

  // Το ανοιχτό καλωσόρισμα της αρχικής παίζει ΜΙΑ φορά ανά browser — στις
  // επανεπισκέψεις το dock ξεκινά μαζεμένο (29/8). Προεπιλογή «το έχει δει»
  // ώστε ο επαναλαμβανόμενος επισκέπτης να μη βλέπει αναλαμπή ανοίγματος.
  const [showcaseSeen, setShowcaseSeen] = useState(true)
  useEffect(() => {
    try {
      if (localStorage.getItem('cforc-home-showcase-seen') !== '1') {
        setShowcaseSeen(false)
        localStorage.setItem('cforc-home-showcase-seen', '1')
      }
    } catch { /* κρατά τη μαζεμένη προεπιλογή */ }
  }, [])

  const items = NAV_ITEMS.filter(item => !(item.anonOnly && isAuthenticated))
  // Το πλήρες άνοιγμα στην κορυφή είναι το «καλωσόρισμα» της ΑΡΧΙΚΗΣ μόνο
  // (η αρχική πρόθεση του 1a). Στις σελίδες εργασίας το dock μένει πάντα
  // λεπτό και ανοίγει μόνο με hover/focus — αλλιώς κάθεται πάνω στη δουλειά.
  const isHome = pathname === '/'
  const autoExpanded = isHome && !isScrolled && !showcaseSeen
  const expanded = partingKey !== null || railHover || (manualExpand ?? autoExpanded)
  // Σε σελίδες με κάρτα-σκηνή το dock αγκυρώνεται ΠΑΝΤΑ κάτω από τις
  // φούσκες (4.25rem): ανοιχτό φτάνει ως το κάτω χείλος της κάρτας τους
  // (βίντεο 68vh στην αρχική, εικόνα 52vh στην οικογένεια Σχετικά) και
  // μαζεμένο κονταίνει ΕΠΙ ΤΟΠΟΥ — όχι τηλεμεταφορά στο κέντρο (29/8).
  // Οι υπόλοιπες σελίδες κρατούν το κάθετο κεντράρισμα.
  const HERO_CARD_VH: Record<string, string> = {
    '/': '68vh',
    '/about': '52vh', '/coordination-team': '52vh', '/transparency': '52vh', '/contact': '52vh',
    '/terms': '52vh', '/privacy': '52vh', '/cookies': '52vh', '/accessibility': '52vh',
    '/news': '52vh',
    '/projects': '52vh',
    '/members': '52vh',
    '/participation': '52vh',
    '/login': '52vh',
    '/profile': '40vh',
  }
  const heroVh = HERO_CARD_VH[pathname || '']

  // Escape: αν το dock είναι ανοιχτό κλείνει, αν είναι κλειστό ανοίγει.
  // Αδρανές όσο είναι ανοιχτά αναζήτηση/modal (εκεί ο Escape είναι δικός τους).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || isSearchOpen || isLogoutModalOpen) return
      if (showIntro) { dismissIntro(); return }
      setManualExpand(!expanded)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, isSearchOpen, isLogoutModalOpen, showIntro])

  // Κλικ: οι αριστερές κολόνες φεύγουν αριστερά, οι δεξιές δεξιά — μετά πλοήγηση
  const handleColumnClick = (key: string, href: string) => {
    if (partingKey) return
    setPartingKey(key)
    setTimeout(() => {
      router.push(href)
      // Επαναφορά ώστε στην επιστροφή (bfcache/SPA) το μενού να είναι ακέραιο
      setTimeout(() => setPartingKey(null), 400)
    }, 380)
  }

  const A_SIZES = [
    { size: 'large' as const, fontSize: 17, label: 'Μεγάλο μέγεθος κειμένου' },
    { size: 'medium' as const, fontSize: 15, label: 'Μεσαίο μέγεθος κειμένου' },
    { size: 'small' as const, fontSize: 13, label: 'Κανονικό μέγεθος κειμένου' },
  ]
  const renderA = ({ size, fontSize, label }: (typeof A_SIZES)[number]) => (
    <button
      key={size}
      type="button"
      onClick={() => setTextSize(size)}
      aria-label={label}
      aria-pressed={textSize === size}
      className={`notranslate w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 transition-colors ${
        textSize === size
          ? 'bg-charcoal text-white dark:bg-white dark:text-black'
          : 'text-charcoal dark:text-gray-200 hover:bg-black/10 dark:hover:bg-white/10'
      }`}
      style={{ fontSize: `${fontSize}px` }}
    >
      A
    </button>
  )

  const iconBtn = 'w-9 h-9 rounded-full flex items-center justify-center text-charcoal dark:text-gray-200 hover:bg-black/10 dark:hover:bg-white/10 transition-colors'
  const partIdx = partingKey ? items.findIndex(i => i.key === partingKey) : -1

  return (
    <>
      {/* Δύο πλωτές γυάλινες φούσκες αντί για ολόκληρη γραμμή:
          αριστερά λογότυπο + εργαλεία, δεξιά λογαριασμός + γλώσσα +
          προσβασιμότητα. Στο scroll μαζεύουν ελαφρά (scale). */}
      <header className="fixed top-3 left-4 right-4 z-50 flex items-start justify-between gap-3 pointer-events-none">
        <div
          className={`menu-glass glass-rim rounded-full flex items-center gap-1 pl-2 pr-2.5 py-1.5 pointer-events-auto transition-all duration-300 ${isScrolled ? 'scale-90' : ''}`}
          style={{ transformOrigin: 'left top' }}
        >
          <Link href="/" className="flex items-center flex-shrink-0 mr-1">
            <img src="/cforc_logo.svg" alt="Culture for Change" className="h-8 dark:invert header-logo" />
          </Link>

          {/* Α-συστάδα — συμπτυγμένη όπως στο Modern */}
          <div className="a-cluster" role="group" aria-label="Μέγεθος κειμένου">
            <div className="a-nest">{A_SIZES.slice(0, 2).map(renderA)}</div>
            {renderA(A_SIZES[2])}
          </div>

          <button type="button" onClick={() => setIsSearchOpen(true)} aria-label="Αναζήτηση (Cmd+K)" className={iconBtn}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          <button type="button" onClick={toggleTheme} aria-label="Εναλλαγή θέματος" className={iconBtn}>
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

          <NavModeSwitch align="left" buttonClassName={iconBtn} />
        </div>

        <div
          className={`menu-glass glass-rim rounded-full flex items-center gap-1.5 px-2.5 py-1.5 pointer-events-auto transition-all duration-300 ${isScrolled ? 'scale-90' : ''}`}
          style={{ transformOrigin: 'right top' }}
        >
          {/* key: remount των auth στοιχείων όταν λυθεί το session, ώστε το
              Google Translate να τα μεταφράσει (φρέσκο subtree)· ΕΚΤΟΣ του
              LanguageSwitcher — φιλοξενεί το gadget του GT */}
          <div key={`auth-${isAuthenticated ? 'in' : 'out'}-${ocAccess.isBoard ? 'oc' : ''}`} className="contents">
          {!isAuthenticated ? (
            <Link href="/login" className="inline-flex items-center min-h-9 px-4 rounded-full bg-coral text-white text-[13px] font-bold tracking-widest whitespace-nowrap hover:bg-[#F07551] transition-colors">
              ΣΥΝΔΕΣΗ
            </Link>
          ) : (
            <>
              <Link href="/profile" className="inline-flex items-center min-h-9 px-4 rounded-full bg-coral text-white text-[13px] font-bold tracking-widest whitespace-nowrap hover:bg-[#F07551] transition-colors">
                Ο ΧΩΡΟΣ ΜΟΥ
              </Link>
              {ocAccess.isBoard && (
                <Link
                  href="/oc"
                  onClick={(e) => {
                    // TEMPORARY: multi-seat μέλη διαλέγουν ρόλο σε κάθε είσοδο
                    if (ocAccess.seats.length > 1) {
                      e.preventDefault()
                      setShowOcSeatModal(true)
                    }
                  }}
                  className={`notranslate inline-flex items-center min-h-9 px-3.5 rounded-full text-[13px] font-bold tracking-widest whitespace-nowrap border transition-colors ${
                    pathname?.startsWith('/oc')
                      ? 'bg-coral text-white border-coral'
                      : 'border-charcoal/40 text-charcoal dark:border-gray-400 dark:text-gray-200 hover:bg-black/10 dark:hover:bg-white/10'
                  }`}
                >
                  OC
                </Link>
              )}
              <button type="button" onClick={() => setIsLogoutModalOpen(true)} aria-label="Αποσύνδεση" title="Αποσύνδεση" className={iconBtn}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3-3H9m12 0l-3-3m3 3l-3 3" />
                </svg>
              </button>
            </>
          )}
          </div>
          <LanguageSwitcher />
          <AccessibilityButton size="small" />
        </div>
      </header>

      {/* Οι κολόνες: δεξιά άκρη, πάνω από το περιεχόμενο */}
      {/* Κάθετα κεντραρισμένο dock: αναπνέει πάνω και κάτω, δεν πιάνει
          ποτέ τις γωνίες — τα πλωτά κουμπιά (κορυφή/σχόλια) μένουν δικά τους */}
      <nav
        aria-label="Κύρια πλοήγηση"
        className={`cool-rail fixed right-0 z-40 flex items-stretch ${heroVh ? '' : 'top-1/2 -translate-y-1/2'}`}
        style={heroVh
          ? { top: '4.25rem', height: expanded ? `calc(${heroVh} - 3.5rem)` : '38vh' }
          : { height: expanded ? '64vh' : '42vh' }}
        onMouseEnter={() => setRailHover(true)}
        onMouseLeave={() => setRailHover(false)}
        onFocus={() => setRailHover(true)}
        onBlur={() => setRailHover(false)}
      >
        {items.map((item, i) => {
          const active = item.href === '/'
            ? pathname === '/'
            : item.key === 'about'
              ? ['/about', '/coordination-team', '/transparency', '/contact'].includes(pathname || '')
              : pathname?.startsWith(item.href)
          let transform = 'translateX(0)'
          if (partIdx >= 0) {
            if (i < partIdx) transform = 'translateX(-45vw)'
            else if (i > partIdx) transform = 'translateX(45vw)'
          }
          const subs = subsFor(item.key)
          return (
            <div
              key={item.key}
              className="cool-col"
              style={{
                // Στο σκοτεινό το 0.4 πάνω σε σχεδόν μαύρο έδινε λασπωμένο καφέ —
                // το πορτοκαλί πρέπει να κυριαρχεί στο μείγμα για να διαβάζεται
                backgroundColor: hexToRgba(item.hue, theme === 'dark' ? 0.8 : 0.6),
                borderRadius: i === 0 ? '1.25rem 0 0 1.25rem' : undefined,
                borderLeftColor: (theme === 'dark' ? EDGE_GRAYS_DARK : EDGE_GRAYS_LIGHT)[i % EDGE_GRAYS_LIGHT.length],
                width: expanded ? 'clamp(4.5rem, 7vw, 7rem)' : '1.1rem',
                opacity: partIdx >= 0 ? (i === partIdx ? 1 : 0) : expanded ? 1 : 0.5,
                transform,
              }}
            >
              <button
                type="button"
                onClick={() => handleColumnClick(item.key, item.href)}
                aria-current={active ? 'page' : undefined}
                className="cool-col-hit"
              >
                <span
                  className="cool-col-label"
                  style={{ opacity: expanded ? 1 : 0 }}
                >
                  {item.key === 'members' && isAuthenticated
                    ? 'ΜΕΛΗ'
                    : item.key === 'map'
                      ? <span className="notranslate">{mapLabel(lang)}</span>
                      : item.label}
                </span>
              </button>
              {/* Δ3: flyout στο hover/focus της κολόνας — το κενό ως το πάνελ
                  είναι padding ΜΕΣΑ στη ζώνη hover, δεν «χάνεται» το μενού */}
              {expanded && subs.length > 0 && (
                <div className="cool-fly">
                  {/* Κάθε γραμμή με δικό της τόνο της παλέτας + γκρι
                      διαχωριστικό, όπως οι κολόνες της ράγας */}
                  <div className="cool-fly-panel">
                    {subs.map((sub, si) => (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        style={{
                          backgroundColor: hexToRgba(FLY_TONES[si % FLY_TONES.length], theme === 'dark' ? 0.9 : 0.85),
                          borderTop: si > 0
                            ? `3px solid ${(theme === 'dark' ? EDGE_GRAYS_DARK : EDGE_GRAYS_LIGHT)[si % EDGE_GRAYS_LIGHT.length]}`
                            : undefined,
                        }}
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {active && <span className="cool-col-dot" aria-hidden="true" />}
            </div>
          )
        })}
      </nav>


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

      {/* Πρώτη φορά στο Cool: πώς δουλεύει το μενού */}
      {showIntro && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={dismissIntro} aria-hidden="true" />
          <div role="dialog" aria-modal="true" aria-labelledby="cool-intro-title" className="relative menu-glass-dense glass-rim rounded-3xl max-w-md w-full p-8">
            <h2 id="cool-intro-title" className="text-xl font-bold text-charcoal dark:text-gray-100 mb-4">
              Καλωσήρθες στο στυλ <span className="notranslate">Cool</span>
            </h2>
            <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              <p>
                Το μενού ζει στις χρωματιστές κολόνες στη δεξιά άκρη — άνοιξέ το
                περνώντας το ποντίκι από πάνω και πάτησε μια ενότητα για να πας εκεί.
              </p>
              <p className="flex items-center gap-2">
                <kbd className="px-2 py-1 rounded-lg bg-charcoal/10 dark:bg-white/15 border border-charcoal/20 dark:border-white/30 font-mono text-xs font-bold text-charcoal dark:text-white">Esc</kbd>
                <span>κρύβει ή εμφανίζει το μενού όποτε το θελήσεις.</span>
              </p>
            </div>
            <button
              type="button"
              onClick={dismissIntro}
              className="mt-6 w-full px-6 py-3 bg-coral hover:bg-[#F07551] text-white font-medium rounded-full transition-colors"
            >
              Το κατάλαβα
            </button>
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
      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  )
}
