'use client'

import { ReactNode } from 'react'

// Small styled primitives shared by the /apply steps — keeps the step files
// readable and the styling consistent with the rest of the site.

export function FieldLabel({ children, required, htmlFor }: { children: ReactNode; required?: boolean; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block font-medium text-charcoal dark:text-gray-200 mb-1.5">
      {children}
      {required && <span className="text-coral dark:text-coral-light ml-0.5">*</span>}
    </label>
  )
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-sm text-red-600 dark:text-red-400 mt-1" role="alert">{message}</p>
}

export function FieldHint({ children }: { children: ReactNode }) {
  return <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{children}</p>
}

const inputCls =
  'w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-charcoal dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent transition-colors'

export function TextField({
  id, label, value, onChange, required, error, hint, type = 'text', placeholder, inputMode, maxLength,
}: {
  id: string; label: ReactNode; value: string; onChange: (v: string) => void
  required?: boolean; error?: string; hint?: ReactNode; type?: string; placeholder?: string
  inputMode?: 'text' | 'tel' | 'email' | 'numeric' | 'url'; maxLength?: number
}) {
  return (
    <div>
      <FieldLabel htmlFor={id} required={required}>{label}</FieldLabel>
      <input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        aria-invalid={!!error}
        className={`${inputCls} ${error ? 'border-red-500 dark:border-red-400' : ''}`}
      />
      {hint && <FieldHint>{hint}</FieldHint>}
      <FieldError message={error} />
    </div>
  )
}

export function TextAreaField({
  id, label, value, onChange, required, error, hint, rows = 4, counter,
}: {
  id: string; label: ReactNode; value: string; onChange: (v: string) => void
  required?: boolean; error?: string; hint?: ReactNode; rows?: number
  counter?: { current: number; max: number; unit: string }
}) {
  return (
    <div>
      <FieldLabel htmlFor={id} required={required}>{label}</FieldLabel>
      <textarea
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        aria-invalid={!!error}
        className={`${inputCls} resize-y ${error ? 'border-red-500 dark:border-red-400' : ''}`}
      />
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {hint && <FieldHint>{hint}</FieldHint>}
          <FieldError message={error} />
        </div>
        {counter && (
          <span className={`text-xs mt-1 whitespace-nowrap ${counter.current > counter.max ? 'text-red-600 dark:text-red-400 font-bold' : 'text-gray-400 dark:text-gray-500'}`}>
            {counter.current}/{counter.max} {counter.unit}
          </span>
        )}
      </div>
    </div>
  )
}

export function SelectField({
  id, label, value, onChange, options, required, error, placeholder = 'Επίλεξε…',
}: {
  id: string; label: ReactNode; value: string; onChange: (v: string) => void
  options: string[]; required?: boolean; error?: string; placeholder?: string
}) {
  return (
    <div>
      <FieldLabel htmlFor={id} required={required}>{label}</FieldLabel>
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-invalid={!!error}
        className={`${inputCls} ${error ? 'border-red-500 dark:border-red-400' : ''}`}
      >
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <FieldError message={error} />
    </div>
  )
}

export function RadioGroup({
  label, value, onChange, options, required, error, name,
}: {
  label: ReactNode; value: string; onChange: (v: string) => void
  options: string[]; required?: boolean; error?: string; name: string
}) {
  return (
    <fieldset>
      <legend className="font-medium text-charcoal dark:text-gray-200 mb-2">
        {label}
        {required && <span className="text-coral dark:text-coral-light ml-0.5">*</span>}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map(o => (
          <label
            key={o}
            className={`px-4 py-2 rounded-full border cursor-pointer text-sm transition-colors ${
              value === o
                ? 'bg-coral text-white border-coral font-medium'
                : 'border-gray-300 dark:border-gray-600 text-charcoal dark:text-gray-200 hover:border-coral dark:hover:border-coral-light'
            }`}
          >
            <input
              type="radio"
              name={name}
              value={o}
              checked={value === o}
              onChange={() => onChange(o)}
              className="sr-only"
            />
            {o}
          </label>
        ))}
      </div>
      <FieldError message={error} />
    </fieldset>
  )
}

export function CheckboxGroup({
  label, values, onChange, options, required, error, hint, columns = 2,
}: {
  label: ReactNode; values: string[]; onChange: (v: string[]) => void
  options: string[]; required?: boolean; error?: string; hint?: ReactNode; columns?: 1 | 2
}) {
  function toggle(o: string) {
    onChange(values.includes(o) ? values.filter(v => v !== o) : [...values, o])
  }
  return (
    <fieldset>
      <legend className="font-medium text-charcoal dark:text-gray-200 mb-2">
        {label}
        {required && <span className="text-coral dark:text-coral-light ml-0.5">*</span>}
      </legend>
      {hint && <div className="-mt-1 mb-2"><FieldHint>{hint}</FieldHint></div>}
      <div className={`grid gap-1.5 ${columns === 2 ? 'sm:grid-cols-2' : ''}`}>
        {options.map(o => (
          <label
            key={o}
            className={`flex items-start gap-2.5 px-3 py-2 rounded-xl border cursor-pointer text-sm transition-colors ${
              values.includes(o)
                ? 'bg-coral/10 dark:bg-coral/20 border-coral text-charcoal dark:text-gray-100'
                : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-coral/60'
            }`}
          >
            <input
              type="checkbox"
              checked={values.includes(o)}
              onChange={() => toggle(o)}
              className="accent-[#FF8B6A] mt-0.5 flex-shrink-0"
            />
            <span>{o}</span>
          </label>
        ))}
      </div>
      <FieldError message={error} />
    </fieldset>
  )
}
