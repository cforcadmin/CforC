'use client'

import { useEffect, useState } from 'react'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import CookieConsent from '@/components/CookieConsent'
import ScrollToTop from '@/components/ScrollToTop'
import Link from 'next/link'
import Image from 'next/image'

interface Member {
  id: number
  documentId: string
  Name: string
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
  const [totalCount, setTotalCount] = useState(0)
  const [displayCount, setDisplayCount] = useState(0)

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/members?populate=*`,
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

    setFilteredMembers(result)
  }, [allMembers, searchQuery, selectedField, selectedCity, selectedProvince])

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
    <main className="min-h-screen bg-[#F5F0EB]">
      <Navigation variant="members" />

      {/* Hero Section */}
      <section className="relative -bottom-20">
        <div className="relative h-[25vh] flex items-center rounded-b-3xl overflow-hidden z-10">
          <div className="absolute inset-0 bg-coral opacity-20"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-none">
              ΑΝΑΖΗΤΗΣΗ<br />ΜΕΛΩΝ
            </h1>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="pt-32 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Info Box */}
          <div className="bg-white rounded-3xl p-8 mb-12 relative">
            <div className="absolute top-8 right-8 text-right">
              <div className="bg-[#F5F0EB] px-6 py-3 rounded-full border-2 border-gray-300 shadow-sm">
                <p className="text-sm font-bold text-gray-700">Μέλη: <span className="text-coral">{displayCount}</span></p>
              </div>
            </div>
            <p className="text-gray-700 leading-relaxed max-w-4xl">
              Ένα αποτελεσματικό εξειδικευμένο δημιουργικών επαγγελματιών, έργων και ιδεών που προάγουν την κοινωνικοπολιτιστική καινοτομία μέσα πρωτοβουλιών με κινητήρια δύναμη τον άνθρωπο.
            </p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-3xl p-8 mb-12">
            <div className="grid md:grid-cols-4 gap-4">
              <input
                type="text"
                placeholder="Αναζήτηση ονόματος..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-coral"
              />
              <select
                value={selectedField}
                onChange={(e) => setSelectedField(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-coral"
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
                className="px-4 py-3 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-coral"
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
                className="px-4 py-3 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-coral"
              >
                <option value="">Όλες οι επαρχίες</option>
                {uniqueProvinces.map((province) => (
                  <option key={province} value={province}>
                    {province}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Members Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredMembers.map((member) => (
              <Link
                key={member.id}
                href={`/members/${encodeURIComponent(member.Name)}`}
                className="bg-white rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300 group"
              >
                {member.Image && member.Image.length > 0 && member.Image[0].url ? (
                  <div className="aspect-[4/5] relative bg-gray-200 overflow-hidden">
                    <Image
                      src={member.Image[0].url}
                      alt={member.Image[0].alternativeText || member.Name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="aspect-[4/5] bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400 text-4xl">{member.Name.charAt(0)}</span>
                  </div>
                )}
                <div className="p-6">
                  <p className="text-coral text-xs mb-2 uppercase">
                    {member.FieldsOfWork}
                  </p>
                  <h3 className="text-xl font-bold">{member.Name}</h3>
                </div>
              </Link>
            ))}
          </div>

          {filteredMembers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600">Δεν βρέθηκαν μέλη με τα επιλεγμένα κριτήρια.</p>
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
