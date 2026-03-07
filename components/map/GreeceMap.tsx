'use client'

import { useState, useCallback, useMemo, useRef, useEffect, memo } from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
  Marker,
} from 'react-simple-maps'
import { NUTS_TO_PROVINCE, CITY_COORDINATES, PROVINCE_CENTROIDS } from '@/lib/mapData'
import { getProvinceColor, type ProvinceData, type CityCluster, type MapMember } from '@/lib/mapUtils'
import ProvinceTooltip from './ProvinceTooltip'
import CityMarkers from './CityMarkers'
import EuropeInset from './EuropeInset'
import MapLegend from './MapLegend'

const GEO_URL = '/geo/greece-provinces-nuts2.json'

interface GreeceMapProps {
  provinceMap: Record<string, ProvinceData>
  foreignMembers: CityCluster[]
  isDarkMode: boolean
  onCitySelect: (cluster: CityCluster) => void
  initialProvince?: string | null
  isCityPanelOpen?: boolean
}

interface ZoomState {
  coordinates: [number, number]
  zoom: number
}

const DEFAULT_CENTER: [number, number] = [23.7, 38.5]
const ZOOM_DURATION = 500 // ms

function GreeceMap({ provinceMap, foreignMembers, isDarkMode, onCitySelect, initialProvince, isCityPanelOpen }: GreeceMapProps) {
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null)
  const [zoomState, setZoomState] = useState<ZoomState>({
    coordinates: DEFAULT_CENTER,
    zoom: 1,
  })
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<number | null>(null)
  const zoomRef = useRef<ZoomState>(zoomState)
  zoomRef.current = zoomState
  const initializedRef = useRef(false)

  // Zoom into initial province on mount (e.g. when returning from member detail)
  useEffect(() => {
    if (initializedRef.current || !initialProvince) return
    initializedRef.current = true
    const centroid = PROVINCE_CENTROIDS[initialProvince]
    if (centroid) {
      setSelectedProvince(initialProvince)
      setZoomState({ coordinates: [centroid[1], centroid[0]], zoom: 4 })
    }
  }, [initialProvince])

  // Escape key zooms out — but only when city panel is NOT open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isZoomed && !isCityPanelOpen) {
        setSelectedProvince(null)
        animateZoom({ coordinates: DEFAULT_CENTER, zoom: 1 })
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  })

  const isZoomed = zoomState.zoom > 1.5

  /** Smoothly animate from current zoom state to target */
  const animateZoom = useCallback((target: ZoomState) => {
    if (animRef.current) cancelAnimationFrame(animRef.current)

    const start: ZoomState = {
      coordinates: [...zoomRef.current.coordinates],
      zoom: zoomRef.current.zoom,
    }
    const t0 = performance.now()

    function step(now: number) {
      const elapsed = now - t0
      const progress = Math.min(elapsed / ZOOM_DURATION, 1)
      const ease = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2

      setZoomState({
        coordinates: [
          start.coordinates[0] + (target.coordinates[0] - start.coordinates[0]) * ease,
          start.coordinates[1] + (target.coordinates[1] - start.coordinates[1]) * ease,
        ],
        zoom: start.zoom + (target.zoom - start.zoom) * ease,
      })

      if (progress < 1) {
        animRef.current = requestAnimationFrame(step)
      } else {
        animRef.current = null
      }
    }

    animRef.current = requestAnimationFrame(step)
  }, [])

  const handleProvinceClick = useCallback((nutsId: string) => {
    const provinceName = NUTS_TO_PROVINCE[nutsId]
    if (!provinceName) return

    const provinceData = provinceMap[provinceName]
    if (!provinceData || provinceData.count === 0) return

    if (selectedProvince === provinceName) {
      setSelectedProvince(null)
      animateZoom({ coordinates: DEFAULT_CENTER, zoom: 1 })
    } else {
      const centroid = PROVINCE_CENTROIDS[provinceName]
      if (centroid) {
        setSelectedProvince(provinceName)
        animateZoom({ coordinates: [centroid[1], centroid[0]], zoom: 4 })
      }
    }
  }, [provinceMap, selectedProvince, animateZoom])

  const handleBackClick = useCallback(() => {
    setSelectedProvince(null)
    animateZoom({ coordinates: DEFAULT_CENTER, zoom: 1 })
  }, [animateZoom])

  // Track mouse position relative to container for tooltip
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }, [])

  // Build city clusters for the selected province
  const cityClusters = useMemo<CityCluster[]>(() => {
    if (!selectedProvince || !provinceMap[selectedProvince]) return []
    const pd = provinceMap[selectedProvince]
    return Object.entries(pd.cities).map(([city, members]) => ({
      city,
      province: selectedProvince,
      coords: CITY_COORDINATES[city] || PROVINCE_CENTROIDS[selectedProvince] || [38, 23],
      members,
    }))
  }, [selectedProvince, provinceMap])

  const hoveredData = hoveredProvince ? provinceMap[hoveredProvince] : null

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ aspectRatio: '4 / 5', maxHeight: '70vh' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setMousePos(null)}
    >
      {/* Legend — top-left when not zoomed */}
      {!isZoomed && (
        <div className="absolute top-4 left-4 z-10 pointer-events-auto">
          <MapLegend isDarkMode={isDarkMode} />
        </div>
      )}

      {/* Back button + Escape hint when zoomed */}
      {isZoomed && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <button
            onClick={handleBackClick}
            className="bg-white dark:bg-gray-800 text-charcoal dark:text-gray-200 px-4 py-2 rounded-full shadow-lg text-sm font-medium border border-charcoal dark:border-gray-500 hover:bg-charcoal hover:text-white dark:hover:bg-white dark:hover:text-charcoal transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Πίσω
          </button>
          <span className="hidden sm:inline">
            <kbd className="px-2 py-1 rounded border border-charcoal dark:border-gray-400 bg-white dark:bg-gray-800 text-charcoal dark:text-gray-200 font-mono text-xs">Esc</kbd>
          </span>
        </div>
      )}

      {/* Europe inset — desktop only, bottom-right, hidden when zoomed */}
      {!isZoomed && (
        <div className="hidden lg:block absolute bottom-4 right-4 z-10">
          <EuropeInset foreignMembers={foreignMembers} isDarkMode={isDarkMode} onCitySelect={onCitySelect} />
        </div>
      )}

      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          center: [23.7, 38.5],
          scale: 2800,
        }}
        width={500}
        height={620}
        className="w-full h-full"
      >
        <ZoomableGroup
          center={zoomState.coordinates}
          zoom={zoomState.zoom}
          minZoom={1}
          maxZoom={8}
          translateExtent={[[0, 0], [500, 620]]}
          onMoveEnd={({ coordinates, zoom }) => {
            setZoomState({ coordinates: coordinates as [number, number], zoom })
          }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const nutsId = geo.properties.NUTS_ID
                const provinceName = NUTS_TO_PROVINCE[nutsId]
                const data = provinceName ? provinceMap[provinceName] : null
                const count = data?.count || 0
                const isSelected = selectedProvince === provinceName

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={() => provinceName && setHoveredProvince(provinceName)}
                    onMouseLeave={() => setHoveredProvince(null)}
                    onClick={() => handleProvinceClick(nutsId)}
                    style={{
                      default: {
                        fill: isSelected
                          ? (isDarkMode ? '#C96B4E' : '#FF6B47')
                          : getProvinceColor(count, isDarkMode),
                        stroke: isDarkMode ? '#555' : '#fff',
                        strokeWidth: 0.5,
                        outline: 'none',
                        cursor: count > 0 ? 'pointer' : 'default',
                        transition: 'fill 0.2s ease',
                      },
                      hover: {
                        fill: getProvinceColor(count, isDarkMode),
                        stroke: count > 0
                          ? (isDarkMode ? '#fff' : '#2D2D2D')
                          : (isDarkMode ? '#555' : '#fff'),
                        strokeWidth: count > 0 ? 1.5 : 0.5,
                        outline: 'none',
                        cursor: count > 0 ? 'pointer' : 'default',
                        filter: count > 0 ? 'brightness(0.85)' : 'none',
                      },
                      pressed: {
                        fill: isDarkMode ? '#C96B4E' : '#FF6B47',
                        stroke: isDarkMode ? '#aaa' : '#fff',
                        strokeWidth: 1,
                        outline: 'none',
                      },
                    }}
                  />
                )
              })
            }
          </Geographies>

          {/* City markers — visible when zoomed into a province */}
          {isZoomed && cityClusters.length > 0 && (
            <CityMarkers
              clusters={cityClusters}
              onCitySelect={onCitySelect}
              zoomLevel={zoomState.zoom}
            />
          )}
        </ZoomableGroup>
      </ComposableMap>

      {/* Province tooltip — follows mouse, near the hovered province */}
      {hoveredData && !isZoomed && mousePos && (
        <ProvinceTooltip
          province={hoveredData}
          isDarkMode={isDarkMode}
          x={mousePos.x}
          y={mousePos.y}
        />
      )}

      {/* Mobile: foreign members as text */}
      {foreignMembers.length > 0 && (
        <div className="lg:hidden mt-4 px-2">
          <p className="text-sm font-medium text-charcoal dark:text-gray-300 mb-2">
            Μέλη στο εξωτερικό ({foreignMembers.reduce((s, c) => s + c.members.length, 0)})
          </p>
          <div className="flex flex-wrap gap-2">
            {foreignMembers.map((cluster) => (
              <button
                key={cluster.city}
                onClick={() => onCitySelect(cluster)}
                className="text-xs bg-coral/10 dark:bg-coral/20 text-coral-dark dark:text-coral-light px-3 py-1.5 rounded-full hover:bg-coral/20 dark:hover:bg-coral/30 transition-colors"
              >
                {cluster.city} ({cluster.members.length})
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default memo(GreeceMap)
