import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getMembers } from '@/lib/strapi'
import MapPageClient from './MapPageClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Χάρτης Μελών',
  description: 'Διαδραστικός χάρτης με τις τοποθεσίες των μελών του δικτύου Culture for Change σε όλη την Ελλάδα.',
}

export default async function MapPage() {
  let members: any[] = []
  try {
    const response = await getMembers()
    members = response.data || []
  } catch (error) {
    console.error('Error fetching members for map:', error)
  }

  return (
    <Suspense>
      <MapPageClient members={members} />
    </Suspense>
  )
}
