import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, Users, PiggyBank, ArrowRight, Copy, RefreshCw, Loader2 } from 'lucide-react'
import { budgetApi } from '@/lib/api'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

interface PreviousBudgetInfo {
  _id: string
  month: number
  year: number
  totalBudget: number
}

interface BudgetProgressProps {
  spent: number
  budget: number
  hasBudget?: boolean
  familyMode?: boolean
  previousBudget?: PreviousBudgetInfo | null
}

export const BudgetProgress: React.FC<BudgetProgressProps> = ({
  spent,
  budget,
  hasBudget = true,
  familyMode = false,
  previousBudget = null,
}) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Copy previous budget mutation
  const copyPreviousMutation = useMutation({
    mutationFn: budgetApi.copyFromPrevious,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-progress'] })
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      queryClient.invalidateQueries({ queryKey: ['current-budget'] })
      queryClient.invalidateQueries({ queryKey: ['budget-overview'] })
      toast.success(t('budget.budgetSet'))
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('budget.budgetFailed'))
    },
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Show setup prompt if no budget is set
  if (!hasBudget || budget === 0) {
    // If there's a previous budget, show continuation option
    if (previousBudget) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      
      return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">{t('dashboard.monthlyBudget')}</h3>
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">{t('dashboard.newMonth')}</span>
          </div>
          <div className="text-center py-3">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
              <RefreshCw className="w-6 h-6 text-amber-600" />
            </div>
            <p className="text-gray-600 mb-1">{t('dashboard.continueLastBudget')}</p>
            <p className="text-sm text-gray-400 mb-1">
              {t('dashboard.lastMonthBudget', { month: monthNames[previousBudget.month - 1], amount: formatCurrency(previousBudget.totalBudget) })}
            </p>
            <p className="text-xs text-gray-400 mb-4">{t('dashboard.budgetSpentSoFar', { amount: formatCurrency(spent) })}</p>
            
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <button
                onClick={() => copyPreviousMutation.mutate()}
                disabled={copyPreviousMutation.isPending}
                className="inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
              >
                {copyPreviousMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {t('dashboard.continueWith', { amount: formatCurrency(previousBudget.totalBudget) })}
              </button>
              <button
                onClick={() => navigate('/budget')}
                className="inline-flex items-center justify-center gap-2 text-gray-600 hover:text-gray-800 border border-gray-200 hover:border-gray-300 font-medium text-sm px-4 py-2 rounded-lg transition-colors"
              >
                {t('dashboard.setNewBudget')}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )
    }

    // First time - no previous budget
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">{t('dashboard.monthlyBudget')}</h3>
        </div>
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-3">
            <PiggyBank className="w-6 h-6 text-primary-600" />
          </div>
          <p className="text-gray-600 mb-1">{t('dashboard.noBudgetDesc')}</p>
          <p className="text-sm text-gray-400 mb-4">{t('dashboard.budgetSpentSoFar', { amount: `${t('currency.symbol')}${spent.toLocaleString('en-IN')}` })}</p>
          <button
            onClick={() => navigate('/budget')}
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium text-sm"
          >
            {t('dashboard.setUpBudget')}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

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
          <h3 className="font-semibold text-gray-900">{t('dashboard.monthlyBudget')}</h3>
          {familyMode && (
            <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-secondary-100 text-secondary-600">
              <Users className="w-3 h-3" />
              {t('nav.family')}
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
          {percentage.toFixed(0)}% {t('dashboard.used')}
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
          <p className="text-xs text-gray-500">{t('dashboard.spent')}</p>
          <p className="text-lg font-bold text-gray-900">
            {t('currency.symbol')}{spent.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">
            {isOverBudget ? t('dashboard.overBudget') : t('dashboard.remaining')}
          </p>
          <p
            className={`text-lg font-bold ${
              isOverBudget ? 'text-red-500' : 'text-green-500'
            }`}
          >
            {isOverBudget ? '+' : ''}{t('currency.symbol')}{Math.abs(remaining).toLocaleString('en-IN')}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">{t('dashboard.budget')}</p>
          <p className="text-lg font-bold text-gray-900">
            {t('currency.symbol')}{budget.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Warning message if over 80% */}
      {percentage >= 80 && !isOverBudget && (
        <div className="mt-4 p-3 rounded-xl bg-orange-50 border border-orange-100">
          <p className="text-sm text-orange-700">
            {t('dashboard.budgetWarning', { percentage: percentage.toFixed(0) })}
          </p>
        </div>
      )}

      {isOverBudget && (
        <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-100">
          <p className="text-sm text-red-700">
            {t('dashboard.budgetExceeded', { amount: `${t('currency.symbol')}${Math.abs(remaining).toLocaleString('en-IN')}` })}
          </p>
        </div>
      )}
    </div>
  )
}

export default BudgetProgress
