'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface Member {
  id: number
  documentId?: string
  Name: string
  Slug?: string
  Email: string
  Bio?: any
  FieldsOfWork?: string
  City?: string
  Province?: string
  Phone?: string
  Websites?: string
  Image?: Array<{
    id?: number
    url: string
    alternativeText?: string
  }>
  ProfileImageAltText?: string
  Project1Title?: string
  Project1Tags?: string
  Project1Links?: string
  Project1Description?: any
  Project1Pictures?: Array<{
    id?: number
    url: string
    alternativeText?: string
  }>
  Project1PicturesAltText?: string
  Project2Title?: string
  Project2Tags?: string
  Project2Links?: string
  Project2Description?: any
  Project2Pictures?: Array<{
    id?: number
    url: string
    alternativeText?: string
  }>
  Project2PicturesAltText?: string
}

interface AuthContextType {
  user: Member | null
  isAuthenticated: boolean
  isLoading: boolean
  requestMagicLink: (email: string) => Promise<{ success: boolean; message: string; error?: string }>
  setPassword: (token: string, password: string) => Promise<{ success: boolean; message?: string; error?: string }>
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string; error?: string }>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Member | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check for existing session on mount
  useEffect(() => {
    checkSession()
  }, [])

  const checkSession = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/auth/session')

      if (response.ok) {
        const data = await response.json()
        setUser(data.member)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Session check failed:', error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const requestMagicLink = async (email: string) => {
    try {
      const response = await fetch('/api/auth/request-magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (response.ok) {
        return {
          success: true,
          message: data.message || 'Ελέγξτε το email σας'
        }
      } else {
        return {
          success: false,
          message: data.error || 'Κάτι πήγε στραβά',
          error: data.error
        }
      }
    } catch (error) {
      console.error('Magic link request failed:', error)
      return {
        success: false,
        message: 'Σφάλμα δικτύου. Παρακαλώ δοκιμάστε ξανά.',
        error: 'Network error'
      }
    }
  }

  const setPassword = async (token: string, password: string) => {
    try {
      const response = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token, password })
      })

      const data = await response.json()

      if (response.ok) {
        setUser(data.member)
        return {
          success: true,
          message: data.message || 'Ο κωδικός ορίστηκε επιτυχώς'
        }
      } else {
        return {
          success: false,
          message: data.error || 'Κάτι πήγε στραβά',
          error: data.error
        }
      }
    } catch (error) {
      console.error('Set password failed:', error)
      return {
        success: false,
        message: 'Σφάλμα δικτύου. Παρακαλώ δοκιμάστε ξανά.',
        error: 'Network error'
      }
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (response.ok) {
        setUser(data.member)
        return {
          success: true,
          message: data.message || 'Επιτυχής σύνδεση'
        }
      } else {
        return {
          success: false,
          message: data.error || 'Κάτι πήγε στραβά',
          error: data.error
        }
      }
    } catch (error) {
      console.error('Login failed:', error)
      return {
        success: false,
        message: 'Σφάλμα δικτύου. Παρακαλώ δοκιμάστε ξανά.',
        error: 'Network error'
      }
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST'
      })
      setUser(null)
    } catch (error) {
      console.error('Logout failed:', error)
      setUser(null)
    }
  }

  const refreshSession = async () => {
    await checkSession()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        requestMagicLink,
        setPassword,
        login,
        logout,
        refreshSession
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
