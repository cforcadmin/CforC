'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { renderBlocks } from '@/lib/renderBlocks'
import { isEnglishMode } from '@/lib/translation'

/** Section labels in both languages */
const LABELS = {
  gr: { bio: 'Βιογραφικό', contact: 'Επικοινωνία', fields: 'Πεδία Πρακτικής', location: 'Τοποθεσία', projects: 'Έργα', projectsBy: 'Έργα από' },
  en: { bio: 'Biography', contact: 'Contact', fields: 'Fields of Work', location: 'Location', projects: 'Projects', projectsBy: 'Projects by' },
}

interface ProfilePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  user: any
}

function getWebsiteDisplay(url: string): { label: string; icon: React.ReactNode } {
  const lowerUrl = url.toLowerCase()

  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    return {
      label: 'YouTube',
      icon: (
        <svg className="w-4 h-4 text-coral dark:text-coral-light" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      ),
    }
  }

  if (lowerUrl.includes('instagram.com')) {
    return {
      label: 'Instagram',
      icon: (
        <svg className="w-4 h-4 text-coral dark:text-coral-light" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
        </svg>
      ),
    }
  }

  if (lowerUrl.includes('linkedin.com')) {
    return {
      label: 'LinkedIn',
      icon: (
        <svg className="w-4 h-4 text-coral dark:text-coral-light" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      ),
    }
  }

  if (lowerUrl.includes('facebook.com')) {
    return {
      label: 'Facebook',
      icon: (
        <svg className="w-4 h-4 text-coral dark:text-coral-light" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    }
  }

  if (lowerUrl.includes('linktr.ee') || lowerUrl.includes('linktree.com')) {
    return {
      label: 'Linktree',
      icon: (
        <svg className="w-4 h-4 text-coral dark:text-coral-light" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7.953 15.066l-.038-4.079-4.86-.002v-2.97h4.86L3.954 3.99l2.19-2.307 4.032 4.17 3.96-4.17 2.305 2.307-4.07 4.025h4.96v2.97l-4.985.002-.025 4.079h-4.368zm2.184 7.63l-2.184-2.28 2.184-2.29 2.262 2.29-2.262 2.28z" />
        </svg>
      ),
    }
  }

  if (lowerUrl.includes('tiktok.com')) {
    return {
      label: 'TikTok',
      icon: (
        <svg className="w-4 h-4 text-coral dark:text-coral-light" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
        </svg>
      ),
    }
  }

  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
    return {
      label: 'X',
      icon: (
        <svg className="w-4 h-4 text-coral dark:text-coral-light" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    }
  }

  try {
    const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace('www.', '')
    return {
      label: domain,
      icon: <span className="text-coral dark:text-coral-light">🔗</span>,
    }
  } catch {
    return {
      label: url,
      icon: <span className="text-coral dark:text-coral-light">🔗</span>,
    }
  }
}

