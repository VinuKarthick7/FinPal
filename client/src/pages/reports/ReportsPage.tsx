import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  PieChart,
  Download,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Users,
  User,
  CheckCircle,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useTranslation } from 'react-i18next'
import { Button, ErrorDisplay } from '@/components/ui'
import { reportsApi, familyReportsApi, familyApi } from '@/lib/api'
import toast from 'react-hot-toast'

// Types
interface MonthlyReport {
  month: string
  year: number
  totalExpenses: number
  totalIncome: number
  budget: number
  netSavings: number
  transactionCount: number
  averageExpense: number
  categories: Array<{
    name: string
    amount: number
    percentage: number
    count: number
  }>
  dailyBreakdown: Array<{
    date: string
    day: number
    expenses: number
    income: number
  }>
  topMerchants: Array<{
    merchant: string
    amount: number
    count: number
  }>
}

interface YearlyReport {
  year: number
  totalExpenses: number
  totalIncome: number
  netSavings: number
  monthlyData: Array<{
    month: number
    monthName: string
    expenses: number
    income: number
    savings: number
  }>
  averageMonthlyExpense: number
  highestSpendingMonth: {
    month: string
    amount: number
  }
  lowestSpendingMonth: {
    month: string
    amount: number
  }
  trend: 'increasing' | 'decreasing' | 'stable'
}

interface ComparisonReport {
  currentMonth: {
    month: string
    totalExpenses: number
    totalIncome: number
  }
  previousMonth: {
    month: string
    totalExpenses: number
    totalIncome: number
  }
  expenseChange: {
    amount: number
    percentage: number
    isIncrease: boolean
  }
  incomeChange: {
    amount: number
    percentage: number
    isIncrease: boolean
  }
}

// Family Report Types
interface FamilyMonthlyReport {
  familyId: string
  familyName: string
  month: string
  monthNumber: number
  year: number
  totalExpenses: number
  totalIncome: number
  netSavings: number
  totalBudget: number
  budgetUsedPercentage: number
  remainingBudget: number
  transactionCount: number
  memberCount: number
  categories: Array<{
    name: string
    amount: number
    percentage: number
  }>
  dailyBreakdown: Array<{
    date: string
    day: number
    expenses: number
    income: number
  }>
  memberBreakdown: Array<{
    userId: string
    email: string
    nickname: string
    relation: string
    expenses: number
    income: number
    transactionCount: number
    percentage: number
  }>
  lastUpdated: string
}

// Chart colors
const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#84CC16']

// Skeleton Components
const ChartSkeleton: React.FC<{ height?: string }> = ({ height = 'h-64' }) => (
  <div className={`${height} bg-gray-100 rounded-xl animate-pulse flex items-center justify-center`}>
    <BarChart3 className="w-12 h-12 text-gray-300" />
  </div>
)

const StatSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse">
    <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
    <div className="h-8 w-32 bg-gray-200 rounded" />
  </div>
)

