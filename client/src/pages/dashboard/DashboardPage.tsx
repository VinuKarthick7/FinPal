import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  PiggyBank,
  Plus,
  Calendar,
  Users,
} from 'lucide-react'
import {
  StatCard,
  TransactionList,
  CategoryBreakdown,
  UpcomingReminders,
  BudgetProgress,
  FamilyModeModal,
  FamilyModeCard,
  SuccessAnnouncement,
} from '@/components/dashboard'
import { Button, DashboardSkeleton, ErrorDisplay } from '@/components/ui'
import { dashboardApi, achievementApi } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

interface Transaction {
  id: string
  description: string
  amount: number
  category: string
  date: string
  type: 'expense' | 'income'
  merchant: string
  paymentMethod: string | any
}

interface DashboardStats {
  totalSpent: number
  totalIncome: number
  savings: number
  pendingBills: {
    amount: number
    count: number
  }
  trends: {
    spent: {
      value: number
      isPositive: boolean
    }
  }
  month: string
}

interface CategoryData {
  name: string
  amount: number
  percentage: number
  color: string
  count: number
}

interface BudgetData {
  hasBudget: boolean
  budget: number
  spent: number
  remaining: number
  percentage: number
  dailyAverage: number
  projectedTotal: number
  isOverBudget: boolean
  month: string
  previousBudget?: {
    _id: string
    month: number
    year: number
    totalBudget: number
  } | null
}

