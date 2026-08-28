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

// Role labels for current coordination team members (by index in Members array)
const MEMBER_ROLE_LABELS: Record<number, string> = {
  0: 'Υπεύθυνη Κοινότητας',
  1: 'Υπεύθυνη Επικοινωνίας',
  2: 'Υπεύθυνος Οικονομικών',
  3: 'Αντιπρόεδρος',
}

export default function CoordinationTeamContent({ variant = 'classic' }: { variant?: 'classic' | 'cool' } = {}) {
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

  // Cool (28/8, επιλογή Γιώργου): σκελετός Ω4 (χρονολόγιο θητειών με κοραλί
  // ράχη) και περιεχόμενο Ω3 σε κάθε σταθμό (πέντε ισότιμα πορτρέτα σε μία
  // γραμμή, χρωματική υπογράμμιση ρόλου, πάνω στη φωτογραφία της ομάδας)
  if (variant === 'cool') {
    return (
      <div className="max-w-5xl mx-auto px-4 pb-24">
        {loading && <LoadingIndicator />}
        {error && !loading && (
          <div className="relative overflow-hidden menu-glass glass-rim rounded-2xl p-6 text-center">
            <p className="text-orange-600 dark:text-orange-400 font-medium">{error}</p>
          </div>
        )}
        {!loading && !error && teams.length === 0 && (
          <div className="relative overflow-hidden menu-glass glass-rim rounded-2xl p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400 font-medium">Δεν βρέθηκαν ομάδες συντονισμού</p>
          </div>
        )}
        {!loading && !error && teams.length > 0 && (
          <div className="relative pl-9">
            {/* Η κοραλί ράχη του χρονολογίου */}
            <div className="absolute left-2 top-2 bottom-2 w-[3px] rounded-full bg-coral" aria-hidden="true" />
            {currentTeams.map(team => (
              <div key={team.id} className="relative mb-6">
                <span className="absolute -left-[34px] top-6 w-5 h-5 rounded-full bg-coral border-4 border-[#F5F0EB] dark:border-gray-900" aria-hidden="true" />
                <CoolCurrentStation team={team} />
              </div>
            ))}
            {pastTeams.length > 0 && (
              <div className="space-y-4">
                {pastTeams.map(team => (
                  <div key={team.id} className="relative">
                    <span className="absolute -left-[30px] top-6 w-3 h-3 rounded-full bg-coral/60 border-2 border-[#F5F0EB] dark:border-gray-900" aria-hidden="true" />
                    <PastTeamCard team={team} cool />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

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

        {/* Team — President + Members in one row */}
        {(coordinator || members.length > 0) && (
          <div>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Ομάδα Συντονισμού
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-4 mt-3">
              {coordinator && !coordinator.HideProfile && (
                <MemberAvatar key={coordinator.id} member={coordinator} roleLabel="Πρόεδρος" />
              )}
              {members.map((member, index) => (
                <MemberAvatar key={member.id} member={member} roleLabel={MEMBER_ROLE_LABELS[index]} />
              ))}
            </div>
          </div>
        )}

        {/* Operations */}
        {(team.Admin || team.Comms || team.IT) && (
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Διοικητική Υποστήριξη
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-4 mt-3">
              {team.Admin && !team.Admin.HideProfile && (
                <MemberAvatar member={team.Admin} roleLabel="Admin" />
              )}
              {team.Comms && !team.Comms.HideProfile && (
                <MemberAvatar member={team.Comms} roleLabel="Comms" />
              )}
              {team.IT && !team.IT.HideProfile && (
                <MemberAvatar member={team.IT} roleLabel="IT" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Past Team Card (compact display) ──

function PastTeamCard({ team, cool = false }: { team: CoordinationTeam; cool?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const coordinator = team.Coordinator
  const coordinatorImageUrl = coordinator ? getImageUrl(coordinator.Image) : null
  const members = visibleMembers(team.Members)

  return (
    <div className={cool
      ? 'relative menu-glass glass-rim rounded-2xl overflow-hidden'
      : 'bg-orange-50 dark:bg-gray-700 rounded-2xl border border-gray-200 dark:border-gray-600 overflow-hidden'}>
      {cool && <span className="logo-reveal" aria-hidden="true" />}
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between p-5 text-left transition-colors ${cool ? 'hover:bg-white/40 dark:hover:bg-white/5' : 'hover:bg-orange-100 dark:hover:bg-gray-600'}`}
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

function MemberAvatar({ member, roleLabel }: { member: WorkingGroupMemberRef; roleLabel?: string }) {
  const imageUrl = getImageUrl(member.Image)

  return (
    <Link
      href={`/members/${member.Slug}`}
      className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
    >
      {roleLabel && (
        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 text-center leading-tight uppercase tracking-wide">
          {roleLabel}
        </span>
      )}
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

// ── Cool: σταθμός τρέχουσας θητείας (σκελετός Ω4, περιεχόμενο Ω3) ──

const COOL_ROLE_HUES = ['#2A9D8F', '#8E7CC3', '#6A994E', '#4A90D9']

function CoolCurrentStation({ team }: { team: CoordinationTeam }) {
  const teamImageUrl = getImageUrl(team.Image)
  const coordinator = team.Coordinator
  const members = visibleMembers(team.Members)

  return (
    <div className="relative rounded-3xl overflow-hidden glass-rim" style={{ backgroundColor: '#1B2438' }}>
      {/* Η φωτογραφία της ομάδας ως φόντο — το γυαλί έχει τι να θολώσει */}
      {teamImageUrl && (
        <Image src={teamImageUrl} alt={team.ImageAltText || team.Name} fill className="object-cover" sizes="1024px" />
      )}
      <div className="relative p-6 md:p-8"
        style={{ backgroundColor: 'rgba(245, 240, 235, .68)', backdropFilter: 'blur(14px) saturate(160%)', WebkitBackdropFilter: 'blur(14px) saturate(160%)' }}>
        <div className="flex items-center gap-3">
          <span className="inline-block bg-coral text-white px-3 py-1 rounded-full text-xs font-bold">Τρέχουσα</span>
          <span className="text-sm text-gray-600 notranslate">{team.Period}</span>
        </div>
        <h2 className="text-2xl font-bold text-charcoal mt-2">
          <LocalizedText text={team.Name} engText={team.EngName} />
        </h2>
        {team.Description && (
          <p className="text-gray-700 mt-2 leading-relaxed max-w-2xl">
            <LocalizedText text={team.Description} engText={team.EngDescription} />
          </p>
        )}

        {/* Ω3: πέντε ισότιμα πορτρέτα σε μία γραμμή, χρώμα ρόλου ως υπογράμμιση */}
        {(coordinator || members.length > 0) && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mt-6">
            {coordinator && !coordinator.HideProfile && (
              <CoolPortrait member={coordinator} roleLabel="Πρόεδρος" hue="#FF8B6A" />
            )}
            {members.map((member, index) => (
              <CoolPortrait key={member.id} member={member} roleLabel={MEMBER_ROLE_LABELS[index]} hue={COOL_ROLE_HUES[index % COOL_ROLE_HUES.length]} />
            ))}
          </div>
        )}

        {/* Διοικητική Υποστήριξη — δεύτερη, μικρή σειρά */}
        {(team.Admin || team.Comms || team.IT) && (
          <div className="flex flex-wrap items-center gap-4 mt-6 pt-4 border-t border-charcoal/10">
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Διοικητική Υποστήριξη</span>
            {team.Admin && !team.Admin.HideProfile && <CoolOpsAvatar member={team.Admin} roleLabel="Admin" />}
            {team.Comms && !team.Comms.HideProfile && <CoolOpsAvatar member={team.Comms} roleLabel="Comms" />}
            {team.IT && !team.IT.HideProfile && <CoolOpsAvatar member={team.IT} roleLabel="IT" />}
          </div>
        )}
      </div>
    </div>
  )
}

function CoolPortrait({ member, roleLabel, hue }: { member: WorkingGroupMemberRef; roleLabel?: string; hue: string }) {
  const imageUrl = getImageUrl(member.Image)
  return (
    <Link href={`/members/${member.Slug}`} className="group block">
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={member.ProfileImageAltText || member.Name}
          width={200}
          height={200}
          className="w-full aspect-square rounded-2xl object-cover"
        />
      ) : (
        <div className="w-full aspect-square rounded-2xl bg-coral/20 flex items-center justify-center text-coral text-3xl font-bold">
          {member.Name.charAt(0)}
        </div>
      )}
      {roleLabel && (
        <div className="text-[10px] font-bold uppercase tracking-wide mt-2 pt-1.5" style={{ borderTop: `3px solid ${hue}`, color: '#4a4f5e' }}>
          {roleLabel}
        </div>
      )}
      <div className="text-sm font-bold text-charcoal group-hover:text-coral transition-colors leading-tight mt-0.5">
        {member.Name}
      </div>
    </Link>
  )
}

function CoolOpsAvatar({ member, roleLabel }: { member: WorkingGroupMemberRef; roleLabel: string }) {
  const imageUrl = getImageUrl(member.Image)
  return (
    <Link href={`/members/${member.Slug}`} className="flex items-center gap-2 group">
      {imageUrl ? (
        <Image src={imageUrl} alt={member.ProfileImageAltText || member.Name} width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
      ) : (
        <span className="w-8 h-8 rounded-full bg-coral/20 flex items-center justify-center text-coral text-xs font-bold">{member.Name.charAt(0)}</span>
      )}
      <span className="text-xs text-charcoal group-hover:text-coral transition-colors font-medium">
        {member.Name} <span className="text-gray-500">· {roleLabel}</span>
      </span>
    </Link>
  )
}
