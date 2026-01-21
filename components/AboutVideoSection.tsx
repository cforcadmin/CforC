'use client'

import { useState, useRef } from 'react'

export default function AboutVideoSection() {
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handlePlay = () => {
    setIsPlaying(true)
    if (videoRef.current) {
      videoRef.current.play()
    }
  }

  return (
    <section className="py-12 bg-gray-50 dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-coral dark:bg-gradient-to-r dark:from-gray-700 dark:to-gray-800 rounded-3xl p-8 md:p-16 lg:p-24">
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden">
            {/* Video element - always present */}
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              controls={isPlaying}
              src="/about-us-video.mp4"
            >
              Your browser does not support the video tag.
            </video>

            {/* Dark overlay with play button - disappears when playing */}
            {!isPlaying && (
              <button
                className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer group"
                onClick={handlePlay}
                aria-label="Αναπαραγωγή βίντεο"
              >
                <div className="w-20 h-20 bg-black/30 rounded-full flex items-center justify-center group-hover:bg-black/40 transition-colors">
                  <svg
                    className="w-10 h-10 text-white ml-1"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
