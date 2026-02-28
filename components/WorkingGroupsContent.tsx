'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import { getWorkingGroups } from '@/lib/strapi'
import type { StrapiResponse, WorkingGroup, WorkingGroupMemberRef } from '@/lib/types'
import LocalizedText from '@/components/LocalizedText'
import LoadingIndicator from '@/components/LoadingIndicator'

const PROPOSE_GROUP_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSe6vrAA7jPT4n6NH4FUIoKrYOs38drzBNR80paQz_gqLObWQg/viewform?usp=share_link&ouid=104930524495740710113'

function getImageUrl(image: WorkingGroupMemberRef['Image'] | WorkingGroup['Image']): string | null {
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

// Filter out hidden-profile members
function visibleMembers(members?: WorkingGroupMemberRef[]): WorkingGroupMemberRef[] {
  if (!members) return []
  return members.filter(m => !m.HideProfile)
}

export default function WorkingGroupsContent() {
  const { user } = useAuth()
  const [groups, setGroups] = useState<WorkingGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Join modal state
  const [joinModalGroup, setJoinModalGroup] = useState<WorkingGroup | null>(null)

  useEffect(() => {
    async function fetchGroups() {
      try {
        setLoading(true)
        const response: StrapiResponse<WorkingGroup[]> = await getWorkingGroups()
        setGroups(response.data || [])
      } catch (err) {
        setError('Αποτυχία φόρτωσης ομάδων εργασίας')
        console.error('Error fetching working groups:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchGroups()
  }, [])

  return (
    <div className="pt-20">
      <div className="max-w-5xl mx-auto px-4 pb-24">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            <LocalizedText
              text="Οι Ομάδες Εργασίας του Culture for Change. Μπορείς να δηλώσεις ενδιαφέρον ή να προτείνεις νέα ομάδα."
              engText="Culture for Change Working Groups. You can express interest to join or propose a new group."
            />
          </p>
        </div>

        {loading && <LoadingIndicator />}

        {error && !loading && (
          <div className="bg-orange-50 dark:bg-gray-700 border border-orange-200 dark:border-gray-600 rounded-lg p-6 text-center">
            <p className="text-orange-600 dark:text-orange-400 font-medium">{error}</p>
          </div>
        )}

        {!loading && !error && groups.length === 0 && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              Δεν βρέθηκαν ομάδες εργασίας
            </p>
          </div>
        )}

        {/* Groups Grid */}
        {!loading && !error && groups.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {groups.map((group) => (
              <WorkingGroupCard
                key={group.id}
                group={group}
                onJoinClick={() => setJoinModalGroup(group)}
              />
            ))}
          </div>
        )}

        {/* Propose New Group CTA */}
        <div className="mt-10">
          <a
            href={PROPOSE_GROUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 bg-coral/10 dark:bg-coral/20 rounded-2xl border-2 border-coral dark:border-coral-light hover:shadow-lg transition-all duration-200 p-6"
          >
            <div className="w-12 h-12 rounded-xl bg-coral dark:bg-coral-light flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-charcoal dark:text-gray-100 text-sm mb-1">
                <LocalizedText
                  text="Πρότεινε νέα ομάδα εργασίας"
                  engText="Propose a new working group"
                />
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-xs">
                <LocalizedText
                  text="Συμπλήρωσε τη φόρμα πρότασης"
                  engText="Fill in the proposal form"
                />
              </p>
            </div>
            <svg
              className="w-5 h-5 text-coral dark:text-coral-light flex-shrink-0 group-hover:translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>

      {/* Join Modal */}
      {joinModalGroup && user && (
        <JoinGroupModal
          group={joinModalGroup}
          userName={user.Name}
          userEmail={user.Email}
          userSlug={user.Slug}
          onClose={() => setJoinModalGroup(null)}
        />
      )}
    </div>
  )
}

// ── Working Group Card ──

function WorkingGroupCard({
  group,
  onJoinClick,
}: {
  group: WorkingGroup
  onJoinClick: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const groupImageUrl = getImageUrl(group.Image)
  const coordinator = group.Coordinator
  const members = visibleMembers(group.Members)
  const coordinatorImageUrl = coordinator ? getImageUrl(coordinator.Image) : null
  const VISIBLE_LIMIT = 5
  const showToggle = members.length > VISIBLE_LIMIT
  const displayedMembers = expanded ? members : members.slice(0, VISIBLE_LIMIT)

  return (
    <div className="bg-orange-50 dark:bg-gray-700 rounded-2xl border border-black dark:border-white hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col">
      {/* Group Image */}
      {groupImageUrl && (
        <div className="aspect-video relative overflow-hidden">
          <Image
            src={groupImageUrl}
            alt={group.ImageAltText || group.Name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
      )}

      {/* Card Body */}
      <div className="p-5 flex flex-col flex-1">
        {/* Title + Join button */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-lg font-bold text-charcoal dark:text-gray-100 leading-snug">
            <LocalizedText text={group.Name} engText={group.EngName} />
          </h3>
          {coordinator?.Email && (
            <button
              onClick={onJoinClick}
              className="flex-shrink-0 bg-coral hover:bg-coral/90 dark:bg-coral-light dark:hover:bg-coral-light/90 text-white rounded-full px-4 py-1.5 text-xs font-medium transition-colors whitespace-nowrap"
            >
              Αίτημα Συμμετοχής
            </button>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
          <LocalizedText text={group.Description} engText={group.EngDescription} />
        </p>

        {/* Coordinator */}
        {coordinator && !coordinator.HideProfile && (
          <div className="mb-3">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Συντονιστής
            </span>
            <div className="flex items-center gap-2 mt-1">
              {coordinatorImageUrl ? (
                <Image
                  src={coordinatorImageUrl}
                  alt={coordinator.ProfileImageAltText || coordinator.Name}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full object-cover border border-gray-300 dark:border-gray-500"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-coral/20 dark:bg-coral/30 flex items-center justify-center text-coral dark:text-coral-light text-xs font-bold">
                  {coordinator.Name.charAt(0)}
                </div>
              )}
              <Link
                href={`/members/${coordinator.Slug}`}
                className="text-sm font-medium text-charcoal dark:text-gray-200 hover:text-coral dark:hover:text-coral-light transition-colors"
              >
                {coordinator.Name}
              </Link>
            </div>
          </div>
        )}

        {/* Members */}
        {members.length > 0 && (
          <div className="mt-auto pt-3 border-t border-gray-200 dark:border-gray-600">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Μέλη ({members.length})
            </span>
            <div className="flex flex-wrap gap-1 mt-2">
              {displayedMembers.map((member, idx) => (
                <span key={member.id}>
                  <Link
                    href={`/members/${member.Slug}`}
                    className="text-xs text-charcoal dark:text-gray-300 hover:text-coral dark:hover:text-coral-light transition-colors"
                  >
                    {member.Name}
                  </Link>
                  {idx < displayedMembers.length - 1 && (
                    <span className="text-gray-400 dark:text-gray-500">, </span>
                  )}
                </span>
              ))}
              {showToggle && !expanded && (
                <button
                  onClick={() => setExpanded(true)}
                  className="text-xs text-coral dark:text-coral-light hover:underline ml-1"
                >
                  ...και {members.length - VISIBLE_LIMIT} ακόμη
                </button>
              )}
              {showToggle && expanded && (
                <button
                  onClick={() => setExpanded(false)}
                  className="text-xs text-coral dark:text-coral-light hover:underline ml-1"
                >
                  Λιγότερα
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Join Group Modal ──

function JoinGroupModal({
  group,
  userName,
  userEmail,
  userSlug,
  onClose,
}: {
  group: WorkingGroup
  userName: string
  userEmail: string
  userSlug?: string
  onClose: () => void
}) {
  const coordinatorName = group.Coordinator?.Name || ''
  const coordinatorEmail = group.Coordinator?.Email || ''
  const profileUrl = userSlug
    ? `https://cultureforchange.net/members/${userSlug}`
    : ''

  const defaultBody = `Αγαπητέ/ή ${coordinatorName},\n\nΟνομάζομαι ${userName} και θα ήθελα να εκδηλώσω το ενδιαφέρον μου για συμμετοχή στην Ομάδα Εργασίας «${group.Name}».\n\nΜπορείς να δεις το προφίλ μου εδώ: ${profileUrl}\n\nΜε εκτίμηση,\n${userName}`

  const [messageBody, setMessageBody] = useState(defaultBody)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = 'unset' }
  }, [])

  const handleSend = async () => {
    setSending(true)
    setResult(null)

    try {
      const res = await fetch('/api/working-groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coordinatorEmail,
          groupName: group.Name,
          messageBody,
          userName,
          userEmail,
          userProfileUrl: profileUrl,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setResult({ type: 'success', text: 'Το αίτημά σου στάλθηκε επιτυχώς!' })
      } else {
        setResult({ type: 'error', text: data.error || 'Αποτυχία αποστολής' })
      }
    } catch {
      setResult({ type: 'error', text: 'Σφάλμα δικτύου. Δοκίμασε ξανά.' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="join-modal-title">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-lg w-full p-8 max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          aria-label="Κλείσιμο"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Title */}
        <h3 id="join-modal-title" className="text-xl font-bold text-charcoal dark:text-gray-100 mb-1">
          Αίτημα Συμμετοχής
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Ομάδα Εργασίας: <span className="font-medium text-charcoal dark:text-gray-200">{group.Name}</span>
        </p>

        {/* Email preview fields */}
        <div className="space-y-3 mb-4 text-sm">
          <div className="flex gap-2">
            <span className="font-medium text-gray-500 dark:text-gray-400 min-w-[60px]">Προς:</span>
            <span className="text-charcoal dark:text-gray-200">{coordinatorName} &lt;{coordinatorEmail}&gt;</span>
          </div>
          <div className="flex gap-2">
            <span className="font-medium text-gray-500 dark:text-gray-400 min-w-[60px]">CC:</span>
            <span className="text-charcoal dark:text-gray-200 break-all">hello@cultureforchange.net, {userEmail}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-medium text-gray-500 dark:text-gray-400 min-w-[60px]">Από:</span>
            <span className="text-charcoal dark:text-gray-200">{userName} (μέσω Culture for Change)</span>
          </div>
        </div>

        {/* Editable body */}
        <label htmlFor="join-message" className="block text-sm font-medium text-charcoal dark:text-gray-200 mb-2">
          Μήνυμα
        </label>
        <textarea
          id="join-message"
          value={messageBody}
          onChange={(e) => setMessageBody(e.target.value)}
          rows={8}
          disabled={sending || result?.type === 'success'}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-coral focus:border-transparent dark:bg-gray-700 dark:text-gray-200 text-sm leading-relaxed resize-none disabled:opacity-60"
        />

        {/* Result message */}
        {result && (
          <div
            className={`mt-4 p-3 rounded-xl text-sm ${
              result.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
            }`}
          >
            {result.text}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-full font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
          >
            {result?.type === 'success' ? 'Κλείσιμο' : 'Ακύρωση'}
          </button>
          {result?.type !== 'success' && (
            <button
              onClick={handleSend}
              disabled={sending || !messageBody.trim()}
              className="flex-1 px-6 py-3 bg-coral hover:bg-coral/90 dark:bg-coral-light dark:hover:bg-coral-light/90 text-white rounded-full font-medium transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
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
                'Αποστολή'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
