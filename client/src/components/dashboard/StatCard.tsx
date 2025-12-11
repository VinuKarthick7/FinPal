import React from 'react'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string
  subtitle?: string
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  color: 'primary' | 'secondary' | 'accent' | 'green' | 'red'
  className?: string
}

const colorClasses = {
  primary: {
    bg: 'bg-primary-50',
    icon: 'bg-primary-100 text-primary-600',
    trend: 'text-primary-600',
  },
  secondary: {
    bg: 'bg-secondary-50',
    icon: 'bg-secondary-100 text-secondary-600',
    trend: 'text-secondary-600',
  },
  accent: {
    bg: 'bg-accent-50',
    icon: 'bg-accent-100 text-accent-600',
    trend: 'text-accent-600',
  },
  green: {
    bg: 'bg-green-50',
    icon: 'bg-green-100 text-green-600',
    trend: 'text-green-600',
  },
  red: {
    bg: 'bg-red-50',
    icon: 'bg-red-100 text-red-600',
    trend: 'text-red-600',
  },
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color,
  className = '',
}) => {
  const colors = colorClasses[color]

  return (
    <div className={`bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${colors.icon} flex items-center justify-center`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
              trend.isPositive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
            }`}
          >
            <span>{trend.isPositive ? '↑' : '↓'}</span>
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
      <p className="text-xs sm:text-sm text-gray-500 mb-1">{title}</p>
      <p className="text-xl sm:text-2xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  )
}

interface QuickActionProps {
  icon: LucideIcon
  label: string
  onClick: () => void
  color: 'primary' | 'secondary' | 'accent'
}

const actionColors = {
  primary: 'bg-primary-500 hover:bg-primary-600',
  secondary: 'bg-secondary-500 hover:bg-secondary-600',
  accent: 'bg-accent-500 hover:bg-accent-600',
}

export const QuickAction: React.FC<QuickActionProps> = ({
  icon: Icon,
  label,
  onClick,
  color,
}) => {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-2xl ${actionColors[color]} text-white transition-all duration-200 active:scale-95`}
    >
      <Icon className="w-6 h-6" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  )
}

export default StatCard
