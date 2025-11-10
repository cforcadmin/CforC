'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LanguageSwitcher from './LanguageSwitcher'
import { useScrollAnimation } from '@/lib/useScrollAnimation'

interface NavigationProps {
  variant?: 'default' | 'members'
  pageTitle?: string | React.ReactNode
}

export default function Navigation({ variant = 'default', pageTitle }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { isScrolled } = useScrollAnimation()
  const pathname = usePathname()

  // Determine active menu item
  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true
    if (path !== '/' && pathname?.startsWith(path)) return true
    return false
  }

  const bgColor = variant === 'members' ? 'bg-[#F5F0EB]' : 'bg-coral'
  const bgOpacity = isScrolled ? (variant === 'members' ? 'bg-[#F5F0EB]/95' : 'bg-coral/95') : bgColor

  return (
    <nav className={`fixed ${isScrolled ? 'top-2' : 'top-0'} w-full z-50 shadow-sm transition-all duration-500 ${isScrolled ? 'px-4' : ''}`}>
      <div className={`${bgOpacity} ${isScrolled ? 'rounded-2xl' : ''} transition-all duration-500 backdrop-blur-sm`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20 relative">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <img
              src="/cforc_logo.svg"
              alt="Culture for Change"
              className="h-12"
            />
          </Link>

          {/* Flying Title - appears when scrolled */}
          {isScrolled && pageTitle && (
            <div className="absolute left-24 md:left-32 top-1/2 -translate-y-1/2 pointer-events-none">
              <div className="text-xl md:text-2xl font-bold animate-flyIn">
                {pageTitle}
              </div>
            </div>
          )}

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/about"
              className={`text-sm font-medium hover:text-charcoal transition-all duration-300 px-3 py-2 ${
                isActive('/about') && isScrolled
                  ? 'scale-125 font-extrabold'
                  : ''
              }`}
            >
              ΣΧΕΤΙΚΑ ΜΕ ΕΜΑΣ
            </Link>
            <Link
              href="/activities"
              className={`text-sm font-medium hover:text-charcoal transition-all duration-300 px-3 py-2 ${
                isActive('/activities') && isScrolled
                  ? 'scale-125 font-extrabold'
                  : ''
              }`}
            >
              ΔΡΑΣΤΗΡΙΟΤΗΤΕΣ
            </Link>
            <Link
              href="/open-calls"
              className={`text-sm font-medium hover:text-charcoal transition-all duration-300 px-3 py-2 ${
                isActive('/open-calls') && isScrolled
                  ? 'scale-125 font-extrabold'
                  : ''
              }`}
            >
              ΑΝΟΙΧΤΑ ΚΑΛΕΣΜΑΤΑ
            </Link>
            <Link
              href="/participation"
              className={`text-sm font-medium hover:text-charcoal transition-all duration-300 px-3 py-2 ${
                isActive('/participation') && isScrolled
                  ? 'scale-125 font-extrabold'
                  : ''
              }`}
            >
              ΣΥΜΜΕΤΟΧΗ
            </Link>
            <Link
              href="/members"
              className={`bg-white text-charcoal px-6 py-2 rounded-full text-sm font-medium hover:bg-gray-100 transition-all duration-300 ${
                isActive('/members') && isScrolled
                  ? 'scale-125 font-extrabold'
                  : ''
              }`}
            >
              ΕΥΡΕΣΗ ΜΕΛΩΝ
            </Link>
            <LanguageSwitcher />
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2"
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
          <div className={`md:hidden ${bgColor} border-t ${variant === 'members' ? 'border-gray-300' : 'border-coral-dark'}`}>
          <div className="px-4 py-4 space-y-3">
            <Link href="/about" className="block text-sm font-medium py-2">ΣΧΕΤΙΚΑ ΜΕ ΕΜΑΣ</Link>
            <Link href="/activities" className="block text-sm font-medium py-2">ΔΡΑΣΤΗΡΙΟΤΗΤΕΣ</Link>
            <Link href="/open-calls" className="block text-sm font-medium py-2">ΑΝΟΙΧΤΑ ΚΑΛΕΣΜΑΤΑ</Link>
            <Link href="/participation" className="block text-sm font-medium py-2">ΣΥΜΜΕΤΟΧΗ</Link>
            <Link href="/members" className="block w-full bg-white text-charcoal px-6 py-2 rounded-full text-sm font-medium text-center">
              ΕΥΡΕΣΗ ΜΕΛΩΝ
            </Link>
            <div className="pt-2">
              <LanguageSwitcher />
            </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
