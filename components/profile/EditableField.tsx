'use client'

import { useEffect, useState } from 'react'

interface EditableFieldProps {
  label: string
  value: string
  placeholder?: string
  type?: 'text' | 'email' | 'tel' | 'url' | 'textarea'
  onChange: (value: string) => void
  maxLength?: number
  maxWords?: number
  maxCharacters?: number
  maxItems?: number  // For comma-separated fields
  required?: boolean
  disabled?: boolean
  helperText?: string
  showCounters?: boolean
  tooltip?: string
}

export default function EditableField({
  label,
  value,
  placeholder,
  type = 'text',
  onChange,
  maxLength,
  maxWords,
  maxCharacters,
  maxItems,
  required = false,
  disabled = false,
  helperText,
  showCounters = false,
  tooltip
}: EditableFieldProps) {
  // Count words in text
  const countWords = (text: string): number => {
    if (!text || text.trim() === '') return 0
    return text.trim().split(/\s+/).filter(word => word.length > 0).length
  }

  // Count comma-separated items
  const countItems = (text: string): number => {
    if (!text || text.trim() === '') return 0
    return text.split(',').filter(item => item.trim().length > 0).length
  }

  const wordCount = countWords(value)
  const charCount = value.length
  const itemCount = countItems(value)

  const isOverWordLimit = maxWords && wordCount > maxWords
  const isOverCharLimit = maxCharacters && charCount > maxCharacters
  const isOverItemLimit = maxItems && itemCount > maxItems

  // Track focus for showing counters and helper text
  const [isFocused, setIsFocused] = useState(false)

  if (disabled) {
    return (
      <div className="space-y-2">
        {/* Label */}
        {label && (
          <label className="block text-sm font-medium text-charcoal dark:text-gray-200">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div
          className="group relative flex items-start gap-2 px-4 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
          aria-disabled="true"
        >
          <div className="flex-1 opacity-60">
            {value ? (
              <p className="text-charcoal dark:text-gray-200 whitespace-pre-wrap break-words">
                {value}
              </p>
            ) : (
              <p className="text-gray-400 dark:text-gray-500 italic">
                {placeholder || `Πρόσθεσε ${label.toLowerCase()}`}
              </p>
            )}
          </div>

          {/* Lock Icon */}
          <svg
            className="w-5 h-5 text-gray-400 flex-shrink-0 opacity-60"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>

          {/* Hover tooltip */}
          {tooltip && (
            <div className="absolute bottom-full left-4 mb-2 hidden group-hover:block z-10">
              <div className="bg-white dark:bg-gray-900 text-charcoal dark:text-gray-200 text-xs rounded-lg px-3 py-2 shadow-lg border border-black dark:border-white max-w-xs">
                {tooltip}
                <div className="absolute top-full left-6 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black dark:border-t-white"></div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-charcoal dark:text-gray-200">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Helper Text */}
      {helperText && (isFocused || isOverWordLimit || isOverCharLimit || isOverItemLimit) && (
        <p className="text-xs text-gray-400 dark:text-gray-500 italic">
          {helperText}
        </p>
      )}

      {/* Input Field */}
      <div className="group relative">
        {type === 'textarea' ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            maxLength={maxLength}
            rows={4}
            className="w-full notranslate px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-2xl text-charcoal dark:text-gray-200 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-coral dark:focus:ring-coral-light focus:border-transparent resize-none bg-white"
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            maxLength={maxLength}
            className="w-full notranslate px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-full text-charcoal dark:text-gray-200 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-coral dark:focus:ring-coral-light focus:border-transparent bg-white"
          />
        )}

        {/* Hover tooltip */}
        {tooltip && (
          <div className="absolute bottom-full left-4 mb-2 hidden group-hover:block z-10">
            <div className="bg-white dark:bg-gray-900 text-charcoal dark:text-gray-200 text-xs rounded-lg px-3 py-2 shadow-lg border border-black dark:border-white max-w-xs">
              {tooltip}
              <div className="absolute top-full left-6 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black dark:border-t-white"></div>
            </div>
          </div>
        )}
      </div>

      {/* Counters - show when focused or over limit */}
      {(isFocused || isOverWordLimit || isOverCharLimit || isOverItemLimit) && (
        <div className="flex justify-between text-xs">
          {/* Item counter for comma-separated fields */}
          {maxItems && (
            <div className={`${isOverItemLimit ? 'text-red-500 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
              {itemCount} / {maxItems} στοιχεία
              {isOverItemLimit && ' (υπέρβαση!)'}
            </div>
          )}

          <div className="flex gap-4 ml-auto">
            {/* Word counter */}
            {maxWords && (
              <div className={`${isOverWordLimit ? 'text-red-500 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                {wordCount} / {maxWords} λέξεις
                {isOverWordLimit && ' (υπέρβαση!)'}
              </div>
            )}

            {/* Character counter */}
            {(maxCharacters || maxLength) && (
              <div className={`${isOverCharLimit ? 'text-red-500 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                {charCount} / {maxCharacters || maxLength} χαρακτήρες
                {isOverCharLimit && ' (υπέρβαση!)'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
