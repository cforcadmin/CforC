'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import CookieConsent from '@/components/CookieConsent'
import ScrollToTop from '@/components/ScrollToTop'
import LoadingIndicator from '@/components/LoadingIndicator'
import Link from 'next/link'
import Image from 'next/image'
import { AccessibilityButton } from '@/components/AccessibilityMenu'
import FieldsFilter from '@/components/members/FieldsFilter'
import CityFilter from '@/components/members/CityFilter'
import ProvinceFilter from '@/components/members/ProvinceFilter'
import SortFilter from '@/components/members/SortFilter'
import { doesFieldMatchFilter } from '@/lib/memberTaxonomy'

interface Member {
  id: number
  documentId: string
  Name: string
  Slug: string
  Bio: string
  FieldsOfWork: string
  City: string
  Province: string
  Email: string
  Phone: string
  Websites: string
  Image?: Array<{
    url: string
    alternativeText?: string
  }>
  ProfileImageAltText?: string  // Accessibility alt text for profile image
  Project1Title?: string
  Project1Description?: string
  Project1Pictures?: Array<{
    url: string
    alternativeText?: string
  }>
  Project1PicturesAltText?: string  // Accessibility alt text for project 1 images
  Project1Tags?: string
  Project2Title?: string
  Project2Description?: string
  Project2Pictures?: Array<{
    url: string
    alternativeText?: string
  }>
  Project2PicturesAltText?: string  // Accessibility alt text for project 2 images
  Project2Tags?: string
}

export default function MembersPage() {
  return (
    <Suspense>
      <MembersPageContent />
    </Suspense>
  )
}

