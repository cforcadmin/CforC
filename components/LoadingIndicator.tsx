'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

const LOADING_MESSAGES = [
  "Almost ready... Polishing the details",
  "Gathering insights from the network...",
  "From chaos comes order",
  "Καλά τὰ καλὰ, καὶ βραδέα",
  "Culture is not made but discovered",
  "Culture evolves, please wait...",
  "Innovation requires patience",
  "Loading... Consulting the oracle",
  "Just a moment... Calibrating the flux capacitor",
  "Loading... Counting backwards from infinity",
  "Please wait... We're waking up the hamsters",
  "Beam me up... almost there!",
  "Engaging warp drive...",
  "Slow progress is still progress",
  "The journey is part of the destination",
  "Loading... Teaching robots to dance"
]

export default function LoadingIndicator() {
  const [message, setMessage] = useState('')
  const [progress, setProgress] = useState(0)

  // Pick a random message on mount
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * LOADING_MESSAGES.length)
    setMessage(LOADING_MESSAGES[randomIndex])
  }, [])

  // Animate progress bar
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95 // Never reach 100% (completes when data loads)
        return prev + Math.random() * 3
      })
    }, 200)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-full bg-white rounded-2xl p-6 mb-8 shadow-sm">
      <div className="flex items-center gap-4">
        {/* Flashing Logo */}
        <div className="flex-shrink-0 animate-pulse">
          <Image
            src="/cforc_logo_small.svg"
            alt="Loading"
            width={32}
            height={32}
            className="opacity-80"
          />
        </div>

        {/* Progress Bar and Message Container */}
        <div className="flex-1">
          {/* Progress Bar */}
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-coral to-orange-400 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Loading Message */}
          <p className="text-sm text-gray-600 italic">
            {message}
          </p>
        </div>
      </div>
    </div>
  )
}
