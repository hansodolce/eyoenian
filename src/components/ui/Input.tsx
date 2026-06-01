import { cn } from '@/utils'

interface InputProps {
  label?: string
  error?: string
  type?: string
  placeholder?: string
  value?: string | number
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  className?: string
  required?: boolean
  disabled?: boolean
  name?: string
  maxLength?: number
  min?: number
  max?: number
}

export function Input({ label, error, type = 'text', placeholder, value, onChange, className, required, disabled, name, maxLength, min, max }: InputProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-secondary-700">
          {label} {required && <span className="text-error">*</span>}
        </label>
      )}
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        maxLength={maxLength}
        min={min}
        max={max}
        className={cn(
          'w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-colors placeholder:text-secondary-400 disabled:bg-secondary-50 disabled:text-secondary-400',
          error ? 'border-error focus:ring-error' : 'border-secondary-300 focus:ring-primary-500',
          className
        )}
      />
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  )
}

interface SelectProps {
  label?: string
  error?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
  options: { value: string; label: string }[]
  placeholder?: string
  className?: string
  required?: boolean
  name?: string
}

export function Select({ label, error, value, onChange, options, placeholder, className, required, name }: SelectProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-secondary-700">
          {label} {required && <span className="text-error">*</span>}
        </label>
      )}
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className={cn(
          'w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-colors',
          error ? 'border-error focus:ring-error' : 'border-secondary-300 focus:ring-primary-500',
          className
        )}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  )
}
