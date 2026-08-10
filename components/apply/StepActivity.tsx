'use client'

import FieldsOfWorkSelector from '@/components/profile/FieldsOfWorkSelector'
import { TextAreaField, RadioGroup, CheckboxGroup, FieldLabel, FieldError } from './FormControls'
import { EMPLOYMENT_STATUSES, EMPLOYMENT_CONDITIONALS, ACTION_FORMATS, AUDIENCE_GROUPS, THEMES } from './applyData'
import type { ApplicationDraft, DraftErrors } from './applyTypes'

interface StepProps {
  draft: ApplicationDraft
  set: <K extends keyof ApplicationDraft>(key: K, value: ApplicationDraft[K]) => void
  errors: DraftErrors
}

export default function StepActivity({ draft, set, errors }: StepProps) {
  const activeConditionals = Object.values(EMPLOYMENT_CONDITIONALS).filter(c =>
    c.triggers.some(t => draft.EmploymentStatus.includes(t))
  )

  return (
    <div className="space-y-6">
      <TextAreaField
        id="Education"
        label="Συμπληρώστε όλους τους τίτλους σπουδών σας"
        required rows={3}
        value={draft.Education}
        onChange={v => set('Education', v)}
        error={errors.Education}
        hint="Επίπεδο — Τμήμα — Ίδρυμα · π.χ. Πτυχίο — Πολιτιστική Διαχείριση — Πάντειο Πανεπιστήμιο"
      />

      <CheckboxGroup
        label="Επαγγελματική Κατάσταση"
        required
        options={EMPLOYMENT_STATUSES}
        values={draft.EmploymentStatus}
        onChange={v => set('EmploymentStatus', v)}
        error={errors.EmploymentStatus}
      />

      {/* Conditional follow-ups — appear only for ticked statuses */}
      {activeConditionals.map(c => (
        <TextAreaField
          key={c.draftKey}
          id={c.draftKey}
          label={c.label}
          rows={3}
          value={draft[c.draftKey]}
          onChange={v => set(c.draftKey, v)}
        />
      ))}

      <RadioGroup
        name="BoschAlumni"
        label="Είστε απόφοιτος/η προγραμμάτων του Ιδρύματος Robert Bosch;"
        required
        options={['Ναι', 'Όχι']}
        value={draft.BoschAlumni}
        onChange={v => set('BoschAlumni', v)}
        error={errors.BoschAlumni}
      />
      {draft.BoschAlumni === 'Ναι' && (
        <TextAreaField
          id="BoschPrograms"
          label="Σε ποιο/α πρόγραμμα/προγράμματα συμμετείχατε;"
          required rows={2}
          value={draft.BoschPrograms}
          onChange={v => set('BoschPrograms', v)}
          error={errors.BoschPrograms}
        />
      )}
      <RadioGroup
        name="StartFellow"
        label="Είστε START Fellow;"
        required
        options={['Ναι', 'Όχι']}
        value={draft.StartFellow}
        onChange={v => set('StartFellow', v)}
        error={errors.StartFellow}
      />

      <TextAreaField
        id="Experience"
        label="Παραθέστε πληροφορίες σχετικά με την εμπειρία σας στην κοινωνικοπολιτιστική καινοτομία"
        required rows={6}
        value={draft.Experience}
        onChange={v => set('Experience', v)}
        error={errors.Experience}
        hint="Όνομα έργου, σύντομη περιγραφή, ο ρόλος σας και ό,τι άλλο κρίνετε απαραίτητο για να αξιολογηθεί η αίτησή σας θετικά σε σχέση με την εμπλοκή σας στον χώρο του κοινωνικού πολιτισμού."
      />

      {/* Fields of activity — the SAME taxonomy the members-page filters use */}
      <div>
        <FieldLabel required>Ποιο/α είναι το/α Πεδίο/α Δραστηριότητάς σας;</FieldLabel>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          Με αυτά θα σε βρίσκουν τα μέλη και οι επισκέπτες στα φίλτρα του καταλόγου.
        </p>
        <FieldsOfWorkSelector value={draft.FieldsOfActivity} onChange={v => set('FieldsOfActivity', v)} />
        <FieldError message={errors.FieldsOfActivity} />
      </div>

      <CheckboxGroup
        label="Η Εφαρμογή των Δράσεών σας με ποιον τρόπο γίνεται;"
        required
        options={ACTION_FORMATS}
        values={draft.ActionFormats}
        onChange={v => set('ActionFormats', v)}
        error={errors.ActionFormats}
      />
      <CheckboxGroup
        label="Ποιες είναι οι Ομάδες Κοινού στις οποίες απευθύνονται οι δράσεις σας;"
        required
        options={AUDIENCE_GROUPS}
        values={draft.AudienceGroups}
        onChange={v => set('AudienceGroups', v)}
        error={errors.AudienceGroups}
      />
      <CheckboxGroup
        label="Σε ποιες θεματικές δραστηριοποιείστε;"
        required
        options={THEMES}
        values={draft.Themes}
        onChange={v => set('Themes', v)}
        error={errors.Themes}
      />
    </div>
  )
}
