import React from 'react'
import { format } from 'date-fns'
import {
  ShoppingCart,
  Utensils,
  Car,
  Zap,
  Heart,
  Film,
  GraduationCap,
  Home,
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownLeft,
  LucideIcon,
} from 'lucide-react'

export interface Transaction {
  id: string
  amount: number
  category: string
  merchant: string
  date: string
  type: 'expense' | 'income'
  paymentMethod: 'cash' | 'upi' | 'card' | 'other'
}

const categoryIcons: Record<string, LucideIcon> = {
  shopping: ShoppingCart,
  food: Utensils,
  transport: Car,
  utilities: Zap,
  health: Heart,
  entertainment: Film,
  education: GraduationCap,
  rent: Home,
  other: MoreHorizontal,
}

const categoryColors: Record<string, string> = {
  shopping: 'bg-purple-100 text-purple-600',
  food: 'bg-orange-100 text-orange-600',
  transport: 'bg-blue-100 text-blue-600',
  utilities: 'bg-yellow-100 text-yellow-600',
  health: 'bg-red-100 text-red-600',
  entertainment: 'bg-pink-100 text-pink-600',
  education: 'bg-indigo-100 text-indigo-600',
  rent: 'bg-green-100 text-green-600',
  other: 'bg-gray-100 text-gray-600',
}

interface TransactionItemProps {
  transaction: Transaction
  onClick?: () => void
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
  onClick,
}) => {
  const Icon = categoryIcons[transaction.category.toLowerCase()] || MoreHorizontal
  const colorClass = categoryColors[transaction.category.toLowerCase()] || categoryColors.other

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 sm:p-4 rounded-xl hover:bg-gray-50 transition-colors text-left"
    >
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${colorClass} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate text-sm sm:text-base">
          {transaction.merchant}
        </p>
        <p className="text-xs sm:text-sm text-gray-500 capitalize">
          {transaction.category} • {format(new Date(transaction.date), 'MMM d')}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p
          className={`font-semibold text-sm sm:text-base ${
            transaction.type === 'expense' ? 'text-red-500' : 'text-green-500'
          }`}
        >
          {transaction.type === 'expense' ? '-' : '+'}₹{transaction.amount.toLocaleString('en-IN')}
        </p>
        <p className="text-xs text-gray-400 uppercase">{transaction.paymentMethod}</p>
      </div>
    </button>
  )
}

interface TransactionListProps {
  transactions: Transaction[]
  title?: string
  showViewAll?: boolean
  onViewAll?: () => void
  onTransactionClick?: (transaction: Transaction) => void
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  title = 'Recent Transactions',
  showViewAll = true,
  onViewAll,
  onTransactionClick,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {showViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1"
          >
            View All
            <ArrowUpRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Transactions */}
      <div className="divide-y divide-gray-50">
        {transactions.length > 0 ? (
          transactions.map((transaction) => (
            <TransactionItem
              key={transaction.id}
              transaction={transaction}
              onClick={() => onTransactionClick?.(transaction)}
            />
          ))
        ) : (
          <div className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <ShoppingCart className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">No transactions yet</p>
            <p className="text-sm text-gray-400 mt-1">Add your first expense to get started</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default TransactionList
