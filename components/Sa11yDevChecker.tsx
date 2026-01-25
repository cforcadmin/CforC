'use client'

import { useEffect, useState } from 'react'
import { useAuth } from './AuthProvider'

// Developer email that can see Sa11y
const DEV_EMAIL = 'contact@yoryosstyl.com'

export default function Sa11yDevChecker() {
  const { user, isLoading } = useAuth()
  const [sa11yLoaded, setSa11yLoaded] = useState(false)

  useEffect(() => {
    // Only load Sa11y if the developer is logged in
    if (isLoading || !user || user.Email !== DEV_EMAIL) {
      return
    }

    // Don't load twice
    if (sa11yLoaded) {
      return
    }

    const loadSa11y = async () => {
      try {
        // Dynamically import Sa11y CSS
        const cssLink = document.createElement('link')
        cssLink.rel = 'stylesheet'
        cssLink.href = 'https://cdn.jsdelivr.net/gh/ryersondmp/sa11y@4.4.1/dist/css/sa11y.min.css'
        cssLink.id = 'sa11y-css'
        document.head.appendChild(cssLink)

        // Dynamically import Sa11y and Greek language
        const [{ Sa11y, Lang }, elLang] = await Promise.all([
          import('sa11y/dist/js/sa11y.esm.min.js'),
          import('sa11y/dist/js/lang/el.js')
        ])

        // Set the language
        Lang.addI18n(elLang.default.strings)

        // Initialize Sa11y with custom options
        const sa11y = new Sa11y({
          checkRoot: 'body',
          panelPosition: 'left', // Put on left to not conflict with accessibility menu
          readabilityPlugin: true,
          contrastPlugin: true,
          formLabelsPlugin: true,
          developerPlugin: true,
          colourFilterPlugin: true,
          // Ignore certain elements
          containerIgnore: '.sa11y-ignore, .goog-te-banner-frame, #google_translate_element, .skiptranslate',
          // Custom about content
          aboutContent: `
            <p><strong>Sa11y Development Mode</strong></p>
            <p>This accessibility checker is only visible to contact@yoryosstyl.com for development and testing purposes.</p>
          `,
        })

        setSa11yLoaded(true)
        console.log('[Sa11y] Loaded for developer:', user.Email)
      } catch (error) {
        console.error('[Sa11y] Failed to load:', error)
      }
    }

    loadSa11y()

    // No cleanup on dependency change - only clean up on unmount if needed
  }, [user, isLoading, sa11yLoaded])

  // Separate cleanup effect that only runs on unmount
  useEffect(() => {
    return () => {
      const cssLink = document.getElementById('sa11y-css')
      if (cssLink) {
        cssLink.remove()
      }
      // Sa11y creates elements with id="sa11y-*", remove them
      document.querySelectorAll('[id^="sa11y"]').forEach(el => el.remove())
    }
  }, []) // Empty deps = only runs on unmount

  // This component doesn't render anything visible
  // Sa11y creates its own UI elements
  return null
}
