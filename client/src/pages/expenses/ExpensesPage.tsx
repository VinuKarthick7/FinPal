import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Search,
  Filter,
  Plus,
  Trash2,
  Edit3,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui'
import { expensesApi } from '@/lib/api'

interface Transaction {
  _id: string
  amount: number
  category: string
  merchant: string
  date: string
  type: 'expense' | 'income'
  paymentMethod: string
  notes?: string
}

const categoryIcons: Record<string, string> = {
  Food: '🍔',
  Shopping: '🛍️',
  Transport: '🚗',
  Entertainment: '🎬',
  Utilities: '💡',
  Healthcare: '🏥',
  Education: '📚',
  Rent: '🏠',
  Salary: '💰',
  Investment: '📈',
  Gift: '🎁',
  Other: '📦',
}

const categoryColors: Record<string, string> = {
  Food: 'bg-orange-100 text-orange-600',
  Shopping: 'bg-purple-100 text-purple-600',
  Transport: 'bg-blue-100 text-blue-600',
  Entertainment: 'bg-pink-100 text-pink-600',
  Utilities: 'bg-yellow-100 text-yellow-600',
  Healthcare: 'bg-teal-100 text-teal-600',
  Education: 'bg-indigo-100 text-indigo-600',
  Rent: 'bg-green-100 text-green-600',
  Salary: 'bg-emerald-100 text-emerald-600',
  Investment: 'bg-cyan-100 text-cyan-600',
  Gift: 'bg-rose-100 text-rose-600',
  Other: 'bg-gray-100 text-gray-600',
}

const categories = [
  'All',
  'Food',
  'Shopping',
  'Transport',
  'Entertainment',
  'Utilities',
  'Healthcare',
  'Education',
  'Rent',
  'Salary',
  'Investment',
  'Gift',
  'Other',
]

