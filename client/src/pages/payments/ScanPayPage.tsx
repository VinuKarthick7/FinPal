import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Html5Qrcode } from 'html5-qrcode'
import {
  ArrowLeft,
  Smartphone,
  Store,
  FileText,
  Loader2,
  CheckCircle,
  AlertTriangle,
  QrCode,
  Zap,
  Camera,
  CameraOff,
  Image,
  Sparkles,
} from 'lucide-react'
import { paymentApi } from '@/lib/api'

interface PaymentFormData {
  amount: string
  merchant: string
  description: string
}

interface ParsedUpiData {
  pa?: string
  pn?: string
  am?: string
  tn?: string
  cu?: string
  mc?: string
  tr?: string
  url?: string
}

declare global {
  interface Window {
    Razorpay: any
  }
}

/**
 * Parse a UPI deep link / QR code string.
 * Handles: upi://pay?..., plain UPI IDs, URL-encoded params, and
 * generic QR strings containing pa= parameter.
 */
function parseUpiString(data: string): ParsedUpiData | null {
  try {
    const trimmed = data.trim()

    // 1) Standard UPI deep link: upi://pay?pa=...&pn=...&am=...
    if (trimmed.toLowerCase().startsWith('upi://')) {
      const url = new URL(trimmed)
      const params: ParsedUpiData = {}
      url.searchParams.forEach((value, key) => {
        ;(params as any)[key.toLowerCase()] = decodeURIComponent(value)
      })
      if (params.pa) return params
    }

    // 2) Plain UPI ID (e.g. merchant@ybl, user@paytm)
    const upiIdRegex = /^[a-zA-Z0-9.\-_]+@[a-zA-Z]{2,}$/
    if (upiIdRegex.test(trimmed)) {
      return { pa: trimmed, pn: trimmed.split('@')[0] }
    }

    // 3) URL containing UPI params (some QR generators wrap in http URLs)
    if (trimmed.startsWith('http')) {
      try {
        const url = new URL(trimmed)
        if (url.searchParams.has('pa')) {
          const params: ParsedUpiData = {}
          url.searchParams.forEach((value, key) => {
            ;(params as any)[key.toLowerCase()] = decodeURIComponent(value)
          })
          if (params.pa) return params
        }
      } catch {}
    }

    // 4) Raw query-string with pa= (e.g. pa=merchant@upi&pn=Name&am=100)
    if (trimmed.includes('pa=')) {
      const qs = trimmed.includes('?') ? trimmed.split('?')[1] : trimmed
      const params: ParsedUpiData = {}
      const searchParams = new URLSearchParams(qs)
      searchParams.forEach((value, key) => {
        ;(params as any)[key.toLowerCase()] = decodeURIComponent(value)
      })
      if (params.pa) return params
    }

    return null
  } catch {
    return null
  }
}

