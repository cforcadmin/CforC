'use client'

import { useState } from 'react'

// City data with their positions and regions
const cities = {
  left: [
    { name: 'ΑΤΤΙΚΗ', region: 'attiki' },
    { name: 'ΧΙΟΣ', region: 'chios' },
    { name: 'ΚΑΛΑΜΑΤΑ', region: 'kalamata' },
    { name: 'ΒΡΥΣΕΛΛΕΣ', region: 'brussels' },
    { name: 'ΛΙΣΑΒΟΝΑ', region: 'lisbon' },
    { name: 'ΚΥΠΡΟΣ', region: 'cyprus' },
    { name: 'ΣΥΡΟΣ', region: 'syros' },
    { name: 'ΒΟΛΟΣ', region: 'volos' },
  ],
  right: [
    { name: 'ΘΕΣΣΑΛΟΝΙΚΗ', region: 'thessaloniki' },
    { name: 'ΜΕΣΟΛΟΓΓΙ', region: 'messolonghi' },
    { name: 'ΣΚΟΠΕΛΟΣ', region: 'skopelos' },
    { name: 'ΠΡΕΒΕΖΑ', region: 'preveza' },
    { name: 'ΚΡΗΤΗ/ΗΡΑΚΛΕΙΟ', region: 'crete' },
    { name: 'ΘΕΣΣΑΛΟΝΙΚΗ', region: 'thessaloniki2' },
    { name: 'ΑΘΗΝΑ', region: 'athens' },
    { name: 'ΠΟΡΤΟΓΑΛΙΑ', region: 'portugal' },
  ],
}

