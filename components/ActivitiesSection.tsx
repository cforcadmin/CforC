'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { getActivities } from '@/lib/strapi'
import type { StrapiResponse, StrapiData, Activity } from '@/lib/types'

export default function ActivitiesSection() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    async function fetchActivities() {
      try {
        setLoading(true)
        console.log('Fetching activities from Strapi...')
        console.log('Strapi URL:', process.env.NEXT_PUBLIC_STRAPI_URL)

        const response: StrapiResponse<Activity[]> = await getActivities()

        console.log('Strapi response:', response)
        console.log('Activities data:', response.data)
        console.log('Number of activities:', response.data?.length || 0)

        setActivities(response.data)
      } catch (err) {
        setError('Failed to load activities from Strapi')
        console.error('Error fetching activities:', err)
        console.error('Error details:', JSON.stringify(err, null, 2))
      } finally {
        setLoading(false)
      }
    }

    fetchActivities()
  }, [])

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % activities.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + activities.length) % activities.length)
  }

  if (loading) {
    return (
      <section id="activities" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-12 bg-gray-200 rounded w-1/2 mb-12"></div>
            <div className="grid md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-96 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (error || activities.length === 0) {
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
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 text-center">
            <p className="text-orange-600 font-medium">
              {error || 'No activities available yet'}
            </p>
          </div>
        </div>
      </section>
    )
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

                      // Safety check: ensure card exists
                      if (!card) {
                        return null
                      }

                      return (
                        <div
                          key={cardIndex}
                          className="bg-orange-50 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                        >
                          {/* Image with overlapping date */}
                          <div className="relative -mb-2">
                            {card.Visuals?.data && card.Visuals.data.length > 0 ? (
                              <div className="aspect-video rounded-lg overflow-hidden mx-4 mt-4">
                                <Image
                                  src={`${process.env.NEXT_PUBLIC_STRAPI_URL}${card.Visuals.data[0].attributes.url}`}
                                  alt={card.Visuals.data[0].attributes.alternativeText || card.Title}
                                  width={card.Visuals.data[0].attributes.width}
                                  height={card.Visuals.data[0].attributes.height}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="aspect-video bg-gray-200 rounded-lg mx-4 mt-4 flex items-center justify-center">
                                <span className="text-gray-400">No image</span>
                              </div>
                            )}

                            {/* Overlapping date badge */}
                            <div className="absolute bottom-0 left-8 z-10">
                              <span className="inline-block bg-white px-4 py-2 rounded-full text-sm font-medium shadow-md">
                                {new Date(card.Date).toLocaleDateString('el-GR')}
                              </span>
                            </div>
                          </div>

                          <div className="p-6 pt-8">
                            {card.Featured && (
                              <div className="mb-4 aspect-video bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-2xl">
                                PLATO
                              </div>
                            )}

                            <h3 className="text-lg font-bold mb-4 line-clamp-3">
                              {card.Title}
                            </h3>

                            <div className="flex items-center text-sm text-gray-600">
                              <div className="w-8 h-8 mr-2">
                                <Image
                                  src="/cforc_logo_small.svg"
                                  alt="Culture for Change Logo"
                                  width={32}
                                  height={32}
                                  className="w-full h-full"
                                />
                              </div>
                              <span>CULTURE FOR CHANGE</span>
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
