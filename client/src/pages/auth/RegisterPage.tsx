import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Mail, Lock, User, Phone, ArrowLeft, Wallet } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Button, Input, Divider, SocialButton, LinkText, Checkbox } from '@/components/ui'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

interface RegisterFormData {
  fullName: string
  email: string
  phone: string
  password: string
  confirmPassword: string
}

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const setAuth = useAuthStore((state) => state.setAuth)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>()

  const password = watch('password')

  const onSubmit = async (data: RegisterFormData) => {
    if (!acceptTerms) {
      toast.error('Please accept the terms and conditions')
      return
    }

    setLoading(true)
    try {
      const response = await authApi.register({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        password: data.password,
      })
      
      if (response.success) {
        setAuth(response.data.user, response.data.token)
        toast.success('Account created successfully!')
        navigate('/dashboard')
      } else {
        toast.error(response.message || 'Registration failed')
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed. Please try again.'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleSocialRegister = (provider: 'google' | 'apple') => {
    if (provider === 'google') {
      authApi.googleAuth()
    } else if (provider === 'apple') {
      authApi.appleAuth()
    }
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[440px]"
        >
          {/* Card Container */}
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-gray-200/50 p-6 sm:p-8 lg:p-10">
            {/* Back Button */}
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-6"
            >
              <ArrowLeft size={20} />
              <span className="text-sm font-medium">Back</span>
            </button>

            {/* Logo Section */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary-100 mb-3">
                <Wallet className="w-7 h-7 sm:w-8 sm:h-8 text-primary-600" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Create Account</h1>
              <p className="text-gray-500 mt-1 text-sm">
                Start your journey to better financial management
              </p>
            </div>

            {/* Register Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Full Name"
                type="text"
                placeholder="Enter your full name"
                leftIcon={User}
                error={errors.fullName?.message}
                required
                {...register('fullName', {
                  required: 'Full name is required',
                  minLength: {
                    value: 2,
                    message: 'Name must be at least 2 characters',
                  },
                })}
              />

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
                label="Phone Number"
                type="tel"
                placeholder="Enter 10-digit phone number"
                leftIcon={Phone}
                error={errors.phone?.message}
                required
                maxLength={10}
                {...register('phone', {
                  required: 'Phone number is required',
                  pattern: {
                    value: /^[6-9]\d{9}$/,
                    message: 'Please enter a valid 10-digit phone number',
                  },
                })}
              />

              <Input
                label="Password"
                type="password"
                placeholder="Create a strong password"
                leftIcon={Lock}
                error={errors.password?.message}
                hint="Min 8 characters with uppercase, lowercase & number"
                required
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters',
                  },
                  pattern: {
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                    message: 'Must contain uppercase, lowercase, and number',
                  },
                })}
              />

              <Input
                label="Confirm Password"
                type="password"
                placeholder="Confirm your password"
                leftIcon={Lock}
                error={errors.confirmPassword?.message}
                required
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: (value) =>
                    value === password || 'Passwords do not match',
                })}
              />

              {/* Terms Checkbox */}
              <Checkbox
                checked={acceptTerms}
                onChange={setAcceptTerms}
                label={
                  <>
                    I agree to the{' '}
                    <a href="#" className="text-primary-500 hover:underline">
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="#" className="text-primary-500 hover:underline">
                      Privacy Policy
                    </a>
                  </>
                }
                className="mt-2"
              />

              {/* Submit Button */}
              <Button
                type="submit"
                loading={loading}
                disabled={!acceptTerms}
                fullWidth
                size="lg"
                className="mt-6"
              >
                Create Account
              </Button>
            </form>

            {/* Divider */}
            <Divider text="or sign up with" />

            {/* Social Login Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SocialButton provider="google" onClick={() => handleSocialRegister('google')} />
              <SocialButton provider="apple" onClick={() => handleSocialRegister('apple')} />
            </div>

            {/* Login Link */}
            <div className="mt-8">
              <LinkText
                text="Already have an account?"
                linkText="Sign In"
                onClick={() => navigate('/login')}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default RegisterPage
