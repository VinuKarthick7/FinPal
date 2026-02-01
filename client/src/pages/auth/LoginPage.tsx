import React, { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Mail, Lock, Wallet } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { Button, Input, Divider, SocialButton, LinkText } from '@/components/ui'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

interface LoginFormData {
  email: string
  password: string
}

const LoginPage: React.FC = () => {
  const { t } = useTranslation()
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
        'google_not_configured': t('auth.googleNotConfigured'),
        'google_failed': t('auth.googleFailed'),
        'apple_not_configured': t('auth.appleNotConfigured'),
        'apple_failed': t('auth.appleFailed'),
        'oauth_failed': t('auth.oauthFailed'),
      }
      toast.error(errorMessages[error] || t('auth.loginFailed'))
    }

    const verified = searchParams.get('verified')
    if (verified === '1') {
      toast.success(t('auth.emailVerified'))
    } else if (verified === '0') {
      toast.error(t('auth.verificationFailed'))
    }
  }, [searchParams, t])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>()

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true)
    setUnverifiedEmail(null) // Reset unverified state
    
    try {
      const response = await authApi.login(data.email, data.password)
      
      if (response.success && response.data) {
        // Set authentication state
        setAuth(response.data.user, response.data.token)
        
        // Log successful authentication (user ID is the source of truth)
        console.log(`✅ Login successful for user: ${response.data.user.email} (ID: ${response.data.user.id})`)
        
        toast.success(t('auth.welcomeBack'))
        navigate('/dashboard')
      } else {
        toast.error(response.message || t('auth.loginFailed'))
      }
    } catch (error: any) {
      const code = error.response?.data?.code
      const message = error.response?.data?.message
      
      // Handle specific error cases
      if (code === 'EMAIL_NOT_VERIFIED') {
        setUnverifiedEmail(data.email)
        toast.error(message || t('auth.emailNotVerified'))
      } else if (error.response?.status === 401) {
        // Invalid credentials
        toast.error(message || 'Invalid email or password')
      } else if (error.response?.status === 403) {
        // Account disabled or other permission issues
        toast.error(message || 'Access denied. Please contact support.')
      } else {
        // Generic error
        toast.error(message || t('auth.loginFailed'))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return
    try {
      const response = await authApi.resendVerification(unverifiedEmail)
      toast.success(response.message || t('auth.verificationSent'))
    } catch (error: any) {
      const message = error.response?.data?.message || t('auth.resendFailed')
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
              <p className="text-sm text-gray-500 mt-1">{t('auth.finpalTagline')}</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label={t('auth.emailAddress')}
                type="email"
                placeholder={t('auth.enterEmail')}
                leftIcon={Mail}
                error={errors.email?.message}
                required
                {...register('email', {
                  required: t('auth.emailRequired'),
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: t('auth.validEmail'),
                  },
                })}
              />

              <Input
                label={t('auth.password')}
                type="password"
                placeholder={t('auth.enterPassword')}
                leftIcon={Lock}
                error={errors.password?.message}
                required
                {...register('password', {
                  required: t('auth.passwordRequired'),
                  minLength: {
                    value: 6,
                    message: t('auth.passwordMinLength'),
                  },
                })}
              />

              {/* Forgot Password Link */}
              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary-500 hover:text-primary-600 font-medium transition-colors"
                >
                  {t('auth.forgotPassword')}
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
                {t('auth.signIn')}
              </Button>

              {unverifiedEmail && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  className="w-full mt-3 text-sm text-primary-500 hover:text-primary-600 font-medium transition-colors"
                >
                  {t('auth.resendVerification')}
                </button>
              )}
            </form>

            {/* Divider */}
            <Divider text={t('auth.orContinueWith')} />

            {/* Social Login Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SocialButton provider="google" onClick={() => handleSocialLogin('google')} />
              <SocialButton provider="apple" onClick={() => handleSocialLogin('apple')} />
            </div>

            {/* Sign Up Link */}
            <div className="mt-8">
              <LinkText
                text={t('auth.dontHaveAccount')}
                linkText={t('auth.signUp')}
                onClick={() => navigate('/register')}
              />
            </div>
          </div>

          {/* Terms Text */}
          <p className="text-center text-xs text-gray-500 mt-6 px-4">
            {t('auth.termsAgree')}{' '}
            <a href="#" className="text-primary-500 hover:underline">
              {t('auth.termsService')}
            </a>{' '}
            {t('auth.and')}{' '}
            <a href="#" className="text-primary-500 hover:underline">
              {t('auth.privacyPolicy')}
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  )
}

export default LoginPage


