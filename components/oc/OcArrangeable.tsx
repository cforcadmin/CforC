'use client'

// Η σειρά των καρτών μέσα σε μια ενότητα του OC, ανά ΧΡΗΣΤΗ και ανά ΘΕΣΗ.
//
// Κάθε ρόλος στήνει το τραπέζι του όπως θέλει· η προεπιλογή ζει στον κώδικα
// (η σειρά που γράφτηκαν οι κάρτες) και επιστρέφει με ένα κλικ. Η διάταξη
// αποθηκεύεται στον server (OcPrefs του μέλους) — ακολουθεί τον άνθρωπο σε
// κάθε συσκευή και δεν χάνεται με τον καθαρισμό του browser.
//
// Χρήση: τυλίγεις τις κάρτες και δίνεις σε καθεμία ένα σταθερό key.
//   <OcArrangeable section="finances" seat={seat}>
//     <OcSubscriptions key="subscriptions" … />
//     <OcMonthlyView  key="monthly" … />
//   </OcArrangeable>

import { Children, isValidElement, useCallback, useEffect, useMemo, useState } from 'react'

/** Το key του παιδιού είναι η ταυτότητα της κάρτας — «.$monthly» → «monthly» */
function idOf(child: React.ReactNode, index: number): string {
  if (isValidElement(child) && child.key) return String(child.key).replace(/^\.\$?/, '')
  return `card-${index}`
}

export default function OcArrangeable({ section, seat, children }: {
  section: string
  /** Η ενεργή θέση — κάθε ρόλος έχει τη δική του διάταξη */
  seat: string | null
  children: React.ReactNode
}) {
  const cards = useMemo(() => {
    const list = Children.toArray(children).filter(Boolean)
    return list.map((node, i) => ({ id: idOf(node, i), node }))
  }, [children])

  const [order, setOrder] = useState<string[] | null>(null)
  const [arranging, setArranging] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const key = seat || 'none'

  useEffect(() => {
    let alive = true
    fetch('/api/oc/ui-prefs')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (alive) setOrder(d?.layout?.[key]?.[section] || []) })
      .catch(() => { if (alive) setOrder([]) })
    return () => { alive = false }
  }, [key, section])

  /** Αποθηκευμένη σειρά πρώτα· ό,τι δεν αναγνωρίζεται μένει στη θέση του */
  const ordered = useMemo(() => {
    if (!order || order.length === 0) return cards
    const byId = new Map(cards.map(c => [c.id, c]))
    const out: typeof cards = []
    for (const id of order) {
      const c = byId.get(id)
      if (c) { out.push(c); byId.delete(id) }
    }
    // Νέες κάρτες (που δεν υπήρχαν όταν αποθηκεύτηκε η σειρά) στη σειρά του κώδικα
    for (const c of cards) if (byId.has(c.id)) out.push(c)
    return out
  }, [cards, order])

  const persist = useCallback((ids: string[]) => {
    setOrder(ids)
    fetch('/api/oc/ui-prefs', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ layout: { [key]: { [section]: ids } } }), keepalive: true,
    }).catch(() => { /* μη κρίσιμο: η σειρά είναι προτίμηση */ })
  }, [key, section])

  function move(id: string, delta: number) {
    const ids = ordered.map(c => c.id)
    const i = ids.indexOf(id)
    const j = i + delta
    if (i < 0 || j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    persist(ids)
  }

  function dropOn(targetId: string) {
    if (!dragId || dragId === targetId) return
    const ids = ordered.map(c => c.id).filter(x => x !== dragId)
    ids.splice(ids.indexOf(targetId), 0, dragId)
    persist(ids)
    setDragId(null)
  }

  function reset() {
    setOrder([])
    fetch('/api/oc/ui-prefs', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reset: { seat: key, section } }),
    }).catch(() => { /* μη κρίσιμο */ })
  }

  const changed = (order || []).length > 0

  return (
    <>
      <div className="flex items-center justify-end gap-2 -mb-2">
        {arranging ? (
          <>
            <span className="mr-auto text-xs text-gray-500 dark:text-gray-400">
              Σύρε τις κάρτες ή χρησιμοποίησε τα βελάκια. Η σειρά είναι δική σου και μόνο για αυτόν τον ρόλο.
            </span>
            {changed && (
              <button type="button" onClick={reset}
                className="px-3 py-1 rounded-full border border-gray-300 dark:border-gray-600 text-xs text-charcoal dark:text-gray-200 hover:border-coral">
                Επαναφορά προεπιλογής
              </button>
            )}
            <button type="button" onClick={() => setArranging(false)}
              className="px-4 py-1 rounded-full bg-coral text-white text-xs font-bold hover:bg-coral/90">
              Τέλος
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setArranging(true)}
            title="Άλλαξε τη σειρά των καρτών σε αυτή την ενότητα"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs text-gray-400 dark:text-gray-500 hover:text-coral hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16M8 4v4m8 8v4" />
            </svg>
            Διάταξη
          </button>
        )}
      </div>

      {ordered.map((c, i) => (
        arranging ? (
          <div
            key={c.id}
            draggable
            onDragStart={() => setDragId(c.id)}
            onDragOver={e => e.preventDefault()}
            onDrop={() => dropOn(c.id)}
            onDragEnd={() => setDragId(null)}
            className={`relative rounded-3xl ring-2 ring-dashed transition-colors ${
              dragId === c.id ? 'ring-coral opacity-60' : 'ring-coral/40 hover:ring-coral'
            }`}
          >
            <div className="absolute -top-3 left-4 z-10 flex items-center gap-1 rounded-full bg-coral text-white px-2 py-0.5 shadow">
              <span className="text-[10px] font-bold cursor-grab select-none" aria-hidden="true">⠿ σύρε</span>
              <button type="button" onClick={() => move(c.id, -1)} disabled={i === 0}
                aria-label="Μετακίνηση πάνω" className="px-1 text-xs disabled:opacity-30">↑</button>
              <button type="button" onClick={() => move(c.id, 1)} disabled={i === ordered.length - 1}
                aria-label="Μετακίνηση κάτω" className="px-1 text-xs disabled:opacity-30">↓</button>
            </div>
            <div className="pointer-events-none">{c.node}</div>
          </div>
        ) : (
          <div key={c.id}>{c.node}</div>
        )
      ))}
    </>
  )
}