interface ReminderData {
  _id: string
  title: string
  amount: number
  dueDate: string
  type: 'bill' | 'loan'
  isPaid: boolean
  daysUntilDue: number
}

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const [isFamilyModeOpen, setIsFamilyModeOpen] = useState(false)
  const [showSuccessAnnouncement, setShowSuccessAnnouncement] = useState(false)
  const [announcementData, setAnnouncementData] = useState<any>(null)

  // Fetch dashboard stats
  const { data: statsData, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await dashboardApi.getStats()
      
      // SECURITY: Verify the data belongs to the logged-in user
      if (response.userEmail && user?.email) {
        if (response.userEmail.toLowerCase() !== user.email.toLowerCase()) {
          console.error('⚠️ Dashboard stats email mismatch!')
          throw new Error('Data validation failed')
        }
      }
      
      return response.data as DashboardStats
    },
    retry: 2,
  })

  // Fetch all expenses transactions (showing more transactions for home page)
  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ['expenses-transactions'],
    queryFn: async () => {
      const response = await dashboardApi.getTransactions({ limit: 20 })
      return response.data.transactions as Transaction[]
    },
    retry: 2,
  })

  // Fetch category breakdown
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['category-breakdown'],
    queryFn: async () => {
      const response = await dashboardApi.getCategoryBreakdown()
      return response.data as { categories: CategoryData[]; total: number }
    },
    retry: 2,
  })

  // Fetch reminders
  const { data: remindersData, isLoading: remindersLoading } = useQuery({
    queryKey: ['upcoming-reminders'],
    queryFn: async () => {
      const response = await dashboardApi.getReminders()
      return response.data as ReminderData[]
    },
    retry: 2,
  })

  // Fetch budget
  const { data: budgetData, isLoading: budgetLoading } = useQuery({
    queryKey: ['budget-progress'],
    queryFn: async () => {
      const response = await dashboardApi.getBudget()
      return response.data as BudgetData
    },
    retry: 2,
  })

  // Check for success announcement on mount
  useEffect(() => {
    const checkAnnouncement = async () => {
      try {
        const response = await achievementApi.checkAnnouncement()
        console.log('🔍 Checking announcement response:', response)
        
        if (response.success && response.data.showAnnouncement) {
          const { userEmail, achievement } = response.data
          
          // IMPORTANT: Verify the achievement belongs to the current logged-in user
          // This prevents showing rewards for other users' achievements
          if (user?.email && userEmail && user.email.toLowerCase() !== userEmail.toLowerCase()) {
            console.warn(`⚠️ User email mismatch: logged in as ${user.email}, but achievement is for ${userEmail}`)
            console.log('ℹ️ Skipping announcement - does not belong to current user')
            return
          }
          
          console.log(`🎊 Showing one-time reward popup for ${user?.email}`)
          console.log(`📊 Achievement: ${achievement.metadata?.savingsAmount ? `Saved ₹${achievement.metadata.savingsAmount}` : ''}, Budget Usage: ${achievement.metadata?.budgetUtilization}%`)
          
          setAnnouncementData(response.data)
          setShowSuccessAnnouncement(true)
        } else {
          console.log(`ℹ️ No reward to show for ${user?.email}`)
          if (response.data.userEmail) {
            console.log(`   Reason: Either budget was exceeded, no budget was set, or reward already shown`)
          }
        }
      } catch (error) {
        console.error('❌ Error checking announcement:', error)
      }
    }
    
    // Only check announcement if user is logged in
    if (user?.email) {
      checkAnnouncement()
    }
  }, [user?.email])

  const isLoading = statsLoading || transactionsLoading || categoriesLoading || remindersLoading || budgetLoading

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Get user's first name
  const userName = user?.fullName?.split(' ')[0] || 'User'
  const currentMonth = statsData?.month || new Date().toLocaleString('default', { month: 'long', year: 'numeric' })

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  }

  // Transform reminders for component
  const formattedReminders = remindersData?.filter(r => !r.isPaid).slice(0, 3).map(r => ({
    id: r._id,
    title: r.title,
    amount: r.amount,
    dueDate: r.dueDate,
    type: r.type,
    isPaid: r.isPaid,
    daysUntilDue: r.daysUntilDue,
  })) || []

  // Show skeleton while loading
  if (isLoading) {
    return <DashboardSkeleton />
  }

  // Show error state
  if (statsError) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <ErrorDisplay
          title={t('dashboard.loadFailed')}
          message={t('dashboard.loadFailedMessage')}
          onRetry={() => refetchStats()}
        />
      </div>
    )
  }

  console.log('🏠 Rendering dashboard home page')

  return (
    <div className="min-h-screen bg-surface-50">{/* Success Announcement Popup Overlay */}
      {showSuccessAnnouncement && announcementData && (
        <SuccessAnnouncement
          monthName={announcementData.monthName}
          year={announcementData.year || new Date().getFullYear()}
          savingsAmount={announcementData.achievement?.metadata?.savingsAmount}
          budgetUtilization={announcementData.achievement?.metadata?.budgetUtilization}
          message={announcementData.achievement?.metadata?.message}
          announcementKey={announcementData.announcementKey}
          onDismiss={() => {
            console.log('👋 Dismissing success announcement')
            setShowSuccessAnnouncement(false)
          }}
        />
      )}
      
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-primary-100 text-sm sm:text-base mb-1">{t('dashboard.goodMorning')},</p>
              <h1 className="text-2xl sm:text-3xl font-bold">{userName}! 👋</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 hide-scrollbar">
              <button
                onClick={() => navigate('/family')}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 active:bg-white/25 backdrop-blur-sm rounded-xl px-3 sm:px-4 py-2 transition-all active:scale-95 text-sm sm:text-base font-medium whitespace-nowrap flex-shrink-0"
              >
                <Users className="w-4 h-4" />
                <span>{t('nav.family')}</span>
              </button>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-3 sm:px-4 py-2 whitespace-nowrap flex-shrink-0">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">{currentMonth}</span>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => navigate('/add-expense')}
                leftIcon={<Plus className="w-4 h-4" />}
                className="hidden sm:flex flex-shrink-0"
              >
                {t('expenses.addExpense')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 -mt-4 sm:-mt-6"
      >
        {/* Stats Cards */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6"
        >
          <StatCard
            title={t('dashboard.totalSpent')}
            value={formatCurrency(statsData?.totalSpent || 0)}
            subtitle={t('dashboard.thisMonth')}
            icon={Wallet}
            color="primary"
            trend={statsData?.trends?.spent}
          />
          <StatCard
            title={t('dashboard.totalBudget')}
            value={formatCurrency(budgetData?.budget || 0)}
            subtitle={t('dashboard.thisMonth')}
            icon={TrendingUp}
            color="green"
          />
          <StatCard
            title={t('dashboard.savings')}
            value={formatCurrency(statsData?.savings || 0)}
            subtitle={t('dashboard.thisMonth')}
            icon={PiggyBank}
            color="secondary"
          />
          <StatCard
            title={t('dashboard.pendingBills')}
            value={formatCurrency(statsData?.pendingBills?.amount || 0)}
            subtitle={t('dashboard.billsUpcoming', { count: statsData?.pendingBills?.count || 0 })}
            icon={TrendingDown}
            color="accent"
          />
        </motion.div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Transactions & Budget */}
          <div className="lg:col-span-2 space-y-6">
            {/* Family Mode Feature Card */}
            <motion.div variants={itemVariants}>
              <FamilyModeCard onClick={() => navigate('/family')} />
            </motion.div>

            {/* Budget Progress */}
            <motion.div variants={itemVariants}>
              <BudgetProgress
                spent={budgetData?.spent || 0}
                budget={budgetData?.budget || 0}
                hasBudget={budgetData?.hasBudget || false}
                familyMode={false}
                previousBudget={budgetData?.previousBudget}
              />
            </motion.div>

            {/* Expenses Transactions */}
            <motion.div variants={itemVariants}>
              <TransactionList
                transactions={(transactionsData || [])
                  .filter(t => {
                    // Filter to current month only
                    const transactionDate = new Date(t.date)
                    const now = new Date()
                    return transactionDate.getMonth() === now.getMonth() && 
                           transactionDate.getFullYear() === now.getFullYear()
                  })
                  .map(t => ({
                    id: (t as any)._id || t.id,
                    description: (t as any).description || t.category,
                    amount: t.amount,
                    category: t.category,
                    merchant: t.merchant || '',
                    date: t.date,
                    type: t.type,
                    paymentMethod: t.paymentMethod || '',
                  }))}
                title={t('dashboard.expensesTransactions')}
                showViewAll={true}
                onViewAll={() => navigate('/expenses/all')}
                onTransactionClick={(t) => console.log('Clicked:', t)}
              />
            </motion.div>
          </div>

          {/* Right Column - Categories & Reminders */}
          <div className="space-y-6">
            {/* Category Breakdown */}
            <motion.div variants={itemVariants}>
              <CategoryBreakdown
                categories={categoriesData?.categories || []}
                total={categoriesData?.total || 0}
              />
            </motion.div>

            {/* Upcoming Reminders */}
            <motion.div variants={itemVariants}>
              <UpcomingReminders
                reminders={formattedReminders}
                onViewAll={() => navigate('/reminders')}
              />
            </motion.div>
          </div>
        </div>


        {/* Quick Actions - Mobile Only */}
        <motion.div variants={itemVariants} className="mt-6 lg:hidden">
          <div className="bg-white rounded-2xl border border-surface-200 shadow-sm p-4">
            <h3 className="font-semibold text-surface-900 mb-3">{t('dashboard.quickActions')}</h3>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => navigate('/add-expense')}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-primary-50 text-primary-600"
              >
                <Plus className="w-5 h-5" />
                <span className="text-xs font-medium">{t('common.add')}</span>
              </button>
              <button
                onClick={() => navigate('/expenses')}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-secondary-50 text-secondary-600"
              >
                <Wallet className="w-5 h-5" />
                <span className="text-xs font-medium">{t('nav.expenses')}</span>
              </button>
              <button
                onClick={() => navigate('/reminders')}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gold-50 text-gold-600"
              >
                <Calendar className="w-5 h-5" />
                <span className="text-xs font-medium">{t('nav.reminders')}</span>
              </button>
              <button
                onClick={() => navigate('/family')}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-accent-50 text-accent-600"
              >
                <Users className="w-5 h-5" />
                <span className="text-xs font-medium">{t('nav.family')}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Family Mode Modal */}
      <FamilyModeModal
        isOpen={isFamilyModeOpen}
        onClose={() => setIsFamilyModeOpen(false)}
      />
    </div>
  )
}

export default DashboardPage
