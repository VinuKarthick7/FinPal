import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  DollarSign,
  Tag,
  Store,
  Calendar,
  CreditCard,
  FileText,
  Loader2,
} from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { expensesApi } from '@/lib/api'

interface ExpenseFormData {
  amount: string
  category: string
  merchant: string
  date: string
  type: 'expense' | 'income'
  paymentMethod: string
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
  { value: 'netbanking', label: 'Net Banking', icon: '🏦' },
  { value: 'other', label: 'Other', icon: '💰' },
]

export const AddExpensePage: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedType, setSelectedType] = useState<'expense' | 'income'>('expense')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ExpenseFormData>({
    defaultValues: {
      type: 'expense',
      paymentMethod: 'upi',
      date: new Date().toISOString().split('T')[0],
    },
  })

  const selectedCategory = watch('category')
  const selectedPaymentMethod = watch('paymentMethod')

  const createMutation = useMutation({
    mutationFn: (data: ExpenseFormData) =>
      expensesApi.create({
        amount: parseFloat(data.amount),
        category: data.category,
        merchant: data.merchant,
        date: data.date,
        type: selectedType,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
      }),
    onSuccess: () => {
      toast.success(`${selectedType === 'expense' ? 'Expense' : 'Income'} added successfully!`)
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['recent-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['category-breakdown'] })
      queryClient.invalidateQueries({ queryKey: ['budget-progress'] })
      navigate('/dashboard')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to add transaction'
      toast.error(message)
    },
  })

  const onSubmit = (data: ExpenseFormData) => {
    createMutation.mutate(data)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Add Transaction</h1>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto px-4 py-6"
      >
        {/* Type Toggle */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 mb-6">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSelectedType('expense')}
              className={`py-3 rounded-xl font-medium transition-all ${
                selectedType === 'expense'
                  ? 'bg-red-500 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              💸 Expense
            </button>
            <button
              type="button"
              onClick={() => setSelectedType('income')}
              className={`py-3 rounded-xl font-medium transition-all ${
                selectedType === 'income'
                  ? 'bg-green-500 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              💰 Income
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Amount */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Amount *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-gray-400">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                className={`w-full pl-12 pr-4 py-4 text-3xl font-semibold rounded-xl border-2 transition-colors ${
                  errors.amount
                    ? 'border-red-300 focus:border-red-500'
                    : 'border-gray-200 focus:border-primary-500'
                } focus:outline-none`}
                {...register('amount', {
                  required: 'Amount is required',
                  min: { value: 0.01, message: 'Amount must be greater than 0' },
                })}
              />
            </div>
            {errors.amount && (
              <p className="mt-2 text-sm text-red-500">{errors.amount.message}</p>
            )}
          </div>

          {/* Category */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Category *
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {categories
                .filter((cat) =>
                  selectedType === 'income'
                    ? ['Salary', 'Investment', 'Gift', 'Other'].includes(cat.value)
                    : !['Salary', 'Investment'].includes(cat.value)
                )
                .map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setValue('category', cat.value)}
                    className={`p-3 rounded-xl text-sm font-medium transition-all ${
                      selectedCategory === cat.value
                        ? `${cat.color} ring-2 ring-offset-2 ring-primary-500`
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
            </div>
            <input type="hidden" {...register('category', { required: 'Category is required' })} />
            {errors.category && (
              <p className="mt-2 text-sm text-red-500">{errors.category.message}</p>
            )}
          </div>

          {/* Merchant/Description */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <Input
              label="Description *"
              placeholder={selectedType === 'expense' ? 'Where did you spend?' : 'Income source'}
              leftIcon={Store}
              error={errors.merchant?.message}
              {...register('merchant', {
                required: 'Description is required',
                maxLength: { value: 100, message: 'Max 100 characters' },
              })}
            />
          </div>

          {/* Date */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <Input
              label="Date *"
              type="date"
              leftIcon={Calendar}
              error={errors.date?.message}
              {...register('date', { required: 'Date is required' })}
            />
          </div>

          {/* Payment Method */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Payment Method
            </label>
            <div className="grid grid-cols-5 gap-2">
              {paymentMethods.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setValue('paymentMethod', method.value)}
                  className={`p-3 rounded-xl text-center transition-all ${
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
            <input type="hidden" {...register('paymentMethod')} />
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Notes (optional)
            </label>
            <textarea
              placeholder="Add any additional notes..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none transition-colors resize-none"
              {...register('notes', {
                maxLength: { value: 500, message: 'Max 500 characters' },
              })}
            />
            {errors.notes && (
              <p className="mt-2 text-sm text-red-500">{errors.notes.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <div className="sticky bottom-0 bg-gray-50 pt-4 pb-8">
            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={createMutation.isPending}
              className={selectedType === 'expense' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}
            >
              {createMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                `Add ${selectedType === 'expense' ? 'Expense' : 'Income'}`
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default AddExpensePage
