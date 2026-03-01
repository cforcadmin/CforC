'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import LanguageSwitcher from './LanguageSwitcher'
import { useTheme } from './ThemeProvider'
import { useAuth } from './AuthProvider'
import ConfirmationModal from './ConfirmationModal'
import TextSizeToggle from './TextSizeToggle'
import { useAccessibility } from './AccessibilityProvider'
import { AccessibilityButton } from './AccessibilityMenu'
import { getFeaturedProjects } from '@/lib/strapi'
import type { Project, StrapiResponse } from '@/lib/types'

interface NavigationProps {
  variant?: 'default' | 'members'
}

export default function Navigation({ variant = 'default' }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [projectsDropdownOpen, setProjectsDropdownOpen] = useState(false)
  const [mobileProjectsExpanded, setMobileProjectsExpanded] = useState(false)
  const [aboutDropdownOpen, setAboutDropdownOpen] = useState(false)
  const [mobileAboutExpanded, setMobileAboutExpanded] = useState(false)
  const [featuredProjects, setFeaturedProjects] = useState<Project[]>([])
  const { theme, toggleTheme } = useTheme()
  const { user, isAuthenticated, logout } = useAuth()
  const { setIsMenuOpen } = useAccessibility()
  const pathname = usePathname()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const dropdownItemsRef = useRef<(HTMLAnchorElement | null)[]>([])
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const aboutDropdownRef = useRef<HTMLDivElement>(null)
  const aboutDropdownItemsRef = useRef<(HTMLAnchorElement | null)[]>([])
  const aboutDropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // TODO: Remove testing condition — make permanently visible
  const showProjects = pathname?.startsWith('/projects')

  useEffect(() => {
    const handleScroll = () => {
      // Detect if scrolled past hero section (approximately 25vh)
      const scrollPosition = window.scrollY
      setIsScrolled(scrollPosition > 150)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Fetch featured projects for dropdown when on /projects routes
  useEffect(() => {
    if (!showProjects) return
    async function fetchProjects() {
      try {
        const response: StrapiResponse<Project[]> = await getFeaturedProjects()
        setFeaturedProjects(response.data)
      } catch (err) {
        console.error('Error fetching featured projects:', err)
      }
    }
    fetchProjects()
  }, [showProjects])

  // Open/close dropdown with delay to prevent flickering
  const openDropdown = useCallback(() => {
    if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current)
    setProjectsDropdownOpen(true)
  }, [])

  const closeDropdown = useCallback(() => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setProjectsDropdownOpen(false)
    }, 150)
  }, [])

  // Keyboard navigation for dropdown
  const handleDropdownKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!projectsDropdownOpen && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
      e.preventDefault()
      setProjectsDropdownOpen(true)
      setTimeout(() => dropdownItemsRef.current[0]?.focus(), 50)
      return
    }
    if (!projectsDropdownOpen) return

    const items = dropdownItemsRef.current.filter(Boolean) as HTMLAnchorElement[]
    const currentIndex = items.findIndex(item => item === document.activeElement)

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        items[(currentIndex + 1) % items.length]?.focus()
        break
      case 'ArrowUp':
        e.preventDefault()
        items[(currentIndex - 1 + items.length) % items.length]?.focus()
        break
      case 'Escape':
        e.preventDefault()
        setProjectsDropdownOpen(false)
        dropdownRef.current?.querySelector('a')?.focus()
        break
      case 'Tab':
        setProjectsDropdownOpen(false)
        break
    }
  }, [projectsDropdownOpen])

  // About dropdown handlers
  const openAboutDropdown = useCallback(() => {
    if (aboutDropdownTimeoutRef.current) clearTimeout(aboutDropdownTimeoutRef.current)
    setAboutDropdownOpen(true)
  }, [])

  const closeAboutDropdown = useCallback(() => {
    aboutDropdownTimeoutRef.current = setTimeout(() => {
      setAboutDropdownOpen(false)
    }, 150)
  }, [])

  const handleAboutDropdownKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!aboutDropdownOpen && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
      e.preventDefault()
      setAboutDropdownOpen(true)
      setTimeout(() => aboutDropdownItemsRef.current[0]?.focus(), 50)
      return
    }
    if (!aboutDropdownOpen) return

    const items = aboutDropdownItemsRef.current.filter(Boolean) as HTMLAnchorElement[]
    const currentIndex = items.findIndex(item => item === document.activeElement)

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        items[(currentIndex + 1) % items.length]?.focus()
        break
      case 'ArrowUp':
        e.preventDefault()
        items[(currentIndex - 1 + items.length) % items.length]?.focus()
        break
      case 'Escape':
        e.preventDefault()
        setAboutDropdownOpen(false)
        aboutDropdownRef.current?.querySelector('a')?.focus()
        break
      case 'Tab':
        setAboutDropdownOpen(false)
        break
    }
  }, [aboutDropdownOpen])

  // About section sub-pages
  const aboutSubPages = [
    { label: 'Το δίκτυο', href: '/about' },
    { label: 'Ομάδα Συντονισμού', href: '/coordination-team' },
    { label: 'Διαφάνεια', href: '/transparency' },
  ]

  const isAboutActive = pathname === '/about' || pathname === '/coordination-team' || pathname === '/transparency'

  const handleLogout = async () => {
    await logout()
    setIsLogoutModalOpen(false)
  }

  // Helper to get image URL from Strapi media field
  const getImageUrl = (image: Project['cover_image']): string | null => {
    if (!image) return null
    if (Array.isArray(image) && image.length > 0) {
      const url = image[0].url
      return url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${url}`
    }
    if (typeof image === 'object' && !Array.isArray(image) && 'url' in image) {
      const url = image.url
      return url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${url}`
    }
    return null
  }

  const bgColor = variant === 'members' ? 'bg-[#F5F0EB] dark:bg-gray-800' : 'bg-coral dark:bg-gray-900'
  const bgOpacity = isScrolled ? (variant === 'members' ? 'bg-[#F5F0EB]/90 dark:bg-gray-800/90' : 'bg-coral/90 dark:bg-gray-900/90') : bgColor

  return (
    <header className={`fixed ${isScrolled ? 'top-2' : 'top-0'} w-full z-50 ${isScrolled ? 'shadow-none' : 'shadow-sm dark:shadow-gray-700'} transition-all duration-300 ${isScrolled ? 'px-4' : ''}`}>
      <div className={`${bgOpacity} ${isScrolled ? 'rounded-2xl scale-90' : ''} ${isScrolled ? (variant === 'members' ? 'ring-2 ring-coral' : 'ring-2 ring-black dark:ring-white') : ''} transition-all duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <img
              src="/cforc_logo.svg"
              alt="Culture for Change"
              className="h-12 dark:invert header-logo"
            />
            {/* Home icon fallback when images are hidden */}
            <span className="home-icon-fallback items-center gap-2 text-charcoal dark:text-white">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="font-bold text-sm">ΑΡΧΙΚΗ</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className={`hidden md:flex items-center ${isAuthenticated ? 'space-x-4' : 'space-x-8'}`}>
            {/* Text Size Toggle */}
            <TextSizeToggle variant={variant} />
            {/* Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
              aria-label="Toggle dark mode"
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
            {/* Navigation links wrapped in nav element */}
            <nav aria-label="Κύρια πλοήγηση" className={`flex items-center ${isAuthenticated ? 'space-x-4' : 'space-x-8'}`}>
              {/* About Dropdown */}
              <div
                ref={aboutDropdownRef}
                className="relative inline-flex items-center"
                onMouseEnter={openAboutDropdown}
                onMouseLeave={closeAboutDropdown}
                onKeyDown={handleAboutDropdownKeyDown}
              >
                <Link
                  href="/about"
                  className={`text-sm transition-all inline-flex items-center gap-1 ${isAboutActive ? 'text-white dark:text-coral-light font-bold' : 'font-medium hover:text-white dark:text-gray-200 dark:hover:text-coral-light'}`}
                  aria-haspopup="true"
                  aria-expanded={aboutDropdownOpen}
                >
                  ΣΧΕΤΙΚΑ ΜΕ ΕΜΑΣ
                  <svg className={`w-3 h-3 transition-transform ${aboutDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </Link>
                {aboutDropdownOpen && (
                  <div
                    role="menu"
                    aria-label="Σχετικά με εμάς"
                    className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50"
                  >
                    {aboutSubPages.map((item, index) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        role="menuitem"
                        ref={(el) => { aboutDropdownItemsRef.current[index] = el }}
                        className={`block px-4 py-3 text-sm transition-colors focus:outline-none ${
                          pathname === item.href
                            ? 'text-coral dark:text-coral-light font-bold bg-gray-50 dark:bg-gray-700'
                            : 'text-charcoal dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700'
                        }`}
                        onClick={() => setAboutDropdownOpen(false)}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <Link href="/activities" className={`text-sm transition-all ${pathname?.startsWith('/activities') ? 'text-white dark:text-coral-light font-bold' : 'font-medium hover:text-white dark:text-gray-200 dark:hover:text-coral-light'}`}>
                ΔΡΑΣΕΙΣ
              </Link>
              {/* TODO: Remove testing condition — make permanently visible */}
              {showProjects && (
                <div
                  ref={dropdownRef}
                  className="relative inline-flex items-center"
                  onMouseEnter={openDropdown}
                  onMouseLeave={closeDropdown}
                  onKeyDown={handleDropdownKeyDown}
                >
                  <Link
                    href="/projects"
                    className={`text-sm transition-all inline-flex items-center gap-1 ${pathname?.startsWith('/projects') ? 'text-white dark:text-coral-light font-bold' : 'font-medium hover:text-white dark:text-gray-200 dark:hover:text-coral-light'}`}
                    aria-haspopup="true"
                    aria-expanded={projectsDropdownOpen}
                  >
                    ΕΡΓΑ
                    <svg className={`w-3 h-3 transition-transform ${projectsDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </Link>
                  {projectsDropdownOpen && featuredProjects.length > 0 && (
                    <div
                      role="menu"
                      aria-label="Έργα"
                      className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50"
                    >
                      {featuredProjects.map((project, index) => {
                        const imgUrl = getImageUrl(project.cover_image)
                        return (
                          <Link
                            key={project.id}
                            href={`/projects/${project.slug}`}
                            role="menuitem"
                            ref={(el) => { dropdownItemsRef.current[index] = el }}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none"
                            onClick={() => setProjectsDropdownOpen(false)}
                          >
                            {imgUrl ? (
                              <Image
                                src={imgUrl}
                                alt={project.title}
                                width={48}
                                height={48}
                                className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-coral/20 dark:bg-coral/10 flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6 text-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                                </svg>
                              </div>
                            )}
                            <div className="min-w-0 relative group/navtitle">
                              <p
                                className="text-sm font-bold text-charcoal dark:text-gray-100 truncate"
                                onMouseEnter={(e) => {
                                  const el = e.currentTarget
                                  const tooltip = el.nextElementSibling as HTMLElement
                                  if (tooltip) {
                                    tooltip.style.display = el.scrollWidth > el.clientWidth ? '' : 'none'
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  const tooltip = e.currentTarget.nextElementSibling as HTMLElement
                                  if (tooltip) tooltip.style.display = 'none'
                                }}
                              >
                                {project.title}
                              </p>
                              <div className="absolute bottom-full left-0 mb-2 z-[60] pointer-events-none" style={{ display: 'none' }}>
                                <div className="bg-white dark:bg-gray-900 text-charcoal dark:text-gray-200 text-sm rounded-lg px-3 py-2 shadow-lg border border-black dark:border-white max-w-xs font-normal">
                                  {project.title}
                                </div>
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
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
                    Ο ΧΩΡΟΣ ΜΟΥ
                  </Link>
                  <button
                    type="button"
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
            </nav>
            <LanguageSwitcher />
            {/* Accessibility Button - appears when scrolled */}
            <div className={`transition-all duration-300 flex items-center ${isScrolled ? 'opacity-100 scale-100 ml-4' : 'opacity-0 scale-0 w-0 ml-0 overflow-hidden'}`}>
              <AccessibilityButton size="small" />
            </div>
          </div>

          {/* Mobile menu button with accessibility button */}
          <div className="md:hidden flex items-center gap-3">
            {/* Accessibility Button - appears when scrolled (mobile) */}
            <div className={`transition-all duration-300 flex items-center ${isScrolled ? 'opacity-100 scale-100' : 'opacity-0 scale-0 w-0 overflow-hidden'}`}>
              <AccessibilityButton size="small" />
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 dark:text-gray-200"
              aria-label={isOpen ? 'Κλείσιμο μενού' : 'Άνοιγμα μενού'}
              aria-expanded={isOpen}
              aria-controls="mobile-menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
          </div>
        </div>

        {/* Mobile menu - always rendered for aria-controls, hidden when closed */}
        <div
          id="mobile-menu"
          className={`md:hidden ${bgColor} dark:bg-gray-800 border-t ${variant === 'members' ? 'border-gray-300 dark:border-gray-700' : 'border-coral-dark dark:border-gray-700'} ${isOpen ? '' : 'hidden'}`}
        >
          <div className="px-4 py-4 space-y-3">
            {/* Text Size Toggle - Mobile */}
            <div className="flex items-center space-x-2 py-2">
              <span className="text-sm font-medium">ΜΕΓΕΘΟΣ ΚΕΙΜΕΝΟΥ</span>
              <TextSizeToggle variant={variant} />
            </div>
            {/* Dark Mode Toggle - Mobile */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center space-x-2 text-sm font-medium py-2"
              aria-label={theme === 'light' ? 'Ενεργοποίηση σκούρου θέματος' : 'Ενεργοποίηση ανοιχτού θέματος'}
            >
              {theme === 'light' ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  <span>ΣΚΟΥΡΟ ΘΕΜΑ</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span>ΑΝΟΙΧΤΟ ΘΕΜΑ</span>
                </>
              )}
            </button>
            {/* Navigation links wrapped in nav element */}
            <nav aria-label="Κύρια πλοήγηση κινητού" className="space-y-3">
              {/* About expandable section - Mobile */}
              <div>
                <button
                  type="button"
                  onClick={() => setMobileAboutExpanded(!mobileAboutExpanded)}
                  className={`flex items-center justify-between w-full text-sm py-2 transition-all ${isAboutActive ? 'text-white dark:text-coral-light font-bold' : 'font-medium hover:text-white dark:text-gray-200 dark:hover:text-coral-light'}`}
                  aria-expanded={mobileAboutExpanded}
                >
                  <Link href="/about" onClick={(e) => { e.stopPropagation(); setIsOpen(false) }}>ΣΧΕΤΙΚΑ ΜΕ ΕΜΑΣ</Link>
                  <svg className={`w-4 h-4 transition-transform ${mobileAboutExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {mobileAboutExpanded && (
                  <div className="pl-4 space-y-1 pb-2">
                    {aboutSubPages.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`block text-sm py-1.5 transition-colors ${
                          pathname === item.href
                            ? 'text-white dark:text-coral-light font-medium'
                            : 'text-gray-200 hover:text-white dark:text-gray-400 dark:hover:text-coral-light'
                        }`}
                        onClick={() => setIsOpen(false)}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <Link href="/activities" className={`block text-sm py-2 transition-all ${pathname?.startsWith('/activities') ? 'text-white dark:text-coral-light font-bold' : 'font-medium hover:text-white dark:text-gray-200 dark:hover:text-coral-light'}`}>ΔΡΑΣΕΙΣ</Link>
              {/* TODO: Remove testing condition — make permanently visible */}
              {showProjects && (
                <div>
                  <button
                    type="button"
                    onClick={() => setMobileProjectsExpanded(!mobileProjectsExpanded)}
                    className={`flex items-center justify-between w-full text-sm py-2 transition-all ${pathname?.startsWith('/projects') ? 'text-white dark:text-coral-light font-bold' : 'font-medium hover:text-white dark:text-gray-200 dark:hover:text-coral-light'}`}
                    aria-expanded={mobileProjectsExpanded}
                  >
                    <Link href="/projects" onClick={(e) => { e.stopPropagation(); setIsOpen(false) }}>ΕΡΓΑ</Link>
                    <svg className={`w-4 h-4 transition-transform ${mobileProjectsExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {mobileProjectsExpanded && featuredProjects.length > 0 && (
                    <div className="pl-4 space-y-1 pb-2">
                      {featuredProjects.map((project) => (
                        <Link
                          key={project.id}
                          href={`/projects/${project.slug}`}
                          className="block text-sm py-1.5 text-gray-200 hover:text-white dark:text-gray-400 dark:hover:text-coral-light transition-colors"
                          onClick={() => setIsOpen(false)}
                        >
                          {project.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {!isAuthenticated && (
                <Link href="/participation" className={`block text-sm py-2 transition-all ${pathname === '/participation' ? 'text-white dark:text-coral-light font-bold' : 'font-medium hover:text-white dark:text-gray-200 dark:hover:text-coral-light'}`}>ΣΥΜΜΕΤΟΧΗ</Link>
              )}
              <Link href="/members" className="block w-full bg-white dark:bg-gray-700 text-charcoal dark:text-gray-200 px-6 py-2 rounded-full text-sm font-medium text-center">
                {isAuthenticated ? 'ΜΕΛΗ' : 'ΕΥΡΕΣΗ ΜΕΛΩΝ'}
              </Link>
              {isAuthenticated ? (
                <>
                  <Link href="/profile" className={`block text-sm py-2 transition-all ${pathname === '/profile' ? 'text-white dark:text-coral-light font-bold' : 'font-medium hover:text-white dark:text-gray-200 dark:hover:text-coral-light'}`}>Ο ΧΩΡΟΣ ΜΟΥ</Link>
                  <button
                    type="button"
                    onClick={() => setIsLogoutModalOpen(true)}
                    className="block text-sm py-2 font-medium hover:text-white dark:text-gray-200 dark:hover:text-coral-light transition-all text-left"
                  >
                    ΑΠΟΣΥΝΔΕΣΗ
                  </button>
                </>
              ) : (
                <Link href="/login" className={`block text-sm py-2 transition-all ${pathname === '/login' ? 'text-white dark:text-coral-light font-bold' : 'font-medium hover:text-white dark:text-gray-200 dark:hover:text-coral-light'}`}>ΣΥΝΔΕΣΗ</Link>
              )}
            </nav>
            <div className="pt-2">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
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
    </header>
  )
}
