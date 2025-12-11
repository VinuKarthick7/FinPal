import React from 'react'
import { TrendingUp, TrendingDown, Users } from 'lucide-react'

interface BudgetProgressProps {
  spent: number
  budget: number
  familyMode?: boolean
}

export const BudgetProgress: React.FC<BudgetProgressProps> = ({
  spent,
  budget,
  familyMode = false,
}) => {
  const percentage = Math.min((spent / budget) * 100, 100)
  const remaining = budget - spent
  const isOverBudget = spent > budget

  const getProgressColor = () => {
    if (percentage >= 100) return 'bg-red-500'
    if (percentage >= 80) return 'bg-orange-500'
    if (percentage >= 60) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">Monthly Budget</h3>
          {familyMode && (
            <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-secondary-100 text-secondary-600">
              <Users className="w-3 h-3" />
              Family
            </span>
          )}
        </div>
        <span
          className={`flex items-center gap-1 text-sm font-medium ${
            isOverBudget ? 'text-red-500' : 'text-green-500'
          }`}
        >
          {isOverBudget ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          {percentage.toFixed(0)}% used
        </span>
      </div>

      {/* Progress Bar */}
      <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden mb-4">
        <div
          className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${getProgressColor()}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
        {/* Budget line marker at 100% */}
        <div className="absolute right-0 top-0 h-full w-0.5 bg-gray-300" />
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">Spent</p>
          <p className="text-lg font-bold text-gray-900">
            ₹{spent.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">
            {isOverBudget ? 'Over Budget' : 'Remaining'}
          </p>
          <p
            className={`text-lg font-bold ${
              isOverBudget ? 'text-red-500' : 'text-green-500'
            }`}
          >
            {isOverBudget ? '+' : ''}₹{Math.abs(remaining).toLocaleString('en-IN')}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Budget</p>
          <p className="text-lg font-bold text-gray-900">
            ₹{budget.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Warning message if over 80% */}
      {percentage >= 80 && !isOverBudget && (
        <div className="mt-4 p-3 rounded-xl bg-orange-50 border border-orange-100">
          <p className="text-sm text-orange-700">
            ⚠️ You've used {percentage.toFixed(0)}% of your monthly budget. Consider reducing expenses.
          </p>
        </div>
      )}

      {isOverBudget && (
        <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-100">
          <p className="text-sm text-red-700">
            🚨 You've exceeded your monthly budget by ₹{Math.abs(remaining).toLocaleString('en-IN')}!
          </p>
        </div>
      )}
    </div>
  )
}

export default BudgetProgress
