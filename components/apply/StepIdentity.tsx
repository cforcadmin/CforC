'use client'

import CityAutocomplete from '@/components/profile/CityAutocomplete'
import { TextField, TextAreaField, SelectField, RadioGroup, FieldLabel, FieldError, FieldHint } from './FormControls'
import { AGE_RANGES, GENDERS, DISABILITY_OPTIONS, PUBLISH_FIELDS, MAX_BIO_WORDS, MAX_PHOTO_MB } from './applyData'
import { wordCount, type ApplicationDraft, type DraftErrors } from './applyTypes'

interface StepProps {
  draft: ApplicationDraft
  set: <K extends keyof ApplicationDraft>(key: K, value: ApplicationDraft[K]) => void
  errors: DraftErrors
  photoUrl: string | null
  onPhotoChange: (file: File | null) => void
  photoError?: string
}

export default function StepIdentity({ draft, set, errors, photoUrl, onPhotoChange, photoError }: StepProps) {
  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null
    if (file && file.size > MAX_PHOTO_MB * 1024 * 1024) {
      onPhotoChange(null)
      e.target.value = ''
      alert(`Η φωτογραφία πρέπει να είναι έως ${MAX_PHOTO_MB}MB`)
      return
    }
    onPhotoChange(file)
  }

  function togglePublish(key: string) {
    set(
      'PublishConsent',
      draft.PublishConsent.includes(key)
        ? draft.PublishConsent.filter(k => k !== key)
        : [...draft.PublishConsent, key]
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <TextField id="FirstName" label="Όνομα" required value={draft.FirstName} onChange={v => set('FirstName', v)} error={errors.FirstName} />
        <TextField id="LastName" label="Επίθετο" required value={draft.LastName} onChange={v => set('LastName', v)} error={errors.LastName} />
      </div>
      <TextField
        id="NameLatin"
        label="Ονοματεπώνυμο με λατινικούς χαρακτήρες"
        value={draft.NameLatin}
        onChange={v => set('NameLatin', v)}
        hint="Για την αγγλική εκδοχή του προφίλ σου"
      />
      <TextField id="Profession" label="Επαγγελματική Ιδιότητα" required value={draft.Profession} onChange={v => set('Profession', v)} error={errors.Profession} />

      <div className="grid sm:grid-cols-2 gap-4">
        <SelectField id="AgeRange" label="Ηλικία" required options={AGE_RANGES} value={draft.AgeRange} onChange={v => set('AgeRange', v)} error={errors.AgeRange} />
        <div />
      </div>
      <RadioGroup name="Gender" label="Φύλο" required options={GENDERS} value={draft.Gender} onChange={v => set('Gender', v)} error={errors.Gender} />
      <RadioGroup name="Disability" label="Αναπηρία" required options={DISABILITY_OPTIONS} value={draft.Disability} onChange={v => set('Disability', v)} error={errors.Disability} />

      {/* Residence */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <CityAutocomplete
            label="Πόλη Διαμονής"
            value={draft.ResidenceCity}
            onChange={v => set('ResidenceCity', v)}
            onProvinceChange={v => set('ResidenceRegion', v)}
            required
          />
          <FieldError message={errors.ResidenceCity} />
        </div>
        <TextField
          id="ResidenceRegion"
          label="Περιφέρεια Διαμονής"
          value={draft.ResidenceRegion}
          onChange={v => set('ResidenceRegion', v)}
          hint="Συμπληρώνεται αυτόματα από την πόλη"
        />
      </div>
      <TextField id="Address" label="Διεύθυνση (Πόλη, οδός, αριθμός, Τ.Κ., χώρα)" required value={draft.Address} onChange={v => set('Address', v)} error={errors.Address} />

      {/* Activity cities — pre-filled from residence, multiple via comma */}
      <div>
        <CityAutocomplete
          label="Πόλη/πόλεις Δραστηριότητας"
          helper="Προσυμπληρώνεται από την πόλη διαμονής — άλλαξέ τη αν χρειάζεται. Για περισσότερες πόλεις, χώρισέ τες με κόμμα (,)."
          value={draft.ActivityCityA}
          onChange={v => set('ActivityCityA', v)}
          onProvinceChange={() => {}}
          required
        />
        <FieldError message={errors.ActivityCityA} />
      </div>

      {/* Contact */}
      <div className="grid sm:grid-cols-2 gap-4">
        <TextField
          id="Email" label="E-mail" type="email" inputMode="email" required
          value={draft.Email} onChange={v => set('Email', v)} error={errors.Email}
          hint="Θα χρησιμοποιείται για την επικοινωνία με το δίκτυο και για τη σύνδεσή σου στην ιστοσελίδα"
        />
        <TextField id="Phone" label="Τηλέφωνο επικοινωνίας" type="tel" inputMode="tel" required value={draft.Phone} onChange={v => set('Phone', v)} error={errors.Phone} hint="Κινητό — για την επικοινωνία με το δίκτυο" />
      </div>

      {/* Socials — genuinely optional */}
      <div className="grid sm:grid-cols-2 gap-4">
        <TextField id="Website" label="Website" inputMode="url" value={draft.Website} onChange={v => set('Website', v)} />
        <TextField id="Facebook" label="Facebook profile" inputMode="url" value={draft.Facebook} onChange={v => set('Facebook', v)} />
        <TextField id="LinkedIn" label="LinkedIn profile" inputMode="url" value={draft.LinkedIn} onChange={v => set('LinkedIn', v)} />
        <TextField id="Instagram" label="Instagram profile" inputMode="url" value={draft.Instagram} onChange={v => set('Instagram', v)} />
      </div>
      <TextField id="BoschProfile" label="Bosch Alumni Network profile" value={draft.BoschProfile} onChange={v => set('BoschProfile', v)} hint="Μόνο αν έχεις ήδη λογαριασμό" />

      {/* Bio */}
      <TextAreaField
        id="Bio"
        label={`Σύντομο βιογραφικό (στα ελληνικά, έως ${MAX_BIO_WORDS} λέξεις)`}
        required rows={6}
        value={draft.Bio}
        onChange={v => set('Bio', v)}
        error={errors.Bio}
        counter={{ current: wordCount(draft.Bio), max: MAX_BIO_WORDS, unit: 'λέξεις' }}
      />
      <TextAreaField id="BioEn" label="Σύντομο βιογραφικό (στα αγγλικά)" rows={5} value={draft.BioEn} onChange={v => set('BioEn', v)} hint="Προαιρετικό — για την αγγλική εκδοχή του προφίλ" />

      {/* Photo */}
      <div>
        <FieldLabel required htmlFor="Photo">Φωτογραφία προφίλ</FieldLabel>
        <div className="flex items-center gap-4">
          <label className="cursor-pointer inline-flex items-center gap-2 px-5 py-3 rounded-full border-2 border-charcoal dark:border-gray-400 text-charcoal dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {photoUrl ? 'Αλλαγή φωτογραφίας' : 'Επιλογή φωτογραφίας'}
            <input id="Photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhoto} className="sr-only" />
          </label>
          {photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="Προεπισκόπηση φωτογραφίας" className="w-14 h-14 rounded-full object-cover border-2 border-coral" />
          )}
        </div>
        <FieldHint>JPG/PNG/WebP έως {MAX_PHOTO_MB}MB — κατακόρυφος προσανατολισμός ταιριάζει καλύτερα στο προφίλ</FieldHint>
        <FieldError message={photoError} />
      </div>

      {/* Publish consents */}
      <fieldset className="border border-gray-200 dark:border-gray-600 rounded-2xl p-5">
        <legend className="px-2 font-medium text-charcoal dark:text-gray-200">Δημοσίευση στοιχείων επικοινωνίας</legend>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Το προφίλ σου (όνομα, ιδιότητα, πόλεις, πεδία δράσης, βιογραφικό, φωτογραφία) δημοσιεύεται
          στην ιστοσελίδα με την έγκριση της αίτησης. Επίλεξε ποια <strong>στοιχεία επικοινωνίας</strong>{' '}
          θέλεις να εμφανίζονται επιπλέον — προαιρετικά, όλα ανενεργά αν δεν τα επιλέξεις:
        </p>
        <div className="grid sm:grid-cols-2 gap-1.5">
          {PUBLISH_FIELDS.map(f => {
            const hasValue = String(draft[f.draftKey] || '').trim() !== ''
            return (
              <label
                key={f.key}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-sm transition-colors ${
                  !hasValue
                    ? 'opacity-45 cursor-not-allowed border-gray-200 dark:border-gray-600'
                    : draft.PublishConsent.includes(f.key)
                      ? 'bg-coral/10 dark:bg-coral/20 border-coral cursor-pointer'
                      : 'border-gray-200 dark:border-gray-600 hover:border-coral/60 cursor-pointer'
                } text-gray-700 dark:text-gray-300`}
              >
                <input
                  type="checkbox"
                  disabled={!hasValue}
                  checked={draft.PublishConsent.includes(f.key)}
                  onChange={() => togglePublish(f.key)}
                  className="accent-[#FF8B6A]"
                />
                <span>{f.label}{!hasValue && ' — συμπλήρωσέ το πρώτα'}</span>
              </label>
            )
          })}
        </div>
      </fieldset>
    </div>
  )
}
