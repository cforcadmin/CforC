'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface NavigationProps {
  variant?: 'default' | 'members'
}

export default function Navigation({ variant = 'default' }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      // Detect if scrolled past hero section (approximately 25vh)
      const scrollPosition = window.scrollY
      setIsScrolled(scrollPosition > 150)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const bgColor = variant === 'members' ? 'bg-[#F5F0EB]' : 'bg-coral'
  const bgOpacity = isScrolled ? (variant === 'members' ? 'bg-[#F5F0EB]/90' : 'bg-coral/90') : bgColor

  return (
    <nav className={`fixed ${isScrolled ? 'top-2' : 'top-0'} w-full z-50 shadow-sm transition-all duration-300 ${isScrolled ? 'px-4' : ''}`}>
      <div className={`${bgOpacity} ${isScrolled ? 'rounded-2xl scale-90' : ''} transition-all duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <img
              src="/cforc_logo.svg"
              alt="Culture for Change"
              className="h-12"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/about" className="text-sm font-medium hover:text-charcoal transition-colors">
              ΣΧΕΤΙΚΑ ΜΕ ΕΜΑΣ
            </Link>
            <Link href="/activities" className="text-sm font-medium hover:text-charcoal transition-colors">
              ΔΡΑΣΤΗΡΙΟΤΗΤΕΣ
            </Link>
            <Link href="/open-calls" className="text-sm font-medium hover:text-charcoal transition-colors">
              ΑΝΟΙΧΤΑ ΚΑΛΕΣΜΑΤΑ
            </Link>
            <Link href="/participation" className="text-sm font-medium hover:text-charcoal transition-colors">
              ΣΥΜΜΕΤΟΧΗ
            </Link>
            <Link href="/members" className="bg-white text-charcoal px-6 py-2 rounded-full text-sm font-medium hover:bg-gray-100 transition-colors">
              ΕΥΡΕΣΗ ΜΕΛΩΝ
            </Link>
            <button className="w-8 h-8 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </button>
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
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
