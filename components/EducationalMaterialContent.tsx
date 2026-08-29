'use client'

import { useState, useRef, useEffect } from 'react'
import LocalizedText from '@/components/LocalizedText'
import { educationalCategories, Category, Subcategory } from '@/lib/educationalData'
import { useNavMode } from '@/components/nav/useNavMode'

type View =
  | { type: 'categories' }
  | { type: 'resources'; categoryKey: string; subcategoryKey: string }

export default function EducationalMaterialContent() {
  const { mode } = useNavMode()
  const cool = mode === 'cool'
  const [view, setView] = useState<View>({ type: 'categories' })
  const [activeCatKey, setActiveCatKey] = useState<string>(educationalCategories[0]?.key ?? '')
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const handleBubbleClick = (category: Category, subcategory: Subcategory) => {
    if (subcategory.externalUrl) {
      window.open(subcategory.externalUrl, '_blank', 'noopener,noreferrer')
    } else {
      setView({ type: 'resources', categoryKey: category.key, subcategoryKey: subcategory.key })
      setHoveredCategory(null)
    }
  }

  const handleBack = () => {
    setView({ type: 'categories' })
  }

  // Resources view
  if (view.type === 'resources') {
    const category = educationalCategories.find(c => c.key === view.categoryKey)
    const subcategory = category?.subcategories.find(s => s.key === view.subcategoryKey)

    if (!category || !subcategory) return null

    return (
      <div className="pt-20">
        <div className="max-w-5xl mx-auto px-4 pb-24">
          {/* Back button + header */}
          <div className={cool ? 'relative overflow-hidden menu-glass glass-rim rounded-3xl p-6 md:p-8 mb-8' : 'mb-8'}>
            {cool && <span className="logo-reveal" aria-hidden="true" />}
            <div className={cool ? 'relative' : undefined}>
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-coral dark:text-coral-light hover:underline mb-4 text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <LocalizedText text="Πίσω στις κατηγορίες" engText="Back to categories" />
              </button>
              {cool && (
                <p className="text-xs font-bold tracking-[.14em] uppercase text-coral dark:text-coral-light mb-1">
                  <LocalizedText text={category.name} engText={category.engName} />
                </p>
              )}
              <h2 className="text-2xl font-bold text-charcoal dark:text-gray-100">
                <LocalizedText text={subcategory.fullName} engText={subcategory.engDescription} />
              </h2>
              {!cool && (
                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                  <LocalizedText text={category.name} engText={category.engName} />
                </p>
              )}
            </div>
          </div>

          {/* Resource cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {subcategory.resources.map((resource) => (
              <a
                key={resource.url}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cool
                  ? 'group menu-glass rounded-3xl shadow-sm hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02] p-6 flex flex-col border-l-4 border-transparent hover:border-coral dark:hover:border-coral-light'
                  : 'group bg-white dark:bg-gray-800 rounded-3xl shadow-sm hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02] p-6 flex flex-col border-l-4 border-transparent hover:border-coral dark:hover:border-coral-light'}
              >
                {/* Title + external link icon */}
                <div className="flex items-start gap-3 mb-3">
                  <h3 className="font-semibold text-charcoal dark:text-gray-100 flex-1 text-sm leading-snug">
                    <LocalizedText text={resource.title} engText={resource.engTitle} />
                  </h3>
                  <svg
                    className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5 group-hover:text-coral dark:group-hover:text-coral-light transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
                {/* Description */}
                <p className="text-gray-600 dark:text-gray-300 text-xs leading-relaxed flex-1">
                  <LocalizedText text={resource.description} engText={resource.engDescription} />
                </p>
              </a>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Categories view (default) — στο Cool: κουτί-επιλογέας με τη γλώσσα της
  // κάρτας-σκηνής (όπως στα Δίκτυα) και οι υποκατηγορίες της ενεργής
  // κατηγορίας από κάτω· το classic κρατά τις 3 κάρτες με hover
  if (cool) {
    const activeCategory = educationalCategories.find(c => c.key === activeCatKey) ?? educationalCategories[0]
    return (
      <div className="pt-20">
        <div className="max-w-5xl mx-auto px-4 pb-24">
          <div className="relative overflow-hidden rounded-3xl mb-8" style={{ backgroundColor: '#1B2438' }}>
            <div className="px-6 pt-6 pb-5 md:px-8">
              <p className="text-[11px] font-bold tracking-[.14em] uppercase text-coral">
                <LocalizedText text="Εκπαιδευτικό Υλικό" engText="Educational material" />
              </p>
              <h2 className="text-white text-2xl font-bold mt-1 flex items-center gap-2.5">
                <span aria-hidden="true">{activeCategory.icon}</span>
                <LocalizedText text={activeCategory.name} engText={activeCategory.engName} />
              </h2>
              <p className="text-white/60 text-sm mt-1 max-w-2xl">
                <LocalizedText text={activeCategory.description} engText={activeCategory.engDescription} />
              </p>
            </div>
            <div style={{ backgroundColor: 'rgba(10, 14, 24, .45)', backdropFilter: 'blur(16px) saturate(170%)', WebkitBackdropFilter: 'blur(16px) saturate(170%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.12)' }}>
              <div className="flex overflow-x-auto" style={{ scrollbarWidth: 'none' }} role="tablist" aria-label="Κατηγορίες υλικού">
                {educationalCategories.map(category => (
                  <button
                    key={category.key}
                    type="button"
                    role="tab"
                    aria-selected={activeCatKey === category.key}
                    onClick={() => setActiveCatKey(category.key)}
                    className={`inline-flex items-center gap-1.5 min-h-11 px-4 text-xs font-bold tracking-widest whitespace-nowrap border-b-2 transition-colors duration-200 ${
                      activeCatKey === category.key ? 'text-white border-coral' : 'text-white/70 border-transparent hover:text-white'
                    }`}
                  >
                    <span aria-hidden="true">{category.icon}</span>
                    <LocalizedText text={category.name} engText={category.engName} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Υποκατηγορίες της ενεργής κατηγορίας */}
          <div className="relative overflow-hidden menu-glass glass-rim rounded-3xl p-6 md:p-8">
            <span className="logo-reveal" aria-hidden="true" />
            <div className="relative">
              <p className="text-xs font-semibold text-charcoal dark:text-gray-300 mb-4 uppercase tracking-wide">
                <LocalizedText text="Υποκατηγορίες" engText="Subcategories" />{' '}
                <span className="notranslate">({activeCategory.subcategories.length})</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {activeCategory.subcategories.map((sub) => (
                  <SubcategoryBubble
                    key={sub.key}
                    subcategory={sub}
                    onClick={() => handleBubbleClick(activeCategory, sub)}
                    isExternal={!!sub.externalUrl}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-20">
      <div className="max-w-5xl mx-auto px-4 pb-24">
        {/* Category cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {educationalCategories.map((category) => {
            const isHovered = hoveredCategory === category.key
            const showSubcategories = isMobile || isHovered

            return (
              <div
                key={category.key}
                className="relative"
                onMouseEnter={() => setHoveredCategory(category.key)}
                onMouseLeave={() => setHoveredCategory(null)}
              >
                <div className={`${cool ? 'menu-glass' : 'bg-white dark:bg-gray-800'} rounded-3xl transition-all duration-200 p-6 flex flex-col border-l-4 border-transparent hover:border-coral dark:hover:border-coral-light ${
                  showSubcategories ? 'shadow-lg border-coral dark:border-coral-light' : 'shadow-sm hover:shadow-lg'
                }`}>
                  {/* Fixed-height top section so all cards start the same size */}
                  <div className="min-h-[200px] flex flex-col">
                    {/* Icon */}
                    <div className="text-4xl mb-4" aria-hidden="true">{category.icon}</div>
                    {/* Category name */}
                    <h3 className="text-lg font-bold text-charcoal dark:text-gray-100 mb-2">
                      <LocalizedText text={category.name} engText={category.engName} />
                    </h3>
                    {/* Description */}
                    <p className="text-gray-600 dark:text-gray-300 text-sm flex-1">
                      <LocalizedText text={category.description} engText={category.engDescription} />
                    </p>
                    {/* Subcategory count badge — hidden on mobile since subcategories are always shown */}
                    {!isMobile && (
                      <div className="mt-4">
                        <span className={cool
                          ? 'inline-block bg-white/50 dark:bg-white/10 border border-charcoal/15 dark:border-white/15 px-3 py-1 rounded-full text-xs font-medium text-charcoal dark:text-gray-200'
                          : 'inline-block bg-gray-100 dark:bg-gray-600 px-3 py-1 rounded-full text-xs font-medium text-charcoal dark:text-gray-200 shadow-sm'}>
                          {category.subcategories.length}{' '}
                          <LocalizedText text="υποκατηγορίες" engText="subcategories" />
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Subcategory bubbles — always shown on mobile, on hover for desktop */}
                  {showSubcategories && (
                    <div className="mt-4 pt-4 border-t border-black/20 dark:border-white/20">
                      <p className="text-xs font-semibold text-charcoal dark:text-gray-300 mb-3 uppercase tracking-wide">
                        <LocalizedText text="Υποκατηγορίες" engText="Subcategories" />
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {category.subcategories.map((sub) => (
                          <SubcategoryBubble
                            key={sub.key}
                            subcategory={sub}
                            onClick={() => handleBubbleClick(category, sub)}
                            isExternal={!!sub.externalUrl}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Individual subcategory bubble with tooltip
// ─────────────────────────────────────────────
function SubcategoryBubble({
  subcategory,
  onClick,
  isExternal,
}: {
  subcategory: Subcategory
  onClick: () => void
  isExternal: boolean
}) {
  const [showTooltip, setShowTooltip] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)

  // Adjust tooltip position to stay within viewport
  useEffect(() => {
    if (showTooltip && tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect()
      if (rect.left < 8) {
        tooltipRef.current.style.left = '0'
        tooltipRef.current.style.transform = 'none'
      } else if (rect.right > window.innerWidth - 8) {
        tooltipRef.current.style.left = 'auto'
        tooltipRef.current.style.right = '0'
        tooltipRef.current.style.transform = 'none'
      }
    }
  }, [showTooltip])

  return (
    <div className="relative">
      <button
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        className="bg-charcoal dark:bg-white text-white dark:text-charcoal rounded-full px-3.5 py-2 text-sm font-medium hover:bg-charcoal/80 dark:hover:bg-gray-200 hover:shadow-md transition-all flex items-center gap-1.5"
        aria-describedby={`tooltip-${subcategory.key}`}
      >
        {subcategory.name}
        {isExternal && (
          <svg className="w-3 h-3 text-white/60 dark:text-charcoal/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div
          ref={tooltipRef}
          id={`tooltip-${subcategory.key}`}
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 pointer-events-none"
        >
          <div className="bg-white dark:bg-gray-900 text-charcoal dark:text-gray-200 text-xs rounded-lg px-3 py-2 shadow-lg border border-black dark:border-white max-w-[220px] whitespace-normal">
            <LocalizedText text={subcategory.description} engText={subcategory.engDescription} />
            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black dark:border-t-white"></div>
          </div>
        </div>
      )}
    </div>
  )
}
