import React, { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Mail, Lock, Wallet } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Button, Input, Divider, SocialButton, LinkText } from '@/components/ui'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

interface LoginFormData {
  email: string
  password: string
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const setAuth = useAuthStore((state) => state.setAuth)
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)

  // Handle OAuth error messages from URL
  useEffect(() => {
    const error = searchParams.get('error')
    if (error) {
      const errorMessages: Record<string, string> = {
        'google_not_configured': 'Google login is not configured. Please use email/password.',
        'google_failed': 'Google login failed. Please try again.',
        'apple_not_configured': 'Apple login is not configured. Please use email/password.',
        'apple_failed': 'Apple login failed. Please try again.',
        'oauth_failed': 'Social login failed. Please try again.',
      }
      toast.error(errorMessages[error] || 'Login failed. Please try again.')
    }

    const verified = searchParams.get('verified')
    if (verified === '1') {
      toast.success('Email verified. You can sign in now.')
    } else if (verified === '0') {
      toast.error('Verification link is invalid or expired. Please resend the verification email.')
    }
  }, [searchParams])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>()

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true)
    try {
      const response = await authApi.login(data.email, data.password)
      if (response.success) {
        setAuth(response.data.user, response.data.token)
        toast.success('Welcome back!')
        navigate('/dashboard')
      } else {
        toast.error(response.message || 'Login failed')
      }
    } catch (error: any) {
      const code = error.response?.data?.code
      const message = error.response?.data?.message || 'Login failed. Please try again.'
      toast.error(message)
      if (code === 'EMAIL_NOT_VERIFIED') {
        setUnverifiedEmail(data.email)
      } else {
        setUnverifiedEmail(null)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return
    try {
      const response = await authApi.resendVerification(unverifiedEmail)
      toast.success(response.message || 'Verification email sent. Please check your inbox.')
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to resend verification email.'
      toast.error(message)
    }
  }

  const handleSocialLogin = (provider: 'google' | 'apple') => {
    if (provider === 'google') {
      authApi.googleAuth()
    } else if (provider === 'apple') {
      authApi.appleAuth()
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
            {/* Logo Section */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary-100 mb-4">
                <Wallet className="w-8 h-8 sm:w-10 sm:h-10 text-primary-600" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">FinPal</h1>
              <p className="text-sm text-gray-500 mt-1">Smart Family Finance Tracker</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="Enter your email"
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

              <Input
                label="Password"
                type="password"
                placeholder="Enter your password"
                leftIcon={Lock}
                error={errors.password?.message}
                required
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters',
                  },
                })}
              />

              {/* Forgot Password Link */}
              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary-500 hover:text-primary-600 font-medium transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                loading={loading}
                fullWidth
                size="lg"
                className="mt-6"
              >
                Sign In
              </Button>

              {unverifiedEmail && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  className="w-full mt-3 text-sm text-primary-500 hover:text-primary-600 font-medium transition-colors"
                >
                  Resend verification email
                </button>
              )}
            </form>

            {/* Divider */}
            <Divider text="or continue with" />

            {/* Social Login Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SocialButton provider="google" onClick={() => handleSocialLogin('google')} />
              <SocialButton provider="apple" onClick={() => handleSocialLogin('apple')} />
            </div>

            {/* Sign Up Link */}
            <div className="mt-8">
              <LinkText
                text="Don't have an account?"
                linkText="Sign Up"
                onClick={() => navigate('/register')}
              />
            </div>
          </div>

          {/* Terms Text */}
          <p className="text-center text-xs text-gray-500 mt-6 px-4">
            By signing in, you agree to our{' '}
            <a href="#" className="text-primary-500 hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-primary-500 hover:underline">
              Privacy Policy
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  )
}

export default LoginPage


