'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/components/AuthProvider'

const PROPOSALS_DOC_MEMBER = 'https://docs.google.com/document/d/1yhxZ--puZuLGIYS9-xZDbujoe250P7xyvLcZKcg1bj0/edit?usp=share_link'
const PROPOSALS_DOC_PUBLIC = 'https://docs.google.com/document/d/1tdpmHrksjuOE3DIe1rpkMzVfu1uz9M8ZquRyxh_Byjw/edit?usp=share_link'

export default function FeedbackButton() {
  const { user, isAuthenticated } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [scrolledPastViewport, setScrolledPastViewport] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Track scroll to match ScrollToTop visibility threshold
  useEffect(() => {
    const handleScroll = () => {
      setScrolledPastViewport(window.scrollY > window.innerHeight)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  const handleSend = async () => {
    if (!message.trim()) return
    setSending(true)
    setResult(null)

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          senderName: user?.Name || null,
          senderEmail: user?.Email || null,
          pageUrl: window.location.href,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setResult({ type: 'success', text: 'Ευχαριστούμε! Το μήνυμά σου στάλθηκε.' })
        setMessage('')
      } else {
        setResult({ type: 'error', text: data.error || 'Αποτυχία αποστολής' })
      }
    } catch {
      setResult({ type: 'error', text: 'Σφάλμα δικτύου. Δοκίμασε ξανά.' })
    } finally {
      setSending(false)
    }
  }

  const proposalsUrl = isAuthenticated ? PROPOSALS_DOC_MEMBER : PROPOSALS_DOC_PUBLIC

  return (
    <div
      className="fixed right-8 z-50 transition-all duration-300"
      style={{ bottom: scrolledPastViewport ? '6rem' : '2rem' }}
      ref={panelRef}
    >
      {/* Expanded Panel */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-600 overflow-hidden mb-2">
          {/* Panel Header */}
          <div className="bg-charcoal dark:bg-gray-700 px-5 py-3 flex items-center justify-between">
            <h3 className="text-coral dark:text-coral-light font-semibold text-sm">
              Αναφορά / Πρόταση
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-white/80 transition-colors"
              aria-label="Κλείσιμο"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-4 space-y-3">
            {/* Login hint for non-authenticated users */}
            {!isAuthenticated && (
              <div className="flex items-start gap-2 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="relative group flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-blue-500 dark:text-blue-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                  Εάν είσαι μέλος του CforC, <a href="/login" className="font-semibold underline hover:text-blue-900 dark:hover:text-blue-100">συνδέσου</a> πριν υποβάλεις το αίτημά σου. Οι καταχωρίσεις είναι ανώνυμες εκτός αν έχεις συνδεθεί.
                </p>
              </div>
            )}

            {/* Message input */}
            <div>
              <label htmlFor="feedback-message" className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                Περίγραψε το πρόβλημα ή την πρότασή σου
              </label>
              <textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="π.χ. Η σελίδα δεν φορτώνει σωστά..."
                disabled={sending || result?.type === 'success'}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-coral focus:border-transparent dark:bg-gray-700 dark:text-gray-200 text-sm resize-none disabled:opacity-60 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>

            {/* Result */}
            {result && (
              <div className={`p-2.5 rounded-lg text-xs ${
                result.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
              }`}>
                {result.text}
              </div>
            )}

            {/* Send button */}
            {result?.type !== 'success' && (
              <button
                onClick={handleSend}
                disabled={sending || !message.trim()}
                className="w-full px-4 py-2.5 bg-coral hover:bg-coral/90 dark:bg-coral-light dark:hover:bg-coral-light/90 text-white rounded-full text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Αποστολή...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Αποστολή
                  </>
                )}
              </button>
            )}

            {/* Divider */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-600"></div>
              <span className="text-xs text-gray-400 dark:text-gray-500">ή</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-600"></div>
            </div>

            {/* Proposals document link */}
            <a
              href={proposalsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-coral dark:border-coral-light text-coral dark:text-coral-light rounded-full text-sm font-medium hover:bg-coral/5 dark:hover:bg-coral-light/10 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Έγγραφο Προτάσεων
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      )}

      {/* Floating trigger button — charcoal bg with coral icon (ΠΟΙΟΙ ΕΙΜΑΣΤΕ style) */}
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          if (isOpen) {
            setResult(null)
          }
        }}
        className={`w-12 h-12 rounded-full shadow-lg dark:border dark:border-white/30 flex items-center justify-center transition-all duration-200 ${
          isOpen
            ? 'bg-charcoal dark:bg-gray-600 rotate-45'
            : 'bg-charcoal/90 dark:bg-gray-700 hover:bg-charcoal dark:hover:bg-gray-600 hover:scale-110'
        }`}
        aria-label={isOpen ? 'Κλείσιμο αναφοράς' : 'Αναφορά προβλήματος / Πρόταση'}
        title="Αναφορά / Πρόταση"
      >
        {isOpen ? (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        )}
      </button>
    </div>
  )
}
