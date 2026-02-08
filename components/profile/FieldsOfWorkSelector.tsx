'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { TAXONOMY, isKnownTaxonomyValue, isSplittable, getSubLabel } from '@/lib/memberTaxonomy'
import type { SplittableSubcategory } from '@/lib/memberTaxonomy'

interface FieldsOfWorkSelectorProps {
  value: string
  onChange: (value: string) => void
}

export default function FieldsOfWorkSelector({ value, onChange }: FieldsOfWorkSelectorProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [hoveredCategory, setHoveredCategory] = useState<number | null>(null)
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null)
  const [isCustomMode, setIsCustomMode] = useState(false)
  const [customInput, setCustomInput] = useState('')
  // For splittable subcategory checkboxes
  const [expandedSplittable, setExpandedSplittable] = useState<SplittableSubcategory | null>(null)
  const [checkedOptions, setCheckedOptions] = useState<string[]>([])
  const pickerRef = useRef<HTMLDivElement>(null)
  const customInputRef = useRef<HTMLInputElement>(null)
  const subcategoryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Parse comma-separated value into array
  const selectedItems = value
    ? value.split(',').map(s => s.trim()).filter(s => s.length > 0 && s !== '-' && s !== 'Προς Συμπλήρωση')
    : []

  // Track editing mode: when clicking a filled bubble, we "edit" that slot
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  // Items visible to the picker: when editing, exclude the item being edited
  // so it's not grayed out / disabled in the picker
  const pickerItems = editingIndex !== null
    ? selectedItems.filter((_, i) => i !== editingIndex)
    : selectedItems

  // Check if user already has a custom item (not in taxonomy)
  const hasCustomItem = pickerItems.some(item => !isKnownTaxonomyValue(item))

  // Determine how many slots to show: at least 5, or more if user already has more
  const slotCount = Math.max(5, selectedItems.length)

  // Check if a splittable subcategory has any of its options already selected
  const getSplittableMatch = (sub: SplittableSubcategory): string | null => {
    for (const item of pickerItems) {
      const parts = item.split(' / ').map(s => s.trim())
      if (parts.some(part => sub.options.includes(part))) {
        return item
      }
    }
    return null
  }

  const addItem = (item: string) => {
    if (pickerItems.includes(item)) return
    let newItems: string[]
    if (editingIndex !== null) {
      // Replace the item at the editing index
      newItems = [...selectedItems]
      newItems[editingIndex] = item
    } else {
      newItems = [...selectedItems, item]
    }
    onChange(newItems.join(', '))
    closePicker()
  }

  const removeItem = (index: number) => {
    const newItems = selectedItems.filter((_, i) => i !== index)
    onChange(newItems.join(', '))
  }

  const closePicker = () => {
    setIsPickerOpen(false)
    setHoveredCategory(null)
    setActiveSlotIndex(null)
    setEditingIndex(null)
    setIsCustomMode(false)
    setCustomInput('')
    setExpandedSplittable(null)
    setCheckedOptions([])
  }

  const openPicker = (slotIndex: number, editing = false) => {
    setActiveSlotIndex(slotIndex)
    setEditingIndex(editing ? slotIndex : null)
    setIsPickerOpen(true)
    setHoveredCategory(null)
    setIsCustomMode(false)
    setCustomInput('')
    setExpandedSplittable(null)
    setCheckedOptions([])
  }

  const handleCustomSubmit = () => {
    const trimmed = customInput.trim()
    if (trimmed && !pickerItems.includes(trimmed)) {
      addItem(trimmed)
    }
  }

  // Confirm splittable selection: join checked options with " / "
  const handleSplittableConfirm = () => {
    if (checkedOptions.length === 0) return
    const joined = checkedOptions.join(' / ')
    addItem(joined)
  }

  // Focus custom input when entering custom mode
  useEffect(() => {
    if (isCustomMode && customInputRef.current) {
      customInputRef.current.focus()
    }
  }, [isCustomMode])

  // Handle escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (isCustomMode) {
        setIsCustomMode(false)
        setCustomInput('')
      } else if (expandedSplittable) {
        setExpandedSplittable(null)
        setCheckedOptions([])
      } else if (hoveredCategory !== null) {
        setHoveredCategory(null)
      } else if (isPickerOpen) {
        closePicker()
      }
    }
  }, [hoveredCategory, isPickerOpen, isCustomMode, expandedSplittable])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        closePicker()
      }
    }

    if (isPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isPickerOpen])

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (subcategoryTimeoutRef.current) {
        clearTimeout(subcategoryTimeoutRef.current)
      }
    }
  }, [])

  const handleCategoryMouseEnter = (index: number) => {
    if (isCustomMode) return
    if (subcategoryTimeoutRef.current) {
      clearTimeout(subcategoryTimeoutRef.current)
      subcategoryTimeoutRef.current = null
    }
    setHoveredCategory(index)
    // Reset splittable when changing category
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
    // Don't auto-hide if splittable is expanded (user is interacting with checkboxes)
    if (expandedSplittable) return
    subcategoryTimeoutRef.current = setTimeout(() => {
      setHoveredCategory(null)
    }, 200)
  }

  // Check if an item is custom (not in taxonomy)
  const isCustomItemFn = (item: string) => !isKnownTaxonomyValue(item)

  return (
    <div className="space-y-2">
      {/* Label */}
      <label className="block text-sm font-medium text-charcoal dark:text-gray-200">
        Πεδία πρακτικής (τομείς εργασίας)
        <span className="text-red-500 ml-1">*</span>
      </label>

      {/* Helper text */}
      <p className="text-xs text-gray-400 dark:text-gray-500 italic">
        Κάνε κλικ σε ένα κενό πεδίο για να επιλέξεις κατηγορία ή υποκατηγορία
      </p>

      {/* Bubbles grid */}
      <div className="relative" ref={pickerRef}>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: slotCount }).map((_, index) => {
            const item = selectedItems[index]
            if (item) {
              const custom = isCustomItemFn(item)
              const isBeingEdited = editingIndex === index && isPickerOpen
              // Filled bubble
              return (
                <div
                  key={index}
                  onClick={() => openPicker(index, true)}
                  className={`group/bubble relative inline-flex items-center gap-1 px-4 py-2 border rounded-full text-sm transition-colors cursor-pointer ${
                    isBeingEdited
                      ? 'ring-2 ring-coral dark:ring-coral-light ring-offset-1 dark:ring-offset-gray-900'
                      : ''
                  } ${
                    custom
                      ? 'bg-amber-50 dark:bg-amber-900/20 border-black dark:border-white text-charcoal dark:text-gray-200'
                      : 'bg-coral/10 dark:bg-coral/20 border-black dark:border-white text-charcoal dark:text-gray-200'
                  }`}
                >
                  {custom && (
                    <svg className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  )}
                  <span className="pr-5">{item}</span>
                  {/* X button overlay */}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeItem(index) }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-gray-300/70 dark:bg-gray-600/70 hover:bg-red-400 hover:text-white text-gray-600 dark:text-gray-300 transition-colors"
                    aria-label={`Αφαίρεση: ${item}`}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )
            }

            // Empty bubble (slot)
            return (
              <button
                key={index}
                onClick={() => openPicker(index)}
                className={`inline-flex items-center gap-1 px-4 py-2 border-2 border-dashed rounded-full text-sm transition-colors ${
                  activeSlotIndex === index && isPickerOpen
                    ? 'border-coral dark:border-coral-light text-coral dark:text-coral-light bg-coral/5'
                    : 'border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:border-coral dark:hover:border-coral-light hover:text-coral dark:hover:text-coral-light'
                }`}
                aria-label="Πρόσθεσε πεδίο πρακτικής"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Πρόσθεσε</span>
              </button>
            )
          })}
        </div>

        {/* Category/Subcategory picker */}
        {isPickerOpen && (
          <div className="absolute top-full left-0 mt-2 z-50 flex">
            {/* Categories panel */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl py-2 w-72 max-h-80 overflow-y-auto">
              {/* Custom entry option — at the top */}
              {!isCustomMode && (() => {
                const editingCustomValue = editingIndex !== null && !isKnownTaxonomyValue(selectedItems[editingIndex])
                  ? selectedItems[editingIndex]
                  : null
                const isDisabled = hasCustomItem && !editingCustomValue

                return (
                  <>
                    <button
                      onClick={() => {
                        if (!isDisabled) {
                          setIsCustomMode(true)
                          setCustomInput(editingCustomValue ?? '')
                          setHoveredCategory(null)
                          setExpandedSplittable(null)
                          setCheckedOptions([])
                        }
                      }}
                      disabled={isDisabled}
                      onMouseEnter={() => setHoveredCategory(null)}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                        isDisabled
                          ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                          : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 cursor-pointer'
                      }`}
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>{isDisabled ? 'Ήδη χρησιμοποιείται (1 μόνο)' : editingCustomValue ?? 'Προσθήκη δικού σου πεδίου'}</span>
                    </button>
                    <div className="border-b border-gray-100 dark:border-gray-700" />
                  </>
                )
              })()}

              {/* Custom input mode */}
              {isCustomMode && (
                <div className="p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setIsCustomMode(false); setCustomInput('') }}
                      className="text-gray-400 hover:text-charcoal dark:hover:text-gray-200 transition-colors"
                      aria-label="Πίσω στις κατηγορίες"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Προσαρμοσμένο πεδίο</p>
                  </div>

                  {/* Warning */}
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3">
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                        Αυτό το πεδίο <strong>δεν περιλαμβάνεται</strong> στις κατηγορίες αναζήτησης. Θα εμφανίζεται μόνο στο προφίλ σου και όχι στα αποτελέσματα αναζήτησης μελών.
                      </p>
                    </div>
                  </div>

                  {/* Input */}
                  <div className="flex gap-2">
                    <input
                      ref={customInputRef}
                      type="text"
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleCustomSubmit()
                        }
                        e.stopPropagation()
                      }}
                      placeholder="π.χ. Κεραμική"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-full text-sm text-charcoal dark:text-gray-200 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500 focus:border-transparent"
                    />
                    <button
                      onClick={handleCustomSubmit}
                      disabled={!customInput.trim()}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-full text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      OK
                    </button>
                  </div>
                </div>
              )}

              {/* Categories list — hidden when in custom mode */}
              {!isCustomMode && (
                <>
                  <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Κατηγορίες</p>
                  </div>
                  {TAXONOMY.map((category, catIndex) => {
                    const isCategorySelected = pickerItems.includes(category.label)
                    const hasSelectedSub = category.subcategories.some(sub => {
                      const label = getSubLabel(sub)
                      if (pickerItems.includes(label)) return true
                      // Also check partial matches for splittable subs
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
                        onClick={() => {
                          if (!isCategorySelected) {
                            addItem(category.label)
                          }
                        }}
                        disabled={isCategorySelected}
                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${
                          hoveredCategory === catIndex
                            ? 'bg-coral/10 dark:bg-coral/20 text-coral dark:text-coral-light'
                            : isCategorySelected
                              ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                              : 'text-charcoal dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                        } ${isCategorySelected ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <span className={isCategorySelected ? 'line-through' : ''}>
                          {category.label}
                        </span>
                        <div className="flex items-center gap-1">
                          {(isCategorySelected || hasSelectedSub) && (
                            <svg className="w-4 h-4 text-coral dark:text-coral-light" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </button>
                    )
                  })}
                </>
              )}
            </div>

            {/* Subcategories panel - shown on hover (not in custom mode) */}
            {!isCustomMode && hoveredCategory !== null && (
              <div
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl py-2 w-80 max-h-80 overflow-y-auto ml-1"
                onMouseEnter={handleSubcategoryMouseEnter}
                onMouseLeave={handleSubcategoryMouseLeave}
              >
                <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                  <p className="text-xs font-semibold text-coral dark:text-coral-light uppercase tracking-wider">
                    {TAXONOMY[hoveredCategory].label}
                  </p>
                </div>
                {TAXONOMY[hoveredCategory].subcategories.map((sub, subIndex) => {
                  const subLabel = getSubLabel(sub)
                  const isSubSelected = pickerItems.includes(subLabel)
                  const splittable = isSplittable(sub)
                  const splittableMatch = splittable ? getSplittableMatch(sub) : null
                  const isAlreadyUsed = isSubSelected || !!splittableMatch
                  const isExpanded = expandedSplittable?.label === subLabel

                  if (splittable) {
                    return (
                      <div key={subIndex}>
                        {/* Splittable subcategory header */}
                        <button
                          onClick={() => {
                            if (!isAlreadyUsed) {
                              if (isExpanded) {
                                setExpandedSplittable(null)
                                setCheckedOptions([])
                              } else {
                                setExpandedSplittable(sub)
                                setCheckedOptions([])
                              }
                            }
                          }}
                          disabled={isAlreadyUsed}
                          className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${
                            isAlreadyUsed
                              ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                              : isExpanded
                                ? 'bg-coral/10 dark:bg-coral/20 text-coral dark:text-coral-light'
                                : 'text-charcoal dark:text-gray-200 hover:bg-coral/10 dark:hover:bg-coral/20 hover:text-coral dark:hover:text-coral-light cursor-pointer'
                          }`}
                        >
                          <span className={isAlreadyUsed ? 'line-through' : ''}>{subLabel}</span>
                          <div className="flex items-center gap-1">
                            {isAlreadyUsed && (
                              <svg className="w-4 h-4 text-coral dark:text-coral-light" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
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
                                  className="flex items-center gap-2 cursor-pointer hover:text-coral dark:hover:text-coral-light transition-colors"
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
                            {/* Confirm button */}
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

                  // Non-splittable subcategory — plain click to select
                  return (
                    <button
                      key={subIndex}
                      onClick={() => {
                        if (!isSubSelected) {
                          addItem(subLabel)
                        }
                      }}
                      disabled={isSubSelected}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${
                        isSubSelected
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                          : 'text-charcoal dark:text-gray-200 hover:bg-coral/10 dark:hover:bg-coral/20 hover:text-coral dark:hover:text-coral-light cursor-pointer'
                      }`}
                    >
                      <span className={isSubSelected ? 'line-through' : ''}>{subLabel}</span>
                      {isSubSelected && (
                        <svg className="w-4 h-4 text-coral dark:text-coral-light" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tooltip */}
      <div className="group relative w-fit">
        <p className="text-xs text-gray-400 dark:text-gray-500 cursor-help underline decoration-dotted">
          Πώς λειτουργεί;
        </p>
        <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10">
          <div className="bg-charcoal dark:bg-gray-600 text-white text-xs rounded-lg px-3 py-2 shadow-lg max-w-xs">
            Κάνε κλικ σε ένα κενό πεδίο (+) για να δεις τις κατηγορίες. Πέρασε τον κέρσορα πάνω σε μια κατηγορία για να δεις τις υποκατηγορίες. Ορισμένες υποκατηγορίες έχουν επιπλέον επιλογές. Μπορείς να προσθέσεις και ένα δικό σου πεδίο (εμφανίζεται μόνο στο προφίλ). Πάτα Escape για κλείσιμο.
            <div className="absolute top-full left-6 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-charcoal dark:border-t-gray-600"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
