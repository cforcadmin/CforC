'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { getNewsletters } from '@/lib/strapi'
import type { StrapiResponse, Newsletter } from '@/lib/types'
import LoadingIndicator from '@/components/LoadingIndicator'
import ViewToggle from '@/components/shared/ViewToggle'
import LocalizedText from '@/components/LocalizedText'
import { useNavMode } from '@/components/nav/useNavMode'

function newsletterImageUrl(newsletter: Newsletter): string | null {
  if (!newsletter.Image) return null
  if (Array.isArray(newsletter.Image) && newsletter.Image.length > 0) {
    const url = newsletter.Image[0].url
    return url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${url}`
  }
  if (typeof newsletter.Image === 'object' && !Array.isArray(newsletter.Image) && 'url' in newsletter.Image) {
    const url = newsletter.Image.url
    return url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${url}`
  }
  return null
}

export default function NewslettersContent() {
  const { mode } = useNavMode()
  const cool = mode === 'cool'
  const [newsletters, setNewsletters] = useState<Newsletter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [activeYear, setActiveYear] = useState<string>('all')

  useEffect(() => {
    async function fetchNewsletters() {
      try {
        setLoading(true)
        const response: StrapiResponse<Newsletter[]> = await getNewsletters()
        setNewsletters(response.data)
      } catch (err) {
        setError('Δεν ήταν δυνατή η φόρτωση των newsletters')
        console.error('Error fetching newsletters:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchNewsletters()
  }, [])

  const years = useMemo(() => {
    const set = new Set<number>()
    newsletters.forEach(n => { if (n.Date) set.add(new Date(n.Date).getFullYear()) })
    return Array.from(set).sort((a, b) => b - a)
  }, [newsletters])

  // Στο classic το activeYear μένει πάντα 'all' (δεν υπάρχει UI αλλαγής),
  // οπότε filtered === newsletters εκεί — η συμπεριφορά δεν αλλάζει
  const filtered = activeYear === 'all'
    ? newsletters
    : newsletters.filter(n => n.Date && String(new Date(n.Date).getFullYear()) === activeYear)

  const tabCls = (selected: boolean) =>
    `inline-flex items-center gap-1.5 min-h-11 px-4 text-xs font-bold tracking-widest whitespace-nowrap border-b-2 transition-colors duration-200 ${
      selected ? 'text-white border-coral' : 'text-white/70 border-transparent hover:text-white'
    }`

  const gridView = (
    <div className="grid md:grid-cols-3 gap-10">
      {filtered.map((newsletter) => {
        const imageUrl = newsletterImageUrl(newsletter)

        return (
          <a
            key={newsletter.id}
            href={newsletter.DriveLink}
            target="_blank"
            rel="noopener noreferrer"
            className={cool
              ? 'menu-glass rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow transform hover:scale-105 border-l-4 border-transparent hover:border-coral dark:hover:border-coral-light'
              : 'bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow transform hover:scale-105 border-l-4 border-transparent hover:border-coral dark:hover:border-coral-light'}
          >
            {imageUrl ? (
              <div className="aspect-video overflow-hidden">
                <Image
                  src={imageUrl}
                  alt={newsletter.Title}
                  width={400}
                  height={225}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-video bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
            )}

            <div className="p-5 flex flex-col flex-1">
              <div className="flex items-center gap-2 mb-3">
                <time
                  dateTime={newsletter.Date}
                  className="inline-block bg-charcoal dark:bg-gray-600 text-white px-3 py-1 rounded-full text-xs font-medium"
                >
                  {new Date(newsletter.Date).toLocaleDateString('el-GR', { month: 'long', year: 'numeric' })}
                </time>
                <span className="inline-block bg-coral/10 dark:bg-coral/20 text-charcoal dark:text-gray-100 border border-charcoal dark:border-gray-400 text-xs px-3 py-1 rounded-full">
                  Newsletter
                </span>
              </div>

              <h3 className="text-lg font-bold mb-2 text-charcoal dark:text-gray-100 line-clamp-2">
                {newsletter.Title}
              </h3>

              <div className="flex-1" />
              <div className="flex items-center justify-end pt-2">
                <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
            </div>
          </a>
        )
      })}
    </div>
  )

  const listView = (
    <div className="flex flex-col gap-3">
      {filtered.map((newsletter) => {
        const imageUrl = newsletterImageUrl(newsletter)

        return (
          <a
            key={newsletter.id}
            href={newsletter.DriveLink}
            target="_blank"
            rel="noopener noreferrer"
            className={cool
              ? 'menu-glass rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex items-center gap-5 p-4 group border-l-4 border-transparent hover:border-coral dark:hover:border-coral-light'
              : 'bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex items-center gap-5 p-4 group border-l-4 border-transparent hover:border-coral dark:hover:border-coral-light'}
          >
            {imageUrl ? (
              <div className="w-20 h-14 relative rounded-xl overflow-hidden flex-shrink-0">
                <Image src={imageUrl} alt={newsletter.Title} fill className="object-cover" />
              </div>
            ) : (
              <div className="w-20 h-14 bg-gray-200 dark:bg-gray-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-gray-400 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-charcoal dark:text-gray-100 line-clamp-1 group-hover:text-coral dark:group-hover:text-coral-light transition-colors">{newsletter.Title}</h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(newsletter.Date).toLocaleDateString('el-GR', { month: 'long', year: 'numeric' })}
              </span>
            </div>
            <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )
      })}
    </div>
  )

  if (cool) {
    return (
      <div className="pt-20">
        <div className="max-w-5xl mx-auto px-4 pb-24">
          {/* Κουτί-επιλογέας έτους — ίδια γλώσσα με την κάρτα-σκηνή */}
          <div className="relative overflow-hidden rounded-3xl mb-8" style={{ backgroundColor: '#1B2438' }}>
            <div className="px-6 pt-6 pb-5 md:px-8">
              <p className="text-[11px] font-bold tracking-[.14em] uppercase text-coral">Newsletters</p>
              <h2 className="text-white text-2xl font-bold mt-1">
                {activeYear === 'all'
                  ? <LocalizedText text="Όλα τα τεύχη" engText="All issues" />
                  : <span className="notranslate">{activeYear}</span>}
              </h2>
              <p className="text-white/60 text-sm mt-1">
                <span className="notranslate">{filtered.length}</span>{' '}
                <LocalizedText text="τεύχη" engText="issues" />
              </p>
            </div>
            <div style={{ backgroundColor: 'rgba(10, 14, 24, .45)', backdropFilter: 'blur(16px) saturate(170%)', WebkitBackdropFilter: 'blur(16px) saturate(170%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.12)' }}>
              <div className="flex overflow-x-auto" style={{ scrollbarWidth: 'none' }} role="tablist" aria-label="Έτος τεύχους">
                <button type="button" role="tab" aria-selected={activeYear === 'all'} onClick={() => setActiveYear('all')} className={tabCls(activeYear === 'all')}>
                  <LocalizedText text="Όλα" engText="All" />
                </button>
                {years.map(year => (
                  <button
                    key={year}
                    type="button"
                    role="tab"
                    aria-selected={activeYear === String(year)}
                    onClick={() => setActiveYear(String(year))}
                    className={`notranslate ${tabCls(activeYear === String(year))}`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Περιεχόμενο σε γυάλινο πάνελ */}
          <div className="relative menu-glass glass-rim rounded-3xl p-6 md:p-8">
            <span className="logo-reveal rounded-3xl overflow-hidden" aria-hidden="true" />
            <div className="relative">
              {loading && <LoadingIndicator />}
              {error && !loading && (
                <p className="text-center text-orange-600 dark:text-orange-400 font-medium">{error}</p>
              )}
              {!loading && !error && filtered.length === 0 && (
                <p className="text-center text-gray-600 dark:text-gray-300 font-medium">
                  Δεν υπάρχουν διαθέσιμα newsletters ακόμα
                </p>
              )}
              {!loading && !error && filtered.length > 0 && (
                <>
                  <div className="flex justify-end mb-6">
                    <ViewToggle view={viewMode} onViewChange={setViewMode} />
                  </div>
                  {viewMode === 'grid' ? gridView : listView}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {loading && <LoadingIndicator />}

        {error && !loading && (
          <div className="bg-orange-50 dark:bg-gray-700 border border-orange-200 dark:border-gray-600 rounded-lg p-6 text-center">
            <p className="text-orange-600 dark:text-orange-400 font-medium">{error}</p>
          </div>
        )}

        {!loading && !error && newsletters.length === 0 && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              Δεν υπάρχουν διαθέσιμα newsletters ακόμα
            </p>
          </div>
        )}

        {!loading && !error && newsletters.length > 0 && (
          <>
            <div className="flex justify-end mb-6">
              <ViewToggle view={viewMode} onViewChange={setViewMode} />
            </div>

            {viewMode === 'grid' ? gridView : listView}
          </>
        )}
      </div>
    </section>
  )
}
