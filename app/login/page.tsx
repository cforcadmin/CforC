'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { AccessibilityButton } from '@/components/AccessibilityMenu'

export default function LoginPage() {
  const { login, requestMagicLink } = useAuth()
  const router = useRouter()
  const [accessibilityButtonScale, setAccessibilityButtonScale] = useState(1)

  // Handle scroll for accessibility button fade
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      const fadeStart = 50
      const fadeEnd = 150

      if (scrollPosition <= fadeStart) {
        setAccessibilityButtonScale(1)
      } else if (scrollPosition >= fadeEnd) {
        setAccessibilityButtonScale(0)
      } else {
        const progress = (scrollPosition - fadeStart) / (fadeEnd - fadeStart)
        setAccessibilityButtonScale(1 - progress)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Password login state
  const [loginEmail, setLoginEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoginLoading, setIsLoginLoading] = useState(false)
  const [loginMessage, setLoginMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Magic link state
  const [magicEmail, setMagicEmail] = useState('')
  const [isMagicLoading, setIsMagicLoading] = useState(false)
  const [magicMessage, setMagicMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Password reset state
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [isResetLoading, setIsResetLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginMessage(null)
    setIsLoginLoading(true)

    try {
      const result = await login(loginEmail, password)

      if (result.success) {
        setLoginMessage({ type: 'success', text: result.message || 'Επιτυχής σύνδεση' })
        // Redirect to profile after successful login
        setTimeout(() => {
          router.push('/profile')
        }, 1000)
      } else {
        setLoginMessage({ type: 'error', text: result.message || 'Σφάλμα σύνδεσης' })
      }
    } catch (error) {
      setLoginMessage({ type: 'error', text: 'Κάτι πήγε στραβά. Παρακαλώ δοκιμάστε ξανά.' })
    } finally {
      setIsLoginLoading(false)
    }
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setMagicMessage(null)
    setIsMagicLoading(true)

    try {
      const result = await requestMagicLink(magicEmail)

      if (result.success) {
        setMagicMessage({ type: 'success', text: result.message })
        setMagicEmail('')
      } else {
        setMagicMessage({ type: 'error', text: result.message })
      }
    } catch (error) {
      setMagicMessage({ type: 'error', text: 'Κάτι πήγε στραβά. Παρακαλώ δοκιμάστε ξανά.' })
    } finally {
      setIsMagicLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetMessage(null)
    setIsResetLoading(true)

    try {
      const result = await requestMagicLink(resetEmail)

      if (result.success) {
        setResetMessage({ type: 'success', text: 'Ελέγξτε το email σας για τον σύνδεσμο επαναφοράς κωδικού' })
        setResetEmail('')
        // Close modal after 3 seconds
        setTimeout(() => {
          setShowResetPassword(false)
          setResetMessage(null)
        }, 3000)
      } else {
        setResetMessage({ type: 'error', text: result.message })
      }
    } catch (error) {
      setResetMessage({ type: 'error', text: 'Κάτι πήγε στραβά. Παρακαλώ δοκιμάστε ξανά.' })
    } finally {
      setIsResetLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900">
      <Navigation />
      <main id="main-content">
        {/* Hero Section */}
        <section className="relative -bottom-20">
          <div className="bg-coral dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 h-[25vh] flex items-center rounded-b-3xl relative z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-none dark:text-coral">
                ΠΕΡΙΟΧΗ ΜΕΛΩΝ
              </h1>
            </div>

            {/* Accessibility Menu Trigger Button */}
            <div
              className="absolute right-6 lg:right-12 top-1/2 -translate-y-1/2 transition-all duration-200"
              style={{
                transform: `translateY(-50%) scale(${accessibilityButtonScale})`,
                opacity: accessibilityButtonScale,
                pointerEvents: accessibilityButtonScale < 0.1 ? 'none' : 'auto'
              }}
            >
              <AccessibilityButton />
            </div>
          </div>
        </section>

        {/* Main Content */}
        <div className="pt-32 pb-24 px-4">
          <div className="w-full max-w-5xl mx-auto">
            {/* Cards Container - Side by Side on Desktop */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Password Login Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              {/* Header */}
              <div className="text-center mb-5">
                <h2 className="text-2xl font-bold text-charcoal dark:text-gray-100 mb-1">
                  Σύνδεση
                </h2>
                <p className="text-gray-600 dark:text-gray-300 text-xs">
                  Για χρήστες με κωδικό πρόσβασης
                </p>
              </div>

              {/* Password Login Form */}
              <form onSubmit={handlePasswordLogin} className="space-y-3">
                <div>
                  <label htmlFor="login-email" className="block text-xs font-medium text-charcoal dark:text-gray-200 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="login-email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="to-email-sou@example.com"
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-full text-sm text-charcoal dark:text-gray-200 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-coral dark:focus:ring-coral-light focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
                    disabled={isLoginLoading}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs font-medium text-charcoal dark:text-gray-200 mb-1">
                    Κωδικός Πρόσβασης
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-full text-sm text-charcoal dark:text-gray-200 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-coral dark:focus:ring-coral-light focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
                    disabled={isLoginLoading}
                  />
                </div>

                {/* Forgot Password Link */}
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(true)}
                    className="text-xs text-charcoal dark:text-coral-light hover:underline font-medium"
                  >
                    Ξεχάσες τον κωδικό σου;
                  </button>
                </div>

                {/* Login Message */}
                {loginMessage && (
                  <div
                    className={`p-3 rounded-xl text-xs ${
                      loginMessage.type === 'success'
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
                        : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {loginMessage.type === 'success' ? (
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      <span>{loginMessage.text}</span>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoginLoading}
                  className="w-full bg-charcoal dark:bg-gray-700 text-coral dark:text-coral-light border-2 border-coral dark:border-coral-light py-2.5 rounded-full text-sm font-medium transition-all hover:bg-coral hover:text-white dark:hover:bg-coral-light dark:hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoginLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Σύνδεση...
                    </span>
                  ) : (
                    'Σύνδεση'
                  )}
                </button>
              </form>
            </div>

            {/* Magic Link Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              {/* Header */}
              <div className="text-center mb-5">
                <h2 className="text-2xl font-bold text-charcoal dark:text-gray-100 mb-1">
                  Πρώτη Σύνδεση
                </h2>
                <p className="text-gray-600 dark:text-gray-300 text-xs">
                  Βάλε το email σου για να λάβεις σύνδεσμο
                </p>
              </div>

              {/* Magic Link Form */}
              <form onSubmit={handleMagicLink} className="space-y-3">
                <div>
                  <label htmlFor="magic-email" className="block text-xs font-medium text-charcoal dark:text-gray-200 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="magic-email"
                    value={magicEmail}
                    onChange={(e) => setMagicEmail(e.target.value)}
                    placeholder="to-email-sou@example.com"
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-full text-sm text-charcoal dark:text-gray-200 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-coral dark:focus:ring-coral-light focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
                    disabled={isMagicLoading}
                  />
                </div>

                {/* Magic Message */}
                {magicMessage && (
                  <div
                    className={`p-3 rounded-xl text-xs ${
                      magicMessage.type === 'success'
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
                        : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {magicMessage.type === 'success' ? (
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      <span>{magicMessage.text}</span>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isMagicLoading}
                  className="w-full bg-charcoal dark:bg-gray-700 text-coral dark:text-coral-light border-2 border-coral dark:border-coral-light py-2.5 rounded-full text-sm font-medium transition-all hover:bg-coral hover:text-white dark:hover:bg-coral-light dark:hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isMagicLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Αποστολή...
                    </span>
                  ) : (
                    'Αποστολή Συνδέσμου'
                  )}
                </button>

                {/* Info */}
                <div className="p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                    Ο σύνδεσμος θα σου επιτρέψει να ορίσεις κωδικό πρόσβασης. Λήγει σε 6 ώρες.
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 text-center mt-1.5 font-medium">
                    ⚠️ Έλεγξε τον φάκελο SPAM αν δεν το βρεις
                  </p>
                </div>
              </form>
            </div>
          </div>

            {/* Footer Links */}
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Δεν είσαι μέλος;{' '}
                <Link href="/participation" className="text-charcoal dark:text-coral-light hover:underline font-bold">
                  Γίνε μέλος
                </Link>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <Link href="/members" className="text-charcoal dark:text-coral-light hover:underline font-bold">
                  Περιήγηση Μελών
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Password Reset Modal */}
      {showResetPassword && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-md w-full">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-charcoal dark:text-gray-100">
                Επαναφορά Κωδικού
              </h3>
              <button
                onClick={() => {
                  setShowResetPassword(false)
                  setResetMessage(null)
                  setResetEmail('')
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                aria-label="Κλείσιμο"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Βάλε το email σου και θα σου στείλουμε έναν σύνδεσμο για να επαναφέρεις τον κωδικό σου.
            </p>

            {/* Reset Form */}
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="block text-xs font-medium text-charcoal dark:text-gray-200 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="reset-email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="to-email-sas@example.com"
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-full text-sm text-charcoal dark:text-gray-200 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-coral dark:focus:ring-coral-light focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
                  disabled={isResetLoading}
                />
              </div>

              {/* Reset Message */}
              {resetMessage && (
                <div
                  className={`p-3 rounded-xl text-xs ${
                    resetMessage.type === 'success'
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {resetMessage.type === 'success' ? (
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    <span>{resetMessage.text}</span>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isResetLoading}
                className="w-full bg-charcoal dark:bg-gray-700 text-coral dark:text-coral-light border-2 border-coral dark:border-coral-light py-2.5 rounded-full text-sm font-medium transition-all hover:bg-coral hover:text-white dark:hover:bg-coral-light dark:hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResetLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Αποστολή...
                  </span>
                ) : (
                  'Αποστολή Συνδέσμου'
                )}
              </button>

              <div className="p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                  Ο σύνδεσμος θα σου επιτρέψει να ορίσεις νέο κωδικό πρόσβασης. Λήγει σε 6 ώρες.
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 text-center mt-1.5 font-medium">
                  ⚠️ Έλεγξε τον φάκελο SPAM αν δεν το βρεις
                </p>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}
