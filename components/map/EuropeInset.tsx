'use client'

import { useState, useEffect, useRef, useCallback, memo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
  Marker,
} from 'react-simple-maps'
import { type CityCluster, getMemberThumbnail } from '@/lib/mapUtils'

const EUROPE_GEO_URL = '/geo/europe-simple.json'

interface EuropeInsetProps {
  foreignMembers: CityCluster[]
  isDarkMode: boolean
  onCitySelect: (cluster: CityCluster) => void
}

function EuropeInset({ foreignMembers, isDarkMode, onCitySelect }: EuropeInsetProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showMemberList, setShowMemberList] = useState(false)
  const [mapZoom, setMapZoom] = useState(1)
  const [mapCenter, setMapCenter] = useState<[number, number]>([15, 50])
  const [mounted, setMounted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const memberListTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const totalForeignMembers = foreignMembers.reduce((s, c) => s + c.members.length, 0)

  // Only render map on client to avoid hydration mismatch from floating-point marker transforms
  useEffect(() => { setMounted(true) }, [])

  if (foreignMembers.length === 0) return null

  // Escape key: collapse expanded state or close member list
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showMemberList) {
          e.stopPropagation()
          setShowMemberList(false)
        } else if (isExpanded) {
          e.stopPropagation()
          setIsExpanded(false)
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [isExpanded, showMemberList])

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    hoverTimeoutRef.current = setTimeout(() => {
      setIsExpanded(true)
    }, 200)
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    hoverTimeoutRef.current = setTimeout(() => {
      setIsExpanded(false)
      setShowMemberList(false)
    }, 300)
  }, [])

  const handleHeaderMouseEnter = useCallback(() => {
    if (memberListTimeoutRef.current) clearTimeout(memberListTimeoutRef.current)
    memberListTimeoutRef.current = setTimeout(() => {
      setShowMemberList(true)
    }, 200)
  }, [])

  const handleHeaderMouseLeave = useCallback(() => {
    if (memberListTimeoutRef.current) clearTimeout(memberListTimeoutRef.current)
    memberListTimeoutRef.current = setTimeout(() => {
      setShowMemberList(false)
    }, 300)
  }, [])

  const handleZoomIn = useCallback(() => {
    setMapZoom(prev => Math.min(prev * 1.5, 6))
  }, [])

  const handleZoomOut = useCallback(() => {
    setMapZoom(prev => Math.max(prev / 1.5, 0.5))
  }, [])

  // All foreign members sorted alphabetically for the member list
  const allForeignMembersSorted = foreignMembers
    .flatMap(cluster => cluster.members.map(m => ({ ...m, city: cluster.city })))
    .sort((a, b) => a.Name.localeCompare(b.Name, 'el'))

  const baseWidth = 208
  const baseHeight = 180
  const expandedWidth = baseWidth * 2
  const expandedHeight = baseHeight * 2

  const currentWidth = isExpanded ? expandedWidth : baseWidth
  const currentHeight = isExpanded ? expandedHeight : baseHeight
  const mapHeight = isExpanded ? expandedHeight - 32 : baseHeight - 32

  return (
    <div
      ref={containerRef}
      className={`rounded-xl overflow-visible shadow-lg border border-charcoal dark:border-gray-400 relative ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}
      style={{
        width: currentWidth,
        height: currentHeight,
        transition: 'width 0.3s ease, height 0.3s ease',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header */}
      <div
        className={`relative text-[10px] font-bold text-center py-1.5 border-b cursor-default ${
          isDarkMode ? 'text-gray-400 border-gray-700' : 'text-charcoal border-gray-200'
        }`}
        onMouseEnter={handleHeaderMouseEnter}
        onMouseLeave={handleHeaderMouseLeave}
      >
        ΜΕΛΗ ΣΤΟ ΕΞΩΤΕΡΙΚΟ ({totalForeignMembers})

        {/* Member list dropdown on header hover */}
        {showMemberList && (
          <div
            className={`absolute top-full left-0 z-50 rounded-b-xl shadow-lg border border-t-0 border-charcoal dark:border-gray-400 overflow-hidden ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}
            style={{ width: currentWidth }}
            onMouseEnter={handleHeaderMouseEnter}
            onMouseLeave={handleHeaderMouseLeave}
          >
            <div className="max-h-48 overflow-y-auto">
              {allForeignMembersSorted.map((member, idx) => {
                const thumb = getMemberThumbnail(member)
                return (
                  <Link
                    key={`${member.id}-${member.city}`}
                    href={`/members/${member.Slug || member.documentId}?from=map&city=${encodeURIComponent(member.city)}`}
                    className={`flex items-center gap-2 px-2 py-1.5 transition-colors ${
                      isDarkMode
                        ? 'hover:bg-gray-700'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-coral/10 dark:bg-coral/20 flex-shrink-0">
                      {thumb ? (
                        <Image
                          src={thumb}
                          alt={member.Name}
                          width={28}
                          height={28}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-coral text-[10px] font-bold">
                          {member.Name?.charAt(0)}
                        </div>
                      )}
                    </div>
                    <span className={`text-xs truncate ${isDarkMode ? 'text-gray-300' : 'text-charcoal'}`}>
                      {member.Name}
                    </span>
                    <span className={`text-[10px] ml-auto flex-shrink-0 ${isDarkMode ? 'text-gray-400' : 'text-charcoal'}`}>
                      {member.city}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Zoom controls — top-right corner */}
      {isExpanded && (
        <div className="absolute top-8 right-1 z-20 flex flex-col gap-0.5">
          <button
            onClick={handleZoomIn}
            className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold border transition-colors ${
              isDarkMode
                ? 'bg-gray-700 text-gray-300 border-gray-500 hover:bg-gray-600'
                : 'bg-white text-charcoal border-charcoal hover:bg-gray-100'
            }`}
          >
            +
          </button>
          <button
            onClick={handleZoomOut}
            className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold border transition-colors ${
              isDarkMode
                ? 'bg-gray-700 text-gray-300 border-gray-500 hover:bg-gray-600'
                : 'bg-white text-charcoal border-charcoal hover:bg-gray-100'
            }`}
          >
            −
          </button>
        </div>
      )}

      {/* Map */}
      <div style={{ height: mapHeight, overflow: 'hidden' }}>
        {!mounted ? (
          <div className={`w-full h-full ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`} />
        ) : (
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            center: [15, 50],
            scale: isExpanded ? 350 : 300,
          }}
          width={currentWidth}
          height={mapHeight}
          className="w-full h-full"
        >
          <ZoomableGroup
            center={mapCenter}
            zoom={mapZoom}
            minZoom={0.5}
            maxZoom={6}
            onMoveEnd={({ coordinates, zoom }) => {
              setMapCenter(coordinates as [number, number])
              setMapZoom(zoom)
            }}
          >
            <Geographies geography={EUROPE_GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const isGreece = geo.properties.NUTS_ID === 'EL' || geo.properties.CNTR_CODE === 'EL'
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      style={{
                        default: {
                          fill: isGreece
                            ? (isDarkMode ? '#C96B4E' : '#FF8B6A')
                            : (isDarkMode ? '#4A4A4A' : '#E5E7EB'),
                          stroke: isDarkMode ? '#555' : '#D1D5DB',
                          strokeWidth: 0.3,
                          outline: 'none',
                        },
                        hover: {
                          fill: isGreece
                            ? (isDarkMode ? '#C96B4E' : '#FF8B6A')
                            : (isDarkMode ? '#555' : '#D1D5DB'),
                          stroke: isDarkMode ? '#666' : '#B0B5BB',
                          strokeWidth: 0.5,
                          outline: 'none',
                        },
                        pressed: {
                          fill: isGreece
                            ? (isDarkMode ? '#C96B4E' : '#FF8B6A')
                            : (isDarkMode ? '#4A4A4A' : '#E5E7EB'),
                          outline: 'none',
                        },
                      }}
                    />
                  )
                })
              }
            </Geographies>

            {/* Foreign member dots with city labels */}
            {foreignMembers.map((cluster) => (
              <Marker
                key={cluster.city}
                coordinates={[cluster.coords[1], cluster.coords[0]]}
              >
                <g
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    onCitySelect(cluster)
                  }}
                >
                  <circle
                    r={isExpanded ? 5 : 4}
                    fill="#FF6B47"
                    stroke="#fff"
                    strokeWidth={0.8}
                  />
                  <text
                    y={isExpanded ? -9 : -7}
                    textAnchor="middle"
                    fill={isDarkMode ? '#ddd' : '#2D2D2D'}
                    fontSize={isExpanded ? 6 : 5}
                    fontWeight="600"
                    style={{ pointerEvents: 'none' }}
                  >
                    {cluster.city} ({cluster.members.length})
                  </text>
                </g>
              </Marker>
            ))}
          </ZoomableGroup>
        </ComposableMap>
        )}
      </div>
    </div>
  )
}

export default memo(EuropeInset)
