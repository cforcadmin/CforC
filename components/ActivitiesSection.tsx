'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { getActivities } from '@/lib/strapi'
import type { StrapiResponse, StrapiData, Activity } from '@/lib/types'

export default function ActivitiesSection() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

        {/* Activities Grid */}
        <div className="relative">
          <div className="grid md:grid-cols-3 gap-6">
            {activities.map((card) => {
              // Debug: Log the Visuals structure for first card
              if (card.id === activities[0]?.id) {
                console.log('Card Visuals structure:', card.Visuals)
                console.log('Full card data:', card)
              }

              return (
                <div
                  key={card.id}
                  className="bg-orange-50 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Image with overlapping date */}
                  <div className="relative -mb-2">
                    {card.Visuals && card.Visuals.length > 0 ? (
                      <div className="aspect-video rounded-lg overflow-hidden mx-4 mt-4">
                        <Image
                          src={`${process.env.NEXT_PUBLIC_STRAPI_URL}${card.Visuals[0].url}`}
                          alt={card.Visuals[0].alternativeText || card.Title}
                          width={card.Visuals[0].width}
                          height={card.Visuals[0].height}
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

        <button className="md:hidden w-full mt-8 bg-coral text-white px-6 py-3 rounded-full font-medium">
          ΟΛΕΣ ΟΙ ΔΡΑΣΤΗΡΙΟΤΗΤΕΣ
        </button>
      </div>
    </section>
  )
}
