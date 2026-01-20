import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Plus,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  Trash2,
  Edit3,
  X,
  Loader2,
  Receipt,
  CreditCard,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui'
import { remindersApi } from '@/lib/api'

interface Reminder {
  _id: string
  title: string
  amount: number
  dueDate: string
  type: 'bill' | 'loan' | 'subscription'
  isPaid: boolean
  paidDate?: string
  recurring: boolean
  recurringPeriod?: 'monthly' | 'quarterly' | 'yearly'
  notes?: string
}

const typeIcons: Record<string, React.ReactNode> = {
  bill: <Receipt className="w-5 h-5" />,
  loan: <CreditCard className="w-5 h-5" />,
  subscription: <RefreshCw className="w-5 h-5" />,
}

const typeColors: Record<string, string> = {
  bill: 'bg-blue-100 text-blue-600',
  loan: 'bg-purple-100 text-purple-600',
  subscription: 'bg-teal-100 text-teal-600',
}

const typeLabels: Record<string, string> = {
  bill: '📄 Bill',
  loan: '💳 Loan',
  subscription: '🔄 Subscription',
}

export const RemindersPage: React.FC = () => {
  const queryClient = useQueryClient()
  
  const [activeReminder, setActiveReminder] = useState<Reminder | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'paid'>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['reminders'],
    queryFn: () => remindersApi.getAll(),
  })

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => remindersApi.markAsPaid(id),
    onSuccess: () => {
      toast.success('Marked as paid!')
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
    onError: () => toast.error('Failed to update reminder'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remindersApi.delete(id),
    onSuccess: () => {
      toast.success('Reminder deleted')
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
      setDeleteId(null)
    },
    onError: () => toast.error('Failed to delete reminder'),
  })

  const reminders: Reminder[] = data?.data || []

  const filteredReminders = reminders.filter((r) => {
    if (filter === 'upcoming') return !r.isPaid
    if (filter === 'paid') return r.isPaid
    return true
  })

  const overdueReminders = filteredReminders.filter(
    (r) => !r.isPaid && new Date(r.dueDate) < new Date()
  )
  const upcomingReminders = filteredReminders.filter(
    (r) => !r.isPaid && new Date(r.dueDate) >= new Date()
  )
  const paidReminders = filteredReminders.filter((r) => r.isPaid)

  // Stats
  const totalUpcoming = reminders.filter((r) => !r.isPaid).reduce((sum, r) => sum + r.amount, 0)
  const totalOverdue = overdueReminders.reduce((sum, r) => sum + r.amount, 0)
  const totalPaidThisMonth = reminders
    .filter((r) => {
      if (!r.isPaid || !r.paidDate) return false
      const pd = new Date(r.paidDate)
      const now = new Date()
      return pd.getMonth() === now.getMonth() && pd.getFullYear() === now.getFullYear()
    })
    .reduce((sum, r) => sum + r.amount, 0)

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const due = new Date(dueDate); due.setHours(0, 0, 0, 0)
    return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  const ReminderCard = ({ reminder, index }: { reminder: Reminder; index: number }) => {
    const daysUntil = getDaysUntilDue(reminder.dueDate)
    const isOverdue = daysUntil < 0 && !reminder.isPaid
    const isDueSoon = daysUntil >= 0 && daysUntil <= 3 && !reminder.isPaid

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className={`group bg-white rounded-xl border p-4 transition-all hover:shadow-md ${
          isOverdue ? 'border-red-200'
            : isDueSoon ? 'border-orange-200'
            : reminder.isPaid ? 'border-green-200'
            : 'border-gray-200'
        }`}
      >
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${typeColors[reminder.type]}`}>
            {typeIcons[reminder.type]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-gray-900">{reminder.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500 capitalize">{reminder.type}</span>
                  {reminder.recurring && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" />{reminder.recurringPeriod}
                    </span>
                  )}
                </div>
              </div>
              <p className="font-bold text-gray-900">{formatCurrency(reminder.amount)}</p>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div>
                {reminder.isPaid ? (
                  <span className="flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle2 className="w-4 h-4" />Paid {formatDate(reminder.paidDate!)}
                  </span>
                ) : isOverdue ? (
                  <span className="flex items-center gap-1 text-sm text-red-600">
                    <AlertTriangle className="w-4 h-4" />{Math.abs(daysUntil)} days overdue
                  </span>
                ) : isDueSoon ? (
                  <span className="flex items-center gap-1 text-sm text-orange-600">
                    <Clock className="w-4 h-4" />{daysUntil === 0 ? 'Due today!' : `${daysUntil} days left`}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />Due {formatDate(reminder.dueDate)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!reminder.isPaid && (
                  <button onClick={() => markPaidMutation.mutate(reminder._id)} disabled={markPaidMutation.isPending}
                    className="p-2 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors" title="Mark as paid">
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => { setActiveReminder(reminder); setIsModalOpen(true) }} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Edit">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button onClick={() => setDeleteId(reminder._id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reminders</h1>
          <p className="text-gray-500 text-sm">Track your bills, loans & subscriptions</p>
        </div>
        <Button onClick={() => { setActiveReminder(null); setIsModalOpen(true) }} leftIcon={<Plus className="w-4 h-4" />}>
          Add Reminder
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="w-4 h-4 text-orange-600" />
            </div>
            <span className="text-sm text-gray-500">Due Soon</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalUpcoming)}</p>
          <p className="text-xs text-gray-400 mt-1">{reminders.filter(r => !r.isPaid).length} pending payments</p>
        </div>

        <div className={`rounded-xl border p-4 ${totalOverdue > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-2 rounded-lg ${totalOverdue > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
              <AlertTriangle className={`w-4 h-4 ${totalOverdue > 0 ? 'text-red-600' : 'text-gray-400'}`} />
            </div>
            <span className="text-sm text-gray-500">Overdue</span>
          </div>
          <p className={`text-2xl font-bold ${totalOverdue > 0 ? 'text-red-600' : 'text-gray-900'}`}>{formatCurrency(totalOverdue)}</p>
          <p className="text-xs text-gray-400 mt-1">{overdueReminders.length} overdue</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">Paid This Month</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalPaidThisMonth)}</p>
          <p className="text-xs text-gray-400 mt-1">Great job! 🎉</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-1.5 flex gap-1 mb-6">
        {(['all', 'upcoming', 'paid'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              filter === f ? 'bg-primary-500 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}>
            {f === 'all' && `All (${reminders.length})`}
            {f === 'upcoming' && `Upcoming (${reminders.filter((r) => !r.isPaid).length})`}
            {f === 'paid' && `Paid (${reminders.filter((r) => r.isPaid).length})`}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : filteredReminders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <Bell className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No reminders yet</h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">Add your bills, loans, and subscriptions to never miss a payment</p>
          <Button onClick={() => { setActiveReminder(null); setIsModalOpen(true) }}>
            <Plus className="w-4 h-4 mr-2" />Add Your First Reminder
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {filter !== 'paid' && overdueReminders.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />Overdue ({overdueReminders.length})
              </h2>
              <div className="space-y-3">
                {overdueReminders.map((r, i) => <ReminderCard key={r._id} reminder={r} index={i} />)}
              </div>
            </div>
          )}
          {filter !== 'paid' && upcomingReminders.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />Upcoming ({upcomingReminders.length})
              </h2>
              <div className="space-y-3">
                {upcomingReminders.map((r, i) => <ReminderCard key={r._id} reminder={r} index={i} />)}
              </div>
            </div>
          )}
          {filter !== 'upcoming' && paidReminders.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-green-600 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />Paid ({paidReminders.length})
              </h2>
              <div className="space-y-3">
                {paidReminders.map((r, i) => <ReminderCard key={r._id} reminder={r} index={i} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <ReminderModal
            reminder={activeReminder}
            onClose={() => { setIsModalOpen(false); setActiveReminder(null) }}
          />
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {deleteId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteId(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Reminder?</h3>
                <p className="text-gray-500 mb-6">This action cannot be undone.</p>
                <div className="flex gap-3">
                  <Button variant="outline" fullWidth onClick={() => setDeleteId(null)}>Cancel</Button>
                  <Button fullWidth className="bg-red-500 hover:bg-red-600" loading={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(deleteId)}>Delete</Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Modal Component
const ReminderModal: React.FC<{ reminder: Reminder | null; onClose: () => void }> = ({ reminder, onClose }) => {
  const queryClient = useQueryClient()
  const isEditing = !!reminder
  
  const [formData, setFormData] = useState({
    title: reminder?.title || '',
    amount: reminder?.amount?.toString() || '',
    dueDate: reminder?.dueDate?.split('T')[0] || new Date().toISOString().split('T')[0],
    type: reminder?.type || 'bill',
    recurring: reminder?.recurring || false,
    recurringPeriod: reminder?.recurringPeriod || 'monthly',
    notes: reminder?.notes || '',
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => remindersApi.create(data),
    onSuccess: () => { toast.success('Reminder created!'); queryClient.invalidateQueries({ queryKey: ['reminders'] }); onClose() },
    onError: () => toast.error('Failed to create reminder'),
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => remindersApi.update(reminder!._id, data),
    onSuccess: () => { toast.success('Reminder updated!'); queryClient.invalidateQueries({ queryKey: ['reminders'] }); onClose() },
    onError: () => toast.error('Failed to update reminder'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = {
      title: formData.title,
      amount: parseFloat(formData.amount),
      dueDate: formData.dueDate,
      type: formData.type,
      recurring: formData.recurring,
      recurringPeriod: formData.recurring ? formData.recurringPeriod : undefined,
      notes: formData.notes || undefined,
    }
    isEditing ? updateMutation.mutate(data) : createMutation.mutate(data)
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{isEditing ? 'Edit Reminder' : 'Add Reminder'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
            <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Electricity Bill, Netflix"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
              <input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0" className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                required min="0.01" step="0.01" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Due Date</label>
            <input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(['bill', 'loan', 'subscription'] as const).map((type) => (
                <button key={type} type="button" onClick={() => setFormData({ ...formData, type })}
                  className={`p-3 rounded-xl text-sm font-medium transition-all border ${
                    formData.type === type ? `${typeColors[type]} border-current` : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}>
                  {typeLabels[type]}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={formData.recurring} onChange={(e) => setFormData({ ...formData, recurring: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-primary-500 focus:ring-primary-500" />
              <div>
                <span className="text-sm font-medium text-gray-700">Recurring payment</span>
                <p className="text-xs text-gray-500">Auto-create next reminder when paid</p>
              </div>
            </label>
            {formData.recurring && (
              <select value={formData.recurringPeriod} onChange={(e) => setFormData({ ...formData, recurringPeriod: e.target.value as any })}
                className="mt-3 w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:outline-none bg-white text-sm">
                <option value="monthly">Every Month</option>
                <option value="quarterly">Every 3 Months</option>
                <option value="yearly">Every Year</option>
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes <span className="font-normal text-gray-400">(optional)</span></label>
            <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional details..." rows={2}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none" />
          </div>

          <Button type="submit" fullWidth loading={isPending}>
            {isEditing ? 'Save Changes' : 'Add Reminder'}
          </Button>
        </form>
      </motion.div>
    </motion.div>
  )
}

export default RemindersPage
