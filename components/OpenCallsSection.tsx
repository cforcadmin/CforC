'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

// Placeholder - will be replaced with Strapi data
interface OpenCall {
  id: number
  Title: string
  Description: string
  Deadline: string
  Priority: boolean
  Link: string
}

export default function OpenCallsSection() {
  const [openCalls, setOpenCalls] = useState<OpenCall[]>([])
  const [loading, setLoading] = useState(true)

  // Placeholder data for now
  useEffect(() => {
    // Simulate fetching data
    setOpenCalls([
      {
        id: 1,
        Title: 'NEW EUROPEAN BAUHAUS FACILITY',
        Description: 'Το εργαλείο χρηματοδότησης New European Bauhaus Facility 2025-2027 από την ΕΕ ενισχύει καινοτόμες πρωτοβουλίες με στόχο βιώσιμες, συμπεριληπτικές και ελκυστικές τοπικές κοινότητες στα πλαίσια του Νέου Ευρωπαϊκού Bauhaus. Καλύπτει 11 άξονες στο Horizon.',
        Deadline: '12/11/2025',
        Priority: true,
        Link: '#'
      },
      {
        id: 2,
        Title: 'EUROPEAN FESTIVALS FUND FOR EMERGING ARTISTS (EFFEA)',
        Description: 'Το European Festivals Fund for Emerging Artists (EFFEA) προσφέρει ευκαιρίες residencies και συμπαραγωγές για αναδυόμενους καλλιτέχνες σε συνεργασία με φεστιβάλ σε όλη την Ευρώπη. Υποβολές μέχρι την 17η Δεκεμβρίου κλπ) μέχρι 2025-2029.',
        Deadline: '03/11/2025',
        Priority: true,
        Link: '#'
      }
    ])
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <section id="open-calls" className="bg-gray-100">
        <div className="animate-pulse">
          <div className="h-96 bg-coral"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="space-y-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="open-calls">
      {/* Hero Section */}
      <div className="bg-coral py-32 md:py-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-7xl md:text-9xl font-black text-charcoal leading-none">
            CALLS OPEN
          </h1>
        </div>
      </div>

      {/* Open Calls List */}
      <div className="bg-gray-100 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-0">
            {openCalls.map((call, index) => (
              <div key={call.id}>
                {index > 0 && <hr className="border-gray-300" />}
                <Link
                  href={call.Link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block py-12 hover:bg-white transition-colors"
                >
                  <div className="flex items-start justify-between gap-8">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-6">
                        {/* Date Badge */}
                        <span className="inline-block bg-charcoal text-white px-5 py-2 rounded-full text-sm font-medium">
                          {call.Deadline}
                        </span>

                        {/* Priority Badge */}
                        {call.Priority && (
                          <span className="inline-block bg-white border-2 border-charcoal text-charcoal px-5 py-2 rounded-full text-sm font-medium">
                            PRIORITY
                          </span>
                        )}
                      </div>

                      <h3 className="text-2xl md:text-3xl font-bold mb-4 text-charcoal">
                        {call.Title}
                      </h3>

                      <p className="text-gray-700 leading-relaxed text-lg">
                        {call.Description}
                      </p>
                    </div>

                    {/* Arrow Icon */}
                    <div className="flex-shrink-0 mt-2">
                      <svg
                        className="w-10 h-10 text-charcoal group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 17L17 7M17 7H7M17 7V17"
                        />
                      </svg>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