export const ReportsPage: React.FC = () => {
  const { t } = useTranslation()
  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())
  const [activeTab, setActiveTab] = useState<'monthly' | 'yearly' | 'trends'>('monthly')
  const [isFamilyMode, setIsFamilyMode] = useState(false)

  // Check if user is part of a family
  const { data: familyData } = useQuery({
    queryKey: ['user-family'],
    queryFn: async () => {
      try {
        const response = await familyApi.getMyFamily()
        return response.data
      } catch {
        return null
      }
    },
  })

  const hasFamily = !!familyData

  // Fetch monthly report - Individual mode
  const { data: monthlyData, isLoading: monthlyLoading, isError: monthlyError } = useQuery({
    queryKey: ['reports-monthly', selectedMonth, selectedYear, isFamilyMode],
    queryFn: async () => {
      if (isFamilyMode && hasFamily) {
        const response = await familyReportsApi.getMonthly({ month: selectedMonth, year: selectedYear })
        return response.data as FamilyMonthlyReport
      }
      const response = await reportsApi.getMonthly({ month: selectedMonth, year: selectedYear })
      return response.data as MonthlyReport
    },
  })

  // Fetch family monthly report - Only when in family mode
  useQuery({
    queryKey: ['family-reports-monthly', selectedMonth, selectedYear],
    queryFn: async () => {
      const response = await familyReportsApi.getMonthly({ month: selectedMonth, year: selectedYear })
      return response.data as FamilyMonthlyReport
    },
    enabled: isFamilyMode && hasFamily,
  })

  // Fetch yearly report
  const { data: yearlyData, isLoading: yearlyLoading } = useQuery({
    queryKey: ['reports-yearly', selectedYear, isFamilyMode],
    queryFn: async () => {
      if (isFamilyMode && hasFamily) {
        const response = await familyReportsApi.getYearly({ year: selectedYear })
        return response.data as YearlyReport
      }
      const response = await reportsApi.getYearly({ year: selectedYear })
      return response.data as YearlyReport
    },
    enabled: activeTab === 'yearly',
  })

  // Fetch comparison
  const { data: comparisonData, isLoading: comparisonLoading } = useQuery({
    queryKey: ['reports-comparison'],
    queryFn: async () => {
      const response = await reportsApi.getComparison()
      return response.data as ComparisonReport
    },
  })

  // Fetch category trends
  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ['reports-trends'],
    queryFn: async () => {
      const response = await reportsApi.getCategoryTrends({ months: 6 })
      return response.data
    },
    enabled: activeTab === 'trends',
  })

  // Get sync status for family mode
  const { data: syncStatus } = useQuery({
    queryKey: ['family-sync-status'],
    queryFn: async () => {
      const response = await familyReportsApi.getSyncStatus()
      return response.data
    },
    enabled: isFamilyMode && hasFamily,
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const handlePreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12)
      setSelectedYear(selectedYear - 1)
    } else {
      setSelectedMonth(selectedMonth - 1)
    }
  }

  const handleNextMonth = () => {
    const now = new Date()
    const isCurrentMonth = selectedMonth === now.getMonth() + 1 && selectedYear === now.getFullYear()
    
    if (!isCurrentMonth) {
      if (selectedMonth === 12) {
        setSelectedMonth(1)
        setSelectedYear(selectedYear + 1)
      } else {
        setSelectedMonth(selectedMonth + 1)
      }
    }
  }

  // PDF-safe currency formatter (uses "Rs." instead of ₹ symbol for PDF compatibility)
  const formatCurrencyForPDF = (value: number): string => {
    const absValue = Math.abs(value)
    const formatted = absValue.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    const prefix = value < 0 ? '-Rs. ' : 'Rs. '
    return prefix + formatted
  }

  const handleExportPDF = async () => {
    try {
      const response = await reportsApi.exportData({ month: selectedMonth, year: selectedYear })
      const data = response.data

      // Create PDF document
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()

      // ===== HEADER SECTION =====
      // Title with professional green color
      doc.setFontSize(24)
      doc.setTextColor(16, 185, 129) // FinPal primary green
      doc.text('FinPal Financial Report', pageWidth / 2, 25, { align: 'center' })

      // Month/Year subtitle
      doc.setFontSize(16)
      doc.setTextColor(75, 85, 99) // Gray-600
      doc.text(`Monthly Report - ${monthNames[selectedMonth - 1]} ${selectedYear}`, pageWidth / 2, 35, { align: 'center' })

      // Generated date
      doc.setFontSize(11)
      doc.setTextColor(107, 114, 128) // Gray-500
      const generatedDate = new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
      doc.text(`Generated: ${generatedDate}`, pageWidth / 2, 43, { align: 'center' })

      // Horizontal divider line
      doc.setDrawColor(229, 231, 235) // Gray-200
      doc.setLineWidth(0.5)
      doc.line(14, 48, pageWidth - 14, 48)

      // ===== SUMMARY SECTION =====
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(31, 41, 55) // Gray-800
      doc.text('Summary', 14, 58)

      // Calculate values with proper validation
      const totalExpenses = data.summary?.totalExpenses || 0
      const totalIncome = data.summary?.totalIncome || 0
      const netSavings = totalIncome - totalExpenses // Always calculate correctly
      const transactionCount = data.summary?.transactionCount || 0
      const averageExpense = transactionCount > 0 ? totalExpenses / transactionCount : 0

      // Summary table with clean formatting
      const summaryData = [
        ['Total Income', formatCurrencyForPDF(totalIncome)],
        ['Total Expenses', formatCurrencyForPDF(totalExpenses)],
        ['Net Savings', formatCurrencyForPDF(netSavings)],
        ['Transaction Count', String(transactionCount)],
        ['Average Expense', formatCurrencyForPDF(averageExpense)],
      ]

      autoTable(doc, {
        startY: 62,
        head: [['Metric', 'Value']],
        body: summaryData,
        theme: 'striped',
        headStyles: {
          fillColor: [16, 185, 129],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 11,
        },
        bodyStyles: {
          fontSize: 10,
          textColor: [55, 65, 81],
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251],
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 80 },
          1: { halign: 'right', cellWidth: 80 },
        },
        margin: { left: 14, right: 14 },
        tableWidth: 'auto',
      })

      // ===== SPENDING BY CATEGORY SECTION =====
      const lastY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || 100
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(31, 41, 55)
      doc.text('Spending by Category', 14, lastY + 15)

      if (data.categories && data.categories.length > 0) {
        // Sort categories by amount (highest first)
        const sortedCategories = [...data.categories].sort((a: { amount: number }, b: { amount: number }) => b.amount - a.amount)
        
        // Recalculate percentages to ensure they sum to 100%
        const totalCategoryAmount = sortedCategories.reduce((sum: number, cat: { amount: number }) => sum + cat.amount, 0)
        
        const categoryData = sortedCategories.map((cat: { name: string; amount: number; percentage: number; count: number }) => {
          const accuratePercentage = totalCategoryAmount > 0 
            ? ((cat.amount / totalCategoryAmount) * 100).toFixed(1) 
            : '0.0'
          return [
            cat.name || 'Uncategorized',
            formatCurrencyForPDF(cat.amount),
            `${accuratePercentage}%`,
            String(cat.count || 0),
          ]
        })

        autoTable(doc, {
          startY: lastY + 20,
          head: [['Category', 'Amount', 'Percentage', 'Transactions']],
          body: categoryData,
          theme: 'striped',
          headStyles: {
            fillColor: [16, 185, 129],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 11,
          },
          bodyStyles: {
            fontSize: 10,
            textColor: [55, 65, 81],
          },
          alternateRowStyles: {
            fillColor: [249, 250, 251],
          },
          columnStyles: {
            0: { fontStyle: 'bold' },
            1: { halign: 'right' },
            2: { halign: 'center' },
            3: { halign: 'center' },
          },
          margin: { left: 14, right: 14 },
        })
      }

      // ===== TOP MERCHANTS SECTION =====
      const categoryY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || 150
      
      // Check if we need a new page
      if (categoryY > 220) {
        doc.addPage()
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(31, 41, 55)
        doc.text('Top Merchants', 14, 20)
      } else {
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(31, 41, 55)
        doc.text('Top Merchants', 14, categoryY + 15)
      }

      if (data.topMerchants && data.topMerchants.length > 0) {
        // Sort merchants by amount (highest first)
        const sortedMerchants = [...data.topMerchants].sort((a: { amount: number }, b: { amount: number }) => b.amount - a.amount)
        
        const merchantData = sortedMerchants.map((m: { merchant: string; amount: number; count: number }) => [
          m.merchant || 'Unknown Merchant',
          formatCurrencyForPDF(m.amount),
          String(m.count || 0),
        ])

        autoTable(doc, {
          startY: categoryY > 220 ? 25 : categoryY + 20,
          head: [['Merchant', 'Total Spent', 'Transactions']],
          body: merchantData,
          theme: 'striped',
          headStyles: {
            fillColor: [16, 185, 129],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 11,
          },
          bodyStyles: {
            fontSize: 10,
            textColor: [55, 65, 81],
          },
          alternateRowStyles: {
            fillColor: [249, 250, 251],
          },
          columnStyles: {
            0: { fontStyle: 'bold' },
            1: { halign: 'right' },
            2: { halign: 'center' },
          },
          margin: { left: 14, right: 14 },
        })
      }

      // ===== FOOTER =====
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(156, 163, 175) // Gray-400
        
        // Footer line
        const footerY = doc.internal.pageSize.getHeight() - 15
        doc.setDrawColor(229, 231, 235)
        doc.setLineWidth(0.3)
        doc.line(14, footerY, pageWidth - 14, footerY)
        
        doc.text(
          `Page ${i} of ${pageCount}  |  FinPal - Your Personal Finance Companion`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: 'center' }
        )
      }

      // Save the PDF
      doc.save(`FinPal-Report-${monthNames[selectedMonth - 1]}-${selectedYear}.pdf`)
      toast.success(t('reports.exportSuccess'))
    } catch (error) {
      console.error('Export failed:', error)
      toast.error(t('reports.exportFailed'))
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className={`pt-14 pb-8 px-4 ${isFamilyMode ? 'bg-gradient-to-br from-purple-600 via-indigo-500 to-blue-500' : 'bg-gradient-to-br from-primary-600 via-primary-500 to-accent-500'}`}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg mx-auto"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white">
                {isFamilyMode ? t('reports.familyReports') : t('reports.reportsAnalytics')}
              </h1>
              <p className="text-white/70 text-sm mt-1">
                {isFamilyMode && familyData ? `${familyData.familyName} • ${familyData.members?.length || 0} ${t('family.members')}` : t('reports.trackInsights')}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportPDF}
              className="flex items-center gap-2 bg-white/20 text-white border-white/30 hover:bg-white/30"
            >
              <Download className="w-4 h-4" />
              {t('reports.export')}
            </Button>
          </div>

          {/* Family Mode Toggle - Only show if user has a family */}
          {hasFamily && (
            <div className="flex items-center justify-center gap-2 mb-4">
              <button
                onClick={() => setIsFamilyMode(false)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  !isFamilyMode 
                    ? 'bg-white text-gray-800 shadow-lg' 
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <User className="w-4 h-4" />
                Personal
              </button>
              <button
                onClick={() => setIsFamilyMode(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  isFamilyMode 
                    ? 'bg-white text-gray-800 shadow-lg' 
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <Users className="w-4 h-4" />
                Family
              </button>
            </div>
          )}

          {/* Sync Status for Family Mode */}
          {isFamilyMode && syncStatus && (
            <div className="flex items-center justify-center gap-2 mb-4 text-white/80 text-xs">
              <CheckCircle className="w-3 h-3 text-green-300" />
              <span>{t('reports.dataSynced')} • {t('reports.lastUpdated')}: {new Date(syncStatus.familyLastSynced).toLocaleTimeString()}</span>
            </div>
          )}

          {/* Month Selector */}
          <div className="flex items-center justify-center gap-4 bg-white/10 rounded-xl p-3 backdrop-blur-sm">
            <button
              onClick={handlePreviousMonth}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center min-w-[160px]">
              <span className="text-lg font-semibold text-white">
                {monthNames[selectedMonth - 1]} {selectedYear}
              </span>
            </div>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-4">
        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-1.5 mb-6"
        >
          <div className="flex gap-1">
            {(['monthly', 'yearly', 'trends'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t(`reports.${tab}`)}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Family Mode Summary Cards */}
        {isFamilyMode && monthlyData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 gap-3 mb-6"
          >
            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-white/70" />
                <p className="text-xs text-white/70">{t('reports.totalExpenses')}</p>
              </div>
              <p className="text-xl font-bold text-white">
                {formatCurrency(monthlyData.totalExpenses || 0)}
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-white/70" />
                <p className="text-xs text-white/70">{t('reports.totalBudget')}</p>
              </div>
              <p className="text-xl font-bold text-white">
                {formatCurrency((monthlyData as FamilyMonthlyReport).totalBudget || 0)}
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-white/70" />
                <p className="text-xs text-white/70">{t('reports.transactions')}</p>
              </div>
              <p className="text-xl font-bold text-white">
                {(monthlyData as FamilyMonthlyReport).transactionCount || 0}
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-white/70" />
                <p className="text-xs text-white/70">{t('reports.avgExpense')}</p>
              </div>
              <p className="text-xl font-bold text-white">
                {formatCurrency(
                  (monthlyData as FamilyMonthlyReport).transactionCount > 0 
                    ? monthlyData.totalExpenses / (monthlyData as FamilyMonthlyReport).transactionCount 
                    : 0
                )}
              </p>
            </div>
          </motion.div>
        )}

        {/* Budget Progress for Family Mode */}
        {isFamilyMode && (monthlyData as FamilyMonthlyReport)?.totalBudget && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800">{t('reports.familyBudget')}</h3>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                ((monthlyData as FamilyMonthlyReport).budgetUsedPercentage || 0) > 90 
                  ? 'bg-red-100 text-red-600' 
                  : ((monthlyData as FamilyMonthlyReport).budgetUsedPercentage || 0) > 70 
                  ? 'bg-yellow-100 text-yellow-600' 
                  : 'bg-green-100 text-green-600'
              }`}>
                {t('reports.budgetUsed', { percentage: ((monthlyData as FamilyMonthlyReport).budgetUsedPercentage || 0).toFixed(0) })}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">
                {t('reports.spent')}: {formatCurrency(monthlyData?.totalExpenses || 0)}
              </span>
              <span className="text-gray-600">
                {t('dashboard.budget')}: {formatCurrency((monthlyData as FamilyMonthlyReport)?.totalBudget || 0)}
              </span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  ((monthlyData as FamilyMonthlyReport).budgetUsedPercentage || 0) > 90 
                    ? 'bg-red-500' 
                    : ((monthlyData as FamilyMonthlyReport).budgetUsedPercentage || 0) > 70 
                    ? 'bg-yellow-500' 
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min((monthlyData as FamilyMonthlyReport).budgetUsedPercentage || 0, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              {t('reports.remaining')}: {formatCurrency((monthlyData as FamilyMonthlyReport).remainingBudget || 0)}
            </p>
          </motion.div>
        )}

        {/* Comparison Cards - Only show in Personal Mode */}
        {!isFamilyMode && (comparisonLoading ? (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <StatSkeleton />
            <StatSkeleton />
          </div>
        ) : comparisonData?.expenseChange ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 gap-4 mb-6"
          >
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">{t('reports.vsLastMonth')}</p>
              <p className="text-lg font-bold text-gray-800">
                {comparisonData.expenseChange.isIncrease ? '+' : '-'}
                {formatCurrency(Math.abs(comparisonData.expenseChange.amount))}
              </p>
              <div className={`flex items-center gap-1 mt-1 ${
                comparisonData.expenseChange.isIncrease ? 'text-red-500' : 'text-green-500'
              }`}>
                {comparisonData.expenseChange.isIncrease ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                <span className="text-xs font-medium">
                  {comparisonData.expenseChange.percentage.toFixed(1)}% {t('reports.spending')}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">{t('reports.netSavings')}</p>
              <p className="text-lg font-bold text-gray-800">
                {formatCurrency(monthlyData?.netSavings || 0)}
              </p>
              <div className="flex items-center gap-1 mt-1 text-primary-500">
                <TrendingUp className="w-3 h-3" />
                <span className="text-xs font-medium">{t('dashboard.thisMonth')}</span>
              </div>
            </div>
          </motion.div>
        ) : null)}

        {monthlyError ? (
          <ErrorDisplay message={t('reports.loadFailed')} onRetry={() => window.location.reload()} />
        ) : (
          <>
            {/* Monthly Tab Content */}
            {activeTab === 'monthly' && (
              <div className="space-y-6">
                {/* Spending Overview Chart */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-gray-800">{t('reports.dailySpending')}</h2>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-red-400" />
                        <span className="text-gray-500">{t('reports.expenses')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-400" />
                        <span className="text-gray-500">{t('dashboard.income')}</span>
                      </div>
                    </div>
                  </div>

                  {monthlyLoading ? (
                    <ChartSkeleton />
                  ) : monthlyData?.dailyBreakdown ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={monthlyData.dailyBreakdown}>
                        <defs>
                          <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="day" 
                          tick={{ fontSize: 10, fill: '#9CA3AF' }}
                          axisLine={{ stroke: '#E5E7EB' }}
                        />
                        <YAxis 
                          tick={{ fontSize: 10, fill: '#9CA3AF' }}
                          axisLine={{ stroke: '#E5E7EB' }}
                          tickFormatter={(value) => formatCurrency(Number(value))}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #E5E7EB',
                            borderRadius: '12px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          }}
                          formatter={(value: number) => [formatCurrency(value)]}
                        />
                        <Area
                          type="monotone"
                          dataKey="expenses"
                          stroke="#EF4444"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#expenseGradient)"
                        />
                        <Area
                          type="monotone"
                          dataKey="income"
                          stroke="#10B981"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#incomeGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-gray-400">
                      {t('reports.noDataThisMonth')}
                    </div>
                  )}
                </motion.div>

                {/* Category Breakdown Pie Chart */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-gray-800">{t('dashboard.spendingByCategory')}</h2>
                    <PieChart className="w-4 h-4 text-gray-400" />
                  </div>

                  {monthlyLoading ? (
                    <ChartSkeleton />
                  ) : monthlyData?.categories && monthlyData.categories.length > 0 ? (
                    <div className="flex items-center gap-6">
                      <div className="w-1/2">
                        <ResponsiveContainer width="100%" height={160}>
                          <RechartsPieChart>
                            <Pie
                              data={monthlyData.categories}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={70}
                              paddingAngle={2}
                              dataKey="amount"
                            >
                              {monthlyData.categories.map((entry, index) => (
                                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: number) => [formatCurrency(value)]}
                            />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="w-1/2 space-y-2">
                        {monthlyData.categories.slice(0, 5).map((category, index) => (
                          <div key={category.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              />
                              <span className="text-xs text-gray-600 truncate max-w-[80px]">
                                {category.name}
                              </span>
                            </div>
                            <span className="text-xs font-medium text-gray-800">
                              {category.percentage.toFixed(0)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-40 flex items-center justify-center text-gray-400">
                      {t('reports.noCategoryData')}
                    </div>
                  )}
                </motion.div>

                {/* Family Member Breakdown - Only show in Family Mode */}
                {isFamilyMode && (monthlyData as FamilyMonthlyReport)?.memberBreakdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base font-semibold text-gray-800">{t('reports.memberBreakdown')}</h2>
                      <Users className="w-4 h-4 text-purple-500" />
                    </div>

                    <div className="space-y-3">
                      {(monthlyData as FamilyMonthlyReport).memberBreakdown.map((member, index) => (
                        <div key={member.userId} className="bg-gray-50 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              >
                                {member.nickname?.charAt(0).toUpperCase() || '?'}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-800">{member.nickname}</p>
                                <p className="text-xs text-gray-500">{member.relation} • {member.email}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-gray-800">{formatCurrency(member.expenses)}</p>
                              <p className="text-xs text-gray-500">{member.percentage.toFixed(1)}%</p>
                            </div>
                          </div>
                          {/* Progress bar */}
                          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all"
                              style={{ 
                                width: `${member.percentage}%`,
                                backgroundColor: COLORS[index % COLORS.length]
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Data Accuracy Notice */}
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500 text-center">
                        {t('reports.dataMappedByEmail')}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Top Merchants */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
                >
                  <h2 className="text-base font-semibold text-gray-800 mb-4">{t('reports.topMerchants')}</h2>

                  {monthlyLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : (monthlyData as MonthlyReport)?.topMerchants && (monthlyData as MonthlyReport).topMerchants.length > 0 ? (
                    <div className="space-y-3">
                      {(monthlyData as MonthlyReport).topMerchants?.slice(0, 5).map((merchant, index) => (
                        <div
                          key={merchant.merchant}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                              <span className="text-xs font-bold text-primary-600">{index + 1}</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-800">{merchant.merchant}</p>
                              <p className="text-xs text-gray-500">{merchant.count} transactions</p>
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-gray-800">
                            {formatCurrency(merchant.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-32 flex items-center justify-center text-gray-400">
                      {t('reports.noMerchantData')}
                    </div>
                  )}
                </motion.div>

                {/* Monthly Summary Stats */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="grid grid-cols-2 gap-4"
                >
                  <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-4 text-white">
                    <TrendingDown className="w-6 h-6 mb-2 opacity-80" />
                    <p className="text-xs opacity-80">{t('reports.totalExpenses')}</p>
                    <p className="text-xl font-bold">
                      {monthlyLoading ? '...' : formatCurrency(monthlyData?.totalExpenses || 0)}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 text-white">
                    <TrendingUp className="w-6 h-6 mb-2 opacity-80" />
                    <p className="text-xs opacity-80">{t('reports.totalBudget')}</p>
                    <p className="text-xl font-bold">
                      {monthlyLoading ? '...' : formatCurrency((monthlyData as MonthlyReport)?.budget || 0)}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white">
                    <FileText className="w-6 h-6 mb-2 opacity-80" />
                    <p className="text-xs opacity-80">{t('reports.transactions')}</p>
                    <p className="text-xl font-bold">
                      {monthlyLoading ? '...' : monthlyData?.transactionCount || 0}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 text-white">
                    <DollarSign className="w-6 h-6 mb-2 opacity-80" />
                    <p className="text-xs opacity-80">{t('reports.avgExpense')}</p>
                    <p className="text-xl font-bold">
                      {monthlyLoading ? '...' : formatCurrency((monthlyData as MonthlyReport)?.averageExpense || 0)}
                    </p>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Yearly Tab Content */}
            {activeTab === 'yearly' && (
              <div className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-gray-800">{t('reports.monthlyOverview', { year: selectedYear })}</h2>
                    <BarChart3 className="w-4 h-4 text-gray-400" />
                  </div>

                  {yearlyLoading ? (
                    <ChartSkeleton height="h-72" />
                  ) : yearlyData?.monthlyData ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={yearlyData.monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="monthName"
                          tick={{ fontSize: 10, fill: '#9CA3AF' }}
                          axisLine={{ stroke: '#E5E7EB' }}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: '#9CA3AF' }}
                          axisLine={{ stroke: '#E5E7EB' }}
                          tickFormatter={(value) => formatCurrency(Number(value))}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #E5E7EB',
                            borderRadius: '12px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          }}
                          formatter={(value: number) => [formatCurrency(value)]}
                        />
                        <Legend />
                        <Bar dataKey="expenses" name="Expenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="income" name="Income" fill="#10B981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-72 flex items-center justify-center text-gray-400">
                      {t('reports.noYearlyData')}
                    </div>
                  )}
                </motion.div>

                {/* Yearly Stats */}
                {yearlyData && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-1 gap-4"
                  >
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xs text-gray-500">{t('reports.totalExpenses')}</p>
                          <p className="text-lg font-bold text-red-500">
                            {formatCurrency(yearlyData.totalExpenses)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">{t('reports.totalIncome')}</p>
                          <p className="text-lg font-bold text-green-500">
                            {formatCurrency(yearlyData.totalIncome)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">{t('reports.netSavings')}</p>
                          <p className={`text-lg font-bold ${yearlyData.netSavings >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
                            {formatCurrency(yearlyData.netSavings)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                      <h3 className="text-sm font-semibold text-gray-800 mb-4">{t('reports.yearHighlights')}</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{t('reports.avgMonthlyExpense')}</span>
                          <span className="text-sm font-medium">{formatCurrency(yearlyData.averageMonthlyExpense)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{t('reports.highestSpending')}</span>
                          <span className="text-sm font-medium text-red-500">
                            {yearlyData.highestSpendingMonth?.month} ({formatCurrency(yearlyData.highestSpendingMonth?.amount || 0)})
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{t('reports.lowestSpending')}</span>
                          <span className="text-sm font-medium text-green-500">
                            {yearlyData.lowestSpendingMonth?.month} ({formatCurrency(yearlyData.lowestSpendingMonth?.amount || 0)})
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{t('reports.spendingTrend')}</span>
                          <span className={`text-sm font-medium capitalize ${
                            yearlyData.trend === 'increasing' ? 'text-red-500' :
                            yearlyData.trend === 'decreasing' ? 'text-green-500' : 'text-gray-500'
                          }`}>
                            {yearlyData.trend}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* Trends Tab Content */}
            {activeTab === 'trends' && (
              <div className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-gray-800">{t('reports.categoryTrends')}</h2>
                    <TrendingUp className="w-4 h-4 text-gray-400" />
                  </div>

                  {trendsLoading ? (
                    <ChartSkeleton height="h-72" />
                  ) : trendsData?.trends && trendsData.trends.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={trendsData.months}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 10, fill: '#9CA3AF' }}
                          axisLine={{ stroke: '#E5E7EB' }}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: '#9CA3AF' }}
                          axisLine={{ stroke: '#E5E7EB' }}
                          tickFormatter={(value) => formatCurrency(Number(value))}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #E5E7EB',
                            borderRadius: '12px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          }}
                          formatter={(value: number) => [formatCurrency(value)]}
                        />
                        <Legend />
                        {trendsData.trends.slice(0, 5).map((trend: { category: string }, index: number) => (
                          <Line
                            key={trend.category}
                            type="monotone"
                            dataKey={trend.category}
                            stroke={COLORS[index % COLORS.length]}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-72 flex items-center justify-center text-gray-400">
                      {t('reports.noTrendData')}
                    </div>
                  )}
                </motion.div>

                {/* Category Trend Cards */}
                {trendsData?.trends && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="space-y-3"
                  >
                    {trendsData.trends.slice(0, 5).map((trend: { 
                      category: string
                      totalSpent: number
                      averageMonthly: number
                      trend: 'increasing' | 'decreasing' | 'stable'
                      percentageChange: number
                    }, index: number) => (
                      <div
                        key={trend.category}
                        className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-800">{trend.category}</p>
                            <p className="text-xs text-gray-500">
                              {t('reports.avg')}: {formatCurrency(trend.averageMonthly)}/mo
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-800">
                            {formatCurrency(trend.totalSpent)}
                          </p>
                          <div className={`flex items-center justify-end gap-1 text-xs ${
                            trend.trend === 'increasing' ? 'text-red-500' :
                            trend.trend === 'decreasing' ? 'text-green-500' : 'text-gray-500'
                          }`}>
                            {trend.trend === 'increasing' ? <ArrowUpRight className="w-3 h-3" /> :
                             trend.trend === 'decreasing' ? <ArrowDownRight className="w-3 h-3" /> : null}
                            <span>{trend.percentageChange.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default ReportsPage
