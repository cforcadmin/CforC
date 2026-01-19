'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LanguageSwitcher from './LanguageSwitcher'
import { useTheme } from './ThemeProvider'
import { useAuth } from './AuthProvider'
import ConfirmationModal from './ConfirmationModal'

interface NavigationProps {
  variant?: 'default' | 'members'
}

export default function Navigation({ variant = 'default' }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const { user, isAuthenticated, logout } = useAuth()
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => {
      // Detect if scrolled past hero section (approximately 25vh)
      const scrollPosition = window.scrollY
      setIsScrolled(scrollPosition > 150)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = async () => {
    await logout()
    setIsLogoutModalOpen(false)
  }

  const bgColor = variant === 'members' ? 'bg-[#F5F0EB] dark:bg-gray-800' : 'bg-coral dark:bg-gray-900'
  const bgOpacity = isScrolled ? (variant === 'members' ? 'bg-[#F5F0EB]/90 dark:bg-gray-800/90' : 'bg-coral/90 dark:bg-gray-900/90') : bgColor

  return (
    <nav className={`fixed ${isScrolled ? 'top-2' : 'top-0'} w-full z-50 ${isScrolled ? 'shadow-none' : 'shadow-sm dark:shadow-gray-700'} transition-all duration-300 ${isScrolled ? 'px-4' : ''}`}>
      <div className={`${bgOpacity} ${isScrolled ? 'rounded-2xl scale-90' : ''} transition-all duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <img
              src="/cforc_logo.svg"
              alt="Culture for Change"
              className="h-12 dark:invert"
            />
            <span className="text-[10px] font-semibold text-white/70 dark:text-gray-400 bg-white/10 dark:bg-gray-700/50 px-2 py-0.5 rounded-full">
              BETA
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className={`hidden md:flex items-center ${isAuthenticated ? 'space-x-4' : 'space-x-8'}`}>
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
              aria-label="Toggle dark mode"
            >
              {theme === 'light' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>
            <Link href="/about" className={`text-sm transition-all ${pathname === '/about' ? 'text-white dark:text-coral-light font-bold' : 'font-medium hover:text-white dark:text-gray-200 dark:hover:text-coral-light'}`}>
              ΣΧΕΤΙΚΑ ΜΕ ΕΜΑΣ
            </Link>
            <Link href="/activities" className={`text-sm transition-all ${pathname?.startsWith('/activities') ? 'text-white dark:text-coral-light font-bold' : 'font-medium hover:text-white dark:text-gray-200 dark:hover:text-coral-light'}`}>
              {isAuthenticated ? 'ΔΡΑΣΕΙΣ' : 'ΔΡΑΣΤΗΡΙΟΤΗΤΕΣ'}
            </Link>
            {isAuthenticated && (
              <Link href="/open-calls" className={`text-sm transition-all ${pathname === '/open-calls' ? 'text-white dark:text-coral-light font-bold' : 'font-medium hover:text-white dark:text-gray-200 dark:hover:text-coral-light'}`}>
                ΑΝΟΙΧΤΕΣ ΠΡΟΣΚΛΗΣΕΙΣ
              </Link>
            )}
            {!isAuthenticated && (
              <Link href="/participation" className={`text-sm transition-all ${pathname === '/participation' ? 'text-white dark:text-coral-light font-bold' : 'font-medium hover:text-white dark:text-gray-200 dark:hover:text-coral-light'}`}>
                ΣΥΜΜΕΤΟΧΗ
              </Link>
            )}
            <Link href="/members" className={`bg-white dark:bg-gray-700 text-charcoal dark:text-gray-200 ${isAuthenticated ? 'px-4' : 'px-6'} py-2 rounded-full text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors`}>
              {isAuthenticated ? 'ΜΕΛΗ' : 'ΕΥΡΕΣΗ ΜΕΛΩΝ'}
            </Link>
            {isAuthenticated ? (
              <>
                <Link href="/profile" className={`text-sm transition-all ${pathname === '/profile' ? 'text-white dark:text-coral-light font-bold' : 'font-medium hover:text-white dark:text-gray-200 dark:hover:text-coral-light'}`}>
                  ΠΡΟΦΙΛ
                </Link>
                <button
                  onClick={() => setIsLogoutModalOpen(true)}
                  className="text-sm font-medium hover:text-white dark:text-gray-200 dark:hover:text-coral-light transition-all"
                >
                  ΑΠΟΣΥΝΔΕΣΗ
                </button>
              </>
            ) : (
              <Link href="/login" className={`text-sm transition-all ${pathname === '/login' ? 'text-white dark:text-coral-light font-bold' : 'font-medium hover:text-white dark:text-gray-200 dark:hover:text-coral-light'}`}>
                ΣΥΝΔΕΣΗ
              </Link>
            )}
            <LanguageSwitcher />
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 dark:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className={`md:hidden ${bgColor} dark:bg-gray-800 border-t ${variant === 'members' ? 'border-gray-300 dark:border-gray-700' : 'border-coral-dark dark:border-gray-700'}`}>
          <div className="px-4 py-4 space-y-3">
            {/* Dark Mode Toggle - Mobile */}
            <button
              onClick={toggleTheme}
              className="flex items-center space-x-2 text-sm font-medium py-2"
            >
              {theme === 'light' ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  <span>ΣΚΟΥΡΟ ΘΕΜΑ</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span>ΑΝΟΙΧΤΟ ΘΕΜΑ</span>
                </>
              )}
            </button>
            <Link href="/about" className={`block text-sm py-2 transition-all ${pathname === '/about' ? 'text-white dark:text-coral-light font-bold' : 'font-medium hover:text-white dark:text-gray-200 dark:hover:text-coral-light'}`}>ΣΧΕΤΙΚΑ ΜΕ ΕΜΑΣ</Link>
            <Link href="/activities" className={`block text-sm py-2 transition-all ${pathname?.startsWith('/activities') ? 'text-white dark:text-coral-light font-bold' : 'font-medium hover:text-white dark:text-gray-200 dark:hover:text-coral-light'}`}>{isAuthenticated ? 'ΔΡΑΣΕΙΣ' : 'ΔΡΑΣΤΗΡΙΟΤΗΤΕΣ'}</Link>
            {isAuthenticated && (
              <Link href="/open-calls" className={`block text-sm py-2 transition-all ${pathname === '/open-calls' ? 'text-white dark:text-coral-light font-bold' : 'font-medium hover:text-white dark:text-gray-200 dark:hover:text-coral-light'}`}>ΑΝΟΙΧΤΕΣ ΠΡΟΣΚΛΗΣΕΙΣ</Link>
            )}
            {!isAuthenticated && (
              <Link href="/participation" className={`block text-sm py-2 transition-all ${pathname === '/participation' ? 'text-white dark:text-coral-light font-bold' : 'font-medium hover:text-white dark:text-gray-200 dark:hover:text-coral-light'}`}>ΣΥΜΜΕΤΟΧΗ</Link>
            )}
            <Link href="/members" className="block w-full bg-white dark:bg-gray-700 text-charcoal dark:text-gray-200 px-6 py-2 rounded-full text-sm font-medium text-center">
              {isAuthenticated ? 'ΜΕΛΗ' : 'ΕΥΡΕΣΗ ΜΕΛΩΝ'}
            </Link>
            {isAuthenticated ? (
              <>
                <Link href="/profile" className={`block text-sm py-2 transition-all ${pathname === '/profile' ? 'text-white dark:text-coral-light font-bold' : 'font-medium hover:text-white dark:text-gray-200 dark:hover:text-coral-light'}`}>ΠΡΟΦΙΛ</Link>
                <button
                  onClick={() => setIsLogoutModalOpen(true)}
                  className="block text-sm py-2 font-medium hover:text-white dark:text-gray-200 dark:hover:text-coral-light transition-all text-left"
                >
                  ΑΠΟΣΥΝΔΕΣΗ
                </button>
              </>
            ) : (
              <Link href="/login" className={`block text-sm py-2 transition-all ${pathname === '/login' ? 'text-white dark:text-coral-light font-bold' : 'font-medium hover:text-white dark:text-gray-200 dark:hover:text-coral-light'}`}>ΣΥΝΔΕΣΗ</Link>
            )}
            <div className="pt-2">
              <LanguageSwitcher />
            </div>
            </div>
          </div>
        )}
      </div>

      {/* Logout Confirmation Modal */}
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
    </nav>
  )
}
