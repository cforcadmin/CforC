'use client'

import { useState } from 'react'
import Image from 'next/image'

export default function AboutVideoSection() {
  const [isPlaying, setIsPlaying] = useState(false)

  const handlePlay = () => {
    setIsPlaying(true)
  }

  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-coral rounded-3xl p-8 md:p-16 lg:p-24">
          <div className="relative w-full max-w-4xl mx-auto aspect-video">
            {!isPlaying ? (
              // Thumbnail with play button
              <div
                className="relative w-full h-full cursor-pointer group"
                onClick={handlePlay}
              >
                <Image
                  src="/about-us-video-thumbnail.png"
                  alt="Video thumbnail"
                  fill
                  className="object-cover rounded-lg"
                />
                {/* Play button overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 bg-white/90 rounded-full flex items-center justify-center group-hover:bg-white transition-colors">
                    <svg
                      className="w-10 h-10 text-charcoal ml-1"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>
            ) : (
              // Video player
              <video
                className="w-full h-full rounded-lg"
                controls
                autoPlay
                src="/about-us-video.mp4"
              >
                Your browser does not support the video tag.
              </video>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
