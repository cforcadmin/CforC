'use client'

import { useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Link from 'next/link'

export default function LoginPage() {
  const { login, requestMagicLink } = useAuth()
  const router = useRouter()

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
    <main className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900">
      <Navigation />

      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4 py-12">
        <div className="w-full max-w-5xl">
          {/* Members Only Notice */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-coral/10 dark:bg-coral-light/10 border border-coral/30 dark:border-coral-light/30 text-coral dark:text-coral-light px-4 py-2 rounded-full text-sm font-medium">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              <span>Περιοχή Μελών</span>
            </div>
          </div>

          {/* Cards Container - Side by Side on Desktop */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Password Login Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              {/* Header */}
              <div className="text-center mb-5">
                <h1 className="text-2xl font-bold text-charcoal dark:text-gray-100 mb-1">
                  Σύνδεση
                </h1>
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
                    className="text-xs text-coral dark:text-coral-light hover:underline"
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
                    {loginMessage.text}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoginLoading}
                  className="w-full bg-coral hover:bg-coral/90 dark:bg-coral-light dark:hover:bg-coral-light/90 text-white py-2.5 rounded-full text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoginLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                    {magicMessage.text}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isMagicLoading}
                  className="w-full bg-gray-700 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500 text-white py-2.5 rounded-full text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isMagicLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                  <p className="text-[11px] text-gray-600 dark:text-gray-400 text-center">
                    Ο σύνδεσμος θα σου επιτρέψει να ορίσεις κωδικό πρόσβασης. Λήγει σε 6 ώρες.
                  </p>
                  <p className="text-[11px] text-gray-600 dark:text-gray-400 text-center mt-1.5 font-medium">
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
              <Link href="/participation" className="text-coral dark:text-coral-light hover:underline font-medium">
                Γίνε μέλος
              </Link>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <Link href="/members" className="text-coral dark:text-coral-light hover:underline font-medium">
                Περιήγηση Μελών
              </Link>
            </p>
          </div>
        </div>
      </div>

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
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  {resetMessage.text}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isResetLoading}
                className="w-full bg-coral hover:bg-coral/90 dark:bg-coral-light dark:hover:bg-coral-light/90 text-white py-2.5 rounded-full text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResetLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                <p className="text-[11px] text-gray-600 dark:text-gray-400 text-center">
                  Ο σύνδεσμος θα σου επιτρέψει να ορίσεις νέο κωδικό πρόσβασης. Λήγει σε 6 ώρες.
                </p>
                <p className="text-[11px] text-gray-600 dark:text-gray-400 text-center mt-1.5 font-medium">
                  ⚠️ Έλεγξε τον φάκελο SPAM αν δεν το βρεις
                </p>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </main>
  )
}
