import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  Search,
  ChevronDown,
  ChevronUp,
  User,
  ArrowDownLeft,
  StickyNote,
  Loader2,
  CheckCircle,
  Shield,
  Clock,
} from 'lucide-react'
import { paymentApi } from '@/lib/api'

// ── Contact types & mock data (shared with PayContactsPage) ──
interface Contact {
  id: string
  name: string
  phone: string
  avatar?: string
  upiId?: string | null
  online?: boolean
}

const MOCK_CONTACTS: Contact[] = [
  { id: '1',  name: 'Aarav Sharma',    phone: '+91 98765 43210', upiId: 'aarav@oksbi',      online: true },
  { id: '2',  name: 'Priya Patel',     phone: '+91 87654 32109', upiId: 'priya@okaxis',     online: false },
  { id: '3',  name: 'Rohan Mehta',     phone: '+91 76543 21098', upiId: null,                online: false },
  { id: '4',  name: 'Sneha Reddy',     phone: '+91 65432 10987', upiId: 'sneha@ybl',        online: true },
  { id: '5',  name: 'Vikram Singh',    phone: '+91 54321 09876', upiId: 'vikram@paytm',     online: false },
  { id: '6',  name: 'Ananya Iyer',     phone: '+91 43210 98765', upiId: 'ananya@okhdfc',    online: true },
  { id: '7',  name: 'Karthik Nair',    phone: '+91 32109 87654', upiId: null,                online: false },
  { id: '8',  name: 'Divya Gupta',     phone: '+91 21098 76543', upiId: 'divya@oksbi',      online: false },
  { id: '9',  name: 'Arjun Kumar',     phone: '+91 10987 65432', upiId: 'arjun@okicici',    online: true },
  { id: '10', name: 'Meera Joshi',     phone: '+91 99887 76655', upiId: 'meera@ybl',        online: false },
  { id: '11', name: 'Rahul Verma',     phone: '+91 98876 65544', upiId: null,                online: false },
  { id: '12', name: 'Neha Kapoor',     phone: '+91 97765 54433', upiId: 'neha@okaxis',      online: true },
  { id: '13', name: 'Suresh Babu',     phone: '+91 96654 43322', upiId: 'suresh@oksbi',     online: false },
  { id: '14', name: 'Lakshmi Devi',    phone: '+91 95543 32211', upiId: null,                online: false },
  { id: '15', name: 'Aditya Rao',      phone: '+91 94432 21100', upiId: 'aditya@paytm',     online: true },
  { id: '16', name: 'Pooja Mishra',    phone: '+91 93321 10099', upiId: 'pooja@okhdfc',     online: false },
  { id: '17', name: 'Deepak Jain',     phone: '+91 92210 09988', upiId: null,                online: false },
  { id: '18', name: 'Kavitha Pillai',  phone: '+91 91109 98877', upiId: 'kavitha@ybl',      online: true },
  { id: '19', name: 'Manish Tiwari',   phone: '+91 90098 87766', upiId: 'manish@okicici',   online: false },
  { id: '20', name: 'Sanya Bhatia',    phone: '+91 89987 76655', upiId: null,                online: false },
  { id: '21', name: 'Ravi Prasad',     phone: '+91 88876 65544', upiId: 'ravi@oksbi',       online: true },
  { id: '22', name: 'Ishita Saxena',   phone: '+91 87765 54433', upiId: 'ishita@okaxis',    online: false },
  { id: '23', name: 'Naveen Choudhary',phone: '+91 86654 43322', upiId: null,                online: false },
  { id: '24', name: 'Tanvi Agarwal',   phone: '+91 85543 32211', upiId: 'tanvi@paytm',      online: true },
]

const COLLAPSED_COUNT = 12

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-pink-500',
  'bg-emerald-500', 'bg-amber-500', 'bg-cyan-500',
  'bg-rose-500', 'bg-indigo-500', 'bg-teal-500',
  'bg-orange-500',
]
function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

type Step = 'contacts' | 'details' | 'sending' | 'success'

