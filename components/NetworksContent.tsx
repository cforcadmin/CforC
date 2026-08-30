'use client'

import { useState } from 'react'
import LocalizedText from '@/components/LocalizedText'
import { networkGroups } from '@/lib/networksData'
import { useNavMode } from '@/components/nav/useNavMode'

const ALL_NETWORKS_URL = 'https://docs.google.com/spreadsheets/d/1D1j2yYzhq9YwZUX3R_y6G22zGd_D-Ki-/edit?usp=share_link&ouid=104930524495740710113&rtpof=true&sd=true'

// Star icon for member networks
function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

// Globe icon for related networks
function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  )
}

// Spreadsheet/table icon for all networks
function TableIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6z" />
    </svg>
  )
}

const GROUP_ICONS: Record<string, (className?: string) => React.ReactNode> = {
  member: (cls) => <StarIcon className={cls} />,
  related: (cls) => <GlobeIcon className={cls} />,
}

type NetworkItem = (typeof networkGroups)[number]['networks'][number]

export default function NetworksContent() {
  const { mode } = useNavMode()
  const cool = mode === 'cool'
  const [activeGroup, setActiveGroup] = useState<string>(networkGroups[0]?.key ?? 'member')

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const networkCard = (network: NetworkItem) => (
    <a
      key={network.url}
      href={network.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cool
        ? 'group menu-glass rounded-3xl shadow-sm hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02] p-6 flex flex-col border-l-4 border-transparent hover:border-coral dark:hover:border-coral-light'
        : 'group bg-white dark:bg-gray-800 rounded-3xl shadow-sm hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02] p-6 flex flex-col border-l-4 border-transparent hover:border-coral dark:hover:border-coral-light'}
    >
      {/* Title + external link icon */}
      <div className="flex items-start gap-3 mb-3">
        <h3 className="font-semibold text-charcoal dark:text-gray-100 flex-1 text-sm leading-snug">
          {network.title}
        </h3>
        <svg
          className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5 group-hover:text-coral dark:group-hover:text-coral-light transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </div>
      {/* Description */}
      <p className="text-gray-600 dark:text-gray-300 text-xs leading-relaxed flex-1">
        <LocalizedText text={network.description} engText={network.engDescription} />
      </p>
    </a>
  )

  const allNetworksCard = (
    <a
      href={ALL_NETWORKS_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cool
        ? 'group flex items-center gap-4 menu-glass rounded-3xl shadow-sm hover:shadow-lg transition-all duration-200 transform hover:scale-[1.01] p-6 border-l-4 border-transparent hover:border-coral dark:hover:border-coral-light'
        : 'group flex items-center gap-4 bg-white dark:bg-gray-800 rounded-3xl shadow-sm hover:shadow-lg transition-all duration-200 transform hover:scale-[1.01] p-6 border-l-4 border-transparent hover:border-coral dark:hover:border-coral-light'}
    >
      <div className="w-12 h-12 rounded-xl bg-coral/10 dark:bg-coral/20 flex items-center justify-center flex-shrink-0">
        <TableIcon className="w-6 h-6 text-coral dark:text-coral-light" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-charcoal dark:text-gray-100 text-sm mb-1">
          <LocalizedText
            text="Πλήρης κατάλογος δικτύων & οργανισμών"
            engText="Full directory of networks & organisations"
          />
        </h3>
        <p className="text-gray-600 dark:text-gray-300 text-xs">
          <LocalizedText
            text="Ανοίξτε τον πλήρη κατάλογο σε Google Sheets"
            engText="Open the full directory in Google Sheets"
          />
        </p>
      </div>
      <svg
        className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0 group-hover:text-coral dark:group-hover:text-coral-light transition-colors"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  )

  if (cool) {
    const activeData = networkGroups.find(g => g.key === activeGroup)
    const tabClass = (selected: boolean) =>
      `inline-flex items-center gap-1.5 min-h-11 px-4 text-xs font-bold tracking-widest whitespace-nowrap border-b-2 transition-colors duration-200 ${
        selected ? 'text-white border-coral' : 'text-white/70 border-transparent hover:text-white'
      }`

    return (
      <div className="pt-20">
        <div className="max-w-5xl mx-auto px-4 pb-24">
          {/* Επιλογέας ομάδας — ίδια γλώσσα με την κάρτα-σκηνή: navy σώμα
              και σκούρα γυάλινη λωρίδα-tabs στο κάτω χείλος */}
          <div className="relative overflow-hidden rounded-3xl mb-8" style={{ backgroundColor: '#1B2438' }}>
            <div className="px-6 pt-6 pb-5 md:px-8">
              <p className="text-[11px] font-bold tracking-[.14em] uppercase text-coral">
                <LocalizedText text="Τα δίκτυά μας" engText="Our networks" />
              </p>
              <h2 className="text-white text-2xl font-bold mt-1">
                {activeGroup === 'all'
                  ? <LocalizedText text="Όλα τα δίκτυα" engText="All networks" />
                  : <LocalizedText text={activeData?.label ?? ''} engText={activeData?.engLabel} />}
              </h2>
              <p className="text-white/60 text-sm mt-1">
                {activeGroup === 'all'
                  ? <LocalizedText text="Ο πλήρης κατάλογος σε ένα αρχείο" engText="The full directory in one file" />
                  : <>
                      <span className="notranslate">{activeData?.networks.length ?? 0}</span>{' '}
                      <LocalizedText text="δίκτυα" engText="networks" />
                    </>}
              </p>
            </div>
            <div style={{ backgroundColor: 'rgba(10, 14, 24, .45)', backdropFilter: 'blur(16px) saturate(170%)', WebkitBackdropFilter: 'blur(16px) saturate(170%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.12)' }}>
              <div className="flex overflow-x-auto" style={{ scrollbarWidth: 'none' }} role="tablist" aria-label="Ομάδες δικτύων">
                {networkGroups.map(group => (
                  <button
                    key={group.key}
                    type="button"
                    role="tab"
                    aria-selected={activeGroup === group.key}
                    onClick={() => setActiveGroup(group.key)}
                    className={tabClass(activeGroup === group.key)}
                  >
                    {GROUP_ICONS[group.key]?.('w-4 h-4')}
                    <LocalizedText text={group.label} engText={group.engLabel} />
                  </button>
                ))}
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeGroup === 'all'}
                  onClick={() => setActiveGroup('all')}
                  className={tabClass(activeGroup === 'all')}
                >
                  <TableIcon className="w-4 h-4" />
                  <LocalizedText text="Όλα τα δίκτυα" engText="All networks" />
                </button>
              </div>
            </div>
          </div>

          {/* Το περιεχόμενο της επιλεγμένης ομάδας, σε γυάλινο πάνελ όπως
              στο Εκπαιδευτικό Υλικό */}
          <div className="relative menu-glass glass-rim rounded-3xl p-6 md:p-8">
            <span className="logo-reveal rounded-3xl overflow-hidden" aria-hidden="true" />
            <div className="relative">
              {activeGroup === 'all' ? (
                allNetworksCard
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {activeData?.networks.map(networkCard)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-20">
      <div className="max-w-5xl mx-auto px-4 pb-24">
        {/* Sticky jump navigation — sits below minimised main nav */}
        <nav className="sticky top-20 z-10 flex flex-wrap justify-center gap-3 py-3 mb-10 bg-transparent -mx-4 px-4" aria-label="Πλοήγηση ενοτήτων">
          {networkGroups.map((group) => (
            <button
              key={group.key}
              onClick={() => scrollTo(`networks-${group.key}`)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-full text-sm font-medium text-charcoal dark:text-gray-200 border border-charcoal/30 dark:border-gray-600 hover:shadow-md hover:border-coral dark:hover:border-coral-light transition-all"
            >
              {GROUP_ICONS[group.key]?.('w-4 h-4 text-coral dark:text-coral-light')}
              <LocalizedText text={group.label} engText={group.engLabel} />
            </button>
          ))}
          <button
            onClick={() => scrollTo('networks-all')}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-full text-sm font-medium text-charcoal dark:text-gray-200 border border-charcoal/30 dark:border-gray-600 hover:shadow-md hover:border-coral dark:hover:border-coral-light transition-all"
          >
            <TableIcon className="w-4 h-4 text-coral dark:text-coral-light" />
            <LocalizedText text="Όλα τα δίκτυα" engText="All networks" />
          </button>
        </nav>

        {/* Network groups */}
        {networkGroups.map((group) => (
          <section key={group.key} id={`networks-${group.key}`} className="mb-12 scroll-mt-36">
            {/* Group header */}
            <h2 className="text-xl font-bold text-charcoal dark:text-gray-100 flex items-center gap-2.5 mb-6">
              {GROUP_ICONS[group.key]?.('w-5 h-5 text-coral dark:text-coral-light')}
              <LocalizedText text={group.label} engText={group.engLabel} />
            </h2>

            {/* Network cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {group.networks.map(networkCard)}
            </div>
          </section>
        ))}

        {/* All networks spreadsheet link */}
        <section id="networks-all" className="scroll-mt-36">
          <h2 className="text-xl font-bold text-charcoal dark:text-gray-100 flex items-center gap-2.5 mb-6">
            <TableIcon className="w-5 h-5 text-coral dark:text-coral-light" />
            <LocalizedText text="Όλα τα δίκτυα" engText="All networks" />
          </h2>
          {allNetworksCard}
        </section>
      </div>
    </div>
  )
}
