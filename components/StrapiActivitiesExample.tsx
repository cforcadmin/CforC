'use client'

import { useEffect, useState } from 'react'
import { getActivities } from '@/lib/strapi'
import type { StrapiResponse, StrapiData, Activity } from '@/lib/types'

export default function StrapiActivitiesExample() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchActivities() {
      try {
        setLoading(true)
        const response: StrapiResponse<Activity[]> = await getActivities()
        setActivities(response.data)
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
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
            <div className="h-12 bg-gray-200 rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600 font-medium">{error}</p>
            <p className="text-sm text-red-500 mt-2">
              Make sure Strapi is running and your .env.local is configured correctly.
            </p>
          </div>
        </div>
      </section>
    )
  }

  if (activities.length === 0) {
    return (
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-coral text-sm font-medium mb-2">ACTIVITIES</p>
          <h2 className="text-4xl md:text-5xl font-bold mb-8">No Activities Yet</h2>
          <p className="text-gray-600 mb-6">
            Add some activities in your Strapi admin panel to see them here!
          </p>
          <a
            href="http://localhost:1337/admin"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-coral text-white px-6 py-3 rounded-full font-medium hover:bg-coral-dark transition-colors"
          >
            Go to Strapi Admin
          </a>
        </div>
      </section>
    )
  }

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <p className="text-coral text-sm font-medium mb-2">FROM STRAPI CMS</p>
          <h2 className="text-4xl md:text-5xl font-bold">
            Activities ({activities.length})
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
            >
              {activity.Visuals && activity.Visuals.length > 0 && (
                <div className="aspect-video bg-gray-100">
                  <img
                    src={`${process.env.NEXT_PUBLIC_STRAPI_URL}${activity.Visuals[0].url}`}
                    alt={activity.Visuals[0].alternativeText || activity.Title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="p-6">
                <h3 className="text-xl font-bold mb-3">
                  {activity.Title}
                </h3>

                <p className="text-gray-600 mb-4 line-clamp-3">
                  {activity.Category || 'No category'}
                </p>

                <p className="text-xs text-gray-400">
                  Date: {new Date(activity.Date).toLocaleDateString()}
                </p>

                <p className="text-xs text-gray-400">
                  Published: {new Date(activity.publishedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
