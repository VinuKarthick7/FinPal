import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  Building2,
  CreditCard,
  User,
  Hash,
  StickyNote,
  Shield,
  Loader2,
  CheckCircle,
  AlertTriangle,
  BadgeCheck,
  Eye,
  EyeOff,
  Clock,
  Copy,
} from 'lucide-react'
import { paymentApi } from '@/lib/api'

// IFSC → Bank Name lookup (common Indian banks)
const IFSC_BANK_MAP: Record<string, string> = {
  SBIN: 'State Bank of India',
  HDFC: 'HDFC Bank',
  ICIC: 'ICICI Bank',
  UTIB: 'Axis Bank',
  KKBK: 'Kotak Mahindra Bank',
  PUNB: 'Punjab National Bank',
  CNRB: 'Canara Bank',
  UBIN: 'Union Bank of India',
  IOBA: 'Indian Overseas Bank',
  BKID: 'Bank of India',
  BARB: 'Bank of Baroda',
  YESB: 'Yes Bank',
  IDIB: 'Indian Bank',
  CBIN: 'Central Bank of India',
  MAHB: 'Bank of Maharashtra',
  ALLA: 'Allahabad Bank',
  CORP: 'Corporation Bank',
  VIJB: 'Vijaya Bank',
  FDRL: 'Federal Bank',
  KARB: 'Karnataka Bank',
  RATN: 'RBL Bank',
  INDB: 'IndusInd Bank',
  IDFB: 'IDFC First Bank',
  SYNB: 'Syndicate Bank',
  ORBC: 'Oriental Bank of Commerce',
}

function detectBankName(ifsc: string): string | null {
  if (!ifsc || ifsc.length < 4) return null
  const prefix = ifsc.substring(0, 4).toUpperCase()
  return IFSC_BANK_MAP[prefix] || null
}

function maskAccountNumber(accNo: string): string {
  if (accNo.length <= 4) return accNo
  return '●'.repeat(accNo.length - 4) + accNo.slice(-4)
}

type Step = 'form' | 'verifying' | 'verified' | 'confirm' | 'processing' | 'success' | 'failed'

