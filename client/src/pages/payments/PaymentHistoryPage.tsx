import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Smartphone,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Filter,
  ChevronDown,
  Loader2,
} from 'lucide-react'
import { paymentApi } from '@/lib/api'

const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  captured: {
    icon: <CheckCircle size={16} />,
    color: 'text-green-600 bg-green-50',
    label: 'Success',
  },
  created: {
    icon: <Clock size={16} />,
    color: 'text-amber-600 bg-amber-50',
    label: 'Pending',
  },
  authorized: {
    icon: <Clock size={16} />,
    color: 'text-blue-600 bg-blue-50',
    label: 'Authorized',
  },
  failed: {
    icon: <XCircle size={16} />,
    color: 'text-red-600 bg-red-50',
    label: 'Failed',
  },
  refunded: {
    icon: <RefreshCw size={16} />,
    color: 'text-purple-600 bg-purple-50',
    label: 'Refunded',
  },
}

export const PaymentHistoryPage: React.FC = () => {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('captured')
  const [showFilter, setShowFilter] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['payment-history', page, statusFilter],
    queryFn: () =>
      paymentApi.getHistory({
        page,
        limit: 20,
        status: statusFilter || undefined,
      }),
  })

  const payments = data?.data?.payments || []
  const pagination = data?.data?.pagination

  // Summary query
  const { data: summaryData } = useQuery({
    queryKey: ['payment-summary'],
    queryFn: () => paymentApi.getSummary(),
  })

  const summary = summaryData?.data

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 pt-12 pb-8">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4"
          >
            <ArrowLeft size={20} />
            Back
          </button>
          <h1 className="text-2xl font-bold mb-1">UPI Transactions</h1>
          <p className="text-white/70 text-sm">
            All your UPI payment history
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-4 space-y-4">
        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">This Month UPI</p>
              <p className="text-xl font-bold text-gray-800">
                ₹{(summary.totalUpiSpent || 0).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Transactions</p>
              <p className="text-xl font-bold text-gray-800">
                {summary.transactionCount || 0}
              </p>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">
            Payment History
          </h2>
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <Filter size={16} />
            Filter
            <ChevronDown
              size={14}
              className={`transition-transform ${showFilter ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {showFilter && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex gap-2 flex-wrap"
          >
            {['', 'captured', 'created', 'failed', 'refunded'].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStatusFilter(s)
                  setPage(1)
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </motion.div>
        )}

        {/* Payment List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={32} className="animate-spin text-indigo-600" />
          </div>
        ) : isError ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm">
            <p className="text-gray-500">Failed to load payment history</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm">
            <Smartphone size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No UPI payments yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Make your first payment to see it here
            </p>
            <button
              onClick={() => navigate('/pay')}
              className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              Make a Payment
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {payments.map((payment: any) => {
              const status = statusConfig[payment.status] || statusConfig.created
              return (
                <motion.div
                  key={payment._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                        <Smartphone size={18} className="text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 text-sm">
                          {payment.merchant}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}
                          >
                            {status.icon}
                            {status.label}
                          </span>
                          {payment.aiCategory && (
                            <span className="text-xs text-gray-400">
                              {payment.aiCategory}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-800">
                        ₹{payment.amount?.toLocaleString('en-IN')}
                      </p>
                      <p className="text-xs text-gray-400">
                        {payment.paidAt
                          ? new Date(payment.paidAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                            })
                          : new Date(payment.createdAt).toLocaleDateString(
                              'en-IN',
                              { day: 'numeric', month: 'short' }
                            )}
                      </p>
                    </div>
                  </div>
                  {payment.description && (
                    <p className="text-xs text-gray-400 mt-2 pl-13">
                      {payment.description}
                    </p>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex justify-center gap-2 pb-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-2 rounded-lg bg-white border text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-500">
              {page} / {pagination.pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page >= pagination.pages}
              className="px-4 py-2 rounded-lg bg-white border text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default PaymentHistoryPage