export const RequestMoneyPage: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [step, setStep] = useState<Step>('contacts')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [requestResult, setRequestResult] = useState<any>(null)

  // Filter UPI-enabled contacts
  const upiContacts = useMemo(() => MOCK_CONTACTS.filter((c) => c.upiId), [])

  const filtered = useMemo(() => {
    if (!search.trim()) return upiContacts
    const q = search.toLowerCase()
    return upiContacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.upiId && c.upiId.toLowerCase().includes(q)),
    )
  }, [search, upiContacts])

  const visible = expanded ? filtered : filtered.slice(0, COLLAPSED_COUNT)
  const hasMore = filtered.length > COLLAPSED_COUNT

  const requestMutation = useMutation({
    mutationFn: () =>
      paymentApi.requestMoney({
        contactName: selectedContact!.name,
        contactUpiId: selectedContact!.upiId!,
        contactPhone: selectedContact!.phone,
        amount: parseFloat(amount),
        note: note || undefined,
      }),
    onSuccess: (response: any) => {
      if (response.success) {
        setRequestResult(response.data)
        setStep('success')
        queryClient.invalidateQueries({ queryKey: ['payment-history'] })
        queryClient.invalidateQueries({ queryKey: ['payment-summary'] })
      } else {
        toast.error(response.message || 'Failed to send request')
        setStep('details')
      }
    },
    onError: () => {
      toast.error('Failed to send payment request')
      setStep('details')
    },
  })

  const handleContactTap = (contact: Contact) => {
    setSelectedContact(contact)
    setStep('details')
  }

  const handleSendRequest = () => {
    const parsed = parseFloat(amount)
    if (!parsed || parsed < 1) {
      toast.error('Enter a valid amount (min ₹1)')
      return
    }
    if (parsed > 100000) {
      toast.error('Maximum request amount is ₹1,00,000')
      return
    }
    setStep('sending')
    requestMutation.mutate()
  }

  // ── Success Screen ──
  if (step === 'success') {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-gray-50 flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mb-6"
        >
          <CheckCircle size={48} className="text-emerald-600" />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold text-gray-800 mb-2 text-center"
        >
          Payment request sent successfully
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-gray-500 text-sm mb-8 text-center"
        >
          ₹{parseFloat(amount).toLocaleString('en-IN')} requested from {selectedContact?.name}
        </motion.p>

        {requestResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl p-5 shadow-sm w-full max-w-sm mb-6 space-y-3"
          >
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Request ID</span>
              <span className="font-mono text-xs text-gray-600">{requestResult.requestId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Status</span>
              <span className="flex items-center gap-1 text-amber-600 font-medium">
                <Clock size={12} /> Pending Request
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">To</span>
              <span className="font-medium text-gray-800">{selectedContact?.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">UPI ID</span>
              <span className="text-gray-600">{selectedContact?.upiId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Amount</span>
              <span className="font-bold text-gray-800">₹{parseFloat(amount).toLocaleString('en-IN')}</span>
            </div>
            {note && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Note</span>
                <span className="text-gray-600 text-right max-w-[60%] truncate">{note}</span>
              </div>
            )}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex gap-3 w-full max-w-sm"
        >
          <button
            onClick={() => {
              setStep('contacts')
              setSelectedContact(null)
              setAmount('')
              setNote('')
              setRequestResult(null)
            }}
            className="flex-1 py-3.5 rounded-2xl border border-gray-200 font-semibold text-sm text-gray-700 hover:bg-gray-50 active:scale-95 transition"
          >
            Request Another
          </button>
          <button
            onClick={() => navigate('/pay')}
            className="flex-1 py-3.5 rounded-2xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 active:scale-95 transition"
          >
            Done
          </button>
        </motion.div>
      </div>
    )
  }

  // ── Sending Screen ──
  if (step === 'sending') {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-gray-50 flex flex-col items-center justify-center px-6">
        <Loader2 size={40} className="animate-spin text-emerald-600 mb-4" />
        <p className="text-gray-600 font-medium">Sending payment request…</p>
      </div>
    )
  }

  // ── Request Details Screen ──
  if (step === 'details' && selectedContact) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
          <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
            <button
              onClick={() => { setStep('contacts'); setSelectedContact(null); setAmount(''); setNote('') }}
              className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft size={18} className="text-gray-700" />
            </button>
            <h1 className="text-lg font-bold text-gray-800">Request Money</h1>
            <div className="ml-auto flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              <Shield size={12} />
              <span className="text-[10px] font-medium">Secure</span>
            </div>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-6">
          {/* Contact Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow-sm flex flex-col items-center mb-6"
          >
            <div className={`w-20 h-20 rounded-full ${avatarColor(selectedContact.name)} flex items-center justify-center text-white text-2xl font-bold shadow-md mb-3`}>
              {getInitials(selectedContact.name)}
            </div>
            <h2 className="text-lg font-bold text-gray-800">{selectedContact.name}</h2>
            <p className="text-sm text-gray-400 mt-0.5">{selectedContact.upiId}</p>
          </motion.div>

          {/* Amount */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white rounded-2xl p-5 shadow-sm mb-4"
          >
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Amount</label>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-400">₹</span>
              <input
                type="number"
                inputMode="decimal"
                min="1"
                max="100000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="flex-1 text-3xl font-bold text-gray-800 bg-transparent outline-none placeholder-gray-300 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                autoFocus
              />
            </div>
          </motion.div>

          {/* Note */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-5 shadow-sm mb-8"
          >
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <StickyNote size={14} /> Note (optional)
            </label>
            <input
              type="text"
              maxLength={100}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Rent for March, Dinner split…"
              className="w-full text-sm text-gray-800 bg-transparent outline-none placeholder-gray-400"
            />
          </motion.div>

          {/* Send Request button */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            onClick={handleSendRequest}
            disabled={!amount || parseFloat(amount) < 1}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold text-base flex items-center justify-center gap-2 hover:from-emerald-600 hover:to-emerald-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-200"
          >
            <ArrowDownLeft size={18} /> Send Request ₹{amount ? parseFloat(amount).toLocaleString('en-IN') : '0'}
          </motion.button>

          <p className="text-center text-[10px] text-gray-400 mt-3">
            A UPI collect request will be sent to {selectedContact.name}
          </p>
        </div>
      </div>
    )
  }

  // ── Contact Selection Screen ──
  return (
    <div className="min-h-screen min-h-[100dvh] bg-gray-50">
      {/* Header */}
      <div className="bg-white sticky top-0 z-30 border-b border-gray-100">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft size={18} className="text-gray-700" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-800">Request Money</h1>
            <p className="text-xs text-gray-400">Select a contact to request from</p>
          </div>
        </div>

        {/* Search bar */}
        <div className="max-w-lg mx-auto px-4 pb-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, number or UPI ID"
              className="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition"
            />
          </div>
        </div>
      </div>

      {/* Contact Grid */}
      <div className="max-w-lg mx-auto px-4 py-5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <User size={40} strokeWidth={1.5} />
            <p className="mt-3 text-sm">No UPI contacts found</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-y-6 gap-x-3">
              <AnimatePresence mode="popLayout">
                {visible.map((contact) => (
                  <motion.button
                    key={contact.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => handleContactTap(contact)}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className="relative">
                      <div
                        className={`w-14 h-14 rounded-full ${avatarColor(contact.name)} flex items-center justify-center text-white font-semibold text-base shadow-sm group-hover:shadow-md group-active:scale-95 transition-all`}
                      >
                        {getInitials(contact.name)}
                      </div>
                      {contact.online && (
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
                      )}
                      {/* UPI badge */}
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                        <ArrowDownLeft size={10} className="text-white" />
                      </span>
                    </div>
                    <span className="text-xs text-gray-600 font-medium leading-tight text-center line-clamp-2 max-w-[80px]">
                      {contact.name}
                    </span>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>

            {hasMore && (
              <motion.button
                layout
                onClick={() => setExpanded((v) => !v)}
                className="mx-auto mt-6 flex items-center gap-1.5 px-5 py-2 rounded-full bg-white border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
              >
                {expanded ? (
                  <>
                    <ChevronUp size={16} /> Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown size={16} /> More ({filtered.length - COLLAPSED_COUNT})
                  </>
                )}
              </motion.button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default RequestMoneyPage
