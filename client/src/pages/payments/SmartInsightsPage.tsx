import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  Bell,
  Smartphone,
  BarChart3,
  ShieldAlert,
  Loader2,
  ChevronRight,
} from 'lucide-react'
import { paymentApi } from '@/lib/api'

const insightIcons: Record<string, React.ReactNode> = {
  budget_warning: <AlertTriangle size={20} />,
  budget_exceeded: <ShieldAlert size={20} />,
  emi_reminder: <Bell size={20} />,
  unusual_spending: <TrendingUp size={20} />,
  saving_tip: <Lightbulb size={20} />,
  category_spike: <BarChart3 size={20} />,
  spending_trend: <TrendingUp size={20} />,
  upi_summary: <Smartphone size={20} />,
}

const severityStyles: Record<string, string> = {
  critical: 'border-l-4 border-l-red-500 bg-red-50',
  warning: 'border-l-4 border-l-amber-500 bg-amber-50',
  info: 'border-l-4 border-l-blue-500 bg-blue-50',
}

const severityIconColor: Record<string, string> = {
  critical: 'text-red-600',
  warning: 'text-amber-600',
  info: 'text-blue-600',
}

export const SmartInsightsPage: React.FC = () => {
  const navigate = useNavigate()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['smart-insights'],
    queryFn: () => paymentApi.getInsights(),
    staleTime: 60000, // 1 minute
  })

  const insights = data?.data?.insights || []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 pt-12 pb-8">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4"
          >
            <ArrowLeft size={20} />
            Back
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Lightbulb size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Smart Insights</h1>
              <p className="text-white/70 text-sm">
                AI-powered financial intelligence
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-4 space-y-3 pb-6">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={32} className="animate-spin text-amber-600" />
          </div>
        ) : isError ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm">
            <p className="text-gray-500 mb-3">Failed to load insights</p>
            <button
              onClick={() => refetch()}
              className="text-amber-600 font-medium text-sm"
            >
              Retry
            </button>
          </div>
        ) : insights.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm">
            <Lightbulb size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">
              No insights yet
            </p>
            <p className="text-gray-400 text-sm mt-1">
              Start tracking expenses to see smart insights
            </p>
          </div>
        ) : (
          insights.map((insight: any, index: number) => (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`rounded-xl p-4 shadow-sm ${
                severityStyles[insight.severity] || severityStyles.info
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 ${
                    severityIconColor[insight.severity] || 'text-blue-600'
                  }`}
                >
                  {insightIcons[insight.type] || <Lightbulb size={20} />}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 text-sm">
                    {insight.title}
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">
                    {insight.message}
                  </p>
                  {insight.actionable && (
                    <button
                      onClick={() => {
                        if (insight.type === 'emi_reminder') {
                          navigate('/reminders')
                        } else if (
                          insight.type === 'budget_warning' ||
                          insight.type === 'budget_exceeded'
                        ) {
                          navigate('/budget')
                        } else {
                          navigate('/expenses')
                        }
                      }}
                      className="flex items-center gap-1 text-xs font-medium text-indigo-600 mt-2 hover:text-indigo-800"
                    >
                      Take Action <ChevronRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}

export default SmartInsightsPage
