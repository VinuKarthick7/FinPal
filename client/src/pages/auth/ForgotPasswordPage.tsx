import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Mail, ArrowLeft, CheckCircle, KeyRound } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button, Input } from '@/components/ui'

interface ForgotPasswordFormData {
  email: string
}

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>()

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setLoading(true)
    try {
      console.log('Reset password for:', data.email)
      // TODO: Implement actual password reset API call
      await new Promise((resolve) => setTimeout(resolve, 1500))
      setSubmittedEmail(data.email)
      setSuccess(true)
    } catch (error) {
      console.error('Password reset error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[440px]"
        >
          {/* Card Container */}
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-gray-200/50 p-6 sm:p-8 lg:p-10">
            <AnimatePresence mode="wait">
              {!success ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {/* Back Button */}
                  <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-8"
                  >
                    <ArrowLeft size={20} />
                    <span className="text-sm font-medium">Back</span>
                  </button>

                  {/* Icon Section */}
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-primary-100 mb-4">
                      <KeyRound className="w-10 h-10 sm:w-12 sm:h-12 text-primary-600" />
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                      Forgot Password?
                    </h1>
                    <p className="text-gray-500 mt-2 text-sm sm:text-base leading-relaxed">
                      No worries! Enter your email address and we'll send you a link to reset your
                      password.
                    </p>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <Input
                      label="Email Address"
                      type="email"
                      placeholder="Enter your registered email"
                      leftIcon={Mail}
                      error={errors.email?.message}
                      required
                      {...register('email', {
                        required: 'Email is required',
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: 'Please enter a valid email',
                        },
                      })}
                    />

                    <Button type="submit" loading={loading} fullWidth size="lg" className="mt-6">
                      Send Reset Link
                    </Button>
                  </form>

                  {/* Back to Login */}
                  <button
                    onClick={() => navigate('/login')}
                    className="flex items-center justify-center gap-2 w-full mt-6 text-primary-500 hover:text-primary-600 font-medium transition-colors"
                  >
                    <ArrowLeft size={18} />
                    <span>Back to Login</span>
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-4"
                >
                  {/* Success Icon */}
                  <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-green-100 mb-6">
                    <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-green-500" />
                  </div>

                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
                    Check Your Email
                  </h2>

                  <p className="text-gray-500 mb-2">
                    We've sent a password reset link to
                  </p>
                  <p className="text-primary-500 font-semibold mb-6">{submittedEmail}</p>

                  <p className="text-sm text-gray-400 mb-8">
                    Didn't receive the email? Check your spam folder or try again.
                  </p>

                  <Button fullWidth size="lg" onClick={() => navigate('/login')}>
                    Back to Login
                  </Button>

                  <button
                    onClick={() => setSuccess(false)}
                    className="mt-4 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Try with a different email
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default ForgotPasswordPage
