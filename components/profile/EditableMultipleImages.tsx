'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface EditableMultipleImagesProps {
  label: string
  existingImages?: Array<{ url: string; alternativeText?: string; id?: number }>
  keptImageIds?: number[]
  onImagesChange: (newFiles: File[], keptExistingIds: number[]) => void
}

export default function EditableMultipleImages({
  label,
  existingImages = [],
  keptImageIds = [],
  onImagesChange
}: EditableMultipleImagesProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])

  // Derive kept existing images from existingImages filtered by keptImageIds
  const keptExistingImages = (existingImages || []).filter(img =>
    img.id !== undefined && keptImageIds.includes(img.id)
  )

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Create preview URLs
    const newPreviewUrls = files.map(file => URL.createObjectURL(file))

    const newSelectedFiles = [...selectedFiles, ...files]
    const newPreviewUrls2 = [...previewUrls, ...newPreviewUrls]

    setSelectedFiles(newSelectedFiles)
    setPreviewUrls(newPreviewUrls2)

    // Notify parent with new files and kept existing image IDs
    onImagesChange(newSelectedFiles, keptImageIds)
  }

  const handleRemoveNewImage = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index)
    const newPreviews = previewUrls.filter((_, i) => i !== index)

    // Revoke the URL to free memory
    URL.revokeObjectURL(previewUrls[index])

    setSelectedFiles(newFiles)
    setPreviewUrls(newPreviews)

    // Notify parent
    onImagesChange(newFiles, keptImageIds)
  }

  const handleRemoveExistingImage = (index: number) => {
    // Get the image being removed
    const imageToRemove = keptExistingImages[index]
    if (!imageToRemove?.id) return

    // Remove this ID from the kept IDs
    const newKeptIds = keptImageIds.filter(id => id !== imageToRemove.id)

    // Notify parent
    onImagesChange(selectedFiles, newKeptIds)
  }

  return (
    <div className="space-y-3">
      {/* Label */}
      <label className="block text-sm font-medium text-charcoal dark:text-gray-200">
        {label}
      </label>

      {/* Images Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Existing Images (kept) */}
        {keptExistingImages.map((img, index) => (
          <div key={`existing-${index}`} className="relative aspect-square rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700">
            <Image
              src={img.url}
              alt={img.alternativeText || 'Project image'}
              fill
              className="object-cover"
            />
            {/* Remove Button */}
            <button
              onClick={() => handleRemoveExistingImage(index)}
              className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
              type="button"
              aria-label="Αφαίρεση εικόνας"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {/* New Images */}
        {previewUrls.map((url, index) => (
          <div key={`new-${index}`} className="relative aspect-square rounded-xl overflow-hidden border-2 border-coral dark:border-coral-light">
            <Image
              src={url}
              alt={`New image ${index + 1}`}
              fill
              className="object-cover"
            />
            {/* Remove Button */}
            <button
              onClick={() => handleRemoveNewImage(index)}
              className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
              type="button"
              aria-label="Αφαίρεση εικόνας"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {/* Add Images Button */}
        <label className="relative aspect-square rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-coral dark:hover:border-coral-light cursor-pointer flex items-center justify-center transition-colors group">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 group-hover:text-coral dark:group-hover:text-coral-light transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Προσθήκη εικόνων
            </p>
          </div>
        </label>
      </div>

      {/* Helper Text */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Μπορείτε να ανεβάσετε πολλαπλές εικόνες
      </p>
    </div>
  )
}
