import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  Store,
  Calendar,
  Loader2,
  Receipt,
  Plus,
  Wallet,
  Bell,
  TrendingUp,
} from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { expensesApi, remindersApi } from '@/lib/api'

interface ExpenseFormData {
  amount: string
  category: string
  merchant: string
  date: string
  type: 'expense' | 'income'
  paymentMethod: string
  notes: string
}

interface ReminderFormData {
  title: string
  amount: string
  dueDate: string
  type: 'bill' | 'loan' | 'subscription'
  recurring: boolean
  recurringPeriod: 'monthly' | 'quarterly' | 'yearly'
  notes: string
}

const categories = [
  { value: 'Food', label: '🍔 Food', color: 'bg-orange-100 text-orange-600' },
  { value: 'Shopping', label: '🛍️ Shopping', color: 'bg-purple-100 text-purple-600' },
  { value: 'Transport', label: '🚗 Transport', color: 'bg-blue-100 text-blue-600' },
  { value: 'Entertainment', label: '🎬 Entertainment', color: 'bg-pink-100 text-pink-600' },
  { value: 'Utilities', label: '💡 Utilities', color: 'bg-yellow-100 text-yellow-600' },
  { value: 'Healthcare', label: '🏥 Healthcare', color: 'bg-teal-100 text-teal-600' },
  { value: 'Education', label: '📚 Education', color: 'bg-indigo-100 text-indigo-600' },
  { value: 'Rent', label: '🏠 Rent', color: 'bg-green-100 text-green-600' },
  { value: 'Salary', label: '💰 Salary', color: 'bg-emerald-100 text-emerald-600' },
  { value: 'Investment', label: '📈 Investment', color: 'bg-cyan-100 text-cyan-600' },
  { value: 'Gift', label: '🎁 Gift', color: 'bg-rose-100 text-rose-600' },
  { value: 'Other', label: '📦 Other', color: 'bg-gray-100 text-gray-600' },
]

const paymentMethods = [
  { value: 'upi', label: 'UPI', icon: '📱' },
  { value: 'card', label: 'Card', icon: '💳' },
  { value: 'cash', label: 'Cash', icon: '💵' },
  { value: 'netbanking', label: 'Bank', icon: '🏦' },
  { value: 'other', label: 'Other', icon: '💰' },
]

const reminderTypes = [
  { value: 'bill', label: '📄 Bill', color: 'bg-blue-100 text-blue-600' },
  { value: 'loan', label: '💳 Loan', color: 'bg-purple-100 text-purple-600' },
  { value: 'subscription', label: '🔄 Subscription', color: 'bg-teal-100 text-teal-600' },
]

type TabType = 'expense' | 'income' | 'reminder'

