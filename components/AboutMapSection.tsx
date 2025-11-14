'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'

// Final city positions with user-provided coordinates
const initialCityCircles = {
  thessaloniki: {
    name: 'ΘΕΣΣΑΛΟΝΙΚΗ',
    cx: 194,
    cy: 159,
    r: 20,
  },
  athens: {
    name: 'ΑΘΗΝΑ',
    cx: 233,
    cy: 321,
    r: 20,
  },
  kalamata: {
    name: 'ΚΑΛΑΜΑΤΑ',
    cx: 156,
    cy: 385,
    r: 20,
  },
  volos: {
    name: 'ΒΟΛΟΣ',
    cx: 204,
    cy: 238,
    r: 20,
  },
  messolonghi: {
    name: 'ΜΕΣΟΛΟΓΓΙ',
    cx: 129,
    cy: 291,
    r: 20,
  },
  preveza: {
    name: 'ΠΡΕΒΕΖΑ',
    cx: 103,
    cy: 271,
    r: 20,
  },
  crete: {
    name: 'ΗΡΑΚΛΕΙΟ',
    cx: 316,
    cy: 487,
    r: 20,
  },
  chios: {
    name: 'ΧΙΟΣ',
    cx: 354,
    cy: 298,
    r: 20,
  },
  syros: {
    name: 'ΣΥΡΟΣ',
    cx: 301,
    cy: 357,
    r: 20,
  },
  skopelos: {
    name: 'ΣΚΟΠΕΛΟΣ',
    cx: 246,
    cy: 242,
    r: 20,
  },
  kyklades: {
    name: 'ΚΥΚΛΑΔΕΣ',
    cx: 318,
    cy: 396,
    r: 20,
  },
  dodekanisa: {
    name: 'ΔΩΔΕΚΑΝΗΣΑ',
    cx: 397,
    cy: 391,
    r: 20,
  },
  thraki: {
    name: 'ΘΡΑΚΗ',
    cx: 350,
    cy: 120,
    r: 20,
  },
  lasithi: {
    name: 'ΛΑΣΙΘΙ',
    cx: 360,
    cy: 490,
    r: 20,
  },
}

// City lists with region mappings
const cities = {
  left: [
    { name: 'ΧΙΟΣ', region: 'chios' },
    { name: 'ΚΑΛΑΜΑΤΑ', region: 'kalamata' },
    { name: 'ΣΥΡΟΣ', region: 'syros' },
    { name: 'ΒΟΛΟΣ', region: 'volos' },
    { name: 'ΚΥΚΛΑΔΕΣ', region: 'kyklades' },
    { name: 'ΘΡΑΚΗ', region: 'thraki' },
    { name: 'ΛΑΣΙΘΙ', region: 'lasithi' },
  ],
  right: [
    { name: 'ΘΕΣΣΑΛΟΝΙΚΗ', region: 'thessaloniki' },
    { name: 'ΜΕΣΟΛΟΓΓΙ', region: 'messolonghi' },
    { name: 'ΣΚΟΠΕΛΟΣ', region: 'skopelos' },
    { name: 'ΠΡΕΒΕΖΑ', region: 'preveza' },
    { name: 'ΗΡΑΚΛΕΙΟ', region: 'crete' },
    { name: 'ΑΘΗΝΑ', region: 'athens' },
    { name: 'ΔΩΔΕΚΑΝΗΣΑ', region: 'dodekanisa' },
  ],
}

