'use client'

import { Marker } from 'react-simple-maps'
import { type CityCluster } from '@/lib/mapUtils'
import { getMemberThumbnail } from '@/lib/mapUtils'

interface CityMarkersProps {
  clusters: CityCluster[]
  onCitySelect: (cluster: CityCluster) => void
  zoomLevel: number
}

export default function CityMarkers({ clusters, onCitySelect, zoomLevel }: CityMarkersProps) {
  // Scale marker sizes inversely with zoom so they stay readable
  const scale = Math.max(0.5, 1 / (zoomLevel * 0.4))

  return (
    <>
      {clusters.map((cluster) => (
        <Marker
          key={cluster.city}
          coordinates={[cluster.coords[1], cluster.coords[0]]}
        >
          <g
            onClick={(e) => {
              e.stopPropagation()
              onCitySelect(cluster)
            }}
            style={{ cursor: 'pointer' }}
          >
            {/* Avatar stack */}
            {cluster.members.slice(0, 4).map((member, i) => {
              const thumb = getMemberThumbnail(member)
              const offset = i * 6 * scale
              return (
                <g key={member.id} transform={`translate(${offset}, 0)`}>
                  <circle
                    r={8 * scale}
                    fill="#fff"
                    stroke="#FF8B6A"
                    strokeWidth={1 * scale}
                  />
                  {thumb ? (
                    <clipPath id={`clip-${cluster.city}-${member.id}`}>
                      <circle r={7 * scale} />
                    </clipPath>
                  ) : null}
                  {thumb ? (
                    <image
                      href={thumb}
                      x={-7 * scale}
                      y={-7 * scale}
                      width={14 * scale}
                      height={14 * scale}
                      clipPath={`url(#clip-${cluster.city}-${member.id})`}
                      preserveAspectRatio="xMidYMid slice"
                    />
                  ) : (
                    <circle
                      r={7 * scale}
                      fill="#FFB299"
                    />
                  )}
                </g>
              )
            })}

            {/* Overflow badge */}
            {cluster.members.length > 4 && (
              <g transform={`translate(${4 * 6 * scale}, 0)`}>
                <circle
                  r={8 * scale}
                  fill="#FF6B47"
                  stroke="#fff"
                  strokeWidth={1 * scale}
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#fff"
                  fontSize={6 * scale}
                  fontWeight="bold"
                >
                  +{cluster.members.length - 4}
                </text>
              </g>
            )}

            {/* City name label */}
            <text
              y={14 * scale}
              textAnchor="middle"
              x={Math.min(cluster.members.length, 4) * 3 * scale}
              fill="#2D2D2D"
              fontSize={5 * scale}
              fontWeight="600"
              className="dark:fill-gray-200"
              style={{ pointerEvents: 'none' }}
            >
              {cluster.city}
            </text>
          </g>
        </Marker>
      ))}
    </>
  )
}