function getHeroName(name: string): string {
  if (!name) return ''
  const withoutPunctuation = name.replace(/[.,;:!?"'«»·()\-–—]/g, '')
  return withoutPunctuation.toLocaleUpperCase('el-GR')
}


export default function ProfilePreviewModal({ isOpen, onClose, user }: ProfilePreviewModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const modalRef = useFocusTrap<HTMLDivElement>(isOpen)
  const [previewLang, setPreviewLang] = useState<'gr' | 'en'>('gr')

  // If site is already in English when modal opens, start in EN mode
  useEffect(() => {
    if (isOpen) {
      setPreviewLang(isEnglishMode() ? 'en' : 'gr')
    }
  }, [isOpen])

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  if (!isOpen || !user) return null

  const fieldsOfWork = user.FieldsOfWork?.split(',').map((f: string) => f.trim()).filter((f: string) => f && f !== '-') || []
  const websites = user.Websites?.split(',').map((w: string) => w.trim()).filter((w: string) => w && w !== '-') || []
  // Effective titles: a project counts as "present" if it has a title in either
  // language. Use the language-appropriate title when available, else fall back.
  const project1EffectiveTitle =
    previewLang === 'en'
      ? user.EngProject1Title || user.Project1Title
      : user.Project1Title || user.EngProject1Title
  const project2EffectiveTitle =
    previewLang === 'en'
      ? user.EngProject2Title || user.Project2Title
      : user.Project2Title || user.EngProject2Title
  const hasProjects = project1EffectiveTitle || project2EffectiveTitle
  const cities = user.City?.split(',').map((c: string) => c.trim()).filter((c: string) => c && c !== '-') || []
  const provinces = user.Province?.split(',').map((p: string) => p.trim()).filter((p: string) => p && p !== '-') || []

  // Determine display name/bio based on preview language and available eng content
  const displayHeroName = previewLang === 'en' && user.EngName
    ? getHeroName(user.EngName)
    : getHeroName(user.Name || '')
  const displayName = previewLang === 'en' && user.EngName ? user.EngName : user.Name
  const L = LABELS[previewLang]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="preview-modal-title">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative bg-[#F5F0EB] dark:bg-gray-900 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-[#F5F0EB] dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 rounded-t-3xl px-6 py-4 flex items-center justify-between">
          <h2 id="preview-modal-title" className="text-lg font-bold text-charcoal dark:text-gray-100 notranslate">
            {previewLang === 'en' ? 'Profile Preview' : 'Προεπισκόπηση Προφίλ'}
          </h2>
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-full border border-gray-300 dark:border-gray-600 overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setPreviewLang('gr')}
                className={`px-3 py-1 font-medium transition-colors notranslate ${previewLang === 'gr' ? 'bg-coral text-white dark:bg-coral-light dark:text-gray-900' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                GR
              </button>
              <button
                type="button"
                onClick={() => setPreviewLang('en')}
                className={`px-3 py-1 font-medium transition-colors notranslate ${previewLang === 'en' ? 'bg-coral text-white dark:bg-coral-light dark:text-gray-900' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                EN
              </button>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              aria-label="Κλείσιμο"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* EN preview hint — only shown when at least one EN field exists */}
        {previewLang === 'en' && (user.EngName || user.EngBio) && (
          <div className="mx-6 sm:mx-8 mt-4 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-700 dark:text-blue-300 notranslate">
            Μόνο οι τίτλοι ενοτήτων{user.EngName ? ' + το όνομα' : ''}{user.EngBio ? ' + το βιογραφικό' : ''} εμφανίζονται στα Αγγλικά. Το υπόλοιπο περιεχόμενο (πεδία πρακτικής, πόλεις) παραμένει στα Ελληνικά.
          </div>
        )}

        {/* Hero Section */}
        <div className="bg-coral dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 px-6 py-8 sm:px-8">
          <h1 className={`text-4xl sm:text-5xl md:text-6xl font-bold leading-none dark:text-coral ${previewLang === 'en' && user.EngName ? 'notranslate' : ''}`}>
            {displayHeroName}
          </h1>
        </div>

        {/* Member Info Section */}
        <div className="p-6 sm:p-8">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-10">
            <div className="grid md:grid-cols-[250px,1fr] gap-8">
              {/* Profile Image */}
              <div>
                {user.Image && user.Image.length > 0 && user.Image[0].url ? (
                  <div className="aspect-[3/4] relative rounded-2xl overflow-hidden bg-gray-200 dark:bg-gray-700">
                    <Image
                      src={user.Image[0].url}
                      alt={user.ProfileImageAltText || user.Name || ''}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-[3/4] bg-gray-200 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
                    <span className="text-gray-400 dark:text-gray-500 text-6xl">{(user.Name || '?').charAt(0)}</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div>
                {/* Bio */}
                {user.Bio && (
                  <div className="mb-8">
                    <h3 className="text-coral dark:text-coral-light text-sm font-bold mb-4 uppercase notranslate">{L.bio}</h3>
                    {previewLang === 'en' && user.EngBio ? (
                      <div className="text-gray-700 dark:text-gray-300 leading-relaxed notranslate">{renderBlocks(user.EngBio)}</div>
                    ) : (
                      <div className="text-gray-700 dark:text-gray-300 leading-relaxed">{renderBlocks(user.Bio)}</div>
                    )}
                  </div>
                )}

                {/* Contact */}
                {(user.Email || (user.Phone && user.Phone.trim() !== '-') || websites.length > 0) && (
                  <div className="mb-8">
                    <h3 className="text-coral dark:text-coral-light text-sm font-bold mb-4 uppercase notranslate">{L.contact}</h3>
                    <div className="space-y-2">
                      {user.Email && (
                        <p className="flex items-center gap-2 dark:text-gray-300">
                          <span className="text-coral dark:text-coral-light">✉</span>
                          <span>{user.Email}</span>
                        </p>
                      )}
                      {user.Phone && user.Phone.trim() !== '-' && user.Phone.trim() !== '' && (
                        <p className="flex items-center gap-2 dark:text-gray-300">
                          <span className="text-coral dark:text-coral-light">📱</span>
                          <span>{user.Phone}</span>
                        </p>
                      )}
                      {websites.map((website: string, index: number) => {
                        const { label, icon } = getWebsiteDisplay(website)
                        return (
                          <p key={index} className="flex items-center gap-2 dark:text-gray-300">
                            {icon}
                            <span>{label}</span>
                          </p>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Fields of Work */}
                {fieldsOfWork.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-coral dark:text-coral-light text-sm font-bold mb-4 uppercase notranslate">{L.fields}</h3>
                    <div className="flex flex-wrap gap-2">
                      {fieldsOfWork.map((field: string, index: number) => (
                        <span
                          key={index}
                          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full text-sm dark:text-gray-200"
                        >
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Location */}
                {(cities.length > 0 || provinces.length > 0) && (
                  <div>
                    <h3 className="text-coral dark:text-coral-light text-sm font-bold mb-4 uppercase notranslate">{L.location}</h3>
                    <div className="space-y-3">
                      {cities.length > 0 && (
                        <div className="flex items-center gap-3">
                          <svg className="w-4 h-4 text-coral dark:text-coral-light flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <div className="flex flex-wrap gap-2">
                            {cities.map((city: string, index: number) => (
                              <span
                                key={`city-${index}`}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full text-sm dark:text-gray-200"
                              >
                                {city}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {provinces.length > 0 && (
                        <div className="flex items-center gap-3">
                          <svg className="w-4 h-4 text-coral dark:text-coral-light flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="flex flex-wrap gap-2">
                            {provinces.map((province: string, index: number) => (
                              <span
                                key={`province-${index}`}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full text-sm dark:text-gray-200"
                              >
                                {province}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Projects Section */}
        {hasProjects && (
          <div className="px-6 sm:px-8 pb-6 sm:pb-8">
            <div className="mb-6">
              <p className="text-coral dark:text-coral-light text-sm mb-2 uppercase notranslate">{L.projects}</p>
              <h2 className="text-3xl sm:text-4xl font-bold dark:text-gray-100 notranslate">
                {L.projectsBy} <span>{displayName}</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {project1EffectiveTitle && (
                <div className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden">
                  {user.Project1Pictures && user.Project1Pictures[0] && (
                    <div className="aspect-[4/3] relative bg-gray-200 dark:bg-gray-700">
                      <Image
                        src={user.Project1Pictures[0].url}
                        alt={user.Project1PicturesAltText || project1EffectiveTitle}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="text-xl font-bold dark:text-gray-100">{project1EffectiveTitle}</h3>
                  </div>
                </div>
              )}

              {project2EffectiveTitle && (
                <div className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden">
                  {user.Project2Pictures && user.Project2Pictures[0] && (
                    <div className="aspect-[4/3] relative bg-gray-200 dark:bg-gray-700">
                      <Image
                        src={user.Project2Pictures[0].url}
                        alt={user.Project2PicturesAltText || project2EffectiveTitle}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="text-xl font-bold dark:text-gray-100">{project2EffectiveTitle}</h3>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
