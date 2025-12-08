'use client'

import { useEffect, useState } from 'react'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import CookieConsent from '@/components/CookieConsent'
import ScrollToTop from '@/components/ScrollToTop'
import LoadingIndicator from '@/components/LoadingIndicator'
import Link from 'next/link'
import Image from 'next/image'

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
  Project1Title?: string
  Project1Description?: string
  Project1Pictures?: Array<{
    url: string
    alternativeText?: string
  }>
  Project1Tags?: string
  Project2Title?: string
  Project2Description?: string
  Project2Pictures?: Array<{
    url: string
    alternativeText?: string
  }>
  Project2Tags?: string
}

export default function MembersPage() {
  const [allMembers, setAllMembers] = useState<Member[]>([])
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedField, setSelectedField] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [selectedProvince, setSelectedProvince] = useState('')
  const [sortMode, setSortMode] = useState<'none' | 'alpha-asc' | 'alpha-desc' | 'random'>('random')
  const [totalCount, setTotalCount] = useState(0)
  const [displayCount, setDisplayCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

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

    if (selectedField) {
      result = result.filter((member) =>
        member.FieldsOfWork?.toLowerCase().includes(selectedField.toLowerCase())
      )
    }

    if (selectedCity) {
      result = result.filter((member) =>
        member.City?.toLowerCase() === selectedCity.toLowerCase()
      )
    }

    if (selectedProvince) {
      result = result.filter((member) =>
        member.Province?.toLowerCase() === selectedProvince.toLowerCase()
      )
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
  }, [allMembers, searchQuery, selectedField, selectedCity, selectedProvince, sortMode])

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
  const uniqueFields = Array.from(
    new Set(
      allMembers.flatMap((m) =>
        m.FieldsOfWork?.split(',').map((f) => f.trim()) || []
      )
    )
  )
  const uniqueCities = Array.from(new Set(allMembers.map((m) => m.City).filter(Boolean)))
  const uniqueProvinces = Array.from(new Set(allMembers.map((m) => m.Province).filter(Boolean)))

  return (
    <main className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900">
      <Navigation variant="members" />

      {/* Hero Section */}
      <section className="relative -bottom-20">
        <div className="bg-coral dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 h-[25vh] flex items-center rounded-b-3xl relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-none dark:text-coral">
              ΑΝΑΖΗΤΗΣΗ<br />ΜΕΛΩΝ
            </h1>
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
            <div className="flex flex-wrap items-center gap-4">
              {/* Search - slightly shorter, so filters fit on one line on desktop */}
              <input
                type="text"
                placeholder="Αναζήτηση ονόματος..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 min-w-[200px] max-w-md px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-coral dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-400"
              />

              {/* Filters */}
              <select
                value={selectedField}
                onChange={(e) => setSelectedField(e.target.value)}
                className="px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-coral dark:bg-gray-700 dark:text-gray-200 w-auto min-w-0 whitespace-nowrap"
              >
                <option value="">Όλα τα πεδία εργασίας</option>
                {uniqueFields.map((field) => (
                  <option key={field} value={field}>
                    {field}
                  </option>
                ))}
              </select>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-coral dark:bg-gray-700 dark:text-gray-200 w-auto min-w-0 whitespace-nowrap"
              >
                <option value="">Όλες οι πόλεις</option>
                {uniqueCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
              <select
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
                className="px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-coral dark:bg-gray-700 dark:text-gray-200 w-auto min-w-0 whitespace-nowrap"
              >
                <option value="">Όλες οι επαρχίες</option>
                {uniqueProvinces.map((province) => (
                  <option key={province} value={province}>
                    {province}
                  </option>
                ))}
              </select>
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
                className="px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-coral dark:bg-gray-700 dark:text-gray-200 w-auto min-w-0 whitespace-nowrap"
              >
                <option value="random">Τυχαία σειρά</option>
                <option value="alpha-asc">Α → Ω</option>
                <option value="alpha-desc">Ω → Α</option>
                <option value="none">Χωρίς ταξινόμηση</option>
              </select>
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
                      alt={member.Image[0].alternativeText || member.Name}
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
                  <div className="inline-block bg-coral/10 dark:bg-coral/20 text-coral dark:text-coral-light text-[10px] px-3 py-1 rounded-2xl uppercase tracking-wide max-w-full">
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

      <Footer variant="members" />
      <CookieConsent />
      <ScrollToTop />
    </main>
  )
}
