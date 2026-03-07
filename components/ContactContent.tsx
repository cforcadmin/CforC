'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import { getCoordinationTeams } from '@/lib/strapi'
import type { StrapiResponse, CoordinationTeam, WorkingGroupMemberRef } from '@/lib/types'

// Role mapping: Coordinator = President, then Members by index
const ROLE_MAP: Record<number, { title: string; email: string; description: string }> = {
  0: { title: 'Υπεύθυνη Κοινότητας', email: 'community@cultureforchange.net', description: 'Εγγραφές μελών, διαχείριση κοινότητας και θέματα συνδρομών.' },
  1: { title: 'Υπεύθυνη Επικοινωνίας', email: 'communication@cultureforchange.net', description: 'Εξωτερική επικοινωνία, δημόσια εικόνα και προβολή του δικτύου.' },
  2: { title: 'Υπεύθυνος Οικονομικών & IT', email: 'finance@cultureforchange.net', description: 'Οικονομική διαχείριση, τεχνική υποστήριξη, ανάπτυξη και λειτουργία website.' },
  3: { title: 'Αντιπρόεδρος', email: 'outreach@cultureforchange.net', description: 'Υποστήριξη και αναπλήρωση της Προέδρου, εξωτερικές σχέσεις.' },
}

const PRESIDENT_ROLE = {
  title: 'Πρόεδρος',
  email: 'coordinator@cultureforchange.net',
  description: 'Γενική εποπτεία λειτουργίας του δικτύου και συντονισμός δράσεων.',
}

const ADMIN_ROLE = {
  title: 'Διαχειρίστρια',
  email: 'hello@cultureforchange.net',
  description: 'Διοικητική υποστήριξη και διαχείριση γραφείου.',
}

// ── Shared contact row component ──

