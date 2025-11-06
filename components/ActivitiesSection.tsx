'use client'

import { useState } from 'react'

const activities = [
  {
    date: '30/9/2025',
    title: 'ΣΥΝΕΡΓΑΤΙΚΟΙ ΠΟΛΙΤΙΣΤΙΚΟΙ ΠΕΙΡΑΜΑΤΙΣΜΟΙ: ΤΑ ΕΡΓΑΣΤΗΡΙΑ FUTURES LITERACY',
    organization: 'CULTURE FOR CHANGE',
    image: null,
    type: 'workshop'
  },
  {
    date: '22/9/2025',
    title: 'ΤΟ CULTURE FOR CHANGE ΣΤΟ CREATIVE SKILLS WEEK 2025: CREATE. TRANSFORM. REGENERATE.',
    organization: 'CULTURE FOR CHANGE',
    image: null,
    type: 'event'
  },
  {
    date: '16/10/2025',
    title: 'ΝΕΟ ΠΡΟΓΡΑΜΜΑ ΤΟΥ ΔΙΚΤΥΟΥ CULTURE FOR CHANGE ΜΕ ΧΡΗΜΑΤΟΔΟΤΗΣΗ PLATO',
    organization: 'CULTURE FOR CHANGE',
    image: null,
    type: 'program',
    featured: true
  },
]

export default function ActivitiesSection() {
  const [currentSlide, setCurrentSlide] = useState(0)

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % activities.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + activities.length) % activities.length)
  }

  return (
    <section id="activities" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-end mb-12">
          <div>
            <p className="text-coral text-sm font-medium mb-2">ΠΡΟΣΦΑΤΕΣ ΔΡΑΣΤΗΡΙΟΤΗΤΕΣ</p>
            <h2 className="text-4xl md:text-5xl font-bold">
              ΔΡΑΣΤΗΡΙΟΤΗΤΕΣ ΤΟΥ CULTURE<br />
              FOR CHANGE
            </h2>
          </div>
          <button className="hidden md:block bg-coral text-white px-6 py-3 rounded-full font-medium hover:bg-coral-dark transition-colors">
            ΟΛΕΣ ΟΙ ΔΡΑΣΤΗΡΙΟΤΗΤΕΣ
          </button>
        </div>

        {/* Carousel */}
        <div className="relative">
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {activities.map((activity, index) => (
                <div key={index} className="w-full flex-shrink-0 px-2">
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Show 3 cards, cycling through */}
                    {[0, 1, 2].map((offset) => {
                      const cardIndex = (index + offset) % activities.length
                      const card = activities[cardIndex]
                      return (
                        <div
                          key={cardIndex}
                          className={`bg-white border-2 rounded-lg overflow-hidden hover:shadow-lg transition-shadow ${
                            card.featured ? 'border-blue-500' : 'border-gray-200'
                          }`}
                        >
                          <div className="p-6">
                            <div className="mb-4">
                              <span className="inline-block bg-gray-100 px-4 py-1 rounded-full text-sm font-medium">
                                {card.date}
                              </span>
                            </div>

                            {card.featured && (
                              <div className="mb-4 aspect-video bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-2xl">
                                PLATO
                              </div>
                            )}

                            <h3 className="text-lg font-bold mb-4 line-clamp-3">
                              {card.title}
                            </h3>

                            <div className="flex items-center text-sm text-gray-600">
                              <div className="w-8 h-8 mr-2">
                                <svg viewBox="0 0 100 100" className="w-full h-full">
                                  <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="2"/>
                                </svg>
                              </div>
                              <span>{card.organization}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-center items-center gap-4 mt-8">
            <button
              onClick={prevSlide}
              className="w-12 h-12 rounded-full border-2 border-charcoal flex items-center justify-center hover:bg-charcoal hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex gap-2">
              {activities.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentSlide ? 'bg-coral' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={nextSlide}
              className="w-12 h-12 rounded-full border-2 border-charcoal flex items-center justify-center hover:bg-charcoal hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <button className="md:hidden w-full mt-8 bg-coral text-white px-6 py-3 rounded-full font-medium">
          ΟΛΕΣ ΟΙ ΔΡΑΣΤΗΡΙΟΤΗΤΕΣ
        </button>
      </div>
    </section>
  )
}
