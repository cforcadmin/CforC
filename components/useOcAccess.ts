'use client'

import { useEffect, useState } from 'react'

export interface OcAccessState {
  loading: boolean
  isBoard: boolean
  seats: string[]
}

// Module-level cache so Navigation, hero and popup don't each refetch.
// UI-gating only — the real gate is server-side (/oc page + /api/oc/* routes).
let cached: { isBoard: boolean; seats: string[] } | null = null
let inflight: Promise<{ isBoard: boolean; seats: string[] }> | null = null

async function fetchAccess(): Promise<{ isBoard: boolean; seats: string[] }> {
  if (cached) return cached
  if (!inflight) {
    inflight = fetch('/api/oc/me')
      .then(res => (res.ok ? res.json() : { isBoard: false, seats: [] }))
      .catch(() => ({ isBoard: false, seats: [] }))
      .then(data => {
        cached = { isBoard: !!data.isBoard, seats: data.seats || [] }
        inflight = null
        return cached
      })
  }
  return inflight
}

/** Clear the cached access (call on logout/login so state never leaks across users). */
export function clearOcAccessCache() {
  cached = null
  inflight = null
}

export function useOcAccess(enabled: boolean = true): OcAccessState {
  const [state, setState] = useState<OcAccessState>({
    loading: enabled,
    isBoard: cached?.isBoard ?? false,
    seats: cached?.seats ?? [],
  })

  useEffect(() => {
    if (!enabled) {
      setState({ loading: false, isBoard: false, seats: [] })
      return
    }
    let alive = true
    fetchAccess().then(access => {
      if (alive) setState({ loading: false, ...access })
    })
    return () => { alive = false }
  }, [enabled])

  return state
}
