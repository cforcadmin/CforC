'use client'

import LocalizedText from '@/components/LocalizedText'
import { networkGroups } from '@/lib/networksData'

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

export default function NetworksContent() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="pt-20">
      <div className="max-w-5xl mx-auto px-4 pb-24">
        {/* Header */}
        <div className="mb-6 text-center">
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            <LocalizedText
              text="Πολιτιστικά δίκτυα και οργανισμοί σχετικοί με τα μέλη του Culture for Change."
              engText="Cultural networks and organisations relevant to Culture for Change members."
            />
          </p>
        </div>

        {/* Sticky jump navigation — sits below minimised main nav */}
        <nav className="sticky top-20 z-10 flex flex-wrap justify-center gap-3 py-3 mb-10 bg-transparent -mx-4 px-4" aria-label="Πλοήγηση ενοτήτων">
          {networkGroups.map((group) => (
            <button
              key={group.key}
              onClick={() => scrollTo(`networks-${group.key}`)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-50 dark:bg-gray-700 rounded-full text-sm font-medium text-charcoal dark:text-gray-200 border border-black dark:border-white hover:shadow-md hover:bg-orange-100 dark:hover:bg-gray-600 transition-all"
            >
              {GROUP_ICONS[group.key]?.('w-4 h-4 text-coral dark:text-coral-light')}
              <LocalizedText text={group.label} engText={group.engLabel} />
            </button>
          ))}
          <button
            onClick={() => scrollTo('networks-all')}
            className="flex items-center gap-2 px-4 py-2 bg-orange-50 dark:bg-gray-700 rounded-full text-sm font-medium text-charcoal dark:text-gray-200 border border-black dark:border-white hover:shadow-md hover:bg-orange-100 dark:hover:bg-gray-600 transition-all"
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
              {group.networks.map((network) => (
                <a
                  key={network.url}
                  href={network.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group bg-orange-50 dark:bg-gray-700 rounded-2xl border border-black dark:border-white hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02] p-6 flex flex-col"
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
              ))}
            </div>
          </section>
        ))}

        {/* All networks spreadsheet link */}
        <section id="networks-all" className="scroll-mt-36">
          <h2 className="text-xl font-bold text-charcoal dark:text-gray-100 flex items-center gap-2.5 mb-6">
            <TableIcon className="w-5 h-5 text-coral dark:text-coral-light" />
            <LocalizedText text="Όλα τα δίκτυα" engText="All networks" />
          </h2>
          <a
            href={ALL_NETWORKS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 bg-orange-50 dark:bg-gray-700 rounded-2xl border border-black dark:border-white hover:shadow-lg transition-all duration-200 transform hover:scale-[1.01] p-6"
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
        </section>
      </div>
    </div>
  )
}
