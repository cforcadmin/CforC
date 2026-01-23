"use client";

import { useState, useEffect, useRef } from "react";
import { AccessibilityButton } from "./AccessibilityMenu";

const rotatingTexts = ["CHANGE", "INNOVATION", "PROGRESS", "CREATION"];

export default function HeroSection() {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [accessibilityButtonScale, setAccessibilityButtonScale] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTextIndex((prev) => (prev + 1) % rotatingTexts.length);
    }, 2000); // Change every 2 seconds

    return () => clearInterval(interval);
  }, []);

  // Handle scroll to shrink/fade accessibility button
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      // Start fading at 50px, completely gone by 150px (when navbar shrinks)
      const fadeStart = 50;
      const fadeEnd = 150;

      if (scrollPosition <= fadeStart) {
        setAccessibilityButtonScale(1);
      } else if (scrollPosition >= fadeEnd) {
        setAccessibilityButtonScale(0);
      } else {
        // Calculate scale between 1 and 0
        const progress = (scrollPosition - fadeStart) / (fadeEnd - fadeStart);
        setAccessibilityButtonScale(1 - progress);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handlePlay = () => {
    setIsPlaying(true);
    if (videoRef.current) {
      videoRef.current.play();
    }
  };

  return (
    <section className="relative -bottom-20">
      {/* Orange Card with Rotating Text - 25% viewport height */}
      <div className="bg-coral dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 h-[25vh] flex items-center rounded-b-3xl relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-none dark:text-coral">
            <div>CULTURE</div>
            <div className="flex items-center">
              <span>FOR&nbsp;</span>
              <span className="inline-block min-w-[300px] transition-opacity duration-300">
                {rotatingTexts[currentTextIndex]}
              </span>
            </div>
          </h1>
        </div>

        {/* Accessibility Menu Trigger Button */}
        <div
          className="absolute right-6 lg:right-12 top-1/2 -translate-y-1/2 transition-all duration-200"
          style={{
            transform: `translateY(-50%) scale(${accessibilityButtonScale})`,
            opacity: accessibilityButtonScale,
            pointerEvents: accessibilityButtonScale < 0.1 ? 'none' : 'auto'
          }}
        >
          <AccessibilityButton />
        </div>
      </div>

      {/* Video Section */}
      <div className="relative bottom-56 w-full h-[80vh] bg-gray-900 -mt-10 rounded-3xl overflow-hidden">
        {/* Video element */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover object-[center_14rem]"
          muted
          loop
          playsInline
        >
          <source src="/hero-video.mp4" type="video/mp4" />
          <source src="/hero-video.webm" type="video/webm" />
        </video>

        {/* Dark overlay with centered play button */}
        {!isPlaying && (
          <button
            className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer"
            onClick={handlePlay}
            aria-label="Αναπαραγωγή βίντεο"
          >
            <div className="w-20 h-20 bg-black/30 rounded-full flex items-center justify-center hover:bg-black/40 transition-colors">
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
    </section>
  );
}
