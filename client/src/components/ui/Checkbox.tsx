import React from 'react'
import { Check } from 'lucide-react'

interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: React.ReactNode
  className?: string
  disabled?: boolean
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  label,
  className = '',
  disabled = false,
}) => {
  return (
    <label
      className={`flex items-start gap-3 cursor-pointer select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      <div
        role="checkbox"
        aria-checked={checked}
        tabIndex={0}
        onClick={() => !disabled && onChange(!checked)}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault()
            !disabled && onChange(!checked)
          }
        }}
        className={`
          w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0 mt-0.5
          ${
            checked
              ? 'bg-primary-500 border-primary-500'
              : 'border-gray-300 bg-white hover:border-primary-400'
          }
          ${disabled ? '' : 'cursor-pointer'}
        `}
      >
        {checked && <Check size={14} className="text-white" strokeWidth={3} />}
      </div>
      {label && <span className="text-sm text-gray-600 leading-relaxed">{label}</span>}
    </label>
  )
}

export default Checkbox
