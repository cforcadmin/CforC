'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'

function SetPasswordContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { setPassword } = useAuth()

  const [token, setToken] = useState<string | null>(null)
  const [email, setEmail] = useState<string>('')
  const [password, setPasswordValue] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // Verify token on mount
  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (!tokenParam) {
      setError('Λείπει ο σύνδεσμος επαλήθευσης')
      setIsVerifying(false)
      return
    }

    verifyToken(tokenParam)
  }, [searchParams])

  const verifyToken = async (tokenValue: string) => {
    try {
      const response = await fetch('/api/auth/verify-magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: tokenValue })
      })

      const data = await response.json()

      if (response.ok) {
        setToken(tokenValue)
        setEmail(data.email)
        setError(null)
      } else {
        setError(data.error || 'Μη έγκυρος σύνδεσμος')
      }
    } catch (err) {
      setError('Σφάλμα επαλήθευσης. Παρακαλώ δοκιμάστε ξανά.')
    } finally {
      setIsVerifying(false)
    }
  }

  // Password validation
  const validatePassword = (pass: string) => {
    const errors: string[] = []

    if (pass.length < 8) {
      errors.push('Τουλάχιστον 8 χαρακτήρες')
    }
    if (!/[A-Z]/.test(pass)) {
      errors.push('Ένα κεφαλαίο γράμμα')
    }
    if (!/[a-z]/.test(pass)) {
      errors.push('Ένα μικρό γράμμα')
    }
    if (!/[0-9]/.test(pass)) {
      errors.push('Έναν αριθμό')
    }

    return errors
  }

  // Update validation on password change
  useEffect(() => {
    if (password) {
      setValidationErrors(validatePassword(password))
    } else {
      setValidationErrors([])
    }
  }, [password])

  // Calculate password strength
  const getPasswordStrength = () => {
    if (!password) return { label: '', color: '', percentage: 0 }

    const errors = validatePassword(password)
    const strength = 4 - errors.length

    if (strength === 4) return { label: 'Δυνατός', color: 'bg-green-500', percentage: 100 }
    if (strength === 3) return { label: 'Μέτριος', color: 'bg-yellow-500', percentage: 75 }
    if (strength >= 1) return { label: 'Αδύναμος', color: 'bg-orange-500', percentage: 50 }
    return { label: 'Πολύ Αδύναμος', color: 'bg-red-500', percentage: 25 }
  }

  const strength = getPasswordStrength()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (validationErrors.length > 0) {
      setError('Ο κωδικός δεν πληροί τις απαιτήσεις')
      return
    }

    if (password !== confirmPassword) {
      setError('Οι κωδικοί δεν ταιριάζουν')
      return
    }

    if (!token) {
      setError('Λείπει ο σύνδεσμος επαλήθευσης')
      return
    }

    setIsLoading(true)

    try {
      const result = await setPassword(token, password)

      if (result.success) {
        // Redirect to profile
        router.push('/profile')
      } else {
        setError(result.message || 'Κάτι πήγε στραβά')
      }
    } catch (err) {
      setError('Σφάλμα δικτύου. Παρακαλώ δοκιμάστε ξανά.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isVerifying) {
    return (
      <main className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-coral dark:text-coral-light mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600 dark:text-gray-300">Επαλήθευση συνδέσμου...</p>
        </div>
      </main>
    )
  }

  if (error && !token) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900">
        <Navigation />
        <main className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-charcoal dark:text-gray-100 mb-2">Μη έγκυρος Σύνδεσμος</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
            <a href="/login" className="inline-block bg-coral hover:bg-coral/90 dark:bg-coral-light dark:hover:bg-coral-light/90 text-white px-6 py-3 rounded-full font-medium transition-colors">
              Επιστροφή στη Σύνδεση
            </a>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900">
      <Navigation />
      <main className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4 py-16">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-charcoal dark:text-gray-100 mb-2">
                Ορισμός Κωδικού
              </h1>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                {email}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-charcoal dark:text-gray-200 mb-2">
                  Νέος Κωδικός
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPasswordValue(e.target.value)}
                    placeholder="Εισάγετε τον κωδικό σας"
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-full text-charcoal dark:text-gray-200 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-coral dark:focus:ring-coral-light focus:border-transparent"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {password && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Ισχύς κωδικού:</span>
                      <span className={`text-xs font-medium ${strength.percentage === 100 ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                        {strength.label}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${strength.color} transition-all duration-300`}
                        style={{ width: `${strength.percentage}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Requirements */}
                <div className="mt-3 space-y-1">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Ο κωδικός πρέπει να περιέχει:</p>
                  {['Τουλάχιστον 8 χαρακτήρες', 'Ένα κεφαλαίο γράμμα', 'Ένα μικρό γράμμα', 'Έναν αριθμό'].map((req, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      {validationErrors.includes(req) ? (
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" strokeWidth={2} />
                        </svg>
                      ) : password ? (
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" strokeWidth={2} />
                        </svg>
                      )}
                      <span className={validationErrors.includes(req) ? 'text-gray-500 dark:text-gray-400' : password ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}>
                        {req}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-charcoal dark:text-gray-200 mb-2">
                  Επιβεβαίωση Κωδικού
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Επιβεβαιώστε τον κωδικό σας"
                  required
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-full text-charcoal dark:text-gray-200 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-coral dark:focus:ring-coral-light focus:border-transparent"
                  disabled={isLoading}
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="mt-2 text-xs text-red-500">Οι κωδικοί δεν ταιριάζουν</p>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 rounded-2xl text-sm bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || validationErrors.length > 0 || password !== confirmPassword}
                className="w-full bg-coral hover:bg-coral/90 dark:bg-coral-light dark:hover:bg-coral-light/90 text-white py-3 rounded-full font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Αποθήκευση...
                  </span>
                ) : (
                  'Ορισμός Κωδικού'
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-coral dark:text-coral-light mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600 dark:text-gray-300">Φόρτωση...</p>
        </div>
      </main>
    }>
      <SetPasswordContent />
    </Suspense>
  )
}
