'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { getCoordinationTeams } from '@/lib/strapi'
import type { StrapiResponse, CoordinationTeam, WorkingGroupMemberRef } from '@/lib/types'
import LocalizedText from '@/components/LocalizedText'
import LoadingIndicator from '@/components/LoadingIndicator'

function getImageUrl(image: WorkingGroupMemberRef['Image'] | CoordinationTeam['Image']): string | null {
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

function visibleMembers(members?: WorkingGroupMemberRef[]): WorkingGroupMemberRef[] {
  if (!members) return []
  return members.filter(m => !m.HideProfile)
}

export default function CoordinationTeamContent() {
  const [teams, setTeams] = useState<CoordinationTeam[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTeams() {
      try {
        setLoading(true)
        const response: StrapiResponse<CoordinationTeam[]> = await getCoordinationTeams()
        setTeams(response.data || [])
      } catch (err) {
        setError('Αποτυχία φόρτωσης ομάδων συντονισμού')
        console.error('Error fetching coordination teams:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchTeams()
  }, [])

  const currentTeams = teams.filter(t => t.IsCurrent)
  const pastTeams = teams.filter(t => !t.IsCurrent)

  return (
    <div className="max-w-5xl mx-auto px-4 pb-24">
      {loading && <LoadingIndicator />}

      {error && !loading && (
        <div className="bg-orange-50 dark:bg-gray-700 border border-orange-200 dark:border-gray-600 rounded-lg p-6 text-center">
          <p className="text-orange-600 dark:text-orange-400 font-medium">{error}</p>
        </div>
      )}

      {!loading && !error && teams.length === 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400 font-medium">
            Δεν βρέθηκαν ομάδες συντονισμού
          </p>
        </div>
      )}

      {/* Current Team(s) */}
      {!loading && !error && currentTeams.length > 0 && (
        <div className="mb-16">
          {currentTeams.map((team) => (
            <CurrentTeamCard key={team.id} team={team} />
          ))}
        </div>
      )}

      {/* Past Teams */}
      {!loading && !error && pastTeams.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-charcoal dark:text-gray-100 mb-8">
            Προηγούμενες Ομάδες Συντονισμού
          </h2>
          <div className="space-y-6">
            {pastTeams.map((team) => (
              <PastTeamCard key={team.id} team={team} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Current Team Card (prominent display) ──

function CurrentTeamCard({ team }: { team: CoordinationTeam }) {
  const teamImageUrl = getImageUrl(team.Image)
  const coordinator = team.Coordinator
  const coordinatorImageUrl = coordinator ? getImageUrl(coordinator.Image) : null
  const members = visibleMembers(team.Members)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
      {/* Team Image */}
      {teamImageUrl && (
        <div className="aspect-[3/1] relative overflow-hidden">
          <Image
            src={teamImageUrl}
            alt={team.ImageAltText || team.Name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 1024px"
          />
        </div>
      )}

      <div className="p-8">
        {/* Team Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-block bg-coral dark:bg-coral-light text-white px-3 py-1 rounded-full text-xs font-medium">
              Τρέχουσα
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">{team.Period}</span>
          </div>
          <h2 className="text-2xl font-bold text-charcoal dark:text-gray-100">
            <LocalizedText text={team.Name} engText={team.EngName} />
          </h2>
          {team.Description && (
            <p className="text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
              <LocalizedText text={team.Description} engText={team.EngDescription} />
            </p>
          )}
        </div>

        {/* Coordinator */}
        {coordinator && !coordinator.HideProfile && (
          <div className="mb-6">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Συντονίστρια/Συντονιστής
            </span>
            <div className="flex items-center gap-3 mt-2">
              {coordinatorImageUrl ? (
                <Image
                  src={coordinatorImageUrl}
                  alt={coordinator.ProfileImageAltText || coordinator.Name}
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-full object-cover border-2 border-coral dark:border-coral-light"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-coral/20 dark:bg-coral/30 flex items-center justify-center text-coral dark:text-coral-light text-lg font-bold">
                  {coordinator.Name.charAt(0)}
                </div>
              )}
              <Link
                href={`/members/${coordinator.Slug}`}
                className="text-base font-medium text-charcoal dark:text-gray-200 hover:text-coral dark:hover:text-coral-light transition-colors"
              >
                {coordinator.Name}
              </Link>
            </div>
          </div>
        )}

        {/* Members Grid */}
        {members.length > 0 && (
          <div>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Μέλη ({members.length})
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-3">
              {members.map((member) => (
                <MemberAvatar key={member.id} member={member} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Past Team Card (compact display) ──

function PastTeamCard({ team }: { team: CoordinationTeam }) {
  const [expanded, setExpanded] = useState(false)
  const coordinator = team.Coordinator
  const coordinatorImageUrl = coordinator ? getImageUrl(coordinator.Image) : null
  const members = visibleMembers(team.Members)

  return (
    <div className="bg-orange-50 dark:bg-gray-700 rounded-2xl border border-gray-200 dark:border-gray-600 overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-orange-100 dark:hover:bg-gray-600 transition-colors"
      >
        <div>
          <h3 className="text-lg font-bold text-charcoal dark:text-gray-100">
            <LocalizedText text={team.Name} engText={team.EngName} />
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">{team.Period}</span>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-200 dark:border-gray-600 pt-4">
          {team.Description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
              <LocalizedText text={team.Description} engText={team.EngDescription} />
            </p>
          )}

          {/* Coordinator */}
          {coordinator && !coordinator.HideProfile && (
            <div className="mb-3">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Συντονίστρια/Συντονιστής
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
            <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Μέλη ({members.length})
              </span>
              <div className="flex flex-wrap gap-1 mt-2">
                {members.map((member, idx) => (
                  <span key={member.id}>
                    <Link
                      href={`/members/${member.Slug}`}
                      className="text-xs text-charcoal dark:text-gray-300 hover:text-coral dark:hover:text-coral-light transition-colors"
                    >
                      {member.Name}
                    </Link>
                    {idx < members.length - 1 && (
                      <span className="text-gray-400 dark:text-gray-500">, </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Member Avatar (for current team grid) ──

function MemberAvatar({ member }: { member: WorkingGroupMemberRef }) {
  const imageUrl = getImageUrl(member.Image)

  return (
    <Link
      href={`/members/${member.Slug}`}
      className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={member.ProfileImageAltText || member.Name}
          width={64}
          height={64}
          className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600 group-hover:border-coral dark:group-hover:border-coral-light transition-colors"
        />
      ) : (
        <div className="w-16 h-16 rounded-full bg-coral/20 dark:bg-coral/30 flex items-center justify-center text-coral dark:text-coral-light text-xl font-bold border-2 border-gray-200 dark:border-gray-600 group-hover:border-coral dark:group-hover:border-coral-light transition-colors">
          {member.Name.charAt(0)}
        </div>
      )}
      <span className="text-xs text-center text-charcoal dark:text-gray-300 group-hover:text-coral dark:group-hover:text-coral-light transition-colors font-medium leading-tight">
        {member.Name}
      </span>
    </Link>
  )
}
