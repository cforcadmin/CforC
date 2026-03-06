'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import LoadingIndicator from './LoadingIndicator'
import NewsFlipCard from './shared/NewsFlipCard'
import { getActivities } from '@/lib/strapi'
import type { StrapiResponse, Activity } from '@/lib/types'

export default function ActivitiesSection() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchActivities() {
      try {
        setLoading(true)
        const response: StrapiResponse<Activity[]> = await getActivities()

        // Sort by date descending (most recent first), take 6
        const sorted = response.data
          .sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime())
          .slice(0, 6)

        setActivities(sorted)
      } catch (err) {
        setError('Failed to load activities from Strapi')
        console.error('Error fetching activities:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchActivities()
  }, [])

  if (loading) {
    return (
      <section id="activities" className="py-24 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <LoadingIndicator />
        </div>
      </section>
    )
  }

  if (error || activities.length === 0) {
    return (
      <section id="activities" className="py-24 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <span className="inline-block bg-charcoal dark:bg-gray-700 text-coral dark:text-coral-light px-3 py-1 rounded-full text-sm font-medium mb-2 shadow-[0_0_15px_8px_rgba(45,45,45,0.4)] dark:shadow-[0_0_15px_8px_rgba(55,65,81,0.5)]">ΠΡΟΣΦΑΤΑ ΝΕΑ</span>
              <h2 className="text-4xl md:text-5xl font-bold dark:text-gray-100">
                ΝΕΑ ΤΟΥ<br />
                CULTURE FOR CHANGE
              </h2>
            </div>
          </div>
          <div className="bg-orange-50 dark:bg-gray-700 border border-orange-200 dark:border-gray-600 rounded-lg p-6 text-center">
            <p className="text-orange-600 dark:text-orange-400 font-medium">
              {error || 'No activities available yet'}
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="activities" className="py-24 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-end mb-12">
          <div>
            <span className="inline-block bg-charcoal dark:bg-gray-700 text-coral dark:text-coral-light px-3 py-1 rounded-full text-sm font-medium mb-2 shadow-[0_0_15px_8px_rgba(45,45,45,0.4)] dark:shadow-[0_0_15px_8px_rgba(55,65,81,0.5)]">ΠΡΟΣΦΑΤΑ ΝΕΑ</span>
            <h2 className="text-4xl md:text-5xl font-bold dark:text-gray-100">
              ΝΕΑ ΤΟΥ<br />
              CULTURE FOR CHANGE
            </h2>
          </div>
          <Link href="/news" className="hidden md:block bg-charcoal dark:bg-gray-700 text-coral dark:text-coral-light border-2 border-coral dark:border-coral-light px-6 py-3 rounded-full font-medium hover:bg-coral hover:text-white dark:hover:bg-coral-light dark:hover:text-gray-900 transition-colors">
            ΟΛΑ ΤΑ ΝΕΑ
          </Link>
        </div>

        {/* Card Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {activities.map((activity) => (
            <NewsFlipCard key={activity.id} activity={activity} />
          ))}
        </div>

        <Link href="/news" className="md:hidden w-full mt-8 bg-charcoal dark:bg-gray-700 text-coral dark:text-coral-light border-2 border-coral dark:border-coral-light px-6 py-3 rounded-full font-medium text-center block hover:bg-coral hover:text-white dark:hover:bg-coral-light dark:hover:text-gray-900 transition-colors">
          ΟΛΑ ΤΑ ΝΕΑ
        </Link>
      </div>
    </section>
  )
}
