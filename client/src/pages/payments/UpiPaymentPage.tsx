import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  Smartphone,
  Store,
  FileText,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Zap,
  Shield,
  TrendingDown,
  TrendingUp,
  QrCode,
  Send,
  ArrowDownLeft,
  Wallet,
  ChevronRight,
  Copy,
  Lightbulb,
  PieChart,
  History,
  Bell,
  CreditCard,
  BadgeCheck,
  Sparkles,
} from 'lucide-react'
import { paymentApi, dashboardApi } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

interface PaymentFormData {
  amount: string
  merchant: string
  description: string
}

declare global {
  interface Window {
    Razorpay: any
  }
}

// Greeting based on time of day
function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good Morning'
  if (h < 17) return 'Good Afternoon'
  return 'Good Evening'
}

export const UpiPaymentPage: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const userName = user?.fullName?.split(' ')[0] || 'User'

  const [activeTab, setActiveTab] = useState<'home' | 'pay'>('home')
  const [paymentStep, setPaymentStep] = useState<'form' | 'processing' | 'success' | 'failed'>('form')
  const [paymentResult, setPaymentResult] = useState<any>(null)
  const razorpayLoadingRef = useRef(false)
  const [copiedUpi, setCopiedUpi] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<PaymentFormData>({
    defaultValues: { amount: '', merchant: '', description: '' },
  })

  const amount = watch('amount')

  // Fetch dashboard stats
  const { data: statsData } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await dashboardApi.getStats()
      return response.data
    },
    staleTime: 60000,
  })

  // Fetch budget
  const { data: budgetData } = useQuery({
    queryKey: ['budget-progress'],
    queryFn: async () => {
      const response = await dashboardApi.getBudget()
      return response.data
    },
    staleTime: 60000,
  })

  // Fetch UPI payment summary
  const { data: upiSummaryData } = useQuery({
    queryKey: ['payment-summary'],
    queryFn: () => paymentApi.getSummary(),
    staleTime: 60000,
  })

  // Fetch smart insights
  const { data: insightsData } = useQuery({
    queryKey: ['smart-insights'],
    queryFn: () => paymentApi.getInsights(),
    staleTime: 120000,
  })

  // Fetch recent payment history
  const { data: historyData } = useQuery({
    queryKey: ['payment-history'],
    queryFn: () => paymentApi.getHistory({ limit: 5 }),
    staleTime: 60000,
  })

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Load Razorpay on demand (not eagerly) to avoid SDK console noise
  const loadRazorpayScript = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.Razorpay) {
        resolve()
        return
      }
      if (document.getElementById('razorpay-script')) {
        const existing = document.getElementById('razorpay-script') as HTMLScriptElement
        existing.addEventListener('load', () => { resolve() })
        existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay')))
        return
      }
      if (razorpayLoadingRef.current) return
      razorpayLoadingRef.current = true
      const script = document.createElement('script')
      script.id = 'razorpay-script'
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true
      script.onload = () => { resolve() }
      script.onerror = () => { razorpayLoadingRef.current = false; reject(new Error('Failed to load Razorpay')) }
      document.body.appendChild(script)
    })
  }, [])

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: (data: PaymentFormData) =>
      paymentApi.createOrder({
        amount: parseFloat(data.amount),
        merchant: data.merchant,
        description: data.description,
      }),
    onSuccess: (response) => {
      if (response.success && response.data) {
        openRazorpayCheckout(response.data)
      } else {
        toast.error(response.message || 'Failed to create order')
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create payment order')
    },
  })

  // Verify payment mutation
  const verifyMutation = useMutation({
    mutationFn: (data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) =>
      paymentApi.verifyPayment(data),
    onSuccess: (response) => {
      if (response.success) {
        setPaymentResult(response.data)
        setPaymentStep('success')
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
        queryClient.invalidateQueries({ queryKey: ['transactions'] })
        queryClient.invalidateQueries({ queryKey: ['payment-history'] })
        queryClient.invalidateQueries({ queryKey: ['payment-summary'] })
        queryClient.invalidateQueries({ queryKey: ['budget-progress'] })
        queryClient.invalidateQueries({ queryKey: ['smart-insights'] })
        toast.success('Payment successful! Expense auto-recorded 🎉')
      } else {
        setPaymentStep('failed')
        toast.error(response.message || 'Payment verification failed')
      }
    },
    onError: () => {
      setPaymentStep('failed')
      toast.error('Payment verification failed')
    },
  })

  const openRazorpayCheckout = (orderData: any) => {
    if (!window.Razorpay) {
      toast.error('Payment gateway not loaded. Please refresh.')
      return
    }
    const options = {
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency || 'INR',
      name: 'FinPal',
      description: `Payment to ${orderData.merchant}`,
      order_id: orderData.orderId,
      handler: function (response: any) {
        setPaymentStep('processing')
        verifyMutation.mutate({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        })
      },
      theme: { color: '#4f46e5' },
      modal: {
        ondismiss: () => toast('Payment cancelled', { icon: 'ℹ️' }),
      },
      method: { upi: true, card: true, netbanking: true, wallet: true },
    }
    const rzp = new window.Razorpay(options)
    rzp.on('payment.failed', (response: any) => {
      setPaymentStep('failed')
      toast.error(response.error?.description || 'Payment failed')
    })
    rzp.open()
  }

  const onSubmit = async (data: PaymentFormData) => {
    try {
      await loadRazorpayScript()
    } catch {
      toast.error('Failed to load payment gateway. Check your internet connection.')
      return
    }
    createOrderMutation.mutate(data)
  }

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

  const summary = upiSummaryData?.data
  const insights = insightsData?.data?.insights || []
  const recentPayments = (historyData?.data?.payments || []).filter((p: any) => p.status === 'captured')
  const budgetTotal = budgetData?.budget || 0
  const budgetSpent = budgetData?.spent || 0
  const budgetPct = budgetTotal > 0 ? Math.min(100, Math.round((budgetSpent / budgetTotal) * 100)) : 0
  const budgetRemaining = budgetTotal - budgetSpent

  const copyUpiId = () => {
    navigator.clipboard.writeText(`${user?.email?.split('@')[0] || 'user'}@finpal`)
    setCopiedUpi(true)
    toast.success('UPI ID copied!')
    setTimeout(() => setCopiedUpi(false), 2000)
  }

  // Category color mapping
  const categoryColors: Record<string, string> = {
    Food: 'bg-orange-100 text-orange-700',
    Groceries: 'bg-green-100 text-green-700',
    Shopping: 'bg-pink-100 text-pink-700',
    Transport: 'bg-blue-100 text-blue-700',
    Entertainment: 'bg-purple-100 text-purple-700',
    Utilities: 'bg-cyan-100 text-cyan-700',
    Healthcare: 'bg-red-100 text-red-700',
    Education: 'bg-indigo-100 text-indigo-700',
    Rent: 'bg-amber-100 text-amber-700',
    EMI: 'bg-rose-100 text-rose-700',
    Other: 'bg-gray-100 text-gray-700',
  }

  // ===================== RENDER =====================

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* ========== HEADER ========== */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 text-white">
        <div className="max-w-lg mx-auto px-4 pt-10 pb-6">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition">
              <ArrowLeft size={22} />
            </button>
            <div className="flex items-center gap-2">
              <button onClick={() => navigate('/reminders')} className="p-2 rounded-lg hover:bg-white/10 transition relative">
                <Bell size={20} />
              </button>
              <button
                onClick={() => navigate('/profile')}
                className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold"
              >
                {userName[0]?.toUpperCase()}
              </button>
            </div>
          </div>

          {/* Greeting */}
          <div className="mb-5">
            <p className="text-blue-200 text-sm">{getGreeting()},</p>
            <h1 className="text-2xl font-bold">{userName}!</h1>
          </div>

          {/* Balance Card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10"
          >
            <div className="flex items-center gap-2 mb-2">
              <Wallet size={16} className="text-blue-200" />
              <span className="text-blue-200 text-xs font-medium">Monthly Spending</span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold tracking-tight">
                  {formatCurrency(statsData?.totalSpent || 0)}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {statsData?.trends?.spent?.isPositive ? (
                    <TrendingUp size={12} className="text-red-300" />
                  ) : (
                    <TrendingDown size={12} className="text-green-300" />
                  )}
                    <span className="text-xs text-blue-200">
                    {statsData?.trends?.spent?.value ? `${Math.abs(statsData.trends.spent.value)}% vs last month` : 'This month'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-blue-200 text-xs">Budget Left</p>
                <p className={`text-lg font-bold ${budgetRemaining < 0 ? 'text-red-300' : 'text-green-300'}`}>
                  {formatCurrency(Math.abs(budgetRemaining))}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ========== MAIN CONTENT ========== */}
      <div className="max-w-lg mx-auto px-4 -mt-3">

        {/* Quick Actions Grid */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-sm p-5 mb-4"
        >
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { icon: QrCode, label: 'Scan & Pay', color: 'from-blue-500 to-blue-600', action: () => navigate('/scan-pay') },
              { icon: Send, label: 'Pay Contact', color: 'from-purple-500 to-purple-600', action: () => navigate('/pay/contacts') },
              { icon: ArrowDownLeft, label: 'Request', color: 'from-emerald-500 to-emerald-600', action: () => navigate('/pay/request') },
              { icon: CreditCard, label: 'Bank Transfer', color: 'from-blue-500 to-blue-600', action: () => navigate('/pay/bank-transfer') },
            ].map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                className="flex flex-col items-center gap-2 group"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-sm group-hover:shadow-md transition-all group-active:scale-95`}>
                  <item.icon size={22} className="text-white" />
                </div>
                <span className="text-[11px] font-medium text-gray-600 leading-tight text-center">{item.label}</span>
              </button>
            ))}
          </div>

          {/* UPI ID strip */}
          <div className="flex items-center justify-between bg-blue-50 rounded-xl px-3 py-2.5">
            <div className="flex items-center gap-2">
              <BadgeCheck size={16} className="text-blue-600" />
              <span className="text-xs text-gray-600">UPI ID: <span className="font-semibold text-blue-700">{user?.email?.split('@')[0] || 'user'}@finpal</span></span>
            </div>
            <button onClick={copyUpiId} className="text-blue-600 hover:text-blue-800">
              {copiedUpi ? <CheckCircle size={16} /> : <Copy size={14} />}
            </button>
          </div>
        </motion.div>

        {/* Smart Budget Widget */}
        {budgetData?.hasBudget && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl shadow-sm p-5 mb-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                <PieChart size={16} className="text-blue-600" />
                Budget Tracker
              </h3>
              <button onClick={() => navigate('/budget')} className="text-xs text-blue-600 font-medium flex items-center gap-0.5">
                View Details <ChevronRight size={12} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="text-center">
                <p className="text-[10px] text-gray-400 font-medium">Budget</p>
                <p className="text-sm font-bold text-gray-800">{formatCurrency(budgetTotal)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-400 font-medium">Spent</p>
                <p className="text-sm font-bold text-red-600">{formatCurrency(budgetSpent)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-400 font-medium">Remaining</p>
                <p className={`text-sm font-bold ${budgetRemaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(Math.abs(budgetRemaining))}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden mb-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(budgetPct, 100)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`h-full rounded-full ${budgetPct >= 100 ? 'bg-red-500' : budgetPct >= 80 ? 'bg-amber-500' : 'bg-green-500'}`}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>{budgetPct}% used</span>
              <span>{100 - Math.min(budgetPct, 100)}% left</span>
            </div>

            {/* AI Insight */}
            {insights.length > 0 && (
              <div className="mt-3 bg-amber-50 rounded-xl px-3 py-2.5 flex items-start gap-2">
                <Sparkles size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-800">{insights[0]?.message?.slice(0, 120) || 'AI insights loading...'}</p>
              </div>
            )}
          </motion.div>
        )}

        {/* UPI Monthly Stats */}
        {summary && summary.transactionCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-sm p-5 mb-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                <Zap size={16} className="text-purple-600" />
                UPI This Month
              </h3>
              <button onClick={() => navigate('/payments/history')} className="text-xs text-blue-600 font-medium flex items-center gap-0.5">
                All History <ChevronRight size={12} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-blue-50 rounded-xl p-3">
                <p className="text-[10px] text-blue-500 font-medium mb-1">Total UPI Spent</p>
                <p className="text-lg font-bold text-gray-800">₹{(summary.totalUpiSpent || 0).toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-3">
                <p className="text-[10px] text-purple-500 font-medium mb-1">Payments</p>
                <p className="text-lg font-bold text-gray-800">{summary.transactionCount}</p>
              </div>
            </div>
            {summary.categoryBreakdown?.length > 0 && (
              <div className="space-y-1.5">
                {summary.categoryBreakdown.slice(0, 3).map((cat: any) => (
                  <div key={cat.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${categoryColors[cat.category] || categoryColors.Other}`}>
                        {cat.category}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-700">₹{cat.total.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Recent Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-2xl shadow-sm p-5 mb-4"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
              <History size={16} className="text-gray-500" />
              Recent UPI Payments
            </h3>
            <button onClick={() => navigate('/payments/history')} className="text-xs text-blue-600 font-medium flex items-center gap-0.5">
              See All <ChevronRight size={12} />
            </button>
          </div>

          {recentPayments.length === 0 ? (
            <div className="text-center py-6">
              <Smartphone size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No UPI payments yet</p>
              <p className="text-xs text-gray-300">Make your first payment below!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentPayments.slice(0, 5).map((payment: any) => (
                <div key={payment._id} className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                    payment.status === 'captured' ? 'bg-green-50 text-green-600' :
                    payment.status === 'failed' ? 'bg-red-50 text-red-600' :
                    'bg-gray-50 text-gray-500'
                  }`}>
                    {payment.merchant?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{payment.merchant || 'Unknown'}</p>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        payment.status === 'captured' ? 'bg-green-50 text-green-600' :
                        payment.status === 'failed' ? 'bg-red-50 text-red-600' :
                        'bg-gray-50 text-gray-500'
                      }`}>
                        {payment.status === 'captured' ? 'Success' : payment.status === 'failed' ? 'Failed' : payment.status}
                      </span>
                      {payment.aiCategory && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${categoryColors[payment.aiCategory] || categoryColors.Other}`}>
                          {payment.aiCategory}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                        <Zap size={8} />Auto
                      </span>
                    </div>
                  </div>
                  <p className={`text-sm font-bold ${payment.status === 'captured' ? 'text-gray-800' : 'text-gray-400'}`}>
                    -₹{payment.amount?.toLocaleString('en-IN')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* AI Insights Preview */}
        {insights.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-sm p-5 mb-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                <Lightbulb size={16} className="text-amber-500" />
                Smart Insights
              </h3>
              <button onClick={() => navigate('/insights')} className="text-xs text-blue-600 font-medium flex items-center gap-0.5">
                View All <ChevronRight size={12} />
              </button>
            </div>
            <div className="space-y-2">
              {insights.slice(0, 3).map((insight: any, i: number) => (
                <div
                  key={insight.id || i}
                  className={`rounded-xl p-3 text-sm flex items-start gap-2 ${
                    insight.severity === 'critical' ? 'bg-red-50' :
                    insight.severity === 'warning' ? 'bg-amber-50' :
                    'bg-blue-50'
                  }`}
                >
                  {insight.severity === 'critical' ? (
                    <AlertTriangle size={14} className="text-red-600 mt-0.5 flex-shrink-0" />
                  ) : insight.severity === 'warning' ? (
                    <AlertTriangle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <Zap size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    <p className={`font-medium text-xs ${
                      insight.severity === 'critical' ? 'text-red-800' :
                      insight.severity === 'warning' ? 'text-amber-800' : 'text-blue-800'
                    }`}>{insight.title}</p>
                    <p className={`text-[11px] mt-0.5 ${
                      insight.severity === 'critical' ? 'text-red-600' :
                      insight.severity === 'warning' ? 'text-amber-600' : 'text-blue-600'
                    }`}>{insight.message?.slice(0, 100)}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Security badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="flex items-center justify-center gap-4 py-4 mb-4"
        >
          <div className="flex items-center gap-1 text-gray-400">
            <Shield size={12} />
            <span className="text-[10px]">RBI Compliant</span>
          </div>
          <div className="flex items-center gap-1 text-gray-400">
            <BadgeCheck size={12} />
            <span className="text-[10px]">256-bit Encrypted</span>
          </div>
          <div className="flex items-center gap-1 text-gray-400">
            <CheckCircle size={12} />
            <span className="text-[10px]">Auto-tracked</span>
          </div>
        </motion.div>
      </div>

      {/* ========== PAY BOTTOM SHEET ========== */}
      <AnimatePresence>
        {activeTab === 'pay' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setActiveTab('home'); setPaymentStep('form'); setPaymentResult(null) }} />

            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[92vh] overflow-y-auto"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>

              <div className="px-5 pb-8">
                <AnimatePresence mode="wait">
                  {/* PAY FORM */}
                  {paymentStep === 'form' && (
                    <motion.div key="pay-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <div className="flex items-center justify-between mb-5">
                        <h2 className="text-xl font-bold text-gray-800">Pay via UPI</h2>
                        <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full">
                          <Shield size={12} />
                          <span className="text-[10px] font-medium">Secure</span>
                        </div>
                      </div>

                      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {/* Amount Input */}
                        <div className="bg-gray-50 rounded-2xl p-4">
                          <label className="text-xs font-medium text-gray-500 mb-2 block">Amount</label>
                          <div className="flex items-center gap-2">
                            <span className="text-3xl text-gray-400">₹</span>
                            <input
                              type="number"
                              step="0.01"
                              min="1"
                              placeholder="0"
                              className="text-4xl font-bold text-gray-800 bg-transparent border-none outline-none w-full placeholder-gray-300"
                              {...register('amount', {
                                required: 'Amount is required',
                                min: { value: 1, message: 'Minimum ₹1' },
                              })}
                            />
                          </div>
                          {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
                        </div>

                        {/* Merchant */}
                        <div>
                          <label className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                            <Store size={12} /> Paying To
                          </label>
                          <input
                            type="text"
                            placeholder="e.g., Swiggy, Amazon, Rent"
                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            {...register('merchant', {
                              required: 'Merchant is required',
                              maxLength: { value: 200, message: 'Too long' },
                            })}
                          />
                          {errors.merchant && <p className="text-red-500 text-xs mt-1">{errors.merchant.message}</p>}
                        </div>

                        {/* Description */}
                        <div>
                          <label className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                            <FileText size={12} /> Note (optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g., Monthly grocery"
                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            {...register('description', { maxLength: { value: 500, message: 'Too long' } })}
                          />
                        </div>

                        {/* AI Auto-categorize badge */}
                        <div className="flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-2.5">
                          <Sparkles size={14} className="text-blue-600" />
                          <span className="text-xs text-blue-700 font-medium">Auto-categorize &amp; track via AI</span>
                          <div className="ml-auto w-8 h-5 bg-blue-600 rounded-full flex items-center justify-end px-0.5">
                            <div className="w-4 h-4 bg-white rounded-full" />
                          </div>
                        </div>

                        {/* CTA */}
                        <button
                          type="submit"
                          disabled={createOrderMutation.isPending}
                          className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-2xl text-lg disabled:opacity-50 flex items-center justify-center gap-2 hover:from-blue-700 hover:to-blue-800 transition-all active:scale-[0.98] shadow-lg shadow-blue-200"
                        >
                          {createOrderMutation.isPending ? (
                            <><Loader2 size={20} className="animate-spin" />Processing...</>
                          ) : (
                            <><Smartphone size={20} />Proceed to Pay ₹{amount ? parseFloat(amount).toLocaleString('en-IN') : '0'}</>
                          )}
                        </button>
                        <p className="text-center text-[10px] text-gray-400">Powered securely by Razorpay</p>
                      </form>
                    </motion.div>
                  )}

                  {/* PROCESSING */}
                  {paymentStep === 'processing' && (
                    <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center">
                      <Loader2 size={48} className="animate-spin mx-auto text-blue-600 mb-4" />
                      <h2 className="text-xl font-bold text-gray-800 mb-2">Verifying Payment...</h2>
                      <p className="text-gray-500 text-sm">Please wait while we confirm your transaction</p>
                    </motion.div>
                  )}

                  {/* SUCCESS */}
                  {paymentStep === 'success' && (
                    <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-8 text-center space-y-4">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', delay: 0.1 }}
                        className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto"
                      >
                        <CheckCircle size={40} className="text-green-600" />
                      </motion.div>
                      <h2 className="text-2xl font-bold text-gray-800">Payment Successful! 🎉</h2>
                      <p className="text-gray-500 text-sm">Expense auto-recorded &amp; AI categorized</p>

                      {paymentResult && (
                        <div className="bg-gray-50 rounded-2xl p-4 text-left space-y-2 mx-auto max-w-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-500 text-sm">Amount</span>
                            <span className="font-bold">₹{paymentResult.amount?.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 text-sm">Category</span>
                            <span className="font-medium text-blue-600 flex items-center gap-1">
                              <Sparkles size={12} />{paymentResult.category}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 text-sm">Payment ID</span>
                            <span className="text-xs text-gray-400 font-mono">{paymentResult.paymentId?.slice(0, 16)}...</span>
                          </div>
                        </div>
                      )}

                      {paymentResult?.budgetAlert && (
                        <div className={`rounded-2xl p-4 text-left max-w-xs mx-auto ${
                          paymentResult.budgetAlert.type === 'exceeded' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          <div className="flex items-start gap-2">
                            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                            <p className="text-sm">{paymentResult.budgetAlert.message}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-3 pt-2 max-w-xs mx-auto">
                        <button
                          onClick={() => { setPaymentStep('form'); setPaymentResult(null); reset() }}
                          className="flex-1 py-3 border border-gray-200 rounded-xl font-medium text-sm hover:bg-gray-50 active:scale-95 transition"
                        >
                          Pay Again
                        </button>
                        <button
                          onClick={() => { setActiveTab('home'); setPaymentStep('form'); setPaymentResult(null); reset() }}
                          className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 active:scale-95 transition"
                        >
                          Done
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* FAILED */}
                  {paymentStep === 'failed' && (
                    <motion.div key="failed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center space-y-4">
                      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                        <AlertTriangle size={40} className="text-red-600" />
                      </div>
                      <h2 className="text-xl font-bold text-gray-800">Payment Failed</h2>
                      <p className="text-gray-500 text-sm">No amount was deducted. Please try again.</p>
                      <button
                        onClick={() => setPaymentStep('form')}
                        className="py-3 px-8 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 active:scale-95 transition"
                      >
                        Try Again
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== FLOATING PAY BUTTON ========== */}
      {activeTab === 'home' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent">
          <div className="max-w-lg mx-auto">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab('pay')}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-2xl text-lg flex items-center justify-center gap-2 shadow-xl shadow-blue-200"
            >
              <Smartphone size={22} />
              Pay via UPI
            </motion.button>
          </div>
        </div>
      )}
    </div>
  )
}

export default UpiPaymentPage
