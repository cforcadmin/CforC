'use client'

import { TextAreaField, CheckboxGroup } from './FormControls'
import { CHALLENGES } from './applyData'
import type { ApplicationDraft, DraftErrors } from './applyTypes'

interface StepProps {
  draft: ApplicationDraft
  set: <K extends keyof ApplicationDraft>(key: K, value: ApplicationDraft[K]) => void
  errors: DraftErrors
}

export default function StepNeeds({ draft, set, errors }: StepProps) {
  return (
    <div className="space-y-6">
      <p className="text-gray-600 dark:text-gray-300">
        Ένα δίκτυο έχει λόγο ύπαρξης μόνο όταν δημιουργεί αξία για τα μέλη του.
        Αυτή η ενότητα καταγράφει με σαφήνεια τις ανάγκες σου, ώστε να ξέρουμε
        πώς μπορεί το δίκτυο να σου φανεί χρήσιμο.
      </p>

      <CheckboxGroup
        label="Ποιες είναι οι βασικές προκλήσεις που αντιμετωπίζετε ως επαγγελματίας, έτσι ώστε να γίνετε βιώσιμος/η;"
        required
        columns={1}
        options={CHALLENGES}
        values={draft.Challenges}
        onChange={v => set('Challenges', v)}
        error={errors.Challenges}
      />

      <TextAreaField
        id="ProposedSolutions"
        label="Με βάση τις κατηγορίες που επιλέξατε, καταγράψτε τουλάχιστον 2 πιθανές δράσεις/λύσεις για τις προκλήσεις"
        required rows={5}
        value={draft.ProposedSolutions}
        onChange={v => set('ProposedSolutions', v)}
        error={errors.ProposedSolutions}
        hint="Ατομικές ή συλλογικές, άμεσα υλοποιήσιμες ή οραματικές, πρακτικές ή θεωρητικές."
      />

      <TextAreaField
        id="NetworkContribution"
        label="Σε ποιες από τις παραπάνω λύσεις μπορείτε να δείτε τη συμβολή του δικτύου μας στην πραγματοποίησή τους;"
        required rows={5}
        value={draft.NetworkContribution}
        onChange={v => set('NetworkContribution', v)}
        error={errors.NetworkContribution}
      />
    </div>
  )
}
