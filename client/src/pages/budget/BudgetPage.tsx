import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  PiggyBank,
  Plus,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
  Edit2,
  Trash2,
  X,
  Loader2,
  Target,
  DollarSign,
  PieChart,
} from 'lucide-react'
import { Button } from '@/components/ui'
import { budgetApi } from '@/lib/api'
import toast from 'react-hot-toast'

interface CategoryBudget {
  category: string
  amount: number
  spent: number
  color: string
}

interface Budget {
  _id: string
  month: number
  year: number
  totalBudget: number
  totalSpent: number
  categoryBudgets: CategoryBudget[]
  alertThreshold: number
}

interface BudgetOverview {
  hasBudget: boolean
  totalBudget: number
  totalSpent: number
  remaining: number
  percentage: number
  dailyAverage: number
  projectedTotal: number
  daysRemaining: number
  isOverBudget: boolean
  overBudgetCategories: string[]
  alertThreshold: number
}

const CATEGORY_OPTIONS = [
  { value: 'Food & Dining', color: '#F97316', emoji: '🍔' },
  { value: 'Transportation', color: '#3B82F6', emoji: '🚗' },
  { value: 'Shopping', color: '#EC4899', emoji: '🛍️' },
  { value: 'Entertainment', color: '#8B5CF6', emoji: '🎬' },
  { value: 'Bills & Utilities', color: '#EF4444', emoji: '💡' },
  { value: 'Healthcare', color: '#10B981', emoji: '🏥' },
  { value: 'Education', color: '#6366F1', emoji: '📚' },
  { value: 'Travel', color: '#14B8A6', emoji: '✈️' },
  { value: 'Groceries', color: '#84CC16', emoji: '🛒' },
  { value: 'Other', color: '#6B7280', emoji: '📦' },
]

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export const BudgetPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  // Form state
  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())
  const [totalBudget, setTotalBudget] = useState('')
  const [alertThreshold, setAlertThreshold] = useState(80)
  const [categoryBudgets, setCategoryBudgets] = useState<Array<{
    category: string
    amount: string
    color: string
  }>>([])

  // Fetch current budget
  const { data: currentBudgetData, isLoading: currentLoading } = useQuery({
    queryKey: ['current-budget'],
    queryFn: async () => {
      const response = await budgetApi.getCurrent()
      return response.data.budget as Budget | null
    },
  })

  // Fetch budget overview
  const { data: overviewData, isLoading: overviewLoading } = useQuery({
    queryKey: ['budget-overview'],
    queryFn: async () => {
      const response = await budgetApi.getOverview()
      return response.data as BudgetOverview
    },
  })

  // Fetch all budgets
  const { data: budgetsData, isLoading: budgetsLoading } = useQuery({
    queryKey: ['budgets'],
    queryFn: async () => {
      const response = await budgetApi.getAll()
      return response.data.budgets as Budget[]
    },
  })

  // Create budget mutation
  const createMutation = useMutation({
    mutationFn: budgetApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      queryClient.invalidateQueries({ queryKey: ['current-budget'] })
      queryClient.invalidateQueries({ queryKey: ['budget-overview'] })
      toast.success('Budget created successfully!')
      closeModal()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create budget')
    },
  })

  // Update budget mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => budgetApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      queryClient.invalidateQueries({ queryKey: ['current-budget'] })
      queryClient.invalidateQueries({ queryKey: ['budget-overview'] })
      toast.success('Budget updated successfully!')
      closeModal()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update budget')
    },
  })

  // Delete budget mutation
  const deleteMutation = useMutation({
    mutationFn: budgetApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      queryClient.invalidateQueries({ queryKey: ['current-budget'] })
      queryClient.invalidateQueries({ queryKey: ['budget-overview'] })
      toast.success('Budget deleted successfully!')
      setShowDeleteConfirm(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete budget')
    },
  })

  const closeModal = () => {
    setShowModal(false)
    setEditingBudget(null)
    setTotalBudget('')
    setAlertThreshold(80)
    setCategoryBudgets([])
    setSelectedMonth(currentDate.getMonth() + 1)
    setSelectedYear(currentDate.getFullYear())
  }

  const openEditModal = (budget: Budget) => {
    setEditingBudget(budget)
    setSelectedMonth(budget.month)
    setSelectedYear(budget.year)
    setTotalBudget(budget.totalBudget.toString())
    setAlertThreshold(budget.alertThreshold)
    setCategoryBudgets(
      budget.categoryBudgets.map((cb) => ({
        category: cb.category,
        amount: cb.amount.toString(),
        color: cb.color,
      }))
    )
    setShowModal(true)
  }

  const addCategoryBudget = () => {
    setCategoryBudgets([
      ...categoryBudgets,
      { category: '', amount: '', color: '#6366F1' },
    ])
  }

  const removeCategoryBudget = (index: number) => {
    setCategoryBudgets(categoryBudgets.filter((_, i) => i !== index))
  }

  const updateCategoryBudget = (index: number, field: string, value: string) => {
    const updated = [...categoryBudgets]
    if (field === 'category') {
      const option = CATEGORY_OPTIONS.find((o) => o.value === value)
      updated[index] = { ...updated[index], category: value, color: option?.color || '#6366F1' }
    } else {
      updated[index] = { ...updated[index], [field]: value }
    }
    setCategoryBudgets(updated)
  }

  const handleSubmit = () => {
    if (!totalBudget || parseFloat(totalBudget) <= 0) {
      toast.error('Please enter a valid budget amount')
      return
    }

    const data = {
      month: selectedMonth,
      year: selectedYear,
      totalBudget: parseFloat(totalBudget),
      categoryBudgets: categoryBudgets
        .filter((cb) => cb.category && cb.amount)
        .map((cb) => ({
          category: cb.category,
          amount: parseFloat(cb.amount),
          color: cb.color,
        })),
      alertThreshold,
    }

    if (editingBudget) {
      updateMutation.mutate({ id: editingBudget._id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getProgressColor = (percentage: number, threshold: number) => {
    if (percentage >= 100) return 'bg-red-500'
    if (percentage >= threshold) return 'bg-amber-500'
    return 'bg-primary-500'
  }

  const isLoading = currentLoading || overviewLoading || budgetsLoading

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budget</h1>
          <p className="mt-1 text-sm text-gray-500">
            Set and track your monthly spending limits
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Set Budget
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : !overviewData?.hasBudget ? (
        /* Empty State */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-200 p-12 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
            <PiggyBank className="w-8 h-8 text-primary-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Budget Set</h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            Create a budget to start tracking your spending and stay on top of your finances.
          </p>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Budget
          </Button>
        </motion.div>
      ) : (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Budget */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-gray-200 p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                  <Target className="w-5 h-5 text-primary-600" />
                </div>
                <span className="text-sm text-gray-500">Monthly Budget</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(overviewData.totalBudget)}
              </p>
            </motion.div>

            {/* Spent */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl border border-gray-200 p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
                <span className="text-sm text-gray-500">Spent</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(overviewData.totalSpent)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {overviewData.percentage.toFixed(1)}% of budget
              </p>
            </motion.div>

            {/* Remaining */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl border border-gray-200 p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  overviewData.isOverBudget ? 'bg-red-100' : 'bg-green-100'
                }`}>
                  {overviewData.isOverBudget ? (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  ) : (
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  )}
                </div>
                <span className="text-sm text-gray-500">Remaining</span>
              </div>
              <p className={`text-2xl font-bold ${
                overviewData.isOverBudget ? 'text-red-600' : 'text-green-600'
              }`}>
                {formatCurrency(Math.abs(overviewData.remaining))}
                {overviewData.isOverBudget && ' over'}
              </p>
            </motion.div>

            {/* Daily Average */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl border border-gray-200 p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-amber-600" />
                </div>
                <span className="text-sm text-gray-500">Daily Average</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(overviewData.dailyAverage)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {overviewData.daysRemaining} days left
              </p>
            </motion.div>
          </div>

          {/* Progress Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Budget Progress</h3>
              <span className={`text-sm font-medium ${
                overviewData.percentage >= 100
                  ? 'text-red-600'
                  : overviewData.percentage >= overviewData.alertThreshold
                  ? 'text-amber-600'
                  : 'text-primary-600'
              }`}>
                {overviewData.percentage.toFixed(1)}%
              </span>
            </div>
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(overviewData.percentage, 100)}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={`h-full rounded-full ${getProgressColor(overviewData.percentage, overviewData.alertThreshold)}`}
              />
            </div>
            <div className="flex justify-between mt-2 text-sm text-gray-500">
              <span>{formatCurrency(overviewData.totalSpent)} spent</span>
              <span>{formatCurrency(overviewData.totalBudget)} budget</span>
            </div>

            {/* Projected spending alert */}
            {overviewData.projectedTotal > overviewData.totalBudget && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    Projected overspending
                  </p>
                  <p className="text-sm text-amber-700">
                    At your current rate, you'll spend {formatCurrency(overviewData.projectedTotal)} by month end.
                  </p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Category Budgets */}
          {currentBudgetData && currentBudgetData.categoryBudgets.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-xl border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Category Budgets</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditModal(currentBudgetData)}
                >
                  <Edit2 className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </div>

              <div className="space-y-4">
                {currentBudgetData.categoryBudgets.map((cb, index) => {
                  const percentage = cb.amount > 0 ? (cb.spent / cb.amount) * 100 : 0
                  const categoryOption = CATEGORY_OPTIONS.find((o) => o.value === cb.category)

                  return (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{categoryOption?.emoji || '📦'}</span>
                          <span className="font-medium text-gray-900">{cb.category}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm text-gray-600">
                            {formatCurrency(cb.spent)} / {formatCurrency(cb.amount)}
                          </span>
                          <span className={`ml-2 text-sm font-medium ${
                            percentage >= 100 ? 'text-red-600' : percentage >= 80 ? 'text-amber-600' : 'text-gray-500'
                          }`}>
                            ({percentage.toFixed(0)}%)
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          style={{
                            width: `${Math.min(percentage, 100)}%`,
                            backgroundColor: percentage >= 100 ? '#EF4444' : cb.color,
                          }}
                          className="h-full rounded-full transition-all duration-500"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* Budget History */}
          {budgetsData && budgetsData.length > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white rounded-xl border border-gray-200 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget History</h3>
              <div className="space-y-3">
                {budgetsData.slice(1).map((budget) => {
                  const percentage = budget.totalBudget > 0 
                    ? (budget.totalSpent / budget.totalBudget) * 100 
                    : 0

                  return (
                    <div
                      key={budget._id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {MONTHS[budget.month - 1]} {budget.year}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatCurrency(budget.totalSpent)} of {formatCurrency(budget.totalBudget)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-medium ${
                          percentage >= 100 ? 'text-red-600' : percentage >= 80 ? 'text-amber-600' : 'text-green-600'
                        }`}>
                          {percentage.toFixed(0)}%
                        </span>
                        <button
                          onClick={() => openEditModal(budget)}
                          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(budget._id)}
                          className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* Create/Edit Budget Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingBudget ? 'Edit Budget' : 'Set Budget'}
                  </h2>
                  <button
                    onClick={closeModal}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Month/Year Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Month
                    </label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                      disabled={!!editingBudget}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
                    >
                      {MONTHS.map((month, index) => (
                        <option key={month} value={index + 1}>
                          {month}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Year
                    </label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      disabled={!!editingBudget}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
                    >
                      {[currentDate.getFullYear() - 1, currentDate.getFullYear(), currentDate.getFullYear() + 1].map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Total Budget */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Monthly Budget
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                    <input
                      type="number"
                      value={totalBudget}
                      onChange={(e) => setTotalBudget(e.target.value)}
                      placeholder="50000"
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                {/* Alert Threshold */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alert Threshold ({alertThreshold}%)
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={alertThreshold}
                    onChange={(e) => setAlertThreshold(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Get warned when spending reaches {alertThreshold}% of budget
                  </p>
                </div>

                {/* Category Budgets */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Category Budgets (Optional)
                    </label>
                    <button
                      onClick={addCategoryBudget}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      + Add Category
                    </button>
                  </div>

                  <div className="space-y-3">
                    {categoryBudgets.map((cb, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <select
                          value={cb.category}
                          onChange={(e) => updateCategoryBudget(index, 'category', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="">Select category</option>
                          {CATEGORY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.emoji} {opt.value}
                            </option>
                          ))}
                        </select>
                        <div className="relative w-32">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                          <input
                            type="number"
                            value={cb.amount}
                            onChange={(e) => updateCategoryBudget(index, 'amount', e.target.value)}
                            placeholder="0"
                            className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                        <button
                          onClick={() => removeCategoryBudget(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={closeModal}>
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingBudget ? 'Update Budget' : 'Create Budget'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDeleteConfirm(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl p-6 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Budget</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>

              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this budget? This will not affect your transactions.
              </p>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowDeleteConfirm(null)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  onClick={() => deleteMutation.mutate(showDeleteConfirm)}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Delete
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default BudgetPage