export const AddExpensePage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  
  // Get initial tab from URL params
  const initialTab = (searchParams.get('tab') as TabType) || 'expense'
  const [activeTab, setActiveTab] = useState<TabType>(initialTab)

  // Update tab when URL param changes
  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabType
    if (tabParam && ['expense', 'income', 'reminder'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  // Expense/Income Form
  const {
    register: registerExpense,
    handleSubmit: handleSubmitExpense,
    watch: watchExpense,
    setValue: setValueExpense,
    formState: { errors: expenseErrors },
    reset: resetExpense,
  } = useForm<ExpenseFormData>({
    defaultValues: {
      type: 'expense',
      paymentMethod: 'upi',
      date: new Date().toISOString().split('T')[0],
    },
  })

  // Reminder Form
  const {
    register: registerReminder,
    handleSubmit: handleSubmitReminder,
    watch: watchReminder,
    setValue: setValueReminder,
    formState: { errors: reminderErrors },
    reset: resetReminder,
  } = useForm<ReminderFormData>({
    defaultValues: {
      type: 'bill',
      recurring: false,
      recurringPeriod: 'monthly',
      dueDate: new Date().toISOString().split('T')[0],
    },
  })

  const selectedCategory = watchExpense('category')
  const selectedPaymentMethod = watchExpense('paymentMethod')
  const selectedReminderType = watchReminder('type')
  const isRecurring = watchReminder('recurring')

  // Expense/Income mutation
  const expenseMutation = useMutation({
    mutationFn: (data: ExpenseFormData) =>
      expensesApi.create({
        amount: parseFloat(data.amount),
        category: data.category,
        merchant: data.merchant,
        date: data.date,
        type: activeTab as 'expense' | 'income',
        paymentMethod: data.paymentMethod,
        notes: data.notes,
      }),
    onSuccess: () => {
      toast.success(`${activeTab === 'expense' ? 'Expense' : 'Income'} added successfully!`)
      // Invalidate common dashboard queries
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['recent-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['category-breakdown'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })

      // Ensure budget pages update
      queryClient.invalidateQueries({ queryKey: ['budget-progress'] })
      queryClient.invalidateQueries({ queryKey: ['budget-overview'] })
      queryClient.invalidateQueries({ queryKey: ['current-budget'] })
      queryClient.invalidateQueries({ queryKey: ['budgets'] })

      // Ensure reports refresh
      queryClient.invalidateQueries({ queryKey: ['reports-monthly'] })
      queryClient.invalidateQueries({ queryKey: ['reports-yearly'] })
      queryClient.invalidateQueries({ queryKey: ['reports-comparison'] })
      queryClient.invalidateQueries({ queryKey: ['reports-trends'] })

      resetExpense()
      navigate('/dashboard')
    },

    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to add transaction'
      toast.error(message)
    },
  })

  // Reminder mutation
  const reminderMutation = useMutation({
    mutationFn: (data: ReminderFormData) =>
      remindersApi.create({
        title: data.title,
        amount: parseFloat(data.amount),
        dueDate: data.dueDate,
        type: data.type,
        recurring: data.recurring,
        recurringPeriod: data.recurring ? data.recurringPeriod : undefined,
        notes: data.notes || undefined,
      }),
    onSuccess: () => {
      toast.success('Reminder added successfully!')
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['upcoming-reminders'] })
      resetReminder()
      navigate('/reminders')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to add reminder'
      toast.error(message)
    },
  })

  const onSubmitExpense = (data: ExpenseFormData) => {
    expenseMutation.mutate(data)
  }

  const onSubmitReminder = (data: ReminderFormData) => {
    reminderMutation.mutate(data)
  }

  const getTabIcon = (tab: TabType) => {
    switch (tab) {
      case 'expense': return <Wallet className="w-4 h-4" />
      case 'income': return <TrendingUp className="w-4 h-4" />
      case 'reminder': return <Bell className="w-4 h-4" />
    }
  }

  const getHeaderGradient = () => {
    switch (activeTab) {
      case 'expense': return 'from-red-500 via-red-600 to-red-700'
      case 'income': return 'from-green-500 via-green-600 to-green-700'
      case 'reminder': return 'from-blue-500 via-blue-600 to-blue-700'
    }
  }

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'expense': return 'Add Expense'
      case 'income': return 'Add Income'
      case 'reminder': return 'Add Reminder'
    }
  }

  const getHeaderSubtitle = () => {
    switch (activeTab) {
      case 'expense': return 'Track your spending'
      case 'income': return 'Record your earnings'
      case 'reminder': return 'Never miss a payment'
    }
  }

  const shouldReduceMotion = useReducedMotion()

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Gradient Header */}
      <div className={`bg-gradient-to-br ${getHeaderGradient()} pt-4 pb-8 px-4`}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-3xl bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">{getHeaderTitle()}</h1>
              <p className="text-white/70 text-sm mt-0.5">{getHeaderSubtitle()}</p>
            </div>
          </div>

          {/* Tab Selector in Header */}
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-1.5">
            <div className="grid grid-cols-3 gap-1">
              {(['expense', 'income', 'reminder'] as TabType[]).map((tab) => (
                <motion.button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.45 }}
                  className={`relative py-3 rounded-3xl font-medium transition-colors flex items-center justify-center gap-2 overflow-hidden ${
                    activeTab === tab ? 'text-gray-900' : 'text-white/80 hover:bg-white/10'
                  }`}
                >
                  {activeTab === tab && (
                    <motion.span
                      layoutId="add-expense-active-tab"
                      className="absolute inset-0 bg-white shadow-sm"
                      style={{ borderRadius: 24 }}
                      transition={
                        shouldReduceMotion
                          ? { duration: 0.01 }
                          : { type: 'spring', stiffness: 420, damping: 32, mass: 0.6 }
                      }
                    />
                  )}
                  <span className="relative z-10 flex items-center justify-center gap-2">
                  {getTabIcon(tab)}
                  <span className="capitalize">{tab}</span>
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 -mt-2">
        <AnimatePresence mode="wait">
          {/* Expense/Income Form */}
          {(activeTab === 'expense' || activeTab === 'income') && (
            <motion.form
              key="expense-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSubmitExpense(onSubmitExpense)}
              className="space-y-4 pt-4"
            >
              {/* Amount */}
              <div className="bg-white rounded-3xl border border-gray-200 p-5">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-gray-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className={`w-full pl-12 pr-4 py-4 text-3xl font-semibold rounded-3xl border-2 transition-colors ${
                      expenseErrors.amount
                        ? 'border-red-300 focus:border-red-500'
                        : 'border-gray-200 focus:border-primary-500'
                    } focus:outline-none`}
                    {...registerExpense('amount', {
                      required: 'Amount is required',
                      min: { value: 0.01, message: 'Amount must be greater than 0' },
                    })}
                  />
                </div>
                {expenseErrors.amount && (
                  <p className="mt-2 text-sm text-red-500">{expenseErrors.amount.message}</p>
                )}
              </div>

              {/* Category */}
              <div className="bg-white rounded-3xl border border-gray-200 p-5">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Category
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {categories
                    .filter((cat) =>
                      activeTab === 'income'
                        ? ['Salary', 'Investment', 'Gift', 'Other'].includes(cat.value)
                        : !['Salary', 'Investment'].includes(cat.value)
                    )
                    .map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setValueExpense('category', cat.value)}
                        className={`p-3 rounded-3xl text-sm font-medium transition-all ${
                          selectedCategory === cat.value
                            ? `${cat.color} ring-2 ring-offset-2 ring-primary-500`
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                </div>
                <input type="hidden" {...registerExpense('category', { required: 'Category is required' })} />
                {expenseErrors.category && (
                  <p className="mt-2 text-sm text-red-500">{expenseErrors.category.message}</p>
                )}
              </div>

              {/* Merchant/Description */}
              <div className="bg-white rounded-3xl border border-gray-200 p-5">
                <Input
                  label="Description"
                  placeholder={activeTab === 'expense' ? 'Where did you spend?' : 'Income source'}
                  leftIcon={Store}
                  error={expenseErrors.merchant?.message}
                  {...registerExpense('merchant', {
                    required: 'Description is required',
                    maxLength: { value: 100, message: 'Max 100 characters' },
                  })}
                />
              </div>

              {/* Date */}
              <div className="bg-white rounded-3xl border border-gray-200 p-5">
                <Input
                  label="Date"
                  type="date"
                  leftIcon={Calendar}
                  error={expenseErrors.date?.message}
                  {...registerExpense('date', { required: 'Date is required' })}
                />
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-3xl border border-gray-200 p-5">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Payment Method
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setValueExpense('paymentMethod', method.value)}
                      className={`p-3 rounded-3xl text-center transition-all ${
                        selectedPaymentMethod === method.value
                          ? 'bg-primary-100 text-primary-600 ring-2 ring-offset-2 ring-primary-500'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-xl block mb-1">{method.icon}</span>
                      <span className="text-xs font-medium">{method.label}</span>
                    </button>
                  ))}
                </div>
                <input type="hidden" {...registerExpense('paymentMethod')} />
              </div>

              {/* Notes */}
              <div className="bg-white rounded-3xl border border-gray-200 p-5">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Notes (optional)
                </label>
                <textarea
                  placeholder="Add any additional notes..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-3xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none transition-all resize-none"
                  {...registerExpense('notes', {
                    maxLength: { value: 500, message: 'Max 500 characters' },
                  })}
                />
                {expenseErrors.notes && (
                  <p className="mt-2 text-sm text-red-500">{expenseErrors.notes.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2 pb-4">
                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  loading={expenseMutation.isPending}
                  leftIcon={!expenseMutation.isPending ? <Plus className="w-5 h-5" /> : undefined}
                  className={activeTab === 'expense' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}
                >
                  {expenseMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    `Add ${activeTab === 'expense' ? 'Expense' : 'Income'}`
                  )}
                </Button>
              </div>
            </motion.form>
          )}

          {/* Reminder Form */}
          {activeTab === 'reminder' && (
            <motion.form
              key="reminder-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSubmitReminder(onSubmitReminder)}
              className="space-y-4 pt-4"
            >
              {/* Title */}
              <div className="bg-white rounded-3xl border border-gray-200 p-5">
                <Input
                  label="Title"
                  placeholder="e.g., Electricity Bill, Netflix"
                  leftIcon={Receipt}
                  error={reminderErrors.title?.message}
                  {...registerReminder('title', {
                    required: 'Title is required',
                    maxLength: { value: 100, message: 'Max 100 characters' },
                  })}
                />
              </div>

              {/* Amount */}
              <div className="bg-white rounded-3xl border border-gray-200 p-5">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-gray-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className={`w-full pl-12 pr-4 py-4 text-3xl font-semibold rounded-3xl border-2 transition-colors ${
                      reminderErrors.amount
                        ? 'border-red-300 focus:border-red-500'
                        : 'border-gray-200 focus:border-primary-500'
                    } focus:outline-none`}
                    {...registerReminder('amount', {
                      required: 'Amount is required',
                      min: { value: 0.01, message: 'Amount must be greater than 0' },
                    })}
                  />
                </div>
                {reminderErrors.amount && (
                  <p className="mt-2 text-sm text-red-500">{reminderErrors.amount.message}</p>
                )}
              </div>

              {/* Due Date */}
              <div className="bg-white rounded-3xl border border-gray-200 p-5">
                <Input
                  label="Due Date"
                  type="date"
                  leftIcon={Calendar}
                  error={reminderErrors.dueDate?.message}
                  {...registerReminder('dueDate', { required: 'Due date is required' })}
                />
              </div>

              {/* Type */}
              <div className="bg-white rounded-3xl border border-gray-200 p-5">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {reminderTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setValueReminder('type', type.value as 'bill' | 'loan' | 'subscription')}
                      className={`p-4 rounded-3xl text-sm font-medium transition-all border ${
                        selectedReminderType === type.value
                          ? `${type.color} border-current ring-2 ring-offset-2 ring-primary-500`
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
                <input type="hidden" {...registerReminder('type', { required: 'Type is required' })} />
              </div>

              {/* Recurring */}
              <div className="bg-white rounded-3xl border border-gray-200 p-5">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    {...registerReminder('recurring')}
                    className="w-5 h-5 rounded-3xl border-gray-300 text-primary-500 focus:ring-primary-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Recurring payment</span>
                    <p className="text-xs text-gray-500">Auto-create next reminder when paid</p>
                  </div>
                </label>
                {isRecurring && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Repeat Every</label>
                    <select
                      {...registerReminder('recurringPeriod')}
                      className="w-full px-4 py-3 rounded-3xl border border-gray-200 focus:border-primary-500 focus:outline-none bg-white"
                    >
                      <option value="monthly">Every Month</option>
                      <option value="quarterly">Every 3 Months</option>
                      <option value="yearly">Every Year</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="bg-white rounded-3xl border border-gray-200 p-5">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Notes (optional)
                </label>
                <textarea
                  placeholder="Add any additional notes..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-3xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none transition-all resize-none"
                  {...registerReminder('notes', {
                    maxLength: { value: 500, message: 'Max 500 characters' },
                  })}
                />
                {reminderErrors.notes && (
                  <p className="mt-2 text-sm text-red-500">{reminderErrors.notes.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2 pb-4">
                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  loading={reminderMutation.isPending}
                  leftIcon={!reminderMutation.isPending ? <Plus className="w-5 h-5" /> : undefined}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  {reminderMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Add Reminder'
                  )}
                </Button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default AddExpensePage
