/**
 * All Expenses Page - Shows current month's expense transaction history
 * Displays all expenses for the current month only when user clicks "View All" from dashboard
 */

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  Filter,
  Search,
  TrendingDown,
  Receipt,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui'
import { expensesApi } from '@/lib/api'

interface Transaction {
  id: string
  amount: number
  category: string
  merchant: string
  date: string
  type: 'expense' | 'income'
  paymentMethod: string
  description?: string
}

const AllExpensesPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')

  // Get current month dates
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  
  const currentMonthName = now.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  })

  // Fetch current month's transactions
  const { data: transactionsData, isLoading, error } = useQuery({
    queryKey: ['current-month-expenses', startOfMonth.toISOString(), endOfMonth.toISOString()],
    queryFn: async () => {
      const response = await expensesApi.getAll({
        startDate: startOfMonth.toISOString(),
        endDate: endOfMonth.toISOString(),
      })
      console.log('API Response:', response) // Debug log
      return response.data
    },
  })

  console.log('TransactionsData:', transactionsData) // Debug log

  const transactions: Transaction[] = Array.isArray(transactionsData) 
    ? transactionsData 
    : (transactionsData?.transactions || transactionsData?.data || [])

  // Filter transactions based on search and category
  const filteredTransactions = Array.isArray(transactions) ? transactions.filter(transaction => {
    const matchesSearch = searchQuery === '' || 
      transaction.merchant?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = selectedCategory === '' || transaction.category === selectedCategory

    return matchesSearch && matchesCategory
  }) : []

  // Get unique categories for filter
  const categories = Array.isArray(transactions) 
    ? Array.from(new Set(transactions.map(t => t.category).filter(Boolean)))
    : []

  // Calculate totals
  const totalExpenses = Array.isArray(transactions)
    ? transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + (t.amount || 0), 0)
    : 0

  const totalIncome = Array.isArray(transactions)
    ? transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + (t.amount || 0), 0)
    : 0

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    })
  }

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      Food: '🍔',
      Shopping: '🛍️',
      Transport: '🚗',
      Entertainment: '🎬',
      Utilities: '⚡',
      Healthcare: '🏥',
      Education: '📚',
      Rent: '🏠',
      Salary: '💰',
      Investment: '📈',
      Gift: '🎁',
      Other: '📄'
    }
    return icons[category] || '📄'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load transactions</p>
          <Button onClick={() => navigate('/dashboard')} variant="outline">
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {t('expenses.allExpenses')} - {currentMonthName}
              </h1>
              <p className="text-sm text-gray-500">
                {Array.isArray(transactions) ? transactions.length : 0} {t('expenses.totalTransactions')}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-6 border border-gray-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-6 border border-gray-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-green-600 rotate-180" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Income</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl p-6 border border-gray-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Transactions</p>
                <p className="text-xl font-bold text-blue-600">{Array.isArray(transactions) ? transactions.length : 0}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Search and Filter */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-4 border border-gray-100 mb-6"
        >
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <Filter className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            </div>

            {/* Clear Filters */}
            {(searchQuery || selectedCategory) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedCategory('')
                }}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Clear
              </Button>
            )}
          </div>
        </motion.div>

        {/* Transactions List */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl border border-gray-100 overflow-hidden"
        >
          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center">
              <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                {searchQuery || selectedCategory ? 'No matching transactions' : 'No transactions this month'}
              </h3>
              <p className="text-gray-500">
                {searchQuery || selectedCategory ? 'Try adjusting your filters' : 'Start by adding your first transaction'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredTransactions.map((transaction, index) => (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg">
                        {getCategoryIcon(transaction.category)}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {transaction.merchant || transaction.category}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {transaction.category} • {transaction.paymentMethod}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        transaction.type === 'expense' ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {transaction.type === 'expense' ? '-' : '+'}{formatCurrency(transaction.amount)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(transaction.date)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default AllExpensesPage