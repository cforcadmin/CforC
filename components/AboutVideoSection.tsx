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
              preload="metadata"
              src="/about-us-video.mp4#t=0.5"
            >
              Your browser does not support the video tag.
            </video>

            {/* Light overlay with play button - shows video thumbnail underneath */}
            {!isPlaying && (
              <button
                className="absolute inset-0 bg-black/15 hover:bg-black/25 flex items-center justify-center cursor-pointer group transition-colors duration-300"
                onClick={handlePlay}
                aria-label="Αναπαραγωγή βίντεο"
              >
                <div className="w-20 h-20 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:bg-white/40 transition-colors">
                  <svg
                    className="w-10 h-10 text-white ml-1 drop-shadow-lg"
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