export default function AboutMapSection() {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)

  const handleCityHover = (region: string | null) => {
    setHoveredRegion(region)
  }

  const handleCityClick = (region: string) => {
    setSelectedRegion(selectedRegion === region ? null : region)
  }

  const isRegionActive = (region: string) => {
    return hoveredRegion === region || selectedRegion === region
  }

  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-coral text-sm font-medium mb-4">ΣΧΕΤΙΚΑ ΜΕ ΕΜΑΣ</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
            ΠΡΟΩΘΟΥΜΕ ΕΝΕΡΓΑ ΤΗΝ ΠΟΛΙΤΙΣΤΙΚΗ<br />
            ΑΛΛΑΓΗ ΣΕ ΟΛΟΚΛΗΡΗ ΤΗΝ ΕΛΛΑΔΑ
          </h2>
        </div>

        {/* Map and Cities Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          {/* Left Cities List */}
          <div className="space-y-4">
            {cities.left.map((city) => (
              <div
                key={city.region}
                className={`cursor-pointer transition-colors duration-300 pb-3 border-b border-gray-300 ${
                  isRegionActive(city.region)
                    ? 'text-coral border-coral'
                    : 'text-charcoal hover:text-coral hover:border-coral'
                }`}
                onMouseEnter={() => handleCityHover(city.region)}
                onMouseLeave={() => handleCityHover(null)}
                onClick={() => handleCityClick(city.region)}
              >
                <span className="text-sm font-medium">{city.name}</span>
              </div>
            ))}
          </div>

          {/* Map in Center */}
          <div className="flex items-center justify-center relative">
            {/* Simplified Greece Map SVG - Placeholder */}
            <svg
              viewBox="0 0 400 500"
              className="w-full max-w-md"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* This is a simplified placeholder - you'll need actual Greece map SVG paths */}

              {/* Northern Greece / Macedonia */}
              <path
                d="M 100 80 L 300 80 L 320 120 L 280 150 L 100 140 Z"
                fill={isRegionActive('thessaloniki') || isRegionActive('thessaloniki2') ? '#FF6B4A' : '#E5E7EB'}
                stroke="#9CA3AF"
                strokeWidth="2"
                className="cursor-pointer transition-colors duration-300"
                onMouseEnter={() => handleCityHover('thessaloniki')}
                onMouseLeave={() => handleCityHover(null)}
                onClick={() => handleCityClick('thessaloniki')}
              />

              {/* Central Greece / Epirus */}
              <path
                d="M 90 140 L 280 150 L 250 220 L 80 210 Z"
                fill={isRegionActive('preveza') ? '#FF6B4A' : '#E5E7EB'}
                stroke="#9CA3AF"
                strokeWidth="2"
                className="cursor-pointer transition-colors duration-300"
                onMouseEnter={() => handleCityHover('preveza')}
                onMouseLeave={() => handleCityHover(null)}
                onClick={() => handleCityClick('preveza')}
              />

              {/* Attica / Athens */}
              <path
                d="M 150 220 L 250 220 L 260 280 L 140 270 Z"
                fill={isRegionActive('athens') || isRegionActive('attiki') ? '#FF6B4A' : '#E5E7EB'}
                stroke="#9CA3AF"
                strokeWidth="2"
                className="cursor-pointer transition-colors duration-300"
                onMouseEnter={() => handleCityHover('athens')}
                onMouseLeave={() => handleCityHover(null)}
                onClick={() => handleCityClick('athens')}
              />

              {/* Peloponnese */}
              <path
                d="M 100 270 L 240 280 L 220 380 L 80 370 Z"
                fill={isRegionActive('kalamata') ? '#FF6B4A' : '#E5E7EB'}
                stroke="#9CA3AF"
                strokeWidth="2"
                className="cursor-pointer transition-colors duration-300"
                onMouseEnter={() => handleCityHover('kalamata')}
                onMouseLeave={() => handleCityHover(null)}
                onClick={() => handleCityClick('kalamata')}
              />

              {/* Crete */}
              <path
                d="M 120 420 L 300 420 L 290 460 L 110 460 Z"
                fill={isRegionActive('crete') ? '#FF6B4A' : '#E5E7EB'}
                stroke="#9CA3AF"
                strokeWidth="2"
                className="cursor-pointer transition-colors duration-300"
                onMouseEnter={() => handleCityHover('crete')}
                onMouseLeave={() => handleCityHover(null)}
                onClick={() => handleCityClick('crete')}
              />

              {/* Islands - Chios */}
              <circle
                cx="350"
                cy="200"
                r="15"
                fill={isRegionActive('chios') ? '#FF6B4A' : '#E5E7EB'}
                stroke="#9CA3AF"
                strokeWidth="2"
                className="cursor-pointer transition-colors duration-300"
                onMouseEnter={() => handleCityHover('chios')}
                onMouseLeave={() => handleCityHover(null)}
                onClick={() => handleCityClick('chios')}
              />

              {/* Islands - Syros */}
              <circle
                cx="300"
                cy="240"
                r="12"
                fill={isRegionActive('syros') ? '#FF6B4A' : '#E5E7EB'}
                stroke="#9CA3AF"
                strokeWidth="2"
                className="cursor-pointer transition-colors duration-300"
                onMouseEnter={() => handleCityHover('syros')}
                onMouseLeave={() => handleCityHover(null)}
                onClick={() => handleCityClick('syros')}
              />

              {/* Volos area */}
              <circle
                cx="200"
                cy="180"
                r="12"
                fill={isRegionActive('volos') ? '#FF6B4A' : '#E5E7EB'}
                stroke="#9CA3AF"
                strokeWidth="2"
                className="cursor-pointer transition-colors duration-300"
                onMouseEnter={() => handleCityHover('volos')}
                onMouseLeave={() => handleCityHover(null)}
                onClick={() => handleCityClick('volos')}
              />
            </svg>

            {/* Center Play Button Overlay (optional) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <button className="pointer-events-auto w-16 h-16 rounded-full bg-charcoal/80 hover:bg-charcoal flex items-center justify-center transition-colors group">
                <svg
                  className="w-8 h-8 text-white ml-1"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Right Cities List */}
          <div className="space-y-4">
            {cities.right.map((city, index) => (
              <div
                key={`${city.region}-${index}`}
                className={`cursor-pointer transition-colors duration-300 pb-3 border-b border-gray-300 text-right ${
                  isRegionActive(city.region)
                    ? 'text-coral border-coral'
                    : 'text-charcoal hover:text-coral hover:border-coral'
                }`}
                onMouseEnter={() => handleCityHover(city.region)}
                onMouseLeave={() => handleCityHover(null)}
                onClick={() => handleCityClick(city.region)}
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
