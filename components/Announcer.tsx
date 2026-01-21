'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface AnnouncerContextType {
  announce: (message: string, priority?: 'polite' | 'assertive') => void
}

const AnnouncerContext = createContext<AnnouncerContextType | null>(null)

export function useAnnouncer() {
  const context = useContext(AnnouncerContext)
  if (!context) {
    throw new Error('useAnnouncer must be used within an AnnouncerProvider')
  }
  return context
}

interface AnnouncerProviderProps {
  children: ReactNode
}

export function AnnouncerProvider({ children }: AnnouncerProviderProps) {
  const [politeMessage, setPoliteMessage] = useState('')
  const [assertiveMessage, setAssertiveMessage] = useState('')

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (priority === 'assertive') {
      // Clear and set to trigger announcement
      setAssertiveMessage('')
      setTimeout(() => setAssertiveMessage(message), 50)
    } else {
      setPoliteMessage('')
      setTimeout(() => setPoliteMessage(message), 50)
    }
  }, [])

  return (
    <AnnouncerContext.Provider value={{ announce }}>
      {children}
      {/* Polite announcements - for non-urgent updates */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-announcer"
      >
        {politeMessage}
      </div>
      {/* Assertive announcements - for urgent updates like errors */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-announcer"
      >
        {assertiveMessage}
      </div>
    </AnnouncerContext.Provider>
  )
}