function MembersPageContent() {
  const [allMembers, setAllMembers] = useState<Member[]>([])
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [selectedCities, setSelectedCities] = useState<string[]>([])
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>([])
  const searchParams = useSearchParams()
  const [sortMode, setSortMode] = useState<'none' | 'alpha-asc' | 'alpha-desc' | 'random'>('random')
  const [totalCount, setTotalCount] = useState(0)
  const [displayCount, setDisplayCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [accessibilityButtonScale, setAccessibilityButtonScale] = useState(1)
  const [filterLogic, setFilterLogic] = useState<'or' | 'and'>('and')

  // Read URL params for pre-filtering from member profile tags
  useEffect(() => {
    const fieldParam = searchParams.get('field')
    const cityParam = searchParams.get('city')
    const provinceParam = searchParams.get('province')
    if (fieldParam) setSelectedFields([fieldParam])
    if (cityParam) setSelectedCities([cityParam])
    if (provinceParam) setSelectedProvinces([provinceParam])
  }, [searchParams])

  // Handle scroll for accessibility button fade
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      const fadeStart = 50
      const fadeEnd = 150

      if (scrollPosition <= fadeStart) {
        setAccessibilityButtonScale(1)
      } else if (scrollPosition >= fadeEnd) {
        setAccessibilityButtonScale(0)
      } else {
        const progress = (scrollPosition - fadeStart) / (fadeEnd - fadeStart)
        setAccessibilityButtonScale(1 - progress)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setIsLoading(true)

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/members?populate=*&pagination[limit]=1000`,
          {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_STRAPI_API_TOKEN}`,
            },
          }
        )
        const data = await response.json()
        setAllMembers(data.data || [])
        setTotalCount(data.data?.length || 0)
      } catch (error) {
        console.error('Error fetching members:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMembers()
  }, [])

  useEffect(() => {
    let result = [...allMembers]

    if (searchQuery) {
      result = result.filter((member) =>
        member.Name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    const hasFieldFilter = selectedFields.length > 0
    const hasCityFilter = selectedCities.length > 0
    const hasProvinceFilter = selectedProvinces.length > 0

    if (hasFieldFilter || hasCityFilter || hasProvinceFilter) {
      result = result.filter((member) => {
        const matchesFields = !hasFieldFilter || selectedFields.some(field => doesFieldMatchFilter(member.FieldsOfWork, field))
        const matchesCities = !hasCityFilter || (() => {
          const memberCities = member.City?.split(',').map(c => c.trim().toLowerCase()) || []
          return selectedCities.some(sc => memberCities.includes(sc.toLowerCase()))
        })()
        const matchesProvinces = !hasProvinceFilter || (() => {
          const memberProvinces = member.Province?.split(',').map(p => p.trim().toLowerCase()) || []
          return selectedProvinces.some(sp => memberProvinces.includes(sp.toLowerCase()))
        })()

        if (filterLogic === 'and') {
          return matchesFields && matchesCities && matchesProvinces
        } else {
          // OR: match if member passes any of the active filter groups
          const checks: boolean[] = []
          if (hasFieldFilter) checks.push(matchesFields)
          if (hasCityFilter) checks.push(matchesCities)
          if (hasProvinceFilter) checks.push(matchesProvinces)
          return checks.some(Boolean)
        }
      })
    }

    // Apply sorting
    if (sortMode === 'alpha-asc') {
      result.sort((a, b) => a.Name.localeCompare(b.Name, 'el'))
    } else if (sortMode === 'alpha-desc') {
      result.sort((a, b) => b.Name.localeCompare(a.Name, 'el'))
    } else if (sortMode === 'random') {
      result.sort(() => Math.random() - 0.5)
    }

    setFilteredMembers(result)
  }, [allMembers, searchQuery, selectedFields, selectedCities, selectedProvinces, sortMode, filterLogic])

  // Animated counter
  useEffect(() => {
    if (filteredMembers.length === 0) {
      setDisplayCount(0)
      return
    }

    let start = 0
    const end = filteredMembers.length
    const duration = 1000
    const increment = end / (duration / 16)

    const timer = setInterval(() => {
      start += increment
      if (start >= end) {
        setDisplayCount(end)
        clearInterval(timer)
      } else {
        setDisplayCount(Math.floor(start))
      }
    }, 16)

    return () => clearInterval(timer)
  }, [filteredMembers])

  // Get unique values for filters
  const uniqueCities = Array.from(
    new Set(
      allMembers.flatMap((m) =>
        m.City?.split(',').map((c) => c.trim()).filter((c) => c && c !== '-') || []
      )
    )
  ).sort((a, b) => a.localeCompare(b, 'el'))
  const uniqueProvinces = Array.from(
    new Set(
      allMembers.flatMap((m) =>
        m.Province?.split(',').map((p) => p.trim()).filter((p) => p && p !== '-') || []
      )
    )
  ).sort((a, b) => a.localeCompare(b, 'el'))

  const totalActiveFilters = selectedFields.length + selectedCities.length + selectedProvinces.length

  const clearAllFilters = () => {
    setSelectedFields([])
    setSelectedCities([])
    setSelectedProvinces([])
    setSearchQuery('')
  }

  return (
    <div className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900">
      <Navigation variant="members" />
      <main id="main-content">
        {/* Hero Section */}
        <section className="relative -bottom-20">
          <div className="bg-coral dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 h-[25vh] flex items-center rounded-b-3xl relative z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-none dark:text-coral">
                ΑΝΑΖΗΤΗΣΗ<br />ΜΕΛΩΝ
              </h1>
            </div>

            {/* Accessibility Menu Trigger Button */}
            <div
              className="absolute right-6 lg:right-12 top-1/2 -translate-y-1/2 transition-all duration-200"
              style={{
                transform: `translateY(-50%) scale(${accessibilityButtonScale})`,
                opacity: accessibilityButtonScale,
                pointerEvents: accessibilityButtonScale < 0.1 ? 'none' : 'auto'
              }}
            >
              <AccessibilityButton />
            </div>
          </div>
        </section>

      {/* Main Content */}
      <section className="pt-32 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Loading Indicator */}
          {isLoading && <LoadingIndicator />}

          {/* Info Box */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 mb-12 relative">
            <div className="absolute top-8 right-8 text-right">
              <div className="bg-[#F5F0EB] dark:bg-gray-700 px-6 py-3 rounded-full border-2 border-gray-300 dark:border-gray-600 shadow-sm">
                <p className="text-sm font-bold text-gray-700 dark:text-gray-200">Μέλη: <span className="text-coral dark:text-coral-light">{displayCount}</span></p>
              </div>
            </div>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed max-w-4xl">
              Ένα αποθετήριο εξαιρετικών δημιουργικών επαγγελματιών, έργων και ιδεών που προάγουν την κοινωνικοπολιτιστική καινοτομία μέσω πρωτοβουλιών με κινητήρια δύναμη τον άνθρωπο.
            </p>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 mb-12">
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                placeholder="Αναζήτηση ονόματος..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 min-w-[160px] max-w-[240px] px-4 py-3 border border-charcoal dark:border-gray-400 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-coral dark:bg-gray-700 dark:text-gray-200 placeholder-charcoal dark:placeholder-gray-200"
              />
              <FieldsFilter
                selectedFields={selectedFields}
                onSelectionChange={setSelectedFields}
              />
              <CityFilter
                cities={uniqueCities}
                selectedCities={selectedCities}
                onSelectionChange={setSelectedCities}
              />
              <ProvinceFilter
                provinces={uniqueProvinces}
                selectedProvinces={selectedProvinces}
                onSelectionChange={setSelectedProvinces}
              />
              <SortFilter
                sortMode={sortMode}
                onSortChange={setSortMode}
              />
              {/* AND/OR Toggle */}
              <div className="relative group">
                <div className="flex rounded-full border border-charcoal dark:border-gray-400 overflow-hidden">
                  <button
                    onClick={() => setFilterLogic('and')}
                    className={`px-3 py-3 text-xs font-medium transition-colors ${
                      filterLogic === 'and'
                        ? 'bg-charcoal dark:bg-gray-100 text-white dark:text-gray-900'
                        : 'text-charcoal dark:text-gray-200 hover:bg-charcoal/10 dark:hover:bg-gray-600'
                    }`}
                  >
                    AND
                  </button>
                  <button
                    onClick={() => setFilterLogic('or')}
                    className={`px-3 py-3 text-xs font-medium transition-colors border-l border-charcoal dark:border-gray-400 ${
                      filterLogic === 'or'
                        ? 'bg-charcoal dark:bg-gray-100 text-white dark:text-gray-900'
                        : 'text-charcoal dark:text-gray-200 hover:bg-charcoal/10 dark:hover:bg-gray-600'
                    }`}
                  >
                    OR
                  </button>
                </div>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-charcoal dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50">
                  {filterLogic === 'and'
                    ? 'AND: Εμφάνιση μελών που ταιριάζουν σε όλα τα φίλτρα'
                    : 'OR: Εμφάνιση μελών που ταιριάζουν σε οποιοδήποτε φίλτρο'
                  }
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-charcoal dark:border-t-gray-100" />
                </div>
              </div>
              {/* Reset All */}
              {totalActiveFilters > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="px-3 py-3 text-xs font-medium text-coral dark:text-coral-light hover:underline whitespace-nowrap"
                >
                  Καθαρισμός όλων των φίλτρων ({totalActiveFilters})
                </button>
              )}
            </div>
          </div>

          {/* Members Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredMembers.map((member) => (
              <Link
                key={member.id}
                href={`/members/${member.Slug}`}
                className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden hover:shadow-xl dark:hover:shadow-gray-700/50 transition-all duration-300 group border-l-4 border-transparent hover:border-coral dark:hover:border-coral-light"
              >
                {member.Image && member.Image.length > 0 && member.Image[0].url ? (
                  <div className="aspect-[10/12] relative bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <Image
                      src={member.Image[0].url}
                      alt={member.ProfileImageAltText || member.Name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                ) : (
                  <div className="aspect-[10/12] bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <span className="text-gray-400 dark:text-gray-500 text-4xl">{member.Name.charAt(0)}</span>
                  </div>
                )}
                <div className="p-4">
                  <h3 className="text-base font-light group-hover:font-bold text-charcoal dark:text-gray-100 mb-2 transition-all">{member.Name}</h3>
                  <div className="inline-block bg-coral/10 dark:bg-coral/20 text-coral dark:text-coral-light text-xs px-3 py-1 rounded-2xl uppercase tracking-wide max-w-full">
                    <p className="line-clamp-2">{member.FieldsOfWork}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {filteredMembers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">Δεν βρέθηκαν μέλη με τα επιλεγμένα κριτήρια.</p>
            </div>
          )}
        </div>
      </section>
      </main>
      <Footer variant="members" />
      <CookieConsent />
      <ScrollToTop />
    </div>
  )
}
