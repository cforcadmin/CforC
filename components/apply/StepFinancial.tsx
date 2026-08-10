'use client'

import { TextField, RadioGroup, FieldError } from './FormControls'
import { DOC_LINKS } from './applyData'
import type { ApplicationDraft, DraftErrors } from './applyTypes'

interface StepProps {
  draft: ApplicationDraft
  set: <K extends keyof ApplicationDraft>(key: K, value: ApplicationDraft[K]) => void
  errors: DraftErrors
}

export default function StepFinancial({ draft, set, errors }: StepProps) {
  const isPerson = draft.ReceiptType === 'Φυσικό πρόσωπο'

  return (
    <div className="space-y-6">
      <p className="text-gray-600 dark:text-gray-300">
        Τα παρακάτω χρειάζονται αποκλειστικά για την έκδοση της απόδειξης
        συνδρομής σου — δεν δημοσιεύονται πουθενά.
      </p>

      <RadioGroup
        name="ReceiptType"
        label="Η απόδειξη να εκδίδεται σε:"
        required
        options={['Φυσικό πρόσωπο', 'Εταιρεία']}
        value={draft.ReceiptType}
        onChange={v => set('ReceiptType', v)}
      />

      {isPerson ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4">
          Για φυσικά πρόσωπα δεν χρειάζονται επιπλέον στοιχεία — η απόδειξη
          εκδίδεται με τα στοιχεία που έχεις ήδη συμπληρώσει.
        </p>
      ) : (
        <div className="space-y-4">
          <TextField id="CompanyName" label="Επωνυμία εταιρείας" required value={draft.CompanyName} onChange={v => set('CompanyName', v)} error={errors.CompanyName} />
          <div className="grid sm:grid-cols-2 gap-4">
            <TextField id="CompanyAddress" label="Διεύθυνση εταιρείας" required value={draft.CompanyAddress} onChange={v => set('CompanyAddress', v)} error={errors.CompanyAddress} />
            <TextField
              id="CompanyTaxId" label="ΑΦΜ εταιρείας" required inputMode="numeric" maxLength={9}
              value={draft.CompanyTaxId}
              onChange={v => set('CompanyTaxId', v.replace(/\D/g, ''))}
              error={errors.CompanyTaxId}
              hint="Ακριβώς 9 ψηφία"
            />
          </div>
        </div>
      )}

      {/* Newsletter */}
      <label className="flex items-start gap-3 p-4 rounded-2xl border border-gray-200 dark:border-gray-600 cursor-pointer hover:border-coral/60 transition-colors">
        <input
          type="checkbox"
          checked={draft.NewsletterOptIn}
          onChange={e => set('NewsletterOptIn', e.target.checked)}
          className="accent-[#FF8B6A] mt-1"
        />
        <span className="text-gray-700 dark:text-gray-300 text-sm">
          Θέλω να λαμβάνω το newsletter του Culture for Change
        </span>
      </label>

      {/* Required acceptances */}
      <div className="space-y-3">
        <ConsentBox
          checked={draft.AcceptStatute}
          onChange={v => set('AcceptStatute', v)}
          error={errors.AcceptStatute}
        >
          Δηλώνω πως έχω διαβάσει και αποδέχομαι το{' '}
          <a href={DOC_LINKS.statute} target="_blank" rel="noopener noreferrer" className="text-coral dark:text-coral-light font-medium hover:underline">Καταστατικό</a>
        </ConsentBox>
        <ConsentBox
          checked={draft.AcceptRegulation}
          onChange={v => set('AcceptRegulation', v)}
          error={errors.AcceptRegulation}
        >
          Έχω διαβάσει και αποδέχομαι τον{' '}
          <a href={DOC_LINKS.regulation} target="_blank" rel="noopener noreferrer" className="text-coral dark:text-coral-light font-medium hover:underline">Εσωτερικό Κανονισμό</a>
        </ConsentBox>
        <ConsentBox
          checked={draft.AcceptPrivacy}
          onChange={v => set('AcceptPrivacy', v)}
          error={errors.AcceptPrivacy}
        >
          Έχω διαβάσει και αποδέχομαι τους{' '}
          <a href={DOC_LINKS.terms} target="_blank" rel="noopener noreferrer" className="text-coral dark:text-coral-light font-medium hover:underline">Όρους &amp; Προϋποθέσεις</a>{' '}
          και την{' '}
          <a href={DOC_LINKS.privacy} target="_blank" rel="noopener noreferrer" className="text-coral dark:text-coral-light font-medium hover:underline">Πολιτική Απορρήτου</a>
        </ConsentBox>
      </div>
    </div>
  )
}

function ConsentBox({
  checked, onChange, error, children,
}: {
  checked: boolean; onChange: (v: boolean) => void; error?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${
        error ? 'border-red-400' : checked ? 'border-coral bg-coral/5 dark:bg-coral/10' : 'border-gray-200 dark:border-gray-600 hover:border-coral/60'
      }`}>
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          className="accent-[#FF8B6A] mt-1"
        />
        <span className="text-gray-700 dark:text-gray-300 text-sm">
          {children} <span className="text-coral dark:text-coral-light">*</span>
        </span>
      </label>
      <FieldError message={error} />
    </div>
  )
}