export const ScanPayPage: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [scannerActive, setScannerActive] = useState(false)
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt')
  const [scannedData, setScannedData] = useState<ParsedUpiData | null>(null)
  const [paymentStep, setPaymentStep] = useState<'scanning' | 'details' | 'processing' | 'success' | 'failed'>('scanning')
  const [paymentResult, setPaymentResult] = useState<any>(null)
  const [razorpayLoaded, setRazorpayLoaded] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<number | null>(null)
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null)
  const isProcessingRef = useRef(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    setValue,
  } = useForm<PaymentFormData>({
    defaultValues: { amount: '', merchant: '', description: '' },
  })

  const amount = watch('amount')

  // Load Razorpay
  useEffect(() => {
    if (document.getElementById('razorpay-script')) {
      setRazorpayLoaded(true)
      return
    }
    const script = document.createElement('script')
    script.id = 'razorpay-script'
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => setRazorpayLoaded(true)
    document.body.appendChild(script)
  }, [])

  // Create a hidden Html5Qrcode instance for frame-by-frame decode
  useEffect(() => {
    // Create a hidden container for html5-qrcode (it needs a DOM element)
    let hiddenDiv = document.getElementById('qr-hidden-scanner')
    if (!hiddenDiv) {
      hiddenDiv = document.createElement('div')
      hiddenDiv.id = 'qr-hidden-scanner'
      hiddenDiv.style.display = 'none'
      document.body.appendChild(hiddenDiv)
    }
    html5QrcodeRef.current = new Html5Qrcode('qr-hidden-scanner')
    return () => {
      if (html5QrcodeRef.current) {
        try { html5QrcodeRef.current.clear() } catch {}
      }
      hiddenDiv?.remove()
    }
  }, [])

  // Start camera + scanning on mount
  useEffect(() => {
    if (paymentStep === 'scanning') {
      startCamera()
    }
    return () => stopCamera()
  }, [paymentStep])

  const startCamera = useCallback(async () => {
    setScanError(null)
    isProcessingRef.current = false
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      streamRef.current = stream
      setCameraPermission('granted')

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute('playsinline', 'true')
        await videoRef.current.play()
        setScannerActive(true)
        startScanningFrames()
      }
    } catch (err: any) {
      console.error('Camera error:', err)
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission')) {
        setCameraPermission('denied')
        setScanError('Camera permission denied. Please allow camera access.')
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setScanError('No camera found on this device.')
      } else {
        setScanError('Unable to access camera. Please try again.')
      }
    }
  }, [])

  const stopCamera = useCallback(() => {
    // Stop scanning interval
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setScannerActive(false)
  }, [])

  /**
   * Capture video frames to a canvas and decode QR using html5-qrcode's scanFile.
   * This gives us full control over the video element layout.
   */
  const startScanningFrames = useCallback(() => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)

    scanIntervalRef.current = window.setInterval(async () => {
      if (isProcessingRef.current) return
      if (!videoRef.current || !canvasRef.current || !html5QrcodeRef.current) return
      if (videoRef.current.readyState < 2) return // not enough data yet

      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Size canvas to match video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      try {
        // Convert canvas to blob and scan
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(resolve, 'image/jpeg', 0.8)
        })
        if (!blob) return

        const file = new File([blob], 'frame.jpg', { type: 'image/jpeg' })
        const result = await html5QrcodeRef.current!.scanFile(file, false)

        if (result && !isProcessingRef.current) {
          isProcessingRef.current = true
          handleScanResult(result)
        }
      } catch {
        // No QR code in this frame — ignore
      }
    }, 250) // Scan ~4 frames/second
  }, [])

  const handleScanResult = useCallback((decodedText: string) => {
    // Vibrate for haptic feedback
    if (navigator.vibrate) navigator.vibrate(100)

    stopCamera()

    const parsed = parseUpiString(decodedText)

    if (parsed && parsed.pa) {
      setScannedData(parsed)
      if (parsed.pn) setValue('merchant', parsed.pn)
      if (parsed.am) setValue('amount', parsed.am)
      if (parsed.tn) setValue('description', parsed.tn)
      setPaymentStep('details')
      toast.success('QR Code scanned successfully!', { icon: '✅' })
    } else {
      toast.error('Not a valid UPI QR code. Please try again.', { icon: '❌' })
      setTimeout(() => {
        isProcessingRef.current = false
        startCamera()
      }, 1500)
    }
  }, [stopCamera, setValue, startCamera])

  // Handle gallery image upload
  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      stopCamera()
      if (!html5QrcodeRef.current) return

      const result = await html5QrcodeRef.current.scanFile(file, true)
      handleScanResult(result)
    } catch {
      toast.error('Could not read QR code from image. Try again.')
      isProcessingRef.current = false
      startCamera()
    }
    // Reset file input so the same file can be selected again
    e.target.value = ''
  }, [stopCamera, handleScanResult, startCamera])

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
      description: `Payment to ${scannedData?.pn || orderData.merchant}`,
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

  const onSubmit = (data: PaymentFormData) => {
    createOrderMutation.mutate(data)
  }

  const resetScanner = () => {
    setScannedData(null)
    setPaymentResult(null)
    setPaymentStep('scanning')
    reset()
    isProcessingRef.current = false
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-black flex flex-col">
      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* ========== HEADER ========== */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-10 pb-3">
        <button
          onClick={() => { stopCamera(); navigate(-1) }}
          className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition"
        >
          <ArrowLeft size={22} className="text-white" />
        </button>
        <h1 className="text-white font-semibold text-lg">Scan & Pay</h1>
        <div className="w-10" />
      </div>

      {/* ========== SCANNING VIEW ========== */}
      {paymentStep === 'scanning' && (
        <div className="flex-1 flex flex-col">
          {/* Scanner Area */}
          <div className="flex-1 relative overflow-hidden bg-black">
            {/* Full-screen video feed */}
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />

            {/* Custom scanning overlay */}
            {scannerActive && (
              <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                {/* Dimmed edges around scan area */}
                <div className="absolute inset-0">
                  <div className="absolute inset-0 bg-black/50" />
                  <div
                    className="absolute bg-transparent"
                    style={{
                      top: '50%',
                      left: '50%',
                      width: '260px',
                      height: '260px',
                      transform: 'translate(-50%, -50%)',
                      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                      borderRadius: '16px',
                    }}
                  />
                </div>

                {/* Corner brackets */}
                <div className="w-[260px] h-[260px] relative">
                  <div className="absolute top-0 left-0 w-12 h-12 border-t-[3px] border-l-[3px] border-white rounded-tl-2xl" />
                  <div className="absolute top-0 right-0 w-12 h-12 border-t-[3px] border-r-[3px] border-white rounded-tr-2xl" />
                  <div className="absolute bottom-0 left-0 w-12 h-12 border-b-[3px] border-l-[3px] border-white rounded-bl-2xl" />
                  <div className="absolute bottom-0 right-0 w-12 h-12 border-b-[3px] border-r-[3px] border-white rounded-br-2xl" />

                  {/* Scanning laser line */}
                  <motion.div
                    className="absolute left-3 right-3 h-[2px] bg-gradient-to-r from-transparent via-green-400 to-transparent rounded-full"
                    animate={{ top: ['8%', '92%', '8%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>
              </div>
            )}

            {/* Camera permission denied */}
            {cameraPermission === 'denied' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-20 p-6">
                <CameraOff size={48} className="text-gray-400 mb-4" />
                <h2 className="text-white text-lg font-semibold mb-2">Camera Access Required</h2>
                <p className="text-gray-400 text-sm text-center mb-6">
                  Please allow camera access in your browser settings to scan QR codes.
                </p>
                <button
                  onClick={() => { setCameraPermission('prompt'); startCamera() }}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Error state */}
            {scanError && cameraPermission !== 'denied' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-20 p-6">
                <AlertTriangle size={48} className="text-amber-400 mb-4" />
                <p className="text-gray-300 text-sm text-center mb-4">{scanError}</p>
                <button
                  onClick={() => startCamera()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition"
                >
                  Retry
                </button>
              </div>
            )}
          </div>

          {/* Bottom controls */}
          <div className="relative z-10 px-4 pb-8 pt-4 bg-gradient-to-t from-black via-black/90 to-transparent -mt-16">
            <p className="text-gray-300 text-sm text-center mb-5">
              Point your camera at a UPI QR code
            </p>
            <div className="flex items-center justify-center gap-8">
              <label className="flex flex-col items-center gap-1.5 cursor-pointer group">
                <div className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/25 transition active:scale-90">
                  <Image size={22} className="text-white" />
                </div>
                <span className="text-[11px] text-gray-400">Gallery</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
              <button
                onClick={() => {
                  stopCamera()
                  setPaymentStep('details')
                }}
                className="flex flex-col items-center gap-1.5 group"
              >
                <div className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/25 transition active:scale-90">
                  <FileText size={22} className="text-white" />
                </div>
                <span className="text-[11px] text-gray-400">Enter Manually</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== PAYMENT DETAILS VIEW ========== */}
      {paymentStep === 'details' && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 bg-white rounded-t-3xl mt-2 p-5 overflow-y-auto"
        >
          {/* Scanned merchant info */}
          {scannedData && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-blue-50 rounded-2xl p-4 mb-5 flex items-center gap-3"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <QrCode size={24} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate">{scannedData.pn || 'Merchant'}</p>
                <p className="text-xs text-gray-500 truncate">{scannedData.pa}</p>
              </div>
              <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
            </motion.div>
          )}

          {/* Payment Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Amount */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                <Zap size={12} /> Amount
              </label>
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3">
                <span className="text-2xl font-bold text-gray-400">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="0"
                  className="text-3xl font-bold text-gray-800 bg-transparent border-none outline-none w-full placeholder-gray-300"
                  autoFocus={!scannedData?.am}
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
                  required: 'Merchant name is required',
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

            {/* UPI ID from QR */}
            {scannedData?.pa && (
              <div className="flex items-center gap-2 bg-green-50 rounded-xl px-3 py-2.5">
                <CheckCircle size={14} className="text-green-600" />
                <span className="text-xs text-green-700 font-medium">Paying to: {scannedData.pa}</span>
              </div>
            )}

            {/* AI Auto-categorize badge */}
            <div className="flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-2.5">
              <Sparkles size={14} className="text-blue-600" />
              <span className="text-xs text-blue-700 font-medium">Auto-categorize &amp; track via AI</span>
              <div className="ml-auto w-8 h-5 bg-blue-600 rounded-full flex items-center justify-end px-0.5">
                <div className="w-4 h-4 bg-white rounded-full" />
              </div>
            </div>

            {/* Buttons */}
            <div className="space-y-3 pt-2">
              <button
                type="submit"
                disabled={createOrderMutation.isPending || !razorpayLoaded}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-2xl text-lg disabled:opacity-50 flex items-center justify-center gap-2 hover:from-blue-700 hover:to-blue-800 transition-all active:scale-[0.98] shadow-lg shadow-blue-200"
              >
                {createOrderMutation.isPending ? (
                  <><Loader2 size={20} className="animate-spin" />Processing...</>
                ) : (
                  <><Smartphone size={20} />Pay ₹{amount ? parseFloat(amount).toLocaleString('en-IN') : '0'}</>
                )}
              </button>

              <button
                type="button"
                onClick={resetScanner}
                className="w-full py-3 border border-gray-200 text-gray-600 font-medium rounded-2xl text-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition active:scale-[0.98]"
              >
                <Camera size={16} />
                Scan Another QR
              </button>
            </div>

            <p className="text-center text-[10px] text-gray-400">Powered securely by Razorpay</p>
          </form>
        </motion.div>
      )}

      {/* ========== PROCESSING VIEW ========== */}
      {paymentStep === 'processing' && (
        <div className="flex-1 flex items-center justify-center bg-white rounded-t-3xl mt-2">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center">
            <Loader2 size={48} className="animate-spin mx-auto text-blue-600 mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">Verifying Payment...</h2>
            <p className="text-gray-500 text-sm">Please wait while we confirm your transaction</p>
          </motion.div>
        </div>
      )}

      {/* ========== SUCCESS VIEW ========== */}
      {paymentStep === 'success' && (
        <div className="flex-1 bg-white rounded-t-3xl mt-2 p-5 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm text-center space-y-4"
          >
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
                {scannedData?.pn && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-sm">Merchant</span>
                    <span className="font-medium text-gray-700">{scannedData.pn}</span>
                  </div>
                )}
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
                onClick={resetScanner}
                className="flex-1 py-3 border border-gray-200 rounded-xl font-medium text-sm hover:bg-gray-50 active:scale-95 transition"
              >
                Scan Again
              </button>
              <button
                onClick={() => navigate('/pay')}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 active:scale-95 transition"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ========== FAILED VIEW ========== */}
      {paymentStep === 'failed' && (
        <div className="flex-1 bg-white rounded-t-3xl mt-2 p-5 flex items-center justify-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle size={40} className="text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Payment Failed</h2>
            <p className="text-gray-500 text-sm">No amount was deducted. Please try again.</p>
            <div className="flex gap-3 max-w-xs mx-auto">
              <button
                onClick={resetScanner}
                className="flex-1 py-3 border border-gray-200 rounded-xl font-medium text-sm hover:bg-gray-50 active:scale-95 transition"
              >
                Scan Again
              </button>
              <button
                onClick={() => setPaymentStep('details')}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 active:scale-95 transition"
              >
                Try Again
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default ScanPayPage
