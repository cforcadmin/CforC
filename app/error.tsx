'use client'

import { useEffect } from 'react'
import Link from 'next/link'

/**
 * Η οθόνη βλάβης, με την ταυτότητα του CforC.
 *
 * ΤΙ ΔΕΝ ΔΕΙΧΝΕΙ: το μήνυμα του σφάλματος. Σε παραγωγή το Next το κρύβει έτσι
 * κι αλλιώς, αλλά ο κανόνας είναι δικός μας — ένα stack trace σε επισκέπτη δεν
 * βοηθά εκείνον και βοηθά όποιον ψάχνει αδυναμίες. Το `digest` φαίνεται:
 * είναι το μόνο που χρειάζεται για να βρεθεί το περιστατικό στα logs.
 *
 * ΔΕΝ ΧΡΗΣΙΜΟΠΟΙΕΙ Navigation/Footer: αν η βλάβη είναι μέσα τους, η οθόνη
 * σφάλματος θα έσκαγε κι αυτή, και ο επισκέπτης θα έβλεπε λευκή σελίδα.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Σφάλμα σελίδας:', error?.digest || error?.message)
  }, [error])

  return (
    <div className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-xl text-center py-20">
        <p className="text-6xl sm:text-7xl font-bold text-coral">Ωχ.</p>
        <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-charcoal dark:text-white">
          Κάτι πήγε στραβά από τη μεριά μας
        </h1>
        <p className="mt-4 text-gray-600 dark:text-gray-300">
          Δεν φταις εσύ. Δοκίμασε ξανά σε λίγο — και αν επιμένει, πες μας το.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset}
            className="px-6 py-3 rounded-full bg-coral text-charcoal font-bold hover:brightness-105 transition">
            Δοκίμασε ξανά
          </button>
          <Link href="/"
            className="px-6 py-3 rounded-full border border-gray-300 dark:border-gray-600 font-bold text-charcoal dark:text-gray-100 hover:border-coral transition">
            Αρχική
          </Link>
        </div>

        <p className="mt-8 text-sm text-gray-600 dark:text-gray-400">
          Γράψε μας στο{' '}
          <a href="mailto:hello@cultureforchange.net" className="text-coral dark:text-coral-light hover:underline">
            hello@cultureforchange.net
          </a>
          {error?.digest && (
            <>
              {' '}και ανάφερε τον κωδικό{' '}
              <code className="notranslate px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-charcoal dark:text-gray-100">
                {error.digest}
              </code>
            </>
          )}.
        </p>
      </div>
    </div>
  )
}
