'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'

interface EditableImageProps {
  currentImageUrl?: string
  alt?: string
  onChange: (file: File) => void
}

export default function EditableImage({
  currentImageUrl,
  alt = 'Profile image',
  onChange
}: EditableImageProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateImage = (file: File): string | null => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return 'Το αρχείο πρέπει να είναι εικόνα'
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return 'Η εικόνα πρέπει να είναι μικρότερη από 5MB'
    }

    return null
  }

  const handleFileChange = (file: File | null) => {
    setError(null)

    if (!file) return

    const validationError = validateImage(file)
    if (validationError) {
      setError(validationError)
      return
    }

    // Create preview URL
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)

    // Call onChange with the file
    onChange(file)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    handleFileChange(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileChange(file)
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleRemovePreview = () => {
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const displayUrl = previewUrl || currentImageUrl

  return (
    <div className="space-y-3">
      {/* Image Display/Upload Area */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative group cursor-pointer rounded-3xl overflow-hidden transition-all ${
          isDragging
            ? 'ring-4 ring-coral dark:ring-coral-light'
            : 'hover:ring-4 hover:ring-gray-300 dark:hover:ring-gray-600'
        }`}
      >
        {displayUrl ? (
          <>
            {/* Image - aspect ratio matches members page preview (10:12 or 5:6) */}
            <div className="relative w-full aspect-[10/12]">
              <Image
                src={displayUrl}
                alt={alt}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 400px"
              />
              {/* Overlay on Hover */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="text-center text-white">
                  <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-sm font-medium">Αλλαγή Φωτογραφίας</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          // Placeholder - aspect ratio matches members page preview (10:12 or 5:6)
          <div className="w-full aspect-[10/12] bg-gray-100 dark:bg-gray-700 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 p-8">
            <svg className="w-16 h-16 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <p className="text-sm font-medium mb-1">Προσθήκη Φωτογραφίας</p>
            <p className="text-xs text-center">Κάντε κλικ ή σύρετε εικόνα εδώ</p>
            <p className="text-xs text-center mt-1">Ιδανικό: 500×600px | Μέγιστο: 5MB</p>
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Preview Actions */}
      {previewUrl && (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleRemovePreview()
            }}
            className="flex-1 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Ακύρωση Αλλαγής
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-2xl text-sm bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-gray-500 dark:text-gray-400 text-center space-y-1">
        <p>Ιδανικές διαστάσεις: <strong>500×600 pixels</strong> (αναλογία 5:6)</p>
        <p>Υποστηριζόμενες μορφές: JPG, PNG, GIF, WebP</p>
      </div>
    </div>
  )
}
