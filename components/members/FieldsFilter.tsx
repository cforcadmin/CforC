'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { TAXONOMY, isSplittable, getSubLabel } from '@/lib/memberTaxonomy'
import type { SplittableSubcategory } from '@/lib/memberTaxonomy'

interface FieldsFilterProps {
  selectedFields: string[]
  onSelectionChange: (fields: string[]) => void
}

export default function FieldsFilter({ selectedFields, onSelectionChange }: FieldsFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hoveredCategory, setHoveredCategory] = useState<number | null>(null)
  const [expandedSplittable, setExpandedSplittable] = useState<SplittableSubcategory | null>(null)
  const [checkedOptions, setCheckedOptions] = useState<string[]>([])
  const panelRef = useRef<HTMLDivElement>(null)
  const subcategoryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const toggleSelection = (value: string) => {
    if (selectedFields.includes(value)) {
      onSelectionChange(selectedFields.filter(f => f !== value))
    } else {
      onSelectionChange([...selectedFields, value])
    }
  }

  const clearAll = () => {
    onSelectionChange([])
  }

  const closePanel = useCallback(() => {
    setIsOpen(false)
    setHoveredCategory(null)
    setExpandedSplittable(null)
    setCheckedOptions([])
  }, [])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (expandedSplittable) {
          setExpandedSplittable(null)
          setCheckedOptions([])
        } else if (hoveredCategory !== null) {
          setHoveredCategory(null)
        } else if (isOpen) {
          closePanel()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, hoveredCategory, expandedSplittable, closePanel])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closePanel()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, closePanel])

  // Clean up timeout
  useEffect(() => {
    return () => {
      if (subcategoryTimeoutRef.current) clearTimeout(subcategoryTimeoutRef.current)
    }
  }, [])

  const handleCategoryMouseEnter = (index: number) => {
    if (subcategoryTimeoutRef.current) {
      clearTimeout(subcategoryTimeoutRef.current)
      subcategoryTimeoutRef.current = null
    }
    setHoveredCategory(index)
    setExpandedSplittable(null)
    setCheckedOptions([])
  }

  const handleCategoryMouseLeave = () => {
    subcategoryTimeoutRef.current = setTimeout(() => {
      setHoveredCategory(null)
    }, 200)
  }

  const handleSubcategoryMouseEnter = () => {
    if (subcategoryTimeoutRef.current) {
      clearTimeout(subcategoryTimeoutRef.current)
      subcategoryTimeoutRef.current = null
    }
  }

  const handleSubcategoryMouseLeave = () => {
    if (expandedSplittable) return
    subcategoryTimeoutRef.current = setTimeout(() => {
      setHoveredCategory(null)
    }, 200)
  }

  // Check if a splittable sub has any of its options already selected
  const getSplittableMatch = (sub: SplittableSubcategory): string | null => {
    for (const item of selectedFields) {
      const parts = item.split(' / ').map(s => s.trim())
      if (parts.some(part => sub.options.includes(part))) {
        return item
      }
    }
    return null
  }

  // Confirm splittable checkbox selection
  const handleSplittableConfirm = () => {
    if (checkedOptions.length === 0) return
    const joined = checkedOptions.join(' / ')
    if (!selectedFields.includes(joined)) {
      onSelectionChange([...selectedFields, joined])
    }
    setExpandedSplittable(null)
    setCheckedOptions([])
  }

  // Build trigger label
  const getTriggerLabel = () => {
    if (selectedFields.length === 0) return 'Όλα τα πεδία εργασίας'
    if (selectedFields.length === 1) return selectedFields[0]
    if (selectedFields.length === 2) return selectedFields.join(', ')
    return `${selectedFields.length} πεδία επιλεγμένα`
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-3 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-coral text-left flex items-center gap-2 w-44 md:w-56 transition-colors ${
          selectedFields.length > 0
            ? 'border-charcoal dark:border-gray-100 bg-charcoal dark:bg-gray-100 text-white dark:text-gray-900 font-medium'
            : 'border-charcoal dark:border-gray-400 dark:bg-gray-700 text-charcoal dark:text-gray-200'
        }`}
      >
        <span className="flex-1 truncate">{getTriggerLabel()}</span>
        {selectedFields.length > 0 && (
          <span
            onClick={(e) => {
              e.stopPropagation()
              clearAll()
            }}
            className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 dark:bg-gray-900/20 hover:bg-white hover:text-charcoal dark:hover:bg-gray-900 dark:hover:text-gray-100 text-white/80 dark:text-gray-900/80 transition-colors flex-shrink-0 cursor-pointer"
            aria-label="Καθαρισμός φίλτρων πεδίων"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
        )}
        {selectedFields.length === 0 && (
          <svg className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {/* Popover panel */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 flex">
          {/* Categories panel */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl py-2 w-72 max-h-96 overflow-y-auto">
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Κατηγορίες</p>
              {selectedFields.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs text-coral dark:text-coral-light hover:underline"
                >
                  Καθαρισμός
                </button>
              )}
            </div>
            {TAXONOMY.map((category, catIndex) => {
              const isCategorySelected = selectedFields.includes(category.label)
              const hasSelectedSub = category.subcategories.some(sub => {
                const label = getSubLabel(sub)
                if (selectedFields.includes(label)) return true
                if (isSplittable(sub)) {
                  return getSplittableMatch(sub) !== null
                }
                return false
              })

              return (
                <button
                  key={catIndex}
                  onMouseEnter={() => handleCategoryMouseEnter(catIndex)}
                  onMouseLeave={handleCategoryMouseLeave}
                  onClick={() => toggleSelection(category.label)}
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors cursor-pointer ${
                    isCategorySelected
                      ? 'bg-charcoal dark:bg-coral text-white'
                      : hoveredCategory === catIndex
                        ? 'bg-charcoal/10 dark:bg-gray-600 text-charcoal dark:text-white font-medium'
                        : 'text-charcoal dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <span>{category.label}</span>
                  <div className="flex items-center gap-1">
                    {hasSelectedSub && !isCategorySelected && (
                      <div className="w-2 h-2 rounded-full bg-coral dark:bg-coral-light" />
                    )}
                    <svg className={`w-4 h-4 ${isCategorySelected ? 'text-white/60' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Subcategories panel */}
          {hoveredCategory !== null && (
            <div
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl py-2 w-80 max-h-96 overflow-y-auto ml-1"
              onMouseEnter={handleSubcategoryMouseEnter}
              onMouseLeave={handleSubcategoryMouseLeave}
            >
              <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                <p className="text-xs font-semibold text-charcoal dark:text-gray-100 uppercase tracking-wider">
                  {TAXONOMY[hoveredCategory].label}
                </p>
              </div>
              {TAXONOMY[hoveredCategory].subcategories.map((sub, subIndex) => {
                const subLabel = getSubLabel(sub)
                const isSubSelected = selectedFields.includes(subLabel)
                const splittable = isSplittable(sub)
                const splittableMatch = splittable ? getSplittableMatch(sub) : null
                const isAlreadyUsed = !!splittableMatch
                const isExpanded = expandedSplittable?.label === subLabel

                if (splittable) {
                  return (
                    <div key={subIndex}>
                      <button
                        onClick={() => {
                          if (isAlreadyUsed) {
                            // Toggle off the existing match
                            onSelectionChange(selectedFields.filter(f => f !== splittableMatch))
                          } else if (isExpanded) {
                            setExpandedSplittable(null)
                            setCheckedOptions([])
                          } else {
                            setExpandedSplittable(sub)
                            setCheckedOptions([])
                          }
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors cursor-pointer ${
                          isAlreadyUsed
                            ? 'bg-charcoal dark:bg-coral text-white'
                            : isExpanded
                              ? 'bg-charcoal/10 dark:bg-gray-600 text-charcoal dark:text-white font-medium'
                              : 'text-charcoal dark:text-gray-200 hover:bg-charcoal/10 dark:hover:bg-gray-600 hover:text-charcoal dark:hover:text-white'
                        }`}
                      >
                        <span>{isAlreadyUsed ? splittableMatch : subLabel}</span>
                        <div className="flex items-center gap-1">
                          {!isAlreadyUsed && (
                            <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                        </div>
                      </button>

                      {/* Expanded checkboxes */}
                      {isExpanded && (
                        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-y border-gray-100 dark:border-gray-700">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 italic">Επέλεξε ένα ή περισσότερα:</p>
                          <div className="space-y-1.5">
                            {sub.options.map((option, optIndex) => (
                              <label
                                key={optIndex}
                                className="flex items-center gap-2 cursor-pointer hover:text-charcoal dark:hover:text-white transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={checkedOptions.includes(option)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setCheckedOptions(prev => [...prev, option])
                                    } else {
                                      setCheckedOptions(prev => prev.filter(o => o !== option))
                                    }
                                  }}
                                  className="w-4 h-4 text-coral bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-coral focus:ring-2"
                                />
                                <span className="text-sm text-charcoal dark:text-gray-200">{option}</span>
                              </label>
                            ))}
                          </div>
                          <button
                            onClick={handleSplittableConfirm}
                            disabled={checkedOptions.length === 0}
                            className="mt-3 w-full px-3 py-1.5 bg-coral hover:bg-coral/90 dark:bg-coral-light dark:hover:bg-coral-light/90 text-white rounded-full text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {checkedOptions.length === 0
                              ? 'Επέλεξε τουλάχιστον ένα'
                              : `Επιλογή: ${checkedOptions.join(' / ')}`
                            }
                          </button>
                        </div>
                      )}
                    </div>
                  )
                }

                // Non-splittable subcategory
                return (
                  <button
                    key={subIndex}
                    onClick={() => toggleSelection(subLabel)}
                    className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors cursor-pointer ${
                      isSubSelected
                        ? 'bg-charcoal dark:bg-coral text-white'
                        : 'text-charcoal dark:text-gray-200 hover:bg-charcoal/10 dark:hover:bg-gray-600 hover:text-charcoal dark:hover:text-white'
                    }`}
                  >
                    <span>{subLabel}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
