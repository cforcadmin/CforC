'use client'

import { useState, useEffect } from 'react'

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
  showCounters = false
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempValue, setTempValue] = useState(value)

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

  const wordCount = countWords(tempValue)
  const charCount = tempValue.length
  const itemCount = countItems(tempValue)

  const isOverWordLimit = maxWords && wordCount > maxWords
  const isOverCharLimit = maxCharacters && charCount > maxCharacters
  const isOverItemLimit = maxItems && itemCount > maxItems

  // Sync tempValue with value prop changes
  useEffect(() => {
    setTempValue(value)
  }, [value])

  const handleSave = () => {
    onChange(tempValue)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setTempValue(value)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && type !== 'textarea') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  return (
    <div className="space-y-2">
      {/* Label */}
      <label className="block text-sm font-medium text-charcoal dark:text-gray-200">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Helper Text - Only show when editing */}
      {isEditing && helperText && (
        <p className="text-xs text-gray-400 dark:text-gray-500 italic">
          {helperText}
        </p>
      )}

      {isEditing && !disabled ? (
        <div className="space-y-2">
          {/* Input Field */}
          {type === 'textarea' ? (
            <textarea
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              maxLength={maxLength}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-2xl text-charcoal dark:text-gray-200 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-coral dark:focus:ring-coral-light focus:border-transparent resize-none"
              autoFocus
            />
          ) : (
            <input
              type={type}
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              maxLength={maxLength}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-full text-charcoal dark:text-gray-200 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-coral dark:focus:ring-coral-light focus:border-transparent"
              autoFocus
            />
          )}

          {/* Counters */}
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

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 bg-coral hover:bg-coral/90 dark:bg-coral-light dark:hover:bg-coral-light/90 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors"
            >
              Αποθήκευση
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Ακύρωση
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !disabled && setIsEditing(true)}
          onKeyDown={(e) => {
            if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault()
              setIsEditing(true)
            }
          }}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label={`${label} επεξεργασία${value ? `: ${value}` : ''}`}
          aria-disabled={disabled}
          className={`group flex items-start gap-2 px-4 py-3 rounded-2xl transition-colors ${
            disabled
              ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60'
              : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-coral dark:focus:ring-coral-light'
          }`}
        >
          {/* Display Value */}
          <div className="flex-1">
            {value ? (
              <p className="text-charcoal dark:text-gray-200 whitespace-pre-wrap break-words">
                {value}
              </p>
            ) : (
              <p className="text-gray-400 dark:text-gray-500 italic">
                {placeholder || `Προσθέστε ${label.toLowerCase()}`}
              </p>
            )}
          </div>

          {/* Edit Icon - only show if not disabled */}
          {!disabled && (
            <svg
              className="w-5 h-5 text-gray-400 group-hover:text-coral dark:group-hover:text-coral-light transition-colors flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          )}

          {/* Lock Icon - show when disabled */}
          {disabled && (
            <svg
              className="w-5 h-5 text-gray-400 flex-shrink-0"
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
          )}
        </div>
      )}
    </div>
  )
}
