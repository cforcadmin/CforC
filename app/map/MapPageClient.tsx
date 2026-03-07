'use client'

import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import CookieConsent from '@/components/CookieConsent'
import ScrollToTop from '@/components/ScrollToTop'
import CombinedCtaSection from '@/components/CombinedCtaSection'
import GreeceMap from '@/components/map/GreeceMap'
import CityMemberPanel from '@/components/map/CityMemberPanel'
import MembersWithoutCity from '@/components/map/MembersWithoutCity'
import { aggregateMembersByLocation, type MapMember, type CityCluster } from '@/lib/mapUtils'
import { CITY_COORDINATES, PROVINCE_CENTROIDS } from '@/lib/mapData'
import { useTheme } from '@/components/ThemeProvider'

interface MapPageClientProps {
  members: MapMember[]
}

export default function MapPageClient({ members }: MapPageClientProps) {
  const { theme } = useTheme()
  const isDarkMode = theme === 'dark'
  const searchParams = useSearchParams()
  const [selectedCity, setSelectedCity] = useState<CityCluster | null>(null)
  const [initialProvince, setInitialProvince] = useState<string | null>(null)

  const mapData = useMemo(() => aggregateMembersByLocation(members), [members])

  // Restore city/province selection from URL params (e.g. when coming from member detail)
  useEffect(() => {
    const cityParam = searchParams.get('city')
    const provinceParam = searchParams.get('province')

    if (cityParam) {
      // Search across all provinces and foreign members for the city
      for (const province of Object.values(mapData.provinceMap)) {
        for (const [city, cityMembers] of Object.entries(province.cities)) {
          if (city === cityParam) {
            setSelectedCity({
              city,
              province: province.name,
              coords: CITY_COORDINATES[city] || PROVINCE_CENTROIDS[province.name] || [38, 23],
              members: cityMembers,
            })
            setInitialProvince(province.name)
            return
          }
        }
      }
      for (const cluster of mapData.foreignMembers) {
        if (cluster.city === cityParam) {
          setSelectedCity(cluster)
          return
        }
      }
    } else if (provinceParam) {
      // Zoom into the province (no city selected)
      if (mapData.provinceMap[provinceParam]) {
        setInitialProvince(provinceParam)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const totalMembers = members.filter(m => !m.HideProfile).length
  const mappedMembers = totalMembers - mapData.membersWithoutCity.length

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Navigation />

      {/* Mini Hero */}
      <section className="bg-coral dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 pt-24 pb-6 rounded-b-3xl relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold text-charcoal dark:text-gray-100">
            ΧΑΡΤΗΣ ΜΕΛΩΝ CforC
          </h1>
          <span className="inline-block mt-2 bg-charcoal dark:bg-gray-700 text-coral dark:text-coral-light text-sm font-medium px-4 py-1.5 rounded-full">
            {mappedMembers} μέλη σε {Object.values(mapData.provinceMap).filter(p => p.count > 0).length} περιφέρειες
            {mapData.foreignMembers.length > 0 && ` + ${mapData.foreignMembers.reduce((s, c) => s + c.members.length, 0)} στο εξωτερικό`}
          </span>
        </div>
      </section>

      {/* Map Container */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
        <div className="relative">
          <GreeceMap
            provinceMap={mapData.provinceMap}
            foreignMembers={mapData.foreignMembers}
            isDarkMode={isDarkMode}
            onCitySelect={setSelectedCity}
            initialProvince={initialProvince}
            isCityPanelOpen={selectedCity !== null}
          />
        </div>
      </section>

      {/* Bottom row: members without city + Europe inset side by side */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          {mapData.membersWithoutCity.length > 0 && (
            <div className="flex-1 min-w-0">
              <MembersWithoutCity members={mapData.membersWithoutCity} />
            </div>
          )}
        </div>
      </section>

      {/* City member panel (side panel / bottom sheet) */}
      {selectedCity && (
        <CityMemberPanel
          cluster={selectedCity}
          onClose={() => setSelectedCity(null)}
        />
      )}

      <CombinedCtaSection />
      <Footer />
      <CookieConsent />
      <ScrollToTop />
    </div>
  )
}
