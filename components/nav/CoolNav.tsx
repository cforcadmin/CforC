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
import NavModeSwitch from './NavModeSwitch'
import { NAV_ITEMS } from './navItems'

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

  const [isScrolled, setIsScrolled] = useState(false)
  const [railHover, setRailHover] = useState(false)
  const [partingKey, setPartingKey] = useState<string | null>(null)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)

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

  const items = NAV_ITEMS.filter(item => !(item.anonOnly && isAuthenticated))
  const expanded = !isScrolled || railHover || partingKey !== null

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
      {/* Πάνω γυάλινη μπάρα — μικραίνει στο scroll */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${isScrolled ? 'px-4 pt-2' : ''}`}>
        <div className={`menu-glass flex items-center gap-1.5 transition-all duration-300 ${isScrolled ? 'rounded-2xl h-12 px-3' : 'h-16 px-6'}`}
          style={isScrolled ? {} : { borderTopLeftRadius: 0, borderTopRightRadius: 0, borderLeftWidth: 0, borderRightWidth: 0, borderTopWidth: 0 }}>
          <Link href="/" className="flex items-center flex-shrink-0 mr-2">
            <img src="/cforc_logo.svg" alt="Culture for Change" className={`dark:invert header-logo transition-all duration-300 ${isScrolled ? 'h-7' : 'h-9'}`} />
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

          <div className="ml-auto flex items-center gap-2">
            {!isAuthenticated ? (
              <Link href="/login" className={`inline-flex items-center rounded-full bg-coral text-white text-[13px] font-bold tracking-widest whitespace-nowrap hover:bg-[#F07551] transition-all duration-300 ${isScrolled ? 'min-h-9 px-4' : 'min-h-10 px-5'}`}>
                ΣΥΝΔΕΣΗ
              </Link>
            ) : (
              <>
                <Link href="/profile" className={`inline-flex items-center rounded-full bg-coral text-white text-[13px] font-bold tracking-widest whitespace-nowrap hover:bg-[#F07551] transition-all duration-300 ${isScrolled ? 'min-h-9 px-4' : 'min-h-10 px-5'}`}>
                  Ο ΧΩΡΟΣ ΜΟΥ
                </Link>
                <button type="button" onClick={() => setIsLogoutModalOpen(true)} aria-label="Αποσύνδεση" title="Αποσύνδεση" className={iconBtn}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3-3H9m12 0l-3-3m3 3l-3 3" />
                  </svg>
                </button>
              </>
            )}
            <LanguageSwitcher />
            <AccessibilityButton size="small" />
          </div>
        </div>
      </header>

      {/* Οι κολόνες: δεξιά άκρη, πάνω από το περιεχόμενο */}
      <nav
        aria-label="Κύρια πλοήγηση"
        className="fixed right-0 z-40 flex items-stretch"
        style={{ top: isScrolled ? '3.5rem' : '4rem', bottom: 0 }}
        onMouseEnter={() => setRailHover(true)}
        onMouseLeave={() => setRailHover(false)}
      >
        {items.map((item, i) => {
          const active = item.key === 'about'
            ? ['/about', '/coordination-team', '/transparency', '/contact'].includes(pathname || '')
            : pathname?.startsWith(item.href)
          let transform = 'translateX(0)'
          if (partIdx >= 0) {
            if (i < partIdx) transform = 'translateX(-45vw)'
            else if (i > partIdx) transform = 'translateX(45vw)'
          }
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleColumnClick(item.key, item.href)}
              aria-current={active ? 'page' : undefined}
              className="cool-col"
              style={{
                backgroundColor: hexToRgba(item.hue, theme === 'dark' ? 0.4 : 0.6),
                borderLeft: `4px solid ${item.edge}`,
                width: expanded ? 'clamp(4.5rem, 7vw, 7rem)' : '1.1rem',
                opacity: partIdx >= 0 ? (i === partIdx ? 1 : 0) : expanded ? 1 : 0.5,
                transform,
              }}
            >
              <span
                className="cool-col-label"
                style={{ opacity: expanded ? 1 : 0 }}
              >
                {item.key === 'members' && isAuthenticated ? 'ΜΕΛΗ' : item.label}
              </span>
              {active && <span className="cool-col-dot" aria-hidden="true" />}
            </button>
          )
        })}
      </nav>

      {/* Ένδειξη κύλισης — μόνο στην κορυφή */}
      {!isScrolled && (
        <div className="fixed bottom-5 right-6 z-40 pointer-events-none flex flex-col items-center gap-1 text-charcoal dark:text-gray-200" aria-hidden="true">
          <span className="text-[10px] font-bold tracking-widest">ΚΥΛΙΣΕ</span>
          <svg className="w-5 h-5 animate-bounce" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
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
