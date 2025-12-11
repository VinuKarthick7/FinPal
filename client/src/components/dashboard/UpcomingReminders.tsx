import React from 'react'
import { format } from 'date-fns'
import { Bell, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react'

interface Reminder {
  id: string
  title: string
  amount: number
  dueDate: string
  type: 'bill' | 'loan'
  isPaid: boolean
  daysUntilDue: number
}

interface UpcomingRemindersProps {
  reminders: Reminder[]
  onMarkPaid?: (id: string) => void
  onViewAll?: () => void
}

export const UpcomingReminders: React.FC<UpcomingRemindersProps> = ({
  reminders,
  onMarkPaid,
  onViewAll,
}) => {
  const getStatusColor = (daysUntilDue: number, isPaid: boolean) => {
    if (isPaid) return 'bg-green-100 text-green-600'
    if (daysUntilDue < 0) return 'bg-red-100 text-red-600'
    if (daysUntilDue <= 3) return 'bg-orange-100 text-orange-600'
    return 'bg-blue-100 text-blue-600'
  }

  const getStatusText = (daysUntilDue: number, isPaid: boolean) => {
    if (isPaid) return 'Paid'
    if (daysUntilDue < 0) return 'Overdue'
    if (daysUntilDue === 0) return 'Due Today'
    if (daysUntilDue === 1) return 'Tomorrow'
    return `${daysUntilDue} days`
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary-500" />
          <h3 className="font-semibold text-gray-900">Upcoming Reminders</h3>
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-primary-500 hover:text-primary-600 font-medium"
          >
            View All
          </button>
        )}
      </div>

      {/* Reminders List */}
      <div className="divide-y divide-gray-50">
        {reminders.length > 0 ? (
          reminders.slice(0, 3).map((reminder) => (
            <div
              key={reminder.id}
              className="flex items-center gap-3 p-3 sm:p-4"
            >
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  reminder.type === 'bill' ? 'bg-accent-100 text-accent-600' : 'bg-primary-100 text-primary-600'
                }`}
              >
                {reminder.type === 'bill' ? (
                  <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
                ) : (
                  <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate text-sm sm:text-base">
                  {reminder.title}
                </p>
                <p className="text-xs sm:text-sm text-gray-500">
                  Due {format(new Date(reminder.dueDate), 'MMM d, yyyy')}
                </p>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="font-semibold text-gray-900 text-sm sm:text-base">
                  ₹{reminder.amount.toLocaleString('en-IN')}
                </p>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${getStatusColor(
                    reminder.daysUntilDue,
                    reminder.isPaid
                  )}`}
                >
                  {reminder.isPaid && <CheckCircle2 className="w-3 h-3" />}
                  {getStatusText(reminder.daysUntilDue, reminder.isPaid)}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Bell className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm">No upcoming reminders</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default UpcomingReminders
