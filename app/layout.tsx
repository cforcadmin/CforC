import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { TextSizeProvider } from '@/components/TextSizeProvider'
import { AuthProvider } from '@/components/AuthProvider'
import { AnnouncerProvider } from '@/components/Announcer'
import { AccessibilityProvider } from '@/components/AccessibilityProvider'
import AccessibilityMenu from '@/components/AccessibilityMenu'
import ReadingAids from '@/components/ReadingAids'
import Sa11yDevChecker from '@/components/Sa11yDevChecker'

export const metadata: Metadata = {
  title: 'Culture for Change',
  description: 'First Greek social innovation network for cultural and political change',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="el">
      <body>
        {/* Skip to main content link for keyboard users */}
        <a href="#main-content" className="skip-link">
          Μετάβαση στο κύριο περιεχόμενο
        </a>
        <ThemeProvider>
          <TextSizeProvider>
            <AccessibilityProvider>
              <AuthProvider>
                <AnnouncerProvider>
                  {children}
                  <AccessibilityMenu />
                  <ReadingAids />
                  <Sa11yDevChecker />
                </AnnouncerProvider>
              </AuthProvider>
            </AccessibilityProvider>
          </TextSizeProvider>
        </ThemeProvider>
        <Script
          id="google-translate-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              function googleTranslateElementInit() {
                new google.translate.TranslateElement({
                  pageLanguage: 'el',
                  includedLanguages: 'en,de,es,pt,fr,it,ru,zh-CN,ja,ar,tr,nl,pl,sv,no,da,fi,cs,ro,hu,el',
                  layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
                  autoDisplay: false
                }, 'google_translate_element');
              }
            `,
          }}
        />
        <Script
          src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}
