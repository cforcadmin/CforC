'use client'

import { type ProvinceData } from '@/lib/mapUtils'

interface ProvinceTooltipProps {
  province: ProvinceData
  isDarkMode: boolean
  x: number
  y: number
}

export default function ProvinceTooltip({ province, isDarkMode, x, y }: ProvinceTooltipProps) {
  const cityEntries = Object.entries(province.cities).sort((a, b) => b[1].length - a[1].length)

  // Offset tooltip so it doesn't sit under the cursor
  const offsetX = 16
  const offsetY = -8

  return (
    <div
      className="absolute z-20 pointer-events-none max-w-xs"
      style={{ left: x + offsetX, top: y + offsetY, transform: 'translateY(-100%)' }}
    >
      <div className={`rounded-xl shadow-lg px-4 py-3 border border-charcoal dark:border-gray-400 ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <p className={`font-bold text-sm ${isDarkMode ? 'text-gray-100' : 'text-charcoal'}`}>
          {province.name}
        </p>
        <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-coral-light' : 'text-coral-dark'}`}>
          {province.count} {province.count === 1 ? 'μέλος' : 'μέλη'}
        </p>
        {cityEntries.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {cityEntries.slice(0, 5).map(([city, members]) => (
              <p key={city} className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {city}: {members.length}
              </p>
            ))}
            {cityEntries.length > 5 && (
              <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                +{cityEntries.length - 5} ακόμη...
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
