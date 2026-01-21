'use client'

import { useState } from 'react'

const regions = [
  { name: 'ΑΤΤΙΚΗ', x: 180, y: 180 },
  { name: 'ΘΕΣΣΑΛΟΝΙΚΗ', x: 200, y: 80 },
  { name: 'ΧΙΟΣ', x: 280, y: 160 },
  { name: 'ΜΕΣΟΛΟΓΓΙ', x: 150, y: 150 },
  { name: 'ΚΑΛΑΜΑΤΑ', x: 160, y: 240 },
  { name: 'ΣΚΟΠΕΛΟΣ', x: 220, y: 120 },
  { name: 'ΒΡΥΣΕΛΛΕΣ', x: 50, y: 200 },
  { name: 'ΠΡΕΒΕΖΑ', x: 140, y: 130 },
  { name: 'ΛΙΣΑΒΟΝΑ', x: 40, y: 220 },
  { name: 'ΚΡΗΤΗ/ΗΡΑΚΛΕΙΟ', x: 240, y: 280 },
  { name: 'ΚΥΠΡΟΣ', x: 320, y: 240 },
  { name: 'ΑΘΗΝΑ', x: 190, y: 190 },
  { name: 'ΣΥΡΟΣ', x: 210, y: 180 },
  { name: 'ΠΟΡΤΟΓΑΛΙΑ', x: 320, y: 300 },
  { name: 'ΒΟΛΟΣ', x: 200, y: 130 },
]

export default function MapSection() {
  const [activeRegion, setActiveRegion] = useState<string | null>(null)

  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-coral text-sm font-medium mb-2">ΣΧΕΤΙΚΑ ΜΕ ΕΜΑΣ</p>
          <h2 className="text-3xl md:text-4xl font-bold">
            ΠΡΟΩΘΟΥΜΕ ΕΝΕΡΓΑ ΤΗΝ ΠΟΛΙΤΙΣΤΙΚΗ<br />
            ΑΛΛΑΓΗ ΣΕ ΟΛΟΚΛΗΡΗ ΤΗΝ ΕΛΛΑΔΑ
          </h2>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 items-start">
          {/* Left column - Cities */}
          <div className="space-y-2">
            {regions.slice(0, Math.ceil(regions.length / 2)).map((region) => (
              <button
                key={region.name}
                onClick={() => setActiveRegion(region.name)}
                className={`block w-full text-left py-2 px-4 border-b-2 transition-colors ${
                  activeRegion === region.name
                    ? 'border-coral text-coral font-medium'
                    : 'border-transparent hover:border-gray-300'
                }`}
              >
                {region.name}
              </button>
            ))}
          </div>

          {/* Center - Map */}
          <div className="flex items-center justify-center">
            <div className="relative w-full max-w-md aspect-square">
              {/* Simplified Greece Map SVG */}
              <svg viewBox="0 0 400 400" className="w-full h-full">
                {/* Map outline - simplified Greece shape */}
                <path
                  d="M 180 80 L 220 70 L 250 90 L 260 120 L 240 150 L 230 180 L 240 200 L 220 220 L 200 250 L 180 280 L 160 260 L 140 240 L 130 210 L 120 180 L 140 150 L 150 120 L 160 100 Z"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="2"
                />

                {/* Highlight active region */}
                {regions.map((region) => (
                  <g key={region.name}>
                    <circle
                      cx={region.x}
                      cy={region.y}
                      r={activeRegion === region.name ? 8 : 4}
                      fill={activeRegion === region.name ? '#FF8B6A' : '#9ca3af'}
                      className="cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-coral"
                      onClick={() => setActiveRegion(region.name)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setActiveRegion(region.name)
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`Επιλογή περιοχής ${region.name}`}
                      aria-pressed={activeRegion === region.name}
                    />
                  </g>
                ))}

                {/* Play button in center */}
                <g transform="translate(200, 200)">
                  <circle cx="0" cy="0" r="30" fill="#4B5563" opacity="0.8"/>
                  <path d="M -8 -12 L -8 12 L 12 0 Z" fill="white"/>
                </g>
              </svg>
            </div>
          </div>

          {/* Right column - Cities */}
          <div className="space-y-2">
            {regions.slice(Math.ceil(regions.length / 2)).map((region) => (
              <button
                key={region.name}
                onClick={() => setActiveRegion(region.name)}
                className={`block w-full text-left py-2 px-4 border-b-2 transition-colors ${
                  activeRegion === region.name
                    ? 'border-coral text-coral font-medium'
                    : 'border-transparent hover:border-gray-300'
                }`}
              >
                {region.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