function ContactRow({ member, role }: { member: WorkingGroupMemberRef; role: { title: string; email: string; description: string } }) {
  const imageUrl = getImageUrl(member.Image)
  const [copied, setCopied] = useState(false)

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(role.email)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex gap-3">
      <Link href={`/members/${member.Slug}`} className="flex-shrink-0">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={member.ProfileImageAltText || member.Name}
            width={44}
            height={44}
            className="w-11 h-11 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600 hover:border-coral dark:hover:border-coral-light transition-colors"
          />
        ) : (
          <div className="w-11 h-11 rounded-full bg-coral/20 dark:bg-coral/30 flex items-center justify-center text-coral dark:text-coral-light font-bold border-2 border-gray-200 dark:border-gray-600">
            {member.Name.charAt(0)}
          </div>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/members/${member.Slug}`}
            className="text-sm font-bold text-charcoal dark:text-gray-100 hover:text-coral dark:hover:text-coral-light transition-colors"
          >
            {member.Name}
          </Link>
          <span className="text-[10px] bg-coral/10 dark:bg-coral/20 text-charcoal dark:text-gray-200 border border-charcoal/30 dark:border-gray-500 px-2 py-0.5 rounded-full">
            {role.title}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed line-clamp-2">
          {role.description}
        </p>
        <button
          type="button"
          onClick={handleCopyEmail}
          className="text-xs text-coral dark:text-coral-light hover:text-charcoal dark:hover:text-white mt-1 inline-flex items-center gap-1 transition-colors"
        >
          {copied ? (
            <span className="text-green-600 dark:text-green-400 font-medium">Αντιγράφηκε!</span>
          ) : (
            role.email
          )}
        </button>
      </div>
    </div>
  )
}

function getImageUrl(image: WorkingGroupMemberRef['Image']): string | null {
  if (!image) return null
  if (Array.isArray(image) && image.length > 0) {
    const url = image[0].url
    return url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${url}`
  }
  if (typeof image === 'object' && !Array.isArray(image) && 'url' in image) {
    const url = (image as { url: string }).url
    return url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${url}`
  }
  return null
}

export default function ContactContent() {
  const { user } = useAuth()
  const [currentTeam, setCurrentTeam] = useState<CoordinationTeam | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTeam() {
      try {
        const response: StrapiResponse<CoordinationTeam[]> = await getCoordinationTeams()
        const current = response.data?.find(t => t.IsCurrent)
        setCurrentTeam(current || null)
      } catch (err) {
        console.error('Error fetching coordination team:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchTeam()
  }, [])

  // Derive admin email dynamically from current team
  const adminEmail = currentTeam?.Admin ? (
    ADMIN_ROLE.email
  ) : 'hello@cultureforchange.net'

  return (
    <div className="grid md:grid-cols-2 gap-8 items-start">
      {/* Non-member contact card */}
      <GeneralContactCard adminEmail={adminEmail} />

      {/* Member contact card */}
      <MemberContactCard user={user} currentTeam={currentTeam} loading={loading} />
    </div>
  )
}

// ── General Contact (Non-member) Flip Card ──

function GeneralContactCard({ adminEmail }: { adminEmail: string }) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formState, setFormState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [formError, setFormError] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [emailCopied, setEmailCopied] = useState(false)
  const [phoneCopied, setPhoneCopied] = useState(false)
  const flipTimeout = useRef<NodeJS.Timeout | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    navigator.clipboard.writeText('hello@cultureforchange.net')
    setEmailCopied(true)
    setTimeout(() => setEmailCopied(false), 2000)
  }

  const handleCopyPhone = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    navigator.clipboard.writeText('+306976225704')
    setPhoneCopied(true)
    setTimeout(() => setPhoneCopied(false), 2000)
  }

  const handleMouseEnter = () => {
    flipTimeout.current = setTimeout(() => setIsFlipped(true), 300)
  }
  const handleMouseLeave = () => {
    if (flipTimeout.current) clearTimeout(flipTimeout.current)
    setIsFlipped(false)
  }
  const handleTap = () => {
    setIsFlipped(prev => !prev)
  }

  const handleFormOpen = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowForm(true)
  }

  const handleFormClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowForm(false)
    setFormState('idle')
    setFormError('')
    setTermsAccepted(false)
    setAttachment(null)
    formRef.current?.reset()
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setFormError('')
    setFormState('sending')

    const form = e.currentTarget
    const formData = new FormData(form)
    formData.set('termsAccepted', termsAccepted ? 'true' : 'false')
    formData.set('to', adminEmail)
    if (attachment) {
      formData.set('attachment', attachment)
    }

    try {
      const res = await fetch('/api/contact', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error || 'Αποτυχία αποστολής.')
        setFormState('error')
        return
      }
      setFormState('success')
    } catch {
      setFormError('Αποτυχία αποστολής. Δοκιμάστε ξανά.')
      setFormState('error')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    if (file && file.size > 5 * 1024 * 1024) {
      setFormError('Το αρχείο δεν μπορεί να υπερβαίνει τα 5MB.')
      e.target.value = ''
      return
    }
    setFormError('')
    setAttachment(file)
  }

  const backMinHeight = (showForm || formState === 'success') ? '780px' : '420px'

  return (
    <div
      className="[perspective:1200px]"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleTap}
    >
      <div
        className="relative w-full transition-transform duration-500 [transform-style:preserve-3d]"
        style={{
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          minHeight: isFlipped ? backMinHeight : '420px',
          transition: 'transform 0.5s, min-height 0.4s ease',
        }}
      >
        {/* Front */}
        <div className="absolute inset-0 [backface-visibility:hidden]" style={{ minHeight: '420px' }}>
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border-l-4 border-transparent hover:border-coral dark:hover:border-coral-light transition-all h-full flex flex-col items-center justify-center p-10 cursor-pointer" style={{ minHeight: '420px' }}>
            <div className="w-20 h-20 bg-coral/10 dark:bg-coral/20 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-coral dark:text-coral-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-charcoal dark:text-gray-100 mb-2">Γενική Επικοινωνία</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm text-center max-w-xs">
              Στοιχεία επικοινωνίας για εξωτερικούς συνεργάτες, οργανισμούς και ενδιαφερόμενους.
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Hover ή πατήστε για στοιχεία</span>
            </div>
          </div>
        </div>

        {/* Back */}
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border-l-4 border-coral dark:border-coral-light h-full flex flex-col p-8 overflow-hidden">
            <h3 className="text-lg font-bold text-coral dark:text-coral-light mb-5">Στοιχεία Επικοινωνίας</h3>

            <div className="space-y-4 flex-1">
              {/* Address */}
              <a
                href="https://www.google.com/maps/place/Leof.+Alexandras+48,+Athina+114+73"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 group"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-9 h-9 rounded-full bg-coral/10 dark:bg-coral/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-coral dark:text-coral-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-charcoal dark:text-gray-200 group-hover:text-coral dark:group-hover:text-coral-light transition-colors">Λ. Αλεξάνδρας 48</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">114 73, Αθήνα</p>
                </div>
              </a>

              {/* Email */}
              <button
                type="button"
                className="flex items-center gap-3 group w-full text-left"
                onClick={handleCopyEmail}
              >
                <div className="w-9 h-9 rounded-full bg-coral/10 dark:bg-coral/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-coral dark:text-coral-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-charcoal dark:text-gray-200 group-hover:text-coral dark:group-hover:text-coral-light transition-colors">hello@cultureforchange.net</p>
                  {emailCopied && <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">Αντιγράφηκε!</span>}
                </div>
              </button>

              {/* Phone */}
              <button
                type="button"
                className="flex items-center gap-3 group w-full text-left"
                onClick={handleCopyPhone}
              >
                <div className="w-9 h-9 rounded-full bg-coral/10 dark:bg-coral/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-coral dark:text-coral-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-charcoal dark:text-gray-200 group-hover:text-coral dark:group-hover:text-coral-light transition-colors">+30 697 622 5704</p>
                  {phoneCopied && <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">Αντιγράφηκε!</span>}
                </div>
              </button>

              {/* Social Media */}
              <div className="pt-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Social Media</p>
                <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
                  <a href="https://www.linkedin.com/company/culture-for-change-gr/" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-coral/10 dark:hover:bg-coral/20 transition-colors">
                    <Image src="/linkedin-icon-lg.png" alt="LinkedIn" width={18} height={18} className="dark:invert" />
                  </a>
                  <a href="https://www.facebook.com/cultureforchange" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-coral/10 dark:hover:bg-coral/20 transition-colors">
                    <Image src="/facebook-icon-lg.png" alt="Facebook" width={18} height={18} className="dark:invert" />
                  </a>
                  <a href="https://www.instagram.com/culture_for_change/" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-coral/10 dark:hover:bg-coral/20 transition-colors">
                    <Image src="/instagram-icon-lg.png" alt="Instagram" width={18} height={18} className="dark:invert" />
                  </a>
                  <a href="https://www.youtube.com/channel/UCKFq7TQlenx36UPc3F63Opw" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-coral/10 dark:hover:bg-coral/20 transition-colors">
                    <Image src="/youtube-icon-lg.png" alt="YouTube" width={18} height={18} className="dark:invert" />
                  </a>
                  <a href="https://vimeo.com/user165582483" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-coral/10 dark:hover:bg-coral/20 transition-colors">
                    <Image src="/vimeo-square-icon-md.png" alt="Vimeo" width={18} height={18} className="dark:invert" />
                  </a>
                </div>
              </div>

              {/* Contact Form Toggle / Form */}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-600" onClick={(e) => e.stopPropagation()}>
                {!showForm && formState !== 'success' && (
                  <button
                    onClick={handleFormOpen}
                    className="w-full flex items-center justify-center gap-2 bg-charcoal dark:bg-gray-700 text-white px-4 py-2.5 rounded-full text-sm font-medium hover:bg-coral dark:hover:bg-coral-light dark:hover:text-charcoal transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Στείλε μας μήνυμα
                  </button>
                )}

                {showForm && formState !== 'success' && (
                  <form ref={formRef} onSubmit={handleSubmit} className="space-y-3 mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold text-charcoal dark:text-gray-100 uppercase tracking-wide">Φόρμα Επικοινωνίας</p>
                      <button type="button" onClick={handleFormClose} className="text-charcoal dark:text-gray-100 hover:text-coral dark:hover:text-coral-light transition-colors" aria-label="Κλείσιμο φόρμας">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="Email *"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-charcoal dark:border-gray-400 bg-white dark:bg-gray-700 text-charcoal dark:text-gray-100 placeholder-charcoal/60 dark:placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-coral dark:focus:ring-coral-light"
                    />
                    <input
                      type="text"
                      name="name"
                      placeholder="Όνομα (προαιρετικό)"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-charcoal dark:border-gray-400 bg-white dark:bg-gray-700 text-charcoal dark:text-gray-100 placeholder-charcoal/60 dark:placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-coral dark:focus:ring-coral-light"
                    />
                    <textarea
                      name="message"
                      required
                      rows={3}
                      maxLength={5000}
                      placeholder="Το μήνυμά σου *"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-charcoal dark:border-gray-400 bg-white dark:bg-gray-700 text-charcoal dark:text-gray-100 placeholder-charcoal/60 dark:placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-coral dark:focus:ring-coral-light resize-none"
                    />

                    {/* Attachment */}
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs text-charcoal dark:text-gray-100 cursor-pointer hover:text-coral dark:hover:text-coral-light transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        <span>{attachment ? attachment.name : 'Συνημμένο (max 5MB)'}</span>
                        <input type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt,.csv,.xls,.xlsx,.zip" />
                      </label>
                      {attachment && (
                        <button type="button" onClick={() => setAttachment(null)} className="text-gray-400 hover:text-red-500 transition-colors" aria-label="Αφαίρεση αρχείου">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Terms */}
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="mt-0.5 rounded border-charcoal dark:border-gray-400 text-coral focus:ring-coral dark:focus:ring-coral-light"
                      />
                      <span className="text-[11px] text-charcoal dark:text-gray-100 leading-tight">
                        Αποδέχομαι τους{' '}
                        <Link href="/terms" className="text-coral dark:text-coral-light hover:underline" target="_blank">Όρους Χρήσης</Link>
                        {' '}και την{' '}
                        <Link href="/privacy" className="text-coral dark:text-coral-light hover:underline" target="_blank">Πολιτική Απορρήτου</Link>.
                      </span>
                    </label>

                    {formError && (
                      <p className="text-xs text-red-500 dark:text-red-400">{formError}</p>
                    )}

                    <button
                      type="submit"
                      disabled={formState === 'sending' || !termsAccepted}
                      className="w-full bg-coral dark:bg-coral-light text-white dark:text-charcoal px-4 py-2.5 rounded-full text-sm font-medium hover:bg-charcoal dark:hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {formState === 'sending' ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white dark:border-charcoal border-t-transparent rounded-full animate-spin" />
                          Αποστολή...
                        </>
                      ) : 'Αποστολή'}
                    </button>
                  </form>
                )}

                {formState === 'success' && (
                  <div className="mt-2 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="mb-3">
                      <svg className="w-10 h-10 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-base font-bold text-charcoal dark:text-gray-100 mb-1">Το μήνυμά σου στάλθηκε!</p>
                    <p className="text-sm text-charcoal dark:text-gray-100 mb-4">Αντίγραφο στάλθηκε και στο email σου.</p>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-left">
                      <p className="text-xs font-semibold text-charcoal dark:text-gray-100 uppercase tracking-wide mb-2">Πληροφορίες GDPR</p>
                      <ul className="text-xs text-charcoal dark:text-gray-100 space-y-1.5 leading-relaxed">
                        <li>Τα δεδομένα σου διαγράφονται 30 ημέρες μετά την ολοκλήρωση της επικοινωνίας, εκτός αν ζητήσεις νωρίτερη διαγραφή.</li>
                        <li>Μπορείς να ζητήσεις διαγραφή ανά πάσα στιγμή στο <a href="mailto:hello@cultureforchange.net" className="text-coral dark:text-coral-light hover:underline">hello@cultureforchange.net</a>.</li>
                        <li>Χρησιμοποιούμε τα δεδομένα σου αποκλειστικά για την απάντηση του μηνύματός σου.</li>
                      </ul>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowForm(false)
                        setFormState('idle')
                        setFormError('')
                        setTermsAccepted(false)
                        setAttachment(null)
                        formRef.current?.reset()
                      }}
                      className="mt-4 w-full bg-coral dark:bg-coral-light text-white dark:text-charcoal px-4 py-2.5 rounded-full text-sm font-medium hover:bg-charcoal dark:hover:bg-white transition-colors"
                    >
                      Κλείσιμο
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Member Contact Flip Card ──

function MemberContactCard({
  user,
  currentTeam,
  loading,
}: {
  user: ReturnType<typeof useAuth>['user']
  currentTeam: CoordinationTeam | null
  loading: boolean
}) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formState, setFormState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [formError, setFormError] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [toRecipients, setToRecipients] = useState<string[]>([])
  const [ccRecipients, setCcRecipients] = useState<string[]>([])
  const [toDropdownOpen, setToDropdownOpen] = useState(false)
  const [ccDropdownOpen, setCcDropdownOpen] = useState(false)
  const flipTimeout = useRef<NodeJS.Timeout | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // Close dropdowns on Escape
  useEffect(() => {
    if (!toDropdownOpen && !ccDropdownOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setToDropdownOpen(false); setCcDropdownOpen(false) }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [toDropdownOpen, ccDropdownOpen])

  const handleMouseEnter = () => {
    flipTimeout.current = setTimeout(() => setIsFlipped(true), 300)
  }
  const handleMouseLeave = () => {
    if (flipTimeout.current) clearTimeout(flipTimeout.current)
    setIsFlipped(false)
  }
  const handleTap = () => {
    setIsFlipped(prev => !prev)
  }

  const handleFormOpen = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Pre-fill TO with admin email
    const adminMail = currentTeam?.Admin ? ADMIN_ROLE.email : 'hello@cultureforchange.net'
    setToRecipients([adminMail])
    setCcRecipients([])
    setShowForm(true)
  }

  const handleFormClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowForm(false)
    setFormState('idle')
    setFormError('')
    setTermsAccepted(false)
    setAttachment(null)
    setToRecipients([])
    setCcRecipients([])
    formRef.current?.reset()
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setFormError('')

    if (toRecipients.length === 0) {
      setFormError('Πρόσθεσε τουλάχιστον έναν παραλήπτη.')
      return
    }

    setFormState('sending')

    const form = e.currentTarget
    const formData = new FormData(form)
    formData.set('termsAccepted', termsAccepted ? 'true' : 'false')
    formData.set('to', toRecipients.join(','))
    if (ccRecipients.length > 0) {
      formData.set('cc', ccRecipients.join(','))
    }
    if (attachment) {
      formData.set('attachment', attachment)
    }

    try {
      const res = await fetch('/api/contact', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error || 'Αποτυχία αποστολής.')
        setFormState('error')
        return
      }
      setFormState('success')
    } catch {
      setFormError('Αποτυχία αποστολής. Δοκιμάστε ξανά.')
      setFormState('error')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    if (file && file.size > 5 * 1024 * 1024) {
      setFormError('Το αρχείο δεν μπορεί να υπερβαίνει τα 5MB.')
      e.target.value = ''
      return
    }
    setFormError('')
    setAttachment(file)
  }

  // Build team contact list from coordination team data
  const teamContacts: { member: WorkingGroupMemberRef; role: typeof PRESIDENT_ROLE }[] = []
  if (currentTeam) {
    if (currentTeam.Coordinator && !currentTeam.Coordinator.HideProfile) {
      teamContacts.push({ member: currentTeam.Coordinator, role: PRESIDENT_ROLE })
    }
    const members = currentTeam.Members?.filter(m => !m.HideProfile) || []
    members.forEach((member, index) => {
      const role = ROLE_MAP[index]
      if (role) {
        teamContacts.push({ member, role })
      }
    })
  }

  // Build available team emails for TO/CC dropdowns
  const availableEmails: { email: string; label: string }[] = []
  if (currentTeam?.Admin && !currentTeam.Admin.HideProfile) {
    availableEmails.push({ email: ADMIN_ROLE.email, label: `${ADMIN_ROLE.title} (${ADMIN_ROLE.email})` })
  }
  teamContacts.forEach(({ role }) => {
    availableEmails.push({ email: role.email, label: `${role.title} (${role.email})` })
  })
  availableEmails.push({ email: 'it@cultureforchange.net', label: 'IT (it@cultureforchange.net)' })

  // When not logged in, the back shows a members-only prompt
  const showMembersOnly = !user

  return (
    <div
      className="[perspective:1200px]"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleTap}
    >
      <div
        className="relative w-full transition-transform duration-500 [transform-style:preserve-3d]"
        style={{
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          minHeight: isFlipped && !showMembersOnly ? ((showForm || formState === 'success') ? '1100px' : '650px') : '420px',
          transition: 'transform 0.5s, min-height 0.4s ease',
        }}
      >
        {/* Front */}
        <div className="absolute inset-0 [backface-visibility:hidden]" style={{ minHeight: '420px' }}>
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border-l-4 border-transparent hover:border-coral dark:hover:border-coral-light transition-all h-full flex flex-col items-center justify-center p-10 cursor-pointer" style={{ minHeight: '420px' }}>
            <div className="w-20 h-20 bg-coral/10 dark:bg-coral/20 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-coral dark:text-coral-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-charcoal dark:text-gray-100 mb-2">Επικοινωνία Μέλους</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm text-center max-w-xs">
              Άμεση επικοινωνία με την Ομάδα Συντονισμού του δικτύου.
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Hover ή πατήστε για στοιχεία</span>
            </div>
          </div>
        </div>

        {/* Back */}
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          {showMembersOnly ? (
            /* Logged out: members-only prompt */
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border-l-4 border-coral dark:border-coral-light h-full flex flex-col items-center justify-center p-8" style={{ minHeight: '420px' }}>
              <div className="text-center">
                <div className="mb-4">
                  <svg className="w-16 h-16 text-coral dark:text-coral-light mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4 dark:text-gray-100">Περιεχόμενο Μελών</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
                  Τα στοιχεία επικοινωνίας της Ομάδας Συντονισμού είναι διαθέσιμα μόνο για εγγεγραμμένα μέλη.
                </p>
                <div className="flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
                  <Link
                    href="/participation"
                    className="bg-charcoal dark:bg-gray-700 text-coral dark:text-coral-light border-2 border-coral dark:border-coral-light px-6 py-3 rounded-full font-medium hover:bg-coral hover:text-white dark:hover:bg-coral-light dark:hover:text-gray-900 transition-colors"
                  >
                    Εγγραφή
                  </Link>
                  <Link
                    href="/login?returnTo=%2Fcontact"
                    className="bg-white dark:bg-gray-700 text-coral dark:text-coral-light border-2 border-coral dark:border-coral-light px-6 py-3 rounded-full font-medium hover:bg-coral hover:text-white dark:hover:bg-coral-light dark:hover:text-white transition-colors"
                  >
                    Σύνδεση
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            /* Logged in: team contacts */
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border-l-4 border-coral dark:border-coral-light flex flex-col p-6" style={{ minHeight: (showForm || formState === 'success') ? '1100px' : '650px', transition: 'min-height 0.4s ease' }}>
              <h3 className="text-lg font-bold text-coral dark:text-coral-light mb-4">Ομάδα Συντονισμού</h3>

              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-coral border-t-transparent rounded-full animate-spin" />
                </div>
              ) : teamContacts.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">Δεν βρέθηκαν στοιχεία ομάδας.</p>
              ) : (
                <div className="space-y-4 flex-1" onClick={(e) => e.stopPropagation()}>
                  {teamContacts.map(({ member, role }) => (
                    <ContactRow key={member.id} member={member} role={role} />
                  ))}

                  {/* Admin separator + entry */}
                  {currentTeam?.Admin && !currentTeam.Admin.HideProfile && (
                    <>
                      <div className="border-t border-gray-200 dark:border-gray-600 my-1" />
                      <ContactRow member={currentTeam.Admin} role={ADMIN_ROLE} />
                    </>
                  )}

                  {/* Contact Form Toggle / Form */}
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                    {!showForm && formState !== 'success' && (
                      <button
                        onClick={handleFormOpen}
                        className="w-full flex items-center justify-center gap-2 bg-charcoal dark:bg-gray-700 text-white px-4 py-2.5 rounded-full text-sm font-medium hover:bg-coral dark:hover:bg-coral-light dark:hover:text-charcoal transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Στείλε μας μήνυμα
                      </button>
                    )}

                    {showForm && formState !== 'success' && (
                      <form ref={formRef} onSubmit={handleSubmit} className="space-y-3 mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold text-charcoal dark:text-gray-100 uppercase tracking-wide">Φόρμα Επικοινωνίας</p>
                          <button type="button" onClick={handleFormClose} className="text-charcoal dark:text-gray-100 hover:text-coral dark:hover:text-coral-light transition-colors" aria-label="Κλείσιμο φόρμας">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        {/* FROM section */}
                        <div>
                          <p className="text-[10px] font-semibold text-charcoal dark:text-gray-100 uppercase tracking-wide mb-1">Από</p>
                          <input
                            type="email"
                            name="email"
                            required
                            defaultValue={user?.Email || ''}
                            placeholder="Email *"
                            className="w-full px-3 py-2 text-sm rounded-xl border border-charcoal dark:border-gray-400 bg-white dark:bg-gray-700 text-charcoal dark:text-gray-100 placeholder-charcoal/60 dark:placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-coral dark:focus:ring-coral-light"
                          />
                          <input
                            type="text"
                            name="name"
                            defaultValue={user?.Name || ''}
                            placeholder="Όνομα (προαιρετικό)"
                            className="w-full px-3 py-2 text-sm rounded-xl border border-charcoal dark:border-gray-400 bg-white dark:bg-gray-700 text-charcoal dark:text-gray-100 placeholder-charcoal/60 dark:placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-coral dark:focus:ring-coral-light mt-2"
                          />
                        </div>

                        {/* TO section */}
                        <div>
                          <p className="text-[10px] font-semibold text-charcoal dark:text-gray-100 uppercase tracking-wide mb-1">Προς</p>
                          <div className="flex flex-wrap gap-1.5 mb-1.5">
                            {toRecipients.map((email) => (
                              <span key={email} className="inline-flex items-center gap-1 bg-coral/10 dark:bg-coral/20 text-charcoal dark:text-gray-100 border border-charcoal dark:border-gray-400 text-[11px] px-2 py-0.5 rounded-full">
                                {email}
                                <button type="button" onClick={() => setToRecipients(prev => prev.filter(e => e !== email))} className="text-charcoal/60 dark:text-gray-400 hover:text-red-500 transition-colors" aria-label={`Αφαίρεση ${email}`}>
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                              </span>
                            ))}
                          </div>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => { setToDropdownOpen(prev => !prev); setCcDropdownOpen(false) }}
                              className="text-[11px] text-coral dark:text-coral-light hover:underline"
                            >
                              + Πρόσθεσε παραλήπτη
                            </button>
                            {toDropdownOpen && (
                              <div className="absolute left-0 top-full mt-1 bg-white dark:bg-gray-700 border border-charcoal dark:border-gray-500 rounded-xl shadow-lg z-20 py-1 w-full max-h-32 overflow-y-auto">
                                {availableEmails.filter(e => !toRecipients.includes(e.email) && !ccRecipients.includes(e.email)).map(({ email, label }) => (
                                  <button
                                    key={email}
                                    type="button"
                                    onClick={() => { setToRecipients(prev => [...prev, email]); setToDropdownOpen(false) }}
                                    className="w-full text-left px-3 py-1.5 text-[11px] text-charcoal dark:text-gray-100 hover:bg-coral/10 dark:hover:bg-coral/20 transition-colors"
                                  >
                                    {label}
                                  </button>
                                ))}
                                {availableEmails.filter(e => !toRecipients.includes(e.email) && !ccRecipients.includes(e.email)).length === 0 && (
                                  <p className="px-3 py-1.5 text-[11px] text-gray-400 dark:text-gray-500">Όλα τα emails έχουν προστεθεί</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* CC section */}
                        <div>
                          <p className="text-[10px] font-semibold text-charcoal dark:text-gray-100 uppercase tracking-wide mb-1">Κοιν.</p>
                          <div className="flex flex-wrap gap-1.5 mb-1.5">
                            {ccRecipients.map((email) => (
                              <span key={email} className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-600 text-charcoal dark:text-gray-100 border border-charcoal dark:border-gray-400 text-[11px] px-2 py-0.5 rounded-full">
                                {email}
                                <button type="button" onClick={() => setCcRecipients(prev => prev.filter(e => e !== email))} className="text-charcoal/60 dark:text-gray-400 hover:text-red-500 transition-colors" aria-label={`Αφαίρεση ${email}`}>
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                              </span>
                            ))}
                          </div>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => { setCcDropdownOpen(prev => !prev); setToDropdownOpen(false) }}
                              className="text-[11px] text-coral dark:text-coral-light hover:underline"
                            >
                              + Πρόσθεσε κοινοποίηση
                            </button>
                            {ccDropdownOpen && (
                              <div className="absolute left-0 top-full mt-1 bg-white dark:bg-gray-700 border border-charcoal dark:border-gray-500 rounded-xl shadow-lg z-20 py-1 w-full max-h-32 overflow-y-auto">
                                {availableEmails.filter(e => !toRecipients.includes(e.email) && !ccRecipients.includes(e.email)).map(({ email, label }) => (
                                  <button
                                    key={email}
                                    type="button"
                                    onClick={() => { setCcRecipients(prev => [...prev, email]); setCcDropdownOpen(false) }}
                                    className="w-full text-left px-3 py-1.5 text-[11px] text-charcoal dark:text-gray-100 hover:bg-coral/10 dark:hover:bg-coral/20 transition-colors"
                                  >
                                    {label}
                                  </button>
                                ))}
                                {availableEmails.filter(e => !toRecipients.includes(e.email) && !ccRecipients.includes(e.email)).length === 0 && (
                                  <p className="px-3 py-1.5 text-[11px] text-gray-400 dark:text-gray-500">Όλα τα emails έχουν προστεθεί</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Message */}
                        <textarea
                          name="message"
                          required
                          rows={3}
                          maxLength={5000}
                          placeholder="Το μήνυμά σου *"
                          className="w-full px-3 py-2 text-sm rounded-xl border border-charcoal dark:border-gray-400 bg-white dark:bg-gray-700 text-charcoal dark:text-gray-100 placeholder-charcoal/60 dark:placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-coral dark:focus:ring-coral-light resize-none"
                        />

                        {/* Attachment */}
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 text-xs text-charcoal dark:text-gray-100 cursor-pointer hover:text-coral dark:hover:text-coral-light transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            <span>{attachment ? attachment.name : 'Συνημμένο (max 5MB)'}</span>
                            <input type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt,.csv,.xls,.xlsx,.zip" />
                          </label>
                          {attachment && (
                            <button type="button" onClick={() => setAttachment(null)} className="text-gray-400 hover:text-red-500 transition-colors" aria-label="Αφαίρεση αρχείου">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>

                        {/* Terms */}
                        <label className="flex items-start gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={termsAccepted}
                            onChange={(e) => setTermsAccepted(e.target.checked)}
                            className="mt-0.5 rounded border-charcoal dark:border-gray-400 text-coral focus:ring-coral dark:focus:ring-coral-light"
                          />
                          <span className="text-[11px] text-charcoal dark:text-gray-100 leading-tight">
                            Αποδέχομαι τους{' '}
                            <Link href="/terms" className="text-coral dark:text-coral-light hover:underline" target="_blank">Όρους Χρήσης</Link>
                            {' '}και την{' '}
                            <Link href="/privacy" className="text-coral dark:text-coral-light hover:underline" target="_blank">Πολιτική Απορρήτου</Link>.
                          </span>
                        </label>

                        {formError && (
                          <p className="text-xs text-red-500 dark:text-red-400">{formError}</p>
                        )}

                        <button
                          type="submit"
                          disabled={formState === 'sending' || !termsAccepted || toRecipients.length === 0}
                          className="w-full bg-coral dark:bg-coral-light text-white dark:text-charcoal px-4 py-2.5 rounded-full text-sm font-medium hover:bg-charcoal dark:hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {formState === 'sending' ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white dark:border-charcoal border-t-transparent rounded-full animate-spin" />
                              Αποστολή...
                            </>
                          ) : 'Αποστολή'}
                        </button>
                      </form>
                    )}

                    {formState === 'success' && (
                      <div className="mt-2 text-center">
                        <div className="mb-3">
                          <svg className="w-10 h-10 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-base font-bold text-charcoal dark:text-gray-100 mb-1">Το μήνυμά σου στάλθηκε!</p>
                        <p className="text-sm text-charcoal dark:text-gray-100 mb-4">Αντίγραφο στάλθηκε και στο email σου.</p>
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-left">
                          <p className="text-xs font-semibold text-charcoal dark:text-gray-100 uppercase tracking-wide mb-2">Πληροφορίες GDPR</p>
                          <ul className="text-xs text-charcoal dark:text-gray-100 space-y-1.5 leading-relaxed">
                            <li>Ως μέλος του CforC, τα προσωπικά σου δεδομένα διατηρούνται σύμφωνα με τους <Link href="/terms" className="text-coral dark:text-coral-light hover:underline" target="_blank">Όρους Χρήσης</Link> και την <Link href="/privacy" className="text-coral dark:text-coral-light hover:underline" target="_blank">Πολιτική Απορρήτου</Link>.</li>
                            <li>Το περιεχόμενο αυτού του μηνύματος χρησιμοποιείται αποκλειστικά για την απάντησή του.</li>
                            <li>Μπορείς να ζητήσεις διαγραφή του παρόντος μηνύματος ανά πάσα στιγμή στο <a href="mailto:hello@cultureforchange.net" className="text-coral dark:text-coral-light hover:underline">hello@cultureforchange.net</a>.</li>
                          </ul>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowForm(false)
                            setFormState('idle')
                            setFormError('')
                            setTermsAccepted(false)
                            setAttachment(null)
                            formRef.current?.reset()
                          }}
                          className="mt-4 w-full bg-coral dark:bg-coral-light text-white dark:text-charcoal px-4 py-2.5 rounded-full text-sm font-medium hover:bg-charcoal dark:hover:bg-white transition-colors"
                        >
                          Κλείσιμο
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