export const ExpensesPage: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  // Filters state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedType, setSelectedType] = useState<'all' | 'expense' | 'income'>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [page, setPage] = useState(1)
  
  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Fetch transactions
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['transactions', page, selectedCategory, selectedType, dateRange],
    queryFn: () =>
      expensesApi.getAll({
        page,
        limit: 20,
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        type: selectedType !== 'all' ? selectedType : undefined,
        startDate: dateRange.start || undefined,
        endDate: dateRange.end || undefined,
      }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expensesApi.delete(id),
    onSuccess: () => {
      toast.success('Transaction deleted')
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      setDeleteId(null)
    },
    onError: () => {
      toast.error('Failed to delete transaction')
    },
  })

  const transactions: Transaction[] = data?.data?.transactions || []
  const pagination = data?.data?.pagination || { page: 1, pages: 1, total: 0 }

  // Filter by search query (client-side)
  const filteredTransactions = transactions.filter((t) =>
    searchQuery
      ? t.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  )

  // Group transactions by date
  const groupedTransactions = filteredTransactions.reduce((groups, transaction) => {
    const date = new Date(transaction.date).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(transaction)
    return groups
  }, {} as Record<string, Transaction[]>)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const clearFilters = () => {
    setSelectedCategory('All')
    setSelectedType('all')
    setDateRange({ start: '', end: '' })
    setSearchQuery('')
    setPage(1)
  }

  const hasActiveFilters =
    selectedCategory !== 'All' ||
    selectedType !== 'all' ||
    dateRange.start ||
    dateRange.end

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white/90 supports-[backdrop-filter]:bg-white/70 backdrop-blur-md border-b border-gray-100/70 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
              <p className="text-sm text-gray-500">
                {pagination.total} total transactions
              </p>
            </div>
            <Button
              onClick={() => navigate('/add-expense')}
              leftIcon={<Plus className="w-4 h-4" />}
              size="sm"
            >
              Add New
            </Button>
          </div>

          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2.5 rounded-xl border transition-all flex items-center gap-2 ${
                hasActiveFilters
                  ? 'bg-primary-50 border-primary-200 text-primary-600'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-5 h-5" />
              <span className="hidden sm:inline">Filters</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-primary-500" />
              )}
            </button>
          </div>

          {/* Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-4 space-y-4">
                  {/* Type Filter */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Type
                    </label>
                    <div className="flex gap-2">
                      {(['all', 'expense', 'income'] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => {
                            setSelectedType(type)
                            setPage(1)
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            selectedType === type
                              ? type === 'expense'
                                ? 'bg-red-100 text-red-600'
                                : type === 'income'
                                ? 'bg-green-100 text-green-600'
                                : 'bg-primary-100 text-primary-600'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {type === 'all' ? 'All' : type === 'expense' ? '💸 Expenses' : '💰 Income'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category Filter */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Category
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => {
                            setSelectedCategory(cat)
                            setPage(1)
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            selectedCategory === cat
                              ? 'bg-primary-100 text-primary-600'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {cat !== 'All' && categoryIcons[cat]} {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Date Range */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Date Range
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => {
                          setDateRange({ ...dateRange, start: e.target.value })
                          setPage(1)
                        }}
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:border-primary-500 focus:outline-none text-sm"
                      />
                      <span className="text-gray-400">to</span>
                      <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => {
                          setDateRange({ ...dateRange, end: e.target.value })
                          setPage(1)
                        }}
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:border-primary-500 focus:outline-none text-sm"
                      />
                    </div>
                  </div>

                  {/* Clear Filters */}
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Transaction List */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Search className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No transactions found
            </h3>
            <p className="text-gray-500 mb-6">
              {hasActiveFilters
                ? 'Try adjusting your filters'
                : 'Start by adding your first transaction'}
            </p>
            {!hasActiveFilters && (
              <Button onClick={() => navigate('/add-expense')}>
                <Plus className="w-4 h-4 mr-2" />
                Add Transaction
              </Button>
            )}
          </div>
        ) : (
          <>
            {Object.entries(groupedTransactions).map(([date, txns]) => (
              <div key={date} className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-3 sticky top-[140px] bg-gray-50 py-2">
                  {date}
                </h3>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {txns.map((transaction, index) => (
                    <motion.div
                      key={transaction._id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.99 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.55, delay: index * 0.03 }}
                      className={`flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors will-change-transform ${
                        index !== txns.length - 1 ? 'border-b border-gray-100' : ''
                      }`}
                    >
                      {/* Category Icon */}
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
                          categoryColors[transaction.category] || categoryColors.Other
                        }`}
                      >
                        {categoryIcons[transaction.category] || '📦'}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900 truncate">
                            {transaction.merchant}
                          </h4>
                          {transaction.type === 'income' ? (
                            <ArrowDownLeft className="w-4 h-4 text-green-500 flex-shrink-0" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 text-red-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {transaction.category} • {transaction.paymentMethod.toUpperCase()}
                        </p>
                      </div>

                      {/* Amount */}
                      <div className="text-right">
                        <p
                          className={`font-semibold ${
                            transaction.type === 'income'
                              ? 'text-green-600'
                              : 'text-gray-900'
                          }`}
                        >
                          {transaction.type === 'income' ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigate(`/edit-expense/${transaction._id}`)}
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors active:scale-[0.98]"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(transaction._id)}
                          className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors active:scale-[0.98]"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-gray-600">
                  Page {page} of {pagination.pages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                  disabled={page === pagination.pages}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {/* Loading overlay for pagination */}
        {isFetching && !isLoading && (
          <div className="fixed inset-0 bg-white/50 flex items-center justify-center z-50">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setDeleteId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
            >
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Delete Transaction?
                </h3>
                <p className="text-gray-500 mb-6">
                  This action cannot be undone. The transaction will be permanently removed.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    fullWidth
                    onClick={() => setDeleteId(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    fullWidth
                    className="bg-red-500 hover:bg-red-600"
                    loading={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(deleteId)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ExpensesPage