export const BankTransferPage: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [step, setStep] = useState<Step>('form')
  const [showAccount, setShowAccount] = useState(false)
  const [copiedTxnId, setCopiedTxnId] = useState(false)
  const [transferResult, setTransferResult] = useState<any>(null)

  // Form fields
  const [holderName, setHolderName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('')
  const [ifscCode, setIfscCode] = useState('')
  const [bankName, setBankName] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  // Form errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Auto-detect bank name from IFSC
  useEffect(() => {
    const detected = detectBankName(ifscCode)
    if (detected) {
      setBankName(detected)
    }
  }, [ifscCode])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!holderName.trim()) newErrors.holderName = 'Account holder name is required'
    else if (holderName.trim().length < 2) newErrors.holderName = 'Name is too short'

    if (!accountNumber.trim()) newErrors.accountNumber = 'Account number is required'
    else if (accountNumber.length < 9 || accountNumber.length > 18) newErrors.accountNumber = 'Invalid account number'
    else if (!/^\d+$/.test(accountNumber)) newErrors.accountNumber = 'Account number must contain only digits'

    if (!confirmAccountNumber.trim()) newErrors.confirmAccountNumber = 'Please re-enter account number'
    else if (accountNumber !== confirmAccountNumber) newErrors.confirmAccountNumber = 'Account numbers do not match'

    if (!ifscCode.trim()) newErrors.ifscCode = 'IFSC code is required'
    else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(ifscCode)) newErrors.ifscCode = 'Invalid IFSC code format'

    if (!amount.trim()) newErrors.amount = 'Amount is required'
    else if (parseFloat(amount) < 1) newErrors.amount = 'Minimum transfer is ₹1'
    else if (parseFloat(amount) > 200000) newErrors.amount = 'Maximum transfer is ₹2,00,000'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Verify Bank Account
  const verifyMutation = useMutation({
    mutationFn: () =>
      paymentApi.verifyBankAccount({
        accountNumber,
        ifscCode: ifscCode.toUpperCase(),
        holderName: holderName.trim(),
      }),
    onSuccess: (response: any) => {
      if (response.success) {
        if (response.data?.bankName) setBankName(response.data.bankName)
        setStep('verified')
        toast.success('Account verified successfully')
      } else {
        setStep('form')
        toast.error(response.message || 'Verification failed')
      }
    },
    onError: () => {
      setStep('form')
      toast.error('Could not verify bank account')
    },
  })

  // Bank Transfer
  const transferMutation = useMutation({
    mutationFn: () =>
      paymentApi.bankTransfer({
        holderName: holderName.trim(),
        accountNumber,
        ifscCode: ifscCode.toUpperCase(),
        bankName: bankName || 'Unknown Bank',
        amount: parseFloat(amount),
        note: note || undefined,
      }),
    onSuccess: (response: any) => {
      if (response.success) {
        setTransferResult(response.data)
        setStep('success')
        queryClient.invalidateQueries({ queryKey: ['payment-history'] })
        queryClient.invalidateQueries({ queryKey: ['payment-summary'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
        queryClient.invalidateQueries({ queryKey: ['budget-progress'] })
      } else {
        setStep('failed')
        toast.error(response.message || 'Transfer failed')
      }
    },
    onError: () => {
      setStep('failed')
      toast.error('Transfer failed. No amount was deducted.')
    },
  })

  const handleVerify = () => {
    if (!validateForm()) return
    setStep('verifying')
    verifyMutation.mutate()
  }

  const handleTransfer = () => {
    setStep('processing')
    transferMutation.mutate()
  }

  const copyTxnId = () => {
    if (transferResult?.transactionId) {
      navigator.clipboard.writeText(transferResult.transactionId)
      setCopiedTxnId(true)
      toast.success('Transaction ID copied!')
      setTimeout(() => setCopiedTxnId(false), 2000)
    }
  }

  const resetForm = () => {
    setStep('form')
    setHolderName('')
    setAccountNumber('')
    setConfirmAccountNumber('')
    setIfscCode('')
    setBankName('')
    setAmount('')
    setNote('')
    setErrors({})
    setTransferResult(null)
  }

  const renderInput = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    icon: React.ReactNode,
    placeholder: string,
    error?: string,
    extra?: {
      type?: string
      maxLength?: number
      inputMode?: 'text' | 'numeric' | 'decimal'
      uppercase?: boolean
      disabled?: boolean
      rightButton?: React.ReactNode
    },
  ) => (
    <div>
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
        {icon} {label}
      </label>
      <div className="relative">
        <input
          type={extra?.type || 'text'}
          inputMode={extra?.inputMode}
          maxLength={extra?.maxLength}
          value={value}
          disabled={extra?.disabled}
          onChange={(e) => {
            const val = extra?.uppercase ? e.target.value.toUpperCase() : e.target.value
            onChange(val)
            if (errors[label]) setErrors((prev) => ({ ...prev, [label]: '' }))
          }}
          placeholder={placeholder}
          className={`w-full px-4 py-3 bg-gray-50 rounded-xl text-sm text-gray-800 placeholder-gray-400 outline-none transition ${
            error ? 'ring-2 ring-red-300 bg-red-50/30' : 'focus:ring-2 focus:ring-blue-500/30'
          } ${extra?.disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        />
        {extra?.rightButton && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">{extra.rightButton}</div>
        )}
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )

  // ── Success Screen ──
  if (step === 'success') {
    const now = new Date()
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
          className="text-2xl font-bold text-gray-800 mb-1"
        >
          Transfer Successful!
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-gray-500 text-sm mb-8"
        >
          Money sent to {holderName}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl p-5 shadow-sm w-full max-w-sm mb-6 space-y-3"
        >
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Transaction ID</span>
            <button onClick={copyTxnId} className="flex items-center gap-1 text-blue-600 font-mono text-xs">
              {transferResult?.transactionId?.slice(0, 16) || 'N/A'}
              {copiedTxnId ? <CheckCircle size={12} /> : <Copy size={12} />}
            </button>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Date & Time</span>
            <span className="text-gray-700 text-xs">
              {now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}{' '}
              {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Amount</span>
            <span className="font-bold text-gray-800 text-lg">₹{parseFloat(amount).toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">To</span>
            <span className="font-medium text-gray-800">{holderName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Bank</span>
            <span className="text-gray-600">{bankName || 'N/A'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Account</span>
            <span className="font-mono text-gray-600">{maskAccountNumber(accountNumber)}</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex gap-3 w-full max-w-sm"
        >
          <button
            onClick={resetForm}
            className="flex-1 py-3.5 rounded-2xl border border-gray-200 font-semibold text-sm text-gray-700 hover:bg-gray-50 active:scale-95 transition"
          >
            New Transfer
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

  // ── Failed Screen ──
  if (step === 'failed') {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-gray-50 flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-6"
        >
          <AlertTriangle size={40} className="text-red-600" />
        </motion.div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">Transfer Failed</h2>
        <p className="text-gray-500 text-sm mb-8 text-center">No amount was deducted. Please check details and try again.</p>
        <div className="flex gap-3 w-full max-w-xs">
          <button
            onClick={() => setStep('verified')}
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

  // ── Processing Screen ──
  if (step === 'processing') {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-gray-50 flex flex-col items-center justify-center px-6">
        <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
        <p className="text-gray-600 font-medium">Processing transfer…</p>
        <p className="text-gray-400 text-xs mt-2">Please do not close this screen</p>
      </div>
    )
  }

  // ── Verifying Screen ──
  if (step === 'verifying') {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-gray-50 flex flex-col items-center justify-center px-6">
        <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
        <p className="text-gray-600 font-medium">Verifying bank account…</p>
      </div>
    )
  }

  // ── Confirmation Screen ──
  if (step === 'confirm') {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-gray-50">
        <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
          <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
            <button
              onClick={() => setStep('verified')}
              className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft size={18} className="text-gray-700" />
            </button>
            <h1 className="text-lg font-bold text-gray-800">Confirm Transfer</h1>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow-sm mb-6"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center">
                <Building2 size={24} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">{holderName}</h3>
                <p className="text-sm text-gray-500">{bankName || 'Unknown Bank'}</p>
              </div>
            </div>

            <div className="space-y-3 border-t border-gray-100 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Account Number</span>
                <span className="font-mono text-gray-700">{maskAccountNumber(accountNumber)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">IFSC Code</span>
                <span className="font-mono text-gray-700">{ifscCode.toUpperCase()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Bank Name</span>
                <span className="text-gray-700">{bankName || 'N/A'}</span>
              </div>
              {note && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Note</span>
                  <span className="text-gray-600 text-right max-w-[60%] truncate">{note}</span>
                </div>
              )}
            </div>

            <div className="mt-5 bg-blue-50 rounded-2xl p-4 text-center">
              <p className="text-xs text-blue-500 font-medium mb-1">Transfer Amount</p>
              <p className="text-3xl font-bold text-gray-800">₹{parseFloat(amount).toLocaleString('en-IN')}</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-2 bg-amber-50 rounded-xl px-4 py-3 mb-6"
          >
            <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-700">Please verify all details carefully. Transfers cannot be reversed once confirmed.</p>
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            onClick={handleTransfer}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-base flex items-center justify-center gap-2 hover:from-blue-700 hover:to-blue-800 active:scale-[0.98] transition-all shadow-lg shadow-blue-200"
          >
            <CreditCard size={18} /> Transfer ₹{parseFloat(amount).toLocaleString('en-IN')}
          </motion.button>

          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="flex items-center gap-1 text-gray-400">
              <Shield size={12} />
              <span className="text-[10px]">256-bit Encrypted</span>
            </div>
            <div className="flex items-center gap-1 text-gray-400">
              <BadgeCheck size={12} />
              <span className="text-[10px]">RBI Compliant</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Form Screen (initial + verified) ──
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
          <div>
            <h1 className="text-lg font-bold text-gray-800">Bank Transfer</h1>
            <p className="text-xs text-gray-400">Send money to any bank account</p>
          </div>
          <div className="ml-auto flex items-center gap-1 text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
            <Shield size={12} />
            <span className="text-[10px] font-medium">Secure</span>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Account Holder Name */}
            {renderInput(
              'Account Holder Name',
              holderName,
              setHolderName,
              <User size={12} />,
              'Full name as per bank records',
              errors.holderName,
              { disabled: step === 'verified', maxLength: 100 },
            )}

            {/* Account Number */}
            {renderInput(
              'Bank Account Number',
              accountNumber,
              setAccountNumber,
              <Hash size={12} />,
              'Enter account number',
              errors.accountNumber,
              {
                inputMode: 'numeric',
                maxLength: 18,
                disabled: step === 'verified',
                rightButton: (
                  <button onClick={() => setShowAccount((v) => !v)} className="p-1.5 text-gray-400 hover:text-gray-600">
                    {showAccount ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                ),
                type: showAccount ? 'text' : 'password',
              },
            )}

            {/* Re-enter Account Number */}
            {step !== 'verified' &&
              renderInput(
                'Re-enter Account Number',
                confirmAccountNumber,
                setConfirmAccountNumber,
                <Hash size={12} />,
                'Confirm account number',
                errors.confirmAccountNumber,
                { inputMode: 'numeric', maxLength: 18, type: 'password' },
              )}

            {/* IFSC Code */}
            {renderInput(
              'IFSC Code',
              ifscCode,
              setIfscCode,
              <Building2 size={12} />,
              'e.g., SBIN0001234',
              errors.ifscCode,
              { uppercase: true, maxLength: 11, disabled: step === 'verified' },
            )}

            {/* Bank Name (auto-detected) */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Building2 size={12} /> Bank Name
              </label>
              <div className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm text-gray-800 flex items-center gap-2">
                {bankName ? (
                  <>
                    <BadgeCheck size={14} className="text-green-500" />
                    <span className="font-medium">{bankName}</span>
                    {detectBankName(ifscCode) && (
                      <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full ml-auto">Auto-detected</span>
                    )}
                  </>
                ) : (
                  <span className="text-gray-400">Will auto-detect from IFSC</span>
                )}
              </div>
            </div>

            {/* Verified badge */}
            {step === 'verified' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 bg-green-50 rounded-xl px-4 py-3 border border-green-200"
              >
                <CheckCircle size={16} className="text-green-600" />
                <span className="text-sm text-green-700 font-medium">Account verified successfully</span>
              </motion.div>
            )}

            {/* Amount */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Amount</label>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-400">₹</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="1"
                  max="200000"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value)
                    if (errors.amount) setErrors((prev) => ({ ...prev, amount: '' }))
                  }}
                  placeholder="0"
                  className="flex-1 text-3xl font-bold text-gray-800 bg-transparent outline-none placeholder-gray-300 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
              {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
            </div>

            {/* Note */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <StickyNote size={14} /> Note (optional)
              </label>
              <input
                type="text"
                maxLength={100}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g., Rent payment, EMI…"
                className="w-full text-sm text-gray-800 bg-transparent outline-none placeholder-gray-400"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-3">
              {step === 'form' ? (
                <button
                  onClick={handleVerify}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-base flex items-center justify-center gap-2 hover:from-blue-600 hover:to-blue-700 active:scale-[0.98] transition-all shadow-lg shadow-blue-200"
                >
                  <Shield size={18} /> Verify Account
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (!amount || parseFloat(amount) < 1) {
                      toast.error('Enter a valid amount (min ₹1)')
                      return
                    }
                    if (parseFloat(amount) > 200000) {
                      toast.error('Maximum transfer is ₹2,00,000')
                      return
                    }
                    setStep('confirm')
                  }}
                  disabled={!amount || parseFloat(amount) < 1}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-base flex items-center justify-center gap-2 hover:from-blue-700 hover:to-blue-800 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-200"
                >
                  <CreditCard size={18} /> Transfer Money
                </button>
              )}

              {step === 'verified' && (
                <button
                  onClick={() => { setStep('form'); setErrors({}) }}
                  className="w-full py-3 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition"
                >
                  Edit Bank Details
                </button>
              )}
            </div>

            {/* Security badges */}
            <div className="flex items-center justify-center gap-4 py-3">
              <div className="flex items-center gap-1 text-gray-400">
                <Shield size={12} />
                <span className="text-[10px]">256-bit Encrypted</span>
              </div>
              <div className="flex items-center gap-1 text-gray-400">
                <BadgeCheck size={12} />
                <span className="text-[10px]">RBI Compliant</span>
              </div>
              <div className="flex items-center gap-1 text-gray-400">
                <Clock size={12} />
                <span className="text-[10px]">Instant Transfer</span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

export default BankTransferPage
