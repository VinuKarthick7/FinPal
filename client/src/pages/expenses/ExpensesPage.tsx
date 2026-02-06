    /**
 * Expenses Page - Now serves as the Add Expense page
 * Transaction history has been moved to the Home page (Dashboard)
 * This page is now dedicated to adding new expenses, income, and reminders
 */

import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  Store,
  Calendar,
  Receipt,
  Plus,
  Wallet,
  Bell,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui'
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

export const ExpensesPage: React.FC = () => {
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);
  
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const shouldReduceMotion = useReducedMotion()
  
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
      toast.success(activeTab === 'expense' ? t('expenses.expenseAdded') : t('expenses.incomeAdded'))
      // Invalidate common dashboard queries
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['expenses-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['category-breakdown'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })

      // Ensure budget pages update
      queryClient.invalidateQueries({ queryKey: ['budget-progress'] })
      queryClient.invalidateQueries({ queryKey: ['budget-data'] })
      queryClient.invalidateQueries({ queryKey: ['budget-categories'] })
      queryClient.invalidateQueries({ queryKey: ['budget-history'] })

      resetExpense({
        type: activeTab as 'expense' | 'income',
        paymentMethod: 'upi',
        date: new Date().toISOString().split('T')[0],
        amount: '',
        category: '',
        merchant: '',
        notes: '',
      })
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || t('expenses.addFailed'))
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
        notes: data.notes,
      }),
    onSuccess: () => {
      toast.success(t('reminders.reminderAdded'))
      queryClient.invalidateQueries({ queryKey: ['upcoming-reminders'] })
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
      resetReminder({
        type: 'bill',
        recurring: false,
        recurringPeriod: 'monthly',
        dueDate: new Date().toISOString().split('T')[0],
        title: '',
        amount: '',
        notes: '',
      })
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || t('reminders.addFailed'))
    },
  })

  const onSubmitExpense = (data: ExpenseFormData) => {
    expenseMutation.mutate(data)
  }

  const onSubmitReminder = (data: ReminderFormData) => {
    reminderMutation.mutate(data)
  }

  const tabs = [
    { id: 'expense', label: t('expenses.expense'), icon: Wallet, color: 'text-red-500' },
    { id: 'income', label: t('expenses.income'), icon: TrendingUp, color: 'text-green-500' },
    { id: 'reminder', label: t('nav.reminders'), icon: Bell, color: 'text-blue-500' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white">
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">{t('expenses.addNew')}</h1>
              <p className="text-primary-100 text-sm">{t('expenses.trackYourMoney')}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 bg-white/10 p-1 rounded-xl">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-lg'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? tab.color : ''}`} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-2xl mx-auto px-4 -mt-4">
        <AnimatePresence mode="wait">
          {activeTab !== 'reminder' ? (
            <motion.form
              key="expense-form"
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSubmitExpense(onSubmitExpense)}
              className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 space-y-6"
            >
              {/* Amount Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('expenses.amount')} *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    {...registerExpense('amount', {
                      required: t('expenses.amountRequired'),
                      min: { value: 0.01, message: t('expenses.amountMinimum') },
                    })}
                    placeholder="0.00"
                    className="w-full pl-12 pr-4 py-4 text-3xl font-bold rounded-xl border border-gray-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                  />
                </div>
                {expenseErrors.amount && (
                  <p className="text-red-500 text-sm mt-1">{expenseErrors.amount.message}</p>
                )}
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('expenses.category')} *
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setValueExpense('category', cat.value)}
                      className={`p-3 rounded-xl text-sm font-medium transition-all ${
                        selectedCategory === cat.value
                          ? `${cat.color} ring-2 ring-offset-2 ring-primary-500`
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
                <input
                  type="hidden"
                  {...registerExpense('category', { required: t('expenses.categoryRequired') })}
                />
                {expenseErrors.category && (
                  <p className="text-red-500 text-sm mt-1">{expenseErrors.category.message}</p>
                )}
              </div>

              {/* Merchant/Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {activeTab === 'income' ? t('expenses.source') : t('expenses.merchant')} *
                </label>
                <div className="relative">
                  <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    {...registerExpense('merchant', { required: t('expenses.merchantRequired') })}
                    placeholder={activeTab === 'income' ? t('expenses.sourcePlaceholder') : t('expenses.merchantPlaceholder')}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                  />
                </div>
                {expenseErrors.merchant && (
                  <p className="text-red-500 text-sm mt-1">{expenseErrors.merchant.message}</p>
                )}
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('expenses.date')} *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    {...registerExpense('date', { required: t('expenses.dateRequired') })}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                  />
                </div>
                {expenseErrors.date && (
                  <p className="text-red-500 text-sm mt-1">{expenseErrors.date.message}</p>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('expenses.paymentMethod')}
                </label>
                <div className="flex gap-2 flex-wrap">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setValueExpense('paymentMethod', method.value)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        selectedPaymentMethod === method.value
                          ? 'bg-primary-100 text-primary-600 ring-2 ring-primary-500'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {method.icon} {method.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('expenses.notes')}
                </label>
                <div className="relative">
                  <Receipt className="absolute left-4 top-3 w-5 h-5 text-gray-400" />
                  <textarea
                    {...registerExpense('notes')}
                    placeholder={t('expenses.notesPlaceholder')}
                    rows={3}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all resize-none"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                fullWidth
                size="lg"
                loading={expenseMutation.isPending}
                leftIcon={<Plus className="w-5 h-5" />}
                className={activeTab === 'income' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {activeTab === 'expense' ? t('expenses.addExpense') : t('expenses.addIncome')}
              </Button>
            </motion.form>
          ) : (
            <motion.form
              key="reminder-form"
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSubmitReminder(onSubmitReminder)}
              className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 space-y-6"
            >
              {/* Reminder Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('reminders.type')} *
                </label>
                <div className="flex gap-2">
                  {reminderTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setValueReminder('type', type.value as 'bill' | 'loan' | 'subscription')}
                      className={`flex-1 p-3 rounded-xl text-sm font-medium transition-all ${
                        selectedReminderType === type.value
                          ? `${type.color} ring-2 ring-offset-2 ring-primary-500`
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('reminders.title')} *
                </label>
                <input
                  type="text"
                  {...registerReminder('title', { required: t('reminders.titleRequired') })}
                  placeholder={t('reminders.titlePlaceholder')}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                />
                {reminderErrors.title && (
                  <p className="text-red-500 text-sm mt-1">{reminderErrors.title.message}</p>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('expenses.amount')} *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    {...registerReminder('amount', {
                      required: t('expenses.amountRequired'),
                      min: { value: 0.01, message: t('expenses.amountMinimum') },
                    })}
                    placeholder="0.00"
                    className="w-full pl-12 pr-4 py-4 text-3xl font-bold rounded-xl border border-gray-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                  />
                </div>
                {reminderErrors.amount && (
                  <p className="text-red-500 text-sm mt-1">{reminderErrors.amount.message}</p>
                )}
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('reminders.dueDate')} *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    {...registerReminder('dueDate', { required: t('reminders.dueDateRequired') })}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                  />
                </div>
                {reminderErrors.dueDate && (
                  <p className="text-red-500 text-sm mt-1">{reminderErrors.dueDate.message}</p>
                )}
              </div>

              {/* Recurring Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900">{t('reminders.recurring')}</p>
                  <p className="text-sm text-gray-500">{t('reminders.recurringDesc')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setValueReminder('recurring', !isRecurring)}
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    isRecurring ? 'bg-primary-600' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                      isRecurring ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Recurring Period */}
              {isRecurring && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('reminders.recurringPeriod')}
                  </label>
                  <div className="flex gap-2">
                    {(['monthly', 'quarterly', 'yearly'] as const).map((period) => (
                      <button
                        key={period}
                        type="button"
                        onClick={() => setValueReminder('recurringPeriod', period)}
                        className={`flex-1 p-3 rounded-xl text-sm font-medium transition-all ${
                          watchReminder('recurringPeriod') === period
                            ? 'bg-primary-100 text-primary-600 ring-2 ring-primary-500'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {t(`reminders.${period}`)}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('expenses.notes')}
                </label>
                <textarea
                  {...registerReminder('notes')}
                  placeholder={t('reminders.notesPlaceholder')}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all resize-none"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                fullWidth
                size="lg"
                loading={reminderMutation.isPending}
                leftIcon={<Bell className="w-5 h-5" />}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {t('reminders.addReminder')}
              </Button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default ExpensesPage
