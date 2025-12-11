import React, { useState, forwardRef } from 'react'
import { Eye, EyeOff, LucideIcon } from 'lucide-react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: LucideIcon
  rightIcon?: LucideIcon
  onRightIconClick?: () => void
  containerClassName?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      onRightIconClick,
      containerClassName = '',
      className = '',
      type,
      required,
      disabled,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false)
    const [isFocused, setIsFocused] = useState(false)

    const isPassword = type === 'password'
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

    return (
      <div className={`mb-4 ${containerClassName}`}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {LeftIcon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <LeftIcon
                size={20}
                className={`transition-colors ${
                  isFocused ? 'text-primary-500' : ''
                }`}
              />
            </div>
          )}

          <input
            ref={ref}
            type={inputType}
            disabled={disabled}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`
              w-full px-4 py-3.5 rounded-xl border bg-white text-gray-900 
              placeholder-gray-400 transition-all duration-200
              focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none
              disabled:bg-gray-100 disabled:cursor-not-allowed
              ${LeftIcon ? 'pl-12' : ''}
              ${isPassword || RightIcon ? 'pr-12' : ''}
              ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-200'}
              ${className}
            `}
            {...props}
          />

          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          )}

          {RightIcon && !isPassword && (
            <button
              type="button"
              onClick={onRightIconClick}
              disabled={!onRightIconClick}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
              tabIndex={-1}
            >
              <RightIcon size={20} />
            </button>
          )}
        </div>

        {(error || hint) && (
          <p
            className={`text-sm mt-1.5 ${
              error ? 'text-red-500' : 'text-gray-500'
            }`}
          >
            {error || hint}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
