'use client'

import type { ApplicationDraft } from './applyTypes'

/**
 * Live profile preview — «Χτίσε το προφίλ σου».
 * Mirrors the member-card look: photo, hero-cased name, profession, cities,
 * field chips, bio excerpt. Contact/social icons appear only when the
 * matching publish-consent is ticked, so consent is visible, not abstract.
 */
export default function PreviewCard({
  draft,
  photoUrl,
  dimmed,
}: {
  draft: ApplicationDraft
  photoUrl: string | null
  dimmed: boolean
}) {
  const fields = draft.FieldsOfActivity.split(',').map(f => f.trim()).filter(Boolean)
  const shownFields = fields.slice(0, 5)
  const extraFields = fields.length - shownFields.length
  const heroName = `${draft.FirstName} ${draft.LastName}`.trim().toLocaleUpperCase('el-GR')
  const consented = (key: string) => draft.PublishConsent.includes(key)

  const cities = draft.ActivityCityA.trim()

  return (
    <div className={`transition-opacity duration-300 ${dimmed ? 'opacity-40' : 'opacity-100'}`}>
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm overflow-hidden">
        {/* Photo */}
        <div className="aspect-[3/4] bg-gray-100 dark:bg-gray-700 relative">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="Η φωτογραφία του προφίλ σου" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-300 dark:text-gray-500">
              <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-5 0-9 2.5-9 5.5V22h18v-2.5c0-3-4-5.5-9-5.5z" />
              </svg>
              <span className="text-xs">Η φωτογραφία σου</span>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="p-5">
          {heroName ? (
            <h3 className="text-lg font-bold text-charcoal dark:text-coral leading-tight notranslate">{heroName}</h3>
          ) : (
            <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-2/3" aria-hidden="true" />
          )}

          {draft.Profession.trim() ? (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{draft.Profession}</p>
          ) : (
            <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-1/2 mt-2" aria-hidden="true" />
          )}

          {cities && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {cities}
            </p>
          )}

          {/* Field chips */}
          {shownFields.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {shownFields.map(f => (
                <span key={f} className="bg-coral/10 dark:bg-coral/20 text-charcoal dark:text-gray-100 border border-coral/40 text-xs px-2.5 py-0.5 rounded-full">
                  {f}
                </span>
              ))}
              {extraFields > 0 && (
                <span className="text-xs text-gray-400 dark:text-gray-500 px-1 py-0.5">+{extraFields}</span>
              )}
            </div>
          ) : (
            <div className="flex gap-1.5 mt-3" aria-hidden="true">
              <span className="h-5 w-16 bg-coral/10 dark:bg-coral/20 rounded-full" />
              <span className="h-5 w-20 bg-coral/10 dark:bg-coral/20 rounded-full" />
            </div>
          )}

          {/* Bio excerpt */}
          {draft.Bio.trim() && (
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-3 line-clamp-3">{draft.Bio}</p>
          )}

          {/* Contact icons — only what's consented */}
          {(consented('email') || consented('phone') || consented('website') || consented('facebook') || consented('linkedin') || consented('instagram')) && (
            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              {consented('email') && draft.Email && <ContactDot label="E-mail">✉</ContactDot>}
              {consented('phone') && draft.Phone && <ContactDot label="Τηλέφωνο">☎</ContactDot>}
              {consented('website') && draft.Website && <ContactDot label="Website">🌐</ContactDot>}
              {consented('facebook') && draft.Facebook && <ContactDot label="Facebook">f</ContactDot>}
              {consented('linkedin') && draft.LinkedIn && <ContactDot label="LinkedIn">in</ContactDot>}
              {consented('instagram') && draft.Instagram && <ContactDot label="Instagram">ig</ContactDot>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ContactDot({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <span
      title={label}
      className="w-7 h-7 rounded-full bg-charcoal dark:bg-gray-600 text-white text-xs flex items-center justify-center notranslate"
    >
      {children}
    </span>
  )
}
