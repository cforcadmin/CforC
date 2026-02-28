'use client'

import LocalizedText from '@/components/LocalizedText'

const DRIVE_FILE_ID = '1yXKvlnByizTdBTCkA-Wq2SvIbnF4yO7U'
const EMBED_URL = `https://drive.google.com/file/d/${DRIVE_FILE_ID}/preview`
const DOWNLOAD_URL = `https://drive.google.com/uc?export=download&id=${DRIVE_FILE_ID}`

export default function PocketGuideContent() {
  return (
    <div className="pt-20">
      <div className="max-w-5xl mx-auto px-4 pb-24">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            <LocalizedText
              text="Ο Οδηγός Τσέπης του Culture for Change — ένα πρακτικό εργαλείο για τα μέλη του δικτύου."
              engText="The Culture for Change Pocket Guide — a practical tool for network members."
            />
          </p>
        </div>

        {/* Download button */}
        <div className="flex justify-center mb-6">
          <a
            href={DOWNLOAD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-coral hover:bg-coral/90 dark:bg-coral-light dark:hover:bg-coral-light/90 text-white rounded-full font-medium transition-colors text-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <LocalizedText text="Λήψη PDF" engText="Download PDF" />
          </a>
        </div>

        {/* Embedded PDF viewer */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
          <iframe
            src={EMBED_URL}
            className="w-full"
            style={{ height: '80vh', minHeight: '600px' }}
            allow="autoplay"
            title="Οδηγός Τσέπης Culture for Change"
          />
        </div>
      </div>
    </div>
  )
}
