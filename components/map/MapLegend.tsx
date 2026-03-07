'use client'

import { useState } from 'react'
import { CHOROPLETH_COLORS_LIGHT, CHOROPLETH_COLORS_DARK, CHOROPLETH_LABELS } from '@/lib/mapData'

interface MapLegendProps {
  isDarkMode: boolean
}

export default function MapLegend({ isDarkMode }: MapLegendProps) {
  const colors = isDarkMode ? CHOROPLETH_COLORS_DARK : CHOROPLETH_COLORS_LIGHT
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={`rounded-xl shadow-lg border border-charcoal dark:border-gray-400 ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}
      style={{
        transformOrigin: 'top left',
        transform: expanded ? 'scale(2)' : 'scale(1)',
        transition: 'transform 0.3s ease',
      }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div className="px-3 py-2">
        <p className={`text-[10px] font-bold mb-1.5 ${isDarkMode ? 'text-gray-400' : 'text-charcoal'}`}>
          ΜΕΛΗ ΑΝΑ ΠΕΡΙΦΕΡΕΙΑ
        </p>
        <div className="flex items-center gap-1">
          {colors.map((color, i) => (
            <div key={i} className="flex flex-col items-center">
              <div
                className="w-6 h-3 rounded-sm"
                style={{ backgroundColor: color }}
              />
              <span className={`text-[8px] mt-0.5 ${isDarkMode ? 'text-gray-500' : 'text-charcoal'}`}>
                {CHOROPLETH_LABELS[i]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
