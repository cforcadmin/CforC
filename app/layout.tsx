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
import FeedbackButton from '@/components/FeedbackButton'

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
                  <FeedbackButton />
                  <ReadingAids />
                  <Sa11yDevChecker />
                </AnnouncerProvider>
              </AuthProvider>
            </AccessibilityProvider>
          </TextSizeProvider>
        </ThemeProvider>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-42JX4R6R4F"
          strategy="afterInteractive"
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-42JX4R6R4F');
            `,
          }}
        />
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

                // Hide Google Translate widget elements from accessibility tree
                // We use our own custom LanguageSwitcher for language selection
                function hideGoogleTranslateA11y() {
                  // Hide main containers
                  var containers = document.querySelectorAll(
                    '#google_translate_element, .goog-te-menu-frame, .goog-te-banner-frame, ' +
                    '.skiptranslate, [class*="VIpgJd"], .goog-te-gadget, .goog-te-combo'
                  );
                  containers.forEach(function(el) {
                    el.setAttribute('aria-hidden', 'true');
                    el.setAttribute('role', 'presentation');
                    el.setAttribute('tabindex', '-1');
                  });

                  // Fix href="#" links - add role and remove from tab order
                  var links = document.querySelectorAll(
                    '[class*="VIpgJd"] a[href="#"], ' +
                    '.goog-te-menu-value a[href="#"], ' +
                    '.goog-te-gadget a[href="#"]'
                  );
                  links.forEach(function(link) {
                    link.setAttribute('role', 'presentation');
                    link.setAttribute('tabindex', '-1');
                    link.setAttribute('aria-hidden', 'true');
                  });
                }

                // Run immediately and after delays to catch dynamically created elements
                hideGoogleTranslateA11y();
                setTimeout(hideGoogleTranslateA11y, 500);
                setTimeout(hideGoogleTranslateA11y, 1000);
                setTimeout(hideGoogleTranslateA11y, 2000);

                // Also use MutationObserver to catch any new elements
                var observer = new MutationObserver(function(mutations) {
                  hideGoogleTranslateA11y();
                });
                observer.observe(document.body, { childList: true, subtree: true });

                // Stop observing after 10 seconds to prevent performance issues
                setTimeout(function() { observer.disconnect(); }, 10000);
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