export default function AboutMapSection() {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  const [showAllLocations, setShowAllLocations] = useState(false)

  const handleCityHover = (region: string | null) => {
    setHoveredRegion(region)
  }

  const handleRegionClick = (region: string) => {
    setSelectedRegion(selectedRegion === region ? null : region)
  }

  const isRegionActive = (region: string) => {
    return hoveredRegion === region || selectedRegion === region
  }

  return (
    <section className="py-24 bg-gray-50 dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-coral dark:text-coral-light text-sm font-medium mb-4">ΣΧΕΤΙΚΑ ΜΕ ΕΜΑΣ</p>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight dark:text-gray-100">
            ΠΡΟΩΘΟΥΜΕ ΕΝΕΡΓΑ ΤΗΝ ΠΟΛΙΤΙΣΤΙΚΗ<br />
            ΑΛΛΑΓΗ ΣΕ ΟΛΟΚΛΗΡΗ ΤΗΝ ΕΛΛΑΔΑ
          </h2>
        </div>

        {/* Map and Cities Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          {/* Left Cities List */}
          <div className="space-y-4">
            {cities.left.map((city, idx) => (
              <div
                key={`${city.name}-${idx}`}
                className={`pb-3 border-b border-gray-300 dark:border-gray-600 ${
                  city.region
                    ? `cursor-pointer transition-colors duration-300 ${
                        isRegionActive(city.region)
                          ? 'text-coral dark:text-coral-light border-coral'
                          : 'text-charcoal dark:text-gray-200 hover:text-coral hover:border-coral'
                      }`
                    : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
                onMouseEnter={() => city.region && handleCityHover(city.region)}
                onMouseLeave={() => city.region && handleCityHover(null)}
                onClick={() => city.region && handleRegionClick(city.region)}
              >
                <span className="text-sm font-medium">{city.name}</span>
              </div>
            ))}
          </div>

          {/* Map in Center */}
          <div className="flex justify-center" style={{ marginTop: '-75px' }}>
            <div className="relative w-full max-w-md aspect-[3/4]">
              {/* Greece Map Background */}
              <Image
                src="/map-of-greece.jpg"
                alt="Map of Greece"
                fill
                className="object-contain"
              />

              {/* SVG Overlay for Interactive Regions */}
              <svg
                viewBox="0 0 500 600"
                className="absolute inset-0 w-full h-full"
                style={{ pointerEvents: 'none' }}
              >
                {/* All cities as circles */}
                {Object.entries(initialCityCircles).map(([regionKey, city]) => (
                  <circle
                    key={regionKey}
                    cx={city.cx}
                    cy={city.cy}
                    r={city.r}
                    fill={
                      isRegionActive(regionKey) || showAllLocations
                        ? 'rgba(255, 107, 74, 0.5)'
                        : 'transparent'
                    }
                    stroke="transparent"
                    strokeWidth="0"
                    className="cursor-pointer transition-all duration-300"
                    style={{ pointerEvents: 'auto' }}
                    onMouseEnter={() => handleCityHover(regionKey)}
                    onMouseLeave={() => handleCityHover(null)}
                    onClick={() => handleRegionClick(regionKey)}
                  />
                ))}
              </svg>

              {/* Discrete toggle button - ON TOP of map at bottom right */}
              <button
                onClick={() => setShowAllLocations(!showAllLocations)}
                className="absolute right-4 text-sm text-gray-400 hover:text-coral transition-colors z-20"
                style={{ bottom: '72px' }}
                title={showAllLocations ? "Hide all locations" : "Show all locations"}
              >
                {showAllLocations ? '◉' : '○'}
              </button>
            </div>
          </div>

          {/* Right Cities List */}
          <div className="space-y-4">
            {cities.right.map((city, idx) => (
              <div
                key={`${city.name}-${idx}`}
                className={`pb-3 border-b border-gray-300 dark:border-gray-600 text-right ${
                  city.region
                    ? `cursor-pointer transition-colors duration-300 ${
                        isRegionActive(city.region)
                          ? 'text-coral dark:text-coral-light border-coral'
                          : 'text-charcoal dark:text-gray-200 hover:text-coral hover:border-coral'
                      }`
                    : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
                onMouseEnter={() => city.region && handleCityHover(city.region)}
                onMouseLeave={() => city.region && handleCityHover(null)}
                onClick={() => city.region && handleRegionClick(city.region)}
              >
                <span className="text-sm font-medium">{city.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
