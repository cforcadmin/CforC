'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAccessibility } from './AccessibilityProvider'

export default function ReadingAids() {
  const { settings } = useAccessibility()
  const [mouseY, setMouseY] = useState<number | null>(null)
  const [mouseX, setMouseX] = useState<number | null>(null)
  const [isInViewport, setIsInViewport] = useState(true)

  const handleMouseMove = useCallback((e: MouseEvent) => {
    setMouseY(e.clientY)
    setMouseX(e.clientX)
    setIsInViewport(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsInViewport(false)
  }, [])

  const handleMouseEnter = useCallback((e: MouseEvent) => {
    setMouseY(e.clientY)
    setMouseX(e.clientX)
    setIsInViewport(true)
  }, [])

  useEffect(() => {
    if (settings.largeCursor === 2 || settings.largeCursor === 3) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseleave', handleMouseLeave)
      document.addEventListener('mouseenter', handleMouseEnter)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseleave', handleMouseLeave)
        document.removeEventListener('mouseenter', handleMouseEnter)
      }
    }
  }, [settings.largeCursor, handleMouseMove, handleMouseLeave, handleMouseEnter])

  // Reading Mask (Mode 2)
  if (settings.largeCursor === 2 && mouseY !== null) {
    const lineSpacing = 70 // Distance from cursor to each line
    const lineThickness = 8 // Twice as thick

    return (
      <div className="fixed inset-0 pointer-events-none z-[9999]">
        {/* Dark overlay above top line */}
        <div
          className="absolute left-0 right-0 top-0 bg-black/50 transition-none"
          style={{ height: Math.max(0, mouseY - lineSpacing) }}
        />
        {/* Dark overlay below bottom line */}
        <div
          className="absolute left-0 right-0 bottom-0 bg-black/50 transition-none"
          style={{ top: mouseY + lineSpacing + lineThickness }}
        />
        {/* Top line - bright blue */}
        <div
          className="absolute left-0 right-0 transition-none"
          style={{
            top: mouseY - lineSpacing,
            height: lineThickness,
            backgroundColor: '#4a9fe8' // Bright blue
          }}
        />
        {/* Bottom line - bright green */}
        <div
          className="absolute left-0 right-0 transition-none"
          style={{
            top: mouseY + lineSpacing,
            height: lineThickness,
            backgroundColor: '#5ac85a' // Bright green
          }}
        />
        {/* Regular pointer cursor */}
        {isInViewport && mouseX !== null && (
          <svg
            className="absolute"
            style={{
              left: mouseX,
              top: mouseY,
              width: 20,
              height: 24
            }}
            viewBox="0 0 20 24"
          >
            <path
              d="M2 1 L2 19 L6 15 L9 22 L12 21 L9 14 L14 14 Z"
              fill="white"
              stroke="black"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
    )
  }

  // Reading Guide (Mode 3)
  if (settings.largeCursor === 3 && mouseY !== null && mouseX !== null) {
    // Don't show if cursor is outside viewport vertically
    if (!isInViewport) {
      return null
    }

    const guideWidth = 500 // Wider guide
    const triangleSize = 24
    const lineThickness = 4
    const outlineWidth = 3
    const guideHeight = triangleSize + lineThickness + outlineWidth * 2
    const cursorOffset = 8 // Much closer to the line
    const lineY = mouseY - cursorOffset - guideHeight // Position above cursor

    // Calculate horizontal position with edge behavior
    let guideLeft = mouseX - guideWidth / 2
    let triangleOffset = guideWidth / 2 // Default: triangle in center

    // Left edge behavior
    if (guideLeft < 0) {
      triangleOffset = mouseX // Triangle moves to match mouse X
      guideLeft = 0
    }

    // Right edge behavior
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920
    if (guideLeft + guideWidth > viewportWidth) {
      guideLeft = viewportWidth - guideWidth
      triangleOffset = mouseX - guideLeft // Triangle moves relative to guide position
    }

    // Don't render if mouse is too high (would put guide off screen)
    if (lineY < 0) {
      return null
    }

    return (
      <div className="fixed inset-0 pointer-events-none z-[9999]">
        {/* Guide container with yellow outline */}
        <div
          className="absolute transition-none"
          style={{
            left: guideLeft,
            top: lineY,
            width: guideWidth,
            filter: 'drop-shadow(0 0 0 #ffd700)'
          }}
        >
          {/* Triangle pointer - on TOP */}
          <div
            className="absolute -translate-x-1/2"
            style={{ left: triangleOffset, top: 0 }}
          >
            <svg
              width={triangleSize}
              height={triangleSize}
              viewBox="0 0 24 24"
            >
              {/* Yellow outline */}
              <path
                d="M12 2 L22 22 L2 22 Z"
                fill="none"
                stroke="#ffd700"
                strokeWidth={outlineWidth * 2}
                strokeLinejoin="round"
              />
              {/* Black fill */}
              <path
                d="M12 2 L22 22 L2 22 Z"
                fill="black"
              />
            </svg>
          </div>

          {/* Horizontal line - below triangle */}
          <div
            className="absolute left-0 right-0"
            style={{
              top: triangleSize - 2,
              height: lineThickness,
              backgroundColor: 'black',
              boxShadow: `0 0 0 ${outlineWidth}px #ffd700`
            }}
          />
        </div>

        {/* Regular pointer cursor touching the line */}
        <svg
          className="absolute"
          style={{
            left: mouseX,
            top: lineY + triangleSize + lineThickness + outlineWidth - 1,
            width: 20,
            height: 24
          }}
          viewBox="0 0 20 24"
        >
          <path
            d="M2 1 L2 19 L6 15 L9 22 L12 21 L9 14 L14 14 Z"
            fill="white"
            stroke="black"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    )
  }

  return null
}
