"use client";

import { useState, useEffect } from "react";

const rotatingTexts = ["CHANGE", "INNOVATION", "PROGRESS", "CREATION"];

export default function HeroSection() {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTextIndex((prev) => (prev + 1) % rotatingTexts.length);
    }, 2000); // Change every 2 seconds

    return () => clearInterval(interval);
  }, []);

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
      </div>

      {/* Video Section */}
      <div className="relative bottom-56 w-full h-[80vh] bg-gray-900 -mt-10 rounded-3xl overflow-hidden">
        <video
          className="w-full h-full object-cover object-[center_14rem]"
          autoPlay
          muted
          loop
          playsInline
          poster="/video-poster.jpg"
        >
          <source src="/hero-video.mp4" type="video/mp4" />
          <source src="/hero-video.webm" type="video/webm" />
          {/* Fallback image if video doesn't load */}
          <div className="absolute inset-0 flex items-center justify-center bg-charcoal/80">
            <div className="text-white text-center p-8">
              <svg
                className="w-16 h-16 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm">Hero Video</p>
            </div>
          </div>
        </video>

        {/* Optional: Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none hidden">
          <button
            className="pointer-events-auto w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
            onClick={(e) => {
              const video = e.currentTarget.closest("div")?.querySelector("video");
              if (video) {
                if (video.paused) {
                  video.play();
                } else {
                  video.pause();
                }
              }
            }}
          >
            <svg
              className="w-10 h-10 text-white ml-1"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
