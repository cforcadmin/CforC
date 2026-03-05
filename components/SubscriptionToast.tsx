'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type ToastType = 'success' | 'info' | 'error' | null

interface ToastData {
  type: ToastType
  title: string
  message: string
}

function SubscriptionToastInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [toast, setToast] = useState<ToastData | null>(null)

  useEffect(() => {
    const subscribed = searchParams.get('subscribed')
    const error = searchParams.get('subscribe_error')

    let toastData: ToastData | null = null

    if (subscribed === 'true') {
      toastData = {
        type: 'success',
        title: 'Η εγγραφή σου ολοκληρώθηκε!',
        message: 'Καλώς ήρθες στην κοινότητα του CforC!',
      }
    } else if (error === 'already') {
      toastData = {
        type: 'info',
        title: 'Ήδη εγγεγραμμένο',
        message: 'Αυτό το email είναι ήδη εγγεγραμμένο στο newsletter μας.',
      }
    } else if (error === 'expired') {
      toastData = {
        type: 'error',
        title: 'Ο σύνδεσμος έληξε',
        message: 'Ο σύνδεσμος επιβεβαίωσης έχει λήξει. Παρακαλώ δοκίμασε ξανά.',
      }
    }

    if (toastData) {
      setToast(toastData)
      // Clean up URL params
      router.replace('/', { scroll: false })
      // Auto-dismiss after 6 seconds
      const timer = setTimeout(() => setToast(null), 6000)
      return () => clearTimeout(timer)
    }
  }, [searchParams, router])

  if (!toast) return null

  const bgColor = {
    success: 'bg-green-50 dark:bg-green-900/30 border-green-400',
    info: 'bg-blue-50 dark:bg-blue-900/30 border-blue-400',
    error: 'bg-red-50 dark:bg-red-900/30 border-red-400',
  }[toast.type!]

  const textColor = {
    success: 'text-green-800 dark:text-green-200',
    info: 'text-blue-800 dark:text-blue-200',
    error: 'text-red-800 dark:text-red-200',
  }[toast.type!]

  const iconPath = {
    success: 'M5 13l4 4L19 7',
    info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    error: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z',
  }[toast.type!]

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-[slide-down_0.3s_ease-out]">
      <div className={`${bgColor} border rounded-2xl shadow-lg p-4 flex items-start gap-3`}>
        <svg className={`w-6 h-6 ${textColor} flex-shrink-0 mt-0.5`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
        </svg>
        <div className="flex-1">
          <h4 className={`font-semibold ${textColor}`}>{toast.title}</h4>
          <p className={`text-sm ${textColor} opacity-80`}>{toast.message}</p>
        </div>
        <button
          onClick={() => setToast(null)}
          className={`${textColor} opacity-60 hover:opacity-100 transition-opacity`}
          aria-label="Κλείσιμο"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <style jsx>{`
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translate(-50%, -100%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
      `}</style>
    </div>
  )
}

export default function SubscriptionToast() {
  return <SubscriptionToastInner />
}
