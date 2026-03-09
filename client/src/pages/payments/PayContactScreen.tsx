import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  Send,
  Loader2,
  CheckCircle,
  AlertTriangle,
  StickyNote,
} from 'lucide-react'
import { paymentApi } from '@/lib/api'

declare global {
  interface Window {
    Razorpay: any
  }
}

interface ContactState {
  id: string
  name: string
  phone: string
  upiId: string
  online?: boolean
}

// Deterministic pastel colour from name (same as PayContactsPage)
const AVATAR_COLORS = [
  'bg-blue-500',   'bg-purple-500', 'bg-pink-500',
  'bg-emerald-500','bg-amber-500',  'bg-cyan-500',
  'bg-rose-500',   'bg-indigo-500', 'bg-teal-500',
  'bg-orange-500',
]
function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export const PayContactScreen: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  const contact = (location.state as { contact?: ContactState })?.contact

  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [step, setStep] = useState<'form' | 'processing' | 'success' | 'failed'>('form')

  // Redirect if no contact data
  useEffect(() => {
    if (!contact) {
      navigate('/pay/contacts', { replace: true })
    }
  }, [contact, navigate])

  // Razorpay script loader
  useEffect(() => {
    if (document.getElementById('razorpay-script')) return
    const script = document.createElement('script')
    script.id = 'razorpay-script'
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.body.appendChild(script)
  }, [])

  // Payment mutation
  const createOrder = useMutation({
    mutationFn: () =>
      paymentApi.createOrder({
        amount: parseFloat(amount),
        merchant: contact!.name,
        description: note || `Payment to ${contact!.name}`,
      }),
    onSuccess: (data) => {
      if (!window.Razorpay) {
        toast.error('Payment gateway not loaded. Please try again.')
        return
      }

      const options = {
        key: data.data.keyId,
        amount: data.data.amount,
        currency: 'INR',
        name: 'FinPal',
        description: note || `Payment to ${contact!.name}`,
        order_id: data.data.orderId,
        handler: async (response: any) => {
          setStep('processing')
          try {
            await paymentApi.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })
            setStep('success')
            queryClient.invalidateQueries({ queryKey: ['payment-summary'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
          } catch {
            setStep('failed')
          }
        },
        prefill: { contact: contact!.phone },
        theme: { color: '#3B82F6' },
        modal: {
          ondismiss: () => setStep('form'),
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', () => setStep('failed'))
      rzp.open()
    },
    onError: () => {
      toast.error('Could not create payment order')
    },
  })

  const handlePay = () => {
    const parsed = parseFloat(amount)
    if (!parsed || parsed < 1) {
      toast.error('Enter a valid amount (min ₹1)')
      return
    }
    createOrder.mutate()
  }

  if (!contact) return null

  // ── Success / Failed screens ──
  if (step === 'success') {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-gray-50 flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6"
        >
          <CheckCircle size={40} className="text-emerald-600" />
        </motion.div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">Payment Successful</h2>
        <p className="text-gray-500 text-sm mb-8">₹{parseFloat(amount).toLocaleString('en-IN')} sent to {contact.name}</p>
        <button
          onClick={() => navigate('/pay')}
          className="w-full max-w-xs py-3 rounded-2xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
        >
          Done
        </button>
      </div>
    )
  }
  if (step === 'failed') {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-gray-50 flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-6"
        >
          <AlertTriangle size={40} className="text-red-600" />
        </motion.div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">Payment Failed</h2>
        <p className="text-gray-500 text-sm mb-8">Could not complete payment to {contact.name}</p>
        <div className="flex gap-3 w-full max-w-xs">
          <button
            onClick={() => setStep('form')}
            className="flex-1 py-3 rounded-2xl bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition"
          >
            Retry
          </button>
          <button
            onClick={() => navigate('/pay')}
            className="flex-1 py-3 rounded-2xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }
  if (step === 'processing') {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-gray-50 flex flex-col items-center justify-center px-6">
        <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
        <p className="text-gray-600 font-medium">Verifying payment…</p>
      </div>
    )
  }

  // ── Payment Form ──
  return (
    <div className="min-h-screen min-h-[100dvh] bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft size={18} className="text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-800">Send Money</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Contact card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm flex flex-col items-center mb-6"
        >
          <div className={`w-20 h-20 rounded-full ${avatarColor(contact.name)} flex items-center justify-center text-white text-2xl font-bold shadow-md mb-3`}>
            {getInitials(contact.name)}
          </div>
          <h2 className="text-lg font-bold text-gray-800">{contact.name}</h2>
          <p className="text-sm text-gray-400 mt-0.5">{contact.upiId}</p>
        </motion.div>

        {/* Amount input */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl p-5 shadow-sm mb-4"
        >
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Amount</label>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-400">₹</span>
            <input
              type="number"
              inputMode="decimal"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="flex-1 text-3xl font-bold text-gray-800 bg-transparent outline-none placeholder-gray-300 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              autoFocus
            />
          </div>
        </motion.div>

        {/* Note input */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
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
            placeholder="Add a note…"
            className="w-full text-sm text-gray-800 bg-transparent outline-none placeholder-gray-400"
          />
        </motion.div>

        {/* Pay button */}
        <motion.button
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          onClick={handlePay}
          disabled={createOrder.isPending || !amount}
          className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold text-base flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/20"
        >
          {createOrder.isPending ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <>
              <Send size={18} /> Pay ₹{amount ? parseFloat(amount).toLocaleString('en-IN') : '0'}
            </>
          )}
        </motion.button>
      </div>
    </div>
  )
}
