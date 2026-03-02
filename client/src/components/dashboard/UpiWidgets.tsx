import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Smartphone,
  ArrowUpRight,
  Lightbulb,
  ChevronRight,
  Zap,
  AlertTriangle,
  CreditCard,
} from 'lucide-react'
import { paymentApi } from '@/lib/api'

/**
 * UPI Quick Pay Card - Shows UPI payment shortcut on dashboard
 */
export const UpiQuickPayCard: React.FC = () => {
  const navigate = useNavigate()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all group"
      onClick={() => navigate('/pay')}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-primary-50 rounded-xl flex items-center justify-center group-hover:bg-primary-100 transition-colors">
            <Smartphone size={20} className="text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 text-[15px]">Pay via UPI</h3>
            <p className="text-gray-400 text-xs">
              Auto-tracked • AI categorized
            </p>
          </div>
        </div>
        <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center group-hover:bg-primary-700 transition-colors">
          <ArrowUpRight size={16} className="text-white" />
        </div>
      </div>
    </motion.div>
  )
}

/**
 * UPI Monthly Summary Card
 */
export const UpiMonthlySummary: React.FC = () => {
  const navigate = useNavigate()

  const { data } = useQuery({
    queryKey: ['payment-summary'],
    queryFn: () => paymentApi.getSummary(),
    staleTime: 60000,
  })

  const summary = data?.data
  if (!summary || summary.transactionCount === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-5 shadow-sm"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
            <CreditCard size={16} className="text-indigo-600" />
          </div>
          <h3 className="font-semibold text-gray-800">UPI This Month</h3>
        </div>
        <button
          onClick={() => navigate('/payments/history')}
          className="text-xs text-indigo-600 font-medium flex items-center gap-1"
        >
          View All <ChevronRight size={12} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-indigo-50 rounded-xl p-3">
          <p className="text-xs text-indigo-600 mb-1">Total Spent</p>
          <p className="text-lg font-bold text-gray-800">
            ₹{(summary.totalUpiSpent || 0).toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-purple-50 rounded-xl p-3">
          <p className="text-xs text-purple-600 mb-1">Payments</p>
          <p className="text-lg font-bold text-gray-800">
            {summary.transactionCount}
          </p>
        </div>
      </div>

      {/* Category breakdown mini */}
      {summary.categoryBreakdown?.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {summary.categoryBreakdown.slice(0, 3).map((cat: any) => (
            <div key={cat.category} className="flex items-center justify-between text-sm">
              <span className="text-gray-500">{cat.category}</span>
              <span className="font-medium text-gray-700">
                ₹{cat.total.toLocaleString('en-IN')}
                <span className="text-gray-400 text-xs ml-1">({cat.count})</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

/**
 * Smart Insights Preview Card for Dashboard
 */
export const SmartInsightsPreview: React.FC = () => {
  const navigate = useNavigate()

  const { data } = useQuery({
    queryKey: ['smart-insights'],
    queryFn: () => paymentApi.getInsights(),
    staleTime: 120000, // 2 min
  })

  const insights = data?.data?.insights || []
  const criticalInsights = insights.filter(
    (i: any) => i.severity === 'critical' || i.severity === 'warning'
  )

  if (criticalInsights.length === 0 && insights.length === 0) return null

  const displayInsights = criticalInsights.length > 0
    ? criticalInsights.slice(0, 2)
    : insights.slice(0, 2)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-5 shadow-sm"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
            <Lightbulb size={16} className="text-amber-600" />
          </div>
          <h3 className="font-semibold text-gray-800">Smart Insights</h3>
          {criticalInsights.length > 0 && (
            <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
              {criticalInsights.length}
            </span>
          )}
        </div>
        <button
          onClick={() => navigate('/insights')}
          className="text-xs text-amber-600 font-medium flex items-center gap-1"
        >
          See All <ChevronRight size={12} />
        </button>
      </div>

      <div className="space-y-2">
        {displayInsights.map((insight: any) => (
          <div
            key={insight.id}
            className={`rounded-lg p-3 text-sm ${
              insight.severity === 'critical'
                ? 'bg-red-50 text-red-700'
                : insight.severity === 'warning'
                ? 'bg-amber-50 text-amber-700'
                : 'bg-blue-50 text-blue-700'
            }`}
          >
            <div className="flex items-start gap-2">
              {insight.severity === 'critical' ? (
                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              ) : insight.severity === 'warning' ? (
                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              ) : (
                <Zap size={14} className="mt-0.5 flex-shrink-0" />
              )}
              <div>
                <p className="font-medium text-xs">{insight.title}</p>
                <p className="text-xs opacity-80 mt-0.5 line-clamp-2">
                  {insight.message}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

/**
 * Auto-Tracked Badge for transactions list
 */
export const AutoTrackedBadge: React.FC<{ small?: boolean }> = ({ small }) => {
  if (small) {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-600">
        <Zap size={8} />
        Auto
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600">
      <Zap size={10} />
      Auto-Tracked
    </span>
  )
}

/**
 * Real-Time Budget Progress Bar for dashboard
 */
export const RealTimeBudgetProgress: React.FC<{
  totalBudget: number
  totalSpent: number
  alertThreshold?: number
}> = ({ totalBudget, totalSpent, alertThreshold = 80 }) => {
  const percentage = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0
  const remaining = totalBudget - totalSpent
  const isOver = remaining < 0
  const isWarning = percentage >= alertThreshold

  const barColor = isOver
    ? 'bg-red-500'
    : isWarning
    ? 'bg-amber-500'
    : 'bg-green-500'

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-800 text-sm">Budget Progress</h3>
        <span
          className={`text-sm font-bold ${
            isOver ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-green-600'
          }`}
        >
          {percentage}%
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percentage, 100)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${barColor}`}
        />
      </div>
      <div className="flex justify-between mt-2 text-xs text-gray-500">
        <span>₹{totalSpent.toLocaleString('en-IN')} spent</span>
        <span>
          {isOver ? (
            <span className="text-red-600 font-medium">
              Over by ₹{Math.abs(remaining).toLocaleString('en-IN')}
            </span>
          ) : (
            `₹${remaining.toLocaleString('en-IN')} left`
          )}
        </span>
      </div>
    </div>
  )
}
